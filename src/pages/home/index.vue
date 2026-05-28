<script setup lang="ts">
import HomeFeatureGrid from '@/components/business/home/HomeFeatureGrid.vue'
import HomeHero from '@/components/business/home/HomeHero.vue'
import HomeWorkflow from '@/components/business/home/HomeWorkflow.vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
</script>

<template>
  <main class="home-page" :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'">
    <HomeHero />
    <HomeFeatureGrid />
    <HomeWorkflow />
  </main>
</template>

<style scoped lang="scss">
.home-page {
  --home-bg: #f3f6fb;
  --home-surface: rgba(255, 255, 255, 0.82);
  --home-surface-strong: rgba(255, 255, 255, 0.94);
  --home-border: rgba(112, 132, 158, 0.24);
  --home-text: #101928;
  --home-muted: #66758d;
  --home-soft: #e8eef6;
  --home-accent: #f4c86f;
  --home-accent-strong: #d89a2f;
  --home-blue: #2f7cff;
  --home-green: #1fb981;
  --home-shadow: 0 24px 70px rgba(68, 92, 122, 0.14);
  --home-hero-overlay:
    linear-gradient(90deg, rgba(246, 250, 255, 0.92) 0%, rgba(246, 250, 255, 0.58) 36%, rgba(10, 18, 30, 0.28) 100%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(243, 246, 251, 0.86) 100%);
  --home-hero-image-filter: saturate(0.96) brightness(1.06);
  --home-card-image-filter: saturate(0.9) brightness(0.98);
  --home-hero-text: #101928;
  --home-hero-muted: #34425a;

  min-height: calc(100vh - var(--app-header-offset));
  overflow-x: hidden;
  background: var(--home-bg);
  color: var(--home-text);
}

.home-page.theme-dark {
  --home-bg: #060a12;
  --home-surface: rgba(16, 20, 31, 0.82);
  --home-surface-strong: rgba(18, 23, 35, 0.94);
  --home-border: rgba(255, 255, 255, 0.12);
  --home-text: #f8fafc;
  --home-muted: #95a3b8;
  --home-soft: #121722;
  --home-accent: #f5ca74;
  --home-accent-strong: #f2aa3b;
  --home-blue: #4a91ff;
  --home-green: #22c58b;
  --home-shadow: 0 28px 88px rgba(0, 0, 0, 0.34);
  --home-hero-overlay:
    linear-gradient(90deg, rgba(4, 8, 15, 0.96) 0%, rgba(6, 10, 17, 0.82) 38%, rgba(6, 10, 17, 0.22) 100%),
    linear-gradient(180deg, rgba(5, 8, 14, 0.12) 0%, rgba(6, 10, 18, 0.96) 100%);
  --home-hero-image-filter: saturate(1.08) brightness(0.64);
  --home-card-image-filter: saturate(0.96) brightness(0.84);
  --home-hero-text: #ffffff;
  --home-hero-muted: #e4edf8;
}
</style>
