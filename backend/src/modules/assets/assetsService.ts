import path from "node:path";

import { env } from "../../config/env";
import { getImageDimensions } from "../../shared/imageDimensions";
import { createId } from "../../shared/ids";
import type { AssetPurpose } from "../../shared/types";
import { assetsRepository } from "./assetsRepository";

export const allowedPurposes: AssetPurpose[] = [
  "car_exterior",
  "car_interior",
  "logo",
  "batch_package",
  "delivery_asset",
];

export class AssetsService {
  async saveUploadedFile(file: Express.Multer.File, purpose: AssetPurpose) {
    const assetId = createId("asset");
    const relativeUrl = `/uploads/${path.basename(file.path)}`;
    const publicUrl = `${env.publicBaseUrl.replace(/\/$/, "")}${relativeUrl}`;
    const dimensions = await getImageDimensions(file.path).catch(() => null);

    return assetsRepository.create({
      id: assetId,
      purpose,
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
      localPath: file.path,
      publicUrl,
      thumbnailUrl: null,
      createdAt: new Date(),
    });
  }

  toResponse(asset: Awaited<ReturnType<typeof assetsRepository.create>>) {
    return {
      assetId: asset.id,
      purpose: asset.purpose,
      url: asset.publicUrl,
      thumbnailUrl: asset.thumbnailUrl,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      size: asset.size,
      width: asset.width,
      height: asset.height,
      createdAt: asset.createdAt.toISOString(),
    };
  }
}

export const assetsService = new AssetsService();
