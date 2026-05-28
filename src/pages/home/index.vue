<script setup lang="ts">
import { inject } from 'vue'

import HomeBottomCta from '@/components/business/home/HomeBottomCta.vue'
import HomeCapabilities from '@/components/business/home/HomeCapabilities.vue'
import HomeCaseStudies from '@/components/business/home/HomeCaseStudies.vue'
import HomeFooter from '@/components/business/home/HomeFooter.vue'
import HomeHero from '@/components/business/home/HomeHero.vue'
import HomeQuickAccess from '@/components/business/home/HomeQuickAccess.vue'
import { WORKBENCH_ENTRY_KEY } from '@/composables/workbench-entry-key'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const workbenchEntry = inject(WORKBENCH_ENTRY_KEY)

function openWorkbench() {
  workbenchEntry?.openWorkbench()
}
</script>

<template>
  <main class="home-page" :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'">
    <HomeHero @enter-workbench="openWorkbench" />
    <HomeQuickAccess @enter-workbench="openWorkbench" />
    <HomeCapabilities />
    <HomeCaseStudies />
    <HomeBottomCta />
    <HomeFooter />
  </main>
</template>

<style scoped lang="scss">
.home-page {
  --home-bg: #ffffff;
  --home-section-bg: #f0f7ff;
  --home-surface: #ffffff;
  --home-surface-strong: #ffffff;
  --home-border: rgba(15, 35, 60, 0.1);
  --home-text: #10233c;
  --home-muted: #5c708c;
  --home-soft: #e8eef6;
  --home-accent: #e8b85a;
  --home-accent-strong: #d89a2f;
  --home-blue: #2f7cff;
  --home-green: #1fb981;
  --home-shadow-soft: 0 12px 40px rgba(15, 35, 60, 0.08);
  --home-card-image-filter: saturate(0.96) brightness(1);

  overflow-x: hidden;
  background: var(--home-bg);
  color: var(--home-text);
}

.home-page.theme-dark {
  --home-bg: #060a12;
  --home-section-bg: #0a101c;
  --home-surface: #101827;
  --home-surface-strong: #121c2e;
  --home-border: rgba(255, 255, 255, 0.1);
  --home-text: #f8fafc;
  --home-muted: #94a3b8;
  --home-soft: #0d1422;
  --home-accent: #f5ca74;
  --home-accent-strong: #f2aa3b;
  --home-blue: #4a91ff;
  --home-green: #22c58b;
  --home-shadow-soft: 0 16px 48px rgba(0, 0, 0, 0.32);
  --home-card-image-filter: saturate(0.92) brightness(0.88);
}
</style>
