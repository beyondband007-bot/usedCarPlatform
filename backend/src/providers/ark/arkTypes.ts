export type ArkReferenceContent =
  | {
      type: "image_url";
      role: "reference_image";
      image_url: {
        url: string;
      };
    }
  | {
      type: "video_url";
      role: "reference_video";
      video_url: {
        url: string;
      };
    }
  | {
      type: "audio_url";
      role: "reference_audio";
      audio_url: {
        url: string;
      };
    };

export interface CreateArkSeedanceTaskInput {
  prompt: string;
  referenceImageUrls?: string[];
  referenceVideoUrls?: string[];
  referenceAudioUrls?: string[];
  ratio: "16:9" | "4:3" | "1:1" | "3:4" | "9:16" | "21:9" | "adaptive";
  resolution?: "480p" | "720p" | "1080p";
  duration: 5 | 10 | 15;
  generateAudio: boolean;
  watermark?: boolean;
}

export interface CreateArkSeedanceTaskResult {
  taskId: string;
  model: string;
  raw: unknown;
}

export interface ArkTaskDetail {
  status: "queued" | "generating" | "success" | "fail";
  progress: number;
  resultUrls: string[];
  errorMessage?: string;
  raw: unknown;
}
