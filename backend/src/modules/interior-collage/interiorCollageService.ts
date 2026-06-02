import { kieClient } from "../../providers/kie/kieClient";
import { kieKeyPool } from "../../providers/kie/kieKeyPool";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import { appendOutputRatioPrompt, resolveOutputRatio } from "../../shared/outputRatio";
import type { OutputRatio, Resolution } from "../../shared/types";
import { assetsRepository, type AssetRecord } from "../assets/assetsRepository";
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
import { interiorCollagePrompt } from "./interiorCollagePrompts";

interface CreateInteriorCollageRequest {
  assetIds?: string[];
  outputRatio?: OutputRatio;
  resolution?: Resolution;
  userId?: number | string;
  creditsUserId?: number | string;
  tenantId?: number | string;
  creditsTenantId?: number | string;
  accountScope?: "personal" | "tenant";
}

const groupSizes = (count: number) => {
  if (count < 2 || count > 10) {
    throw errors.invalidParameter("interior collage requires 2-10 images", { count });
  }
  if (count <= 4) return [count];
  if (count <= 8) {
    const first = Math.ceil(count / 2);
    return [first, count - first];
  }
  return count === 9 ? [3, 3, 3] : [4, 3, 3];
};

const splitAssets = (assets: AssetRecord[]) => {
  const sizes = groupSizes(assets.length);
  let cursor = 0;
  return sizes.map((size) => {
    const group = assets.slice(cursor, cursor + size);
    cursor += size;
    return group;
  });
};

class InteriorCollageService {
  async createTasks(body: CreateInteriorCollageRequest, context?: BillingRequestContext) {
    const assetIds = Array.isArray(body.assetIds) ? body.assetIds.filter(Boolean) : [];
    if (assetIds.length < 2 || assetIds.length > 10) {
      throw errors.invalidParameter("assetIds must contain 2-10 items", { count: assetIds.length });
    }

    const duplicated = assetIds.find((assetId, index) => assetIds.indexOf(assetId) !== index);
    if (duplicated) {
      throw errors.invalidParameter("assetIds must not contain duplicates", { assetId: duplicated });
    }

    const assets = await Promise.all(assetIds.map((assetId) => assetsRepository.findById(assetId)));
    const missingIndex = assets.findIndex((asset) => !asset);
    if (missingIndex >= 0) throw errors.assetNotFound();

    const interiorAssets = assets as AssetRecord[];
    const invalid = interiorAssets.find((asset) => asset.purpose !== "car_interior");
    if (invalid) {
      throw errors.invalidParameter("interior collage requires car_interior assets", {
        assetId: invalid.id,
        purpose: invalid.purpose,
      });
    }

    const outputRatio = resolveOutputRatio(body.outputRatio);
    const resolution = body.resolution ?? "2K";
    const prompt = appendOutputRatioPrompt(interiorCollagePrompt, outputRatio);
    const groups = splitAssets(interiorAssets);
    const subscription = await assertCanStartGeneration(context, { requestedSlots: groups.length });
    const taskEntries = [];
    const tasks = [];

    for (let index = 0; index < groups.length; index += 1) {
      const group = groups[index];
      const taskId = createId("task");
      const optionId = `collage-${index + 1}-of-${groups.length}`;

      await tasksRepository.createWaitingTask({
        id: taskId,
        moduleCode: "interior-collage",
        inputAssetId: group[0].id,
        optionId,
        outputRatio,
        resolution,
        logoAssetId: null,
        prompt,
        subscriptionUserKey: subscription.userKey,
        subscriptionPlanCode: subscription.planCode,
      });

      taskEntries.push({
        taskId,
        optionId,
        group,
        groupIndex: index + 1,
        groupCount: groups.length,
        billing: null as FrozenGenerationBilling | null,
      });
    }

    try {
      for (const entry of taskEntries) {
        entry.billing = await freezeGenerationBilling({
          taskId: entry.taskId,
          functionCode: "interior-collage",
          estimatedPoints: singleImageGenerationPoints(),
          body,
          context,
        });
      }
    } catch (error) {
      await Promise.all(
        taskEntries.map(async (entry) => {
          try {
            await refundFrozenGenerationBilling(entry.taskId, entry.billing);
          } catch {
            await markGenerationBillingRefundFailed(entry.taskId, entry.billing);
          }
          await tasksRepository.markFailed(
            entry.taskId,
            "BILLING_FREEZE_FAILED",
            error instanceof Error ? error.message : "billing freeze failed",
          );
        }),
      );
      throw error;
    }

    for (const entry of taskEntries) {
      const { taskId, group, groupIndex, groupCount, billing } = entry;

      try {
        const lease = await kieKeyPool.acquire();
        const uploaded = [];
        for (const asset of group) {
          uploaded.push(
            await kieClient.uploadLocalFileWithLease(
              lease,
              asset.localPath,
              "used-car-platform/interior-collage",
            ),
          );
        }
        const inputUrls = uploaded.map((item) => item.fileUrl);
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
            moduleCode: "interior-collage",
            prompt,
            inputAssetIds: group.map((asset) => asset.id),
            inputUrls,
            groupIndex,
            groupCount,
            aspectRatio: outputRatio,
            resolution,
          },
          responseJson: kieTask.raw,
        });

        tasks.push({
          taskId,
          moduleCode: "interior-collage",
          status: "queued",
          progress: 5,
          kieTaskId: kieTask.kieTaskId,
          groupIndex,
          groupCount,
          inputAssetIds: group.map((asset) => asset.id),
          inputImageCount: group.length,
          ...toBillingResponseFields(billing),
          pollingUrl: `/api/v1/tasks/${taskId}`,
        });
      } catch (error) {
        try {
          await refundFrozenGenerationBilling(taskId, billing);
        } catch {
          await markGenerationBillingRefundFailed(taskId, billing);
        }
        await tasksRepository.markFailed(
          taskId,
          "INTERIOR_COLLAGE_CREATE_FAILED",
          error instanceof Error ? error.message : "interior collage task creation failed",
        );
        tasks.push({
          taskId,
          moduleCode: "interior-collage",
          status: "fail",
          progress: 100,
          groupIndex,
          groupCount,
          inputAssetIds: group.map((asset) => asset.id),
          inputImageCount: group.length,
          ...toBillingResponseFields(billing),
          pollingUrl: `/api/v1/tasks/${taskId}`,
          error: {
            code: "INTERIOR_COLLAGE_CREATE_FAILED",
            message: error instanceof Error ? error.message : "interior collage task creation failed",
          },
        });
      }
    }

    return {
      moduleCode: "interior-collage",
      status: tasks.every((task) => task.status === "fail") ? "fail" : "queued",
      inputImageCount: interiorAssets.length,
      outputCount: groups.length,
      groups: groups.map((group, index) => ({
        groupIndex: index + 1,
        inputAssetIds: group.map((asset) => asset.id),
        inputImageCount: group.length,
      })),
      tasks,
      createdAt: new Date().toISOString(),
    };
  }
}

export const interiorCollageService = new InteriorCollageService();
