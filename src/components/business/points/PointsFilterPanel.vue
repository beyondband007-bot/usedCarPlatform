<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { computed } from "vue";

import type {
  PointsBizSource,
  PointsQueryFilters,
  PointsQueryVersion,
  PointsTxnType,
} from "@/types/points-query";

const props = defineProps<{
  version: PointsQueryVersion;
  filters: PointsQueryFilters;
}>();

const emit = defineEmits<{
  "update:filters": [value: PointsQueryFilters];
  query: [];
}>();

const memberOptions = [
  { value: "", label: "全部成员" },
  { value: "self", label: "仅我自己" },
  { value: "u001", label: "张小明（管理员）" },
  { value: "u002", label: "李芳（普通成员）" },
  { value: "u003", label: "王强（普通成员）" },
  { value: "u004", label: "赵雪（普通成员）" },
];

const txnTypeOptions: Array<{ value: "" | PointsTxnType; label: string }> = [
  { value: "", label: "全部" },
  { value: "recharge", label: "充值" },
  { value: "gift", label: "赠送" },
  { value: "consume", label: "消费" },
  { value: "refund", label: "退款" },
];

const dateRangeOptions = [
  { value: "", label: "全部时间" },
  { value: "7", label: "近7天" },
  { value: "30", label: "近30天" },
  { value: "90", label: "近90天" },
  { value: "custom", label: "自定义" },
];

const bizSourceOptions: Array<{ value: "" | PointsBizSource; label: string }> = [
  { value: "", label: "全部" },
  { value: "single", label: "单图生成" },
  { value: "batch", label: "批量上新" },
  { value: "package", label: "套餐赠送" },
  { value: "purchase", label: "充值购买" },
  { value: "fail", label: "失败退款" },
];

const showCustomDate = computed(() => props.filters.dateRange === "custom");

function patchFilters(patch: Partial<PointsQueryFilters>) {
  emit("update:filters", {
    ...props.filters,
    ...patch,
  });
}
</script>

<template>
  <section class="points-filter-card">
    <header class="points-filter-card__head">
      <Icon icon="mdi:filter-outline" />
      <h2>筛选条件</h2>
    </header>

    <div class="points-filter-grid">
      <label v-if="version === 'admin'" class="points-filter-field">
        <span>成员账号</span>
        <select
          :value="filters.member"
          class="points-form-select"
          @change="patchFilters({ member: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="item in memberOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </label>

      <label class="points-filter-field">
        <span>流水类型</span>
        <select
          :value="filters.txnType"
          class="points-form-select"
          @change="patchFilters({ txnType: ($event.target as HTMLSelectElement).value as PointsQueryFilters['txnType'] })"
        >
          <option v-for="item in txnTypeOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </label>

      <label class="points-filter-field">
        <span>时间范围</span>
        <select
          :value="filters.dateRange"
          class="points-form-select"
          @change="patchFilters({ dateRange: ($event.target as HTMLSelectElement).value as PointsQueryFilters['dateRange'] })"
        >
          <option v-for="item in dateRangeOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </label>

      <label v-if="showCustomDate" class="points-filter-field points-filter-field--date">
        <span>自定义日期</span>
        <span class="points-date-range">
          <input
            :value="filters.startDate"
            class="points-form-input"
            type="date"
            @input="patchFilters({ startDate: ($event.target as HTMLInputElement).value })"
          />
          <i>~</i>
          <input
            :value="filters.endDate"
            class="points-form-input"
            type="date"
            @input="patchFilters({ endDate: ($event.target as HTMLInputElement).value })"
          />
        </span>
      </label>

      <label class="points-filter-field">
        <span>业务来源</span>
        <select
          :value="filters.bizSource"
          class="points-form-select"
          @change="patchFilters({ bizSource: ($event.target as HTMLSelectElement).value as PointsQueryFilters['bizSource'] })"
        >
          <option v-for="item in bizSourceOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </label>

      <div class="points-filter-action">
        <button type="button" class="points-query-button" @click="emit('query')">
          <Icon icon="mdi:magnify" />
          查询
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.points-filter-card {
  padding: 22px 20px 20px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgb(15 23 42 / 4%);
}

.points-filter-card__head {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  color: #64748b;
}

.points-filter-card__head h2 {
  margin: 0;
  color: #334155;
  font-size: 14px;
  font-weight: 800;
}

.points-filter-card__head .iconify {
  font-size: 18px;
}

.points-filter-grid {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 16px;
}

.points-filter-field {
  display: grid;
  gap: 7px;
}

.points-filter-field > span:first-child {
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

.points-filter-field--date {
  min-width: 300px;
}

.points-form-select,
.points-form-input {
  height: 36px;
  min-width: 140px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background-color: #ffffff;
  color: #334155;
  font-family: inherit;
  font-size: 13px;
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.points-form-select {
  appearance: none;
  padding: 0 34px 0 12px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-position: right 9px center;
  background-repeat: no-repeat;
  cursor: pointer;
}

.points-form-input {
  min-width: 136px;
  padding: 0 10px;
}

.points-form-select:focus,
.points-form-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgb(59 130 246 / 10%);
}

.points-date-range {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.points-date-range i {
  color: #94a3b8;
  font-style: normal;
  font-size: 14px;
}

.points-filter-action {
  display: flex;
  justify-content: flex-end;
  margin-left: auto;
}

.points-query-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 88px;
  height: 36px;
  border: 0;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 1px 2px rgb(37 99 235 / 18%);
  transition: background 0.2s ease;
}

.points-query-button:hover {
  background: #1d4ed8;
}

@media (max-width: 720px) {
  .points-filter-grid,
  .points-filter-field,
  .points-filter-action,
  .points-query-button {
    width: 100%;
  }

  .points-form-select,
  .points-form-input {
    width: 100%;
  }

  .points-date-range {
    width: 100%;
  }
}
</style>
