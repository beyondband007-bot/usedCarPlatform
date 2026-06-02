<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { computed, inject, ref } from "vue";

import PricingPlanCard from "@/components/business/pricing/PricingPlanCard.vue";
import { WORKBENCH_ENTRY_KEY } from "@/composables/workbench-entry-key";
import {
  pricingFooterFeatures,
  pricingPageCopy,
  pricingPlans,
} from "@/constants/prototype";
import { useAppStore } from "@/stores/app";

import pricingHeroBgDark from "@/assets/img/pricing-hero-bg.png";
import pricingHeroBgLight from "@/assets/img/pricing-hero-bg-light.png";

const copy = pricingPageCopy;
const appStore = useAppStore();
const workbenchEntry = inject(WORKBENCH_ENTRY_KEY);

const selectedPlanName = ref<string | null>(null);
const pressingPlanName = ref<string | null>(null);

const pageStyle = computed(() => ({
  "--pricing-bg-image": `url(${appStore.isDarkMode ? pricingHeroBgDark : pricingHeroBgLight})`,
}));

function handlePlanPointerDown(name: string) {
  pressingPlanName.value = name;
}

function clearPlanPress() {
  pressingPlanName.value = null;
}

function handlePlanSelect(name: string) {
  selectedPlanName.value = name;
}

function handlePlanConsult() {
  workbenchEntry?.openVisitorModal();
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
          @consult="handlePlanConsult"
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
  --pricing-accent: #d6aa2f;
  --pricing-accent-strong: #f4c84a;
  --pricing-hero-text: #f8fafc;
  --pricing-hero-sub: rgba(248, 250, 252, 0.76);
  --pricing-footer-bg: rgba(5, 6, 8, 0.64);
  --pricing-footer-border: rgba(255, 255, 255, 0.18);
  --pricing-footer-icon-bg: rgba(244, 200, 74, 0.11);
  --pricing-footer-icon-border: rgba(244, 200, 74, 0.24);
  --pricing-bg-fallback: #020303;
  --pricing-bg-overlay:
    radial-gradient(circle at 50% 44%, rgba(255, 255, 255, 0.04), transparent 26%),
    linear-gradient(180deg, rgba(0, 0, 0, 0.34) 0%, rgba(0, 0, 0, 0.32) 45%, rgba(0, 0, 0, 0.68) 100%);

  box-sizing: border-box;
  display: flex;
  width: 100%;
  height: auto;
  min-height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: clamp(34px, 5.2vh, 64px) clamp(14px, 4.9vw, 102px) clamp(20px, 3.4vh, 44px);
  overflow: visible;
  background: var(--pricing-bg-fallback);
  color: #f8fafc;
}

.pricing-page.theme-light {
  --pricing-accent: #d4a017;
  --pricing-accent-strong: #e5b85c;
  --pricing-primary: #2f6bff;
  --pricing-primary-strong: #1d5ae8;
  --pricing-primary-soft: #edf4ff;
  --pricing-hero-text: #0f172a;
  --pricing-hero-sub: #64748b;
  --pricing-footer-bg: rgba(255, 255, 255, 0.9);
  --pricing-footer-border: #e2e8f0;
  --pricing-footer-icon-bg: rgba(47, 107, 255, 0.08);
  --pricing-footer-icon-border: rgba(47, 107, 255, 0.2);
  --pricing-bg-fallback: #f6f9fc;
  --pricing-bg-overlay:
    radial-gradient(circle at 50% 18%, rgba(255, 255, 255, 0.78), transparent 52%),
    linear-gradient(
      180deg,
      rgba(246, 249, 252, 0.84) 0%,
      rgba(246, 249, 252, 0.52) 46%,
      rgba(246, 249, 252, 0.9) 100%
    );

  color: var(--pricing-hero-text);
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
  /* 在默认尺寸基础上累计缩小：先 10%，再 15% → 0.9 × 0.85 */
  --pricing-content-scale: 0.765;

  position: relative;
  z-index: 1;
  display: flex;
  width: min(calc(100vw - 56px), calc((100dvh - 72px) * 1.65));
  height: auto;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  gap: 0;
  align-items: center;
  zoom: var(--pricing-content-scale);
}

@supports not (zoom: 1) {
  .pricing-shell {
    transform: scale(var(--pricing-content-scale));
    transform-origin: top center;
  }
}

.pricing-hero {
  flex: 0 0 auto;
  margin-bottom: 48px;
  text-align: center;
}

.pricing-hero h1 {
  margin: 0;
  color: var(--pricing-hero-text);
  font-size: clamp(30px, min(3.2vw, 4.6vh), 50px);
  font-weight: 950;
  letter-spacing: 0.02em;
  line-height: 1.08;
  text-shadow: 0 2px 16px rgba(255, 255, 255, 0.72);
}

.pricing-page.theme-dark .pricing-hero h1 {
  text-shadow: 0 3px 18px rgba(0, 0, 0, 0.42);
}

.pricing-hero p {
  max-width: min(720px, 100%);
  margin: clamp(12px, 1.5vh, 18px) auto 0;
  color: var(--pricing-hero-sub);
  font-size: clamp(15px, min(1.55vw, 2.2vh), 24px);
  font-weight: 500;
  line-height: 1.35;
  text-shadow: 0 1px 10px rgba(255, 255, 255, 0.65);
}

.pricing-page.theme-dark .pricing-hero p {
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.58);
}

.pricing-plans-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(18px, 3.1vw, 42px);
  align-items: center;
  width: 100%;
  min-width: 0;
  margin-bottom: clamp(24px, 3.5vh, 54px);
}

.pricing-footer-bar {
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(16px, 3.2vw, 58px);
  width: 100%;
  min-width: 0;
  min-height: clamp(120px, 12vh, 148px);
  padding: clamp(24px, 2.8vh, 32px) clamp(26px, 4.8vw, 84px);
  border: 1px solid var(--pricing-footer-border);
  border-radius: 28px;
  background: var(--pricing-footer-bg);
  backdrop-filter: blur(18px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.65),
    0 12px 40px rgba(15, 23, 42, 0.08);
}

.pricing-page.theme-dark .pricing-footer-bar {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 20px 70px rgba(0, 0, 0, 0.28);
}

.footer-feature {
  display: flex;
  justify-content: center;
  gap: clamp(10px, 1.3vw, 18px);
  min-width: 0;
  align-items: center;
  text-align: center;
}

.footer-feature > div {
  min-width: 0;
}

.footer-feature-icon {
  display: none;
  flex: 0 0 auto;
  place-items: center;
  width: clamp(34px, 3.4vw, 48px);
  height: clamp(34px, 3.4vw, 48px);
  border: 1px solid var(--pricing-footer-icon-border);
  border-radius: 14px;
  background: var(--pricing-footer-icon-bg);
  color: var(--pricing-accent-strong);
  font-size: clamp(18px, 1.7vw, 24px);
}

.footer-feature h3 {
  margin: 0;
  color: var(--pricing-hero-text);
  font-size: 32px;
  font-weight: 900;
  line-height: 1.3;
  white-space: nowrap;
}

.footer-feature p {
  margin: 4px 0 0;
  color: var(--pricing-hero-sub);
  font-size: 20px;
  font-weight: 600;
  line-height: 1.35;
}

@media (max-height: 760px) {
  .pricing-hero p {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
  }
}

@media (max-height: 820px) {
  .pricing-page {
    padding-top: clamp(26px, 4.2vh, 36px);
    padding-bottom: clamp(12px, 2vh, 18px);
  }

  .pricing-plans-grid {
    margin-bottom: clamp(14px, 2.1vh, 22px);
  }

  .pricing-hero h1 {
    font-size: clamp(26px, 4.3vh, 34px);
  }

  .pricing-hero p {
    margin-top: 8px;
    font-size: clamp(13px, 2vh, 16px);
  }

  .pricing-footer-bar {
    min-height: 108px;
    padding-block: 20px;
  }
}

@media (max-width: 900px) {
  .pricing-page {
    padding: 28px 14px 18px;
    overflow-x: auto;
  }

  .pricing-shell {
    width: min(980px, calc(100vw - 28px), calc((100dvh - 72px) * 1.65));
  }

  .pricing-plans-grid {
    margin-bottom: 18px;
  }

  .pricing-footer-bar {
    padding-inline: 18px;
    gap: 12px;
  }

  .footer-feature {
    justify-content: flex-start;
  }
}
</style>
