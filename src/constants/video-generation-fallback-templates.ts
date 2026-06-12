import { VIDEO_DURATION_SECONDS } from '@/constants/short-video'
import { shortVideoTemplateItems } from '@/constants/short-video-templates'
import type { VideoTemplate } from '@/types/video-generation'

const typeLabelMap: Record<string, string> = {
  'single-car': '单车品介绍',
  promotion: '促销活动',
  dealership: '车场介绍',
  market: '行情资讯',
}

const styleLabelMap: Record<string, string> = {
  professional: '专业讲解',
  lively: '活泼促销',
  calm: '沉稳讲解',
  humorous: '轻松幽默',
}

const categoryTypeMap: Record<string, VideoTemplate['type']> = {
  showroom: 'dealership',
  'single-car': 'single-car',
  promotion: 'promotion',
  market: 'market',
}

const fallbackTemplateIds: Record<string, string> = {
  'single-car': 'ref-video-001',
  promotion: 'ref-video-003',
  dealership: 'ref-video-006',
  market: 'coming-soon-market',
}

export function getFallbackVideoTemplates(): VideoTemplate[] {
  const pickedTypes = new Set<string>()

  return shortVideoTemplateItems
    .filter((item) => {
      const type = categoryTypeMap[item.category]
      if (!type || pickedTypes.has(type)) return false
      pickedTypes.add(type)
      return true
    })
    .map((item) => {
      const type = categoryTypeMap[item.category] ?? 'single-car'
      const isMarket = type === 'market'

      return {
        id: fallbackTemplateIds[type] ?? item.id,
        templateId: fallbackTemplateIds[type] ?? item.id,
        title: typeLabelMap[type] ?? item.title,
        type,
        typeLabel: typeLabelMap[type] ?? item.title,
        style: 'professional',
        styleLabel: styleLabelMap.professional,
        badge: isMarket ? null : type === 'promotion' ? 'hot' : null,
        thumbnailUrl: item.cover,
        stylePrompt: isMarket ? '行情资讯模板即将开放' : item.title,
        durationSeconds: VIDEO_DURATION_SECONDS,
        outputRatio: '9:16',
        videoResolution: '720p',
        inputRequirements: [],
        requiredFields: [],
        optionalFields: [],
        status: isMarket ? 'coming_soon' : 'available',
        generationReadiness: isMarket ? 'unavailable' : 'ready',
        reason: isMarket ? '即将开放' : undefined,
      } satisfies VideoTemplate
    })
}
