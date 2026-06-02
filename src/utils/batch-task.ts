import type { WorkspaceBatchItemKind } from '@/types/workspace'

const batchItemKindLabelMap: Record<WorkspaceBatchItemKind, string> = {
  exterior: '外观成片',
  interior: '内饰',
  interior_clean: '内饰清洁',
  interior_collage: '内饰拼图',
  interior_clean_collage: '内饰清洁拼图',
}

export function getBatchItemKindLabel(itemKind: string) {
  return batchItemKindLabelMap[itemKind as WorkspaceBatchItemKind] ?? itemKind
}

export function isInteriorBatchItemKind(itemKind: string) {
  return itemKind !== 'exterior'
}
