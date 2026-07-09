declare module "ffmpeg-static" {
  const ffmpegPath: string | null;
  export = ffmpegPath;
}

declare module "ffprobe-static" {
  export const path: string;
}
