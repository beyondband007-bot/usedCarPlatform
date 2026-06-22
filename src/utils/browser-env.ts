import { ref } from 'vue'

const WECHAT_UA = /MicroMessenger/i
const IOS_UA = /iPhone|iPad|iPod/i
const H5_MEDIA_QUERY = '(max-width: 767px)'

export const isH5ViewportRef = ref(
  typeof window !== 'undefined' ? window.matchMedia(H5_MEDIA_QUERY).matches : false,
)

export function isWeChatBrowser(userAgent = navigator.userAgent) {
  return WECHAT_UA.test(userAgent)
}

export function isIOSDevice(userAgent = navigator.userAgent) {
  return IOS_UA.test(userAgent)
}

export function isH5Viewport() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia(H5_MEDIA_QUERY).matches
}

function updateViewportHeightUnit() {
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--app-vh', `${vh}px`)
}

function updateMobileClass() {
  const isMobile = isH5Viewport()
  isH5ViewportRef.value = isMobile
  document.documentElement.classList.toggle('is-mobile', isMobile)
}

function resumeWeChatAutoplayVideos() {
  document.querySelectorAll<HTMLVideoElement>('video[autoplay]').forEach((video) => {
    void video.play().catch(() => undefined)
  })
}

function syncTabHiddenClass() {
  document.documentElement.classList.toggle('is-tab-hidden', document.hidden)
}

function bindWeChatVideoAutoplay() {
  if (!isWeChatBrowser()) {
    return
  }

  const bridge = (window as Window & { WeixinJSBridge?: { invoke: (...args: unknown[]) => void } })
    .WeixinJSBridge

  if (bridge) {
    resumeWeChatAutoplayVideos()
    return
  }

  document.addEventListener('WeixinJSBridgeReady', resumeWeChatAutoplayVideos, {
    once: true,
  })
}

export function initBrowserEnv() {
  const root = document.documentElement
  const wechat = isWeChatBrowser()
  const ios = isIOSDevice()

  root.classList.toggle('is-wechat', wechat)
  root.classList.toggle('is-ios', ios)
  root.classList.toggle('is-wechat-ios', wechat && ios)

  updateViewportHeightUnit()
  updateMobileClass()

  window.addEventListener('resize', updateViewportHeightUnit, { passive: true })
  window.addEventListener('orientationchange', () => {
    window.setTimeout(updateViewportHeightUnit, 100)
  })
  window.matchMedia(H5_MEDIA_QUERY).addEventListener('change', updateMobileClass)

  syncTabHiddenClass()
  document.addEventListener('visibilitychange', syncTabHiddenClass, { passive: true })

  bindWeChatVideoAutoplay()
}
