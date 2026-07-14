import type { ApiResponse } from '@/types/api'
import { http } from '@/http/http'
import { useTokenStore } from '@/store'
import { getEnvBaseUrl } from '@/utils'

export interface VinApiData extends Record<string, unknown> {
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
  fueltype?: string
  fuel_Type?: string
  fuelgrade?: string
  fuel_num?: string
  gearbox?: string
  transmission_type?: string
  geartype?: string
  guiding_price?: string
  price?: string
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
  fuelType: string
  fuelGrade: string
  gearbox: string
  gearboxType: string
  guidePrice: string
}

export function normalizeVehicleInfo(data: VinApiData): VehicleBasicInfo {
  return {
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
    fuelType: data.fueltype || data.fuel_Type || '',
    fuelGrade: data.fuelgrade || data.fuel_num || '',
    gearbox: data.gearbox || data.transmission_type || '',
    gearboxType: data.geartype || '',
    guidePrice: data.price || data.guiding_price || '',
  }
}

export function queryVehicleByVinShowApi(vin: string) {
  return http
    .post<VinApiData>('/api/v1/vehicle-info/vin-query/showapi', { vin })
    .then(normalizeVehicleInfo)
}

export function recognizeVinFromImage(filePath: string) {
  return new Promise<string>((resolve, reject) => {
    const baseUrl = getEnvBaseUrl().replace(/\/$/, '')
    const token = useTokenStore().updateNowTime().validToken
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const task = uni.uploadFile({
      url: `${baseUrl}/api/v1/vehicle-info/vin-ocr`,
      filePath,
      name: 'image',
      timeout: 20_000,
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        try {
          const body = typeof res.data === 'string'
            ? JSON.parse(res.data) as ApiResponse<{ vin: string }>
            : res.data as ApiResponse<{ vin: string }>
          if (res.statusCode < 200 || res.statusCode >= 300 || ![0, 200].includes(body.code)) {
            reject(new Error(body.message || 'VIN 图片识别失败'))
            return
          }
          resolve(body.data.vin)
        }
        catch (error) {
          reject(error)
        }
      },
      fail: reject,
      complete: () => {
        if (timeoutId)
          clearTimeout(timeoutId)
      },
    })

    timeoutId = setTimeout(() => {
      task.abort()
      reject(new Error('VIN 图片识别超时，请稍后重试'))
    }, 22_000)
  })
}
