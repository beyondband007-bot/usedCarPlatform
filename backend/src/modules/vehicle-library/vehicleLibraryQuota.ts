import { env } from "../../config/env";
import type { SubscriptionPlanCode } from "../auth/authTypes";
import { vehicleMaterialSlots } from "./vehicleLibraryTypes";

const mb = (value: number) => value * 1024 * 1024;
const gb = (value: number) => value * 1024 * 1024 * 1024;

/** 配额估算时使用的单视频上限（与业务约定 50MB 一致） */
const QUOTA_VIDEO_MB = 50;

const quotaImageBytes = mb(env.maxUploadMb);
const quotaVideoBytes = mb(QUOTA_VIDEO_MB);

const sumOwnerQuotaBytes = (ownerType: "vehicle" | "lot") =>
  vehicleMaterialSlots
    .filter((slot) => slot.ownerType === ownerType)
    .reduce(
      (total, slot) => total + (slot.mediaType === "image" ? quotaImageBytes : quotaVideoBytes),
      0,
    );

export type VehicleLibraryQuotaPolicy = "standard" | "legacy";

export type PlanLibraryLimits = {
  planCode: SubscriptionPlanCode;
  vehicleLimit: number;
  lotLimit: number;
  storageBudgetBytes: number;
  enabled: boolean;
};

/** 平台车辆库总磁盘预算（默认 100GB，可通过环境变量上调） */
export const PLATFORM_STORAGE_BUDGET_BYTES = gb(env.platformStorageBudgetGb);

/**
 * 各套餐车辆库配额。
 * 计算原则（单用户素材全满、视频按 50MB 估算）：
 * - 团队档 5 车 + 2 场 ≈ 0.92GB → 给 1GB 预算
 * - 旗舰档 10 车 + 6 场 ≈ 1.97GB → 给 2GB 预算
 * 平台 100GB 按约 80GB 可供车辆库、其余留给生成结果等，可支撑数十个团队档 + 十余个旗舰档并发。
 */
export const PLAN_LIBRARY_LIMITS: Record<
  SubscriptionPlanCode,
  { vehicles: number; lots: number; storageBudgetBytes: number; enabled: boolean }
> = {
  basic: { vehicles: 0, lots: 0, storageBudgetBytes: 0, enabled: false },
  team: { vehicles: 5, lots: 2, storageBudgetBytes: gb(1), enabled: true },
  flagship: { vehicles: 10, lots: 6, storageBudgetBytes: gb(2), enabled: true },
};

export const VEHICLE_LIBRARY_ACCESS_PLANS = ["team", "flagship"] as const satisfies readonly SubscriptionPlanCode[];

/** 单车完整素材槽位按配额估算的存储额度（图 20MB + 视频 50MB） */
export const STORAGE_BYTES_PER_VEHICLE = sumOwnerQuotaBytes("vehicle");

/** 单车场完整素材槽位按配额估算的存储额度 */
export const STORAGE_BYTES_PER_LOT = sumOwnerQuotaBytes("lot");

export const isLegacyQuotaPolicy = (policy: string | null | undefined) => policy === "legacy";

export const canAccessVehicleLibraryByPlan = (planCode: string, quotaPolicy?: string | null) => {
  if (isLegacyQuotaPolicy(quotaPolicy))
    return true;
  return PLAN_LIBRARY_LIMITS[planCode as SubscriptionPlanCode]?.enabled ?? false;
};

export const getPlanLibraryLimits = (planCode: string): PlanLibraryLimits => {
  const config = PLAN_LIBRARY_LIMITS[planCode as SubscriptionPlanCode] ?? PLAN_LIBRARY_LIMITS.basic;
  return {
    planCode: (config.enabled ? planCode : "basic") as SubscriptionPlanCode,
    vehicleLimit: config.vehicles,
    lotLimit: config.lots,
    storageBudgetBytes: config.storageBudgetBytes,
    enabled: config.enabled,
  };
};

export const assertVehicleLibraryPlanAccess = (
  planCode: string,
  quotaPolicy?: string | null,
) => {
  if (canAccessVehicleLibraryByPlan(planCode, quotaPolicy))
    return;
  throw new Error("vehicle library plan not available");
};

export const computeLibraryQuotaBytes = (vehicleLimit: number, lotLimit: number, storageBudgetBytes: number) => {
  const slotBasedBytes = vehicleLimit * STORAGE_BYTES_PER_VEHICLE + lotLimit * STORAGE_BYTES_PER_LOT;
  if (!storageBudgetBytes)
    return slotBasedBytes;
  return Math.min(slotBasedBytes, storageBudgetBytes);
};

export const assertCanCreateVehicle = (
  activeVehicles: number,
  policy: string | null | undefined,
  vehicleLimit: number,
) => {
  if (isLegacyQuotaPolicy(policy))
    return;
  if (activeVehicles >= vehicleLimit) {
    throw new Error("vehicle library vehicle limit reached");
  }
};

export const assertCanCreateLot = (
  activeLots: number,
  policy: string | null | undefined,
  lotLimit: number,
) => {
  if (isLegacyQuotaPolicy(policy))
    return;
  if (activeLots >= lotLimit) {
    throw new Error("vehicle library lot limit reached");
  }
};
