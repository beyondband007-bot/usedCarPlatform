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

export interface SendCodeRequest {
  phone: string
}

export interface SendCodeResponse {
  success: boolean
  message: string
  debugCode?: string
}

export interface ResetPasswordRequest {
  phone: string
  code: string
  password: string
  confirmPassword: string
}

export interface LoginWithCodeRequest {
  phone: string
  code: string
  remember?: boolean
}

export interface RegisterRequest {
  username: string
  password: string
  displayName?: string
  planCode?: 'basic' | 'team' | 'flagship'
}

export interface RegisterResponse {
  userInfo: UserInfo
  subscription: SubscriptionStateSnapshot
}

export async function sendLoginCode(payload: SendCodeRequest) {
  const response = await request.post<ApiResponse<SendCodeResponse>>('/auth/login-code', payload)
  return response.data
}

export async function sendResetPasswordCode(payload: SendCodeRequest) {
  const response = await request.post<ApiResponse<SendCodeResponse>>('/auth/reset-password-code', payload)
  return response.data
}

export async function resetPassword(payload: ResetPasswordRequest) {
  const response = await request.post<ApiResponse<{ success: boolean }>>('/auth/reset-password', payload)
  return response.data
}

export async function register(payload: RegisterRequest) {
  const response = await request.post<ApiResponse<RegisterResponse>>('/auth/register', payload)
  return response.data
}

export async function login(payload: LoginRequest) {
  const response = await request.post<ApiResponse<LoginResponse>>('/auth/login', payload)
  return response.data
}

export async function loginWithCode(payload: LoginWithCodeRequest) {
  const response = await request.post<ApiResponse<LoginResponse>>('/auth/login-with-code', payload)
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
