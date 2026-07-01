export type LanguageConversionStatus =
  | 'idle'
  | 'parsing'
  | 'ready'
  | 'processing'
  | 'success'
  | 'failed'

export interface LanguageConversionLanguage {
  value: string
  label: string
  status: 'available' | 'coming_soon'
}

/** 后端创建语言转换任务时接收的字段 */
export interface CreateLanguageConversionPayload {
  sourceAssetId?: string
  sourceFileName: string
  sourceLanguage: string
  targetLanguage: string
  preserveSpeakerVoice: boolean
  preserveBackgroundAudio: boolean
}

/** 后端返回的任务结构 */
export interface LanguageConversionTask {
  taskId: string
  status: LanguageConversionStatus
  progress: number
  sourceLanguage: string
  targetLanguage: string
  sourceVideoUrl: string
  resultVideoUrl?: string
  errorMessage?: string
}

export const languageConversionLanguages: LanguageConversionLanguage[] = [
  { value: 'auto', label: '自动识别', status: 'available' },
  { value: 'zh-CN', label: '中文（普通话）', status: 'available' },
  { value: 'en-US', label: '英语', status: 'available' },
  { value: 'ja-JP', label: '日语', status: 'available' },
  { value: 'ko-KR', label: '韩语', status: 'available' },
  { value: 'es-ES', label: '西班牙语', status: 'available' },
  { value: 'fr-FR', label: '法语', status: 'available' },
  { value: 'de-DE', label: '德语', status: 'available' },
  { value: 'pt-PT', label: '葡萄牙语', status: 'coming_soon' },
  { value: 'ar-SA', label: '阿拉伯语', status: 'coming_soon' },
]
