import lightConsistencyAfter from '@/assets/img/光污一致化/修复后.png'
import lightConsistencyBefore from '@/assets/img/光污一致化/修复前.png'
import paintRefreshAfter from '@/assets/img/烤漆翻新/翻新后.png'
import paintRefreshBefore from '@/assets/img/烤漆翻新/翻新前.png'
import watermarkAfterOne from '@/assets/img/无水印图1.png'
import watermarkBeforeOne from '@/assets/img/水印图1.png'

export interface WorkspaceFeatureCompareCard {
  before: string
  after: string
}

export interface WorkspaceFeatureCompareContent {
  tabListLabel: string
  featureSectionLabel: string
  heroBadge: string
  heroTitle: string
  heroDesc: string
  compareTitle: string
  compareHint: string
  beforeAlt: string
  afterAlt: string
  handleAriaLabel: string
  generatingTitle: string
  generatingDesc: string
  cards: WorkspaceFeatureCompareCard[]
}

export const workspaceFeatureCompareCodes = [
  'watermark-remove',
  'paint-refresh',
  'light-consistency',
] as const

export type WorkspaceFeatureCompareCode = (typeof workspaceFeatureCompareCodes)[number]

export const workspaceFeatureCompareMap: Record<
  WorkspaceFeatureCompareCode,
  WorkspaceFeatureCompareContent
> = {
  'watermark-remove': {
    tabListLabel: '去水印视图切换',
    featureSectionLabel: '去水印功能描述',
    heroBadge: 'AI 去水印能力',
    heroTitle: '智能识别水印并完整保留画面细节',
    heroDesc: '适用于平台角标、文字与遮挡痕迹处理，输出更干净的车图素材。',
    compareTitle: '效果对比',
    compareHint: '拖动滑杆查看去水印前后效果对比',
    beforeAlt: '去水印处理前',
    afterAlt: '去水印处理后',
    handleAriaLabel: '去水印前后对比拖拽滑杆',
    generatingTitle: '正在去除水印',
    generatingDesc: 'AI 正在识别并处理水印区域，请稍候。',
    cards: [{ before: watermarkBeforeOne, after: watermarkAfterOne }],
  },
  'paint-refresh': {
    tabListLabel: '烤漆翻新视图切换',
    featureSectionLabel: '烤漆翻新功能描述',
    heroBadge: 'AI 烤漆翻新能力',
    heroTitle: '智能提升漆面亮度与车身洁净度',
    heroDesc: '适用于漆面暗沉、轮毂污渍与车身老旧感处理，输出更具高级感的翻新效果。',
    compareTitle: '效果对比',
    compareHint: '拖动滑杆查看烤漆翻新前后效果对比',
    beforeAlt: '烤漆翻新处理前',
    afterAlt: '烤漆翻新处理后',
    handleAriaLabel: '烤漆翻新前后对比拖拽滑杆',
    generatingTitle: '正在烤漆翻新',
    generatingDesc: 'AI 正在优化漆面光泽与车身洁净度，请稍候。',
    cards: [{ before: paintRefreshBefore, after: paintRefreshAfter }],
  },
  'light-consistency': {
    tabListLabel: '光污一致化视图切换',
    featureSectionLabel: '光污一致化功能描述',
    heroBadge: 'AI 光污一致化能力',
    heroTitle: '智能弱化眩光、反光与色偏干扰',
    heroDesc: '适用于强光反射、环境光污染与曝光不均车图，输出光线更统一、更真实的车图素材。',
    compareTitle: '效果对比',
    compareHint: '拖动滑杆查看光污一致化前后效果对比',
    beforeAlt: '光污一致化处理前',
    afterAlt: '光污一致化处理后',
    handleAriaLabel: '光污一致化前后对比拖拽滑杆',
    generatingTitle: '正在光污一致化',
    generatingDesc: 'AI 正在优化眩光、反光与色偏，请稍候。',
    cards: [{ before: lightConsistencyBefore, after: lightConsistencyAfter }],
  },
}

export function isWorkspaceFeatureCompareCode(
  code: string,
): code is WorkspaceFeatureCompareCode {
  return workspaceFeatureCompareCodes.includes(code as WorkspaceFeatureCompareCode)
}
