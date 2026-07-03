import { normalizeApiErrorMessage, request } from '@/api/http'
import type { ApiResponse } from '@/api/visual-workbench'

export interface VinApiData extends Record<string, unknown> {
  carid?: number
  vin?: string
  brand?: string
  brand_name?: string
  manufacturer?: string
  assembly_factory?: string
  typename?: string
  car_line?: string
  yeartype?: string
  year?: string
  name?: string
  sale_name?: string
  sizetype?: string
  vehicle_level?: string
  model_name?: string
  car_type?: string
  bodytype?: string
  car_body?: string
  environmentalstandards?: string
  effluent_standard?: string
  enginemodel?: string
  engine_type?: string
  displacement?: string
  output_volume?: string
  displacementml?: string | number | null
  fueltype?: string
  fuel_Type?: string
  fuelgrade?: string
  fuel_num?: string
  gearbox?: string
  transmission_type?: string
  geartype?: string
  gearnum?: string | number | null
  gears_num?: string | number | null
  drivemode?: string
  drive_style?: string
  maxhorsepower?: string | number | null
  power?: string | number | null
  comfuelconsumption?: string | number | null
  price?: string
  guiding_price?: string
  len?: string | number | null
  width?: string | number | null
  height?: string | number | null
  wheelbase?: string | number | null
  seatnum?: string | number | null
  seat_num?: string | number | null
  doornum?: string | number | null
  door_num?: string | number | null
  carlist?: VinVehicleCandidate[]
}

export interface VinVehicleCandidate {
  carid: number
  typeid?: number
  name: string
  typename?: string
  price?: string
  displacement?: string
}

export interface VehicleBasicInfo {
  brandName: string
  manufacturerName: string
  seriesName: string
  year: string
  modelName: string
  fullModelName: string
  carType: string
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
  brandName: data.brand || data.brand_name || '',
  manufacturerName: data.manufacturer || data.assembly_factory || '',
  seriesName: data.typename || data.car_line || '',
  year: data.yeartype || data.year || '',
  modelName: data.model_name || '',
  fullModelName: data.name || data.sale_name || '',
  carType: data.car_type || '',
  vehicleLevel: data.sizetype || data.vehicle_level || '',
  bodyType: data.bodytype || data.car_body || '',
  emissionStandard: data.environmentalstandards || data.effluent_standard || '',
  engineModel: data.enginemodel || data.engine_type || '',
  displacement: data.displacement || data.output_volume || '',
  displacementMl: toNumberOrNull(data.displacementml),
  fuelType: data.fueltype || data.fuel_Type || '',
  fuelGrade: data.fuelgrade || data.fuel_num || '',
  gearbox: data.gearbox || data.transmission_type || '',
  gearboxType: data.geartype || '',
  gearCount: toNumberOrNull(data.gearnum ?? data.gears_num),
  driveMode: data.drivemode || data.drive_style || '',
  maxHorsepower: toNumberOrNull(data.maxhorsepower ?? data.power),
  combinedFuelConsumption: toNumberOrNull(data.comfuelconsumption),
  guidePrice: data.price || data.guiding_price || '',
  length: toNumberOrNull(data.len),
  width: toNumberOrNull(data.width),
  height: toNumberOrNull(data.height),
  wheelbase: toNumberOrNull(data.wheelbase),
  seatCount: toNumberOrNull(data.seatnum ?? data.seat_num),
  doorCount: toNumberOrNull(data.doornum ?? data.door_num),
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

export async function queryVehicleByVinShowApi(vin: string) {
  const response = await request.post<ApiResponse<VinApiData>>(
    '/vehicle-info/vin-query/showapi',
    { vin },
  )
  if (response.code !== 0) {
    throw new Error(normalizeApiErrorMessage(response.message || 'VIN 查询失败'))
  }
  return response.data
}
