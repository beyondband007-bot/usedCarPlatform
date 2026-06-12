export function resolveVideoGenerationErrorMessage(error: unknown): string {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '操作失败，请稍后重试'
  const normalized = message.trim()

  if (/scriptDraftId is required/i.test(normalized)) {
    return '请先生成并确认口播草稿'
  }
  if (/video script draft not found/i.test(normalized)) {
    return '草稿不存在或已失效，请重新生成草稿'
  }
  if (/asset not found/i.test(normalized)) {
    return '部分素材不存在，请重新上传图片'
  }
  if (/no available kie api key/i.test(normalized)) {
    return '视频服务繁忙，请稍后重试'
  }
  if (/VIDEO_GENERATION_CREATE_FAILED/i.test(normalized)) {
    return normalized.replace(/^VIDEO_GENERATION_CREATE_FAILED[:\s]*/i, '') || '视频任务创建失败，请稍后重试'
  }
  if (/KIE_TASK_TIMEOUT/i.test(normalized)) {
    return '视频生成超时，请稍后重新生成'
  }
  if (/already in a terminal status/i.test(normalized)) {
    return '当前任务已结束，不能重复取消'
  }
  if (/only a completed, failed, or canceled video task can be regenerated/i.test(normalized)) {
    return '请等待当前任务结束后再重新生成'
  }
  if (/voice.*not configured|音色未配置/i.test(normalized)) {
    return '该数字人音色未配置，暂不可生成视频'
  }
  if (/market template is unavailable/i.test(normalized)) {
    return '行情资讯模板即将开放，暂不可生成'
  }

  return normalized || '操作失败，请稍后重试'
}
