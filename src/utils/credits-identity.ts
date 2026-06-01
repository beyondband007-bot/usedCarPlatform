/**
 * Mock credits identity provider.
 *
 * 文档 8 节示例：x-credits-user-id: 4 / x-credits-account-scope: personal
 * 真实生产应由 usedCar session 解析得到，这里先 mock 给前端调试。
 */

export type CreditsAccountScope = 'personal' | 'tenant'

export interface CreditsIdentity {
  userId: number
  accountScope: CreditsAccountScope
  tenantId?: number | null
}

const STORAGE_KEY = 'ai-car-studio:credits-identity'

const defaultIdentity: CreditsIdentity = {
  userId: 4,
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
