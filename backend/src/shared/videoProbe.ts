import { spawn } from "node:child_process";

import { env } from "../config/env";

const resolveFfprobePath = () => {
  const ffmpegPath = env.ffmpegPath;
  if (/ffmpeg(\.exe)?$/i.test(ffmpegPath)) {
    return ffmpegPath.replace(/ffmpeg(\.exe)?$/i, "ffprobe$1");
  }
  return "ffprobe";
};

export const probeVideoDurationSeconds = (filePath: string): Promise<number> =>
  new Promise((resolve, reject) => {
    const child = spawn(
      resolveFfprobePath(),
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        filePath,
      ],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );

    let stdout = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.once("error", (error) => reject(error));
    child.once("close", (code) => {
      const duration = Number(stdout.trim());
      if (code === 0 && Number.isFinite(duration) && duration > 0) {
        resolve(duration);
        return;
      }
      reject(new Error("failed to probe video duration"));
    });
  });
