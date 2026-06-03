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
  creditsUserId?: number | null;
  creditsTenantId?: number | null;
  accountScope?: "personal" | "tenant" | null;
  billingTaskId?: number | null;
  billingStatus?: string | null;
  estimatedPoints?: string | null;
  settledPoints?: string | null;
  subscriptionUserKey?: string | null;
  subscriptionPlanCode?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecentGenerationRecord extends GenerationTaskRecord {
  inputAssetUrl?: string | null;
  inputAssetThumbnailUrl?: string | null;
  inputAssetFileName?: string | null;
  batchProjectName?: string | null;
  batchItemKind?: string | null;
  batchSortOrder?: number | null;
  batchExteriorCount?: number | null;
  batchInteriorCollage?: boolean;
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
  credits_user_id: number | null;
  credits_tenant_id: number | null;
  account_scope: "personal" | "tenant" | null;
  billing_task_id: number | null;
  billing_status: string | null;
  estimated_points: string | null;
  settled_points: string | null;
  subscription_user_key: string | null;
  subscription_plan_code: string | null;
  created_at: Date;
  updated_at: Date;
}

interface RecentGenerationRow extends GenerationTaskRow {
  input_asset_url: string | null;
  input_asset_thumbnail_url: string | null;
  input_asset_file_name: string | null;
  batch_project_name: string | null;
  batch_item_kind: string | null;
  batch_sort_order: number | null;
  batch_exterior_count: number | null;
  batch_interior_collage: number | null;
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
  creditsUserId: row.credits_user_id,
  creditsTenantId: row.credits_tenant_id,
  accountScope: row.account_scope,
  billingTaskId: row.billing_task_id,
  billingStatus: row.billing_status,
  estimatedPoints: row.estimated_points,
  settledPoints: row.settled_points,
  subscriptionUserKey: row.subscription_user_key,
  subscriptionPlanCode: row.subscription_plan_code,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const parseInteriorCollageFlag = (value: unknown) => {
  if (!value) return false;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      return Boolean(parsed.enableInteriorCollage ?? parsed.interiorCollage);
    } catch {
      return false;
    }
  }
  if (typeof value === "object") {
    const config = value as Record<string, unknown>;
    return Boolean(config.enableInteriorCollage ?? config.interiorCollage);
  }
  return false;
};

const mapRecentRow = (row: RecentGenerationRow): RecentGenerationRecord => ({
  ...mapRow(row),
  inputAssetUrl: row.input_asset_url,
  inputAssetThumbnailUrl: row.input_asset_thumbnail_url,
  inputAssetFileName: row.input_asset_file_name,
  batchProjectName: row.batch_project_name,
  batchItemKind: row.batch_item_kind,
  batchSortOrder:
    row.batch_sort_order === null || row.batch_sort_order === undefined
      ? null
      : Number(row.batch_sort_order),
  batchExteriorCount:
    row.batch_exterior_count === null || row.batch_exterior_count === undefined
      ? null
      : Number(row.batch_exterior_count),
  batchInteriorCollage: parseInteriorCollageFlag(row.batch_interior_collage),
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
          a.thumbnail_url AS input_asset_thumbnail_url,
          a.file_name AS input_asset_file_name,
          bt.project_name AS batch_project_name,
          bti.item_kind AS batch_item_kind,
          bti.sort_order AS batch_sort_order,
          bt.visual_config_json AS batch_interior_collage,
          (
            SELECT COUNT(*)
            FROM batch_task_items exterior_items
            WHERE exterior_items.batch_id = bti.batch_id
              AND exterior_items.item_kind = 'exterior'
          ) AS batch_exterior_count
       FROM generation_tasks gt
       LEFT JOIN assets a ON a.id = gt.input_asset_id
       LEFT JOIN batch_task_items bti ON bti.generation_task_id = gt.id
       LEFT JOIN batch_tasks bt ON bt.id = bti.batch_id
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
    subscriptionUserKey?: string | null;
    subscriptionPlanCode?: string | null;
  }) {
    await this.execute(
      `INSERT INTO generation_tasks
        (id, module_code, status, progress, input_asset_id, option_id, output_ratio, resolution, logo_asset_id, prompt,
         subscription_user_key, subscription_plan_code)
       VALUES
        (:id, :moduleCode, 'waiting', 0, :inputAssetId, :optionId, :outputRatio, :resolution, :logoAssetId, :prompt,
         :subscriptionUserKey, :subscriptionPlanCode)`,
      {
        ...input,
        subscriptionUserKey: input.subscriptionUserKey ?? null,
        subscriptionPlanCode: input.subscriptionPlanCode ?? null,
      } as unknown as Record<string, unknown>,
    );
  }

  async updateBilling(input: {
    id: string;
    creditsUserId: number;
    creditsTenantId?: number | null;
    accountScope: "personal" | "tenant";
    billingTaskId: number;
    billingStatus: string;
    estimatedPoints?: string | null;
    settledPoints?: string | null;
  }) {
    await this.execute(
      `UPDATE generation_tasks
       SET credits_user_id = :creditsUserId,
           credits_tenant_id = :creditsTenantId,
           account_scope = :accountScope,
           billing_task_id = :billingTaskId,
           billing_status = :billingStatus,
           estimated_points = :estimatedPoints,
           settled_points = :settledPoints
       WHERE id = :id`,
      {
        ...input,
        creditsTenantId: input.creditsTenantId ?? null,
        estimatedPoints: input.estimatedPoints ?? null,
        settledPoints: input.settledPoints ?? null,
      },
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

  async markCanceled(id: string, errorCode: string, errorMessage: string) {
    await this.execute(
      `UPDATE generation_tasks
       SET status = 'canceled',
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

  async deleteByIds(taskIds: string[]) {
    if (!taskIds.length) return;
    const placeholders = taskIds.map((_, index) => `:taskId${index}`).join(", ");
    const params = Object.fromEntries(
      taskIds.map((taskId, index) => [`taskId${index}`, taskId]),
    );
    await this.execute(
      `DELETE FROM kie_task_records WHERE task_id IN (${placeholders})`,
      params,
    );
    await this.execute(`DELETE FROM generation_tasks WHERE id IN (${placeholders})`, params);
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
