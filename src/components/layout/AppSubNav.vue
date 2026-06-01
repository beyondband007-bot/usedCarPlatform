<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { WORKSPACE_DEFAULT_CAPABILITY } from '@/constants/app-flow'
import { secondaryNavigation } from '@/constants/prototype'
import { useAuthStore } from '@/stores/auth'
import { useCreditsStore } from '@/stores/credits'
import type { NavItem } from '@/types/prototype'

const props = defineProps<{
  embedded?: boolean
}>()

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const creditsStore = useCreditsStore()

const permissionMap: Record<string, string> = {
  '/home': 'menu:home',
  '/workspace': 'menu:workspace',
  '/points': 'menu:points',
  '/credits': 'menu:points',
  '/recharge': 'menu:recharge',
  '/package-points': 'menu:recharge',
  '/credits-admin': 'menu:admin',
}

const creditsBalanceText = computed(() => {
  if (creditsStore.accountsLoaded) {
    return Number(creditsStore.availableBalance ?? 0).toLocaleString('zh-CN')
  }
  return authStore.credits
})

const visibleNavigation = computed(() =>
  secondaryNavigation.filter((item) => {
    const permission = permissionMap[item.path]
    return !permission || authStore.permissions.includes(permission)
  }),
)

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
        ? 'subnav--embedded subnav--workbench'
        : 'sticky top-[60px] z-40 gap-4 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 shadow-sm xl:px-6'
    "
    aria-label="企业业务导航"
  >
    <div
      class="subnav-track"
      :class="{ 'subnav-track--embedded': props.embedded }"
    >
      <div
        class="subnav-links flex min-w-0 items-center overflow-x-auto"
        :class="props.embedded ? 'subnav-links--embedded' : 'flex-1 gap-1'"
      >
        <button
          v-for="item in visibleNavigation"
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
    </div>

    <RouterLink
      v-if="!props.embedded"
      to="/credits"
      class="subnav-credits shrink-0"
      aria-label="查看积分余额与流水"
    >
      <Icon icon="mdi:diamond-stone" class="subnav-credits-icon" />
      <span class="subnav-credits-label">积分余额</span>
      <strong class="subnav-credits-value">{{ creditsBalanceText }}</strong>
    </RouterLink>
  </nav>
</template>

<style scoped lang="scss">
.subnav--embedded {
  position: static;
  top: auto;
  z-index: auto;
  min-height: clamp(40px, 3vw, 48px);
  border: 0;
  padding-inline: var(--studio-chrome-pad-x, 24px);
  background: var(--studio-chrome-subnav-bg, #040404);
  border-top: 1px solid var(--studio-chrome-subnav-border, rgba(239, 194, 76, 0.08));
  box-shadow: none;
}

.subnav--workbench {
  display: flex;
  align-items: stretch;
}

.subnav-track {
  position: relative;
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: stretch;
}

.subnav-track--embedded {
  overflow: hidden;
}

.subnav-links--embedded {
  position: relative;
  z-index: 1;
  flex: 1;
  gap: var(--studio-chrome-nav-gap, clamp(20px, 2.8vw, 56px));
  padding-inline: clamp(8px, 1.2vw, 16px);
}

.subnav-link:not(.subnav-link--embedded).is-active {
  background: transparent;
  color: var(--app-header-nav-active);
  font-weight: 600;
}

.subnav-link:not(.subnav-link--embedded):not(.is-active) {
  color: var(--app-text-soft);
}

.subnav-link:not(.subnav-link--embedded):not(.is-active):hover {
  background: var(--app-surface-soft);
  color: var(--app-text);
}

.subnav-link--embedded {
  position: relative;
  border-radius: 0;
  background: transparent;
  color: var(--studio-chrome-nav, #475569);
  font-size: var(--studio-chrome-nav-size, clamp(15px, 1.15vw, 19px));
  font-weight: 600;
  line-height: 1.2;
  padding:
    clamp(8px, 0.7vw, 10px)
    clamp(12px, 1.1vw, 18px)
    clamp(10px, 0.8vw, 12px);
}

.subnav-link--embedded::after {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 0;
  height: 2px;
  content: '';
  border-radius: 2px;
  background: var(--studio-chrome-nav-underline, #2f6bff);
  transform: translateX(-50%);
  transition: width 0.25s ease;
}

.subnav-link--embedded:hover {
  color: var(--studio-chrome-nav-hover, #2f6bff);
}

.subnav-link--embedded:hover::after,
.subnav-link--embedded.is-active::after {
  width: calc(100% - 12px);
}

.subnav-link--embedded.is-active {
  color: var(--studio-chrome-nav-active, #2f6bff);
  background: transparent;
  font-weight: 600;
}

.subnav--embedded .subnav-credits {
  background: rgba(239, 194, 76, 0.1);
  color: #f7f1e4;
}

.subnav--embedded .subnav-credits-icon {
  color: #efc24c;
}

.subnav--embedded .subnav-credits-value {
  color: #ffd75a;
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
  box-shadow: 0 4px 14px color-mix(in srgb, var(--studio-chrome-nav-active, #efc24c) 14%, transparent);
}

.subnav-credits-icon {
  flex-shrink: 0;
  color: inherit;
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
