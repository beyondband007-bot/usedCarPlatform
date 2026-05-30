import { kieClient } from "../../providers/kie/kieClient";
import { kieKeyPool } from "../../providers/kie/kieKeyPool";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import type { CreateModuleTaskRequest } from "../../shared/types";
import { assetsRepository } from "../assets/assetsRepository";
import { tasksRepository } from "../tasks/tasksRepository";
import { shortVideoPrompt } from "./shortVideoPrompts";

const allowedRatios = ["16:9", "9:16", "1:1", "4:3", "3:4"] as const;
const allowedVideoResolutions = ["480p", "720p", "1080p"] as const;

type VideoRatio = (typeof allowedRatios)[number];
type VideoResolution = (typeof allowedVideoResolutions)[number];

const normalizeRatio = (value: unknown): VideoRatio => {
  return allowedRatios.includes(value as VideoRatio) ? (value as VideoRatio) : "16:9";
};

const normalizeVideoResolution = (value: unknown): VideoResolution => {
  return allowedVideoResolutions.includes(value as VideoResolution) ? (value as VideoResolution) : "720p";
};

class ShortVideoService {
  async createTask(body: CreateModuleTaskRequest) {
    if (!body.inputAssetId) {
      throw errors.invalidParameter("inputAssetId is required");
    }

    const asset = await assetsRepository.findById(body.inputAssetId);
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

    await tasksRepository.createWaitingTask({
      id: taskId,
      moduleCode: "short-video",
      inputAssetId: asset.id,
      optionId: "seedance-2-10s",
      outputRatio: aspectRatio,
      resolution: "2K",
      logoAssetId: null,
      prompt: shortVideoPrompt,
    });

    const lease = await kieKeyPool.acquire();
    try {
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
          model: "bytedance/seedance-2",
          moduleCode: "short-video",
          prompt: shortVideoPrompt,
          referenceImageUrls: [uploadedVehicle.fileUrl],
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
        model: "bytedance/seedance-2",
        duration,
        aspectRatio,
        videoResolution,
        inputImageCount: 1,
        pollingUrl: `/api/v1/tasks/${taskId}`,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      await tasksRepository.markFailed(
        taskId,
        "SHORT_VIDEO_CREATE_FAILED",
        error instanceof Error ? error.message : "short-video task creation failed",
      );
      throw error;
    }
  }
}

export const shortVideoService = new ShortVideoService();
