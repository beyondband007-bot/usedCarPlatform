import { defineStore } from 'pinia'

const SESSION_KEY = 'prototype-enterprise-session'

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
  }),
  actions: {
    login() {
      this.isLoggedIn = true
      window.localStorage.setItem(SESSION_KEY, '1')
    },
    logout() {
      this.isLoggedIn = false
      window.localStorage.removeItem(SESSION_KEY)
    },
  },
})
