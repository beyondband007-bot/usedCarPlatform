import { assetsRepository } from "../assets/assetsRepository";
import { kieClient } from "../../providers/kie/kieClient";
import { kieKeyPool } from "../../providers/kie/kieKeyPool";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import { appendOutputRatioPrompt, resolveOutputRatio } from "../../shared/outputRatio";
import type { CreateModuleTaskRequest } from "../../shared/types";
import { tasksRepository } from "../tasks/tasksRepository";
import { userLogoService } from "../user-logo/userLogoService";

export interface SceneOption {
  optionId: string;
  title: string;
  referenceImageUrl: string;
}

export interface SceneModuleConfig {
  moduleCode: string;
  uploadPath: string;
  defaultPrompt: string;
  logoPrompt: string;
  scenes: SceneOption[];
}

export const createSceneModuleService = (config: SceneModuleConfig) => {
  const getScene = (optionId?: string | null) =>
    config.scenes.find((scene) => scene.optionId === optionId) ?? config.scenes[0];

  return {
    async createTask(body: CreateModuleTaskRequest) {
      if (!body.inputAssetId) {
        throw errors.invalidParameter("inputAssetId is required");
      }

      const asset = await assetsRepository.findById(body.inputAssetId);
      if (!asset) {
        throw errors.assetNotFound();
      }

      if (asset.purpose !== "car_exterior") {
        throw errors.invalidParameter(`${config.moduleCode} requires a car_exterior asset`, {
          assetId: asset.id,
          purpose: asset.purpose,
        });
      }

      const shouldUseLogo = body.useLogo === true || body.extra?.useLogo === true;
      let logoAsset: Awaited<ReturnType<typeof assetsRepository.findById>> = null;

      if (body.logoAssetId) {
        logoAsset = await assetsRepository.findById(body.logoAssetId);
        if (!logoAsset) {
          throw errors.assetNotFound();
        }
        if (logoAsset.purpose !== "logo") {
          throw errors.invalidParameter("logoAssetId must point to a logo asset", {
            assetId: logoAsset.id,
            purpose: logoAsset.purpose,
          });
        }
      } else if (shouldUseLogo) {
        logoAsset = await userLogoService.resolveLogoAsset();
      }

      const outputRatio = resolveOutputRatio(body.outputRatio);
      const resolution = "2K";
      const prompt = appendOutputRatioPrompt(
        logoAsset ? config.logoPrompt : config.defaultPrompt,
        outputRatio,
      );
      const scene = getScene(body.optionId);
      const taskId = createId("task");

      await tasksRepository.createWaitingTask({
        id: taskId,
        moduleCode: config.moduleCode,
        inputAssetId: asset.id,
        optionId: scene.optionId,
        outputRatio,
        resolution,
        logoAssetId: logoAsset?.id ?? null,
        prompt,
      });

      const lease = await kieKeyPool.acquire();
      try {
        const uploadedVehicle = await kieClient.uploadLocalFileWithLease(
          lease,
          asset.localPath,
          config.uploadPath,
        );
        const uploadedLogo = logoAsset
          ? await kieClient.uploadLocalFileWithLease(lease, logoAsset.localPath, `${config.uploadPath}/logo`)
          : null;
        const inputUrls = [
          uploadedVehicle.fileUrl,
          scene.referenceImageUrl,
          ...(uploadedLogo ? [uploadedLogo.fileUrl] : []),
        ];
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
            moduleCode: config.moduleCode,
            prompt,
            inputUrls,
            aspectRatio: outputRatio,
            resolution,
            scene,
            logoAssetId: logoAsset?.id ?? null,
          },
          responseJson: kieTask.raw,
        });

        return {
          taskId,
          moduleCode: config.moduleCode,
          status: "queued",
          progress: 5,
          kieTaskId: kieTask.kieTaskId,
          optionId: scene.optionId,
          sceneTitle: scene.title,
          sceneReferenceImageUrl: scene.referenceImageUrl,
          logoAssetId: logoAsset?.id ?? null,
          inputImageCount: inputUrls.length,
          pollingUrl: `/api/v1/tasks/${taskId}`,
          createdAt: new Date().toISOString(),
        };
      } catch (error) {
        await tasksRepository.markFailed(
          taskId,
          `${config.moduleCode.toUpperCase().replace(/-/g, "_")}_CREATE_FAILED`,
          error instanceof Error ? error.message : `${config.moduleCode} task creation failed`,
        );
        throw error;
      }
    },
  };
};

