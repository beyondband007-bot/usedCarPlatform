import assert from "node:assert/strict";

import { deepSeekClient } from "../../providers/deepseek/deepseekClient";
import { minimaxClient } from "../../providers/minimax/minimaxClient";
import { videoGenerationService } from "./videoGenerationService";
import { videoScriptDraftRepository } from "./videoScriptDraftRepository";

const service = videoGenerationService as any;
const repository = videoScriptDraftRepository as any;
const deepSeek = deepSeekClient as any;
const minimax = minimaxClient as any;

const originals = {
  getDigitalHuman: service.getDigitalHuman,
  resolveVoiceOption: service.resolveVoiceOption,
  persistAudioPreview: service.persistAudioPreview,
  findById: repository.findById,
  updateScriptText: repository.updateScriptText,
  optimizeNarration: deepSeek.optimizeNarration,
  synthesizeSpeech: minimax.synthesizeSpeech,
};

const draft = {
  id: "video_script_optimization_contract",
  userId: "user_contract",
  vehicleName: "测试车辆",
  digitalHumanId: "dh-message-02",
  referenceMaterialId: "reference-contract",
  durationSeconds: 15 as const,
  outputRatio: "9:16" as const,
  videoResolution: "720p" as const,
  scriptText: "这是一段需要优化时长的汽车口播文案，信息真实并且欢迎用户到店试驾。",
  finalVideoPrompt: "口播文案：这是一段需要优化时长的汽车口播文案，信息真实并且欢迎用户到店试驾。",
  requiredInputs: {
    vehicle: { language: "Chinese" },
    script: { scriptText: "这是一段需要优化时长的汽车口播文案，信息真实并且欢迎用户到店试驾。" },
  },
  promptBundle: {},
  riskNotes: [],
  createdAt: new Date("2026-06-22T00:00:00.000Z"),
  updatedAt: new Date("2026-06-22T00:00:00.000Z"),
};

let previewCounter = 0;

const installMocks = (durations: number[]) => {
  let deepSeekAttempt = 0;
  let speechAttempt = 0;
  repository.findById = async () => draft;
  repository.updateScriptText = async (input: any) => ({ ...draft, ...input });
  service.getDigitalHuman = async () => ({
    id: draft.digitalHumanId,
    name: "专业男数字人",
    gender: "male",
  });
  service.resolveVoiceOption = async () => ({
    id: "steady_male_narrator",
    label: "沉稳男声",
    provider: "minimax",
    providerVoiceId: "Chinese_knowledgable_instructor_vv1",
    gender: "male",
    tags: [],
    model: "speech-2.8-hd",
    speed: 1.05,
    sortOrder: 1,
    enabled: true,
  });
  deepSeek.optimizeNarration = async () => {
    deepSeekAttempt += 1;
    return {
      scriptText: `这是第${deepSeekAttempt}轮优化后的汽车口播文案，保留真实信息并邀请用户到店试驾。`,
    };
  };
  minimax.synthesizeSpeech = async () => {
    const durationMs = durations[speechAttempt++] ?? durations[durations.length - 1];
    return {
      audio: Buffer.from("494433", "hex"),
      durationMs,
      sizeBytes: 3,
      model: "speech-2.8-hd",
      voiceId: "Chinese_knowledgable_instructor_vv1",
      speed: 1.05,
      languageBoost: "Chinese",
    };
  };
  service.persistAudioPreview = async (input: any) => {
    previewCounter += 1;
    const durationMs = input.speech.durationMs;
    return {
      audioPreviewId: `audio_preview_contract_${previewCounter}`,
      userId: input.userId,
      scriptDraftId: input.scriptDraftId,
      digitalHumanId: input.digitalHumanId,
      scriptHash: "contract-hash",
      scriptText: input.scriptText,
      voiceId: input.voice.id,
      voiceLabel: input.voice.label,
      voiceGender: input.voice.gender,
      model: input.speech.model,
      speed: input.speech.speed,
      language: input.language,
      status: durationMs > 15_000 ? "too_long" : durationMs < 12_000 ? "too_short" : "ready",
      durationMs,
      localPath: "contract.mp3",
      publicUrl: "http://localhost/contract.mp3",
      sizeBytes: input.speech.sizeBytes,
      createdAt: "2026-06-22T00:00:00.000Z",
    };
  };
};

const run = async () => {
  installMocks([16_700, 10_900, 13_500]);
  const converged = await videoGenerationService.optimizeNarration(
    draft.id,
    {
      scriptText: draft.scriptText,
      voiceId: "steady_male_narrator",
    },
    draft.userId,
  );
  assert.equal(converged.attempts, 3);
  assert.equal(converged.converged, true);
  assert.equal(converged.preview.durationMs, 13_500);

  installMocks([16_000, 11_000, 15_500]);
  const closest = await videoGenerationService.optimizeNarration(
    draft.id,
    {
      scriptText: draft.scriptText,
      voiceId: "steady_male_narrator",
    },
    draft.userId,
  );
  assert.equal(closest.attempts, 3);
  assert.equal(closest.converged, false);
  assert.equal(closest.preview.durationMs, 15_500);
  assert.equal(closest.preview.canUseForVideo, false);

  console.log(JSON.stringify({
    runId: "video-narration-optimization-contract-20260622-01",
    convergedAttempts: converged.attempts,
    convergedDurationMs: converged.preview.durationMs,
    fallbackDurationMs: closest.preview.durationMs,
    status: "passed",
  }, null, 2));
};

run()
  .finally(() => {
    Object.assign(service, {
      getDigitalHuman: originals.getDigitalHuman,
      resolveVoiceOption: originals.resolveVoiceOption,
      persistAudioPreview: originals.persistAudioPreview,
    });
    Object.assign(repository, {
      findById: originals.findById,
      updateScriptText: originals.updateScriptText,
    });
    Object.assign(deepSeek, { optimizeNarration: originals.optimizeNarration });
    Object.assign(minimax, { synthesizeSpeech: originals.synthesizeSpeech });
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
