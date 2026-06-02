import type { LoginRequest, LoginResponse, UserInfo } from '@/types/auth'

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
      displayName: '旗舰版企业用户',
      role: 'enterprise',
      permissions: [...permissions.enterprise],
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

export async function logout() {
  return mockDelay({ success: true })
}
