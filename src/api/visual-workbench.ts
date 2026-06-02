import { request } from '@/api/http'

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  requestId: string
}

export interface CreditAccount {
  id: number
  tenantId: number | null
  userId: number | null
  accountScope: 'personal' | 'tenant'
  totalBalance: string
  lockedBalance: string
  availableBalance: string
  currency: string
  status: string
}

export interface CreditTransaction {
  id: number
  tenantId: number | null
  userId: number
  accountId: number
  billingTaskId: number | null
  paymentOrderId: number | null
  applicationId: number | null
  functionId: number | null
  txnType: string
  points: string
  balanceBefore: string
  balanceAfter: string
  bizType: string | null
  bizId: string | null
  refTxnId: number | null
  remark: string | null
  createdAt: string
}

export interface RechargeProduct {
  id: number
  name: string
  amount: string
  points: string
  bonusPoints: string
  currency: string
  sort: number
  enabled: boolean
}

export interface PaymentOrder {
  paymentOrderId: number
  tenantId: number | null
  userId: number
  accountId: number
  productId: number
  orderNo: string
  amount: string
  points: string
  bonusPoints: string
  payChannel: 'alipay' | 'wechat' | 'card'
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  paidAt: string | null
  notifyId: string | null
  idempotentReplay: boolean
}

export interface CreditsApplication {
  id: number
  code: string
  name: string
  description: string | null
  status: string
}

export interface CreditsFunction {
  id: number
  applicationId: number
  applicationCode?: string
  code: string
  name: string
  description: string | null
  chargeMode: 'fixed' | 'dynamic' | 'estimate_required'
  defaultPoints: string
  status: string
}

export interface CreditsAdminOverview {
  identity: {
    userId: number
    accountScope: 'personal' | 'tenant'
    tenantId?: number
  }
  applications: CreditsApplication[]
  functions: CreditsFunction[]
  accounts: CreditAccount[]
  transactions: CreditTransaction[]
  rechargeProducts: RechargeProduct[]
}

export interface UploadedAsset {
  assetId: string
  purpose: string
  url: string
  fileName: string
  mimeType: string
  size: number
}

export async function getCreditAccounts(params?: {
  userId?: number | string
  creditsUserId?: number | string
  accountScope?: 'personal' | 'tenant'
  tenantId?: number | string
  creditsTenantId?: number | string
}) {
  const response = await request.get<ApiResponse<{ accounts: CreditAccount[] }>>('/credits/accounts', {
    params,
  })
  return response.data
}

export async function getCreditTransactions(params?: {
  accountId?: number | string
  userId?: number | string
  creditsUserId?: number | string
  accountScope?: 'personal' | 'tenant'
  tenantId?: number | string
  creditsTenantId?: number | string
  limit?: number | string
}) {
  const response = await request.get<ApiResponse<{ account: CreditAccount; transactions: CreditTransaction[] }>>(
    '/credits/transactions',
    { params },
  )
  return response.data
}

export async function getRechargeProducts() {
  const response = await request.get<ApiResponse<{ products: RechargeProduct[] }>>('/credits/recharge-products')
  return response.data
}

export async function createPaymentOrder(payload: {
  productId: number
  payChannel: 'alipay' | 'wechat' | 'card'
  idempotencyKey?: string
  userId?: number | string
  creditsUserId?: number | string
  accountScope?: 'personal' | 'tenant'
  tenantId?: number | string
  creditsTenantId?: number | string
}) {
  const response = await request.post<ApiResponse<PaymentOrder>>('/credits/payment-orders', payload)
  return response.data
}

export async function getCreditsAdminOverview(params?: {
  userId?: number | string
  creditsUserId?: number | string
  accountScope?: 'personal' | 'tenant'
  tenantId?: number | string
  creditsTenantId?: number | string
}) {
  const response = await request.get<ApiResponse<CreditsAdminOverview>>('/credits/admin/overview', {
    params,
  })
  return response.data
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
  sceneReferenceImageUrl?: string
  useLogo?: boolean
  logoAssetId?: string
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
  billingTaskId?: number | null
  billingStatus?: string | null
  estimatedPoints?: string | null
  settledPoints?: string | null
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
  sceneReferenceImageUrl?: string
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
  userId?: number | string
  creditsUserId?: number | string
  tenantId?: number | string
  creditsTenantId?: number | string
  accountScope?: 'personal' | 'tenant'
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
  estimatedPoints?: string | null
  settledPoints?: string | null
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
  creditsUserId?: number | null
  creditsTenantId?: number | null
  accountScope?: 'personal' | 'tenant' | null
  estimatedPoints?: string | null
  settledPoints?: string | null
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

export async function deleteDeliveryTasks(taskIds: string[]) {
  const response = await request.delete<ApiResponse<{ deleted: string[]; failed: string[] }>>(
    '/modules/delivery/tasks',
    { data: { taskIds } },
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
