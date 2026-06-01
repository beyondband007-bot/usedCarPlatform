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
      const response = await fetch(env.kie.createTaskUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lease.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const raw = await response.json().catch(() => ({}));
      if (!response.ok) {
        await kieKeyPool.markFailure(lease.accountHash);
        throw errors.generationFailed("kie create text-to-image task failed", raw);
      }

      const rawRecord = asRecord(raw);
      const data = asRecord(rawRecord.data ?? rawRecord);
      const kieTaskId = data.taskId ?? data.task_id ?? data.id;
      if (typeof kieTaskId !== "string" || !kieTaskId) {
        await kieKeyPool.markFailure(lease.accountHash);
        throw errors.generationFailed("kie text-to-image response missing taskId", raw);
      }

      return {
        kieTaskId,
        accountHash: lease.accountHash,
        raw,
      };
    } catch (error) {
      if (!(error instanceof Error && error.message.includes("kie create text-to-image task failed"))) {
        await kieKeyPool.markFailure(lease.accountHash);
      }
      throw error;
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

    const response = await fetch(`${env.kie.fileUploadBaseUrl}/api/file-stream-upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lease.apiKey}`,
      },
      body: formData,
    });

    const raw = await response.json().catch(() => ({}));
    if (!response.ok) {
      await kieKeyPool.markFailure(lease.accountHash);
      throw errors.generationFailed("kie file upload failed", raw);
    }

    const rawRecord = asRecord(raw);
    const data = asRecord(rawRecord.data ?? rawRecord);
    const fileUrl = data.fileUrl ?? data.url ?? data.downloadUrl;
    if (typeof fileUrl !== "string" || !fileUrl) {
      await kieKeyPool.markFailure(lease.accountHash);
      throw errors.generationFailed("kie upload response missing fileUrl", raw);
    }

    return {
      fileUrl,
      fileId: typeof data.fileId === "string" ? data.fileId : undefined,
      expiresAt: typeof data.expiresAt === "string" ? data.expiresAt : undefined,
      raw,
    };
  }

  async createImageToImageTaskWithLease(
    lease: KieAccountLease,
    input: CreateKieImageTaskInput,
  ): Promise<CreateKieImageTaskResult> {
    const requestBody = {
      model: env.kie.model,
      input: {
        prompt: input.prompt,
        input_urls: input.inputUrls,
        aspect_ratio: input.aspectRatio,
        resolution: input.resolution,
      },
    };

    try {
      const response = await fetch(env.kie.createTaskUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lease.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const raw = await response.json().catch(() => ({}));
      if (!response.ok) {
        await kieKeyPool.markFailure(lease.accountHash);
        throw errors.generationFailed("kie create task failed", raw);
      }

      const rawRecord = asRecord(raw);
      const data = asRecord(rawRecord.data ?? rawRecord);
      const kieTaskId = data.taskId ?? data.task_id ?? data.id;
      if (typeof kieTaskId !== "string" || !kieTaskId) {
        await kieKeyPool.markFailure(lease.accountHash);
        throw errors.generationFailed("kie response missing taskId", raw);
      }

      return {
        kieTaskId,
        accountHash: lease.accountHash,
        raw,
      };
    } catch (error) {
      if (!(error instanceof Error && error.message.includes("kie create task failed"))) {
        await kieKeyPool.markFailure(lease.accountHash);
      }
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
      const response = await fetch(env.kie.createTaskUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lease.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const raw = await response.json().catch(() => ({}));
      if (!response.ok) {
        await kieKeyPool.markFailure(lease.accountHash);
        throw errors.generationFailed("kie create video task failed", raw);
      }

      const rawRecord = asRecord(raw);
      const data = asRecord(rawRecord.data ?? rawRecord);
      const kieTaskId = data.taskId ?? data.task_id ?? data.id;
      if (typeof kieTaskId !== "string" || !kieTaskId) {
        await kieKeyPool.markFailure(lease.accountHash);
        throw errors.generationFailed("kie video response missing taskId", raw);
      }

      return {
        kieTaskId,
        accountHash: lease.accountHash,
        raw,
      };
    } catch (error) {
      if (!(error instanceof Error && error.message.includes("kie create video task failed"))) {
        await kieKeyPool.markFailure(lease.accountHash);
      }
      throw error;
    }
  }

  async getTaskDetail(kieTaskId: string, apiKey: string): Promise<KieTaskDetail> {
    const url = new URL(env.kie.taskDetailUrl);
    url.searchParams.set("taskId", kieTaskId);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

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
