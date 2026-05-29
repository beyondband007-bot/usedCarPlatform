<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useRoute, useRouter } from 'vue-router'

import { WORKSPACE_DEFAULT_CAPABILITY } from '@/constants/app-flow'
import { secondaryNavigation } from '@/constants/prototype'
import { useAuthStore } from '@/stores/auth'
import type { NavItem } from '@/types/prototype'

const props = defineProps<{
  embedded?: boolean
}>()

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
    class="subnav flex min-h-[44px] w-full items-center"
    :class="
      props.embedded
        ? 'subnav--embedded'
        : 'sticky top-[72px] z-40 gap-4 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 shadow-sm xl:px-6'
    "
    aria-label="企业业务导航"
  >
    <div
      class="flex min-w-0 flex-1 items-center overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      :class="props.embedded ? 'gap-[var(--studio-chrome-nav-gap,clamp(20px,2.8vw,56px))]' : 'gap-1'"
    >
      <button
        v-for="item in secondaryNavigation"
        :key="item.path"
        type="button"
        class="subnav-link inline-flex shrink-0 items-center rounded-lg font-semibold transition duration-200"
        :class="[
          isNavItemActive(item) ? 'is-active' : '',
          props.embedded ? 'subnav-link--embedded' : 'px-4 py-2 text-sm',
        ]"
        @click="navigate(item)"
      >
        {{ item.label }}
      </button>
    </div>

    <RouterLink
      v-if="!props.embedded"
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
.subnav--embedded {
  position: static;
  top: auto;
  z-index: auto;
  min-height: clamp(40px, 3.2vw, 48px);
  border: 0;
  padding-inline: var(--studio-chrome-pad-x, 24px);
  background: var(--studio-chrome-bg, #020202);
  box-shadow: none;
}

.subnav-link:not(.subnav-link--embedded).is-active {
  background: var(--app-header-nav-active-bg);
  color: var(--app-header-nav-active);
}

.subnav-link:not(.subnav-link--embedded):not(.is-active) {
  color: var(--app-text-soft);
}

.subnav-link:not(.subnav-link--embedded):not(.is-active):hover {
  background: var(--app-surface-soft);
  color: var(--app-text);
}

.subnav-link--embedded {
  color: var(--studio-chrome-nav, #c9c9c9);
  background: transparent;
  font-size: var(--studio-chrome-nav-size, clamp(15px, 1.15vw, 19px));
  font-weight: 700;
  line-height: 1.2;
  padding: clamp(6px, 0.55vw, 8px) clamp(12px, 1.1vw, 18px);
}

.subnav-link--embedded:hover {
  color: var(--studio-chrome-nav-hover, #f3f3f3);
}

.subnav-link--embedded.is-active {
  color: var(--studio-chrome-nav-active, #f4c840);
  background: transparent;
}

.subnav--embedded .subnav-credits {
  background: rgba(255, 255, 255, 0.08);
  color: #f3f3f3;
}

.subnav--embedded .subnav-credits-icon {
  color: #f4c840;
}

.subnav--embedded .subnav-credits-value {
  color: #ffd94d;
}

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
