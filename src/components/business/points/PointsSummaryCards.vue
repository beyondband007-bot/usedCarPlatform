<script setup lang="ts">
import { Icon } from "@iconify/vue";

import type { PointsSummaryCard } from "@/types/points-query";

defineProps<{
  cards: PointsSummaryCard[];
}>();
</script>

<template>
  <section class="points-summary-grid" :class="`is-${cards.length}`" aria-label="积分统计">
    <article
      v-for="card in cards"
      :key="card.key"
      class="points-summary-card"
      :class="`tone-${card.tone}`"
    >
      <header class="points-summary-card__head">
        <span>{{ card.label }}</span>
        <i class="points-summary-card__icon" aria-hidden="true">
          <Icon :icon="card.icon" />
        </i>
      </header>
      <strong>{{ card.value }}</strong>
      <small>{{ card.unit }}<template v-if="card.note"> {{ card.note }}</template></small>
    </article>
  </section>
</template>

<style scoped lang="scss">
.points-summary-grid {
  display: grid;
  gap: 16px;
}

.points-summary-grid.is-4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.points-summary-grid.is-6 {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.points-summary-card {
  position: relative;
  min-height: 132px;
  overflow: hidden;
  padding: 28px 20px 18px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgb(15 23 42 / 4%);
  transition: box-shadow 0.2s ease;
}

.points-summary-card:hover {
  box-shadow:
    0 4px 6px -1px rgb(15 23 42 / 6%),
    0 2px 4px -2px rgb(15 23 42 / 6%);
}

.points-summary-card::before {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  content: "";
  background: var(--summary-tone, #3b82f6);
}

.points-summary-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.points-summary-card__head span {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.points-summary-card__icon {
  display: grid;
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 8px;
  background: var(--summary-soft, #eff6ff);
  color: var(--summary-tone, #3b82f6);
  font-size: 17px;
  font-style: normal;
}

.points-summary-card strong {
  display: block;
  color: #0f172a;
  font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
  font-size: clamp(20px, 1.8vw, 26px);
  font-weight: 800;
  line-height: 1.15;
}

.points-summary-grid.is-6 .points-summary-card strong {
  font-size: clamp(18px, 1.5vw, 22px);
}

.points-summary-card small {
  display: block;
  margin-top: 8px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
}

.tone-blue {
  --summary-tone: #3b82f6;
  --summary-soft: #eff6ff;
}

.tone-rose {
  --summary-tone: #f43f5e;
  --summary-soft: #fff1f2;
}

.tone-emerald {
  --summary-tone: #10b981;
  --summary-soft: #ecfdf5;
}

.tone-amber {
  --summary-tone: #f59e0b;
  --summary-soft: #fffbeb;
}

.tone-violet {
  --summary-tone: #8b5cf6;
  --summary-soft: #f5f3ff;
}

.tone-cyan {
  --summary-tone: #06b6d4;
  --summary-soft: #ecfeff;
}

@media (max-width: 1280px) {
  .points-summary-grid.is-6 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .points-summary-grid.is-4,
  .points-summary-grid.is-6 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .points-summary-grid.is-4,
  .points-summary-grid.is-6 {
    grid-template-columns: 1fr;
  }
}
</style>
