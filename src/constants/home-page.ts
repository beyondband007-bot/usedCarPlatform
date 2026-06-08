import homeHeroImageDark from '@/assets/media/home/home-hero-bg-dark.png'
import homeCapabilitySceneBgLocal from '@/assets/media/home/home-capability-scene-bg.png'
import techBadgeIconColor from '@/assets/img/icon/调色.svg'
import techBadgeIconCutout from '@/assets/img/icon/抠图.svg'
import techBadgeIconEliminate from '@/assets/img/icon/消除.svg'
import techBadgeIconPose from '@/assets/img/icon/矫正.svg'
import techBadgeIconQuality from '@/assets/img/icon/画质提升.svg'
import techBadgeIconResize from '@/assets/img/icon/尺寸.svg'
import { mediaUrls } from '@/constants/media-urls'

const {
  caseUsedCar: caseUsedImage,
  capabilityBatch: featureBatchImage,
  capabilitySkyStudio: featureSkyStudioImage,
  capabilityRefine: featureRefineImage,
  capabilityRoadMotion: featureRoadImage,
  capabilitySceneBg: featureSceneImage,
  capabilityShowroom: featureShowroomImage,
  capabilityMarketingVideo: featureMarketingVideo,
  heroBgLight: homeHeroImageLight,
  entryEnterpriseDark: suiteEnterpriseImageDark,
  entryEnterpriseLight: suiteEnterpriseImageLight,
  entryWorkbenchDark: suiteWorkbenchImageDark,
  entryWorkbenchLight: suiteWorkbenchImageLight,
} = mediaUrls.home

export interface HomeQuickEntry {
  title: string
  description: string
  action: string
  imageDark: string
  imageLight: string
  to?: string
  workbenchEntry?: boolean
  disabled?: boolean
}

export interface HomeCapabilityCard {
  title: string
  description: string
  image?: string
  /** 图床加载失败时回退（如场景背景直链 403） */
  fallbackImage?: string
  video?: string
}

export interface HomeCaseTab {
  id: string
  label: string
  title: string
  pain: string
  service: string
  image: string
  efficiencyTip: {
    title: string
    copy: string
  }
}

export const homeHeroImageDarkSrc = homeHeroImageDark
export const homeHeroImageLightSrc = homeHeroImageLight
export const homeHeroImageSrc = homeHeroImageDark
export const homeHeroPosterSrc = homeHeroImageDark

export const homeQuickEntries: HomeQuickEntry[] = [
  {
    title: 'AI工作台',
    description: '场景照、精修图、成片交付',
    action: '开始探索',
    workbenchEntry: true,
    imageDark: suiteWorkbenchImageDark,
    imageLight: suiteWorkbenchImageLight,
  },
  {
    title: '企业套餐',
    description: '三档套餐，权限灵活、功能多元',
    action: '查看套餐',
    to: '/pricing',
    imageDark: suiteEnterpriseImageDark,
    imageLight: suiteEnterpriseImageLight,
  },
]

export const homeMainCapabilities: HomeCapabilityCard[] = [
  {
    title: '场景背景一键更换',
    description: '秒级替换车辆场景，适配各国营销风格',
    image: featureSceneImage,
    fallbackImage: homeCapabilitySceneBgLocal,
  },
  {
    title: '外观细节一键精修',
    description: '智能优化车身细节，图片质感即刻提升',
    image: featureRefineImage,
  },
  {
    title: '汽车信息批量上新',
    description: '车型、配置、尺寸，一次修改全库同步',
    image: featureBatchImage,
  },
  {
    title: '营销短视频一键出',
    description: '输入素材即出短片，提高营销宣传节奏',
    video: featureMarketingVideo,
  },
  {
    title: '展厅质感棚拍',
    description: '模拟专业影棚布光，精准突出车身漆面与质感',
    image: featureShowroomImage,
  },
  {
    title: '户外自然实景',
    description: '真实街道融合自然风光，提升车辆场景代入感',
    image: 'https://vip.123pan.cn/1849524247/yk6baz03t0m000ddyjvqw1w55rtuqc6nDIYxBIJvAdixAvxzBIUzAIr=.png',
  },
  {
    title: '行驶动态特效',
    description: '营造速度与运动感，展现车辆的强劲行驶姿态',
    image: featureRoadImage,
  },
  {
    title: '高质天空影棚',
    description: '干净通透的天空场景，让车辆展示更清晰醒目',
    image: featureSkyStudioImage,
  },
]

export interface HomeTechBadge {
  label: string
  icon: string
}

export const homeTechBadges: HomeTechBadge[] = [
  { label: '姿态矫正', icon: techBadgeIconPose },
  { label: '智能抠图', icon: techBadgeIconCutout },
  { label: '画质提升', icon: techBadgeIconQuality },
  { label: '一键消除', icon: techBadgeIconEliminate },
  { label: '尺寸调整', icon: techBadgeIconResize },
  { label: '智能调色', icon: techBadgeIconColor },
]

export const homeCaseTabs: HomeCaseTab[] = [
  {
    id: 'used',
    label: '出海提效',
    title: '出海提效',
    pain: '图片处理过程繁琐，本地化素材处理缓慢',
    service: '适配各种车型的多角度外观图、内饰图、LOGO车牌处理',
    image: caseUsedImage,
    efficiencyTip: {
      title: '效率提升',
      copy: '每百张出海素材准备时间：8小时→15分钟',
    },
  },
  {
    id: 'showroom',
    label: '内容提效',
    title: '内容提效',
    pain: '海量车型需反复修图改文，人工操作耗时且质量不稳',
    service: '姿态矫正、智能抠图、画质提升、烤漆换色、尺寸调整、光污染处理等',
    image: featureShowroomImage,
    efficiencyTip: {
      title: '效率提升',
      copy: '单张图片精修时间：20分钟→10秒 / 100款车型详情页生成：1周→1天',
    },
  },
]

export const homeFooterLinks: Array<{ label: string; to?: string; href?: string }> = [
  { label: '产品介绍', href: '#suite' },
  { label: '解决方案', href: '#engine' },
  { label: '技术支持', href: '#cases' },
  { label: '隐私政策', href: '#cases' },
  { label: '服务条款', href: '#footer' },
]

export type HomeFooterNavTag = 'beta' | 'plan'

export interface HomeFooterNavItem {
  label: string
  workspaceCode?: string
  disabled?: boolean
  tag?: HomeFooterNavTag
}

export interface HomeFooterNavColumn {
  title: string
  items: HomeFooterNavItem[]
}

/** 页脚能力导航，与视觉工作台左侧菜单一致 */
export const homeFooterNavColumns: HomeFooterNavColumn[] = [
  {
    title: '场景更换',
    items: [
      { label: '展厅棚拍', workspaceCode: 'showroom-light' },
      { label: '户外实景', workspaceCode: 'outdoor-scene' },
      { label: '行驶动效', workspaceCode: 'road-motion' },
      { label: '天空影棚', workspaceCode: 'sky-studio' },
    ],
  },
  {
    title: '车辆美容',
    items: [
      { label: '烤漆翻新', workspaceCode: 'paint-refresh' },
      { label: '光污美化', workspaceCode: 'light-consistency' },
      { label: '内饰清洁', workspaceCode: 'interior-clean' },
    ],
  },
  {
    title: '智能交付',
    items: [
      { label: '批量上新', workspaceCode: 'batch-new' },
      { label: '成片交付', workspaceCode: 'delivery' },
    ],
  },
  {
    title: '营销工具',
    items: [
      { label: '去水印', workspaceCode: 'watermark-remove', tag: 'beta' },
      { label: '创意生图', workspaceCode: 'creative-image', tag: 'beta' },
      { label: '主图套版', disabled: true, tag: 'plan' },
      { label: '短视频生成', workspaceCode: 'short-video', tag: 'beta' },
      { label: '详情页物料', disabled: true, tag: 'plan' },
      { label: '多平台分发', disabled: true, tag: 'plan' },
    ],
  },
]

export const homeFooterContactItems = [
  '商务合作：13718492350@163.com',
  '媒体联系：13718492350@163.com',
] as const

export const homeStaticImageUrls = [
  homeHeroImageDarkSrc,
  homeHeroImageLightSrc,
  ...homeQuickEntries.flatMap((entry) => [entry.imageDark, entry.imageLight]),
  ...homeMainCapabilities.flatMap((item) => [item.image, item.fallbackImage]),
  ...homeCaseTabs.map((tab) => tab.image),
]
