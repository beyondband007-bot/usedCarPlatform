import { assetsRepository } from "../assets/assetsRepository";
import { kieClient } from "../../providers/kie/kieClient";
import { kieKeyPool } from "../../providers/kie/kieKeyPool";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import { appendOutputRatioPrompt, resolveOutputRatio } from "../../shared/outputRatio";
import type { CreateModuleTaskRequest } from "../../shared/types";
import { tasksRepository } from "../tasks/tasksRepository";
import { buildPaintRefreshColorPrompt, paintRefreshPrompt } from "./paintRefreshPrompts";

interface PaintRefreshRequest extends CreateModuleTaskRequest {
  colorCode?: string;
}

const resolveColorCode = (body: PaintRefreshRequest) => {
  const direct = typeof body.colorCode === "string" ? body.colorCode.trim() : "";
  const fromExtra =
    typeof body.extra?.colorCode === "string" ? String(body.extra.colorCode).trim() : "";
  return direct || fromExtra || null;
};

class PaintRefreshService {
  async createTask(body: PaintRefreshRequest) {
    if (!body.inputAssetId) {
      throw errors.invalidParameter("inputAssetId is required");
    }

    const asset = await assetsRepository.findById(body.inputAssetId);
    if (!asset) {
      throw errors.assetNotFound();
    }

    if (asset.purpose !== "car_exterior") {
      throw errors.invalidParameter("paint-refresh requires a car_exterior asset", {
        assetId: asset.id,
        purpose: asset.purpose,
      });
    }

    const colorCode = resolveColorCode(body);
    const outputRatio = resolveOutputRatio(body.outputRatio);
    const prompt = appendOutputRatioPrompt(
      colorCode ? buildPaintRefreshColorPrompt(colorCode) : paintRefreshPrompt,
      outputRatio,
    );
    const resolution = "2K";
    const taskId = createId("task");

    await tasksRepository.createWaitingTask({
      id: taskId,
      moduleCode: "paint-refresh",
      inputAssetId: asset.id,
      optionId: colorCode,
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
        "used-car-platform/paint-refresh",
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
          moduleCode: "paint-refresh",
          prompt,
          inputUrls,
          aspectRatio: outputRatio,
          resolution,
          colorCode,
        },
        responseJson: kieTask.raw,
      });

      return {
        taskId,
        moduleCode: "paint-refresh",
        status: "queued",
        progress: 5,
        kieTaskId: kieTask.kieTaskId,
        colorCode,
        inputImageCount: inputUrls.length,
        pollingUrl: `/api/v1/tasks/${taskId}`,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      await tasksRepository.markFailed(
        taskId,
        "PAINT_REFRESH_CREATE_FAILED",
        error instanceof Error ? error.message : "paint-refresh task creation failed",
      );
      throw error;
    }
  }
}

export const paintRefreshService = new PaintRefreshService();

