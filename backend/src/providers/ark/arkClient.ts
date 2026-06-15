import { env } from "../../config/env";
import { errors } from "../../shared/errors";
import type {
  ArkReferenceContent,
  ArkTaskDetail,
  CreateArkSeedanceTaskInput,
  CreateArkSeedanceTaskResult,
} from "./arkTypes";

const asRecord = (value: unknown): Record<string, any> =>
  value && typeof value === "object" ? (value as Record<string, any>) : {};

const fetchWithTimeout = async (
  url: string,
  init: RequestInit,
  timeoutMs: number,
  label: string,
  timeoutCode: string,
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(timeoutCode)), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    throw errors.generationFailed(`${label} failed`, {
      code: error instanceof Error ? error.message : timeoutCode,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const requireArkApiKey = () => {
  if (!env.ark.apiKey) {
    throw errors.generationFailed("ARK_API_KEY is not configured");
  }
};

const buildReferenceContents = (input: CreateArkSeedanceTaskInput): ArkReferenceContent[] => [
  ...(input.referenceImageUrls ?? []).map((url) => ({
    type: "image_url" as const,
    role: "reference_image" as const,
    image_url: { url },
  })),
  ...(input.referenceVideoUrls ?? []).map((url) => ({
    type: "video_url" as const,
    role: "reference_video" as const,
    video_url: { url },
  })),
  ...(input.referenceAudioUrls ?? []).map((url) => ({
    type: "audio_url" as const,
    role: "reference_audio" as const,
    audio_url: { url },
  })),
];

const normalizeArkStatus = (status: unknown): ArkTaskDetail["status"] => {
  const value = String(status ?? "").toLowerCase();
  if (["succeeded", "success", "completed", "complete"].includes(value)) return "success";
  if (["failed", "fail", "expired", "error", "canceled", "cancelled"].includes(value)) return "fail";
  if (["running", "processing", "generating", "in_progress"].includes(value)) return "generating";
  return "queued";
};

const extractVideoUrls = (raw: unknown) => {
  const record = asRecord(raw);
  const content = asRecord(record.content);
  const candidates = [
    content.video_url,
    content.url,
    content.output_url,
    record.video_url,
    record.url,
    record.output_url,
  ];
  return candidates.filter((url): url is string => typeof url === "string" && url.trim().length > 0);
};

const extractArkErrorMessage = (raw: unknown) => {
  const record = asRecord(raw);
  const error = asRecord(record.error);
  return String(error.message ?? record.message ?? record.error_message ?? "Ark Seedance task failed");
};

class ArkClient {
  async createSeedanceVideoTask(input: CreateArkSeedanceTaskInput): Promise<CreateArkSeedanceTaskResult> {
    requireArkApiKey();

    const requestBody = {
      model: env.ark.videoModel,
      content: [
        {
          type: "text",
          text: input.prompt,
        },
        ...buildReferenceContents(input),
      ],
      resolution: input.resolution ?? "720p",
      ratio: input.ratio,
      duration: input.duration,
      generate_audio: input.generateAudio,
      watermark: input.watermark ?? false,
    };

    const response = await fetchWithTimeout(
      `${env.ark.baseUrl}/contents/generations/tasks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.ark.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
      env.ark.createTimeoutMs,
      "ark.createSeedanceVideoTask",
      "ARK_CREATE_TIMEOUT",
    );

    const raw = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw errors.generationFailed("ark create Seedance video task failed", raw);
    }

    const data = asRecord(raw);
    const taskId = data.id ?? data.task_id ?? data.taskId;
    if (typeof taskId !== "string" || !taskId) {
      throw errors.generationFailed("ark Seedance video response missing taskId", raw);
    }

    return {
      taskId,
      model: env.ark.videoModel,
      raw: {
        ...data,
        _usedCarPlatform: {
          provider: "ark",
          model: env.ark.videoModel,
          role: "primary",
          attemptNo: 1,
        },
      },
    };
  }

  async getTaskDetail(taskId: string): Promise<ArkTaskDetail> {
    requireArkApiKey();

    const response = await fetchWithTimeout(
      `${env.ark.baseUrl}/contents/generations/tasks/${encodeURIComponent(taskId)}`,
      {
        headers: {
          Authorization: `Bearer ${env.ark.apiKey}`,
        },
      },
      env.ark.detailTimeoutMs,
      "ark.getSeedanceTaskDetail",
      "ARK_DETAIL_TIMEOUT",
    );

    const raw = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw errors.generationFailed("ark task detail failed", raw);
    }

    const normalizedStatus = normalizeArkStatus(asRecord(raw).status);
    const resultUrls = normalizedStatus === "success" ? extractVideoUrls(raw) : [];
    const status = normalizedStatus === "success" && resultUrls.length === 0 ? "fail" : normalizedStatus;
    return {
      status,
      progress: status === "success" || status === "fail" ? 100 : status === "generating" ? 60 : 5,
      resultUrls,
      errorMessage: status === "fail" ? extractArkErrorMessage(raw) : undefined,
      raw,
    };
  }
}

export const arkClient = new ArkClient();
