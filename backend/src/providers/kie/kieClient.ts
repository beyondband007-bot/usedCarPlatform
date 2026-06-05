import fs from "node:fs/promises";
import path from "node:path";

import { env } from "../../config/env";
import { errors } from "../../shared/errors";
import type {
  CreateKieImageToVideoTaskInput,
  CreateKieImageTaskInput,
  CreateKieImageTaskResult,
  CreateKieTextToImageTaskInput,
  KieAccountLease,
  KieTaskDetail,
  KieUploadedFile,
} from "./kieTypes";
import { kieKeyPool } from "./kieKeyPool";

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

const mapKlingVideoMode = (resolution: CreateKieImageToVideoTaskInput["resolution"]) => {
  if (resolution === "1080p") return "pro";
  return "std";
};

const isKnownKieVideoCreateFailure = (error: unknown) =>
  error instanceof Error &&
  [
    "kie create video task failed",
    "kie video task rejected",
    "kie video response missing taskId",
  ].some((message) => error.message.includes(message));

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

const buildImageToImageRequestBody = (model: string, input: CreateKieImageTaskInput) => {
  if (model === env.kie.fallbackImageModel) {
    return {
      model,
      input: {
        prompt: input.prompt,
        image_input: input.inputUrls,
        aspect_ratio: input.aspectRatio,
        resolution: input.resolution,
        output_format: input.outputFormat ?? env.kie.fallbackOutputFormat,
      },
    };
  }

  return {
    model,
    input: {
      prompt: input.prompt,
      input_urls: input.inputUrls,
      aspect_ratio: input.aspectRatio,
      resolution: input.resolution,
    },
  };
};

const withKieMeta = (
  raw: unknown,
  meta: {
    model: string;
    role: "primary" | "fallback";
    attemptNo: number;
    inputUrls?: string[];
  },
) => {
  const record = asRecord(raw);
  return {
    ...record,
    _usedCarPlatform: meta,
  };
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

const getKieHttpStatus = (error: unknown) => {
  const status = Number((error as { kieHttpStatus?: number } | null)?.kieHttpStatus);
  return Number.isFinite(status) ? status : null;
};

const isFallbackEligibleCreateError = (error: unknown) => {
  if (isTimeoutError(error)) return true;
  if (!(error instanceof Error)) return true;
  const kieHttpStatus = getKieHttpStatus(error);
  if (kieHttpStatus !== null && kieHttpStatus >= 400 && kieHttpStatus < 500) return false;
  if (error.message.includes("missing taskId")) return true;
  if (!("statusCode" in error)) return true;
  const statusCode = Number((error as { statusCode?: number }).statusCode);
  return !Number.isFinite(statusCode) || statusCode >= 500;
};

class KieClient {
  async createImageToImageTask(input: CreateKieImageTaskInput): Promise<CreateKieImageTaskResult> {
    const lease = await kieKeyPool.acquire();
    return this.createImageToImageTaskWithLease(lease, input);
  }

  async createTextToImageTaskWithLease(
    lease: KieAccountLease,
    input: CreateKieTextToImageTaskInput,
  ): Promise<CreateKieImageTaskResult> {
    const requestBody = {
      model: "gpt-image-2-text-to-image",
      input: {
        prompt: input.prompt,
        aspect_ratio: input.aspectRatio,
        resolution: input.resolution,
      },
    };

    try {
      const response = await fetchWithTimeout(env.kie.createTaskUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lease.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }, env.kie.createTimeoutMs, "kie.createTextToImageTask", "KIE_CREATE_TIMEOUT");

      const raw = await response.json().catch(() => ({}));
      if (!response.ok) {
        await applyKieLeaseFailurePolicy(lease.accountHash, classifyKieHttpFailure(response.status));
        throw withKieHttpStatus(errors.generationFailed("kie create text-to-image task failed", raw), response.status);
      }

      const rawRecord = asRecord(raw);
      const data = asRecord(rawRecord.data ?? rawRecord);
      const kieTaskId = data.taskId ?? data.task_id ?? data.recordId ?? data.record_id ?? data.id;
      if (typeof kieTaskId !== "string" || !kieTaskId) {
        await applyKieLeaseFailurePolicy(lease.accountHash, "short-cooldown");
        throw errors.generationFailed("kie text-to-image response missing taskId", raw);
      }

      return {
        kieTaskId,
        accountHash: lease.accountHash,
        raw,
      };
    } catch (error) {
      if (!(error instanceof Error && error.message.includes("kie create text-to-image task failed"))) {
        await applyKieLeaseFailurePolicy(lease.accountHash, classifyKieLeaseFailure(error));
      }
      throw toKieProviderError(error, "kie create text-to-image task failed");
    }
  }

  async uploadLocalFileWithLease(
    lease: KieAccountLease,
    filePath: string,
    uploadPath = "used-car-platform",
  ): Promise<KieUploadedFile> {
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
    lease: KieAccountLease,
    input: CreateKieImageTaskInput,
  ): Promise<CreateKieImageTaskResult> {
    const primaryModel = input.model ?? env.kie.primaryImageModel;

    try {
      return await this.createImageToImageTaskAttempt(lease, input, {
        model: primaryModel,
        role: "primary",
        attemptNo: 1,
      });
    } catch (error) {
      if (!env.kie.fallbackEnabled || !isFallbackEligibleCreateError(error)) {
        if (error instanceof Error && error.message.includes("kie create task failed")) {
          await kieKeyPool.release(lease.accountHash);
        } else {
          await applyKieLeaseFailurePolicy(lease.accountHash, classifyKieLeaseFailure(error));
        }
        throw toKieProviderError(error, "kie create task failed");
      }

      await applyKieLeaseFailurePolicy(lease.accountHash, classifyKieLeaseFailure(error));
      const fallbackLease = await kieKeyPool.acquire();
      try {
        return await this.createImageToImageTaskAttempt(fallbackLease, input, {
          model: env.kie.fallbackImageModel,
          role: "fallback",
          attemptNo: 2,
        });
      } catch (fallbackError) {
        if (fallbackError instanceof Error && fallbackError.message.includes("kie create task failed")) {
          await kieKeyPool.release(fallbackLease.accountHash);
        } else {
          await applyKieLeaseFailurePolicy(fallbackLease.accountHash, classifyKieLeaseFailure(fallbackError));
        }
        throw toKieProviderError(fallbackError, "kie create task failed");
      }
    }
  }

  async createImageToImageTaskAttempt(
    lease: KieAccountLease,
    input: CreateKieImageTaskInput,
    meta: { model: string; role: "primary" | "fallback"; attemptNo: number },
  ): Promise<CreateKieImageTaskResult> {
    const requestBody = buildImageToImageRequestBody(meta.model, input);

    try {
      const response = await fetchWithTimeout(env.kie.createTaskUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lease.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }, env.kie.createTimeoutMs, `kie.createImageTask.${meta.role}`, "KIE_CREATE_TIMEOUT");

      const raw = await response.json().catch(() => ({}));
      if (!response.ok) {
        await applyKieLeaseFailurePolicy(lease.accountHash, classifyKieHttpFailure(response.status));
        throw withKieHttpStatus(errors.generationFailed("kie create task failed", raw), response.status);
      }

      const rawRecord = asRecord(raw);
      const data = asRecord(rawRecord.data ?? rawRecord);
      const kieTaskId = data.taskId ?? data.task_id ?? data.recordId ?? data.record_id ?? data.id;
      if (typeof kieTaskId !== "string" || !kieTaskId) {
        throw errors.generationFailed("kie response missing taskId", raw);
      }

      return {
        kieTaskId,
        accountHash: lease.accountHash,
        model: meta.model,
        role: meta.role,
        attemptNo: meta.attemptNo,
        raw: withKieMeta(raw, {
          ...meta,
          inputUrls: input.inputUrls,
        }),
      };
    } catch (error) {
      throw error;
    }
  }

  async createImageToVideoTaskWithLease(
    lease: KieAccountLease,
    input: CreateKieImageToVideoTaskInput,
  ): Promise<CreateKieImageTaskResult> {
    const requestBody = {
      model: "kling-3.0/video",
      input: {
        prompt: input.prompt,
        multi_shots: false,
        sound: false,
        image_urls: [input.imageUrl],
        aspect_ratio: input.aspectRatio,
        mode: mapKlingVideoMode(input.resolution),
        duration: input.duration,
      },
    };

    try {
      const response = await fetchWithTimeout(env.kie.createTaskUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lease.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }, env.kie.createTimeoutMs, "kie.createVideoTask", "KIE_CREATE_TIMEOUT");

      const raw = await response.json().catch(() => ({}));
      if (!response.ok) {
        await applyKieLeaseFailurePolicy(lease.accountHash, classifyKieHttpFailure(response.status));
        throw withKieHttpStatus(errors.generationFailed("kie create video task failed", raw), response.status);
      }

      const rawRecord = asRecord(raw);
      const rawCode = getKieResponseCode(raw);
      if (isKieClientErrorCode(rawCode)) {
        const message =
          typeof rawRecord.msg === "string" && rawRecord.msg
            ? rawRecord.msg
            : "kie video task rejected";
        throw errors.generationFailed(message, raw);
      }
      const data = asRecord(rawRecord.data ?? rawRecord);
      const kieTaskId = data.taskId ?? data.task_id ?? data.recordId ?? data.record_id ?? data.id;
      if (typeof kieTaskId !== "string" || !kieTaskId) {
        if (!isKieClientErrorCode(rawCode)) {
          await applyKieLeaseFailurePolicy(lease.accountHash, "short-cooldown");
        }
        throw errors.generationFailed("kie video response missing taskId", raw);
      }

      return {
        kieTaskId,
        accountHash: lease.accountHash,
        raw,
      };
    } catch (error) {
      if (!isKnownKieVideoCreateFailure(error)) {
        await applyKieLeaseFailurePolicy(lease.accountHash, classifyKieLeaseFailure(error));
      }
      throw toKieProviderError(error, "kie create video task failed");
    }
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
