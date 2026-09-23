import fs from "node:fs/promises";
import path from "node:path";

import { env } from "../../config/env";
import { errors } from "../../shared/errors";
import type {
  CreateKieImageTaskInput,
  CreateKieImageTaskResult,
  CreateKieTextToImageTaskInput,
  KieAccountLease,
  KieTaskDetail,
  KieUploadedFile,
} from "./kieTypes";
import { kieKeyPool } from "./kieKeyPool";
import { TENCENT_IMAGE_ACCOUNT, registerLocalImage, tencentImageClient } from "../tencent/tencentImageClient";

const asRecord = (value: unknown): Record<string, any> =>
  value && typeof value === "object" ? (value as Record<string, any>) : {};

const parseMaybeJson = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const collectUrls = (value: unknown): string[] => {
  const parsed = parseMaybeJson(value);
  if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string");
  const record = asRecord(parsed);
  const candidates = [
    record.resultUrls,
    record.result_urls,
    record.imageUrls,
    record.image_urls,
    record.videoUrls,
    record.video_urls,
    record.outputUrls,
    record.output_urls,
    record.resultVideoUrls,
    record.result_video_urls,
    record.urls,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is string => typeof item === "string");
    }
  }

  if (typeof record.url === "string") return [record.url];
  return [];
};

const normalizeKieStatus = (status: unknown): KieTaskDetail["status"] => {
  const value = String(status ?? "").toLowerCase();
  if (["success", "succeeded", "completed", "complete"].includes(value)) return "success";
  if (["fail", "failed", "error"].includes(value)) return "fail";
  if (["processing", "running", "generating", "in_progress"].includes(value)) return "generating";
  return "queued";
};

const getKieResponseCode = (raw: unknown) => {
  const record = asRecord(raw);
  const code = Number(record.code ?? record.statusCode ?? record.status);
  return Number.isFinite(code) ? code : null;
};

const isKieClientErrorCode = (code: number | null) =>
  code !== null && code >= 400 && code < 500;

export type KieLeaseFailurePolicy =
  | "transient"
  | "short-cooldown"
  | "long-cooldown"
  | "release";

const SHORT_KIE_COOLDOWN_SECONDS = 10;
const LONG_KIE_COOLDOWN_SECONDS = 300;

export const classifyKieHttpFailure = (status: number): KieLeaseFailurePolicy => {
  if (status === 401 || status === 403) return "long-cooldown";
  if (status === 429) return "short-cooldown";
  if (status >= 500) return "short-cooldown";
  return "release";
};

const getErrorCode = (error: unknown) => {
  const record = asRecord(error);
  const cause = asRecord(record.cause);
  return String(cause.code ?? record.code ?? "");
};

export const isTransientKieTransportError = (error: unknown) => {
  if (isTimeoutError(error)) return true;
  if (!(error instanceof Error)) return false;

  const code = getErrorCode(error);
  if (
    [
      "ECONNRESET",
      "ECONNABORTED",
      "ETIMEDOUT",
      "UND_ERR_CONNECT_TIMEOUT",
      "EAI_AGAIN",
      "ENOTFOUND",
    ].includes(code)
  ) {
    return true;
  }

  const message = error.message.toLowerCase();
  return message.includes("fetch failed") || message.includes("network");
};

export const classifyKieLeaseFailure = (error: unknown): KieLeaseFailurePolicy => {
  if (isTransientKieTransportError(error)) return "transient";
  return "short-cooldown";
};

const applyKieLeaseFailurePolicy = async (accountHash: string, policy: KieLeaseFailurePolicy) => {
  if (policy === "transient") {
    await kieKeyPool.markTransientFailure(accountHash);
    return;
  }
  if (policy === "release") {
    await kieKeyPool.release(accountHash);
    return;
  }
  await kieKeyPool.markFailure(
    accountHash,
    policy === "long-cooldown" ? LONG_KIE_COOLDOWN_SECONDS : SHORT_KIE_COOLDOWN_SECONDS,
  );
};

export const toKieProviderError = (error: unknown, message: string) => {
  if (error instanceof Error && "statusCode" in error) return error;
  if (!isTransientKieTransportError(error)) return error;

  return errors.generationFailed(message, {
    errorCode: "KIE_TRANSPORT_ERROR",
    cause: error instanceof Error ? error.message : String(error),
    code: getErrorCode(error) || undefined,
  });
};

class Semaphore {
  private active = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async run<T>(operation: () => Promise<T>) {
    await this.acquire();
    try {
      return await operation();
    } finally {
      this.release();
    }
  }

  private async acquire() {
    if (this.active < this.limit) {
      this.active += 1;
      return;
    }

    await new Promise<void>((resolve) => {
      this.waiters.push(resolve);
    });
    this.active += 1;
  }

  private release() {
    this.active = Math.max(this.active - 1, 0);
    const next = this.waiters.shift();
    if (next) next();
  }
}

const uploadSemaphore = new Semaphore(Math.max(env.kie.maxUploadConcurrent, 1));

const timeoutError = (operation: string, timeoutMs: number, errorCode = "KIE_REQUEST_TIMEOUT") => {
  const error = errors.generationFailed(errorCode, {
    errorCode,
    operation,
    timeoutMs,
  });
  return error;
};

const isNetworkTimeoutError = (error: unknown) => {
  const record = asRecord(error);
  const cause = asRecord(record.cause);
  const code = String(cause.code ?? record.code ?? "");
  return ["UND_ERR_CONNECT_TIMEOUT", "ETIMEDOUT", "ECONNABORTED"].includes(code);
};

const retryDelayMs = (attempt: number) => {
  const base = Math.max(env.kie.networkRetryBaseMs, 0);
  const max = Math.max(env.kie.networkRetryMaxMs, base);
  const exponential = Math.min(max, base * 2 ** Math.max(attempt - 1, 0));
  const jitter = Math.floor(Math.random() * Math.min(250, Math.max(exponential, 1)));
  return exponential + jitter;
};

const sleep = (durationMs: number) =>
  durationMs > 0 ? new Promise((resolve) => setTimeout(resolve, durationMs)) : Promise.resolve();

const fetchWithTimeout = async (
  url: string | URL,
  init: RequestInit,
  timeoutMs: number,
  operation: string,
  errorCode = "KIE_REQUEST_TIMEOUT",
) => {
  const attempts = Math.max(env.kie.networkRetryLimit, 0) + 1;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal,
      });
    } catch (error) {
      if ((error instanceof Error && error.name === "AbortError") || isNetworkTimeoutError(error)) {
        lastError = timeoutError(operation, timeoutMs, errorCode);
        if (attempt < attempts) {
          await sleep(retryDelayMs(attempt));
          continue;
        }
        throw lastError;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError ?? timeoutError(operation, timeoutMs, errorCode);
};

const isTimeoutError = (error: unknown) =>
  error instanceof Error &&
  [
    "KIE_REQUEST_TIMEOUT",
    "KIE_UPLOAD_TIMEOUT",
    "KIE_CREATE_TIMEOUT",
    "KIE_DETAIL_TIMEOUT",
  ].some((code) => error.message.includes(code));

const withKieHttpStatus = <T extends Error>(error: T, status: number) => {
  (error as T & { kieHttpStatus?: number }).kieHttpStatus = status;
  return error;
};

class KieClient {
  async createImageToImageTask(input: CreateKieImageTaskInput): Promise<CreateKieImageTaskResult> {
    const lease = await kieKeyPool.acquireImage();
    return this.createImageToImageTaskWithLease(lease, input);
  }

  async createTextToImageTaskWithLease(
    _lease: KieAccountLease,
    input: CreateKieTextToImageTaskInput,
  ): Promise<CreateKieImageTaskResult> {
    const task = await tencentImageClient.createTask({ ...input, inputUrls: [] });
    return {
      kieTaskId: task.taskId,
      accountHash: TENCENT_IMAGE_ACCOUNT,
      model: task.model,
      raw: task.raw,
    };
  }

  async uploadLocalFileWithLease(
    lease: KieAccountLease,
    filePath: string,
    uploadPath = "used-car-platform",
  ): Promise<KieUploadedFile> {
    if (lease.accountHash === TENCENT_IMAGE_ACCOUNT) {
      return { fileUrl: registerLocalImage(filePath), raw: { provider: "tencent-vod-image" } };
    }
    const bytes = await fs.readFile(filePath);
    const formData = new FormData();
    formData.append("file", new Blob([bytes]), path.basename(filePath));
    formData.append("uploadPath", uploadPath);
    formData.append("fileName", path.basename(filePath));

    try {
      return await uploadSemaphore.run(async () => {
        const response = await fetchWithTimeout(`${env.kie.fileUploadBaseUrl}/api/file-stream-upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lease.apiKey}`,
          },
          body: formData,
        }, env.kie.uploadTimeoutMs, "kie.uploadFile", "KIE_UPLOAD_TIMEOUT");

        const raw = await response.json().catch(() => ({}));
        if (!response.ok) {
          await applyKieLeaseFailurePolicy(lease.accountHash, classifyKieHttpFailure(response.status));
          throw withKieHttpStatus(errors.generationFailed("kie file upload failed", raw), response.status);
        }

        const rawRecord = asRecord(raw);
        const data = asRecord(rawRecord.data ?? rawRecord);
        const fileUrl = data.fileUrl ?? data.url ?? data.downloadUrl;
        if (typeof fileUrl !== "string" || !fileUrl) {
          await applyKieLeaseFailurePolicy(lease.accountHash, "short-cooldown");
          throw errors.generationFailed("kie upload response missing fileUrl", raw);
        }

        return {
          fileUrl,
          fileId: typeof data.fileId === "string" ? data.fileId : undefined,
          expiresAt: typeof data.expiresAt === "string" ? data.expiresAt : undefined,
          raw,
        };
      });
    } catch (error) {
      if (
        !(
          error instanceof Error &&
          (error.message.includes("kie file upload failed") ||
            error.message.includes("kie upload response missing fileUrl"))
        )
      ) {
        await applyKieLeaseFailurePolicy(lease.accountHash, classifyKieLeaseFailure(error));
      }
      throw toKieProviderError(error, "kie file upload failed");
    }
  }

  async createImageToImageTaskWithLease(
    _lease: KieAccountLease,
    input: CreateKieImageTaskInput,
  ): Promise<CreateKieImageTaskResult> {
    const task = await tencentImageClient.createTask(input);
    return {
      kieTaskId: task.taskId,
      accountHash: TENCENT_IMAGE_ACCOUNT,
      model: task.model,
      raw: task.raw,
    };
  }

  async getTaskDetail(kieTaskId: string, apiKey: string): Promise<KieTaskDetail> {
    const url = new URL(env.kie.taskDetailUrl);
    url.searchParams.set("taskId", kieTaskId);

    const response = await fetchWithTimeout(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }, env.kie.detailTimeoutMs, "kie.getTaskDetail", "KIE_DETAIL_TIMEOUT");

    const raw = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw errors.generationFailed("kie task detail failed", raw);
    }

    const root = asRecord(raw);
    const data = asRecord(root.data ?? root);
    const responsePayload = parseMaybeJson(
      data.response ?? data.result ?? data.resultJson ?? data.result_json ?? data.output,
    );
    const status = normalizeKieStatus(data.status ?? data.state ?? data.taskStatus);
    const resultUrls = [
      ...collectUrls(data),
      ...collectUrls(responsePayload),
      ...collectUrls(data.resultJson),
      ...collectUrls(data.result_json),
      ...collectUrls(data.resultUrls),
      ...collectUrls(data.result_urls),
    ];
    const uniqueUrls = Array.from(new Set(resultUrls));

    return {
      status,
      progress: status === "success" ? 100 : status === "fail" ? 100 : 50,
      resultUrls: uniqueUrls,
      errorMessage: data.errorMessage ?? data.error ?? data.failReason,
      raw,
    };
  }
}

export const kieClient = new KieClient();
