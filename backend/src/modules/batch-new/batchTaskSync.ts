import { finalizeGenerationBilling, shouldFinalizeGenerationBilling } from "../billing/billingLifecycle";
import { deliveryRepository } from "../delivery/deliveryRepository";
import {
  normalizeTaskResults,
  tasksRepository,
  type GenerationTaskRecord,
} from "../tasks/tasksRepository";
import { batchRepository } from "./batchRepository";
import type { BatchItemKind } from "./batchTypes";

const batchItemBillingScope = (itemId: string) => ({
  bizType: "batch_item",
  bizId: itemId,
  idempotencyType: "batch_item",
  idempotencyId: itemId,
});

const deliveryTitleByKind: Record<BatchItemKind, string> = {
  exterior: "外观成片",
  interior: "内饰清洁",
  interior_clean: "内饰清洁",
  interior_collage: "内饰拼图",
  interior_clean_collage: "内饰清洁拼图",
};

export const syncBatchItemFromGenerationTask = async (task: GenerationTaskRecord) => {
  if (task.moduleCode !== "batch-new") return false;

  const item = await batchRepository.findItemByGenerationTaskId(task.id);
  if (!item) return false;

  let currentTask = task;
  if (shouldFinalizeGenerationBilling(currentTask)) {
    await finalizeGenerationBilling(currentTask, batchItemBillingScope(item.itemId));
    currentTask = (await tasksRepository.findById(task.id)) ?? currentTask;
  }

  const results = normalizeTaskResults(currentTask.resultJson);
  await batchRepository.updateItemFromTask({
    itemId: item.itemId,
    status: currentTask.status,
    progress: currentTask.progress,
    resultCount: results.length,
    errorCode: currentTask.errorCode ?? null,
    errorMessage: currentTask.errorMessage ?? null,
  });

  if (currentTask.status === "success") {
    let index = 0;
    for (const image of results) {
      await deliveryRepository.upsertAsset({
        id: `delivery_${item.generationTaskId}_${index}`,
        sourceTaskId: item.batchId,
        title: `${item.groupTitle} · ${deliveryTitleByKind[item.itemKind] ?? "成片"}`,
        url: image.url,
        thumbnailUrl: image.url,
        ratio: currentTask.outputRatio,
        localPath: image.localPath,
      });
      index += 1;
    }
  }

  await batchRepository.recalcBatch(item.batchId);
  await batchRepository.recalcBatchBilling(item.batchId);
  return true;
};
