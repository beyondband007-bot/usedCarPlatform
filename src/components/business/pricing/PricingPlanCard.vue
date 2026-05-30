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
  {
    "is-featured": props.plan.featured,
    "is-selected": props.selected,
    "is-pressing": props.pressing,
  },
]);

const showBadge = computed(() => props.plan.badge && !props.selected);
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

      <span v-if="selected" class="plan-check" aria-hidden="true">
        <Icon icon="mdi:check" />
      </span>

      <div class="plan-card-content">
        <h3 class="plan-name">{{ plan.name }}</h3>

        <div class="plan-price-row">
          <strong>{{ plan.price }}</strong>
          <span>/ 套餐</span>
        </div>

        <ul class="plan-benefits">
          <li v-for="benefit in plan.benefits" :key="benefit">
            <Icon icon="mdi:check" class="benefit-icon" />
            <span>{{ benefit }}</span>
          </li>
        </ul>

        <button
          type="button"
          class="plan-action"
          :class="{ 'is-solid': plan.featured }"
          @click.stop="emit('select')"
        >
          {{ plan.action }}
        </button>
      </div>
    </article>
  </motion.div>
</template>

<style scoped lang="scss">
.pricing-plan-motion {
  width: 100%;
  height: 100%;
  min-width: 0;
  transition: z-index 0s;
}

.pricing-plan-motion.is-plan-selected {
  position: relative;
  z-index: 3;
}

.pricing-plan-card {
  --plan-accent: var(--pricing-accent-strong, #efc24c);
  --plan-card-bg: rgba(255, 255, 255, 0.04);
  --plan-card-border: rgba(255, 255, 255, 0.1);
  --plan-card-text: #f8fafc;
  --plan-card-muted: rgba(248, 250, 252, 0.58);
  --plan-card-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
  --plan-lift: 0px;
  --plan-scale: 1;

  box-sizing: border-box;
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  padding: clamp(20px, 2vw, 32px);
  border: 1px solid var(--plan-card-border);
  border-radius: 16px;
  background: var(--plan-card-bg);
  box-shadow: var(--plan-card-shadow);
  backdrop-filter: blur(18px);
  transform: translateY(var(--plan-lift)) scale(var(--plan-scale));
  transform-origin: center center;
  cursor: pointer;
  outline: none;
  transition:
    transform 0.26s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.26s ease,
    border-color 0.26s ease,
    background 0.26s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  overflow: hidden;
}

:global(.theme-light) .pricing-plan-card {
  --plan-card-bg: rgba(255, 255, 255, 0.88);
  --plan-card-border: rgba(15, 23, 42, 0.08);
  --plan-card-text: #0f172a;
  --plan-card-muted: #64748b;
  --plan-card-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
}

.pricing-plan-card.is-featured {
  border-color: color-mix(in srgb, var(--plan-accent) 58%, transparent);
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--plan-accent) 8%, var(--plan-card-bg)),
      var(--plan-card-bg)
    );
  box-shadow:
    var(--plan-card-shadow),
    0 0 0 1px color-mix(in srgb, var(--plan-accent) 22%, transparent),
    0 0 48px color-mix(in srgb, var(--plan-accent) 16%, transparent);
}

.pricing-plan-card:hover {
  --plan-lift: -4px;
}

.pricing-plan-card.is-pressing {
  --plan-lift: 2px;
  transition-duration: 0.12s;
}

.pricing-plan-card.is-selected {
  --plan-lift: -4px;
  --plan-scale: 1;
  border-color: color-mix(in srgb, var(--plan-accent) 72%, transparent);
  box-shadow:
    0 24px 56px rgba(0, 0, 0, 0.32),
    0 0 0 1px color-mix(in srgb, var(--plan-accent) 34%, transparent),
    0 0 64px color-mix(in srgb, var(--plan-accent) 24%, transparent);
}

:global(.theme-light) .pricing-plan-card.is-selected {
  box-shadow:
    0 20px 48px rgba(15, 23, 42, 0.12),
    0 0 0 1px color-mix(in srgb, var(--plan-accent) 34%, transparent),
    0 0 48px color-mix(in srgb, var(--plan-accent) 16%, transparent);
}

.plan-badge {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 3;
  padding: 5px 12px;
  border-radius: 999px;
  background: var(--plan-accent);
  color: #1a1204;
  font-size: 12px;
  font-weight: 800;
}

.plan-check {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: var(--plan-accent);
  color: #1a1204;
  font-size: 18px;
}

.plan-card-content {
  display: flex;
  height: 100%;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.plan-name {
  margin: 0;
  padding-right: clamp(48px, 12%, 72px);
  color: var(--plan-card-text);
  font-size: clamp(16px, 1rem + 0.4vw, 22px);
  font-weight: 900;
  line-height: 1.35;
}

.plan-price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: clamp(18px, 2vw, 24px);
}

.plan-price-row strong {
  color: var(--plan-accent);
  font-size: clamp(28px, 1.6rem + 1.2vw, 44px);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.02em;
}

.plan-price-row span {
  color: var(--plan-card-muted);
  font-size: clamp(12px, 0.75rem + 0.15vw, 14px);
  font-weight: 700;
}

.plan-benefits {
  display: grid;
  gap: clamp(10px, 1vw, 14px);
  margin: clamp(18px, 2vw, 28px) 0 clamp(18px, 2vw, 28px);
  padding: 0;
  list-style: none;
}

.plan-benefits li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: var(--plan-card-text);
  font-size: clamp(12px, 0.78rem + 0.2vw, 14px);
  font-weight: 600;
  line-height: 1.65;
}

.benefit-icon {
  flex: 0 0 auto;
  margin-top: 3px;
  color: var(--plan-accent);
  font-size: 16px;
}

.plan-action {
  display: inline-flex;
  width: 100%;
  min-height: 48px;
  height: auto;
  align-items: center;
  justify-content: center;
  margin-top: auto;
  padding: 12px 16px;
  border: 1px solid color-mix(in srgb, var(--plan-card-text) 24%, transparent);
  border-radius: 999px;
  background: transparent;
  color: var(--plan-card-text);
  font-family: inherit;
  font-size: clamp(13px, 0.82rem + 0.2vw, 15px);
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 160ms ease,
    background 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.plan-action.is-solid {
  border-color: transparent;
  background: linear-gradient(180deg, #f0cc62, var(--plan-accent));
  box-shadow: 0 10px 28px color-mix(in srgb, var(--plan-accent) 34%, transparent);
  color: #1a1204;
}

.pricing-plan-card:hover .plan-action.is-solid {
  filter: brightness(1.04);
}

.pricing-plan-card:hover .plan-action:not(.is-solid) {
  border-color: color-mix(in srgb, var(--plan-accent) 42%, transparent);
  color: var(--plan-accent);
}

.plan-action:active {
  transform: translateY(1px);
}

@media (max-width: 720px) {
  .pricing-plan-card:hover,
  .pricing-plan-card.is-selected {
    --plan-lift: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pricing-plan-card {
    transition: none;
  }
}
</style>
