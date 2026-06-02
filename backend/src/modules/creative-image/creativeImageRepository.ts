import type { RowDataPacket } from "mysql2";

import { Repository } from "../../db/repository";
import { createId } from "../../shared/ids";
import { parseJsonValue } from "../tasks/taskJson";
import type {
  CreativeConversationAssetRecord,
  CreativeConversationRecord,
  CreativeGenerationMode,
  CreativeMessageRecord,
} from "./creativeImageTypes";

interface ConversationRow extends RowDataPacket {
  id: string;
  user_id: string;
  title: string;
  status: string;
  last_message: string | null;
  last_task_id: string | null;
  last_result_url: string | null;
  created_at: Date;
  updated_at: Date;
  first_user_content?: string | null;
}

const resolveConversationTitle = (row: ConversationRow) => {
  const firstUserContent = row.first_user_content?.trim();
  if (firstUserContent) return firstUserContent;
  return row.title;
};

const mapConversation = (row: ConversationRow): CreativeConversationRecord => ({
  id: row.id,
  userId: row.user_id,
  title: resolveConversationTitle(row),
  status: row.status,
  lastMessage: row.last_message,
  lastTaskId: row.last_task_id,
  lastResultUrl: row.last_result_url,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapMessage = (row: MessageRow): CreativeMessageRecord => ({
  id: row.id,
  conversationId: row.conversation_id,
  role: row.role,
  content: row.content,
  taskId: row.task_id,
  referenceAssetId: row.reference_asset_id,
  sourceTaskId: row.source_task_id,
  sourceImageUrl: row.source_image_url,
  generationMode: row.generation_mode,
  metadataJson: parseJsonValue(row.metadata_json, null),
  createdAt: row.created_at,
});

const mapConversationAsset = (row: ConversationAssetRow): CreativeConversationAssetRecord => ({
  id: row.id,
  conversationId: row.conversation_id,
  assetId: row.asset_id,
  role: row.role,
  createdAt: row.created_at,
});

interface MessageRow extends RowDataPacket {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  task_id: string | null;
  reference_asset_id: string | null;
  source_task_id: string | null;
  source_image_url: string | null;
  generation_mode: CreativeGenerationMode | null;
  metadata_json: unknown;
  created_at: Date;
}

interface ConversationAssetRow extends RowDataPacket {
  id: string;
  conversation_id: string;
  asset_id: string;
  role: string;
  created_at: Date;
}

export class CreativeImageRepository extends Repository {
  private conversationSelectSql = `
    SELECT c.*,
      (SELECT m.content
       FROM creative_messages m
       WHERE m.conversation_id = c.id AND m.role = 'user'
       ORDER BY m.created_at ASC
       LIMIT 1) AS first_user_content
    FROM creative_conversations c
  `;
  async createConversation(input: { userId: string; title: string }) {
    const id = createId("creative_conv");
    await this.execute(
      `INSERT INTO creative_conversations (id, user_id, title, status)
       VALUES (:id, :userId, :title, 'active')`,
      { id, ...input },
    );
    const conversation = await this.findConversationById(id);
    if (!conversation) throw new Error("creative conversation create failed");
    return conversation;
  }

  async findConversationById(id: string) {
    const rows = await this.query<ConversationRow[]>(
      `${this.conversationSelectSql} WHERE c.id = :id LIMIT 1`,
      { id },
    );
    return rows[0] ? mapConversation(rows[0]) : null;
  }

  async listConversations(input: { userId: string; page: number; pageSize: number }) {
    const params = {
      userId: input.userId,
      limit: input.pageSize,
      offset: (input.page - 1) * input.pageSize,
    };
    const rows = await this.query<ConversationRow[]>(
      `${this.conversationSelectSql}
       WHERE c.user_id = :userId
       ORDER BY c.updated_at DESC
       LIMIT :limit OFFSET :offset`,
      params,
    );
    const totalRows = await this.query<Array<RowDataPacket & { total: number }>>(
      `SELECT COUNT(*) total FROM creative_conversations WHERE user_id = :userId`,
      params,
    );
    return {
      items: rows.map(mapConversation),
      total: Number(totalRows[0]?.total ?? 0),
    };
  }

  async addConversationAsset(input: { conversationId: string; assetId: string; role: string }) {
    const id = createId("creative_asset");
    await this.execute(
      `INSERT INTO creative_conversation_assets (id, conversation_id, asset_id, role)
       VALUES (:id, :conversationId, :assetId, :role)`,
      { id, ...input },
    );
    await this.touchConversation(input.conversationId);
    return {
      id,
      conversationId: input.conversationId,
      assetId: input.assetId,
      role: input.role,
      createdAt: new Date(),
    };
  }

  async findLastReferenceAsset(conversationId: string) {
    const rows = await this.query<ConversationAssetRow[]>(
      `SELECT * FROM creative_conversation_assets
       WHERE conversation_id = :conversationId AND role = 'reference'
       ORDER BY created_at DESC
       LIMIT 1`,
      { conversationId },
    );
    return rows[0] ? mapConversationAsset(rows[0]) : null;
  }

  async countUserMessages(conversationId: string) {
    const rows = await this.query<Array<RowDataPacket & { total: number }>>(
      `SELECT COUNT(*) total
       FROM creative_messages
       WHERE conversation_id = :conversationId AND role = 'user'`,
      { conversationId },
    );
    return Number(rows[0]?.total ?? 0);
  }

  async createMessage(input: {
    conversationId: string;
    role: "user" | "assistant";
    content: string;
    taskId?: string | null;
    referenceAssetId?: string | null;
    sourceTaskId?: string | null;
    sourceImageUrl?: string | null;
    generationMode?: CreativeGenerationMode | null;
    metadataJson?: unknown;
  }) {
    const id = createId("creative_msg");
    await this.execute(
      `INSERT INTO creative_messages
        (id, conversation_id, role, content, task_id, reference_asset_id, source_task_id, source_image_url, generation_mode, metadata_json)
       VALUES
        (:id, :conversationId, :role, :content, :taskId, :referenceAssetId, :sourceTaskId, :sourceImageUrl, :generationMode, :metadataJson)`,
      {
        id,
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        taskId: input.taskId ?? null,
        referenceAssetId: input.referenceAssetId ?? null,
        sourceTaskId: input.sourceTaskId ?? null,
        sourceImageUrl: input.sourceImageUrl ?? null,
        generationMode: input.generationMode ?? null,
        metadataJson: input.metadataJson ? JSON.stringify(input.metadataJson) : null,
      },
    );
    const isFirstUserMessage =
      input.role === "user" && (await this.countUserMessages(input.conversationId)) === 0;
    await this.updateConversationSummary({
      conversationId: input.conversationId,
      ...(input.role === "user" ? { lastMessage: input.content } : {}),
      ...(input.taskId ? { lastTaskId: input.taskId } : {}),
      ...(isFirstUserMessage ? { title: input.content.trim().slice(0, 255) } : {}),
    });
    const messages = await this.listMessages(input.conversationId);
    return messages.find((message) => message.id === id) ?? null;
  }

  async listMessages(conversationId: string) {
    const rows = await this.query<MessageRow[]>(
      `SELECT * FROM creative_messages
       WHERE conversation_id = :conversationId
       ORDER BY created_at ASC`,
      { conversationId },
    );
    return rows.map(mapMessage);
  }

  async updateConversationSummary(input: {
    conversationId: string;
    title?: string | null;
    lastMessage?: string | null;
    lastTaskId?: string | null;
    lastResultUrl?: string | null;
    resetLastResultUrl?: boolean;
  }) {
    await this.execute(
      `UPDATE creative_conversations
       SET title = COALESCE(:title, title),
           last_message = COALESCE(:lastMessage, last_message),
           last_task_id = COALESCE(:lastTaskId, last_task_id),
           last_result_url = CASE
             WHEN :resetLastResultUrl THEN NULL
             ELSE COALESCE(:lastResultUrl, last_result_url)
           END
       WHERE id = :conversationId`,
      {
        conversationId: input.conversationId,
        title: input.title ?? null,
        lastMessage: input.lastMessage ?? null,
        lastTaskId: input.lastTaskId ?? null,
        lastResultUrl: input.lastResultUrl ?? null,
        resetLastResultUrl: input.resetLastResultUrl ? 1 : 0,
      },
    );
  }

  async touchConversation(conversationId: string) {
    await this.execute(
      `UPDATE creative_conversations SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = :conversationId`,
      { conversationId },
    );
  }

  async findConversationIdByTaskId(taskId: string) {
    const rows = await this.query<Array<RowDataPacket & { conversation_id: string }>>(
      `SELECT conversation_id FROM creative_messages WHERE task_id = :taskId LIMIT 1`,
      { taskId },
    );
    return rows[0]?.conversation_id ?? null;
  }

  async syncConversationResultByTaskId(taskId: string, lastResultUrl: string) {
    const conversationId = await this.findConversationIdByTaskId(taskId);
    if (!conversationId) return;
    await this.updateConversationSummary({ conversationId, lastResultUrl, lastTaskId: taskId });
  }
}

export const creativeImageRepository = new CreativeImageRepository();
