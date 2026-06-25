import type { GenerationTaskStatus } from '@/api/visual-workbench'

export type VideoTemplateType =
  | 'single-car'
  | 'promotion'
  | 'dealership'
  | 'market'
  | 'vehicle-ad'

export type VideoTemplateStyle =
  | 'calm'
  | 'lively'
  | 'professional'
  | 'humorous'

export type VideoGenerationLanguage = string

export type VideoTaskStatus = GenerationTaskStatus

export type VideoWorkflowStage =
  | 'preparing_assets'
  | 'queued'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'canceled'

export type VideoAssetPurpose =
  | 'car_exterior'
  | 'car_interior'
  | 'video_reference_image'

export interface CarBrandSeriesItem {
  name: string
  childrenName: string[]
}

export interface VideoTemplateInputRequirement {
  key: string
  label: string
  type: 'text' | 'asset_ids' | 'digital_human' | 'language'
  required: boolean
  minCount?: number
  maxCount?: number
  minLength?: number
  maxLength?: number
  acceptedPurposes?: string[]
  options?: Array<{ value: string; label: string }>
  placeholder?: string
}

export interface VideoTemplate {
  id: string
  templateId: string
  referenceMaterialId?: string
  title: string
  type: VideoTemplateType
  typeLabel: string
  style: VideoTemplateStyle
  styleLabel: string
  badge: 'hot' | 'new' | null
  description?: string
  thumbnailUrl: string
  previewUrl?: string
  stylePrompt: string
  previewSubtitle?: string
  scenePrompt?: string
  shotPlan15s?: Array<{
    timeRange: string
    visual: string
    assetRole?: string
  }>
  durationSeconds: number
  durationLabel?: string
  outputRatio: string
  videoResolution: string
  inputRequirements: VideoTemplateInputRequirement[]
  requiredFields: string[]
  optionalFields: string[]
  status?: 'available' | 'coming_soon'
  generationReadiness?: 'ready' | 'unavailable'
  reason?: string
}

export interface VideoTemplateCapability {
  type: VideoTemplateType
  label: string
  status: 'available' | 'coming_soon'
  generationReadiness: 'ready' | 'unavailable'
  reason?: string
}

export interface VideoWorkflowContract {
  contractVersion: number
  fixedOutput: {
    durationSeconds: number
    resolution: string
    language?: VideoGenerationLanguage
    languageMode?: string
  }
  outputRatioPolicy?: {
    mode: 'template_locked'
    supportedRatios: Array<'16:9' | '9:16'>
  }
  supportedLanguages: Array<{
    value: VideoGenerationLanguage
    label: string
    status: string
  }>
  templateCapabilities: VideoTemplateCapability[]
  workflow: Array<{ step: string; endpoint: string }>
}

export interface DigitalHuman {
  id: string
  name: string
  gender?: string
  ageStyle?: string
  previewUrl: string
  imageUrl?: string
  voiceStatus: 'ready' | 'not_configured'
  voiceModel?: string | null
}

export interface DigitalHumanVoice {
  digitalHumanId: string
  status: 'ready' | 'not_configured'
  voiceId: string | null
  model?: string | null
  sourceFileName?: string | null
  updatedAt?: string | null
  source?: string | null
}

export interface VideoVoiceOption {
  id: string
  label: string
  gender: 'female' | 'male' | string
  provider: 'minimax' | string
  model: string
  tags: string[]
  recommended?: boolean
}

export interface VideoVoiceOptionsResult {
  digitalHumanId: string
  digitalHumanGender: 'female' | 'male' | string
  items: VideoVoiceOption[]
  total: number
}

export interface VideoAudioPreview {
  audioPreviewId: string
  scriptDraftId: string
  status: 'ready' | 'too_long' | 'too_short'
  audioUrl: string
  durationMs: number
  minDurationMs: number
  maxDurationMs: number
  scriptText: string
  voiceId: string
  voiceLabel: string
  voiceGender: 'female' | 'male' | string
  model: string
  createdAt: string
  canUseForVideo: boolean
}

export interface OptimizeNarrationRequest {
  scriptText: string
  voiceId: string
  baselineAudioPreviewId?: string
}

export interface OptimizeNarrationResult {
  scriptDraftId: string
  scriptText: string
  preview: VideoAudioPreview
  attempts: number
  converged: boolean
}

export interface TranslateNarrationRequest {
  scriptText: string
}

export interface TranslateNarrationResult {
  scriptDraftId: string
  scriptText: string
  targetLanguage: 'Chinese'
}

export interface UploadedAsset {
  assetId: string
  purpose: string
  url: string
  thumbnailUrl?: string | null
  fileName: string
  mimeType: string
  size: number
}

export interface VideoUploadPreviewItem {
  id: string
  name: string
  previewUrl: string
  status: 'uploading' | 'success' | 'fail'
  asset?: UploadedAsset
  objectUrl?: string
  error?: string
}

export interface ValidateTemplateInputsIssue {
  field: string
  code: string
  message: string
}

export interface ValidateTemplateInputsResult {
  templateId: string
  templateType: VideoTemplateType
  valid: boolean
  issues: ValidateTemplateInputsIssue[]
}

export interface VideoScriptShotCue {
  startSecond?: number
  endSecond?: number
  label?: string
  description?: string
  [key: string]: unknown
}

export interface VideoScriptVehicleProfile {
  brand?: string
  modelYear?: string
  displacement?: string
  salesName?: string
  series?: string
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
  template?: Record<string, unknown>
  vehicle?: Record<string, unknown>
}

export interface SingleCarFormData {
  brand: string
  modelYear: string
  displacement: string
  salesName: string
  series: string
  digitalHumanId: string
  language: VideoGenerationLanguage
  sellingPointHints: string
  vehicleImageSummary: string
}

export interface PromotionFormData extends SingleCarFormData {
  promotionText: string
}

export interface DealershipFormData {
  dealershipName: string
  digitalHumanId: string
  language: VideoGenerationLanguage
  featuredVehicleNames: string
}

export type VideoFormData = SingleCarFormData | PromotionFormData | DealershipFormData

export interface CreateVideoScriptDraftPayload {
  templateId: string
  templateType?: VideoTemplateType
  digitalHumanId: string
  language: VideoGenerationLanguage
  durationSeconds?: number
  brand?: string
  modelYear?: string
  displacement?: string
  salesName?: string
  series?: string
  vehicleExteriorAssetIds?: string[]
  vehicleInteriorAssetIds?: string[]
  userReferenceAssetIds?: string[]
  sellingPointHints?: string[]
  vehicleImageSummary?: string
  promotionText?: string
  dealershipName?: string
  dealershipImageAssetIds?: string[]
  featuredVehicleNames?: string
  /** @deprecated Legacy short-video panel compatibility */
  vehicleName?: string
  /** @deprecated Legacy short-video panel compatibility */
  referenceMaterialId?: string
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
  templateId?: string
  templateType?: VideoTemplateType
}

export interface VideoResultItem {
  url: string
  thumbnail?: string
  thumbnailUrl?: string | null
  downloadUrl?: string
  width?: number
  height?: number
}

export interface VideoGenerationTask {
  taskId: string
  scriptDraftId?: string | null
  templateId?: string | null
  templateType?: VideoTemplateType | null
  moduleCode: string
  title?: string
  vehicleName?: string | null
  status: VideoTaskStatus
  workflowStage?: VideoWorkflowStage | null
  progress: number
  pollingRecommendedMs?: number
  pollingUrl?: string
  thumbnail?: string | null
  downloadUrl?: string | null
  previewVideo?: string | null
  videoUrl?: string | null
  resultVideos?: VideoResultItem[]
  resultImages?: Array<{ url: string; thumbnail?: string }>
  error?: {
    code?: string
    message?: string
  } | null
  outputRatio?: string
  resolution?: string
  createdAt?: string
  updatedAt?: string
  language?: VideoGenerationLanguage
  billingTaskId?: number | string | null
  billingStatus?: string | null
  estimatedCost?: number | null
  estimatedPoints?: string | null
  settledPoints?: string | null
  narrationAudio?: {
    provider?: string
    model?: string | null
    voiceId?: string | null
    voiceLabel?: string | null
    audioPreviewId?: string | null
    durationMs?: number | null
    speed?: number | null
    language?: VideoGenerationLanguage | null
    url?: string | null
  } | null
}

export interface VideoHistoryItem extends VideoGenerationTask {}

export interface VideoHistoryListResult {
  items: VideoHistoryItem[]
  total: number
  page: number
  pageSize: number
}

export type VideoGenerationStep =
  | 'template'
  | 'form'
  | 'review'
  | 'task'
  | 'result'
