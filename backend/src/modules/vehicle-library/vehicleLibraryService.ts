import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import { assetsRepository } from "../assets/assetsRepository";
import type { CurrentUserSession } from "../auth/authMiddleware";
import type { AuthenticatedUser } from "../auth/authTypes";
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
  type VehicleLibraryStatus,
  type VehicleLotStatus,
  type VehicleMaterialStatus,
  type VehicleOwnerType,
  type VehicleRecognitionStatus,
  type VehicleRecordStatus,
} from "./vehicleLibraryTypes";

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
  const vin = normalizeVin(body.vin ?? existing?.vin ?? null);
  assertValidVin(vin);
  const identifyType = assertValue(
    parseOptionalString(body.identifyType ?? existing?.identify_type) ?? "manual",
    ["manual", "vin_text", "vin_image"] as const,
    "identifyType",
  );
  const status = assertValue(
    parseOptionalString(body.status ?? existing?.status) ?? "active",
    ["active", "sold", "archived"] as const,
    "status",
  );
  return {
    lotId: parseOptionalString(body.lotId ?? existing?.lot_id ?? null),
    vin,
    identifyType,
    brand: parseRequiredString(body.brand ?? existing?.brand, "brand"),
    series: parseRequiredString(body.series ?? existing?.series, "series"),
    model: parseOptionalString(body.model ?? existing?.model ?? null),
    modelName: parseOptionalString(body.modelName ?? existing?.model_name ?? null),
    modelYear: parseOptionalString(body.modelYear ?? existing?.model_year ?? null),
    carType: parseOptionalString(body.carType ?? existing?.car_type ?? null),
    bodyType: parseOptionalString(body.bodyType ?? existing?.body_type ?? null),
    energyType: parseOptionalString(body.energyType ?? existing?.energy_type ?? null),
    fuelGrade: parseOptionalString(body.fuelGrade ?? existing?.fuel_grade ?? null),
    displacement: parseOptionalString(body.displacement ?? existing?.displacement ?? null),
    transmission: parseOptionalString(body.transmission ?? existing?.transmission ?? null),
    vehicleLevel: parseOptionalString(body.vehicleLevel ?? existing?.vehicle_level ?? null),
    emissionStandard: parseOptionalString(
      body.emissionStandard ?? existing?.emission_standard ?? null,
    ),
    color: parseOptionalString(body.color ?? existing?.color ?? null),
    mileageKm: parseOptionalInteger(body.mileageKm ?? existing?.mileage_km ?? null, "mileageKm"),
    firstRegistrationDate: parseOptionalDateString(
      body.firstRegistrationDate ?? toDateOnly(existing?.first_registration_date) ?? null,
      "firstRegistrationDate",
    ),
    guidePrice: parseOptionalNumber(body.guidePrice ?? existing?.guide_price ?? null, "guidePrice"),
    salePrice: parseOptionalNumber(body.salePrice ?? existing?.sale_price ?? null, "salePrice"),
    remark: parseOptionalString(body.remark ?? existing?.remark ?? null),
    status,
  };
};

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

  async ensureDefaultLibrary(current: CurrentUserSession) {
    const scope = getScope(current.user);
    const existing = await vehicleLibraryRepository.findActiveLibraryForScope(scope);
    if (existing) return existing;
    const created = await vehicleLibraryRepository.createLibrary({
      id: createId("vehicle_lib"),
      tenantId: scope.tenantId,
      ownerUserId: current.user.id,
      name: DEFAULT_LIBRARY_NAME,
    });
    if (!created) throw errors.generationFailed("failed to create vehicle library");
    return created;
  }

  async getLibraryForRequest(current: CurrentUserSession, libraryId?: unknown) {
    if (!libraryId) return this.ensureDefaultLibrary(current);
    const library = await vehicleLibraryRepository.findLibraryByIdForScope(
      String(libraryId),
      getScope(current.user),
    );
    if (!library) throw errors.forbidden("vehicle library is not available");
    return library;
  }

  async getHome(current: CurrentUserSession) {
    const library = await this.ensureDefaultLibrary(current);
    await vehicleLibraryRepository.recalculateLibraryUsedBytes(library.id);
    const refreshed = await vehicleLibraryRepository.findLibraryByIdForScope(
      library.id,
      getScope(current.user),
    );
    const stats = await vehicleLibraryRepository.getLibraryStats(library.id);
    const source = refreshed ?? library;
    return {
      library: serializeLibrary(source),
      stats: {
        ...stats,
        usedBytes: Number(source.used_bytes),
        quotaBytes: Number(source.quota_bytes),
      },
    };
  }

  async createLibrary(current: CurrentUserSession, body: Record<string, unknown>) {
    const scope = getScope(current.user);
    const created = await vehicleLibraryRepository.createLibrary({
      id: createId("vehicle_lib"),
      tenantId: scope.tenantId,
      ownerUserId: current.user.id,
      name: parseOptionalString(body.name) ?? DEFAULT_LIBRARY_NAME,
      quotaBytes: parseOptionalInteger(body.quotaBytes, "quotaBytes") ?? 0,
      remark: parseOptionalString(body.remark),
    });
    if (!created) throw errors.generationFailed("failed to create vehicle library");
    return serializeLibrary(created);
  }

  async updateLibrary(current: CurrentUserSession, libraryId: string, body: Record<string, unknown>) {
    const library = await this.getLibraryForRequest(current, libraryId);
    const status = body.status
      ? assertValue(String(body.status), ["active", "frozen", "disabled"] as const, "status")
      : undefined;
    await vehicleLibraryRepository.updateLibrary({
      libraryId: library.id,
      name: parseOptionalString(body.name) ?? library.name,
      remark: body.remark === undefined ? library.remark : parseOptionalString(body.remark),
      status,
      quotaBytes:
        body.quotaBytes === undefined
          ? Number(library.quota_bytes)
          : parseOptionalInteger(body.quotaBytes, "quotaBytes") ?? 0,
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
    const library = await this.getLibraryForRequest(current, body.libraryId);
    const lot = await vehicleLibraryRepository.createLot({
      id: createId("vehicle_lot"),
      libraryId: library.id,
      name: parseRequiredString(body.name, "name"),
      address: parseOptionalString(body.address),
      remark: parseOptionalString(body.remark),
      createdByUserId: current.user.id,
    });
    if (!lot) throw errors.generationFailed("failed to create vehicle lot");
    return serializeLot(lot);
  }

  async getLot(current: CurrentUserSession, lotId: string, query?: Record<string, unknown>) {
    const library = await this.getLibraryForRequest(current, query?.libraryId);
    const lot = await vehicleLibraryRepository.findLotById(lotId, library.id);
    if (!lot) throw errors.invalidParameter("vehicle lot not found", { lotId });
    const materials = await vehicleLibraryRepository.listMaterials("lot", lot.id, library.id);
    return serializeLot(lot, materials);
  }

  async updateLot(current: CurrentUserSession, lotId: string, body: Record<string, unknown>) {
    const library = await this.getLibraryForRequest(current, body.libraryId);
    const existing = await vehicleLibraryRepository.findLotById(lotId, library.id);
    if (!existing) throw errors.invalidParameter("vehicle lot not found", { lotId });
    const status = body.status
      ? assertValue(String(body.status), ["active", "archived"] as const, "status")
      : existing.status;
    await vehicleLibraryRepository.updateLot({
      lotId,
      libraryId: library.id,
      name: parseOptionalString(body.name) ?? existing.name,
      address: body.address === undefined ? existing.address : parseOptionalString(body.address),
      remark: body.remark === undefined ? existing.remark : parseOptionalString(body.remark),
      status,
      updatedByUserId: current.user.id,
    });
    return this.getLot(current, lotId, { libraryId: library.id });
  }

  async deleteLot(current: CurrentUserSession, lotId: string, query?: Record<string, unknown>) {
    const library = await this.getLibraryForRequest(current, query?.libraryId);
    await vehicleLibraryRepository.archiveLot(lotId, library.id, current.user.id);
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
    const library = await this.getLibraryForRequest(current, body.libraryId);
    const payload = parseVehiclePayload(body);
    await this.assertSameLibraryLot(library.id, payload.lotId);
    await this.assertVinAvailable(library.id, payload.vin);
    const vehicle = await vehicleLibraryRepository.createVehicle({
      id: createId("vehicle"),
      libraryId: library.id,
      ...payload,
      createdByUserId: current.user.id,
    });
    if (!vehicle) throw errors.generationFailed("failed to create vehicle");
    return serializeVehicle(vehicle);
  }

  async getVehicle(current: CurrentUserSession, vehicleId: string, query?: Record<string, unknown>) {
    const library = await this.getLibraryForRequest(current, query?.libraryId);
    const vehicle = await vehicleLibraryRepository.findVehicleById(vehicleId, library.id);
    if (!vehicle) throw errors.invalidParameter("vehicle not found", { vehicleId });
    const materials = await vehicleLibraryRepository.listMaterials("vehicle", vehicle.id, library.id);
    return serializeVehicle(vehicle, materials);
  }

  async updateVehicle(current: CurrentUserSession, vehicleId: string, body: Record<string, unknown>) {
    const library = await this.getLibraryForRequest(current, body.libraryId);
    const existing = await vehicleLibraryRepository.findVehicleById(vehicleId, library.id);
    if (!existing) throw errors.invalidParameter("vehicle not found", { vehicleId });
    const payload = parseVehiclePayload(body, existing);
    await this.assertSameLibraryLot(library.id, payload.lotId);
    await this.assertVinAvailable(library.id, payload.vin, vehicleId);
    await vehicleLibraryRepository.updateVehicle({
      vehicleId,
      libraryId: library.id,
      ...payload,
      updatedByUserId: current.user.id,
    });
    return this.getVehicle(current, vehicleId, { libraryId: library.id });
  }

  async deleteVehicle(current: CurrentUserSession, vehicleId: string, query?: Record<string, unknown>) {
    const library = await this.getLibraryForRequest(current, query?.libraryId);
    await vehicleLibraryRepository.archiveVehicle(vehicleId, library.id, current.user.id);
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
    const library = await this.getLibraryForRequest(current, body.libraryId);
    const slot = getMaterialSlotDefinition(ownerType, slotCode);
    await this.assertOwnerExists(ownerType, ownerId, library.id);
    const assetId = parseRequiredString(body.assetId, "assetId");
    const asset = await assetsRepository.findById(assetId, current.user.id);
    if (!asset) throw errors.assetNotFound();
    assertAssetMediaType(asset.mimeType, slot.mediaType);
    const metadata = parseJsonObject(body.metadata);
    await vehicleLibraryRepository.upsertMaterial({
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
    const library = await this.getLibraryForRequest(current, query?.libraryId);
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
    const library = await this.getLibraryForRequest(current, body.libraryId);
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
    const library = await this.getLibraryForRequest(current, body.libraryId);
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
