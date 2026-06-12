import assert from "node:assert/strict";
import path from "node:path";

import { env } from "../../config/env";
import { kieClient } from "../../providers/kie/kieClient";
import { minimaxClient } from "../../providers/minimax/minimaxClient";

const requests: Array<{
  url: string;
  method: string;
  body: unknown;
}> = [];

const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input);
  const body =
    typeof init?.body === "string" ? JSON.parse(init.body) : init?.body ?? null;
  requests.push({
    url,
    method: init?.method ?? "GET",
    body,
  });

  if (url.endsWith("/v1/files/upload")) {
    assert.ok(init?.body instanceof FormData);
    assert.equal(init.body.get("purpose"), "voice_clone");
    return Response.json({
      file: { file_id: 101 },
      base_resp: { status_code: 0, status_msg: "success" },
    });
  }
  if (url.endsWith("/v1/voice_clone")) {
    return Response.json({
      base_resp: { status_code: 0, status_msg: "success" },
    });
  }
  if (url.endsWith("/v1/t2a_v2")) {
    return Response.json({
      data: { audio: "494433" },
      extra_info: { audio_length: 13_800 },
      base_resp: { status_code: 0, status_msg: "success" },
    });
  }
  if (url === env.kie.createTaskUrl) {
    return Response.json({
      code: 200,
      data: { taskId: "kie_voice_contract_task" },
    });
  }
  throw new Error(`Unexpected contract-test request: ${url}`);
}) as typeof fetch;

const run = async () => {
  assert.equal(minimaxClient.isConfigured, true);
  const sourcePath = path.resolve(env.rootDir, "package.json");
  const uploaded = await minimaxClient.uploadCloneAudio(sourcePath);
  assert.equal(uploaded.fileId, 101);

  const voice = await minimaxClient.cloneVoice({
    fileId: uploaded.fileId,
    voiceId: "ucp_contract_voice",
  });
  assert.equal(voice.voiceId, "ucp_contract_voice");

  const speech = await minimaxClient.synthesizeSpeech({
    text: "这是一段用于验证十五秒数字人口播链路的测试文案。",
    voiceId: voice.voiceId,
    language: "zh-CN",
  });
  assert.equal(speech.durationMs, 13_800);
  assert.equal(speech.audio.toString("hex"), "494433");
  assert.equal(speech.model, "speech-2.8-hd");
  assert.equal(speech.languageBoost, "Chinese");

  const englishSpeech = await minimaxClient.synthesizeSpeech({
    text: "This is a multilingual narration contract test.",
    voiceId: voice.voiceId,
    language: "en",
  });
  const cantoneseSpeech = await minimaxClient.synthesizeSpeech({
    text: "呢段系粤语口播链路测试。",
    voiceId: voice.voiceId,
    language: "yue",
  });
  assert.equal(englishSpeech.languageBoost, "English");
  assert.equal(cantoneseSpeech.languageBoost, "Chinese,Yue");

  await kieClient.createSeedanceVideoTaskWithLease(
    { apiKey: "kie-contract-key", accountHash: "contract-account" },
    {
      prompt: "#image1 使用固定数字人，口型严格跟随 #audio1。",
      referenceImageUrls: ["https://example.com/digital-human.png"],
      referenceAudioUrls: ["https://example.com/narration.mp3"],
      aspectRatio: "9:16",
      resolution: "720p",
      duration: 15,
      generateAudio: false,
    },
  );

  const cloneRequest = requests.find((request) =>
    request.url.endsWith("/v1/voice_clone"),
  );
  assert.deepEqual(cloneRequest?.body, {
    file_id: 101,
    voice_id: "ucp_contract_voice",
  });

  const speechRequests = requests.filter((request) =>
    request.url.endsWith("/v1/t2a_v2"),
  );
  const speechRequest = speechRequests[0];
  assert.equal((speechRequest?.body as any).model, "speech-2.8-hd");
  assert.equal(
    (speechRequest?.body as any).voice_setting.voice_id,
    "ucp_contract_voice",
  );
  assert.deepEqual(
    speechRequests.map(
      (request) => (request.body as any).language_boost,
    ),
    ["Chinese", "English", "Chinese,Yue"],
  );

  const kieRequest = requests.find(
    (request) => request.url === env.kie.createTaskUrl,
  );
  assert.deepEqual(
    (kieRequest?.body as any).input.reference_audio_urls,
    ["https://example.com/narration.mp3"],
  );
  assert.deepEqual((kieRequest?.body as any).input.reference_video_urls, []);
  assert.equal((kieRequest?.body as any).input.generate_audio, false);

  console.log(
    JSON.stringify(
      {
        runId: "minimax-voice-chain-20260611-02",
        minimaxUploadPurpose: "voice_clone",
        minimaxSpeechModel: speech.model,
        narrationDurationMs: speech.durationMs,
        supportedLanguages: ["zh-CN", "en", "yue"],
        kieReferenceAudioCount: 1,
        kieGenerateAudio: false,
        status: "passed",
      },
      null,
      2,
    ),
  );
};

run()
  .finally(() => {
    globalThis.fetch = originalFetch;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
