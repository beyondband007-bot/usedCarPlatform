import type { VehicleTaskStatus } from '@/types/vehicle'
import { DEFAULT_CAPTURE_POSITIONS } from '@/constants/capture'
import { useUploadStore } from '@/store/upload'
import { useVehicleStore } from '@/store/vehicle'

export function countVehicleUploadedAssets(vehicleId: string) {
  const uploadStore = useUploadStore()
  const successCodes = new Set(
    uploadStore.queue
      .filter(task => task.vehicleId === vehicleId && task.status === 'success')
      .map(task => task.captureCode),
  )
  return DEFAULT_CAPTURE_POSITIONS.filter(item => successCodes.has(item.code)).length
}

export function getVehicleCoverUrl(vehicleId: string) {
  const uploadStore = useUploadStore()
  const frontTask = uploadStore.queue.find(task =>
    task.vehicleId === vehicleId
    && task.captureCode === 'front_image'
    && task.status === 'success',
  )
  return frontTask?.remoteUrl || frontTask?.localPath
}

export function syncVehicleCaptureProgress(vehicleId: string) {
  const photoCount = countVehicleUploadedAssets(vehicleId)
  const coverUrl = getVehicleCoverUrl(vehicleId)

  const vehicleStore = useVehicleStore()
  const vehicle = vehicleStore.list.find(item => item.id === vehicleId)
    || (vehicleStore.currentVehicle?.id === vehicleId ? vehicleStore.currentVehicle : undefined)
  if (!vehicle)
    return

  const status: VehicleTaskStatus = photoCount >= vehicle.requiredPhotoCount
    ? 'waiting_complete'
    : photoCount > 0
      ? 'capturing'
      : 'waiting_capture'

  const updated = {
    ...vehicle,
    photoCount,
    coverUrl: coverUrl || vehicle.coverUrl,
    status,
    updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
  }
  vehicleStore.setList(vehicleStore.list.map(item => item.id === vehicleId ? updated : item))
  if (vehicleStore.currentVehicle?.id === vehicleId)
    vehicleStore.setCurrentVehicle(updated)
}
