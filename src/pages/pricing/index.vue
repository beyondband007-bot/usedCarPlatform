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
import { mediaUrls } from "@/constants/media-urls";
import { useAppStore } from "@/stores/app";

const copy = pricingPageCopy;
const appStore = useAppStore();
const pricingHeroBgDark = mediaUrls.pricing.heroBgDark;
const pricingHeroBgLight = mediaUrls.pricing.heroBgLight;
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
      <div class="pricing-top-content">
        <header class="pricing-hero">
          <h1>{{ copy.title }}</h1>
          <p class="pricing-hero-intro">{{ copy.plansSubtitle }}</p>
        </header>

        <div id="pricing-plans" class="pricing-plans-grid">
          <PricingPlanCard
            v-for="plan in pricingPlans"
            :key="plan.name"
            :plan="plan"
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
      </div>

      <div class="pricing-footer-spacer" aria-hidden="true" />

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
  --pricing-footer-bg: rgba(11, 12, 13, 0.5);
  --pricing-footer-border: rgba(255, 255, 255, 0.08);
  --pricing-intro-color: rgb(12, 13, 13);
  --pricing-footer-title: #f8fafc;
  --pricing-footer-sub: rgba(248, 250, 252, 0.76);
  --pricing-footer-icon-bg: rgba(244, 200, 74, 0.11);
  --pricing-footer-icon-border: rgba(244, 200, 74, 0.24);
  --pricing-bg-fallback: #020303;

  box-sizing: border-box;
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: clamp(34px, 5.2vh, 64px) clamp(14px, 4.9vw, 102px)
    clamp(24px, 3.5vh, 48px);
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
  --pricing-footer-bg: rgba(11, 12, 13, 0.8);
  --pricing-footer-border: rgba(255, 255, 255, 0.08);
  --pricing-intro-color: rgb(12, 13, 13);
  --pricing-footer-title: #f8fafc;
  --pricing-footer-sub: rgba(248, 250, 252, 0.76);
  --pricing-footer-icon-bg: rgba(244, 200, 74, 0.11);
  --pricing-footer-icon-border: rgba(244, 200, 74, 0.24);
  --pricing-bg-fallback: #f6f9fc;

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

.pricing-shell {
  /* 在默认尺寸基础上累计缩小：先 10%，再 15% → 0.9 × 0.85 */
  --pricing-content-scale: 0.765;
  /* 与套餐卡片 border-radius: clamp(22px, 7.2cqw, 44px) 对齐（卡片约为 shell 宽 1/3） */
  --pricing-card-radius: clamp(22px, calc(7.2cqw / 3), 44px);

  container-type: inline-size;
  position: relative;
  z-index: 1;
  display: flex;
  width: min(calc(100vw - 56px), calc((100dvh - 72px) * 1.65));
  height: 100%;
  min-width: 0;
  min-height: 100%;
  flex-direction: column;
  gap: 0;
  align-items: center;
  flex: 1;
  zoom: var(--pricing-content-scale);
}

@supports not (zoom: 1) {
  .pricing-shell {
    transform: scale(var(--pricing-content-scale));
    transform-origin: top center;
  }
}

.pricing-top-content {
  flex: 0 0 auto;
  width: 100%;
  min-width: 0;
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
  white-space: nowrap;
}

.pricing-page.theme-dark .pricing-hero h1 {
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.35);
}

.pricing-hero-intro {
  max-width: none;
  width: max-content;
  margin: clamp(12px, 1.5vh, 18px) auto 0;
  color: var(--pricing-hero-sub);
  font-size: clamp(15px, min(1.55vw, 2.2vh), 24px);
  font-weight: 500;
  line-height: 1.35;
  white-space: nowrap;
}

.pricing-page.theme-light .pricing-hero-intro {
  color: var(--pricing-hero-text);
}

.pricing-plans-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(18px, 3.1vw, 42px);
  align-items: stretch;
  width: 100%;
  min-width: 0;
  margin-bottom: 0;
}

.pricing-footer-spacer {
  flex: 0 0 auto;
  width: 100%;
  height: 100px;
  min-height: 100px;
}

.pricing-footer-bar {
  display: grid;
  flex: 0 0 auto;
  box-sizing: border-box;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(14px, 2.4cqw, 42px);
  width: 100%;
  min-width: 0;
  margin: 0;
  min-height: clamp(108px, 11vh, 148px);
  padding: clamp(20px, 2.6vh, 32px) clamp(18px, 3.6cqw, 56px);
  border: 1px solid var(--pricing-footer-border);
  border-radius: var(--pricing-card-radius);
  background: var(--pricing-footer-bg);
  box-shadow: none;
}

.footer-feature {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: clamp(6px, 1.1cqw, 12px);
  min-width: 0;
  align-items: center;
  text-align: center;
}

.footer-feature > div {
  display: grid;
  gap: clamp(3px, 0.72cqw, 10px);
  min-width: 0;
  width: 100%;
}

.footer-feature-icon {
  display: none;
  flex: 0 0 auto;
  place-items: center;
  width: clamp(34px, 3.4cqw, 48px);
  height: clamp(34px, 3.4cqw, 48px);
  border: 1px solid var(--pricing-footer-icon-border);
  border-radius: 14px;
  background: var(--pricing-footer-icon-bg);
  color: var(--pricing-accent-strong);
  font-size: clamp(18px, 1.7cqw, 24px);
}

.footer-feature h3 {
  margin: 0;
  color: var(--pricing-footer-title);
  font-size: clamp(15px, 2.35cqw, 28px);
  font-weight: 900;
  line-height: clamp(1.24, 1.34, 1.4);
  letter-spacing: clamp(0.01em, 0.022cqw, 0.04em);
}

.footer-feature p {
  margin: 0;
  color: var(--pricing-hero-sub);
  font-size: clamp(12px, 1.45cqw, 18px);
  font-weight: 600;
  line-height: clamp(1.32, 1.42, 1.52);
  letter-spacing: clamp(0.004em, 0.012cqw, 0.028em);
}

@container (max-width: 980px) {
  .pricing-footer-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    row-gap: clamp(16px, 2.8vh, 24px);
    min-height: 0;
    padding-inline: clamp(16px, 3.2cqw, 32px);
  }

  .footer-feature > div {
    gap: clamp(2px, 0.58cqw, 8px);
  }

  .footer-feature h3 {
    line-height: 1.28;
    letter-spacing: clamp(0.008em, 0.018cqw, 0.032em);
  }

  .footer-feature p {
    line-height: 1.38;
    letter-spacing: clamp(0.002em, 0.01cqw, 0.02em);
  }
}

@media (max-height: 760px) {
  .pricing-hero-intro {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

@media (max-height: 820px) {
  .pricing-page {
    padding-top: clamp(26px, 4.2vh, 36px);
  }

  .pricing-hero h1 {
    font-size: clamp(26px, 4.3vh, 34px);
  }

  .pricing-hero-intro {
    margin-top: 8px;
    font-size: clamp(13px, 2vh, 16px);
  }

  .pricing-footer-bar {
    min-height: 108px;
    padding-block: 20px;
  }

  .footer-feature > div {
    gap: clamp(2px, 0.5cqw, 6px);
  }

  .footer-feature h3 {
    font-size: clamp(14px, 2cqw, 22px);
    line-height: 1.26;
    letter-spacing: clamp(0.006em, 0.016cqw, 0.028em);
  }

  .footer-feature p {
    font-size: clamp(11px, 1.25cqw, 15px);
    line-height: 1.34;
    letter-spacing: clamp(0em, 0.008cqw, 0.018em);
  }
}

@media (max-width: 900px) {
  .pricing-page {
    padding: 28px 14px clamp(20px, 3vh, 32px);
    overflow-x: auto;
  }

  .pricing-shell {
    width: min(980px, calc(100vw - 28px), calc((100dvh - 72px) * 1.65));
  }

  .pricing-plans-grid {
    grid-template-columns: 1fr;
    gap: clamp(14px, 2.4vh, 22px);
  }

  .pricing-footer-bar {
    grid-template-columns: 1fr;
    gap: clamp(14px, 2.2vh, 20px);
    min-height: 0;
    padding-inline: clamp(16px, 4vw, 24px);
  }

  .footer-feature {
    align-items: flex-start;
    text-align: left;
  }
}
</style>
