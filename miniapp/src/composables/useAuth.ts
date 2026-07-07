import { useTokenStore } from '@/store/token'

export function useAuth() {
  const tokenStore = useTokenStore()

  return {
    hasLogin: tokenStore.hasLogin,
    logout: tokenStore.logout,
    tokenStore,
  }
}
