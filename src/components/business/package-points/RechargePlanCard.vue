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
    <img
      class="plan-card-bg"
      :src="plan.backgroundImage"
      :alt="plan.name"
      loading="lazy"
      decoding="async"
      draggable="false"
    />

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
  /* 原图 1536×1024，略增高比例避免内容区与按钮重叠 */
  --plan-card-ratio-w: 1536;
  --plan-card-ratio-h: 1112;

  position: relative;
  flex: 1 1 calc((100% - var(--plan-gap) - var(--plan-gap)) / 3);
  min-width: 0;
  width: 100%;
  max-width: calc((100% - var(--plan-gap) - var(--plan-gap)) / 3);
  aspect-ratio: var(--plan-card-ratio-w) / var(--plan-card-ratio-h);
  overflow: hidden;
  border: 0;
  border-radius: clamp(14px, 1.2vw, 20px);
  background: transparent;
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
  --plan-card-ratio-h: 1152;
}

:global(.recharge-page.theme-dark) .recharge-plan-card {
  --plan-text: #eef6ff;
  --plan-text-muted: #9fb0c7;
  --plan-divider: rgba(148, 163, 184, 0.22);
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

.recharge-plan-card::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  background: linear-gradient(
    105deg,
    rgba(255, 255, 255, 0.9) 0%,
    rgba(255, 255, 255, 0.78) 30%,
    rgba(255, 255, 255, 0.34) 52%,
    rgba(255, 255, 255, 0.04) 68%,
    transparent 100%
  );
  pointer-events: none;
}

:global(.recharge-page.theme-dark) .recharge-plan-card::before {
  background: linear-gradient(
    105deg,
    rgba(12, 20, 36, 0.92) 0%,
    rgba(12, 20, 36, 0.76) 30%,
    rgba(12, 20, 36, 0.34) 52%,
    rgba(12, 20, 36, 0.06) 68%,
    transparent 100%
  );
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

.plan-card-bg {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: right center;
  pointer-events: none;
  transition: filter 0.26s ease;
}

.recharge-plan-card:not(.is-selected) .plan-card-bg {
  filter: saturate(0.94) brightness(0.98);
}

.recharge-plan-card.is-selected .plan-card-bg {
  filter: saturate(1.04) brightness(1.02);
}

.recharge-plan-card.is-pressing .plan-card-bg {
  filter: saturate(1) brightness(0.96);
}

.plan-check,
.plan-badge {
  position: absolute;
  top: clamp(8px, 0.85vw, 12px);
  right: clamp(8px, 0.85vw, 12px);
  z-index: 5;
}

.plan-card-content {
  position: absolute;
  top: 0;
  bottom: 0;
  left: clamp(18px, 8%, 48px);
  z-index: 2;
  display: flex;
  width: 54%;
  max-width: 54%;
  flex-direction: column;
  padding: clamp(10px, 1.1vw, 14px) clamp(8px, 0.8vw, 12px)
    clamp(10px, 1.1vw, 14px);
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
  gap: 8px;
  min-width: 0;
  padding-right: 4px;
}

.plan-icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--plan-accent) 14%, transparent);
  color: var(--plan-accent);
  font-size: 20px;
}

.plan-head-copy {
  min-width: 0;
  flex: 1;
}

.plan-name {
  margin: 0;
  color: var(--plan-text);
  font-size: clamp(15px, 1.25vw, 17px);
  font-weight: 900;
  line-height: 1.25;
}

.plan-subtitle {
  margin: 2px 0 0;
  color: var(--plan-text-muted);
  font-size: 10px;
  font-weight: 600;
  line-height: 1.4;
  white-space: normal;
}

.recharge-plan-card.is-gold .plan-card-content {
  width: 56%;
  max-width: 56%;
}

.recharge-plan-card.is-gold .plan-subtitle {
  font-size: 9.5px;
  line-height: 1.45;
}

.plan-price-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-top: 8px;
}

.plan-price-row strong {
  color: var(--plan-accent);
  font-size: clamp(22px, 2.2vw, 28px);
  font-weight: 900;
  line-height: 1;
}

.plan-price-row span {
  color: var(--plan-text-muted);
  font-size: 11px;
  font-weight: 700;
}

.plan-gift {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 6px 0 0;
  color: var(--plan-text);
  font-size: 11px;
  font-weight: 800;
}

.plan-gift-icon {
  color: var(--plan-accent);
  font-size: 14px;
}

.plan-benefits {
  display: grid;
  flex: 1 1 auto;
  gap: 4px;
  min-height: 0;
  margin: 8px 0 0;
  padding: 8px 0 0;
  border-top: 1px solid var(--plan-divider);
  list-style: none;
}

.plan-benefits li {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  min-width: 0;
  color: var(--plan-text);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
}

.plan-benefits li span {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.benefit-icon {
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--plan-accent);
  font-size: 13px;
}

.plan-action {
  display: inline-flex;
  width: 100%;
  max-width: 168px;
  height: 34px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: auto;
  padding-top: 4px;
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
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.plan-action-icon {
  font-size: 14px;
}

/* 三列偏窄或视口偏矮时，再略增高并收紧内文，避免按钮压住权益列表 */
@media (max-width: 1320px), (max-height: 900px) {
  .recharge-plan-card {
    --plan-card-ratio-h: 1160;
  }

  .recharge-plan-card.is-gold {
    --plan-card-ratio-h: 1192;
  }

  .plan-price-row {
    margin-top: 6px;
  }

  .plan-gift {
    margin-top: 4px;
  }

  .plan-benefits {
    gap: 3px;
    margin-top: 6px;
    padding-top: 6px;
  }

  .plan-benefits li {
    font-size: 10px;
    line-height: 1.3;
  }

  .benefit-icon {
    font-size: 12px;
  }

  .plan-action {
    height: 32px;
    padding-top: 2px;
  }
}

@media (max-width: 1180px) {
  .recharge-plan-card,
  .recharge-plan-card.is-gold {
    --plan-card-ratio-h: 1112;
  }
}

@media (max-width: 680px) {
  .recharge-plan-card {
    --plan-card-ratio-h: 1088;
  }

  .recharge-plan-card.is-gold {
    --plan-card-ratio-h: 1120;
  }

  .plan-card-content {
    width: 56%;
    max-width: 56%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .recharge-plan-card,
  .recharge-plan-card::after,
  .plan-card-bg,
  .plan-check {
    animation: none;
    transition: none;
  }
}
</style>
