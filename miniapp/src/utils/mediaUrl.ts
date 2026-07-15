import { getEnvBaseUrl } from '@/utils'

const mediaPathPrefixes = ['/uploads/', '/results/', '/packages/', '/scene-refs/']

/**
 * Resolves API-hosted media against the active mini-program API origin.
 * This keeps legacy records containing localhost media URLs usable in the
 * develop, trial, and release environments.
 */
export function normalizeMediaUrl(url?: string | null) {
  const value = url?.trim()
  if (!value)
    return value || ''

  const baseUrl = getEnvBaseUrl().trim()
  if (!baseUrl)
    return value

  const apiOrigin = baseUrl.match(/^https?:\/\/[^/]+/i)?.[0]
  if (!apiOrigin)
    return value

  const mediaPath = value.match(/^(?:https?:\/\/[^/]+)?(\/[^?#]+(?:\?[^#]*)?(?:#.*)?)$/i)?.[1]
  if (!mediaPath)
    return value

  const pathname = mediaPath.split(/[?#]/, 1)[0]
  return mediaPathPrefixes.some(prefix => pathname.startsWith(prefix))
    ? `${apiOrigin}${mediaPath}`
    : value
}
