import { workspaceCapabilities } from '@/constants/workspace'

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
