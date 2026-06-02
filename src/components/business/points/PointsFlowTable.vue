<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { NSelect } from "naive-ui";
import { computed } from "vue";

import { useAppStore } from "@/stores/app";
import type {
  PointsBizSource,
  PointsFlowRecord,
  PointsQueryFilters,
  PointsQueryViewConfig,
  PointsTxnType,
} from "@/types/points-query";

const appStore = useAppStore();

const props = defineProps<{
  config: PointsQueryViewConfig;
  filters: PointsQueryFilters;
  records: PointsFlowRecord[];
  total: number;
  currentPage: number;
  pageSize: number;
}>();

const emit = defineEmits<{
  "update:filters": [value: PointsQueryFilters];
  "update:currentPage": [value: number];
  export: [];
  recharge: [];
}>();

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

const bizSourceOptions: Array<{ value: "" | PointsBizSource; label: string }> =
  [
    { value: "", label: "全部" },
    { value: "single", label: "单图生成" },
    { value: "batch", label: "批量上新" },
    { value: "package", label: "套餐赠送" },
    { value: "purchase", label: "充值购买" },
    { value: "fail", label: "失败退款" },
  ];

const memberOptions = [
  { value: "", label: "全部成员" },
  { value: "u001", label: "张小明（管理员）" },
  { value: "u002", label: "李芳（普通成员）" },
  { value: "u003", label: "王强（普通成员）" },
  { value: "u004", label: "赵雪（普通成员）" },
  { value: "u005", label: "孙磊（普通成员）" },
];

const txnTypeLabelMap: Record<PointsTxnType, string> = {
  recharge: "充值",
  gift: "赠送",
  consume: "消费",
  refund: "退款",
};

const totalPages = computed(() =>
  Math.max(1, Math.ceil(props.total / props.pageSize)),
);

const pageItems = computed(() =>
  Array.from({ length: totalPages.value }, (_, index) => index + 1),
);

const rangeText = computed(() => {
  if (!props.total) return "共 0 条";
  if (totalPages.value <= 1) return `共 ${props.total} 条`;

  const start = (props.currentPage - 1) * props.pageSize + 1;
  const end = Math.min(props.currentPage * props.pageSize, props.total);
  return `显示第 ${start}-${end} 条，共 ${props.total} 条`;
});

const showCustomDate = computed(() => props.filters.dateRange === "custom");

function patchFilters(patch: Partial<PointsQueryFilters>) {
  emit("update:filters", {
    ...props.filters,
    ...patch,
  });
  emit("update:currentPage", 1);
}

function formatNumber(value: number) {
  return value.toLocaleString("zh-CN");
}

function formatSignedNumber(value: number) {
  return `${value > 0 ? "+" : ""}${formatNumber(value)}`;
}

function getAvatarClass(memberId?: string) {
  const map: Record<string, string> = {
    u001: "avatar-u001",
    u002: "avatar-u002",
    u003: "avatar-u003",
    u004: "avatar-u004",
    u005: "avatar-u001",
  };

  return memberId ? (map[memberId] ?? "avatar-default") : "avatar-default";
}

function setPage(page: number) {
  if (page < 1 || page > totalPages.value || page === props.currentPage) return;
  emit("update:currentPage", page);
}
</script>

<template>
  <section
    class="card points-flow-card animate-fade-in"
    :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'"
  >
    <div class="points-filter-bar">
      <div class="points-filter-row">
        <template v-if="config.showCurrentMember">
          <span class="points-current-member-label">当前成员：</span>
          <strong class="points-current-member-name">{{
            config.currentMemberName
          }}</strong>
          <span class="points-separator">|</span>
        </template>

        <div v-if="config.showMemberFilter" class="points-filter-item">
          <label>成员账号</label>
          <NSelect
            class="points-filter-select is-wide"
            size="small"
            :value="filters.member"
            :options="memberOptions"
            :consistent-menu-width="false"
            :menu-props="{ class: 'points-filter-select-menu' }"
            @update:value="(value) => patchFilters({ member: value ?? '' })"
          />
        </div>

        <div class="points-filter-item">
          <label>流水类型</label>
          <NSelect
            class="points-filter-select"
            size="small"
            :value="filters.txnType"
            :options="txnTypeOptions"
            :menu-props="{ class: 'points-filter-select-menu' }"
            @update:value="
              (value) =>
                patchFilters({
                  txnType: (value ?? '') as PointsQueryFilters['txnType'],
                })
            "
          />
        </div>

        <div class="points-filter-item">
          <label>时间范围</label>
          <NSelect
            class="points-filter-select"
            size="small"
            :value="filters.dateRange"
            :options="dateRangeOptions"
            :menu-props="{ class: 'points-filter-select-menu' }"
            @update:value="
              (value) =>
                patchFilters({
                  dateRange: (value ?? '') as PointsQueryFilters['dateRange'],
                })
            "
          />
        </div>

        <div
          v-if="showCustomDate"
          class="points-filter-item points-filter-date"
        >
          <label>日期</label>
          <input
            :value="filters.startDate"
            type="date"
            class="form-input"
            @input="
              patchFilters({
                startDate: ($event.target as HTMLInputElement).value,
              })
            "
          />
          <span>~</span>
          <input
            :value="filters.endDate"
            type="date"
            class="form-input"
            @input="
              patchFilters({
                endDate: ($event.target as HTMLInputElement).value,
              })
            "
          />
        </div>

        <div class="points-filter-item">
          <label>业务来源</label>
          <NSelect
            class="points-filter-select is-wide"
            size="small"
            :value="filters.bizSource"
            :options="bizSourceOptions"
            :consistent-menu-width="false"
            :menu-props="{ class: 'points-filter-select-menu' }"
            @update:value="
              (value) =>
                patchFilters({
                  bizSource: (value ?? '') as PointsQueryFilters['bizSource'],
                })
            "
          />
        </div>

        <button
          type="button"
          class="points-recharge-button"
          @click="emit('recharge')"
        >
          <Icon icon="mdi:plus" />
          充值
        </button>
      </div>
    </div>

    <div class="points-table-head">
      <div class="points-table-title">
        <Icon icon="mdi:format-list-bulleted" />
        <h2>{{ config.tableTitle }}</h2>
        <span>{{ total }} 条</span>
      </div>
      <button
        type="button"
        class="points-export-button"
        @click="emit('export')"
      >
        <Icon icon="mdi:download-outline" />
        导出
      </button>
    </div>

    <div class="points-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>流水编号</th>
            <th>流水类型</th>
            <th>变动积分</th>
            <th>变动后余额</th>
            <th>使用场景</th>
            <th>备注</th>
            <th v-if="config.showMemberColumns">操作人</th>
            <th v-if="config.showMemberColumns">身份</th>
            <th>发生时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!records.length">
            <td :colspan="config.showMemberColumns ? 9 : 7" class="empty-state">
              <Icon icon="mdi:inbox-outline" />
              <p>暂无符合条件的流水记录</p>
            </td>
          </tr>
          <tr
            v-for="record in records"
            :key="record.id"
            :class="{ 'row-mine': record.isCurrentUser }"
            class="points-flow-row"
          >
            <td>
              <span class="font-mono text-xs text-slate-500">{{
                record.id
              }}</span>
            </td>
            <td>
              <span class="tag" :class="`tag-${record.txnType}`">
                {{ txnTypeLabelMap[record.txnType] }}
              </span>
            </td>
            <td>
              <span
                class="font-mono"
                :class="
                  record.pointsChange > 0 ? 'num-positive' : 'num-negative'
                "
              >
                {{ formatSignedNumber(record.pointsChange) }}
              </span>
            </td>
            <td>
              <span class="font-mono text-slate-700">{{
                formatNumber(record.balanceAfter)
              }}</span>
            </td>
            <td>
              <div class="points-scene-cell">
                <span>{{ record.title }}</span>
                <small>{{ record.functionName }}</small>
              </div>
            </td>
            <td>
              <span class="text-slate-500">{{ record.remark || "-" }}</span>
            </td>
            <td v-if="config.showMemberColumns">
              <div class="points-member-cell">
                <div
                  class="points-avatar"
                  :class="getAvatarClass(record.memberId)"
                >
                  {{ record.memberName?.charAt(0) }}
                </div>
                <span>{{ record.memberName }}</span>
              </div>
            </td>
            <td v-if="config.showMemberColumns">
              <span v-if="record.isOwner" class="tag tag-owner">主账号</span>
              <span v-else class="points-member-role">成员</span>
            </td>
            <td>
              <span class="points-time">{{ record.createdAt }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="points-pagination-bar">
      <span>{{ rangeText }}</span>
      <div class="points-pagination">
        <button
          type="button"
          :disabled="currentPage === 1"
          @click="setPage(currentPage - 1)"
        >
          <Icon icon="mdi:chevron-left" />
        </button>
        <button
          v-for="page in pageItems"
          :key="page"
          type="button"
          :class="{
            active: page === currentPage,
            'is-admin': config.adminTheme,
          }"
          @click="setPage(page)"
        >
          {{ page }}
        </button>
        <button
          type="button"
          :disabled="currentPage === totalPages"
          @click="setPage(currentPage + 1)"
        >
          <Icon icon="mdi:chevron-right" />
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
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

.points-flow-card {
  overflow: hidden;
}

.points-filter-bar {
  padding: 12px 20px;
  border-bottom: 1px solid #f1f5f9;
  background: rgb(248 250 252 / 50%);
}

.points-filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.points-current-member-label {
  color: #94a3b8;
  font-size: 12px;
}

.points-current-member-name {
  color: #2563eb;
  font-size: 14px;
  font-weight: 600;
}

.points-separator {
  color: #e2e8f0;
}

.points-filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.points-filter-item label {
  color: #64748b;
  font-size: 12px;
  white-space: nowrap;
}

.points-filter-select {
  width: 100px;
  min-width: 100px;
}

.points-filter-select.is-wide {
  width: 132px;
  min-width: 132px;
}

.points-filter-select {
  --n-height: 30px;
  --n-border-radius: 8px;
  --n-font-size: 12px;
  --n-color: #ffffff;
  --n-color-hover: #ffffff;
  --n-color-focus: #ffffff;
  --n-color-active: #ffffff;
  --n-border: 1px solid #cbd5e1;
  --n-border-hover: 1px solid #cbd5e1;
  --n-border-focus: 1px solid #3b82f6;
  --n-border-active: 1px solid #3b82f6;
  --n-text-color: #334155;
  --n-placeholder-color: #94a3b8;
  --n-arrow-color: #94a3b8;
  --n-box-shadow-focus: 0 0 0 3px rgb(59 130 246 / 10%);
}

.points-filter-select :deep(.n-base-selection-label),
.points-filter-select :deep(.n-base-selection-placeholder) {
  font-size: 12px;
}

.form-input {
  min-width: 100px;
  height: 28px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background-color: #ffffff;
  color: #334155;
  cursor: text;
  font-family: inherit;
  font-size: 12px;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.points-filter-date .form-input {
  min-width: 138px;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgb(59 130 246 / 10%);
}

.points-filter-date span {
  color: #94a3b8;
  font-size: 12px;
}

.points-recharge-button {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  padding: 6px 16px;
  border: 0;
  border-radius: 6px;
  background: #10b981;
  color: #ffffff;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  box-shadow: 0 1px 2px rgb(15 23 42 / 8%);
  transition: background 0.2s ease;
}

.points-recharge-button:hover {
  background: #059669;
}

.points-table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  border-bottom: 1px solid #f1f5f9;
}

.points-table-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.points-table-title .iconify {
  color: #94a3b8;
  font-size: 16px;
}

.points-table-title h2 {
  margin: 0;
  color: #334155;
  font-size: 14px;
  font-weight: 600;
}

.points-table-title span {
  padding: 2px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #94a3b8;
  font-size: 12px;
}

.points-export-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  color: #64748b;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  transition:
    border-color 0.2s ease,
    color 0.2s ease;
}

.points-export-button:hover {
  border-color: #cbd5e1;
  color: #334155;
}

.points-table-wrap {
  overflow-x: auto;
  overflow-y: hidden;
}

.data-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.data-table th {
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  background: #f1f5f9;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

.data-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
  color: #475569;
  font-size: 13px;
  vertical-align: middle;
}

.data-table tr:hover td {
  background: #f8fafc;
}

.data-table tr:last-child td {
  border-bottom: none;
}

.points-flow-row {
  opacity: 1;
}

.row-mine td {
  background: #eff6ff !important;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
}

.tag-recharge {
  background: #dbeafe;
  color: #1e40af;
}

.tag-gift {
  background: #fce7f3;
  color: #9d174d;
}

.tag-consume {
  background: #fee2e2;
  color: #991b1b;
}

.tag-refund {
  background: #d1fae5;
  color: #065f46;
}

.tag-owner {
  background: #fef3c7;
  color: #92400e;
}

.num-positive {
  color: #059669;
  font-weight: 600;
}

.num-negative {
  color: #dc2626;
  font-weight: 600;
}

.font-mono {
  font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
}

.text-xs {
  font-size: 12px;
}

.text-slate-500 {
  color: #64748b;
}

.text-slate-700 {
  color: #334155;
}

.points-scene-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.points-scene-cell span {
  color: #1e293b;
  font-weight: 500;
}

.points-scene-cell small {
  color: #94a3b8;
  font-size: 12px;
}

.points-member-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.points-avatar {
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
}

.avatar-u001 {
  background: #dbeafe;
  color: #1e40af;
}

.avatar-u002 {
  background: #fce7f3;
  color: #9d174d;
}

.avatar-u003 {
  background: #d1fae5;
  color: #065f46;
}

.avatar-u004 {
  background: #fef3c7;
  color: #92400e;
}

.avatar-default {
  background: #e2e8f0;
  color: #475569;
}

.points-member-role {
  color: #94a3b8;
  font-size: 12px;
}

.points-time {
  color: #64748b;
  font-size: 12px;
  white-space: nowrap;
}

.empty-state {
  padding: 48px 24px;
  color: #94a3b8;
  text-align: center;
}

.empty-state .iconify {
  display: block;
  margin: 0 auto 12px;
  font-size: 40px;
  opacity: 0.4;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.points-pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  border-top: 1px solid #f1f5f9;
}

.points-pagination-bar > span {
  color: #94a3b8;
  font-size: 12px;
}

.points-pagination {
  display: flex;
  align-items: center;
  gap: 4px;
}

.points-pagination button {
  display: flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #ffffff;
  color: #64748b;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  transition:
    border-color 0.2s ease,
    color 0.2s ease;
}

.points-pagination button.active {
  border-color: #2563eb;
  background: #2563eb;
  color: #ffffff;
  font-weight: 500;
}

.points-pagination button.active.is-admin {
  border-color: #7c3aed;
  background: #7c3aed;
}

.points-pagination button:disabled {
  cursor: not-allowed;
  color: #cbd5e1;
}

.points-pagination button:hover:not(:disabled, .active) {
  border-color: #cbd5e1;
  color: #334155;
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

@media (max-width: 760px) {
  .points-filter-row,
  .points-filter-item,
  .points-table-head,
  .points-pagination-bar {
    align-items: flex-start;
    flex-direction: column;
  }

  .points-recharge-button {
    margin-left: 0;
  }
}

.points-flow-card.theme-dark.card {
  border-color: #263347;
  background: #111827;
  box-shadow: none;
}

.points-flow-card.theme-dark.card:hover {
  box-shadow: none;
}

.points-flow-card.theme-dark .points-filter-bar {
  border-bottom-color: #263347;
  background: #111827;
}

.points-flow-card.theme-dark .points-current-member-label,
.points-flow-card.theme-dark .points-filter-item label,
.points-flow-card.theme-dark .points-filter-date span {
  color: #9ca3af;
}

.points-flow-card.theme-dark .points-current-member-name {
  color: #3b82f6;
}

.points-flow-card.theme-dark .points-separator {
  color: #263347;
}

.points-flow-card.theme-dark {
  color-scheme: dark;
}

.points-flow-card.theme-dark .points-filter-select,
.points-flow-card.theme-dark .form-input {
  --n-color: #1a2436;
  --n-color-hover: #1a2436;
  --n-color-focus: #1a2436;
  --n-color-active: #1a2436;
  --n-border: 1px solid #374151;
  --n-border-hover: 1px solid #374151;
  --n-border-focus: 1px solid #3b82f6;
  --n-border-active: 1px solid #3b82f6;
  --n-text-color: #f3f4f6;
  --n-placeholder-color: #9ca3af;
  --n-arrow-color: #9ca3af;
  --n-box-shadow-focus: 0 0 0 3px rgb(59 130 246 / 16%);
}

.points-flow-card.theme-dark .form-input {
  border-color: #374151;
  background-color: #1a2436;
  color: #f3f4f6;
}

.points-flow-card.theme-dark .form-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgb(59 130 246 / 16%);
}

.points-flow-card.theme-dark .points-recharge-button {
  background: #f5a623;
  color: #111827;
}

.points-flow-card.theme-dark .points-recharge-button:hover {
  background: #e09510;
}

.points-flow-card.theme-dark .points-table-head {
  border-bottom-color: #263347;
}

.points-flow-card.theme-dark .points-table-title .iconify {
  color: #9ca3af;
}

.points-flow-card.theme-dark .points-table-title h2 {
  color: #f3f4f6;
}

.points-flow-card.theme-dark .points-table-title span {
  background: #1a2436;
  color: #9ca3af;
}

.points-flow-card.theme-dark .points-export-button {
  border-color: #263347;
  background: #1a2436;
  color: #d1d5db;
}

.points-flow-card.theme-dark .points-export-button:hover {
  border-color: #374151;
  color: #f3f4f6;
}

.points-flow-card.theme-dark .data-table th {
  border-bottom-color: #263347;
  background: #1a2436;
  color: #d1d5db;
}

.points-flow-card.theme-dark .data-table td {
  border-bottom-color: #263347;
  color: #f3f4f6;
}

.points-flow-card.theme-dark .data-table tbody tr:nth-child(even) td {
  background: #151e2d;
}

.points-flow-card.theme-dark .data-table tr:hover td {
  background: #1e293b;
}

.points-flow-card.theme-dark .row-mine td {
  background: rgb(59 130 246 / 12%) !important;
}

.points-flow-card.theme-dark .tag-recharge {
  background: rgb(16 185 129 / 16%);
  color: #10b981;
}

.points-flow-card.theme-dark .tag-gift {
  background: rgb(59 130 246 / 16%);
  color: #3b82f6;
}

.points-flow-card.theme-dark .tag-consume {
  background: rgb(239 68 68 / 16%);
  color: #ef4444;
}

.points-flow-card.theme-dark .tag-refund {
  background: rgb(245 166 35 / 16%);
  color: #f5a623;
}

.points-flow-card.theme-dark .tag-owner {
  background: rgb(245 166 35 / 16%);
  color: #f5a623;
}

.points-flow-card.theme-dark .num-positive {
  color: #10b981;
}

.points-flow-card.theme-dark .num-negative {
  color: #ef4444;
}

.points-flow-card.theme-dark .text-slate-500 {
  color: #9ca3af;
}

.points-flow-card.theme-dark .text-slate-700 {
  color: #f3f4f6;
}

.points-flow-card.theme-dark .points-scene-cell span {
  color: #f3f4f6;
}

.points-flow-card.theme-dark .points-scene-cell small,
.points-flow-card.theme-dark .points-member-role,
.points-flow-card.theme-dark .points-time {
  color: #9ca3af;
}

.points-flow-card.theme-dark .empty-state {
  color: #9ca3af;
}

.points-flow-card.theme-dark .points-pagination-bar {
  border-top-color: #263347;
}

.points-flow-card.theme-dark .points-pagination-bar > span {
  color: #9ca3af;
}

.points-flow-card.theme-dark .points-pagination button {
  border-color: #263347;
  background: #1a2436;
  color: #d1d5db;
}

.points-flow-card.theme-dark .points-pagination button.active,
.points-flow-card.theme-dark .points-pagination button.active.is-admin {
  border-color: #f5a623;
  background: #f5a623;
  color: #111827;
}

.points-flow-card.theme-dark .points-pagination button:disabled {
  color: #4b5563;
}

.points-flow-card.theme-dark
  .points-pagination
  button:hover:not(:disabled, .active) {
  border-color: #374151;
  color: #f3f4f6;
}
</style>

<style lang="scss">
html[data-theme="dark"] .points-filter-select-menu {
  background: #1a2436 !important;
  border: 1px solid #374151 !important;
}

html[data-theme="dark"] .points-filter-select-menu .n-base-select-option {
  color: #f3f4f6;
}

html[data-theme="dark"]
  .points-filter-select-menu
  .n-base-select-option--selected {
  color: #f5a623;
}

html[data-theme="dark"]
  .points-filter-select-menu
  .n-base-select-option--pending::before {
  background-color: #1e293b !important;
}

html[data-theme="dark"]
  .points-filter-select-menu
  .n-base-select-option:hover::before {
  background-color: #1e293b !important;
}
</style>
