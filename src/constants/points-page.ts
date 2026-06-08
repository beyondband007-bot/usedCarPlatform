import { mediaUrls } from '@/constants/media-urls'

const pointsQueryBgDark = mediaUrls.points.queryBgDark
const pointsQueryBgLight = mediaUrls.points.queryBgLight
import pointsSummaryIconFrame from '@/assets/img/icon/Frame.svg'
import pointsSummaryIconFrame1 from '@/assets/img/icon/Frame-1.svg'
import pointsSummaryIconFrame2 from '@/assets/img/icon/Frame-2.svg'
import pointsSummaryIconVector from '@/assets/img/icon/Vector.svg'

/** 积分查询页整页背景：日间 */
export const pointsQueryBackgroundLight = pointsQueryBgLight

/** 积分查询页整页背景：夜间 */
export const pointsQueryBackgroundDark = pointsQueryBgDark

export const pointsStaticImageUrls = [
  pointsQueryBackgroundLight,
  pointsQueryBackgroundDark,
]

export const pointsQueryHeroCopy = {
  title: '积分查询',
  subtitle: '三档套餐覆盖试运行，团队批量上新与集团化交付场景',
} as const

/** 积分概览四卡图标：frame → vector → frame2 → frame1 */
export const pointsSummaryIcons = {
  available: pointsSummaryIconFrame,
  gained: pointsSummaryIconVector,
  consumed: pointsSummaryIconFrame2,
  recentNet: pointsSummaryIconFrame1,
} as const
