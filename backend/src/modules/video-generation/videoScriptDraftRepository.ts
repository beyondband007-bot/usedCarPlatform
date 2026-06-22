import type { RowDataPacket } from "mysql2";

import { Repository } from "../../db/repository";
import { parseJsonValue } from "../tasks/taskJson";

export interface VideoScriptDraftRecord {
  id: string;
  userId: string;
  vehicleName: string;
  digitalHumanId: string;
  referenceMaterialId: string;
  durationSeconds: 15;
  outputRatio: "9:16";
  videoResolution: "720p";
  scriptText: string;
  finalVideoPrompt: string;
  requiredInputs: Record<string, unknown>;
  promptBundle: Record<string, unknown>;
  riskNotes: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface VideoScriptDraftRow extends RowDataPacket {
  id: string;
  user_id: string;
  vehicle_name: string;
  digital_human_id: string;
  reference_material_id: string;
  duration_seconds: number;
  output_ratio: "9:16";
  video_resolution: "720p";
  script_text: string;
  final_video_prompt: string;
  required_inputs_json: unknown;
  prompt_bundle_json: unknown;
  risk_notes_json: unknown;
  created_at: Date;
  updated_at: Date;
}

const mapRow = (row: VideoScriptDraftRow): VideoScriptDraftRecord => ({
  id: row.id,
  userId: row.user_id,
  vehicleName: row.vehicle_name,
  digitalHumanId: row.digital_human_id,
  referenceMaterialId: row.reference_material_id,
  durationSeconds: 15,
  outputRatio: row.output_ratio,
  videoResolution: row.video_resolution,
  scriptText: row.script_text,
  finalVideoPrompt: row.final_video_prompt,
  requiredInputs: parseJsonValue(row.required_inputs_json, {}),
  promptBundle: parseJsonValue(row.prompt_bundle_json, {}),
  riskNotes: parseJsonValue(row.risk_notes_json, []),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class VideoScriptDraftRepository extends Repository {
  async create(input: Omit<VideoScriptDraftRecord, "createdAt" | "updatedAt">) {
    await this.execute(
      `INSERT INTO video_script_drafts
        (id, user_id, vehicle_name, digital_human_id, reference_material_id,
         duration_seconds, output_ratio, video_resolution, script_text,
         final_video_prompt, required_inputs_json, prompt_bundle_json, risk_notes_json)
       VALUES
        (:id, :userId, :vehicleName, :digitalHumanId, :referenceMaterialId,
         :durationSeconds, :outputRatio, :videoResolution, :scriptText,
         :finalVideoPrompt, :requiredInputs, :promptBundle, :riskNotes)`,
      {
        ...input,
        requiredInputs: JSON.stringify(input.requiredInputs),
        promptBundle: JSON.stringify(input.promptBundle),
        riskNotes: JSON.stringify(input.riskNotes),
      },
    );

    return this.findById(input.id, input.userId);
  }

  async findById(id: string, userId: string) {
    const rows = await this.query<VideoScriptDraftRow[]>(
      `SELECT *
       FROM video_script_drafts
       WHERE id = :id AND user_id = :userId
       LIMIT 1`,
      { id, userId },
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async updateScriptText(input: {
    id: string;
    userId: string;
    scriptText: string;
    finalVideoPrompt: string;
    requiredInputs: Record<string, unknown>;
  }) {
    await this.execute(
      `UPDATE video_script_drafts
       SET script_text = :scriptText,
           final_video_prompt = :finalVideoPrompt,
           required_inputs_json = :requiredInputs
       WHERE id = :id AND user_id = :userId`,
      {
        ...input,
        requiredInputs: JSON.stringify(input.requiredInputs),
      },
    );
    return this.findById(input.id, input.userId);
  }
}

export const videoScriptDraftRepository = new VideoScriptDraftRepository();
