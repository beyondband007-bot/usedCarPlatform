import type { RowDataPacket } from "mysql2";

import { Repository } from "../../db/repository";
import type { AssetPurpose } from "../../shared/types";

export interface AssetRecord {
  id: string;
  purpose: AssetPurpose;
  fileName: string;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  localPath: string;
  publicUrl: string;
  thumbnailUrl?: string | null;
  createdAt: Date;
}

interface AssetRow extends RowDataPacket {
  id: string;
  purpose: AssetPurpose;
  file_name: string;
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  local_path: string;
  public_url: string;
  thumbnail_url: string | null;
  created_at: Date;
}

const mapRow = (row: AssetRow): AssetRecord => ({
  id: row.id,
  purpose: row.purpose,
  fileName: row.file_name,
  mimeType: row.mime_type,
  size: row.size,
  width: row.width,
  height: row.height,
  localPath: row.local_path,
  publicUrl: row.public_url,
  thumbnailUrl: row.thumbnail_url,
  createdAt: row.created_at,
});

export class AssetsRepository extends Repository {
  async create(asset: AssetRecord) {
    await this.execute(
      `INSERT INTO assets
        (id, purpose, file_name, mime_type, size, width, height, local_path, public_url, thumbnail_url)
       VALUES
        (:id, :purpose, :fileName, :mimeType, :size, :width, :height, :localPath, :publicUrl, :thumbnailUrl)`,
      asset as unknown as Record<string, unknown>,
    );
    return asset;
  }

  async findById(id: string) {
    const rows = await this.query<AssetRow[]>(
      `SELECT * FROM assets WHERE id = :id LIMIT 1`,
      { id },
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async listWithoutThumbnail(limit: number) {
    const rows = await this.query<AssetRow[]>(
      `SELECT * FROM assets
       WHERE thumbnail_url IS NULL
         AND purpose IN ('car_exterior', 'car_interior')
       ORDER BY created_at DESC
       LIMIT :limit`,
      { limit },
    );
    return rows.map(mapRow);
  }

  async updateThumbnail(id: string, thumbnailUrl: string) {
    await this.execute(
      `UPDATE assets SET thumbnail_url = :thumbnailUrl WHERE id = :id`,
      { id, thumbnailUrl },
    );
  }
}

export const assetsRepository = new AssetsRepository();
