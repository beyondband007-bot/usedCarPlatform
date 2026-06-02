import caseUsedImage from '@/img/home/case-used.png'
import featureBatchImage from '@/img/home/feature-batch.png'
import featureOutdoorImage from '@/img/home/feature-outdoor.png'
import featureRefineImage from '@/img/home/feature-refine.png'
import featureRoadImage from '@/img/home/feature-road.png'
import featureSceneImage from '@/img/home/feature-scene.png'
import featureShowroomImage from '@/img/home/feature-showroom.png'
import featureSkyImage from '@/img/home/feature-sky.png'
import featureMarketingVideo from '@/assets/video/营销短视频.mp4'
import homeHeroImageDark from '@/assets/img/首页背景图/夜间hero背景图.png'
import homeHeroImageLight from '@/assets/img/首页背景图/日间hero背景图.png'
import suiteEnterpriseImageDark from '@/img/home/suite-enterprise.png'
import suiteEnterpriseImageLight from '@/img/home/suite-enterprise-light.png'
import suiteWorkbenchImageDark from '@/img/home/suite-workbench.png'
import suiteWorkbenchImageLight from '@/img/home/suite-workbench-light.png'

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
    image: featureSkyImage,
  },
  {
    title: '行驶动态特效',
    description: '营造速度与运动感，展现车辆的强劲行驶姿态',
    image: featureRoadImage,
  },
  {
    title: '高质天空影棚',
    description: '干净通透的天空场景，让车辆展示更清晰醒目',
    image: featureOutdoorImage,
  },
]

export const homeTechBadges = [
  '姿态矫正',
  '智能抠图',
  '画质提升',
  '一键消除',
  '尺寸调整',
  '智能调色',
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
      title: '效率提示',
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
