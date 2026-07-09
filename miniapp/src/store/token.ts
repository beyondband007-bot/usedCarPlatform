import type { ILoginForm } from '@/api/login'
import type { IAuthLoginRes } from '@/api/types/login'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  login as _login,
  logout as _logout,
  refreshToken as _refreshToken,
} from '@/api/login'
import { isDoubleTokenRes, isSingleTokenRes } from '@/api/types/login'
import { canAccessVehicleLibrary } from '@/constants/vehicle-library'
import { toLoginPage } from '@/utils/toLoginPage'
import { useUploadStore } from './upload'
import { useUserStore } from './user'
import { useVehicleStore } from './vehicle'

export const isDoubleTokenMode = import.meta.env.VITE_AUTH_MODE === 'double'

let routeGuardBypass = false

const VEHICLE_LIBRARY_LOGIN_DENIED_MESSAGE = '当前账号套餐不支持素材采集，请联系管理员开通团队版或旗舰版'

const tokenInfoState = isDoubleTokenMode
  ? {
      accessToken: '',
      accessExpiresIn: 0,
      refreshToken: '',
      refreshExpiresIn: 0,
    }
  : {
      token: '',
      expiresIn: 0,
    }

export const useTokenStore = defineStore(
  'token',
  () => {
    const tokenInfo = ref<IAuthLoginRes>({ ...tokenInfoState })
    const tokenExpireAt = ref(0)
    const nowTime = ref(Date.now())

    const resolveExpireAt = () => {
      if (tokenExpireAt.value)
        return Number(tokenExpireAt.value)
      const legacyExpireAt = uni.getStorageSync('accessTokenExpireTime')
      return legacyExpireAt ? Number(legacyExpireAt) : 0
    }

    const touchNowTime = () => {
      nowTime.value = Date.now()
    }

    const updateNowTime = () => {
      touchNowTime()
      clearExpiredAuthState()
      return useTokenStore()
    }

    const setTokenInfo = (val: IAuthLoginRes) => {
      updateNowTime()
      tokenInfo.value = val

      const now = Date.now()
      if (isSingleTokenRes(val)) {
        tokenExpireAt.value = now + val.expiresIn * 1000
        uni.setStorageSync('accessTokenExpireTime', tokenExpireAt.value)
      }
      else if (isDoubleTokenRes(val)) {
        tokenExpireAt.value = now + val.accessExpiresIn * 1000
        uni.setStorageSync('accessTokenExpireTime', tokenExpireAt.value)
        uni.setStorageSync('refreshTokenExpireTime', now + val.refreshExpiresIn * 1000)
      }
      else {
        tokenExpireAt.value = 0
      }
    }

    const isTokenExpired = computed(() => {
      const expireTime = resolveExpireAt()
      return !expireTime || nowTime.value >= expireTime
    })

    const isRefreshTokenExpired = computed(() => {
      if (!isDoubleTokenMode)
        return true
      const refreshExpireTime = uni.getStorageSync('refreshTokenExpireTime')
      return !refreshExpireTime || nowTime.value >= refreshExpireTime
    })

    const clearLocalAuthState = () => {
      touchNowTime()
      tokenExpireAt.value = 0
      uni.removeStorageSync('accessTokenExpireTime')
      uni.removeStorageSync('refreshTokenExpireTime')
      tokenInfo.value = { ...tokenInfoState }
      uni.removeStorageSync('token')
      uni.removeStorageSync('vehicle')
      uni.removeStorageSync('upload')
      useUserStore().clearUserInfo()
      useVehicleStore().resetVehicleState()
      useUploadStore().resetUploadState()
    }

    async function postLogin(nextTokenInfo: IAuthLoginRes) {
      toLoginPage.cancel()
      const userStore = useUserStore()
      const loginUserInfo = (nextTokenInfo as IAuthLoginRes & { userInfo?: any }).userInfo
      if (loginUserInfo) {
        if (!canAccessVehicleLibrary(loginUserInfo.packageName)) {
          throw new Error(VEHICLE_LIBRARY_LOGIN_DENIED_MESSAGE)
        }
        setTokenInfo(nextTokenInfo)
        routeGuardBypass = true
        userStore.setUserInfo(loginUserInfo)
        return
      }

      setTokenInfo(nextTokenInfo)
      await userStore.fetchUserInfo()
      if (!canAccessVehicleLibrary(userStore.userInfo?.packageName)) {
        clearLocalAuthState()
        throw new Error(VEHICLE_LIBRARY_LOGIN_DENIED_MESSAGE)
      }
      routeGuardBypass = true
    }

    const login = async (loginForm: ILoginForm) => {
      try {
        const res = await _login(loginForm)
        await postLogin(res)
        uni.showToast({
          title: '登录成功',
          icon: 'success',
        })
        return res
      }
      catch (error) {
        uni.showToast({
          title: error instanceof Error ? error.message : '登录失败，请重试',
          icon: 'none',
        })
        throw error
      }
      finally {
        updateNowTime()
      }
    }

    const logout = async () => {
      try {
        await _logout()
      }
      catch (error) {
        console.error('logout failed:', error)
      }
      finally {
        clearLocalAuthState()
      }
    }

    const refreshToken = async () => {
      if (!isDoubleTokenMode)
        throw new Error('当前认证模式不支持刷新 token')

      updateNowTime()
      if (!isDoubleTokenRes(tokenInfo.value) || !tokenInfo.value.refreshToken)
        throw new Error('无效的 refreshToken')

      const res = await _refreshToken(tokenInfo.value.refreshToken)
      setTokenInfo(res)
      return res
    }

    const getValidToken = computed(() => {
      if (isTokenExpired.value)
        return ''
      if (isDoubleTokenMode)
        return isDoubleTokenRes(tokenInfo.value) ? tokenInfo.value.accessToken : ''
      return isSingleTokenRes(tokenInfo.value) ? tokenInfo.value.token : ''
    })

    const hasLoginInfo = computed(() => {
      if (isDoubleTokenMode)
        return isDoubleTokenRes(tokenInfo.value) && !!tokenInfo.value.accessToken
      return isSingleTokenRes(tokenInfo.value) && !!tokenInfo.value.token
    })

    const hasValidLogin = computed(() => hasLoginInfo.value && !isTokenExpired.value)

    function clearExpiredAuthState() {
      if (!hasLoginInfo.value || !isTokenExpired.value)
        return
      if (isDoubleTokenMode && !isRefreshTokenExpired.value)
        return
      clearLocalAuthState()
    }

    const tryGetValidToken = async (): Promise<string> => {
      updateNowTime()
      if (!getValidToken.value && isDoubleTokenMode && !isRefreshTokenExpired.value) {
        try {
          await refreshToken()
        }
        catch {
          return ''
        }
      }
      return getValidToken.value
    }

    const consumeRouteGuardBypass = () => {
      const bypass = routeGuardBypass
      routeGuardBypass = false
      return bypass
    }

    return {
      login,
      logout,
      hasLogin: hasValidLogin,
      consumeRouteGuardBypass,
      refreshToken,
      tryGetValidToken,
      validToken: getValidToken,
      tokenInfo,
      setTokenInfo,
      updateNowTime,
    }
  },
  {
    persist: true,
  },
)
