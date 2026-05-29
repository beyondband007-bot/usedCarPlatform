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

const copy = pricingPageCopy;
const appStore = useAppStore();

const selectedPlanName = ref("企业团队档");
const pressingPlanName = ref<string | null>(null);

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
  >
    <section class="pricing-shell">
      <section class="pricing-panel" aria-label="企业套餐">
        <header class="pricing-hero">
          <div>
            <h1>{{ copy.title }}</h1>
            <p>{{ copy.plansSubtitle }}</p>
          </div>
        </header>

        <div class="pricing-body">
          <section id="pricing-plans" class="pricing-plans-module">
            <h2 class="section-title">{{ copy.plansTitle }}</h2>

            <div class="pricing-plans-grid">
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
          </section>

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
        </div>
      </section>
    </section>
  </main>
</template>

<style scoped lang="scss">
.pricing-page {
  --pricing-page-pad: clamp(16px, 2vw, 30px);
  --pricing-page-bg: var(--app-bg);
  --pricing-panel: rgba(7, 15, 32, 0.82);
  --pricing-border: rgba(73, 106, 148, 0.42);
  --pricing-border-soft: rgba(91, 117, 151, 0.22);
  --pricing-head: rgba(255, 255, 255, 0.06);
  --pricing-footer-bg: color-mix(in srgb, var(--app-surface) 88%, var(--app-bg));
  --pricing-panel-shadow:
    0 0 0 1px rgba(79, 139, 220, 0.08),
    0 28px 72px rgba(0, 0, 0, 0.28),
    0 0 42px rgba(39, 124, 235, 0.12);

  min-height: calc(100vh - var(--app-header-offset));
  padding: var(--pricing-page-pad);
  background: var(--pricing-page-bg);
  color: var(--app-text);
}

.pricing-page.theme-light {
  --pricing-page-bg:
    radial-gradient(860px 220px at 63% 0%, rgba(166, 210, 255, 0.32), transparent 72%),
    linear-gradient(180deg, #f6fbff, #edf3fa);
  --pricing-panel: rgba(255, 255, 255, 0.88);
  --pricing-border: rgba(175, 194, 215, 0.42);
  --pricing-border-soft: rgba(188, 205, 223, 0.42);
  --pricing-head: rgba(231, 238, 247, 0.76);
  --pricing-footer-bg: color-mix(in srgb, var(--app-surface) 90%, var(--app-bg));
  --pricing-panel-shadow:
    0 18px 52px rgba(71, 99, 132, 0.12),
    0 0 30px rgba(125, 184, 238, 0.14);
}

.pricing-shell {
  width: 100%;
  max-width: 1500px;
  min-height: calc(100vh - var(--app-header-offset) - var(--pricing-page-pad, 30px) * 2);
  margin: 0 auto;
}

.pricing-panel {
  display: flex;
  min-width: 0;
  flex-direction: column;
  overflow: visible;
  border: 1px solid var(--pricing-border);
  border-radius: 10px;
  background: var(--pricing-panel);
  box-shadow: var(--pricing-panel-shadow);
  backdrop-filter: blur(18px);
}

.pricing-hero {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  min-height: clamp(104px, 12vh, 128px);
  padding: 18px clamp(22px, 2.4vw, 34px);
  overflow: hidden;
  border-bottom: 1px solid var(--pricing-border-soft);
  background:
    linear-gradient(
      90deg,
      rgba(47, 118, 225, 0.13),
      rgba(47, 118, 225, 0.02) 48%,
      rgba(54, 132, 245, 0.18)
    ),
    var(--pricing-head);
}

.pricing-page.theme-light .pricing-hero {
  background:
    linear-gradient(
      90deg,
      rgba(242, 247, 253, 0.94),
      rgba(238, 246, 255, 0.86) 52%,
      rgba(214, 231, 252, 0.9)
    ),
    var(--pricing-head);
}

.pricing-hero h1,
.section-title {
  margin: 0;
  color: var(--app-text);
  font-weight: 900;
  letter-spacing: 0;
}

.pricing-hero h1 {
  font-size: 30px;
  line-height: 1.25;
}

.pricing-hero p {
  margin: 9px 0 0;
  color: var(--app-text-soft);
  font-size: 15px;
  font-weight: 700;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  line-height: 1.35;
}

.section-title::before {
  content: "";
  flex: 0 0 4px;
  width: 4px;
  height: 18px;
  border-radius: 999px;
  background: linear-gradient(180deg, #4d9dff, #2f6bff);
}

.pricing-body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: clamp(22px, 2.2vw, 32px);
  padding: clamp(18px, 1.6vw, 24px) clamp(22px, 2.4vw, 34px) clamp(24px, 2vw, 32px);
}

.pricing-plans-module {
  scroll-margin-top: 96px;
  min-width: 0;
}

.pricing-plans-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(18px, 1.8vw, 28px);
  margin-top: 18px;
}

.pricing-footer-bar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(14px, 1.4vw, 20px);
  padding: clamp(18px, 1.8vw, 24px);
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--pricing-footer-bg);
}

.footer-feature {
  display: flex;
  gap: 14px;
  min-width: 0;
}

.footer-feature-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(249, 115, 22, 0.28);
  border-radius: 12px;
  color: #f97316;
  font-size: 22px;
}

.footer-feature h3 {
  margin: 0;
  color: var(--app-text);
  font-size: 15px;
  font-weight: 800;
}

.footer-feature p {
  margin: 6px 0 0;
  color: var(--app-text-soft);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
}

@media (max-width: 1180px) {
  .pricing-plans-grid,
  .pricing-footer-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .pricing-plans-grid,
  .pricing-footer-bar {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
