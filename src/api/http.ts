import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios'

import { toCreditsHeaders } from '@/utils/credits-identity'

export function normalizeApiErrorMessage(message: string) {
  if (!message) return ''

  const normalized = message.toLowerCase()

  if (normalized.includes('no available kie api key')) {
    return '短视频服务暂时繁忙，请稍后再试'
  }

  if (normalized.includes('kie video response missing taskid')) {
    return '短视频任务创建失败，请稍后重试'
  }

  if (normalized.includes('kie create video task failed')) {
    return '短视频服务创建任务失败，请稍后重试'
  }

  if (normalized.includes('short-video task creation failed')) {
    return '短视频任务创建失败，请稍后重试'
  }

  return message
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3101/api/v1',
  timeout: 20_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
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
          localStorage.removeItem('token')
          window.location.href = '/login'
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
