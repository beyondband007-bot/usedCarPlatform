<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { NPopover } from "naive-ui";
import { ref } from "vue";
import { computed, inject } from "vue";
import { useRoute, useRouter } from "vue-router";

import { topNavigation } from "@/constants/prototype";
import { WORKBENCH_ENTRY_KEY } from "@/composables/workbench-entry-key";
import { useAppStore } from "@/stores/app";
import { useAuthStore } from "@/stores/auth";
import type { NavItem } from "@/types/prototype";

const appStore = useAppStore();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const workbenchEntry = inject(WORKBENCH_ENTRY_KEY);

const userMenuOpen = ref(false);

function isNavItemActive(item: NavItem) {
  if (item.workbenchEntry) {
    return route.path.startsWith("/workspace");
  }

  return route.path === item.path || route.path.startsWith(`${item.path}/`);
}

function handleNavClick(item: NavItem) {
  if (item.workbenchEntry && !authStore.isLoggedIn) {
    workbenchEntry?.openWorkbench();
    return;
  }

  router.push(item.path);
}

function handleLogout() {
  userMenuOpen.value = false;
  authStore.logout();
  router.push("/home");
}

const navItems = computed(() =>
  authStore.isLoggedIn
    ? topNavigation.filter((item) => item.path !== "/auth")
    : topNavigation,
);
</script>

<template>
  <div class="sticky top-0 z-50 ra-0">
    <header
      class="flex min-h-[72px] w-full max-w-full items-center gap-4 overflow-hidden bg-[var(--app-header-bg)] px-4 text-[var(--app-text)] shadow-[var(--app-header-shadow)] xl:gap-6 xl:px-6"
    >
      <RouterLink
        to="/home"
        class="flex shrink-0 items-center gap-3 no-underline"
      >
        <span
          class="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500"
        >
          <Icon icon="mdi:car-side" class="text-2xl" />
        </span>
        <span class="hidden min-w-0 sm:block">
          <span
            class="block text-base font-black leading-tight text-[var(--app-text)]"
          >
            企业二手车
          </span>
          <span
            class="mt-0.5 block text-xs font-medium text-[var(--app-header-brand-sub)]"
          >
            企业管理后台
          </span>
        </span>
      </RouterLink>

      <nav
        class="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] xl:gap-2 [&::-webkit-scrollbar]:hidden"
        aria-label="主导航"
      >
        <button
          v-for="item in navItems"
          :key="item.path"
          type="button"
          class="inline-flex min-w-[72px] shrink-0 flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition duration-200 xl:min-w-[80px] xl:px-4"
          :class="
            isNavItemActive(item)
              ? 'bg-[var(--app-header-nav-active-bg)] text-[var(--app-header-nav-active)]'
              : 'text-[var(--app-header-nav)] hover:bg-[var(--app-header-nav-active-bg)]/60 hover:text-[var(--app-header-nav-active)]'
          "
          @click="handleNavClick(item)"
        >
          <Icon
            v-if="item.icon"
            :icon="item.icon"
            class="text-xl"
            :class="isNavItemActive(item) ? 'text-[var(--app-header-nav-active)]' : ''"
          />
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <div class="ml-auto flex shrink-0 items-center gap-2 xl:gap-3">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full bg-[var(--app-header-chip-bg)] px-3 py-2 text-xs font-semibold text-[var(--app-header-chip-text)] transition hover:opacity-90"
          @click="appStore.toggleTheme()"
        >
          <Icon
            :icon="
              appStore.isDarkMode
                ? 'mdi:white-balance-sunny'
                : 'mdi:moon-waning-crescent'
            "
            class="text-base"
          />
          <span class="hidden md:inline">
            {{ appStore.isDarkMode ? "日间模式" : "夜间模式" }}
          </span>
        </button>

        <NPopover
          v-if="authStore.isLoggedIn"
          v-model:show="userMenuOpen"
          trigger="click"
          placement="bottom-end"
          :show-arrow="false"
          raw
          to="body"
        >
          <template #trigger>
            <button
              type="button"
              class="user-menu-trigger"
              :aria-expanded="userMenuOpen"
              aria-haspopup="menu"
            >
              <span class="user-menu-avatar" aria-hidden="true">
                <Icon icon="mdi:account-circle-outline" />
              </span>
              <span class="user-menu-name">{{ authStore.userName }}</span>
              <Icon icon="mdi:chevron-down" class="user-menu-chevron" />
            </button>
          </template>

          <div
            class="user-menu-panel"
            :class="appStore.isDarkMode ? 'is-dark' : 'is-light'"
            role="menu"
          >
            <button
              type="button"
              class="user-menu-logout"
              role="menuitem"
              @click="handleLogout"
            >
              <Icon icon="mdi:logout" class="user-menu-logout-icon" />
              退出登录
            </button>
          </div>
        </NPopover>

        <RouterLink
          v-else-if="route.path !== '/auth'"
          to="/auth"
          class="inline-flex items-center gap-1.5 rounded-full bg-[var(--app-header-nav-active-bg)] px-3 py-2 text-xs font-semibold text-[var(--app-header-nav-active)] no-underline transition hover:opacity-90"
        >
          <Icon icon="mdi:account-key-outline" class="text-base" />
          <span class="hidden sm:inline">登录</span>
        </RouterLink>
      </div>
    </header>
  </div>
</template>

<style scoped lang="scss">
.user-menu-trigger {
  display: inline-flex;
  max-width: min(100%, 200px);
  align-items: center;
  gap: 8px;
  padding: 5px 12px 5px 6px;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: var(--app-header-chip-bg);
  color: var(--app-header-user);
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.user-menu-trigger:hover {
  border-color: color-mix(in srgb, #f97316 32%, var(--app-border));
  background: var(--app-header-nav-active-bg);
  box-shadow: 0 4px 14px color-mix(in srgb, #f97316 12%, transparent);
}

.user-menu-avatar {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: color-mix(in srgb, #f97316 14%, var(--app-header-chip-bg));
  color: var(--app-header-nav-active);
  font-size: 18px;
}

.user-menu-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-menu-chevron {
  flex-shrink: 0;
  font-size: 16px;
  opacity: 0.72;
}

@media (max-width: 639px) {
  .user-menu-name {
    display: none;
  }

  .user-menu-trigger {
    padding-inline: 6px;
  }
}
</style>

<style lang="scss">
.user-menu-panel {
  min-width: 152px;
  padding: 6px;
  border-radius: 12px;
}

.user-menu-panel.is-light {
  border: 1px solid rgba(15, 23, 42, 0.1);
  background: #ffffff;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.14);
}

.user-menu-panel.is-dark {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #11131b;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.42);
}

.user-menu-logout {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.user-menu-panel.is-light .user-menu-logout {
  color: #0f172a;
}

.user-menu-panel.is-dark .user-menu-logout {
  color: #f8fafc;
}

.user-menu-panel.is-light .user-menu-logout:hover {
  background: #fff7ed;
  color: #ea580c;
}

.user-menu-panel.is-dark .user-menu-logout:hover {
  background: #1f2937;
  color: #fb923c;
}

.user-menu-logout-icon {
  font-size: 18px;
}
</style>
