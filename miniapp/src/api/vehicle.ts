import type { PaginationResult } from '@/types/api'
import type { VehicleCreateParams, VehicleQueryParams, VehicleTask, VehicleTaskStatus, VehicleUpdateParams } from '@/types/vehicle'
import { http } from '@/http/http'

const VEHICLE_LIBRARY_BASE = '/api/v1/vehicle-library'
const REQUIRED_SLOT_CODES = ['front_image', 'rear_image', 'driver_image', 'front_row_video', 'rear_row_video']

type VehicleLibraryMaterial = {
  slotCode: string
  status: 'active' | 'processing' | 'failed' | 'deleted'
  isRequired?: boolean
  isCover?: boolean
  assetId?: string | null
  mediaType?: 'image' | 'video' | string
  fileName?: string | null
  fileSize?: number | null
  assetUrl?: string | null
  assetThumbnailUrl?: string | null
}

type VehicleLibraryVehicle = {
  id: string
  vin?: string | null
  brand: string
  series: string
  model?: string | null
  modelName?: string | null
  modelYear?: string | null
  color?: string | null
  mileageKm?: number | null
  firstRegistrationDate?: string | null
  remark?: string | null
  materialStatus: 'incomplete' | 'complete'
  status: 'active' | 'sold' | 'archived'
  coverAsset?: {
    url?: string | null
    thumbnailUrl?: string | null
  } | null
  materials?: VehicleLibraryMaterial[]
  createdAt: string
  updatedAt: string
}

type VehicleLibraryPage<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export type VehicleLibraryStats = {
  activeVehicles: number
  completeVehicles: number
  activeLots: number
  usedBytes: number
  quotaBytes: number
  quotaVehicles?: number | null
  quotaLots?: number | null
  planCode?: string | null
}

export type VehicleLibraryHome = {
  library: {
    id: string
    name: string
    usedBytes: number
    quotaBytes: number
  }
  stats: VehicleLibraryStats
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return ''
  }
  return value.slice(0, 19).replace('T', ' ')
}

function mapVehicleStatus(vehicle: VehicleLibraryVehicle, photoCount: number, requiredPhotoCount: number): VehicleTaskStatus {
  const materials = vehicle.materials ?? []
  if (materials.some(item => item.status === 'failed')) {
    return 'failed'
  }
  if (materials.some(item => item.status === 'processing')) {
    return 'uploading'
  }
  if (vehicle.materialStatus === 'complete' || photoCount >= requiredPhotoCount) {
    return 'completed'
  }
  if (photoCount > 0) {
    return 'capturing'
  }
  return 'waiting_capture'
}

function mapVehicle(vehicle: VehicleLibraryVehicle): VehicleTask {
  const materials = vehicle.materials ?? []
  const uploadedSlotCodes = new Set(
    materials
      .filter(item => item.status === 'active' && REQUIRED_SLOT_CODES.includes(item.slotCode))
      .map(item => item.slotCode),
  )
  const coverMaterial = materials.find(item => item.isCover && item.status === 'active')
  const photoCount = uploadedSlotCodes.size
  const requiredPhotoCount = REQUIRED_SLOT_CODES.length
  const coverUrl = vehicle.coverAsset?.thumbnailUrl
    || vehicle.coverAsset?.url
    || coverMaterial?.assetThumbnailUrl
    || coverMaterial?.assetUrl
    || undefined

  return {
    id: vehicle.id,
    brandName: vehicle.brand,
    seriesName: vehicle.series,
    modelName: vehicle.modelName || vehicle.model || vehicle.modelYear || '',
    colorName: vehicle.color || '',
    vin: vehicle.vin || undefined,
    mileage: vehicle.mileageKm ?? undefined,
    registerDate: vehicle.firstRegistrationDate || undefined,
    coverUrl,
    photoCount,
    requiredPhotoCount,
    status: mapVehicleStatus(vehicle, photoCount, requiredPhotoCount),
    remark: vehicle.remark || undefined,
    createdAt: formatDateTime(vehicle.createdAt),
    updatedAt: formatDateTime(vehicle.updatedAt),
  }
}

function compactPayload(payload: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== ''),
  )
}

function mapVehiclePayload(data: VehicleCreateParams | VehicleUpdateParams) {
  return compactPayload({
    vin: data.vin,
    brand: data.brandName,
    series: data.seriesName,
    model: data.model,
    modelName: data.modelName,
    modelYear: data.modelYear,
    carType: data.carType,
    bodyType: data.bodyType,
    energyType: data.energyType,
    fuelGrade: data.fuelGrade,
    displacement: data.displacement,
    transmission: data.transmission,
    vehicleLevel: data.vehicleLevel,
    emissionStandard: data.emissionStandard,
    guidePrice: data.guidePrice,
    identifyType: data.identifyType,
    color: data.colorName,
    mileageKm: data.mileage,
    firstRegistrationDate: data.registerDate,
    remark: data.remark,
  })
}

function mapQueryParams(params: VehicleQueryParams) {
  const query: Record<string, any> = {
    page: params.page,
    pageSize: params.pageSize,
    search: params.keyword,
    sort: 'updated',
  }

  if (params.status === 'completed') {
    query.materialStatus = 'complete'
  }
  else if (params.status && params.status !== 'all') {
    query.materialStatus = 'incomplete'
  }

  return query
}

export function getVehicleLibraryHome() {
  return http.get<VehicleLibraryHome>(`${VEHICLE_LIBRARY_BASE}/me`)
}

export function getVehicleList(params: VehicleQueryParams) {
  return http
    .get<VehicleLibraryPage<VehicleLibraryVehicle>>(`${VEHICLE_LIBRARY_BASE}/vehicles`, mapQueryParams(params))
    .then<PaginationResult<VehicleTask>>(result => ({
      list: result.items.map(mapVehicle),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    }))
}

export function createVehicle(data: VehicleCreateParams) {
  return http
    .post<VehicleLibraryVehicle>(`${VEHICLE_LIBRARY_BASE}/vehicles`, mapVehiclePayload(data))
    .then(mapVehicle)
}

export function getVehicleDetail(id: string) {
  return http
    .get<VehicleLibraryVehicle>(`${VEHICLE_LIBRARY_BASE}/vehicles/${id}`)
    .then(mapVehicle)
}

export function getVehicleMaterials(vehicleId: string) {
  return http
    .get<VehicleLibraryVehicle>(`${VEHICLE_LIBRARY_BASE}/vehicles/${vehicleId}`)
    .then(vehicle => ({
      vehicle: mapVehicle(vehicle),
      materials: (vehicle.materials ?? []).map(material => ({
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

export function updateVehicle(id: string, data: VehicleUpdateParams) {
  return http<VehicleLibraryVehicle>({
    url: `${VEHICLE_LIBRARY_BASE}/vehicles/${id}`,
    method: 'PATCH' as UniApp.RequestOptions['method'],
    data: mapVehiclePayload(data),
  })
    .then(mapVehicle)
}

export function deleteVehicle(id: string) {
  return http.delete<void>(`${VEHICLE_LIBRARY_BASE}/vehicles/${id}`)
}

export function submitVehicle(id: string) {
  return getVehicleDetail(id)
}
