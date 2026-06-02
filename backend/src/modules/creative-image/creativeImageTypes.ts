import type { OutputRatio, Resolution } from "../../shared/types";

export type CreativeGenerationMode = "text_to_image" | "image_to_image" | "revise";

export interface CreateConversationRequest {
  title?: string;
}

export interface CreateGenerationRequest {
  prompt?: string;
  referenceAssetId?: string;
  sourceTaskId?: string;
  sourceImageUrl?: string;
  useLastReference?: boolean;
  outputRatio?: OutputRatio;
  resolution?: Resolution;
  userId?: number | string;
  creditsUserId?: number | string;
  tenantId?: number | string;
  creditsTenantId?: number | string;
  accountScope?: "personal" | "tenant";
}

export interface CreativeConversationRecord {
  id: string;
  userId: string;
  title: string;
  status: string;
  lastMessage?: string | null;
  lastTaskId?: string | null;
  lastResultUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreativeMessageRecord {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  taskId?: string | null;
  referenceAssetId?: string | null;
  sourceTaskId?: string | null;
  sourceImageUrl?: string | null;
  generationMode?: CreativeGenerationMode | null;
  metadataJson?: unknown;
  createdAt: Date;
}

export interface CreativeConversationAssetRecord {
  id: string;
  conversationId: string;
  assetId: string;
  role: string;
  createdAt: Date;
}
