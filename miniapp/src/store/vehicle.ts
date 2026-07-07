import type { VehicleQueryParams, VehicleTask } from '@/types/vehicle'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useVehicleStore = defineStore(
  'vehicle',
  () => {
    const currentVehicle = ref<VehicleTask>()
    const list = ref<VehicleTask[]>([])
    const filter = ref<Pick<VehicleQueryParams, 'status' | 'keyword'>>({
      status: 'all',
      keyword: '',
    })

    const captureProgress = computed(() => {
      const vehicle = currentVehicle.value
      if (!vehicle || !vehicle.requiredPhotoCount) {
        return 0
      }
      return Math.min(100, Math.round((vehicle.photoCount / vehicle.requiredPhotoCount) * 100))
    })

    function setCurrentVehicle(vehicle?: VehicleTask) {
      currentVehicle.value = vehicle
    }

    function setList(items: VehicleTask[]) {
      list.value = items
    }

    function appendList(items: VehicleTask[]) {
      list.value = [...list.value, ...items]
    }

    function setFilter(value: Partial<VehicleQueryParams>) {
      filter.value = {
        ...filter.value,
        ...value,
      }
    }

    function resetVehicleState() {
      currentVehicle.value = undefined
      list.value = []
      filter.value = {
        status: 'all',
        keyword: '',
      }
    }

    return {
      appendList,
      captureProgress,
      currentVehicle,
      filter,
      list,
      resetVehicleState,
      setCurrentVehicle,
      setFilter,
      setList,
    }
  },
  {
    persist: true,
  },
)
