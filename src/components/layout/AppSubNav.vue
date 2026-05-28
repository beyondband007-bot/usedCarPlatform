<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useRoute, useRouter } from 'vue-router'

import { WORKSPACE_DEFAULT_CAPABILITY } from '@/constants/app-flow'
import { secondaryNavigation } from '@/constants/prototype'
import { useAuthStore } from '@/stores/auth'
import type { NavItem } from '@/types/prototype'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

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

    <RouterLink
      to="/credits"
      class="subnav-credits shrink-0"
      aria-label="查看积分余额与流水"
    >
      <Icon icon="mdi:diamond-stone" class="subnav-credits-icon" />
      <span class="subnav-credits-label">积分余额</span>
      <strong class="subnav-credits-value">{{ authStore.credits }}</strong>
    </RouterLink>
  </nav>
</template>

<style scoped lang="scss">
.subnav-credits {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--app-header-credits-bg);
  color: var(--app-header-credits-text);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  text-decoration: none;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease;
  white-space: nowrap;
}

.subnav-credits:hover {
  box-shadow: 0 4px 14px color-mix(in srgb, #f97316 14%, transparent);
}

.subnav-credits-icon {
  flex-shrink: 0;
  color: #3b82f6;
  font-size: 14px;
}

.subnav-credits-label {
  font-weight: 700;
}

.subnav-credits-value {
  font-size: 13px;
  font-weight: 900;
}

@media (max-width: 767px) {
  .subnav-credits-label {
    display: none;
  }
}
</style>
