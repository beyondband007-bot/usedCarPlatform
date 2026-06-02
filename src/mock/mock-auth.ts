import type { LoginRequest, LoginResponse, UserInfo } from '@/types/auth'
import type { SubscriptionPlanCode } from '@/types/subscription'

import { subscriptionPlans } from './mock-subscription'
import { mockDelay } from './mock-storage'

const permissions = {
  admin: [
    'menu:home',
    'menu:workspace',
    'menu:pricing',
    'menu:points',
    'menu:recharge',
    'menu:admin',
  ],
  enterprise: [
    'menu:home',
    'menu:workspace',
    'menu:pricing',
    'menu:points',
    'menu:recharge',
  ],
} as const

const planAccountMap: Record<string, SubscriptionPlanCode> = {
  basic: 'basic',
  team: 'team',
  enterprise: 'team',
  flagship: 'flagship',
  admin: 'flagship',
}

const mockUsers: Record<
  string,
  { password: string; token: string; userInfo: UserInfo }
> = {
  admin: {
    password: '123456',
    token: 'mock_admin_token',
    userInfo: {
      id: 'user_admin',
      username: 'admin',
      phone: '13800000001',
      displayName: '管理员',
      role: 'admin',
      permissions: [...permissions.admin],
    },
  },
  enterprise: {
    password: '123456',
    token: 'mock_enterprise_token',
    userInfo: {
      id: 'user_enterprise',
      username: 'enterprise',
      phone: '13800000002',
      displayName: '企业用户',
      role: 'enterprise',
      permissions: [...permissions.enterprise],
    },
  },
  basic: {
    password: '123456',
    token: 'mock_basic_token',
    userInfo: {
      id: 'user_basic',
      username: 'basic',
      phone: '13800000003',
      displayName: '基础版企业用户',
      role: 'enterprise',
      permissions: [...permissions.enterprise],
    },
  },
  team: {
    password: '123456',
    token: 'mock_team_token',
    userInfo: {
      id: 'user_team',
      username: 'team',
      phone: '13800000004',
      displayName: '团队版企业用户',
      role: 'enterprise',
      permissions: [...permissions.enterprise],
    },
  },
  flagship: {
    password: '123456',
    token: 'mock_flagship_token',
    userInfo: {
      id: 'user_flagship',
      username: 'flagship',
      phone: '13800000005',
      displayName: '旗舰版企业用户',
      role: 'enterprise',
      permissions: [...permissions.enterprise],
    },
  },
}

function buildSubscription(username: string) {
  const planCode = planAccountMap[username] ?? 'team'
  const plan = subscriptionPlans[planCode]
  return {
    currentPlan: plan.plan,
    accountLimit: plan.accountLimit,
    concurrentTaskLimit: plan.concurrentTaskLimit,
    visualConcurrentTaskLimit: plan.visualConcurrentTaskLimit,
    batchConcurrentTaskLimit: plan.batchConcurrentTaskLimit,
    giftPoints: plan.giftPoints,
    expireTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  }
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const account = payload.username.trim().toLowerCase()
  const matched =
    mockUsers[account] ??
    Object.values(mockUsers).find((item) => item.userInfo.phone === account)
  if (!matched || matched.password !== payload.password) {
    throw new Error('账号或密码错误')
  }

  return mockDelay({
    token: matched.token,
    userInfo: matched.userInfo,
    subscription: buildSubscription(matched.userInfo.username),
  })
}

export async function getUserInfo(token: string): Promise<UserInfo> {
  const matched = Object.values(mockUsers).find((item) => item.token === token)
  if (!matched) {
    throw new Error('登录状态已失效')
  }

  return mockDelay(matched.userInfo)
}

export async function logout() {
  return mockDelay({ success: true })
}
