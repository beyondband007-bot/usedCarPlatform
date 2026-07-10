import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import ffmpegStaticPath from "ffmpeg-static";
import { path as ffprobeStaticPath } from "ffprobe-static";

import { env } from "../../config/env";
import { arkClient } from "../../providers/ark/arkClient";
import { deepSeekClient } from "../../providers/deepseek/deepseekClient";
import { minimaxClient } from "../../providers/minimax/minimaxClient";
import { assetsRepository, type AssetRecord } from "../assets/assetsRepository";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import { VIDEO_GENERATION_RESOLUTION } from "../../shared/types";
import {
  finalizeGenerationBilling,
  freezeGenerationBilling,
  markGenerationBillingRefundFailed,
  refundFrozenGenerationBilling,
  toBillingResponseFields,
  type FrozenGenerationBilling,
} from "../billing/billingLifecycle";
import type { BillingRequestContext } from "../billing/billingIdentity";
import { videoGenerationPointsByAudioSeconds } from "../billing/generationPointRules";
import { assertCanStartGeneration } from "../subscription/subscriptionService";
import { tasksRepository } from "../tasks/tasksRepository";
import { arkVirtualAssetService } from "../video-generation/arkVirtualAssetService";
import { longVideoRepository } from "./longVideoRepository";
import type {
  CreateLongVideoTaskRequest,
  CreateLongVideoDraftRequest,
  LongVideoDraftRecord,
  LongVideoNarrationSegment,
  LongVideoRenderPlan,
  LongVideoRenderPlanSegment,
  LongVideoSlot,
  LongVideoTaskStatus,
  LongVideoTaskRecord,
  LongVideoVoicePreset,
  UpdateLongVideoSegmentsRequest,
} from "./longVideoTypes";

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(env.rootDir, "..");
const digitalHumanManifestPath = path.join(workspaceRoot, "digital human", "digital-humans.json");
const audioOutputDir = path.join(env.resultsDir, "long-video-generation", "audio-previews");
const renderPlanDir = path.join(env.resultsDir, "long-video-generation", "render-plans");
const taskOutputDir = path.join(env.resultsDir, "long-video-generation", "tasks");
const arkPollIntervalMs = 12_000;
const arkPollAttempts = 90;
const arkDetailFailureLimit = 20;
const maxNarrationChars = 180;
const maxSegmentAudioDurationMs = 12_000;

const longVideoSlots: Array<Omit<LongVideoNarrationSegment, "narrationText">> = [
  {
    slot: "ai_video_1",
    role: "front_exterior_opening",
    screenType: "ai_digital_human",
    enterCue: "开场直接进入单车介绍。",
    exitCue: "引出第一段内饰实拍。",
    targetDurationSeconds: 8,
  },
  {
    slot: "user_video_1",
    role: "front_cabin_proof",
    screenType: "user_video_voiceover",
    enterCue: "承接车外开场，切到前排/中控实拍。",
    exitCue: "引出数字人坐进车内继续讲解。",
    targetDurationSeconds: 8,
  },
  {
    slot: "ai_video_2",
    role: "seated_interior_bridge",
    screenType: "ai_digital_human",
    enterCue: "数字人坐在车内承接实拍。",
    exitCue: "引出第二段后排/座椅实拍。",
    targetDurationSeconds: 10,
  },
  {
    slot: "user_video_2",
    role: "rear_space_proof",
    screenType: "user_video_voiceover",
    enterCue: "承接车内讲解，切到后排/座椅实拍。",
    exitCue: "引出车外收尾。",
    targetDurationSeconds: 7,
  },
  {
    slot: "ai_video_3",
    role: "rear_exterior_closing",
    screenType: "ai_digital_human",
    enterCue: "数字人回到车外总结。",
    exitCue: "自然结束并提示以门店实车核验为准。",
    targetDurationSeconds: 9,
  },
];

type DigitalHumanManifest = {
  items: Array<{
    id: string;
    name: string;
    gender: string;
    status: string;
    imagePath: string;
    presetVoice?: {
      status?: string;
      voiceId?: string;
      displayName?: string;
      languageBoost?: string;
      speed?: number;
      vol?: number;
      pitch?: number;
      model?: string;
    };
  }>;
};

const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const asStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item) => asString(item)).filter(Boolean)
    : [];
const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const vehicleNameFromInfo = (vehicleInfo: Record<string, unknown>) => {
  const candidates = [
    vehicleInfo.fullModelName,
    vehicleInfo.modelName,
    vehicleInfo.seriesName,
    vehicleInfo.vehicleName,
  ]
    .map(asString)
    .filter(Boolean);
  return candidates[0] || "这台车";
};

const normalizeSellingPoints = (value: unknown) =>
  asStringArray(value).slice(0, 6);

const validateNarrationSegments = (segments: LongVideoNarrationSegment[]) => {
  for (const segment of segments) {
    const narrationText = segment.narrationText.trim();
    if (!narrationText) {
      throw errors.invalidParameter("long-video narration cannot be empty", { slot: segment.slot });
    }
    if (narrationText.length > maxNarrationChars) {
      throw errors.invalidParameter(
        `long-video narration must not exceed ${maxNarrationChars} characters`,
        { slot: segment.slot, maxNarrationChars },
      );
    }
  }
};

const buildSegments = (vehicleInfo: Record<string, unknown>, sellingPoints: string[]) => {
  const vehicleName = vehicleNameFromInfo(vehicleInfo);
  const firstPoint = sellingPoints[0] ? `重点可以先看${sellingPoints[0]}。` : "";
  const secondPoint = sellingPoints[1] ? `再结合${sellingPoints[1]}来看。` : "";

  const texts = [
    `${vehicleName}，先看外观。车身线条、漆面观感和整体姿态可以先建立第一印象。${firstPoint}`,
    "打开车门看前排实拍。方向盘、中控和座椅区域都比较直观，日常使用痕迹建议结合实车再仔细看。",
    "坐进车里看，驾驶位视野比较直观，中控按键布局也比较顺手。座椅状态和内饰细节，是看车时要重点确认的地方。",
    `后排实拍也看一下。座椅和腿部空间比较直观，适合现场坐进去感受乘坐姿态。${secondPoint}`,
    `${vehicleName}外观看整体成色，车内看前排和后排细节。具体车况、配置和价格，还是以门店实车核验为准。`,
  ];

  return longVideoSlots.map((slot, index) => ({
    ...slot,
    narrationText: texts[index].replace(/\s+/g, " ").trim(),
  }));
};

const longVideoRewriteForbiddenPattern =
  /这条视频|本视频|全新|准新车|无事故|原版原漆|公认|标杆|首选|领先|闭眼买|价格|报价|优惠|首付|月供|质保|包过户|公里|里程/;

const isValidLongVideoRewrite = (text: string) => {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) return false;
  if (normalized.length < 12 || normalized.length > 130) return false;
  if (!/[\u4e00-\u9fff]/.test(normalized)) return false;
  return !longVideoRewriteForbiddenPattern.test(normalized);
};

const buildLongVideoRewriteSystemPrompt = () =>
  [
    "You are a Chinese used-car short video narration editor.",
    "Rewrite five existing narration segments for a vertical long-form stitched vehicle introduction.",
    "Keep the same meaning, same order, same screen role, and same facts as the source segments.",
    "Only change the wording so repeated generations do not sound identical.",
    "Do not add price, mileage, accident history, warranty, configuration, owner history, store policy, or any unprovided fact.",
    "Do not use expressions such as 这条视频, 本视频, 全新, 准新车, 无事故, 原版原漆, 闭眼买, 标杆, 首选.",
    "The tone should be natural, professional, restrained, and suitable for one host continuously introducing one used car.",
    "Return JSON only. The JSON schema is: {\"segments\":[{\"slot\":\"ai_video_1\",\"narrationText\":\"...\"}],\"riskNotes\":[]}.",
    "The output must contain exactly five segments with the same slot values as the input.",
    "narrationText must be Simplified Chinese, concise, and easy for TTS to speak.",
  ].join("\n");

const buildLongVideoRewriteUserPrompt = (input: {
  vehicleInfo: Record<string, unknown>;
  sellingPoints: string[];
  segments: LongVideoNarrationSegment[];
}) =>
  JSON.stringify(
    {
      vehicleName: vehicleNameFromInfo(input.vehicleInfo),
      vehicleInfo: input.vehicleInfo,
      sellingPoints: input.sellingPoints,
      rewriteGoal:
        "Rewrite each segment with similar meaning and similar length. Keep AI/user segment transition intent.",
      sourceSegments: input.segments.map((segment) => ({
        slot: segment.slot,
        role: segment.role,
        screenType: segment.screenType,
        targetDurationSeconds: segment.targetDurationSeconds,
        narrationText: segment.narrationText,
      })),
    },
    null,
    2,
  );

const rewriteSegmentsWithAi = async (input: {
  vehicleInfo: Record<string, unknown>;
  sellingPoints: string[];
  segments: LongVideoNarrationSegment[];
}) => {
  if (!deepSeekClient.isConfigured) return input.segments;

  try {
    const generated = await deepSeekClient.rewriteLongVideoSegments({
      systemPrompt: buildLongVideoRewriteSystemPrompt(),
      userPrompt: buildLongVideoRewriteUserPrompt(input),
    });
    if (!generated?.segments.length) return input.segments;

    const generatedBySlot = new Map(
      generated.segments.map((segment) => [
        segment.slot,
        segment.narrationText.trim().replace(/\s+/g, " "),
      ]),
    );
    return input.segments.map((segment) => {
      const candidate = generatedBySlot.get(segment.slot);
      if (!candidate || !isValidLongVideoRewrite(candidate)) return segment;
      return {
        ...segment,
        narrationText: candidate,
      };
    });
  } catch (error) {
    console.warn("[long-video-generation] DeepSeek narration rewrite fallback", {
      message: error instanceof Error ? error.message : String(error),
    });
    return input.segments;
  }
};

const buildAiPrompt = (input: {
  draft: LongVideoDraftRecord;
  segment: LongVideoNarrationSegment;
}) => {
  const vehicleName = vehicleNameFromInfo(input.draft.vehicleInfo);
  const voiceLine =
    "音频1是唯一口播声源。必须逐字、逐句严格跟读音频1，口型、停顿、语速、音色、情绪和响度都与音频1一致；不要重新配音，不要改写台词，不要生成第二条声音。";
  const commonLines = [
    `精品二手车销售口播短视频，真人数字人自然讲解，9:16 竖屏，车型主题：${vehicleName}。`,
    "输入的数字人参考图只用于锁定人物身份：同一张脸、同一发型、同一服装、同一体型。只能出现一个女数字人，不要第二个人，不要双人同框，不要复制人物。",
    "输入的车辆和场景参考图只用于锁定车辆外观、车身颜色、内饰空间和真实户外车源环境；不要换车，不要室内展厅。",
    voiceLine,
    "画面里绝对不要字幕、不要中文字幕、不要英文字幕、不要任何文字、不要标题、不要水印、不要屏幕字。",
    "画面真实可信，不编造车况、价格、配置和实拍中不存在的细节。",
  ];

  if (input.segment.slot === "ai_video_2") {
    return [
      ...commonLines,
      "当前段必须是数字人坐在车里面介绍内饰，不是站在车外。人物坐在主驾或副驾位置，半身出镜，旁边能看到方向盘、中控、挡把和前排座椅。",
      "坐姿自然，看镜头口播，偶尔用手势指向中控和座椅；不要站在车外，不要打开车门站着讲，不要只拍内饰空镜，不要只出现手部。",
      `口播：${input.segment.narrationText}`,
    ].join("\n");
  }

  if (input.segment.slot === "ai_video_3") {
    return [
      ...commonLines,
      "当前段是数字人站在车辆外侧后方或车尾附近做总结，能看到车尾、侧后方外观或车门区域。",
      "数字人看镜头自然收尾，语气和前面保持一致；不要室内展厅，不要换车，不要多人站在车旁。",
      `口播：${input.segment.narrationText}`,
    ].join("\n");
  }

  return [
    ...commonLines,
    "当前段是数字人站在车辆外侧车头附近介绍外观，能看到车头、中网、大灯和户外背景。",
    "数字人看镜头自然讲解，少量手势指向车头；不要坐进车里，不要打开引擎盖，不要夸张特写。",
    `口播：${input.segment.narrationText}`,
  ].join("\n");
};

const renderPlanPublicUrl = (taskId: string, fileName: string) =>
  `${env.publicBaseUrl.replace(/\/$/, "")}/results/long-video-generation/render-plans/${taskId}/${fileName}`;

const taskPublicUrl = (taskId: string, fileName: string) =>
  `${env.publicBaseUrl.replace(/\/$/, "")}/results/long-video-generation/tasks/${taskId}/${fileName}`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const resolvedFfmpegPath = () =>
  ffmpegStaticPath && existsSync(ffmpegStaticPath) ? ffmpegStaticPath : env.ffmpegPath;

const ffprobePath = () => {
  if (ffprobeStaticPath && existsSync(ffprobeStaticPath)) return ffprobeStaticPath;
  const basename = path.basename(env.ffmpegPath).toLowerCase();
  if (basename === "ffmpeg" || basename === "ffmpeg.exe") {
    const adjacentFfprobe = path.join(path.dirname(env.ffmpegPath), process.platform === "win32" ? "ffprobe.exe" : "ffprobe");
    if (existsSync(adjacentFfprobe)) return adjacentFfprobe;
  }
  return "ffprobe";
};

const downloadFile = async (url: string, outputPath: string) => {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(300_000) });
      if (!response.ok) {
        throw errors.generationFailed("long-video output download failed", {
          url,
          status: response.status,
          attempt,
        });
      }
      await fs.writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(attempt * 3000);
    }
  }
  const message =
    lastError instanceof Error
      ? `Ark/Seedance 结果视频下载失败：${lastError.message}`
      : "Ark/Seedance 结果视频下载失败";
  throw errors.generationFailed(message, { url });
};

const probeDurationSeconds = async (filePath: string) => {
  const { stdout } = await execFileAsync(ffprobePath(), [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  const duration = Number(stdout.trim());
  return Number.isFinite(duration) && duration > 0 ? duration : 0;
};

const probeFps = async (filePath: string) => {
  const { stdout } = await execFileAsync(ffprobePath(), [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=avg_frame_rate,r_frame_rate",
    "-of",
    "default=noprint_wrappers=1",
    filePath,
  ]);
  const rate =
    stdout
      .split(/\r?\n/)
      .map((line) => line.split("=")[1]?.trim())
      .find((value) => value && value !== "0/0") ?? "";
  const [numerator, denominator] = rate.split("/").map(Number);
  if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0) {
    return numerator / denominator;
  }
  const value = Number(rate);
  return Number.isFinite(value) && value > 0 ? value : 30;
};

const probeHasAudioStream = async (filePath: string) => {
  const { stdout } = await execFileAsync(ffprobePath(), [
    "-v",
    "error",
    "-select_streams",
    "a:0",
    "-show_entries",
    "stream=index",
    "-of",
    "csv=p=0",
    filePath,
  ]);
  return Boolean(stdout.trim());
};

const runFfmpeg = async (args: string[]) => {
  await execFileAsync(resolvedFfmpegPath(), ["-y", ...args], {
    maxBuffer: 8 * 1024 * 1024,
  });
};

const extractReferenceFrame = async (
  videoPath: string,
  outputPath: string,
  atSeconds = 1,
) => {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await runFfmpeg([
    "-ss",
    String(atSeconds),
    "-i",
    videoPath,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    outputPath,
  ]);
  return outputPath;
};

const atempoChain = (speed: number) => {
  const values: number[] = [];
  let current = Number.isFinite(speed) && speed > 0 ? speed : 1;
  while (current > 2) {
    values.push(2);
    current /= 2;
  }
  while (current < 0.5) {
    values.push(0.5);
    current /= 0.5;
  }
  values.push(current);
  return values.map((value) => `atempo=${value.toFixed(6)}`).join(",");
};

const readDigitalHuman = async (digitalHumanId: string) => {
  const manifest = JSON.parse(
    await fs.readFile(digitalHumanManifestPath, "utf8"),
  ) as DigitalHumanManifest;
  const digitalHuman = manifest.items.find(
    (item) => item.id === digitalHumanId && item.status === "active",
  );
  if (!digitalHuman) {
    throw errors.invalidParameter("digitalHumanId is invalid", { digitalHumanId });
  }
  return digitalHuman;
};

const readDigitalHumanVoice = async (digitalHumanId: string): Promise<LongVideoVoicePreset> => {
  const digitalHuman = await readDigitalHuman(digitalHumanId);
  const preset = digitalHuman.presetVoice;
  if (!preset || preset.status !== "ready" || !preset.voiceId) {
    throw errors.invalidParameter("digital human voice is not configured", {
      digitalHumanId,
    });
  }
  return {
    voiceId: preset.voiceId,
    label: preset.displayName || "默认音色",
    model: preset.model || env.minimax.speechModel,
    speed: Number.isFinite(preset.speed) ? Number(preset.speed) : 1,
    vol: Number.isFinite(preset.vol) ? Number(preset.vol) : 1,
    pitch: Number.isFinite(preset.pitch) ? Number(preset.pitch) : 0,
    languageBoost: preset.languageBoost || "Chinese",
  };
};

const readDigitalHumanImagePath = async (digitalHumanId: string) => {
  const digitalHuman = await readDigitalHuman(digitalHumanId);
  const imagePath = path.resolve(workspaceRoot, digitalHuman.imagePath);
  if (!imagePath.startsWith(workspaceRoot)) {
    throw errors.invalidParameter("digital human image path is invalid", { digitalHumanId });
  }
  try {
    await fs.access(imagePath);
  } catch {
    throw errors.invalidParameter("digital human image file is missing", {
      digitalHumanId,
      imagePath,
    });
  }
  return imagePath;
};

const validateAssets = async (input: {
  userId: string;
  vehicleImageAssetIds: string[];
  interiorVideoAssetIds: string[];
}) => {
  if (input.vehicleImageAssetIds.length !== 3) {
    throw errors.invalidParameter("vehicleImageAssetIds requires exactly three images");
  }
  if (input.interiorVideoAssetIds.length !== 2) {
    throw errors.invalidParameter("interiorVideoAssetIds requires exactly two videos");
  }
  const vehicleImages: AssetRecord[] = [];
  for (const assetId of input.vehicleImageAssetIds) {
    const asset = await assetsRepository.findById(assetId, input.userId);
    if (!asset) throw errors.assetNotFound();
    if (!["car_exterior", "car_interior", "video_reference_image"].includes(asset.purpose)) {
      throw errors.invalidParameter("vehicleImageAssetIds must be vehicle image assets", {
        assetId,
        purpose: asset.purpose,
      });
    }
    if (!asset.mimeType.startsWith("image/")) {
      throw errors.invalidParameter("vehicleImageAssetIds must reference image files", {
        assetId,
        mimeType: asset.mimeType,
      });
    }
    vehicleImages.push(asset);
  }
  const interiorVideos: AssetRecord[] = [];
  for (const assetId of input.interiorVideoAssetIds) {
    const asset = await assetsRepository.findById(assetId, input.userId);
    if (!asset) throw errors.assetNotFound();
    if (!["car_interior", "video_reference_image"].includes(asset.purpose)) {
      throw errors.invalidParameter("interiorVideoAssetIds must be interior video assets", {
        assetId,
        purpose: asset.purpose,
      });
    }
    if (!asset.mimeType.startsWith("video/")) {
      throw errors.invalidParameter("interiorVideoAssetIds must reference video files", {
        assetId,
        mimeType: asset.mimeType,
      });
    }
    interiorVideos.push(asset);
  }
  return { vehicleImages, interiorVideos };
};

class LongVideoService {
  async createDraft(body: CreateLongVideoDraftRequest, userId: string) {
    const vehicleImageAssetIds = asStringArray(body.vehicleImageAssetIds);
    const interiorVideoAssetIds = asStringArray(body.interiorVideoAssetIds);
    const digitalHumanId = asString(body.digitalHumanId);
    if (!digitalHumanId) throw errors.invalidParameter("digitalHumanId is required");
    await validateAssets({ userId, vehicleImageAssetIds, interiorVideoAssetIds });
    const voice = await readDigitalHumanVoice(digitalHumanId);
    const vehicleInfo = asRecord(body.vehicleInfo);
    const sellingPoints = normalizeSellingPoints(body.sellingPoints);
    const defaultSegments = buildSegments(vehicleInfo, sellingPoints);
    const segments = await rewriteSegmentsWithAi({
      vehicleInfo,
      sellingPoints,
      segments: defaultSegments,
    });
    const now = new Date().toISOString();
    const draft: LongVideoDraftRecord = {
      draftId: createId("long_video_draft"),
      userId,
      digitalHumanId,
      vehicleImageAssetIds,
      interiorVideoAssetIds: [interiorVideoAssetIds[0], interiorVideoAssetIds[1]],
      vehicleInfo,
      sellingPoints,
      language: "Chinese",
      voice,
      segments,
      status: "script_ready",
      createdAt: now,
      updatedAt: now,
    };
    await longVideoRepository.saveDraft(draft);
    return this.toDraftResponse(draft);
  }

  async getDraft(draftId: string, userId: string) {
    return this.toDraftResponse(await longVideoRepository.getDraft(draftId, userId));
  }

  async updateSegments(draftId: string, body: UpdateLongVideoSegmentsRequest, userId: string) {
    const draft = await longVideoRepository.getDraft(draftId, userId);
    const updates = Array.isArray(body.segments) ? body.segments : [];
    const textBySlot = new Map(
      updates
        .map((item) => asRecord(item))
        .map((item) => [asString(item.slot), asString(item.narrationText)] as const)
        .filter(([slot, text]) => Boolean(slot && text)),
    );
    const next: LongVideoDraftRecord = {
      ...draft,
      segments: draft.segments.map((segment) => ({
        ...segment,
        narrationText: textBySlot.get(segment.slot) || segment.narrationText,
      })),
      status: "script_ready",
      updatedAt: new Date().toISOString(),
    };
    validateNarrationSegments(next.segments);
    await longVideoRepository.saveDraft(next);
    return this.toDraftResponse(next);
  }

  async createAudioPreview(draftId: string, userId: string) {
    const draft = await longVideoRepository.getDraft(draftId, userId);
    validateNarrationSegments(draft.segments);
    const audioPreviewId = createId("long_video_audio_preview");
    const outputDir = path.join(audioOutputDir, audioPreviewId);
    await fs.mkdir(outputDir, { recursive: true });
    const segments = [];
    try {
      for (const [index, segment] of draft.segments.entries()) {
        const speech = await minimaxClient.synthesizeSpeech({
        text: segment.narrationText,
        voiceId: draft.voice.voiceId,
        model: draft.voice.model,
        speed: draft.voice.speed,
        vol: draft.voice.vol,
        pitch: draft.voice.pitch,
        language: draft.voice.languageBoost,
        audioSetting: {
          sampleRate: 44100,
          bitrate: 128000,
          format: "mp3",
          channel: 2,
        },
      });
        if (!speech.durationMs) {
        throw errors.generationFailed("MiniMax long-video audio response missing duration", {
          slot: segment.slot,
        });
      }
        if (speech.durationMs > maxSegmentAudioDurationMs) {
        throw errors.invalidParameter(
          "long-video narration is too long for one segment; shorten it and regenerate audio",
          {
            slot: segment.slot,
            durationMs: speech.durationMs,
            maxDurationMs: maxSegmentAudioDurationMs,
          },
        );
      }
        const fileName = `${String(index + 1).padStart(2, "0")}-${segment.slot}.mp3`;
        const localPath = path.join(outputDir, fileName);
        await fs.writeFile(localPath, speech.audio);
        segments.push({
        slot: segment.slot,
        role: segment.role,
        screenType: segment.screenType,
        text: segment.narrationText,
        audioUrl: `${env.publicBaseUrl.replace(/\/$/, "")}/results/long-video-generation/audio-previews/${audioPreviewId}/${fileName}`,
        localPath,
        durationMs: speech.durationMs,
        bytes: speech.sizeBytes,
        });
      }
    } catch (error) {
      await fs.rm(outputDir, { recursive: true, force: true });
      throw error;
    }
    const preview = await longVideoRepository.saveAudioPreview({
      audioPreviewId,
      draftId,
      userId,
      voice: draft.voice,
      segments,
      totalDurationMs: segments.reduce((sum, segment) => sum + segment.durationMs, 0),
      canUseForVideo: true,
      createdAt: new Date().toISOString(),
    });
    await longVideoRepository.saveDraft({
      ...draft,
      status: "audio_ready",
      updatedAt: new Date().toISOString(),
    });
    return preview;
  }

  async getAudioPreview(audioPreviewId: string, userId: string) {
    return longVideoRepository.getAudioPreview(audioPreviewId, userId);
  }

  async createTask(
    draftId: string,
    body: CreateLongVideoTaskRequest,
    userId: string,
    context?: BillingRequestContext,
  ) {
    const subscription = await assertCanStartGeneration(context, {
      moduleCodes: ["long-video-generation"],
    });
    const draft = await longVideoRepository.getDraft(draftId, userId);
    const audioPreviewId = asString(body.audioPreviewId);
    if (!audioPreviewId) throw errors.invalidParameter("audioPreviewId is required");
    const audioPreview = await longVideoRepository.getAudioPreview(audioPreviewId, userId);
    if (audioPreview.draftId !== draft.draftId) {
      throw errors.invalidParameter("audioPreviewId does not belong to draft", {
        audioPreviewId,
        draftId,
      });
    }
    if (!audioPreview.canUseForVideo) {
      throw errors.invalidParameter("audio preview cannot be used for video", { audioPreviewId });
    }

    const [frontInterior, rearInterior] = await Promise.all([
      assetsRepository.findById(draft.interiorVideoAssetIds[0], userId),
      assetsRepository.findById(draft.interiorVideoAssetIds[1], userId),
    ]);
    if (!frontInterior || !rearInterior) throw errors.assetNotFound();

    const taskId = createId("long_video_task");
    const renderPlanOutputDir = path.join(renderPlanDir, taskId);
    await fs.mkdir(renderPlanOutputDir, { recursive: true });

    const audioBySlot = new Map(audioPreview.segments.map((segment) => [segment.slot, segment]));
    const userVideoBySlot = new Map([
      ["user_video_1", frontInterior],
      ["user_video_2", rearInterior],
    ]);

    const sequence: LongVideoRenderPlanSegment[] = draft.segments.map((segment, index) => {
      const audio = audioBySlot.get(segment.slot);
      if (!audio) {
        throw errors.invalidParameter("audio preview is missing segment", { slot: segment.slot });
      }
      const base: LongVideoRenderPlanSegment = {
        slot: segment.slot,
        role: segment.role,
        screenType: segment.screenType,
        order: index + 1,
        narrationText: segment.narrationText,
        audioUrl: audio.audioUrl,
        audioLocalPath: audio.localPath,
        durationMs: audio.durationMs,
      };
      if (segment.screenType === "ai_digital_human") {
        return {
          ...base,
          seedance: {
            prompt: buildAiPrompt({ draft, segment }),
            referenceAudioUrl: audio.audioUrl,
            referenceAudioLocalPath: audio.localPath,
            useReferenceAudioForLipSync: true,
            expectedScene:
              segment.slot === "ai_video_2"
                ? "vehicle_interior_seated"
                : "outdoor_vehicle_exterior",
          },
        };
      }
      const userVideo = userVideoBySlot.get(segment.slot);
      if (!userVideo) {
        throw errors.invalidParameter("user video is missing for segment", { slot: segment.slot });
      }
      return {
        ...base,
        userVideo: {
          assetId: userVideo.id,
          sourceUrl: userVideo.publicUrl,
          sourceLocalPath: userVideo.localPath,
          stretchToAudioDuration: true,
          trimTailFrames: 2,
          originalAudioDuckDb: -20,
        },
      };
    });

    const pipelineJob = {
      job_id: taskId,
      mode: "long-video-single-car",
      settings: { resolution: "1080x1920", fps: 30 },
      predicted_order: sequence.map((segment) => segment.slot),
      clips: sequence.map((segment) => ({
        clip_id: segment.slot,
        path:
          segment.userVideo?.sourceUrl ??
          renderPlanPublicUrl(taskId, `${segment.slot}.mp4`),
        role: segment.role,
        order: segment.order,
        duration: Math.max(0.01, segment.durationMs / 1000),
      })),
    };

    const pipelineJobPath = path.join(renderPlanOutputDir, "pipeline-job.json");
    const renderPlan: LongVideoRenderPlan = {
      planVersion: 1,
      draftId: draft.draftId,
      audioPreviewId,
      digitalHumanId: draft.digitalHumanId,
      vehicleImageAssetIds: draft.vehicleImageAssetIds,
      interiorVideoAssetIds: draft.interiorVideoAssetIds,
      sequence,
      audioRules: {
        independentTtsSegments: true,
        loudnessTargetLufs: -16,
        crossfadeMs: 220,
        segmentHeadSilenceMs: 30,
        segmentTailFadeMs: 90,
      },
      videoRules: {
        order: ["ai_video_1", "user_video_1", "ai_video_2", "user_video_2", "ai_video_3"],
        cutTailFramesPerClip: 2,
        userVideoStretchToVoiceover: true,
        aiVideoMustUseReferenceAudio: true,
        preserveSeedanceAudioForAiSegments: true,
        requireSeedanceAudioStream: true,
      },
      editorIntegration: {
        source: "ai-video-state",
        adapter: "packages/pipeline-adapter",
        openEditorAfterGeneratedOnly: true,
        pipelineJobPath,
      },
    };

    const renderPlanPath = path.join(renderPlanOutputDir, "render-plan.json");
    await Promise.all([
      fs.writeFile(renderPlanPath, JSON.stringify(renderPlan, null, 2), "utf8"),
      fs.writeFile(pipelineJobPath, JSON.stringify(pipelineJob, null, 2), "utf8"),
    ]);

    const now = new Date().toISOString();
    await tasksRepository.createWaitingTask({
      id: taskId,
      userId: subscription.userKey,
      moduleCode: "long-video-generation",
      inputAssetId: draft.vehicleImageAssetIds[0] ?? null,
      optionId: draft.draftId,
      outputRatio: "9:16",
      resolution: VIDEO_GENERATION_RESOLUTION,
      logoAssetId: null,
      prompt: renderPlan.sequence
        .filter((segment) => segment.seedance)
        .map((segment) => segment.seedance?.prompt)
        .filter(Boolean)
        .join("\n\n---\n\n"),
      subscriptionUserKey: subscription.userKey,
      subscriptionPlanCode: subscription.planCode,
    });

    const estimatedAudioSeconds = Math.ceil(audioPreview.totalDurationMs / 1000);
    let billing: FrozenGenerationBilling | null = null;
    try {
      billing = await freezeGenerationBilling({
        taskId,
        functionCode: "long-video-generation",
        estimatedPoints: videoGenerationPointsByAudioSeconds(estimatedAudioSeconds),
        body: body as Record<string, unknown>,
        context,
      });
    } catch (error) {
      await tasksRepository.markFailed(
        taskId,
        "BILLING_FREEZE_FAILED",
        error instanceof Error ? error.message : "billing freeze failed",
      );
      throw error;
    }

    const task: LongVideoTaskRecord = {
      taskId,
      draftId: draft.draftId,
      audioPreviewId,
      userId,
      status: "queued",
      progress: 5,
      renderPlanPath,
      renderPlan,
      arkTasks: [],
      resultUrl: null,
      resultLocalPath: null,
      editorProjectUrl: null,
      ...toBillingResponseFields(billing),
      createdAt: now,
      updatedAt: now,
    };
    await longVideoRepository.saveTask(task);
    void this.runTask(task.taskId, userId, billing).catch((error) => {
      console.error(`[long-video-generation] task ${task.taskId} failed`, error);
    });
    return this.toTaskResponse(task);
  }

  async getTask(taskId: string, userId: string) {
    return this.toTaskResponse(await longVideoRepository.getTask(taskId, userId));
  }

  async retryTask(taskId: string, userId: string, context?: BillingRequestContext) {
    const task = await longVideoRepository.getTask(taskId, userId);
    if (task.status !== "failed") {
      throw errors.invalidParameter("only failed long-video tasks can be retried");
    }
    return this.createTask(
      task.draftId,
      { audioPreviewId: task.audioPreviewId },
      userId,
      context,
    );
  }

  async reconcileInterruptedTasks() {
    const tasks = await longVideoRepository.listTasks();
    const terminalStatuses: LongVideoTaskStatus[] = ["completed", "failed"];

    for (const task of tasks) {
      if (terminalStatuses.includes(task.status)) continue;
      const message = "Long-video generation was interrupted by a backend restart. Please submit it again.";
      await longVideoRepository.patchTask(task.taskId, task.userId, {
        status: "failed",
        progress: Math.min(task.progress ?? 95, 95),
        errorMessage: message,
      });
      await tasksRepository.markFailed(task.taskId, "LONG_VIDEO_TASK_INTERRUPTED", message);
    }

    await this.reconcileBilling();
  }

  async reconcileBilling() {
    const tasks = await longVideoRepository.listTasks();
    for (const task of tasks) {
      if (task.status !== "completed" && task.status !== "failed") continue;
      const generationTask = await tasksRepository.findById(task.taskId);
      if (generationTask) await finalizeGenerationBilling(generationTask);
    }
  }

  private async runTask(
    taskId: string,
    userId: string,
    billing: FrozenGenerationBilling | null,
  ) {
    let task = await longVideoRepository.getTask(taskId, userId);
    try {
      task = await longVideoRepository.patchTask(taskId, userId, {
        status: "generating_ai_video",
        progress: 10,
      });
      await tasksRepository.updateFromKie(taskId, {
        status: "generating",
        progress: 10,
        resultJson: { phase: "generating_ai_video" },
      });

      const aiSegments = task.renderPlan.sequence.filter(
        (segment): segment is LongVideoRenderPlanSegment & {
          seedance: NonNullable<LongVideoRenderPlanSegment["seedance"]>;
        } => Boolean(segment.seedance),
      );
      const digitalHumanImagePath = await readDigitalHumanImagePath(task.renderPlan.digitalHumanId);
      const digitalHumanReference = await arkVirtualAssetService.ensureLocalFileAsset({
        userId,
        assetType: "Image",
        filePath: digitalHumanImagePath,
        fileName: `${task.renderPlan.digitalHumanId}${path.extname(digitalHumanImagePath) || ".png"}`,
      });
      const vehicleAssets = await Promise.all(
        task.renderPlan.vehicleImageAssetIds.map((assetId) =>
          assetsRepository.findById(assetId, userId),
        ),
      );
      if (vehicleAssets.length === 0 || vehicleAssets.some((asset) => !asset)) {
        throw errors.assetNotFound();
      }
      const vehicleReferences = await Promise.all(
        vehicleAssets
          .filter((asset): asset is AssetRecord => Boolean(asset))
          .map((asset) =>
            arkVirtualAssetService.ensureLocalFileAsset({
              userId,
              assetType: "Image",
              filePath: asset.localPath,
              publicUrl: asset.publicUrl,
              fileName: asset.fileName,
            }),
          ),
      );
      const vehicleReference = vehicleReferences[0];
      if (!vehicleReference) throw errors.assetNotFound();

      const referenceFrameDir = path.join(taskOutputDir, taskId, "reference-frames");
      const frontInteriorSegment = task.renderPlan.sequence.find(
        (segment) => segment.slot === "user_video_1",
      );
      const rearInteriorSegment = task.renderPlan.sequence.find(
        (segment) => segment.slot === "user_video_2",
      );
      const interiorFrameReferences = await Promise.all(
        [
          frontInteriorSegment?.userVideo?.sourceLocalPath
            ? {
                name: "front-interior-frame.jpg",
                path: frontInteriorSegment.userVideo.sourceLocalPath,
              }
            : null,
          rearInteriorSegment?.userVideo?.sourceLocalPath
            ? {
                name: "rear-interior-frame.jpg",
                path: rearInteriorSegment.userVideo.sourceLocalPath,
              }
            : null,
        ]
          .filter((item): item is { name: string; path: string } => Boolean(item))
          .map(async (item) => {
            const framePath = await extractReferenceFrame(
              item.path,
              path.join(referenceFrameDir, item.name),
            );
            return arkVirtualAssetService.ensureLocalFileAsset({
              userId,
              assetType: "Image",
              filePath: framePath,
              fileName: item.name,
            });
          }),
      );

      const arkStates = new Map<
        LongVideoSlot,
        {
          index: number;
          slot: LongVideoSlot;
          arkTaskId: string;
          status: "queued" | "generating" | "success" | "fail";
          progress: number;
          resultUrl?: string | null;
          localPath?: string | null;
          errorMessage?: string | null;
        }
      >();
      let arkPatchQueue = Promise.resolve();
      const patchArkProgress = async () => {
        arkPatchQueue = arkPatchQueue.then(async () => {
          const current = await longVideoRepository.getTask(taskId, userId);
          const states = [...arkStates.values()].sort((a, b) => a.index - b.index);
          const averageProgress =
            states.length > 0
              ? states.reduce((sum, item) => sum + item.progress, 0) / states.length
              : 0;
          task = await longVideoRepository.patchTask(taskId, userId, {
            progress: Math.max(
              current.progress ?? 0,
              Math.min(68, 20 + Math.round(averageProgress * 0.42)),
            ),
            arkTasks: states.map((item) => ({
              slot: item.slot,
              arkTaskId: item.arkTaskId,
              status: item.status,
              resultUrl: item.resultUrl,
              localPath: item.localPath,
              errorMessage: item.errorMessage,
            })),
          });
        });
        await arkPatchQueue;
      };

      const generateAiSegment = async (
        segment: LongVideoRenderPlanSegment & {
          seedance: NonNullable<LongVideoRenderPlanSegment["seedance"]>;
        },
        index: number,
      ): Promise<{ slot: string; localPath: string; resultUrl: string }> => {
        const seedance = segment.seedance;
        const audioAsset = await arkVirtualAssetService.ensureLocalFileAsset({
          userId,
          assetType: "Audio",
          filePath: seedance.referenceAudioLocalPath,
          publicUrl: seedance.referenceAudioUrl,
          fileName: path.basename(seedance.referenceAudioLocalPath),
        });
        if (!vehicleReference.assetUri || !audioAsset.assetUri) {
          throw errors.generationFailed("long-video Ark virtual asset uri missing", {
            slot: segment.slot,
          });
        }
        if (!digitalHumanReference.assetUri) {
          throw errors.generationFailed("long-video digital human Ark virtual asset uri missing", {
            slot: segment.slot,
            digitalHumanId: task.renderPlan.digitalHumanId,
          });
        }

        const slotSpecificReferences =
          segment.slot === "ai_video_2"
            ? [...interiorFrameReferences, ...vehicleReferences]
            : segment.slot === "ai_video_3"
              ? [...vehicleReferences.slice().reverse(), ...interiorFrameReferences]
              : [...vehicleReferences, ...interiorFrameReferences.slice(0, 1)];

        const arkTask = await arkClient.createSeedanceVideoTask({
          prompt: seedance.prompt,
          referenceContents: [
            {
              type: "image_url",
              role: "reference_image",
              image_url: { url: digitalHumanReference.assetUri },
            },
            {
              type: "audio_url",
              role: "reference_audio",
              audio_url: { url: audioAsset.assetUri },
            },
            ...slotSpecificReferences
              .filter((reference) => Boolean(reference.assetUri))
              .map((reference) => ({
                type: "image_url" as const,
                role: "reference_image" as const,
                image_url: { url: reference.assetUri as string },
              })),
          ],
          ratio: "9:16",
          resolution: "720p",
          duration: Math.max(5, Math.min(12, Math.ceil(segment.durationMs / 1000))),
          generateAudio: true,
        });
        arkStates.set(segment.slot, {
          index,
          slot: segment.slot,
          arkTaskId: arkTask.taskId,
          status: "queued",
          progress: 5,
        });
        await tasksRepository.markSubmitted({
          id: taskId,
          kieTaskId: arkTask.taskId,
          kieAccountHash: "ark",
          model: env.ark.videoModel,
          requestJson: {
            provider: "ark",
            model: env.ark.videoModel,
            moduleCode: "long-video-generation",
            slot: segment.slot,
            prompt: seedance.prompt,
            digitalHumanReferenceAssetUri: digitalHumanReference.assetUri,
            referenceAudioAssetUri: audioAsset.assetUri,
            vehicleReferenceAssetUris: vehicleReferences.map((reference) => reference.assetUri),
            interiorFrameReferenceAssetUris: interiorFrameReferences.map(
              (reference) => reference.assetUri,
            ),
            referenceOrder: [
              "digital_human_identity",
              "narration_audio",
              "slot_scene_images",
            ],
            generateAudio: true,
          },
          responseJson: arkTask.raw,
          attemptNo: index + 1,
        });
        await patchArkProgress();

        const detail = await this.pollArkTask(arkTask.taskId, (progress) => {
          const current = arkStates.get(segment.slot);
          if (current) {
            arkStates.set(segment.slot, {
              ...current,
              progress,
              status: progress >= 100 ? "success" : "generating",
            });
          }
          return patchArkProgress();
        });
        const resultUrl = detail.resultUrls[0];
        const localPath = path.join(taskOutputDir, taskId, "ai", `${segment.slot}.mp4`);
        await downloadFile(resultUrl, localPath);
        if (!(await probeHasAudioStream(localPath))) {
          throw errors.generationFailed(
            "Seedance result is missing the required audio stream; stopping before submitting remaining AI segments",
            { slot: segment.slot, arkTaskId: arkTask.taskId, localPath },
          );
        }
        const current = arkStates.get(segment.slot);
        if (current) {
          arkStates.set(segment.slot, {
            ...current,
            progress: 100,
            status: "success",
            resultUrl,
            localPath,
          });
        }
        await patchArkProgress();
        return { slot: segment.slot, localPath, resultUrl };
      };

      const aiOutputs: Array<{ slot: string; localPath: string; resultUrl: string }> = [];
      const [probeSegment, ...remainingAiSegments] = aiSegments;
      if (!probeSegment) {
        throw errors.generationFailed("long-video render plan has no AI segments");
      }
      aiOutputs.push(await generateAiSegment(probeSegment, 0));

      const remainingAiResults = await Promise.allSettled(
        remainingAiSegments.map((segment, index) => generateAiSegment(segment, index + 1)),
      );
      const failedAiResult = remainingAiResults.find(
        (result): result is PromiseRejectedResult => result.status === "rejected",
      );
      if (failedAiResult) throw failedAiResult.reason;

      aiOutputs.push(...remainingAiResults
        .filter((result): result is PromiseFulfilledResult<{ slot: string; localPath: string; resultUrl: string }> =>
          result.status === "fulfilled",
        )
        .map((result) => result.value));

      task = await longVideoRepository.patchTask(taskId, userId, {
        progress: 68,
        arkTasks: [...arkStates.values()].sort((a, b) => a.index - b.index).map((item) => ({
          slot: item.slot,
          arkTaskId: item.arkTaskId,
          status: item.status,
          resultUrl: item.resultUrl,
          localPath: item.localPath,
          errorMessage: item.errorMessage,
        })),
      });
      await tasksRepository.updateFromKie(taskId, {
        status: "generating",
        progress: 68,
        resultJson: {
          phase: "ai_videos_ready",
          arkTasks: [...arkStates.values()].map((item) => ({
            slot: item.slot,
            arkTaskId: item.arkTaskId,
            status: item.status,
          })),
        },
      });

      task = await longVideoRepository.patchTask(taskId, userId, {
        status: "rendering",
        progress: 72,
      });
      const finalVideo = await this.renderFinalVideo(task, aiOutputs);
      const coverPath = path.join(path.dirname(finalVideo.localPath), "long-video-cover.jpg");
      let coverUrl: string | null = null;
      try {
        await extractReferenceFrame(finalVideo.localPath, coverPath, 0);
        coverUrl = taskPublicUrl(taskId, "rendered/long-video-cover.jpg");
      } catch (error) {
        console.warn(`[long-video-generation] failed to create cover for ${taskId}`, error);
      }
      const draft = await longVideoRepository.getDraft(task.draftId, userId);
      await tasksRepository.updateFromKie(taskId, {
        status: "success",
        progress: 100,
        resultJson: {
          provider: "ark",
          moduleCode: "long-video-generation",
          resultUrl: finalVideo.publicUrl,
          thumbnailUrl: coverUrl,
          vehicleName: vehicleNameFromInfo(draft.vehicleInfo),
          renderPlanPath: task.renderPlanPath,
        },
      });
      const settledTask = await tasksRepository.findById(taskId, userId);
      if (settledTask) {
        await finalizeGenerationBilling(settledTask);
      }
      await longVideoRepository.patchTask(taskId, userId, {
        status: "completed",
        progress: 100,
        resultUrl: finalVideo.publicUrl,
        resultLocalPath: finalVideo.localPath,
        editorProjectUrl: `/long-video-editor?taskId=${encodeURIComponent(taskId)}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "long-video task failed";
      const failedProgress = Math.min(task.progress ?? 95, 95);
      await longVideoRepository.patchTask(taskId, userId, {
        status: "failed",
        progress: failedProgress,
        errorMessage: message,
      });
      await tasksRepository.markFailed(taskId, "LONG_VIDEO_TASK_FAILED", message);
      try {
        if (billing) await refundFrozenGenerationBilling(taskId, billing);
      } catch {
        await markGenerationBillingRefundFailed(taskId, billing);
      }
      throw error;
    }
  }

  private async pollArkTask(
    arkTaskId: string,
    onProgress: (progress: number) => Promise<unknown>,
  ) {
    let detailFailureCount = 0;
    for (let attempt = 0; attempt < arkPollAttempts; attempt += 1) {
      if (attempt > 0) await sleep(arkPollIntervalMs);
      let detail;
      try {
        detail = await arkClient.getTaskDetail(arkTaskId);
        detailFailureCount = 0;
      } catch (error) {
        detailFailureCount += 1;
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `[long-video-generation] Ark task detail polling retry ${detailFailureCount}/${arkDetailFailureLimit}`,
          { arkTaskId, message },
        );
        if (detailFailureCount < arkDetailFailureLimit) continue;
        throw errors.generationFailed("Ark Seedance task detail polling failed repeatedly", {
          arkTaskId,
          detailFailureCount,
          cause: message,
        });
      }
      await onProgress(detail.progress);
      if (detail.status === "success") return detail;
      if (detail.status === "fail") {
        throw errors.generationFailed(detail.errorMessage ?? "Ark Seedance task failed", {
          arkTaskId,
        });
      }
    }
    throw errors.generationFailed("Ark Seedance task polling timed out", { arkTaskId });
  }

  private async renderFinalVideo(
    task: LongVideoTaskRecord,
    aiOutputs: Array<{ slot: string; localPath: string; resultUrl: string }>,
  ) {
    const outputDir = path.join(taskOutputDir, task.taskId, "rendered");
    await fs.mkdir(outputDir, { recursive: true });
    const aiBySlot = new Map(aiOutputs.map((item) => [item.slot, item]));
    const segmentPaths: string[] = [];

    for (const segment of task.renderPlan.sequence) {
      const inputVideo = segment.userVideo?.sourceLocalPath ?? aiBySlot.get(segment.slot)?.localPath;
      if (!inputVideo) {
        throw errors.generationFailed("long-video segment source missing", { slot: segment.slot });
      }
      const outputPath = path.join(outputDir, `${String(segment.order).padStart(2, "0")}-${segment.slot}.mp4`);
      if (segment.userVideo) {
        await this.renderUserSegment(inputVideo, segment.audioLocalPath, outputPath, segment.durationMs);
      } else {
        await this.renderAiSegment(inputVideo, outputPath);
      }
      segmentPaths.push(outputPath);
    }

    const localPath = path.join(outputDir, "long-video-final.mp4");
    await this.mergeSegmentsWithCrossfade(segmentPaths, localPath);
    return {
      localPath,
      publicUrl: taskPublicUrl(task.taskId, "rendered/long-video-final.mp4"),
    };
  }

  private async mergeSegmentsWithCrossfade(segmentPaths: string[], outputPath: string) {
    if (segmentPaths.length === 1) {
      await fs.copyFile(segmentPaths[0], outputPath);
      return;
    }
    const inputs = segmentPaths.flatMap((filePath) => ["-i", filePath]);
    const labels = segmentPaths
      .map((_, index) => `[${index}:v:0][${index}:a:0]`)
      .join("");
    await runFfmpeg([
      ...inputs,
      "-filter_complex",
      `${labels}concat=n=${segmentPaths.length}:v=1:a=1[vcat][acat];[acat]aresample=async=1:first_pts=0,loudnorm=I=-18:TP=-1.5:LRA=11,aresample=44100,volume=1.25[aout]`,
      "-map",
      "[vcat]",
      "-map",
      "[aout]",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      outputPath,
    ]);
  }

  private async renderAiSegment(videoPath: string, outputPath: string) {
    const sourceSeconds = await probeDurationSeconds(videoPath);
    const fps = await probeFps(videoPath);
    const safeVideoEndSeconds = Math.max(0.3, sourceSeconds - 2 / Math.max(1, fps));
    const hasSeedanceAudio = await probeHasAudioStream(videoPath);

    if (!hasSeedanceAudio) {
      throw errors.generationFailed(
        "Seedance result is missing the required audio stream; refusing to attach audio after generation",
        { videoPath },
      );
    }

    const trimSeconds = Math.max(0.3, safeVideoEndSeconds);
    await runFfmpeg([
      "-i",
      videoPath,
      "-filter_complex",
      `[0:v]trim=0:${trimSeconds.toFixed(3)},setpts=PTS-STARTPTS,scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=30,format=yuv420p[vout];[0:a]atrim=0:${trimSeconds.toFixed(3)},asetpts=PTS-STARTPTS,loudnorm=I=-18:TP=-1.5:LRA=11,aresample=async=1:first_pts=0,aresample=44100,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[aout]`,
      "-map",
      "[vout]",
      "-map",
      "[aout]",
      "-t",
      trimSeconds.toFixed(3),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      outputPath,
    ]);
  }

  private async renderUserSegment(
    videoPath: string,
    audioPath: string,
    outputPath: string,
    durationMs: number,
  ) {
    const targetSeconds = Math.max(0.3, await probeDurationSeconds(audioPath), durationMs / 1000);
    const sourceSeconds = await probeDurationSeconds(videoPath);
    const fps = await probeFps(videoPath);
    const sourceEnd = Math.max(0.3, sourceSeconds - 2 / Math.max(1, fps));
    const setPtsRatio = sourceEnd > 0 ? targetSeconds / sourceEnd : 1;
    const audioSpeed = targetSeconds > 0 ? sourceEnd / targetSeconds : 1;
    const audioFilter =
      `[0:a]atrim=0:${sourceEnd.toFixed(3)},asetpts=PTS-STARTPTS,${atempoChain(audioSpeed)},volume=0.08,aresample=44100,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[amb];[1:a]atrim=0:${targetSeconds.toFixed(3)},asetpts=PTS-STARTPTS,loudnorm=I=-18:TP=-1.5:LRA=11,aresample=44100,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[vox];[vox][amb]amix=inputs=2:duration=first:dropout_transition=0,loudnorm=I=-18:TP=-1.5:LRA=11,aresample=44100[aout]`;
    await runFfmpeg([
      "-i",
      videoPath,
      "-i",
      audioPath,
      "-filter_complex",
      `[0:v]trim=0:${sourceEnd.toFixed(3)},setpts=${setPtsRatio.toFixed(8)}*(PTS-STARTPTS),scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=30,format=yuv420p[vout];${audioFilter}`,
      "-map",
      "[vout]",
      "-map",
      "[aout]",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      outputPath,
    ]);
  }

  private toDraftResponse(draft: LongVideoDraftRecord) {
    const estimatedAiSeconds = draft.segments
      .filter((segment) => segment.screenType === "ai_digital_human")
      .reduce((sum, segment) => sum + segment.targetDurationSeconds, 0);
    return {
      ...draft,
      estimatedAiSeconds,
      estimatedCostPoints: estimatedAiSeconds * 150,
    };
  }

  private toTaskResponse(task: LongVideoTaskRecord) {
    return {
      ...task,
      pollingUrl: `/api/v1/modules/long-video-generation/tasks/${task.taskId}`,
    };
  }
}

export const longVideoService = new LongVideoService();
