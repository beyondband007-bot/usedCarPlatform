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
  `is-${props.plan.tone === 'purple' ? 'blue' : props.plan.tone}`,
  {
    'is-featured': props.plan.badge === '推荐',
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
    <div class="plan-corner">
      <span v-if="selected" class="plan-check" aria-hidden="true">
        <Icon icon="mdi:check-bold" class="plan-check-icon" />
      </span>
      <span v-else-if="plan.badge" class="plan-badge">{{ plan.badge }}</span>
    </div>

    <div class="plan-card-content">
      <div class="plan-body">
        <div class="plan-head">
          <span class="plan-icon" aria-hidden="true">
            <Icon :icon="plan.icon" />
          </span>
          <div class="plan-head-copy">
            <h3 class="plan-name">{{ plan.name }}</h3>
          </div>
        </div>

        <div class="plan-price-row">
          <strong>{{ plan.price }}</strong>
          <span>/ 套餐</span>
        </div>

        <p class="plan-gift">
          <Icon icon="mdi:gift-outline" class="plan-gift-icon" />
          <span>赠送 <em class="plan-gift-points">{{ plan.giftPoints }}</em> 积分</span>
        </p>

        <p class="plan-subtitle" :title="plan.subtitle">{{ plan.subtitle }}</p>

        <ul class="plan-benefits">
          <li v-for="benefit in plan.benefits" :key="benefit">
            <Icon icon="mdi:check-circle" class="benefit-icon" />
            <span>{{ benefit }}</span>
          </li>
        </ul>
      </div>

      <button type="button" class="plan-action" @click.stop="emit('select')">
        立即充值
        <Icon icon="mdi:arrow-right" class="plan-action-icon" />
      </button>
    </div>
  </article>
</template>

<style scoped lang="scss">
.recharge-plan-card {
  --plan-accent: #2f6bff;
  --plan-accent-hover: #4f7fff;
  --plan-shadow: none;
  --plan-ring: transparent;
  --plan-lift: 0px;
  --plan-text: #172033;
  --plan-text-muted: #64748b;
  --plan-divider: #e8edf5;
  --plan-surface: #ffffff;
  --plan-border: #e8edf5;

  position: relative;
  display: flex;
  flex-direction: column;
  flex: 0 1 calc((100% - var(--plan-gap) - var(--plan-gap)) / 3);
  min-width: 0;
  min-height: clamp(420px, 38vh, 480px);
  width: 100%;
  max-width: calc((100% - var(--plan-gap) - var(--plan-gap)) / 3);
  overflow: hidden;
  border: 1px solid var(--plan-border);
  border-radius: 16px;
  background: var(--plan-surface);
  box-shadow: var(--plan-shadow);
  transform: translateY(var(--plan-lift));
  cursor: pointer;
  outline: none;
  transition: all 0.25s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.recharge-plan-card.is-gold {
  --plan-accent: #d4a017;
  --plan-accent-hover: #e5b85c;
}

/* 主推仅保留「推荐」角标，未选中时与普通卡片一致 */
.recharge-plan-card.is-featured:not(.is-selected) {
  min-height: clamp(420px, 38vh, 480px);
}

:global(.recharge-page.theme-dark) .recharge-plan-card {
  --plan-text: #eef6ff;
  --plan-text-muted: #9fb0c7;
  --plan-divider: rgba(148, 163, 184, 0.22);
  --plan-surface: rgba(255, 255, 255, 0.04);
  --plan-border: rgba(73, 106, 148, 0.42);
}

:global(.recharge-page.theme-dark) .recharge-plan-card.is-blue {
  --plan-shadow: 0 16px 36px rgba(47, 107, 255, 0.22);
}

:global(.recharge-page.theme-dark) .recharge-plan-card.is-gold {
  --plan-shadow: 0 16px 36px rgba(212, 160, 23, 0.22);
}

:global(.recharge-page.theme-dark) .recharge-plan-card.is-selected {
  box-shadow:
    0 18px 44px rgba(47, 107, 255, 0.24),
    0 4px 12px rgba(47, 107, 255, 0.1);
}

:global(.recharge-page.theme-dark) .recharge-plan-card.is-selected.is-gold {
  box-shadow:
    0 18px 44px rgba(212, 160, 23, 0.22),
    0 4px 12px rgba(212, 160, 23, 0.1);
}

.recharge-plan-card::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 4;
  border: 2px solid var(--plan-ring);
  border-radius: inherit;
  pointer-events: none;
  opacity: 0;
  transition: all 0.25s ease;
}

.plan-corner {
  position: absolute;
  top: clamp(10px, 0.9vw, 14px);
  right: clamp(10px, 0.9vw, 14px);
  left: auto;
  z-index: 6;
  display: flex;
  justify-content: flex-end;
  pointer-events: none;
}

.plan-card-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex: 1;
  width: 100%;
  min-height: 100%;
  flex-direction: column;
  align-items: center;
  padding: clamp(22px, 1.8vw, 30px);
  pointer-events: none;
}

.plan-body {
  display: flex;
  width: 100%;
  max-width: 280px;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.plan-action {
  pointer-events: auto;
}

.recharge-plan-card:hover:not(.is-selected) {
  --plan-lift: -4px;
  border-color: #cfe0ff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.recharge-plan-card.is-gold:hover:not(.is-selected) {
  border-color: color-mix(in srgb, #d4a017 35%, #e8edf5);
}

.recharge-plan-card.is-pressing {
  --plan-lift: 0px;
  transition-duration: 0.12s;
}

.recharge-plan-card.is-selected {
  --plan-lift: -10px;
  --plan-ring: transparent;
  z-index: 2;
  border: 1px solid var(--plan-border);
  box-shadow:
    0 16px 40px rgba(47, 107, 255, 0.2),
    0 4px 12px rgba(47, 107, 255, 0.08);
  animation: plan-card-select 0.48s cubic-bezier(0.22, 1, 0.36, 1);
}

.recharge-plan-card.is-selected.is-featured {
  --plan-lift: -12px;
  min-height: clamp(448px, 41vh, 508px);
  box-shadow:
    0 20px 48px rgba(47, 107, 255, 0.24),
    0 6px 16px rgba(47, 107, 255, 0.1);
}

.recharge-plan-card.is-selected.is-gold {
  --plan-ring: transparent;
  border: 1px solid var(--plan-border);
  box-shadow:
    0 16px 40px rgba(212, 160, 23, 0.2),
    0 4px 12px rgba(212, 160, 23, 0.08);
}

.recharge-plan-card.is-selected.is-gold.is-featured {
  box-shadow:
    0 20px 48px rgba(212, 160, 23, 0.24),
    0 6px 16px rgba(212, 160, 23, 0.1);
}

.recharge-plan-card.is-selected:hover {
  --plan-lift: -10px;
}

.recharge-plan-card.is-selected.is-featured:hover {
  --plan-lift: -12px;
}

@keyframes plan-card-select {
  0% {
    transform: translateY(0) scale(1);
    box-shadow: 0 0 0 0 rgba(47, 107, 255, 0);
  }

  45% {
    transform: translateY(-12px) scale(1.015);
  }

  100% {
    transform: translateY(var(--plan-lift)) scale(1);
  }
}

.recharge-plan-card.is-selected::after {
  opacity: 0;
  animation: none;
}

.recharge-plan-card:focus-visible {
  --plan-ring: var(--plan-accent);
}

.recharge-plan-card:focus-visible::after {
  opacity: 1;
}

.plan-check {
  position: static;
  display: grid;
  place-items: center;
  width: clamp(32px, 2.6vw, 38px);
  height: clamp(32px, 2.6vw, 38px);
  border-radius: 999px;
  background: #2f6bff;
  color: #fff;
  box-shadow: 0 6px 16px rgba(47, 107, 255, 0.28);
  animation: plan-check-pop 0.42s cubic-bezier(0.22, 1, 0.36, 1);
}

.recharge-plan-card.is-selected.is-gold .plan-check {
  background: #d4a017;
  box-shadow: 0 6px 16px rgba(212, 160, 23, 0.28);
}

.plan-check-icon {
  font-size: 18px;
}

@keyframes plan-check-pop {
  0% {
    opacity: 0;
    transform: scale(0.4) rotate(-20deg);
  }

  60% {
    transform: scale(1.12) rotate(4deg);
  }

  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

.plan-badge {
  padding: 4px 10px;
  border-radius: 999px;
  background: #2f6bff;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
}

.recharge-plan-card.is-gold .plan-badge {
  background: #d4a017;
}

.plan-head {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.plan-head-copy {
  min-width: 0;
  width: 100%;
}

.plan-icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: #eef4ff;
  color: var(--plan-accent);
  font-size: 22px;
}

.recharge-plan-card.is-gold .plan-icon {
  background: #fff6e0;
}

.plan-name {
  margin: 0;
  color: var(--plan-text);
  font-size: clamp(16px, 1.35vw, 18px);
  font-weight: 900;
  line-height: 1.3;
  text-align: center;
}

.plan-price-row {
  display: flex;
  width: 100%;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  margin-top: 20px;
}

.plan-price-row strong {
  color: var(--plan-accent);
  font-size: clamp(32px, 3vw, 40px);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.02em;
  transition: color 0.25s ease, transform 0.25s ease;
}

.recharge-plan-card.is-selected .plan-price-row strong {
  transform: scale(1.03);
  transform-origin: center center;
}

.recharge-plan-card.is-selected:not(.is-gold) .plan-price-row strong {
  color: #2f6bff;
}

.recharge-plan-card.is-selected.is-gold .plan-price-row strong {
  color: #d4a017;
}

.plan-price-row span {
  color: var(--plan-text-muted);
  font-size: 13px;
  font-weight: 700;
}

.plan-gift {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 14px 0 0;
  padding: 8px 12px;
  border-radius: 10px;
  background: #eef4ff;
  color: var(--plan-text);
  font-size: 14px;
  font-weight: 800;
  transition: background 0.25s ease, box-shadow 0.25s ease;
}

.recharge-plan-card.is-gold .plan-gift {
  background: #fff6e0;
}

.plan-gift-icon {
  flex-shrink: 0;
  color: var(--plan-accent);
  font-size: 18px;
}

.plan-gift-points {
  color: #2f6bff;
  font-style: normal;
  font-size: clamp(18px, 1.6vw, 22px);
  font-weight: 900;
  letter-spacing: -0.01em;
}

.recharge-plan-card.is-gold .plan-gift-points {
  color: #d4a017;
}

.plan-subtitle {
  width: 100%;
  margin: 12px 0 0;
  color: var(--plan-text-muted);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.55;
  text-align: left;
  white-space: normal;
}

.plan-benefits {
  display: grid;
  width: 100%;
  flex: 1 1 auto;
  gap: 10px;
  min-height: 0;
  margin: 16px 0 0;
  padding: 16px 0 0;
  border-top: 1px solid var(--plan-divider);
  list-style: none;
  text-align: left;
}

.plan-benefits li {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 8px;
  min-width: 0;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
  text-align: left;
}

:global(.recharge-page.theme-dark) .plan-benefits li {
  color: var(--plan-text);
}

.benefit-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--plan-accent);
  font-size: 15px;
}

.plan-benefits li span {
  flex: 0 1 auto;
  min-width: 0;
  white-space: normal;
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
  margin: auto auto 0;
  padding-top: 8px;
  border: 0;
  border-radius: 999px;
  background: var(--plan-accent);
  box-shadow: 0 6px 14px color-mix(in srgb, var(--plan-accent) 28%, transparent);
  color: #fff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.25s ease, box-shadow 0.25s ease;
}

.recharge-plan-card.is-blue .plan-action,
.recharge-plan-card.is-featured .plan-action {
  background: #2f6bff;
}

.recharge-plan-card.is-selected:not(.is-gold) .plan-action {
  box-shadow: 0 8px 20px rgba(47, 107, 255, 0.36);
}

.recharge-plan-card.is-selected.is-gold .plan-action {
  box-shadow: 0 8px 20px rgba(212, 160, 23, 0.34);
}

.recharge-plan-card.is-blue .plan-action:hover,
.recharge-plan-card.is-featured .plan-action:hover {
  background: #4f7fff;
}

.recharge-plan-card.is-gold .plan-action {
  background: #d4a017;
}

.recharge-plan-card.is-gold .plan-action:hover {
  background: #e5b85c;
}

.plan-action-icon {
  font-size: 15px;
}

@media (max-width: 1180px) {
  .recharge-plan-card {
    min-height: 400px;
  }

  .recharge-plan-card.is-selected.is-featured {
    min-height: 420px;
  }
}

@media (max-width: 680px) {
  .recharge-plan-card,
  .recharge-plan-card.is-featured:not(.is-selected),
  .recharge-plan-card.is-selected.is-featured {
    min-height: 0;
  }

  .recharge-plan-card.is-selected {
    --plan-lift: -6px;
  }

  .recharge-plan-card.is-selected.is-featured {
    --plan-lift: -8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .recharge-plan-card,
  .recharge-plan-card::after,
  .plan-check {
    animation: none;
    transition: none;
  }

  .recharge-plan-card.is-selected::after {
    animation: none;
  }
}
</style>
