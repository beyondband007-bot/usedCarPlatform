export type VehicleLibraryStatus = 'active' | 'frozen' | 'disabled'
export type VehicleOwnerType = 'vehicle' | 'lot'
export type VehicleMaterialStatus = 'incomplete' | 'complete'
export type VehicleRecordStatus = 'active' | 'sold' | 'archived'
export type VehicleLotStatus = 'active' | 'archived'
export type VehicleIdentifyType = 'manual' | 'vin_text' | 'vin_image'
export type VehicleLibraryMediaType = 'image' | 'video'
export type VehicleLibraryMaterialRowStatus = 'active' | 'processing' | 'failed' | 'deleted'
export type VehicleLibraryAuditStatus = 'pending' | 'passed' | 'rejected'
export type VehicleRecognitionType = 'vin_text' | 'vin_image'
export type VehicleRecognitionStatus = 'pending' | 'success' | 'failed'

export type VehicleMaterialSlotCode =
  | 'front_image'
  | 'rear_image'
  | 'driver_image'
  | 'front_row_video'
  | 'rear_row_video'
  | 'lot_image'
  | 'lot_video'

export interface VehicleLibrary {
  id: string
  tenantId?: string | null
  ownerUserId: string
  name: string
  status: VehicleLibraryStatus
  quotaBytes: number
  usedBytes: number
  remark?: string | null
  createdAt: string
  updatedAt: string
}

export interface VehicleLibraryStats {
  activeVehicles: number
  completeVehicles: number
  activeLots: number
  usedBytes: number
  quotaBytes: number
  quotaVehicles?: number | null
  quotaLots?: number | null
  planCode?: string | null
}

export interface VehicleLibraryHome {
  library: VehicleLibrary
  stats: VehicleLibraryStats
}

export interface VehicleLibraryAssetSummary {
  assetId: string
  url?: string | null
  thumbnailUrl?: string | null
}

export interface VehicleLibraryMaterial {
  id: string
  libraryId: string
  ownerType: VehicleOwnerType
  ownerId: string
  assetId: string
  slotCode: VehicleMaterialSlotCode
  mediaType: VehicleLibraryMediaType
  fileName?: string | null
  fileSize?: number | null
  durationSeconds?: string | null
  width?: number | null
  height?: number | null
  isRequired: boolean
  isCover: boolean
  sortOrder: number
  status: VehicleLibraryMaterialRowStatus
  auditStatus: VehicleLibraryAuditStatus
  metadata?: Record<string, unknown> | null
  createdByUserId: string
  assetUrl?: string | null
  assetThumbnailUrl?: string | null
  assetMimeType?: string | null
  createdAt: string
  updatedAt: string
}

export interface VehicleLot {
  id: string
  libraryId: string
  name: string
  address?: string | null
  remark?: string | null
  materialStatus: VehicleMaterialStatus
  status: VehicleLotStatus
  createdByUserId: string
  updatedByUserId?: string | null
  coverAsset?: VehicleLibraryAssetSummary | null
  materials?: VehicleLibraryMaterial[]
  createdAt: string
  updatedAt: string
}

export interface VehicleRecord {
  id: string
  libraryId: string
  lotId?: string | null
  lotName?: string | null
  vin?: string | null
  identifyType: VehicleIdentifyType
  brand: string
  series: string
  model?: string | null
  modelName?: string | null
  modelYear?: string | null
  carType?: string | null
  bodyType?: string | null
  energyType?: string | null
  fuelGrade?: string | null
  displacement?: string | null
  transmission?: string | null
  vehicleLevel?: string | null
  emissionStandard?: string | null
  color?: string | null
  mileageKm?: number | null
  firstRegistrationDate?: string | null
  guidePrice?: string | null
  salePrice?: string | null
  remark?: string | null
  materialStatus: VehicleMaterialStatus
  status: VehicleRecordStatus
  lastGeneratedAt?: string | null
  createdByUserId: string
  updatedByUserId?: string | null
  coverAsset?: VehicleLibraryAssetSummary | null
  materials?: VehicleLibraryMaterial[]
  createdAt: string
  updatedAt: string
}

export interface VehicleRecognitionRecord {
  id: string
  libraryId: string
  vehicleId?: string | null
  recognitionType: VehicleRecognitionType
  inputVin?: string | null
  sourceAssetId?: string | null
  recognizedVin?: string | null
  providerCode?: string | null
  confidence?: string | null
  status: VehicleRecognitionStatus
  result?: Record<string, unknown> | null
  errorCode?: string | null
  errorMessage?: string | null
  createdByUserId: string
  createdAt: string
}

export interface PageResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export interface UpsertVehiclePayload {
  libraryId?: string
  lotId?: string | null
  vin?: string | null
  identifyType?: VehicleIdentifyType
  brand: string
  series: string
  model?: string | null
  modelName?: string | null
  modelYear?: string | null
  carType?: string | null
  bodyType?: string | null
  energyType?: string | null
  fuelGrade?: string | null
  displacement?: string | null
  transmission?: string | null
  vehicleLevel?: string | null
  emissionStandard?: string | null
  color?: string | null
  mileageKm?: number | null
  firstRegistrationDate?: string | null
  guidePrice?: string | number | null
  salePrice?: string | number | null
  remark?: string | null
  status?: VehicleRecordStatus
}

export interface UpsertVehicleLotPayload {
  libraryId?: string
  name: string
  address?: string | null
  remark?: string | null
  status?: VehicleLotStatus
}

export interface PutVehicleLibraryMaterialPayload {
  libraryId?: string
  assetId: string
  metadata?: Record<string, unknown>
}

export interface VehicleLibraryListParams {
  libraryId?: string
  page?: number
  pageSize?: number
  search?: string
}

export interface VehicleListParams extends VehicleLibraryListParams {
  status?: VehicleRecordStatus
  materialStatus?: VehicleMaterialStatus
  lotId?: string
  missing?: 'exterior' | 'driver' | 'video'
  sort?: 'updated' | 'complete'
}

export interface VehicleQueryParams {
  libraryId?: string
  vin?: string
  brand?: string
  modelYear?: string
  model?: string
  page?: number
  pageSize?: number
}
