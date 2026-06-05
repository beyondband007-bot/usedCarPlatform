import type { LoginRequest, LoginResponse, UserInfo } from '@/types/auth'
import type { SubscriptionPlanCode } from '@/types/subscription'

import { subscriptionPlans } from './mock-subscription'
import { mockDelay } from './mock-storage'

const permissions = {
  developer: [
    'menu:home',
    'menu:workspace',
    'menu:pricing',
    'menu:points',
    'menu:recharge',
    'menu:admin',
    'account:create:admin',
    'account:create:agent',
    'account:create:user',
    'account:delete:admin',
    'account:delete:agent',
    'account:delete:user',
    'credits:balance:read:all',
    'credits:transaction:read:all',
    'credits:points:adjust',
    'policy:account-creation:manage',
  ],
  admin: [
    'menu:home',
    'menu:workspace',
    'menu:pricing',
    'menu:points',
    'menu:recharge',
    'menu:admin',
    'account:create:agent',
    'account:create:user',
    'account:delete:agent',
    'account:delete:user',
    'credits:balance:read:all',
    'credits:transaction:read:all',
    'credits:points:adjust',
    'policy:agent-user-creation:manage',
    'policy:user-agent-promotion:manage',
  ],
  agent: [
    'menu:home',
    'menu:points',
    'menu:recharge',
    'menu:admin',
    'account:create:user',
    'credits:balance:read:created-users',
    'credits:transaction:read:created-users',
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
  flagship_sub_sales: 'flagship',
  flagship_sub_ops: 'flagship',
  flagship_sub_design: 'flagship',
  developer: 'flagship',
  admin: 'flagship',
  agent: 'team',
}

const mockUsers: Record<
  string,
  { password: string; token: string; userInfo: UserInfo }
> = {
  developer: {
    password: '123456',
    token: 'mock_developer_token',
    userInfo: {
      id: 'user_developer',
      username: 'developer',
      phone: '13800000000',
      displayName: '开发者',
      role: 'developer',
      permissions: [...permissions.developer],
      creditsUserId: 6,
      accountScope: 'personal',
    },
  },
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
      creditsUserId: 1,
      accountScope: 'personal',
    },
  },
  agent: {
    password: '123456',
    token: 'mock_agent_token',
    userInfo: {
      id: 'user_agent',
      username: 'agent',
      phone: '13800000009',
      displayName: '代理商',
      role: 'agent',
      permissions: [...permissions.agent],
      creditsUserId: 7,
      accountScope: 'personal',
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
      creditsUserId: 5,
      accountScope: 'tenant',
      creditsTenantId: 1001,
      enterpriseTenantId: 'tenant_flagship',
      enterpriseTenantName: '企业旗舰版演示企业',
      enterpriseMemberRole: 'owner',
      enterpriseOwnerUserId: 'user_flagship',
      enterpriseSubscriptionUserId: 'user_flagship',
      enterpriseAccountRole: 'mother',
      canViewEnterpriseChildren: true,
    },
  },
  flagship_sub_sales: {
    password: '123456',
    token: 'mock_flagship_sub_sales_token',
    userInfo: {
      id: 'user_flagship_sub_sales',
      username: 'flagship_sub_sales',
      phone: '13800000006',
      displayName: '旗舰子账号-销售',
      role: 'enterprise',
      permissions: [...permissions.enterprise],
      creditsUserId: 5,
      accountScope: 'tenant',
      creditsTenantId: 1001,
      enterpriseTenantId: 'tenant_flagship',
      enterpriseTenantName: '企业旗舰版演示企业',
      enterpriseMemberRole: 'admin',
      enterpriseOwnerUserId: 'user_flagship',
      enterpriseSubscriptionUserId: 'user_flagship',
      enterpriseAccountRole: 'child',
      canViewEnterpriseChildren: false,
    },
  },
  flagship_sub_ops: {
    password: '123456',
    token: 'mock_flagship_sub_ops_token',
    userInfo: {
      id: 'user_flagship_sub_ops',
      username: 'flagship_sub_ops',
      phone: '13800000007',
      displayName: '旗舰子账号-运营',
      role: 'enterprise',
      permissions: [...permissions.enterprise],
      creditsUserId: 5,
      accountScope: 'tenant',
      creditsTenantId: 1001,
      enterpriseTenantId: 'tenant_flagship',
      enterpriseTenantName: '企业旗舰版演示企业',
      enterpriseMemberRole: 'member',
      enterpriseOwnerUserId: 'user_flagship',
      enterpriseSubscriptionUserId: 'user_flagship',
      enterpriseAccountRole: 'child',
      canViewEnterpriseChildren: false,
    },
  },
  flagship_sub_design: {
    password: '123456',
    token: 'mock_flagship_sub_design_token',
    userInfo: {
      id: 'user_flagship_sub_design',
      username: 'flagship_sub_design',
      phone: '13800000008',
      displayName: '旗舰子账号-设计',
      role: 'enterprise',
      permissions: [...permissions.enterprise],
      creditsUserId: 5,
      accountScope: 'tenant',
      creditsTenantId: 1001,
      enterpriseTenantId: 'tenant_flagship',
      enterpriseTenantName: '企业旗舰版演示企业',
      enterpriseMemberRole: 'member',
      enterpriseOwnerUserId: 'user_flagship',
      enterpriseSubscriptionUserId: 'user_flagship',
      enterpriseAccountRole: 'child',
      canViewEnterpriseChildren: false,
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
