<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { NSelect } from "naive-ui";
import { computed } from "vue";

import { useAppStore } from "@/stores/app";
import type { PointsAccountScopeMode } from "@/utils/points-query-access";
import type {
  PointsBizSource,
  PointsFlowRecord,
  PointsFlowStatus,
  PointsQueryFilters,
  PointsQueryViewConfig,
  PointsSubAccountOption,
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
  pageSizeOptions?: readonly number[];
  loading?: boolean;
  glass?: boolean;
  accountScopeMode?: PointsAccountScopeMode;
  childMembers?: PointsSubAccountOption[];
  selectedChildId?: string | null;
}>();

const emit = defineEmits<{
  "update:filters": [value: PointsQueryFilters];
  "update:currentPage": [value: number];
  "update:pageSize": [value: number];
  "update:accountScopeMode": [value: PointsAccountScopeMode];
  selectChildAccount: [childId: string];
  export: [];
  recharge: [];
}>();

const scopeMode = computed(() => props.accountScopeMode ?? "self");

const showRechargeButton = computed(
  () => (props.config.canRecharge ?? true) && scopeMode.value !== "child",
);


function selectChild(childId: string) {
  emit("selectChildAccount", childId);
}

const txnTypeOptions: Array<{ value: "" | PointsTxnType; label: string }> = [
  { value: "", label: "全部" },
  { value: "recharge", label: "充值" },
  { value: "gift", label: "赠送" },
  { value: "consume", label: "消费" },
  { value: "refund", label: "退款" },
];

const designTxnTypeOptions: Array<{ value: "" | PointsTxnType; label: string }> =
  [
    { value: "", label: "全部积分类型" },
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

const designDateRangeOptions = [
  { value: "90", label: "近三个月" },
  { value: "30", label: "近30天" },
  { value: "7", label: "近7天" },
  { value: "", label: "全部时间" },
  { value: "custom", label: "自定义" },
];

const statusOptions: Array<{ value: "" | PointsFlowStatus; label: string }> = [
  { value: "", label: "全部状态" },
  { value: "effective", label: "已生效" },
  { value: "pending", label: "待生效" },
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

const memberOptions = computed(() => {
  if (props.childMembers?.length) {
    return [
      { value: "", label: "全部账号" },
      ...props.childMembers.map((member) => ({
        value: member.id,
        label:
          member.memberRole === "owner"
            ? `${member.label}（主账号）`
            : `${member.label}（子账号）`,
      })),
    ];
  }

  return [
    { value: "", label: "全部账号" },
    { value: "u001", label: "张小明（主账号）" },
    { value: "u002", label: "李芳（子账号）" },
    { value: "u003", label: "王强（子账号）" },
    { value: "u004", label: "赵雪（子账号）" },
    { value: "u005", label: "孙磊（子账号）" },
  ];
});

const txnTypeLabelMap: Record<PointsTxnType, string> = {
  recharge: "充值",
  gift: "赠送",
  consume: "消费",
  refund: "退款",
};

const defaultPageSizeOptions = [10, 20, 30, 50] as const;

const resolvedPageSizeOptions = computed(() => {
  const options = props.pageSizeOptions?.length
    ? props.pageSizeOptions
    : defaultPageSizeOptions;
  return options.map((value) => ({
    value,
    label: String(value),
  }));
});

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

function getAvatarText(label?: string) {
  return (label?.trim().charAt(0) || "?").toUpperCase();
}

function getMemberRoleText(record: {
  memberRole?: "owner" | "admin" | "member";
  isOwner?: boolean;
}) {
  if (record.isOwner || record.memberRole === "owner") return "主账号";
  return "子账号";
}

function setPage(page: number) {
  if (page < 1 || page > totalPages.value || page === props.currentPage) return;
  emit("update:currentPage", page);
}

function setPageSize(size: number) {
  if (size === props.pageSize) return;
  emit("update:pageSize", size);
  emit("update:currentPage", 1);
}

function resolveRecordStatus(record: PointsFlowRecord): PointsFlowStatus {
  return record.status ?? (record.txnType === "gift" ? "pending" : "effective");
}

function resolveSourceUsage(record: PointsFlowRecord) {
  return record.title || record.functionName || record.remark || "-";
}

</script>

<template>
  <section
    v-if="glass"
    class="points-flow-card points-flow-card--design animate-fade-in"
    :class="[
      appStore.isDarkMode ? 'theme-dark' : 'theme-light',
      'is-glass',
      loading ? 'is-loading' : '',
    ]"
  >
    <div class="points-toolbar">
      <div class="points-toolbar-filters">
        <template v-if="config.showCurrentMember">
          <span class="points-current-member-label">当前账号：</span>
          <strong class="points-current-member-name">{{
            config.currentMemberName
          }}</strong>
          <span class="points-separator">|</span>
        </template>

        <NSelect
          v-if="config.showMemberFilter"
          class="points-toolbar-select is-wide"
          size="medium"
          :value="filters.member"
          :options="memberOptions"
          :consistent-menu-width="false"
          :menu-props="{ class: 'points-filter-select-menu' }"
          @update:value="(value) => patchFilters({ member: value ?? '' })"
        />

        <NSelect
          class="points-toolbar-select"
          size="medium"
          :value="filters.dateRange || '90'"
          :options="designDateRangeOptions"
          :menu-props="{ class: 'points-filter-select-menu' }"
          @update:value="
            (value) =>
              patchFilters({
                dateRange: (value ?? '90') as PointsQueryFilters['dateRange'],
              })
          "
        />

        <NSelect
          class="points-toolbar-select is-wide"
          size="medium"
          :value="filters.txnType"
          :options="designTxnTypeOptions"
          :menu-props="{ class: 'points-filter-select-menu' }"
          @update:value="
            (value) =>
              patchFilters({
                txnType: (value ?? '') as PointsQueryFilters['txnType'],
              })
          "
        />

        <NSelect
          class="points-toolbar-select"
          size="medium"
          :value="filters.status"
          :options="statusOptions"
          :menu-props="{ class: 'points-filter-select-menu' }"
          @update:value="
            (value) =>
              patchFilters({
                status: (value ?? '') as PointsQueryFilters['status'],
              })
          "
        />

        <div
          v-if="showCustomDate"
          class="points-toolbar-date"
        >
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

    <div
      v-if="config.showSubAccountScope"
      class="points-subaccount-bar"
      role="group"
      aria-label="积分查看范围"
    >
      <div
        v-if="childMembers?.length"
        class="points-subaccount-list"
        role="list"
        aria-label="子账号列表"
      >
        <button
          v-for="member in childMembers"
          :key="member.id"
          type="button"
          class="points-subaccount-chip"
          :class="{ 'is-active': member.id === selectedChildId || filters.member === member.id }"
          role="listitem"
          @click="selectChild(member.id)"
        >
          <span class="points-subaccount-avatar" :class="getAvatarClass(member.id)">
            {{ getAvatarText(member.label) }}
          </span>
          <span class="points-subaccount-copy">
            <strong>{{ member.label }}</strong>
            <span>{{ getMemberRoleText(member) }}</span>
          </span>
        </button>
      </div>
    </div>

    <div class="points-section-title">
      <div class="points-section-title-main">
        <span class="points-table-accent" aria-hidden="true"></span>
        <h2>{{ config.tableTitle }}</h2>
      </div>
      <button
        type="button"
        class="points-export-button"
        @click="emit('export')"
      >
        <Icon icon="mdi:tray-arrow-up" />
        导出
      </button>
    </div>

    <div
      class="points-table-panel"
      :class="{ 'is-empty': !records.length }"
    >
      <table
        class="data-table data-table--design points-table-layout"
        :class="{
          'points-table-layout--member': config.showMemberColumns,
          'points-table-layout--personal': !config.showMemberColumns,
        }"
      >
        <colgroup>
          <col class="col-time" />
          <col class="col-type" />
          <col class="col-change" />
          <col class="col-status" />
          <col class="col-source" />
          <template v-if="config.showMemberColumns">
            <col class="col-operator" />
            <col class="col-role" />
          </template>
        </colgroup>
        <thead>
          <tr>
            <th>时间</th>
            <th>积分类型</th>
            <th>积分变动</th>
            <th>状态</th>
            <th>来源/用途</th>
            <template v-if="config.showMemberColumns">
              <th>操作人</th>
              <th>身份</th>
            </template>
          </tr>
        </thead>
        <tbody v-if="records.length">
          <tr
            v-for="record in records"
            :key="record.id"
            :class="{ 'row-mine': record.isCurrentUser }"
            class="points-flow-row"
          >
            <td>
              <span class="points-time">{{ record.createdAt }}</span>
            </td>
            <td>
              <span class="tag" :class="`tag-${record.txnType}`">
                {{ txnTypeLabelMap[record.txnType] }}
              </span>
            </td>
            <td>
              <span
                class="points-change"
                :class="
                  record.pointsChange > 0 ? 'is-positive' : 'is-negative'
                "
              >
                {{ formatSignedNumber(record.pointsChange) }}
              </span>
            </td>
            <td>
              <span
                class="status-pill"
                :class="`is-${resolveRecordStatus(record)}`"
              >
                <span class="status-dot" aria-hidden="true"></span>
                {{
                  resolveRecordStatus(record) === "effective"
                    ? "已生效"
                    : "待生效"
                }}
              </span>
            </td>
            <td>
              <span class="points-source">{{ resolveSourceUsage(record) }}</span>
            </td>
            <td v-if="config.showMemberColumns">
              <div class="points-member-cell">
                <div
                  class="points-avatar"
                  :class="getAvatarClass(record.memberId)"
                >
                  {{ getAvatarText(record.memberName) }}
                </div>
                <span>{{ record.memberName }}</span>
              </div>
            </td>
            <td v-if="config.showMemberColumns">
              <span v-if="record.isOwner" class="tag tag-owner">主账号</span>
              <span v-else class="points-member-role">{{ getMemberRoleText(record) }}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="!records.length" class="points-table-empty">
        <Icon icon="mdi:inbox-outline" />
        <p>暂无符合条件的流水记录</p>
      </div>
    </div>

    <div class="points-pagination-bar">
      <span>{{ rangeText }}</span>
      <div class="points-pagination-controls">
        <div class="points-page-size">
          <span class="points-page-size-label">每页</span>
          <NSelect
            class="points-page-size-select"
            size="small"
            :value="pageSize"
            :options="resolvedPageSizeOptions"
            :consistent-menu-width="false"
            :menu-props="{ class: 'points-filter-select-menu' }"
            @update:value="(value) => setPageSize(Number(value ?? pageSize))"
          />
          <span class="points-page-size-label">条</span>
        </div>
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
    </div>
  </section>

  <section
    v-else
    class="card points-flow-card animate-fade-in"
    :class="[
      appStore.isDarkMode ? 'theme-dark' : 'theme-light',
      loading ? 'is-loading' : '',
    ]"
  >
    <div class="points-filter-bar">
      <div class="points-filter-row">
        <template v-if="config.showCurrentMember">
          <span class="points-current-member-label">当前账号：</span>
          <strong class="points-current-member-name">{{
            config.currentMemberName
          }}</strong>
          <span class="points-separator">|</span>
        </template>

        <div v-if="config.showMemberFilter" class="points-filter-item">
          <label>账号</label>
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
        <span class="points-table-accent" aria-hidden="true"></span>
        <h2>{{ config.tableTitle }}</h2>
        <span>{{ total }} 条</span>
      </div>
      <button
        type="button"
        class="points-export-button"
        @click="emit('export')"
      >
        <Icon icon="mdi:tray-arrow-up" />
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
            <th v-if="config.showMemberColumns">操作人</th>
            <th v-if="config.showMemberColumns">身份</th>
            <th>发生时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!records.length">
            <td :colspan="config.showMemberColumns ? 8 : 6" class="empty-state">
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
              </div>
            </td>
            <td v-if="config.showMemberColumns">
              <div class="points-member-cell">
                <div
                  class="points-avatar"
                  :class="getAvatarClass(record.memberId)"
                >
                  {{ getAvatarText(record.memberName) }}
                </div>
                <span>{{ record.memberName }}</span>
              </div>
            </td>
            <td v-if="config.showMemberColumns">
              <span v-if="record.isOwner" class="tag tag-owner">主账号</span>
              <span v-else class="points-member-role">{{ getMemberRoleText(record) }}</span>
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
      <div class="points-pagination-controls">
        <div class="points-page-size">
          <span class="points-page-size-label">每页</span>
          <NSelect
            class="points-page-size-select"
            size="small"
            :value="pageSize"
            :options="resolvedPageSizeOptions"
            :consistent-menu-width="false"
            :menu-props="{ class: 'points-filter-select-menu' }"
            @update:value="(value) => setPageSize(Number(value ?? pageSize))"
          />
          <span class="points-page-size-label">条</span>
        </div>
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

.points-member-cell {
  display: flex;
  min-width: 180px;
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

.points-pagination-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.points-page-size {
  display: flex;
  align-items: center;
  gap: 8px;
}

.points-page-size-label {
  color: #94a3b8;
  font-size: 12px;
  white-space: nowrap;
}

.points-page-size-select {
  width: 72px;
}

.points-page-size-select :deep(.n-base-selection) {
  min-height: 28px;
}

.points-page-size-select :deep(.n-base-selection-label) {
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

  .points-pagination-controls {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
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

.points-flow-card.theme-dark .points-page-size-label {
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

.points-flow-card.is-loading {
  opacity: 0.72;
  pointer-events: none;
}

.points-flow-card--design.is-glass {
  display: flex;
  height: auto;
  min-height: var(--points-flow-card-min-h, 360px);
  flex: 0 1 auto;
  flex-direction: column;
  overflow: visible;
  padding: clamp(10px, 1.2vw, 14px);
  border: 1px solid #e8edf3;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 4px 14px rgb(15 23 42 / 4%);
  backdrop-filter: none;
}

.points-flow-card--design.is-glass:hover {
  box-shadow: 0 6px 18px rgb(15 23 42 / 6%);
  transform: none;
}

.points-flow-card.theme-dark.points-flow-card--design.is-glass {
  border-color: rgb(255 255 255 / 12%);
  background: rgb(27, 28, 29);
  box-shadow: none;
}

.points-flow-card--design .points-toolbar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.points-flow-card--design .points-toolbar-filters {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.points-flow-card--design .points-toolbar-select {
  width: clamp(120px, 11vw, 148px);
  min-width: 120px;
}

.points-flow-card--design .points-toolbar-select.is-wide {
  width: clamp(132px, 12vw, 168px);
  min-width: 132px;
}

.points-flow-card--design .points-toolbar-select {
  --n-height: 36px;
  --n-border-radius: 8px;
  --n-font-size: 14px;
  --n-color: #ffffff;
  --n-color-hover: #ffffff;
  --n-color-focus: #ffffff;
  --n-color-active: #ffffff;
  --n-border: 1px solid #d7dee8;
  --n-border-hover: 1px solid #cbd5e1;
  --n-border-focus: 1px solid #d4a017;
  --n-border-active: 1px solid #d4a017;
  --n-text-color: #334155;
  --n-placeholder-color: #64748b;
  --n-arrow-color: #94a3b8;
  --n-box-shadow-focus: 0 0 0 3px rgb(212 160 23 / 12%);
}

.points-flow-card--design .points-toolbar-select :deep(.n-base-selection-label),
.points-flow-card--design .points-toolbar-select :deep(.n-base-selection-placeholder) {
  font-size: 14px;
  font-weight: 500;
}

.points-flow-card--design .points-toolbar-date {
  display: flex;
  align-items: center;
  gap: 8px;
}

.points-flow-card--design .points-toolbar-date .form-input {
  min-width: 148px;
  height: 36px;
  border-radius: 8px;
}

.points-flow-card--design .points-recharge-button {
  display: inline-flex;
  height: 36px;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  padding: 0 22px;
  border: 0;
  border-radius: 10px;
  background: linear-gradient(180deg, #f4d36a 0%, #d4a017 100%);
  box-shadow: 0 10px 22px rgb(212 160 23 / 28%);
  color: #ffffff;
  cursor: pointer;
  font-family:
    "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
  font-weight: 900;
  white-space: nowrap;
}

.points-flow-card--design .points-recharge-button:hover {
  background: linear-gradient(180deg, #f7dc82 0%, #c89412 100%);
}

.points-flow-card--design .points-subaccount-bar {
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 10px 14px;
  margin-bottom: 4px;
}

.points-flow-card--design .points-subaccount-switch {
  display: inline-flex;
  padding: 3px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: rgb(255 255 255 / 88%);
}

.points-flow-card--design .points-subaccount-switch-btn {
  min-width: 88px;
  padding: 7px 14px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.points-flow-card--design .points-subaccount-switch-btn.is-active {
  background: linear-gradient(180deg, #f6e3a8 0%, #e8c96a 100%);
  box-shadow: 0 1px 2px rgb(15 23 42 / 8%);
  color: #7a5a00;
  font-weight: 700;
}

.points-flow-card--design .points-subaccount-list {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  align-items: stretch;
  gap: 10px;
}

.points-flow-card--design .points-subaccount-chip {
  display: inline-flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  text-align: left;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.points-flow-card--design .points-subaccount-chip.is-active {
  border-color: #d4a017;
  background: rgb(239 194 76 / 14%);
  box-shadow: 0 8px 18px rgb(212 160 23 / 14%);
  color: #9a6700;
  font-weight: 700;
  transform: translateY(-1px);
}

.points-flow-card--design .points-subaccount-avatar {
  display: inline-flex;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
}

.points-flow-card--design .points-subaccount-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.points-flow-card--design .points-subaccount-copy strong {
  color: #0f172a;
  font-family:
    "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
  font-size: 15px;
  font-weight: 900;
  white-space: nowrap;
}

.points-flow-card--design .points-subaccount-copy span {
  color: #64748b;
  font-family:
    "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
  font-size: 12px;
  font-weight: 900;
}

.points-flow-card--design .points-section-title {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 24px;
  margin-bottom: 10px;
}

.points-flow-card--design .points-section-title-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.points-flow-card--design .points-table-accent {
  width: 4px;
  height: 18px;
  flex-shrink: 0;
  border-radius: 999px;
  background: linear-gradient(180deg, #f4d36a 0%, #d4a017 100%);
}

.points-flow-card--design .points-section-title h2 {
  margin: 0;
  color: #0f172a;
  font-family:
    "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
  font-size: 20px;
  font-weight: 500;
  line-height: 1.3;
}

.points-flow-card--design .points-export-button {
  display: inline-flex;
  height: 28px;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
  padding: 0 10px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: #ffffff;
  color: #64748b;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease;
}

.points-flow-card--design .points-export-button :deep(svg) {
  width: 14px;
  height: 14px;
}

.points-flow-card--design .points-export-button:hover {
  border-color: #cbd5e1;
  color: #334155;
}

.points-flow-card--design .points-table-panel {
  position: relative;
  display: block;
  width: 100%;
  min-height: var(--points-table-min-h, 400px);
  flex: 0 1 auto;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.points-flow-card--design .points-table-panel:not(.is-empty) {
  overflow-x: auto;
  overflow-y: auto;
  max-height: var(
    --points-table-scroll-max-h,
    calc(var(--points-table-head-h, 46px) + var(--points-table-row-h, 46px) * 10)
  );
  -webkit-overflow-scrolling: touch;
}

.points-flow-card--design .points-table-panel.is-empty {
  overflow: hidden;
}

.points-flow-card--design .points-table-layout {
  width: 100%;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: auto;
}

.points-flow-card--design .points-table-layout--personal th:nth-child(1),
.points-flow-card--design .points-table-layout--personal td:nth-child(1) {
  min-width: 168px;
}

.points-flow-card--design .points-table-layout--personal th:nth-child(2),
.points-flow-card--design .points-table-layout--personal td:nth-child(2) {
  min-width: 112px;
}

.points-flow-card--design .points-table-layout--personal th:nth-child(3),
.points-flow-card--design .points-table-layout--personal td:nth-child(3) {
  min-width: 96px;
}

.points-flow-card--design .points-table-layout--personal th:nth-child(4),
.points-flow-card--design .points-table-layout--personal td:nth-child(4) {
  min-width: 110px;
}

.points-flow-card--design .points-table-layout--personal th:nth-child(5),
.points-flow-card--design .points-table-layout--personal td:nth-child(5) {
  min-width: 140px;
}

.points-flow-card--design .points-table-layout--member th:nth-child(1),
.points-flow-card--design .points-table-layout--member td:nth-child(1) {
  min-width: 160px;
}

.points-flow-card--design .points-table-layout--member th:nth-child(2),
.points-flow-card--design .points-table-layout--member td:nth-child(2) {
  min-width: 112px;
}

.points-flow-card--design .points-table-layout--member th:nth-child(3),
.points-flow-card--design .points-table-layout--member td:nth-child(3) {
  min-width: 96px;
}

.points-flow-card--design .points-table-layout--member th:nth-child(4),
.points-flow-card--design .points-table-layout--member td:nth-child(4) {
  min-width: 110px;
}

.points-flow-card--design .points-table-layout--member th:nth-child(5),
.points-flow-card--design .points-table-layout--member td:nth-child(5) {
  min-width: 120px;
}

.points-flow-card--design .points-table-layout--member th:nth-child(6),
.points-flow-card--design .points-table-layout--member td:nth-child(6) {
  min-width: 180px;
}

.points-flow-card--design .points-table-layout--member th:nth-child(7),
.points-flow-card--design .points-table-layout--member td:nth-child(7) {
  min-width: 92px;
}

.points-flow-card--design .points-table-panel.is-empty .data-table--design th {
  position: static;
}

.points-flow-card--design .points-table-panel.is-empty .points-table-empty {
  position: absolute;
  top: var(--points-table-head-h, 46px);
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: transparent;
  color: #94a3b8;
  text-align: center;
}

.points-flow-card--design .points-table-empty .iconify {
  display: block;
  margin: 0 0 12px;
  color: #cbd5e1;
  font-size: 40px;
}

.points-flow-card--design .points-table-empty p {
  margin: 0;
  color: #94a3b8;
  font-size: 14px;
}

.points-flow-card--design .data-table--design {
  width: 100%;
}

.points-flow-card--design .data-table--design th {
  position: sticky;
  top: 0;
  z-index: 1;
  height: var(--points-table-head-h, var(--points-table-row-h, 46px));
  padding: var(--points-table-cell-py, 14px) var(--points-table-cell-px, 16px);
  border-bottom: 1px solid rgb(15 23 42 / 8%);
  background: #ffffff;
  box-sizing: border-box;
  color: #94a3b8;
  font-size: var(--points-table-font-size, 13px);
  font-weight: 500;
  letter-spacing: 0;
  line-height: 1.45;
  text-align: left;
  text-transform: none;
  white-space: nowrap;
}

.points-flow-card--design .data-table--design td {
  height: var(--points-table-row-h, 46px);
  box-sizing: border-box;
  padding: var(--points-table-cell-py, 14px) var(--points-table-cell-px, 16px);
  border-bottom: 1px solid rgb(15 23 42 / 5%);
  background: transparent;
  color: #334155;
  font-size: var(--points-table-font-size, 13px);
  line-height: 1.45;
  vertical-align: middle;
}

.points-flow-card--design .data-table--design tbody tr:nth-child(even) td {
  background: transparent;
}

.points-flow-card--design .data-table--design tr:hover td {
  background: rgb(212 160 23 / 8%);
}

.points-flow-card--design .points-change {
  font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 12px;
  font-weight: 600;
}

.points-flow-card--design .points-change.is-positive {
  color: #16a34a;
}

.points-flow-card--design .points-change.is-negative {
  color: #ef4444;
}

.points-flow-card--design .status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #334155;
  font-size: 12px;
}

.points-flow-card--design .status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.points-flow-card--design .status-pill.is-effective .status-dot {
  background: #22c55e;
}

.points-flow-card--design .status-pill.is-pending .status-dot {
  background: #f59e0b;
}

.points-flow-card--design .points-source,
.points-flow-card--design .points-time {
  color: #334155;
  font-size: 12px;
}

.points-flow-card--design .points-source {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.points-flow-card--design .points-pagination-bar {
  flex-shrink: 0;
  padding-top: 10px;
  border-top: 0;
}

.points-flow-card--design .points-pagination button.active {
  border-color: #d4a017;
  background: #d4a017;
  color: #ffffff;
}

.points-flow-card.theme-dark.points-flow-card--design .points-subaccount-switch {
  border-color: rgb(255 255 255 / 12%);
  background: rgb(15 23 42 / 55%);
}

.points-flow-card.theme-dark.points-flow-card--design .points-subaccount-switch-btn {
  color: #94a3b8;
}

.points-flow-card.theme-dark.points-flow-card--design .points-subaccount-switch-btn.is-active {
  color: #fde68a;
}

.points-flow-card.theme-dark.points-flow-card--design .points-subaccount-chip {
  border-color: rgb(255 255 255 / 10%);
  background: rgb(27 28 29);
  color: #f4d36a;
}

.points-flow-card.theme-dark.points-flow-card--design .points-subaccount-chip.is-active {
  border-color: rgb(239 194 76 / 45%);
  background: rgb(239 194 76 / 12%);
  color: #f4d36a;
}

.points-flow-card.theme-dark.points-flow-card--design .points-subaccount-avatar {
  background: #d4a017;
  color: #1a1400;
}

.points-flow-card.theme-dark.points-flow-card--design .points-subaccount-copy strong {
  color: #f7e8c3;
}

.points-flow-card.theme-dark.points-flow-card--design .points-subaccount-copy span {
  color: #a89560;
}

.points-flow-card.theme-dark.points-flow-card--design .points-subaccount-chip.is-active
  .points-subaccount-copy
  strong {
  color: #f4d36a;
}

.points-flow-card.theme-dark.points-flow-card--design .points-subaccount-chip.is-active
  .points-subaccount-copy
  span {
  color: #c8b47a;
}

.points-flow-card.theme-dark.points-flow-card--design .points-export-button {
  border-color: rgb(255 255 255 / 16%);
  background: transparent;
  color: #9ca3af;
}

.points-flow-card.theme-dark.points-flow-card--design .points-export-button:hover {
  border-color: rgb(255 255 255 / 24%);
  background: rgb(255 255 255 / 4%);
  color: #d1d5db;
}

.points-flow-card.theme-dark.points-flow-card--design .points-section-title h2,
.points-flow-card.theme-dark.points-flow-card--design .points-source,
.points-flow-card.theme-dark.points-flow-card--design .points-time,
.points-flow-card.theme-dark.points-flow-card--design .status-pill {
  color: #f3f4f6;
}

.points-flow-card.theme-dark.points-flow-card--design .data-table--design th {
  border-bottom-color: rgb(255 255 255 / 10%);
  background: rgb(27, 28, 29);
  color: #94a3b8;
}

.points-flow-card.theme-dark.points-flow-card--design .data-table--design td {
  border-bottom-color: rgb(255 255 255 / 6%);
  background: transparent;
  color: #e2e8f0;
}

.points-flow-card.theme-dark.points-flow-card--design .points-table-empty,
.points-flow-card.theme-dark.points-flow-card--design .points-table-empty p {
  color: #9ca3af;
}

.points-flow-card.theme-dark.points-flow-card--design .points-table-empty .iconify {
  color: #64748b;
}

.points-flow-card.theme-dark.points-flow-card--design
  .data-table--design
  tbody
  tr:nth-child(even)
  td {
  background: transparent;
}

.points-flow-card.theme-dark.points-flow-card--design
  .data-table--design
  tr:hover
  td {
  background: rgb(239 194 76 / 10%);
}

/* 1440+：筛选与充值同一行 */
@media (min-width: 1440px) {
  .points-flow-card--design .points-toolbar {
    margin-bottom: 16px;
  }
}

/* 1024–1439：筛选换行，充值靠右（1366×768 / 1440×900） */
@media (min-width: 1024px) and (max-width: 1439px) {
  .points-flow-card--design .points-toolbar {
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 14px;
  }

  .points-flow-card--design .points-toolbar-filters {
    flex: 1 1 auto;
    gap: 10px;
  }

  .points-flow-card--design .points-toolbar-select {
    width: 128px;
    min-width: 116px;
  }

  .points-flow-card--design .points-toolbar-select.is-wide {
    width: 140px;
    min-width: 128px;
  }

  .points-flow-card--design .points-recharge-button {
    margin-left: auto;
  }
}

@media (min-width: 1024px) and (max-width: 1439px) {
  .points-flow-card--design .points-table-layout--member th:nth-child(6),
  .points-flow-card--design .points-table-layout--member td:nth-child(6) {
    min-width: 168px;
  }
}

/* 1023 以下：表格横向滚动，筛选纵向堆叠 */
@media (max-width: 1023px) {
  .points-flow-card--design.is-glass {
    flex: none;
    overflow: visible;
  }

  .points-flow-card--design .points-table-panel.is-empty {
    overflow: hidden;
  }

  .points-flow-card--design .points-table-panel:not(.is-empty) {
    max-height: none;
    flex: none;
    overflow-x: auto;
    overflow-y: visible;
  }

  .points-flow-card--design .points-table-layout {
    min-width: 720px;
  }

  .points-flow-card--design .points-toolbar {
    align-items: flex-start;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }

  .points-flow-card--design .points-toolbar-filters {
    flex: 1 1 100%;
  }

  .points-flow-card--design .points-recharge-button {
    margin-left: auto;
  }

  .points-flow-card--design .points-pagination {
    flex-wrap: wrap;
    justify-content: flex-end;
    max-width: 100%;
  }
}

@media (max-width: 900px) {
  .points-flow-card--design .points-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .points-flow-card--design .points-toolbar-filters {
    flex-direction: column;
    align-items: stretch;
  }

  .points-flow-card--design .points-toolbar-select,
  .points-flow-card--design .points-toolbar-select.is-wide {
    width: 100%;
    min-width: 0;
  }

  .points-flow-card--design .points-recharge-button {
    width: 100%;
    justify-content: center;
    margin-left: 0;
  }

  .points-flow-card--design .points-section-title {
    align-items: flex-start;
    flex-direction: column;
  }

  .points-flow-card--design .points-pagination-bar {
    align-items: flex-start;
    flex-direction: column;
  }

  .points-flow-card--design .points-pagination-controls {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}

@media (max-width: 767px) {
  .points-flow-card--design.is-glass {
    padding: 12px;
  }

  .points-flow-card--design .points-table-layout {
    min-width: 640px;
  }

  .points-flow-card--design .data-table--design th,
  .points-flow-card--design .data-table--design td {
    padding: var(--points-table-cell-py, 12px) 10px;
  }
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
