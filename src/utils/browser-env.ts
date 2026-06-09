const WECHAT_UA = /MicroMessenger/i
const IOS_UA = /iPhone|iPad|iPod/i

export function isWeChatBrowser(userAgent = navigator.userAgent) {
  return WECHAT_UA.test(userAgent)
}

export function isIOSDevice(userAgent = navigator.userAgent) {
  return IOS_UA.test(userAgent)
}

function updateViewportHeightUnit() {
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--app-vh', `${vh}px`)
}

function updateMobileClass() {
  const isMobileViewport = window.matchMedia('(max-width: 767px)').matches
  document.documentElement.classList.toggle('is-mobile', isMobileViewport)
}

function resumeWeChatAutoplayVideos() {
  document.querySelectorAll<HTMLVideoElement>('video[autoplay]').forEach((video) => {
    void video.play().catch(() => undefined)
  })
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
  window
    .matchMedia('(max-width: 767px)')
    .addEventListener('change', updateMobileClass)

  bindWeChatVideoAutoplay()
}
