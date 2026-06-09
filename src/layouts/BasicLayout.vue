<script setup lang="ts">

import { computed, provide } from 'vue'

import { useRoute } from 'vue-router'



import VisitorWorkbenchModal from '@/components/business/home/VisitorWorkbenchModal.vue'

import AppHeader from '@/components/layout/AppHeader.vue'

import { WORKSPACE_ROUTE } from '@/constants/app-flow'

import { useStudioChrome } from '@/composables/useStudioChrome'

import { useWorkbenchEntry } from '@/composables/useWorkbenchEntry'

import { WORKBENCH_ENTRY_KEY } from '@/composables/workbench-entry-key'

import { useAppStore } from '@/stores/app'

import { useAuthStore } from '@/stores/auth'



const authStore = useAuthStore()

const appStore = useAppStore()

const route = useRoute()

const workbenchEntry = useWorkbenchEntry()

const { usesStudioChrome } = useStudioChrome()



provide(WORKBENCH_ENTRY_KEY, workbenchEntry)



const useFixedAppFrame = computed(
  () =>
    authStore.isLoggedIn &&
    (route.path === WORKSPACE_ROUTE ||
      route.path.startsWith(`${WORKSPACE_ROUTE}/`)),
)

const isHomePage = computed(() => route.path === '/home')
const isPricingPage = computed(() => route.path === '/pricing')
const isPointsPage = computed(
  () => route.path === '/credits' || route.path === '/points',
)
const isLoginPage = computed(() => route.path === '/login')



const {

  visitorModalVisible,

  closeVisitorModal,

  goToAuth,

} = workbenchEntry

</script>



<template>

  <div

    class="app-layout bg-[var(--app-bg)] text-[var(--app-text)]"

    :class="{

      'app-layout--auth': useFixedAppFrame,

      'app-layout--home': isHomePage,

      'app-layout--pricing': isPricingPage,

      'app-layout--points': isPointsPage,

      'app-layout--login': isLoginPage,

      'app-layout--studio-chrome': usesStudioChrome,

    }"

  >

    <template v-if="usesStudioChrome">

      <div

        class="home-chrome"

        :class="{

          'home-chrome--light': !appStore.isDarkMode && !isPricingPage,
          'home-chrome--pricing':
            isPricingPage || (isLoginPage && appStore.isDarkMode),
          'home-chrome--pricing-light': !appStore.isDarkMode && isPricingPage,

        }"

      >

        <AppHeader />

      </div>

    </template>

    <template v-else>

      <AppHeader />

    </template>

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

.app-layout--auth .app-layout-main {
  overflow: hidden;
}

.app-layout--auth .app-layout-main > :deep(*) {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}



.app-layout:not(.app-layout--auth) .app-layout-main {

  flex: none;

  overflow: visible;

}



.home-chrome {

  --studio-chrome-pad-x: 24px;
  --studio-chrome-header-height: 72px;
  --studio-chrome-logo-size: 21px;
  --studio-chrome-nav-size: clamp(14px, 0.85vw, 16px);
  --studio-chrome-action-size: clamp(13px, 0.78vw, 15px);
  --studio-chrome-nav-gap: clamp(20px, 2.8vw, 56px);

  --studio-chrome-bg: #060606;

  --studio-chrome-header-bg: linear-gradient(to bottom, rgba(6, 6, 6, 0.78), transparent);

  --studio-chrome-logo: #f7f1e4;

  --studio-chrome-nav: #c8c1b3;

  --studio-chrome-nav-hover: #efe3c3;

  --studio-chrome-nav-active: #efc24c;

  --studio-chrome-nav-underline: #efc24c;

  --studio-chrome-nav-underline-hover: #fff;

  --studio-chrome-nav-underline-active: #efc24c;

  --studio-chrome-credit-bg: #ffffff;

  --studio-chrome-credit-text: #0f172a;

  --studio-chrome-credit-border: rgba(255, 255, 255, 0.32);

  --studio-chrome-credit-hover: rgba(255, 255, 255, 0.92);

  --studio-chrome-theme-bg: rgba(255, 255, 255, 0.05);

  --studio-chrome-theme-text: #f7f1e4;

  --studio-chrome-theme-border: rgba(239, 194, 76, 0.18);

  --studio-chrome-user-border: var(--studio-chrome-credit-border);

  --studio-chrome-user-bg: rgba(255, 255, 255, 0.05);

  --studio-chrome-user-text: #f7f1e4;

  --studio-chrome-user-hover-border: var(--studio-chrome-credit-border);

  --studio-chrome-user-hover-bg: rgba(255, 255, 255, 0.06);

  --studio-chrome-avatar-bg: rgba(239, 194, 76, 0.14);

  --studio-chrome-avatar-text: #efc24c;

  --studio-chrome-subnav-bg: #040404;
  --studio-chrome-subnav-border: rgba(239, 194, 76, 0.08);



  position: fixed;

  top: 0;

  left: 0;

  right: 0;

  z-index: 50;

  background: var(--studio-chrome-bg);
  border-bottom: 1px solid rgba(239, 194, 76, 0.08);
  backdrop-filter: blur(12px);

}



.home-chrome--light {
  --studio-chrome-bg: rgb(224, 234, 242);
  --studio-chrome-header-bg: rgb(224, 234, 242);
  --studio-chrome-logo: #0f172a;
  --studio-chrome-nav: #475569;
  --studio-chrome-nav-hover: #0f172a;
  --studio-chrome-nav-active: #0f172a;
  --studio-chrome-nav-underline: #0f172a;
  --studio-chrome-nav-underline-hover: #0f172a;
  --studio-chrome-nav-underline-active: #0f172a;
  --studio-chrome-credit-bg: #d4a017;
  --studio-chrome-credit-text: #ffffff;
  --studio-chrome-credit-border: #d4a017;
  --studio-chrome-credit-hover: rgba(212, 160, 23, 0.88);
  --studio-chrome-theme-bg: #0f172a;
  --studio-chrome-theme-text: #ffffff;
  --studio-chrome-theme-border: transparent;
  --studio-chrome-user-border: rgba(15, 23, 42, 0.12);
  --studio-chrome-user-bg: transparent;
  --studio-chrome-user-text: #0f172a;
  --studio-chrome-user-hover-border: rgba(15, 23, 42, 0.16);
  --studio-chrome-user-hover-bg: rgba(15, 23, 42, 0.04);
  --studio-chrome-subnav-bg: rgb(224, 234, 242);
  --studio-chrome-subnav-border: #d5e0ea;

  border-bottom: 1px solid #d5e0ea;
}

.home-chrome--pricing {
  --studio-chrome-bg: #060606;
  --studio-chrome-header-bg: linear-gradient(to bottom, rgba(6, 6, 6, 0.88), rgba(6, 6, 6, 0.88));
  --studio-chrome-logo: #f7f1e4;
  --studio-chrome-nav: #c8c1b3;
  --studio-chrome-nav-hover: #efe3c3;
  --studio-chrome-nav-active: #efc24c;
  --studio-chrome-nav-underline: #efc24c;
  --studio-chrome-credit-bg: #efc24c;
  --studio-chrome-credit-text: #221700;
  --studio-chrome-theme-bg: rgba(255, 255, 255, 0.05);
  --studio-chrome-theme-text: #f7f1e4;
  --studio-chrome-theme-border: rgba(239, 194, 76, 0.18);
  --studio-chrome-user-border: rgba(239, 194, 76, 0.18);
  --studio-chrome-user-bg: rgba(255, 255, 255, 0.05);
  --studio-chrome-user-text: #f7f1e4;
  --studio-chrome-user-hover-border: rgba(239, 194, 76, 0.42);
  --studio-chrome-user-hover-bg: rgba(239, 194, 76, 0.08);
  --studio-chrome-avatar-bg: rgba(239, 194, 76, 0.14);
  --studio-chrome-avatar-text: #efc24c;
}

.home-chrome--pricing.home-chrome--pricing-light {
  --studio-chrome-bg: rgb(224, 234, 242);
  --studio-chrome-header-bg: rgb(224, 234, 242);
  --studio-chrome-logo: #0f172a;
  --studio-chrome-nav: #475569;
  --studio-chrome-nav-hover: #0f172a;
  --studio-chrome-nav-active: #0f172a;
  --studio-chrome-nav-underline: #0f172a;
  --studio-chrome-nav-underline-hover: #0f172a;
  --studio-chrome-nav-underline-active: #0f172a;
  --studio-chrome-credit-bg: #d4a017;
  --studio-chrome-credit-text: #ffffff;
  --studio-chrome-credit-border: #d4a017;
  --studio-chrome-credit-hover: rgba(212, 160, 23, 0.88);
  --studio-chrome-theme-bg: #0f172a;
  --studio-chrome-theme-text: #ffffff;
  --studio-chrome-theme-border: transparent;
  --studio-chrome-user-border: rgba(15, 23, 42, 0.12);
  --studio-chrome-user-bg: transparent;
  --studio-chrome-user-text: #0f172a;
  --studio-chrome-user-hover-border: rgba(15, 23, 42, 0.16);
  --studio-chrome-user-hover-bg: rgba(15, 23, 42, 0.04);
  --studio-chrome-subnav-bg: rgb(224, 234, 242);
  --studio-chrome-subnav-border: #d5e0ea;

  border-bottom: 1px solid #d5e0ea;
  backdrop-filter: none;
}



.home-chrome:not(.home-chrome--light):not(.home-chrome--pricing-light) :deep(.credit-pill) {
  border: 1px solid var(--studio-chrome-credit-border, rgba(255, 255, 255, 0.32));
  background: var(--studio-chrome-credit-bg, transparent);
  color: var(--studio-chrome-credit-text, #f7f1e4);
}

.home-chrome:not(.home-chrome--light):not(.home-chrome--pricing-light)
  :deep(.credit-pill:hover) {
  background: var(--studio-chrome-credit-hover, rgba(255, 255, 255, 0.06));
}

@media (min-width: 1280px) {

  .home-chrome {

    --studio-chrome-pad-x: 32px;

  }

}

@media (max-width: 767px) {

  .home-chrome {

    --studio-chrome-header-height: 64px;

    --studio-chrome-pad-x: 16px;

  }

  .home-chrome--light {

    --studio-chrome-bg: #f6fbff;

    --studio-chrome-header-bg: linear-gradient(180deg, #f6fbff 0%, #e7f1fa 100%);

    --studio-chrome-subnav-bg: #f6fbff;

    border-bottom-color: #d7e4ee;

    backdrop-filter: none;

  }

}



.app-layout--studio-chrome:not(.app-layout--home) .app-layout-main {

  padding-top: var(--app-header-offset);

}

.app-layout--studio-chrome.app-layout--auth .app-layout-main {
  box-sizing: border-box;
  flex: 0 0 calc(100dvh - var(--app-header-offset));
  height: calc(100dvh - var(--app-header-offset));
  max-height: calc(100dvh - var(--app-header-offset));
  margin-top: var(--app-header-offset);
  padding-top: 0;
  overflow: hidden;
}

.app-layout--studio-chrome.app-layout--auth .app-layout-main > :deep(*) {
  height: 100%;
  max-height: 100%;
}



.app-layout--studio-chrome.app-layout--pricing {
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
  background: transparent;
}

.app-layout--studio-chrome.app-layout--pricing .app-layout-main {
  box-sizing: border-box;
  height: 100dvh;
  max-height: 100dvh;
  padding-top: var(--app-header-offset);
  overflow-x: hidden;
  overflow-y: auto;
}

.app-layout--pricing:not(.app-layout--studio-chrome) {
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
}

.app-layout--pricing:not(.app-layout--studio-chrome) .app-layout-main {
  box-sizing: border-box;
  height: calc(100dvh - var(--app-header-offset));
  max-height: calc(100dvh - var(--app-header-offset));
  overflow: hidden;
}

.app-layout--studio-chrome.app-layout--points {
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
  background: transparent;
}

.app-layout--studio-chrome.app-layout--points .app-layout-main {
  box-sizing: border-box;
  height: 100dvh;
  max-height: 100dvh;
  padding-top: var(--app-header-offset);
  overflow-x: hidden;
  overflow-y: auto;
}

.app-layout--studio-chrome.app-layout--points .app-layout-main > :deep(*) {
  min-height: 100%;
  height: auto;
}

.app-layout--points:not(.app-layout--studio-chrome) {
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
}

.app-layout--points:not(.app-layout--studio-chrome) .app-layout-main {
  box-sizing: border-box;
  height: calc(100dvh - var(--app-header-offset));
  max-height: calc(100dvh - var(--app-header-offset));
  overflow-x: hidden;
  overflow-y: auto;
}

.app-layout--studio-chrome.app-layout--login {
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
  background: var(--app-bg);
}

.app-layout--studio-chrome.app-layout--login .app-layout-main {
  box-sizing: border-box;
  height: 100dvh;
  max-height: 100dvh;
  padding-top: var(--app-header-offset);
  overflow: hidden;
}

.app-layout--studio-chrome.app-layout--login .app-layout-main > :deep(*) {
  height: 100%;
  min-height: 0;
}

</style>
