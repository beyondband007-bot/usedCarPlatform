import { createRouter, createWebHistory } from 'vue-router'

import { AUTH_ROUTE } from '@/constants/app-flow'
import {
  hasPlayedIntroVideoThisSession,
  resetIntroVideoOnHardReload,
} from '@/constants/intro-video'
import { useAuthStore } from '@/stores/auth'

import { routes } from './routes'

const BACK_OFFICE_LOGIN_ROUTE = '/back-office/login'
const IS_CONSOLE_STANDALONE = import.meta.env.VITE_CONSOLE_STANDALONE === 'true'

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

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  await authStore.hydrate()

  const isConsoleRoute = to.matched.some((record) => record.meta.backOffice)

  if (IS_CONSOLE_STANDALONE && !isConsoleRoute) {
    return '/back-office'
  }

  if (to.path === '/' || to.matched.length === 0) {
    return '/home'
  }

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const guestOnly = to.matched.some((record) => record.meta.guestOnly)
  const isBackOfficeRoute = isConsoleRoute
  const requiredPermission = to.matched
    .map((record) => record.meta.permission)
    .find((permission): permission is string => typeof permission === 'string')

  if (authStore.isLoggedIn) {
    if (to.path === '/intro-video') {
      return resolveAuthenticatedRedirectPath(to.query.redirect, '/workspace')
    }

    if (guestOnly) {
      if (isBackOfficeRoute) {
        return authStore.permissions.includes('menu:admin') ? '/back-office' : true
      }
      return resolveAuthenticatedRedirectPath(to.query.redirect, '/workspace')
    }

    if (requiredPermission && !authStore.permissions.includes(requiredPermission)) {
      if (isBackOfficeRoute) {
        return {
          path: BACK_OFFICE_LOGIN_ROUTE,
          query: {
            redirect: to.fullPath,
          },
        }
      }
      return '/home'
    }

    return true
  }

  resetIntroVideoOnHardReload()

  if (requiresAuth) {
    if (isBackOfficeRoute) {
      return {
        path: BACK_OFFICE_LOGIN_ROUTE,
        query: {
          redirect: to.fullPath,
        },
      }
    }

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
