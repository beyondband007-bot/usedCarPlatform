import type {
  SubscriptionPlan,
  SubscriptionPlanCode,
  SubscriptionStateSnapshot,
} from '@/types/subscription'

import { mockDelay, readMockStorage, writeMockStorage } from './mock-storage'

export const subscriptionPlans: Record<SubscriptionPlanCode, SubscriptionPlan> = {
  basic: {
    plan: 'basic',
    name: '企业基础版',
    price: 980,
    accountLimit: 1,
    concurrentTaskLimit: 2,
    visualConcurrentTaskLimit: 1,
    batchConcurrentTaskLimit: 1,
    giftPoints: 20000,
  },
  team: {
    plan: 'team',
    name: '企业团队版',
    price: 3980,
    accountLimit: 5,
    concurrentTaskLimit: 10,
    visualConcurrentTaskLimit: 5,
    batchConcurrentTaskLimit: 5,
    giftPoints: 55000,
  },
  flagship: {
    plan: 'flagship',
    name: '企业旗舰版',
    price: 9800,
    accountLimit: 20,
    concurrentTaskLimit: 40,
    visualConcurrentTaskLimit: 20,
    batchConcurrentTaskLimit: 20,
    giftPoints: 980000,
  },
}

const STORAGE_KEY = 'ai-car-studio:subscription'

function defaultSubscription(): SubscriptionStateSnapshot {
  const plan = subscriptionPlans.team
  const expireTime = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

  return {
    currentPlan: plan.plan,
    accountLimit: plan.accountLimit,
    concurrentTaskLimit: plan.concurrentTaskLimit,
    visualConcurrentTaskLimit: plan.visualConcurrentTaskLimit,
    batchConcurrentTaskLimit: plan.batchConcurrentTaskLimit,
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
    visualConcurrentTaskLimit: plan.visualConcurrentTaskLimit,
    batchConcurrentTaskLimit: plan.batchConcurrentTaskLimit,
    giftPoints: plan.giftPoints,
    expireTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  }

  writeMockStorage(STORAGE_KEY, next)
  return mockDelay(next)
}
