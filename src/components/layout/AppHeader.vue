<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { NDropdown } from "naive-ui";
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

const userMenuOptions = [{ label: "退出登录", key: "logout" }];

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

function handleUserMenu(key: string) {
  if (key !== "logout") {
    return;
  }

  authStore.logout();
  router.push("/home");
}

const navItems = computed(() => topNavigation);
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

        <NDropdown
          v-if="authStore.isLoggedIn"
          trigger="click"
          :options="userMenuOptions"
          @select="handleUserMenu"
        >
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-full px-2 py-2 text-xs font-semibold text-[var(--app-header-user)] transition hover:opacity-90"
          >
            <Icon icon="mdi:office-building-outline" class="text-lg" />
            <span class="hidden max-w-24 truncate lg:inline">
              {{ authStore.userName }}
            </span>
            <Icon icon="mdi:chevron-down" class="hidden text-base lg:inline" />
          </button>
        </NDropdown>

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
