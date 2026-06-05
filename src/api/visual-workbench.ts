import { normalizeApiErrorMessage, request } from '@/api/http'

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
  thumbnailUrl?: string | null
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
  sceneReferenceImageUrl?: string
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
  activeModel?: string | null
  fallbackStarted?: boolean
  deadlineAt?: string | null
  softTimeoutAt?: string | null
  winningModel?: string | null
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

export interface BatchTaskListItem {
  batchId: string
  projectName: string
  status: GenerationTaskStatus
  total: number
  completed: number
  failed: number
  progress: number
  estimatedPoints?: string | null
  settledPoints?: string | null
  createdAt: string
  updatedAt: string
}

export interface BatchTaskList {
  items: BatchTaskListItem[]
  page: number
  pageSize: number
  total: number
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
  error?: { code?: string | null; message?: string | null } | null
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
  firstInputCoverUrl?: string | null
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

export interface DeliveryInputCover {
  slotIndex: number
  itemKind: string
  generationTaskId: string
  status: GenerationTaskStatus
  inputAssetId?: string
  coverUrl?: string | null
}

export interface DeliveryTaskAssetsResult extends PagedResult<DeliveryAsset> {
  inputCovers?: DeliveryInputCover[]
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
  inputAssetThumbnailUrl?: string | null
  inputAssetUrl?: string | null
  resultCount?: number | null
  activeModel?: string | null
  fallbackStarted?: boolean
  deadlineAt?: string | null
  softTimeoutAt?: string | null
  winningModel?: string | null
  error?: string | { code?: string; message?: string } | null
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

export async function deleteCreativeImageConversation(conversationId: string) {
  const response = await request.delete<
    ApiResponse<{ conversationId: string; deleted: boolean }>
  >(`/modules/creative-image/conversations/${encodeURIComponent(conversationId)}`)
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

export async function deleteBatchPreset(presetId: string) {
  const response = await request.delete<ApiResponse<{ presetId: string; deleted: boolean }>>(
    `/modules/batch-new/presets/${encodeURIComponent(presetId)}`,
  )
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

export async function getBatchTasks(params?: {
  status?: string
  page?: number
  pageSize?: number
}) {
  const response = await request.get<ApiResponse<BatchTaskList>>('/modules/batch-new/tasks', {
    params,
  })
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
  refresh?: boolean
}) {
  const response = await request.get<ApiResponse<PagedResult<DeliveryTaskItem>>>(
    '/modules/delivery/tasks',
    {
      params: {
        ...params,
        refresh: params?.refresh ? '1' : undefined,
      },
    },
  )
  return unwrapApiResponse(response)
}

export async function getDeliveryTaskAssets(
  taskId: string,
  params?: {
    ratio?: string
    page?: number
    pageSize?: number
    refresh?: boolean
  },
) {
  const response = await request.get<ApiResponse<DeliveryTaskAssetsResult>>(
    `/modules/delivery/tasks/${taskId}/assets`,
    {
      params: {
        ...params,
        refresh: params?.refresh ? '1' : undefined,
      },
    },
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

function parseCreditsNumber(value: unknown) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeCreditsAccount(
  account: CreditsAccount & Record<string, unknown>,
): CreditsAccount {
  return {
    ...account,
    totalBalance: parseCreditsNumber(account.totalBalance),
    lockedBalance: parseCreditsNumber(account.lockedBalance),
    availableBalance: parseCreditsNumber(account.availableBalance),
  }
}

function normalizeCreditsTransaction(
  transaction: CreditsTransaction & Record<string, unknown>,
): CreditsTransaction {
  return {
    ...transaction,
    points: parseCreditsNumber(transaction.points),
    balanceBefore:
      transaction.balanceBefore === undefined
        ? undefined
        : parseCreditsNumber(transaction.balanceBefore),
    balanceAfter:
      transaction.balanceAfter === undefined
        ? undefined
        : parseCreditsNumber(transaction.balanceAfter),
    createdAt:
      typeof transaction.createdAt === 'string'
        ? transaction.createdAt
        : new Date(String(transaction.createdAt)).toISOString(),
  }
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
  | 'adjustment'
  | string

export interface CreditsTransaction {
  id: number | string
  applicationId?: number | string | null
  applicationCode?: string | null
  applicationName?: string | null
  functionId?: number | string | null
  functionCode?: string | null
  functionName?: string | null
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

export type CreditsPayChannel = 'alipay' | 'wechat' | 'card'

export interface PaymentOrderResult {
  id: number | string
  orderNo: string
  productId: number | string
  productName?: string
  amountCents?: number
  amountText?: string
  giftPoints: number
  totalPoints?: number
  payChannel?: CreditsPayChannel
  status: 'pending' | 'paid' | 'failed' | 'canceled' | 'refunded' | string
  payUrl?: string | null
  qrCodeUrl?: string | null
  createdAt: string
  idempotentReplay?: boolean
}

export interface CreditsApplication {
  id: number | string
  code: string
  name: string
  description?: string | null
  status: string
}

export interface CreditsApplicationFunction {
  id?: number | string
  applicationId?: number | string
  applicationCode?: string
  applicationName?: string
  code: string
  name: string
  chargeMode?: 'fixed' | 'dynamic' | 'estimate_required' | string
  description?: string | null
  defaultPoints: number
  status: string
}

export interface CreditsCustomerProfile {
  id: string
  applicationCode: string
  userId: string
  username: string
  displayName: string
  phone?: string | null
  role: string
  creditsUserId: number | string
  accountScope: 'personal' | 'tenant' | string
  creditsTenantId?: number | string | null
  createdByUserId: string
  createdByRole: string
  status: string
  createdAt: string
}

export interface CreditsAdminOverview {
  application: CreditsApplication | null
  applications: CreditsApplication[]
  applicationFunctions: CreditsApplicationFunction[]
  creditAccounts: CreditsAccount[]
  rechargeProducts: RechargeProduct[]
  recentTransactions: CreditsTransaction[]
  customerProfiles: CreditsCustomerProfile[]
}

export interface AgentOperationsCustomer {
  id: string
  applicationCode: string
  relationType: string
  status: string
  createdAt: string
  customerUserId: string
  customerUsername: string
  customerDisplayName: string
  customerPhone?: string | null
  customerCreditsUserId: number | string
}

export interface AgentOperationsLead {
  id: string
  applicationCode: string
  customerName: string
  phone?: string | null
  source?: string | null
  stage: string
  expectedPoints: number
  note?: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export interface AgentOperationsCommissionPreview {
  id: string
  applicationCode: string
  period: string
  consumedPoints: number
  commissionRate: number
  commissionPoints: number
  status: string
  settlementId?: string | null
  customerUserId?: string | null
  customerUsername?: string | null
  customerDisplayName?: string | null
  createdAt: string
}

export interface AgentOperationsSettlementBill {
  id: string
  period: string
  totalCommissionPoints: number
  status: string
  confirmedAt?: string | null
  paidAt?: string | null
  createdAt: string
}

export interface AgentOperationsMaterial {
  id: string
  title: string
  category: string
  applicationCode?: string | null
  url: string
  status: string
  sortOrder: number
}

export interface AgentOperationsTicket {
  id: string
  subject: string
  category: string
  priority: string
  status: string
  lastMessage?: string | null
  createdAt: string
  updatedAt: string
}

export interface AgentOperationsOverview {
  agent: {
    userId: string
    username: string
    displayName: string
  }
  metrics: {
    customerCount: number
    activeLeadCount: number
    previewCommissionPoints: number
    draftSettlementCount: number
    openTicketCount: number
  }
  customers: AgentOperationsCustomer[]
  leads: AgentOperationsLead[]
  commissionPreviews: AgentOperationsCommissionPreview[]
  settlementBills: AgentOperationsSettlementBill[]
  materials: AgentOperationsMaterial[]
  tickets: AgentOperationsTicket[]
}

export type PlatformUserTargetRole = 'admin' | 'agent' | 'user'
export type PlatformUserPlanCode = 'basic' | 'team' | 'flagship'

export interface CreatePlatformUserPayload {
  idempotencyKey: string
  targetRole: PlatformUserTargetRole
  username: string
  password: string
  displayName?: string
  phone?: string
  email?: string
  applicationCode?: string
  accountScope?: 'personal'
  planCode?: PlatformUserPlanCode
  initialPoints?: number
}

export interface PlatformUserCreationResult {
  idempotentReplay?: boolean
  user: {
    id: string
    username: string
    displayName: string
    phone: string | null
    role: string
    creditsUserId: number | string
    accountScope: string
  }
  creditsAccount: {
    userId: number | string
    accountId: number | string
    totalBalance: string
    availableBalance: string
  }
  applicationLink: {
    id: string
    applicationCode: string
    userId: string
  }
  agentRelation: {
    id: string
    agentUserId: string
    customerUserId: string
  } | null
  policyDecision: {
    allowed: boolean
    reason: string
  }
}

export interface AdjustPlatformCreditsPayload {
  idempotencyKey: string
  targetUserId: string
  points: number
  reason?: string
}

export interface PlatformCreditsAdjustmentResult {
  targetUser: {
    id: string
    username: string
    displayName: string
    role: string
    creditsUserId: number | string
  }
  adjustment: {
    transactionId: number | string
    points: number
    balanceBefore: string
    balanceAfter: string
    reason: string
  }
}

export interface DeletePlatformUserResult {
  deleted: boolean
  user: {
    id: string
    username: string
    displayName: string
    role: string
  }
}

function extractCreditsList<T>(payload: unknown, keys: string[]) {
  if (Array.isArray(payload)) return payload as T[]
  if (!payload || typeof payload !== 'object') return []

  const record = payload as Record<string, unknown>
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as T[]
  }

  return []
}

function resolveRechargeAmountYuan(product: RechargeProduct & Record<string, unknown>) {
  if (typeof product.amount === 'string' || typeof product.amount === 'number') {
    const parsed = Number(product.amount)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  if (typeof product.priceCents === 'number' && product.priceCents > 0) {
    return product.priceCents / 100
  }
  return 0
}

function normalizeRechargeProduct(
  product: RechargeProduct & Record<string, unknown>,
): RechargeProduct {
  const amountYuan = resolveRechargeAmountYuan(product)
  const points = Number(product.points ?? product.giftPoints ?? 0)
  const bonusPoints = Number(product.bonusPoints ?? 0)

  return {
    ...product,
    code: product.code ?? String(product.id),
    priceCents:
      typeof product.priceCents === 'number' && product.priceCents > 0
        ? product.priceCents
        : amountYuan > 0
          ? Math.round(amountYuan * 100)
          : undefined,
    priceText:
      product.priceText ??
      (amountYuan > 0 ? `¥${amountYuan.toLocaleString('zh-CN')}` : undefined),
    giftPoints: product.giftPoints ?? points,
    totalPoints: product.totalPoints ?? points + bonusPoints,
    status: product.status ?? (product.enabled === false ? 'disabled' : 'active'),
  }
}

function normalizeCreditsApplicationFunction(
  item: CreditsApplicationFunction & Record<string, unknown>,
): CreditsApplicationFunction {
  return {
    ...item,
    defaultPoints: parseCreditsNumber(item.defaultPoints),
  }
}

function buildPaymentIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `payment_order:${crypto.randomUUID()}`
  }
  return `payment_order:${Date.now()}`
}

function normalizePaymentOrder(
  order: PaymentOrderResult & Record<string, unknown>,
): PaymentOrderResult {
  const amountYuan = Number(order.amount ?? 0)
  const amountCents =
    typeof order.amountCents === 'number' && order.amountCents > 0
      ? order.amountCents
      : Number.isFinite(amountYuan) && amountYuan > 0
        ? Math.round(amountYuan * 100)
        : undefined
  const giftPoints = parseCreditsNumber(order.points ?? order.giftPoints)
  const bonusPoints = parseCreditsNumber(order.bonusPoints)

  return {
    id: order.id ?? order.paymentOrderId ?? '',
    orderNo: String(order.orderNo ?? ''),
    productId: order.productId ?? '',
    productName: order.productName,
    amountCents,
    amountText:
      order.amountText ??
      (amountYuan > 0 ? `¥${amountYuan.toLocaleString('zh-CN')}` : undefined),
    giftPoints,
    totalPoints: order.totalPoints ?? giftPoints + bonusPoints,
    payChannel:
      order.payChannel === 'alipay' || order.payChannel === 'wechat' || order.payChannel === 'card'
        ? order.payChannel
        : undefined,
    status: order.status ?? 'pending',
    payUrl: order.payUrl ?? null,
    qrCodeUrl: order.qrCodeUrl ?? null,
    createdAt:
      typeof order.createdAt === 'string'
        ? order.createdAt
        : new Date().toISOString(),
    idempotentReplay: Boolean(order.idempotentReplay),
  }
}

export async function getCreditsAccounts() {
  const response = await request.get<
    ApiResponse<
      | { items?: CreditsAccount[]; accounts?: CreditsAccount[] }
      | CreditsAccount[]
    >
  >(
    '/credits/accounts',
  )
  const payload = unwrapApiResponse(response as ApiResponse<unknown>)
  return extractCreditsList<CreditsAccount & Record<string, unknown>>(
    payload,
    ['items', 'accounts'],
  ).map(normalizeCreditsAccount)
}

export async function getRechargeProducts() {
  const response = await request.get<
    ApiResponse<
      | { items?: RechargeProduct[]; products?: RechargeProduct[] }
      | RechargeProduct[]
    >
  >(
    '/credits/recharge-products',
  )
  const payload = unwrapApiResponse(response as ApiResponse<unknown>)
  return extractCreditsList<RechargeProduct & Record<string, unknown>>(
    payload,
    ['items', 'products'],
  ).map(normalizeRechargeProduct)
}

export type CreditsTransactionsQuery = {
  accountId?: number
  accountScope?: 'personal' | 'tenant'
  tenantId?: number | string
  targetCreditsUserId?: number
  limit?: number
  txnType?: CreditsTransactionType
  from?: string
  to?: string
}

export type CreditsTransactionsResult = {
  account: CreditsAccount | null
  items: CreditsTransaction[]
  total: number
}

export async function getCreditsTransactions(
  params?: CreditsTransactionsQuery,
): Promise<CreditsTransactionsResult> {
  const response = await request.get<
    ApiResponse<
      | {
          account?: CreditsAccount & Record<string, unknown>
          items?: CreditsTransaction[]
          transactions?: CreditsTransaction[]
          total?: number
        }
      | CreditsTransaction[]
    >
  >('/credits/transactions', {
    params: {
      accountId: params?.accountId,
      accountScope: params?.accountScope,
      tenantId: params?.tenantId,
      targetCreditsUserId: params?.targetCreditsUserId,
      limit: params?.limit,
    },
  })
  const payload = unwrapApiResponse(response)
  if (Array.isArray(payload)) {
    const items = payload.map((item) =>
      normalizeCreditsTransaction(item as CreditsTransaction & Record<string, unknown>),
    )
    return { account: null, items, total: items.length }
  }

  const items = extractCreditsList<CreditsTransaction & Record<string, unknown>>(
    payload,
    ['items', 'transactions'],
  ).map(normalizeCreditsTransaction)

  const account = payload.account
    ? normalizeCreditsAccount(payload.account)
    : null

  return {
    account,
    items,
    total: payload.total ?? items.length,
  }
}

export async function createRechargeOrder(payload: {
  productId: number | string
  payChannel: CreditsPayChannel
  idempotencyKey?: string
}) {
  const response = await request.post<ApiResponse<PaymentOrderResult & Record<string, unknown>>>(
    '/credits/payment-orders',
    {
      productId: payload.productId,
      payChannel: payload.payChannel,
      idempotencyKey: payload.idempotencyKey?.trim() || buildPaymentIdempotencyKey(),
    },
  )
  return normalizePaymentOrder(unwrapApiResponse(response))
}

export async function getCreditsAdminOverview(): Promise<CreditsAdminOverview> {
  const response = await request.get<ApiResponse<CreditsAdminOverview & Record<string, unknown>>>(
    '/credits/admin/overview',
  )
  const payload = unwrapApiResponse(response)
  const applications = extractCreditsList<CreditsApplication>(payload, ['applications'])
  const applicationFunctions = extractCreditsList<
    CreditsApplicationFunction & Record<string, unknown>
  >(payload, ['applicationFunctions', 'functions']).map(normalizeCreditsApplicationFunction)
  const creditAccounts = extractCreditsList<CreditsAccount & Record<string, unknown>>(
    payload,
    ['creditAccounts', 'accounts'],
  ).map(normalizeCreditsAccount)
  const rechargeProducts = extractCreditsList<RechargeProduct & Record<string, unknown>>(
    payload,
    ['rechargeProducts', 'products'],
  ).map(normalizeRechargeProduct)
  const recentTransactions = extractCreditsList<CreditsTransaction & Record<string, unknown>>(
    payload,
    ['recentTransactions', 'transactions'],
  ).map(normalizeCreditsTransaction)
  const customerProfiles = extractCreditsList<CreditsCustomerProfile>(
    payload,
    ['customerProfiles', 'customers'],
  )

  return {
    application: payload.application ?? applications[0] ?? null,
    applications,
    applicationFunctions,
    creditAccounts,
    rechargeProducts,
    recentTransactions,
    customerProfiles,
  }
}

export async function getAgentOperationsOverview(params?: {
  agentUserId?: string
}): Promise<AgentOperationsOverview> {
  const response = await request.get<ApiResponse<AgentOperationsOverview>>(
    '/platform/agent/overview',
    { params },
  )
  return unwrapApiResponse(response)
}

export async function createPlatformUser(
  payload: CreatePlatformUserPayload,
): Promise<PlatformUserCreationResult> {
  const response = await request.post<ApiResponse<PlatformUserCreationResult>>(
    '/platform/users',
    payload,
  )
  return unwrapApiResponse(response)
}

export async function adjustPlatformCredits(
  payload: AdjustPlatformCreditsPayload,
): Promise<PlatformCreditsAdjustmentResult> {
  const response = await request.post<ApiResponse<PlatformCreditsAdjustmentResult>>(
    '/platform/credits/adjustments',
    payload,
  )
  return unwrapApiResponse(response)
}

export async function deletePlatformUser(
  userId: string,
  payload: { reason?: string },
): Promise<DeletePlatformUserResult> {
  const response = await request.delete<ApiResponse<DeletePlatformUserResult>>(
    `/platform/users/${encodeURIComponent(userId)}`,
    { data: payload },
  )
  return unwrapApiResponse(response)
}
