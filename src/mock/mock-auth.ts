import type { LoginRequest, LoginResponse, UserInfo } from '@/types/auth'

import { mockDelay } from './mock-storage'

const permissions = {
  developer: [
    'menu:home',
    'menu:workspace',
    'menu:pricing',
    'menu:points',
    'menu:recharge',
    'menu:admin',
    'account:create:platform',
    'backoffice:developer',
  ],
  admin: [
    'menu:home',
    'menu:workspace',
    'menu:pricing',
    'menu:points',
    'menu:recharge',
    'menu:admin',
    'account:create:platform',
    'backoffice:admin',
  ],
  agent: [
    'menu:home',
    'menu:workspace',
    'menu:pricing',
    'menu:points',
    'menu:recharge',
    'menu:admin',
    'backoffice:agent',
  ],
  user: [
    'menu:home',
    'menu:workspace',
    'menu:pricing',
    'menu:points',
    'menu:recharge',
  ],
} as const

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
      displayName: '平台开发者',
      role: 'developer',
      permissions: [...permissions.developer],
    },
  },
  admin: {
    password: '123456',
    token: 'mock_admin_token',
    userInfo: {
      id: 'user_admin',
      username: 'admin',
      displayName: '管理员',
      role: 'admin',
      permissions: [...permissions.admin],
    },
  },
  agent: {
    password: '123456',
    token: 'mock_agent_token',
    userInfo: {
      id: 'user_agent',
      username: 'agent',
      displayName: '代理商',
      role: 'agent',
      permissions: [...permissions.agent],
    },
  },
  enterprise: {
    password: '123456',
    token: 'mock_enterprise_token',
    userInfo: {
      id: 'user_enterprise',
      username: 'enterprise',
      displayName: '企业用户',
      role: 'user',
      permissions: [...permissions.user],
    },
  },
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const matched = mockUsers[payload.username]
  if (!matched || matched.password !== payload.password) {
    throw new Error('账号或密码错误')
  }

  return mockDelay({ token: matched.token })
}

export async function getUserInfo(token: string): Promise<UserInfo> {
  const matched = Object.values(mockUsers).find((item) => item.token === token)
  if (!matched) {
    throw new Error('登录状态已失效')
  }

  return mockDelay(matched.userInfo)
}

export function normalizeMockUserInfo(userInfo: UserInfo | null): UserInfo | null {
  if (!userInfo) return null

  const role = (userInfo as unknown as { role?: string }).role

  if (userInfo.username === 'enterprise' || role === 'enterprise') {
    return {
      ...userInfo,
      displayName: userInfo.displayName === '企业用户（代理商）' ? '企业用户' : userInfo.displayName,
      role: 'user',
      permissions: [...permissions.user],
    }
  }

  if (role === 'developer' || role === 'admin' || role === 'agent' || role === 'user') {
    return userInfo
  }

  return null
}

export async function logout() {
  return mockDelay({ success: true })
}
