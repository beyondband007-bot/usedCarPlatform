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
    class="app-layout bg-[var(--app-bg)] text-[var(--app-text)]"
    :class="{ 'app-layout--auth': showSubNav }"
    :data-subnav="showSubNav ? 'true' : undefined"
  >
    <AppHeader />
    <AppSubNav v-if="showSubNav" />
    <div class="app-layout-main">
      <RouterView />
    </div>
    <VisitorWorkbenchModal
      v-model:show="visitorModalVisible"
      @login="goToAuth"
      @dismiss="closeVisitorModal"
    />
  </div>
</template>

<style scoped lang="scss">
.app-layout {
  min-height: 100dvh;
}

.app-layout--auth {
  display: flex;
  height: 100dvh;
  max-height: 100dvh;
  min-height: 100dvh;
  flex-direction: column;
  overflow: hidden;
}

.app-layout-main {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.app-layout:not(.app-layout--auth) .app-layout-main {
  flex: none;
  overflow: visible;
}
</style>
