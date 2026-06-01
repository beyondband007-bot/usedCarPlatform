import { createRouter, createWebHistory } from 'vue-router'

import { AUTH_ROUTE } from '@/constants/app-flow'
import {
  hasPlayedIntroVideoThisSession,
  resetIntroVideoOnHardReload,
} from '@/constants/intro-video'
import { useAuthStore } from '@/stores/auth'

import { routes } from './routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

function resolveRedirectPath(redirect: unknown, fallback: string) {
  return typeof redirect === 'string' && redirect.startsWith('/') ? redirect : fallback
}

function resolveAuthenticatedRedirectPath(redirect: unknown, fallback: string) {
  const path = resolveRedirectPath(redirect, fallback)

  if (path === AUTH_ROUTE || path === '/enterprise' || path === '/intro-video') {
    return fallback
  }

  return path
}

router.beforeEach((to) => {
  const authStore = useAuthStore()
  authStore.hydrate()

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const guestOnly = to.matched.some((record) => record.meta.guestOnly)
  const requiredPermission = to.matched
    .map((record) => record.meta.permission)
    .find((permission): permission is string => typeof permission === 'string')

  if (authStore.isLoggedIn) {
    if (to.path === '/intro-video') {
      return resolveAuthenticatedRedirectPath(to.query.redirect, '/workspace')
    }

    if (guestOnly) {
      return resolveAuthenticatedRedirectPath(to.query.redirect, '/workspace')
    }

    if (requiredPermission && !authStore.permissions.includes(requiredPermission)) {
      return '/home'
    }

    return true
  }

  resetIntroVideoOnHardReload()

  if (requiresAuth) {
    return {
      path: AUTH_ROUTE,
      query: {
        redirect: to.fullPath,
      },
    }
  }

  const hasPlayedIntroVideo = hasPlayedIntroVideoThisSession()
  const hideIntroVideo = to.matched.some((record) => record.meta.hideIntroVideo)

  if (!hasPlayedIntroVideo && !hideIntroVideo) {
    return '/intro-video'
  }

  if (!requiresAuth) {
    return true
  }

  return true
})

export default router
