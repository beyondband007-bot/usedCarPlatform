import { useVehicleStore } from '@/store/vehicle'

export function useVehicle() {
  const vehicleStore = useVehicleStore()

  return {
    vehicleStore,
  }
}
