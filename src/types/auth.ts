export type UserRole = 'developer' | 'admin' | 'agent' | 'user'

export interface UserInfo {
  id: string
  username: string
  displayName: string
  role: UserRole
  permissions: string[]
}

export interface LoginRequest {
  username: string
  password: string
  remember?: boolean
}

export interface LoginResponse {
  token: string
}
