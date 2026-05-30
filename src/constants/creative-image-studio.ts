export interface CreativeImageAspectRatio {
  value: string
  label: string
  resolution: string
}

export const creativeImageAspectRatios: CreativeImageAspectRatio[] = [
  { value: '1:1', label: '1:1', resolution: '2048×2048' },
  { value: '3:4', label: '3:4', resolution: '1536×2048' },
  { value: '16:9', label: '16:9', resolution: '2048×1152' },
  { value: '4:3', label: '4:3', resolution: '1600×1200' },
]

export const creativeImagePromptMaxLength = 2000

export const creativeImageDefaultPreview = {
  image:
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=85',
  caption:
    '一辆白色迈凯伦跑车停在乡村道路上，背景为黑色木屋和草地，整体画面清晰、真实，具有自然光影效果。',
}
