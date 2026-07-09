import { http } from '@/http/http'

export const API_PREFIX = '/api/miniapp'

function withMiniappPrefix(url: string) {
  if (url.startsWith('http') || url.startsWith(API_PREFIX)) {
    return url
  }
  return `${API_PREFIX}${url.startsWith('/') ? url : `/${url}`}`
}

export const request = {
  get<T>(url: string, query?: Record<string, any>) {
    return http.get<T>(withMiniappPrefix(url), query)
  },
  post<T>(url: string, data?: Record<string, any>, query?: Record<string, any>) {
    return http.post<T>(withMiniappPrefix(url), data, query)
  },
  put<T>(url: string, data?: Record<string, any>, query?: Record<string, any>) {
    return http.put<T>(withMiniappPrefix(url), data, query)
  },
  delete<T>(url: string, query?: Record<string, any>) {
    return http.delete<T>(withMiniappPrefix(url), query)
  },
}
