import { kieClient } from "../../providers/kie/kieClient";
import { kieKeyPool } from "../../providers/kie/kieKeyPool";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import type { CreateModuleTaskRequest } from "../../shared/types";
import { assetsRepository } from "../assets/assetsRepository";
import { tasksRepository } from "../tasks/tasksRepository";
import { interiorCleanPrompt } from "./interiorCleanPrompts";

class InteriorCleanService {
  async createTask(body: CreateModuleTaskRequest) {
    if (!body.inputAssetId) {
      throw errors.invalidParameter("inputAssetId is required");
    }

    const asset = await assetsRepository.findById(body.inputAssetId);
    if (!asset) {
      throw errors.assetNotFound();
    }

    if (asset.purpose !== "car_interior") {
      throw errors.invalidParameter("interior-clean requires a car_interior asset", {
        assetId: asset.id,
        purpose: asset.purpose,
      });
    }

    const outputRatio = "16:9";
    const resolution = "2K";
    const taskId = createId("task");

    await tasksRepository.createWaitingTask({
      id: taskId,
      moduleCode: "interior-clean",
      inputAssetId: asset.id,
      optionId: null,
      outputRatio,
      resolution,
      logoAssetId: null,
      prompt: interiorCleanPrompt,
    });

    const lease = await kieKeyPool.acquire();
    try {
      const uploadedInterior = await kieClient.uploadLocalFileWithLease(
        lease,
        asset.localPath,
        "used-car-platform/interior-clean",
      );
      const inputUrls = [uploadedInterior.fileUrl];
      const kieTask = await kieClient.createImageToImageTaskWithLease(lease, {
        prompt: interiorCleanPrompt,
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
          moduleCode: "interior-clean",
          prompt: interiorCleanPrompt,
          inputUrls,
          aspectRatio: outputRatio,
          resolution,
        },
        responseJson: kieTask.raw,
      });

      return {
        taskId,
        moduleCode: "interior-clean",
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
        "INTERIOR_CLEAN_CREATE_FAILED",
        error instanceof Error ? error.message : "interior-clean task creation failed",
      );
      throw error;
    }
  }
}

export const interiorCleanService = new InteriorCleanService();
