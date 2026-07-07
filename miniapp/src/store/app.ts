import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useAppStore = defineStore(
  'app',
  () => {
    const networkType = ref<string>('unknown')
    const isOnline = ref(true)
    const globalLoading = ref(false)
    const version = ref(import.meta.env.VITE_APP_VERSION || '1.0.0')

    const networkLabel = computed(() => (isOnline.value ? networkType.value : 'offline'))

    function setGlobalLoading(value: boolean) {
      globalLoading.value = value
    }

    function setNetworkStatus(type: string, online = true) {
      networkType.value = type
      isOnline.value = online
    }

    return {
      globalLoading,
      isOnline,
      networkLabel,
      networkType,
      setGlobalLoading,
      setNetworkStatus,
      version,
    }
  },
  {
    persist: true,
  },
)
