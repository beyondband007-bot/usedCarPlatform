import { kieClient } from "../../providers/kie/kieClient";
import { kieKeyPool } from "../../providers/kie/kieKeyPool";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import { appendOutputRatioPrompt, resolveOutputRatio } from "../../shared/outputRatio";
import type { CreateModuleTaskRequest } from "../../shared/types";
import { assetsRepository } from "../assets/assetsRepository";
import { tasksRepository } from "../tasks/tasksRepository";
import { watermarkRemovePrompt } from "./watermarkRemovePrompts";

class WatermarkRemoveService {
  async createTask(body: CreateModuleTaskRequest) {
    if (!body.inputAssetId) {
      throw errors.invalidParameter("inputAssetId is required");
    }

    const asset = await assetsRepository.findById(body.inputAssetId);
    if (!asset) {
      throw errors.assetNotFound();
    }

    if (asset.purpose !== "car_exterior") {
      throw errors.invalidParameter("watermark-remove requires a car_exterior asset", {
        assetId: asset.id,
        purpose: asset.purpose,
      });
    }

    const outputRatio = resolveOutputRatio(body.outputRatio);
    const resolution = "2K";
    const prompt = appendOutputRatioPrompt(watermarkRemovePrompt, outputRatio);
    const taskId = createId("task");

    await tasksRepository.createWaitingTask({
      id: taskId,
      moduleCode: "watermark-remove",
      inputAssetId: asset.id,
      optionId: null,
      outputRatio,
      resolution,
      logoAssetId: null,
      prompt,
    });

    const lease = await kieKeyPool.acquire();
    try {
      const uploadedVehicle = await kieClient.uploadLocalFileWithLease(
        lease,
        asset.localPath,
        "used-car-platform/watermark-remove",
      );
      const inputUrls = [uploadedVehicle.fileUrl];
      const kieTask = await kieClient.createImageToImageTaskWithLease(lease, {
        prompt,
        inputUrls,
        aspectRatio: outputRatio,
        resolution,
      });

      await tasksRepository.markSubmitted({
        id: taskId,
        kieTaskId: kieTask.kieTaskId,
        kieAccountHash: kieTask.accountHash,
        requestJson: {
          model: "gpt-image-2-image-to-image",
          moduleCode: "watermark-remove",
          prompt,
          inputUrls,
          aspectRatio: outputRatio,
          resolution,
        },
        responseJson: kieTask.raw,
      });

      return {
        taskId,
        moduleCode: "watermark-remove",
        status: "queued",
        progress: 5,
        kieTaskId: kieTask.kieTaskId,
        inputImageCount: inputUrls.length,
        pollingUrl: `/api/v1/tasks/${taskId}`,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      await tasksRepository.markFailed(
        taskId,
        "WATERMARK_REMOVE_CREATE_FAILED",
        error instanceof Error ? error.message : "watermark-remove task creation failed",
      );
      throw error;
    }
  }
}

export const watermarkRemoveService = new WatermarkRemoveService();
