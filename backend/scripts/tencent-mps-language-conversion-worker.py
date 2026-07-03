import json
import os
import time
from pathlib import Path

from qcloud_cos import CosConfig, CosS3Client
from qcloud_vod.model import VodUploadRequest
from qcloud_vod.vod_upload_client import VodUploadClient
from tencentcloud.common import credential
from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException
from tencentcloud.mps.v20190612 import models as mps_models
from tencentcloud.mps.v20190612 import mps_client


RUN_ID = os.getenv("RUN_ID", "language_conversion_task")
REGION = os.getenv("TENCENTCLOUD_REGION", "ap-guangzhou")
SUB_APP_ID = int(os.getenv("TENCENTCLOUD_SUB_APP_ID", "1447413504"))
VIDEO_PATH = Path(os.getenv("VIDEO_PATH", ""))
OUT_DIR = Path(os.getenv("OUT_DIR", "language-conversion-output"))
SOURCE_LANGUAGE = os.getenv("SOURCE_LANGUAGE", "zh")
TARGET_LANGUAGE = os.getenv("TARGET_LANGUAGE", "en")
POLL_INTERVAL_SECONDS = int(os.getenv("POLL_INTERVAL_SECONDS", "20"))
MAX_POLLS = int(os.getenv("MAX_POLLS", "120"))
APPID_CANDIDATES = [
    item.strip()
    for item in os.getenv("TENCENT_COS_APPID_CANDIDATES", "1447413504,1259494483,2600029167").split(",")
    if item.strip()
]


def get_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing env var: {name}")
    return value


def emit(event: str, **data):
    print(json.dumps({"event": event, **data}, ensure_ascii=False), flush=True)


def to_dict(obj):
    return json.loads(obj.to_json_string())


def make_cred():
    return credential.Credential(get_env("TENCENTCLOUD_SECRET_ID"), get_env("TENCENTCLOUD_SECRET_KEY"))


def cos_client():
    config = CosConfig(
        Region=REGION,
        SecretId=get_env("TENCENTCLOUD_SECRET_ID"),
        SecretKey=get_env("TENCENTCLOUD_SECRET_KEY"),
        Token=None,
        Scheme="https",
    )
    return CosS3Client(config)


def can_write_bucket(client, bucket: str):
    key = f"language-conversion/{RUN_ID}/write-test.txt"
    try:
        client.put_object(Bucket=bucket, Body=b"language conversion write test", Key=key)
        client.delete_object(Bucket=bucket, Key=key)
        return True
    except Exception as exc:
        emit("cos_write_failed", bucket=bucket, error=f"{type(exc).__name__}: {exc}")
        return False


def ensure_output_bucket():
    client = cos_client()
    preferred = os.getenv("TENCENT_MPS_OUTPUT_BUCKET", "").strip()
    candidates = [preferred] if preferred else []
    candidates.extend(f"codex-mps-output-{appid}" for appid in APPID_CANDIDATES)

    for bucket in dict.fromkeys(item for item in candidates if item):
        try:
            client.head_bucket(Bucket=bucket)
        except Exception:
            try:
                client.create_bucket(Bucket=bucket)
                emit("cos_bucket_created", bucket=bucket)
            except Exception as exc:
                emit("cos_bucket_unusable", bucket=bucket, error=f"{type(exc).__name__}: {exc}")
                continue
        if can_write_bucket(client, bucket):
            emit("cos_bucket_selected", bucket=bucket)
            return bucket

    raise RuntimeError("No writable COS output bucket is available.")


def upload_video_to_vod():
    if not VIDEO_PATH.exists():
        raise FileNotFoundError(str(VIDEO_PATH))
    request = VodUploadRequest()
    request.MediaFilePath = str(VIDEO_PATH)
    request.MediaType = VIDEO_PATH.suffix.lower().lstrip(".") or "mp4"
    request.MediaName = f"{RUN_ID}-source"
    request.SubAppId = SUB_APP_ID
    client = VodUploadClient(get_env("TENCENTCLOUD_SECRET_ID"), get_env("TENCENTCLOUD_SECRET_KEY"))
    emit("upload_started", path=str(VIDEO_PATH), bytes=VIDEO_PATH.stat().st_size)
    response = client.upload(REGION, request)
    result = {
        "fileId": getattr(response, "FileId", None),
        "mediaUrl": getattr(response, "MediaUrl", None),
        "requestId": getattr(response, "RequestId", None),
    }
    emit("upload_finished", **result)
    return result


def submit_mps_task(media_url: str, output_bucket: str):
    extended = {
        "delogo": {
            "cluster_id": "gpu_pre",
            "CustomerAppId": "audio_clone_asr",
            "subtitle_param": {
                "translate_src_language": SOURCE_LANGUAGE,
                "translate_dst_language": TARGET_LANGUAGE,
                "use_draw": True,
            },
        }
    }
    payload = {
        "InputInfo": {"Type": "URL", "UrlInputInfo": {"Url": media_url}},
        "OutputStorage": {"Type": "COS", "CosOutputStorage": {"Bucket": output_bucket, "Region": REGION}},
        "OutputDir": f"/language-conversion/{RUN_ID}/",
        "AiAnalysisTask": {"Definition": 25, "ExtendedParameter": json.dumps(extended, ensure_ascii=False)},
        "TasksPriority": 0,
        "SessionContext": json.dumps(
            {
                "runId": RUN_ID,
                "source": "used-car-platform",
                "sourceLanguage": SOURCE_LANGUAGE,
                "targetLanguage": TARGET_LANGUAGE,
                "bucket": output_bucket,
            },
            ensure_ascii=False,
        ),
    }
    client = mps_client.MpsClient(make_cred(), REGION)
    req = mps_models.ProcessMediaRequest()
    req.from_json_string(json.dumps(payload, ensure_ascii=False))
    response = to_dict(client.ProcessMedia(req))
    task_id = response.get("TaskId")
    emit("mps_submitted", taskId=task_id, request=payload, response=response)
    return client, task_id


def summarize(detail):
    workflow = detail.get("WorkflowTask") or {}
    ai_results = workflow.get("AiAnalysisResultSet") or []
    delogo = None
    for item in ai_results:
        if item.get("DeLogoTask"):
            delogo = item.get("DeLogoTask")
            break
    return {
        "taskStatus": detail.get("TaskStatus") or detail.get("Status"),
        "workflowStatus": workflow.get("Status"),
        "workflowErrCode": workflow.get("ErrCode"),
        "workflowMessage": workflow.get("Message"),
        "analysisStatus": (delogo or {}).get("Status"),
        "analysisErrCode": (delogo or {}).get("ErrCode"),
        "analysisMessage": (delogo or {}).get("Message"),
    }


def describe_task(client, task_id: str):
    req = mps_models.DescribeTaskDetailRequest()
    req.TaskId = task_id
    return to_dict(client.DescribeTaskDetail(req))


def poll_mps_task(client, task_id: str):
    for index in range(1, MAX_POLLS + 1):
        time.sleep(POLL_INTERVAL_SECONDS)
        detail = describe_task(client, task_id)
        summary = summarize(detail)
        emit("mps_poll", poll=index, summary=summary)
        if summary["workflowStatus"] in {"FINISH", "FAIL"} or summary["taskStatus"] in {"FINISH", "FAIL"}:
            return detail, summary
    raise TimeoutError(f"MPS task did not finish after {MAX_POLLS} polls")


def list_cos_outputs(bucket: str):
    client = cos_client()
    prefix = f"language-conversion/{RUN_ID}/"
    outputs = []
    marker = ""
    while True:
        kwargs = {"Bucket": bucket, "Prefix": prefix}
        if marker:
            kwargs["Marker"] = marker
        response = client.list_objects(**kwargs)
        contents = response.get("Contents") or []
        if isinstance(contents, dict):
            contents = [contents]
        for item in contents:
            key = item.get("Key")
            if key and not key.endswith("/"):
                outputs.append({"Key": key, "Size": int(item.get("Size") or 0)})
        if response.get("IsTruncated") == "true":
            marker = response.get("NextMarker") or ""
        else:
            break
    emit("cos_outputs", count=len(outputs), outputs=outputs)
    return outputs


def download_outputs(bucket: str, outputs):
    client = cos_client()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    downloads = []
    for index, item in enumerate(outputs, start=1):
        key = item["Key"]
        ext = Path(key).suffix or ".mp4"
        target = OUT_DIR / f"language-conversion-result-{index:02d}{ext}"
        response = client.get_object(Bucket=bucket, Key=key)
        response["Body"].get_stream_to_file(str(target))
        downloads.append({"key": key, "path": str(target), "bytes": target.stat().st_size})
        emit("downloaded", key=key, path=str(target), bytes=target.stat().st_size)
    return downloads


def main():
    emit("started", runId=RUN_ID, sourceLanguage=SOURCE_LANGUAGE, targetLanguage=TARGET_LANGUAGE)
    bucket = ensure_output_bucket()
    upload = upload_video_to_vod()
    client, task_id = submit_mps_task(upload["mediaUrl"], bucket)
    detail, summary = poll_mps_task(client, task_id)
    if summary.get("workflowStatus") != "FINISH" or summary.get("workflowErrCode") not in (0, None):
        raise RuntimeError(f"MPS task failed: {json.dumps(summary, ensure_ascii=False)}")
    outputs = list_cos_outputs(bucket)
    downloads = download_outputs(bucket, outputs)
    final = {
        "runId": RUN_ID,
        "outputBucket": bucket,
        "upload": upload,
        "mpsTaskId": task_id,
        "summary": summary,
        "outputs": outputs,
        "downloads": downloads,
        "detail": detail,
    }
    emit("finished", final=final)


if __name__ == "__main__":
    try:
        main()
    except TencentCloudSDKException as exc:
        emit("failed", code=exc.get_code(), message=exc.get_message(), requestId=exc.get_request_id())
        raise
    except Exception as exc:
        emit("failed", code=type(exc).__name__, message=str(exc))
        raise
