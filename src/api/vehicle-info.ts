import { normalizeApiErrorMessage, request } from '@/api/http'
import type { ApiResponse } from '@/api/visual-workbench'

export interface VinApiData extends Record<string, unknown> {
  vin?: string
  brand?: string
  manufacturer?: string
  typename?: string
  yeartype?: string
  name?: string
  sizetype?: string
  bodytype?: string
  environmentalstandards?: string
  enginemodel?: string
  displacement?: string
  displacementml?: string | number | null
  fueltype?: string
  fuelgrade?: string
  gearbox?: string
  geartype?: string
  gearnum?: string | number | null
  drivemode?: string
  maxhorsepower?: string | number | null
  comfuelconsumption?: string | number | null
  price?: string
  len?: string | number | null
  width?: string | number | null
  height?: string | number | null
  wheelbase?: string | number | null
  seatnum?: string | number | null
  doornum?: string | number | null
}

export interface VehicleBasicInfo {
  brandName: string
  manufacturerName: string
  seriesName: string
  year: string
  fullModelName: string
  vehicleLevel: string
  bodyType: string
  emissionStandard: string
  engineModel: string
  displacement: string
  displacementMl: number | null
  fuelType: string
  fuelGrade: string
  gearbox: string
  gearboxType: string
  gearCount: number | null
  driveMode: string
  maxHorsepower: number | null
  combinedFuelConsumption: number | null
  guidePrice: string
  length: number | null
  width: number | null
  height: number | null
  wheelbase: number | null
  seatCount: number | null
  doorCount: number | null
}

const toNumberOrNull = (
  value: string | number | null | undefined,
): number | null => {
  if (value === null || value === undefined || value === '' || value === '-') return null
  const result = Number(value)
  return Number.isFinite(result) ? result : null
}

export const normalizeVehicleInfo = (data: VinApiData): VehicleBasicInfo => ({
  brandName: data.brand || '',
  manufacturerName: data.manufacturer || '',
  seriesName: data.typename || '',
  year: data.yeartype || '',
  fullModelName: data.name || '',
  vehicleLevel: data.sizetype || '',
  bodyType: data.bodytype || '',
  emissionStandard: data.environmentalstandards || '',
  engineModel: data.enginemodel || '',
  displacement: data.displacement || '',
  displacementMl: toNumberOrNull(data.displacementml),
  fuelType: data.fueltype || '',
  fuelGrade: data.fuelgrade || '',
  gearbox: data.gearbox || '',
  gearboxType: data.geartype || '',
  gearCount: toNumberOrNull(data.gearnum),
  driveMode: data.drivemode || '',
  maxHorsepower: toNumberOrNull(data.maxhorsepower),
  combinedFuelConsumption: toNumberOrNull(data.comfuelconsumption),
  guidePrice: data.price || '',
  length: toNumberOrNull(data.len),
  width: toNumberOrNull(data.width),
  height: toNumberOrNull(data.height),
  wheelbase: toNumberOrNull(data.wheelbase),
  seatCount: toNumberOrNull(data.seatnum),
  doorCount: toNumberOrNull(data.doornum),
})

export async function recognizeVinFromImage(file: File) {
  const formData = new FormData()
  formData.append('image', file)
  const response = await request.post<ApiResponse<{ vin: string }>>(
    '/vehicle-info/vin-ocr',
    formData,
  )
  if (response.code !== 0) {
    throw new Error(normalizeApiErrorMessage(response.message || 'VIN 图片识别失败'))
  }
  return response.data.vin
}

export async function queryVehicleByVin(vin: string) {
  const response = await request.post<ApiResponse<VinApiData>>(
    '/vehicle-info/vin-query',
    { vin },
  )
  if (response.code !== 0) {
    throw new Error(normalizeApiErrorMessage(response.message || 'VIN 查询失败'))
  }
  return response.data
}
