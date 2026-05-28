<script setup lang="ts">
import { computed } from 'vue'

import AppHeader from '@/components/layout/AppHeader.vue'
import AppSubNav from '@/components/layout/AppSubNav.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const showSubNav = computed(() => authStore.isLoggedIn)
</script>

<template>
  <div
    class="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]"
    :data-subnav="showSubNav ? 'true' : undefined"
  >
    <AppHeader />
    <AppSubNav v-if="showSubNav" />
    <RouterView />
  </div>
</template>
