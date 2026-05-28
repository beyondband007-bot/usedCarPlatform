import fs from "node:fs/promises";
import path from "node:path";

import { createId } from "./ids";

const extensionFromContentType = (contentType: string | null) => {
  if (!contentType) return ".jpg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return ".jpg";
  return ".jpg";
};

export const downloadFile = async (url: string, directory: string, prefix: string) => {
  await fs.mkdir(directory, { recursive: true });

  const response = await fetch(url);
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
