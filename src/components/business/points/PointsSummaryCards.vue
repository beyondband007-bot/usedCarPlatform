<script setup lang="ts">
import { Icon } from "@iconify/vue";

import { useAppStore } from "@/stores/app";
import type { PointsSummaryCard } from "@/types/points-query";

defineProps<{
  cards: PointsSummaryCard[];
  adminTheme?: boolean;
}>();

const appStore = useAppStore();
</script>

<template>
  <section
    class="points-summary-section"
    :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'"
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
              <Icon :icon="card.icon" />
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
  gap: 16px;
}

.points-summary-grid.is-standard {
  grid-template-columns: repeat(4, minmax(0, 1fr));
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
  padding: 20px;
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

@media (max-width: 1024px) {
  .points-summary-grid.is-standard,
  .points-summary-grid.is-admin {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
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
</style>
