export const OUTPUT_RATIO_VALUES = [
  'auto',
  '1:1',
  '3:4',
  '4:3',
  '9:16',
  '16:9',
] as const

export type OutputRatioValue = (typeof OUTPUT_RATIO_VALUES)[number]

/** 普通单图生图模块后端默认 */
export const DEFAULT_GENERATION_OUTPUT_RATIO: OutputRatioValue = '16:9'

/** 创意生图 / 批量上新后端默认 */
export const DEFAULT_BATCH_OUTPUT_RATIO: OutputRatioValue = '1:1'

export const outputRatioSelectOptions: Array<{ label: string; value: string }> = [
  { label: '自动', value: 'auto' },
  { label: '1:1 主图', value: '1:1' },
  { label: '3:4 竖图', value: '3:4' },
  { label: '4:3 横图', value: '4:3' },
  { label: '9:16 竖图', value: '9:16' },
  { label: '16:9 横图', value: '16:9' },
]

export function isOutputRatioValue(value: string): value is OutputRatioValue {
  return OUTPUT_RATIO_VALUES.includes(value as OutputRatioValue)
}

export function formatOutputRatioLabel(
  ratio?: string | null,
  resolution = '2K',
) {
  if (!ratio) return undefined
  return `${ratio} · ${resolution}`
}

export function getOutputRatioOptionLabel(value: string) {
  return (
    outputRatioSelectOptions.find((item) => item.value === value)?.label ?? value
  )
}
