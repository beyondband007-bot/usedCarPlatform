import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { pool } from "../src/db/mysql";
import { createId } from "../src/shared/ids";
import { longVideoService } from "../src/modules/long-video-generation/longVideoService";

const runId = process.env.LONG_VIDEO_RERUN_ID?.trim() || "long-video-preset-voice-rerun-20260708";
const rootDir = path.resolve(__dirname, "../..");
const artifactDir = path.join(rootDir, "artifacts", runId);
const sourceTaskPath = path.join(
  rootDir,
  "backend",
  "storage",
  "results",
  "long-video-generation",
  "metadata",
  "tasks",
  "long_video_task_e0d3310800ab4d109c3ff17beade2094.json",
);
const digitalHumanId = "dh-message-15";
const userId = "user_team";
const vehicleName =
  process.env.LONG_VIDEO_VEHICLE_NAME?.trim() || "\u7528\u6237\u4e0a\u4f20\u8f66\u8f86";

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const createTemporarySession = async () => {
  const token = crypto.randomBytes(32).toString("base64url");
  await pool.query(
    `INSERT INTO auth_sessions (id, user_id, token_hash, expires_at)
     VALUES (:id, :userId, :tokenHash, DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 2 DAY))`,
    {
      id: createId("sess"),
      userId,
      tokenHash: hashToken(token),
    },
  );
  return token;
};

const log = (...args: unknown[]) => {
  console.log(`[${new Date().toISOString()}] [${runId}]`, ...args);
};

const main = async () => {
  await fs.mkdir(artifactDir, { recursive: true });
  const sourceTask = JSON.parse(await fs.readFile(sourceTaskPath, "utf8"));
  const sourceSegments = sourceTask.renderPlan.sequence.map((segment: any) => ({
    slot: segment.slot,
    narrationText: segment.narrationText,
  }));

  const token = await createTemporarySession();
  const authContext = { headers: { authorization: `Bearer ${token}` } };

  log("creating draft from current manifest preset voice");
  const draft = await longVideoService.createDraft(
    {
      digitalHumanId,
      vehicleImageAssetIds: sourceTask.renderPlan.vehicleImageAssetIds,
      interiorVideoAssetIds: sourceTask.renderPlan.interiorVideoAssetIds,
      vehicleInfo: {
        vehicleName,
        fullModelName: vehicleName,
      },
      sellingPoints: [
        "\u5916\u89c2\u6210\u8272",
        "\u524d\u6392\u5185\u9970",
        "\u540e\u6392\u7a7a\u95f4",
      ],
    },
    userId,
  );

  log("draft created", {
    draftId: draft.draftId,
    digitalHumanId: draft.digitalHumanId,
    voice: draft.voice,
  });

  const updatedDraft = await longVideoService.updateSegments(
    draft.draftId,
    { segments: sourceSegments },
    userId,
  );
  await fs.writeFile(
    path.join(artifactDir, "draft.json"),
    JSON.stringify(updatedDraft, null, 2),
    "utf8",
  );

  log("creating 5 independent MiniMax audio segments");
  const audioPreview = await longVideoService.createAudioPreview(draft.draftId, userId);
  await fs.writeFile(
    path.join(artifactDir, "audio-preview.json"),
    JSON.stringify(audioPreview, null, 2),
    "utf8",
  );
  log("audio preview ready", {
    audioPreviewId: audioPreview.audioPreviewId,
    voice: audioPreview.voice,
    durations: audioPreview.segments.map((segment: any) => ({
      slot: segment.slot,
      durationMs: segment.durationMs,
    })),
  });

  log("creating backend long-video task");
  const task = await longVideoService.createTask(
    draft.draftId,
    { audioPreviewId: audioPreview.audioPreviewId },
    userId,
    authContext,
  );
  await fs.writeFile(
    path.join(artifactDir, "task-created.json"),
    JSON.stringify(task, null, 2),
    "utf8",
  );
  log("task created", { taskId: task.taskId, status: task.status, progress: task.progress });

  let lastStatus = "";
  let lastProgress = -1;
  const deadlineAt = Date.now() + 45 * 60 * 1000;
  while (Date.now() < deadlineAt) {
    const current = await longVideoService.getTask(task.taskId, userId);
    await fs.writeFile(
      path.join(artifactDir, "task-latest.json"),
      JSON.stringify(current, null, 2),
      "utf8",
    );
    if (current.status !== lastStatus || current.progress !== lastProgress) {
      log("task status", {
        taskId: current.taskId,
        status: current.status,
        progress: current.progress,
        resultLocalPath: current.resultLocalPath,
        errorMessage: current.errorMessage,
      });
      lastStatus = current.status;
      lastProgress = current.progress;
    }
    if (current.status === "completed" || current.status === "failed") {
      if (current.resultLocalPath) {
        const finalCopy = path.join(artifactDir, "long-video-preset-voice-rerun-final.mp4");
        await fs.copyFile(current.resultLocalPath, finalCopy);
        log("final copied", finalCopy);
      }
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }

  throw new Error(`Timed out waiting for task ${task.taskId}`);
};

main()
  .catch((error) => {
    console.error(`[${new Date().toISOString()}] [${runId}] failed`, error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
