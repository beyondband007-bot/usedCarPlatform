/** 仅将公网可访问的图床 URL 传给后端；本地打包资源由后端 referenceImagePath 兜底 */
export function resolveSceneReferenceImageUrl(
  image?: string | null,
): string | undefined {
  const trimmed = image?.trim()
  if (!trimmed) return undefined
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return undefined
}
