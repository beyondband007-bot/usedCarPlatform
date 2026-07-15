import { normalizeApiErrorMessage, request } from '@/api/http'
import type {
  CreateLanguageConversionPayload,
  LanguageConversionTask,
} from '@/types/language-conversion'
import type { ApiResponse } from '@/api/visual-workbench'
import { parseLanguageConversionBillingPoints } from '@/utils/language-conversion-billing'
import { normalizeMediaUrl } from '@/utils/media-url'

function unwrapApiResponse<T>(response: ApiResponse<T>) {
  if (response.code !== 0) {
    throw new Error(normalizeApiErrorMessage(response.message || 'request failed'))
  }
  return response.data
}

function normalizeTask(task: LanguageConversionTask): LanguageConversionTask {
  const estimatedCost =
    parseLanguageConversionBillingPoints(task.estimatedCost)
    ?? parseLanguageConversionBillingPoints(task.estimatedPoints)

  return {
    ...task,
    estimatedCost,
    sourceVideoUrl: normalizeMediaUrl(task.sourceVideoUrl) ?? task.sourceVideoUrl,
    resultVideoUrl: normalizeMediaUrl(task.resultVideoUrl),
  }
}

export async function createLanguageConversionTask(
  payload: CreateLanguageConversionPayload & { sourceFile: File },
) {
  const form = new FormData()
  form.append('file', payload.sourceFile)
  form.append('sourceFileName', payload.sourceFileName)
  form.append('sourceLanguage', payload.sourceLanguage)
  form.append('targetLanguage', payload.targetLanguage)
  form.append('preserveSpeakerVoice', String(payload.preserveSpeakerVoice))
  form.append('preserveBackgroundAudio', String(payload.preserveBackgroundAudio))
  if (payload.sourceDurationSeconds != null) {
    form.append('sourceDurationSeconds', String(payload.sourceDurationSeconds))
  }

  const response = await request.post<ApiResponse<LanguageConversionTask>>(
    '/modules/language-conversion/tasks',
    form,
    { timeout: 0 },
  )
  return normalizeTask(unwrapApiResponse(response))
}

export async function listLanguageConversionTasks() {
  const response = await request.get<ApiResponse<LanguageConversionTask[]>>(
    '/modules/language-conversion/tasks',
    { timeout: 0 },
  )
  return unwrapApiResponse(response).map(normalizeTask)
}

export async function getLanguageConversionTask(taskId: string) {
  const response = await request.get<ApiResponse<LanguageConversionTask>>(
    `/modules/language-conversion/tasks/${encodeURIComponent(taskId)}`,
    { timeout: 0 },
  )
  return normalizeTask(unwrapApiResponse(response))
}
