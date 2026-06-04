import { kieClient } from "../../providers/kie/kieClient";
import { kieKeyPool } from "../../providers/kie/kieKeyPool";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import type { CreateModuleTaskRequest } from "../../shared/types";
import { assetsRepository } from "../assets/assetsRepository";
import type { BillingRequestContext } from "../billing/billingIdentity";
import { assertCanStartGeneration } from "../subscription/subscriptionService";
import { tasksRepository } from "../tasks/tasksRepository";
import { shortVideoPrompt } from "./shortVideoPrompts";

const KIE_KLING_VIDEO_MODEL = "kling-3.0/video";
const KIE_KLING_VIDEO_OPTION_ID = "kling-3.0-video-10s";

const allowedRatios = ["16:9", "9:16", "1:1"] as const;
const allowedVideoResolutions = ["480p", "720p", "1080p"] as const;

type VideoRatio = (typeof allowedRatios)[number];
type VideoResolution = (typeof allowedVideoResolutions)[number];

const normalizeRatio = (value: unknown): VideoRatio => {
  return allowedRatios.includes(value as VideoRatio) ? (value as VideoRatio) : "16:9";
};

const normalizeVideoResolution = (value: unknown): VideoResolution => {
  return allowedVideoResolutions.includes(value as VideoResolution) ? (value as VideoResolution) : "720p";
};

const buildTaskErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : "short-video task creation failed";
  const details = error && typeof error === "object" && "details" in error ? (error as { details?: unknown }).details : undefined;

  if (details === undefined) return message;

  const detailsText = JSON.stringify(details);
  return `${message}\nKIE response: ${detailsText.slice(0, 4000)}`;
};

class ShortVideoService {
  async createTask(body: CreateModuleTaskRequest, context?: BillingRequestContext) {
    if (!body.inputAssetId) {
      throw errors.invalidParameter("inputAssetId is required");
    }

    const subscription = await assertCanStartGeneration(context);
    const asset = await assetsRepository.findById(body.inputAssetId, subscription.userKey);
    if (!asset) {
      throw errors.assetNotFound();
    }

    if (asset.purpose !== "car_exterior") {
      throw errors.invalidParameter("short-video requires a car_exterior asset", {
        assetId: asset.id,
        purpose: asset.purpose,
      });
    }
    const aspectRatio = normalizeRatio(body.outputRatio);
    const videoResolution = normalizeVideoResolution(body.extra?.videoResolution);
    const duration = 10;
    const taskId = createId("task");

    const lease = await kieKeyPool.acquire();
    let taskCreated = false;
    try {
      await tasksRepository.createWaitingTask({
        id: taskId,
        userId: subscription.userKey,
        moduleCode: "short-video",
        inputAssetId: asset.id,
        optionId: KIE_KLING_VIDEO_OPTION_ID,
        outputRatio: aspectRatio,
        resolution: "2K",
        logoAssetId: null,
        prompt: shortVideoPrompt,
        subscriptionUserKey: subscription.userKey,
        subscriptionPlanCode: subscription.planCode,
      });
      taskCreated = true;

      const uploadedVehicle = await kieClient.uploadLocalFileWithLease(
        lease,
        asset.localPath,
        "used-car-platform/short-video",
      );

      const kieTask = await kieClient.createImageToVideoTaskWithLease(lease, {
        prompt: shortVideoPrompt,
        imageUrl: uploadedVehicle.fileUrl,
        aspectRatio,
        resolution: videoResolution,
        duration,
      });

      await tasksRepository.markSubmitted({
        id: taskId,
        kieTaskId: kieTask.kieTaskId,
        kieAccountHash: kieTask.accountHash,
        requestJson: {
          model: KIE_KLING_VIDEO_MODEL,
          moduleCode: "short-video",
          prompt: shortVideoPrompt,
          startFrameUrls: [uploadedVehicle.fileUrl],
          aspectRatio,
          videoResolution,
          duration,
        },
        responseJson: kieTask.raw,
      });

      return {
        taskId,
        moduleCode: "short-video",
        status: "queued",
        progress: 5,
        kieTaskId: kieTask.kieTaskId,
        model: KIE_KLING_VIDEO_MODEL,
        duration,
        aspectRatio,
        videoResolution,
        inputImageCount: 1,
        pollingUrl: `/api/v1/tasks/${taskId}`,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      try {
        if (taskCreated) {
          await tasksRepository.markFailed(
            taskId,
            "SHORT_VIDEO_CREATE_FAILED",
            buildTaskErrorMessage(error),
          );
        }
      } finally {
        await kieKeyPool.release(lease.accountHash);
      }
      throw error;
    }
  }
}

export const shortVideoService = new ShortVideoService();
