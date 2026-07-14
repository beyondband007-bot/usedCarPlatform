import assert from "node:assert/strict";
import { longVideoGenerationPointsByAiAudioSegments } from "./generationPointRules";

const points = longVideoGenerationPointsByAiAudioSegments([
  { screenType: "ai_digital_human", durationMs: 8_100 },
  { screenType: "user_video_voiceover", durationMs: 12_900 },
  { screenType: "ai_digital_human", durationMs: 7_200 },
  { screenType: "user_video_voiceover", durationMs: 15_000 },
  { screenType: "ai_digital_human", durationMs: 6_300 },
]);

assert.equal(points, "3300.0000");

assert.equal(
  longVideoGenerationPointsByAiAudioSegments([
    { screenType: "user_video_voiceover", durationMs: 120_000 },
    { screenType: "user_video_voiceover", durationMs: 120_000 },
  ]),
  "0.0000",
);
console.log("long-video generation point rules passed");
