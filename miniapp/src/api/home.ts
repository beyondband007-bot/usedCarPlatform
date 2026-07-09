import type { HomeSummary } from '@/types/home'
import type { AiResultTask } from '@/types/result'
import type { VehicleTask } from '@/types/vehicle'
import { request } from '@/services/request'

export function getHomeSummary() {
  return request.get<HomeSummary>('/home/summary')
}

export function getRecentVehicles() {
  return request.get<VehicleTask[]>('/home/recent-vehicles')
}

export function getRecentResults() {
  return request.get<AiResultTask[]>('/home/recent-results')
}
