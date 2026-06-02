import type {
  FeatureEntry,
  NavItem,
  PackageOption,
  PointTransaction,
  PricingPlan,
} from '@/types/prototype'

/** 官网首页顶栏导航（与 官网/官网/index.html 一致） */
export const studioGuestNavigation: NavItem[] = [
  { path: '/home', label: '首页' },
  {
    path: '/workspace',
    label: '视觉工作台',
    workbenchEntry: true,
  },
  { path: '/pricing', label: '企业套餐' },
  { path: '/login', label: '企业账号登录' },
]

/** 访客顶栏（与登录页 UI 稿一致，含工作台入口） */
export const topNavigation: NavItem[] = [
  { path: '/home', label: '首页', icon: 'mdi:home-outline' },
  {
    path: '/workspace',
    label: '视觉工作台',
    icon: 'mdi:palette-outline',
    workbenchEntry: true,
  },
  { path: '/pricing', label: '企业套餐', icon: 'mdi:briefcase-outline' },
  { path: '/credits', label: '积分查询', icon: 'mdi:diamond-stone' },
  { path: '/login', label: '企业账号登录', icon: 'mdi:account-key-outline' },
]

/** 旧版登录后二级导航配置，仅保留给历史组件引用 */
export const secondaryNavigation: NavItem[] = [
  { path: '/home', label: '首页' },
  { path: '/workspace', label: '视觉工作台' },
  { path: '/pricing', label: '企业套餐' },
  { path: '/credits', label: '积分查询' },
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

export const pricingPlanActionLabel = '立即开通 / 咨询我们'

export const pricingPlans: PricingPlan[] = [
  {
    name: '企业基础档（入门优选）',
    price: '¥980',
    description: '适合新团队启动视觉生产流程，先验证素材标准与交付节奏。',
    icon: 'mdi:rocket-launch-outline',
    tone: 'blue',
    benefits: [
      '赠送 20,000 积分',
      '1 个企业账号',
      '每个账号同时上传 1 套外观图组',
      '每个账号同时上传 1 套内饰图组',
      '单张图片生成正常使用',
      '适合小团队试运行',
    ],
    action: pricingPlanActionLabel,
  },
  {
    name: '企业团队档（首选推荐）',
    price: '¥3,980',
    description: '适合门店或车商团队并行上新，兼顾账号、积分与图组并发。',
    icon: 'mdi:account-group-outline',
    tone: 'orange',
    benefits: [
      '赠送 100,000 积分',
      '5 个企业账号',
      '每个账号同时上传 5 套外观图组',
      '每个账号同时上传 5 套内饰图组',
      '单张图片生成正常使用',
      '适合车商团队批量上新',
    ],
    action: pricingPlanActionLabel,
    featured: true,
  },
  {
    name: '企业旗舰档',
    price: '¥9,800',
    description: '适合集团化业务、出海车源与专属场景长期配置。',
    icon: 'mdi:shield-crown-outline',
    tone: 'green',
    benefits: [
      '赠送 800,000 积分',
      '1+3 个企业账号',
      '每个账号同时上传 20 套外观图组',
      '每个账号同时上传 20 套内饰图组',
      '可定制 20 个专属场景',
      '适合集团化和出海团队',
    ],
    action: pricingPlanActionLabel,
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
    amount: '-30 积分',
    description: '2026-05-20 09:32 · 经典白棚',
  },
  {
    title: '批量上新任务',
    amount: '-120 积分',
    description: '2026-05-20 09:18 · 5月展厅批量上新',
  },
  {
    title: '失败退款',
    amount: '+30 积分',
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
  plansSubtitle: '三档套餐，适配试运行、团队上新、集团交付',
  unit: '/ 套',
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
