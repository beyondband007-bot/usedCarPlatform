<script setup lang="ts">

import { computed, provide } from 'vue'

import { useRoute } from 'vue-router'



import VisitorWorkbenchModal from '@/components/business/home/VisitorWorkbenchModal.vue'

import AppHeader from '@/components/layout/AppHeader.vue'

import AppSubNav from '@/components/layout/AppSubNav.vue'

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



const showSubNav = computed(
  () => authStore.isLoggedIn && isWorkbenchSectionPath(route.path),
)

const isHomePage = computed(() => route.path === '/home')



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

      'app-layout--auth': showSubNav,

      'app-layout--home': isHomePage,

      'app-layout--studio-chrome': usesStudioChrome,

    }"

    :data-subnav="showSubNav ? 'true' : undefined"

  >

    <template v-if="usesStudioChrome">

      <div

        class="home-chrome"

        :class="{

          'home-chrome--with-subnav': showSubNav,

          'home-chrome--light': !appStore.isDarkMode,

        }"

      >

        <AppHeader />

        <AppSubNav v-if="showSubNav" embedded />

      </div>

    </template>

    <template v-else>

      <AppHeader />

      <AppSubNav v-if="showSubNav" />

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
  --studio-chrome-logo-size: clamp(20px, 1.75vw, 30px);
  --studio-chrome-nav-size: clamp(15px, 1.15vw, 19px);
  --studio-chrome-action-size: clamp(12px, 0.95vw, 15px);
  --studio-chrome-nav-gap: clamp(20px, 2.8vw, 56px);

  --studio-chrome-bg: #020202;

  --studio-chrome-header-bg: linear-gradient(to bottom, rgba(2, 2, 2, 0.72), transparent);

  --studio-chrome-logo: #f3f3f3;

  --studio-chrome-nav: #c9c9c9;

  --studio-chrome-nav-hover: #d7d7d7;

  --studio-chrome-nav-active: #f4c840;

  --studio-chrome-nav-underline: #f4c840;

  --studio-chrome-credit-bg: #ffffff;

  --studio-chrome-credit-text: #171100;

  --studio-chrome-theme-bg: rgba(255, 255, 255, 0.08);

  --studio-chrome-theme-text: #f3f3f3;

  --studio-chrome-theme-border: rgba(255, 255, 255, 0.14);

  --studio-chrome-user-border: rgba(255, 255, 255, 0.14);

  --studio-chrome-user-bg: rgba(255, 255, 255, 0.08);

  --studio-chrome-user-text: #f3f3f3;

  --studio-chrome-user-hover-border: rgba(244, 200, 64, 0.42);

  --studio-chrome-user-hover-bg: rgba(255, 255, 255, 0.12);

  --studio-chrome-avatar-bg: rgba(244, 200, 64, 0.16);

  --studio-chrome-avatar-text: #f4c840;



  position: fixed;

  top: 0;

  left: 0;

  right: 0;

  z-index: 50;

  background: var(--studio-chrome-bg);

}



.home-chrome--light {

  --studio-chrome-bg: #ffffff;

  --studio-chrome-header-bg: linear-gradient(to bottom, rgba(255, 255, 255, 0.96), transparent);

  --studio-chrome-logo: #111111;

  --studio-chrome-nav: #666666;

  --studio-chrome-nav-hover: #333333;

  --studio-chrome-nav-active: #9a7209;

  --studio-chrome-nav-underline: #d4a017;

  --studio-chrome-credit-bg: #111111;

  --studio-chrome-credit-text: #ffffff;

  --studio-chrome-theme-bg: rgba(0, 0, 0, 0.05);

  --studio-chrome-theme-text: #333333;

  --studio-chrome-theme-border: rgba(0, 0, 0, 0.1);

  --studio-chrome-user-border: rgba(0, 0, 0, 0.1);

  --studio-chrome-user-bg: rgba(0, 0, 0, 0.04);

  --studio-chrome-user-text: #111111;

  --studio-chrome-user-hover-border: rgba(212, 160, 23, 0.45);

  --studio-chrome-user-hover-bg: rgba(0, 0, 0, 0.06);

  --studio-chrome-avatar-bg: rgba(212, 160, 23, 0.14);

  --studio-chrome-avatar-text: #9a7209;

}



@media (min-width: 1280px) {

  .home-chrome {

    --studio-chrome-pad-x: 32px;

  }

}



.app-layout--studio-chrome:not(.app-layout--home) .app-layout-main {

  padding-top: 96px;

}



.app-layout--studio-chrome[data-subnav='true']:not(.app-layout--home) .app-layout-main {

  padding-top: 140px;

}



.home-chrome--with-subnav :deep(.site-header) {

  padding-bottom: 10px;

  background: var(--studio-chrome-bg);

}



.home-chrome--with-subnav :deep(.subnav--embedded) {

  padding-top: 0;

  margin-top: 0;

}

</style>


