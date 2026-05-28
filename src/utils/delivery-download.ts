import { deliveryResults } from '@/constants/delivery-results'
import {
  downloadFilesSequentially,
  sanitizeFilename,
  type DownloadFileItem,
} from '@/utils/download'

export interface DeliveryDownloadTask {
  title: string
  progress: number
  imageCount: number
}

export function buildDeliveryDownloadFiles(tasks: DeliveryDownloadTask[]) {
  const files: DownloadFileItem[] = []

  for (const task of tasks) {
    if (task.progress < 100) continue

    const count = Math.max(task.imageCount, 1)

    for (let index = 0; index < count; index += 1) {
      const result = deliveryResults[index % deliveryResults.length]
      if (!result) continue

      files.push({
        url: result.image,
        filename: `${sanitizeFilename(task.title)}-${String(index + 1).padStart(2, '0')}-${sanitizeFilename(result.title)}.jpg`,
      })
    }
  }

  return files
}

export function buildAllDeliveryDownloadFiles() {
  return deliveryResults.map((item, index) => ({
    url: item.image,
    filename: `${String(index + 1).padStart(2, '0')}-${sanitizeFilename(item.title)}.jpg`,
  }))
}

export async function downloadDeliveryTasks(tasks: DeliveryDownloadTask[]) {
  const files = buildDeliveryDownloadFiles(tasks)
  if (!files.length) return 0

  await downloadFilesSequentially(files)
  return files.length
}

export async function downloadAllDeliveryResults() {
  const files = buildAllDeliveryDownloadFiles()
  await downloadFilesSequentially(files)
  return files.length
}
