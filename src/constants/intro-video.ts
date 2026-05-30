export const INTRO_VIDEO_SESSION_KEY = 'used-car-platform:intro-video-played'

let reloadHandled = false

export function resetIntroVideoOnHardReload() {
  if (reloadHandled) {
    return
  }

  reloadHandled = true

  const navigation = performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined

  if (navigation?.type === 'reload') {
    window.sessionStorage.removeItem(INTRO_VIDEO_SESSION_KEY)
  }
}

export function hasPlayedIntroVideoThisSession() {
  return window.sessionStorage.getItem(INTRO_VIDEO_SESSION_KEY) === 'true'
}

export function markIntroVideoPlayed() {
  window.sessionStorage.setItem(INTRO_VIDEO_SESSION_KEY, 'true')
}
