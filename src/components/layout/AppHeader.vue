<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { NPopover } from "naive-ui";
import { computed, inject, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { studioGuestNavigation, topNavigation } from "@/constants/prototype";
import { WORKBENCH_ENTRY_KEY } from "@/composables/workbench-entry-key";
import { useStudioChrome } from "@/composables/useStudioChrome";
import { useAppStore } from "@/stores/app";
import { useAuthStore } from "@/stores/auth";
import { useCreditsStore } from "@/stores/credits";
import type { NavItem } from "@/types/prototype";

const appStore = useAppStore();
const authStore = useAuthStore();
const creditsStore = useCreditsStore();
const router = useRouter();
const route = useRoute();
const workbenchEntry = inject(WORKBENCH_ENTRY_KEY);

const userMenuOpen = ref(false);
const { usesStudioChrome } = useStudioChrome();

const creditsBalanceText = computed(() => {
  if (creditsStore.accountsLoaded) {
    return Number(creditsStore.availableBalance ?? 0).toLocaleString("zh-CN");
  }
  return authStore.credits;
});

watch(
  () => authStore.isLoggedIn,
  (loggedIn) => {
    if (loggedIn) {
      void creditsStore.hydrateAccounts();
    } else {
      creditsStore.reset();
    }
  },
  { immediate: true },
);

function isNavItemActive(item: NavItem) {
  if (item.workbenchEntry) {
    return route.path === "/workspace" || route.path.startsWith("/workspace/");
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

function resolveNavPermission(path: string) {
  if (path === "/home") return "menu:home";
  if (path === "/workspace" || path.startsWith("/workspace/"))
    return "menu:workspace";
  if (path === "/pricing") return "menu:pricing";
  if (path === "/points" || path === "/credits") return "menu:points";
  if (path === "/recharge" || path === "/package-points")
    return "menu:recharge";
  return "";
}

function canShowNavItem(item: NavItem) {
  if (!authStore.isLoggedIn)
    return item.path !== "/credits" && item.path !== "/points";
  const permission = resolveNavPermission(item.path);
  return !permission || authStore.permissions.includes(permission);
}

const navItems = computed(() => {
  if (usesStudioChrome.value) {
    if (!authStore.isLoggedIn) {
      return studioGuestNavigation;
    }

    return topNavigation.filter(
      (item) => item.path !== "/login" && canShowNavItem(item),
    );
  }

  return authStore.isLoggedIn
    ? topNavigation.filter(
        (item) => item.path !== "/login" && canShowNavItem(item),
      )
    : topNavigation.filter(canShowNavItem);
});
</script>

<template>
  <div
    class="app-header-wrap"
    :class="{ 'app-header-wrap--home': usesStudioChrome }"
  >
    <header v-if="usesStudioChrome" class="site-header" aria-label="顶部导航">
      <RouterLink class="logo" to="/home">AI CARXEN</RouterLink>
      <nav class="nav-links" aria-label="主导航">
        <button
          v-for="item in navItems"
          :key="item.path + item.label"
          type="button"
          class="nav-link"
          :class="{ active: isNavItemActive(item) }"
          @click="handleNavClick(item)"
        >
          {{ item.label }}
        </button>
      </nav>
      <div class="site-header-actions">
        <RouterLink
          v-if="authStore.isLoggedIn"
          class="credit-pill"
          to="/credits"
          aria-label="查看积分余额与流水"
        >
          积分余额 {{ creditsBalanceText }}
        </RouterLink>
        <RouterLink
          v-else-if="route.path !== '/login'"
          class="credit-pill site-login-fallback"
          to="/login"
        >
          企业账号登录
        </RouterLink>
        <button
          type="button"
          class="theme-toggle"
          @click="appStore.toggleTheme()"
        >
          <Icon
            :icon="
              appStore.isDarkMode
                ? 'mdi:white-balance-sunny'
                : 'mdi:moon-waning-crescent'
            "
          />
          <span class="theme-toggle-label">
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
              class="user-menu-trigger user-menu-trigger--studio"
              :aria-expanded="userMenuOpen"
              aria-haspopup="menu"
            >
              <span
                class="user-menu-avatar user-menu-avatar--studio"
                aria-hidden="true"
              >
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
      </div>
    </header>

    <header
      v-else
      class="flex min-h-[60px] w-full max-w-full items-center gap-4 overflow-hidden bg-[var(--app-header-bg)] px-4 text-[var(--app-text)] shadow-[var(--app-header-shadow)] xl:gap-6 xl:px-6"
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
        class="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto overflow-y-hidden xl:gap-2"
        aria-label="主导航"
      >
        <button
          v-for="item in navItems"
          :key="item.path"
          type="button"
          class="inline-flex min-w-[72px] shrink-0 flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition duration-200 xl:min-w-[80px] xl:px-4"
          :class="
            isNavItemActive(item)
              ? 'text-[var(--app-header-nav-active)]'
              : 'text-[var(--app-header-nav)] hover:text-[var(--app-header-nav-active)]'
          "
          @click="handleNavClick(item)"
        >
          <Icon
            v-if="item.icon"
            :icon="item.icon"
            class="text-xl"
            :class="
              isNavItemActive(item) ? 'text-[var(--app-header-nav-active)]' : ''
            "
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
      </div>
    </header>
  </div>
</template>

<style scoped lang="scss">
.app-header-wrap {
  position: sticky;
  top: 0;
  z-index: 50;
}

.app-header-wrap--home {
  position: relative;
  left: auto;
  right: auto;
}

.site-header {
  display: flex;
  align-items: center;
  gap: clamp(20px, 2.8vw, 48px);
  width: 100%;
  max-width: none;
  box-sizing: border-box;
  min-height: var(--studio-chrome-header-height, 72px);
  padding: 12px var(--studio-chrome-pad-x, 24px);
  margin: 0;
  background: var(
    --studio-chrome-header-bg,
    linear-gradient(to bottom, rgba(2, 2, 2, 0.72), transparent)
  );
  color: var(--studio-chrome-logo, #f3f3f3);
  font-family:
    "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
}

.logo {
  flex-shrink: 0;
  color: var(--studio-chrome-logo, #f3f3f3);
  font-size: var(--studio-chrome-logo-size, clamp(20px, 1.75vw, 30px));
  font-weight: 900;
  letter-spacing: 0;
  text-decoration: none;
}

.nav-links {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--studio-chrome-nav-gap, clamp(20px, 2.8vw, 56px));
  color: var(--studio-chrome-nav, #c9c9c9);
  font-size: var(--studio-chrome-nav-size, clamp(15px, 1.15vw, 19px));
  font-weight: 700;
}

.nav-link {
  position: relative;
  padding: 0 0 clamp(6px, 0.45vw, 8px);
  border: 0;
  background: transparent;
  color: var(--studio-chrome-nav, #475569);
  font-family: inherit;
  font-size: inherit;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  transition: color 0.25s ease;
}

.nav-link:hover {
  color: var(--studio-chrome-nav-hover, #2f6bff);
}

.nav-link::after {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 0;
  height: 2px;
  content: "";
  border-radius: 2px;
  background: var(--studio-chrome-nav-underline, #2f6bff);
  transform: translateX(-50%);
  transition: width 0.25s ease;
}

.nav-link:hover::after,
.nav-link.active::after {
  width: 100%;
}

.nav-link.active {
  color: var(--studio-chrome-nav-active, #2f6bff);
  font-weight: 600;
}

.credit-pill {
  padding: clamp(8px, 0.65vw, 10px) clamp(14px, 1.2vw, 20px);
  color: var(--studio-chrome-credit-text, #ffffff);
  background: var(--studio-chrome-credit-bg, #d4a017);
  border-radius: 999px;
  font-size: var(--studio-chrome-action-size, clamp(12px, 0.95vw, 15px));
  font-weight: 900;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.2s ease;
}

.credit-pill:hover {
  background: var(--studio-chrome-credit-hover, #e5b85c);
}

.site-login-fallback {
  display: none;
}

.site-header-actions {
  display: inline-flex;
  align-items: center;
  margin-left: auto;
  gap: 10px;
}

.theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: clamp(5px, 0.45vw, 8px);
  padding: clamp(6px, 0.55vw, 8px) clamp(10px, 0.9vw, 14px);
  border: 1px solid var(--studio-chrome-theme-border, rgba(255, 255, 255, 0.14));
  border-radius: 999px;
  background: var(--studio-chrome-theme-bg, rgba(255, 255, 255, 0.08));
  color: var(--studio-chrome-theme-text, #f3f3f3);
  font-family: inherit;
  font-size: var(--studio-chrome-action-size, clamp(12px, 0.95vw, 15px));
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}

.theme-toggle:hover {
  border-color: var(
    --studio-chrome-user-hover-border,
    rgba(239, 194, 76, 0.42)
  );
  background: var(--studio-chrome-user-hover-bg, rgba(255, 255, 255, 0.12));
}

.theme-toggle :deep(svg) {
  font-size: clamp(15px, 1.1vw, 18px);
}

.theme-toggle-label {
  white-space: nowrap;
}

.user-menu-trigger--studio {
  border-color: var(--studio-chrome-user-border, rgba(255, 255, 255, 0.14));
  background: var(--studio-chrome-user-bg, rgba(255, 255, 255, 0.08));
  color: var(--studio-chrome-user-text, #f3f3f3);
  font-size: var(--studio-chrome-nav-size, clamp(15px, 1.15vw, 19px));
  font-weight: 700;
}

.user-menu-trigger--studio:hover {
  border-color: var(
    --studio-chrome-user-hover-border,
    rgba(239, 194, 76, 0.42)
  );
  background: var(--studio-chrome-user-hover-bg, rgba(255, 255, 255, 0.12));
  box-shadow: 0 4px 14px rgba(239, 194, 76, 0.12);
}

.user-menu-avatar--studio {
  background: var(--studio-chrome-avatar-bg, rgba(239, 194, 76, 0.16));
  color: var(--studio-chrome-avatar-text, #efc24c);
}

@media (max-width: 1100px) {
  .nav-links {
    display: none;
  }

  .site-login-fallback {
    display: inline-flex;
  }
}

@media (max-width: 700px) {
  .site-header {
    padding: 14px var(--studio-chrome-pad-x, 18px);
  }

  .credit-pill {
    padding: 8px 12px;
    font-size: clamp(11px, 3.2vw, 13px);
  }

  .site-header-actions {
    justify-self: end;
  }

  .theme-toggle-label {
    display: none;
  }
}

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
  border-color: color-mix(
    in srgb,
    var(--color-accent-blue, #2f6bff) 32%,
    var(--app-border)
  );
  background: var(--app-surface-soft, #f8fafd);
  box-shadow: 0 4px 14px
    color-mix(in srgb, var(--color-accent-blue, #2f6bff) 12%, transparent);
}

.user-menu-avatar {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: color-mix(
    in srgb,
    var(--color-accent-blue, #2f6bff) 12%,
    var(--app-header-chip-bg)
  );
  color: var(--color-accent-blue, #2f6bff);
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
  background: var(--app-surface, #101010);
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
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.user-menu-panel.is-light .user-menu-logout {
  color: #0f172a;
}

.user-menu-panel.is-dark .user-menu-logout {
  color: #f8fafc;
}

.user-menu-panel.is-light .user-menu-logout:hover {
  background: #f8fafd;
  color: #2f6bff;
}

.user-menu-panel.is-dark .user-menu-logout:hover {
  background: #1f2937;
  color: #fb923c;
}

.user-menu-logout-icon {
  font-size: 18px;
}

.header-login-link {
  background: var(--color-action-primary, #2f6bff);
  color: #ffffff;
}

.header-login-link:hover {
  background: var(--color-action-primary-hover, #4f7fff);
  opacity: 1;
}

[data-theme="dark"] .header-login-link {
  background: var(--app-header-nav-active-bg);
  color: var(--app-header-nav-active);
}
</style>
