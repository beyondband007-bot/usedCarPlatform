import { createHash } from "node:crypto";
import path from "node:path";

import { env } from "../../config/env";
import { kieClient } from "../../providers/kie/kieClient";
import { kieKeyPool } from "../../providers/kie/kieKeyPool";
import { downloadFile } from "../../shared/downloadFile";
import { errors } from "../../shared/errors";
import type { TaskStatus } from "../../shared/types";
import {
  normalizeTaskResults,
  tasksRepository,
  type GenerationTaskRecord,
} from "./tasksRepository";

const terminalStatuses: TaskStatus[] = ["success", "fail", "canceled"];

const getApiKeyByHash = (accountHash: string | null | undefined) => {
  if (!accountHash) return null;
  return env.kie.apiKeys.find(asyncKeyHashMatcher(accountHash)) ?? null;
};

const asyncKeyHashMatcher = (accountHash: string) => {
  return (apiKey: string) => createHash("sha256").update(apiKey).digest("hex") === accountHash;
};

class TasksService {
  async getTaskDetail(taskId: string) {
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
      return this.toResponse(refreshed);
    }

    return this.toResponse(task);
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

    if (status === "success" || status === "fail") {
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
}

export const tasksService = new TasksService();
