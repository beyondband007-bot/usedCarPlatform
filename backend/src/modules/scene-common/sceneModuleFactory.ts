import { assetsRepository } from "../assets/assetsRepository";
import { kieClient } from "../../providers/kie/kieClient";
import { kieKeyPool } from "../../providers/kie/kieKeyPool";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import { appendOutputRatioPrompt, resolveOutputRatio } from "../../shared/outputRatio";
import { IMAGE_GENERATION_RESOLUTION, type CreateModuleTaskRequest } from "../../shared/types";
import {
  freezeGenerationBilling,
  markGenerationBillingRefundFailed,
  refundFrozenGenerationBilling,
  toBillingResponseFields,
  type FrozenGenerationBilling,
} from "../billing/billingLifecycle";
import { singleImageGenerationPoints } from "../billing/generationPointRules";
import type { BillingRequestContext } from "../billing/billingIdentity";
import { tasksRepository } from "../tasks/tasksRepository";
import { userLogoService } from "../user-logo/userLogoService";
import { assertCanStartGeneration } from "../subscription/subscriptionService";

export interface SceneOption {
  optionId: string;
  title: string;
  referenceImageUrl?: string;
  referenceImagePath?: string;
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
        throw errors.invalidParameter(`${config.moduleCode} requires a car_exterior asset`, {
          assetId: asset.id,
          purpose: asset.purpose,
        });
      }

      const shouldUseLogo = body.useLogo === true || body.extra?.useLogo === true;
      let logoAsset: Awaited<ReturnType<typeof assetsRepository.findById>> = null;

      if (body.logoAssetId) {
        logoAsset = await assetsRepository.findById(body.logoAssetId, subscription.userKey);
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
        logoAsset = await userLogoService.resolveLogoAsset(subscription.userKey);
      }

      const outputRatio = resolveOutputRatio(body.outputRatio);
      const resolution = IMAGE_GENERATION_RESOLUTION;
      const prompt = appendOutputRatioPrompt(
        logoAsset ? config.logoPrompt : config.defaultPrompt,
        outputRatio,
      );
      const scene = getScene(body.optionId);
      const taskId = createId("task");

      await tasksRepository.createWaitingTask({
        id: taskId,
        userId: subscription.userKey,
        moduleCode: config.moduleCode,
        inputAssetId: asset.id,
        optionId: scene.optionId,
        outputRatio,
        resolution,
        logoAssetId: logoAsset?.id ?? null,
        prompt,
        subscriptionUserKey: subscription.userKey,
        subscriptionPlanCode: subscription.planCode,
      });

      let billing: FrozenGenerationBilling | null = null;
      try {
        billing = await freezeGenerationBilling({
          taskId,
          functionCode: config.moduleCode,
          estimatedPoints: singleImageGenerationPoints(),
          body,
          context,
        });
      } catch (error) {
        await tasksRepository.markFailed(
          taskId,
          "BILLING_FREEZE_FAILED",
          error instanceof Error ? error.message : "billing freeze failed",
        );
        throw error;
      }

      try {
        const lease = await kieKeyPool.acquire();
        const uploadedVehicle = await kieClient.uploadLocalFileWithLease(
          lease,
          asset.localPath,
          config.uploadPath,
        );
        const uploadedScene =
          !body.sceneReferenceImageUrl && scene.referenceImagePath
            ? await kieClient.uploadLocalFileWithLease(lease, scene.referenceImagePath, `${config.uploadPath}/scene`)
            : null;
        const uploadedLogo = logoAsset
          ? await kieClient.uploadLocalFileWithLease(lease, logoAsset.localPath, `${config.uploadPath}/logo`)
          : null;
        const sceneReferenceImageUrl = body.sceneReferenceImageUrl ?? uploadedScene?.fileUrl ?? scene.referenceImageUrl;
        if (!sceneReferenceImageUrl) {
          throw errors.invalidParameter(`${config.moduleCode} scene reference image is missing`, {
            optionId: scene.optionId,
          });
        }
        const inputUrls = [
          uploadedVehicle.fileUrl,
          sceneReferenceImageUrl,
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
            scene: {
              ...scene,
              referenceImageUrl: sceneReferenceImageUrl,
            },
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
          sceneReferenceImageUrl,
          logoAssetId: logoAsset?.id ?? null,
          inputImageCount: inputUrls.length,
          ...toBillingResponseFields(billing),
          pollingUrl: `/api/v1/tasks/${taskId}`,
          createdAt: new Date().toISOString(),
        };
      } catch (error) {
        try {
          await refundFrozenGenerationBilling(taskId, billing);
        } catch {
          await markGenerationBillingRefundFailed(taskId, billing);
        }
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
