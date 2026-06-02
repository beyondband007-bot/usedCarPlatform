import { assetsRepository } from "../assets/assetsRepository";
import { kieClient } from "../../providers/kie/kieClient";
import { kieKeyPool } from "../../providers/kie/kieKeyPool";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import { appendOutputRatioPrompt, resolveOutputRatio } from "../../shared/outputRatio";
import type { CreateModuleTaskRequest } from "../../shared/types";
import { tasksRepository } from "../tasks/tasksRepository";
import { userLogoService } from "../user-logo/userLogoService";
import {
  freezeGenerationBilling,
  markGenerationBillingRefundFailed,
  refundFrozenGenerationBilling,
  toBillingResponseFields,
  type FrozenGenerationBilling,
} from "../billing/billingLifecycle";
import type { BillingRequestContext } from "../billing/billingIdentity";
import { singleImageGenerationPoints } from "../billing/generationPointRules";
import { assertCanStartGeneration } from "../subscription/subscriptionService";
import { resolveRoadMotionScene } from "./roadMotionScenes";

const moduleCode = "road-motion";
const uploadPath = "used-car-platform/road-motion";

export const roadMotionService = {
  async createTask(body: CreateModuleTaskRequest, context?: BillingRequestContext) {
    if (!body.inputAssetId) {
      throw errors.invalidParameter("inputAssetId is required");
    }

    const asset = await assetsRepository.findById(body.inputAssetId);
    if (!asset) {
      throw errors.assetNotFound();
    }

    if (asset.purpose !== "car_exterior") {
      throw errors.invalidParameter("road-motion requires a car_exterior asset", {
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

    const scene = resolveRoadMotionScene(body.optionId);
    const outputRatio = resolveOutputRatio(body.outputRatio);
    const resolution = "2K";
    const prompt = appendOutputRatioPrompt(logoAsset ? scene.logoPrompt : scene.prompt, outputRatio);
    const subscription = await assertCanStartGeneration(context);
    const taskId = createId("task");

    await tasksRepository.createWaitingTask({
      id: taskId,
      moduleCode,
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
        functionCode: moduleCode,
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
      const uploadedVehicle = await kieClient.uploadLocalFileWithLease(lease, asset.localPath, uploadPath);
      const uploadedLogo = logoAsset
        ? await kieClient.uploadLocalFileWithLease(lease, logoAsset.localPath, `${uploadPath}/logo`)
        : null;
      const inputUrls = [uploadedVehicle.fileUrl, ...(uploadedLogo ? [uploadedLogo.fileUrl] : [])];
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
          moduleCode,
          generationMode: "image-and-scene-prompt",
          prompt,
          inputUrls,
          aspectRatio: outputRatio,
          resolution,
          scene: {
            optionId: scene.optionId,
            title: scene.title,
          },
          logoAssetId: logoAsset?.id ?? null,
        },
        responseJson: kieTask.raw,
      });

      return {
        taskId,
        moduleCode,
        status: "queued",
        progress: 5,
        kieTaskId: kieTask.kieTaskId,
        optionId: scene.optionId,
        sceneTitle: scene.title,
        sceneReferenceImageUrl: null,
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
        "ROAD_MOTION_CREATE_FAILED",
        error instanceof Error ? error.message : "road-motion task creation failed",
      );
      throw error;
    }
  },
};
