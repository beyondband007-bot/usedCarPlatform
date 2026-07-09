export const LANGUAGE_CONVERSION_POINTS_PER_MINUTE = 100

/** 不足 1 分钟按 1 分钟计费，类似停车场收费。 */
export function calculateLanguageConversionBillableMinutes(durationSeconds: number) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return 0
  return Math.max(1, Math.ceil(durationSeconds / 60))
}

export function calculateLanguageConversionPoints(durationSeconds: number) {
  const billableMinutes = calculateLanguageConversionBillableMinutes(durationSeconds)
  if (!billableMinutes) return 0
  return billableMinutes * LANGUAGE_CONVERSION_POINTS_PER_MINUTE
}

export function parseLanguageConversionBillingPoints(value: unknown) {
  if (value == null || value === '') return null
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value))
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.round(parsed)
}

export function resolveLanguageConversionPoints(input: {
  durationSeconds?: number
  estimatedCost?: number | null
  estimatedPoints?: string | null
}) {
  const billedPoints =
    parseLanguageConversionBillingPoints(input.estimatedCost)
    ?? parseLanguageConversionBillingPoints(input.estimatedPoints)
  if (billedPoints) return billedPoints
  if (input.durationSeconds) {
    return calculateLanguageConversionPoints(input.durationSeconds)
  }
  return 0
}

export function probeVideoDurationSeconds(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'

    const cleanup = () => {
      video.removeAttribute('src')
      video.load()
    }

    video.addEventListener(
      'loadedmetadata',
      () => {
        const duration = video.duration
        cleanup()
        if (Number.isFinite(duration) && duration > 0) {
          resolve(duration)
          return
        }
        reject(new Error('invalid video duration'))
      },
      { once: true },
    )
    video.addEventListener(
      'error',
      () => {
        cleanup()
        reject(new Error('failed to load video metadata'))
      },
      { once: true },
    )
    video.src = url
  })
}

export function formatLanguageConversionDurationLabel(durationSeconds: number) {
  const total = Math.max(0, Math.ceil(durationSeconds))
  const minutes = Math.floor(total / 60)
  const remain = total % 60
  if (minutes > 0 && remain > 0) return `${minutes} 分 ${remain} 秒`
  if (minutes > 0) return `${minutes} 分钟`
  return `${remain} 秒`
}
