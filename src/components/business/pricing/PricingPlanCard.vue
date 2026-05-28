<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { motion } from "motion-v";
import { computed } from "vue";

import type { PricingPlan } from "@/types/prototype";

const props = defineProps<{
  plan: PricingPlan;
  index: number;
  selected?: boolean;
  pressing?: boolean;
}>();

const emit = defineEmits<{
  select: [];
  pointerdown: [];
  pointerup: [];
  pointerleave: [];
  pointercancel: [];
}>();

const cardClass = computed(() => [
  "pricing-plan-card",
  `is-${props.plan.tone}`,
  {
    "is-featured": props.plan.featured,
    "is-selected": props.selected,
    "is-pressing": props.pressing,
    "has-bg-image": Boolean(props.plan.backgroundImage),
  },
]);
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
      <img
        v-if="plan.backgroundImage"
        class="plan-card-bg"
        :src="plan.backgroundImage"
        :alt="`${plan.name}背景`"
        loading="lazy"
        decoding="async"
        draggable="false"
      />

      <div class="plan-card-content">
      <span v-if="selected" class="plan-check" aria-hidden="true">
        <Icon icon="mdi:check" />
      </span>

      <span v-else-if="plan.badge" class="plan-badge">{{ plan.badge }}</span>

      <span class="plan-icon" aria-hidden="true">
        <Icon :icon="plan.icon" />
      </span>

      <h3 class="plan-name">{{ plan.name }}</h3>
      <p class="plan-desc">{{ plan.description }}</p>

      <div class="plan-price-row">
        <strong>{{ plan.price }}</strong>
        <span>/ 套餐</span>
      </div>

      <ul class="plan-benefits">
        <li v-for="benefit in plan.benefits" :key="benefit">
          <Icon icon="mdi:check-circle" class="benefit-icon" />
          <span>{{ benefit }}</span>
        </li>
      </ul>

      <div class="plan-action-spacer" aria-hidden="true" />

      <button type="button" class="plan-action" @click.stop="emit('select')">
        {{ plan.action }}
        <Icon icon="mdi:arrow-right" class="plan-action-icon" />
      </button>
      </div>
    </article>
  </motion.div>
</template>

<style scoped lang="scss">
.pricing-plan-motion {
  height: 100%;
  min-width: 0;
  transition: z-index 0s;
}

.pricing-plan-motion.is-plan-selected {
  position: relative;
  z-index: 3;
}

.pricing-plan-card {
  --plan-accent: #2f7dff;
  --plan-accent-soft: rgba(47, 125, 255, 0.12);
  --plan-accent-border: rgba(47, 125, 255, 0.42);
  --plan-shadow: 0 18px 48px rgba(47, 125, 255, 0.1);
  --plan-ring: transparent;
  --plan-lift: 0px;
  --plan-scale: 1;
  --plan-card-surface-top: #ffffff;
  --plan-card-surface-bottom: #f7fbff;
  --plan-card-text: #0f172a;
  --plan-card-text-muted: #64748b;
  --plan-card-divider: #e2e8f0;

  position: relative;
  display: flex;
  height: 100%;
  min-height: clamp(580px, 42vw, 640px);
  flex-direction: column;
  padding: clamp(26px, 2.4vw, 34px);
  border: 1px solid var(--plan-accent-border);
  border-radius: 14px;
  background: linear-gradient(
    180deg,
    var(--plan-card-surface-top),
    var(--plan-card-surface-bottom)
  );
  box-shadow: var(--plan-shadow);
  transform: translateY(var(--plan-lift)) scale(var(--plan-scale));
  transform-origin: center bottom;
  cursor: pointer;
  outline: none;
  transition:
    transform 0.26s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.26s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.26s ease,
    filter 0.26s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  overflow: hidden;
}

.pricing-plan-card.has-bg-image {
  background: #f7fbff;
}

.pricing-plan-card.has-bg-image.is-orange {
  background: #fff8f3;
}

.pricing-plan-card.has-bg-image.is-green {
  background: #f4fcf8;
}

.pricing-plan-card.has-bg-image::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(
    165deg,
    rgba(255, 255, 255, 0.88) 0%,
    rgba(255, 255, 255, 0.62) 38%,
    rgba(247, 251, 255, 0.28) 72%,
    rgba(247, 251, 255, 0.08) 100%
  );
  pointer-events: none;
}

:global(.theme-dark) .pricing-plan-card.has-bg-image {
  background: #151c2d;
}

:global(.theme-dark) .pricing-plan-card.has-bg-image::before {
  background: linear-gradient(
    165deg,
    rgba(21, 28, 45, 0.92) 0%,
    rgba(21, 28, 45, 0.72) 38%,
    rgba(21, 28, 45, 0.36) 72%,
    rgba(21, 28, 45, 0.12) 100%
  );
}

.plan-card-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: right bottom;
  pointer-events: none;
  transition: filter 0.26s ease;
}

.pricing-plan-card:not(.is-selected) .plan-card-bg {
  filter: saturate(0.86) brightness(0.94);
}

.pricing-plan-card.is-selected .plan-card-bg {
  filter: saturate(1.1) brightness(1.05) contrast(1.02);
}

.pricing-plan-card.is-pressing .plan-card-bg {
  filter: saturate(1) brightness(0.96);
}

.plan-card-content {
  position: relative;
  z-index: 2;
  display: flex;
  height: 100%;
  flex: 1;
  flex-direction: column;
  min-height: inherit;
}

.pricing-plan-card::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 4;
  border: 3px solid var(--plan-ring);
  border-radius: inherit;
  pointer-events: none;
  opacity: 0;
  transition:
    opacity 0.26s ease,
    border-color 0.26s ease;
}

:global(.theme-dark) .pricing-plan-card {
  --plan-card-surface-top: #1c2438;
  --plan-card-surface-bottom: #151c2d;
  --plan-card-text: #f1f5f9;
  --plan-card-text-muted: #94a3b8;
  --plan-card-divider: rgba(148, 163, 184, 0.24);
}

.pricing-plan-card.is-orange {
  --plan-accent: #f97316;
  --plan-accent-soft: rgba(249, 115, 22, 0.12);
  --plan-accent-border: rgba(249, 115, 22, 0.55);
  --plan-shadow: 0 22px 56px rgba(249, 115, 22, 0.16);
}

:global(.theme-dark) .pricing-plan-card.is-orange {
  --plan-accent-soft: rgba(249, 115, 22, 0.18);
  --plan-shadow: 0 22px 56px rgba(249, 115, 22, 0.22);
}

.pricing-plan-card.is-green {
  --plan-accent: #10b981;
  --plan-accent-soft: rgba(16, 185, 129, 0.12);
  --plan-accent-border: rgba(16, 185, 129, 0.42);
  --plan-shadow: 0 18px 48px rgba(16, 185, 129, 0.12);
}

:global(.theme-dark) .pricing-plan-card.is-green {
  --plan-accent-soft: rgba(16, 185, 129, 0.18);
  --plan-shadow: 0 18px 56px rgba(16, 185, 129, 0.2);
}

:global(.theme-dark) .pricing-plan-card.is-blue {
  --plan-accent-soft: rgba(47, 125, 255, 0.18);
  --plan-shadow: 0 18px 48px rgba(47, 125, 255, 0.18);
}

.pricing-plan-card:not(.is-selected) {
  filter: saturate(0.88) brightness(0.92);
}

:global(.theme-dark) .pricing-plan-card:not(.is-selected) {
  filter: saturate(0.86) brightness(0.88);
}

.pricing-plan-card.has-bg-image.is-selected {
  filter: saturate(1.06) brightness(1.03);
}

:global(.theme-dark) .pricing-plan-card.has-bg-image.is-selected {
  filter: saturate(1.08) brightness(1.04);
}

.pricing-plan-card:hover {
  --plan-lift: -5px;
}

.pricing-plan-card.is-pressing {
  --plan-lift: 2px;

  transition-duration: 0.12s;
}

.pricing-plan-card.is-selected {
  border-color: transparent;
  --plan-lift: -14px;
  --plan-scale: 1.035;
}

.pricing-plan-card.has-bg-image.is-selected::before {
  background: linear-gradient(
    165deg,
    rgba(255, 255, 255, 0.8) 0%,
    rgba(255, 255, 255, 0.48) 36%,
    rgba(247, 251, 255, 0.18) 70%,
    rgba(247, 251, 255, 0.04) 100%
  );
}

:global(.theme-dark) .pricing-plan-card.has-bg-image.is-selected::before {
  background: linear-gradient(
    165deg,
    rgba(21, 28, 45, 0.86) 0%,
    rgba(21, 28, 45, 0.58) 36%,
    rgba(21, 28, 45, 0.24) 70%,
    rgba(21, 28, 45, 0.06) 100%
  );
}

.pricing-plan-card.is-selected.is-blue {
  --plan-shadow:
    0 18px 36px rgba(47, 125, 255, 0.34),
    0 32px 72px rgba(47, 125, 255, 0.42),
    0 0 96px rgba(47, 125, 255, 0.28);
}

.pricing-plan-card.is-selected.is-orange {
  --plan-shadow:
    0 18px 36px rgba(249, 115, 22, 0.36),
    0 32px 72px rgba(249, 115, 22, 0.44),
    0 0 96px rgba(249, 115, 22, 0.3);
}

.pricing-plan-card.is-selected.is-green {
  --plan-shadow:
    0 18px 36px rgba(16, 185, 129, 0.34),
    0 32px 72px rgba(16, 185, 129, 0.42),
    0 0 96px rgba(16, 185, 129, 0.28);
}

:global(.theme-dark) .pricing-plan-card.is-selected.is-blue {
  --plan-shadow:
    0 18px 40px rgba(47, 125, 255, 0.42),
    0 34px 78px rgba(47, 125, 255, 0.5),
    0 0 110px rgba(47, 125, 255, 0.34);
}

:global(.theme-dark) .pricing-plan-card.is-selected.is-orange {
  --plan-shadow:
    0 18px 40px rgba(249, 115, 22, 0.44),
    0 34px 78px rgba(249, 115, 22, 0.52),
    0 0 110px rgba(249, 115, 22, 0.36);
}

:global(.theme-dark) .pricing-plan-card.is-selected.is-green {
  --plan-shadow:
    0 18px 40px rgba(16, 185, 129, 0.42),
    0 34px 78px rgba(16, 185, 129, 0.5),
    0 0 110px rgba(16, 185, 129, 0.34);
}

.pricing-plan-card:focus-visible:not(.is-selected) {
  --plan-ring: var(--plan-accent);
}

.pricing-plan-card:focus-visible:not(.is-selected)::after {
  opacity: 1;
}

.plan-check {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 3;
  display: grid;
  place-items: center;
  width: clamp(32px, 2.8vw, 40px);
  height: clamp(32px, 2.8vw, 40px);
  border-radius: 999px;
  background: var(--plan-accent);
  color: #fff;
  font-size: 20px;
  box-shadow:
    0 0 0 4px color-mix(in srgb, var(--plan-accent) 22%, transparent),
    0 10px 24px color-mix(in srgb, var(--plan-accent) 55%, transparent),
    0 0 28px color-mix(in srgb, var(--plan-accent) 38%, transparent);
  animation: plan-check-pop 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes plan-check-pop {
  0% {
    opacity: 0;
    transform: scale(0.6);
  }

  70% {
    transform: scale(1.08);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.plan-badge {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 3;
  padding: 5px 12px;
  border-radius: 999px;
  background: var(--plan-accent);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
}

.plan-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: var(--plan-accent-soft);
  color: var(--plan-accent);
  font-size: 28px;
}

.plan-name {
  margin: 18px 0 0;
  color: var(--plan-card-text);
  font-size: 20px;
  font-weight: 900;
  line-height: 1.35;
  letter-spacing: 0;
}

.plan-desc {
  min-height: 52px;
  margin: 12px 0 0;
  color: var(--plan-card-text-muted);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.65;
}

.plan-price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: clamp(24px, 2.2vw, 30px);
}

.plan-price-row strong {
  color: var(--plan-accent);
  font-size: clamp(34px, 3.6vw, 44px);
  font-weight: 900;
  line-height: 1;
}

.plan-price-row span {
  color: var(--plan-card-text-muted);
  font-size: 14px;
  font-weight: 700;
}

.plan-benefits {
  display: grid;
  gap: clamp(14px, 1.2vw, 18px);
  margin: clamp(26px, 2.4vw, 32px) 0 0;
  padding: clamp(24px, 2.2vw, 30px) 0 0;
  border-top: 1px solid color-mix(in srgb, var(--plan-accent) 18%, var(--plan-card-divider));
  list-style: none;
}

.plan-benefits li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: var(--plan-card-text);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.6;
}

.benefit-icon {
  flex: 0 0 auto;
  margin-top: 2px;
  color: var(--plan-accent);
  font-size: 20px;
}

.plan-action-spacer {
  flex: 1 1 clamp(20px, 2.5vw, 36px);
  min-height: clamp(20px, 2.5vw, 36px);
}

.plan-action {
  display: inline-flex;
  flex: 0 0 auto;
  width: 100%;
  height: clamp(50px, 4vw, 56px);
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: clamp(20px, 2vw, 28px);
  border: 1px solid transparent;
  border-radius: 999px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--plan-accent) 82%, white),
    var(--plan-accent)
  );
  box-shadow: 0 10px 24px color-mix(in srgb, var(--plan-accent) 32%, transparent);
  color: #fff;
  font-family: inherit;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease;
}

.pricing-plan-card.is-selected .plan-action {
  box-shadow:
    0 14px 32px color-mix(in srgb, var(--plan-accent) 48%, transparent),
    0 0 24px color-mix(in srgb, var(--plan-accent) 32%, transparent);
  transform: translateY(-1px);
}

.plan-action:active {
  transform: translateY(1px);
}

.plan-action-icon {
  font-size: 18px;
}

@media (prefers-reduced-motion: reduce) {
  .pricing-plan-card,
  .pricing-plan-card::after,
  .plan-card-bg,
  .plan-check {
    animation: none;
    transition: none;
  }
}
</style>
