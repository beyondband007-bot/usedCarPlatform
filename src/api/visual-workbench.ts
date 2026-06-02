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
  logoAssetId?: string
  colorCode?: string
  outputRatio?: string
  resolution?: string
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
  pollingUrl: string
  createdAt: string
}

export interface InteriorCollageTaskGroup {
  groupIndex: number
  inputAssetIds: string[]
  inputImageCount: number
}

export interface CreatedInteriorCollageTask extends CreatedGenerationTask {
  groupIndex: number
  groupCount: number
  inputAssetIds: string[]
}

export interface CreatedInteriorCollageBatch {
  moduleCode: 'interior-collage'
  status: GenerationTaskStatus
  inputImageCount: number
  outputCount: number
  groups: InteriorCollageTaskGroup[]
  tasks: CreatedInteriorCollageTask[]
  createdAt: string
}

export interface CreateInteriorCollageTaskPayload {
  assetIds: string[]
  outputRatio?: string
  resolution?: string
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
  resultVideos?: GenerationResultImage[]
  videoUrl?: string
  previewVideo?: string
  downloadUrl?: string
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
  content: string
  taskId?: string | null
  referenceAssetId?: string | null
  sourceTaskId?: string | null
  sourceImageUrl?: string | null
  generationMode?: 'text_to_image' | 'image_to_image' | 'revise' | null
  metadata?: {
    outputRatio?: string
    resolution?: string
    [key: string]: unknown
  } | null
  resultUrl?: string | null
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
  colorCode?: string | null
  enableInteriorClean: boolean
  enableInteriorCollage?: boolean
  interiorCollage?: boolean
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
  /** 与 visualConfig.outputRatio 一致，供后端写入任务表 */
  outputRatio?: string
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

export type BatchTaskItemKind =
  | 'exterior'
  | 'interior'
  | 'interior_clean'
  | 'interior_collage'
  | 'interior_clean_collage'

export interface BatchTaskDetailItem {
  itemId: string
  groupTitle: string
  itemKind: BatchTaskItemKind
  inputAssetId?: string
  sourceAssetIds?: string[]
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
  presetId?: string
  presetName?: string
  projectName?: string
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
  error?: string | { code?: string; message?: string } | null
}

function unwrapApiResponse<T>(response: ApiResponse<T>) {
  if (response.code !== 0) {
    throw new Error(response.message || 'request failed')
  }

  return response.data
}

const generationRequestConfig = {
  timeout: 0,
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
    generationRequestConfig,
  )

  return unwrapApiResponse(response)
}

export async function createInteriorCollageTask(
  payload: CreateInteriorCollageTaskPayload,
) {
  const response = await request.post<ApiResponse<CreatedInteriorCollageBatch>>(
    '/modules/interior-collage/tasks',
    payload,
    generationRequestConfig,
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
    generationRequestConfig,
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
  const response = await request.post<ApiResponse<CreatedBatchTask>>(
    '/modules/batch-new/tasks',
    payload,
    generationRequestConfig,
  )
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

export async function getDeliveryPackage(packageId: string) {
  const response = await request.get<ApiResponse<DeliveryPackage>>(
    `/modules/delivery/packages/${encodeURIComponent(packageId)}`,
  )
  return unwrapApiResponse(response)
}

export async function getDeliveryPackages(params?: {
  taskId?: string
  page?: number
  pageSize?: number
}) {
  const response = await request.get<ApiResponse<PagedResult<DeliveryPackage>>>(
    '/modules/delivery/packages',
    { params },
  )
  return unwrapApiResponse(response)
}

export async function pollDeliveryPackage(
  packageId: string,
  options?: { maxAttempts?: number; intervalMs?: number },
) {
  const maxAttempts = options?.maxAttempts ?? 30
  const intervalMs = options?.intervalMs ?? 3000

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const pkg = await getDeliveryPackage(packageId)

    if (pkg.downloadUrl) {
      return pkg
    }

    if (pkg.status === 'fail' || pkg.status === 'canceled') {
      throw new Error('下载包生成失败')
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, attempt === 0 ? 1000 : intervalMs)
      })
    }
  }

  return getDeliveryPackage(packageId)
}

export async function createInteriorCleanTask(payload: {
  inputAssetId: string
  outputRatio?: string
  resolution?: string
}) {
  const response = await request.post<ApiResponse<CreatedGenerationTask>>(
    '/modules/interior-clean/tasks',
    payload,
    generationRequestConfig,
  )
  return unwrapApiResponse(response)
}

// ===================== Reusable Credits Platform 代理接口 =====================
// 详见 文档/积分文档.md 第 2/8 节。
// 请求头 x-credits-user-id / x-credits-account-scope 由 http.ts 拦截器自动注入。

export type CreditsAccountStatus = 'active' | 'frozen' | 'closed' | string

export interface CreditsAccount {
  id: number | string
  userId: number | string
  tenantId: number | string | null
  accountScope: 'personal' | 'tenant' | string
  totalBalance: number
  lockedBalance: number
  availableBalance: number
  status: CreditsAccountStatus
}

export interface RechargeProduct {
  id: number | string
  code: string
  name: string
  description?: string | null
  priceCents?: number
  priceText?: string
  giftPoints: number
  totalPoints?: number
  status?: string
  badge?: string | null
  highlights?: string[]
}

export type CreditsTransactionType =
  | 'estimate'
  | 'freeze'
  | 'settle'
  | 'refund'
  | 'recharge'
  | 'adjust'
  | string

export interface CreditsTransaction {
  id: number | string
  txnType: CreditsTransactionType
  points: number
  balanceBefore?: number
  balanceAfter?: number
  billingTaskId?: string | null
  paymentOrderId?: string | null
  bizType?: string | null
  bizId?: string | null
  remark?: string | null
  createdAt: string
}

export interface PaymentOrderResult {
  id: number | string
  orderNo: string
  productId: number | string
  productName?: string
  amountCents?: number
  amountText?: string
  giftPoints: number
  totalPoints?: number
  status: 'pending' | 'paid' | 'failed' | 'canceled' | string
  payUrl?: string | null
  qrCodeUrl?: string | null
  createdAt: string
}

export interface CreditsAdminOverview {
  application: {
    id: number | string
    code: string
    name: string
    status: string
  } | null
  applicationFunctions: Array<{
    code: string
    name: string
    defaultPoints: number
    status: string
  }>
  creditAccounts: CreditsAccount[]
  rechargeProducts: RechargeProduct[]
  recentTransactions: CreditsTransaction[]
}

export async function getCreditsAccounts() {
  const response = await request.get<ApiResponse<{ items: CreditsAccount[] }> | ApiResponse<CreditsAccount[]>>(
    '/credits/accounts',
  )
  const payload = unwrapApiResponse(response as ApiResponse<unknown>)
  if (Array.isArray(payload)) return payload as CreditsAccount[]
  return (payload as { items: CreditsAccount[] }).items ?? []
}

export async function getRechargeProducts() {
  const response = await request.get<ApiResponse<{ items: RechargeProduct[] }> | ApiResponse<RechargeProduct[]>>(
    '/credits/recharge-products',
  )
  const payload = unwrapApiResponse(response as ApiResponse<unknown>)
  if (Array.isArray(payload)) return payload as RechargeProduct[]
  return (payload as { items: RechargeProduct[] }).items ?? []
}

export async function getCreditsTransactions(params?: {
  page?: number
  pageSize?: number
  txnType?: CreditsTransactionType
  from?: string
  to?: string
}) {
  const response = await request.get<
    ApiResponse<{ items: CreditsTransaction[]; total?: number } | CreditsTransaction[]>
  >('/credits/transactions', { params })
  const payload = unwrapApiResponse(response)
  if (Array.isArray(payload)) return { items: payload, total: payload.length }
  return {
    items: payload.items ?? [],
    total: payload.total ?? payload.items?.length ?? 0,
  }
}

export async function createRechargeOrder(payload: {
  productId: number | string
  quantity?: number
  remark?: string
}) {
  const response = await request.post<ApiResponse<PaymentOrderResult>>(
    '/credits/payment-orders',
    payload,
  )
  return unwrapApiResponse(response)
}

export async function getCreditsAdminOverview() {
  const response = await request.get<ApiResponse<CreditsAdminOverview>>(
    '/credits/admin/overview',
  )
  return unwrapApiResponse(response)
}
