import type { RowDataPacket } from "mysql2";

import { Repository } from "../../db/repository";

export type LanguageConversionStatus = "processing" | "success" | "failed";

export interface LanguageConversionTaskRecord {
  id: string;
  userId: string;
  status: LanguageConversionStatus;
  progress: number;
  sourceLanguage: string;
  targetLanguage: string;
  sourceDurationSeconds: number;
  billableMinutes: number;
  sourceFileName: string;
  sourceVideoUrl: string;
  resultVideoUrl?: string | null;
  localResultPath?: string | null;
  mpsTaskId?: string | null;
  outputBucket?: string | null;
  creditsUserId?: number | null;
  creditsTenantId?: number | null;
  accountScope?: "personal" | "tenant" | null;
  billingTaskId?: number | null;
  billingStatus?: string | null;
  estimatedPoints?: string | null;
  settledPoints?: string | null;
  errorMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface LanguageConversionTaskRow extends RowDataPacket {
  id: string;
  user_id: string;
  status: LanguageConversionStatus;
  progress: number;
  source_language: string;
  target_language: string;
  source_duration_seconds: number;
  billable_minutes: number;
  source_file_name: string;
  source_video_url: string;
  result_video_url: string | null;
  local_result_path: string | null;
  mps_task_id: string | null;
  output_bucket: string | null;
  credits_user_id: number | null;
  credits_tenant_id: number | null;
  account_scope: "personal" | "tenant" | null;
  billing_task_id: number | null;
  billing_status: string | null;
  estimated_points: string | null;
  settled_points: string | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

const mapRow = (row: LanguageConversionTaskRow): LanguageConversionTaskRecord => ({
  id: row.id,
  userId: row.user_id,
  status: row.status,
  progress: row.progress,
  sourceLanguage: row.source_language,
  targetLanguage: row.target_language,
  sourceDurationSeconds: Number(row.source_duration_seconds ?? 60),
  billableMinutes: Number(row.billable_minutes ?? 1),
  sourceFileName: row.source_file_name,
  sourceVideoUrl: row.source_video_url,
  resultVideoUrl: row.result_video_url,
  localResultPath: row.local_result_path,
  mpsTaskId: row.mps_task_id,
  outputBucket: row.output_bucket,
  creditsUserId: row.credits_user_id,
  creditsTenantId: row.credits_tenant_id,
  accountScope: row.account_scope,
  billingTaskId: row.billing_task_id,
  billingStatus: row.billing_status,
  estimatedPoints: row.estimated_points,
  settledPoints: row.settled_points,
  errorMessage: row.error_message,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class LanguageConversionRepository extends Repository {
  async create(input: Omit<LanguageConversionTaskRecord, "createdAt" | "updatedAt">) {
    await this.execute(
      `INSERT INTO language_conversion_tasks
        (id, user_id, status, progress, source_language, target_language,
         source_duration_seconds, billable_minutes, source_file_name, source_video_url,
         result_video_url, local_result_path, mps_task_id, output_bucket,
         credits_user_id, credits_tenant_id, account_scope, billing_task_id,
         billing_status, estimated_points, settled_points, error_message)
       VALUES
        (:id, :userId, :status, :progress, :sourceLanguage, :targetLanguage,
         :sourceDurationSeconds, :billableMinutes, :sourceFileName, :sourceVideoUrl,
         :resultVideoUrl, :localResultPath, :mpsTaskId, :outputBucket,
         :creditsUserId, :creditsTenantId, :accountScope, :billingTaskId,
         :billingStatus, :estimatedPoints, :settledPoints, :errorMessage)`,
      {
        ...input,
        resultVideoUrl: input.resultVideoUrl ?? null,
        localResultPath: input.localResultPath ?? null,
        mpsTaskId: input.mpsTaskId ?? null,
        outputBucket: input.outputBucket ?? null,
        creditsUserId: input.creditsUserId ?? null,
        creditsTenantId: input.creditsTenantId ?? null,
        accountScope: input.accountScope ?? null,
        billingTaskId: input.billingTaskId ?? null,
        billingStatus: input.billingStatus ?? null,
        estimatedPoints: input.estimatedPoints ?? null,
        settledPoints: input.settledPoints ?? null,
        errorMessage: input.errorMessage ?? null,
      },
    );
    return this.findById(input.id);
  }

  async findById(id: string, userId?: string) {
    const rows = await this.query<LanguageConversionTaskRow[]>(
      userId
        ? `SELECT *
           FROM language_conversion_tasks
           WHERE id = :id AND user_id = :userId
           LIMIT 1`
        : `SELECT *
           FROM language_conversion_tasks
           WHERE id = :id
           LIMIT 1`,
      userId ? { id, userId } : { id },
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async listByUserId(userId: string) {
    const rows = await this.query<LanguageConversionTaskRow[]>(
      `SELECT *
       FROM language_conversion_tasks
       WHERE user_id = :userId
       ORDER BY created_at DESC`,
      { userId },
    );
    return rows.map(mapRow);
  }

  async failStaleProcessing(staleBefore: Date, errorMessage: string) {
    await this.execute(
      `UPDATE language_conversion_tasks
       SET status = 'failed',
           progress = 100,
           error_message = :errorMessage
       WHERE status = 'processing'
         AND updated_at < :staleBefore`,
      { staleBefore, errorMessage },
    );
  }

  async failInterruptedProcessing(errorMessage: string) {
    await this.execute(
      `UPDATE language_conversion_tasks
       SET status = 'failed',
           progress = 100,
           error_message = :errorMessage
       WHERE status = 'processing'`,
      { errorMessage },
    );
  }

  async updateIfProcessing(
    id: string,
    patch: Partial<Omit<LanguageConversionTaskRecord, "id" | "userId" | "createdAt" | "updatedAt">>,
  ) {
    const fields: string[] = [];
    const params: Record<string, unknown> = { id };

    if (patch.status !== undefined) {
      fields.push("status = :status");
      params.status = patch.status;
    }
    if (patch.progress !== undefined) {
      fields.push("progress = GREATEST(progress, :progress)");
      params.progress = patch.progress;
    }
    if (patch.sourceLanguage !== undefined) {
      fields.push("source_language = :sourceLanguage");
      params.sourceLanguage = patch.sourceLanguage;
    }
    if (patch.targetLanguage !== undefined) {
      fields.push("target_language = :targetLanguage");
      params.targetLanguage = patch.targetLanguage;
    }
    if (patch.sourceDurationSeconds !== undefined) {
      fields.push("source_duration_seconds = :sourceDurationSeconds");
      params.sourceDurationSeconds = patch.sourceDurationSeconds;
    }
    if (patch.billableMinutes !== undefined) {
      fields.push("billable_minutes = :billableMinutes");
      params.billableMinutes = patch.billableMinutes;
    }
    if (patch.sourceFileName !== undefined) {
      fields.push("source_file_name = :sourceFileName");
      params.sourceFileName = patch.sourceFileName;
    }
    if (patch.sourceVideoUrl !== undefined) {
      fields.push("source_video_url = :sourceVideoUrl");
      params.sourceVideoUrl = patch.sourceVideoUrl;
    }
    if (patch.resultVideoUrl !== undefined) {
      fields.push("result_video_url = :resultVideoUrl");
      params.resultVideoUrl = patch.resultVideoUrl;
    }
    if (patch.localResultPath !== undefined) {
      fields.push("local_result_path = :localResultPath");
      params.localResultPath = patch.localResultPath;
    }
    if (patch.mpsTaskId !== undefined) {
      fields.push("mps_task_id = :mpsTaskId");
      params.mpsTaskId = patch.mpsTaskId;
    }
    if (patch.outputBucket !== undefined) {
      fields.push("output_bucket = :outputBucket");
      params.outputBucket = patch.outputBucket;
    }
    if (patch.creditsUserId !== undefined) {
      fields.push("credits_user_id = :creditsUserId");
      params.creditsUserId = patch.creditsUserId;
    }
    if (patch.creditsTenantId !== undefined) {
      fields.push("credits_tenant_id = :creditsTenantId");
      params.creditsTenantId = patch.creditsTenantId;
    }
    if (patch.accountScope !== undefined) {
      fields.push("account_scope = :accountScope");
      params.accountScope = patch.accountScope;
    }
    if (patch.billingTaskId !== undefined) {
      fields.push("billing_task_id = :billingTaskId");
      params.billingTaskId = patch.billingTaskId;
    }
    if (patch.billingStatus !== undefined) {
      fields.push("billing_status = :billingStatus");
      params.billingStatus = patch.billingStatus;
    }
    if (patch.estimatedPoints !== undefined) {
      fields.push("estimated_points = :estimatedPoints");
      params.estimatedPoints = patch.estimatedPoints;
    }
    if (patch.settledPoints !== undefined) {
      fields.push("settled_points = :settledPoints");
      params.settledPoints = patch.settledPoints;
    }
    if (patch.errorMessage !== undefined) {
      fields.push("error_message = :errorMessage");
      params.errorMessage = patch.errorMessage;
    }

    if (!fields.length) return this.findById(id);

    await this.execute(
      `UPDATE language_conversion_tasks
       SET ${fields.join(", ")}
       WHERE id = :id
         AND status = 'processing'`,
      params,
    );
    return this.findById(id);
  }

  async update(id: string, patch: Partial<Omit<LanguageConversionTaskRecord, "id" | "userId" | "createdAt" | "updatedAt">>) {
    const fields: string[] = [];
    const params: Record<string, unknown> = { id };

    if (patch.status !== undefined) {
      fields.push("status = :status");
      params.status = patch.status;
    }
    if (patch.progress !== undefined) {
      fields.push("progress = GREATEST(progress, :progress)");
      params.progress = patch.progress;
    }
    if (patch.sourceLanguage !== undefined) {
      fields.push("source_language = :sourceLanguage");
      params.sourceLanguage = patch.sourceLanguage;
    }
    if (patch.targetLanguage !== undefined) {
      fields.push("target_language = :targetLanguage");
      params.targetLanguage = patch.targetLanguage;
    }
    if (patch.sourceDurationSeconds !== undefined) {
      fields.push("source_duration_seconds = :sourceDurationSeconds");
      params.sourceDurationSeconds = patch.sourceDurationSeconds;
    }
    if (patch.billableMinutes !== undefined) {
      fields.push("billable_minutes = :billableMinutes");
      params.billableMinutes = patch.billableMinutes;
    }
    if (patch.sourceFileName !== undefined) {
      fields.push("source_file_name = :sourceFileName");
      params.sourceFileName = patch.sourceFileName;
    }
    if (patch.sourceVideoUrl !== undefined) {
      fields.push("source_video_url = :sourceVideoUrl");
      params.sourceVideoUrl = patch.sourceVideoUrl;
    }
    if (patch.resultVideoUrl !== undefined) {
      fields.push("result_video_url = :resultVideoUrl");
      params.resultVideoUrl = patch.resultVideoUrl;
    }
    if (patch.localResultPath !== undefined) {
      fields.push("local_result_path = :localResultPath");
      params.localResultPath = patch.localResultPath;
    }
    if (patch.mpsTaskId !== undefined) {
      fields.push("mps_task_id = :mpsTaskId");
      params.mpsTaskId = patch.mpsTaskId;
    }
    if (patch.outputBucket !== undefined) {
      fields.push("output_bucket = :outputBucket");
      params.outputBucket = patch.outputBucket;
    }
    if (patch.creditsUserId !== undefined) {
      fields.push("credits_user_id = :creditsUserId");
      params.creditsUserId = patch.creditsUserId;
    }
    if (patch.creditsTenantId !== undefined) {
      fields.push("credits_tenant_id = :creditsTenantId");
      params.creditsTenantId = patch.creditsTenantId;
    }
    if (patch.accountScope !== undefined) {
      fields.push("account_scope = :accountScope");
      params.accountScope = patch.accountScope;
    }
    if (patch.billingTaskId !== undefined) {
      fields.push("billing_task_id = :billingTaskId");
      params.billingTaskId = patch.billingTaskId;
    }
    if (patch.billingStatus !== undefined) {
      fields.push("billing_status = :billingStatus");
      params.billingStatus = patch.billingStatus;
    }
    if (patch.estimatedPoints !== undefined) {
      fields.push("estimated_points = :estimatedPoints");
      params.estimatedPoints = patch.estimatedPoints;
    }
    if (patch.settledPoints !== undefined) {
      fields.push("settled_points = :settledPoints");
      params.settledPoints = patch.settledPoints;
    }
    if (patch.errorMessage !== undefined) {
      fields.push("error_message = :errorMessage");
      params.errorMessage = patch.errorMessage;
    }

    if (!fields.length) return this.findById(id);

    await this.execute(
      `UPDATE language_conversion_tasks
       SET ${fields.join(", ")}
       WHERE id = :id`,
      params,
    );
    return this.findById(id);
  }
}

export const languageConversionRepository = new LanguageConversionRepository();
