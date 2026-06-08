import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios'

import { toCreditsHeaders } from '@/utils/credits-identity'

const TOKEN_KEY = 'ai-car-studio:auth-token'

type ErrorMessageRule = {
  matches: string[]
  text: string
}

const errorMessageRules: ErrorMessageRule[] = [
  {
    matches: ['login is required'],
    text: '请先登录后再操作',
  },
  {
    matches: ['subscription batch concurrent task limit reached'],
    text: '当前套餐批量任务并发已达上限，请等待任务完成后再提交',
  },
  {
    matches: ['subscription concurrent task limit reached'],
    text: '当前套餐并发任务已达上限，请等待任务完成后再提交',
  },
  {
    matches: ['no available kie api key'],
    text: '生成服务暂时繁忙，请稍后再试',
  },
  {
    matches: ['credits platform request timed out', 'credits platform request failed'],
    text: '积分服务暂时不可用，请稍后重试',
  },
  {
    matches: ['credits platform rejected the request'],
    text: '积分服务校验未通过，请检查账户状态后重试',
  },
  {
    matches: ['inputassetid is required'],
    text: '请先上传图片后再生成',
  },
  {
    matches: ['asset not found'],
    text: '所选素材不存在或已失效，请重新上传后重试',
  },
  {
    matches: [
      'requires a car_exterior asset',
      'requires a car_interior asset',
      'asset purpose must be car_exterior',
      'reference asset must be an image',
      'asset must be car_exterior',
      'asset must be car_interior',
    ],
    text: '当前功能与上传素材类型不匹配，请更换符合要求的图片后重试',
  },
  {
    matches: ['logoassetid must point to a logo asset', 'default logo is not configured'],
    text: 'Logo 素材无效或未配置，请检查后重试',
  },
  {
    matches: [
      'scene reference image is missing',
      'reference image is required',
      'no reference asset in this conversation',
    ],
    text: '参考图缺失，请重新选择参考图后重试',
  },
  {
    matches: ['file upload failed', 'upload response missing fileurl'],
    text: '素材上传到生成服务失败，请稍后重试',
  },
  {
    matches: ['kie video task rejected'],
    text: '短视频服务拒绝了本次请求，请检查素材或稍后重试',
  },
  {
    matches: ['kie video response missing taskid'],
    text: '短视频服务返回异常，未拿到任务编号，请稍后重试',
  },
  {
    matches: ['kie create video task failed', 'short-video task creation failed'],
    text: '短视频任务创建失败，请稍后重试',
  },
  {
    matches: ['kie text-to-image response missing taskid'],
    text: '创意生图服务返回异常，未拿到任务编号，请稍后重试',
  },
  {
    matches: ['kie create text-to-image task failed'],
    text: '创意生图任务创建失败，请稍后重试',
  },
  {
    matches: ['kie response missing taskid'],
    text: '图片生成服务返回异常，未拿到任务编号，请稍后重试',
  },
  {
    matches: ['kie create task failed'],
    text: '图片生成任务创建失败，请稍后重试',
  },
]

export function normalizeApiErrorMessage(message: string) {
  if (!message) return ''

  const normalized = message.toLowerCase()

  for (const rule of errorMessageRules) {
    if (rule.matches.some((item) => normalized.includes(item.toLowerCase()))) {
      return rule.text
    }
  }

  return message
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 20_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    const creditsHeaders = toCreditsHeaders()
    for (const [key, value] of Object.entries(creditsHeaders)) {
      config.headers[key] = value
    }

    return config
  },
  (error) => Promise.reject(error),
)

http.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error: AxiosError) => {
    const { response } = error
    let backendMessage = ''

    if (response) {
      const status = response.status
      const data = response.data as { message?: unknown } | undefined
      backendMessage = normalizeApiErrorMessage(
        typeof data?.message === 'string' ? data.message : '',
      )

      switch (status) {
        case 401:
          localStorage.removeItem(TOKEN_KEY)
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
          break
        case 403:
          console.error('没有权限访问该资源')
          break
        case 404:
          console.error('请求的资源不存在')
          break
        case 500:
          console.error('服务器内部错误')
          break
        default:
          console.error(backendMessage || '请求失败')
      }
    } else {
      backendMessage = '网络错误，请检查网络连接'
      console.error(backendMessage)
    }

    return Promise.reject(backendMessage ? new Error(backendMessage) : error)
  },
)

export const request = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return http.get(url, config)
  },

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return http.post(url, data, config)
  },

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return http.put(url, data, config)
  },

  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return http.delete(url, config)
  },

  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return http.patch(url, data, config)
  },
}

export default http
