export interface HomeQuickEntry {
  title: string
  description: string
  action: string
  image: string
  tag?: string
  to?: string
  workbenchEntry?: boolean
  disabled?: boolean
}

export interface HomeCapabilityCard {
  title: string
  description: string
  image: string
}

export interface HomeSceneChip {
  title: string
  image: string
}

export interface HomeTechItem {
  icon: string
  label: string
}

export interface HomeCaseTab {
  id: string
  label: string
  title: string
  summary: string
  painPoints: string[]
  stats: Array<{ value: string; label: string }>
  beforeImage: string
  afterImage: string
}

export const homeHeroImage =
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=2400&q=85'

export const homeQuickEntries: HomeQuickEntry[] = [
  {
    title: '视觉工作台',
    description: '场景影棚、车辆美容、成片交付一站式生产',
    action: '进入工作台',
    workbenchEntry: true,
    image:
      'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: '企业套餐',
    description: '账号、积分、图组并发同步开通',
    action: '查看企业套餐',
    to: '/pricing',
    image:
      'https://images.unsplash.com/photo-1549924231-f129b911e442?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: '短视频生成',
    description: '由车图一键生成营销短视频，多平台规格导出',
    action: '即将开放',
    tag: 'Beta',
    disabled: true,
    image:
      'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=900&q=80',
  },
]

export const homeMainCapabilities: HomeCapabilityCard[] = [
  {
    title: '场景影像',
    description: '一键生成专业级展厅与户外场景主图',
    image:
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: '外观修饰',
    description: '轮毂、玻璃、漆面质感智能增强',
    image:
      'https://images.unsplash.com/photo-1503376780353-7e6692767f70?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: '批量交付',
    description: '多车源、多尺寸规格批量处理与导出',
    image:
      'https://images.unsplash.com/photo-1486262715619-67b85e44308f?auto=format&fit=crop&w=800&q=80',
  },
  {
    title: '短视频生成',
    description: '由静态车图生成营销短视频素材',
    image:
      'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80',
  },
]

export const homeSceneChips: HomeSceneChip[] = [
  {
    title: '展厅灯光',
    image:
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=520&q=80',
  },
  {
    title: '户外场景',
    image:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=520&q=80',
  },
  {
    title: '道路动态',
    image:
      'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=520&q=80',
  },
  {
    title: '天空影棚',
    image:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=520&q=80',
  },
]

export const homeTechItems: HomeTechItem[] = [
  { icon: 'mdi:tune-variant', label: '后期校正' },
  { icon: 'mdi:file-image-outline', label: '详情素材' },
  { icon: 'mdi:vector-polygon', label: '智能抠图' },
  { icon: 'mdi:resize', label: '高清尺寸' },
  { icon: 'mdi:high-definition-box', label: 'HD AI 超分' },
  { icon: 'mdi:lightbulb-on-outline', label: '智能补光' },
]

export const homeCaseTabs: HomeCaseTab[] = [
  {
    id: 'used-overseas',
    label: '二手车出海',
    title: '二手车出海效率提升',
    summary: '将传统拍摄流程升级为 AI 影棚批量化生产，显著缩短上架周期。',
    painPoints: ['拍摄成本高', '场景不统一', '多平台尺寸重复劳动'],
    stats: [
      { value: '300%', label: '上架效率提升' },
      { value: '75%', label: '单套成片耗时节省' },
    ],
    beforeImage:
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80',
    afterImage:
      'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'new-car',
    label: '新车发售',
    title: '新车发售视觉标准化',
    summary: '统一品牌展厅风格，支撑多渠道同步投放。',
    painPoints: ['风格不一致', '交付周期长', '人工修图成本高'],
    stats: [
      { value: '4x', label: '素材产出倍率' },
      { value: '60%', label: '修图人力节省' },
    ],
    beforeImage:
      'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=80',
    afterImage:
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'cross-border',
    label: '跨境电商',
    title: '跨境电商多规格交付',
    summary: '一次生成覆盖主图、详情、短视频封面等多规格素材。',
    painPoints: ['规格繁多', '返工频繁', '协作链路长'],
    stats: [
      { value: '12+', label: '平台规格覆盖' },
      { value: '80%', label: '返工率下降' },
    ],
    beforeImage:
      'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80',
    afterImage:
      'https://images.unsplash.com/photo-1503376780353-7e6692767f70?auto=format&fit=crop&w=1200&q=80',
  },
]

export const homeFooterLinks = [
  { label: '产品', href: '#' },
  { label: '定价', to: '/pricing' },
  { label: '机构', href: '#' },
  { label: '团队', href: '#' },
]
