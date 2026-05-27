import type {
  FeatureEntry,
  NavItem,
  PackageOption,
  PointTransaction,
  PricingPlan,
} from '@/types/prototype'

export const topNavigation: NavItem[] = [
  { path: '/home', label: '首页' },
  { path: '/pricing', label: '企业套餐' },
  { path: '/workspace', label: '视觉工作台' },
  { path: '/credits', label: '积分查询' },
  { path: '/enterprise', label: '企业账号登录' },
  { path: '/package-points', label: '套餐/积分' },
  { path: '/visitor-layer', label: '访客浮层' },
]

export const secondaryNavigation: NavItem[] = [
  { path: '/home', label: '首页' },
  { path: '/workspace', label: '视觉工作台' },
  { path: '/credits', label: '积分查询' },
  { path: '/package-points', label: '套餐/积分' },
]

export const homeFeatures: FeatureEntry[] = [
  {
    title: '视觉工作台',
    description: '场景影棚、车辆美容、成片交付',
    action: '连接客服',
    to: '/workspace',
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
    benefits: ['赠送 200 积分', '1 个企业账号', '每账号同时上传 1 套外观图组', '单张生成正常使用', '适合小团队试运行'],
    action: '选择基础档',
  },
  {
    name: '企业团队档',
    price: '¥2,980',
    badge: '推荐',
    benefits: ['赠送 550 积分', '5 个企业账号', '每账号同时上传 5 套外观图组', '单张生成正常使用', '适合车商团队批量上新'],
    action: '选择团队档',
    featured: true,
  },
  {
    name: '企业旗舰档',
    price: '¥9,800',
    benefits: ['到账 9,800 积分', '20 个企业账号', '每账号同时上传 20 套外观图组', '可定制 20 个专属场景', '适合集团化和出海团队'],
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
    price: '¥2,980',
    description: '赠 550 积分 · 5账号 · 5套并发',
    action: '选择',
    active: true,
  },
  {
    price: '¥9,800',
    description: '9,800 积分 · 20账号 · 20专属场景',
    action: '预约演示',
  },
]
