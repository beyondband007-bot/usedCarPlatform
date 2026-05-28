export interface NavItem {
  path: string
  label: string
  icon?: string
}

export interface HeroMetric {
  label: string
  value: string
}

export interface FeatureEntry {
  title: string
  description: string
  action: string
  image: string
  to?: string
  /** 未登录时弹出访客浮层，已登录进入视觉工作台 */
  workbenchEntry?: boolean
  dark?: boolean
  highlighted?: boolean
}

export type PricingPlanTone = 'blue' | 'orange' | 'green'

export interface PricingPlan {
  name: string
  price: string
  description: string
  benefits: string[]
  action: string
  icon: string
  tone: PricingPlanTone
  featured?: boolean
  badge?: string
  backgroundImage?: string
}

export interface PointTransaction {
  title: string
  amount: string
  description: string
  positive?: boolean
}

export interface PackageOption {
  price: string
  description: string
  action: string
  active?: boolean
}
