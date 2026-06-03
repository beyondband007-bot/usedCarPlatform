export type WorkspaceCapabilityKind = 'scene' | 'beauty' | 'interior' | 'batch' | 'delivery' | 'future'
export type WorkspaceCapabilityBlock = 'selector' | 'scene-settings' | 'actions'

export type WorkspaceTagType = 'default' | 'success' | 'warning' | 'info'

export interface WorkspaceOption {
  id: string
  title: string
  image: string
  description?: string
}

export interface WorkspaceTutorialStep {
  title: string
  image?: string
  text?: string
}

export interface WorkspaceRecentItem {
  id: string
  taskId?: string
  moduleCode?: string
  title: string
  status: 'waiting' | 'queued' | 'queue' | 'generating' | 'success' | 'fail' | 'canceled'
  createdAt: string
  updatedAt?: string
  thumbnail?: string
  previewImage?: string
  downloadUrl?: string
  ratioLabel?: string
  sceneLabel?: string
  outputRatio?: string
  inputAssetId?: string
  inputAssetThumbnailUrl?: string
  inputAssetUrl?: string
  progress?: number
  resultCount?: number
  error?: string
  imageWidth?: number
  imageHeight?: number
}

export interface WorkspaceGenerateResult {
  taskId?: string
  createdAt: string
  statusText: string
  ratioLabel: string
  mediaType?: 'image' | 'video'
  previewImage: string
  previewVideo?: string
  previewAlt: string
  downloadUrl: string
  resultImages?: Array<{ url: string; sourceUrl?: string }>
  imageWidth?: number
  imageHeight?: number
  caption?: string
}

export interface CreativeThreadTurn {
  id: string
  prompt: string
  taskId?: string | null
  resultUrl?: string | null
  ratioLabel?: string
  createdAt?: string
  isGenerating?: boolean
  isLoadingImage?: boolean
}

/** 通用大图预览面板数据，可用于生成结果、成片交付等场景 */
export interface WorkspaceImagePreview {
  createdAt: string
  statusText: string
  ratioLabel: string
  imageUrl: string
  imageAlt: string
  downloadUrl: string
  imageWidth?: number
  imageHeight?: number
}

export type WorkspaceDeliveryTaskPreviewAssetStatus = 'ready' | 'pending'

export interface WorkspaceDeliveryTaskPreviewAsset {
  id: string
  title: string
  ratio: string
  status: WorkspaceDeliveryTaskPreviewAssetStatus
  /** 占位图叠层文案，如「待生成」「生成中」 */
  pendingStatusText?: string
  createdAt?: string
  imageUrl?: string
  thumbnailUrl?: string
  generationTaskId?: string
  width?: number
  height?: number
}

export interface WorkspaceDeliveryTaskPreview {
  id: string
  title: string
  meta: string
  image: string
  previewImage?: string
  progress: number
  imageCount: number
  totalCount: number
  completedCount: number
  assets: WorkspaceDeliveryTaskPreviewAsset[]
}

export interface WorkspaceGeneratePayload {
  inputAssetId?: string
  assetIds?: string[]
  outputRatio: string
  resolution?: string
  optionId?: string
  sceneReferenceImageUrl?: string
  useLogo?: boolean
  logoAssetId?: string
  colorCode?: string
  prompt?: string
}

export type WorkspaceBatchItemKind =
  | 'exterior'
  | 'interior'
  | 'interior_clean'
  | 'interior_collage'
  | 'interior_clean_collage'

export interface WorkspaceBatchActiveItem {
  itemId: string
  groupTitle: string
  itemKind: WorkspaceBatchItemKind
  status: WorkspaceRecentItem['status']
  progress: number
  thumbnail?: string
}

export interface WorkspaceBatchActiveJob {
  batchId: string
  projectName: string
  previewUrl: string
  createdAt: string
  status: WorkspaceRecentItem['status']
  total: number
  completed: number
  failed: number
  progress: number
  items: WorkspaceBatchActiveItem[]
}

export interface WorkspaceBatchCreatedPayload {
  batchId: string
  projectName: string
  previewUrl: string
  createdAt: string
  status: WorkspaceRecentItem['status']
  total: number
  completed: number
  failed: number
  progress: number
}

export interface WorkspaceCapability {
  code: string
  apiCode: string
  kind: WorkspaceCapabilityKind
  groupTitle: string
  icon: string
  label: string
  tag: string
  tagType: WorkspaceTagType
  title: string
  description: string
  uploadTitle: string
  uploadHint: string
  accept: string
  requiredLabel: string
  selectorTitle?: string
  selectorTag?: string
  middleBlocks?: WorkspaceCapabilityBlock[]
  options: WorkspaceOption[]
  tutorial: WorkspaceTutorialStep[]
  requirements: string[]
  cost: number
  balance: number
  actionLabel: string
}

export type WorkspaceMenuTagVariant =
  | 'available'
  | 'demo'
  | 'package'
  | 'planned'
  | 'beta'

export interface WorkspaceMenuItem {
  code: string
  icon: string
  label: string
  tag: string
  tagType?: WorkspaceTagType
  tagVariant?: WorkspaceMenuTagVariant
  disabled?: boolean
}

export interface WorkspaceMenuGroup {
  title: string
  items: WorkspaceMenuItem[]
}

export interface WorkspaceTemplateRecommendation {
  title: string
  image: string
  capabilityCode: string
  optionId: string
}

export interface BatchVisualTemplate {
  id: string
  name: string
  enableSceneChange: boolean
  sceneIndex: number
  sceneCategory: string
  outputRatio: string
  useRecentLogo: boolean
  lightConsistency: boolean
  paintRefresh: boolean
  colorCode?: string | null
  interiorEnhance: boolean
  interiorCollage: boolean
  updatedAt: string
}

export type BatchVisualTemplateInput = Omit<BatchVisualTemplate, 'id' | 'updatedAt'>
