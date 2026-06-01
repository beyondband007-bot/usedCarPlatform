import { defineStore } from 'pinia'

import { getCreditAccounts, type CreditAccount } from '@/api/visual-workbench'
import {
  clearCreditsIdentity,
  getDefaultMockCreditsIdentity,
  normalizeCreditsIdentity,
  readCreditsIdentity,
  writeCreditsIdentity,
  type CreditsIdentity,
} from '@/utils/credits-identity'

const SESSION_KEY = 'prototype-enterprise-session'

const formatPoints = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0)
  if (!Number.isFinite(parsed)) return '0'
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: 2,
  }).format(parsed)
}

const selectDisplayAccount = (accounts: CreditAccount[]) =>
  accounts.find((account) => account.accountScope === 'personal') ?? accounts[0] ?? null

function readSession(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return window.localStorage.getItem(SESSION_KEY) === '1'
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isLoggedIn: readSession(),
    userName: '企业用户',
    credits: '1,250',
    creditsIdentity: (readSession() ? readCreditsIdentity() : null) as CreditsIdentity | null,
    creditAccounts: [] as CreditAccount[],
    creditBalanceLoading: false,
  }),
  actions: {
    ensureCreditsIdentity() {
      const identity = normalizeCreditsIdentity(this.creditsIdentity) ?? getDefaultMockCreditsIdentity()
      this.creditsIdentity = identity
      writeCreditsIdentity(identity)
      return identity
    },
    login(identity?: CreditsIdentity) {
      this.creditsIdentity = normalizeCreditsIdentity(identity) ?? getDefaultMockCreditsIdentity()
      this.isLoggedIn = true
      writeCreditsIdentity(this.creditsIdentity)
      window.localStorage.setItem(SESSION_KEY, '1')
      void this.refreshCredits()
    },
    logout() {
      this.isLoggedIn = false
      this.creditAccounts = []
      this.credits = '0'
      this.creditsIdentity = null
      window.localStorage.removeItem(SESSION_KEY)
      clearCreditsIdentity()
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
