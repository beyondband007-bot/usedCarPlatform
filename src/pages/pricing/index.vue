<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { ref } from "vue";

import PricingPlanCard from "@/components/business/pricing/PricingPlanCard.vue";
import {
  pricingFooterFeatures,
  pricingPageCopy,
  pricingPlans,
} from "@/constants/prototype";
import { useAppStore } from "@/stores/app";

import pricingHeroBg from "@/assets/img/pricing-hero-bg.png";

const copy = pricingPageCopy;
const appStore = useAppStore();

const selectedPlanName = ref("企业团队档");
const pressingPlanName = ref<string | null>(null);

const pageStyle = {
  "--pricing-bg-image": `url(${pricingHeroBg})`,
};

function handlePlanPointerDown(name: string) {
  pressingPlanName.value = name;
}

function clearPlanPress() {
  pressingPlanName.value = null;
}

function handlePlanSelect(name: string) {
  selectedPlanName.value = name;
}
</script>

<template>
  <main
    class="pricing-page"
    :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'"
    :style="pageStyle"
  >
    <div class="pricing-bg" aria-hidden="true" />

    <section class="pricing-shell" aria-label="企业套餐">
      <header class="pricing-hero">
        <h1>{{ copy.title }}</h1>
        <p>{{ copy.plansSubtitle }}</p>
      </header>

      <div id="pricing-plans" class="pricing-plans-grid">
        <PricingPlanCard
          v-for="(plan, index) in pricingPlans"
          :key="plan.name"
          :plan="plan"
          :index="index"
          :selected="selectedPlanName === plan.name"
          :pressing="pressingPlanName === plan.name"
          @select="handlePlanSelect(plan.name)"
          @pointerdown="handlePlanPointerDown(plan.name)"
          @pointerup="clearPlanPress"
          @pointerleave="clearPlanPress"
          @pointercancel="clearPlanPress"
        />
      </div>

      <section class="pricing-footer-bar" aria-label="套餐服务承诺">
        <article
          v-for="item in pricingFooterFeatures"
          :key="item.title"
          class="footer-feature"
        >
          <span class="footer-feature-icon" aria-hidden="true">
            <Icon :icon="item.icon" />
          </span>
          <div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.desc }}</p>
          </div>
        </article>
      </section>
    </section>
  </main>
</template>

<style scoped lang="scss">
.pricing-page {
  --pricing-accent: #d4a843;
  --pricing-accent-strong: #efc24c;
  --pricing-accent-soft: rgba(239, 194, 76, 0.14);
  --pricing-hero-text: #f8fafc;
  --pricing-hero-sub: rgba(248, 250, 252, 0.62);
  --pricing-footer-bg: rgba(8, 10, 16, 0.62);
  --pricing-footer-border: rgba(255, 255, 255, 0.1);
  --pricing-footer-icon-bg: rgba(239, 194, 76, 0.1);
  --pricing-footer-icon-border: rgba(239, 194, 76, 0.24);
  --pricing-bg-fallback: #06080e;
  --pricing-bg-overlay:
    linear-gradient(180deg, rgba(6, 8, 14, 0.18) 0%, rgba(6, 8, 14, 0.42) 48%, rgba(6, 8, 14, 0.72) 100%);
  --pricing-shell-max: min(1280px, 100%);
  --pricing-card-min: min(100%, 300px);

  box-sizing: border-box;
  position: relative;
  width: 100%;
  max-width: 100%;
  min-height: calc(100dvh - var(--app-header-offset));
  padding: clamp(20px, 3vw, 48px) clamp(16px, 2.5vw, 40px) clamp(32px, 4vw, 64px);
  overflow-x: clip;
  background: transparent;
  color: var(--app-text);
}

.pricing-page.theme-light {
  --pricing-accent: #b8860b;
  --pricing-accent-strong: #c9972e;
  --pricing-accent-soft: rgba(201, 151, 46, 0.12);
  --pricing-hero-text: #0f172a;
  --pricing-hero-sub: #64748b;
  --pricing-footer-bg: rgba(255, 255, 255, 0.82);
  --pricing-footer-border: rgba(15, 23, 42, 0.08);
  --pricing-footer-icon-bg: rgba(201, 151, 46, 0.1);
  --pricing-footer-icon-border: rgba(201, 151, 46, 0.22);
  --pricing-bg-fallback: #eef2f6;
  --pricing-bg-overlay:
    linear-gradient(180deg, rgba(248, 250, 252, 0.52) 0%, rgba(241, 245, 249, 0.72) 48%, rgba(238, 242, 246, 0.88) 100%);
}

.pricing-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-color: var(--pricing-bg-fallback);
  background-image: var(--pricing-bg-image);
  background-repeat: no-repeat;
  background-position: center center;
  background-size: cover;
}

.pricing-bg::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--pricing-bg-overlay);
}

.pricing-shell {
  position: relative;
  z-index: 1;
  container-type: inline-size;
  container-name: pricing-shell;
  width: var(--pricing-shell-max);
  max-width: 100%;
  min-width: 0;
  margin: 0 auto;
}

.pricing-hero {
  text-align: center;
  margin-bottom: clamp(24px, 3vw, 48px);
}

.pricing-hero h1 {
  margin: 0;
  color: var(--pricing-hero-text);
  font-size: clamp(28px, 2.2rem + 1.2vw, 48px);
  font-weight: 900;
  letter-spacing: 0.02em;
  line-height: 1.2;
}

.pricing-hero p {
  max-width: min(640px, 100%);
  margin: 14px auto 0;
  color: var(--pricing-hero-sub);
  font-size: clamp(13px, 0.85rem + 0.3vw, 16px);
  font-weight: 600;
  line-height: 1.7;
}

.pricing-plans-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(14px, 1.6vw, 24px);
  align-items: stretch;
  width: 100%;
  min-width: 0;
  scroll-margin-top: 96px;
}

.pricing-footer-bar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(12px, 1.4vw, 20px);
  width: 100%;
  min-width: 0;
  margin-top: clamp(28px, 3vw, 48px);
  padding: clamp(16px, 1.8vw, 24px);
  border: 1px solid var(--pricing-footer-border);
  border-radius: 16px;
  background: var(--pricing-footer-bg);
  backdrop-filter: blur(16px);
}

.footer-feature {
  display: flex;
  gap: 14px;
  min-width: 0;
}

.footer-feature > div {
  min-width: 0;
}

.footer-feature-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--pricing-footer-icon-border);
  border-radius: 12px;
  background: var(--pricing-footer-icon-bg);
  color: var(--pricing-accent-strong);
  font-size: 22px;
}

.footer-feature h3 {
  margin: 0;
  color: var(--pricing-hero-text);
  font-size: clamp(13px, 0.8rem + 0.2vw, 15px);
  font-weight: 800;
}

.footer-feature p {
  margin: 6px 0 0;
  color: var(--pricing-hero-sub);
  font-size: clamp(12px, 0.75rem + 0.15vw, 13px);
  font-weight: 600;
  line-height: 1.55;
}

@container pricing-shell (max-width: 1024px) {
  .pricing-plans-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pricing-footer-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@container pricing-shell (max-width: 640px) {
  .pricing-plans-grid,
  .pricing-footer-bar {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 1024px) {
  .pricing-plans-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pricing-footer-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .pricing-plans-grid,
  .pricing-footer-bar {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .pricing-bg {
    background-position: center 38%;
  }
}

@media (max-width: 480px) {
  .pricing-page {
    padding-inline: 14px;
  }
}

@media (min-aspect-ratio: 21/9) {
  .pricing-bg {
    background-size: cover;
    background-position: center 55%;
  }
}

@media (max-aspect-ratio: 3/4) {
  .pricing-bg {
    background-position: center 32%;
  }
}
</style>
