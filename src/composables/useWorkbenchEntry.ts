import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { AUTH_ROUTE, WORKSPACE_ROUTE } from '@/constants/app-flow'
import { useAuthStore } from '@/stores/auth'

export function useWorkbenchEntry() {
  const router = useRouter()
  const authStore = useAuthStore()
  const visitorModalVisible = ref(false)

  function openWorkbench() {
    if (authStore.isLoggedIn) {
      router.push(WORKSPACE_ROUTE)
      return
    }

    visitorModalVisible.value = true
  }

  function openVisitorModal() {
    visitorModalVisible.value = true
  }

  function closeVisitorModal() {
    visitorModalVisible.value = false
  }

  function goToAuth() {
    visitorModalVisible.value = false
    router.push({
      path: AUTH_ROUTE,
      query: { redirect: WORKSPACE_ROUTE },
    })
  }

  return {
    visitorModalVisible,
    openWorkbench,
    openVisitorModal,
    closeVisitorModal,
    goToAuth,
  }
}
