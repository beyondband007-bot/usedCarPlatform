export function getStorage<T>(key: string, fallback: T): T {
  const value = uni.getStorageSync(key)
  return value === '' || value == null ? fallback : value
}

export function setStorage<T>(key: string, value: T) {
  uni.setStorageSync(key, value)
}

export function removeStorage(key: string) {
  uni.removeStorageSync(key)
}
