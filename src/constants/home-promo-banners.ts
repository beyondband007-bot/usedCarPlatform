import banner01LightPollution from '@/img/home/promo-banners/banner-01-light-pollution.png'
import banner02AgentRecruitment from '@/img/home/promo-banners/banner-02-agent-recruitment.png'
import banner03CreativeTeam from '@/img/home/promo-banners/banner-03-creative-team.png'

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
  },
  {
    id: 'agent-recruitment',
    image: banner02AgentRecruitment,
    alt: '系统代理火热招募中',
    title: '系统代理火热招募中',
    lines: ['名额有限，先到先得', '抢占 AI 汽车内容增长新机会'],
    actionLabel: '立即咨询',
    opensConsultModal: true,
  },
  {
    id: 'creative-team',
    image: banner03CreativeTeam,
    alt: 'AI 汽车内容创作团队',
    hideCopy: true,
  },
]

export const homePromoBannerIntervalMs = 5000
