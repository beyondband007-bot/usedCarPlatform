<script setup lang="ts">
import { computed, provide } from 'vue'

import VisitorWorkbenchModal from '@/components/business/home/VisitorWorkbenchModal.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppSubNav from '@/components/layout/AppSubNav.vue'
import { useWorkbenchEntry } from '@/composables/useWorkbenchEntry'
import { WORKBENCH_ENTRY_KEY } from '@/composables/workbench-entry-key'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const workbenchEntry = useWorkbenchEntry()

provide(WORKBENCH_ENTRY_KEY, workbenchEntry)

const showSubNav = computed(() => authStore.isLoggedIn)

const {
  visitorModalVisible,
  closeVisitorModal,
  goToAuth,
} = workbenchEntry
</script>

<template>
  <div
    class="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]"
    :data-subnav="showSubNav ? 'true' : undefined"
  >
    <AppHeader />
    <AppSubNav v-if="showSubNav" />
    <RouterView />
    <VisitorWorkbenchModal
      v-model:show="visitorModalVisible"
      @login="goToAuth"
      @dismiss="closeVisitorModal"
    />
  </div>
</template>
