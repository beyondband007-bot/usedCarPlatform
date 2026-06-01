import { defineStore } from 'pinia'

import { getCreditAccounts, type CreditAccount } from '@/api/visual-workbench'
import {
  getUserInfo,
  login as mockLogin,
  logout as mockLogout,
  normalizeMockUserInfo,
} from '@/mock/mock-auth'
import { removeMockStorage, readMockStorage, writeMockStorage } from '@/mock/mock-storage'
import type { LoginRequest, UserInfo, UserRole } from '@/types/auth'
import {
  clearCreditsIdentity,
  getDefaultMockCreditsIdentity,
  normalizeCreditsIdentity,
  readCreditsIdentity,
  writeCreditsIdentity,
  type CreditsIdentity,
} from '@/utils/credits-identity'

const TOKEN_KEY = 'ai-car-studio:auth-token'
const USER_KEY = 'ai-car-studio:user-info'

interface AuthState {
  token: string
  userInfo: UserInfo | null
  role: UserRole | null
  permissions: string[]
  remember: boolean
  initialized: boolean
  credits: string
  creditsIdentity: CreditsIdentity | null
  creditAccounts: CreditAccount[]
  creditBalanceLoading: boolean
}

const formatPoints = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0)
  if (!Number.isFinite(parsed)) return '0'
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: 2,
  }).format(parsed)
}

const selectDisplayAccount = (accounts: CreditAccount[]) =>
  accounts.find((account) => account.accountScope === 'personal') ?? accounts[0] ?? null

function readInitialCreditsText() {
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
    const userInfo = normalizeMockUserInfo(readMockStorage<UserInfo | null>(USER_KEY, null))

    return {
      token: readMockStorage(TOKEN_KEY, ''),
      userInfo,
      role: userInfo?.role ?? null,
      permissions: userInfo?.permissions ?? [],
      remember: true,
      initialized: false,
      credits: readInitialCreditsText(),
      creditsIdentity: userInfo ? readCreditsIdentity() : null,
      creditAccounts: [],
      creditBalanceLoading: false,
    }
  },
  getters: {
    isLoggedIn: (state) => Boolean(state.token && state.userInfo),
    userName: (state) => state.userInfo?.displayName ?? state.userInfo?.username ?? '未登录',
  },
  actions: {
    hydrate() {
      if (this.initialized) return
      this.initialized = true
      if (this.token && !this.userInfo) {
        void this.logout(false)
        return
      }
      if (this.isLoggedIn) {
        this.ensureCreditsIdentity()
        void this.refreshCredits()
      }
    },
    ensureCreditsIdentity() {
      const identity = normalizeCreditsIdentity(this.creditsIdentity) ?? getDefaultMockCreditsIdentity()
      this.creditsIdentity = identity
      writeCreditsIdentity(identity)
      return identity
    },
    setCreditsIdentity(identity?: CreditsIdentity | null) {
      this.creditsIdentity = normalizeCreditsIdentity(identity) ?? getDefaultMockCreditsIdentity()
      writeCreditsIdentity(this.creditsIdentity)
      return this.creditsIdentity
    },
    async login(payload: LoginRequest, creditsIdentity?: CreditsIdentity) {
      const response = await mockLogin(payload)
      const userInfo = await getUserInfo(response.token)

      this.token = response.token
      this.userInfo = userInfo
      this.role = userInfo.role
      this.permissions = [...userInfo.permissions]
      this.remember = Boolean(payload.remember)
      this.setCreditsIdentity(creditsIdentity)

      if (this.remember) {
        writeMockStorage(TOKEN_KEY, response.token)
        writeMockStorage(USER_KEY, userInfo)
      } else {
        removeMockStorage(TOKEN_KEY)
        removeMockStorage(USER_KEY)
      }

      void this.refreshCredits()
      return userInfo
    },
    async logout(persist = true) {
      await mockLogout()
      this.token = ''
      this.userInfo = null
      this.role = null
      this.permissions = []
      this.creditAccounts = []
      this.credits = '0'
      this.creditsIdentity = null
      clearCreditsIdentity()

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
    async refreshCredits() {
      if (!this.isLoggedIn || this.creditBalanceLoading) return

      this.ensureCreditsIdentity()
      this.creditBalanceLoading = true
      try {
        const { accounts } = await getCreditAccounts()
        this.creditAccounts = accounts
        const account = selectDisplayAccount(accounts)
        if (account) {
          this.credits = formatPoints(account.availableBalance)
        }
      } catch (error) {
        console.warn('failed to refresh credit balance', error)
      } finally {
        this.creditBalanceLoading = false
      }
    },
  },
})

export const useUserStore = useAuthStore
