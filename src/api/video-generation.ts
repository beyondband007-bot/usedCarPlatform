import { normalizeApiErrorMessage, request } from '@/api/http'
import type { ApiResponse } from '@/api/visual-workbench'
import { normalizeMediaUrl } from '@/utils/media-url'
import type {
  CreateVideoScriptDraftPayload,
  DigitalHuman,
  DigitalHumanVoice,
  OptimizeNarrationRequest,
  OptimizeNarrationResult,
  TranslateNarrationRequest,
  TranslateNarrationResult,
  VideoAudioPreview,
  ValidateTemplateInputsResult,
  VideoGenerationTask,
  VideoHistoryListResult,
  VideoScriptDraft,
  VideoTemplate,
  VideoVoiceOptionsResult,
  VideoWorkflowContract,
} from '@/types/video-generation'

export type {
  CreateVideoScriptDraftPayload,
  DigitalHuman,
  DigitalHumanVoice,
  OptimizeNarrationRequest,
  OptimizeNarrationResult,
  TranslateNarrationRequest,
  TranslateNarrationResult,
  VideoAudioPreview,
  VideoGenerationTask,
  VideoHistoryListResult,
  VideoScriptDraft,
  VideoTemplate,
  VideoVoiceOptionsResult,
  VideoWorkflowContract,
} from '@/types/video-generation'

export interface CreatedVideoGenerationTask {
  taskId: string
  scriptDraftId: string
  moduleCode: string
  status: VideoGenerationTask['status']
  progress: number
  pollingRecommendedMs?: number
  pollingUrl?: string
  templateId?: string | null
  billingTaskId?: number | null
  billingStatus?: string | null
  estimatedCost?: number | null
  estimatedPoints?: string | null
}

function unwrapApiResponse<T>(response: ApiResponse<T>) {
  if (response.code !== 0) {
    throw new Error(normalizeApiErrorMessage(response.message || 'request failed'))
  }
  return response.data
}

const generationRequestConfig = {
  timeout: 0,
}

function normalizeAudioPreview(preview: VideoAudioPreview): VideoAudioPreview {
  return {
    ...preview,
    audioUrl: normalizeMediaUrl(preview.audioUrl) ?? preview.audioUrl,
  }
}

function normalizeVideoTask(task: VideoGenerationTask): VideoGenerationTask {
  return {
    ...task,
    thumbnail: normalizeMediaUrl(task.thumbnail),
    downloadUrl: normalizeMediaUrl(task.downloadUrl),
    previewVideo: normalizeMediaUrl(task.previewVideo),
    videoUrl: normalizeMediaUrl(task.videoUrl),
    resultVideos: task.resultVideos?.map((item) => ({
      ...item,
      url: normalizeMediaUrl(item.url) ?? item.url,
      thumbnail: normalizeMediaUrl(item.thumbnail),
      thumbnailUrl: normalizeMediaUrl(item.thumbnailUrl),
      downloadUrl: normalizeMediaUrl(item.downloadUrl),
    })),
    resultImages: task.resultImages?.map((item) => ({
      ...item,
      url: normalizeMediaUrl(item.url) ?? item.url,
      thumbnail: normalizeMediaUrl(item.thumbnail),
    })),
    narrationAudio: task.narrationAudio
      ? { ...task.narrationAudio, url: normalizeMediaUrl(task.narrationAudio.url) }
      : task.narrationAudio,
  }
}

export async function getVideoWorkflowContract() {
  const response = await request.get<ApiResponse<VideoWorkflowContract>>(
    '/modules/video-generation/workflow-contract',
  )
  return unwrapApiResponse(response)
}

export async function getVideoTemplates(params?: {
  type?: string
  style?: string
  search?: string
}) {
  const response = await request.get<
    ApiResponse<{ items: VideoTemplate[]; total: number }>
  >('/modules/video-generation/templates', { params })
  return unwrapApiResponse(response)
}

export async function getVideoTemplate(templateId: string) {
  const response = await request.get<ApiResponse<VideoTemplate>>(
    `/modules/video-generation/templates/${encodeURIComponent(templateId)}`,
  )
  return unwrapApiResponse(response)
}

export async function validateTemplateInputs(
  templateId: string,
  payload: Record<string, unknown>,
) {
  const response = await request.post<ApiResponse<ValidateTemplateInputsResult>>(
    `/modules/video-generation/templates/${encodeURIComponent(templateId)}/validate-inputs`,
    payload,
  )
  return unwrapApiResponse(response)
}

export async function getVideoDigitalHumans() {
  const response = await request.get<ApiResponse<DigitalHuman[]>>(
    '/modules/video-generation/digital-humans',
  )
  const data = unwrapApiResponse(response)
  return Array.isArray(data) ? data : (data as { items?: DigitalHuman[] }).items ?? []
}

export async function getDigitalHumanVoice(digitalHumanId: string) {
  const response = await request.get<ApiResponse<DigitalHumanVoice>>(
    `/modules/video-generation/digital-humans/${encodeURIComponent(digitalHumanId)}/voice`,
  )
  return unwrapApiResponse(response)
}

export async function getVideoVoiceOptions(digitalHumanId: string) {
  const response = await request.get<ApiResponse<VideoVoiceOptionsResult>>(
    '/modules/video-generation/voices',
    { params: { digitalHumanId } },
  )
  return unwrapApiResponse(response)
}

export async function createVideoAudioPreview(payload: {
  scriptDraftId: string
  scriptText: string
  voiceId: string
}) {
  const response = await request.post<ApiResponse<VideoAudioPreview>>(
    '/modules/video-generation/audio-previews',
    payload,
    generationRequestConfig,
  )
  return normalizeAudioPreview(unwrapApiResponse(response))
}

export async function optimizeVideoNarration(
  scriptDraftId: string,
  payload: OptimizeNarrationRequest,
) {
  const response = await request.post<ApiResponse<OptimizeNarrationResult>>(
    `/modules/video-generation/script-drafts/${encodeURIComponent(scriptDraftId)}/optimize-narration`,
    payload,
    generationRequestConfig,
  )
  const result = unwrapApiResponse(response)
  return { ...result, preview: normalizeAudioPreview(result.preview) }
}

export async function translateVideoNarration(
  scriptDraftId: string,
  payload: TranslateNarrationRequest,
) {
  const response = await request.post<ApiResponse<TranslateNarrationResult>>(
    `/modules/video-generation/script-drafts/${encodeURIComponent(scriptDraftId)}/translate-narration`,
    payload,
    generationRequestConfig,
  )
  return unwrapApiResponse(response)
}

export async function createVideoScriptDraft(payload: CreateVideoScriptDraftPayload) {
  const response = await request.post<ApiResponse<VideoScriptDraft>>(
    '/modules/video-generation/script-drafts',
    {
      ...payload,
      durationSeconds: payload.durationSeconds ?? 15,
      vehicleInteriorAssetIds: payload.vehicleInteriorAssetIds ?? [],
      userReferenceAssetIds: payload.userReferenceAssetIds ?? [],
      sellingPointHints: payload.sellingPointHints ?? [],
    },
    generationRequestConfig,
  )
  return unwrapApiResponse(response)
}

export async function getVideoScriptDraft(scriptDraftId: string) {
  const response = await request.get<ApiResponse<VideoScriptDraft>>(
    `/modules/video-generation/script-drafts/${encodeURIComponent(scriptDraftId)}`,
  )
  return unwrapApiResponse(response)
}

export async function createVideoGenerationTask(payload: {
  scriptDraftId: string
  audioPreviewId?: string
}) {
  const response = await request.post<ApiResponse<CreatedVideoGenerationTask>>(
    '/modules/video-generation/tasks',
    payload,
    generationRequestConfig,
  )
  return unwrapApiResponse(response)
}

export async function getVideoGenerationTask(taskId: string) {
  const response = await request.get<ApiResponse<VideoGenerationTask>>(
    `/modules/video-generation/tasks/${encodeURIComponent(taskId)}`,
  )
  return normalizeVideoTask(unwrapApiResponse(response))
}

export async function getVideoGenerationTasks(params?: {
  page?: number
  pageSize?: number
  status?: string
}) {
  const response = await request.get<ApiResponse<VideoHistoryListResult>>(
    '/modules/video-generation/tasks',
    { params },
  )
  const result = unwrapApiResponse(response)
  return { ...result, items: result.items.map(normalizeVideoTask) }
}

export async function cancelVideoGenerationTask(taskId: string) {
  const response = await request.post<ApiResponse<VideoGenerationTask>>(
    `/modules/video-generation/tasks/${encodeURIComponent(taskId)}/cancel`,
    {},
    generationRequestConfig,
  )
  return unwrapApiResponse(response)
}

export async function regenerateVideoGenerationTask(taskId: string) {
  const response = await request.post<ApiResponse<CreatedVideoGenerationTask>>(
    `/modules/video-generation/tasks/${encodeURIComponent(taskId)}/regenerate`,
    {},
    generationRequestConfig,
  )
  return unwrapApiResponse(response)
}

/** @deprecated Legacy panel compatibility — new flow uses templateId instead. */
export type VideoDigitalHuman = DigitalHuman & { title?: string }

/** @deprecated Legacy panel compatibility — reference materials are no longer used. */
export interface VideoReferenceMaterial {
  id: string
  title?: string
  thumbnailUrl?: string
  previewUrl?: string
  styleTags?: string[]
}

/** @deprecated Legacy panel compatibility — returns an empty list. */
export async function getVideoReferenceMaterials() {
  return [] as VideoReferenceMaterial[]
}
