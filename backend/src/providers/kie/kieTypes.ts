import type { OutputRatio, Resolution } from "../../shared/types";

export interface KieAccountLease {
  apiKey: string;
  accountHash: string;
}

export interface CreateKieImageTaskInput {
  prompt: string;
  inputUrls: string[];
  aspectRatio: OutputRatio;
  resolution: Resolution;
}

export interface CreateKieTextToImageTaskInput {
  prompt: string;
  aspectRatio: OutputRatio;
  resolution: Resolution;
}

export interface CreateKieImageToVideoTaskInput {
  prompt: string;
  imageUrl: string;
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:3" | "3:4";
  resolution: "480p" | "720p" | "1080p";
  duration: 5 | 10;
}

export interface CreateKieImageTaskResult {
  kieTaskId: string;
  accountHash: string;
  raw: unknown;
}

export interface KieUploadedFile {
  fileUrl: string;
  fileId?: string;
  expiresAt?: string;
  raw: unknown;
}

export interface KieTaskDetail {
  status: "queued" | "generating" | "success" | "fail";
  progress: number;
  resultUrls: string[];
  errorMessage?: string;
  raw: unknown;
}
