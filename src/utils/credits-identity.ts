export type CreditsAccountScope = 'personal' | 'tenant'

export interface CreditsIdentity {
  userId: number
  accountScope: CreditsAccountScope
  tenantId?: number
}

export interface MockCreditsIdentityOption {
  key: string
  label: string
  identity: CreditsIdentity
}

export const CREDITS_IDENTITY_STORAGE_KEY = 'prototype-credits-identity'
const LEGACY_CREDITS_IDENTITY_STORAGE_KEY = 'ai-car-studio:credits-identity'

const DEFAULT_MOCK_USER_ID = 4
const DEFAULT_MOCK_TENANT_ID = 4

const parsePositiveInteger = (value: unknown): number | undefined => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined
  return parsed
}

const parseAccountScope = (value: unknown): CreditsAccountScope | undefined => {
  return value === 'tenant' || value === 'personal' ? value : undefined
}

const getMockUserId = () =>
  parsePositiveInteger(import.meta.env.VITE_CREDITS_MOCK_USER_ID) ?? DEFAULT_MOCK_USER_ID

const getMockTenantId = () =>
  parsePositiveInteger(import.meta.env.VITE_CREDITS_MOCK_TENANT_ID) ?? DEFAULT_MOCK_TENANT_ID

export const normalizeCreditsIdentity = (identity: unknown): CreditsIdentity | null => {
  if (!identity || typeof identity !== 'object') return null

  const candidate = identity as Partial<CreditsIdentity> & { tenantId?: number | string | null }
  const userId = parsePositiveInteger(candidate.userId)
  const accountScope = parseAccountScope(candidate.accountScope)
  const tenantId = parsePositiveInteger(candidate.tenantId)

  if (!userId || !accountScope) return null
  if (accountScope === 'tenant' && !tenantId) return null

  return accountScope === 'tenant'
    ? { userId, accountScope, tenantId }
    : { userId, accountScope }
}

export const getMockCreditsIdentityOptions = (): MockCreditsIdentityOption[] => {
  const userId = getMockUserId()
  const tenantId = getMockTenantId()

  return [
    {
      key: 'personal',
      label: `演示个人账户 · userId ${userId}`,
      identity: { userId, accountScope: 'personal' },
    },
    {
      key: 'tenant',
      label: `演示企业账户 · userId ${userId} · tenantId ${tenantId}`,
      identity: { userId, accountScope: 'tenant', tenantId },
    },
  ]
}

export const getDefaultMockCreditsIdentity = (): CreditsIdentity => {
  const options = getMockCreditsIdentityOptions()
  const configuredScope =
    parseAccountScope(import.meta.env.VITE_CREDITS_MOCK_ACCOUNT_SCOPE) ?? 'personal'

  return options.find((option) => option.identity.accountScope === configuredScope)?.identity ?? options[0].identity
}

const readIdentityFromStorageKey = (key: string): CreditsIdentity | null => {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(key)
  if (!raw) return null

  try {
    return normalizeCreditsIdentity(JSON.parse(raw))
  } catch {
    return null
  }
}

export const readCreditsIdentity = (): CreditsIdentity | null => {
  return (
    readIdentityFromStorageKey(CREDITS_IDENTITY_STORAGE_KEY) ??
    readIdentityFromStorageKey(LEGACY_CREDITS_IDENTITY_STORAGE_KEY)
  )
}

export const writeCreditsIdentity = (identity: CreditsIdentity) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CREDITS_IDENTITY_STORAGE_KEY, JSON.stringify(identity))
}

export const clearCreditsIdentity = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(CREDITS_IDENTITY_STORAGE_KEY)
  window.localStorage.removeItem(LEGACY_CREDITS_IDENTITY_STORAGE_KEY)
}

export const getCreditsIdentity = (): CreditsIdentity => {
  return readCreditsIdentity() ?? getDefaultMockCreditsIdentity()
}

export const setCreditsIdentity = (
  next: Partial<CreditsIdentity> & { tenantId?: number | string | null },
) => {
  const merged = normalizeCreditsIdentity({
    ...getCreditsIdentity(),
    ...next,
  })

  if (merged) writeCreditsIdentity(merged)
}

export const resetCreditsIdentity = () => {
  writeCreditsIdentity(getDefaultMockCreditsIdentity())
}

export const toCreditsHeaders = (identity: CreditsIdentity = getCreditsIdentity()): Record<string, string> => {
  const headers: Record<string, string> = {
    'x-credits-user-id': String(identity.userId),
    'x-credits-account-scope': identity.accountScope,
  }

  if (identity.accountScope === 'tenant' && identity.tenantId) {
    headers['x-credits-tenant-id'] = String(identity.tenantId)
  }

  return headers
}
