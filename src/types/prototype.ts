export interface NavItem {
  path: string
  label: string
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
  dark?: boolean
  highlighted?: boolean
}

export interface PricingPlan {
  name: string
  price: string
  benefits: string[]
  action: string
  featured?: boolean
  badge?: string
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
