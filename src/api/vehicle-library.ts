import { normalizeApiErrorMessage, request } from '@/api/http'
import type { ApiResponse } from '@/api/visual-workbench'
import { normalizeMediaUrl } from '@/utils/media-url'
import type {
  PageResult,
  PutVehicleLibraryMaterialPayload,
  UpsertVehicleLotPayload,
  UpsertVehiclePayload,
  VehicleLibrary,
  VehicleLibraryHome,
  VehicleLibraryMaterial,
  VehicleListParams,
  VehicleLot,
  VehicleLibraryListParams,
  VehicleMaterialSlotCode,
  VehicleRecognitionRecord,
  VehicleRecord,
  VehicleQueryParams,
} from '@/types/vehicle-library'

export type {
  PageResult,
  PutVehicleLibraryMaterialPayload,
  UpsertVehicleLotPayload,
  UpsertVehiclePayload,
  VehicleLibrary,
  VehicleLibraryHome,
  VehicleLibraryMaterial,
  VehicleLibraryStatus,
  VehicleListParams,
  VehicleLot,
  VehicleLibraryListParams,
  VehicleMaterialSlotCode,
  VehicleRecognitionRecord,
  VehicleRecord,
  VehicleQueryParams,
} from '@/types/vehicle-library'

function unwrapApiResponse<T>(response: ApiResponse<T>) {
  if (response.code !== 0) {
    throw new Error(normalizeApiErrorMessage(response.message || 'request failed'))
  }
  return response.data
}

function normalizeAsset<T extends { url?: string | null; thumbnailUrl?: string | null }>(asset: T): T {
  return {
    ...asset,
    url: normalizeMediaUrl(asset.url),
    thumbnailUrl: normalizeMediaUrl(asset.thumbnailUrl),
  }
}

function normalizeMaterial(material: VehicleLibraryMaterial): VehicleLibraryMaterial {
  return {
    ...material,
    assetUrl: normalizeMediaUrl(material.assetUrl),
    assetThumbnailUrl: normalizeMediaUrl(material.assetThumbnailUrl),
  }
}

function normalizeVehicle<T extends VehicleRecord | VehicleLot>(record: T): T {
  return {
    ...record,
    coverAsset: record.coverAsset ? normalizeAsset(record.coverAsset) : record.coverAsset,
    materials: record.materials?.map(normalizeMaterial),
  }
}

function normalizePage<T extends VehicleRecord | VehicleLot>(page: PageResult<T>): PageResult<T> {
  return { ...page, items: page.items.map(normalizeVehicle) }
}

export async function getVehicleLibraryHome() {
  const response = await request.get<ApiResponse<VehicleLibraryHome>>('/vehicle-library/me')
  return unwrapApiResponse(response)
}

export async function createVehicleLibrary(payload: {
  name?: string
  remark?: string | null
}) {
  const response = await request.post<ApiResponse<VehicleLibrary>>(
    '/vehicle-library/libraries',
    payload,
  )
  return unwrapApiResponse(response)
}

// quotaBytes / status 属于平台管控字段，用户端接口不支持修改。
export async function updateVehicleLibrary(
  libraryId: string,
  payload: {
    name?: string
    remark?: string | null
  },
) {
  const response = await request.patch<ApiResponse<VehicleLibrary>>(
    `/vehicle-library/libraries/${encodeURIComponent(libraryId)}`,
    payload,
  )
  return unwrapApiResponse(response)
}

export async function getVehicleLots(params?: VehicleLibraryListParams) {
  const response = await request.get<ApiResponse<PageResult<VehicleLot>>>(
    '/vehicle-library/lots',
    { params },
  )
  return normalizePage(unwrapApiResponse(response))
}

export async function createVehicleLot(payload: UpsertVehicleLotPayload) {
  const response = await request.post<ApiResponse<VehicleLot>>('/vehicle-library/lots', payload)
  return normalizeVehicle(unwrapApiResponse(response))
}

export async function getVehicleLot(lotId: string, params?: { libraryId?: string }) {
  const response = await request.get<ApiResponse<VehicleLot>>(
    `/vehicle-library/lots/${encodeURIComponent(lotId)}`,
    { params },
  )
  return normalizeVehicle(unwrapApiResponse(response))
}

export async function updateVehicleLot(lotId: string, payload: UpsertVehicleLotPayload) {
  const response = await request.patch<ApiResponse<VehicleLot>>(
    `/vehicle-library/lots/${encodeURIComponent(lotId)}`,
    payload,
  )
  return normalizeVehicle(unwrapApiResponse(response))
}

export async function deleteVehicleLot(lotId: string, params?: { libraryId?: string }) {
  const response = await request.delete<ApiResponse<{ deleted: boolean }>>(
    `/vehicle-library/lots/${encodeURIComponent(lotId)}`,
    { params },
  )
  return unwrapApiResponse(response)
}

export async function putVehicleLotMaterial(
  lotId: string,
  slotCode: VehicleMaterialSlotCode,
  payload: PutVehicleLibraryMaterialPayload,
) {
  const response = await request.put<ApiResponse<{ items: VehicleLibraryMaterial[] }>>(
    `/vehicle-library/lots/${encodeURIComponent(lotId)}/materials/${encodeURIComponent(slotCode)}`,
    payload,
  )
  const result = unwrapApiResponse(response)
  return { ...result, items: result.items.map(normalizeMaterial) }
}

export async function deleteVehicleLotMaterial(
  lotId: string,
  slotCode: VehicleMaterialSlotCode,
  params?: { libraryId?: string },
) {
  const response = await request.delete<
    ApiResponse<{ deleted: boolean; materialStatus: string }>
  >(
    `/vehicle-library/lots/${encodeURIComponent(lotId)}/materials/${encodeURIComponent(slotCode)}`,
    { params },
  )
  return unwrapApiResponse(response)
}

export async function getVehicles(params?: VehicleListParams) {
  const response = await request.get<ApiResponse<PageResult<VehicleRecord>>>(
    '/vehicle-library/vehicles',
    { params },
  )
  return normalizePage(unwrapApiResponse(response))
}

export async function queryVehicles(params?: VehicleQueryParams) {
  const response = await request.get<ApiResponse<PageResult<VehicleRecord>>>(
    '/vehicle-library/vehicles/query',
    { params },
  )
  return normalizePage(unwrapApiResponse(response))
}

export async function createVehicle(payload: UpsertVehiclePayload) {
  const response = await request.post<ApiResponse<VehicleRecord>>(
    '/vehicle-library/vehicles',
    payload,
  )
  return normalizeVehicle(unwrapApiResponse(response))
}

export async function getVehicle(vehicleId: string, params?: { libraryId?: string }) {
  const response = await request.get<ApiResponse<VehicleRecord>>(
    `/vehicle-library/vehicles/${encodeURIComponent(vehicleId)}`,
    { params },
  )
  return normalizeVehicle(unwrapApiResponse(response))
}

export async function updateVehicle(vehicleId: string, payload: UpsertVehiclePayload) {
  const response = await request.patch<ApiResponse<VehicleRecord>>(
    `/vehicle-library/vehicles/${encodeURIComponent(vehicleId)}`,
    payload,
  )
  return normalizeVehicle(unwrapApiResponse(response))
}

export async function deleteVehicle(vehicleId: string, params?: { libraryId?: string }) {
  const response = await request.delete<ApiResponse<{ deleted: boolean }>>(
    `/vehicle-library/vehicles/${encodeURIComponent(vehicleId)}`,
    { params },
  )
  return unwrapApiResponse(response)
}

export async function putVehicleMaterial(
  vehicleId: string,
  slotCode: VehicleMaterialSlotCode,
  payload: PutVehicleLibraryMaterialPayload,
) {
  const response = await request.put<ApiResponse<{ items: VehicleLibraryMaterial[] }>>(
    `/vehicle-library/vehicles/${encodeURIComponent(vehicleId)}/materials/${encodeURIComponent(slotCode)}`,
    payload,
  )
  const result = unwrapApiResponse(response)
  return { ...result, items: result.items.map(normalizeMaterial) }
}

export async function deleteVehicleMaterial(
  vehicleId: string,
  slotCode: VehicleMaterialSlotCode,
  params?: { libraryId?: string },
) {
  const response = await request.delete<
    ApiResponse<{ deleted: boolean; materialStatus: string }>
  >(
    `/vehicle-library/vehicles/${encodeURIComponent(vehicleId)}/materials/${encodeURIComponent(slotCode)}`,
    { params },
  )
  return unwrapApiResponse(response)
}

export async function recognizeVehicleVinText(payload: {
  libraryId?: string
  vehicleId?: string
  vin: string
}) {
  const response = await request.post<ApiResponse<VehicleRecognitionRecord>>(
    '/vehicle-library/recognition/vin-text',
    payload,
  )
  return unwrapApiResponse(response)
}

export async function recognizeVehicleVinImage(payload: {
  libraryId?: string
  vehicleId?: string
  assetId: string
}) {
  const response = await request.post<ApiResponse<VehicleRecognitionRecord>>(
    '/vehicle-library/recognition/vin-image',
    payload,
  )
  return unwrapApiResponse(response)
}

export async function getVehicleRecognitionRecords(params?: {
  libraryId?: string
  vehicleId?: string
  page?: number
  pageSize?: number
}) {
  const response = await request.get<ApiResponse<PageResult<VehicleRecognitionRecord>>>(
    '/vehicle-library/recognition-records',
    { params },
  )
  return unwrapApiResponse(response)
}
