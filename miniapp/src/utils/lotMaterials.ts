import type { UploadTask } from '@/types/upload'
import { deleteLotMaterial, getLotMaterials } from '@/api/lot'
import { LOT_CAPTURE_POSITION_MAP } from '@/constants/capture'
import { useUploadStore } from '@/store/upload'

function resolveMaterialUrl(url?: string | null) {
  const value = url?.trim()
  if (!value)
    return ''
  if (/^https?:\/\//i.test(value))
    return value
  const baseUrl = String(import.meta.env.VITE_SERVER_BASEURL || '').replace(/\/$/, '')
  if (!baseUrl)
    return value
  return `${baseUrl}${value.startsWith('/') ? value : `/${value}`}`
}

function pickMaterialPreviewUrl(
  mediaType: 'image' | 'video',
  assetUrl?: string | null,
  assetThumbnailUrl?: string | null,
) {
  if (mediaType === 'video')
    return resolveMaterialUrl(assetUrl || assetThumbnailUrl)
  return resolveMaterialUrl(assetThumbnailUrl || assetUrl)
}

function buildRemoteTask(
  lotId: string,
  material: Awaited<ReturnType<typeof getLotMaterials>>['materials'][number],
  existing?: UploadTask,
): UploadTask | null {
  const position = LOT_CAPTURE_POSITION_MAP[material.slotCode]
  if (!position)
    return null

  const remoteUrl = pickMaterialPreviewUrl(position.mediaType, material.assetUrl, material.assetThumbnailUrl)
  if (!remoteUrl)
    return null

  return {
    id: existing?.id || `remote_lot_${lotId}_${material.slotCode}`,
    vehicleId: lotId,
    ownerType: 'lot',
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

export async function hydrateLotMaterialsFromServer(lotId: string) {
  const { lot, materials } = await getLotMaterials(lotId)
  const uploadStore = useUploadStore()
  const activeMaterials = materials.filter(item => item.status === 'active')

  for (const material of activeMaterials) {
    const existing = uploadStore.queue.find(task =>
      task.vehicleId === lotId
      && task.ownerType === 'lot'
      && task.captureCode === material.slotCode
      && task.status !== 'cancelled',
    )
    if (existing && ['waiting', 'uploading'].includes(existing.status))
      continue

    const task = buildRemoteTask(lotId, material, existing)
    if (!task)
      continue
    uploadStore.addTask(task)
  }

  return lot
}

export async function removeLotMaterial(lotId: string, slotCode: string, task?: UploadTask) {
  if (task?.status === 'success' && task.assetId)
    await deleteLotMaterial(lotId, slotCode)
  if (task)
    useUploadStore().removeTask(task.id)
}
