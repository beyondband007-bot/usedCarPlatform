<script setup lang="ts">
import { Icon } from "@iconify/vue";

import { useAppStore } from "@/stores/app";
import type { PointsSummaryCard } from "@/types/points-query";

defineProps<{
  cards: PointsSummaryCard[];
  adminTheme?: boolean;
  loading?: boolean;
  glass?: boolean;
}>();

const appStore = useAppStore();

function isAssetIcon(icon: string) {
  return !icon.startsWith("mdi:");
}
</script>

<template>
  <section
    class="points-summary-section"
    :class="[
      appStore.isDarkMode ? 'theme-dark' : 'theme-light',
      glass ? 'is-glass' : '',
      loading ? 'is-loading' : '',
    ]"
  >
    <div
      class="points-summary-grid animate-fade-in"
      :class="[adminTheme ? 'is-admin' : 'is-standard', `is-${cards.length}`]"
    >
      <article
        v-for="card in cards"
        :key="card.key"
        class="card summary-card group"
        :class="card.tone"
      >
        <div class="summary-orb" :class="card.tone"></div>
        <div class="summary-card-content">
          <div class="summary-card-row">
            <div class="summary-icon" :class="card.tone">
              <img
                v-if="isAssetIcon(card.icon)"
                class="summary-icon-image"
                :src="card.icon"
                alt=""
                width="24"
                height="24"
                decoding="async"
                draggable="false"
              />
              <Icon v-else :icon="card.icon" />
            </div>
            <div>
              <p>{{ card.label }}</p>
              <div class="summary-value-line">
                <span
                  class="summary-value"
                  :class="{
                    'is-positive': card.value.startsWith('+'),
                    'is-negative': card.value.startsWith('-'),
                  }"
                >
                  {{ card.value }}
                </span>
                <span class="summary-unit">{{ card.unit }}</span>
                <span v-if="card.note" class="summary-note">{{
                  card.note
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped lang="scss">
.points-summary-section {
  margin-bottom: 20px;
}

.points-summary-grid {
  display: grid;
  gap: var(--points-summary-gap, 16px);
}

.points-summary-grid.is-standard {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.points-summary-section.is-glass .points-summary-grid.is-standard {
  gap: var(--points-summary-gap, clamp(12px, 1.2vw, 16px));
}

.points-summary-grid.is-admin {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.points-summary-grid.is-admin.is-6 .card:nth-child(3) {
  margin-bottom: 16px;
}

.card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 4%);
  transition:
    box-shadow 0.2s ease,
    transform 0.15s ease;
}

.card:hover {
  box-shadow:
    0 4px 6px -1px rgb(0 0 0 / 6%),
    0 2px 4px -2px rgb(0 0 0 / 6%);
}

.summary-card {
  position: relative;
  overflow: hidden;
  padding: clamp(14px, 1.6vw, 20px);
}

.summary-card:hover {
  transform: translateY(-2px);
}

.summary-card::before {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 3px 3px 0 0;
  content: "";
}

.summary-card.blue::before {
  background: #3b82f6;
}

.summary-card.emerald::before {
  background: #10b981;
}

.summary-card.rose::before {
  background: #f43f5e;
}

.summary-card.amber::before {
  background: #f59e0b;
}

.summary-card.violet::before {
  background: #8b5cf6;
}

.summary-card.cyan::before {
  background: #06b6d4;
}

.summary-orb {
  position: absolute;
  top: -24px;
  right: -24px;
  width: 112px;
  height: 112px;
  border-radius: 999px;
  opacity: 0.72;
  transition: background 0.2s ease;
}

.summary-orb.blue {
  background: #eff6ff;
}

.summary-orb.emerald {
  background: #ecfdf5;
}

.summary-orb.rose {
  background: #fff1f2;
}

.summary-orb.amber {
  background: #fffbeb;
}

.summary-orb.violet {
  background: #f5f3ff;
}

.summary-orb.cyan {
  background: #ecfeff;
}

.summary-card-content {
  position: relative;
  z-index: 1;
}

.summary-card-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.summary-icon {
  display: flex;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgb(15 23 42 / 8%);
  font-size: 22px;
}

.summary-icon-image {
  display: block;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  object-fit: contain;
}

.summary-icon.blue {
  background: #dbeafe;
  color: #2563eb;
}

.summary-icon.emerald {
  background: #d1fae5;
  color: #059669;
}

.summary-icon.rose {
  background: #ffe4e6;
  color: #e11d48;
}

.summary-icon.amber {
  background: #fef3c7;
  color: #d97706;
}

.summary-icon.violet {
  background: #ede9fe;
  color: #7c3aed;
}

.summary-icon.cyan {
  background: #cffafe;
  color: #0891b2;
}

.summary-card p {
  margin: 0 0 6px;
  color: #94a3b8;
  font-size: 11px;
  letter-spacing: 0.025em;
  line-height: 1;
}

.summary-value-line {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.summary-value {
  color: #0f172a;
  font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 26px;
  font-weight: 800;
  line-height: 1;
}

.summary-value.is-positive {
  color: #059669;
}

.summary-value.is-negative {
  color: #e11d48;
}

.summary-unit,
.summary-note {
  color: #94a3b8;
  font-size: 11px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn 0.35s ease forwards;
}

/* 1440+：四列指标卡 */
@media (max-width: 1439px) {
  .points-summary-grid.is-standard {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1023px) {
  .points-summary-grid.is-admin {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

}

@media (max-width: 767px) {
  .points-summary-grid.is-standard,
  .points-summary-grid.is-admin {
    grid-template-columns: 1fr;
  }
}

.points-summary-section.theme-dark .card {
  border-color: #263347;
  background: #111827;
  box-shadow: none;
}

.points-summary-section.theme-dark .card:hover {
  box-shadow: 0 4px 12px rgb(0 0 0 / 24%);
}

.points-summary-section.theme-dark .summary-orb.blue {
  background: rgb(59 130 246 / 12%);
}

.points-summary-section.theme-dark .summary-orb.emerald {
  background: rgb(16 185 129 / 12%);
}

.points-summary-section.theme-dark .summary-orb.rose {
  background: rgb(239 68 68 / 12%);
}

.points-summary-section.theme-dark .summary-orb.amber {
  background: rgb(245 166 35 / 12%);
}

.points-summary-section.theme-dark .summary-orb.violet {
  background: rgb(139 92 246 / 12%);
}

.points-summary-section.theme-dark .summary-orb.cyan {
  background: rgb(6 182 212 / 12%);
}

.points-summary-section.theme-dark .summary-icon.blue {
  background: rgb(59 130 246 / 18%);
  color: #3b82f6;
}

.points-summary-section.theme-dark .summary-icon.emerald {
  background: rgb(16 185 129 / 18%);
  color: #10b981;
}

.points-summary-section.theme-dark .summary-icon.rose {
  background: rgb(239 68 68 / 18%);
  color: #ef4444;
}

.points-summary-section.theme-dark .summary-icon.amber {
  background: rgb(245 166 35 / 18%);
  color: #f5a623;
}

.points-summary-section.theme-dark .summary-icon.violet {
  background: rgb(139 92 246 / 18%);
  color: #a78bfa;
}

.points-summary-section.theme-dark .summary-icon.cyan {
  background: rgb(6 182 212 / 18%);
  color: #22d3ee;
}

.points-summary-section.theme-dark .summary-card p {
  color: #9ca3af;
}

.points-summary-section.theme-dark .summary-value {
  color: #f3f4f6;
}

.points-summary-section.theme-dark .summary-value.is-positive {
  color: #10b981;
}

.points-summary-section.theme-dark .summary-value.is-negative {
  color: #ef4444;
}

.points-summary-section.theme-dark .summary-unit,
.points-summary-section.theme-dark .summary-note {
  color: #9ca3af;
}

.points-summary-section.is-loading {
  opacity: 0.72;
  pointer-events: none;
}

.points-summary-section.is-glass {
  margin-bottom: 0;
}

.points-summary-section.is-glass .card {
  border: 1px solid #e8edf3;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 4px 14px rgb(15 23 42 / 4%);
}

.points-summary-section.is-glass .card:hover {
  transform: none;
  box-shadow: 0 6px 18px rgb(15 23 42 / 6%);
}

.points-summary-section.is-glass .summary-card::before {
  display: none;
}

.points-summary-section.is-glass .summary-orb {
  display: none;
}

.points-summary-section.is-glass .summary-card p {
  color: #64748b;
  font-size: 11px;
  font-weight: 400;
}

.points-summary-section.is-glass .summary-value-line {
  margin-top: 4px;
}

.points-summary-section.is-glass .summary-unit {
  color: #94a3b8;
  font-size: 11px;
}

.points-summary-section.is-glass .summary-icon {
  width: 48px;
  height: 48px;
  flex-basis: 48px;
  border-radius: 999px;
  background: linear-gradient(180deg, #f4d36a 0%, #d4a017 100%);
  box-shadow: 0 8px 18px rgb(212 160 23 / 28%);
  color: #ffffff;
  font-size: 24px;
}

.points-summary-section.is-glass .summary-icon-image {
  width: 24px;
  height: 24px;
}

.points-summary-section.is-glass .summary-icon.blue,
.points-summary-section.is-glass .summary-icon.emerald,
.points-summary-section.is-glass .summary-icon.rose,
.points-summary-section.is-glass .summary-icon.amber,
.points-summary-section.is-glass .summary-icon.violet,
.points-summary-section.is-glass .summary-icon.cyan {
  background: linear-gradient(180deg, #f4d36a 0%, #d4a017 100%);
  color: #ffffff;
}

.points-summary-section.is-glass .summary-card {
  padding: clamp(12px, 1.4vw, 18px);
}

.points-summary-section.is-glass .summary-value {
  font-size: 26px;
}

.points-summary-section.theme-dark.is-glass .card {
  border-color: rgb(255 255 255 / 12%);
  background: rgb(27, 28, 29);
  box-shadow: none;
}

.points-summary-section.theme-dark.is-glass .summary-card p,
.points-summary-section.theme-dark.is-glass .summary-unit,
.points-summary-section.theme-dark.is-glass .summary-note {
  color: #9ca3af;
}

.points-summary-section.theme-dark.is-glass .summary-value {
  color: #f8fafc;
}
</style>
