import { request } from './http'
import type { LoginRequest, LoginResponse, UserInfo } from '@/types/auth'
import type { SubscriptionStateSnapshot } from '@/types/subscription'

interface ApiResponse<T> {
  code: number
  message: string
  data: T
  requestId: string
}

export interface CurrentUserResponse {
  userInfo: UserInfo
  subscription: SubscriptionStateSnapshot
}

export async function login(payload: LoginRequest) {
  const response = await request.post<ApiResponse<LoginResponse>>('/auth/login', payload)
  return response.data
}

export async function getCurrentUser() {
  const response = await request.get<ApiResponse<CurrentUserResponse>>('/auth/me')
  return response.data
}

export async function logout() {
  const response = await request.post<ApiResponse<{ success: boolean }>>('/auth/logout')
  return response.data
}
