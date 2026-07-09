import type { UserInfo } from '@/types/auth'
import { request } from '@/services/request'

export function getUserProfile() {
  return request.get<UserInfo>('/auth/profile')
}

export function updateUserSettings(data: Record<string, any>) {
  return request.put<void>('/user/settings', data)
}
