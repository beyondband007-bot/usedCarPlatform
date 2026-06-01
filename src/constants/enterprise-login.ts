import enterpriseLoginBg from '@/assets/img/enterprise-login-bg.png'

export interface EnterpriseLoginFeature {
  icon: string
  title: string
  description: string
}

export const enterpriseLoginFeatures: EnterpriseLoginFeature[] = [
  {
    icon: 'mdi:image-filter-hdr-outline',
    title: '场景智能',
    description: '适配各国风格',
  },
  {
    icon: 'mdi:creation-outline',
    title: '车身精修',
    description: '智能优化细节',
  },
  {
    icon: 'mdi:tray-arrow-down',
    title: '批量上新',
    description: '全库同步修改',
  },
]

export const enterpriseLoginHeroImage = enterpriseLoginBg
