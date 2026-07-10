import assert from "node:assert/strict";

import { env } from "../../config/env";
import { deepSeekClient } from "./deepseekClient";

const originalFetch = globalThis.fetch;
let requestBody: Record<string, any> | null = null;

globalThis.fetch = (async (
  input: string | URL | Request,
  init?: RequestInit,
) => {
  assert.equal(
    String(input),
    `${env.deepseek.baseUrl}/chat/completions`,
  );
  requestBody =
    typeof init?.body === "string" ? JSON.parse(init.body) : null;
  return Response.json({
    choices: [
      {
        finish_reason: "stop",
        message: {
          content: JSON.stringify({
            vehicleProfile: {
              brand: "BMW",
              model: "218i",
              modelYear: "2016",
              vehicleClass: "compact MPV",
              marketPositioning: "practical urban family car",
              targetUsers: ["urban families"],
              useCases: ["commuting"],
              recognizedHighlights: ["practical space"],
              uncertainItems: ["exact configuration"],
            },
            openingHook: "Meet the 2016 BMW 218i.",
            scriptText:
              "Meet the 2016 BMW 218i, a practical choice for city driving and family use.",
            sellingPoints: ["practical space"],
            shotCues: [
              {
                timeRange: "0-3s",
                visual: "Host and car",
                voiceover: "Introduce the model",
                assetRole: "digital_human|exterior",
              },
            ],
            riskNotes: [],
            segments: [
              {
                slot: "ai_video_1",
                narrationText: "这台车先看外观，线条和整体姿态都比较耐看。",
              },
              {
                slot: "user_video_1",
                narrationText: "接着看前排实拍，中控和座椅区域可以重点确认。",
              },
              {
                slot: "ai_video_2",
                narrationText: "坐进车里，驾驶位视野和按键布局都比较直观。",
              },
              {
                slot: "user_video_2",
                narrationText: "后排空间也通过实拍看一下，乘坐感受建议到店体验。",
              },
              {
                slot: "ai_video_3",
                narrationText: "整体看完外观和内饰细节，具体车况以实车核验为准。",
              },
            ],
          }),
          reasoning_content: "",
        },
      },
    ],
  });
}) as typeof fetch;

const run = async () => {
  const previousKey = env.deepseek.apiKey;
  Object.assign(env.deepseek, { apiKey: previousKey || "contract-key" });
  try {
    const result = await deepSeekClient.createScriptDraft({
      systemPrompt: "Return JSON.",
      userPrompt: "Create an English vehicle script.",
    });
    assert.ok(result);
    assert.equal(result.vehicleProfile.brand, "BMW");
    assert.equal(result.shotCues.length, 1);
    assert.deepEqual(requestBody?.thinking, { type: "disabled" });
    assert.deepEqual(requestBody?.response_format, {
      type: "json_object",
    });

    const optimized = await deepSeekClient.optimizeNarration({
      systemPrompt: "Return JSON with scriptText.",
      userPrompt: "Optimize this narration to 13.5 seconds.",
    });
    assert.equal(
      optimized.scriptText,
      "Meet the 2016 BMW 218i, a practical choice for city driving and family use.",
    );
    assert.equal(requestBody?.temperature, 0.25);

    const rewritten = await deepSeekClient.rewriteLongVideoSegments({
      systemPrompt: "Return JSON with five segments.",
      userPrompt: "Rewrite the five long-video narration segments.",
    });
    assert.ok(rewritten);
    assert.equal(rewritten.segments.length, 5);
    assert.equal(rewritten.segments[0]?.slot, "ai_video_1");
    assert.equal(requestBody?.temperature, 0.62);

    console.log(
      JSON.stringify(
        {
          runId: "deepseek-script-contract-20260611-01",
          model: requestBody?.model,
          thinking: requestBody?.thinking,
          responseFormat: requestBody?.response_format,
          status: "passed",
        },
        null,
        2,
      ),
    );
  } finally {
    Object.assign(env.deepseek, { apiKey: previousKey });
  }
};

run()
  .finally(() => {
    globalThis.fetch = originalFetch;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
