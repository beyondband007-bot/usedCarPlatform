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
  <main
    class="home-page"
    :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'"
  >
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
  --home-gold: #efc24c;
  --home-gold-strong: #ffd94d;

  position: relative;
  overflow-x: hidden;
  color: var(--home-text);
  background:
    radial-gradient(circle at 50% 4%, var(--home-glow), transparent 24rem),
    var(--home-bg);
  scroll-behavior: smooth;
}

.home-page.theme-dark {
  --home-bg: var(--app-bg);
  --home-panel: #101010;
  --home-line: rgba(255, 255, 255, 0.13);
  --home-text: var(--app-text);
  --home-muted: #8a8a8a;
  --home-glow: rgba(255, 196, 48, 0.1);
  --home-grid-line: rgba(255, 255, 255, 0.018);
  --home-grid-line-alt: rgba(255, 255, 255, 0.014);
  --home-hero-bg: #080808;
  --home-hero-title: #f3f3f3;
  --home-hero-sub: #d5d5d5;
  --home-card-bg: linear-gradient(180deg, #151515, #0b0b0b);
  --home-card-overlay: linear-gradient(90deg, rgba(4, 4, 4, 0.88), rgba(4, 4, 4, 0.18));
  --home-media-overlay: linear-gradient(90deg, rgba(4, 4, 4, 0.88), rgba(4, 4, 4, 0.18));
  --home-media-title: #fff;
  --home-media-desc: #d7d7d7;
  --home-card-title: #f3f3f3;
  --home-card-desc: #d7d7d7;
  --home-card-muted: #8a8a8a;
  --home-card-shine: linear-gradient(110deg, rgba(255, 255, 255, 0.08), transparent 42%);
  --home-card-hover-border: rgba(244, 200, 64, 0.38);
  --home-card-shadow: 0 18px 52px rgba(0, 0, 0, 0.2);
  --home-badge-bg: #111;
  --home-badge-text: #d7d7d7;
  --home-badge-border: rgba(255, 255, 255, 0.08);
  --home-tabs-bg: #101010;
  --home-tab-text: #d7d7d7;
  --home-tab-active-text: #111;
  --home-tab-active-bg: #fff;
  --home-case-panel-bg: linear-gradient(145deg, #121212, #080808);
  --home-metric-bg: #151515;
  --home-footer-bg: #121212;
  --home-footer-nav: #a8a8a8;
  --home-footer-copy: #8b8b8b;
}

.home-page.theme-light {
  --home-bg: var(--app-bg);
  --home-panel: #fcfaf5;
  --home-line: rgba(47, 35, 12, 0.12);
  --home-text: var(--app-text);
  --home-muted: var(--app-text-soft);
  --home-gold: #c98600;
  --home-gold-strong: #efc24c;
  --home-glow: rgba(201, 134, 0, 0.08);
  --home-grid-line: rgba(47, 35, 12, 0.045);
  --home-grid-line-alt: rgba(47, 35, 12, 0.035);
  --home-hero-bg: #080808;
  --home-hero-title: #f3f3f3;
  --home-hero-sub: #d5d5d5;
  --home-card-bg: linear-gradient(180deg, #ffffff, #f8f4ec);
  --home-card-overlay: linear-gradient(90deg, rgba(252, 250, 245, 0.96), rgba(252, 250, 245, 0.42));
  --home-media-overlay: linear-gradient(90deg, rgba(24, 18, 10, 0.8), rgba(24, 18, 10, 0.18));
  --home-media-title: #fff;
  --home-media-desc: rgba(255, 255, 255, 0.84);
  --home-card-title: var(--app-text);
  --home-card-desc: var(--app-text-soft);
  --home-card-muted: var(--app-text-soft);
  --home-card-shine: linear-gradient(110deg, rgba(201, 134, 0, 0.08), transparent 42%);
  --home-card-hover-border: rgba(201, 134, 0, 0.34);
  --home-card-shadow: 0 14px 34px rgba(78, 111, 148, 0.09);
  --home-badge-bg: #fcfaf5;
  --home-badge-text: #4a4032;
  --home-badge-border: rgba(47, 35, 12, 0.1);
  --home-tabs-bg: #f0e8dc;
  --home-tab-text: #6d6456;
  --home-tab-active-text: #241700;
  --home-tab-active-bg: #efc24c;
  --home-case-panel-bg: linear-gradient(145deg, #ffffff, #f5efe4);
  --home-metric-bg: #f0e8dc;
  --home-footer-bg: #ebe4d8;
  --home-footer-nav: #6d6456;
  --home-footer-copy: #8a8274;
}

.home-page::before {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  content: '';
  background:
    linear-gradient(var(--home-grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--home-grid-line-alt) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: linear-gradient(to bottom, black, transparent 72%);
}

.home-page > :deep(*) {
  position: relative;
  z-index: 1;
}
</style>
