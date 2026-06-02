import type { SubscriptionStateSnapshot } from './subscription'

export type UserRole = 'admin' | 'enterprise'

export interface UserInfo {
  id: string
  username: string
  displayName: string
  role: UserRole
  permissions: string[]
  creditsUserId?: number | null
  creditsTenantId?: number | null
  accountScope?: 'personal' | 'tenant'
}

export interface LoginRequest {
  username: string
  password: string
  remember?: boolean
}

export interface LoginResponse {
  token: string
  userInfo: UserInfo
  subscription: SubscriptionStateSnapshot
}
