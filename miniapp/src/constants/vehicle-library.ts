export const VEHICLE_LIBRARY_ACCESS_PLANS = ['team', 'flagship'] as const

export type VehicleLibraryAccessPlan = (typeof VEHICLE_LIBRARY_ACCESS_PLANS)[number]

export function canAccessVehicleLibrary(planCode?: string | null) {
  if (!planCode)
    return false
  return VEHICLE_LIBRARY_ACCESS_PLANS.includes(planCode as VehicleLibraryAccessPlan)
}
