const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'
const apiOrigin = new URL(apiBaseUrl, window.location.origin).origin
const mediaPathPrefixes = ['/uploads/', '/results/', '/packages/', '/scene-refs/']

/**
 * Resolves media returned by the API against the active API origin.
 *
 * Older records can contain a development absolute URL (for example
 * http://localhost:3101/uploads/...). Media routes are served by this API,
 * so their host must follow the deployed API rather than the browser's
 * localhost.
 */
export function normalizeMediaUrl(url?: string | null) {
  const trimmed = url?.trim()
  if (!trimmed) return url ?? trimmed

  try {
    const parsed = new URL(trimmed, apiOrigin)
    if (
      mediaPathPrefixes.some((prefix) => parsed.pathname.startsWith(prefix)) &&
      parsed.origin !== apiOrigin
    ) {
      return `${apiOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`
    }
    return parsed.toString()
  } catch {
    return trimmed
  }
}
