import type { RowDataPacket } from "mysql2";

import { Repository } from "../../db/repository";

export interface UserLogoSetting {
  userId: string;
  logoAssetId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UserLogoSettingRow extends RowDataPacket {
  user_id: string;
  logo_asset_id: string;
  created_at: Date;
  updated_at: Date;
}

const mapRow = (row: UserLogoSettingRow): UserLogoSetting => ({
  userId: row.user_id,
  logoAssetId: row.logo_asset_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class UserLogoRepository extends Repository {
  async upsert(userId: string, logoAssetId: string) {
    await this.execute(
      `INSERT INTO user_logo_settings (user_id, logo_asset_id)
       VALUES (:userId, :logoAssetId)
       ON DUPLICATE KEY UPDATE
         logo_asset_id = VALUES(logo_asset_id),
         updated_at = CURRENT_TIMESTAMP(3)`,
      { userId, logoAssetId },
    );
  }

  async findByUserId(userId: string) {
    const rows = await this.query<UserLogoSettingRow[]>(
      `SELECT * FROM user_logo_settings WHERE user_id = :userId LIMIT 1`,
      { userId },
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }
}

export const userLogoRepository = new UserLogoRepository();
