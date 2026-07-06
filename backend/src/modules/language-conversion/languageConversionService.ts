import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

import { env } from "../../config/env";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import {
  languageConversionRepository,
  type LanguageConversionTaskRecord,
} from "./languageConversionRepository";

type LanguageConversionTask = {
  taskId: string;
  userId: string;
  status: LanguageConversionTaskRecord["status"];
  progress: number;
  sourceLanguage: string;
  targetLanguage: string;
  sourceFileName: string;
  sourceVideoUrl: string;
  resultVideoUrl?: string;
  localResultPath?: string;
  mpsTaskId?: string;
  outputBucket?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

type WorkerEvent = {
  event?: string;
  [key: string]: any;
};

const languageMap: Record<string, string> = {
  auto: "zh",
  "zh-CN": "zh",
  "en-US": "en",
  "ja-JP": "ja",
  "ko-KR": "ko",
  "es-ES": "es",
  "fr-FR": "fr",
  "de-DE": "de",
};

const toTencentLanguage = (value: unknown, fallback: string) => {
  if (typeof value !== "string" || !value.trim()) return fallback;
  return languageMap[value] ?? value.trim();
};

const publicPathFor = (absolutePath: string) => {
  const relative = path.relative(env.resultsDir, absolutePath).replace(/\\/g, "/");
  return `/results/${relative}`;
};

const toTaskResponse = (record: LanguageConversionTaskRecord): LanguageConversionTask => ({
  taskId: record.id,
  userId: record.userId,
  status: record.status,
  progress: record.progress,
  sourceLanguage: record.sourceLanguage,
  targetLanguage: record.targetLanguage,
  sourceFileName: record.sourceFileName,
  sourceVideoUrl: record.sourceVideoUrl,
  resultVideoUrl: record.resultVideoUrl ?? undefined,
  localResultPath: record.localResultPath ?? undefined,
  mpsTaskId: record.mpsTaskId ?? undefined,
  outputBucket: record.outputBucket ?? undefined,
  errorMessage: record.errorMessage ?? undefined,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const parseWorkerLine = (line: string): WorkerEvent | null => {
  try {
    const parsed = JSON.parse(line);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const STALE_PROCESSING_MS = 15 * 60 * 1000;
const INTERRUPTED_PROCESSING_MESSAGE =
  "Language conversion was interrupted by a server restart. Please submit the task again.";
const STALE_PROCESSING_MESSAGE =
  "Language conversion timed out or was interrupted. Please submit the task again.";

class LanguageConversionService {
  private readonly workerEventChains = new Map<string, Promise<void>>();

  async reconcileInterruptedProcessingTasks() {
    await languageConversionRepository.failInterruptedProcessing(INTERRUPTED_PROCESSING_MESSAGE);
  }

  async reconcileStaleProcessingTasks() {
    const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS);
    await languageConversionRepository.failStaleProcessing(staleBefore, STALE_PROCESSING_MESSAGE);
  }

  async createTask(input: {
    userId: string;
    file: Express.Multer.File;
    sourceLanguage: unknown;
    targetLanguage: unknown;
  }) {
    if (!env.verification.tencentSecretId || !env.verification.tencentSecretKey) {
      throw errors.invalidParameter("Tencent Cloud credentials are not configured");
    }

    const sourceLanguage = toTencentLanguage(input.sourceLanguage, "zh");
    const targetLanguage = toTencentLanguage(input.targetLanguage, "en");
    if (sourceLanguage === targetLanguage) {
      throw errors.invalidParameter("sourceLanguage and targetLanguage cannot be the same");
    }

    const taskId = createId("lc");
    const outputDir = path.join(env.resultsDir, "language-conversion", taskId);
    fs.mkdirSync(outputDir, { recursive: true });

    const record = await languageConversionRepository.create({
      id: taskId,
      userId: input.userId,
      status: "processing",
      progress: 5,
      sourceLanguage,
      targetLanguage,
      sourceFileName: input.file.originalname,
      sourceVideoUrl: `/uploads/language-conversion/${path.basename(input.file.path)}`,
    });
    if (!record) throw errors.generationFailed("failed to create language conversion task");

    this.runWorker(taskId, input.file.path, outputDir, sourceLanguage, targetLanguage);
    return toTaskResponse(record);
  }

  async getTask(taskId: string, userId: string) {
    await this.reconcileStaleProcessingTasks();
    const record = await languageConversionRepository.findById(taskId, userId);
    if (!record) throw errors.taskNotFound();
    return toTaskResponse(record);
  }

  async listTasks(userId: string) {
    await this.reconcileStaleProcessingTasks();
    const records = await languageConversionRepository.listByUserId(userId);
    return records.map(toTaskResponse);
  }

  private async updateTask(
    taskId: string,
    patch: Partial<Omit<LanguageConversionTaskRecord, "id" | "userId" | "createdAt" | "updatedAt">>,
    options?: { onlyIfProcessing?: boolean },
  ) {
    if (options?.onlyIfProcessing) {
      await languageConversionRepository.updateIfProcessing(taskId, patch);
      return;
    }
    await languageConversionRepository.update(taskId, patch);
  }

  private enqueueWorkerEvent(taskId: string, event: WorkerEvent) {
    const previous = this.workerEventChains.get(taskId) ?? Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(() => this.handleWorkerEvent(taskId, event))
      .catch((error) => {
        console.error(`[language-conversion] failed to handle worker event for ${taskId}:`, error);
      });

    this.workerEventChains.set(taskId, next);
    void next.finally(() => {
      if (this.workerEventChains.get(taskId) === next) {
        this.workerEventChains.delete(taskId);
      }
    });
  }

  private async drainWorkerEvents(taskId: string) {
    const pending = this.workerEventChains.get(taskId);
    if (!pending) return;
    await pending.catch(() => undefined);
  }

  private runWorker(
    taskId: string,
    videoPath: string,
    outputDir: string,
    sourceLanguage: string,
    targetLanguage: string,
  ) {
    const scriptPath = path.resolve(env.rootDir, "scripts/tencent-mps-language-conversion-worker.py");
    const child = spawn("python", [scriptPath], {
      cwd: env.rootDir,
      windowsHide: true,
      env: {
        ...process.env,
        RUN_ID: taskId,
        VIDEO_PATH: videoPath,
        OUT_DIR: outputDir,
        SOURCE_LANGUAGE: sourceLanguage,
        TARGET_LANGUAGE: targetLanguage,
        TENCENTCLOUD_SECRET_ID: env.verification.tencentSecretId,
        TENCENTCLOUD_SECRET_KEY: env.verification.tencentSecretKey,
        TENCENTCLOUD_REGION: env.verification.tencentRegion,
        TENCENT_MPS_OUTPUT_BUCKET: process.env.TENCENT_MPS_OUTPUT_BUCKET ?? "",
      },
    });

    const stdout = readline.createInterface({ input: child.stdout });
    stdout.on("line", (line) => {
      const event = parseWorkerLine(line);
      if (!event?.event) return;
      this.enqueueWorkerEvent(taskId, event);
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
      if (stderr.length > 6000) stderr = stderr.slice(-6000);
    });

    child.once("error", (error) => {
      void this.updateTask(
        taskId,
        {
          status: "failed",
          progress: 100,
          errorMessage: error.message,
        },
        { onlyIfProcessing: true },
      );
    });

    child.once("close", (code) => {
      void (async () => {
        await this.drainWorkerEvents(taskId);
        const current = await languageConversionRepository.findById(taskId);
        if (!current || current.status !== "processing") return;
        await this.updateTask(
          taskId,
          {
            status: "failed",
            progress: 100,
            errorMessage: `language conversion worker exited with code ${code}: ${stderr.slice(-1200)}`,
          },
          { onlyIfProcessing: true },
        );
      })();
    });
  }

  private async handleWorkerEvent(taskId: string, event: WorkerEvent) {
    const workerPatch = { onlyIfProcessing: true as const };

    if (event.event === "cos_bucket_selected") {
      await this.updateTask(
        taskId,
        { outputBucket: String(event.bucket ?? ""), progress: 10 },
        workerPatch,
      );
      return;
    }
    if (event.event === "upload_started") {
      await this.updateTask(taskId, { progress: 15 }, workerPatch);
      return;
    }
    if (event.event === "upload_finished") {
      await this.updateTask(taskId, { progress: 25 }, workerPatch);
      return;
    }
    if (event.event === "mps_submitted") {
      await this.updateTask(
        taskId,
        { mpsTaskId: String(event.taskId ?? ""), progress: 35 },
        workerPatch,
      );
      return;
    }
    if (event.event === "mps_poll") {
      const poll = Number(event.poll ?? 1);
      const progress = Math.min(90, 35 + poll * 3);
      await this.updateTask(taskId, { progress }, workerPatch);
      return;
    }
    if (event.event === "downloaded") {
      const localPath = String(event.path ?? "");
      await this.updateTask(
        taskId,
        {
          localResultPath: localPath || null,
          resultVideoUrl: localPath ? publicPathFor(localPath) : null,
          progress: 95,
        },
        workerPatch,
      );
      return;
    }
    if (event.event === "finished") {
      const final = event.final ?? {};
      const downloads = Array.isArray(final.downloads) ? final.downloads : [];
      const firstDownload = downloads[0] as { path?: string } | undefined;
      const current = await languageConversionRepository.findById(taskId);
      const localPath = firstDownload?.path ?? current?.localResultPath ?? null;
      await this.updateTask(
        taskId,
        {
          status: "success",
          progress: 100,
          outputBucket: String(final.outputBucket ?? current?.outputBucket ?? ""),
          mpsTaskId: String(final.mpsTaskId ?? current?.mpsTaskId ?? ""),
          localResultPath: localPath,
          resultVideoUrl: localPath ? publicPathFor(localPath) : current?.resultVideoUrl ?? null,
        },
        workerPatch,
      );
      return;
    }
    if (event.event === "failed") {
      await this.updateTask(
        taskId,
        {
          status: "failed",
          progress: 100,
          errorMessage: String(event.message ?? "language conversion failed"),
        },
        workerPatch,
      );
    }
  }
}

export const languageConversionService = new LanguageConversionService();
