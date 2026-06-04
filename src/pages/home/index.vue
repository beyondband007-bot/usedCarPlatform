<script setup lang="ts">
import { inject } from "vue";

import HomeBottomCta from "@/components/business/home/HomeBottomCta.vue";
import HomeCapabilities from "@/components/business/home/HomeCapabilities.vue";
import HomeCaseStudies from "@/components/business/home/HomeCaseStudies.vue";
import HomeFooter from "@/components/business/home/HomeFooter.vue";
import HomeHero from "@/components/business/home/HomeHero.vue";
import HomeQuickAccess from "@/components/business/home/HomeQuickAccess.vue";
import { WORKBENCH_ENTRY_KEY } from "@/composables/workbench-entry-key";
import { useAppStore } from "@/stores/app";

const appStore = useAppStore();
const workbenchEntry = inject(WORKBENCH_ENTRY_KEY);

function openWorkbench() {
  workbenchEntry?.openWorkbench();
}
</script>

<template>
  <main
    class="home-page"
    :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'"
  >
    <HomeHero />
    <HomeQuickAccess />
    <HomeCapabilities />
    <HomeCaseStudies />
    <HomeBottomCta @enter-workbench="openWorkbench" />
    <HomeFooter />
  </main>
</template>

<style scoped lang="scss">
.home-page {
  --home-suite-card-height: 259px;
  --home-suite-peek: calc(var(--home-suite-card-height) / 3);
  --home-suite-top-gap: calc(24px * 0.9);
  --home-hero-bottom-gap: calc(24px * 0.9);
  --home-hero-height-scale: 0.9;
  --home-gold: var(--color-brand-primary);
  --home-gold-strong: var(--color-brand-strong);
  --home-radius-card: 28px;
  --home-radius-media: 22px;
  --home-motion-fast: var(--motion-fast);
  --home-motion-normal: var(--motion-normal);

  position: relative;
  overflow-x: hidden;
  color: var(--home-text);
  background:
    radial-gradient(circle at 50% 4%, var(--home-glow), transparent 24rem),
    var(--home-bg);
  scroll-behavior: smooth;
}

.home-page.theme-dark {
  --home-bg: var(--color-bg-primary);
  --home-panel: var(--color-bg-card);
  --home-line: var(--color-border-primary);
  --home-text: var(--color-text-primary);
  --home-muted: var(--color-text-muted);
  --home-glow: rgba(239, 194, 76, 0.08);
  --home-grid-line: rgba(255, 255, 255, 0.04);
  --home-grid-line-alt: rgba(255, 255, 255, 0.03);
  --home-hero-bg: #080808;
  --home-hero-title: #f3f3f3;
  --home-hero-sub: #d5d5d5;
  --home-card-bg: linear-gradient(180deg, #151515, #0b0b0b);
  --home-card-overlay: linear-gradient(
    90deg,
    rgba(4, 4, 4, 0.88),
    rgba(4, 4, 4, 0.18)
  );
  --home-media-overlay: linear-gradient(
    90deg,
    rgba(4, 4, 4, 0.88),
    rgba(4, 4, 4, 0.18)
  );
  --home-media-overlay-full: linear-gradient(
    90deg,
    rgba(4, 4, 4, 0.88) 0%,
    rgba(4, 4, 4, 0) 50%
  );
  --home-media-title: #fff;
  --home-media-desc: #d5d5d5;
  --home-card-title: #f3f3f3;
  --home-card-desc: #d7d7d7;
  --home-card-muted: #8a8a8a;
  --home-card-shine: linear-gradient(
    110deg,
    rgba(255, 255, 255, 0.08),
    transparent 42%
  );
  --home-card-hover-border: rgba(244, 200, 64, 0.38);
  --home-card-shadow: 0 18px 52px rgba(0, 0, 0, 0.2);
  --home-badge-bg: #101010;
  --home-badge-text: #d5d5d5;
  --home-badge-border: rgba(255, 255, 255, 0.1);
  --home-tabs-bg: #101010;
  --home-tab-text: #8a8a8a;
  --home-tab-active-text: #f3f3f3;
  --home-tab-active-bg: #151515;
  --home-case-panel-bg: linear-gradient(145deg, #151515, #0b0b0b);
  --home-metric-bg: #101010;
  --home-footer-bg: #080808;
  --home-footer-nav: #8a8a8a;
  --home-footer-copy: #666666;
}

.home-page.theme-light {
  --home-bg: var(--app-bg);
  --home-panel: var(--color-bg-card);
  --home-line: var(--color-border-primary);
  --home-text: var(--color-text-primary);
  --home-muted: var(--color-text-muted);
  --home-gold: var(--color-brand-primary);
  --home-gold-strong: var(--color-brand-strong);
  --home-glow: color-mix(in srgb, var(--color-accent-blue) 8%, transparent);
  --home-grid-line: rgba(47, 107, 255, 0.04);
  --home-grid-line-alt: rgba(47, 107, 255, 0.03);
  --home-hero-bg: #080808;
  --home-hero-title: #f3f3f3;
  --home-hero-sub: #d5d5d5;
  --home-card-bg: linear-gradient(180deg, #ffffff, #f8fafd);
  --home-card-overlay: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.96),
    rgba(255, 255, 255, 0.42)
  );
  --home-media-overlay: linear-gradient(
    90deg,
    rgba(24, 18, 10, 0.8),
    rgba(24, 18, 10, 0.18)
  );
  --home-media-overlay-full: linear-gradient(
    90deg,
    rgba(24, 18, 10, 0.8) 0%,
    rgba(24, 18, 10, 0) 50%
  );
  --home-media-title: #fff;
  --home-media-desc: #d5d5d5;
  --home-card-title: var(--color-text-primary);
  --home-card-desc: var(--color-text-secondary);
  --home-card-muted: var(--color-text-muted);
  --home-card-shine: linear-gradient(
    110deg,
    rgba(47, 107, 255, 0.06),
    transparent 42%
  );
  --home-card-hover-border: color-mix(
    in srgb,
    var(--color-accent-blue) 34%,
    transparent
  );
  --home-card-shadow: var(--shadow-panel);
  --home-badge-bg: #f8fafd;
  --home-badge-text: #334155;
  --home-badge-border: #e6ecf5;
  --home-tabs-bg: #f8fafd;
  --home-tab-text: #64748b;
  --home-tab-active-text: #2f6bff;
  --home-tab-active-bg: #f2f7ff;
  --home-case-panel-bg: linear-gradient(145deg, #ffffff, #f8fafd);
  --home-metric-bg: #f8fafd;
  --home-footer-bg: #f8fafd;
  --home-footer-nav: #64748b;
  --home-footer-copy: #94a3b8;
}

.home-page::before {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  content: "";
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

@media (max-width: 700px) {
  .home-page {
    --home-suite-card-height: 210px;
  }
}
</style>
