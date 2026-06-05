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
    :style="{ '--plan-bg-image': `url('${plan.backgroundImage}')` }"
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
    <span class="plan-bg-image" aria-hidden="true" />

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
          <span>
            赠送
            <em class="plan-gift-points">{{ plan.giftPoints }}</em>
            积分
          </span>
        </p>

        <p class="plan-subtitle" :title="plan.subtitle">{{ plan.subtitle }}</p>

        <ul class="plan-benefits">
          <li v-for="benefit in plan.benefits" :key="benefit">
            <Icon icon="mdi:check-circle-outline" class="benefit-icon" />
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
  --plan-accent: var(--color-accent-blue);
  --plan-border: var(--color-border-primary);
  --plan-ring: transparent;
  --plan-lift: 0px;
  --plan-shadow: var(--shadow-panel);
  --plan-selected-height-extra: 0px;

  position: relative;
  display: flex;
  flex: 0 1 calc((100% - var(--plan-gap) * 2) / 3);
  width: 100%;
  min-width: 0;
  min-height: calc(clamp(430px, 39vh, 496px) + var(--plan-selected-height-extra));
  max-width: calc((100% - var(--plan-gap) * 2) / 3);
  overflow: hidden;
  border: 1px solid var(--plan-border);
  border-radius: var(--radius-card);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent 38%),
    var(--color-bg-card);
  box-shadow: var(--plan-shadow);
  transform: translateY(var(--plan-lift));
  cursor: pointer;
  outline: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition:
    transform var(--motion-normal),
    border-color var(--motion-normal),
    box-shadow var(--motion-normal),
    background var(--motion-normal);
}

.recharge-plan-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0;
  box-shadow: inset 0 0 0 1px var(--plan-ring);
  transition: opacity var(--motion-normal);
}

.recharge-plan-card::after {
  content: '';
  position: absolute;
  inset: -18%;
  pointer-events: none;
  background:
    radial-gradient(circle at 50% 22%, color-mix(in srgb, var(--plan-accent) 14%, transparent), transparent 32%),
    radial-gradient(circle at 50% 100%, color-mix(in srgb, var(--plan-accent) 12%, transparent), transparent 34%);
  opacity: 0;
  transition: opacity var(--motion-normal);
}

.recharge-plan-card.is-blue {
  --plan-accent: var(--color-accent-blue);
  --plan-shadow: var(--shadow-panel);
}

.recharge-plan-card.is-gold {
  --plan-accent: var(--recharge-gold, #d89a00);
  --plan-shadow: var(--shadow-panel);
}

.recharge-plan-card.is-featured {
  --plan-border: color-mix(in srgb, var(--color-accent-blue) 42%, var(--color-border-primary));
  --plan-ring: color-mix(in srgb, var(--color-accent-blue) 68%, transparent);
}

.recharge-plan-card.is-gold.is-featured {
  --plan-border: color-mix(in srgb, var(--recharge-gold, #d89a00) 42%, var(--color-border-primary));
  --plan-ring: color-mix(in srgb, var(--recharge-gold, #d89a00) 68%, transparent);
}

.recharge-plan-card.is-featured:not(.is-selected) {
  box-shadow:
    var(--shadow-panel),
    0 0 0 1px color-mix(in srgb, var(--color-accent-blue) 18%, transparent),
    var(--shadow-blue-glow);
}

.recharge-plan-card.is-gold:not(.is-featured):not(.is-selected) {
  box-shadow:
    var(--shadow-panel),
    0 0 0 1px color-mix(in srgb, var(--recharge-gold, #d89a00) 16%, transparent),
    0 0 28px color-mix(in srgb, var(--recharge-gold, #d89a00) 16%, transparent);
}

.recharge-plan-card.is-pressing {
  --plan-lift: -1px;
}

.recharge-plan-card.is-selected {
  --plan-lift: -10px;
  --plan-ring: color-mix(in srgb, var(--plan-accent) 62%, transparent);
  --plan-selected-height-extra: 20px;
  border-color: color-mix(in srgb, var(--plan-accent) 54%, var(--plan-border));
  box-shadow:
    0 22px 60px rgba(0, 0, 0, 0.36),
    0 0 0 1px color-mix(in srgb, var(--plan-accent) 22%, transparent),
    0 0 38px color-mix(in srgb, var(--plan-accent) 20%, transparent);
}

.recharge-plan-card.is-selected.is-featured {
  --plan-lift: -12px;
  box-shadow:
    0 24px 68px rgba(0, 0, 0, 0.4),
    0 0 0 1px color-mix(in srgb, var(--color-accent-blue) 28%, transparent),
    var(--shadow-blue-glow);
}

.recharge-plan-card.is-selected.is-gold {
  box-shadow:
    0 24px 68px rgba(0, 0, 0, 0.38),
    0 0 0 1px color-mix(in srgb, var(--recharge-gold, #d89a00) 28%, transparent),
    0 0 32px color-mix(in srgb, var(--recharge-gold, #d89a00) 18%, transparent);
}

.recharge-plan-card.is-selected::before,
.recharge-plan-card.is-selected::after {
  opacity: 1;
}

.recharge-plan-card:focus-visible {
  --plan-ring: color-mix(in srgb, var(--plan-accent) 82%, transparent);
}

.recharge-plan-card:focus-visible::before {
  opacity: 1;
}

.plan-corner {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 4;
  display: flex;
  justify-content: flex-end;
  pointer-events: none;
}

.plan-bg-image {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(5, 5, 5, 0.34), rgba(5, 5, 5, 0.86)),
    var(--plan-bg-image) center / cover no-repeat;
  opacity: 0.2;
  mix-blend-mode: screen;
}

:global([data-theme='light']) .plan-bg-image {
  display: none;
}

:global([data-theme='dark']) .recharge-plan-card.is-selected .plan-bg-image {
  opacity: 0.28;
}

.plan-check {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: var(--color-brand-primary);
  color: #241700;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--color-brand-primary) 34%, transparent);
}

.plan-check-icon {
  font-size: 18px;
}

.plan-badge {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border: 1px solid color-mix(in srgb, var(--plan-accent) 50%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-bg-card-soft) 88%, transparent);
  color: var(--plan-accent);
  font-size: 11px;
  font-weight: 800;
}

.plan-card-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  width: 100%;
  min-width: 0;
  min-height: 100%;
  flex-direction: column;
  padding: clamp(22px, 1.8vw, 30px);
}

.plan-body {
  display: flex;
  width: 100%;
  max-width: 292px;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: stretch;
  margin: 0 auto;
}

.plan-head {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.plan-head-copy {
  min-width: 0;
}

.plan-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--plan-accent) 11%, var(--color-bg-card-strong));
  color: var(--plan-accent);
  font-size: 22px;
}

.plan-name {
  margin: 0;
  color: var(--color-text-primary);
  font-size: clamp(18px, 1.45vw, 20px);
  font-weight: 900;
  line-height: 1.25;
  white-space: nowrap;
}

.plan-price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 20px;
}

.plan-price-row strong {
  color: var(--plan-accent);
  font-size: clamp(34px, 3.2vw, 44px);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.03em;
}

.recharge-plan-card.is-gold .plan-price-row strong {
  color: var(--plan-accent);
}

.plan-price-row span {
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 700;
}

.plan-gift {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  margin: 14px 0 0;
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, var(--plan-accent) 26%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--plan-accent) 8%, var(--color-bg-card));
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 800;
}

.recharge-plan-card.is-gold .plan-gift {
  border-color: color-mix(in srgb, var(--recharge-gold, #d89a00) 28%, transparent);
  background: color-mix(in srgb, var(--recharge-gold, #d89a00) 8%, var(--color-bg-card));
}

.plan-gift-icon {
  flex-shrink: 0;
  color: var(--plan-accent);
  font-size: 16px;
}

.plan-gift-points {
  color: var(--plan-accent);
  font-style: normal;
  font-size: 18px;
  font-weight: 900;
}

.plan-subtitle {
  margin: 12px 0 0;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.58;
}

.plan-benefits {
  display: grid;
  gap: 10px;
  min-height: 0;
  margin: 16px 0 0;
  padding: 16px 0 0;
  border-top: 1px solid var(--color-border-soft);
  list-style: none;
}

.plan-benefits li {
  display: flex;
  gap: 8px;
  min-width: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
  white-space: nowrap;
}

.benefit-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--plan-accent);
  font-size: 15px;
}

.plan-benefits li span {
  min-width: 0;
  white-space: nowrap;
}

.plan-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  max-width: 180px;
  height: 42px;
  margin: auto auto 0;
  border: 1px solid color-mix(in srgb, var(--plan-accent) 28%, transparent);
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent),
    var(--color-bg-card-strong);
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  pointer-events: auto;
  transition:
    transform var(--motion-fast),
    border-color var(--motion-fast),
    box-shadow var(--motion-fast),
    color var(--motion-fast),
    background var(--motion-fast);
}

.recharge-plan-card.is-featured .plan-action {
  box-shadow: var(--shadow-blue-glow);
}

.recharge-plan-card.is-gold .plan-action {
  box-shadow: 0 0 24px color-mix(in srgb, var(--recharge-gold, #d89a00) 14%, transparent);
}

.plan-action:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--plan-accent) 48%, transparent);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--plan-accent) 12%, transparent),
    0 10px 24px color-mix(in srgb, var(--plan-accent) 16%, transparent);
  color: #ffffff;
}

.recharge-plan-card.is-featured .plan-action:hover {
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--color-accent-blue) 18%, transparent),
    var(--shadow-blue-glow);
}

.recharge-plan-card.is-gold .plan-action:hover {
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--recharge-gold, #d89a00) 18%, transparent),
    0 0 28px color-mix(in srgb, var(--recharge-gold, #d89a00) 16%, transparent);
}

.plan-action-icon {
  font-size: 15px;
}

@media (max-width: 1180px) {
  .recharge-plan-card {
    flex-basis: calc((100% - var(--plan-gap)) / 2);
    max-width: calc((100% - var(--plan-gap)) / 2);
  }
}

@media (max-width: 680px) {
  .recharge-plan-card {
    flex-basis: 100%;
    max-width: 100%;
    min-height: 0;
  }

  .recharge-plan-card.is-selected {
    --plan-lift: -6px;
    --plan-selected-height-extra: 0px;
  }

  .recharge-plan-card.is-selected.is-featured {
    --plan-lift: -8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .recharge-plan-card,
  .recharge-plan-card::before,
  .recharge-plan-card::after {
    transition: none;
    animation: none;
  }
}
</style>
