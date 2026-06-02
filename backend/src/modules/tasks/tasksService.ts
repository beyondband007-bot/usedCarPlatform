import { createHash } from "node:crypto";
import path from "node:path";

import { env } from "../../config/env";
import { kieClient } from "../../providers/kie/kieClient";
import { kieKeyPool } from "../../providers/kie/kieKeyPool";
import { downloadFile } from "../../shared/downloadFile";
import { errors } from "../../shared/errors";
import type { TaskStatus } from "../../shared/types";
import { creativeImageRepository } from "../creative-image/creativeImageRepository";
import { syncBatchItemFromGenerationTask } from "../batch-new/batchTaskSync";
import {
  finalizeGenerationBilling,
  shouldFinalizeGenerationBilling,
} from "../billing/billingLifecycle";
import {
  normalizeTaskResults,
  tasksRepository,
  type GenerationTaskRecord,
  type RecentGenerationRecord,
} from "./tasksRepository";

const terminalStatuses: TaskStatus[] = ["success", "fail", "canceled"];
const staleWaitingTaskMs = 15 * 60 * 1000;

const getApiKeyByHash = (accountHash: string | null | undefined) => {
  if (!accountHash) return null;
  return env.kie.apiKeys.find(asyncKeyHashMatcher(accountHash)) ?? null;
};

const asyncKeyHashMatcher = (accountHash: string) => {
  return (apiKey: string) => createHash("sha256").update(apiKey).digest("hex") === accountHash;
};

class TasksService {
  async listRecentTasks(input: {
    moduleCode?: string;
    status?: string;
    page?: number;
    pageSize?: number;
    scope?: string;
  }) {
    if (!input.moduleCode && input.scope !== "all") {
      throw errors.invalidParameter(
        "moduleCode is required for module recent list. Use scope=all only for global recent list.",
      );
    }

    const page = Math.max(Number(input.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(input.pageSize ?? 20), 1), 100);
    const listed = await tasksRepository.listRecent({
      moduleCode: input.moduleCode,
      status: input.status,
      page,
      pageSize,
    });
    const shouldRelist = await this.reconcileRecentTasks(listed.items);
    const current = shouldRelist
      ? await tasksRepository.listRecent({
          moduleCode: input.moduleCode,
          status: input.status,
          page,
          pageSize,
        })
      : listed;

    return {
      items: current.items.map((task) => this.toRecentResponse(task)),
      page,
      pageSize,
      total: current.total,
    };
  }

  async getTaskDetail(taskId: string, options: { finalizeBilling?: boolean } = {}) {
    const finalizeBilling = options.finalizeBilling ?? true;
    const task = await tasksRepository.findById(taskId);
    if (!task) throw errors.taskNotFound();

    const results = normalizeTaskResults(task.resultJson);
    const shouldRefresh =
      task.kieTaskId &&
      (!terminalStatuses.includes(task.status) || (task.status === "success" && results.length === 0));

    if (shouldRefresh) {
      await this.refreshFromKie(task);
      const refreshed = await tasksRepository.findById(taskId);
      if (!refreshed) throw errors.taskNotFound();
      await this.syncCreativeConversationResult(refreshed);
      const finalized = await this.finalizeTaskBilling(refreshed, finalizeBilling);
      await this.syncCreativeConversationResult(finalized);
      return this.toResponse(finalized);
    }

    await this.syncCreativeConversationResult(task);
    const finalized = await this.finalizeTaskBilling(task, finalizeBilling);
    if (finalized !== task) await this.syncCreativeConversationResult(finalized);
    return this.toResponse(finalized);
  }

  private async reconcileRecentTasks(tasks: GenerationTaskRecord[]) {
    const activeTasks = tasks.filter(
      (task) => task.kieTaskId && !terminalStatuses.includes(task.status),
    );
    const staleWaitingTasks = tasks.filter((task) => this.isStaleWaitingTask(task));
    let changed = false;

    for (const task of staleWaitingTasks) {
      try {
        await tasksRepository.markCanceled(
          task.id,
          "STALE_WAITING_TASK_CANCELED",
          "Canceled stale waiting task with no upstream KIE job",
        );
        const canceled = await tasksRepository.findById(task.id);
        if (canceled) await syncBatchItemFromGenerationTask(canceled);
        changed = true;
      } catch {
        // Recent-task lists should stay usable even if stale cleanup fails.
      }
    }

    for (const task of activeTasks) {
      try {
        await this.refreshFromKie(task);
        const refreshed = await tasksRepository.findById(task.id);
        if (!refreshed) continue;
        await this.syncCreativeConversationResult(refreshed);
        await this.finalizeTaskBilling(refreshed, true);
        changed = true;
      } catch {
        // Recent-task lists should not fail just because one upstream status check failed.
      }
    }

    return changed;
  }

  private isStaleWaitingTask(task: GenerationTaskRecord) {
    return (
      task.status === "waiting" &&
      !task.kieTaskId &&
      Date.now() - task.createdAt.getTime() > staleWaitingTaskMs
    );
  }

  private async finalizeTaskBilling(task: GenerationTaskRecord, finalizeBilling: boolean) {
    if (!finalizeBilling || !shouldFinalizeGenerationBilling(task)) return task;

    if (task.moduleCode === "batch-new") {
      const synced = await syncBatchItemFromGenerationTask(task);
      if (!synced) return task;
    } else {
      await finalizeGenerationBilling(task);
    }

    return (await tasksRepository.findById(task.id)) ?? task;
  }

  private async syncCreativeConversationResult(task: GenerationTaskRecord) {
    if (task.moduleCode !== "creative-image" || task.status !== "success") return;
    const results = normalizeTaskResults(task.resultJson);
    if (!results[0]?.url) return;
    await creativeImageRepository.syncConversationResultByTaskId(task.id, results[0].url);
  }

  private async refreshFromKie(task: GenerationTaskRecord) {
    const apiKey = getApiKeyByHash(task.kieAccountHash);
    if (!apiKey || !task.kieTaskId) return;

    const detail = await kieClient.getTaskDetail(task.kieTaskId, apiKey);
    const status = detail.status;
    const resultImages =
      status === "success"
        ? await this.persistResultImages(task.moduleCode, detail.resultUrls)
        : detail.resultUrls.map((url) => ({ url, sourceUrl: url }));

    await tasksRepository.updateFromKie(task.id, {
      status,
      progress: detail.progress,
      resultJson: resultImages,
      errorCode: status === "fail" ? "KIE_TASK_FAILED" : null,
      errorMessage: status === "fail" ? detail.errorMessage ?? "Kie task failed" : null,
    });

    if (status === "success" && task.moduleCode === "creative-image" && resultImages[0]?.url) {
      await creativeImageRepository.syncConversationResultByTaskId(task.id, resultImages[0].url);
    }

    if (terminalStatuses.includes(status)) {
      await kieKeyPool.release(task.kieAccountHash ?? "");
    }
  }

  private async persistResultImages(moduleCode: string, sourceUrls: string[]) {
    const moduleDir = path.join(env.resultsDir, moduleCode);
    const publicBase = env.publicBaseUrl.replace(/\/$/, "");
    const results = [];

    for (const sourceUrl of sourceUrls) {
      const downloaded = await downloadFile(sourceUrl, moduleDir, moduleCode);
      results.push({
        url: `${publicBase}/results/${moduleCode}/${downloaded.fileName}`,
        sourceUrl,
        localPath: downloaded.filePath,
        contentType: downloaded.contentType,
        size: downloaded.size,
      });
    }

    return results;
  }

  private toResponse(task: GenerationTaskRecord) {
    const results = normalizeTaskResults(task.resultJson);
    return {
      taskId: task.id,
      moduleCode: task.moduleCode,
      status: task.status,
      progress: task.progress,
      kieTaskId: task.kieTaskId,
      inputAssetId: task.inputAssetId,
      optionId: task.optionId,
      outputRatio: task.outputRatio,
      resolution: task.resolution,
      resultImages: results,
      billingTaskId: task.billingTaskId ?? null,
      billingStatus: task.billingStatus ?? null,
      estimatedPoints: task.estimatedPoints ?? null,
      settledPoints: task.settledPoints ?? null,
      error:
        task.errorCode || task.errorMessage
          ? {
              code: task.errorCode,
              message: task.errorMessage,
            }
          : null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  private toRecentResponse(task: RecentGenerationRecord) {
    const results = normalizeTaskResults(task.resultJson);
    const previewImage = results[0]?.url ?? task.inputAssetUrl ?? null;
    return {
      id: task.id,
      taskId: task.id,
      moduleCode: task.moduleCode,
      title: this.buildRecentTitle(task),
      status: task.status,
      uiStatus: task.status === "queued" ? "queue" : task.status,
      progress: task.progress,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      thumbnail: previewImage,
      previewImage,
      downloadUrl: results[0]?.url ?? null,
      ratioLabel: `主图 ${task.outputRatio}`,
      sceneLabel: task.optionId,
      outputRatio: task.outputRatio,
      inputAssetId: task.inputAssetId,
      inputAssetUrl: task.inputAssetUrl,
      resultCount: results.length,
      billingTaskId: task.billingTaskId ?? null,
      billingStatus: task.billingStatus ?? null,
      estimatedPoints: task.estimatedPoints ?? null,
      settledPoints: task.settledPoints ?? null,
      error:
        task.errorCode || task.errorMessage
          ? {
              code: task.errorCode,
              message: task.errorMessage,
            }
          : null,
    };
  }

  private buildRecentTitle(task: RecentGenerationRecord) {
    const labels: Record<string, string> = {
      "showroom-light": "展厅灯光生成任务",
      "outdoor-scene": "户外场景生成任务",
      "road-motion": "道路动态生成任务",
      "sky-studio": "天空影棚生成任务",
      "paint-refresh": "烤漆翻新演示",
      "light-consistency": "光污一致化演示",
      "interior-clean": "内饰清洁演示",
      "interior-collage": "内饰拼图任务",
      "watermark-remove": "去水印演示",
      "creative-image": "创意生图任务",
      "short-video": "短视频生成任务",
      "batch-new": "批量上新子任务",
    };
    return labels[task.moduleCode] ?? `${task.moduleCode} 生成任务`;
  }
}

export const tasksService = new TasksService();
