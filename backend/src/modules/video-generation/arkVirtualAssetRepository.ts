import type { RowDataPacket } from "mysql2";

import { Repository } from "../../db/repository";
import type { ArkVirtualAssetType } from "../../providers/ark/arkOpenApiClient";

export type ArkVirtualAssetStatus = "processing" | "active" | "failed";

export interface ArkVirtualAssetGroupRecord {
  id: string;
  userId: string;
  feature: string;
  name: string;
  providerGroupId: string;
  projectName: string;
  status: "ready" | "failed";
  errorMessage?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ArkVirtualAssetRecord {
  id: string;
  userId: string;
  groupId: string;
  feature: string;
  assetType: ArkVirtualAssetType;
  localUrl: string;
  publicUrl: string;
  filePath?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes: number;
  sourceHash?: string | null;
  providerAssetId?: string | null;
  assetUri?: string | null;
  projectName: string;
  status: ArkVirtualAssetStatus;
  errorMessage?: string | null;
  rawJson?: unknown;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ArkVirtualAssetGroupRow extends RowDataPacket {
  id: string;
  user_id: string;
  feature: string;
  name: string;
  provider_group_id: string;
  project_name: string;
  status: "ready" | "failed";
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ArkVirtualAssetRow extends RowDataPacket {
  id: string;
  user_id: string;
  group_id: string;
  feature: string;
  asset_type: ArkVirtualAssetType;
  local_url: string;
  public_url: string;
  file_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number;
  source_hash: string | null;
  provider_asset_id: string | null;
  asset_uri: string | null;
  project_name: string;
  status: ArkVirtualAssetStatus;
  error_message: string | null;
  raw_json: unknown;
  created_at: Date;
  updated_at: Date;
}

const mapGroupRow = (row: ArkVirtualAssetGroupRow): ArkVirtualAssetGroupRecord => ({
  id: row.id,
  userId: row.user_id,
  feature: row.feature,
  name: row.name,
  providerGroupId: row.provider_group_id,
  projectName: row.project_name,
  status: row.status,
  errorMessage: row.error_message,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapAssetRow = (row: ArkVirtualAssetRow): ArkVirtualAssetRecord => ({
  id: row.id,
  userId: row.user_id,
  groupId: row.group_id,
  feature: row.feature,
  assetType: row.asset_type,
  localUrl: row.local_url,
  publicUrl: row.public_url,
  filePath: row.file_path,
  fileName: row.file_name,
  mimeType: row.mime_type,
  sizeBytes: row.size_bytes,
  sourceHash: row.source_hash,
  providerAssetId: row.provider_asset_id,
  assetUri: row.asset_uri,
  projectName: row.project_name,
  status: row.status,
  errorMessage: row.error_message,
  rawJson: row.raw_json,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class ArkVirtualAssetRepository extends Repository {
  async findReadyGroup(input: {
    userId: string;
    feature: string;
    name: string;
    projectName: string;
  }) {
    const rows = await this.query<ArkVirtualAssetGroupRow[]>(
      `SELECT *
       FROM ark_virtual_asset_groups
       WHERE user_id = :userId
         AND feature = :feature
         AND name = :name
         AND project_name = :projectName
         AND status = 'ready'
       ORDER BY created_at DESC
       LIMIT 1`,
      input,
    );
    return rows[0] ? mapGroupRow(rows[0]) : null;
  }

  async upsertGroup(group: ArkVirtualAssetGroupRecord) {
    await this.execute(
      `INSERT INTO ark_virtual_asset_groups
        (id, user_id, feature, name, provider_group_id, project_name, status, error_message)
       VALUES
        (:id, :userId, :feature, :name, :providerGroupId, :projectName, :status, :errorMessage)
       ON DUPLICATE KEY UPDATE
        provider_group_id = VALUES(provider_group_id),
        status = VALUES(status),
        error_message = VALUES(error_message)`,
      group as unknown as Record<string, unknown>,
    );
    return group;
  }

  async findReusableAsset(input: {
    userId: string;
    feature: string;
    assetType: ArkVirtualAssetType;
    sourceHash: string;
    projectName: string;
  }) {
    const rows = await this.query<ArkVirtualAssetRow[]>(
      `SELECT *
       FROM ark_virtual_assets
       WHERE user_id = :userId
         AND feature = :feature
         AND asset_type = :assetType
         AND source_hash = :sourceHash
         AND project_name = :projectName
         AND status IN ('active', 'processing')
       ORDER BY FIELD(status, 'active', 'processing'), created_at DESC
       LIMIT 1`,
      input,
    );
    return rows[0] ? mapAssetRow(rows[0]) : null;
  }

  async createAsset(asset: ArkVirtualAssetRecord) {
    await this.execute(
      `INSERT INTO ark_virtual_assets
        (id, user_id, group_id, feature, asset_type, local_url, public_url, file_path, file_name,
         mime_type, size_bytes, source_hash, provider_asset_id, asset_uri, project_name, status,
         error_message, raw_json)
       VALUES
        (:id, :userId, :groupId, :feature, :assetType, :localUrl, :publicUrl, :filePath, :fileName,
         :mimeType, :sizeBytes, :sourceHash, :providerAssetId, :assetUri, :projectName, :status,
         :errorMessage, CAST(:rawJson AS JSON))`,
      {
        ...asset,
        rawJson: JSON.stringify(asset.rawJson ?? null),
      } as Record<string, unknown>,
    );
    return asset;
  }

  async updateAssetStatus(input: {
    id: string;
    providerAssetId?: string | null;
    assetUri?: string | null;
    status: ArkVirtualAssetStatus;
    errorMessage?: string | null;
    rawJson?: unknown;
  }) {
    await this.execute(
      `UPDATE ark_virtual_assets
       SET provider_asset_id = COALESCE(:providerAssetId, provider_asset_id),
           asset_uri = COALESCE(:assetUri, asset_uri),
           status = :status,
           error_message = :errorMessage,
           raw_json = CAST(:rawJson AS JSON)
       WHERE id = :id`,
      {
        ...input,
        rawJson: JSON.stringify(input.rawJson ?? null),
      } as Record<string, unknown>,
    );
  }
}

export const arkVirtualAssetRepository = new ArkVirtualAssetRepository();
