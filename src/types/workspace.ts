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
  title: string
  status: 'waiting' | 'queue' | 'generating' | 'success' | 'fail'
  createdAt: string
  thumbnail?: string
  previewImage?: string
  ratioLabel?: string
  sceneLabel?: string
  imageWidth?: number
  imageHeight?: number
}

export interface WorkspaceGenerateResult {
  createdAt: string
  statusText: string
  ratioLabel: string
  previewImage: string
  previewAlt: string
  downloadUrl: string
  imageWidth?: number
  imageHeight?: number
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
  recent: WorkspaceRecentItem[]
  requirements: string[]
  cost: number
  balance: number
  actionLabel: string
}

export interface WorkspaceMenuItem {
  code: string
  icon: string
  label: string
  tag: string
  tagType: WorkspaceTagType
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
  interiorEnhance: boolean
  updatedAt: string
}

export type BatchVisualTemplateInput = Omit<BatchVisualTemplate, 'id' | 'updatedAt'>
