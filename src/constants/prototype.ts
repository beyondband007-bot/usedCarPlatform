import type {
  FeatureEntry,
  NavItem,
  PackageOption,
  PointTransaction,
  PricingPlan,
  PricingPlanTone,
} from '@/types/prototype'
import {
  enterprisePlanList,
  formatPlanPrice,
  type EnterprisePlan,
} from '@/domain/enterprise-plans'

/** 官网首页顶栏导航（与 官网/官网/index.html 一致） */
export const studioGuestNavigation: NavItem[] = [
  { path: '/home', label: '首页' },
  { path: '/pricing', label: '企业套餐' },
  { path: '/login', label: '企业账号登录' },
]

/** 访客顶栏（与登录页 UI 稿一致，含工作台入口） */
export const topNavigation: NavItem[] = [
  { path: '/home', label: '首页', icon: 'mdi:home-outline' },
  { path: '/pricing', label: '企业套餐', icon: 'mdi:briefcase-outline' },
  {
    path: '/workspace',
    label: '视觉工作台',
    icon: 'mdi:palette-outline',
    workbenchEntry: true,
  },
  { path: '/login', label: '企业账号登录', icon: 'mdi:account-key-outline' },
]

/** 登录后二级导航 */
export const secondaryNavigation: NavItem[] = [
  { path: '/home', label: '首页' },
  { path: '/workspace', label: '视觉工作台' },
  { path: '/credits', label: '积分查询' },
  { path: '/package-points', label: '套餐/积分' },
  { path: '/credits-admin', label: '积分后台' },
]

export const homeFeatures: FeatureEntry[] = [
  {
    title: '视觉工作台',
    description: '场景影棚、批量上新、成片交付',
    action: '进入工作台',
    workbenchEntry: true,
    image:
      'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=780&q=80',
  },
  {
    title: '企业套餐',
    description: '账号、积分、图组并发同步开通',
    action: '查看三档套餐',
    to: '/pricing',
    highlighted: true,
    image:
      'https://images.unsplash.com/photo-1549924231-f129b911e442?auto=format&fit=crop&w=780&q=80',
  },
  {
    title: '详情页素材',
    description: '规划中 · 详情图、卖点卡、多平台分发',
    action: '后续开放',
    dark: true,
    image:
      'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=920&q=80',
  },
]

const pricingPlanVisuals: Record<
  EnterprisePlan['plan'],
  { icon: string; tone: PricingPlanTone; badge?: string; featured?: boolean; action: string }
> = {
  basic: {
    icon: 'mdi:rocket-launch-outline',
    tone: 'blue',
    action: '订阅基础档',
  },
  team: {
    icon: 'mdi:account-group-outline',
    tone: 'orange',
    badge: '最划算',
    featured: true,
    action: '订阅团队档',
  },
  flagship: {
    icon: 'mdi:shield-crown-outline',
    tone: 'green',
    action: '咨询旗舰档',
  },
}

export const pricingPlans: PricingPlan[] = enterprisePlanList.map((plan) => ({
  name: plan.name,
  price: formatPlanPrice(plan),
  description: plan.description,
  benefits: plan.featureDetails,
  ...pricingPlanVisuals[plan.plan],
}))

export const pointTransactions: PointTransaction[] = [
  {
    title: '套餐赠送',
    amount: '+100,000 积分',
    positive: true,
    description: '2026-05-20 09:00 · 企业团队档开通',
  },
  {
    title: '单图生成',
    amount: '-15 积分',
    description: '2026-05-20 09:32 · 经典白棚',
  },
  {
    title: '批量上新任务',
    amount: '-120 积分',
    description: '2026-05-20 09:18 · 5月展厅批量上新',
  },
  {
    title: '失败退款',
    amount: '+15 积分',
    positive: true,
    description: '2026-05-19 20:05 · 任务失败自动退回',
  },
]

export const packageOptions: PackageOption[] = enterprisePlanList.map((plan) => ({
  price: formatPlanPrice(plan),
  description: `${plan.giftPoints.toLocaleString('zh-CN')} 积分 · ${plan.accountLabel} · ${plan.concurrencyLabel}`,
  action: plan.plan === 'flagship' ? '预约演示' : '选择',
  active: plan.plan === 'team',
}))

export const pricingPageCopy = {
  title: '企业套餐',
  subtitle: '面向汽车电商与出海车商，按账号、积分、外观图组并发和专属场景配置团队产能',
  tag: '套餐内积分可用于账号使用、功能服务及专属场景配置等',
  plansTitle: '选择适合您的套餐方案',
  plansSubtitle: '三档套餐覆盖试运行、团队批量上新与集团化交付场景',
  unit: '/ 套餐',
  recommended: '推荐',
  footer: '所有套餐积分自购买之日起 12 个月内有效，过期未使用积分将自动清零。',
  footerAction: '查看套餐说明',
} as const

export const pricingFooterFeatures = [
  {
    title: '权益清晰透明',
    desc: '账号、积分、图组并发权益在购买前完整展示',
    icon: 'mdi:diamond-stone',
  },
  {
    title: '积分灵活使用',
    desc: '可用于单张生成、批量任务与专属场景配置',
    icon: 'mdi:clock-outline',
  },
  {
    title: '安全稳定可靠',
    desc: '企业账号权限隔离，任务失败自动退回积分',
    icon: 'mdi:shield-check-outline',
  },
  {
    title: '专属服务支持',
    desc: '旗舰档提供场景定制与交付节奏协同',
    icon: 'mdi:headset',
  },
] as const
