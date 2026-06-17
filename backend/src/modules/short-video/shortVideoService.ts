import { env } from "../../config/env";
import { arkClient } from "../../providers/ark/arkClient";
import { kieClient } from "../../providers/kie/kieClient";
import { kieKeyPool } from "../../providers/kie/kieKeyPool";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import { IMAGE_GENERATION_RESOLUTION, type CreateModuleTaskRequest } from "../../shared/types";
import { assetsRepository } from "../assets/assetsRepository";
import {
  freezeGenerationBilling,
  markGenerationBillingRefundFailed,
  refundFrozenGenerationBilling,
  toBillingResponseFields,
  type FrozenGenerationBilling,
} from "../billing/billingLifecycle";
import type { BillingRequestContext } from "../billing/billingIdentity";
import { shortVideoGenerationPoints } from "../billing/generationPointRules";
import { assertCanStartGeneration } from "../subscription/subscriptionService";
import { tasksRepository } from "../tasks/tasksRepository";
import { shortVideoPrompt } from "./shortVideoPrompts";

const ARK_SEEDANCE_VIDEO_OPTION_ID = "doubao-seedance-2-0-10s";

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
    let billing: FrozenGenerationBilling | null = null;
    let billingFreezeFailed = false;
    try {
      await tasksRepository.createWaitingTask({
        id: taskId,
        userId: subscription.userKey,
        moduleCode: "short-video",
        inputAssetId: asset.id,
        optionId: ARK_SEEDANCE_VIDEO_OPTION_ID,
        outputRatio: aspectRatio,
        resolution: IMAGE_GENERATION_RESOLUTION,
        logoAssetId: null,
        prompt: shortVideoPrompt,
        subscriptionUserKey: subscription.userKey,
        subscriptionPlanCode: subscription.planCode,
      });
      taskCreated = true;

      try {
        billing = await freezeGenerationBilling({
          taskId,
          functionCode: "short-video",
          estimatedPoints: shortVideoGenerationPoints(),
          body,
          context,
        });
      } catch (error) {
        billingFreezeFailed = true;
        await tasksRepository.markFailed(
          taskId,
          "BILLING_FREEZE_FAILED",
          error instanceof Error ? error.message : "billing freeze failed",
        );
        throw error;
      }

      const uploadedVehicle = await kieClient.uploadLocalFileWithLease(
        lease,
        asset.localPath,
        "used-car-platform/short-video",
      );
      await kieKeyPool.release(lease.accountHash);

      const arkTask = await arkClient.createSeedanceVideoTask({
        prompt: shortVideoPrompt,
        referenceImageUrls: [uploadedVehicle.fileUrl],
        ratio: aspectRatio,
        resolution: videoResolution,
        duration: duration as 10,
        generateAudio: false,
      });

      await tasksRepository.markSubmitted({
        id: taskId,
        kieTaskId: arkTask.taskId,
        kieAccountHash: "ark",
        model: env.ark.videoModel,
        requestJson: {
          provider: "ark",
          model: env.ark.videoModel,
          moduleCode: "short-video",
          prompt: shortVideoPrompt,
          referenceImageUrls: [uploadedVehicle.fileUrl],
          aspectRatio,
          videoResolution,
          duration,
          generateAudio: false,
        },
        responseJson: arkTask.raw,
      });

      return {
        taskId,
        moduleCode: "short-video",
        status: "queued",
        progress: 5,
        kieTaskId: arkTask.taskId,
        model: env.ark.videoModel,
        duration,
        aspectRatio,
        videoResolution,
        inputImageCount: 1,
        ...toBillingResponseFields(billing),
        pollingUrl: `/api/v1/tasks/${taskId}`,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      try {
        if (billing) {
          try {
            await refundFrozenGenerationBilling(taskId, billing);
          } catch {
            await markGenerationBillingRefundFailed(taskId, billing);
          }
        }
        if (taskCreated && !billingFreezeFailed) {
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
