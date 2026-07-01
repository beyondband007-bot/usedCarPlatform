import { normalizeApiErrorMessage, request } from '@/api/http'
import type { ApiResponse } from '@/api/visual-workbench'

export type VinVehicleInfo = Record<string, unknown>

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
  const response = await request.post<ApiResponse<VinVehicleInfo>>(
    '/vehicle-info/vin-query',
    { vin },
  )
  if (response.code !== 0) {
    throw new Error(normalizeApiErrorMessage(response.message || 'VIN 查询失败'))
  }
  return response.data
}
