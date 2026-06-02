import type {
  SubscriptionPlan,
  SubscriptionPlanCode,
  SubscriptionStateSnapshot,
} from '@/types/subscription'
import { enterprisePlans } from '@/domain/enterprise-plans'

import { mockDelay, readMockStorage, writeMockStorage } from './mock-storage'

export const subscriptionPlans: Record<SubscriptionPlanCode, SubscriptionPlan> = enterprisePlans

const STORAGE_KEY = 'ai-car-studio:subscription'

function defaultSubscription(): SubscriptionStateSnapshot {
  const plan = subscriptionPlans.team
  const expireTime = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

  return {
    currentPlan: plan.plan,
    accountLimit: plan.accountLimit,
    concurrentTaskLimit: plan.concurrentTaskLimit,
    giftPoints: plan.giftPoints,
    expireTime,
  }
}

export async function getSubscription() {
  return mockDelay(readMockStorage(STORAGE_KEY, defaultSubscription()))
}

export async function activateSubscription(planCode: SubscriptionPlanCode) {
  const plan = subscriptionPlans[planCode]
  const next: SubscriptionStateSnapshot = {
    currentPlan: plan.plan,
    accountLimit: plan.accountLimit,
    concurrentTaskLimit: plan.concurrentTaskLimit,
    giftPoints: plan.giftPoints,
    expireTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  }

  writeMockStorage(STORAGE_KEY, next)
  return mockDelay(next)
}
