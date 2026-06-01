import caseUsedImage from '@/img/home/case-used.png'
import featureBatchImage from '@/img/home/feature-batch.png'
import featureOutdoorImage from '@/img/home/feature-outdoor.png'
import featureRefineImage from '@/img/home/feature-refine.png'
import featureRoadImage from '@/img/home/feature-road.png'
import featureSceneImage from '@/img/home/feature-scene.png'
import featureShowroomImage from '@/img/home/feature-showroom.png'
import featureSkyImage from '@/img/home/feature-sky.png'
import featureVideoImage from '@/img/home/feature-video.png'
import homeHeroImage from '@/img/home/hero-car.png'
import suiteEnterpriseImage from '@/img/home/suite-enterprise.png'
import suiteWorkbenchImage from '@/img/home/suite-workbench.png'

export interface HomeQuickEntry {
  title: string
  description: string
  action: string
  image: string
  to?: string
  workbenchEntry?: boolean
  disabled?: boolean
}

export interface HomeCapabilityCard {
  title: string
  description: string
  image: string
}

export interface HomeCaseTab {
  id: string
  label: string
  title: string
  pain: string
  service: string
  image: string
  stats: Array<{ value: string; label: string }>
}

export const homeHeroImageSrc = homeHeroImage
export const homeHeroPosterSrc = homeHeroImage

export const homeQuickEntries: HomeQuickEntry[] = [
  {
    title: 'AI工作台',
    description: '场景照、精修图、成片交付',
    action: '开始探索',
    workbenchEntry: true,
    image: suiteWorkbenchImage,
  },
  {
    title: '企业套餐',
    description: '三档套餐，权限灵活、功能多元',
    action: '查看套餐',
    to: '/pricing',
    image: suiteEnterpriseImage,
  },
]

export const homeMainCapabilities: HomeCapabilityCard[] = [
  {
    title: 'AI 智能场景影棚',
    description: '一键生成汽车展厅、多场景素材核心切换',
    image: featureSceneImage,
  },
  {
    title: '汽车外观精修',
    description: '车漆、轮毂、玻璃等细节一键焕新',
    image: featureRefineImage,
  },
  {
    title: '批量内容智能交付',
    description: '多车型、多尺寸内容一键批量生成、打包交付',
    image: featureBatchImage,
  },
  {
    title: '一键生成营销短视频',
    description: '自动生成动态镜头汽车营销短视频',
    image: featureVideoImage,
  },
  {
    title: '展厅灯光棚拍',
    description: '还原专业展厅灯光，打造精细级质感',
    image: featureShowroomImage,
  },
  {
    title: '户外自然光场景',
    description: '自然环境实景合成，还原真实光影效果',
    image: featureOutdoorImage,
  },
  {
    title: '道路动态特效',
    description: '模拟车辆行驶动态，打造速度感视觉画面',
    image: featureRoadImage,
  },
  {
    title: '天空纯净影棚',
    description: '用于净透天空背景，突出车辆主体视觉焦点',
    image: featureSkyImage,
  },
]

export const homeTechBadges = ['姿态矫正', '智能抠图', '高清改尺寸', 'HD AI 超清']

export const homeCaseTabs: HomeCaseTab[] = [
  {
    id: 'used',
    label: '二手车出海',
    title: '手车出海提交',
    pain: '出海 listing 需要多语言文案、统一场景图、人工修图周期长、成本高',
    service: 'AI 场景影棚｜成片交付包｜外观图批量精修',
    image: caseUsedImage,
    stats: [
      { value: '300%', label: '上架效率提升' },
      { value: '75%', label: '成片周期缩短' },
    ],
  },
  {
    id: 'showroom',
    label: '展厅拍摄',
    title: '展厅批量拍摄',
    pain: '门店车辆周转快，传统拍摄排期慢，难以统一灯光、角度和画面质感',
    service: '展厅棚拍｜姿态矫正｜统一背景与质感增强',
    image: featureShowroomImage,
    stats: [
      { value: '300%', label: '上架效率提升' },
      { value: '75%', label: '成片周期缩短' },
    ],
  },
  {
    id: 'new',
    label: '新车套图',
    title: '新车标准套图',
    pain: '新车宣传需要覆盖官网、短视频封面、详情页和广告投放多种尺寸',
    service: '高清改尺寸｜天空影棚｜营销短视频封面',
    image: featureSkyImage,
    stats: [
      { value: '300%', label: '上架效率提升' },
      { value: '75%', label: '成片周期缩短' },
    ],
  },
]

export const homeFooterLinks: Array<{ label: string; to?: string; href?: string }> = [
  { label: '产品介绍', href: '#suite' },
  { label: '解决方案', href: '#engine' },
  { label: '技术支持', href: '#cases' },
  { label: '隐私政策', href: '#cases' },
  { label: '服务条款', href: '#footer' },
]
