import { kieClient } from "../../providers/kie/kieClient";
import { kieKeyPool } from "../../providers/kie/kieKeyPool";
import { createId } from "../../shared/ids";
import { errors } from "../../shared/errors";
import { appendOutputRatioPrompt, resolveOutputRatio } from "../../shared/outputRatio";
import { IMAGE_GENERATION_RESOLUTION, type CreateModuleTaskRequest } from "../../shared/types";
import { assetsRepository } from "../assets/assetsRepository";
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
import { assertCanStartGeneration } from "../subscription/subscriptionService";
import { lightConsistencyPrompt } from "./lightConsistencyPrompts";

class LightConsistencyService {
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
      throw errors.invalidParameter("light-consistency requires a car_exterior asset", {
        assetId: asset.id,
        purpose: asset.purpose,
      });
    }

    const outputRatio = resolveOutputRatio(body.outputRatio);
    const resolution = IMAGE_GENERATION_RESOLUTION;
    const prompt = appendOutputRatioPrompt(lightConsistencyPrompt, outputRatio);
    const taskId = createId("task");

    await tasksRepository.createWaitingTask({
      id: taskId,
      userId: subscription.userKey,
      moduleCode: "light-consistency",
      inputAssetId: asset.id,
      optionId: null,
      outputRatio,
      resolution,
      logoAssetId: null,
      prompt,
      subscriptionUserKey: subscription.userKey,
      subscriptionPlanCode: subscription.planCode,
    });

    let billing: FrozenGenerationBilling | null = null;
    try {
      billing = await freezeGenerationBilling({
        taskId,
        functionCode: "light-consistency",
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
        "used-car-platform/light-consistency",
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
          moduleCode: "light-consistency",
          prompt,
          inputUrls,
          aspectRatio: outputRatio,
          resolution,
        },
        responseJson: kieTask.raw,
      });

      return {
        taskId,
        moduleCode: "light-consistency",
        status: "queued",
        progress: 5,
        kieTaskId: kieTask.kieTaskId,
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
        "LIGHT_CONSISTENCY_CREATE_FAILED",
        error instanceof Error ? error.message : "light-consistency task creation failed",
      );
      throw error;
    }
  }
}

export const lightConsistencyService = new LightConsistencyService();
