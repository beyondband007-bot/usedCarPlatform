import { request } from '@/api/http'

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  requestId: string
}

export interface UploadedAsset {
  assetId: string
  purpose: string
  url: string
  fileName: string
  mimeType: string
  size: number
}

export type AssetPurpose = 'car_exterior' | 'car_interior' | 'logo'

export interface UserLogoSetting {
  userId: string
  logoAssetId: string
  logo: UploadedAsset
  updatedAt: string
}

export type GenerationTaskStatus =
  | 'waiting'
  | 'queued'
  | 'generating'
  | 'success'
  | 'fail'
  | 'canceled'

export interface CreateGenerationTaskPayload {
  inputAssetId: string | null
  optionId?: string
  useLogo?: boolean
  colorCode?: string
  outputRatio?: string
  resolution?: string
  userId?: number | string
  creditsUserId?: number | string
  tenantId?: number | string
  creditsTenantId?: number | string
  accountScope?: 'personal' | 'tenant'
  extra?: Record<string, unknown>
}

export interface CreatedGenerationTask {
  taskId: string
  moduleCode: string
  status: GenerationTaskStatus
  progress: number
  kieTaskId?: string
  optionId?: string
  sceneTitle?: string
  sceneReferenceImageUrl?: string
  logoAssetId?: string | null
  colorCode?: string | null
  inputImageCount: number
  billingTaskId?: number | null
  billingStatus?: string | null
  estimatedCost?: number | null
  estimatedPoints?: string | null
  pollingUrl: string
  createdAt: string
}

export interface GenerationResultImage {
  url: string
  sourceUrl?: string
  localPath?: string
  contentType?: string
  size?: number
}

export interface GenerationTaskDetail {
  taskId: string
  moduleCode: string
  status: GenerationTaskStatus
  progress: number
  kieTaskId?: string
  inputAssetId: string
  optionId?: string
  outputRatio: string
  resolution: string
  resultImages: GenerationResultImage[]
  billingTaskId?: number | null
  billingStatus?: string | null
  estimatedPoints?: string | null
  settledPoints?: string | null
  error: {
    code?: string
    message?: string
  } | null
  createdAt?: string
  updatedAt?: string
}

export interface CreativeImageConversation {
  conversationId: string
  title: string
  status: 'active' | string
  lastMessage: string | null
  lastTaskId: string | null
  lastResultUrl: string | null
  lastReferenceAssetId?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreativeImageMessage {
  messageId: string
  conversationId: string
  role: string
  prompt: string
  taskId: string
  referenceAssetId: string | null
  sourceTaskId: string | null
  sourceImageUrl: string | null
  generationMode: 'text_to_image' | 'image_to_image' | 'revise'
  createdAt: string
}

export interface CreateCreativeGenerationPayload {
  prompt: string
  referenceAssetId?: string
  useLastReference?: boolean
  sourceTaskId?: string
  sourceImageUrl?: string
  outputRatio?: string
  resolution?: string
}

export interface CreatedCreativeGeneration extends CreatedGenerationTask {
  conversationId: string
  generationMode: 'text_to_image' | 'image_to_image' | 'revise'
  referenceAssetId: string | null
  sourceTaskId: string | null
  sourceImageUrl: string | null
}

export interface BatchVisualConfig {
  enableSceneChange: boolean
  sceneOptionId?: string
  sceneIndex: number
  sceneCategory: string
  outputRatio: string
  useRecentLogo: boolean
  enableLightConsistency: boolean
  enablePaintRefresh: boolean
  enableInteriorClean: boolean
}

export interface BatchPreset {
  presetId: string
  userId?: string
  name: string
  visualConfig: BatchVisualConfig
  createdAt?: string
  updatedAt: string
}

export interface BatchPresetList {
  items: BatchPreset[]
}

export interface CreateBatchTaskPayload {
  projectName: string
  presetId: string
  carGroups: Array<{
    groupTitle: string
    exteriorAssetIds: string[]
    interiorAssetIds?: string[]
  }>
  visualConfig: BatchVisualConfig
}

export interface CreatedBatchTask {
  batchId: string
  projectName: string
  status: GenerationTaskStatus
  total: number
  completed: number
  failed: number
  progress: number
  pollingUrl: string
  estimatedCost: number
  balance: number
  createdAt: string
}

export interface BatchTaskDetailItem {
  itemId: string
  groupTitle: string
  itemKind: 'exterior' | 'interior'
  inputAssetId: string
  generationTaskId: string
  status: GenerationTaskStatus
  progress: number
  resultCount: number
  error?: { message?: string | null } | null
}

export interface BatchTaskDetail {
  batchId: string
  projectName: string
  presetId: string
  status: GenerationTaskStatus
  total: number
  completed: number
  failed: number
  progress: number
  assetCount: number
  items: BatchTaskDetailItem[]
  createdAt: string
  updatedAt: string
}

export interface DeliveryTaskItem {
  taskId: string
  taskType: 'batch'
  title: string
  status: GenerationTaskStatus
  progress: number
  total: number
  completed: number
  failed: number
  assetCount: number
  downloadableAssetCount: number
  downloadPackageStatus: GenerationTaskStatus | null
  latestPackageId: string | null
  createdAt: string
  updatedAt: string
}

export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export interface DeliveryAsset {
  assetId: string
  sourceTaskId: string
  title: string
  url: string
  thumbnailUrl?: string | null
  ratio: string
  width?: number | null
  height?: number | null
  localPath?: string | null
  createdAt: string
}

export interface DeliveryPackage {
  packageId: string
  taskId?: string | null
  packageName?: string
  status: GenerationTaskStatus
  progress: number
  assetIds?: string[]
  downloadUrl: string | null
  pollingUrl?: string
  expiresAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface RecentGenerationTask {
  id: string
  taskId: string
  moduleCode: string
  title: string
  status: GenerationTaskStatus | 'queued'
  uiStatus?: 'waiting' | 'queue' | 'queued' | 'generating' | 'success' | 'fail' | 'canceled'
  progress?: number
  createdAt: string
  updatedAt?: string
  thumbnail?: string | null
  previewImage?: string | null
  downloadUrl?: string | null
  ratioLabel?: string | null
  sceneLabel?: string | null
  outputRatio?: string | null
  inputAssetId?: string | null
  inputAssetUrl?: string | null
  resultCount?: number | null
  billingTaskId?: number | null
  billingStatus?: string | null
  estimatedPoints?: string | null
  settledPoints?: string | null
  error?: string | { code?: string; message?: string } | null
}

function unwrapApiResponse<T>(response: ApiResponse<T>) {
  if (response.code !== 0) {
    throw new Error(response.message || 'request failed')
  }

  return response.data
}

export async function uploadCarExterior(file: File) {
  return uploadAsset(file, 'car_exterior')
}

export async function uploadAsset(file: File, purpose: AssetPurpose) {
  const formData = new FormData()
  formData.append('purpose', purpose)
  formData.append('file', file)

  const response = await request.post<ApiResponse<UploadedAsset>>(
    '/assets/upload',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )

  return unwrapApiResponse(response)
}

export async function getDefaultLogo() {
  const response = await request.get<ApiResponse<UserLogoSetting | null>>('/user/logo')
  return unwrapApiResponse(response)
}

export async function uploadDefaultLogo(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await request.post<ApiResponse<UserLogoSetting>>(
    '/user/logo',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )

  return unwrapApiResponse(response)
}

export async function createGenerationTask(
  moduleCode: string,
  payload: CreateGenerationTaskPayload,
) {
  const response = await request.post<ApiResponse<CreatedGenerationTask>>(
    `/modules/${moduleCode}/tasks`,
    payload,
  )

  return unwrapApiResponse(response)
}

export async function createCreativeImageConversation(payload?: { title?: string }) {
  const response = await request.post<ApiResponse<CreativeImageConversation>>(
    '/modules/creative-image/conversations',
    payload ?? {},
  )
  return unwrapApiResponse(response)
}

export async function getCreativeImageConversations(params?: {
  page?: number
  pageSize?: number
}) {
  const response = await request.get<ApiResponse<PagedResult<CreativeImageConversation>>>(
    '/modules/creative-image/conversations',
    { params },
  )
  return unwrapApiResponse(response)
}

export async function getCreativeImageConversation(conversationId: string) {
  const response = await request.get<ApiResponse<CreativeImageConversation>>(
    `/modules/creative-image/conversations/${encodeURIComponent(conversationId)}`,
  )
  return unwrapApiResponse(response)
}

export async function getCreativeImageMessages(conversationId: string) {
  const response = await request.get<ApiResponse<{ items: CreativeImageMessage[] }>>(
    `/modules/creative-image/conversations/${encodeURIComponent(conversationId)}/messages`,
  )
  return unwrapApiResponse(response)
}

export async function uploadCreativeImageReference(conversationId: string, file: File) {
  const formData = new FormData()
  formData.append('purpose', 'car_exterior')
  formData.append('file', file)

  const response = await request.post<ApiResponse<UploadedAsset>>(
    `/modules/creative-image/conversations/${encodeURIComponent(conversationId)}/assets`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return unwrapApiResponse(response)
}

export async function createCreativeImageGeneration(
  conversationId: string,
  payload: CreateCreativeGenerationPayload,
) {
  const response = await request.post<ApiResponse<CreatedCreativeGeneration>>(
    `/modules/creative-image/conversations/${encodeURIComponent(conversationId)}/generations`,
    payload,
  )
  return unwrapApiResponse(response)
}

export async function getGenerationTask(taskId: string) {
  const response = await request.get<ApiResponse<GenerationTaskDetail>>(`/tasks/${taskId}`)
  return unwrapApiResponse(response)
}

export async function getRecentGenerationTasks(params?: {
  moduleCode?: string
  status?: string
  page?: number
  pageSize?: number
  scope?: 'all'
}) {
  if (params?.moduleCode) {
    const { moduleCode, ...query } = params
    const response = await request.get<ApiResponse<PagedResult<RecentGenerationTask>>>(
      `/modules/${encodeURIComponent(moduleCode)}/recent-tasks`,
      { params: query },
    )
    return unwrapApiResponse(response)
  }

  const response = await request.get<ApiResponse<PagedResult<RecentGenerationTask>>>('/tasks', {
    params,
  })
  return unwrapApiResponse(response)
}

export async function getBatchPresets() {
  const response = await request.get<ApiResponse<BatchPresetList>>('/modules/batch-new/presets')
  return unwrapApiResponse(response)
}

export async function saveBatchPreset(payload: {
  presetId?: string
  name: string
  visualConfig: BatchVisualConfig
}) {
  const response = await request.post<ApiResponse<BatchPreset>>('/modules/batch-new/presets', payload)
  return unwrapApiResponse(response)
}

export async function createBatchTask(payload: CreateBatchTaskPayload) {
  const response = await request.post<ApiResponse<CreatedBatchTask>>('/modules/batch-new/tasks', payload)
  return unwrapApiResponse(response)
}

export async function getBatchTaskDetail(batchId: string) {
  const response = await request.get<ApiResponse<BatchTaskDetail>>(`/modules/batch-new/tasks/${batchId}`)
  return unwrapApiResponse(response)
}

export async function getDeliveryTasks(params?: {
  status?: string
  page?: number
  pageSize?: number
}) {
  const response = await request.get<ApiResponse<PagedResult<DeliveryTaskItem>>>(
    '/modules/delivery/tasks',
    { params },
  )
  return unwrapApiResponse(response)
}

export async function getDeliveryTaskAssets(taskId: string, params?: {
  ratio?: string
  page?: number
  pageSize?: number
}) {
  const response = await request.get<ApiResponse<PagedResult<DeliveryAsset>>>(
    `/modules/delivery/tasks/${taskId}/assets`,
    { params },
  )
  return unwrapApiResponse(response)
}

export async function createDeliveryPackage(payload: {
  taskId: string
  packageName: string
  assetIds: string[]
}) {
  const response = await request.post<ApiResponse<DeliveryPackage>>('/modules/delivery/packages', payload)
  return unwrapApiResponse(response)
}

export async function deleteDeliveryAssets(assetIds: string[]) {
  const response = await request.delete<ApiResponse<{ deleted: string[]; failed: string[] }>>(
    '/modules/delivery/assets',
    { data: { assetIds } },
  )
  return unwrapApiResponse(response)
}
