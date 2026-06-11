export const VIDEO_GENERATION_MODULE_CODE = 'video-generation'
export const SHORT_VIDEO_CAPABILITY_CODE = 'short-video'

export const MAX_VIDEO_EXTERIOR_IMAGES = 6
export const MAX_VIDEO_INTERIOR_IMAGES = 6
export const MAX_VIDEO_REFERENCE_IMAGES = 4
export const VIDEO_DURATION_SECONDS = 15
export const VIDEO_OUTPUT_RATIO_LABEL = '9:16 · 720p · 15秒'

export const VIDEO_SCRIPT_GENERATOR_LABELS: Record<string, string> = {
  deepseek: 'DeepSeek 文案',
  deepseek_safety_fallback: '安全文案（DeepSeek 触发规则）',
  local_fallback_after_deepseek_error: '安全文案（DeepSeek 异常）',
  local_fallback: '安全文案（未配置 DeepSeek）',
}

export function isShortVideoModuleCode(moduleCode?: string | null) {
  if (!moduleCode) return false
  return (
    moduleCode === SHORT_VIDEO_CAPABILITY_CODE ||
    moduleCode === VIDEO_GENERATION_MODULE_CODE
  )
}

export function getShortVideoScriptDraftStorageKey(ownerKey: string) {
  return `workspace:short-video:script-draft:${ownerKey}`
}

export function getVideoScriptGeneratorLabel(generator?: string | null) {
  if (!generator) return '口播草稿'
  return VIDEO_SCRIPT_GENERATOR_LABELS[generator] ?? generator
}
