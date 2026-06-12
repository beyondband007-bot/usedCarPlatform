import { normalizeApiErrorMessage, request } from '@/api/http'
import type { ApiResponse, GenerationTaskStatus } from '@/api/visual-workbench'

export interface VideoDigitalHuman {
  id: string
  previewUrl: string
  title?: string
}

export interface VideoReferenceMaterial {
  id: string
  title: string
  previewUrl: string
  styleTags?: string[]
}

export interface VideoScriptShotCue {
  startSecond?: number
  endSecond?: number
  label?: string
  description?: string
  [key: string]: unknown
}

export interface VideoScriptVehicleProfile {
  [key: string]: unknown
}

export interface VideoScriptDraftScript {
  vehicleProfile?: VideoScriptVehicleProfile
  scriptText?: string
  shotCues?: VideoScriptShotCue[]
  generator?: string
}

export interface VideoScriptDraftRequiredInputs {
  digitalHuman?: Record<string, unknown>
  referenceMaterial?: Record<string, unknown>
  script?: VideoScriptDraftScript
  uploadedReferences?: Record<string, unknown>
}

export interface CreateVideoScriptDraftPayload {
  vehicleName: string
  digitalHumanId: string
  referenceMaterialId: string
  vehicleExteriorAssetIds: string[]
  vehicleInteriorAssetIds?: string[]
  userReferenceAssetIds?: string[]
  durationSeconds?: number
  sellingPointHints?: string[]
  vehicleImageSummary?: string
}

export interface VideoScriptDraft {
  scriptDraftId: string
  status: string
  vehicleName: string
  durationSeconds: number
  outputRatio: string
  videoResolution: string
  requiredInputs: VideoScriptDraftRequiredInputs
  finalVideoPrompt: string
  riskNotes: string[]
}

export interface CreatedVideoGenerationTask {
  taskId: string
  scriptDraftId: string
  moduleCode: string
  status: GenerationTaskStatus
  progress: number
  kieTaskId?: string
  model?: string
  durationSeconds?: number
  outputRatio?: string
  videoResolution?: string
  generateAudio?: boolean
  inputReferenceCount?: number
  mediaSummary?: {
    digitalHumanCount?: number
    styleVideoCount?: number
    exteriorImageCount?: number
    interiorImageCount?: number
    userReferenceImageCount?: number
  }
  pollingUrl?: string
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

export async function getVideoDigitalHumans() {
  const response = await request.get<ApiResponse<{ items: VideoDigitalHuman[] }>>(
    '/modules/video-generation/digital-humans',
  )
  return unwrapApiResponse(response)
}

export async function getVideoReferenceMaterials() {
  const response = await request.get<
    ApiResponse<{ items: VideoReferenceMaterial[] }>
  >('/modules/video-generation/reference-materials')
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

export async function createVideoGenerationTask(payload: { scriptDraftId: string }) {
  const response = await request.post<ApiResponse<CreatedVideoGenerationTask>>(
    '/modules/video-generation/tasks',
    payload,
    generationRequestConfig,
  )
  return unwrapApiResponse(response)
}
