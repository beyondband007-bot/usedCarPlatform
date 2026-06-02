import planBasicBg from '@/img/home/suite-workbench-light.png'
import planTeamBg from '@/img/home/suite-enterprise-light.png'
import planFlagshipBg from '@/img/home/suite-enterprise.png'

export type RechargePlanTone = 'blue' | 'purple' | 'gold'

export interface RechargePlan {
  name: string
  subtitle: string
  price: string
  giftPoints: string
  tone: RechargePlanTone
  icon: string
  badge?: string
  backgroundImage: string
  benefits: string[]
}

export const rechargePlans: RechargePlan[] = [
  {
    name: '企业基础版',
    subtitle: '适合小团队入门使用',
    price: '¥980',
    giftPoints: '20,000',
    tone: 'blue',
    icon: 'mdi:layers-triple-outline',
    badge: '入门优选',
    backgroundImage: planBasicBg,
    benefits: [
      '1 个企业账号',
      '每账号同时上传 1 套外观图组',
      '单独生成正常使用',
      '适合小团队试运行',
    ],
  },
  {
    name: '企业团队版',
    subtitle: '适合门店或车商团队并行上新',
    price: '¥3,980',
    giftPoints: '55,000',
    tone: 'purple',
    icon: 'mdi:chart-bar',
    badge: '推荐',
    backgroundImage: planTeamBg,
    benefits: [
      '5 个企业账号',
      '每账号同时上传 5 套外观图组',
      '单独生成正常使用',
      '适合车商团队批量上新',
    ],
  },
  {
    name: '企业旗舰版',
    subtitle: '适合集团化业务，出海车源与专属场景长期配置',
    price: '¥9,800',
    giftPoints: '980,000',
    tone: 'gold',
    icon: 'mdi:crown-outline',
    badge: '超值之选',
    backgroundImage: planFlagshipBg,
    benefits: [
      '20 个企业账号',
      '每账号同时上传 20 套外观图组',
      '可定制 20 个专属场景',
      '适合集团化和大型团队',
      '专属客户经理服务',
    ],
  },
]

export const rechargePlanToneMap: Record<string, RechargePlanTone> = {
  企业基础版: 'blue',
  企业团队版: 'purple',
  企业旗舰版: 'gold',
}
