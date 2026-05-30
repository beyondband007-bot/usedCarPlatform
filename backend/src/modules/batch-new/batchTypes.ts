import type { OutputRatio, TaskStatus } from "../../shared/types";

export interface BatchVisualConfig {
  enableSceneChange?: boolean;
  sceneOptionId?: string;
  sceneIndex?: number;
  sceneCategory?: string;
  outputRatio?: OutputRatio;
  useRecentLogo?: boolean;
  logoAssetId?: string | null;
  enableLightConsistency?: boolean;
  lightConsistency?: boolean;
  enablePaintRefresh?: boolean;
  paintRefresh?: boolean;
  enableInteriorClean?: boolean;
  interiorEnhance?: boolean;
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
}

export interface BatchItemSummary {
  itemId: string;
  groupTitle: string;
  itemKind: "exterior" | "interior";
  inputAssetId: string;
  generationTaskId: string;
  status: TaskStatus;
  progress: number;
  resultCount: number;
  error: { message?: string | null } | null;
}
