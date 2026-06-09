import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import { assetsRepository } from "../assets/assetsRepository";
import { tasksRepository } from "../tasks/tasksRepository";
import { tasksService } from "../tasks/tasksService";
import { kieClient } from "../../providers/kie/kieClient";
import { kieKeyPool } from "../../providers/kie/kieKeyPool";
import type { KieAccountLease } from "../../providers/kie/kieTypes";
import {
  logoPlacementMode,
  resolveLogoPlacements,
  unsupportedLogoPlacements,
} from "../../shared/logoPlacements";
import { resolveOutputRatio } from "../../shared/outputRatio";
import { IMAGE_GENERATION_RESOLUTION, type OutputRatio } from "../../shared/types";
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
import {
  batchItemGenerationPoints,
  batchWallLogoSceneGenerationPoints,
} from "../billing/generationPointRules";
import { deliveryRepository } from "../delivery/deliveryRepository";
import { assertCanStartBatchGeneration, type SubscriptionIdentity } from "../subscription/subscriptionService";
import {
  batchInteriorCleanCollagePrompt,
  batchInteriorCollagePrompt,
  batchInteriorPrompt,
  batchWallLogoScenePrompt,
  resolveBatchExteriorPrompt,
  resolveBatchExteriorPromptWithBrandedScene,
} from "./batchPrompts";
import { batchRepository, type BatchTaskRecord } from "./batchRepository";
import {
  resolveBatchScene,
  resolveBatchSceneReferenceImageUrl,
  shouldUploadBatchSceneFromLocalPath,
} from "./batchScenes";
import type { BatchItemKind, BatchItemSummary, BatchVisualConfig, CreateBatchTaskRequest } from "./batchTypes";
import { normalizeTaskResults, type GenerationTaskRecord } from "../tasks/tasksRepository";

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

const requireBatchLogoAsset = async (config: BatchVisualConfig, userId: string) => {
  if (!config.useRecentLogo) return null;
  if (!config.logoAssetId) {
    throw errors.invalidParameter("logoAssetId is required when useRecentLogo is enabled");
  }

  const asset = await assetsRepository.findById(config.logoAssetId, userId);
  if (!asset) throw errors.assetNotFound();
  if (asset.purpose !== "logo") {
    throw errors.invalidParameter("logoAssetId must point to a logo asset", {
      assetId: asset.id,
      purpose: asset.purpose,
    });
  }
  return asset;
};

const resolveBatchLogoPlacements = (config: BatchVisualConfig) =>
  resolveLogoPlacements({
    enabled: config.useRecentLogo === true,
    logoPlacements: config.logoPlacements,
    legacyDefault: ["plate"],
  });

const validateBatchLogoPlacements = (config: BatchVisualConfig) => {
  const placements = resolveBatchLogoPlacements(config);
  if (!placements.length) return placements;
  if (placements.includes("wall") && !booleanFlag(config, "enableSceneChange")) {
    throw errors.invalidParameter("wall logo placement requires scene change", {
      logoPlacements: placements,
    });
  }
  if (booleanFlag(config, "enableSceneChange")) {
    const scene = resolveBatchScene(config.sceneOptionId, config.sceneReferenceImageUrl);
    const supportedLogoPlacements = scene.supportedLogoPlacements ?? ["plate", "wall"];
    const unsupportedPlacements = unsupportedLogoPlacements(placements, supportedLogoPlacements);
    if (unsupportedPlacements.length) {
      throw errors.invalidParameter("selected batch scene does not support requested logo placement", {
        optionId: scene.optionId,
        sceneOptionId: config.sceneOptionId,
        unsupportedPlacements,
        supportedLogoPlacements,
      });
    }
  }
  return placements;
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

const batchWallLogoSceneFunctionCode = "batch-new-wall-logo-scene";

const batchItemBillingScope = (itemId: string) => ({
  bizType: "batch_item",
  bizId: itemId,
  idempotencyType: "batch_item",
  idempotencyId: itemId,
});

const batchWallLogoSceneBillingScope = (batchId: string) => ({
  bizType: "batch_wall_logo_scene",
  bizId: batchId,
  idempotencyType: "batch_wall_logo_scene",
  idempotencyId: batchId,
});

const batchBillingBody = (batch: BatchTaskRecord) => ({
  creditsUserId: batch.creditsUserId,
  creditsTenantId: batch.creditsTenantId,
  accountScope: batch.accountScope,
});

const requiresBatchWallLogoScene = (config: BatchVisualConfig) =>
  booleanFlag(config, "enableSceneChange") &&
  config.useRecentLogo === true &&
  resolveBatchLogoPlacements(config).includes("wall");

const kieTimeoutErrorCodes = [
  "KIE_UPLOAD_TIMEOUT",
  "KIE_CREATE_TIMEOUT",
  "KIE_DETAIL_TIMEOUT",
  "KIE_REQUEST_TIMEOUT",
] as const;

const extractKieTimeoutErrorCode = (error: unknown) => {
  if (!(error instanceof Error)) return null;
  return kieTimeoutErrorCodes.find((code) => error.message.includes(code)) ?? null;
};

const submitErrorCode = (error: unknown) => {
  const timeoutCode = extractKieTimeoutErrorCode(error);
  if (timeoutCode) return timeoutCode;
  if (error instanceof Error && error.message.includes("no available kie api key")) {
    return "KIE_KEY_UNAVAILABLE";
  }
  return "BATCH_ITEM_SUBMIT_FAILED";
};

class BatchService {
  async listPresets(userId: string) {
    const items = await batchRepository.listPresets(userId);
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
          userId,
          name: "5月展厅批量上新",
          visualConfig,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };
  }

  async savePreset(body: { presetId?: string; name?: string; visualConfig?: BatchVisualConfig }, userId: string) {
    if (!body.name) throw errors.invalidParameter("name is required");
    if (!body.visualConfig) throw errors.invalidParameter("visualConfig is required");

    const presetId = body.presetId || createId("preset");
    await batchRepository.upsertPreset({
      id: presetId,
      userId,
      name: body.name,
      visualConfig: body.visualConfig,
    });
    return { presetId, name: body.name, visualConfig: body.visualConfig, updatedAt: new Date().toISOString() };
  }

  async deletePreset(presetId: string, userId: string) {
    if (!presetId) throw errors.invalidParameter("presetId is required");
    const deleted = await batchRepository.deletePreset({
      id: presetId,
      userId,
    });
    return { presetId, deleted };
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

    const logoPlacements = validateBatchLogoPlacements(config);
    if (config.useRecentLogo === true && !config.logoPlacements?.length) {
      config.logoPlacements = logoPlacements;
    }
    const logoAsset = await requireBatchLogoAsset(config, subscription.userKey);
    const needsWallLogoScene = requiresBatchWallLogoScene(config);
    const brandedSceneTaskId = needsWallLogoScene ? createId("task") : null;

    for (const group of body.carGroups) {
      if (!Array.isArray(group.exteriorAssetIds) || group.exteriorAssetIds.length === 0) {
        throw errors.invalidParameter("each car group requires exteriorAssetIds");
      }
      await this.validateAssets(group.exteriorAssetIds, "car_exterior", subscription.userKey);
      total += group.exteriorAssetIds.length;
      if (interiorClean || interiorCollage) {
        const interiorAssetIds = group.interiorAssetIds ?? [];
        await this.validateAssets(interiorAssetIds, "car_interior", subscription.userKey);
        total += interiorCollage ? splitInteriorAssetIds(interiorAssetIds).length : interiorAssetIds.length;
      }
    }

    await batchRepository.createBatch({
      id: batchId,
      userId: subscription.userKey,
      projectName: body.projectName.trim(),
      presetId: body.presetId,
      total,
      visualConfig: config,
      creditsUserId: billingIdentity?.userId ?? null,
      creditsTenantId: billingIdentity?.tenantId ?? null,
      accountScope: billingIdentity?.accountScope ?? null,
      subscriptionUserKey: subscription.userKey,
      subscriptionPlanCode: subscription.planCode,
      brandedSceneTaskId,
    });

    if (brandedSceneTaskId && logoAsset) {
      const scene = resolveBatchScene(config.sceneOptionId, config.sceneReferenceImageUrl);
      await tasksRepository.createWaitingTask({
        id: brandedSceneTaskId,
        userId: subscription.userKey,
        moduleCode: batchWallLogoSceneFunctionCode,
        inputAssetId: logoAsset.id,
        optionId: scene.optionId,
        outputRatio: outputRatioOrDefault(config.outputRatio),
        resolution: IMAGE_GENERATION_RESOLUTION,
        logoAssetId: logoAsset.id,
        prompt: batchWallLogoScenePrompt,
        subscriptionUserKey: subscription.userKey,
        subscriptionPlanCode: subscription.planCode,
      });
    }

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

    await this.advanceBatch(batchId, subscription.userKey);
    const detail = await this.getBatchDetail(batchId, subscription.userKey, false);
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

  async getBatchDetail(batchId: string, userId: string, shouldAdvance = true) {
    if (shouldAdvance) await this.advanceBatch(batchId, userId);
    const batch = await batchRepository.findBatch(batchId, userId);
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

  async listBatchTasks(input: { userId: string; status?: string; page?: number; pageSize?: number }) {
    const page = Math.max(Number(input.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(input.pageSize ?? 20), 1), 100);
    const listed = await batchRepository.listBatches({ userId: input.userId, status: input.status, page, pageSize });
    let shouldRelist = false;

    for (const item of listed.items) {
      if (item.status !== "generating") continue;
      try {
        await this.refreshActiveBatch(item.id, item.userId);
        shouldRelist = true;
      } catch {
        // Keep the batch list usable even if one upstream status refresh fails.
      }
    }

    const current = shouldRelist
      ? await batchRepository.listBatches({ userId: input.userId, status: input.status, page, pageSize })
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

  private async createWallLogoSceneTask(batch: BatchTaskRecord) {
    const logoAsset = await requireBatchLogoAsset(batch.visualConfig, batch.userId);
    if (!logoAsset) return null;
    const taskId = createId("task");
    const scene = resolveBatchScene(batch.visualConfig.sceneOptionId, batch.visualConfig.sceneReferenceImageUrl);

    await tasksRepository.createWaitingTask({
      id: taskId,
      userId: batch.userId,
      moduleCode: batchWallLogoSceneFunctionCode,
      inputAssetId: logoAsset.id,
      optionId: scene.optionId,
      outputRatio: outputRatioOrDefault(batch.visualConfig.outputRatio),
      resolution: IMAGE_GENERATION_RESOLUTION,
      logoAssetId: logoAsset.id,
      prompt: batchWallLogoScenePrompt,
      subscriptionUserKey: batch.subscriptionUserKey,
      subscriptionPlanCode: batch.subscriptionPlanCode,
    });
    await batchRepository.setBrandedSceneTask({ batchId: batch.id, taskId });
    return taskId;
  }

  private async submitWallLogoSceneTask(batch: BatchTaskRecord, task: GenerationTaskRecord) {
    const config = batch.visualConfig;
    let billing: FrozenGenerationBilling | null = null;
    let lease: KieAccountLease | null = null;
    let leaseReleasedByKieClient = false;
    let submittedToKie = false;
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
        functionCode: batchWallLogoSceneFunctionCode,
        estimatedPoints: batchWallLogoSceneGenerationPoints(),
        body: batchBillingBody(batch),
        scope: batchWallLogoSceneBillingScope(batch.id),
      });

      const scene = resolveBatchScene(config.sceneOptionId, config.sceneReferenceImageUrl);
      const uploadedScene =
        shouldUploadBatchSceneFromLocalPath(config.sceneReferenceImageUrl) &&
        scene.referenceImagePath
          ? await runKieOperation(() =>
              kieClient.uploadLocalFileWithLease(
                lease as KieAccountLease,
                scene.referenceImagePath as string,
                "used-car-platform/batch-new/wall-logo-scene",
              ),
            )
          : null;
      const sceneReferenceImageUrl = resolveBatchSceneReferenceImageUrl({
        sceneOptionId: config.sceneOptionId,
        sceneReferenceImageUrl: config.sceneReferenceImageUrl,
        uploadedLocalFileUrl: uploadedScene?.fileUrl,
      });
      if (!sceneReferenceImageUrl) {
        throw errors.invalidParameter("batch-new wall logo scene reference image is missing", {
          optionId: scene.optionId,
          sceneOptionId: config.sceneOptionId,
        });
      }

      const logoAsset = await requireBatchLogoAsset(config, batch.userId);
      if (!logoAsset) throw errors.assetNotFound();
      const uploadedLogo = await runKieOperation(() =>
        kieClient.uploadLocalFileWithLease(
          lease as KieAccountLease,
          logoAsset.localPath,
          "used-car-platform/batch-new/wall-logo",
        ),
      );

      const inputUrls = [sceneReferenceImageUrl, uploadedLogo.fileUrl];
      const kieTask = await runKieOperation(() =>
        kieClient.createImageToImageTaskWithLease(lease as KieAccountLease, {
          prompt: task.prompt ?? batchWallLogoScenePrompt,
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
          model: kieTask.model ?? "gpt-image-2-image-to-image",
          moduleCode: batchWallLogoSceneFunctionCode,
          batchId: batch.id,
          prompt: task.prompt,
          scene: {
            ...scene,
            referenceImageUrl: sceneReferenceImageUrl,
          },
          logoAssetId: logoAsset.id,
          inputUrls,
          aspectRatio: task.outputRatio,
          resolution: task.resolution,
          fixedExtraPoints: batchWallLogoSceneGenerationPoints(),
        },
        responseJson: kieTask.raw,
      });
      submittedToKie = true;
    } catch (error) {
      if (error instanceof Error && error.message.includes("no available kie api key")) {
        throw error;
      }
      if (submittedToKie) return;
      if (lease && !leaseReleasedByKieClient) await kieKeyPool.release(lease.accountHash);
      try {
        await refundFrozenGenerationBilling(task.id, billing, batchWallLogoSceneBillingScope(batch.id));
      } catch {
        await markGenerationBillingRefundFailed(task.id, billing);
      }
      const errorCode = submitErrorCode(error);
      const errorMessage = error instanceof Error ? error.message : "batch wall logo scene submit failed";
      await tasksRepository.markFailed(task.id, errorCode, errorMessage);
      await batchRepository.markBrandedSceneFailed({
        batchId: batch.id,
        errorCode,
        errorMessage,
      });
      await this.failWallLogoSceneItems(batch.id, batch.userId, "BATCH_BRANDED_SCENE_FAILED", errorMessage);
    }
  }

  private async refreshWallLogoSceneTask(batch: BatchTaskRecord, task: GenerationTaskRecord) {
    const detail = await tasksService.getTaskDetail(task.id, {
      finalizeBilling: false,
      userId: batch.userId,
    });
    const refreshedTask = (await tasksRepository.findById(task.id, batch.userId)) ?? task;
    if (shouldFinalizeGenerationBilling(refreshedTask)) {
      await finalizeGenerationBilling(refreshedTask, batchWallLogoSceneBillingScope(batch.id));
    }

    if (detail.status === "success") {
      const url = detail.resultImages[0]?.url;
      if (url) {
        await batchRepository.markBrandedSceneSuccess({ batchId: batch.id, url });
        return true;
      }
      await batchRepository.markBrandedSceneFailed({
        batchId: batch.id,
        errorCode: "BATCH_BRANDED_SCENE_EMPTY_RESULT",
        errorMessage: "batch wall logo scene result is empty",
      });
      await this.failWallLogoSceneItems(
        batch.id,
        batch.userId,
        "BATCH_BRANDED_SCENE_EMPTY_RESULT",
        "batch wall logo scene result is empty",
      );
      return false;
    }

    if (detail.status === "fail" || detail.status === "canceled") {
      const errorCode = detail.error?.code ?? "BATCH_BRANDED_SCENE_FAILED";
      const errorMessage = detail.error?.message ?? "batch wall logo scene failed";
      await batchRepository.markBrandedSceneFailed({
        batchId: batch.id,
        errorCode,
        errorMessage,
      });
      await this.failWallLogoSceneItems(batch.id, batch.userId, "BATCH_BRANDED_SCENE_FAILED", errorMessage);
    }
    return false;
  }

  private async ensureWallLogoSceneReady(batch: BatchTaskRecord) {
    if (!requiresBatchWallLogoScene(batch.visualConfig)) return true;
    if (batch.brandedSceneUrl) return true;
    if (batch.brandedSceneErrorCode) return false;

    const taskId = batch.brandedSceneTaskId ?? (await this.createWallLogoSceneTask(batch));
    if (!taskId) return false;
    const task = await tasksRepository.findById(taskId, batch.userId);
    if (!task) {
      await batchRepository.markBrandedSceneFailed({
        batchId: batch.id,
        errorCode: "BATCH_BRANDED_SCENE_TASK_MISSING",
        errorMessage: "batch wall logo scene task is missing",
      });
      await this.failWallLogoSceneItems(
        batch.id,
        batch.userId,
        "BATCH_BRANDED_SCENE_TASK_MISSING",
        "batch wall logo scene task is missing",
      );
      return false;
    }

    if (task.status === "waiting") {
      await this.submitWallLogoSceneTask(batch, task);
      return false;
    }

    if (!terminalStatuses.includes(task.status)) {
      return this.refreshWallLogoSceneTask(batch, task);
    }

    const results = normalizeTaskResults(task.resultJson);
    if (task.status === "success" && results[0]?.url) {
      await batchRepository.markBrandedSceneSuccess({ batchId: batch.id, url: results[0].url });
      if (shouldFinalizeGenerationBilling(task)) {
        await finalizeGenerationBilling(task, batchWallLogoSceneBillingScope(batch.id));
      }
      return true;
    }

    const errorCode = task.errorCode ?? "BATCH_BRANDED_SCENE_FAILED";
    const errorMessage = task.errorMessage ?? "batch wall logo scene failed";
    await batchRepository.markBrandedSceneFailed({
      batchId: batch.id,
      errorCode,
      errorMessage,
    });
    await this.failWallLogoSceneItems(batch.id, batch.userId, "BATCH_BRANDED_SCENE_FAILED", errorMessage);
    if (shouldFinalizeGenerationBilling(task)) {
      await finalizeGenerationBilling(task, batchWallLogoSceneBillingScope(batch.id));
    }
    return false;
  }

  private async failWallLogoSceneItems(batchId: string, userId: string, errorCode: string, errorMessage: string) {
    const items = await batchRepository.listItems(batchId);
    for (const item of items) {
      if (item.itemKind !== "exterior" || terminalStatuses.includes(item.status)) continue;
      await tasksRepository.markFailed(item.generationTaskId, errorCode, errorMessage);
      const failedTask = await tasksRepository.findById(item.generationTaskId, userId);
      if (failedTask && shouldFinalizeGenerationBilling(failedTask)) {
        await finalizeGenerationBilling(failedTask, batchItemBillingScope(item.itemId));
      }
      await batchRepository.updateItemFromTask({
        itemId: item.itemId,
        status: "fail",
        progress: 100,
        resultCount: 0,
        errorCode,
        errorMessage,
      });
    }
  }

  private async refreshActiveBatch(batchId: string, userId: string) {
    const batch = await batchRepository.findBatch(batchId, userId);
    if (!batch) throw errors.batchNotFound();
    try {
      await this.ensureWallLogoSceneReady(batch);
    } catch (error) {
      if (!(error instanceof Error && error.message.includes("no available kie api key"))) {
        throw error;
      }
    }
    const items = await batchRepository.listItems(batchId);
    for (const item of items) {
      if (item.status === "waiting") continue;
      if (!terminalStatuses.includes(item.status)) {
        await this.refreshItem(batchId, item, userId);
      } else if (item.status === "success" && item.resultCount === 0) {
        await this.persistDeliveryAssets(batchId, item, userId);
      }
    }
    await batchRepository.recalcBatch(batchId);
    await batchRepository.recalcBatchBilling(batchId);
  }

  async advanceBatch(batchId: string, userId?: string) {
    let batch = await batchRepository.findBatch(batchId, userId);
    if (!batch) throw errors.batchNotFound();
    let wallLogoSceneReady = true;
    try {
      wallLogoSceneReady = await this.ensureWallLogoSceneReady(batch);
    } catch (error) {
      if (error instanceof Error && error.message.includes("no available kie api key")) {
        wallLogoSceneReady = false;
      } else {
        throw error;
      }
    }
    if (wallLogoSceneReady && requiresBatchWallLogoScene(batch.visualConfig)) {
      batch = (await batchRepository.findBatch(batchId, userId)) ?? batch;
    }

    const items = await batchRepository.listItems(batchId);
    for (const item of items) {
      if (!terminalStatuses.includes(item.status)) {
        await this.refreshItem(batchId, item, batch.userId);
      } else if (item.status === "success" && item.resultCount === 0) {
        await this.persistDeliveryAssets(batchId, item, batch.userId);
      }
    }

    if (!wallLogoSceneReady) {
      await batchRepository.recalcBatch(batchId);
      await batchRepository.recalcBatchBilling(batchId);
      return;
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
          errorCode: submitErrorCode(error),
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
    const asset = await assetsRepository.findById(input.assetIds[0], input.subscription.userKey);
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
      input.itemKind === "exterior"
        ? requiresBatchWallLogoScene(input.config)
          ? resolveBatchExteriorPromptWithBrandedScene(input.config)
          : resolveBatchExteriorPrompt(input.config)
        : resolveInteriorPrompt(input.itemKind);
    await tasksRepository.createWaitingTask({
      id: taskId,
      userId: input.subscription.userKey,
      moduleCode: "batch-new",
      inputAssetId: asset.id,
      optionId: input.optionId ?? input.itemKind,
      outputRatio: outputRatioOrDefault(input.config.outputRatio),
      resolution: IMAGE_GENERATION_RESOLUTION,
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

  private async validateAssets(assetIds: string[], expectedPurpose: "car_exterior" | "car_interior", userId: string) {
    for (const assetId of assetIds) {
      const asset = await assetsRepository.findById(assetId, userId);
      if (!asset) throw errors.assetNotFound();
      if (asset.purpose !== expectedPurpose) {
        throw errors.invalidParameter(`asset must be ${expectedPurpose}`, {
          assetId: asset.id,
          purpose: asset.purpose,
        });
      }
    }
  }

  private async refreshItem(batchId: string, item: BatchItemSummary, userId: string) {
    const task = await tasksService.getTaskDetail(item.generationTaskId, {
      finalizeBilling: false,
      userId,
    });
    const refreshedTask = await tasksRepository.findById(item.generationTaskId, userId);
    if (refreshedTask && shouldFinalizeGenerationBilling(refreshedTask)) {
      await finalizeGenerationBilling(refreshedTask, batchItemBillingScope(item.itemId));
    }
    const resultCount = task.resultImages.length;
    await batchRepository.updateItemFromTask({
      itemId: item.itemId,
      status: task.status,
      progress: task.progress,
      resultCount,
      errorCode: task.error?.code ?? null,
      errorMessage: task.error?.message ?? null,
    });
    if (task.status === "success") {
      await this.persistDeliveryAssets(batchId, item, userId);
    }
  }

  private async submitItem(batch: BatchTaskRecord, item: BatchItemSummary) {
    const config = batch.visualConfig;
    const task = await tasksRepository.findById(item.generationTaskId, batch.userId);
    if (!task) throw errors.taskNotFound();
    if (!task.inputAssetId) throw errors.assetNotFound();
    const sourceAssetIds = item.sourceAssetIds?.length ? item.sourceAssetIds : [task.inputAssetId];
    const sourceAssets = [];
    for (const assetId of sourceAssetIds) {
      const asset = await assetsRepository.findById(assetId, batch.userId);
      if (!asset) throw errors.assetNotFound();
      sourceAssets.push(asset);
    }

    const inputUrls: string[] = [];
    const wallLogoSceneMode = item.itemKind === "exterior" && requiresBatchWallLogoScene(config);
    const logoPlacements = resolveBatchLogoPlacements(config);
    let billing: FrozenGenerationBilling | null = null;
    let lease: KieAccountLease | null = null;
    let leaseReleasedByKieClient = false;
    let submittedToKie = false;
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
        if (wallLogoSceneMode) {
          if (!batch.brandedSceneUrl) {
            throw errors.invalidParameter("batch-new branded scene is not ready", {
              batchId: batch.id,
              brandedSceneTaskId: batch.brandedSceneTaskId,
            });
          }
          inputUrls.push(batch.brandedSceneUrl);
        } else {
          const scene = resolveBatchScene(
            config.sceneOptionId,
            config.sceneReferenceImageUrl,
          );
          const uploadedScene =
            shouldUploadBatchSceneFromLocalPath(config.sceneReferenceImageUrl) &&
            scene.referenceImagePath
              ? await runKieOperation(() =>
                  kieClient.uploadLocalFileWithLease(
                    lease as KieAccountLease,
                    scene.referenceImagePath as string,
                    "used-car-platform/batch-new/scene",
                  ),
                )
              : null;
          const sceneReferenceImageUrl = resolveBatchSceneReferenceImageUrl({
            sceneOptionId: config.sceneOptionId,
            sceneReferenceImageUrl: config.sceneReferenceImageUrl,
            uploadedLocalFileUrl: uploadedScene?.fileUrl,
          });
          if (!sceneReferenceImageUrl) {
            throw errors.invalidParameter("batch-new scene reference image is missing", {
              optionId: scene.optionId,
              sceneOptionId: config.sceneOptionId,
            });
          }
          inputUrls.push(sceneReferenceImageUrl);
        }
      }

      if (
        item.itemKind === "exterior" &&
        config.useRecentLogo &&
        (!wallLogoSceneMode || logoPlacements.includes("plate"))
      ) {
        const logoAsset = await requireBatchLogoAsset(config, batch.userId);
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
          model: kieTask.model ?? "gpt-image-2-image-to-image",
          moduleCode: "batch-new",
          itemKind: item.itemKind,
          prompt: task.prompt,
          inputAssetIds: sourceAssetIds,
          inputUrls,
          visualConfig: config,
          brandedSceneTaskId: wallLogoSceneMode ? batch.brandedSceneTaskId ?? null : null,
          brandedSceneUrl: wallLogoSceneMode ? batch.brandedSceneUrl ?? null : null,
          logoPlacements,
          logoPlacementMode: logoPlacementMode(logoPlacements),
          aspectRatio: task.outputRatio,
          resolution: task.resolution,
        },
        responseJson: kieTask.raw,
      });
      submittedToKie = true;
      await batchRepository.updateItemFromTask({
        itemId: item.itemId,
        status: "queued",
        progress: 5,
        resultCount: 0,
        errorCode: null,
        errorMessage: null,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("no available kie api key")) {
        throw error;
      }
      if (submittedToKie) {
        await batchRepository.updateItemFromTask({
          itemId: item.itemId,
          status: "queued",
          progress: 5,
          resultCount: 0,
          errorCode: null,
          errorMessage: null,
        });
        return;
      }
      if (lease && !leaseReleasedByKieClient) await kieKeyPool.release(lease.accountHash);
      try {
        await refundFrozenGenerationBilling(task.id, billing, batchItemBillingScope(item.itemId));
      } catch {
        await markGenerationBillingRefundFailed(task.id, billing);
      }
      await tasksRepository.markFailed(
        task.id,
        submitErrorCode(error),
        error instanceof Error ? error.message : "batch item submit failed",
      );
      throw error;
    }
  }

  private async persistDeliveryAssets(batchId: string, item: BatchItemSummary, userId: string) {
    const task = await tasksService.getTaskDetail(item.generationTaskId, {
      finalizeBilling: false,
      userId,
    });
    const refreshedTask = await tasksRepository.findById(item.generationTaskId, userId);
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
      errorCode: null,
      errorMessage: null,
    });
  }
}

export const batchService = new BatchService();
