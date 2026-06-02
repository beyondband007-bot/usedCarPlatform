import type { SubscriptionPlan, SubscriptionPlanCode } from '@/types/subscription'

export interface EnterprisePlan extends SubscriptionPlan {
  displayName: string
  accountLabel: string
  perAccountConcurrentRequestLimit: number
  totalConcurrentRequestLimit: number
  concurrencyLabel: string
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
    perAccountConcurrentRequestLimit: 1,
    totalConcurrentRequestLimit: 1,
    concurrencyLabel: '后台最多同时执行 1 个生成请求',
    description: '适合小团队启动视觉生产流程，先验证素材标准与交付节奏。',
    featureDetails: [
      '赠送 20,000 积分',
      '1 个账号',
      '后台最多同时执行 1 个生成请求',
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
    perAccountConcurrentRequestLimit: 5,
    totalConcurrentRequestLimit: 5,
    concurrencyLabel: '后台最多同时执行 5 个生成请求',
    description: '适合门店或车商团队并行上新，兼顾积分额度与后台并发。',
    featureDetails: [
      '赠送 100,000 积分',
      '1 个账号',
      '后台最多同时执行 5 个生成请求',
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
    perAccountConcurrentRequestLimit: 20,
    totalConcurrentRequestLimit: 80,
    concurrencyLabel: '每个账号后台最多同时执行 20 个生成请求，4 个账号合计最多 80 个',
    description: '适合集团化业务、出海车源与多账号高并发交付。',
    featureDetails: [
      '赠送 800,000 积分',
      '1 + 3 个账号',
      '每个账号后台最多同时执行 20 个生成请求',
      '4 个账号同时工作时，后台合计最多执行 80 个生成请求',
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

export function resolveTotalConcurrentRequestLimit(plan: SubscriptionPlanCode) {
  return enterprisePlans[plan].totalConcurrentRequestLimit
}

export function resolveEnterprisePlanCodeFromName(name: string): SubscriptionPlanCode | null {
  const normalized = name.toLowerCase()

  if (normalized.includes('basic') || name.includes('基础')) return 'basic'
  if (normalized.includes('team') || name.includes('团队')) return 'team'
  if (normalized.includes('flagship') || name.includes('旗舰')) return 'flagship'

  return null
}
