import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { env } from "../../config/env";
import {
  arkOpenApiClient,
  type ArkVirtualAsset,
  type ArkVirtualAssetType,
} from "../../providers/ark/arkOpenApiClient";
import { kieClient } from "../../providers/kie/kieClient";
import { kieKeyPool } from "../../providers/kie/kieKeyPool";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import {
  arkVirtualAssetRepository,
  type ArkVirtualAssetRecord,
  type ArkVirtualAssetStatus,
} from "./arkVirtualAssetRepository";

const FEATURE = "video-generation";
const publicArkAssetDir = path.join(env.resultsDir, "video-generation", "ark-assets");
const optimizedArkAssetDir = path.join(env.resultsDir, "video-generation", "ark-upload-optimized");
const IMAGE_UPLOAD_MAX_EDGE = 1200;
const IMAGE_UPLOAD_QUALITY = 72;
const KIE_PUBLIC_UPLOAD_ATTEMPTS = 3;
const PUBLIC_SOURCE_READY_ATTEMPTS = 8;
const ARK_CREATE_ASSET_ATTEMPTS = 5;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeProviderStatus = (status: string | undefined): ArkVirtualAssetStatus => {
  const value = String(status ?? "").toLowerCase();
  if (["active", "success", "succeeded", "ready"].includes(value)) return "active";
  if (["failed", "fail", "error", "rejected"].includes(value)) return "failed";
  return "processing";
};

const extensionToMimeType = (filePath: string, assetType: ArkVirtualAssetType) => {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  if (extension === ".mp3") return "audio/mpeg";
  if (extension === ".wav") return "audio/wav";
  if (extension === ".m4a") return "audio/mp4";
  if (extension === ".mp4") return "video/mp4";
  return assetType === "Audio" ? "audio/mpeg" : assetType === "Video" ? "video/mp4" : "image/png";
};

const hashLocalFile = async (filePath: string) => {
  const bytes = await fs.readFile(filePath);
  return {
    hash: crypto.createHash("sha256").update(bytes).digest("hex"),
    sizeBytes: bytes.length,
  };
};

const ensurePublicCopy = async (filePath: string, sourceHash: string) => {
  await fs.mkdir(publicArkAssetDir, { recursive: true });
  const extension = path.extname(filePath) || ".bin";
  const fileName = `${sourceHash}${extension}`;
  const outputPath = path.join(publicArkAssetDir, fileName);
  try {
    await fs.access(outputPath);
  } catch {
    await fs.copyFile(filePath, outputPath);
  }
  return {
    localPath: outputPath,
    publicUrl: `${env.publicBaseUrl.replace(/\/$/, "")}/results/video-generation/ark-assets/${fileName}`,
  };
};

const isProviderReachableUrl = (url: string) => /^https:\/\//i.test(url) && !/localhost|127\.0\.0\.1/i.test(url);

const normalizePublicOrigin = (url: string) => {
  try {
    return new URL(url).origin.replace(/\/$/, "").toLowerCase();
  } catch {
    return "";
  }
};

/** Ark 需从公网拉取素材；平台自建 publicBaseUrl 对后端可达，但对 Ark 侧常不稳定。 */
const isSelfHostedPublicUrl = (url: string) => {
  const origin = normalizePublicOrigin(url);
  const platformOrigin = normalizePublicOrigin(env.publicBaseUrl);
  return Boolean(origin && platformOrigin && origin === platformOrigin);
};

const prepareUploadSource = async (
  filePath: string,
  assetType: ArkVirtualAssetType,
  sourceHash: string,
) => {
  if (assetType !== "Image") {
    return {
      filePath,
      fileName: path.basename(filePath),
      mimeType: extensionToMimeType(filePath, assetType),
    };
  }

  await fs.mkdir(optimizedArkAssetDir, { recursive: true });
  const outputPath = path.join(optimizedArkAssetDir, `${sourceHash}.webp`);
  try {
    await fs.access(outputPath);
  } catch {
    await sharp(filePath)
      .rotate()
      .resize(IMAGE_UPLOAD_MAX_EDGE, IMAGE_UPLOAD_MAX_EDGE, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: IMAGE_UPLOAD_QUALITY })
      .toFile(outputPath);
  }
  return {
    filePath: outputPath,
    fileName: `${path.basename(filePath, path.extname(filePath))}.webp`,
    mimeType: "image/webp",
  };
};

const uploadPublicSource = async (filePath: string, assetType: ArkVirtualAssetType) => {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= KIE_PUBLIC_UPLOAD_ATTEMPTS; attempt += 1) {
    const lease = await kieKeyPool.acquire();
    try {
      const uploaded = await kieClient.uploadLocalFileWithLease(
        lease,
        filePath,
        `used-car-platform/video-generation/ark-virtual-source/${assetType.toLowerCase()}`,
      );
      return uploaded.fileUrl;
    } catch (error) {
      lastError = error;
      if (attempt >= KIE_PUBLIC_UPLOAD_ATTEMPTS) break;
      await delay(750 * attempt);
    } finally {
      await kieKeyPool.release(lease.accountHash);
    }
  }
  throw lastError;
};

const waitForPublicSourceReady = async (url: string) => {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= PUBLIC_SOURCE_READY_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Range: "bytes=0-0",
        },
      });
      if (response.ok || response.status === 206) return;
      lastError = new Error(`public source returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < PUBLIC_SOURCE_READY_ATTEMPTS) {
      await delay(800 * attempt);
    }
  }
  throw errors.generationFailed("ark virtual asset public source is not reachable", {
    url,
    message: lastError instanceof Error ? lastError.message : String(lastError ?? "unknown"),
  });
};

const createArkAssetWithRetry = async (input: {
  groupId: string;
  url: string;
  assetType: ArkVirtualAssetType;
  name: string;
}) => {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= ARK_CREATE_ASSET_ATTEMPTS; attempt += 1) {
    if (attempt > 1) {
      await waitForPublicSourceReady(input.url);
    }
    try {
      return await arkOpenApiClient.createAsset(input);
    } catch (error) {
      lastError = error;
      if (attempt < ARK_CREATE_ASSET_ATTEMPTS) {
        await delay(1200 * attempt);
      }
    }
  }
  throw lastError ?? errors.generationFailed("ark virtual asset CreateAsset failed", { url: input.url });
};

class ArkVirtualAssetService {
  async ensureAssetGroup(userId: string) {
    const existing = await arkVirtualAssetRepository.findReadyGroup({
      userId,
      feature: FEATURE,
      name: env.ark.virtualAssetGroupName,
      projectName: env.ark.projectName,
    });
    if (existing) return existing;

    const remoteGroups = await arkOpenApiClient.listAssetGroups();
    const matchedRemote = remoteGroups.find((group) => group.name === env.ark.virtualAssetGroupName);
    const remoteGroup = matchedRemote ?? (await arkOpenApiClient.createAssetGroup(env.ark.virtualAssetGroupName));
    return arkVirtualAssetRepository.upsertGroup({
      id: createId("ark_group"),
      userId,
      feature: FEATURE,
      name: env.ark.virtualAssetGroupName,
      providerGroupId: remoteGroup.providerGroupId,
      projectName: env.ark.projectName,
      status: "ready",
      errorMessage: null,
    });
  }

  async ensureLocalFileAsset(input: {
    userId: string;
    assetType: ArkVirtualAssetType;
    filePath: string;
    publicUrl?: string | null;
    fileName?: string | null;
  }): Promise<ArkVirtualAssetRecord> {
    const { hash, sizeBytes } = await hashLocalFile(input.filePath);
    const reusable = await arkVirtualAssetRepository.findReusableAsset({
      userId: input.userId,
      feature: FEATURE,
      assetType: input.assetType,
      sourceHash: hash,
      projectName: env.ark.projectName,
    });
    if (reusable?.status === "active" && reusable.assetUri) return reusable;
    if (reusable?.status === "processing" && reusable.providerAssetId) {
      return this.pollUntilActive(reusable);
    }

    const group = await this.ensureAssetGroup(input.userId);
    const uploadSource = await prepareUploadSource(input.filePath, input.assetType, hash);
    const preferredPublicUrl = input.publicUrl?.trim() ?? "";
    const canUsePreferredPublicUrl =
      preferredPublicUrl.length > 0 &&
      isProviderReachableUrl(preferredPublicUrl) &&
      !isSelfHostedPublicUrl(preferredPublicUrl);
    const publicMedia = canUsePreferredPublicUrl
      ? { publicUrl: preferredPublicUrl, localPath: input.filePath }
      : {
          ...(await ensurePublicCopy(uploadSource.filePath, hash)),
          publicUrl: await uploadPublicSource(uploadSource.filePath, input.assetType),
        };
    await waitForPublicSourceReady(publicMedia.publicUrl);
    const fileName =
      input.assetType === "Image"
        ? uploadSource.fileName
        : input.fileName?.trim() || path.basename(input.filePath);
    const createdAsset = await createArkAssetWithRetry({
      groupId: group.providerGroupId,
      url: publicMedia.publicUrl,
      assetType: input.assetType,
      name: fileName,
    });
    const normalizedStatus = normalizeProviderStatus(createdAsset.status);
    const record = await arkVirtualAssetRepository.createAsset({
      id: createId("ark_asset"),
      userId: input.userId,
      groupId: group.id,
      feature: FEATURE,
      assetType: input.assetType,
      localUrl: publicMedia.publicUrl,
      publicUrl: publicMedia.publicUrl,
      filePath: publicMedia.localPath,
      fileName,
      mimeType: uploadSource.mimeType,
      sizeBytes,
      sourceHash: hash,
      providerAssetId: createdAsset.providerAssetId,
      assetUri: createdAsset.assetUri,
      projectName: env.ark.projectName,
      status: normalizedStatus,
      errorMessage: createdAsset.errorMessage ?? null,
      rawJson: createdAsset.raw,
    });
    if (record.status === "active" && record.assetUri) return record;
    if (record.status === "failed") {
      throw errors.generationFailed("ark virtual asset creation failed", {
        fileName,
        errorMessage: record.errorMessage,
      });
    }
    return this.pollUntilActive(record);
  }

  private async pollUntilActive(record: ArkVirtualAssetRecord): Promise<ArkVirtualAssetRecord> {
    if (!record.providerAssetId) {
      throw errors.generationFailed("ark virtual asset missing provider asset id", { assetId: record.id });
    }

    let latest: ArkVirtualAsset | null = null;
    for (let attempt = 0; attempt < env.ark.virtualAssetPollAttempts; attempt += 1) {
      if (attempt > 0) {
        await delay(env.ark.virtualAssetPollIntervalMs);
      }
      latest = await arkOpenApiClient.getAsset(record.providerAssetId);
      const status = normalizeProviderStatus(latest.status);
      await arkVirtualAssetRepository.updateAssetStatus({
        id: record.id,
        providerAssetId: latest.providerAssetId,
        assetUri: latest.assetUri,
        status,
        errorMessage: latest.errorMessage ?? null,
        rawJson: latest.raw,
      });
      if (status === "active") {
        return {
          ...record,
          providerAssetId: latest.providerAssetId,
          assetUri: latest.assetUri,
          status,
          errorMessage: latest.errorMessage ?? null,
          rawJson: latest.raw,
        };
      }
      if (status === "failed") {
        throw errors.generationFailed("ark virtual asset processing failed", {
          assetId: record.id,
          providerAssetId: latest.providerAssetId,
          errorMessage: latest.errorMessage,
        });
      }
    }

    throw errors.generationFailed("ark virtual asset processing timed out", {
      assetId: record.id,
      providerAssetId: record.providerAssetId,
      lastStatus: latest?.status,
    });
  }
}

export const arkVirtualAssetService = new ArkVirtualAssetService();
