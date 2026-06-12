import fs from "node:fs/promises";
import path from "node:path";

import { env } from "../../config/env";
import { errors } from "../../shared/errors";
import type {
  MinimaxClonedVoice,
  MinimaxSpeechAudio,
  MinimaxUploadedCloneAudio,
} from "./minimaxTypes";
import {
  getMinimaxLanguageBoost,
  type VideoGenerationLanguage,
} from "../../modules/video-generation/videoGenerationLanguage";

const asRecord = (value: unknown): Record<string, any> =>
  value && typeof value === "object" ? (value as Record<string, any>) : {};

const fetchWithTimeout = async (url: string, init: RequestInit) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.minimax.timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw errors.generationFailed("MiniMax request timeout", {
        timeoutMs: env.minimax.timeoutMs,
      });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const assertConfigured = () => {
  if (!env.minimax.apiKey) {
    throw errors.generationFailed("MiniMax API key is not configured");
  }
};

const assertMinimaxSuccess = (raw: unknown, fallbackMessage: string) => {
  const record = asRecord(raw);
  const baseResp = asRecord(record.base_resp ?? record.baseResp);
  const statusCode = Number(baseResp.status_code ?? baseResp.statusCode ?? 0);
  if (Number.isFinite(statusCode) && statusCode !== 0) {
    throw errors.generationFailed(
      String(baseResp.status_msg ?? baseResp.statusMsg ?? fallbackMessage),
      { provider: "minimax", statusCode },
    );
  }
};

const requestJson = async (pathname: string, body: Record<string, unknown>) => {
  assertConfigured();
  const response = await fetchWithTimeout(`${env.minimax.baseUrl}${pathname}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.minimax.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const raw = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw errors.generationFailed("MiniMax request failed", {
      provider: "minimax",
      status: response.status,
      response: raw,
    });
  }
  assertMinimaxSuccess(raw, "MiniMax request rejected");
  return raw;
};

export class MinimaxClient {
  get isConfigured() {
    return Boolean(env.minimax.apiKey);
  }

  async uploadCloneAudio(filePath: string): Promise<MinimaxUploadedCloneAudio> {
    assertConfigured();
    const bytes = await fs.readFile(filePath);
    const formData = new FormData();
    formData.append("purpose", "voice_clone");
    formData.append("file", new Blob([bytes]), path.basename(filePath));

    const response = await fetchWithTimeout(`${env.minimax.baseUrl}/v1/files/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.minimax.apiKey}`,
      },
      body: formData,
    });
    const raw = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw errors.generationFailed("MiniMax clone audio upload failed", {
        provider: "minimax",
        status: response.status,
        response: raw,
      });
    }
    assertMinimaxSuccess(raw, "MiniMax clone audio upload rejected");

    const record = asRecord(raw);
    const file = asRecord(record.file ?? asRecord(record.data).file ?? record.data);
    const fileId = Number(file.file_id ?? file.fileId ?? record.file_id ?? record.fileId);
    if (!Number.isInteger(fileId) || fileId <= 0) {
      throw errors.generationFailed("MiniMax clone audio response missing file_id", {
        provider: "minimax",
        response: raw,
      });
    }
    return { fileId, raw };
  }

  async cloneVoice(input: { fileId: number; voiceId: string }): Promise<MinimaxClonedVoice> {
    const raw = await requestJson("/v1/voice_clone", {
      file_id: input.fileId,
      voice_id: input.voiceId,
    });
    return {
      voiceId: input.voiceId,
      raw,
    };
  }

  async synthesizeSpeech(input: {
    text: string;
    voiceId: string;
    speed?: number;
    language?: VideoGenerationLanguage;
  }): Promise<MinimaxSpeechAudio> {
    const speed = input.speed ?? 1;
    const languageBoost = getMinimaxLanguageBoost(
      input.language ?? "zh-CN",
    );
    const raw = await requestJson("/v1/t2a_v2", {
      model: env.minimax.speechModel,
      text: input.text,
      stream: false,
      language_boost: languageBoost,
      voice_setting: {
        voice_id: input.voiceId,
        speed,
        vol: 1,
        pitch: 0,
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: "mp3",
        channel: 1,
      },
    });

    const record = asRecord(raw);
    const data = asRecord(record.data);
    const audioHex = String(data.audio ?? record.audio ?? "");
    if (!audioHex || !/^[0-9a-f]+$/i.test(audioHex) || audioHex.length % 2 !== 0) {
      throw errors.generationFailed("MiniMax speech response missing valid audio", {
        provider: "minimax",
        responseKeys: Object.keys(record),
      });
    }
    const audio = Buffer.from(audioHex, "hex");
    const extraInfo = asRecord(record.extra_info ?? record.extraInfo ?? data.extra_info);
    const rawDuration = Number(
      extraInfo.audio_length ?? extraInfo.audioLength ?? data.audio_length ?? data.audioLength,
    );

    return {
      audio,
      durationMs: Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : null,
      sizeBytes: audio.length,
      model: env.minimax.speechModel,
      voiceId: input.voiceId,
      speed,
      languageBoost,
      raw,
    };
  }
}

export const minimaxClient = new MinimaxClient();
