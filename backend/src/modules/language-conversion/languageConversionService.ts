import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

import { env } from "../../config/env";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";

type LanguageConversionStatus = "processing" | "success" | "failed";

type LanguageConversionTask = {
  taskId: string;
  userId: string;
  status: LanguageConversionStatus;
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

const tasks = new Map<string, LanguageConversionTask>();

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

const now = () => new Date().toISOString();

const updateTask = (taskId: string, patch: Partial<LanguageConversionTask>) => {
  const task = tasks.get(taskId);
  if (!task) return null;
  const updated = { ...task, ...patch, updatedAt: now() };
  tasks.set(taskId, updated);
  return updated;
};

const parseWorkerLine = (line: string): WorkerEvent | null => {
  try {
    const parsed = JSON.parse(line);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

class LanguageConversionService {
  createTask(input: {
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

    const task: LanguageConversionTask = {
      taskId,
      userId: input.userId,
      status: "processing",
      progress: 5,
      sourceLanguage,
      targetLanguage,
      sourceFileName: input.file.originalname,
      sourceVideoUrl: `/uploads/language-conversion/${path.basename(input.file.path)}`,
      createdAt: now(),
      updatedAt: now(),
    };
    tasks.set(taskId, task);

    this.runWorker(taskId, input.file.path, outputDir, sourceLanguage, targetLanguage);
    return task;
  }

  getTask(taskId: string, userId: string) {
    const task = tasks.get(taskId);
    if (!task || task.userId !== userId) throw errors.taskNotFound();
    return task;
  }

  listTasks(userId: string) {
    return [...tasks.values()]
      .filter((task) => task.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
      this.handleWorkerEvent(taskId, event);
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
      if (stderr.length > 6000) stderr = stderr.slice(-6000);
    });

    child.once("error", (error) => {
      updateTask(taskId, {
        status: "failed",
        progress: 100,
        errorMessage: error.message,
      });
    });

    child.once("close", (code) => {
      const current = tasks.get(taskId);
      if (!current || current.status !== "processing") return;
      updateTask(taskId, {
        status: "failed",
        progress: 100,
        errorMessage: `language conversion worker exited with code ${code}: ${stderr.slice(-1200)}`,
      });
    });
  }

  private handleWorkerEvent(taskId: string, event: WorkerEvent) {
    if (event.event === "cos_bucket_selected") {
      updateTask(taskId, { outputBucket: String(event.bucket ?? ""), progress: 10 });
      return;
    }
    if (event.event === "upload_started") {
      updateTask(taskId, { progress: 15 });
      return;
    }
    if (event.event === "upload_finished") {
      updateTask(taskId, { progress: 25 });
      return;
    }
    if (event.event === "mps_submitted") {
      updateTask(taskId, { mpsTaskId: String(event.taskId ?? ""), progress: 35 });
      return;
    }
    if (event.event === "mps_poll") {
      const poll = Number(event.poll ?? 1);
      const progress = Math.min(90, 35 + poll * 3);
      updateTask(taskId, { progress });
      return;
    }
    if (event.event === "downloaded") {
      const localPath = String(event.path ?? "");
      updateTask(taskId, {
        localResultPath: localPath,
        resultVideoUrl: localPath ? publicPathFor(localPath) : undefined,
        progress: 95,
      });
      return;
    }
    if (event.event === "finished") {
      const final = event.final ?? {};
      const downloads = Array.isArray(final.downloads) ? final.downloads : [];
      const firstDownload = downloads[0] as { path?: string } | undefined;
      const localPath = firstDownload?.path ?? tasks.get(taskId)?.localResultPath;
      updateTask(taskId, {
        status: "success",
        progress: 100,
        outputBucket: String(final.outputBucket ?? tasks.get(taskId)?.outputBucket ?? ""),
        mpsTaskId: String(final.mpsTaskId ?? tasks.get(taskId)?.mpsTaskId ?? ""),
        localResultPath: localPath,
        resultVideoUrl: localPath ? publicPathFor(localPath) : tasks.get(taskId)?.resultVideoUrl,
      });
      return;
    }
    if (event.event === "failed") {
      updateTask(taskId, {
        status: "failed",
        progress: 100,
        errorMessage: String(event.message ?? "language conversion failed"),
      });
    }
  }
}

export const languageConversionService = new LanguageConversionService();
