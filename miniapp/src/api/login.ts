import type { ICaptcha, IDoubleTokenRes, IUpdateInfo, IUpdatePassword, IUserInfoRes } from './types/login'
import { http } from '@/http/http'

const ACCESS_TOKEN_EXPIRES_IN = 12 * 60 * 60

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
