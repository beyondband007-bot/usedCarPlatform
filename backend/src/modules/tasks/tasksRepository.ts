import type { RowDataPacket } from "mysql2";

import { Repository } from "../../db/repository";
import { createId } from "../../shared/ids";
import type { OutputRatio, Resolution, TaskStatus } from "../../shared/types";
import { parseJsonValue } from "./taskJson";

export interface GenerationTaskRecord {
  id: string;
  moduleCode: string;
  status: TaskStatus;
  progress: number;
  inputAssetId?: string | null;
  optionId?: string | null;
  outputRatio: OutputRatio;
  resolution: Resolution;
  logoAssetId?: string | null;
  prompt?: string | null;
  kieTaskId?: string | null;
  kieAccountHash?: string | null;
  resultJson?: unknown;
  errorCode?: string | null;
  errorMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecentGenerationRecord extends GenerationTaskRecord {
  inputAssetUrl?: string | null;
  inputAssetFileName?: string | null;
}

interface GenerationTaskRow extends RowDataPacket {
  id: string;
  module_code: string;
  status: TaskStatus;
  progress: number;
  input_asset_id: string | null;
  option_id: string | null;
  output_ratio: OutputRatio;
  resolution: Resolution;
  logo_asset_id: string | null;
  prompt: string | null;
  kie_task_id: string | null;
  kie_account_hash: string | null;
  result_json: unknown;
  error_code: string | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

interface RecentGenerationRow extends GenerationTaskRow {
  input_asset_url: string | null;
  input_asset_file_name: string | null;
}

const mapRow = (row: GenerationTaskRow): GenerationTaskRecord => ({
  id: row.id,
  moduleCode: row.module_code,
  status: row.status,
  progress: row.progress,
  inputAssetId: row.input_asset_id,
  optionId: row.option_id,
  outputRatio: row.output_ratio,
  resolution: row.resolution,
  logoAssetId: row.logo_asset_id,
  prompt: row.prompt,
  kieTaskId: row.kie_task_id,
  kieAccountHash: row.kie_account_hash,
  resultJson: row.result_json,
  errorCode: row.error_code,
  errorMessage: row.error_message,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapRecentRow = (row: RecentGenerationRow): RecentGenerationRecord => ({
  ...mapRow(row),
  inputAssetUrl: row.input_asset_url,
  inputAssetFileName: row.input_asset_file_name,
});

export class TasksRepository extends Repository {
  async findById(id: string) {
    const rows = await this.query<GenerationTaskRow[]>(
      `SELECT * FROM generation_tasks WHERE id = :id LIMIT 1`,
      { id },
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async findByIds(ids: string[]) {
    if (!ids.length) return [] as GenerationTaskRecord[];
    const params: Record<string, unknown> = {};
    const placeholders = ids
      .map((id, index) => {
        const key = `id${index}`;
        params[key] = id;
        return `:${key}`;
      })
      .join(",");
    const rows = await this.query<GenerationTaskRow[]>(
      `SELECT * FROM generation_tasks WHERE id IN (${placeholders})`,
      params,
    );
    return rows.map(mapRow);
  }

  async listRecent(input: {
    moduleCode?: string;
    status?: string;
    page: number;
    pageSize: number;
  }) {
    const clauses = [];
    const params: Record<string, unknown> = {
      limit: input.pageSize,
      offset: (input.page - 1) * input.pageSize,
    };

    if (input.moduleCode) {
      clauses.push("gt.module_code = :moduleCode");
      params.moduleCode = input.moduleCode;
    }

    if (input.status) {
      clauses.push("gt.status = :status");
      params.status = input.status;
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = await this.query<RecentGenerationRow[]>(
      `SELECT
          gt.*,
          a.public_url AS input_asset_url,
          a.file_name AS input_asset_file_name
       FROM generation_tasks gt
       LEFT JOIN assets a ON a.id = gt.input_asset_id
       ${where}
       ORDER BY gt.created_at DESC
       LIMIT :limit OFFSET :offset`,
      params,
    );
    const totalRows = await this.query<Array<RowDataPacket & { total: number }>>(
      `SELECT COUNT(*) total FROM generation_tasks gt ${where}`,
      params,
    );

    return {
      items: rows.map(mapRecentRow),
      total: Number(totalRows[0]?.total ?? 0),
    };
  }

  async createWaitingTask(input: {
    id: string;
    moduleCode: string;
    inputAssetId?: string | null;
    optionId?: string | null;
    outputRatio: OutputRatio;
    resolution: Resolution;
    logoAssetId?: string | null;
    prompt: string;
  }) {
    await this.execute(
      `INSERT INTO generation_tasks
        (id, module_code, status, progress, input_asset_id, option_id, output_ratio, resolution, logo_asset_id, prompt)
       VALUES
        (:id, :moduleCode, 'waiting', 0, :inputAssetId, :optionId, :outputRatio, :resolution, :logoAssetId, :prompt)`,
      input as unknown as Record<string, unknown>,
    );
  }

  async markSubmitted(input: {
    id: string;
    kieTaskId: string;
    kieAccountHash: string;
    requestJson: unknown;
    responseJson: unknown;
  }) {
    await this.execute(
      `UPDATE generation_tasks
       SET status = 'queued',
           progress = 5,
           kie_task_id = :kieTaskId,
           kie_account_hash = :kieAccountHash
       WHERE id = :id`,
      input as unknown as Record<string, unknown>,
    );

    await this.execute(
      `INSERT INTO kie_task_records
        (id, task_id, kie_task_id, kie_account_hash, status, request_json, response_json)
       VALUES
        (:id, :taskId, :kieTaskId, :kieAccountHash, 'queued', :requestJson, :responseJson)`,
      {
        id: createId("kie_record"),
        taskId: input.id,
        kieTaskId: input.kieTaskId,
        kieAccountHash: input.kieAccountHash,
        requestJson: JSON.stringify(input.requestJson),
        responseJson: JSON.stringify(input.responseJson),
      },
    );
  }

  async markFailed(id: string, errorCode: string, errorMessage: string) {
    await this.execute(
      `UPDATE generation_tasks
       SET status = 'fail',
           progress = 100,
           error_code = :errorCode,
           error_message = :errorMessage
       WHERE id = :id`,
      { id, errorCode, errorMessage },
    );
  }

  async updateFromKie(
    id: string,
    patch: {
      status: TaskStatus;
      progress: number;
      resultJson?: unknown;
      errorCode?: string | null;
      errorMessage?: string | null;
    },
  ) {
    await this.execute(
      `UPDATE generation_tasks
       SET status = :status,
           progress = :progress,
           result_json = :resultJson,
           error_code = :errorCode,
           error_message = :errorMessage
       WHERE id = :id`,
      {
        id,
        status: patch.status,
        progress: patch.progress,
        resultJson: patch.resultJson ? JSON.stringify(patch.resultJson) : null,
        errorCode: patch.errorCode ?? null,
        errorMessage: patch.errorMessage ?? null,
      },
    );

    await this.execute(
      `UPDATE kie_task_records
       SET status = :status,
           response_json = :responseJson
       WHERE task_id = :id`,
      {
        id,
        status: patch.status,
        responseJson: patch.resultJson ? JSON.stringify(patch.resultJson) : null,
      },
    );
  }
}

export const tasksRepository = new TasksRepository();
export const normalizeTaskResults = (value: unknown) =>
  parseJsonValue<
    Array<{
      url: string;
      sourceUrl?: string;
      localPath?: string;
      thumbnailUrl?: string;
      width?: number;
      height?: number;
    }>
  >(value, []);
