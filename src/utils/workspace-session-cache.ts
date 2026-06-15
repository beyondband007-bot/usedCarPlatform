const LOCAL_STORAGE_KEYS = [
  'workspace-custom-logo',
  'workspace-logo-enabled',
  'subscribedTasks',
]

const LOCAL_STORAGE_PREFIXES = [
  'workspace-active-generation-task:',
  'workspace-active-creative-conversation:',
  'workspace-tracked-running-tasks:',
  'workspace-batch-active-jobs:',
  'workspace:short-video:',
  'workspace:video-generation:',
]

const SESSION_STORAGE_KEYS = [
  'workspace:batch-delivery-snapshots',
]

const ACCOUNT_STORAGE_KEYS = [
  'ai-car-studio:auth-token',
  'ai-car-studio:user-info',
  'ai-car-studio:subscription-state',
  'ai-car-studio:points-summary',
  'ai-car-studio:credits-identity',
]

function removeStorageKeys(
  storage: Storage,
  exactKeys: string[],
  prefixes: string[] = [],
) {
  const keysToRemove: string[] = []

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (
      key &&
      (exactKeys.includes(key) || prefixes.some((prefix) => key.startsWith(prefix)))
    ) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key))
}

export function clearWorkspaceSessionCache() {
  if (typeof window === 'undefined') return

  try {
    removeStorageKeys(
      window.localStorage,
      LOCAL_STORAGE_KEYS,
      LOCAL_STORAGE_PREFIXES,
    )
  } catch {
    // Storage cleanup must not block logout or application startup.
  }

  try {
    removeStorageKeys(window.sessionStorage, SESSION_STORAGE_KEYS)
  } catch {
    // Storage cleanup must not block logout or application startup.
  }
}

export function clearAccountPersistentCache() {
  if (typeof window === 'undefined') return

  try {
    removeStorageKeys(window.localStorage, ACCOUNT_STORAGE_KEYS)
  } catch {
    // Storage cleanup must not block logout or authentication redirects.
  }

  clearWorkspaceSessionCache()
}
