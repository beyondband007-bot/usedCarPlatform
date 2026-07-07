import type { SubscriptionPlanCode } from '@/types/subscription'

export const VEHICLE_LIBRARY_ACCESS_PLANS: SubscriptionPlanCode[] = ['team', 'flagship']

export function canAccessVehicleLibrary(planCode?: string | null) {
  return VEHICLE_LIBRARY_ACCESS_PLANS.includes(planCode as SubscriptionPlanCode)
}
