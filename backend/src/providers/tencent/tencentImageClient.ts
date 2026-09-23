import { createHash, createHmac, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { env } from "../../config/env";
import { errors } from "../../shared/errors";
import type { OutputRatio, Resolution } from "../../shared/types";
import type { KieTaskDetail } from "../kie/kieTypes";

export const TENCENT_IMAGE_ACCOUNT = "tencent-vod-image";
const endpoint = "https://vod.tencentcloudapi.com/";
const host = "vod.tencentcloudapi.com";
const version = "2018-07-17";
const maxReferenceBytes = 7 * 1024 * 1024;

type ImageInput = {
  prompt: string;
  inputUrls: string[];
  aspectRatio: OutputRatio;
  resolution: Resolution;
};

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const hmac = (key: string | Buffer, value: string) => createHmac("sha256", key).update(value).digest();

const signedHeaders = (action: string, body: string) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
  const signedHeaderNames = "content-type;host;x-tc-action";
  const canonicalRequest = ["POST", "/", "", canonicalHeaders, signedHeaderNames, sha256(body)].join("\n");
  const scope = `${date}/vod/tc3_request`;
  const stringToSign = ["TC3-HMAC-SHA256", timestamp, scope, sha256(canonicalRequest)].join("\n");
  const signingKey = hmac(hmac(hmac(`TC3${env.verification.tencentSecretKey}`, date), "vod"), "tc3_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  return {
    Authorization: `TC3-HMAC-SHA256 Credential=${env.verification.tencentSecretId}/${scope}, SignedHeaders=${signedHeaderNames}, Signature=${signature}`,
    "Content-Type": "application/json; charset=utf-8",
    "X-TC-Action": action,
    "X-TC-Timestamp": String(timestamp),
    "X-TC-Version": version,
    "X-TC-Region": env.verification.tencentRegion,
  };
};

const callVod = async (action: string, payload: Record<string, unknown>) => {
  if (!env.verification.tencentSecretId || !env.verification.tencentSecretKey) {
    throw errors.generationFailed("Tencent Cloud credentials are not configured");
  }
  const body = JSON.stringify(payload);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: signedHeaders(action, body),
      body,
      signal: AbortSignal.timeout(env.tencentImage.requestTimeoutMs),
    });
  } catch (error) {
    throw errors.generationFailed("Tencent Cloud image request failed", {
      cause: error instanceof Error ? error.message : String(error),
    });
  }
  const raw = await response.json().catch(() => ({})) as Record<string, any>;
  const result = raw.Response ?? {};
  if (!response.ok || result.Error) {
    throw errors.generationFailed("Tencent Cloud image request failed", {
      status: response.status,
      code: result.Error?.Code,
      message: result.Error?.Message,
      requestId: result.RequestId,
    });
  }
  return result as Record<string, any>;
};

let discoveredSubAppId: number | null = null;
const getSubAppId = async () => {
  if (env.tencentImage.vodSubAppId > 0) return env.tencentImage.vodSubAppId;
  if (discoveredSubAppId) return discoveredSubAppId;
  const result = await callVod("DescribeSubAppIds", { Offset: 0, Limit: 200 });
  const apps = Array.isArray(result.SubAppIdInfoSet)
    ? result.SubAppIdInfoSet.filter((item: Record<string, unknown>) => item.Status === "On")
    : [];
  if (result.TotalCount !== 1 || apps.length !== 1 || !Number.isInteger(Number(apps[0].SubAppId))) {
    throw errors.generationFailed("Set TENCENTCLOUD_VOD_SUB_APP_ID for Tencent image generation");
  }
  discoveredSubAppId = Number(apps[0].SubAppId);
  return discoveredSubAppId;
};

const localImagePaths = new Map<string, string>();
const staticRoots = () => [
  { prefix: "uploads", root: env.uploadDir },
  { prefix: "results", root: env.resultsDir },
  { prefix: "packages", root: env.packagesDir },
  { prefix: "scene-refs", root: env.sceneRefsDir },
];

export const registerLocalImage = (filePath: string) => {
  const resolved = path.resolve(filePath);
  for (const item of staticRoots()) {
    const relative = path.relative(item.root, resolved);
    if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
      const encoded = relative.split(path.sep).map(encodeURIComponent).join("/");
      return `${env.publicBaseUrl.replace(/\/$/, "")}/${item.prefix}/${encoded}`;
    }
  }
  const token = `tencent-local-image:${randomUUID()}`;
  localImagePaths.set(token, filePath);
  setTimeout(() => localImagePaths.delete(token), 5 * 60 * 1000).unref();
  return token;
};

const loadReference = async (value: string): Promise<Buffer | null> => {
  if (value.startsWith("tencent-local-image:")) {
    const filePath = localImagePaths.get(value);
    if (!filePath) throw errors.invalidParameter("local reference image is no longer available");
    localImagePaths.delete(value);
    return fs.readFile(filePath);
  }
  const dataUrl = /^data:image\/(?:jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/i.exec(value);
  if (dataUrl) return Buffer.from(dataUrl[1], "base64");
  const url = new URL(value, env.publicBaseUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw errors.invalidParameter("reference image URL must use HTTP or HTTPS");
  }
  const localOrigin = new URL(env.publicBaseUrl).origin;
  if (url.origin !== localOrigin) {
    // Built-in scene references are hosted here; submit their bytes so VOD does not rely on hotlink access.
    if (url.hostname !== "vip.123pan.cn") return null;
    const response = await fetch(url, { signal: AbortSignal.timeout(env.tencentImage.referenceTimeoutMs) });
    if (!response.ok) throw errors.generationFailed("scene reference image download failed", { status: response.status });
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > maxReferenceBytes) throw errors.fileTooLarge({ maxReferenceBytes });
    return bytes;
  }
  for (const item of staticRoots()) {
    const prefix = `/${item.prefix}/`;
    if (!url.pathname.startsWith(prefix)) continue;
    const relative = decodeURIComponent(url.pathname.slice(prefix.length));
    const filePath = path.resolve(item.root, relative);
    if (filePath === item.root || !filePath.startsWith(`${item.root}${path.sep}`)) {
      throw errors.invalidParameter("reference image path is invalid");
    }
    return fs.readFile(filePath);
  }
  throw errors.invalidParameter("local reference image path is unsupported");
};

const prepareReferences = async (urls: string[]) => {
  const files: Array<{ Type: "Base64"; Base64: string } | { Type: "Url"; Url: string }> = [];
  let totalBytes = 0;
  for (const url of urls) {
    const source = await loadReference(url);
    if (!source) {
      const remote = new URL(url);
      if (remote.protocol !== "https:" && remote.protocol !== "http:") {
        throw errors.invalidParameter("reference image URL must use HTTP or HTTPS");
      }
      files.push({ Type: "Url", Url: remote.toString() });
      continue;
    }
    const image = sharp(source)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true });
    const { hasAlpha } = await image.metadata();
    const bytes = await (hasAlpha
      ? image.webp({ quality: 80 })
      : image.jpeg({ quality: 76, mozjpeg: true })).toBuffer();
    totalBytes += bytes.length;
    if (totalBytes > maxReferenceBytes) {
      throw errors.fileTooLarge({ maxReferenceBytes, totalBytes });
    }
    files.push({ Type: "Base64" as const, Base64: bytes.toString("base64") });
  }
  return files;
};

export const buildTencentImagePayload = (
  input: ImageInput,
  subAppId: number,
  fileInfos: Array<{ Type: "Base64"; Base64: string } | { Type: "Url"; Url: string }>,
) => ({
  SubAppId: subAppId,
  ModelName: env.tencentImage.modelName,
  ModelVersion: env.tencentImage.modelVersion,
  Prompt: input.aspectRatio === "auto" ? input.prompt : `${input.prompt}\n\n输出画幅比例：${input.aspectRatio}。`,
  ...(fileInfos.length ? { FileInfos: fileInfos } : {}),
  EnhancePrompt: "Disabled",
  OutputConfig: {
    StorageMode: "Temporary",
    // Hunyuan controls the shape through the prompt; its VOD API does not accept AspectRatio.
  },
});

export const mapTencentImageDetail = (raw: Record<string, any>): KieTaskDetail => {
  const task = raw.AigcImageTask ?? {};
  const status = String(task.Status ?? "").toUpperCase();
  const errorCode = String(task.ErrCodeExt ?? "");
  const resultUrls = Array.isArray(task.Output?.FileInfos)
    ? task.Output.FileInfos.map((item: Record<string, unknown>) => item.FileUrl).filter((url: unknown): url is string => typeof url === "string" && Boolean(url))
    : [];
  const failed = ["FAIL", "FAILED", "ABORTED"].includes(status) || (status === "FINISH" && (Number(task.ErrCode ?? 0) !== 0 || Boolean(errorCode) || resultUrls.length === 0));
  const succeeded = status === "FINISH" && !failed;
  return {
    status: failed ? "fail" : succeeded ? "success" : status === "PROCESSING" ? "generating" : "queued",
    progress: succeeded || failed ? 100 : Number(task.Progress ?? 5),
    resultUrls,
    errorMessage: failed ? String(task.Message || errorCode || "Tencent Cloud image task failed") : undefined,
    raw,
  };
};

export const tencentImageClient = {
  resolveSubAppId: getSubAppId,
  async createTask(input: ImageInput) {
    const subAppId = await getSubAppId();
    const fileInfos = await prepareReferences(input.inputUrls);
    const payload = buildTencentImagePayload(input, subAppId, fileInfos);
    const raw = await callVod("CreateAigcImageTask", payload);
    if (typeof raw.TaskId !== "string" || !raw.TaskId) {
      throw errors.generationFailed("Tencent Cloud image response missing TaskId", { requestId: raw.RequestId });
    }
    return {
      taskId: raw.TaskId,
      model: `${env.tencentImage.modelName}-${env.tencentImage.modelVersion}`,
      raw: { ...raw, _usedCarPlatform: { provider: "tencent-vod-image", model: `${env.tencentImage.modelName}-${env.tencentImage.modelVersion}` } },
    };
  },
  async getTaskDetail(taskId: string) {
    const subAppId = await getSubAppId();
    const raw = await callVod("DescribeTaskDetail", { SubAppId: subAppId, TaskId: taskId });
    return mapTencentImageDetail(raw);
  },
};
