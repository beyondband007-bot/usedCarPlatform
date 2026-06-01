<script setup lang="ts">
import { Icon } from "@iconify/vue";

import type { PointsQueryVersion } from "@/types/points-query";

defineProps<{
  version: PointsQueryVersion;
}>();

const emit = defineEmits<{
  "update:version": [value: PointsQueryVersion];
}>();

function setVersion(value: PointsQueryVersion) {
  emit("update:version", value);
}
</script>

<template>
  <header class="points-query-header">
    <div class="points-query-header__inner">
      <div class="points-query-brand">
        <span class="points-query-brand__icon" aria-hidden="true">
          <Icon icon="mdi:coins" />
        </span>
        <span>
          <strong>积分查询</strong>
          <small>积分流水筛选与查看</small>
        </span>
      </div>

      <div class="points-version-switch" aria-label="积分查询版本">
        <button
          type="button"
          class="points-version-switch__button"
          :class="{ active: version === 'personal' }"
          @click="setVersion('personal')"
        >
          <Icon icon="mdi:account-outline" />
          个人版
        </button>
        <button
          type="button"
          class="points-version-switch__button"
          :class="{ active: version === 'enterprise' }"
          @click="setVersion('enterprise')"
        >
          <Icon icon="mdi:office-building-outline" />
          企业版
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
.points-query-header {
  position: sticky;
  top: 0;
  z-index: 8;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
}

.points-query-header__inner {
  display: flex;
  width: min(100%, 1440px);
  min-height: 74px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin: 0 auto;
  padding: 14px 24px;
}

.points-query-brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.points-query-brand__icon {
  display: grid;
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 9px;
  background: #2563eb;
  color: #ffffff;
  font-size: 20px;
}

.points-query-brand strong,
.points-query-brand small {
  display: block;
  line-height: 1.25;
}

.points-query-brand strong {
  color: #0f172a;
  font-size: 18px;
  font-weight: 800;
}

.points-query-brand small {
  margin-top: 3px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
}

.points-version-switch {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 9px;
  background: #f1f5f9;
}

.points-version-switch__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 18px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.points-version-switch__button:hover {
  background: #eaf1fb;
  color: #334155;
}

.points-version-switch__button.active {
  background: #dbeafe;
  color: #1e40af;
}

@media (max-width: 640px) {
  .points-query-header__inner {
    align-items: flex-start;
    flex-direction: column;
  }

  .points-version-switch {
    width: 100%;
  }

  .points-version-switch__button {
    flex: 1;
  }
}
</style>
