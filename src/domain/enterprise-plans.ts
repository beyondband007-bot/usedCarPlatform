import type { SubscriptionPlan, SubscriptionPlanCode } from '@/types/subscription'

export interface EnterprisePlan extends SubscriptionPlan {
  displayName: string
  accountLabel: string
  concurrencyLabel: string
  generatedImagesLabel: string
  vehicleCoverageLabel: string
  description: string
  featureDetails: string[]
}

export const enterprisePlans: Record<SubscriptionPlanCode, EnterprisePlan> = {
  basic: {
    plan: 'basic',
    name: '企业基础档',
    displayName: '￥980 企业基础档',
    price: 980,
    accountLimit: 1,
    concurrentTaskLimit: 1,
    giftPoints: 20000,
    accountLabel: '1 个账号',
    concurrencyLabel: '后台可执行 1 套图（10 张外观图）',
    generatedImagesLabel: '可生成 500 张图',
    vehicleCoverageLabel: '约 50-80 辆车',
    description: '适合小团队启动视觉生产流程，先验证素材标准与交付节奏。',
    featureDetails: [
      '赠送 20,000 积分',
      '1 个账号',
      '可生成 500 张图，约 50-80 辆车',
      '后台可执行 1 套图（10 张外观图）',
    ],
  },
  team: {
    plan: 'team',
    name: '企业团队档',
    displayName: '￥3,980 企业团队档',
    price: 3980,
    accountLimit: 1,
    concurrentTaskLimit: 5,
    giftPoints: 100000,
    accountLabel: '1 个账号',
    concurrencyLabel: '可同时执行 5 套图',
    generatedImagesLabel: '可生成 2,500 张图',
    vehicleCoverageLabel: '约 250-300 辆车',
    description: '适合门店或车商团队并行上新，兼顾积分额度与图组并发。',
    featureDetails: [
      '赠送 100,000 积分',
      '1 个账号',
      '可生成 2,500 张图，约 250-300 辆车',
      '可同时执行 5 套图',
    ],
  },
  flagship: {
    plan: 'flagship',
    name: '企业旗舰档',
    displayName: '￥9,800 企业旗舰档',
    price: 9800,
    accountLimit: 4,
    concurrentTaskLimit: 20,
    giftPoints: 800000,
    accountLabel: '1 + 3 个账号',
    concurrencyLabel: '每个账号可同时执行 20 套图',
    generatedImagesLabel: '可生成 15,000 张图',
    vehicleCoverageLabel: '约 1,500 辆车',
    description: '适合集团化业务、出海车源与多账号高并发交付。',
    featureDetails: [
      '赠送 800,000 积分',
      '1 + 3 个账号',
      '可生成 15,000 张图，约 1,500 辆车',
      '每个账号可同时执行 20 套图',
    ],
  },
}

export const enterprisePlanList = [
  enterprisePlans.basic,
  enterprisePlans.team,
  enterprisePlans.flagship,
]

export function formatPlanPrice(plan: Pick<EnterprisePlan, 'price'>) {
  return `¥${plan.price.toLocaleString('zh-CN')}`
}

export function formatPlanPoints(plan: Pick<EnterprisePlan, 'giftPoints'>) {
  return plan.giftPoints.toLocaleString('zh-CN')
}

export function resolveEnterprisePlanName(plan: SubscriptionPlanCode) {
  return enterprisePlans[plan].name
}

export function resolveEnterprisePlanCodeFromName(name: string): SubscriptionPlanCode | null {
  const normalized = name.toLowerCase()

  if (normalized.includes('basic') || name.includes('基础')) return 'basic'
  if (normalized.includes('team') || name.includes('团队')) return 'team'
  if (normalized.includes('flagship') || name.includes('旗舰')) return 'flagship'

  return null
}
