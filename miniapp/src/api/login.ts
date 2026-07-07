import type { IAuthLoginRes, ICaptcha, IDoubleTokenRes, IUpdateInfo, IUpdatePassword, IUserInfoRes } from './types/login'
import { http } from '@/http/http'

const ACCESS_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60

interface WebAuthUserInfo {
  id: string
  username: string
  phone?: string | null
  displayName?: string
  role?: string
  permissions?: string[]
  enterpriseTenantId?: string | null
  enterpriseTenantName?: string | null
  [key: string]: any
}

interface WebAuthLoginRes {
  token: string
  userInfo?: WebAuthUserInfo
  subscription?: {
    currentPlan?: string
    expireTime?: string
    giftPoints?: number
    [key: string]: any
  }
}

interface WebAuthProfileRes {
  userInfo: WebAuthUserInfo
  subscription?: WebAuthLoginRes['subscription']
}

function mapUserInfo(userInfo?: WebAuthUserInfo, subscription?: WebAuthLoginRes['subscription']): IUserInfoRes | undefined {
  if (!userInfo) {
    return undefined
  }

  return {
    ...userInfo,
    userId: userInfo.id as unknown as number,
    username: userInfo.username,
    nickname: userInfo.displayName || userInfo.username,
    avatar: userInfo.avatar || '/static/images/default-avatar.png',
    role: userInfo.role,
    roles: userInfo.role ? [userInfo.role] : undefined,
    tenantId: userInfo.enterpriseTenantId,
    tenantName: userInfo.enterpriseTenantName,
    packageName: subscription?.currentPlan,
    packageExpireAt: subscription?.expireTime,
    points: subscription?.giftPoints ?? 0,
  }
}

function mapLoginResult(res: WebAuthLoginRes): IAuthLoginRes {
  return {
    token: res.token,
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    userInfo: mapUserInfo(res.userInfo, res.subscription),
  }
}

/**
 * 登录表单
 */
export interface ILoginForm {
  username: string
  password: string
}

/**
 * 获取验证码
 * @returns ICaptcha 验证码
 */
export function getCode() {
  return http.get<ICaptcha>('/user/getCode')
}

/**
 * 用户登录
 * @param loginForm 登录表单
 */
export function login(loginForm: ILoginForm) {
  return http.post<WebAuthLoginRes>('/api/v1/auth/login', loginForm).then(mapLoginResult)
}

/**
 * 刷新token
 * @param refreshToken 刷新token
 */
export function refreshToken(refreshToken: string) {
  return http.post<IDoubleTokenRes>('/api/miniapp/auth/refresh-token', { refreshToken })
}

/**
 * 获取用户信息
 */
export function getUserInfo() {
  return http.get<WebAuthProfileRes>('/api/v1/auth/me').then((res) => {
    const userInfo = mapUserInfo(res.userInfo, res.subscription)
    if (!userInfo) {
      throw new Error('用户信息为空')
    }
    return userInfo
  })
}

/**
 * 退出登录
 */
export function logout() {
  return http.post<void>('/api/v1/auth/logout')
}

/**
 * 修改用户信息
 */
export function updateInfo(data: IUpdateInfo) {
  return http.post('/user/updateInfo', data)
}

/**
 * 修改用户密码
 */
export function updateUserPassword(data: IUpdatePassword) {
  return http.post('/user/updatePassword', data)
}

/**
 * 获取微信登录凭证
 * @returns Promise 包含微信登录凭证(code)
 */
export function getWxCode() {
  return new Promise<UniApp.LoginRes>((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: res => resolve(res),
      fail: err => reject(new Error(err)),
    })
  })
}

/**
 * 微信登录
 * @param params 微信登录参数，包含code
 * @returns Promise 包含登录结果
 */
export function wxLogin(data: { code: string }) {
  return http.post<IAuthLoginRes>('/api/miniapp/auth/wechat-login', data)
}
