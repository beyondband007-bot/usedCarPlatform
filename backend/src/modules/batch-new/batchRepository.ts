import type { RowDataPacket } from "mysql2";

import { Repository } from "../../db/repository";
import type { TaskStatus } from "../../shared/types";
import type { BatchItemKind, BatchItemSummary, BatchVisualConfig } from "./batchTypes";

export interface BatchTaskRecord {
  id: string;
  projectName: string;
  presetId: string;
  status: TaskStatus;
  total: number;
  completed: number;
  failed: number;
  progress: number;
  visualConfig: BatchVisualConfig;
  creditsUserId?: number | null;
  creditsTenantId?: number | null;
  accountScope?: "personal" | "tenant" | null;
  estimatedPoints?: string | null;
  settledPoints?: string | null;
  subscriptionUserKey?: string | null;
  subscriptionPlanCode?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BatchItemTaskLink extends BatchItemSummary {
  batchId: string;
}

interface BatchTaskRow extends RowDataPacket {
  id: string;
  project_name: string;
  preset_id: string;
  status: TaskStatus;
  total: number;
  completed: number;
  failed: number;
  progress: number;
  visual_config_json: BatchVisualConfig | string | null;
  credits_user_id: number | null;
  credits_tenant_id: number | null;
  account_scope: "personal" | "tenant" | null;
  estimated_points: string | null;
  settled_points: string | null;
  subscription_user_key: string | null;
  subscription_plan_code: string | null;
  created_at: Date;
  updated_at: Date;
}

interface BatchItemRow extends RowDataPacket {
  id: string;
  batch_id: string;
  group_title: string;
  item_kind: BatchItemKind;
  input_asset_id: string;
  source_asset_ids_json: string[] | string | null;
  generation_task_id: string;
  sort_order: number;
  status: TaskStatus;
  progress: number;
  result_count: number;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

interface PresetRow extends RowDataPacket {
  id: string;
  user_id: string;
  name: string;
  visual_config_json: BatchVisualConfig | string;
  created_at: Date;
  updated_at: Date;
}

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (!value) return fallback;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const mapBatch = (row: BatchTaskRow): BatchTaskRecord => ({
  id: row.id,
  projectName: row.project_name,
  presetId: row.preset_id,
  status: row.status,
  total: row.total,
  completed: row.completed,
  failed: row.failed,
  progress: row.progress,
  visualConfig: parseJson(row.visual_config_json, {}),
  creditsUserId: row.credits_user_id,
  creditsTenantId: row.credits_tenant_id,
  accountScope: row.account_scope,
  estimatedPoints: row.estimated_points,
  settledPoints: row.settled_points,
  subscriptionUserKey: row.subscription_user_key,
  subscriptionPlanCode: row.subscription_plan_code,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapItem = (row: BatchItemRow): BatchItemSummary => ({
  itemId: row.id,
  groupTitle: row.group_title,
  itemKind: row.item_kind,
  inputAssetId: row.input_asset_id,
  sourceAssetIds: parseJson(row.source_asset_ids_json, [row.input_asset_id]),
  generationTaskId: row.generation_task_id,
  status: row.status,
  progress: row.progress,
  resultCount: row.result_count,
  error: row.error_message ? { message: row.error_message } : null,
});

export class BatchRepository extends Repository {
  async upsertPreset(input: { id: string; userId: string; name: string; visualConfig: BatchVisualConfig }) {
    await this.execute(
      `INSERT INTO batch_visual_presets (id, user_id, name, visual_config_json)
       VALUES (:id, :userId, :name, :visualConfig)
       ON DUPLICATE KEY UPDATE
        user_id = VALUES(user_id),
        name = VALUES(name),
        visual_config_json = VALUES(visual_config_json)`,
      { ...input, visualConfig: JSON.stringify(input.visualConfig) },
    );
  }

  async listPresets(userId: string) {
    const rows = await this.query<PresetRow[]>(
      `SELECT * FROM batch_visual_presets WHERE user_id = :userId ORDER BY updated_at DESC`,
      { userId },
    );
    return rows.map((row) => ({
      presetId: row.id,
      userId: row.user_id,
      name: row.name,
      visualConfig: parseJson(row.visual_config_json, {}),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    }));
  }

  async createBatch(input: {
    id: string;
    projectName: string;
    presetId: string;
    total: number;
    visualConfig: BatchVisualConfig;
    creditsUserId?: number | null;
    creditsTenantId?: number | null;
    accountScope?: "personal" | "tenant" | null;
    subscriptionUserKey?: string | null;
    subscriptionPlanCode?: string | null;
  }) {
    await this.execute(
      `INSERT INTO batch_tasks
        (id, project_name, preset_id, status, total, completed, failed, progress, visual_config_json,
         credits_user_id, credits_tenant_id, account_scope, subscription_user_key, subscription_plan_code)
       VALUES
        (:id, :projectName, :presetId, 'waiting', :total, 0, 0, 0, :visualConfig,
         :creditsUserId, :creditsTenantId, :accountScope, :subscriptionUserKey, :subscriptionPlanCode)`,
      {
        ...input,
        visualConfig: JSON.stringify(input.visualConfig),
        creditsUserId: input.creditsUserId ?? null,
        creditsTenantId: input.creditsTenantId ?? null,
        accountScope: input.accountScope ?? null,
        subscriptionUserKey: input.subscriptionUserKey ?? null,
        subscriptionPlanCode: input.subscriptionPlanCode ?? null,
      },
    );
  }

  async createItem(input: {
    id: string;
    batchId: string;
    groupTitle: string;
    itemKind: BatchItemKind;
    inputAssetId: string;
    sourceAssetIds?: string[];
    generationTaskId: string;
    sortOrder: number;
  }) {
    await this.execute(
      `INSERT INTO batch_task_items
        (id, batch_id, group_title, item_kind, input_asset_id, source_asset_ids_json, generation_task_id, sort_order)
       VALUES
        (:id, :batchId, :groupTitle, :itemKind, :inputAssetId, :sourceAssetIds, :generationTaskId, :sortOrder)`,
      {
        ...input,
        sourceAssetIds: JSON.stringify(input.sourceAssetIds?.length ? input.sourceAssetIds : [input.inputAssetId]),
      },
    );
  }

  async findBatch(id: string) {
    const rows = await this.query<BatchTaskRow[]>(`SELECT * FROM batch_tasks WHERE id = :id LIMIT 1`, { id });
    return rows[0] ? mapBatch(rows[0]) : null;
  }

  async listBatches(input: { status?: string; page: number; pageSize: number }) {
    const offset = (input.page - 1) * input.pageSize;
    const where = input.status ? "WHERE status = :status" : "";
    const rows = await this.query<BatchTaskRow[]>(
      `SELECT * FROM batch_tasks ${where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset`,
      { status: input.status, limit: input.pageSize, offset },
    );
    const totalRows = await this.query<Array<RowDataPacket & { total: number }>>(
      `SELECT COUNT(*) total FROM batch_tasks ${where}`,
      { status: input.status },
    );
    return { items: rows.map(mapBatch), total: Number(totalRows[0]?.total ?? 0) };
  }

  async listItems(batchId: string) {
    const rows = await this.query<BatchItemRow[]>(
      `SELECT * FROM batch_task_items WHERE batch_id = :batchId ORDER BY sort_order ASC, created_at ASC`,
      { batchId },
    );
    return rows.map(mapItem);
  }

  async findItemByGenerationTaskId(generationTaskId: string): Promise<BatchItemTaskLink | null> {
    const rows = await this.query<BatchItemRow[]>(
      `SELECT * FROM batch_task_items WHERE generation_task_id = :generationTaskId LIMIT 1`,
      { generationTaskId },
    );
    const row = rows[0];
    if (!row) return null;
    return {
      ...mapItem(row),
      batchId: row.batch_id,
    };
  }

  async listWaitingItems(batchId: string, limit: number) {
    const rows = await this.query<BatchItemRow[]>(
      `SELECT * FROM batch_task_items
       WHERE batch_id = :batchId AND status = 'waiting'
       ORDER BY sort_order ASC, created_at ASC
       LIMIT :limit`,
      { batchId, limit },
    );
    return rows.map(mapItem);
  }

  async updateItemFromTask(input: {
    itemId: string;
    status: TaskStatus;
    progress: number;
    resultCount: number;
    errorMessage?: string | null;
  }) {
    await this.execute(
      `UPDATE batch_task_items
       SET status = :status,
           progress = :progress,
           result_count = :resultCount,
           error_message = :errorMessage
       WHERE id = :itemId`,
      { ...input, errorMessage: input.errorMessage ?? null },
    );
  }

  async recalcBatch(batchId: string) {
    await this.execute(
      `UPDATE batch_tasks bt
       JOIN (
        SELECT
          batch_id,
          COUNT(*) total,
          SUM(status = 'success') completed,
          SUM(status = 'fail') failed,
          SUM(status = 'canceled') canceled,
          ROUND(AVG(progress)) progress
        FROM batch_task_items
        WHERE batch_id = :batchId
        GROUP BY batch_id
       ) agg ON agg.batch_id = bt.id
       SET bt.total = agg.total,
           bt.completed = agg.completed,
           bt.failed = agg.failed,
           bt.progress = agg.progress,
           bt.status = CASE
             WHEN agg.canceled = agg.total THEN 'canceled'
             WHEN agg.failed + agg.canceled > 0 AND agg.completed + agg.failed + agg.canceled = agg.total THEN 'fail'
             WHEN agg.completed = agg.total THEN 'success'
             WHEN agg.completed + agg.failed + agg.canceled = 0 AND agg.progress = 0 THEN 'waiting'
             ELSE 'generating'
           END
       WHERE bt.id = :batchId`,
      { batchId },
    );
  }

  async listGenerationTaskIds(batchIds: string[]) {
    if (!batchIds.length) return [];
    const placeholders = batchIds.map((_, index) => `:batchId${index}`).join(", ");
    const params = Object.fromEntries(
      batchIds.map((batchId, index) => [`batchId${index}`, batchId]),
    );
    const rows = await this.query<Array<RowDataPacket & { generation_task_id: string }>>(
      `SELECT DISTINCT generation_task_id
       FROM batch_task_items
       WHERE batch_id IN (${placeholders})`,
      params,
    );
    return rows.map((row) => row.generation_task_id).filter(Boolean);
  }

  async deleteBatches(batchIds: string[]) {
    if (!batchIds.length) return;
    const placeholders = batchIds.map((_, index) => `:batchId${index}`).join(", ");
    const params = Object.fromEntries(
      batchIds.map((batchId, index) => [`batchId${index}`, batchId]),
    );
    await this.execute(
      `DELETE FROM batch_task_items WHERE batch_id IN (${placeholders})`,
      params,
    );
    await this.execute(`DELETE FROM batch_tasks WHERE id IN (${placeholders})`, params);
  }

  async recalcBatchBilling(batchId: string) {
    await this.execute(
      `UPDATE batch_tasks bt
       LEFT JOIN (
        SELECT
          bti.batch_id,
          SUM(COALESCE(gt.estimated_points, 0)) estimated_points,
          SUM(COALESCE(gt.settled_points, 0)) settled_points
        FROM batch_task_items bti
        JOIN generation_tasks gt ON gt.id = bti.generation_task_id
        WHERE bti.batch_id = :batchId
        GROUP BY bti.batch_id
       ) billing ON billing.batch_id = bt.id
       SET bt.estimated_points = billing.estimated_points,
           bt.settled_points = billing.settled_points
       WHERE bt.id = :batchId`,
      { batchId },
    );
  }
}

export const batchRepository = new BatchRepository();
