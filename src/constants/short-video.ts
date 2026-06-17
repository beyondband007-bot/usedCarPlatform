export const VIDEO_GENERATION_MODULE_CODE = 'video-generation'
export const SHORT_VIDEO_CAPABILITY_CODE = 'short-video'

export const MAX_VIDEO_EXTERIOR_IMAGES = 5
export const MAX_VIDEO_INTERIOR_IMAGES = 5
export const MAX_VIDEO_REFERENCE_IMAGES = 4
export const MAX_DEALERSHIP_IMAGES = 6
export const VIDEO_DURATION_SECONDS = 15
export const VIDEO_OUTPUT_RATIO = '9:16'
export const VIDEO_RESOLUTION = '720p'
export const VIDEO_MODEL = 'bytedance/seedance-2'
export const VIDEO_OUTPUT_RATIO_LABEL = '9:16 · 720p · 按音频时长生成（最长15秒）'
export const VIDEO_TASK_POLL_MS = 5000

export const VIDEO_SCRIPT_GENERATOR_LABELS: Record<string, string> = {
  deepseek: 'AI 文案',
  deepseek_safety_fallback: '安全兜底文案',
  local_fallback_after_deepseek_error: '本地兜底文案',
  local_fallback: '本地安全文案',
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

export function getVideoGenerationTaskStorageKey(ownerKey: string) {
  return `workspace:video-generation:task:${ownerKey}`
}

export function getVideoGenerationDraftStorageKey(ownerKey: string) {
  return `workspace:video-generation:script-draft:${ownerKey}`
}

export function getVideoScriptGeneratorLabel(generator?: string | null) {
  if (!generator) return '口播草稿'
  return VIDEO_SCRIPT_GENERATOR_LABELS[generator] ?? generator
}

export const VIDEO_TASK_STATUS_LABELS: Record<string, string> = {
  waiting: '正在准备素材',
  queued: '已进入生成队列',
  generating: '正在生成视频',
  success: '生成完成',
  fail: '生成失败',
  canceled: '任务已取消',
}

export const VIDEO_WORKFLOW_STAGE_LABELS: Record<string, string> = {
  preparing_assets: '正在生成音频并准备素材',
  queued: '已提交生成队列',
  generating: '视频生成中',
  completed: '视频生成完成',
  failed: '任务失败',
  canceled: '任务已取消',
}

export function getVideoTaskStatusLabel(status?: string | null) {
  if (!status) return '处理中'
  return VIDEO_TASK_STATUS_LABELS[status] ?? status
}

export function getVideoWorkflowStageLabel(stage?: string | null) {
  if (!stage) return ''
  return VIDEO_WORKFLOW_STAGE_LABELS[stage] ?? stage
}
