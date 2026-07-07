import type { LoginResult, PasswordLoginParams, UserInfo, WechatLoginParams } from '@/types/auth'
import { request } from '@/services/request'

export function wechatLogin(data: WechatLoginParams) {
  return request.post<LoginResult>('/auth/wechat-login', data)
}

export function passwordLogin(data: PasswordLoginParams) {
  return request.post<LoginResult>('/auth/password-login', data)
}

export function refreshMiniappToken(refreshToken: string) {
  return request.post<LoginResult>('/auth/refresh-token', { refreshToken })
}

export function getProfile() {
  return request.get<UserInfo>('/auth/profile')
}

export function logoutMiniapp() {
  return request.post<void>('/auth/logout')
}
