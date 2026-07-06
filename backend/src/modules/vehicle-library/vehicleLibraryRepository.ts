import type { RowDataPacket } from "mysql2";

import { Repository } from "../../db/repository";
import type {
  VehicleIdentifyType,
  VehicleLibraryAuditStatus,
  VehicleLibraryMaterialStatus,
  VehicleLibraryMediaType,
  VehicleLibraryStatus,
  VehicleLotStatus,
  VehicleMaterialStatus,
  VehicleOwnerType,
  VehicleRecognitionStatus,
  VehicleRecognitionType,
  VehicleRecordStatus,
} from "./vehicleLibraryTypes";

type JsonValue = Record<string, unknown> | null;

type CountRow = RowDataPacket & {
  total: number;
};

export type VehicleLibraryRow = RowDataPacket & {
  id: string;
  tenant_id: string | null;
  owner_user_id: string;
  name: string;
  status: VehicleLibraryStatus;
  quota_bytes: number;
  used_bytes: number;
  remark: string | null;
  created_at: Date;
  updated_at: Date;
};

export type VehicleLotRow = RowDataPacket & {
  id: string;
  library_id: string;
  name: string;
  address: string | null;
  remark: string | null;
  material_status: VehicleMaterialStatus;
  status: VehicleLotStatus;
  created_by_user_id: string;
  updated_by_user_id: string | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
  cover_asset_id?: string | null;
  cover_url?: string | null;
  cover_thumbnail_url?: string | null;
};

export type VehicleRow = RowDataPacket & {
  id: string;
  library_id: string;
  lot_id: string | null;
  lot_name?: string | null;
  vin: string | null;
  identify_type: VehicleIdentifyType;
  brand: string;
  series: string;
  model: string | null;
  model_name: string | null;
  model_year: string | null;
  car_type: string | null;
  body_type: string | null;
  energy_type: string | null;
  fuel_grade: string | null;
  displacement: string | null;
  transmission: string | null;
  vehicle_level: string | null;
  emission_standard: string | null;
  color: string | null;
  mileage_km: number | null;
  first_registration_date: Date | string | null;
  guide_price: string | null;
  sale_price: string | null;
  remark: string | null;
  material_status: VehicleMaterialStatus;
  status: VehicleRecordStatus;
  last_generated_at: Date | null;
  created_by_user_id: string;
  updated_by_user_id: string | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
  cover_asset_id?: string | null;
  cover_url?: string | null;
  cover_thumbnail_url?: string | null;
};

export type VehicleLibraryMaterialRow = RowDataPacket & {
  id: string;
  library_id: string;
  owner_type: VehicleOwnerType;
  owner_id: string;
  asset_id: string;
  slot_code: string;
  media_type: VehicleLibraryMediaType;
  file_name: string | null;
  file_size: number | null;
  duration_seconds: string | null;
  width: number | null;
  height: number | null;
  is_required: 0 | 1;
  is_cover: 0 | 1;
  sort_order: number;
  status: VehicleLibraryMaterialStatus;
  audit_status: VehicleLibraryAuditStatus;
  metadata_json: string | JsonValue;
  created_by_user_id: string;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
  asset_url?: string | null;
  asset_thumbnail_url?: string | null;
  asset_mime_type?: string | null;
};

export type VehicleRecognitionRecordRow = RowDataPacket & {
  id: string;
  library_id: string;
  vehicle_id: string | null;
  recognition_type: VehicleRecognitionType;
  input_vin: string | null;
  source_asset_id: string | null;
  recognized_vin: string | null;
  provider_code: string | null;
  confidence: string | null;
  status: VehicleRecognitionStatus;
  result_json: string | JsonValue;
  error_code: string | null;
  error_message: string | null;
  created_by_user_id: string;
  created_at: Date;
};

export interface LibraryScope {
  userId: string;
  tenantId: string | null;
}

export interface PageInput {
  page: number;
  pageSize: number;
}

const parseJson = (value: string | JsonValue) => {
  if (!value) return null;
  if (typeof value === "string") return JSON.parse(value) as Record<string, unknown>;
  return value;
};

export const mapMaterialRow = (row: VehicleLibraryMaterialRow) => ({
  id: row.id,
  libraryId: row.library_id,
  ownerType: row.owner_type,
  ownerId: row.owner_id,
  assetId: row.asset_id,
  slotCode: row.slot_code,
  mediaType: row.media_type,
  fileName: row.file_name,
  fileSize: row.file_size,
  durationSeconds: row.duration_seconds,
  width: row.width,
  height: row.height,
  isRequired: Boolean(row.is_required),
  isCover: Boolean(row.is_cover),
  sortOrder: row.sort_order,
  status: row.status,
  auditStatus: row.audit_status,
  metadata: parseJson(row.metadata_json),
  createdByUserId: row.created_by_user_id,
  assetUrl: row.asset_url ?? null,
  assetThumbnailUrl: row.asset_thumbnail_url ?? null,
  assetMimeType: row.asset_mime_type ?? null,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

const ownerScopeSql = (scope: LibraryScope) => {
  if (scope.tenantId) {
    return "(tenant_id = :tenantId OR owner_user_id = :userId)";
  }
  return "owner_user_id = :userId";
};

export class VehicleLibraryRepository extends Repository {
  async findActiveLibraryForScope(scope: LibraryScope) {
    const scopeClause = scope.tenantId
      ? "tenant_id = :tenantId"
      : "tenant_id IS NULL AND owner_user_id = :userId";
    const rows = await this.query<VehicleLibraryRow[]>(
      `SELECT *
       FROM vehicle_libraries
       WHERE status = 'active'
         AND ${scopeClause}
       ORDER BY created_at ASC
       LIMIT 1`,
      { ...scope },
    );
    return rows[0] ?? null;
  }

  async findLibraryByIdForScope(libraryId: string, scope: LibraryScope) {
    const rows = await this.query<VehicleLibraryRow[]>(
      `SELECT *
       FROM vehicle_libraries
       WHERE id = :libraryId
         AND ${ownerScopeSql(scope)}
       LIMIT 1`,
      { ...scope, libraryId },
    );
    return rows[0] ?? null;
  }

  async createLibrary(input: {
    id: string;
    tenantId: string | null;
    ownerUserId: string;
    name: string;
    quotaBytes?: number;
    remark?: string | null;
  }) {
    await this.execute(
      `INSERT INTO vehicle_libraries
        (id, tenant_id, owner_user_id, name, quota_bytes, remark)
       VALUES
        (:id, :tenantId, :ownerUserId, :name, :quotaBytes, :remark)`,
      {
        ...input,
        quotaBytes: input.quotaBytes ?? 0,
        remark: input.remark ?? null,
      },
    );
    return this.findLibraryByIdForScope(input.id, {
      userId: input.ownerUserId,
      tenantId: input.tenantId,
    });
  }

  async updateLibrary(input: {
    libraryId: string;
    name?: string;
    remark?: string | null;
    status?: VehicleLibraryStatus;
    quotaBytes?: number;
  }) {
    await this.execute(
      `UPDATE vehicle_libraries
       SET name = COALESCE(:name, name),
           remark = :remark,
           status = COALESCE(:status, status),
           quota_bytes = COALESCE(:quotaBytes, quota_bytes)
       WHERE id = :libraryId`,
      {
        libraryId: input.libraryId,
        name: input.name ?? null,
        remark: input.remark ?? null,
        status: input.status ?? null,
        quotaBytes: input.quotaBytes ?? null,
      },
    );
  }

  async getLibraryStats(libraryId: string) {
    const [vehicleRows, completeVehicleRows, lotRows] = await Promise.all([
      this.query<CountRow[]>(
        `SELECT COUNT(*) total
         FROM vehicles
         WHERE library_id = :libraryId
           AND status = 'active'
           AND deleted_at IS NULL`,
        { libraryId },
      ),
      this.query<CountRow[]>(
        `SELECT COUNT(*) total
         FROM vehicles
         WHERE library_id = :libraryId
           AND status = 'active'
           AND material_status = 'complete'
           AND deleted_at IS NULL`,
        { libraryId },
      ),
      this.query<CountRow[]>(
        `SELECT COUNT(*) total
         FROM vehicle_lots
         WHERE library_id = :libraryId
           AND status = 'active'
           AND deleted_at IS NULL`,
        { libraryId },
      ),
    ]);
    return {
      activeVehicles: vehicleRows[0]?.total ?? 0,
      completeVehicles: completeVehicleRows[0]?.total ?? 0,
      activeLots: lotRows[0]?.total ?? 0,
    };
  }

  async listLots(input: PageInput & { libraryId: string; search?: string | null }) {
    const params = {
      libraryId: input.libraryId,
      search: input.search ? `%${input.search}%` : null,
      limit: input.pageSize,
      offset: (input.page - 1) * input.pageSize,
    };
    const searchClause = input.search ? "AND (vl.name LIKE :search OR vl.address LIKE :search)" : "";
    const [items, countRows] = await Promise.all([
      this.query<VehicleLotRow[]>(
        `SELECT vl.*,
                cover.asset_id AS cover_asset_id,
                a.public_url AS cover_url,
                a.thumbnail_url AS cover_thumbnail_url
         FROM vehicle_lots vl
         LEFT JOIN vehicle_library_materials cover
           ON cover.owner_type = 'lot'
          AND cover.owner_id = vl.id
          AND cover.is_cover = 1
          AND cover.status = 'active'
          AND cover.deleted_at IS NULL
         LEFT JOIN assets a ON a.id = cover.asset_id
         WHERE vl.library_id = :libraryId
           AND vl.deleted_at IS NULL
           ${searchClause}
         ORDER BY vl.created_at DESC, vl.id DESC
         LIMIT :limit OFFSET :offset`,
        params,
      ),
      this.query<CountRow[]>(
        `SELECT COUNT(*) total
         FROM vehicle_lots vl
         WHERE vl.library_id = :libraryId
           AND vl.deleted_at IS NULL
           ${searchClause}`,
        params,
      ),
    ]);
    return { items, total: countRows[0]?.total ?? 0 };
  }

  async findLotById(lotId: string, libraryId: string) {
    const rows = await this.query<VehicleLotRow[]>(
      `SELECT *
       FROM vehicle_lots
       WHERE id = :lotId
         AND library_id = :libraryId
         AND deleted_at IS NULL
       LIMIT 1`,
      { lotId, libraryId },
    );
    return rows[0] ?? null;
  }

  async createLot(input: {
    id: string;
    libraryId: string;
    name: string;
    address: string | null;
    remark: string | null;
    createdByUserId: string;
  }) {
    await this.execute(
      `INSERT INTO vehicle_lots
        (id, library_id, name, address, remark, created_by_user_id)
       VALUES
        (:id, :libraryId, :name, :address, :remark, :createdByUserId)`,
      input,
    );
    return this.findLotById(input.id, input.libraryId);
  }

  async updateLot(input: {
    lotId: string;
    libraryId: string;
    name?: string;
    address?: string | null;
    remark?: string | null;
    status?: VehicleLotStatus;
    updatedByUserId: string;
  }) {
    await this.execute(
      `UPDATE vehicle_lots
       SET name = COALESCE(:name, name),
           address = :address,
           remark = :remark,
           status = COALESCE(:status, status),
           updated_by_user_id = :updatedByUserId
       WHERE id = :lotId
         AND library_id = :libraryId
         AND deleted_at IS NULL`,
      {
        lotId: input.lotId,
        libraryId: input.libraryId,
        name: input.name ?? null,
        address: input.address ?? null,
        remark: input.remark ?? null,
        status: input.status ?? null,
        updatedByUserId: input.updatedByUserId,
      },
    );
  }

  async detachVehiclesFromLot(lotId: string, libraryId: string, userId: string) {
    await this.execute(
      `UPDATE vehicles
       SET lot_id = NULL,
           updated_by_user_id = :userId
       WHERE lot_id = :lotId
         AND library_id = :libraryId
         AND deleted_at IS NULL`,
      { lotId, libraryId, userId },
    );
  }

  async archiveLot(lotId: string, libraryId: string, userId: string) {
    await this.execute(
      `UPDATE vehicle_lots
       SET status = 'archived',
           deleted_at = CURRENT_TIMESTAMP(3),
           updated_by_user_id = :userId
       WHERE id = :lotId
         AND library_id = :libraryId
         AND deleted_at IS NULL`,
      { lotId, libraryId, userId },
    );
  }

  async listVehicles(
    input: PageInput & {
      libraryId: string;
      search?: string | null;
      vin?: string | null;
      brand?: string | null;
      modelYear?: string | null;
      model?: string | null;
      status?: string | null;
      materialStatus?: string | null;
      lotId?: string | null;
    },
  ) {
    const params = {
      libraryId: input.libraryId,
      search: input.search ? `%${input.search}%` : null,
      vin: input.vin ? `%${input.vin}%` : null,
      brand: input.brand ? `%${input.brand}%` : null,
      modelYear: input.modelYear ? `%${input.modelYear}%` : null,
      model: input.model ? `%${input.model}%` : null,
      status: input.status ?? null,
      materialStatus: input.materialStatus ?? null,
      lotId: input.lotId ?? null,
      limit: input.pageSize,
      offset: (input.page - 1) * input.pageSize,
    };
    const clauses = [
      "v.library_id = :libraryId",
      "v.deleted_at IS NULL",
      input.search
        ? "(v.brand LIKE :search OR v.series LIKE :search OR v.model LIKE :search OR v.model_name LIKE :search OR v.vin LIKE :search OR v.remark LIKE :search)"
        : "",
      input.vin ? "v.vin LIKE :vin" : "",
      input.brand ? "v.brand LIKE :brand" : "",
      input.modelYear ? "v.model_year LIKE :modelYear" : "",
      input.model ? "(v.model LIKE :model OR v.model_name LIKE :model)" : "",
      input.status ? "v.status = :status" : "",
      input.materialStatus ? "v.material_status = :materialStatus" : "",
      input.lotId ? "v.lot_id = :lotId" : "",
    ].filter(Boolean);
    const where = clauses.join(" AND ");
    const selectSql = `SELECT v.*,
                              vl.name AS lot_name,
                              cover.asset_id AS cover_asset_id,
                              a.public_url AS cover_url,
                              a.thumbnail_url AS cover_thumbnail_url
                       FROM vehicles v
                       LEFT JOIN vehicle_lots vl ON vl.id = v.lot_id
                       LEFT JOIN vehicle_library_materials cover
                         ON cover.owner_type = 'vehicle'
                        AND cover.owner_id = v.id
                        AND cover.is_cover = 1
                        AND cover.status = 'active'
                        AND cover.deleted_at IS NULL
                       LEFT JOIN assets a ON a.id = cover.asset_id
                       WHERE ${where}
                       ORDER BY v.created_at DESC, v.id DESC
                       LIMIT :limit OFFSET :offset`;
    const countSql = `SELECT COUNT(*) total FROM vehicles v WHERE ${where}`;
    const [items, countRows] = await Promise.all([
      this.query<VehicleRow[]>(selectSql, params),
      this.query<CountRow[]>(countSql, params),
    ]);
    return { items, total: countRows[0]?.total ?? 0 };
  }

  async findVehicleById(vehicleId: string, libraryId: string) {
    const rows = await this.query<VehicleRow[]>(
      `SELECT v.*, vl.name AS lot_name
       FROM vehicles v
       LEFT JOIN vehicle_lots vl ON vl.id = v.lot_id
       WHERE v.id = :vehicleId
         AND v.library_id = :libraryId
         AND v.deleted_at IS NULL
       LIMIT 1`,
      { vehicleId, libraryId },
    );
    return rows[0] ?? null;
  }

  async findVehicleByVin(input: { libraryId: string; vin: string; excludeVehicleId?: string }) {
    const rows = await this.query<VehicleRow[]>(
      `SELECT *
       FROM vehicles
       WHERE library_id = :libraryId
         AND vin = :vin
         AND deleted_at IS NULL
         AND (:excludeVehicleId IS NULL OR id <> :excludeVehicleId)
       LIMIT 1`,
      {
        libraryId: input.libraryId,
        vin: input.vin,
        excludeVehicleId: input.excludeVehicleId ?? null,
      },
    );
    return rows[0] ?? null;
  }

  async createVehicle(input: Record<string, unknown>) {
    await this.execute(
      `INSERT INTO vehicles
        (id, library_id, lot_id, vin, identify_type, brand, series, model, model_name, model_year,
         car_type, body_type, energy_type, fuel_grade, displacement, transmission, vehicle_level, emission_standard,
         color, mileage_km, first_registration_date,
         guide_price, sale_price, remark, created_by_user_id)
       VALUES
        (:id, :libraryId, :lotId, :vin, :identifyType, :brand, :series, :model, :modelName, :modelYear,
         :carType, :bodyType, :energyType, :fuelGrade, :displacement, :transmission, :vehicleLevel, :emissionStandard,
         :color, :mileageKm, :firstRegistrationDate,
         :guidePrice, :salePrice, :remark, :createdByUserId)`,
      input,
    );
    return this.findVehicleById(String(input.id), String(input.libraryId));
  }

  async updateVehicle(input: Record<string, unknown>) {
    await this.execute(
      `UPDATE vehicles
       SET lot_id = :lotId,
           vin = :vin,
           identify_type = :identifyType,
           brand = :brand,
           series = :series,
           model = :model,
           model_name = :modelName,
           model_year = :modelYear,
           car_type = :carType,
           body_type = :bodyType,
           energy_type = :energyType,
           fuel_grade = :fuelGrade,
           displacement = :displacement,
           transmission = :transmission,
           vehicle_level = :vehicleLevel,
           emission_standard = :emissionStandard,
           color = :color,
           mileage_km = :mileageKm,
           first_registration_date = :firstRegistrationDate,
           guide_price = :guidePrice,
           sale_price = :salePrice,
           remark = :remark,
           status = :status,
           updated_by_user_id = :updatedByUserId
       WHERE id = :vehicleId
         AND library_id = :libraryId
         AND deleted_at IS NULL`,
      input,
    );
  }

  async archiveVehicle(vehicleId: string, libraryId: string, userId: string) {
    // vin participates in uk_vehicles_library_vin, which also covers
    // soft-deleted rows; clear it so the VIN can be registered again.
    await this.execute(
      `UPDATE vehicles
       SET status = 'archived',
           deleted_at = CURRENT_TIMESTAMP(3),
           updated_by_user_id = :userId,
           vin = NULL
       WHERE id = :vehicleId
         AND library_id = :libraryId
         AND deleted_at IS NULL`,
      { vehicleId, libraryId, userId },
    );
  }

  async listMaterialsForOwners(ownerType: VehicleOwnerType, ownerIds: string[], libraryId: string) {
    if (!ownerIds.length) return [];
    const params: Record<string, unknown> = { ownerType, libraryId };
    const placeholders = ownerIds.map((ownerId, index) => {
      const key = `owner${index}`;
      params[key] = ownerId;
      return `:${key}`;
    });
    const rows = await this.query<VehicleLibraryMaterialRow[]>(
      `SELECT vlm.*,
              a.public_url AS asset_url,
              a.thumbnail_url AS asset_thumbnail_url,
              a.mime_type AS asset_mime_type
       FROM vehicle_library_materials vlm
       LEFT JOIN assets a ON a.id = vlm.asset_id
       WHERE vlm.owner_type = :ownerType
         AND vlm.owner_id IN (${placeholders.join(", ")})
         AND vlm.library_id = :libraryId
         AND vlm.deleted_at IS NULL
         AND vlm.status <> 'deleted'
       ORDER BY vlm.sort_order ASC, vlm.created_at ASC`,
      params,
    );
    return rows.map(mapMaterialRow);
  }

  async listMaterials(ownerType: VehicleOwnerType, ownerId: string, libraryId: string) {
    const rows = await this.query<VehicleLibraryMaterialRow[]>(
      `SELECT vlm.*,
              a.public_url AS asset_url,
              a.thumbnail_url AS asset_thumbnail_url,
              a.mime_type AS asset_mime_type
       FROM vehicle_library_materials vlm
       LEFT JOIN assets a ON a.id = vlm.asset_id
       WHERE vlm.owner_type = :ownerType
         AND vlm.owner_id = :ownerId
         AND vlm.library_id = :libraryId
         AND vlm.deleted_at IS NULL
         AND vlm.status <> 'deleted'
       ORDER BY vlm.sort_order ASC, vlm.created_at ASC`,
      { ownerType, ownerId, libraryId },
    );
    return rows.map(mapMaterialRow);
  }

  async upsertMaterial(input: {
    id: string;
    libraryId: string;
    ownerType: VehicleOwnerType;
    ownerId: string;
    assetId: string;
    slotCode: string;
    mediaType: VehicleLibraryMediaType;
    fileName: string | null;
    fileSize: number | null;
    durationSeconds: number | null;
    width: number | null;
    height: number | null;
    isRequired: boolean;
    isCover: boolean;
    sortOrder: number;
    metadataJson: string | null;
    createdByUserId: string;
  }) {
    await this.execute(
      `INSERT INTO vehicle_library_materials
        (id, library_id, owner_type, owner_id, asset_id, slot_code, media_type, file_name, file_size,
         duration_seconds, width, height, is_required, is_cover, sort_order, status, audit_status,
         metadata_json, created_by_user_id, deleted_at)
       VALUES
        (:id, :libraryId, :ownerType, :ownerId, :assetId, :slotCode, :mediaType, :fileName, :fileSize,
         :durationSeconds, :width, :height, :isRequired, :isCover, :sortOrder, 'active', 'pending',
         :metadataJson, :createdByUserId, NULL)
       ON DUPLICATE KEY UPDATE
         library_id = VALUES(library_id),
         asset_id = VALUES(asset_id),
         media_type = VALUES(media_type),
         file_name = VALUES(file_name),
         file_size = VALUES(file_size),
         duration_seconds = VALUES(duration_seconds),
         width = VALUES(width),
         height = VALUES(height),
         is_required = VALUES(is_required),
         is_cover = VALUES(is_cover),
         sort_order = VALUES(sort_order),
         status = 'active',
         audit_status = 'pending',
         metadata_json = VALUES(metadata_json),
         created_by_user_id = VALUES(created_by_user_id),
         deleted_at = NULL`,
      {
        ...input,
        isRequired: input.isRequired ? 1 : 0,
        isCover: input.isCover ? 1 : 0,
      },
    );
  }

  async deleteMaterialSlot(input: {
    libraryId: string;
    ownerType: VehicleOwnerType;
    ownerId: string;
    slotCode: string;
  }) {
    await this.execute(
      `UPDATE vehicle_library_materials
       SET status = 'deleted',
           deleted_at = CURRENT_TIMESTAMP(3)
       WHERE library_id = :libraryId
         AND owner_type = :ownerType
         AND owner_id = :ownerId
         AND slot_code = :slotCode
         AND deleted_at IS NULL`,
      input,
    );
  }

  async countActiveRequiredSlots(input: {
    libraryId: string;
    ownerType: VehicleOwnerType;
    ownerId: string;
    requiredSlots: string[];
  }) {
    if (!input.requiredSlots.length) return 0;
    const params: Record<string, unknown> = {
      libraryId: input.libraryId,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
    };
    const placeholders = input.requiredSlots.map((slot, index) => {
      const key = `slot${index}`;
      params[key] = slot;
      return `:${key}`;
    });
    const rows = await this.query<CountRow[]>(
      `SELECT COUNT(DISTINCT slot_code) total
       FROM vehicle_library_materials
       WHERE library_id = :libraryId
         AND owner_type = :ownerType
         AND owner_id = :ownerId
         AND slot_code IN (${placeholders.join(", ")})
         AND status = 'active'
         AND audit_status <> 'rejected'
         AND deleted_at IS NULL`,
      params,
    );
    return rows[0]?.total ?? 0;
  }

  async updateOwnerMaterialStatus(input: {
    ownerType: VehicleOwnerType;
    ownerId: string;
    libraryId: string;
    materialStatus: VehicleMaterialStatus;
  }) {
    const table = input.ownerType === "vehicle" ? "vehicles" : "vehicle_lots";
    await this.execute(
      `UPDATE ${table}
       SET material_status = :materialStatus
       WHERE id = :ownerId
         AND library_id = :libraryId
         AND deleted_at IS NULL`,
      input,
    );
  }

  async recalculateLibraryUsedBytes(libraryId: string) {
    await this.execute(
      `UPDATE vehicle_libraries vl
       SET used_bytes = COALESCE((
         SELECT SUM(file_size)
         FROM vehicle_library_materials vlm
         WHERE vlm.library_id = vl.id
           AND vlm.status = 'active'
           AND vlm.deleted_at IS NULL
       ), 0)
       WHERE vl.id = :libraryId`,
      { libraryId },
    );
  }

  async createRecognitionRecord(input: {
    id: string;
    libraryId: string;
    vehicleId: string | null;
    recognitionType: VehicleRecognitionType;
    inputVin: string | null;
    sourceAssetId: string | null;
    recognizedVin: string | null;
    providerCode: string | null;
    confidence: number | null;
    status: VehicleRecognitionStatus;
    resultJson: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    createdByUserId: string;
  }) {
    await this.execute(
      `INSERT INTO vehicle_recognition_records
        (id, library_id, vehicle_id, recognition_type, input_vin, source_asset_id, recognized_vin,
         provider_code, confidence, status, result_json, error_code, error_message, created_by_user_id)
       VALUES
        (:id, :libraryId, :vehicleId, :recognitionType, :inputVin, :sourceAssetId, :recognizedVin,
         :providerCode, :confidence, :status, :resultJson, :errorCode, :errorMessage, :createdByUserId)`,
      input,
    );
    return this.findRecognitionRecordById(input.id, input.libraryId);
  }

  async findRecognitionRecordById(id: string, libraryId: string) {
    const rows = await this.query<VehicleRecognitionRecordRow[]>(
      `SELECT *
       FROM vehicle_recognition_records
       WHERE id = :id
         AND library_id = :libraryId
       LIMIT 1`,
      { id, libraryId },
    );
    return rows[0] ?? null;
  }

  async listRecognitionRecords(
    input: PageInput & { libraryId: string; vehicleId?: string | null },
  ) {
    const params = {
      libraryId: input.libraryId,
      vehicleId: input.vehicleId ?? null,
      limit: input.pageSize,
      offset: (input.page - 1) * input.pageSize,
    };
    const vehicleClause = input.vehicleId ? "AND vehicle_id = :vehicleId" : "";
    const [items, countRows] = await Promise.all([
      this.query<VehicleRecognitionRecordRow[]>(
        `SELECT *
         FROM vehicle_recognition_records
         WHERE library_id = :libraryId
           ${vehicleClause}
         ORDER BY created_at DESC, id DESC
         LIMIT :limit OFFSET :offset`,
        params,
      ),
      this.query<CountRow[]>(
        `SELECT COUNT(*) total
         FROM vehicle_recognition_records
         WHERE library_id = :libraryId
           ${vehicleClause}`,
        params,
      ),
    ]);
    return { items, total: countRows[0]?.total ?? 0 };
  }
}

export const vehicleLibraryRepository = new VehicleLibraryRepository();
