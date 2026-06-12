export type ShortVideoTemplateCategory =
  | 'all'
  | 'showroom'
  | 'single-car'
  | 'promotion'
  | 'market'

export interface ShortVideoTemplateCategoryOption {
  id: ShortVideoTemplateCategory
  label: string
}

export interface ShortVideoTemplateStyleOption {
  id: string
  label: string
}

export interface ShortVideoTemplateItem {
  id: string
  title: string
  category: Exclude<ShortVideoTemplateCategory, 'all'>
  style: string
  duration: string
  likes: number
  creator: string
  cover: string
  keywords: string[]
}

export const shortVideoTemplateCategories: ShortVideoTemplateCategoryOption[] = [
  { id: 'all', label: '全部' },
  { id: 'showroom', label: '车场介绍' },
  { id: 'single-car', label: '单车品介绍' },
  { id: 'promotion', label: '促销活动' },
  { id: 'market', label: '行情资讯' },
]

export const shortVideoTemplateStyles: ShortVideoTemplateStyleOption[] = [
  { id: 'all', label: '全部风格' },
  { id: 'professional', label: '专业讲解' },
  { id: 'promotion', label: '促销海报' },
  { id: 'data', label: '数据资讯' },
  { id: 'presenter', label: '口播出镜' },
]

export const shortVideoTemplateItems: ShortVideoTemplateItem[] = [
  {
    id: 'showroom-luxury',
    title: '豪车汇展厅介绍',
    category: 'showroom',
    style: 'presenter',
    duration: '00:35',
    likes: 892,
    creator: '车界小王子',
    cover:
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=640&q=80',
    keywords: ['展厅', '豪车', '介绍'],
  },
  {
    id: 'benz-e300l',
    title: '22款 奔驰E300L 运动',
    category: 'single-car',
    style: 'professional',
    duration: '00:28',
    likes: 756,
    creator: '德系车评人',
    cover:
      'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=640&q=80',
    keywords: ['奔驰', 'E300L', '运动'],
  },
  {
    id: 'autumn-sale',
    title: '金秋特惠 购车狂欢节',
    category: 'promotion',
    style: 'promotion',
    duration: '00:19',
    likes: 341,
    creator: '促销策划组',
    cover:
      'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=640&q=80',
    keywords: ['特惠', '促销', '购车'],
  },
  {
    id: 'market-october',
    title: '10月二手车行情速报',
    category: 'market',
    style: 'data',
    duration: '00:45',
    likes: 623,
    creator: '行情观察员',
    cover:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=640&q=80',
    keywords: ['行情', '数据', '10月'],
  },
  {
    id: 'sunshine-showroom',
    title: '阳光车城 精品车源展示',
    category: 'showroom',
    style: 'professional',
    duration: '00:32',
    likes: 518,
    creator: '阳光车城官方',
    cover:
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=640&q=80',
    keywords: ['车城', '精品', '车源'],
  },
  {
    id: 'audi-a6l',
    title: '2022款 奥迪A6L 45 TFSI',
    category: 'single-car',
    style: 'presenter',
    duration: '00:30',
    likes: 467,
    creator: '奥迪品鉴官',
    cover:
      'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=640&q=80',
    keywords: ['奥迪', 'A6L', 'TFSI'],
  },
  {
    id: 'year-end-sale',
    title: '年终大促 年终换车季',
    category: 'promotion',
    style: 'promotion',
    duration: '00:22',
    likes: 389,
    creator: '营销运营组',
    cover:
      'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=640&q=80',
    keywords: ['年终', '大促', '换车'],
  },
  {
    id: 'market-weekly',
    title: '本周二手车行情解读',
    category: 'market',
    style: 'data',
    duration: '00:41',
    likes: 512,
    creator: '数据研究室',
    cover:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=640&q=80',
    keywords: ['本周', '行情', '解读'],
  },
]
