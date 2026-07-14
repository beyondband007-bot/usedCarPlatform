import type { PaginationResult } from '@/types/api'
import type { LotQueryParams, LotTask } from '@/types/lot'
import { LOT_REQUIRED_SLOT_CODES } from '@/constants/capture'
import { http } from '@/http/http'

const VEHICLE_LIBRARY_BASE = '/api/v1/vehicle-library'

type VehicleLibraryMaterial = {
  slotCode: string
  status: 'active' | 'processing' | 'failed' | 'deleted'
  assetId?: string | null
  mediaType?: 'image' | 'video' | string
  fileName?: string | null
  fileSize?: number | null
  assetUrl?: string | null
  assetThumbnailUrl?: string | null
}

type VehicleLibraryLot = {
  id: string
  name: string
  address?: string | null
  remark?: string | null
  materialStatus: 'incomplete' | 'complete'
  coverAsset?: {
    url?: string | null
    thumbnailUrl?: string | null
  } | null
  materials?: VehicleLibraryMaterial[]
  updatedAt: string
}

type VehicleLibraryPage<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

function formatDateTime(value?: string | null) {
  if (!value)
    return ''
  return value.slice(0, 19).replace('T', ' ')
}

function mapLot(lot: VehicleLibraryLot): LotTask {
  const materials = lot.materials ?? []
  const uploadedSlotCodes = new Set(
    materials
      .filter(item => item.status === 'active' && LOT_REQUIRED_SLOT_CODES.includes(item.slotCode as typeof LOT_REQUIRED_SLOT_CODES[number]))
      .map(item => item.slotCode),
  )
  const coverMaterial = materials.find(item => item.slotCode === 'lot_image' && item.status === 'active')
  const coverUrl = lot.coverAsset?.thumbnailUrl
    || lot.coverAsset?.url
    || coverMaterial?.assetThumbnailUrl
    || coverMaterial?.assetUrl
    || undefined

  return {
    id: lot.id,
    name: lot.name,
    address: lot.address || undefined,
    remark: lot.remark || undefined,
    coverUrl,
    photoCount: lot.materials
      ? uploadedSlotCodes.size
      : lot.materialStatus === 'complete' ? LOT_REQUIRED_SLOT_CODES.length : 0,
    requiredPhotoCount: LOT_REQUIRED_SLOT_CODES.length,
    materialStatus: lot.materialStatus,
    updatedAt: formatDateTime(lot.updatedAt),
  }
}

function mapQueryParams(params: LotQueryParams) {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.keyword,
  }
}

export function getLotList(params: LotQueryParams) {
  return http
    .get<VehicleLibraryPage<VehicleLibraryLot>>(`${VEHICLE_LIBRARY_BASE}/lots`, mapQueryParams(params))
    .then<PaginationResult<LotTask>>(result => ({
      list: result.items.map(mapLot),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    }))
}

export function createLot(payload: {
  name: string
  address?: string | null
  remark?: string | null
}) {
  return http
    .post<VehicleLibraryLot>(`${VEHICLE_LIBRARY_BASE}/lots`, payload)
    .then(mapLot)
}

export function getLotMaterials(lotId: string) {
  return http
    .get<VehicleLibraryLot>(`${VEHICLE_LIBRARY_BASE}/lots/${lotId}`)
    .then(lot => ({
      lot: mapLot(lot),
      materials: (lot.materials ?? []).map(material => ({
        slotCode: material.slotCode,
        status: material.status,
        assetId: material.assetId ?? undefined,
        mediaType: material.mediaType,
        fileName: material.fileName ?? undefined,
        fileSize: material.fileSize ?? undefined,
        assetUrl: material.assetUrl,
        assetThumbnailUrl: material.assetThumbnailUrl,
      })),
    }))
}

export function deleteLotMaterial(lotId: string, slotCode: string) {
  return http.delete<void>(`${VEHICLE_LIBRARY_BASE}/lots/${lotId}/materials/${slotCode}`)
}
