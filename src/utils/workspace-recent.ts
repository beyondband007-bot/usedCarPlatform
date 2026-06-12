import { workspaceCapabilities } from '@/constants/workspace'
import type { WorkspaceRecentItem } from '@/types/workspace'

export function resolveWorkspaceOptionTitle(
  moduleCode?: string,
  optionId?: string | null,
) {
  if (!optionId) return undefined

  const capability = workspaceCapabilities.find(
    (item) => item.code === moduleCode || item.apiCode === moduleCode,
  )

  return capability?.options.find((item) => item.id === optionId)?.title ?? optionId
}

export const recentStatusLabelMap = {
  waiting: '等待中',
  queued: '排队中',
  queue: '排队中',
  generating: '生成中',
  success: '已完成',
  fail: '失败',
  canceled: '已取消',
} as const

export const recentStatusIconMap = {
  waiting: 'mdi:timer-sand',
  queued: 'mdi:account-group-outline',
  queue: 'mdi:account-group-outline',
  generating: 'mdi:star-four-points',
  success: 'mdi:check',
  fail: 'mdi:close-circle-outline',
  canceled: 'mdi:cancel',
} as const

export function parseOutputRatioToCssAspect(ratio?: string | null) {
  if (!ratio || ratio === 'auto') return undefined

  const normalized = ratio.replace('：', ':').replace(/\s+/g, '')
  if (!/^\d+:\d+$/.test(normalized)) return undefined

  const [width, height] = normalized.split(':')
  return `${width} / ${height}`
}

export function resolveRecentDisplayImage(
  item: Pick<
    WorkspaceRecentItem,
    | 'previewImage'
    | 'thumbnail'
    | 'downloadUrl'
    | 'inputAssetThumbnailUrl'
    | 'inputAssetUrl'
  >,
) {
  return (
    item.previewImage ??
    item.thumbnail ??
    item.downloadUrl ??
    item.inputAssetThumbnailUrl ??
    item.inputAssetUrl ??
    undefined
  )
}

export function formatRecentCardCaption(
  item: Pick<WorkspaceRecentItem, 'sceneLabel' | 'title' | 'createdAt'>,
) {
  const label = item.sceneLabel?.trim() || item.title?.trim()
  const time = item.createdAt?.trim()

  if (!label && !time) return ''
  if (!label) return time ?? ''
  if (!time) return label
  return `${label} ${time}`
}

export function resolveRecentPlaceholderAspectRatio(
  item: Pick<WorkspaceRecentItem, 'outputRatio' | 'imageWidth' | 'imageHeight'>,
) {
  if (item.imageWidth && item.imageHeight) {
    return `${item.imageWidth} / ${item.imageHeight}`
  }

  return parseOutputRatioToCssAspect(item.outputRatio) ?? '3 / 4'
}
