import planBasicBg from '@/img/充值积分/基础套餐.png'
import planTeamBg from '@/img/充值积分/企业团队版.png'
import planFlagshipBg from '@/img/充值积分/企业旗舰版.png'
import {
  enterprisePlanList,
  formatPlanPoints,
  formatPlanPrice,
  type EnterprisePlan,
} from '@/domain/enterprise-plans'
import type { SubscriptionPlanCode } from '@/types/subscription'

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

const rechargePlanVisuals: Record<
  SubscriptionPlanCode,
  Pick<RechargePlan, 'tone' | 'icon' | 'badge' | 'backgroundImage'>
> = {
  basic: {
    tone: 'blue',
    icon: 'mdi:layers-triple-outline',
    badge: '入门优选',
    backgroundImage: planBasicBg,
  },
  team: {
    tone: 'purple',
    icon: 'mdi:chart-bar',
    badge: '推荐',
    backgroundImage: planTeamBg,
  },
  flagship: {
    tone: 'gold',
    icon: 'mdi:crown-outline',
    badge: '超值之选',
    backgroundImage: planFlagshipBg,
  },
}

function toRechargePlan(plan: EnterprisePlan): RechargePlan {
  return {
    name: plan.name,
    subtitle: plan.description,
    price: formatPlanPrice(plan),
    giftPoints: formatPlanPoints(plan),
    benefits: plan.featureDetails,
    ...rechargePlanVisuals[plan.plan],
  }
}

export const rechargePlans: RechargePlan[] = enterprisePlanList.map(toRechargePlan)

export const rechargePlanToneMap: Record<string, RechargePlanTone> = {
  企业基础档: 'blue',
  企业团队档: 'purple',
  企业旗舰档: 'gold',
}
