import type { RowDataPacket } from "mysql2";

import { env } from "../../config/env";
import { Repository } from "../../db/repository";
import { createId } from "../../shared/ids";
import type { OutputRatio, Resolution, TaskStatus } from "../../shared/types";
import { parseJsonValue } from "./taskJson";

export interface GenerationTaskRecord {
  id: string;
  userId: string;
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
  deadlineAt?: Date | null;
  softTimeoutAt?: Date | null;
  fallbackStartedAt?: Date | null;
  activeModel?: string | null;
  winningModel?: string | null;
  attemptCount: number;
  pollFailureCount: number;
  lastKiePollAt?: Date | null;
  lastErrorCode?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface KieTaskRecord {
  id: string;
  taskId: string;
  kieTaskId: string;
  kieAccountHash: string;
  status: TaskStatus;
  requestJson?: unknown;
  responseJson?: unknown;
  attemptNo: number;
  model?: string | null;
  role: "primary" | "fallback";
  isWinner: boolean;
  finishedAt?: Date | null;
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
  videoVehicleName?: string | null;
  videoReferenceMaterialId?: string | null;
}

interface GenerationTaskRow extends RowDataPacket {
  id: string;
  user_id: string;
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
  deadline_at: Date | null;
  soft_timeout_at: Date | null;
  fallback_started_at: Date | null;
  active_model: string | null;
  winning_model: string | null;
  attempt_count: number;
  poll_failure_count: number;
  last_kie_poll_at: Date | null;
  last_error_code: string | null;
  created_at: Date;
  updated_at: Date;
}

interface KieTaskRecordRow extends RowDataPacket {
  id: string;
  task_id: string;
  kie_task_id: string;
  kie_account_hash: string;
  status: TaskStatus;
  request_json: unknown;
  response_json: unknown;
  attempt_no: number;
  model: string | null;
  role: "primary" | "fallback";
  is_winner: number;
  finished_at: Date | null;
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
  video_vehicle_name: string | null;
  video_reference_material_id: string | null;
}

const mapRow = (row: GenerationTaskRow): GenerationTaskRecord => ({
  id: row.id,
  userId: row.user_id,
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
  deadlineAt: row.deadline_at,
  softTimeoutAt: row.soft_timeout_at,
  fallbackStartedAt: row.fallback_started_at,
  activeModel: row.active_model,
  winningModel: row.winning_model,
  attemptCount: Number(row.attempt_count ?? 0),
  pollFailureCount: Number(row.poll_failure_count ?? 0),
  lastKiePollAt: row.last_kie_poll_at,
  lastErrorCode: row.last_error_code,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapKieRecordRow = (row: KieTaskRecordRow): KieTaskRecord => ({
  id: row.id,
  taskId: row.task_id,
  kieTaskId: row.kie_task_id,
  kieAccountHash: row.kie_account_hash,
  status: row.status,
  requestJson: parseJsonValue(row.request_json, null),
  responseJson: parseJsonValue(row.response_json, null),
  attemptNo: Number(row.attempt_no ?? 1),
  model: row.model,
  role: row.role,
  isWinner: row.is_winner === 1,
  finishedAt: row.finished_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const getKieMeta = (responseJson: unknown) => {
  const parsed = parseJsonValue<Record<string, unknown>>(responseJson, {});
  const meta = parsed._usedCarPlatform;
  return meta && typeof meta === "object" ? (meta as Record<string, unknown>) : {};
};

const generationTaskDeadline = (moduleCode: string) => {
  if (moduleCode === "short-video") {
    return {
      deadlineAt: null,
      softTimeoutAt: null,
    };
  }

  const now = Date.now();
  if (moduleCode === "video-generation") {
    return {
      deadlineAt: new Date(now + env.kie.videoDeadlineMs),
      softTimeoutAt: null,
    };
  }
  return {
    deadlineAt: new Date(now + env.kie.imageDeadlineMs),
    softTimeoutAt: new Date(now + env.kie.imageSoftTimeoutMs),
  };
};

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
  videoVehicleName: row.video_vehicle_name,
  videoReferenceMaterialId: row.video_reference_material_id,
});

export class TasksRepository extends Repository {
  async findById(id: string, userId?: string) {
    const clauses = ["id = :id"];
    const params: Record<string, unknown> = { id };
    if (userId) {
      clauses.push("user_id = :userId");
      params.userId = userId;
    }
    const rows = await this.query<GenerationTaskRow[]>(
      `SELECT * FROM generation_tasks WHERE ${clauses.join(" AND ")} LIMIT 1`,
      params,
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async findByIds(ids: string[], userId?: string) {
    if (!ids.length) return [] as GenerationTaskRecord[];
    const params: Record<string, unknown> = {};
    const placeholders = ids
      .map((id, index) => {
        const key = `id${index}`;
        params[key] = id;
        return `:${key}`;
      })
      .join(",");
    const userFilter = userId ? " AND user_id = :userId" : "";
    if (userId) params.userId = userId;
    const rows = await this.query<GenerationTaskRow[]>(
      `SELECT * FROM generation_tasks WHERE id IN (${placeholders})${userFilter}`,
      params,
    );
    return rows.map(mapRow);
  }

  async listRecent(input: {
    userId: string;
    moduleCode?: string;
    status?: string;
    page: number;
    pageSize: number;
  }) {
    const clauses = ["gt.user_id = :userId"];
    const params: Record<string, unknown> = {
      userId: input.userId,
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
          vsd.vehicle_name AS video_vehicle_name,
          vsd.reference_material_id AS video_reference_material_id,
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
       LEFT JOIN video_script_drafts vsd
         ON gt.module_code = 'video-generation'
        AND vsd.id = gt.option_id
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
    userId: string;
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
        (id, user_id, module_code, status, progress, input_asset_id, option_id, output_ratio, resolution, logo_asset_id, prompt,
         subscription_user_key, subscription_plan_code)
       VALUES
        (:id, :userId, :moduleCode, 'waiting', 0, :inputAssetId, :optionId, :outputRatio, :resolution, :logoAssetId, :prompt,
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
    model?: string | null;
    role?: "primary" | "fallback";
    attemptNo?: number;
  }) {
    const meta = getKieMeta(input.responseJson);
    const model =
      input.model ??
      (typeof meta.model === "string" ? meta.model : null) ??
      parseJsonValue<Record<string, unknown>>(input.requestJson, {}).model?.toString() ??
      env.kie.primaryImageModel;
    const role =
      input.role ??
      (meta.role === "fallback" ? "fallback" : "primary");
    const attemptNo = input.attemptNo ?? (typeof meta.attemptNo === "number" ? meta.attemptNo : role === "fallback" ? 2 : 1);
    const deadlines = generationTaskDeadline(
      (await this.findById(input.id))?.moduleCode ?? "",
    );

    await this.execute(
      `UPDATE generation_tasks
       SET status = 'queued',
           progress = 5,
           kie_task_id = :kieTaskId,
           kie_account_hash = :kieAccountHash,
           active_model = :model,
           attempt_count = GREATEST(attempt_count, :attemptNo),
           poll_failure_count = 0,
           last_error_code = NULL,
           deadline_at = COALESCE(deadline_at, :deadlineAt),
           soft_timeout_at = COALESCE(soft_timeout_at, :softTimeoutAt)
       WHERE id = :id`,
      {
        ...input,
        model,
        attemptNo,
        ...deadlines,
      } as unknown as Record<string, unknown>,
    );

    await this.execute(
      `INSERT INTO kie_task_records
        (id, task_id, kie_task_id, kie_account_hash, status, request_json, response_json, attempt_no, model, role)
       VALUES
        (:id, :taskId, :kieTaskId, :kieAccountHash, 'queued', :requestJson, :responseJson, :attemptNo, :model, :role)
       ON DUPLICATE KEY UPDATE
        kie_task_id = VALUES(kie_task_id),
        kie_account_hash = VALUES(kie_account_hash),
        status = VALUES(status),
        request_json = VALUES(request_json),
        response_json = VALUES(response_json),
        attempt_no = VALUES(attempt_no),
        model = VALUES(model),
        updated_at = CURRENT_TIMESTAMP(3)`,
      {
        id: createId("kie_record"),
        taskId: input.id,
        kieTaskId: input.kieTaskId,
        kieAccountHash: input.kieAccountHash,
        requestJson: JSON.stringify(input.requestJson),
        responseJson: JSON.stringify(input.responseJson),
        attemptNo,
        model,
        role,
      },
    );
  }

  async markFailed(id: string, errorCode: string, errorMessage: string) {
    await this.execute(
      `UPDATE generation_tasks
       SET status = 'fail',
           progress = 100,
           error_code = :errorCode,
           error_message = :errorMessage,
           last_error_code = :errorCode
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
           error_message = :errorMessage,
           last_error_code = :errorCode
       WHERE id = :id`,
      { id, errorCode, errorMessage },
    );
  }

  async markTimedOut(id: string, errorCode: string, errorMessage: string) {
    await this.execute(
      `UPDATE generation_tasks
       SET status = 'fail',
           progress = 100,
           error_code = :errorCode,
           error_message = :errorMessage,
           last_error_code = :errorCode
       WHERE id = :id
         AND status NOT IN ('success', 'fail', 'canceled')`,
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
           error_message = :errorMessage,
           last_error_code = :errorCode
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
           response_json = :responseJson,
           finished_at = CASE WHEN :isTerminal THEN CURRENT_TIMESTAMP(3) ELSE finished_at END
       WHERE task_id = :id
         AND is_winner = 1`,
      {
        id,
        status: patch.status,
        responseJson: patch.resultJson ? JSON.stringify(patch.resultJson) : null,
        isTerminal: ["success", "fail", "canceled"].includes(patch.status),
      },
    );
  }

  async listKieTaskRecords(taskId: string) {
    const rows = await this.query<KieTaskRecordRow[]>(
      `SELECT * FROM kie_task_records WHERE task_id = :taskId ORDER BY attempt_no ASC, created_at ASC`,
      { taskId },
    );
    return rows.map(mapKieRecordRow);
  }

  async recordFallbackStarted(input: {
    taskId: string;
    kieTaskId: string;
    kieAccountHash: string;
    model: string;
    requestJson: unknown;
    responseJson: unknown;
  }) {
    await this.execute(
      `UPDATE generation_tasks
       SET status = 'generating',
           active_model = :model,
           fallback_started_at = COALESCE(fallback_started_at, CURRENT_TIMESTAMP(3)),
           attempt_count = GREATEST(attempt_count, 2),
           poll_failure_count = 0,
           last_error_code = NULL
       WHERE id = :taskId
         AND status NOT IN ('success', 'fail', 'canceled')`,
      input as unknown as Record<string, unknown>,
    );

    await this.execute(
      `INSERT INTO kie_task_records
        (id, task_id, kie_task_id, kie_account_hash, status, request_json, response_json, attempt_no, model, role)
       VALUES
        (:id, :taskId, :kieTaskId, :kieAccountHash, 'queued', :requestJson, :responseJson, 2, :model, 'fallback')
       ON DUPLICATE KEY UPDATE
        kie_task_id = VALUES(kie_task_id),
        kie_account_hash = VALUES(kie_account_hash),
        status = VALUES(status),
        request_json = VALUES(request_json),
        response_json = VALUES(response_json),
        model = VALUES(model),
        updated_at = CURRENT_TIMESTAMP(3)`,
      {
        id: createId("kie_record"),
        ...input,
        requestJson: JSON.stringify(input.requestJson),
        responseJson: JSON.stringify(input.responseJson),
      },
    );
  }

  async markPollFailure(id: string, errorCode: string) {
    await this.execute(
      `UPDATE generation_tasks
       SET poll_failure_count = poll_failure_count + 1,
           last_kie_poll_at = CURRENT_TIMESTAMP(3),
           last_error_code = :errorCode
       WHERE id = :id
         AND status NOT IN ('success', 'fail', 'canceled')`,
      { id, errorCode },
    );
  }

  async markPollSuccess(id: string) {
    await this.execute(
      `UPDATE generation_tasks
       SET poll_failure_count = 0,
           last_kie_poll_at = CURRENT_TIMESTAMP(3),
           last_error_code = NULL
       WHERE id = :id
         AND status NOT IN ('success', 'fail', 'canceled')`,
      { id },
    );
  }

  async updateKieRecord(input: {
    taskId: string;
    role: "primary" | "fallback";
    status: TaskStatus;
    responseJson?: unknown;
    isWinner?: boolean;
  }) {
    await this.execute(
      `UPDATE kie_task_records
       SET status = :status,
           response_json = :responseJson,
           is_winner = CASE WHEN :isWinner THEN 1 ELSE is_winner END,
           finished_at = CASE WHEN :isTerminal THEN CURRENT_TIMESTAMP(3) ELSE finished_at END
       WHERE task_id = :taskId
         AND role = :role`,
      {
        ...input,
        responseJson: input.responseJson ? JSON.stringify(input.responseJson) : null,
        isWinner: input.isWinner === true,
        isTerminal: ["success", "fail", "canceled"].includes(input.status),
      },
    );
  }

  async markWinner(input: {
    taskId: string;
    role: "primary" | "fallback";
    model?: string | null;
  }) {
    await this.execute(
      `UPDATE kie_task_records
       SET is_winner = CASE WHEN role = :role THEN 1 ELSE 0 END
       WHERE task_id = :taskId`,
      input as unknown as Record<string, unknown>,
    );
    await this.execute(
      `UPDATE generation_tasks
       SET winning_model = :model,
           active_model = :model,
           poll_failure_count = 0,
           last_error_code = NULL
       WHERE id = :taskId`,
      {
        taskId: input.taskId,
        model: input.model ?? null,
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
export type NormalizedTaskResult = {
  url: string;
  sourceUrl?: string;
  localPath?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
};

export const normalizeTaskResults = (value: unknown): NormalizedTaskResult[] => {
  const parsed = parseJsonValue<unknown>(value, []);

  if (Array.isArray(parsed)) return parsed as NormalizedTaskResult[];

  // Long-video tasks persist their completed output as { resultUrl, ... } rather
  // than the array shape used by the shared generation-task history API.
  if (
    parsed &&
    typeof parsed === "object" &&
    typeof (parsed as { resultUrl?: unknown }).resultUrl === "string"
  ) {
    const result = parsed as { resultUrl: string; thumbnailUrl?: unknown };
    return [
      {
        url: result.resultUrl,
        thumbnailUrl:
          typeof result.thumbnailUrl === "string" ? result.thumbnailUrl : undefined,
      },
    ];
  }

  // Progress and failed tasks may store metadata objects (for example { phase }).
  // They have no renderable output, but must not break the whole recent-task list.
  return [];
};
