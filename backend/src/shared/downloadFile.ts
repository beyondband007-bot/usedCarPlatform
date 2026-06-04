import fs from "node:fs/promises";
import path from "node:path";

import { env } from "../config/env";
import { createId } from "./ids";

const extensionFromContentType = (contentType: string | null) => {
  if (!contentType) return ".jpg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return ".jpg";
  if (contentType.includes("mp4") || contentType.includes("mpeg-4")) return ".mp4";
  if (contentType.includes("quicktime")) return ".mov";
  if (contentType.includes("webm")) return ".webm";
  if (contentType.includes("video")) return ".mp4";
  return ".jpg";
};

export const downloadFile = async (url: string, directory: string, prefix: string) => {
  await fs.mkdir(directory, { recursive: true });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.kie.downloadTimeoutMs);
  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("KIE_RESULT_DOWNLOAD_TIMEOUT");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`download failed: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type");
  const extension = extensionFromContentType(contentType);
  const fileName = `${createId(prefix)}${extension}`;
  const filePath = path.join(directory, fileName);
  const arrayBuffer = await response.arrayBuffer();

  await fs.writeFile(filePath, Buffer.from(arrayBuffer));

  return {
    fileName,
    filePath,
    contentType,
    size: Buffer.byteLength(Buffer.from(arrayBuffer)),
  };
};
