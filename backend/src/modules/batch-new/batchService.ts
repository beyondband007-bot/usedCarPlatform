import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import { assetsRepository } from "../assets/assetsRepository";
import { tasksRepository } from "../tasks/tasksRepository";
import { tasksService } from "../tasks/tasksService";
import { userLogoService } from "../user-logo/userLogoService";
import { kieClient } from "../../providers/kie/kieClient";
import { kieKeyPool } from "../../providers/kie/kieKeyPool";
import type { KieAccountLease } from "../../providers/kie/kieTypes";
import { resolveOutputRatio } from "../../shared/outputRatio";
import type { OutputRatio } from "../../shared/types";
import {
  finalizeGenerationBilling,
  freezeGenerationBilling,
  markGenerationBillingRefundFailed,
  refundFrozenGenerationBilling,
  shouldFinalizeGenerationBilling,
  type FrozenGenerationBilling,
} from "../billing/billingLifecycle";
import {
  resolveBillingIdentity,
  type BillingRequestContext,
} from "../billing/billingIdentity";
import { batchItemGenerationPoints } from "../billing/generationPointRules";
import { deliveryRepository } from "../delivery/deliveryRepository";
import { assertCanStartBatchGeneration, type SubscriptionIdentity } from "../subscription/subscriptionService";
import {
  batchInteriorCleanCollagePrompt,
  batchInteriorCollagePrompt,
  batchInteriorPrompt,
  resolveBatchExteriorPrompt,
} from "./batchPrompts";
import { batchRepository, type BatchTaskRecord } from "./batchRepository";
import { resolveBatchScene } from "./batchScenes";
import type { BatchItemKind, BatchItemSummary, BatchVisualConfig, CreateBatchTaskRequest } from "./batchTypes";

const DEFAULT_USER_ID = "default_user";
const terminalStatuses = ["success", "fail", "canceled"];

const outputRatioOrDefault = (value?: string): OutputRatio => resolveOutputRatio(value, "1:1");

const booleanFlag = (config: BatchVisualConfig, a: keyof BatchVisualConfig, b?: keyof BatchVisualConfig) =>
  config[a] === true || (b ? config[b] === true : false);

const interiorGroupSizes = (count: number) => {
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

const splitInteriorAssetIds = (assetIds: string[]) => {
  const sizes = interiorGroupSizes(assetIds.length);
  let cursor = 0;
  return sizes.map((size) => {
    const group = assetIds.slice(cursor, cursor + size);
    cursor += size;
    return group;
  });
};

const resolveInteriorItemKind = (config: BatchVisualConfig): BatchItemKind => {
  const clean = booleanFlag(config, "enableInteriorClean", "interiorEnhance");
  const collage = booleanFlag(config, "enableInteriorCollage", "interiorCollage");
  if (clean && collage) return "interior_clean_collage";
  if (collage) return "interior_collage";
  return "interior_clean";
};

const resolveInteriorPrompt = (itemKind: BatchItemKind) => {
  if (itemKind === "interior_clean_collage") return batchInteriorCleanCollagePrompt;
  if (itemKind === "interior_collage") return batchInteriorCollagePrompt;
  return batchInteriorPrompt;
};

const deliveryTitleByKind: Record<BatchItemKind, string> = {
  exterior: "外观成片",
  interior: "内饰清洁",
  interior_clean: "内饰清洁",
  interior_collage: "内饰拼图",
  interior_clean_collage: "内饰清洁拼图",
};

const batchItemFunctionCode = (itemKind: BatchItemKind) => {
  if (itemKind === "exterior") return "batch-new-exterior";
  return "batch-new-interior";
};

const batchItemBillingScope = (itemId: string) => ({
  bizType: "batch_item",
  bizId: itemId,
  idempotencyType: "batch_item",
  idempotencyId: itemId,
});

const batchBillingBody = (batch: BatchTaskRecord) => ({
  creditsUserId: batch.creditsUserId,
  creditsTenantId: batch.creditsTenantId,
  accountScope: batch.accountScope,
});

class BatchService {
  async listPresets() {
    const items = await batchRepository.listPresets(DEFAULT_USER_ID);
    if (items.length) return { items };

    const visualConfig: BatchVisualConfig = {
      enableSceneChange: true,
      sceneOptionId: "white-studio",
      sceneIndex: 0,
      sceneCategory: "展厅灯光",
      outputRatio: "1:1",
      useRecentLogo: false,
      enableLightConsistency: true,
      enablePaintRefresh: false,
      colorCode: null,
      enableInteriorClean: false,
      enableInteriorCollage: false,
    };
    return {
      items: [
        {
          presetId: "tpl-may-showroom",
          userId: DEFAULT_USER_ID,
          name: "5月展厅批量上新",
          visualConfig,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };
  }

  async savePreset(body: { presetId?: string; name?: string; visualConfig?: BatchVisualConfig }) {
    if (!body.name) throw errors.invalidParameter("name is required");
    if (!body.visualConfig) throw errors.invalidParameter("visualConfig is required");

    const presetId = body.presetId || createId("preset");
    await batchRepository.upsertPreset({
      id: presetId,
      userId: DEFAULT_USER_ID,
      name: body.name,
      visualConfig: body.visualConfig,
    });
    return { presetId, name: body.name, visualConfig: body.visualConfig, updatedAt: new Date().toISOString() };
  }

  async createBatchTask(body: CreateBatchTaskRequest, context?: BillingRequestContext) {
    if (!body.projectName?.trim()) throw errors.invalidParameter("projectName is required");
    if (!body.presetId) throw errors.invalidParameter("presetId is required");
    if (!Array.isArray(body.carGroups) || body.carGroups.length === 0) {
      throw errors.invalidParameter("carGroups is required");
    }
    if (!body.visualConfig) throw errors.invalidParameter("visualConfig is required");

    const billingIdentity = await resolveBillingIdentity(body, context);
    const subscription = await assertCanStartBatchGeneration(context);
    const batchId = createId("batch");
    const config = body.visualConfig;
    const interiorClean = booleanFlag(config, "enableInteriorClean", "interiorEnhance");
    const interiorCollage = booleanFlag(config, "enableInteriorCollage", "interiorCollage");
    let total = 0;

    for (const group of body.carGroups) {
      if (!Array.isArray(group.exteriorAssetIds) || group.exteriorAssetIds.length === 0) {
        throw errors.invalidParameter("each car group requires exteriorAssetIds");
      }
      await this.validateAssets(group.exteriorAssetIds, "car_exterior");
      total += group.exteriorAssetIds.length;
      if (interiorClean || interiorCollage) {
        const interiorAssetIds = group.interiorAssetIds ?? [];
        await this.validateAssets(interiorAssetIds, "car_interior");
        total += interiorCollage ? splitInteriorAssetIds(interiorAssetIds).length : interiorAssetIds.length;
      }
    }

    await batchRepository.createBatch({
      id: batchId,
      projectName: body.projectName.trim(),
      presetId: body.presetId,
      total,
      visualConfig: config,
      creditsUserId: billingIdentity?.userId ?? null,
      creditsTenantId: billingIdentity?.tenantId ?? null,
      accountScope: billingIdentity?.accountScope ?? null,
      subscriptionUserKey: subscription.userKey,
      subscriptionPlanCode: subscription.planCode,
    });

    let sortOrder = 0;
    for (const [groupIndex, group] of body.carGroups.entries()) {
      const groupTitle = group.groupTitle || group.title || `图组 ${groupIndex + 1}`;
      for (const assetId of group.exteriorAssetIds) {
        await this.createSubTask({
          batchId,
          groupTitle,
          assetIds: [assetId],
          itemKind: "exterior",
          sortOrder: sortOrder++,
          config,
          subscription,
        });
      }
      if (interiorClean || interiorCollage) {
        const interiorAssetIds = group.interiorAssetIds ?? [];
        const itemKind = resolveInteriorItemKind(config);
        const interiorGroups = interiorCollage
          ? splitInteriorAssetIds(interiorAssetIds)
          : interiorAssetIds.map((assetId) => [assetId]);
        for (const [interiorGroupIndex, assetIds] of interiorGroups.entries()) {
          await this.createSubTask({
            batchId,
            groupTitle,
            assetIds,
            itemKind,
            sortOrder: sortOrder++,
            config,
            subscription,
            optionId:
              interiorCollage && interiorGroups.length > 1
                ? `${itemKind}-${interiorGroupIndex + 1}-of-${interiorGroups.length}`
                : itemKind,
          });
        }
      }
    }

    await this.advanceBatch(batchId);
    const detail = await this.getBatchDetail(batchId, false);
    return {
      batchId,
      projectName: body.projectName.trim(),
      status: detail.status,
      total: detail.total,
      completed: detail.completed,
      failed: detail.failed,
      progress: detail.progress,
      pollingUrl: `/api/v1/modules/batch-new/tasks/${batchId}`,
      estimatedCost: Number(detail.estimatedPoints ?? 0),
      estimatedPoints: detail.estimatedPoints,
      settledPoints: detail.settledPoints,
      balance: 0,
      createdAt: detail.createdAt,
    };
  }

  async getBatchDetail(batchId: string, shouldAdvance = true) {
    if (shouldAdvance) await this.advanceBatch(batchId);
    const batch = await batchRepository.findBatch(batchId);
    if (!batch) throw errors.batchNotFound();
    const items = await batchRepository.listItems(batchId);
    const assetCount = await deliveryRepository.countAssets(batchId);
    return {
      batchId: batch.id,
      projectName: batch.projectName,
      presetId: batch.presetId,
      status: batch.status,
      total: batch.total,
      completed: batch.completed,
      failed: batch.failed,
      progress: batch.progress,
      assetCount,
      visualConfig: batch.visualConfig,
      items,
      creditsUserId: batch.creditsUserId ?? null,
      creditsTenantId: batch.creditsTenantId ?? null,
      accountScope: batch.accountScope ?? null,
      estimatedPoints: batch.estimatedPoints ?? null,
      settledPoints: batch.settledPoints ?? null,
      createdAt: batch.createdAt.toISOString(),
      updatedAt: batch.updatedAt.toISOString(),
    };
  }

  async listBatchTasks(input: { status?: string; page?: number; pageSize?: number }) {
    const page = Math.max(Number(input.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(input.pageSize ?? 20), 1), 100);
    const listed = await batchRepository.listBatches({ status: input.status, page, pageSize });
    let shouldRelist = false;

    for (const item of listed.items) {
      if (item.status !== "generating") continue;
      try {
        await this.refreshActiveBatch(item.id);
        shouldRelist = true;
      } catch {
        // Keep the batch list usable even if one upstream status refresh fails.
      }
    }

    const current = shouldRelist
      ? await batchRepository.listBatches({ status: input.status, page, pageSize })
      : listed;

    return {
      items: current.items.map((item) => ({
        batchId: item.id,
        projectName: item.projectName,
        status: item.status,
        total: item.total,
        completed: item.completed,
        failed: item.failed,
        progress: item.progress,
        creditsUserId: item.creditsUserId ?? null,
        creditsTenantId: item.creditsTenantId ?? null,
        accountScope: item.accountScope ?? null,
        estimatedPoints: item.estimatedPoints ?? null,
        settledPoints: item.settledPoints ?? null,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      page,
      pageSize,
      total: current.total,
    };
  }

  private async refreshActiveBatch(batchId: string) {
    const items = await batchRepository.listItems(batchId);
    for (const item of items) {
      if (item.status === "waiting") continue;
      if (!terminalStatuses.includes(item.status)) {
        await this.refreshItem(batchId, item);
      } else if (item.status === "success" && item.resultCount === 0) {
        await this.persistDeliveryAssets(batchId, item);
      }
    }
    await batchRepository.recalcBatch(batchId);
    await batchRepository.recalcBatchBilling(batchId);
  }

  async advanceBatch(batchId: string) {
    const batch = await batchRepository.findBatch(batchId);
    if (!batch) throw errors.batchNotFound();

    const items = await batchRepository.listItems(batchId);
    for (const item of items) {
      if (!terminalStatuses.includes(item.status)) {
        await this.refreshItem(batchId, item);
      } else if (item.status === "success" && item.resultCount === 0) {
        await this.persistDeliveryAssets(batchId, item);
      }
    }

    const waiting = await batchRepository.listWaitingItems(batchId, 2);
    for (const item of waiting) {
      try {
        await this.submitItem(batch, item);
      } catch (error) {
        if (error instanceof Error && error.message.includes("no available kie api key")) break;
        await batchRepository.updateItemFromTask({
          itemId: item.itemId,
          status: "fail",
          progress: 100,
          resultCount: 0,
          errorMessage: error instanceof Error ? error.message : "submit failed",
        });
      }
    }

    await batchRepository.recalcBatch(batchId);
    await batchRepository.recalcBatchBilling(batchId);
  }

  private async createSubTask(input: {
    batchId: string;
    groupTitle: string;
    assetIds: string[];
    itemKind: BatchItemKind;
    sortOrder: number;
    config: BatchVisualConfig;
    subscription: SubscriptionIdentity;
    optionId?: string;
  }) {
    const asset = await assetsRepository.findById(input.assetIds[0]);
    if (!asset) throw errors.assetNotFound();
    const expectedPurpose = input.itemKind === "exterior" ? "car_exterior" : "car_interior";
    if (asset.purpose !== expectedPurpose) {
      throw errors.invalidParameter(`${input.itemKind} asset must be ${expectedPurpose}`, {
        assetId: asset.id,
        purpose: asset.purpose,
      });
    }

    const taskId = createId("task");
    const prompt =
      input.itemKind === "exterior" ? resolveBatchExteriorPrompt(input.config) : resolveInteriorPrompt(input.itemKind);
    await tasksRepository.createWaitingTask({
      id: taskId,
      moduleCode: "batch-new",
      inputAssetId: asset.id,
      optionId: input.optionId ?? input.itemKind,
      outputRatio: outputRatioOrDefault(input.config.outputRatio),
      resolution: "2K",
      logoAssetId: null,
      prompt,
      subscriptionUserKey: input.subscription.userKey,
      subscriptionPlanCode: input.subscription.planCode,
    });
    await batchRepository.createItem({
      id: createId("batch_item"),
      batchId: input.batchId,
      groupTitle: input.groupTitle,
      itemKind: input.itemKind,
      inputAssetId: asset.id,
      sourceAssetIds: input.assetIds,
      generationTaskId: taskId,
      sortOrder: input.sortOrder,
    });
  }

  private async validateAssets(assetIds: string[], expectedPurpose: "car_exterior" | "car_interior") {
    for (const assetId of assetIds) {
      const asset = await assetsRepository.findById(assetId);
      if (!asset) throw errors.assetNotFound();
      if (asset.purpose !== expectedPurpose) {
        throw errors.invalidParameter(`asset must be ${expectedPurpose}`, {
          assetId: asset.id,
          purpose: asset.purpose,
        });
      }
    }
  }

  private async refreshItem(batchId: string, item: BatchItemSummary) {
    const task = await tasksService.getTaskDetail(item.generationTaskId, { finalizeBilling: false });
    const refreshedTask = await tasksRepository.findById(item.generationTaskId);
    if (refreshedTask && shouldFinalizeGenerationBilling(refreshedTask)) {
      await finalizeGenerationBilling(refreshedTask, batchItemBillingScope(item.itemId));
    }
    const resultCount = task.resultImages.length;
    await batchRepository.updateItemFromTask({
      itemId: item.itemId,
      status: task.status,
      progress: task.progress,
      resultCount,
      errorMessage: task.error?.message ?? null,
    });
    if (task.status === "success") {
      await this.persistDeliveryAssets(batchId, item);
    }
  }

  private async submitItem(batch: BatchTaskRecord, item: BatchItemSummary) {
    const config = batch.visualConfig;
    const task = await tasksRepository.findById(item.generationTaskId);
    if (!task) throw errors.taskNotFound();
    if (!task.inputAssetId) throw errors.assetNotFound();
    const sourceAssetIds = item.sourceAssetIds?.length ? item.sourceAssetIds : [task.inputAssetId];
    const sourceAssets = [];
    for (const assetId of sourceAssetIds) {
      const asset = await assetsRepository.findById(assetId);
      if (!asset) throw errors.assetNotFound();
      sourceAssets.push(asset);
    }

    const inputUrls: string[] = [];
    let billing: FrozenGenerationBilling | null = null;
    let lease: KieAccountLease | null = null;
    let leaseReleasedByKieClient = false;
    const runKieOperation = async <T>(operation: () => Promise<T>) => {
      try {
        return await operation();
      } catch (error) {
        leaseReleasedByKieClient = true;
        throw error;
      }
    };
    try {
      lease = await kieKeyPool.acquire();
      billing = await freezeGenerationBilling({
        taskId: task.id,
        functionCode: batchItemFunctionCode(item.itemKind),
        estimatedPoints: batchItemGenerationPoints(config),
        body: batchBillingBody(batch),
        scope: batchItemBillingScope(item.itemId),
      });

      for (const asset of sourceAssets) {
        const uploaded = await runKieOperation(() =>
          kieClient.uploadLocalFileWithLease(
            lease as KieAccountLease,
            asset.localPath,
            `used-car-platform/batch-new/${item.itemKind}`,
          ),
        );
        inputUrls.push(uploaded.fileUrl);
      }

      if (item.itemKind === "exterior" && booleanFlag(config, "enableSceneChange")) {
        const scene = resolveBatchScene(config.sceneOptionId, config.sceneIndex);
        const uploadedScene = scene.referenceImagePath
          ? await runKieOperation(() =>
              kieClient.uploadLocalFileWithLease(
                lease as KieAccountLease,
                scene.referenceImagePath as string,
                "used-car-platform/batch-new/scene",
              ),
            )
          : null;
        const sceneReferenceImageUrl =
          uploadedScene?.fileUrl ?? config.sceneReferenceImageUrl ?? scene.referenceImageUrl;
        if (!sceneReferenceImageUrl) {
          throw errors.invalidParameter("batch-new scene reference image is missing", {
            optionId: scene.optionId,
          });
        }
        inputUrls.push(sceneReferenceImageUrl);
      }

      if (item.itemKind === "exterior" && config.useRecentLogo) {
        const logoAsset = config.logoAssetId
          ? await assetsRepository.findById(config.logoAssetId)
          : await userLogoService.resolveLogoAsset();
        if (!logoAsset) throw errors.assetNotFound();
        const uploadedLogo = await runKieOperation(() =>
          kieClient.uploadLocalFileWithLease(
            lease as KieAccountLease,
            logoAsset.localPath,
            "used-car-platform/batch-new/logo",
          ),
        );
        inputUrls.push(uploadedLogo.fileUrl);
      }

      const kieTask = await runKieOperation(() =>
        kieClient.createImageToImageTaskWithLease(lease as KieAccountLease, {
          prompt: task.prompt ?? "",
          inputUrls,
          aspectRatio: task.outputRatio,
          resolution: task.resolution,
        }),
      );

      await tasksRepository.markSubmitted({
        id: task.id,
        kieTaskId: kieTask.kieTaskId,
        kieAccountHash: kieTask.accountHash,
        requestJson: {
          model: "gpt-image-2-image-to-image",
          moduleCode: "batch-new",
          itemKind: item.itemKind,
          prompt: task.prompt,
          inputAssetIds: sourceAssetIds,
          inputUrls,
          visualConfig: config,
          aspectRatio: task.outputRatio,
          resolution: task.resolution,
        },
        responseJson: kieTask.raw,
      });
      await batchRepository.updateItemFromTask({
        itemId: item.itemId,
        status: "queued",
        progress: 5,
        resultCount: 0,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("no available kie api key")) {
        throw error;
      }
      if (lease && !leaseReleasedByKieClient) await kieKeyPool.release(lease.accountHash);
      try {
        await refundFrozenGenerationBilling(task.id, billing, batchItemBillingScope(item.itemId));
      } catch {
        await markGenerationBillingRefundFailed(task.id, billing);
      }
      await tasksRepository.markFailed(
        task.id,
        "BATCH_ITEM_SUBMIT_FAILED",
        error instanceof Error ? error.message : "batch item submit failed",
      );
      throw error;
    }
  }

  private async persistDeliveryAssets(batchId: string, item: BatchItemSummary) {
    const task = await tasksService.getTaskDetail(item.generationTaskId, { finalizeBilling: false });
    const refreshedTask = await tasksRepository.findById(item.generationTaskId);
    if (refreshedTask && shouldFinalizeGenerationBilling(refreshedTask)) {
      await finalizeGenerationBilling(refreshedTask, batchItemBillingScope(item.itemId));
    }
    let index = 0;
    for (const image of task.resultImages) {
      await deliveryRepository.upsertAsset({
        id: `delivery_${item.generationTaskId}_${index}`,
        sourceTaskId: batchId,
        title: `${item.groupTitle} · ${deliveryTitleByKind[item.itemKind] ?? "成片"}`,
        url: image.url,
        thumbnailUrl: image.url,
        ratio: task.outputRatio,
        localPath: image.localPath,
      });
      index += 1;
    }
    await batchRepository.updateItemFromTask({
      itemId: item.itemId,
      status: "success",
      progress: 100,
      resultCount: task.resultImages.length,
    });
  }
}

export const batchService = new BatchService();
