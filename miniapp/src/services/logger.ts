export function logInfo(message: string, payload?: unknown) {
  if (import.meta.env.PROD) {
    return
  }
  console.log(`[car_wx] ${message}`, payload ?? '')
}

export function logError(message: string, error?: unknown) {
  if (import.meta.env.PROD) {
    return
  }
  console.error(`[car_wx] ${message}`, error ?? '')
}
