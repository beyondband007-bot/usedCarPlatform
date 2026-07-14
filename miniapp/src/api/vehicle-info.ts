import type { ApiResponse } from '@/types/api'
import { http } from '@/http/http'
import { useTokenStore } from '@/store'
import { getEnvBaseUrl } from '@/utils'

type OcrLogLevel = 'info' | 'error'

function getOcrErrorMessage(error: unknown) {
  if (error instanceof Error)
    return error.message
  if (error && typeof error === 'object' && 'errMsg' in error && typeof error.errMsg === 'string')
    return error.errMsg
  return String(error || 'unknown error')
}

function reportOcrLog(level: OcrLogLevel, event: string, details: Record<string, unknown> = {}) {
  // #ifdef MP-WEIXIN
  const logger = wx.getRealtimeLogManager?.()
  const logPayload = JSON.stringify({ event, ...details }).slice(0, 900)
  // 不记录图片、VIN 或鉴权信息。
  const payload = JSON.stringify({ event, ...details }).slice(0, 900)
  logger?.[level]('[vin-ocr]', logPayload)
  // #endif
}

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
    const url = `${baseUrl}/api/v1/vehicle-info/vin-ocr`
    const token = useTokenStore().updateNowTime().validToken
    const startedAt = Date.now()
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let timedOut = false
    reportOcrLog('info', 'request_started', { url })
    const task = uni.uploadFile({
      url,
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
            reportOcrLog('error', 'response_error', {
              elapsedMs: Date.now() - startedAt,
              statusCode: res.statusCode,
              code: body.code,
              message: body.message || 'VIN OCR failed',
            })
            reject(new Error(body.message || 'VIN 图片识别失败'))
            return
          }
          reportOcrLog('info', 'request_succeeded', {
            elapsedMs: Date.now() - startedAt,
            statusCode: res.statusCode,
          })
          resolve(body.data.vin)
        }
        catch (error) {
          reportOcrLog('error', 'response_parse_failed', {
            elapsedMs: Date.now() - startedAt,
            message: getOcrErrorMessage(error),
          })
          reject(error)
        }
      },
      fail: (error) => {
        if (!timedOut) {
          reportOcrLog('error', 'upload_failed', {
            elapsedMs: Date.now() - startedAt,
            message: getOcrErrorMessage(error),
          })
        }
        reject(error)
      },
      complete: () => {
        if (timeoutId)
          clearTimeout(timeoutId)
      },
    })

    timeoutId = setTimeout(() => {
      timedOut = true
      reportOcrLog('error', 'request_timeout', {
        elapsedMs: Date.now() - startedAt,
        timeoutMs: 22_000,
      })
      task.abort()
      reject(new Error('VIN 图片识别超时，请稍后重试'))
    }, 22_000)
  })
}
