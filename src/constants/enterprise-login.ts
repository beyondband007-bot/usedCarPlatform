export interface EnterpriseLoginFeature {
  icon: string
  title: string
  description: string
}

export const enterpriseLoginFeatures: EnterpriseLoginFeature[] = [
  {
    icon: 'mdi:image-filter-hdr-outline',
    title: '场景影棚',
    description: '多场景模板',
  },
  {
    icon: 'mdi:creation-outline',
    title: '智能生成',
    description: 'AI 一键生成',
  },
  {
    icon: 'mdi:tray-arrow-down',
    title: '高效交付',
    description: '批量导出下载',
  },
]

export const enterpriseLoginHeroImage =
  'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=2400&q=85'
