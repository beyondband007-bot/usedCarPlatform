import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { env } from "../src/config/env";
import { arkClient } from "../src/providers/ark/arkClient";
import { arkOpenApiClient, type ArkVirtualAssetType } from "../src/providers/ark/arkOpenApiClient";
import { downloadFile } from "../src/shared/downloadFile";

const require = createRequire(import.meta.url);

const runId = process.env.SEEDANCE_MANUAL_RUN_ID?.trim() || "seedance2-office-20260708-mp3-asset";
const useDirectAudioUrl = process.env.SEEDANCE_DIRECT_AUDIO_URL === "1";
const workspaceRoot = path.resolve(__dirname, "../..");
const outputDir = path.join(env.resultsDir, "video-generation", "manual-seedance", runId);
const optimizedDir = path.join(outputDir, "optimized");

const digitalHumanPath =
  "C:\\Users\\Administrator\\Documents\\xwechat_files\\wxid_u6nk2xtodi9n12_a898\\temp\\RWTemp\\2026-07\\47e9f7b3bbe431111667c2e96e309830\\9982fb6c05f155194ecb09d80125ae6b.png";
const scenePath =
  "C:\\Users\\Administrator\\Documents\\xwechat_files\\wxid_u6nk2xtodi9n12_a898\\temp\\RWTemp\\2026-07\\47e9f7b3bbe431111667c2e96e309830\\4d642e338befc5b09675f0e9fe0e92c0.png";
const audioPath =
  "C:\\Users\\Administrator\\Documents\\xwechat_files\\wxid_u6nk2xtodi9n12_a898\\msg\\file\\2026-07\\开始.m4a";

const prompt = [
  "Use the uploaded digital human identity reference and place this exact person at the doorway/front area of the uploaded office/hospital-service scene.",
  "The digital human faces the camera and gives an oral activity introduction, speaking strictly according to the uploaded reference audio, with natural lip sync, pauses, and speech rhythm matching the audio.",
  "Keep the scene limited to the uploaded environment only. Do not invent other rooms, streets, vehicles, products, people, camera angles, or unrelated shots.",
  "Use a stable medium shot or medium-close shot at the office doorway/front area, natural indoor lighting, realistic style.",
  "No Chinese subtitles, no captions, no visible text overlays, no watermarks, no garbled text.",
].join("\n");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ffmpegPath = String(require("ffmpeg-static"));

const sha256 = async (filePath: string) => {
  const bytes = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(bytes).digest("hex");
};

const uploadToKiePublic = async (filePath: string, assetType: ArkVirtualAssetType) => {
  const apiKey = env.kie.apiKeys[0];
  if (!apiKey) throw new Error("KIE_API_KEYS is not configured");

  const bytes = await fs.readFile(filePath);
  const formData = new FormData();
  formData.append("file", new Blob([bytes]), path.basename(filePath));
  formData.append("uploadPath", `used-car-platform/video-generation/manual-seedance/${runId}/${assetType.toLowerCase()}`);
  formData.append("fileName", path.basename(filePath));

  const response = await fetch(`${env.kie.fileUploadBaseUrl}/api/file-stream-upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });
  const raw = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`KIE upload failed for ${path.basename(filePath)}: ${JSON.stringify(raw).slice(0, 1000)}`);
  }
  const data = raw?.data ?? raw;
  const fileUrl = data?.fileUrl ?? data?.url ?? data?.downloadUrl;
  if (typeof fileUrl !== "string" || !fileUrl) {
    throw new Error(`KIE upload missing fileUrl for ${path.basename(filePath)}: ${JSON.stringify(raw).slice(0, 1000)}`);
  }
  return { fileUrl, raw };
};

const optimizeImage = async (filePath: string, label: string) => {
  await fs.mkdir(optimizedDir, { recursive: true });
  const hash = await sha256(filePath);
  const outputPath = path.join(optimizedDir, `${label}-${hash.slice(0, 12)}.webp`);
  await sharp(filePath)
    .rotate()
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 72 })
    .toFile(outputPath);
  return outputPath;
};

const convertAudioToMp3 = async () => {
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${runId}-audio.mp3`);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      ffmpegPath,
      [
        "-y",
        "-i",
        audioPath,
        "-vn",
        "-acodec",
        "libmp3lame",
        "-ar",
        "44100",
        "-ac",
        "2",
        "-b:a",
        "128k",
        outputPath,
      ],
      { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] },
    );
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
      if (stderr.length > 4000) stderr = stderr.slice(-4000);
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg audio conversion failed with ${code}: ${stderr}`));
    });
  });
  return outputPath;
};

const ensureAssetGroup = async () => {
  const groups = await arkOpenApiClient.listAssetGroups();
  const existing = groups.find((group) => group.name === env.ark.virtualAssetGroupName);
  return existing ?? arkOpenApiClient.createAssetGroup(env.ark.virtualAssetGroupName);
};

const createAndWaitAsset = async (input: {
  groupId: string;
  filePath: string;
  assetType: ArkVirtualAssetType;
  name: string;
}) => {
  console.log(`[${runId}] uploading public source: ${input.name}`);
  const uploaded = await uploadToKiePublic(input.filePath, input.assetType);
  console.log(`[${runId}] creating Ark asset: ${input.name}`);
  let asset = await arkOpenApiClient.createAsset({
    groupId: input.groupId,
    url: uploaded.fileUrl,
    assetType: input.assetType,
    name: input.name,
  });

  for (let attempt = 1; attempt <= env.ark.virtualAssetPollAttempts; attempt += 1) {
    const status = String(asset.status ?? "").toLowerCase();
    console.log(`[${runId}] asset ${input.name} status=${asset.status || "unknown"} attempt=${attempt}/${env.ark.virtualAssetPollAttempts}`);
    if (["active", "success", "succeeded", "ready"].includes(status)) {
      return { ...asset, publicUrl: uploaded.fileUrl };
    }
    if (["failed", "fail", "error", "rejected"].includes(status)) {
      throw new Error(`Ark asset failed: ${input.name} ${asset.errorMessage ?? ""}`);
    }
    await sleep(env.ark.virtualAssetPollIntervalMs);
    asset = await arkOpenApiClient.getAsset(asset.providerAssetId);
  }

  throw new Error(`Ark asset timed out: ${input.name}`);
};

const main = async () => {
  await fs.mkdir(outputDir, { recursive: true });
  console.log(`[${runId}] outputDir=${outputDir}`);
  console.log(`[${runId}] preparing optimized images`);
  const mp3AudioPath = await convertAudioToMp3();
  const [digitalOptimizedPath, sceneOptimizedPath] = await Promise.all([
    optimizeImage(digitalHumanPath, "digital-human"),
    optimizeImage(scenePath, "scene"),
    fs.copyFile(audioPath, path.join(outputDir, path.basename(audioPath))),
  ]);

  console.log(`[${runId}] ensuring Ark asset group`);
  const group = await ensureAssetGroup();
  console.log(`[${runId}] assetGroup=${group.providerGroupId}`);

  const [sceneAsset, digitalHumanAsset] = await Promise.all([
    createAndWaitAsset({
      groupId: group.providerGroupId,
      filePath: sceneOptimizedPath,
      assetType: "Image",
      name: `${runId}-scene.webp`,
    }),
    createAndWaitAsset({
      groupId: group.providerGroupId,
      filePath: digitalOptimizedPath,
      assetType: "Image",
      name: `${runId}-digital-human.webp`,
    }),
  ]);
  const audioReference = useDirectAudioUrl
    ? await uploadToKiePublic(mp3AudioPath, "Audio").then((uploaded) => ({
        assetUri: uploaded.fileUrl,
        publicUrl: uploaded.fileUrl,
      }))
    : await createAndWaitAsset({
        groupId: group.providerGroupId,
        filePath: mp3AudioPath,
        assetType: "Audio",
        name: `${runId}-audio.mp3`,
      });

  console.log(`[${runId}] submitting Seedance task`);
  const task = await arkClient.createSeedanceVideoTask({
    prompt,
    referenceContents: [
      { type: "image_url", role: "reference_image", image_url: { url: sceneAsset.assetUri } },
      { type: "image_url", role: "reference_image", image_url: { url: digitalHumanAsset.assetUri } },
      { type: "audio_url", role: "reference_audio", audio_url: { url: audioReference.assetUri } },
    ],
    ratio: "9:16",
    resolution: "720p",
    duration: 11,
    generateAudio: true,
    watermark: false,
  });
  console.log(`[${runId}] arkTaskId=${task.taskId}`);

  let detail = await arkClient.getTaskDetail(task.taskId);
  for (let attempt = 1; attempt <= 80; attempt += 1) {
    console.log(`[${runId}] task status=${detail.status} progress=${detail.progress} attempt=${attempt}/80`);
    if (detail.status === "success" || detail.status === "fail") break;
    await sleep(15_000);
    detail = await arkClient.getTaskDetail(task.taskId);
  }

  const report: Record<string, unknown> = {
    runId,
    cwd: workspaceRoot,
    outputDir,
    model: env.ark.videoModel,
    arkTaskId: task.taskId,
    prompt,
    referenceAssets: {
      sceneAssetUri: sceneAsset.assetUri,
      digitalHumanAssetUri: digitalHumanAsset.assetUri,
      audioAssetUri: audioReference.assetUri,
      scenePublicUrl: sceneAsset.publicUrl,
      digitalHumanPublicUrl: digitalHumanAsset.publicUrl,
      audioPublicUrl: audioReference.publicUrl,
      audioReferenceMode: useDirectAudioUrl ? "direct_https_url" : "ark_asset_uri",
    },
    finalStatus: detail.status,
    finalProgress: detail.progress,
    resultUrls: detail.resultUrls,
    errorMessage: detail.errorMessage,
    rawTaskCreate: task.raw,
    rawTaskDetail: detail.raw,
    createdAt: new Date().toISOString(),
  };

  if (detail.status === "success" && detail.resultUrls[0]) {
    console.log(`[${runId}] downloading result video`);
    const downloaded = await downloadFile(detail.resultUrls[0], outputDir, "manual_seedance_office");
    report.localVideoPath = downloaded.filePath;
    report.localVideoSize = downloaded.size;
    console.log(`[${runId}] localVideoPath=${downloaded.filePath}`);
  }

  const reportPath = path.join(outputDir, "report.json");
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`[${runId}] reportPath=${reportPath}`);

  if (detail.status !== "success") {
    process.exitCode = 1;
  }
};

main().catch(async (error) => {
  await fs.mkdir(outputDir, { recursive: true }).catch(() => undefined);
  const failurePath = path.join(outputDir, "failure.json");
  await fs.writeFile(
    failurePath,
    JSON.stringify(
      {
        runId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        createdAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  ).catch(() => undefined);
  console.error(`[${runId}] failed:`, error);
  console.error(`[${runId}] failurePath=${failurePath}`);
  process.exitCode = 1;
});
