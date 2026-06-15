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
  model?: string;
  outputFormat?: string;
}

export interface CreateKieTextToImageTaskInput {
  prompt: string;
  aspectRatio: OutputRatio;
  resolution: Resolution;
}

export interface CreateKieImageTaskResult {
  kieTaskId: string;
  accountHash: string;
  model?: string;
  role?: "primary" | "fallback";
  attemptNo?: number;
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
