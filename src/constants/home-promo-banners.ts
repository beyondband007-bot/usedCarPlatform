import banner01DetailMaterials from '@/img/home/promo-banners/banner-01-detail-materials.png'
import banner02EnterpriseSuite from '@/img/home/promo-banners/banner-02-enterprise-suite.png'
import banner03CaseUsed from '@/img/home/promo-banners/banner-03-case-used.png'
import banner04ShowroomStudio from '@/img/home/promo-banners/banner-04-showroom-studio.png'

export interface HomePromoBannerSlide {
  id: string
  image: string
  alt: string
  title: string
  subtitle?: string
  to?: string
}

/** 首页快捷入口区右侧海报轮播（资源目录：src/img/home/promo-banners/） */
export const homePromoBannerSlides: HomePromoBannerSlide[] = [
  {
    id: 'detail-materials',
    image: banner01DetailMaterials,
    alt: '详情页素材方案海报',
    title: '详情页素材',
    subtitle: '详情图、卖点卡、客户官方方案',
  },
  {
    id: 'enterprise-suite',
    image: banner02EnterpriseSuite,
    alt: '企业套餐开通海报',
    title: '企业套餐',
    subtitle: '账号、积分、品牌外观同步开通',
    to: '/pricing',
  },
  {
    id: 'case-used',
    image: banner03CaseUsed,
    alt: '二手车出海案例海报',
    title: '二手车出海',
    subtitle: '多语言 listing 与统一场景图交付',
  },
  {
    id: 'showroom-studio',
    image: banner04ShowroomStudio,
    alt: '展厅棚拍能力海报',
    title: '展厅灯光棚拍',
    subtitle: '还原专业展厅灯光与质感',
  },
]

export const homePromoBannerIntervalMs = 5000
