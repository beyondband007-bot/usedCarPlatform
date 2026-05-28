<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

import { WORKSPACE_DEFAULT_CAPABILITY } from '@/constants/app-flow'
import { secondaryNavigation } from '@/constants/prototype'
import type { NavItem } from '@/types/prototype'

const route = useRoute()
const router = useRouter()

function isNavItemActive(item: NavItem) {
  if (item.path === '/workspace') {
    return route.path === '/workspace' || route.path.startsWith('/workspace/')
  }

  return route.path === item.path || route.path.startsWith(`${item.path}/`)
}

function navigate(item: NavItem) {
  if (item.path === '/workspace') {
    router.push({ name: 'Workspace', params: { code: WORKSPACE_DEFAULT_CAPABILITY } })
    return
  }

  router.push(item.path)
}
</script>

<template>
  <nav
    class="sticky top-[72px] z-40 flex min-h-[44px] w-full items-center gap-4 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 shadow-sm xl:px-6"
    aria-label="企业业务导航"
  >
    <div
      class="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      <button
        v-for="item in secondaryNavigation"
        :key="item.path"
        type="button"
        class="inline-flex shrink-0 items-center rounded-lg px-4 py-2 text-sm font-semibold transition duration-200"
        :class="
          isNavItemActive(item)
            ? 'bg-[var(--app-header-nav-active-bg)] text-[var(--app-header-nav-active)]'
            : 'text-[var(--app-text-soft)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-text)]'
        "
        @click="navigate(item)"
      >
        {{ item.label }}
      </button>
    </div>
  </nav>
</template>
