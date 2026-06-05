/**
 * Credits identity headers for usedCar proxy routes.
 *
 * Logged-in users sync from `/auth/me` via `useAuthStore`.
 * Unauthenticated dev calls may fall back to `VITE_CREDITS_DEFAULT_USER_ID`.
 */

export type CreditsAccountScope = 'personal' | 'tenant'

export interface CreditsIdentity {
  userId: number
  accountScope: CreditsAccountScope
  tenantId?: number | string | null
}

const STORAGE_KEY = 'ai-car-studio:credits-identity'

function readDefaultUserId() {
  const raw = import.meta.env.VITE_CREDITS_DEFAULT_USER_ID
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 4
}

const defaultIdentity: CreditsIdentity = {
  userId: readDefaultUserId(),
  accountScope: 'personal',
  tenantId: null,
}

function readStorage(): CreditsIdentity {
  if (typeof window === 'undefined') return { ...defaultIdentity }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultIdentity }
    const parsed = JSON.parse(raw) as Partial<CreditsIdentity>
    return {
      userId: Number(parsed.userId ?? defaultIdentity.userId),
      accountScope:
        parsed.accountScope === 'tenant' ? 'tenant' : defaultIdentity.accountScope,
      tenantId: parsed.tenantId ?? null,
    }
  } catch {
    return { ...defaultIdentity }
  }
}

let cached: CreditsIdentity = readStorage()

export function getCreditsIdentity(): CreditsIdentity {
  return cached
}

export function setCreditsIdentity(next: Partial<CreditsIdentity>) {
  cached = {
    ...cached,
    ...next,
    accountScope: next.accountScope ?? cached.accountScope,
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cached))
  }
}

export function resetCreditsIdentity() {
  cached = { ...defaultIdentity }
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY)
  }
}

export function toCreditsHeaders(identity: CreditsIdentity = cached): Record<string, string> {
  const headers: Record<string, string> = {
    'x-credits-user-id': String(identity.userId),
    'x-credits-account-scope': identity.accountScope,
  }
  if (identity.accountScope === 'tenant' && identity.tenantId) {
    headers['x-credits-tenant-id'] = String(identity.tenantId)
  }
  return headers
}
