import {
  DEFAULT_BATCH_OUTPUT_RATIO,
  outputRatioSelectOptions,
} from '@/constants/output-ratio'

export interface CreativeImageAspectRatio {
  value: string
  label: string
}

/** 创意生图不含 auto，默认 1:1 */
export const creativeImageAspectRatios: CreativeImageAspectRatio[] =
  outputRatioSelectOptions
    .filter((item) => item.value !== 'auto')
    .map((item) => ({ value: item.value, label: item.label }))

export const creativeImageDefaultOutputRatio = DEFAULT_BATCH_OUTPUT_RATIO

export const creativeImagePromptMaxLength = 2000

export const creativeImageDefaultPreview = {
  image:
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=85',
  caption:
    '一辆白色迈凯伦跑车停在乡村道路上，背景为黑色木屋和草地，整体画面清晰、真实，具有自然光影效果。',
}
