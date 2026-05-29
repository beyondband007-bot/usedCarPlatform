import { createRouter, createWebHistory } from 'vue-router'

import { AUTH_ROUTE } from '@/constants/app-flow'
import { useAuthStore } from '@/stores/auth'

import { routes } from './routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

const INTRO_VIDEO_STORAGE_KEY = 'used-car-platform:intro-video-played'

function resolveRedirectPath(redirect: unknown, fallback: string) {
  return typeof redirect === 'string' && redirect.startsWith('/') ? redirect : fallback
}

router.beforeEach((to) => {
  const hasPlayedIntroVideo = window.localStorage.getItem(INTRO_VIDEO_STORAGE_KEY) === 'true'
  const hideIntroVideo = to.matched.some((record) => record.meta.hideIntroVideo)

  if (!hasPlayedIntroVideo && !hideIntroVideo) {
    return '/intro-video'
  }

  const authStore = useAuthStore()
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
  const guestOnly = to.matched.some((record) => record.meta.guestOnly)

  if (guestOnly && authStore.isLoggedIn) {
    return resolveRedirectPath(to.query.redirect, '/workspace')
  }

  if (!requiresAuth) {
    return true
  }

  if (authStore.isLoggedIn) {
    return true
  }

  return {
    path: AUTH_ROUTE,
    query: {
      redirect: to.fullPath,
    },
  }
})

export default router
