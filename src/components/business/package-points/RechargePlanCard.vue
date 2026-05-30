<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed } from 'vue'

import type { RechargePlan } from '@/constants/recharge-plans'

const props = defineProps<{
  plan: RechargePlan
  selected?: boolean
  pressing?: boolean
}>()

const emit = defineEmits<{
  select: []
  pointerdown: []
  pointerup: []
  pointerleave: []
  pointercancel: []
}>()

const cardClass = computed(() => [
  'recharge-plan-card',
  `is-${props.plan.tone}`,
  {
    'is-selected': props.selected,
    'is-pressing': props.pressing,
  },
])
</script>

<template>
  <article
    :class="cardClass"
    role="button"
    tabindex="0"
    :aria-pressed="selected"
    :aria-label="`${plan.name}，点击选择并充值`"
    @click="emit('select')"
    @keydown.enter.prevent="emit('select')"
    @keydown.space.prevent="emit('select')"
    @pointerdown="emit('pointerdown')"
    @pointerup="emit('pointerup')"
    @pointerleave="emit('pointerleave')"
    @pointercancel="emit('pointercancel')"
  >
    <span v-if="selected" class="plan-check" aria-hidden="true">
      <Icon icon="mdi:check" />
    </span>
    <span v-else-if="plan.badge" class="plan-badge">{{ plan.badge }}</span>

    <div class="plan-card-content">
      <div class="plan-head">
        <span class="plan-icon" aria-hidden="true">
          <Icon :icon="plan.icon" />
        </span>
        <div class="plan-head-copy">
          <h3 class="plan-name">{{ plan.name }}</h3>
          <p class="plan-subtitle" :title="plan.subtitle">{{ plan.subtitle }}</p>
        </div>
      </div>

      <div class="plan-price-row">
        <strong>{{ plan.price }}</strong>
        <span>/ 套餐</span>
      </div>

      <p class="plan-gift">
        <Icon icon="mdi:gift-outline" class="plan-gift-icon" />
        <span>赠送 {{ plan.giftPoints }} 积分</span>
      </p>

      <ul class="plan-benefits">
        <li v-for="benefit in plan.benefits" :key="benefit">
          <Icon icon="mdi:check-circle" class="benefit-icon" />
          <span>{{ benefit }}</span>
        </li>
      </ul>

      <button type="button" class="plan-action" @click.stop="emit('select')">
        立即充值
        <Icon icon="mdi:arrow-right" class="plan-action-icon" />
      </button>
    </div>
  </article>
</template>

<style scoped lang="scss">
.recharge-plan-card {
  --plan-accent: #2f7cff;
  --plan-shadow: 0 14px 34px rgba(47, 125, 255, 0.14);
  --plan-ring: transparent;
  --plan-lift: 0px;
  --plan-text: #10233c;
  --plan-text-muted: #5c708c;
  --plan-divider: rgba(47, 125, 255, 0.16);
  --plan-surface: rgba(255, 255, 255, 0.92);
  --plan-border: rgba(188, 205, 223, 0.55);

  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1 1 calc((100% - var(--plan-gap) - var(--plan-gap)) / 3);
  min-width: 0;
  min-height: clamp(420px, 38vh, 480px);
  width: 100%;
  max-width: calc((100% - var(--plan-gap) - var(--plan-gap)) / 3);
  overflow: hidden;
  border: 1px solid var(--plan-border);
  border-radius: clamp(14px, 1.2vw, 20px);
  background: var(--plan-surface);
  box-shadow: var(--plan-shadow);
  transform: translateY(var(--plan-lift));
  cursor: pointer;
  outline: none;
  transition:
    transform 0.26s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.26s cubic-bezier(0.22, 1, 0.36, 1);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.recharge-plan-card.is-purple {
  --plan-accent: #8f57ff;
  --plan-shadow: 0 14px 34px rgba(143, 87, 255, 0.16);
  --plan-divider: rgba(143, 87, 255, 0.16);
}

.recharge-plan-card.is-gold {
  --plan-accent: #f49a23;
  --plan-shadow: 0 14px 34px rgba(244, 154, 35, 0.16);
  --plan-divider: rgba(244, 154, 35, 0.16);
}

:global(.recharge-page.theme-dark) .recharge-plan-card {
  --plan-text: #eef6ff;
  --plan-text-muted: #9fb0c7;
  --plan-divider: rgba(148, 163, 184, 0.22);
  --plan-surface: rgba(255, 255, 255, 0.04);
  --plan-border: rgba(73, 106, 148, 0.42);
}

:global(.recharge-page.theme-dark) .recharge-plan-card.is-blue {
  --plan-shadow: 0 16px 36px rgba(47, 125, 255, 0.22);
}

:global(.recharge-page.theme-dark) .recharge-plan-card.is-purple {
  --plan-shadow: 0 16px 36px rgba(143, 87, 255, 0.24);
}

:global(.recharge-page.theme-dark) .recharge-plan-card.is-gold {
  --plan-shadow: 0 16px 36px rgba(244, 154, 35, 0.22);
}

.recharge-plan-card::after {
  content: '';
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

.plan-check,
.plan-badge {
  position: absolute;
  top: clamp(8px, 0.85vw, 12px);
  right: clamp(8px, 0.85vw, 12px);
  z-index: 5;
}

.plan-card-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex: 1;
  width: 100%;
  min-height: 100%;
  flex-direction: column;
  padding: clamp(22px, 1.8vw, 30px);
  pointer-events: none;
}

.plan-action {
  pointer-events: auto;
}

.recharge-plan-card:hover {
  --plan-lift: -5px;
}

.recharge-plan-card.is-pressing {
  --plan-lift: 2px;
  transition-duration: 0.12s;
}

.recharge-plan-card.is-selected {
  --plan-lift: -8px;
  --plan-ring: var(--plan-accent);
}

.recharge-plan-card.is-selected.is-blue {
  --plan-shadow:
    0 0 0 1px rgba(47, 125, 255, 0.2),
    0 10px 26px rgba(47, 125, 255, 0.22),
    0 24px 52px rgba(47, 125, 255, 0.32);
}

.recharge-plan-card.is-selected.is-purple {
  --plan-shadow:
    0 0 0 1px rgba(143, 87, 255, 0.22),
    0 10px 26px rgba(143, 87, 255, 0.24),
    0 24px 52px rgba(143, 87, 255, 0.34);
}

.recharge-plan-card.is-selected.is-gold {
  --plan-shadow:
    0 0 0 1px rgba(244, 154, 35, 0.24),
    0 10px 26px rgba(244, 154, 35, 0.24),
    0 24px 52px rgba(244, 154, 35, 0.34);
}

.recharge-plan-card.is-selected::after {
  opacity: 1;
}

.recharge-plan-card:focus-visible {
  --plan-ring: var(--plan-accent);
}

.recharge-plan-card:focus-visible::after {
  opacity: 1;
}

.plan-check {
  display: grid;
  place-items: center;
  width: clamp(26px, 2.2vw, 32px);
  height: clamp(26px, 2.2vw, 32px);
  border-radius: 999px;
  background: var(--plan-accent);
  color: #fff;
  font-size: 16px;
  box-shadow: 0 8px 18px color-mix(in srgb, var(--plan-accent) 42%, transparent);
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
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--plan-accent);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
}

.plan-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
  padding-right: 36px;
}

.plan-icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--plan-accent) 14%, transparent);
  color: var(--plan-accent);
  font-size: 22px;
}

.plan-head-copy {
  min-width: 0;
  flex: 1;
}

.plan-name {
  margin: 0;
  color: var(--plan-text);
  font-size: clamp(16px, 1.35vw, 18px);
  font-weight: 900;
  line-height: 1.3;
}

.plan-subtitle {
  margin: 6px 0 0;
  color: var(--plan-text-muted);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.5;
  white-space: normal;
}

.recharge-plan-card.is-gold .plan-subtitle {
  font-size: 12px;
  line-height: 1.5;
}

.plan-price-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 18px;
}

.plan-price-row strong {
  color: var(--plan-accent);
  font-size: clamp(26px, 2.4vw, 32px);
  font-weight: 900;
  line-height: 1;
}

.plan-price-row span {
  color: var(--plan-text-muted);
  font-size: 13px;
  font-weight: 700;
}

.plan-gift {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 12px 0 0;
  color: var(--plan-text);
  font-size: 13px;
  font-weight: 800;
}

.plan-gift-icon {
  color: var(--plan-accent);
  font-size: 16px;
}

.plan-benefits {
  display: grid;
  flex: 1 1 auto;
  gap: 10px;
  min-height: 0;
  margin: 18px 0 0;
  padding: 16px 0 0;
  border-top: 1px solid var(--plan-divider);
  list-style: none;
}

.plan-benefits li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  color: var(--plan-text);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
}

.plan-benefits li span {
  min-width: 0;
  white-space: normal;
}

.benefit-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--plan-accent);
  font-size: 15px;
}

.plan-action {
  display: inline-flex;
  width: 100%;
  max-width: 180px;
  height: 40px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: auto;
  padding-top: 8px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--plan-accent) 82%, white),
    var(--plan-accent)
  );
  box-shadow: 0 6px 14px color-mix(in srgb, var(--plan-accent) 28%, transparent);
  color: #fff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.plan-action-icon {
  font-size: 15px;
}

@media (max-width: 1180px) {
  .recharge-plan-card {
    min-height: 400px;
  }
}

@media (max-width: 680px) {
  .recharge-plan-card {
    min-height: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .recharge-plan-card,
  .recharge-plan-card::after,
  .plan-check {
    animation: none;
    transition: none;
  }
}
</style>
