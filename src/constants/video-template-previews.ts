import type { VideoTemplate } from '@/types/video-generation'

import {
  getLocalScenePreviewById,
  getLocalScenePreviewByType,
  localSceneBasementVideo,
  localSceneOutdoorVideo,
} from '@/constants/video-generation-local-assets'

/** 按模板 type 映射本地 preview 视频 */
export const localTemplatePreviewByType = getLocalScenePreviewByType()

/** 按 templateId 精确映射（优先级高于 type） */
export const localTemplatePreviewById: Record<string, string> = {
  ...getLocalScenePreviewById(),
  'ref-video-006': localSceneBasementVideo,
  'ref-video-001': localSceneOutdoorVideo,
  'ref-video-003': localSceneOutdoorVideo,
  'coming-soon-market': localSceneBasementVideo,
  'showroom-luxury': localSceneBasementVideo,
  'benz-e300l': localSceneOutdoorVideo,
  'autumn-sale': localSceneOutdoorVideo,
  'market-october': localSceneBasementVideo,
}

/** 默认 preview（API / 映射均缺失时使用） */
export const defaultTemplatePreviewUrl = localSceneBasementVideo

const VIDEO_PREVIEW_PATTERN = /\.(mp4|webm|mov|m4v)(\?|#|$)/i

/** 后端 reference-materials preview 接口返回的是提取的首帧图片，不是视频 */
function isReferenceMaterialPosterUrl(url: string) {
  return /\/reference-materials\/[^/]+\/preview(?:\?|#|$)/i.test(url)
}

export function isVideoPreviewUrl(url: string) {
  if (isReferenceMaterialPosterUrl(url)) return false
  return VIDEO_PREVIEW_PATTERN.test(url)
}

/**
 * 模板封面首帧（静态图）。
 * API 的 previewUrl / thumbnailUrl 均为 reference 首帧图，与右侧模板库卡片默认展示一致。
 * 跳过 mp4 等视频地址，避免 PreloadImage 加载失败。
 */
export function resolveTemplatePosterUrl(
  template: Pick<VideoTemplate, 'previewUrl' | 'thumbnailUrl'>,
): string | null {
  const candidates = [template.previewUrl?.trim(), template.thumbnailUrl?.trim()].filter(
    Boolean,
  ) as string[]

  for (const url of candidates) {
    if (!isVideoPreviewUrl(url)) {
      return url
    }
  }

  return null
}

/**
 * 解析模板 hover 播放用的 preview 视频地址。
 * 无视频时返回 null，由调用方降级到 poster 静态图。
 */
export function resolveTemplatePreviewUrl(
  template: Pick<VideoTemplate, 'templateId' | 'type' | 'previewUrl'>,
): string | null {
  const remote = template.previewUrl?.trim()
  if (remote && isVideoPreviewUrl(remote)) {
    return remote
  }

  const byId = localTemplatePreviewById[template.templateId]
  if (byId) {
    return byId
  }

  const byType = localTemplatePreviewByType[template.type]
  if (byType) {
    return byType
  }

  return defaultTemplatePreviewUrl
}

/** API 不可用或仅有外链 placeholder 图时，优先用本地视频首帧作封面 */
export function shouldPreferVideoCover(
  template: Pick<VideoTemplate, 'previewUrl' | 'thumbnailUrl' | 'templateId' | 'type'>,
): boolean {
  if (!resolveTemplatePreviewUrl(template)) return false

  const poster = resolveTemplatePosterUrl(template)
  if (!poster) return true

  if (isReferenceMaterialPosterUrl(poster) || poster.startsWith('/api/')) {
    return false
  }

  return true
}
