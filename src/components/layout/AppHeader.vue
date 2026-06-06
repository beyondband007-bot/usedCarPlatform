<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { NPopover } from "naive-ui";
import { computed, inject, ref, watch } from "vue";

import themeIconMoon from "@/assets/img/icon/月亮.svg";
import themeIconSun from "@/assets/img/icon/太阳.svg";
import siteLogoDay from "@/assets/img/icon/logo/顶部logo日间.png";
import siteLogoNight from "@/assets/img/icon/logo/顶部logo夜间.png";
import { useRoute, useRouter } from "vue-router";

import { CREDITS_ROUTE } from "@/constants/app-flow";
import { studioGuestNavigation, topNavigation } from "@/constants/prototype";
import { WORKBENCH_ENTRY_KEY } from "@/composables/workbench-entry-key";
import PointsRechargeModal from "@/components/business/points/PointsRechargeModal.vue";
import { usePointsRechargeModal } from "@/composables/usePointsRechargeModal";
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
const { rechargeModalVisible, openRechargeModal, notifyRechargeSuccess } =
  usePointsRechargeModal();

const siteLogoSrc = computed(() =>
  appStore.isDarkMode ? siteLogoNight : siteLogoDay,
);

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

function handleOpenCredits() {
  userMenuOpen.value = false;
  router.push(CREDITS_ROUTE);
}

function handleOpenRecharge() {
  userMenuOpen.value = false;
  openRechargeModal();
}

async function handleRechargeSuccess() {
  notifyRechargeSuccess();
  await creditsStore.hydrateAccounts();
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
  if (
    authStore.userInfo?.enterpriseAccountRole === "child" &&
    (item.path === "/recharge" || item.path === "/package-points")
  ) {
    return false;
  }
  const permission = resolveNavPermission(item.path);
  return !permission || authStore.permissions.includes(permission);
}

const themeToggleIcon = computed(() =>
  appStore.isDarkMode ? themeIconSun : themeIconMoon,
);

const themeToggleAriaLabel = computed(() =>
  appStore.isDarkMode ? "切换到日间模式" : "切换到夜间模式",
);

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

const canShowRechargeEntry = computed(
  () => authStore.userInfo?.enterpriseAccountRole !== "child",
);

const showHeaderRecharge = computed(
  () =>
    authStore.isLoggedIn &&
    canShowRechargeEntry.value &&
    navItems.value.some((item) => item.path === "/credits"),
);
</script>

<template>
  <div
    class="app-header-wrap"
    :class="{ 'app-header-wrap--home': usesStudioChrome }"
  >
    <header
      v-if="usesStudioChrome"
      class="site-header"
      :class="{ 'is-light': !appStore.isDarkMode }"
      aria-label="顶部导航"
    >
      <div class="site-brand">
        <RouterLink class="logo" to="/home" aria-label="AI CARXEN 车新新">
          <img class="logo-img" :src="siteLogoSrc" alt="AI CARXEN 车新新" />
        </RouterLink>
      </div>
      <nav class="nav-links" aria-label="主导航">
        <template v-for="item in navItems" :key="item.path + item.label">
          <button
            type="button"
            class="nav-link"
            :class="{ active: isNavItemActive(item) }"
            @click="handleNavClick(item)"
          >
            {{ item.label }}
          </button>
          <button
            v-if="item.path === '/credits' && showHeaderRecharge"
            type="button"
            class="nav-link nav-link--action"
            @click="handleOpenRecharge"
          >
            充值
          </button>
        </template>
      </nav>
      <div class="site-header-actions">
        <RouterLink
          v-if="authStore.isLoggedIn"
          class="header-action-pill credit-pill"
          to="/credits"
          aria-label="查看积分余额与流水"
        >
          积分余额 {{ creditsBalanceText }}
        </RouterLink>
        <RouterLink
          v-else-if="route.path !== '/login'"
          class="header-action-pill credit-pill site-login-fallback"
          to="/login"
        >
          企业账号登录
        </RouterLink>
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
              class="header-action-pill user-menu-trigger user-menu-trigger--studio"
              :aria-expanded="userMenuOpen"
              aria-haspopup="menu"
            >
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
              class="user-menu-item"
              role="menuitem"
              @click="handleOpenCredits"
            >
              <Icon icon="mdi:diamond-stone" class="user-menu-item-icon" />
              积分查询
            </button>
            <button
              v-if="showHeaderRecharge"
              type="button"
              class="user-menu-item"
              role="menuitem"
              @click="handleOpenRecharge"
            >
              <Icon icon="mdi:wallet-plus-outline" class="user-menu-item-icon" />
              充值
            </button>
            <button
              type="button"
              class="user-menu-item"
              role="menuitem"
              @click="handleLogout"
            >
              <Icon icon="mdi:logout" class="user-menu-item-icon" />
              退出登录
            </button>
          </div>
        </NPopover>
        <button
          type="button"
          class="theme-toggle"
          :aria-label="themeToggleAriaLabel"
          @click="appStore.toggleTheme()"
        >
          <img
            :src="themeToggleIcon"
            alt=""
            class="theme-toggle-icon"
            :class="
              appStore.isDarkMode
                ? 'theme-toggle-icon--to-light'
                : 'theme-toggle-icon--to-dark'
            "
            width="22"
            height="22"
            decoding="async"
            draggable="false"
          />
        </button>
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
        <template v-for="item in navItems" :key="item.path">
          <button
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
          <button
            v-if="item.path === '/credits' && showHeaderRecharge"
            type="button"
            class="inline-flex min-w-[72px] shrink-0 items-center rounded-xl px-3 py-2 text-xs font-semibold text-[var(--app-header-nav)] transition duration-200 hover:text-[var(--app-header-nav-active)] xl:min-w-[80px] xl:px-4"
            @click="handleOpenRecharge"
          >
            充值
          </button>
        </template>
      </nav>

      <div class="ml-auto flex shrink-0 items-center gap-2 xl:gap-3">
        <button
          type="button"
          class="theme-toggle theme-toggle--admin inline-flex items-center justify-center rounded-full bg-[var(--app-header-chip-bg)] p-2 text-[var(--app-header-chip-text)] transition hover:opacity-90"
          :aria-label="themeToggleAriaLabel"
          @click="appStore.toggleTheme()"
        >
          <img
            :src="themeToggleIcon"
            alt=""
            class="theme-toggle-icon"
            :class="
              appStore.isDarkMode
                ? 'theme-toggle-icon--to-light'
                : 'theme-toggle-icon--to-dark'
            "
            width="22"
            height="22"
            decoding="async"
            draggable="false"
          />
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
              class="user-menu-item"
              role="menuitem"
              @click="handleOpenCredits"
            >
              <Icon icon="mdi:diamond-stone" class="user-menu-item-icon" />
              积分查询
            </button>
            <button
              v-if="showHeaderRecharge"
              type="button"
              class="user-menu-item"
              role="menuitem"
              @click="handleOpenRecharge"
            >
              <Icon icon="mdi:wallet-plus-outline" class="user-menu-item-icon" />
              充值
            </button>
            <button
              type="button"
              class="user-menu-item"
              role="menuitem"
              @click="handleLogout"
            >
              <Icon icon="mdi:logout" class="user-menu-item-icon" />
              退出登录
            </button>
          </div>
        </NPopover>
      </div>
    </header>

    <PointsRechargeModal
      v-if="authStore.isLoggedIn"
      v-model:show="rechargeModalVisible"
      @success="handleRechargeSuccess"
    />
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
  gap: clamp(18px, 2vw, 34px);
  width: 100%;
  max-width: none;
  box-sizing: border-box;
  min-height: var(--studio-chrome-header-height, 64px);
  padding: 10px var(--studio-chrome-pad-x, 24px);
  margin: 0;
  background: var(
    --studio-chrome-header-bg,
    linear-gradient(180deg, rgba(248, 251, 255, 0.96) 0%, rgba(241, 247, 253, 0.92) 100%)
  );
  color: var(--studio-chrome-logo, #121826);
  font-family:
    "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  backdrop-filter: blur(12px);
}

.logo {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  margin-right: 18px;
  line-height: 1;
  text-decoration: none;
}

.logo-img {
  display: block;
  width: auto;
  height: calc(var(--studio-chrome-logo-size, clamp(24px, 2vw, 36px)) * 0.9);
  object-fit: contain;
}

.site-brand {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
}

.nav-links {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--studio-chrome-nav-gap, clamp(18px, 2.2vw, 42px));
  color: var(--studio-chrome-nav, #6b7280);
  font-size: var(--studio-chrome-nav-size, clamp(14px, 0.85vw, 16px));
}

.nav-link {
  position: relative;
  flex-shrink: 0;
  padding: 0 0 clamp(6px, 0.45vw, 8px);
  border: 0;
  background: transparent;
  color: var(--studio-chrome-nav, #6b7280);
  font-family: inherit;
  font-size: inherit;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.25s ease;
}

.nav-link:hover {
  color: var(--studio-chrome-nav-hover, #111827);
}

.nav-link::after {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 0;
  height: 2px;
  content: "";
  border-radius: 2px;
  background: var(--studio-chrome-nav-underline, #111827);
  transform: translateX(-50%);
  transition:
    width 0.25s ease,
    background 0.25s ease;
}

.nav-link:hover::after {
  width: 100%;
  background: var(--studio-chrome-nav-underline-hover, #111827);
}

.nav-link.active::after {
  width: 100%;
  background: var(
    --studio-chrome-nav-underline-active,
    var(--studio-chrome-nav-underline, #111827)
  );
}

.nav-link.active {
  color: var(--studio-chrome-nav-active, #111827);
  font-weight: 600;
}

.nav-link--action {
  font-weight: 600;
}

.header-action-pill,
.credit-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  gap: 6px;
  min-height: clamp(36px, 2.4vw, 40px);
  padding: clamp(6px, 0.55vw, 8px) clamp(12px, 1vw, 16px);
  border: 1px solid var(--studio-chrome-credit-border, rgba(15, 23, 42, 0.12));
  border-radius: 999px;
  background: var(--studio-chrome-credit-bg, #ffffff);
  color: var(--studio-chrome-credit-text, #111827);
  font-family: inherit;
  font-size: var(--studio-chrome-action-size, clamp(13px, 0.78vw, 15px));
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}

.credit-pill {
  text-decoration: none;
}

.header-action-pill:hover,
.credit-pill:hover {
  background: var(--studio-chrome-credit-hover, #f8fafc);
}

.site-login-fallback {
  display: none;
}

.site-header-actions {
  display: inline-flex;
  align-items: center;
  margin-left: auto;
  gap: clamp(8px, 0.75vw, 12px);
}

.theme-toggle {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 0;
  width: clamp(36px, 2.4vw, 40px);
  height: clamp(36px, 2.4vw, 40px);
  padding: 0;
  border: 1px solid var(--studio-chrome-theme-border, rgba(15, 23, 42, 0.1));
  border-radius: 50%;
  background: var(--studio-chrome-theme-bg, #0f1115);
  color: var(--studio-chrome-theme-text, #ffffff);
  font-family: inherit;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    opacity 0.2s ease;
}

.theme-toggle:hover {
  border-color: var(
    --studio-chrome-user-hover-border,
    rgba(15, 23, 42, 0.16)
  );
  background: var(--studio-chrome-theme-bg-hover, var(--studio-chrome-user-hover-bg, #171a20));
  opacity: 0.92;
}

.theme-toggle-icon {
  display: block;
  width: clamp(18px, 1.1vw, 22px);
  height: clamp(18px, 1.1vw, 22px);
  object-fit: contain;
}

.theme-toggle-icon--to-light,
.theme-toggle-icon--to-dark {
  filter: brightness(0) invert(1);
}

.site-header .header-action-pill.user-menu-trigger--studio {
  max-width: min(100%, 240px);
  border: 1px solid var(--studio-chrome-user-border, rgba(15, 23, 42, 0.12));
  background: var(--studio-chrome-user-bg, transparent);
  color: var(--studio-chrome-user-text, #111827);
  box-shadow: none;
}

.site-header .header-action-pill.user-menu-trigger--studio:hover {
  border-color: var(--studio-chrome-user-hover-border, rgba(15, 23, 42, 0.16));
  background: var(--studio-chrome-user-hover-bg, rgba(15, 23, 42, 0.04));
  box-shadow: none;
}

.user-menu-trigger--studio .user-menu-name {
  font-size: var(--studio-chrome-action-size, clamp(13px, 0.78vw, 15px));
  font-weight: 600;
  letter-spacing: 0;
}

.user-menu-trigger--studio .user-menu-chevron {
  flex-shrink: 0;
  font-size: 16px;
  color: currentColor;
  opacity: 1;
}

.site-header.is-light .theme-toggle:hover {
  background: #1e293b;
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
    padding: clamp(6px, 0.55vw, 8px) clamp(10px, 0.9vw, 14px);
    font-size: var(--studio-chrome-action-size, clamp(12px, 0.95vw, 15px));
  }

  .site-header-actions {
    justify-self: end;
  }

}

.user-menu-trigger:not(.user-menu-trigger--studio) {
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

.user-menu-trigger:not(.user-menu-trigger--studio):hover {
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

  .user-menu-trigger:not(.user-menu-trigger--studio) {
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

.user-menu-item {
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

.user-menu-panel.is-light .user-menu-item {
  color: #0f172a;
}

.user-menu-panel.is-dark .user-menu-item {
  color: #f8fafc;
}

.user-menu-panel.is-light .user-menu-item:hover {
  background: #f8fafd;
  color: #2f6bff;
}

.user-menu-panel.is-dark .user-menu-item:hover {
  background: #1f2937;
  color: #fb923c;
}

.user-menu-item-icon {
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
