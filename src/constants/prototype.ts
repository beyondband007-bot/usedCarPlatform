import type {
  FeatureEntry,
  NavItem,
  PackageOption,
  PointTransaction,
  PricingPlan,
} from '@/types/prototype'

import planEnterpriseBasicBg from '@/img/企业基础.png'
import planEnterpriseTeamBg from '@/img/企业团队.png'
import planEnterpriseFlagshipBg from '@/img/企业旗舰.png'

export const topNavigation: NavItem[] = [
  { path: '/home', label: '首页', icon: 'mdi:home-outline' },
  { path: '/pricing', label: '企业套餐', icon: 'mdi:briefcase-outline' },
]

/** 登录后二级导航：工作台为唯一业务入口 */
export const secondaryNavigation: NavItem[] = [
  { path: '/home', label: '首页' },
  { path: '/workspace', label: '视觉工作台' },
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

export const pricingPlans: PricingPlan[] = [
  {
    name: '企业基础档',
    price: '¥980',
    description: '适合新团队启动视觉生产流程，先验证素材标准与交付节奏。',
    icon: 'mdi:rocket-launch-outline',
    tone: 'blue',
    backgroundImage: planEnterpriseBasicBg,
    benefits: [
      '赠送 20,000 积分',
      '1 个企业账号',
      '每账号同时上传 1 套外观图组',
      '单张生成正常使用',
      '适合小团队试运行',
    ],
    action: '选择基础档',
  },
  {
    name: '企业团队档',
    price: '¥3,980',
    description: '适合门店或车商团队并行上新，兼顾账号、积分与图组并发。',
    icon: 'mdi:account-group-outline',
    tone: 'orange',
    backgroundImage: planEnterpriseTeamBg,
    badge: '推荐',
    benefits: [
      '赠送 55,000 积分',
      '5 个企业账号',
      '每账号同时上传 5 套外观图组',
      '单张生成正常使用',
      '适合车商团队批量上新',
    ],
    action: '选择团队档',
    featured: true,
  },
  {
    name: '企业旗舰档',
    price: '¥9,800',
    description: '适合集团化业务、出海车源与专属场景长期配置。',
    icon: 'mdi:shield-crown-outline',
    tone: 'green',
    backgroundImage: planEnterpriseFlagshipBg,
    benefits: [
      '赠送 980,000 积分',
      '20 个企业账号',
      '每账号同时上传 20 套外观图组',
      '可定制 20 个专属场景',
      '适合集团化和出海团队',
    ],
    action: '咨询旗舰档',
  },
]

export const pointTransactions: PointTransaction[] = [
  {
    title: '套餐赠送',
    amount: '+550 积分',
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

export const packageOptions: PackageOption[] = [
  {
    price: '¥980',
    description: '赠 200 积分 · 1账号 · 1套并发',
    action: '选择',
  },
  {
    price: '¥3,980',
    description: '赠 55,000 积分 · 5账号 · 5套并发',
    action: '选择',
    active: true,
  },
  {
    price: '¥9,800',
    description: '980,000 积分 · 20账号 · 20专属场景',
    action: '预约演示',
  },
]

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
