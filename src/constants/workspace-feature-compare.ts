import interiorCleanAfter from '@/assets/media/workspace/beauty/interior/workspace-interior-clean-compare-after.png'
import interiorCleanBefore from '@/assets/media/workspace/beauty/interior/workspace-interior-clean-compare-before.png'
import interiorStitchResult from '@/assets/media/workspace/beauty/interior/workspace-interior-stitch-result.png'
import lightConsistencyAfter from '@/assets/media/workspace/beauty/light-consistency/workspace-light-consistency-compare-after.png'
import lightConsistencyBefore from '@/assets/media/workspace/beauty/light-consistency/workspace-light-consistency-compare-before.png'
import paintRefreshAfter from '@/assets/media/workspace/beauty/paint-refresh/workspace-paint-refresh-compare-after.png'
import paintRefreshBefore from '@/assets/media/workspace/beauty/paint-refresh/workspace-paint-refresh-compare-before.png'
import watermarkAfterOne from '@/assets/media/workspace/beauty/watermark/workspace-watermark-compare-after.png'
import watermarkBeforeOne from '@/assets/media/workspace/beauty/watermark/workspace-watermark-compare-before.png'

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
  mode?: 'compare' | 'result'
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
  'interior-clean',
  'interior-stitch',
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
  'interior-clean': {
    tabListLabel: '内饰清洁视图切换',
    featureSectionLabel: '内饰清洁功能描述',
    heroBadge: 'AI 内饰清洁能力',
    heroTitle: '智能增强座椅、仪表台与地毯洁净度',
    heroDesc: '适用于内饰脏污、灰尘与陈旧感明显的车图，输出更整洁、更高级的内饰展示效果。',
    compareTitle: '效果对比',
    compareHint: '拖动滑杆查看内饰清洁前后效果对比',
    beforeAlt: '内饰清洁处理前',
    afterAlt: '内饰清洁处理后',
    handleAriaLabel: '内饰清洁前后对比拖拽滑杆',
    generatingTitle: '正在内饰清洁',
    generatingDesc: 'AI 正在优化座椅、仪表台与地毯洁净度，请稍候。',
    cards: [{ before: interiorCleanBefore, after: interiorCleanAfter }],
  },
  'interior-stitch': {
    tabListLabel: '内饰拼接视图切换',
    featureSectionLabel: '内饰拼接功能描述',
    heroBadge: 'AI 内饰拼接能力',
    heroTitle: '生成更完整的内饰效果图',
    heroDesc: '适用于内饰图补全与展示优化，突出座椅、仪表台和中控区域的整体效果。',
    mode: 'result',
    compareTitle: '生成效果图',
    compareHint: '展示内饰拼接后的效果图预览',
    beforeAlt: '内饰拼接效果图',
    afterAlt: '内饰拼接效果图',
    handleAriaLabel: '内饰拼接效果图预览',
    generatingTitle: '正在生成效果图',
    generatingDesc: 'AI 正在生成内饰拼接效果图，请稍候。',
    cards: [{ before: interiorStitchResult, after: interiorStitchResult }],
  },
}

export function isWorkspaceFeatureCompareCode(
  code: string,
): code is WorkspaceFeatureCompareCode {
  return workspaceFeatureCompareCodes.includes(code as WorkspaceFeatureCompareCode)
}
