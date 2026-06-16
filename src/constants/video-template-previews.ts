import type { VideoTemplate } from '@/types/video-generation'

import {
  getLocalScenePreviewById,
  getLocalScenePreviewByType,
} from '@/constants/video-generation-local-assets'

/** 按模板 type 映射本地 preview 视频 */
export const localTemplatePreviewByType = getLocalScenePreviewByType()

/** 按 templateId 精确映射（优先级高于 type） */
export const localTemplatePreviewById: Record<string, string> = {
  ...getLocalScenePreviewById(),
}

/** 默认 preview（API / 映射均缺失时使用） */
export const defaultTemplatePreviewUrl =
  localTemplatePreviewById['ref-video-001'] ?? ''

const VIDEO_PREVIEW_PATTERN = /\.(mp4|webm|mov|m4v)(\?|#|$)/i

function isReferenceMaterialPosterUrl(url: string) {
  return /\/reference-materials\/[^/]+\/preview(?:\?|#|$)/i.test(url)
}

function isProtectedApiAssetUrl(url: string) {
  return url.startsWith('/api/') || /^https?:\/\/[^/]+\/api\//i.test(url)
}

export function isVideoPreviewUrl(url: string) {
  if (isReferenceMaterialPosterUrl(url)) return false
  return VIDEO_PREVIEW_PATTERN.test(url)
}

/**
 * 模板封面首帧（静态图）。
 * 受鉴权保护的 API 素材地址不能直接放进 img/video 标签，否则浏览器不会带 token。
 * 当前模板库优先使用本地打包视频展示首帧和 hover 预览。
 */
export function resolveTemplatePosterUrl(
  template: Pick<VideoTemplate, 'previewUrl' | 'thumbnailUrl'>,
): string | null {
  const candidates = [template.previewUrl?.trim(), template.thumbnailUrl?.trim()].filter(
    Boolean,
  ) as string[]

  for (const url of candidates) {
    if (isProtectedApiAssetUrl(url)) continue
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
