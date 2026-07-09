import fs from "node:fs/promises";
import path from "node:path";

import { env } from "../../config/env";
import { errors } from "../../shared/errors";
import type {
  LongVideoAudioPreviewRecord,
  LongVideoDraftRecord,
  LongVideoTaskRecord,
} from "./longVideoTypes";

const dataDir = path.join(env.resultsDir, "long-video-generation", "metadata");
const draftDir = path.join(dataDir, "drafts");
const audioPreviewDir = path.join(dataDir, "audio-previews");
const taskDir = path.join(dataDir, "tasks");

const ensureDirs = async () => {
  await fs.mkdir(draftDir, { recursive: true });
  await fs.mkdir(audioPreviewDir, { recursive: true });
  await fs.mkdir(taskDir, { recursive: true });
};

const draftPath = (draftId: string) => path.join(draftDir, `${draftId}.json`);
const audioPreviewPath = (audioPreviewId: string) =>
  path.join(audioPreviewDir, `${audioPreviewId}.json`);
const taskPath = (taskId: string) => path.join(taskDir, `${taskId}.json`);

const readJson = async <T>(filePath: string, notFound: () => Error): Promise<T> => {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw notFound();
    throw error;
  }
};

class LongVideoRepository {
  async saveDraft(record: LongVideoDraftRecord) {
    await ensureDirs();
    await fs.writeFile(draftPath(record.draftId), JSON.stringify(record, null, 2), "utf8");
    return record;
  }

  async getDraft(draftId: string, userId: string) {
    await ensureDirs();
    const draft = await readJson<LongVideoDraftRecord>(
      draftPath(draftId),
      errors.videoScriptDraftNotFound,
    );
    if (draft.userId !== userId) throw errors.videoScriptDraftNotFound();
    return draft;
  }

  async saveAudioPreview(record: LongVideoAudioPreviewRecord) {
    await ensureDirs();
    await fs.writeFile(
      audioPreviewPath(record.audioPreviewId),
      JSON.stringify(record, null, 2),
      "utf8",
    );
    return record;
  }

  async getAudioPreview(audioPreviewId: string, userId: string) {
    await ensureDirs();
    const preview = await readJson<LongVideoAudioPreviewRecord>(
      audioPreviewPath(audioPreviewId),
      () => errors.invalidParameter("audioPreviewId is invalid"),
    );
    if (preview.userId !== userId) throw errors.invalidParameter("audioPreviewId is invalid");
    return preview;
  }

  async saveTask(record: LongVideoTaskRecord) {
    await ensureDirs();
    await fs.writeFile(taskPath(record.taskId), JSON.stringify(record, null, 2), "utf8");
    return record;
  }

  async getTask(taskId: string, userId: string) {
    await ensureDirs();
    const task = await readJson<LongVideoTaskRecord>(
      taskPath(taskId),
      () => errors.taskNotFound(),
    );
    if (task.userId !== userId) throw errors.taskNotFound();
    return task;
  }

  async patchTask(taskId: string, userId: string, patch: Partial<LongVideoTaskRecord>) {
    const current = await this.getTask(taskId, userId);
    const next: LongVideoTaskRecord = {
      ...current,
      ...patch,
      taskId: current.taskId,
      userId: current.userId,
      updatedAt: new Date().toISOString(),
    };
    return this.saveTask(next);
  }
}

export const longVideoRepository = new LongVideoRepository();
