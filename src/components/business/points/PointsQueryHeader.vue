<script setup lang="ts">
import { Icon } from "@iconify/vue";

import { useAppStore } from "@/stores/app";
import type { PointsQueryViewConfig } from "@/types/points-query";

defineProps<{
  config: PointsQueryViewConfig;
}>();

const appStore = useAppStore();
</script>

<template>
  <header
    class="points-query-header"
    :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'"
  >
    <div class="points-query-header__inner">
      <div class="points-query-brand">
        <div class="points-query-brand__icon" :class="config.iconClassName">
          <Icon :icon="config.icon" />
        </div>
        <div>
          <h1>积分查询</h1>
          <p>{{ config.subtitle }}</p>
        </div>
      </div>

      <div class="points-query-user">
        <span v-if="config.teamLabel" class="points-query-team-label">
          当前团队：
        </span>
        <div
          v-for="badge in config.badges"
          :key="badge.text"
          class="points-query-badge"
          :class="badge.className"
        >
          <Icon :icon="badge.icon" />
          {{ badge.text }}
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
.points-query-header {
  position: sticky;
  top: 0;
  z-index: 40;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
}

.points-query-header__inner {
  display: flex;
  width: min(100%, 1440px);
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin: 0 auto;
  padding: 16px 24px;
}

.points-query-brand {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.points-query-brand__icon {
  display: flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #ffffff;
  font-size: 20px;
}

.points-query-brand__icon.is-blue {
  background: #2563eb;
}

.points-query-brand__icon.is-violet {
  background: #7c3aed;
}

.points-query-brand h1 {
  margin: 0;
  color: #0f172a;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
}

.points-query-brand p {
  margin: 4px 0 0;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.2;
  white-space: nowrap;
}

.points-query-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.points-query-team-label {
  color: #94a3b8;
  font-size: 12px;
  white-space: nowrap;
}

.points-query-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
}

.points-query-badge.is-personal,
.points-query-badge.is-team {
  background: #eff6ff;
  color: #1d4ed8;
}

.points-query-badge.is-member {
  background: #f1f5f9;
  color: #475569;
}

.points-query-badge.is-admin {
  background: #f3e8ff;
  color: #6b21a8;
  font-weight: 700;
}

@media (max-width: 720px) {
  .points-query-header__inner {
    align-items: flex-start;
    flex-direction: column;
  }

  .points-query-user {
    flex-wrap: wrap;
  }
}

.points-query-header.theme-dark {
  border-bottom-color: #263347;
  background: #111827;
}

.points-query-header.theme-dark .points-query-brand h1 {
  color: #f3f4f6;
}

.points-query-header.theme-dark .points-query-brand p,
.points-query-header.theme-dark .points-query-team-label {
  color: #9ca3af;
}

.points-query-header.theme-dark .points-query-badge.is-personal,
.points-query-header.theme-dark .points-query-badge.is-team {
  background: rgb(59 130 246 / 16%);
  color: #3b82f6;
}

.points-query-header.theme-dark .points-query-badge.is-member {
  background: #1a2436;
  color: #9ca3af;
}

.points-query-header.theme-dark .points-query-badge.is-admin {
  background: rgb(245 166 35 / 16%);
  color: #f5a623;
}
</style>
