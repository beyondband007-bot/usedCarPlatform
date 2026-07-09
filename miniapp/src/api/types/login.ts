export type AuthMode = 'single' | 'double'

export interface IUserInfoRes {
  userId: number
  username: string
  nickname: string
  avatar?: string
  role?: UserRole
  roles?: UserRole[]
  [key: string]: any
}

export interface ISingleTokenRes {
  token: string
  expiresIn: number
  userInfo?: IUserInfoRes
}

export interface IDoubleTokenRes {
  accessToken: string
  refreshToken: string
  accessExpiresIn: number
  refreshExpiresIn: number
  userInfo?: IUserInfoRes
}

export type IAuthLoginRes = ISingleTokenRes | IDoubleTokenRes

export type UserRole = string

export interface AuthStorage {
  mode: AuthMode
  tokens: ISingleTokenRes | IDoubleTokenRes
  userInfo?: IUserInfoRes
  loginTime: number
}

export interface ICaptcha {
  captchaEnabled: boolean
  uuid: string
  image: string
}

export interface IUploadSuccessInfo {
  fileId: number
  originalName: string
  fileName: string
  storagePath: string
  fileHash: string
  fileType: string
  fileBusinessType: string
  fileSize: number
}

export interface IUpdateInfo {
  id: number
  name: string
  sex: string
}

export interface IUpdatePassword {
  id: number
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

export function isSingleTokenRes(tokenRes: IAuthLoginRes): tokenRes is ISingleTokenRes {
  return 'token' in tokenRes && !('refreshToken' in tokenRes)
}

export function isDoubleTokenRes(tokenRes: IAuthLoginRes): tokenRes is IDoubleTokenRes {
  return 'accessToken' in tokenRes && 'refreshToken' in tokenRes
}
