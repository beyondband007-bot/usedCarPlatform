<script setup lang="ts">
import { onMounted } from "vue";

import HomeBottomCta from "@/components/business/home/HomeBottomCta.vue";
import HomeCapabilities from "@/components/business/home/HomeCapabilities.vue";
import HomeCaseStudies from "@/components/business/home/HomeCaseStudies.vue";
import HomeFooter from "@/components/business/home/HomeFooter.vue";
import HomeHero from "@/components/business/home/HomeHero.vue";
import HomeQuickAccess from "@/components/business/home/HomeQuickAccess.vue";
import { homePromoBannerImageUrls } from "@/constants/home-promo-banners";
import { homeStaticImageUrls } from "@/constants/home-page";
import { useAppStore } from "@/stores/app";
import {
  registerStaticImageUrls,
  warmStaticImages,
} from "@/utils/static-image-cache";

const appStore = useAppStore();
const staticHomeImageUrls = [...homeStaticImageUrls, ...homePromoBannerImageUrls];

registerStaticImageUrls(staticHomeImageUrls);

onMounted(() => {
  void warmStaticImages(staticHomeImageUrls);
});
</script>

<template>
  <main
    class="home-page"
    :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'"
  >
    <div class="home-first-view">
      <HomeHero />
      <HomeQuickAccess />
    </div>
    <HomeCapabilities />
    <HomeCaseStudies />
    <HomeBottomCta />
    <HomeFooter />
  </main>
</template>

<style scoped lang="scss">
.home-page {
  --home-shell-max: var(--layout-content-max, 1440px);
  --home-space-x: var(--space-page-x, clamp(16px, 2vw, 32px));
  --home-space-y: var(--space-page-y, clamp(16px, 2vw, 28px));
  --home-grid-gap: var(--grid-gap-lg, 24px);
  --home-section-pb: 130px;
  --home-suite-card-height: 259px;
  --home-suite-shell-pb: 0px;
  --home-suite-margin-top: 48px;
  --home-engine-top-gap: 56px;
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

@media (max-width: 1439px) {
  .home-page {
    --home-grid-gap: var(--grid-gap-md, 16px);
  }
}

@media (max-width: 1279px) {
  .home-page {
    --home-suite-card-height: 240px;
    --home-section-pb: 112px;
    --home-suite-margin-top: 24px;
    --home-engine-top-gap: 48px;
  }
}

@media (max-width: 1023px) {
  .home-page {
    --home-suite-card-height: 228px;
    --home-section-pb: 100px;
    --home-suite-shell-pb: 32px;
    --home-suite-margin-top: 20px;
    --home-engine-top-gap: 40px;
  }
}

@media (max-width: 767px) {
  .home-page {
    --home-space-x: 16px;
    --home-grid-gap: var(--grid-gap-sm, 12px);
    --home-suite-card-height: 140px;
    --home-section-pb: 64px;
    --home-suite-shell-pb: 16px;
    --home-suite-margin-top: 12px;
    --home-engine-top-gap: 28px;
    --home-radius-card: 16px;
    --home-radius-media: 12px;
  }
}

.home-first-view {
  display: flex;
  flex-direction: column;
}

.home-page :deep(.suite-shell) {
  flex-shrink: 0;
  margin-top: var(--home-suite-margin-top, 0px);
}

.home-page :deep(#engine.section-block) {
  margin-top: var(--home-engine-top-gap, 48px);
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
  --home-hero-title-light: #1e222b;
  --home-hero-sub-light: #64748b;
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
  --home-badge-bg-hover: #1f1f1f;
  --home-badge-text: #f8fafc;
  --home-badge-border: rgba(255, 255, 255, 0.1);
  --home-tabs-bg: #1a1a1a;
  --home-tab-text: #8a8a8a;
  --home-tab-active-text: #f3f3f3;
  --home-tab-active-bg: transparent;
  --home-case-panel-bg: rgb(49, 49, 49);
  --home-case-panel-title: #ffffff;
  --home-case-panel-desc: rgba(255, 255, 255, 0.82);
  --home-case-panel-label: #f3f3f3;
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
  --home-hero-title-light: #1e222b;
  --home-hero-sub-light: #64748b;
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
  --home-badge-bg: rgb(71, 71, 73);
  --home-badge-bg-hover: rgb(82, 82, 84);
  --home-badge-text: #ffffff;
  --home-badge-border: rgba(255, 255, 255, 0.08);
  --home-tabs-bg: #1a1a1a;
  --home-tab-text: #8a8a8a;
  --home-tab-active-text: #1a1a1a;
  --home-tab-active-bg: #ffffff;
  --home-case-panel-bg: rgb(49, 49, 49);
  --home-case-panel-title: #ffffff;
  --home-case-panel-desc: rgba(255, 255, 255, 0.82);
  --home-case-panel-label: #f3f3f3;
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
</style>
