import type { CaptureMediaType, UploadTask } from '@/types/upload'
import { http } from '@/http/http'
import { normalizeMediaUrl } from '@/utils/mediaUrl'

type AssetPurpose = 'car_exterior' | 'car_interior'

interface UploadedAsset {
  assetId: string
  purpose: AssetPurpose
  url: string
  thumbnailUrl?: string | null
  fileName?: string
  mimeType?: string
  size?: number
  width?: number | null
  height?: number | null
  createdAt?: string
}

export interface UploadFileOptions {
  vehicleId: string
  captureCode: string
  filePath: string
  mediaType?: CaptureMediaType
  name?: string
  formData?: Record<string, any>
  onProgress?: (progress: number) => void
}

function getUploadPurpose(captureCode: string): AssetPurpose {
  if (captureCode === 'lot_image' || captureCode === 'front_image' || captureCode === 'rear_image')
    return 'car_exterior'
  return 'car_interior'
}

function parseUploadResponse(res: UniApp.UploadFileSuccessCallbackResult) {
  const body = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
  if (res.statusCode < 200 || res.statusCode >= 300 || (body.code != null && ![0, 200].includes(body.code))) {
    throw new Error(body.message || body.msg || `上传失败（${res.statusCode}）`)
  }
  return (body.data || body) as UploadedAsset
}

function uploadAsset(options: UploadFileOptions) {
  return new Promise<UploadedAsset>((resolve, reject) => {
    const task = uni.uploadFile({
      url: '/assets/upload',
      filePath: options.filePath,
      name: options.name || 'file',
      formData: {
        purpose: getUploadPurpose(options.captureCode),
        ...options.formData,
      },
      success: (res) => {
        try {
          resolve(parseUploadResponse(res))
        }
        catch (error) {
          reject(error)
        }
      },
      fail: reject,
    })
    task.onProgressUpdate((event) => {
      options.onProgress?.(Math.min(event.progress, 95))
    })
  })
}

async function uploadOwnerFile(options: UploadFileOptions & { ownerType?: 'vehicle' | 'lot' }) {
  const asset = await uploadAsset(options)
  const ownerType = options.ownerType || 'vehicle'
  const materialBase = ownerType === 'lot'
    ? `/vehicle-library/lots/${options.vehicleId}/materials/${options.captureCode}`
    : `/vehicle-library/vehicles/${options.vehicleId}/materials/${options.captureCode}`
  await http.put(materialBase, {
    assetId: asset.assetId,
  })
  options.onProgress?.(100)
  return {
    assetId: asset.assetId,
    remoteUrl: normalizeMediaUrl(asset.thumbnailUrl || asset.url),
    fileName: asset.fileName,
    fileSize: asset.size,
  } satisfies Partial<UploadTask>
}

async function uploadVehicleFile(options: UploadFileOptions) {
  return uploadOwnerFile({ ...options, ownerType: 'vehicle' })
}

async function uploadLotFile(options: UploadFileOptions) {
  return uploadOwnerFile({ ...options, ownerType: 'lot' })
}

export function uploadVehiclePhoto(options: UploadFileOptions) {
  return uploadVehicleFile(options)
}

export function uploadVehicleVideo(options: UploadFileOptions) {
  return uploadVehicleFile(options)
}

export function uploadVehicleMedia(options: UploadFileOptions) {
  return uploadVehicleFile(options)
}

export function uploadLotMedia(options: UploadFileOptions) {
  return uploadLotFile(options)
}
