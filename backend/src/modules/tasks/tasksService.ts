import { createHash } from "node:crypto";
import path from "node:path";

import { env } from "../../config/env";
import { kieClient } from "../../providers/kie/kieClient";
import { kieKeyPool } from "../../providers/kie/kieKeyPool";
import { downloadFile } from "../../shared/downloadFile";
import { errors } from "../../shared/errors";
import type { TaskStatus } from "../../shared/types";
import {
  formatBatchItemDisplayTitle,
  getBatchItemKindDisplayLabel,
} from "../batch-new/batchDisplayTitle";
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
  type KieTaskRecord,
  type RecentGenerationRecord,
} from "./tasksRepository";

const terminalStatuses: TaskStatus[] = ["success", "fail", "canceled"];
const kieTerminalStatuses: TaskStatus[] = ["success", "fail", "canceled"];
const staleWaitingTaskMs = 15 * 60 * 1000;

const getApiKeyByHash = (accountHash: string | null | undefined) => {
  if (!accountHash) return null;
  return env.kie.apiKeys.find(asyncKeyHashMatcher(accountHash)) ?? null;
};

const asyncKeyHashMatcher = (accountHash: string) => {
  return (apiKey: string) => createHash("sha256").update(apiKey).digest("hex") === accountHash;
};

const asRecord = (value: unknown): Record<string, any> =>
  value && typeof value === "object" ? (value as Record<string, any>) : {};

const stringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const getRecordInputUrls = (record: KieTaskRecord) => {
  const request = asRecord(record.requestJson);
  const requestUrls = stringArray(request.inputUrls);
  if (requestUrls.length) return requestUrls;

  const response = asRecord(record.responseJson);
  const meta = asRecord(response._usedCarPlatform);
  return stringArray(meta.inputUrls);
};

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

class TasksService {
  async listRecentTasks(input: {
    userId: string;
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
      userId: input.userId,
      moduleCode: input.moduleCode,
      status: input.status,
      page,
      pageSize,
    });
    const shouldRelist = await this.reconcileRecentTasks(listed.items);
    const current = shouldRelist
      ? await tasksRepository.listRecent({
          userId: input.userId,
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

  async getTaskDetail(taskId: string, options: { finalizeBilling?: boolean; userId?: string } = {}) {
    const finalizeBilling = options.finalizeBilling ?? true;
    const task = await tasksRepository.findById(taskId, options.userId);
    if (!task) throw errors.taskNotFound();

    if (!terminalStatuses.includes(task.status) && this.isPastDeadline(task)) {
      await this.timeoutTask(task);
      const timedOut = await tasksRepository.findById(taskId, options.userId);
      if (!timedOut) throw errors.taskNotFound();
      const finalized = await this.finalizeTaskBilling(timedOut, finalizeBilling);
      return this.toResponse(finalized);
    }

    const results = normalizeTaskResults(task.resultJson);
    const shouldRefresh =
      task.kieTaskId &&
      (!terminalStatuses.includes(task.status) || (task.status === "success" && results.length === 0));

    if (shouldRefresh) {
      await this.refreshFromKie(task);
      const refreshed = await tasksRepository.findById(taskId, options.userId);
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
    if (this.isPastDeadline(task)) {
      await this.timeoutTask(task);
      return;
    }

    let records = await tasksRepository.listKieTaskRecords(task.id);
    if (!records.length && task.kieTaskId && task.kieAccountHash) {
      records = [
        {
          id: "legacy",
          taskId: task.id,
          kieTaskId: task.kieTaskId,
          kieAccountHash: task.kieAccountHash,
          status: task.status,
          attemptNo: 1,
          role: "primary",
          model: task.activeModel ?? env.kie.primaryImageModel,
          isWinner: false,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        },
      ];
    }

    let polledSuccessfully = false;
    for (const record of records) {
      if (kieTerminalStatuses.includes(record.status)) continue;

      const apiKey = getApiKeyByHash(record.kieAccountHash);
      if (!apiKey) continue;

      try {
        const detail = await kieClient.getTaskDetail(record.kieTaskId, apiKey);
        polledSuccessfully = true;
        await tasksRepository.markPollSuccess(task.id);
        await this.applyKieDetail(task, record, detail);
        const refreshed = await tasksRepository.findById(task.id);
        if (refreshed && terminalStatuses.includes(refreshed.status)) return;
      } catch (error) {
        const timeoutCode = extractKieTimeoutErrorCode(error);
        await tasksRepository.markPollFailure(
          task.id,
          timeoutCode ?? "KIE_DETAIL_FAILED",
        );
      }
    }

    const refreshedTask = (await tasksRepository.findById(task.id)) ?? task;
    if (terminalStatuses.includes(refreshedTask.status)) return;
    if (this.isPastDeadline(refreshedTask)) {
      await this.timeoutTask(refreshedTask);
      return;
    }

    const refreshedRecords = await tasksRepository.listKieTaskRecords(task.id);
    if (await this.shouldStartFallback(refreshedTask, refreshedRecords, polledSuccessfully)) {
      await this.startFallbackTask(refreshedTask, refreshedRecords);
      return;
    }

    if (
      refreshedRecords.length > 0 &&
      refreshedRecords.every((record) => record.status === "fail")
    ) {
      await tasksRepository.markFailed(task.id, "KIE_TASK_FAILED", "Kie task failed");
      for (const record of refreshedRecords) {
        await kieKeyPool.release(record.kieAccountHash);
      }
    }
  }

  private async applyKieDetail(
    task: GenerationTaskRecord,
    record: KieTaskRecord,
    detail: Awaited<ReturnType<typeof kieClient.getTaskDetail>>,
  ) {
    const status = detail.status;
    const resultImages =
      status === "success"
        ? await this.persistResultImages(task.moduleCode, detail.resultUrls)
        : detail.resultUrls.map((url) => ({ url, sourceUrl: url }));

    const current = await tasksRepository.findById(task.id);
    if (!current || terminalStatuses.includes(current.status)) {
      await tasksRepository.updateKieRecord({
        taskId: task.id,
        role: record.role,
        status,
        responseJson: {
          raw: detail.raw,
          resultImages,
          late: status === "success",
        },
      });
      if (terminalStatuses.includes(status)) await kieKeyPool.release(record.kieAccountHash);
      return;
    }

    await tasksRepository.updateKieRecord({
      taskId: task.id,
      role: record.role,
      status,
      responseJson: detail.raw,
      isWinner: status === "success",
    });

    if (status === "fail") {
      await kieKeyPool.release(record.kieAccountHash);
      return;
    }

    if (status === "success") {
      await tasksRepository.markWinner({
        taskId: task.id,
        role: record.role,
        model: record.model,
      });
      await this.releaseLosingKieRecords(task.id, record.role);
    }

    await tasksRepository.updateFromKie(task.id, {
      status,
      progress: detail.progress,
      resultJson: resultImages,
      errorCode: null,
      errorMessage: null,
    });

    if (status === "success" && task.moduleCode === "creative-image" && resultImages[0]?.url) {
      await creativeImageRepository.syncConversationResultByTaskId(task.id, resultImages[0].url);
    }

    if (terminalStatuses.includes(status)) {
      await kieKeyPool.release(record.kieAccountHash);
    }
  }

  private async releaseLosingKieRecords(taskId: string, winningRole: "primary" | "fallback") {
    const records = await tasksRepository.listKieTaskRecords(taskId);
    for (const record of records) {
      if (record.role === winningRole) continue;
      if (kieTerminalStatuses.includes(record.status)) continue;
      await tasksRepository.updateKieRecord({
        taskId,
        role: record.role,
        status: "canceled",
        responseJson: {
          canceledByWinner: winningRole,
          originalKieTaskId: record.kieTaskId,
          model: record.model,
        },
      });
      await kieKeyPool.release(record.kieAccountHash);
    }
  }

  private async shouldStartFallback(
    task: GenerationTaskRecord,
    records: KieTaskRecord[],
    polledSuccessfully: boolean,
  ) {
    if (!env.kie.fallbackEnabled || task.moduleCode === "short-video") return false;
    if (records.some((record) => record.role === "fallback")) return false;
    if (!records.some((record) => getRecordInputUrls(record).length > 0)) return false;
    if (this.isPastDeadline(task)) return false;
    if (records.some((record) => record.role === "primary" && record.status === "fail")) return true;
    if (task.softTimeoutAt && Date.now() >= task.softTimeoutAt.getTime()) return true;
    if (!polledSuccessfully && task.pollFailureCount >= env.kie.pollFailureLimit) return true;
    return false;
  }

  private async startFallbackTask(task: GenerationTaskRecord, records: KieTaskRecord[]) {
    const sourceRecord = records.find((record) => getRecordInputUrls(record).length > 0);
    if (!sourceRecord) return;
    const inputUrls = getRecordInputUrls(sourceRecord);
    const lease = await kieKeyPool.acquire();

    try {
      const kieTask = await kieClient.createImageToImageTaskAttempt(
        lease,
        {
          prompt: task.prompt ?? "",
          inputUrls,
          aspectRatio: task.outputRatio,
          resolution: task.resolution,
          model: env.kie.fallbackImageModel,
          outputFormat: env.kie.fallbackOutputFormat,
        },
        {
          model: env.kie.fallbackImageModel,
          role: "fallback",
          attemptNo: 2,
        },
      );

      await tasksRepository.recordFallbackStarted({
        taskId: task.id,
        kieTaskId: kieTask.kieTaskId,
        kieAccountHash: kieTask.accountHash,
        model: env.kie.fallbackImageModel,
        requestJson: {
          model: env.kie.fallbackImageModel,
          fallbackFor: sourceRecord.kieTaskId,
          prompt: task.prompt,
          inputUrls,
          aspectRatio: task.outputRatio,
          resolution: task.resolution,
          outputFormat: env.kie.fallbackOutputFormat,
        },
        responseJson: kieTask.raw,
      });
    } catch (error) {
      await kieKeyPool.markFailure(lease.accountHash);
      const timeoutCode = extractKieTimeoutErrorCode(error);
      await tasksRepository.markPollFailure(
        task.id,
        timeoutCode ?? "KIE_FALLBACK_SUBMIT_FAILED",
      );
    }
  }

  private isPastDeadline(task: GenerationTaskRecord) {
    return Boolean(task.deadlineAt && Date.now() >= task.deadlineAt.getTime());
  }

  private async timeoutTask(task: GenerationTaskRecord) {
    await tasksRepository.markTimedOut(
      task.id,
      "KIE_TASK_TIMEOUT",
      "Generation timed out. Please retry.",
    );
    const records = await tasksRepository.listKieTaskRecords(task.id);
    for (const record of records) {
      if (!kieTerminalStatuses.includes(record.status)) {
        await tasksRepository.updateKieRecord({
          taskId: task.id,
          role: record.role,
          status: "fail",
          responseJson: {
            timeout: true,
            deadlineAt: task.deadlineAt?.toISOString() ?? null,
          },
        });
      }
      await kieKeyPool.release(record.kieAccountHash);
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
      activeModel: task.activeModel ?? null,
      fallbackStarted: Boolean(task.fallbackStartedAt),
      deadlineAt: task.deadlineAt?.toISOString() ?? null,
      softTimeoutAt: task.softTimeoutAt?.toISOString() ?? null,
      winningModel: task.winningModel ?? null,
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

  private resolveRecentCover(task: RecentGenerationRecord) {
    const inputCover =
      task.inputAssetThumbnailUrl ?? task.inputAssetUrl ?? null;
    const results = normalizeTaskResults(task.resultJson);
    const firstResult = results.find((item) => item.thumbnailUrl || item.url);

    if (!firstResult) {
      return {
        coverUrl: inputCover,
        downloadUrl: null as string | null,
      };
    }

    const resultCover = firstResult.thumbnailUrl ?? firstResult.url ?? null;
    if (!resultCover) {
      return {
        coverUrl: inputCover,
        downloadUrl: null as string | null,
      };
    }

    return {
      coverUrl: resultCover,
      downloadUrl: firstResult.url ?? null,
    };
  }

  private toRecentResponse(task: RecentGenerationRecord) {
    const { coverUrl, downloadUrl } = this.resolveRecentCover(task);

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
      thumbnail: coverUrl,
      previewImage: coverUrl,
      downloadUrl,
      ratioLabel: `主图 ${task.outputRatio}`,
      sceneLabel: this.buildRecentSceneLabel(task),
      outputRatio: task.outputRatio,
      inputAssetId: task.inputAssetId,
      inputAssetThumbnailUrl: task.inputAssetThumbnailUrl ?? null,
      resultCount: normalizeTaskResults(task.resultJson).length,
      billingTaskId: task.billingTaskId ?? null,
      billingStatus: task.billingStatus ?? null,
      estimatedPoints: task.estimatedPoints ?? null,
      settledPoints: task.settledPoints ?? null,
      activeModel: task.activeModel ?? null,
      fallbackStarted: Boolean(task.fallbackStartedAt),
      deadlineAt: task.deadlineAt?.toISOString() ?? null,
      softTimeoutAt: task.softTimeoutAt?.toISOString() ?? null,
      winningModel: task.winningModel ?? null,
      error:
        task.errorCode || task.errorMessage
          ? {
              code: task.errorCode,
              message: task.errorMessage,
            }
          : null,
    };
  }

  private buildRecentSceneLabel(task: RecentGenerationRecord) {
    if (task.moduleCode === "batch-new" && task.batchItemKind) {
      return getBatchItemKindDisplayLabel(task.batchItemKind);
    }

    return task.optionId ?? null;
  }

  private buildRecentTitle(task: RecentGenerationRecord) {
    if (
      task.moduleCode === "batch-new" &&
      task.batchProjectName &&
      task.batchItemKind &&
      task.batchSortOrder !== null &&
      task.batchSortOrder !== undefined
    ) {
      return formatBatchItemDisplayTitle({
        projectName: task.batchProjectName,
        sortOrder: task.batchSortOrder,
        itemKind: task.batchItemKind,
        exteriorCount: task.batchExteriorCount ?? 0,
        interiorCollage: task.batchInteriorCollage,
        optionId: task.optionId,
      });
    }

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

  async deleteRecentTask(taskId: string, userId: string) {
    const task = await tasksRepository.findById(taskId, userId);
    if (!task) throw errors.taskNotFound();
    if (task.moduleCode === "batch-new") {
      throw errors.invalidParameter("batch-new tasks cannot be deleted from recent list");
    }

    await tasksRepository.deleteByIds([taskId]);
    return { taskId, deleted: true };
  }
}

export const tasksService = new TasksService();
