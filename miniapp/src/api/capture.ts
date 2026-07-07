import type { CapturePosition, CreatePhotoParams } from '@/types/upload'
import { DEFAULT_CAPTURE_POSITIONS } from '@/constants/capture'
import { http } from '@/http/http'

export function getCapturePositions(_vehicleId: string) {
  return Promise.resolve<CapturePosition[]>(DEFAULT_CAPTURE_POSITIONS)
}

export function createVehiclePhoto(vehicleId: string, data: CreatePhotoParams) {
  return bindVehicleMaterial(vehicleId, data)
}

export function deleteVehiclePhoto(vehicleId: string, slotCode: string) {
  return deleteVehicleMaterial(vehicleId, slotCode)
}

export function updateVehiclePhoto(vehicleId: string, slotCode: string, data: Partial<CreatePhotoParams>) {
  return bindVehicleMaterial(vehicleId, { ...data, captureCode: data.captureCode || slotCode } as CreatePhotoParams)
}

export function retryVehiclePhoto(_vehicleId: string, _slotCode: string) {
  return Promise.resolve()
}

export function createVehicleVideo(vehicleId: string, data: CreatePhotoParams) {
  return bindVehicleMaterial(vehicleId, data)
}

export function deleteVehicleVideo(vehicleId: string, slotCode: string) {
  return deleteVehicleMaterial(vehicleId, slotCode)
}

function bindVehicleMaterial(vehicleId: string, data: CreatePhotoParams) {
  if (!data.assetId) {
    return Promise.reject(new Error('缺少 assetId，车辆库素材需先上传资产再绑定'))
  }
  return http.put(`/api/v1/vehicle-library/vehicles/${vehicleId}/materials/${data.captureCode}`, {
    assetId: data.assetId,
  })
}

function deleteVehicleMaterial(vehicleId: string, slotCode: string) {
  return http.delete<void>(`/api/v1/vehicle-library/vehicles/${vehicleId}/materials/${slotCode}`)
}
