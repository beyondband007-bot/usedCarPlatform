import type { VehicleLibraryStatus, VehicleIdentifyType } from '@/types/vehicle-library'

const vehicleLibraryServiceStatusLabels: Record<VehicleLibraryStatus, string> = {
  active: '套餐服务有效',
  frozen: '套餐到期已冻结',
  disabled: '套餐服务未开通',
}

export function getVehicleLibraryServiceStatusLabel(status: VehicleLibraryStatus): string {
  return vehicleLibraryServiceStatusLabels[status] ?? vehicleLibraryServiceStatusLabels.disabled
}

const vehicleIdentifyTypeLabels: Record<VehicleIdentifyType, string> = {
  manual: '手动录入',
  vin_text: 'VIN 查询入库',
  vin_image: 'VIN 图片识别入库',
}

export function getVehicleIdentifyTypeLabel(identifyType: VehicleIdentifyType): string {
  return vehicleIdentifyTypeLabels[identifyType] ?? '手动录入'
}
