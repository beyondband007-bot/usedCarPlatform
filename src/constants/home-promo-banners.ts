import { mediaUrls } from '@/constants/media-urls'

const banner01LightPollution = mediaUrls.home.promoLightPollution
const banner02AgentRecruitment = mediaUrls.home.promoAgentRecruitment
const banner03CreativeTeam = mediaUrls.home.promoCreativeTeam

export interface HomePromoBannerSlide {
  id: string
  image: string
  alt: string
  title?: string
  lines?: string[]
  actionLabel?: string
  actionTo?: string
  opensConsultModal?: boolean
  to?: string
  hideCopy?: boolean
  /** 图片已自带蒙层时设为 false，文案区不再叠加渐变 */
  copyOverlay?: boolean
  /** elevated：文案与按钮整体上移，适配底图自带蒙层的海报 */
  copyLayout?: 'default' | 'elevated'
  /** dark：浅色底图区域使用深色文案 */
  copyTone?: 'light' | 'dark'
}

/** 首页快捷入口区右侧海报轮播（资源目录：src/img/home/promo-banners/） */
const promoBannerBodyLines = [
  '企业团队专属套餐，5套组图一键生成',
  '效率提高95%',
] as const

export const homePromoBannerSlides: HomePromoBannerSlide[] = [
  {
    id: 'light-pollution',
    image: banner01LightPollution,
    alt: '批量生图，限时特惠中',
    title: '批量生图，限时特惠中',
    lines: [...promoBannerBodyLines],
    copyLayout: 'elevated',
  },

  {
    id: 'agent-recruitment',
    image: banner03CreativeTeam,
    alt: '系统代理火热招募中',
    title: '系统代理火热招募中',
    lines: ['名额有限，先到先得', '抢占 AI 汽车内容增长新机会'],
    actionLabel: '立即咨询',
    opensConsultModal: true,
    copyLayout: 'elevated',
  },
  {
    id: 'light-pollution-quality',
    image: banner02AgentRecruitment,
    alt: '光污染消除，还原真实品质',
    title: '光污染消除，还原真实品质',
    lines: ['精准去除反光与杂光', '真实还原漆面质感与车身细节'],
    copyLayout: 'elevated',
  },
]

export const homePromoBannerIntervalMs = 5000

export const homePromoBannerImageUrls = homePromoBannerSlides.map(
  (slide) => slide.image,
)
