import fs from "node:fs/promises";
import path from "node:path";

import { env } from "../../config/env";
import { kieClient } from "../../providers/kie/kieClient";
import { kieKeyPool } from "../../providers/kie/kieKeyPool";
import { errors } from "../../shared/errors";
import { createId } from "../../shared/ids";
import type { OutputRatio, Resolution } from "../../shared/types";
import { assetsRepository, type AssetRecord } from "../assets/assetsRepository";
import { assetsService } from "../assets/assetsService";
import { normalizeTaskResults, tasksRepository, type GenerationTaskRecord } from "../tasks/tasksRepository";
import { creativeImageRepository } from "./creativeImageRepository";
import type {
  CreateConversationRequest,
  CreateGenerationRequest,
  CreativeConversationRecord,
  CreativeGenerationMode,
  CreativeMessageRecord,
} from "./creativeImageTypes";

const defaultUserId = "default_user";
const resultPublicPrefix = `${env.publicBaseUrl.replace(/\/$/, "")}/results/creative-image/`;

const normalizeRatio = (value: OutputRatio | undefined): OutputRatio => value ?? "1:1";
const normalizeResolution = (value: Resolution | undefined): Resolution => value ?? "2K";

const assertPrompt = (prompt: string | undefined) => {
  const normalized = prompt?.trim();
  if (!normalized) throw errors.invalidParameter("prompt is required");
  return normalized;
};

const isImageAsset = (asset: AssetRecord) => asset.mimeType.startsWith("image/");

class CreativeImageService {
  async createConversation(body: CreateConversationRequest) {
    const title = body.title?.trim() || "新的创意生图";
    const conversation = await creativeImageRepository.createConversation({
      userId: defaultUserId,
      title,
    });
    return this.toConversationResponse(conversation);
  }

  async listConversations(input: { page?: number; pageSize?: number }) {
    const page = Math.max(Number(input.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(input.pageSize ?? 20), 1), 100);
    const listed = await creativeImageRepository.listConversations({
      userId: defaultUserId,
      page,
      pageSize,
    });
    return {
      items: listed.items.map((item) => this.toConversationResponse(item)),
      page,
      pageSize,
      total: listed.total,
    };
  }

  async getConversation(conversationId: string) {
    const conversation = await this.requireConversation(conversationId);
    return this.toConversationResponse(conversation);
  }

  async listMessages(conversationId: string) {
    await this.requireConversation(conversationId);
    const messages = await creativeImageRepository.listMessages(conversationId);
    const taskIds = Array.from(
      new Set(messages.map((message) => message.taskId).filter((id): id is string => Boolean(id))),
    );
    const tasks = await tasksRepository.findByIds(taskIds);
    const resultUrlByTaskId = new Map<string, string | null>();
    for (const task of tasks) {
      const results = normalizeTaskResults(task.resultJson);
      resultUrlByTaskId.set(task.id, results[0]?.url ?? null);
    }
    return {
      items: messages.map((message) =>
        this.toMessageResponse(
          message,
          message.taskId ? resultUrlByTaskId.get(message.taskId) ?? null : null,
        ),
      ),
    };
  }

  async uploadAsset(conversationId: string, file: Express.Multer.File | undefined, purpose: string | undefined) {
    await this.requireConversation(conversationId);
    if (purpose !== "car_exterior") {
      throw errors.invalidParameter("creative-image asset purpose must be car_exterior", { purpose });
    }
    if (!file) {
      throw errors.invalidParameter("file is required");
    }

    const asset = await assetsService.saveUploadedFile(file, "car_exterior");
    const linked = await creativeImageRepository.addConversationAsset({
      conversationId,
      assetId: asset.id,
      role: "reference",
    });

    return {
      ...assetsService.toResponse(asset),
      conversationAssetId: linked.id,
      conversationId,
      role: linked.role,
    };
  }

  async createGeneration(conversationId: string, body: CreateGenerationRequest) {
    await this.requireConversation(conversationId);
    const prompt = assertPrompt(body.prompt);
    const outputRatio = normalizeRatio(body.outputRatio);
    const resolution = normalizeResolution(body.resolution);
    const reference = await this.resolveReference(conversationId, body);
    const taskId = createId("task");

    await creativeImageRepository.createMessage({
      conversationId,
      role: "user",
      content: prompt,
      referenceAssetId: reference.assetId,
      sourceTaskId: body.sourceTaskId ?? null,
      sourceImageUrl: body.sourceImageUrl ?? null,
      generationMode: reference.mode,
      metadataJson: {
        outputRatio,
        resolution,
      },
    });

    await tasksRepository.createWaitingTask({
      id: taskId,
      moduleCode: "creative-image",
      inputAssetId: reference.assetId,
      optionId: reference.mode,
      outputRatio,
      resolution,
      logoAssetId: null,
      prompt,
    });

    const lease = await kieKeyPool.acquire();
    try {
      const kieTask =
        reference.mode === "text_to_image"
          ? await kieClient.createTextToImageTaskWithLease(lease, {
              prompt,
              aspectRatio: outputRatio,
              resolution,
            })
          : await this.createImageTaskWithReference(lease, {
              prompt,
              outputRatio,
              resolution,
              reference,
            });

      await tasksRepository.markSubmitted({
        id: taskId,
        kieTaskId: kieTask.kieTaskId,
        kieAccountHash: kieTask.accountHash,
        requestJson: {
          model:
            reference.mode === "text_to_image"
              ? "gpt-image-2-text-to-image"
              : "gpt-image-2-image-to-image",
          moduleCode: "creative-image",
          generationMode: reference.mode,
          prompt,
          referenceAssetId: reference.assetId,
          sourceTaskId: body.sourceTaskId ?? null,
          sourceImageUrl: body.sourceImageUrl ?? null,
          aspectRatio: outputRatio,
          resolution,
        },
        responseJson: kieTask.raw,
      });

      await creativeImageRepository.createMessage({
        conversationId,
        role: "assistant",
        content: "已创建生成任务，正在处理中。",
        taskId,
        referenceAssetId: reference.assetId,
        sourceTaskId: body.sourceTaskId ?? null,
        sourceImageUrl: body.sourceImageUrl ?? null,
        generationMode: reference.mode,
        metadataJson: {
          kieTaskId: kieTask.kieTaskId,
          outputRatio,
          resolution,
        },
      });

      return {
        conversationId,
        taskId,
        moduleCode: "creative-image",
        status: "queued",
        progress: 5,
        kieTaskId: kieTask.kieTaskId,
        generationMode: reference.mode,
        referenceAssetId: reference.assetId,
        sourceTaskId: body.sourceTaskId ?? null,
        sourceImageUrl: body.sourceImageUrl ?? null,
        outputRatio,
        resolution,
        pollingUrl: `/api/v1/tasks/${taskId}`,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      await tasksRepository.markFailed(
        taskId,
        "CREATIVE_IMAGE_CREATE_FAILED",
        error instanceof Error ? error.message : "creative-image task creation failed",
      );
      await creativeImageRepository.createMessage({
        conversationId,
        role: "assistant",
        content: "生成任务创建失败，请稍后重试。",
        taskId,
        referenceAssetId: reference.assetId,
        sourceTaskId: body.sourceTaskId ?? null,
        sourceImageUrl: body.sourceImageUrl ?? null,
        generationMode: reference.mode,
        metadataJson: {
          error: error instanceof Error ? error.message : "creative-image task creation failed",
        },
      });
      throw error;
    }
  }

  private async createImageTaskWithReference(
    lease: Awaited<ReturnType<typeof kieKeyPool.acquire>>,
    input: {
      prompt: string;
      outputRatio: OutputRatio;
      resolution: Resolution;
      reference: Awaited<ReturnType<CreativeImageService["resolveReference"]>>;
    },
  ) {
    if (!input.reference.localPath) {
      throw errors.invalidParameter("reference image is required");
    }

    const uploadedReference = await kieClient.uploadLocalFileWithLease(
      lease,
      input.reference.localPath,
      "used-car-platform/creative-image",
    );

    return kieClient.createImageToImageTaskWithLease(lease, {
      prompt: input.prompt,
      inputUrls: [uploadedReference.fileUrl],
      aspectRatio: input.outputRatio,
      resolution: input.resolution,
    });
  }

  private async resolveReference(
    conversationId: string,
    body: CreateGenerationRequest,
  ): Promise<{
    mode: CreativeGenerationMode;
    assetId: string | null;
    localPath: string | null;
  }> {
    if (body.sourceTaskId || body.sourceImageUrl) {
      if (!body.sourceTaskId || !body.sourceImageUrl) {
        throw errors.invalidParameter("sourceTaskId and sourceImageUrl are required together");
      }
      const sourceTask = await tasksRepository.findById(body.sourceTaskId);
      if (!sourceTask) throw errors.taskNotFound();
      if (sourceTask.moduleCode !== "creative-image") {
        throw errors.invalidParameter("sourceTaskId must belong to creative-image");
      }
      const localPath = await this.resolveResultLocalPath(sourceTask, body.sourceImageUrl);
      return {
        mode: "revise",
        assetId: sourceTask.inputAssetId ?? null,
        localPath,
      };
    }

    if (body.referenceAssetId) {
      const asset = await this.requireImageAsset(body.referenceAssetId);
      return {
        mode: "image_to_image",
        assetId: asset.id,
        localPath: asset.localPath,
      };
    }

    if (body.useLastReference) {
      const lastReference = await creativeImageRepository.findLastReferenceAsset(conversationId);
      if (!lastReference) {
        throw errors.invalidParameter("no reference asset in this conversation");
      }
      const asset = await this.requireImageAsset(lastReference.assetId);
      return {
        mode: "image_to_image",
        assetId: asset.id,
        localPath: asset.localPath,
      };
    }

    return {
      mode: "text_to_image",
      assetId: null,
      localPath: null,
    };
  }

  private async resolveResultLocalPath(task: GenerationTaskRecord, sourceImageUrl: string) {
    const results = normalizeTaskResults(task.resultJson);
    const matched = results.find((result) => result.url === sourceImageUrl || result.sourceUrl === sourceImageUrl);
    if (!matched) {
      throw errors.invalidParameter("sourceImageUrl is not a result of sourceTaskId");
    }
    if (matched.localPath) {
      return matched.localPath;
    }
    const publicBase = env.publicBaseUrl.replace(/\/$/, "");
    if (!sourceImageUrl.startsWith(resultPublicPrefix)) {
      throw errors.invalidParameter("sourceImageUrl must be a creative-image result url");
    }
    const relativePath = sourceImageUrl.slice(publicBase.length).replace(/^\//, "");
    const localPath = path.join(env.rootDir, "storage", relativePath);
    await fs.access(localPath);
    return localPath;
  }

  private async requireConversation(conversationId: string) {
    const conversation = await creativeImageRepository.findConversationById(conversationId);
    if (!conversation) {
      throw errors.creativeConversationNotFound();
    }
    return conversation;
  }

  private async requireImageAsset(assetId: string) {
    const asset = await assetsRepository.findById(assetId);
    if (!asset) throw errors.assetNotFound();
    if (!isImageAsset(asset)) {
      throw errors.invalidParameter("reference asset must be an image", {
        assetId: asset.id,
        mimeType: asset.mimeType,
      });
    }
    return asset;
  }

  private toConversationResponse(conversation: CreativeConversationRecord) {
    return {
      conversationId: conversation.id,
      title: conversation.title,
      status: conversation.status,
      lastMessage: conversation.lastMessage,
      lastTaskId: conversation.lastTaskId,
      lastResultUrl: conversation.lastResultUrl,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }

  private toMessageResponse(message: CreativeMessageRecord, resultUrl: string | null = null) {
    return {
      messageId: message.id,
      conversationId: message.conversationId,
      role: message.role,
      content: message.content,
      taskId: message.taskId,
      referenceAssetId: message.referenceAssetId,
      sourceTaskId: message.sourceTaskId,
      sourceImageUrl: message.sourceImageUrl,
      generationMode: message.generationMode,
      metadata: message.metadataJson,
      resultUrl,
      createdAt: message.createdAt.toISOString(),
    };
  }
}

export const creativeImageService = new CreativeImageService();
