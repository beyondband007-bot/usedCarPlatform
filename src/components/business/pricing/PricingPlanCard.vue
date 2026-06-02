<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { motion } from "motion-v";
import { computed } from "vue";

import type { PricingPlan } from "@/types/prototype";
import { useAppStore } from "@/stores/app";

const appStore = useAppStore();

const props = defineProps<{
  plan: PricingPlan;
  index: number;
  selected?: boolean;
  pressing?: boolean;
}>();

const emit = defineEmits<{
  select: [];
  consult: [];
  pointerdown: [];
  pointerup: [];
  pointerleave: [];
  pointercancel: [];
}>();

const cardClass = computed(() => [
  "pricing-plan-card",
  appStore.isDarkMode ? "theme-dark" : "theme-light",
  `is-${props.plan.tone}`,
  {
    "is-featured": props.plan.featured,
    "is-selected": props.selected,
    "is-pressing": props.pressing,
  },
]);

const showBadge = computed(() => Boolean(props.plan.badge));
</script>

<template>
  <motion.div
    :initial="{ opacity: 0, y: 18 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.36, delay: index * 0.06 }"
    class="pricing-plan-motion"
    :class="{ 'is-plan-selected': selected }"
  >
    <article
      :class="cardClass"
      role="button"
      tabindex="0"
      :aria-pressed="selected"
      :aria-label="`${plan.name}，点击选择`"
      @click="emit('select')"
      @keydown.enter.prevent="emit('select')"
      @keydown.space.prevent="emit('select')"
      @pointerdown="emit('pointerdown')"
      @pointerup="emit('pointerup')"
      @pointerleave="emit('pointerleave')"
      @pointercancel="emit('pointercancel')"
    >
      <span v-if="showBadge" class="plan-badge">{{ plan.badge }}</span>

      <div class="plan-card-content">
        <h3 class="plan-name">{{ plan.name }}</h3>

        <div class="plan-price-row">
          <strong>{{ plan.price }}</strong>
          <span>/ 套</span>
        </div>

        <span class="plan-divider" aria-hidden="true" />

        <ul class="plan-benefits">
          <li v-for="benefit in plan.benefits" :key="benefit">
            <Icon icon="mdi:check-circle-outline" class="benefit-icon" />
            <span>{{ benefit }}</span>
          </li>
        </ul>

        <button
          type="button"
          class="plan-action is-solid"
          @click.stop="emit('consult')"
        >
          {{ plan.action }}
        </button>
      </div>
    </article>
  </motion.div>
</template>

<style scoped lang="scss">
.pricing-plan-motion {
  container-type: inline-size;
  width: 100%;
  min-width: 0;
  transition: z-index 0s;
}

.pricing-plan-motion.is-plan-selected {
  position: relative;
  z-index: 3;
}

.pricing-plan-card {
  --plan-accent: var(--pricing-accent-strong, #efc24c);
  --plan-card-bg: rgba(255, 255, 255, 0.03);
  --plan-card-border: rgba(255, 255, 255, 0.08);
  --plan-card-text: #f8fafc;
  --plan-card-muted: rgba(248, 250, 252, 0.72);
  --plan-benefit-text: var(--plan-card-text);
  --plan-card-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  --plan-selected-ring: transparent;
  --plan-divider: rgba(255, 255, 255, 0.18);
  --plan-action-border: rgba(255, 255, 255, 0.38);
  --plan-action-text: var(--plan-card-text);
  --plan-action-hover-border: rgba(255, 255, 255, 0.54);
  --plan-action-hover-text: #ffffff;
  --plan-action-solid-bg: linear-gradient(180deg, #f5cf65, #f1c646);
  --plan-action-solid-text: #241700;
  --plan-action-solid-shadow: 0 12px 28px color-mix(in srgb, var(--plan-accent) 28%, transparent);
  --plan-badge-bg: var(--plan-accent);
  --plan-badge-text: #241700;

  box-sizing: border-box;
  position: relative;
  display: flex;
  width: 100%;
  min-height: calc(100cqw * 505 / 406);
  min-width: 0;
  flex-direction: column;
  padding: clamp(22px, 7.8cqw, 54px);
  border: 1px solid var(--plan-card-border);
  border-radius: clamp(22px, 7.2cqw, 44px);
  background: var(--plan-card-bg);
  box-shadow: var(--plan-card-shadow);
  backdrop-filter: blur(22px);
  cursor: pointer;
  outline: none;
  transition:
    transform 0.22s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  overflow: hidden;
}

.pricing-plan-card::before {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  content: "";
  pointer-events: none;
  box-shadow: inset 0 0 0 1px var(--plan-selected-ring);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.pricing-plan-card::after {
  position: absolute;
  inset: -22%;
  z-index: 0;
  content: "";
  pointer-events: none;
  background:
    radial-gradient(circle at 50% 28%, color-mix(in srgb, var(--plan-accent) 18%, transparent), transparent 28%),
    radial-gradient(circle at 50% 104%, color-mix(in srgb, var(--plan-accent) 16%, transparent), transparent 34%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.pricing-plan-card.theme-light {
  --plan-card-bg: #ffffff;
  --plan-card-border: #e2e8f0;
  --plan-card-text: #172033;
  --plan-card-muted: #64748b;
  --plan-benefit-text: #334155;
  --plan-card-shadow: 0 12px 28px rgba(78, 111, 148, 0.1);
  --plan-divider: #e2e8f0;
  --plan-action-border: #d8e2f0;
  --plan-action-text: #172033;
  --plan-action-hover-border: color-mix(in srgb, var(--plan-accent) 42%, #d8e2f0);
  --plan-action-hover-text: var(--plan-accent);
  --plan-action-solid-bg: #2f6bff;
  --plan-action-solid-text: #ffffff;
  --plan-action-solid-shadow: 0 10px 22px rgba(47, 107, 255, 0.22);
  --plan-badge-bg: color-mix(in srgb, var(--plan-accent) 12%, #ffffff);
  --plan-badge-text: var(--plan-accent);

  backdrop-filter: none;
}

.pricing-plan-card.theme-light.is-blue {
  --plan-accent: #2f6bff;
  --plan-card-bg: #ffffff;
  --plan-card-border: #dbeafe;
  --plan-card-shadow: 0 12px 28px rgba(47, 107, 255, 0.08);
}

.pricing-plan-card.theme-light.is-orange {
  --plan-accent: #2f6bff;
  --plan-card-bg: #ffffff;
  --plan-card-border: rgba(47, 107, 255, 0.28);
  --plan-card-shadow: 0 14px 34px rgba(47, 107, 255, 0.1);
  --plan-badge-bg: #edf4ff;
  --plan-badge-text: #1d4ed8;
}

.pricing-plan-card.theme-light.is-green {
  --plan-accent: #d4a017;
  --plan-card-bg: #ffffff;
  --plan-card-border: rgba(212, 160, 23, 0.28);
  --plan-card-shadow: 0 12px 30px rgba(212, 160, 23, 0.1);
  --plan-action-border: rgba(212, 160, 23, 0.42);
  --plan-action-hover-border: rgba(212, 160, 23, 0.62);
  --plan-action-hover-text: #92400e;
  --plan-badge-bg: #fff7e6;
  --plan-badge-text: #9a6a00;
}

.pricing-plan-card.is-featured {
  border-color: rgba(255, 255, 255, 0.12);
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--plan-accent) 4%, rgba(255, 255, 255, 0.03)),
      rgba(255, 255, 255, 0.03)
    );
  box-shadow:
    0 18px 48px rgba(0, 0, 0, 0.22),
    0 0 22px color-mix(in srgb, var(--plan-accent) 8%, transparent);
}

.pricing-plan-card.theme-light.is-featured {
  border-color: rgba(47, 107, 255, 0.32);
  background: #ffffff;
  box-shadow:
    0 16px 38px rgba(47, 107, 255, 0.12),
    0 0 0 1px rgba(47, 107, 255, 0.08);
}

.pricing-plan-card.is-selected {
  --plan-selected-ring: color-mix(in srgb, var(--plan-accent) 86%, transparent);

  min-height: calc((100cqw * 505 / 406) + 20px);
  transform: translateY(-8px);
  border-color: color-mix(in srgb, var(--plan-accent) 84%, transparent);
  box-shadow:
    0 28px 80px rgba(0, 0, 0, 0.42),
    0 0 0 2px color-mix(in srgb, var(--plan-accent) 74%, transparent),
    0 0 76px color-mix(in srgb, var(--plan-accent) 32%, transparent);
  animation: selected-card-pop 0.38s cubic-bezier(0.2, 0.9, 0.22, 1.22);
}

.pricing-plan-card.theme-light.is-selected {
  background: #ffffff;
  box-shadow:
    0 18px 44px rgba(78, 111, 148, 0.14),
    0 0 0 2px color-mix(in srgb, var(--plan-accent) 46%, transparent);
}

.pricing-plan-card.is-featured.is-selected {
  --plan-selected-ring: color-mix(in srgb, var(--plan-accent) 92%, transparent);

  border-color: color-mix(in srgb, var(--plan-accent) 84%, transparent);
  box-shadow:
    0 32px 86px rgba(0, 0, 0, 0.44),
    0 0 0 2px color-mix(in srgb, var(--plan-accent) 78%, transparent),
    0 0 84px color-mix(in srgb, var(--plan-accent) 34%, transparent);
}

.pricing-plan-card.theme-light.is-featured.is-selected {
  box-shadow:
    0 20px 48px rgba(47, 107, 255, 0.16),
    0 0 0 2px rgba(47, 107, 255, 0.42);
}

.pricing-plan-card.is-selected::before,
.pricing-plan-card.is-selected::after {
  opacity: 1;
}

.pricing-plan-card.theme-light::after {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--plan-accent) 5%, transparent),
      transparent 42%
    );
}

.pricing-plan-card.theme-light.is-selected::after {
  opacity: 1;
}

.pricing-plan-card.is-pressing {
  transform: translateY(-3px);
}

.pricing-plan-card.is-selected.is-pressing {
  transform: translateY(-5px);
}

@keyframes selected-card-pop {
  0% {
    transform: translateY(0);
    box-shadow:
      0 16px 44px rgba(0, 0, 0, 0.3),
      0 0 0 1px color-mix(in srgb, var(--plan-accent) 38%, transparent),
      0 0 24px color-mix(in srgb, var(--plan-accent) 14%, transparent);
  }

  72% {
    transform: translateY(-10px);
  }

  100% {
    transform: translateY(-8px);
  }
}

.plan-badge {
  position: absolute;
  top: clamp(18px, 6.2cqw, 36px);
  right: clamp(18px, 6.2cqw, 36px);
  z-index: 3;
  padding: clamp(6px, 1.9cqw, 11px) clamp(12px, 3.4cqw, 20px);
  border-radius: 999px;
  background: var(--plan-badge-bg);
  color: var(--plan-badge-text);
  font-size: clamp(12px, 2.9cqw, 17px);
  font-weight: 800;
}

.plan-card-content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr) auto;
  flex: 1;
  min-width: 0;
}

.plan-name {
  margin: 0;
  padding-right: clamp(58px, 18cqw, 96px);
  color: var(--plan-card-text);
  font-size: clamp(20px, 5.2cqw, 34px);
  font-weight: 900;
  line-height: 1.18;
}

.plan-price-row {
  display: flex;
  align-items: baseline;
  gap: clamp(8px, 2.3cqw, 14px);
  margin-top: clamp(18px, 6.4cqw, 38px);
}

.plan-price-row strong {
  color: var(--plan-accent);
  font-size: clamp(30px, 10cqw, 62px);
  font-weight: 900;
  line-height: 1;
}

.plan-price-row span {
  color: var(--plan-card-muted);
  font-size: clamp(15px, 4.1cqw, 26px);
  font-weight: 800;
}

.plan-divider {
  display: block;
  width: 100%;
  height: 1px;
  margin: clamp(18px, 6.2cqw, 38px) 0 clamp(14px, 4.8cqw, 30px);
  background: var(--plan-divider);
}

.plan-benefits {
  display: flex;
  align-self: stretch;
  flex-direction: column;
  justify-content: space-evenly;
  gap: clamp(8px, 2.2cqw, 16px);
  min-height: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
  list-style: none;
}

.plan-benefits li {
  display: flex;
  align-items: flex-start;
  gap: clamp(8px, 2.4cqw, 14px);
  color: var(--plan-benefit-text);
  font-size: clamp(13px, 4.1cqw, 24px);
  font-weight: 600;
  line-height: 1.4;
}

.benefit-icon {
  flex: 0 0 auto;
  color: var(--plan-accent);
  font-size: clamp(14px, 4.2cqw, 24px);
  margin-top: 0.12em;
}

.plan-action {
  display: inline-flex;
  width: 100%;
  flex: 0 0 auto;
  min-height: clamp(42px, 13.6cqw, 76px);
  align-items: center;
  justify-content: center;
  margin-top: clamp(16px, 4.5cqw, 28px);
  padding: clamp(10px, 3.5cqw, 19px) clamp(14px, 4.8cqw, 28px);
  border: 1px solid var(--plan-action-border);
  border-radius: clamp(12px, 3.3cqw, 18px);
  background: transparent;
  color: var(--plan-action-text);
  font-family: inherit;
  font-size: clamp(14px, 4cqw, 24px);
  font-weight: 900;
  cursor: pointer;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    color 160ms ease;
}

.plan-action.is-solid {
  border-color: transparent;
  background: var(--plan-action-solid-bg);
  box-shadow: var(--plan-action-solid-shadow);
  color: var(--plan-action-solid-text);
}

.pricing-plan-card.is-selected .plan-action.is-solid,
.pricing-plan-card.is-featured.is-selected .plan-action.is-solid {
  filter: brightness(1.04);
}

.pricing-plan-card:hover .plan-action.is-solid {
  filter: brightness(1.04);
}

.pricing-plan-card.theme-light:hover .plan-action.is-solid {
  filter: brightness(1.06);
}

.pricing-plan-card:hover .plan-action:not(.is-solid) {
  border-color: var(--plan-action-hover-border);
  color: var(--plan-action-hover-text);
}

.pricing-plan-card.theme-light:hover .plan-action:not(.is-solid) {
  background: color-mix(in srgb, var(--plan-accent) 6%, #ffffff);
}

.plan-action:active {
  opacity: 0.92;
}

@media (prefers-reduced-motion: reduce) {
  .pricing-plan-card {
    animation: none;
    transition: none;
  }
}

@media (max-height: 820px) {
  .pricing-plan-card {
    padding: clamp(17px, 5.4cqw, 30px);
  }

  .plan-name {
    font-size: clamp(17px, 4.7cqw, 26px);
  }

  .plan-price-row {
    gap: clamp(7px, 2cqw, 12px);
    margin-top: clamp(12px, 4cqw, 22px);
  }

  .plan-price-row strong {
    font-size: clamp(27px, 8.7cqw, 46px);
  }

  .plan-price-row span {
    font-size: clamp(13px, 3.5cqw, 18px);
  }

  .plan-divider {
    margin: clamp(12px, 3.8cqw, 20px) 0 clamp(9px, 3cqw, 16px);
  }

  .plan-benefits {
    justify-content: flex-start;
    gap: clamp(4px, 1.8cqw, 10px);
    overflow: visible;
  }

  .plan-benefits li {
    gap: clamp(7px, 2cqw, 11px);
    font-size: clamp(11px, 3.35cqw, 16px);
    line-height: 1.22;
  }

  .benefit-icon {
    font-size: clamp(13px, 3.5cqw, 17px);
    margin-top: 0;
  }

  .plan-action {
    min-height: clamp(42px, 10.5cqw, 58px);
    padding: clamp(10px, 2.8cqw, 15px) clamp(14px, 4cqw, 22px);
    border-radius: clamp(12px, 3cqw, 16px);
    font-size: clamp(14px, 3.35cqw, 18px);
  }

  .plan-badge {
    top: clamp(16px, 5cqw, 28px);
    right: clamp(16px, 5cqw, 28px);
    padding: clamp(6px, 1.7cqw, 9px) clamp(12px, 3cqw, 16px);
    font-size: clamp(12px, 2.7cqw, 14px);
  }
}
</style>
