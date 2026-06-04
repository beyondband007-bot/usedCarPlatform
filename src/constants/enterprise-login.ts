import enterpriseLoginBgDark from '@/assets/media/auth/auth-enterprise-login-bg-dark.png'
import enterpriseLoginBgLight from '@/assets/media/auth/auth-enterprise-login-bg-light.png'
import enterpriseLoginIcon1 from '@/assets/img/icon/登录1.svg'
import enterpriseLoginIcon2 from '@/assets/img/icon/登录2.svg'
import enterpriseLoginIcon3 from '@/assets/img/icon/登录3.svg'

export interface EnterpriseLoginFeature {
  icon: string
  title: string
  description: string
}

export const enterpriseLoginFeatures: EnterpriseLoginFeature[] = [
  {
    icon: enterpriseLoginIcon1,
    title: '场景智能',
    description: '适配各国风格',
  },
  {
    icon: enterpriseLoginIcon2,
    title: '车身精修',
    description: '智能优化细节',
  },
  {
    icon: enterpriseLoginIcon3,
    title: '批量上新',
    description: '全库同步修改',
  },
]

export const enterpriseLoginHeroImageDark = enterpriseLoginBgDark
export const enterpriseLoginHeroImageLight = enterpriseLoginBgLight
