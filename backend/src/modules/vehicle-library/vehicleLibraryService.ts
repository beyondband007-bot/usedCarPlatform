import { createHash } from "node:crypto";

import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import { assetsRepository } from "../assets/assetsRepository";
import type { CurrentUserSession } from "../auth/authMiddleware";
import type { AuthenticatedUser } from "../auth/authTypes";
import { getSubscriptionSnapshotForUser } from "../auth/authService";
import {
  mapMaterialRow,
  vehicleLibraryRepository,
  type LibraryScope,
  type VehicleLibraryMaterialRow,
  type VehicleLibraryRow,
  type VehicleLotRow,
  type VehicleRecognitionRecordRow,
  type VehicleRow,
} from "./vehicleLibraryRepository";
import {
  assertValidVin,
  getMaterialSlotDefinition,
  isImageMimeType,
  isVideoMimeType,
  lotRequiredSlotCodes,
  normalizeVin,
  parseJsonObject,
  parseOptionalDateString,
  parseOptionalInteger,
  parseOptionalNumber,
  parseOptionalString,
  parseRequiredString,
  vehicleRequiredSlotCodes,
  type VehicleIdentifyType,
  type VehicleLotStatus,
  type VehicleMaterialStatus,
  type VehicleOwnerType,
  type VehicleRecognitionStatus,
  type VehicleRecordStatus,
} from "./vehicleLibraryTypes";
import {
  canAccessVehicleLibraryByPlan,
  computeLibraryQuotaBytes,
  getPlanLibraryLimits,
  isLegacyQuotaPolicy,
  type PlanLibraryLimits,
} from "./vehicleLibraryQuota";

const DEFAULT_LIBRARY_NAME = "Vehicle Library";
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const toIso = (value: Date | string | null | undefined) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
};

const toDateOnly = (value: Date | string | null | undefined) => {
  const iso = toIso(value);
  return iso ? iso.slice(0, 10) : null;
};

const getScope = (user: AuthenticatedUser): LibraryScope => ({
  userId: user.id,
  tenantId: user.enterpriseTenantId ?? null,
});

const parsePage = (value: unknown) => {
  const page = Number(value ?? 1);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

const parsePageSize = (value: unknown) => {
  const pageSize = Number(value ?? DEFAULT_PAGE_SIZE);
  if (!Number.isInteger(pageSize) || pageSize <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(pageSize, MAX_PAGE_SIZE);
};

const assertValue = <T extends string>(value: string, allowed: readonly T[], field: string): T => {
  if (!allowed.includes(value as T)) {
    throw errors.invalidParameter(`${field} is invalid`, { field, value });
  }
  return value as T;
};

const serializeLibrary = (row: VehicleLibraryRow) => ({
  id: row.id,
  tenantId: row.tenant_id,
  ownerUserId: row.owner_user_id,
  name: row.name,
  status: row.status,
  quotaPolicy: row.quota_policy,
  quotaBytes: Number(row.quota_bytes),
  usedBytes: Number(row.used_bytes),
  remark: row.remark,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

const serializeLot = (row: VehicleLotRow, materials: ReturnType<typeof mapMaterialRow>[] = []) => ({
  id: row.id,
  libraryId: row.library_id,
  name: row.name,
  address: row.address,
  remark: row.remark,
  materialStatus: row.material_status,
  status: row.status,
  createdByUserId: row.created_by_user_id,
  updatedByUserId: row.updated_by_user_id,
  coverAsset: row.cover_asset_id
    ? {
        assetId: row.cover_asset_id,
        url: row.cover_url ?? null,
        thumbnailUrl: row.cover_thumbnail_url ?? null,
      }
    : null,
  materials,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

const serializeVehicle = (
  row: VehicleRow,
  materials: ReturnType<typeof mapMaterialRow>[] = [],
) => ({
  id: row.id,
  libraryId: row.library_id,
  lotId: row.lot_id,
  lotName: row.lot_name ?? null,
  vin: row.vin,
  identifyType: row.identify_type,
  brand: row.brand,
  series: row.series,
  model: row.model,
  modelName: row.model_name,
  modelYear: row.model_year,
  carType: row.car_type,
  bodyType: row.body_type,
  energyType: row.energy_type,
  fuelGrade: row.fuel_grade,
  displacement: row.displacement,
  transmission: row.transmission,
  vehicleLevel: row.vehicle_level,
  emissionStandard: row.emission_standard,
  color: row.color,
  mileageKm: row.mileage_km,
  firstRegistrationDate: toIso(row.first_registration_date),
  guidePrice: row.guide_price,
  salePrice: row.sale_price,
  remark: row.remark,
  materialStatus: row.material_status,
  status: row.status,
  lastGeneratedAt: toIso(row.last_generated_at),
  createdByUserId: row.created_by_user_id,
  updatedByUserId: row.updated_by_user_id,
  coverAsset: row.cover_asset_id
    ? {
        assetId: row.cover_asset_id,
        url: row.cover_url ?? null,
        thumbnailUrl: row.cover_thumbnail_url ?? null,
      }
    : null,
  materials,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

const serializeRecognition = (row: VehicleRecognitionRecordRow) => ({
  id: row.id,
  libraryId: row.library_id,
  vehicleId: row.vehicle_id,
  recognitionType: row.recognition_type,
  inputVin: row.input_vin,
  sourceAssetId: row.source_asset_id,
  recognizedVin: row.recognized_vin,
  providerCode: row.provider_code,
  confidence: row.confidence,
  status: row.status,
  result: typeof row.result_json === "string" ? JSON.parse(row.result_json) : row.result_json,
  errorCode: row.error_code,
  errorMessage: row.error_message,
  createdByUserId: row.created_by_user_id,
  createdAt: row.created_at.toISOString(),
});

const parseVehiclePayload = (body: Record<string, unknown>, existing?: VehicleRow) => {
  // A key that is present in the body (even with a null value) is an explicit
  // instruction to overwrite; only absent/undefined keys fall back to the
  // existing record. Otherwise fields could never be cleared via PATCH.
  const has = (key: string) => key in body && body[key] !== undefined;
  const pickString = (key: string, fallback: string | null | undefined) =>
    has(key) ? parseOptionalString(body[key]) : fallback ?? null;

  const vin = normalizeVin(has("vin") ? body.vin : existing?.vin ?? null);
  assertValidVin(vin);
  const identifyType = assertValue(
    (has("identifyType") ? parseOptionalString(body.identifyType) : existing?.identify_type) ??
      "manual",
    ["manual", "vin_text", "vin_image"] as const,
    "identifyType",
  );
  const status = assertValue(
    (has("status") ? parseOptionalString(body.status) : existing?.status) ?? "active",
    ["active", "sold", "archived"] as const,
    "status",
  );
  return {
    lotId: pickString("lotId", existing?.lot_id),
    vin,
    identifyType,
    brand: parseRequiredString(has("brand") ? body.brand : existing?.brand, "brand"),
    series: parseRequiredString(has("series") ? body.series : existing?.series, "series"),
    model: pickString("model", existing?.model),
    modelName: pickString("modelName", existing?.model_name),
    modelYear: pickString("modelYear", existing?.model_year),
    carType: pickString("carType", existing?.car_type),
    bodyType: pickString("bodyType", existing?.body_type),
    energyType: pickString("energyType", existing?.energy_type),
    fuelGrade: pickString("fuelGrade", existing?.fuel_grade),
    displacement: pickString("displacement", existing?.displacement),
    transmission: pickString("transmission", existing?.transmission),
    vehicleLevel: pickString("vehicleLevel", existing?.vehicle_level),
    emissionStandard: pickString("emissionStandard", existing?.emission_standard),
    color: pickString("color", existing?.color),
    mileageKm: has("mileageKm")
      ? parseOptionalInteger(body.mileageKm, "mileageKm")
      : existing?.mileage_km ?? null,
    firstRegistrationDate: has("firstRegistrationDate")
      ? parseOptionalDateString(body.firstRegistrationDate, "firstRegistrationDate")
      : toDateOnly(existing?.first_registration_date),
    guidePrice: has("guidePrice")
      ? parseOptionalNumber(body.guidePrice, "guidePrice")
      : existing?.guide_price ?? null,
    salePrice: has("salePrice")
      ? parseOptionalNumber(body.salePrice, "salePrice")
      : existing?.sale_price ?? null,
    remark: pickString("remark", existing?.remark),
    status,
  };
};

// check-then-insert 在并发下仍可能撞 uk_vehicles_library_vin，把数据库重复键错误
// 转成 409，而不是落到兜底的 500。
const isDuplicateEntryError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  (error as { errno?: number }).errno === 1062;

const assertAssetMediaType = (mimeType: string, mediaType: "image" | "video") => {
  if (mediaType === "image" && !isImageMimeType(mimeType)) {
    throw errors.invalidParameter("asset must be an image for this vehicle library slot", {
      mimeType,
    });
  }
  if (mediaType === "video" && !isVideoMimeType(mimeType)) {
    throw errors.invalidParameter("asset must be a video for this vehicle library slot", {
      mimeType,
    });
  }
};

export class VehicleLibraryService {
  async assertOwnerExists(ownerType: VehicleOwnerType, ownerId: string, libraryId: string) {
    if (ownerType === "vehicle") {
      const vehicle = await vehicleLibraryRepository.findVehicleById(ownerId, libraryId);
      if (!vehicle) throw errors.invalidParameter("vehicle not found", { ownerId });
      return;
    }

    const lot = await vehicleLibraryRepository.findLotById(ownerId, libraryId);
    if (!lot) throw errors.invalidParameter("vehicle lot not found", { ownerId });
  }

  assertLibraryWritable(library: VehicleLibraryRow) {
    if (library.status !== "active") {
      throw errors.forbidden("vehicle library is not active", { status: library.status });
    }
  }

  async getWritableLibraryForRequest(current: CurrentUserSession, libraryId?: unknown) {
    const library = await this.getLibraryForRequest(current, libraryId);
    this.assertLibraryWritable(library);
    return library;
  }

  async resolvePlanLibraryLimits(current: CurrentUserSession): Promise<PlanLibraryLimits> {
    const subscription = await getSubscriptionSnapshotForUser(current.user.id);
    return getPlanLibraryLimits(subscription.currentPlan);
  }

  async requireVehicleLibraryPlan(current: CurrentUserSession, quotaPolicy?: string | null) {
    const subscription = await getSubscriptionSnapshotForUser(current.user.id);
    if (!canAccessVehicleLibraryByPlan(subscription.currentPlan, quotaPolicy)) {
      throw errors.forbidden("vehicle library plan not available", {
        planCode: subscription.currentPlan,
      });
    }
    return getPlanLibraryLimits(subscription.currentPlan);
  }

  async syncPlanLibraryQuota(library: VehicleLibraryRow, limits: PlanLibraryLimits) {
    if (isLegacyQuotaPolicy(library.quota_policy))
      return Number(library.quota_bytes);

    const computed = computeLibraryQuotaBytes(
      limits.vehicleLimit,
      limits.lotLimit,
      limits.storageBudgetBytes,
    );
    const quotaBytes = Math.max(computed, Number(library.used_bytes));
    if (quotaBytes !== Number(library.quota_bytes)) {
      await vehicleLibraryRepository.updateLibrary({ libraryId: library.id, quotaBytes });
    }
    return quotaBytes;
  }

  async ensureDefaultLibrary(current: CurrentUserSession) {
    const scope = getScope(current.user);
    const existing = await vehicleLibraryRepository.findDefaultLibraryForScope(scope);
    if (existing) {
      await this.requireVehicleLibraryPlan(current, existing.quota_policy);
      return existing;
    }
    // 用 scope 派生的确定性主键创建默认库：并发首访时两个请求会算出同一个 id，
    // 其中一个 INSERT 命中主键冲突后回退到再次查询，避免为同一用户建出多个默认库。
    const scopeKey = `u:${current.user.id}`;
    const defaultLibraryId = `vehicle_lib_${createHash("sha1").update(scopeKey).digest("hex").slice(0, 40)}`;
    const limits = await this.requireVehicleLibraryPlan(current, "standard");
    try {
      const created = await vehicleLibraryRepository.createLibraryIfScopeEmpty({
        id: defaultLibraryId,
        tenantId: scope.tenantId,
        ownerUserId: current.user.id,
        name: DEFAULT_LIBRARY_NAME,
        quotaPolicy: "standard",
        quotaBytes: computeLibraryQuotaBytes(
          limits.vehicleLimit,
          limits.lotLimit,
          limits.storageBudgetBytes,
        ),
      });
      if (created) return created;
    } catch (error) {
      if (!isDuplicateEntryError(error)) throw error;
    }
    const library = await vehicleLibraryRepository.findDefaultLibraryForScope(scope);
    if (!library) throw errors.generationFailed("failed to create vehicle library");
    return library;
  }

  async getLibraryForRequest(current: CurrentUserSession, libraryId?: unknown) {
    if (!libraryId) return this.ensureDefaultLibrary(current);
    const library = await vehicleLibraryRepository.findLibraryByIdForScope(
      String(libraryId),
      getScope(current.user),
    );
    if (!library) throw errors.forbidden("vehicle library is not available");
    await this.requireVehicleLibraryPlan(current, library.quota_policy);
    return library;
  }

  async getHome(current: CurrentUserSession) {
    let library = await this.ensureDefaultLibrary(current);
    const limits = await this.requireVehicleLibraryPlan(current, library.quota_policy);
    if (!isLegacyQuotaPolicy(library.quota_policy)) {
      await this.syncPlanLibraryQuota(library, limits);
      const refreshed = await vehicleLibraryRepository.findLibraryByIdForScope(
        library.id,
        getScope(current.user),
      );
      if (refreshed)
        library = refreshed;
    }
    const stats = await vehicleLibraryRepository.getLibraryStats(library.id);
    const legacy = isLegacyQuotaPolicy(library.quota_policy);
    return {
      library: serializeLibrary(library),
      stats: {
        ...stats,
        usedBytes: Number(library.used_bytes),
        quotaBytes: legacy
          ? Number(library.quota_bytes)
          : Number(library.quota_bytes) || computeLibraryQuotaBytes(
            limits.vehicleLimit,
            limits.lotLimit,
            limits.storageBudgetBytes,
          ),
        quotaVehicles: legacy ? null : limits.vehicleLimit,
        quotaLots: legacy ? null : limits.lotLimit,
        planCode: legacy ? null : limits.planCode,
      },
    };
  }

  // quotaBytes 与 status 属于平台管控字段，不接受终端用户 API 传入，
  // 否则用户可以自行扩容或解冻被平台冻结的库。
  async createLibrary(current: CurrentUserSession, body: Record<string, unknown>) {
    const scope = getScope(current.user);
    const limits = await this.requireVehicleLibraryPlan(current, "standard");
    const created = await vehicleLibraryRepository.createLibraryIfScopeEmpty({
      id: createId("vehicle_lib"),
      tenantId: scope.tenantId,
      ownerUserId: current.user.id,
      name: parseOptionalString(body.name) ?? DEFAULT_LIBRARY_NAME,
      remark: parseOptionalString(body.remark),
      quotaPolicy: "standard",
      quotaBytes: computeLibraryQuotaBytes(
        limits.vehicleLimit,
        limits.lotLimit,
        limits.storageBudgetBytes,
      ),
    });
    if (!created) {
      throw errors.conflict("vehicle library already exists for this account");
    }
    return serializeLibrary(created);
  }

  async updateLibrary(current: CurrentUserSession, libraryId: string, body: Record<string, unknown>) {
    const library = await this.getWritableLibraryForRequest(current, libraryId);
    await vehicleLibraryRepository.updateLibrary({
      libraryId: library.id,
      name: parseOptionalString(body.name) ?? library.name,
      remark: body.remark === undefined ? library.remark : parseOptionalString(body.remark),
    });
    const updated = await this.getLibraryForRequest(current, library.id);
    return serializeLibrary(updated);
  }

  async listLots(current: CurrentUserSession, query: Record<string, unknown>) {
    const library = await this.getLibraryForRequest(current, query.libraryId);
    const page = parsePage(query.page);
    const pageSize = parsePageSize(query.pageSize);
    const result = await vehicleLibraryRepository.listLots({
      libraryId: library.id,
      page,
      pageSize,
      search: parseOptionalString(query.search),
    });
    return {
      items: result.items.map((row) => serializeLot(row)),
      page,
      pageSize,
      total: result.total,
    };
  }

  async queryVehicles(current: CurrentUserSession, query: Record<string, unknown>) {
    return this.listVehicles(current, query);
  }

  async createLot(current: CurrentUserSession, body: Record<string, unknown>) {
    const library = await this.getWritableLibraryForRequest(current, body.libraryId);
    const limits = await this.requireVehicleLibraryPlan(current, library.quota_policy);
    const result = await vehicleLibraryRepository.createLotWithinLimit({
      id: createId("vehicle_lot"),
      libraryId: library.id,
      name: parseRequiredString(body.name, "name"),
      address: parseOptionalString(body.address),
      remark: parseOptionalString(body.remark),
      createdByUserId: current.user.id,
      lotLimit: isLegacyQuotaPolicy(library.quota_policy) ? null : limits.lotLimit,
    });
    if (!result.lot) {
      throw errors.conflict("vehicle library lot limit reached", {
        limit: limits.lotLimit,
        activeLots: result.activeLots,
        planCode: limits.planCode,
      });
    }
    return serializeLot(result.lot);
  }

  async getLot(current: CurrentUserSession, lotId: string, query?: Record<string, unknown>) {
    const library = await this.getLibraryForRequest(current, query?.libraryId);
    const lot = await vehicleLibraryRepository.findLotById(lotId, library.id);
    if (!lot) throw errors.invalidParameter("vehicle lot not found", { lotId });
    const materials = await vehicleLibraryRepository.listMaterials("lot", lot.id, library.id);
    return serializeLot(lot, materials);
  }

  async updateLot(current: CurrentUserSession, lotId: string, body: Record<string, unknown>) {
    const library = await this.getWritableLibraryForRequest(current, body.libraryId);
    const existing = await vehicleLibraryRepository.findLotById(lotId, library.id);
    if (!existing) throw errors.invalidParameter("vehicle lot not found", { lotId });
    const status = body.status
      ? assertValue(String(body.status), ["active", "archived"] as const, "status")
      : existing.status;
    const updateInput = {
      lotId,
      libraryId: library.id,
      name: parseOptionalString(body.name) ?? existing.name,
      address: body.address === undefined ? existing.address : parseOptionalString(body.address),
      remark: body.remark === undefined ? existing.remark : parseOptionalString(body.remark),
      status,
      updatedByUserId: current.user.id,
    };
    // 从 archived 翻回 active 会重新占用车场名额，必须走和创建相同的限额校验，
    // 否则可通过“归档腾名额 -> 新建 -> 翻回 active”无限突破车场上限。
    const reactivating = existing.status !== "active" && status === "active";
    if (reactivating && !isLegacyQuotaPolicy(library.quota_policy)) {
      const limits = await this.requireVehicleLibraryPlan(current, library.quota_policy);
      const result = await vehicleLibraryRepository.updateLotWithinLimit({
        ...updateInput,
        lotLimit: limits.lotLimit,
      });
      if (!result.updated) {
        throw errors.conflict("vehicle library lot limit reached", {
          limit: limits.lotLimit,
          activeLots: result.activeLots,
          planCode: limits.planCode,
        });
      }
    } else {
      await vehicleLibraryRepository.updateLot(updateInput);
    }
    return this.getLot(current, lotId, { libraryId: library.id });
  }

  async deleteLot(current: CurrentUserSession, lotId: string, query?: Record<string, unknown>) {
    const library = await this.getWritableLibraryForRequest(current, query?.libraryId);
    const lot = await vehicleLibraryRepository.findLotById(lotId, library.id);
    if (!lot) throw errors.invalidParameter("vehicle lot not found", { lotId });
    // 解绑车辆、归档车场、软删素材、重算配额在同一事务内完成，
    // 避免中途失败留下永久占用 used_bytes 的孤儿素材。
    await vehicleLibraryRepository.archiveLotCascade(lotId, library.id, current.user.id);
    return { deleted: true };
  }

  async listVehicles(current: CurrentUserSession, query: Record<string, unknown>) {
    const library = await this.getLibraryForRequest(current, query.libraryId);
    const page = parsePage(query.page);
    const pageSize = parsePageSize(query.pageSize);
    const status = parseOptionalString(query.status);
    const materialStatus = parseOptionalString(query.materialStatus);
    if (status) assertValue(status, ["active", "sold", "archived"] as const, "status");
    if (materialStatus) {
      assertValue(materialStatus, ["incomplete", "complete"] as const, "materialStatus");
    }
    const missingInput = parseOptionalString(query.missing);
    const missing = missingInput
      ? assertValue(missingInput, ["exterior", "driver", "video"] as const, "missing")
      : null;
    const sortInput = parseOptionalString(query.sort);
    const sort = sortInput
      ? assertValue(sortInput, ["updated", "complete"] as const, "sort")
      : null;
    const result = await vehicleLibraryRepository.listVehicles({
      libraryId: library.id,
      page,
      pageSize,
      search: parseOptionalString(query.search),
      vin: parseOptionalString(query.vin),
      brand: parseOptionalString(query.brand),
      modelYear: parseOptionalString(query.modelYear),
      model: parseOptionalString(query.model),
      status,
      materialStatus,
      lotId: parseOptionalString(query.lotId),
      missing,
      sort,
    });
    const materials = await vehicleLibraryRepository.listMaterialsForOwners(
      "vehicle",
      result.items.map((row) => row.id),
      library.id,
    );
    const materialsByVehicleId = new Map<string, ReturnType<typeof mapMaterialRow>[]>();
    for (const material of materials) {
      const list = materialsByVehicleId.get(material.ownerId) ?? [];
      list.push(material);
      materialsByVehicleId.set(material.ownerId, list);
    }
    return {
      items: result.items.map((row) => serializeVehicle(row, materialsByVehicleId.get(row.id) ?? [])),
      page,
      pageSize,
      total: result.total,
    };
  }

  async assertSameLibraryLot(libraryId: string, lotId: string | null) {
    if (!lotId) return;
    const lot = await vehicleLibraryRepository.findLotById(lotId, libraryId);
    if (!lot) throw errors.invalidParameter("lotId does not belong to this vehicle library");
  }

  async assertVinAvailable(libraryId: string, vin: string | null, excludeVehicleId?: string) {
    if (!vin) return;
    const duplicate = await vehicleLibraryRepository.findVehicleByVin({
      libraryId,
      vin,
      excludeVehicleId,
    });
    if (duplicate) throw errors.conflict("VIN already exists in this vehicle library", { vin });
  }

  async createVehicle(current: CurrentUserSession, body: Record<string, unknown>) {
    const library = await this.getWritableLibraryForRequest(current, body.libraryId);
    const limits = await this.requireVehicleLibraryPlan(current, library.quota_policy);
    const payload = parseVehiclePayload(body);
    await this.assertSameLibraryLot(library.id, payload.lotId);
    await this.assertVinAvailable(library.id, payload.vin);
    let result;
    try {
      result = await vehicleLibraryRepository.createVehicleWithinLimit({
        id: createId("vehicle"),
        libraryId: library.id,
        ...payload,
        createdByUserId: current.user.id,
        vehicleLimit: isLegacyQuotaPolicy(library.quota_policy) ? null : limits.vehicleLimit,
      });
    } catch (error) {
      if (isDuplicateEntryError(error)) {
        throw errors.conflict("VIN already exists in this vehicle library", { vin: payload.vin });
      }
      throw error;
    }
    if (!result.vehicle) {
      throw errors.conflict("vehicle library vehicle limit reached", {
        limit: limits.vehicleLimit,
        activeVehicles: result.activeVehicles,
        planCode: limits.planCode,
      });
    }
    return serializeVehicle(result.vehicle);
  }

  async getVehicle(current: CurrentUserSession, vehicleId: string, query?: Record<string, unknown>) {
    const library = await this.getLibraryForRequest(current, query?.libraryId);
    const vehicle = await vehicleLibraryRepository.findVehicleById(vehicleId, library.id);
    if (!vehicle) throw errors.invalidParameter("vehicle not found", { vehicleId });
    const materials = await vehicleLibraryRepository.listMaterials("vehicle", vehicle.id, library.id);
    return serializeVehicle(vehicle, materials);
  }

  async updateVehicle(current: CurrentUserSession, vehicleId: string, body: Record<string, unknown>) {
    const library = await this.getWritableLibraryForRequest(current, body.libraryId);
    const existing = await vehicleLibraryRepository.findVehicleById(vehicleId, library.id);
    if (!existing) throw errors.invalidParameter("vehicle not found", { vehicleId });
    const payload = parseVehiclePayload(body, existing);
    await this.assertSameLibraryLot(library.id, payload.lotId);
    await this.assertVinAvailable(library.id, payload.vin, vehicleId);
    const updateInput = {
      vehicleId,
      libraryId: library.id,
      ...payload,
      updatedByUserId: current.user.id,
    };
    // 从 sold/archived 翻回 active 会重新占用车辆名额，必须走和创建相同的限额校验，
    // 否则可通过“改成 sold 腾名额 -> 新建 -> 翻回 active”无限突破车辆上限。
    const reactivating = existing.status !== "active" && payload.status === "active";
    try {
      if (reactivating && !isLegacyQuotaPolicy(library.quota_policy)) {
        const limits = await this.requireVehicleLibraryPlan(current, library.quota_policy);
        const result = await vehicleLibraryRepository.updateVehicleWithinLimit({
          ...updateInput,
          vehicleLimit: limits.vehicleLimit,
        });
        if (!result.updated) {
          throw errors.conflict("vehicle library vehicle limit reached", {
            limit: limits.vehicleLimit,
            activeVehicles: result.activeVehicles,
            planCode: limits.planCode,
          });
        }
      } else {
        await vehicleLibraryRepository.updateVehicle(updateInput);
      }
    } catch (error) {
      if (isDuplicateEntryError(error)) {
        throw errors.conflict("VIN already exists in this vehicle library", { vin: payload.vin });
      }
      throw error;
    }
    return this.getVehicle(current, vehicleId, { libraryId: library.id });
  }

  async deleteVehicle(current: CurrentUserSession, vehicleId: string, query?: Record<string, unknown>) {
    const library = await this.getWritableLibraryForRequest(current, query?.libraryId);
    // 归档车辆、软删素材、重算配额在同一事务内完成，
    // 避免中途失败留下永久占用 used_bytes 的孤儿素材。
    await vehicleLibraryRepository.archiveVehicleCascade(vehicleId, library.id, current.user.id);
    return { deleted: true };
  }

  async refreshOwnerCompleteness(input: {
    libraryId: string;
    ownerType: VehicleOwnerType;
    ownerId: string;
  }) {
    const requiredSlots = input.ownerType === "vehicle" ? vehicleRequiredSlotCodes : lotRequiredSlotCodes;
    const completeCount = await vehicleLibraryRepository.countActiveRequiredSlots({
      ...input,
      requiredSlots,
    });
    const materialStatus: VehicleMaterialStatus =
      completeCount === requiredSlots.length ? "complete" : "incomplete";
    await vehicleLibraryRepository.updateOwnerMaterialStatus({
      ...input,
      materialStatus,
    });
    await vehicleLibraryRepository.recalculateLibraryUsedBytes(input.libraryId);
    return materialStatus;
  }

  async putMaterial(
    current: CurrentUserSession,
    ownerType: VehicleOwnerType,
    ownerId: string,
    slotCode: string,
    body: Record<string, unknown>,
  ) {
    const library = await this.getWritableLibraryForRequest(current, body.libraryId);
    const slot = getMaterialSlotDefinition(ownerType, slotCode);
    await this.assertOwnerExists(ownerType, ownerId, library.id);
    const assetId = parseRequiredString(body.assetId, "assetId");
    const asset = await assetsRepository.findById(assetId, current.user.id);
    if (!asset) throw errors.assetNotFound();
    assertAssetMediaType(asset.mimeType, slot.mediaType);
    // 上传前同步一次套餐配额：套餐降级后 quota_bytes 只在首页刷新，
    // 直接调上传接口（如小程序采集端）也必须按最新套餐限额校验。
    if (!isLegacyQuotaPolicy(library.quota_policy)) {
      const limits = await this.requireVehicleLibraryPlan(current, library.quota_policy);
      await this.syncPlanLibraryQuota(library, limits);
    }
    const metadata = parseJsonObject(body.metadata);
    // 配额校验、owner 存活校验与写入在同一事务内完成（见仓储层说明）。
    const result = await vehicleLibraryRepository.upsertMaterialWithQuota({
      id: createId("vehicle_mat"),
      libraryId: library.id,
      ownerType,
      ownerId,
      assetId,
      slotCode: slot.code,
      mediaType: slot.mediaType,
      fileName: asset.fileName,
      fileSize: asset.size,
      durationSeconds: null,
      width: asset.width ?? null,
      height: asset.height ?? null,
      isRequired: slot.required,
      isCover: slot.cover,
      sortOrder: slot.sortOrder,
      metadataJson: metadata ? JSON.stringify(metadata) : null,
      createdByUserId: current.user.id,
    });
    if (result.outcome === "owner_missing") {
      throw errors.invalidParameter(
        ownerType === "vehicle" ? "vehicle not found" : "vehicle lot not found",
        { ownerId },
      );
    }
    if (result.outcome === "quota_exceeded") {
      throw errors.conflict("vehicle library storage quota exceeded", {
        quotaBytes: result.quotaBytes,
        usedBytes: result.usedBytes,
        fileSize: asset.size ?? 0,
      });
    }
    await this.refreshOwnerCompleteness({ libraryId: library.id, ownerType, ownerId });
    const rows = await vehicleLibraryRepository.listMaterials(ownerType, ownerId, library.id);
    return { items: rows };
  }

  async deleteMaterial(
    current: CurrentUserSession,
    ownerType: VehicleOwnerType,
    ownerId: string,
    slotCode: string,
    query?: Record<string, unknown>,
  ) {
    const library = await this.getWritableLibraryForRequest(current, query?.libraryId);
    getMaterialSlotDefinition(ownerType, slotCode);
    await this.assertOwnerExists(ownerType, ownerId, library.id);
    await vehicleLibraryRepository.deleteMaterialSlot({
      libraryId: library.id,
      ownerType,
      ownerId,
      slotCode,
    });
    const materialStatus = await this.refreshOwnerCompleteness({
      libraryId: library.id,
      ownerType,
      ownerId,
    });
    return { deleted: true, materialStatus };
  }

  async recognizeVinText(current: CurrentUserSession, body: Record<string, unknown>) {
    const library = await this.getWritableLibraryForRequest(current, body.libraryId);
    const vin = normalizeVin(body.vin ?? body.inputVin);
    assertValidVin(vin);
    if (!vin) throw errors.invalidParameter("vin is required");
    const vehicleId = parseOptionalString(body.vehicleId);
    if (vehicleId) {
      const vehicle = await vehicleLibraryRepository.findVehicleById(vehicleId, library.id);
      if (!vehicle) throw errors.invalidParameter("vehicle not found", { vehicleId });
    }
    const row = await vehicleLibraryRepository.createRecognitionRecord({
      id: createId("vehicle_rec"),
      libraryId: library.id,
      vehicleId,
      recognitionType: "vin_text",
      inputVin: parseOptionalString(body.vin ?? body.inputVin),
      sourceAssetId: null,
      recognizedVin: vin,
      providerCode: "local",
      confidence: 1,
      status: "success",
      resultJson: JSON.stringify({ vin }),
      errorCode: null,
      errorMessage: null,
      createdByUserId: current.user.id,
    });
    if (!row) throw errors.generationFailed("failed to create recognition record");
    return serializeRecognition(row);
  }

  async recognizeVinImage(current: CurrentUserSession, body: Record<string, unknown>) {
    const library = await this.getWritableLibraryForRequest(current, body.libraryId);
    const assetId = parseRequiredString(body.assetId ?? body.sourceAssetId, "assetId");
    const asset = await assetsRepository.findById(assetId, current.user.id);
    if (!asset) throw errors.assetNotFound();
    if (!isImageMimeType(asset.mimeType)) {
      throw errors.invalidParameter("VIN image asset must be an image");
    }
    const vehicleId = parseOptionalString(body.vehicleId);
    if (vehicleId) {
      const vehicle = await vehicleLibraryRepository.findVehicleById(vehicleId, library.id);
      if (!vehicle) throw errors.invalidParameter("vehicle not found", { vehicleId });
    }
    const row = await vehicleLibraryRepository.createRecognitionRecord({
      id: createId("vehicle_rec"),
      libraryId: library.id,
      vehicleId,
      recognitionType: "vin_image",
      inputVin: null,
      sourceAssetId: assetId,
      recognizedVin: null,
      providerCode: null,
      confidence: null,
      status: "pending",
      resultJson: JSON.stringify({ message: "VIN image provider is not integrated yet" }),
      errorCode: null,
      errorMessage: null,
      createdByUserId: current.user.id,
    });
    if (!row) throw errors.generationFailed("failed to create recognition record");
    return serializeRecognition(row);
  }

  async listRecognitionRecords(current: CurrentUserSession, query: Record<string, unknown>) {
    const library = await this.getLibraryForRequest(current, query.libraryId);
    const page = parsePage(query.page);
    const pageSize = parsePageSize(query.pageSize);
    const result = await vehicleLibraryRepository.listRecognitionRecords({
      libraryId: library.id,
      vehicleId: parseOptionalString(query.vehicleId),
      page,
      pageSize,
    });
    return {
      items: result.items.map(serializeRecognition),
      page,
      pageSize,
      total: result.total,
    };
  }
}

export const vehicleLibraryService = new VehicleLibraryService();
