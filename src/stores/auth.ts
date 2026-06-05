import { defineStore } from 'pinia'

import {
  getCurrentUser,
  login as apiLogin,
  loginWithCode as apiLoginWithCode,
  logout as apiLogout,
  type LoginWithCodeRequest,
} from '@/api/auth'
import { removeMockStorage, readMockStorage, writeMockStorage } from '@/mock/mock-storage'
import { useSubscriptionStore } from '@/stores/subscription'
import type { LoginRequest, UserInfo, UserRole } from '@/types/auth'
import { resetCreditsIdentity, setCreditsIdentity } from '@/utils/credits-identity'

const TOKEN_KEY = 'ai-car-studio:auth-token'
const USER_KEY = 'ai-car-studio:user-info'
const SUBSCRIPTION_STATE_KEY = 'ai-car-studio:subscription-state'

interface AuthState {
  token: string
  userInfo: UserInfo | null
  role: UserRole | null
  permissions: string[]
  remember: boolean
  initialized: boolean
}

function readPointsText() {
  if (typeof window === 'undefined') return '100,000'

  const raw = window.localStorage.getItem('ai-car-studio:points-summary')
  if (!raw) return '100,000'

  try {
    const parsed = JSON.parse(raw) as { currentPoints?: number }
    return Number(parsed.currentPoints ?? 0).toLocaleString('zh-CN')
  } catch {
    return '100,000'
  }
}

function readToken() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(TOKEN_KEY) ?? ''
}

function writeToken(token: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TOKEN_KEY, token)
}

function removeToken() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(TOKEN_KEY)
}

function syncCreditsIdentity(userInfo: UserInfo) {
  if (!userInfo.creditsUserId) return

  const inferredTenantId =
    userInfo.creditsTenantId
    ?? userInfo.enterpriseTenantId
    ?? null
  const inferredAccountScope =
    userInfo.accountScope
    ?? (inferredTenantId || userInfo.role === 'enterprise' ? 'tenant' : 'personal')

  setCreditsIdentity({
    userId: userInfo.creditsUserId,
    accountScope: inferredAccountScope === 'tenant' ? 'tenant' : 'personal',
    tenantId: inferredAccountScope === 'tenant' ? inferredTenantId : null,
  })
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => {
    const userInfo = readMockStorage<UserInfo | null>(USER_KEY, null)
    if (userInfo?.creditsUserId) {
      syncCreditsIdentity(userInfo)
    } else {
      resetCreditsIdentity()
    }

    return {
      token: readToken(),
      userInfo,
      role: userInfo?.role ?? null,
      permissions: userInfo?.permissions ?? [],
      remember: true,
      initialized: false,
    }
  },
  getters: {
    isLoggedIn: (state) => Boolean(state.token && state.userInfo),
    userName: (state) => state.userInfo?.displayName ?? state.userInfo?.username ?? '未登录',
    credits: () => readPointsText(),
  },
  actions: {
    async hydrate() {
      if (this.initialized) return
      this.initialized = true

      if (!this.token) return

      try {
        const response = await getCurrentUser()
        this.userInfo = response.userInfo
        this.role = response.userInfo.role
        this.permissions = [...response.userInfo.permissions]
        writeMockStorage(USER_KEY, response.userInfo)
        syncCreditsIdentity(response.userInfo)
        useSubscriptionStore().applySubscriptionSnapshot(response.subscription)
      } catch {
        await this.logout(false)
      }
    },
    async login(payload: LoginRequest) {
      const response = await apiLogin(payload)
      const subscriptionStore = useSubscriptionStore()

      this.token = response.token
      this.userInfo = response.userInfo
      this.role = response.userInfo.role
      this.permissions = [...response.userInfo.permissions]
      this.remember = Boolean(payload.remember)

      subscriptionStore.applySubscriptionSnapshot(response.subscription)
      syncCreditsIdentity(response.userInfo)
      writeToken(response.token)
      writeMockStorage(USER_KEY, response.userInfo)

      return response.userInfo
    },
    async loginWithCode(payload: LoginWithCodeRequest) {
      const response = await apiLoginWithCode(payload)
      const subscriptionStore = useSubscriptionStore()

      this.token = response.token
      this.userInfo = response.userInfo
      this.role = response.userInfo.role
      this.permissions = [...response.userInfo.permissions]
      this.remember = Boolean(payload.remember)

      subscriptionStore.applySubscriptionSnapshot(response.subscription)
      syncCreditsIdentity(response.userInfo)
      writeToken(response.token)
      writeMockStorage(USER_KEY, response.userInfo)

      return response.userInfo
    },
    async logout(persist = true) {
      if (persist) {
        try {
          await apiLogout()
        } catch {
          // Local cleanup still needs to happen when the session already expired.
        }
      }

      this.token = ''
      this.userInfo = null
      this.role = null
      this.permissions = []

      removeToken()
      removeMockStorage(USER_KEY)
      removeMockStorage(SUBSCRIPTION_STATE_KEY)
      resetCreditsIdentity()
    },
    async refreshUserInfo() {
      if (!this.token) return null
      const response = await getCurrentUser()
      this.userInfo = response.userInfo
      this.role = response.userInfo.role
      this.permissions = [...response.userInfo.permissions]
      writeMockStorage(USER_KEY, response.userInfo)
      syncCreditsIdentity(response.userInfo)
      useSubscriptionStore().applySubscriptionSnapshot(response.subscription)
      return response.userInfo
    },
  },
})

export const useUserStore = useAuthStore
