import type { RowDataPacket } from "mysql2";

import { Repository } from "../../db/repository";
import type { TaskStatus } from "../../shared/types";

export interface DeliveryAssetRecord {
  id: string;
  sourceTaskId: string;
  title: string;
  url: string;
  thumbnailUrl?: string | null;
  ratio: string;
  width?: number | null;
  height?: number | null;
  localPath?: string | null;
  createdAt: Date;
}

interface DeliveryAssetRow extends RowDataPacket {
  id: string;
  source_task_id: string;
  title: string;
  url: string;
  thumbnail_url: string | null;
  ratio: string;
  width: number | null;
  height: number | null;
  local_path: string | null;
  created_at: Date;
}

interface PackageRow extends RowDataPacket {
  id: string;
  task_id: string | null;
  package_name: string;
  status: TaskStatus;
  progress: number;
  asset_ids_json: string | string[];
  download_url: string | null;
  package_path: string | null;
  expires_at: Date | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

const mapAsset = (row: DeliveryAssetRow): DeliveryAssetRecord => ({
  id: row.id,
  sourceTaskId: row.source_task_id,
  title: row.title,
  url: row.url,
  thumbnailUrl: row.thumbnail_url,
  ratio: row.ratio,
  width: row.width,
  height: row.height,
  localPath: row.local_path,
  createdAt: row.created_at,
});

const parseAssetIds = (value: unknown) => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
};

export class DeliveryRepository extends Repository {
  async upsertAsset(input: {
    id: string;
    sourceTaskId: string;
    title: string;
    url: string;
    thumbnailUrl?: string | null;
    ratio: string;
    width?: number | null;
    height?: number | null;
    localPath?: string | null;
  }) {
    await this.execute(
      `INSERT INTO delivery_assets
        (id, source_task_id, title, url, thumbnail_url, ratio, width, height, local_path)
       VALUES
        (:id, :sourceTaskId, :title, :url, :thumbnailUrl, :ratio, :width, :height, :localPath)
       ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        url = VALUES(url),
        thumbnail_url = VALUES(thumbnail_url),
        ratio = VALUES(ratio),
        width = VALUES(width),
        height = VALUES(height),
        local_path = VALUES(local_path),
        deleted_at = NULL`,
      {
        ...input,
        thumbnailUrl: input.thumbnailUrl ?? null,
        width: input.width ?? null,
        height: input.height ?? null,
        localPath: input.localPath ?? null,
      },
    );
  }

  async listAssets(input: { sourceTaskId: string; ratio?: string; page: number; pageSize: number }) {
    const offset = (input.page - 1) * input.pageSize;
    const ratioWhere = input.ratio ? "AND ratio = :ratio" : "";
    const rows = await this.query<DeliveryAssetRow[]>(
      `SELECT * FROM delivery_assets
       WHERE source_task_id = :sourceTaskId AND deleted_at IS NULL ${ratioWhere}
       ORDER BY created_at ASC
       LIMIT :limit OFFSET :offset`,
      { sourceTaskId: input.sourceTaskId, ratio: input.ratio, limit: input.pageSize, offset },
    );
    const totalRows = await this.query<Array<RowDataPacket & { total: number }>>(
      `SELECT COUNT(*) total FROM delivery_assets
       WHERE source_task_id = :sourceTaskId AND deleted_at IS NULL ${ratioWhere}`,
      { sourceTaskId: input.sourceTaskId, ratio: input.ratio },
    );
    return { items: rows.map(mapAsset), total: Number(totalRows[0]?.total ?? 0) };
  }

  async countAssets(sourceTaskId: string) {
    const rows = await this.query<Array<RowDataPacket & { total: number }>>(
      `SELECT COUNT(*) total FROM delivery_assets WHERE source_task_id = :sourceTaskId AND deleted_at IS NULL`,
      { sourceTaskId },
    );
    return Number(rows[0]?.total ?? 0);
  }

  async softDeleteAssets(assetIds: string[]) {
    if (!assetIds.length) return [];
    const placeholders = assetIds.map((_, index) => `:assetId${index}`).join(", ");
    await this.execute(
      `UPDATE delivery_assets SET deleted_at = CURRENT_TIMESTAMP(3) WHERE id IN (${placeholders})`,
      Object.fromEntries(assetIds.map((assetId, index) => [`assetId${index}`, assetId])),
    );
    return assetIds;
  }

  async findAssetsByIds(assetIds: string[]) {
    if (!assetIds.length) return [];
    const placeholders = assetIds.map((_, index) => `:assetId${index}`).join(", ");
    const rows = await this.query<DeliveryAssetRow[]>(
      `SELECT * FROM delivery_assets
       WHERE id IN (${placeholders}) AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      Object.fromEntries(assetIds.map((assetId, index) => [`assetId${index}`, assetId])),
    );
    return rows.map(mapAsset);
  }

  async createPackage(input: {
    id: string;
    taskId?: string | null;
    packageName: string;
    assetIds: string[];
    downloadUrl?: string | null;
    packagePath?: string | null;
    expiresAt?: Date | null;
  }) {
    await this.execute(
      `INSERT INTO delivery_packages
        (id, task_id, package_name, status, progress, asset_ids_json, download_url, package_path, expires_at)
       VALUES
        (:id, :taskId, :packageName, 'success', 100, :assetIds, :downloadUrl, :packagePath, :expiresAt)`,
      {
        ...input,
        taskId: input.taskId ?? null,
        assetIds: JSON.stringify(input.assetIds),
        downloadUrl: input.downloadUrl ?? null,
        packagePath: input.packagePath ?? null,
        expiresAt: input.expiresAt ?? null,
      },
    );
  }

  async findPackage(id: string) {
    const rows = await this.query<PackageRow[]>(`SELECT * FROM delivery_packages WHERE id = :id LIMIT 1`, { id });
    return rows[0] ? this.mapPackage(rows[0]) : null;
  }

  async listPackages(taskId?: string | null) {
    const where = taskId ? "WHERE task_id = :taskId" : "";
    const rows = await this.query<PackageRow[]>(
      `SELECT * FROM delivery_packages ${where} ORDER BY created_at DESC LIMIT 50`,
      { taskId },
    );
    return rows.map((row) => this.mapPackage(row));
  }

  private mapPackage(row: PackageRow) {
    return {
      packageId: row.id,
      taskId: row.task_id,
      packageName: row.package_name,
      status: row.status,
      progress: row.progress,
      assetIds: parseAssetIds(row.asset_ids_json),
      downloadUrl: row.download_url,
      packagePath: row.package_path,
      expiresAt: row.expires_at?.toISOString() ?? null,
      error: row.error_message ? { message: row.error_message } : null,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }
}

export const deliveryRepository = new DeliveryRepository();
