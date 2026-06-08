export type TaskStatus = "waiting" | "queued" | "generating" | "success" | "fail" | "canceled";

export type AssetPurpose =
  | "car_exterior"
  | "car_interior"
  | "logo"
  | "batch_package"
  | "delivery_asset";

export type OutputRatio = "auto" | "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

export type Resolution = "1K" | "2K" | "4K";

export type LogoPlacement = "plate" | "wall";

export interface CreateModuleTaskRequest {
  inputAssetId?: string;
  optionId?: string;
  sceneReferenceImageUrl?: string;
  useLogo?: boolean;
  logoPlacements?: LogoPlacement[];
  colorCode?: string;
  outputRatio?: OutputRatio;
  resolution?: Resolution;
  logoAssetId?: string;
  userId?: number | string;
  creditsUserId?: number | string;
  tenantId?: number | string;
  creditsTenantId?: number | string;
  accountScope?: "personal" | "tenant";
  extra?: Record<string, unknown>;
}
