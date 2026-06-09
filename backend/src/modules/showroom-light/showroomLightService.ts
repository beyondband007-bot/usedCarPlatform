import { assetsRepository } from "../assets/assetsRepository";
import { kieClient } from "../../providers/kie/kieClient";
import { kieKeyPool } from "../../providers/kie/kieKeyPool";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import {
  logoPlacementMode,
  resolveLogoPlacements,
  unsupportedLogoPlacements,
} from "../../shared/logoPlacements";
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
import { buildShowroomLightPrompt } from "./showroomLightPrompts";
import { getShowroomLightScene, showroomLightScenes } from "./showroomLightScenes";

class ShowroomLightService {
  listScenes() {
    return {
      items: showroomLightScenes.map((scene) => ({
        optionId: scene.optionId,
        title: scene.title,
        referenceImageUrl: scene.referenceImageUrl ?? null,
        supportedLogoPlacements: scene.supportedLogoPlacements,
        disabledLogoPlacementReasons: scene.disabledLogoPlacementReasons ?? {},
      })),
    };
  }

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
      throw errors.invalidParameter("showroom-light requires a car_exterior asset", {
        assetId: asset.id,
        purpose: asset.purpose,
      });
    }

    const shouldUseLogo = body.extra?.useLogo === true || body.useLogo === true;
    const scene = getShowroomLightScene(body.optionId);
    const logoPlacements = resolveLogoPlacements({
      enabled: shouldUseLogo,
      logoPlacements: body.logoPlacements,
      extraLogoPlacements: body.extra?.logoPlacements,
      legacyDefault: ["plate"],
    });
    const unsupportedPlacements = unsupportedLogoPlacements(
      logoPlacements,
      scene.supportedLogoPlacements,
    );
    if (unsupportedPlacements.length) {
      throw errors.invalidParameter("selected showroom scene does not support requested logo placement", {
        optionId: scene.optionId,
        unsupportedPlacements,
        supportedLogoPlacements: scene.supportedLogoPlacements,
      });
    }
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
      buildShowroomLightPrompt(logoAsset ? logoPlacements : []),
      outputRatio,
    );
    const taskId = createId("task");
    const logoMode = logoPlacementMode(logoAsset ? logoPlacements : []);

    await tasksRepository.createWaitingTask({
      id: taskId,
      userId: subscription.userKey,
      moduleCode: "showroom-light",
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
        functionCode: "showroom-light",
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
      const uploaded = await kieClient.uploadLocalFileWithLease(
        lease,
        asset.localPath,
        "used-car-platform/showroom-light",
      );
      const uploadedScene =
        !body.sceneReferenceImageUrl && scene.referenceImagePath
          ? await kieClient.uploadLocalFileWithLease(
              lease,
              scene.referenceImagePath,
              "used-car-platform/showroom-light/scene",
            )
          : null;
      const uploadedLogo = logoAsset
        ? await kieClient.uploadLocalFileWithLease(
            lease,
            logoAsset.localPath,
            "used-car-platform/showroom-light/logo",
          )
        : null;
      const sceneReferenceImageUrl = body.sceneReferenceImageUrl ?? uploadedScene?.fileUrl ?? scene.referenceImageUrl;
      if (!sceneReferenceImageUrl) {
        throw errors.invalidParameter("showroom-light scene reference image is missing", {
          optionId: scene.optionId,
        });
      }
      const inputUrls = [
        uploaded.fileUrl,
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
          moduleCode: "showroom-light",
          prompt,
          inputUrls,
          aspectRatio: outputRatio,
          resolution,
          scene: {
            ...scene,
            referenceImageUrl: sceneReferenceImageUrl,
          },
          logoAssetId: logoAsset?.id ?? null,
          logoPlacements: logoAsset ? logoPlacements : [],
          logoPlacementMode: logoMode,
        },
        responseJson: kieTask.raw,
      });

      return {
        taskId,
        moduleCode: "showroom-light",
        status: "queued",
        progress: 5,
        kieTaskId: kieTask.kieTaskId,
        optionId: scene.optionId,
        sceneTitle: scene.title,
        sceneReferenceImageUrl,
        logoAssetId: logoAsset?.id ?? null,
        logoPlacements: logoAsset ? logoPlacements : [],
        logoPlacementMode: logoMode,
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
        "SHOWROOM_LIGHT_CREATE_FAILED",
        error instanceof Error ? error.message : "showroom-light task creation failed",
      );
      throw error;
    }
  }
}

export const showroomLightService = new ShowroomLightService();
