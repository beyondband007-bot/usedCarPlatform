<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { computed } from "vue";

import type {
  PointsBizSource,
  PointsFlowRecord,
  PointsQueryFilters,
  PointsQueryViewConfig,
  PointsTxnType,
} from "@/types/points-query";

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

const bizSourceOptions: Array<{ value: "" | PointsBizSource; label: string }> = [
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

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));

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
const showRechargeButton = computed(() => props.config.canRecharge);

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
  <section class="card points-flow-card animate-fade-in">
    <div class="points-filter-bar">
      <div class="points-filter-row">
        <template v-if="config.showCurrentMember">
          <span class="points-current-member-label">当前成员：</span>
          <strong class="points-current-member-name">{{ config.currentMemberName }}</strong>
          <span class="points-separator">|</span>
        </template>

        <div v-if="config.showMemberFilter" class="points-filter-item">
          <label>成员账号</label>
          <select
            :value="filters.member"
            class="form-select"
            @change="patchFilters({ member: ($event.target as HTMLSelectElement).value })"
          >
            <option v-for="item in memberOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </div>

        <div class="points-filter-item">
          <label>流水类型</label>
          <select
            :value="filters.txnType"
            class="form-select"
            @change="patchFilters({ txnType: ($event.target as HTMLSelectElement).value as PointsQueryFilters['txnType'] })"
          >
            <option v-for="item in txnTypeOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </div>

        <div class="points-filter-item">
          <label>时间范围</label>
          <select
            :value="filters.dateRange"
            class="form-select"
            @change="patchFilters({ dateRange: ($event.target as HTMLSelectElement).value as PointsQueryFilters['dateRange'] })"
          >
            <option v-for="item in dateRangeOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </div>

        <div v-if="showCustomDate" class="points-filter-item points-filter-date">
          <label>日期</label>
          <input
            :value="filters.startDate"
            type="date"
            class="form-input"
            @input="patchFilters({ startDate: ($event.target as HTMLInputElement).value })"
          />
          <span>~</span>
          <input
            :value="filters.endDate"
            type="date"
            class="form-input"
            @input="patchFilters({ endDate: ($event.target as HTMLInputElement).value })"
          />
        </div>

        <div class="points-filter-item">
          <label>业务来源</label>
          <select
            :value="filters.bizSource"
            class="form-select"
            @change="patchFilters({ bizSource: ($event.target as HTMLSelectElement).value as PointsQueryFilters['bizSource'] })"
          >
            <option v-for="item in bizSourceOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </div>

        <button
          v-if="showRechargeButton"
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
      <button type="button" class="points-export-button" @click="emit('export')">
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
              <span class="font-mono text-xs text-slate-500">{{ record.id }}</span>
            </td>
            <td>
              <span class="tag" :class="`tag-${record.txnType}`">
                {{ txnTypeLabelMap[record.txnType] }}
              </span>
            </td>
            <td>
              <span
                class="font-mono"
                :class="record.pointsChange > 0 ? 'num-positive' : 'num-negative'"
              >
                {{ formatSignedNumber(record.pointsChange) }}
              </span>
            </td>
            <td>
              <span class="font-mono text-slate-700">{{ formatNumber(record.balanceAfter) }}</span>
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
                <div class="points-avatar" :class="getAvatarClass(record.memberId)">
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
          :class="{ active: page === currentPage, 'is-admin': config.adminTheme }"
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

.form-select,
.form-input {
  min-width: 100px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background-color: #ffffff;
  color: #334155;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.form-select {
  height: 30px;
  appearance: none;
  padding: 0 32px 0 12px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-position: right 8px center;
  background-repeat: no-repeat;
}

.form-input {
  height: 28px;
  min-width: 138px;
  padding: 0 12px;
  cursor: text;
}

.form-select:focus,
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
</style>
