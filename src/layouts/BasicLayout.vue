<script setup lang="ts">

import { computed, provide } from 'vue'

import { useRoute } from 'vue-router'



import VisitorWorkbenchModal from '@/components/business/home/VisitorWorkbenchModal.vue'

import AppHeader from '@/components/layout/AppHeader.vue'

import { isWorkbenchSectionPath } from '@/constants/app-flow'

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
  () => authStore.isLoggedIn && isWorkbenchSectionPath(route.path),
)

const isHomePage = computed(() => route.path === '/home')
const isPricingPage = computed(() => route.path === '/pricing')



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

      'app-layout--studio-chrome': usesStudioChrome,

    }"

  >

    <template v-if="usesStudioChrome">

      <div

        class="home-chrome"

        :class="{

          'home-chrome--light': !appStore.isDarkMode && !isPricingPage,
          'home-chrome--pricing': isPricingPage,
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



.app-layout:not(.app-layout--auth) .app-layout-main {

  flex: none;

  overflow: visible;

}



.home-chrome {

  --studio-chrome-pad-x: 24px;
  --studio-chrome-header-height: 72px;
  --studio-chrome-logo-size: clamp(20px, 1.75vw, 30px);
  --studio-chrome-nav-size: clamp(15px, 1.15vw, 19px);
  --studio-chrome-action-size: clamp(12px, 0.95vw, 15px);
  --studio-chrome-nav-gap: clamp(20px, 2.8vw, 56px);

  --studio-chrome-bg: #060606;

  --studio-chrome-header-bg: linear-gradient(to bottom, rgba(6, 6, 6, 0.78), transparent);

  --studio-chrome-logo: #f7f1e4;

  --studio-chrome-nav: #c8c1b3;

  --studio-chrome-nav-hover: #efe3c3;

  --studio-chrome-nav-active: #efc24c;

  --studio-chrome-nav-underline: #efc24c;

  --studio-chrome-credit-bg: #efc24c;

  --studio-chrome-credit-text: #221700;

  --studio-chrome-credit-hover: #f4d36a;

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
  --studio-chrome-bg: #f8fafd;
  --studio-chrome-header-bg: #f8fafd;
  --studio-chrome-logo: #0f172a;
  --studio-chrome-nav: #475569;
  --studio-chrome-nav-hover: #2f6bff;
  --studio-chrome-nav-active: #2f6bff;
  --studio-chrome-nav-underline: #2f6bff;
  --studio-chrome-credit-bg: #d4a017;
  --studio-chrome-credit-text: #ffffff;
  --studio-chrome-credit-hover: #e5b85c;
  --studio-chrome-theme-bg: #ffffff;
  --studio-chrome-theme-text: #64748b;
  --studio-chrome-theme-border: #e6ecf5;
  --studio-chrome-user-border: #e6ecf5;
  --studio-chrome-user-bg: #ffffff;
  --studio-chrome-user-text: #0f172a;
  --studio-chrome-user-hover-border: #cfe0ff;
  --studio-chrome-user-hover-bg: #f8fafd;
  --studio-chrome-avatar-bg: #f2f7ff;
  --studio-chrome-avatar-text: #2f6bff;
  --studio-chrome-subnav-bg: #f8fafd;
  --studio-chrome-subnav-border: #e6ecf5;

  border-bottom: 1px solid #e6ecf5;
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
  --studio-chrome-bg: rgba(248, 250, 253, 0.92);
  --studio-chrome-header-bg: rgba(248, 250, 253, 0.92);
  --studio-chrome-logo: #0f172a;
  --studio-chrome-nav: #475569;
  --studio-chrome-nav-hover: #2f6bff;
  --studio-chrome-nav-active: #2f6bff;
  --studio-chrome-nav-underline: #2f6bff;
  --studio-chrome-credit-bg: #d4a017;
  --studio-chrome-credit-text: #ffffff;
  --studio-chrome-credit-hover: #e5b85c;
  --studio-chrome-theme-bg: #ffffff;
  --studio-chrome-theme-text: #64748b;
  --studio-chrome-theme-border: #e6ecf5;
  --studio-chrome-user-border: #e6ecf5;
  --studio-chrome-user-bg: #ffffff;
  --studio-chrome-user-text: #0f172a;
  --studio-chrome-user-hover-border: #cfe0ff;
  --studio-chrome-user-hover-bg: #f8fafd;
  --studio-chrome-avatar-bg: #f2f7ff;
  --studio-chrome-avatar-text: #2f6bff;

  border-bottom: 1px solid rgba(230, 236, 245, 0.95);
  backdrop-filter: blur(16px);
}



@media (min-width: 1280px) {

  .home-chrome {

    --studio-chrome-pad-x: 32px;

  }

}



.app-layout--studio-chrome:not(.app-layout--home) .app-layout-main {

  padding-top: 72px;

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
  padding-top: 72px;
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



</style>
