import type { DeliveryResultItem } from '@/constants/delivery-results'
import { formatDate } from '@/utils/dayjs'
import { resolveRecentDisplayImage } from '@/utils/workspace-recent'
import { normalizeDisplayOrder } from '@/utils/workspace-recent-layout'
import type {
  WorkspaceDeliveryTaskPreview,
  WorkspaceGenerateResult,
  WorkspaceImagePreview,
  WorkspaceRecentItem,
} from '@/types/workspace'

function toLargePreviewUrl(url: string) {
  if (!url.includes('images.unsplash.com')) return url

  return url
    .replace(/([?&])w=\d+/g, '$1w=1600')
    .replace(/([?&])q=\d+/g, '$1q=88')
}

export function buildImagePreviewFromDeliveryAsset(
  asset: Pick<
    WorkspaceDeliveryTaskPreview['assets'][number],
    'title' | 'ratio' | 'createdAt' | 'imageUrl' | 'width' | 'height'
  >,
): WorkspaceImagePreview {
  return {
    createdAt: asset.createdAt ?? '',
    statusText: `已完成 · ${asset.title} · 成片交付结果`,
    ratioLabel: asset.ratio,
    imageUrl: asset.imageUrl ?? '',
    imageAlt: asset.title,
    downloadUrl: asset.imageUrl ?? '',
    imageWidth: asset.width,
    imageHeight: asset.height,
  }
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

export function buildImagePreviewFromRecentItem(
  item: WorkspaceRecentItem,
): WorkspaceImagePreview | null {
  const imageUrl = resolveRecentDisplayImage(item)
  if (!imageUrl) return null

  const sceneTitle = item.sceneLabel?.trim() || item.title?.trim() || '生成结果'

  return {
    createdAt: item.createdAt,
    statusText: `已完成 · ${sceneTitle} · 单图生成结果`,
    ratioLabel: item.ratioLabel ?? '',
    imageUrl,
    imageAlt: item.title,
    downloadUrl: item.downloadUrl ?? imageUrl,
    imageWidth: item.imageWidth,
    imageHeight: item.imageHeight,
  }
}

function buildPreviewGalleryFromResultImages(
  result: WorkspaceGenerateResult,
): WorkspaceImagePreview[] {
  const images = result.resultImages?.filter((item) => Boolean(item.url)) ?? []
  if (images.length <= 1) return []

  return images.map((item, index) => ({
    createdAt: result.createdAt,
    statusText:
      images.length > 1
        ? `${result.statusText} · 第 ${index + 1} 张`
        : result.statusText,
    ratioLabel: result.ratioLabel,
    imageUrl: item.url,
    imageAlt: result.previewAlt,
    downloadUrl: item.url,
    imageWidth: result.imageWidth,
    imageHeight: result.imageHeight,
  }))
}

function buildPreviewGalleryFromRecentItems(
  recentItems: WorkspaceRecentItem[],
): WorkspaceImagePreview[] {
  const viewableItems = normalizeDisplayOrder(
    recentItems.filter(
      (item) => item.status === 'success' && Boolean(resolveRecentDisplayImage(item)),
    ),
  )

  return viewableItems
    .map((item) => buildImagePreviewFromRecentItem(item))
    .filter((item): item is WorkspaceImagePreview => Boolean(item))
}

function resolvePreviewGalleryIndex(
  gallery: WorkspaceImagePreview[],
  recentItems: WorkspaceRecentItem[],
  result: WorkspaceGenerateResult,
) {
  if (result.taskId) {
    const recentIndex = recentItems.findIndex((item) => item.taskId === result.taskId)
    if (recentIndex >= 0) {
      const recentItem = recentItems[recentIndex]
      const preview = buildImagePreviewFromRecentItem(recentItem)
      if (preview) {
        const galleryIndex = gallery.findIndex(
          (item) => item.imageUrl === preview.imageUrl,
        )
        if (galleryIndex >= 0) return galleryIndex
      }
    }
  }

  const imageIndex = gallery.findIndex((item) => item.imageUrl === result.previewImage)
  if (imageIndex >= 0) return imageIndex

  return 0
}

function mergeCurrentResultIntoGallery(
  gallery: WorkspaceImagePreview[],
  result: WorkspaceGenerateResult,
) {
  const currentPreview = buildImagePreviewFromGenerateResult(result)
  const exists = gallery.some(
    (item) =>
      item.imageUrl === currentPreview.imageUrl ||
      (result.taskId &&
        item.statusText === currentPreview.statusText &&
        item.createdAt === currentPreview.createdAt),
  )

  if (exists) return gallery

  return [currentPreview, ...gallery]
}

export function attachPreviewGallery(
  result: WorkspaceGenerateResult,
  options: {
    recentItems?: WorkspaceRecentItem[]
  } = {},
): WorkspaceGenerateResult {
  if (result.mediaType === 'video' || result.previewGallery?.length) {
    return result
  }

  const resultImageGallery = buildPreviewGalleryFromResultImages(result)
  if (resultImageGallery.length > 1) {
    const previewGalleryIndex = Math.max(
      0,
      resultImageGallery.findIndex((item) => item.imageUrl === result.previewImage),
    )

    return {
      ...result,
      previewGallery: resultImageGallery,
      previewGalleryIndex,
    }
  }

  const recentItems = options.recentItems ?? []
  let gallery = buildPreviewGalleryFromRecentItems(recentItems)
  gallery = mergeCurrentResultIntoGallery(gallery, result)

  if (gallery.length <= 1) {
    return result
  }

  const previewGalleryIndex = resolvePreviewGalleryIndex(gallery, recentItems, result)

  return {
    ...result,
    previewGallery: gallery,
    previewGalleryIndex,
  }
}
