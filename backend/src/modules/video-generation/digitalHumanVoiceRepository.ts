import type { RowDataPacket } from "mysql2";

import { Repository } from "../../db/repository";

export interface DigitalHumanVoiceRecord {
  digitalHumanId: string;
  voiceId: string;
  sourceFileId: number;
  sourceFileName: string;
  sourceMimeType: string;
  sourceLocalPath: string;
  model: string;
  status: "ready" | "inactive";
  createdByUserId: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

interface DigitalHumanVoiceRow extends RowDataPacket {
  digital_human_id: string;
  voice_id: string;
  source_file_id: number;
  source_file_name: string;
  source_mime_type: string;
  source_local_path: string;
  model: string;
  status: "ready" | "inactive";
  created_by_user_id: string;
  metadata_json: unknown;
  created_at: Date;
  updated_at: Date;
}

const parseMetadata = (value: unknown) => {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return typeof value === "object" ? (value as Record<string, unknown>) : {};
};

const mapRow = (row: DigitalHumanVoiceRow): DigitalHumanVoiceRecord => ({
  digitalHumanId: row.digital_human_id,
  voiceId: row.voice_id,
  sourceFileId: Number(row.source_file_id),
  sourceFileName: row.source_file_name,
  sourceMimeType: row.source_mime_type,
  sourceLocalPath: row.source_local_path,
  model: row.model,
  status: row.status,
  createdByUserId: row.created_by_user_id,
  metadata: parseMetadata(row.metadata_json),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class DigitalHumanVoiceRepository extends Repository {
  async upsert(input: Omit<DigitalHumanVoiceRecord, "createdAt" | "updatedAt">) {
    await this.execute(
      `INSERT INTO digital_human_voices
        (digital_human_id, voice_id, source_file_id, source_file_name, source_mime_type,
         source_local_path, model, status, created_by_user_id, metadata_json)
       VALUES
        (:digitalHumanId, :voiceId, :sourceFileId, :sourceFileName, :sourceMimeType,
         :sourceLocalPath, :model, :status, :createdByUserId, :metadataJson)
       ON DUPLICATE KEY UPDATE
        voice_id = VALUES(voice_id),
        source_file_id = VALUES(source_file_id),
        source_file_name = VALUES(source_file_name),
        source_mime_type = VALUES(source_mime_type),
        source_local_path = VALUES(source_local_path),
        model = VALUES(model),
        status = VALUES(status),
        created_by_user_id = VALUES(created_by_user_id),
        metadata_json = VALUES(metadata_json)`,
      {
        ...input,
        metadataJson: JSON.stringify(input.metadata),
      },
    );
    return this.findByDigitalHumanId(input.digitalHumanId);
  }

  async findByDigitalHumanId(digitalHumanId: string) {
    const rows = await this.query<DigitalHumanVoiceRow[]>(
      `SELECT *
       FROM digital_human_voices
       WHERE digital_human_id = :digitalHumanId
       LIMIT 1`,
      { digitalHumanId },
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async listByDigitalHumanIds(digitalHumanIds: string[]) {
    if (!digitalHumanIds.length) return [] as DigitalHumanVoiceRecord[];
    const params: Record<string, unknown> = {};
    const placeholders = digitalHumanIds.map((id, index) => {
      const key = `id${index}`;
      params[key] = id;
      return `:${key}`;
    });
    const rows = await this.query<DigitalHumanVoiceRow[]>(
      `SELECT *
       FROM digital_human_voices
       WHERE digital_human_id IN (${placeholders.join(",")})`,
      params,
    );
    return rows.map(mapRow);
  }
}

export const digitalHumanVoiceRepository = new DigitalHumanVoiceRepository();
