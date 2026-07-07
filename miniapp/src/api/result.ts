import type { PaginationResult } from '@/types/api'
import type { AiResultTask, ResultQueryParams } from '@/types/result'
import { request } from '@/services/request'

export function getResultList(params: ResultQueryParams) {
  return request.get<PaginationResult<AiResultTask>>('/results', params)
}

export function getResultDetail(id: string) {
  return request.get<AiResultTask>(`/results/${id}`)
}

export function retryResult(id: string) {
  return request.post<AiResultTask>(`/results/${id}/retry`)
}

export function cancelResult(id: string) {
  return request.post<AiResultTask>(`/results/${id}/cancel`)
}
