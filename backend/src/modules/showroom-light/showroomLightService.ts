import { assetsRepository } from "../assets/assetsRepository";
import { kieClient } from "../../providers/kie/kieClient";
import { kieKeyPool } from "../../providers/kie/kieKeyPool";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import { appendOutputRatioPrompt, resolveOutputRatio } from "../../shared/outputRatio";
import type { CreateModuleTaskRequest } from "../../shared/types";
import {
  freezeGenerationBilling,
  markGenerationBillingRefundFailed,
  refundFrozenGenerationBilling,
  toBillingResponseFields,
  type FrozenGenerationBilling,
} from "../billing/billingLifecycle";
import type { BillingRequestContext } from "../billing/billingIdentity";
import { tasksRepository } from "../tasks/tasksRepository";
import { userLogoService } from "../user-logo/userLogoService";
import { showroomLightPrompt, showroomLightWithLogoPrompt } from "./showroomLightPrompts";
import { getShowroomLightScene } from "./showroomLightScenes";

class ShowroomLightService {
  async createTask(body: CreateModuleTaskRequest, context?: BillingRequestContext) {
    if (!body.inputAssetId) {
      throw errors.invalidParameter("inputAssetId is required");
    }

    const asset = await assetsRepository.findById(body.inputAssetId);
    if (!asset) {
      throw errors.assetNotFound();
    }

    if (asset.purpose !== "car_exterior") {
      throw errors.invalidParameter("showroom-light requires a car_exterior asset", {
        assetId: asset.id,
        purpose: asset.purpose,
      });
    }

    const shouldUseLogo = body.extra?.useLogo === true || (body as CreateModuleTaskRequest & { useLogo?: boolean }).useLogo === true;
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
      logoAsset ? showroomLightWithLogoPrompt : showroomLightPrompt,
      outputRatio,
    );
    const scene = getShowroomLightScene(body.optionId);
    const taskId = createId("task");

    await tasksRepository.createWaitingTask({
      id: taskId,
      moduleCode: "showroom-light",
      inputAssetId: asset.id,
      optionId: scene.optionId,
      outputRatio,
      resolution,
      logoAssetId: logoAsset?.id ?? null,
      prompt,
    });

    let billing: FrozenGenerationBilling | null = null;
    try {
      billing = await freezeGenerationBilling({
        taskId,
        functionCode: "showroom-light",
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

    const lease = await kieKeyPool.acquire();
    try {
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
