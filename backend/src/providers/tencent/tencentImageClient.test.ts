import assert from "node:assert/strict";
import path from "node:path";

import { env } from "../../config/env";
import { kieClient } from "../kie/kieClient";
import { kieKeyPool } from "../kie/kieKeyPool";
import {
  TENCENT_IMAGE_ACCOUNT,
  buildTencentImagePayload,
  mapTencentImageDetail,
  registerLocalImage,
  tencentImageClient,
} from "./tencentImageClient";

const payload = buildTencentImagePayload(
  {
    prompt: "保留车辆外观，换成明亮展厅",
    inputUrls: ["local reference"],
    aspectRatio: "16:9",
    resolution: "1K",
  },
  123456,
  [{ Type: "Base64", Base64: "YWJj" }],
);
assert.equal(payload.ModelName, env.tencentImage.modelName);
assert.equal(payload.ModelVersion, env.tencentImage.modelVersion);
assert.equal(payload.SubAppId, 123456);
assert.match(payload.Prompt, /16:9/);
assert.deepEqual(payload.FileInfos, [{ Type: "Base64", Base64: "YWJj" }]);

const localUrl = registerLocalImage(path.join(env.uploadDir, "cars", "vehicle.jpg"));
assert.equal(localUrl, `${env.publicBaseUrl}/uploads/cars/vehicle.jpg`);

const completed = mapTencentImageDetail({
  AigcImageTask: {
    Status: "FINISH",
    ErrCode: 0,
    Output: { FileInfos: [{ FileUrl: "https://example.com/car.png" }] },
  },
});
assert.equal(completed.status, "success");
assert.deepEqual(completed.resultUrls, ["https://example.com/car.png"]);

const failed = mapTencentImageDetail({
  AigcImageTask: { Status: "FINISH", ErrCode: 1, ErrCodeExt: "ModelGenerateFailed", Message: "failed" },
});
assert.equal(failed.status, "fail");
assert.equal(failed.errorMessage, "failed");

const verifyImageRouting = async () => {
  const calls: unknown[] = [];
  const client = tencentImageClient as { createTask: (input: unknown) => Promise<any> };
  const originalCreateTask = client.createTask;
  client.createTask = async (input) => {
    calls.push(input);
    return { taskId: `tencent-task-${calls.length}`, model: "Hunyuan-3.5-preview", raw: {} };
  };

  try {
    const lease = await kieKeyPool.acquireImage();
    assert.equal(lease.accountHash, TENCENT_IMAGE_ACCOUNT);
    assert.equal(lease.apiKey, "");

    const textTask = await kieClient.createTextToImageTaskWithLease(lease, {
      prompt: "一辆轿车",
      aspectRatio: "16:9",
      resolution: "1K",
    });
    const imageTask = await kieClient.createImageToImageTaskWithLease(lease, {
      prompt: "更换展厅背景",
      inputUrls: ["https://example.com/car.png"],
      aspectRatio: "16:9",
      resolution: "1K",
    });

    assert.equal(textTask.accountHash, TENCENT_IMAGE_ACCOUNT);
    assert.equal(imageTask.accountHash, TENCENT_IMAGE_ACCOUNT);
    assert.equal(textTask.kieTaskId, "tencent-task-1");
    assert.equal(imageTask.kieTaskId, "tencent-task-2");
    assert.deepEqual((calls[0] as { inputUrls: string[] }).inputUrls, []);
    assert.deepEqual((calls[1] as { inputUrls: string[] }).inputUrls, ["https://example.com/car.png"]);
  } finally {
    client.createTask = originalCreateTask;
  }
};

verifyImageRouting()
  .then(() => console.log("Tencent image client and routing tests passed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
