import type { WorkspaceBatchItemKind } from '@/types/workspace'

const batchItemKindLabelMap: Record<WorkspaceBatchItemKind, string> = {
  exterior: '外观成片',
  interior: '内饰',
  interior_clean: '内饰清洁',
  interior_collage: '内饰拼图',
  interior_clean_collage: '内饰清洁拼图',
}

function isInteriorCollageKind(itemKind: string) {
  return itemKind === 'interior_collage' || itemKind === 'interior_clean_collage'
}

function formatInteriorCollageTitle(projectName: string, optionId?: string | null) {
  const match = optionId?.match(/-(\d+)-of-(\d+)$/)
  if (match && Number(match[2]) > 1) {
    return `${projectName}内饰拼接图${match[1]}`
  }
  return `${projectName}内饰拼接图`
}

export function formatBatchItemDisplayTitle(input: {
  projectName: string
  sortOrder: number
  itemKind: string
  exteriorCount: number
  interiorCollage?: boolean
  optionId?: string | null
}) {
  const projectName = input.projectName.trim() || '批量上新任务'
  const slotIndex = Math.max(0, input.sortOrder)

  if (input.itemKind === 'exterior') {
    return `${projectName}图${slotIndex + 1}`
  }

  if (input.interiorCollage && isInteriorCollageKind(input.itemKind)) {
    return formatInteriorCollageTitle(projectName, input.optionId)
  }

  const interiorIndex = Math.max(0, slotIndex - Math.max(0, input.exteriorCount))
  return `${projectName}内饰图${interiorIndex + 1}`
}

export function resolveBatchRecentSceneLabel(sceneLabel?: string | null) {
  if (!sceneLabel) return undefined
  return batchItemKindLabelMap[sceneLabel as WorkspaceBatchItemKind] ?? sceneLabel
}
