<script setup lang="ts">
import { inject } from 'vue'

import HomeBottomCta from '@/components/business/home/HomeBottomCta.vue'
import HomeCapabilities from '@/components/business/home/HomeCapabilities.vue'
import HomeCaseStudies from '@/components/business/home/HomeCaseStudies.vue'
import HomeFooter from '@/components/business/home/HomeFooter.vue'
import HomeHero from '@/components/business/home/HomeHero.vue'
import HomeQuickAccess from '@/components/business/home/HomeQuickAccess.vue'
import { WORKBENCH_ENTRY_KEY } from '@/composables/workbench-entry-key'

const workbenchEntry = inject(WORKBENCH_ENTRY_KEY)

function openWorkbench() {
  workbenchEntry?.openWorkbench()
}
</script>

<template>
  <main class="home-page">
    <HomeHero @enter-workbench="openWorkbench" />
    <HomeQuickAccess @enter-workbench="openWorkbench" />
    <HomeCapabilities />
    <HomeCaseStudies />
    <HomeBottomCta @enter-workbench="openWorkbench" />
    <HomeFooter />
  </main>
</template>

<style scoped lang="scss">
.home-page {
  --home-bg: var(--app-bg);
  --home-panel: #101010;
  --home-line: rgba(255, 255, 255, 0.13);
  --home-text: #f3f3f3;
  --home-muted: #8a8a8a;
  --home-gold: #f4c840;
  --home-gold-strong: #ffd94d;

  position: relative;
  overflow-x: hidden;
  color: var(--home-text);
  background:
    radial-gradient(circle at 50% 4%, rgba(255, 196, 48, 0.1), transparent 24rem),
    var(--home-bg);
  scroll-behavior: smooth;
}

.home-page::before {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  content: '';
  background:
    linear-gradient(rgba(255, 255, 255, 0.018) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.014) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: linear-gradient(to bottom, black, transparent 72%);
}

.home-page > :deep(*) {
  position: relative;
  z-index: 1;
}
</style>
