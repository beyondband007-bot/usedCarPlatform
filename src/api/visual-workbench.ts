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
  inputAssetId: string
  optionId?: string
  useLogo?: boolean
  colorCode?: string
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
  error: {
    code?: string
    message?: string
  } | null
  createdAt?: string
  updatedAt?: string
}

function unwrapApiResponse<T>(response: ApiResponse<T>) {
  if (response.code !== 0) {
    throw new Error(response.message || 'request failed')
  }

  return response.data
}

export async function uploadCarExterior(file: File) {
  const formData = new FormData()
  formData.append('purpose', 'car_exterior')
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

export async function getGenerationTask(taskId: string) {
  const response = await request.get<ApiResponse<GenerationTaskDetail>>(`/tasks/${taskId}`)
  return unwrapApiResponse(response)
}
