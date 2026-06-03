import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { env } from "../config/env";

const THUMB_MAX_EDGE = 400;
const THUMB_QUALITY = 60;

export interface GeneratedThumbnail {
  localPath: string;
  publicUrl: string;
}

export async function generateUploadThumbnail(
  sourcePath: string,
): Promise<GeneratedThumbnail | null> {
  try {
    const thumbsDir = path.join(env.uploadDir, "thumbs");
    await fs.mkdir(thumbsDir, { recursive: true });

    const sourceBase = path.basename(sourcePath, path.extname(sourcePath));
    const thumbName = `${sourceBase}_thumb.webp`;
    const thumbPath = path.join(thumbsDir, thumbName);

    await sharp(sourcePath)
      .rotate()
      .resize(THUMB_MAX_EDGE, THUMB_MAX_EDGE, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: THUMB_QUALITY })
      .toFile(thumbPath);

    const publicUrl = `${env.publicBaseUrl.replace(/\/$/, "")}/uploads/thumbs/${thumbName}`;
    return { localPath: thumbPath, publicUrl };
  } catch {
    return null;
  }
}
