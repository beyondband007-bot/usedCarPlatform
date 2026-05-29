import type { DeliveryResultItem } from '@/constants/delivery-results'
import { formatDate } from '@/utils/dayjs'
import type {
  WorkspaceDeliveryTaskPreview,
  WorkspaceGenerateResult,
  WorkspaceImagePreview,
} from '@/types/workspace'

function toLargePreviewUrl(url: string) {
  if (!url.includes('images.unsplash.com')) return url

  return url
    .replace(/([?&])w=\d+/g, '$1w=1600')
    .replace(/([?&])q=\d+/g, '$1q=88')
}

export function buildImagePreviewFromGenerateResult(
  result: WorkspaceGenerateResult,
): WorkspaceImagePreview {
  return {
    createdAt: result.createdAt,
    statusText: result.statusText,
    ratioLabel: result.ratioLabel,
    imageUrl: result.previewImage,
    imageAlt: result.previewAlt,
    downloadUrl: result.downloadUrl,
    imageWidth: result.imageWidth,
    imageHeight: result.imageHeight,
  }
}

export function buildImagePreviewFromDeliveryTask(
  task: WorkspaceDeliveryTaskPreview,
): WorkspaceImagePreview {
  const dateMatch = task.meta.match(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/)
  const imageUrl = toLargePreviewUrl(task.previewImage ?? task.image)

  return {
    createdAt: dateMatch?.[0] ?? formatDate(task.meta),
    statusText: `已完成 · ${task.title}`,
    ratioLabel: `${task.imageCount} 张成片`,
    imageUrl,
    imageAlt: task.title,
    downloadUrl: imageUrl,
    imageWidth: 1600,
    imageHeight: 900,
  }
}

export function buildImagePreviewFromDeliveryResult(
  item: DeliveryResultItem,
  formatRatio: (ratio: string) => string,
): WorkspaceImagePreview {
  const imageUrl = toLargePreviewUrl(item.image)

  return {
    createdAt: '2026-05-20 09:32:18',
    statusText: `已完成 · ${item.title} · 成片预览`,
    ratioLabel: formatRatio(item.ratio),
    imageUrl,
    imageAlt: item.title,
    downloadUrl: imageUrl,
  }
}
