import type { VehicleLibraryStatus } from '@/types/vehicle-library'

/** 车辆库企业服务状态展示文案；当前暂写死，后续按套餐/权限系统映射。 */
export function getVehicleLibraryServiceStatusLabel(_status: VehicleLibraryStatus): string {
  return '企业服务有效'
}
