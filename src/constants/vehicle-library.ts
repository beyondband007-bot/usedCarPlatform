import type { VehicleLibraryStatus, VehicleIdentifyType } from '@/types/vehicle-library'

/** 车辆库企业服务状态展示文案；当前暂写死，后续按套餐/权限系统映射。 */
export function getVehicleLibraryServiceStatusLabel(_status: VehicleLibraryStatus): string {
  return '企业服务有效'
}

const vehicleIdentifyTypeLabels: Record<VehicleIdentifyType, string> = {
  manual: '手动录入',
  vin_text: 'VIN 查询入库',
  vin_image: 'VIN 图片识别入库',
}

export function getVehicleIdentifyTypeLabel(identifyType: VehicleIdentifyType): string {
  return vehicleIdentifyTypeLabels[identifyType] ?? '手动录入'
}
