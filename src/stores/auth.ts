import { defineStore } from 'pinia'

import { getUserInfo, login as mockLogin, logout as mockLogout } from '@/mock/mock-auth'
import { removeMockStorage, readMockStorage, writeMockStorage } from '@/mock/mock-storage'
import type { LoginRequest, UserInfo, UserRole } from '@/types/auth'

const TOKEN_KEY = 'ai-car-studio:auth-token'
const USER_KEY = 'ai-car-studio:user-info'

interface AuthState {
  token: string
  userInfo: UserInfo | null
  role: UserRole | null
  permissions: string[]
  remember: boolean
  initialized: boolean
}

function readPointsText() {
  if (typeof window === 'undefined') return '55,000'

  const raw = window.localStorage.getItem('ai-car-studio:points-summary')
  if (!raw) return '55,000'

  try {
    const parsed = JSON.parse(raw) as { currentPoints?: number }
    return Number(parsed.currentPoints ?? 0).toLocaleString('zh-CN')
  } catch {
    return '55,000'
  }
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => {
    const userInfo = readMockStorage<UserInfo | null>(USER_KEY, null)

    return {
      token: readMockStorage(TOKEN_KEY, ''),
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
    hydrate() {
      if (this.initialized) return
      this.initialized = true
      if (this.token && !this.userInfo) {
        void this.logout(false)
      }
    },
    async login(payload: LoginRequest) {
      const response = await mockLogin(payload)
      const userInfo = await getUserInfo(response.token)

      this.token = response.token
      this.userInfo = userInfo
      this.role = userInfo.role
      this.permissions = [...userInfo.permissions]
      this.remember = Boolean(payload.remember)

      if (this.remember) {
        writeMockStorage(TOKEN_KEY, response.token)
        writeMockStorage(USER_KEY, userInfo)
      } else {
        removeMockStorage(TOKEN_KEY)
        removeMockStorage(USER_KEY)
      }

      return userInfo
    },
    async logout(persist = true) {
      await mockLogout()
      this.token = ''
      this.userInfo = null
      this.role = null
      this.permissions = []

      if (persist) {
        removeMockStorage(TOKEN_KEY)
        removeMockStorage(USER_KEY)
      }
    },
    async refreshUserInfo() {
      if (!this.token) return null
      const userInfo = await getUserInfo(this.token)
      this.userInfo = userInfo
      this.role = userInfo.role
      this.permissions = [...userInfo.permissions]
      writeMockStorage(USER_KEY, userInfo)
      return userInfo
    },
  },
})

export const useUserStore = useAuthStore
