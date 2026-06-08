import type { LogoPlacement, OutputRatio, TaskStatus } from "../../shared/types";

export interface BatchVisualConfig {
  enableSceneChange?: boolean;
  sceneOptionId?: string;
  sceneReferenceImageUrl?: string;
  sceneIndex?: number;
  sceneCategory?: string;
  outputRatio?: OutputRatio;
  useRecentLogo?: boolean;
  logoAssetId?: string | null;
  logoPlacements?: LogoPlacement[];
  enableLightConsistency?: boolean;
  lightConsistency?: boolean;
  enablePaintRefresh?: boolean;
  paintRefresh?: boolean;
  colorCode?: string | null;
  enableInteriorClean?: boolean;
  interiorEnhance?: boolean;
  enableInteriorCollage?: boolean;
  interiorCollage?: boolean;
}

export interface BatchCarGroupInput {
  groupTitle?: string;
  title?: string;
  exteriorAssetIds: string[];
  interiorAssetIds?: string[];
}

export interface CreateBatchTaskRequest {
  projectName: string;
  presetId: string;
  carGroups: BatchCarGroupInput[];
  visualConfig: BatchVisualConfig;
  userId?: number | string;
  creditsUserId?: number | string;
  tenantId?: number | string;
  creditsTenantId?: number | string;
  accountScope?: "personal" | "tenant";
}

export interface BatchItemSummary {
  itemId: string;
  groupTitle: string;
  itemKind: BatchItemKind;
  inputAssetId: string;
  sourceAssetIds: string[];
  generationTaskId: string;
  status: TaskStatus;
  progress: number;
  resultCount: number;
  error: { code?: string | null; message?: string | null } | null;
}

export type BatchItemKind =
  | "exterior"
  | "interior"
  | "interior_clean"
  | "interior_collage"
  | "interior_clean_collage";
