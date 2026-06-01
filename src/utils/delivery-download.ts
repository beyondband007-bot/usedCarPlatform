import type { DeliveryResultItem } from '@/constants/delivery-results'
import {
  downloadFilesAsZip,
  sanitizeFilename,
  type DownloadFileItem,
} from '@/utils/download'

export interface DeliveryDownloadTask {
  title: string
  progress: number
  imageCount: number
}

export interface DeliveryAssetDownloadItem {
  title: string
  url: string
  ratio?: string
}

export function buildDeliveryDownloadFiles(tasks: DeliveryDownloadTask[]) {
  const files: DownloadFileItem[] = []

  for (const task of tasks) {
    if (task.progress < 100) continue

    const count = Math.max(task.imageCount, 1)

    for (let index = 0; index < count; index += 1) {
      files.push({
        url: '',
        filename: `${sanitizeFilename(task.title)}-${String(index + 1).padStart(2, '0')}.jpg`,
      })
    }
  }

  return files.filter((item) => item.url)
}

export function buildDeliveryAssetDownloadFiles(
  assets: DeliveryAssetDownloadItem[],
) {
  return assets.map((item, index) => ({
    url: item.url,
    filename: `${String(index + 1).padStart(2, '0')}-${sanitizeFilename(item.title)}.jpg`,
  }))
}

export function buildDeliveryGalleryDownloadFiles(items: DeliveryResultItem[]) {
  return items.map((item, index) => ({
    url: item.image,
    filename: `${String(index + 1).padStart(2, '0')}-${sanitizeFilename(item.title)}.jpg`,
  }))
}

export async function downloadDeliveryTasks(tasks: DeliveryDownloadTask[]) {
  const files = buildDeliveryDownloadFiles(tasks)
  if (!files.length) return 0

  await downloadFilesAsZip(files, 'delivery-results.zip')
  return files.length
}

export async function downloadDeliveryAssets(assets: DeliveryAssetDownloadItem[]) {
  const files = buildDeliveryAssetDownloadFiles(assets)
  if (!files.length) return 0

  await downloadFilesAsZip(files, 'delivery-results.zip')
  return files.length
}

export async function downloadDeliveryGalleryAssets(items: DeliveryResultItem[]) {
  const files = buildDeliveryGalleryDownloadFiles(items)
  if (!files.length) return 0

  await downloadFilesAsZip(files, 'delivery-results.zip')
  return files.length
}

export async function downloadAllDeliveryResults() {
  return 0
}
