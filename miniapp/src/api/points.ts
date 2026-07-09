import type { PaginationParams, PaginationResult } from '@/types/api'
import type { PointsRecord, PointsSummary } from '@/types/points'
import { request } from '@/services/request'

export function getPointsSummary() {
  return request.get<PointsSummary>('/points/summary')
}

export function getPointsRecords(params: PaginationParams) {
  return request.get<PaginationResult<PointsRecord>>('/points/records', params)
}
