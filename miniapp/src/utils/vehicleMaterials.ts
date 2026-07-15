import type { UploadTask } from '@/types/upload'
import { deleteVehiclePhoto } from '@/api/capture'
import { getVehicleMaterials } from '@/api/vehicle'
import { CAPTURE_POSITION_MAP } from '@/constants/capture'
import { useUploadStore } from '@/store/upload'
import { useVehicleStore } from '@/store/vehicle'
import { normalizeMediaUrl } from '@/utils/mediaUrl'

function pickMaterialPreviewUrl(
  mediaType: 'image' | 'video',
  assetUrl?: string | null,
  assetThumbnailUrl?: string | null,
) {
  if (mediaType === 'video')
    return normalizeMediaUrl(assetUrl || assetThumbnailUrl)
  return normalizeMediaUrl(assetThumbnailUrl || assetUrl)
}

function buildRemoteTask(
  vehicleId: string,
  material: Awaited<ReturnType<typeof getVehicleMaterials>>['materials'][number],
  existing?: UploadTask,
): UploadTask | null {
  const position = CAPTURE_POSITION_MAP[material.slotCode]
  if (!position)
    return null

  const remoteUrl = pickMaterialPreviewUrl(position.mediaType, material.assetUrl, material.assetThumbnailUrl)
  if (!remoteUrl)
    return null

  return {
    id: existing?.id || `remote_${vehicleId}_${material.slotCode}`,
    vehicleId,
    captureCode: material.slotCode,
    mediaType: position.mediaType,
    localPath: remoteUrl,
    remoteUrl,
    assetId: material.assetId,
    fileName: material.fileName,
    fileSize: material.fileSize,
    progress: 100,
    retryCount: 0,
    status: 'success',
    createdAt: existing?.createdAt ?? Date.now(),
  }
}

export async function hydrateVehicleMaterialsFromServer(vehicleId: string) {
  const { vehicle, materials } = await getVehicleMaterials(vehicleId)
  const uploadStore = useUploadStore()
  const vehicleStore = useVehicleStore()

  vehicleStore.setCurrentVehicle(vehicle)
  const activeMaterials = materials.filter(item => item.status === 'active')

  for (const material of activeMaterials) {
    const existing = uploadStore.queue.find(task =>
      task.vehicleId === vehicleId
      && task.captureCode === material.slotCode
      && task.status !== 'cancelled',
    )
    if (existing && ['waiting', 'uploading'].includes(existing.status))
      continue

    const task = buildRemoteTask(vehicleId, material, existing)
    if (!task)
      continue
    uploadStore.addTask(task)
  }

  return vehicle
}

export async function removeVehicleMaterial(vehicleId: string, slotCode: string, task?: UploadTask) {
  if (task?.status === 'success' && task.assetId) {
    await deleteVehiclePhoto(vehicleId, slotCode)
  }
  if (task)
    useUploadStore().removeTask(task.id)
}
