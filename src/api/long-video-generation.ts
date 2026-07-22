import { normalizeApiErrorMessage, request } from '@/api/http'
import type { ApiResponse } from '@/api/visual-workbench'
import type {
  CreateLongVideoDraftPayload,
  CreateLongVideoTaskPayload,
  LongVideoAudioPreview,
  LongVideoDraft,
  LongVideoTask,
  UpdateLongVideoSegmentsPayload,
} from '@/types/long-video-generation'
import { normalizeMediaUrl } from '@/utils/media-url'

function unwrapApiResponse<T>(response: ApiResponse<T>) {
  if (response.code !== 0) {
    throw new Error(normalizeApiErrorMessage(response.message || 'request failed'))
  }
  return response.data
}

const generationRequestConfig = {
  timeout: 0,
}

function normalizeAudioPreview(preview: LongVideoAudioPreview): LongVideoAudioPreview {
  return {
    ...preview,
    segments: preview.segments.map((segment) => ({
      ...segment,
      audioUrl: normalizeMediaUrl(segment.audioUrl) ?? segment.audioUrl,
    })),
  }
}

function normalizeLongVideoTask(task: LongVideoTask): LongVideoTask {
  return {
    ...task,
    resultUrl: normalizeMediaUrl(task.resultUrl),
    renderPlan: {
      ...task.renderPlan,
      sequence: task.renderPlan.sequence.map((segment) => ({
        ...segment,
        audioUrl: normalizeMediaUrl(segment.audioUrl) ?? segment.audioUrl,
        seedance: segment.seedance
          ? {
              ...segment.seedance,
              referenceAudioUrl:
                normalizeMediaUrl(segment.seedance.referenceAudioUrl) ?? segment.seedance.referenceAudioUrl,
            }
          : segment.seedance,
        userVideo: segment.userVideo
          ? {
              ...segment.userVideo,
              sourceUrl: normalizeMediaUrl(segment.userVideo.sourceUrl) ?? segment.userVideo.sourceUrl,
            }
          : segment.userVideo,
      })),
    },
  }
}

export async function createLongVideoDraft(payload: CreateLongVideoDraftPayload) {
  const response = await request.post<ApiResponse<LongVideoDraft>>(
    '/modules/long-video-generation/drafts',
    payload,
    generationRequestConfig,
  )
  return unwrapApiResponse(response)
}

export async function getLongVideoDraft(draftId: string) {
  const response = await request.get<ApiResponse<LongVideoDraft>>(
    `/modules/long-video-generation/drafts/${encodeURIComponent(draftId)}`,
  )
  return unwrapApiResponse(response)
}

export async function updateLongVideoDraftSegments(
  draftId: string,
  payload: UpdateLongVideoSegmentsPayload,
) {
  const response = await request.patch<ApiResponse<LongVideoDraft>>(
    `/modules/long-video-generation/drafts/${encodeURIComponent(draftId)}/segments`,
    payload,
    generationRequestConfig,
  )
  return unwrapApiResponse(response)
}

export async function createLongVideoAudioPreview(draftId: string) {
  const response = await request.post<ApiResponse<LongVideoAudioPreview>>(
    `/modules/long-video-generation/drafts/${encodeURIComponent(draftId)}/audio-preview`,
    {},
    generationRequestConfig,
  )
  return normalizeAudioPreview(unwrapApiResponse(response))
}

export async function getLongVideoAudioPreview(audioPreviewId: string) {
  const response = await request.get<ApiResponse<LongVideoAudioPreview>>(
    `/modules/long-video-generation/audio-previews/${encodeURIComponent(audioPreviewId)}`,
  )
  return normalizeAudioPreview(unwrapApiResponse(response))
}

export async function createLongVideoTask(
  draftId: string,
  payload: CreateLongVideoTaskPayload,
) {
  const response = await request.post<ApiResponse<LongVideoTask>>(
    `/modules/long-video-generation/drafts/${encodeURIComponent(draftId)}/tasks`,
    payload,
    generationRequestConfig,
  )
  return unwrapApiResponse(response)
}

export async function getLongVideoTask(taskId: string) {
  const response = await request.get<ApiResponse<LongVideoTask>>(
    `/modules/long-video-generation/tasks/${encodeURIComponent(taskId)}`,
  )
  return normalizeLongVideoTask(unwrapApiResponse(response))
}

export async function retryLongVideoTask(taskId: string) {
  const response = await request.post<ApiResponse<LongVideoTask>>(
    `/modules/long-video-generation/tasks/${encodeURIComponent(taskId)}/retry`,
    {},
    generationRequestConfig,
  )
  return unwrapApiResponse(response)
}
