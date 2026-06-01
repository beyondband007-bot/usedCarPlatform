<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { computed } from "vue";

import type {
  PointsFlowRecord,
  PointsQueryVersion,
  PointsTxnType,
} from "@/types/points-query";

const props = defineProps<{
  version: PointsQueryVersion;
  records: PointsFlowRecord[];
  total: number;
  currentPage: number;
  pageSize: number;
}>();

const emit = defineEmits<{
  "update:currentPage": [value: number];
  export: [];
}>();

const txnTypeLabelMap: Record<PointsTxnType, string> = {
  recharge: "充值",
  gift: "赠送",
  consume: "消费",
  refund: "退款",
};

const bizSourceLabelMap: Record<string, string> = {
  single: "单图生成",
  batch: "批量上新",
  package: "套餐赠送",
  purchase: "充值购买",
  fail: "失败退款",
};

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));

const pageItems = computed(() =>
  Array.from({ length: Math.min(3, totalPages.value) }, (_, index) => index + 1),
);

const rangeText = computed(() => {
  if (!props.total) return "显示第 0-0 条，共 0 条";
  const start = (props.currentPage - 1) * props.pageSize + 1;
  const end = Math.min(props.currentPage * props.pageSize, props.total);
  return `显示第 ${start}-${end} 条，共 ${props.total} 条`;
});

function formatNumber(value: number) {
  return value.toLocaleString("zh-CN");
}

function formatSignedNumber(value: number) {
  return `${value > 0 ? "+" : ""}${formatNumber(value)}`;
}

function setPage(page: number) {
  if (page < 1 || page > totalPages.value || page === props.currentPage) return;
  emit("update:currentPage", page);
}
</script>

<template>
  <section class="points-flow-card">
    <header class="points-flow-card__head">
      <div class="points-flow-title">
        <Icon icon="mdi:format-list-bulleted" />
        <h2>流水记录</h2>
        <span>{{ total }} 条</span>
      </div>
      <button type="button" class="points-export-button" @click="emit('export')">
        <Icon icon="mdi:download-outline" />
        导出
      </button>
    </header>

    <div class="points-table-wrap">
      <table class="points-data-table">
        <thead>
          <tr>
            <th>流水编号</th>
            <th>流水类型</th>
            <th>变动积分</th>
            <th>变动后余额</th>
            <th>业务来源</th>
            <th>标题 / 功能</th>
            <th>补充说明</th>
            <th v-if="version === 'enterprise'">操作人</th>
            <th v-if="version === 'enterprise'">身份</th>
            <th>发生时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!records.length">
            <td :colspan="version === 'enterprise' ? 10 : 8" class="points-empty-cell">
              <Icon icon="mdi:inbox-outline" />
              <span>暂无符合条件的流水记录</span>
            </td>
          </tr>
          <tr v-for="record in records" :key="record.id">
            <td>
              <span class="points-flow-id">{{ record.id }}</span>
            </td>
            <td>
              <span class="points-type-tag" :class="`is-${record.txnType}`">
                {{ txnTypeLabelMap[record.txnType] }}
              </span>
            </td>
            <td>
              <strong
                class="points-delta"
                :class="record.pointsChange > 0 ? 'is-positive' : 'is-negative'"
              >
                {{ formatSignedNumber(record.pointsChange) }}
              </strong>
            </td>
            <td>
              <span class="points-mono">{{ formatNumber(record.balanceAfter) }}</span>
            </td>
            <td>{{ bizSourceLabelMap[record.bizSource] }}</td>
            <td>
              <span class="points-title-cell">
                <strong>{{ record.title }}</strong>
                <small>{{ record.functionName }}</small>
              </span>
            </td>
            <td>{{ record.remark }}</td>
            <td v-if="version === 'enterprise'">
              <span class="points-operator">
                <i>{{ record.memberName?.slice(0, 1) }}</i>
                {{ record.memberName }}
              </span>
            </td>
            <td v-if="version === 'enterprise'">
              <span v-if="record.isOwner" class="points-owner-tag">主账号</span>
              <span v-else class="points-member-text">成员</span>
            </td>
            <td>
              <span class="points-time">{{ record.createdAt }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer class="points-flow-card__foot">
      <span>{{ rangeText }}</span>
      <div class="points-pagination">
        <button type="button" :disabled="currentPage <= 1" @click="setPage(currentPage - 1)">
          <Icon icon="mdi:chevron-left" />
        </button>
        <button
          v-for="page in pageItems"
          :key="page"
          type="button"
          :class="{ active: page === currentPage }"
          @click="setPage(page)"
        >
          {{ page }}
        </button>
        <button
          type="button"
          :disabled="currentPage >= totalPages"
          @click="setPage(currentPage + 1)"
        >
          <Icon icon="mdi:chevron-right" />
        </button>
      </div>
    </footer>
  </section>
</template>

<style scoped lang="scss">
.points-flow-card {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgb(15 23 42 / 4%);
}

.points-flow-card__head,
.points-flow-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
}

.points-flow-card__head {
  border-bottom: 1px solid #f1f5f9;
}

.points-flow-card__foot {
  border-top: 1px solid #f1f5f9;
}

.points-flow-card__foot > span {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
}

.points-flow-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #94a3b8;
}

.points-flow-title h2 {
  margin: 0;
  color: #334155;
  font-size: 14px;
  font-weight: 800;
}

.points-flow-title > span {
  padding: 2px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 700;
}

.points-export-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  color: #64748b;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
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
}

.points-data-table {
  width: 100%;
  min-width: 1060px;
  border-collapse: separate;
  border-spacing: 0;
}

.points-data-table th {
  padding: 13px 16px;
  border-bottom: 1px solid #e2e8f0;
  background: #f1f5f9;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-align: left;
  white-space: nowrap;
}

.points-data-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
  color: #475569;
  font-size: 13px;
  font-weight: 500;
  vertical-align: middle;
}

.points-data-table tbody tr:hover td {
  background: #f8fafc;
}

.points-data-table tbody tr:last-child td {
  border-bottom: 0;
}

.points-flow-id,
.points-mono,
.points-delta {
  font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
}

.points-flow-id,
.points-time {
  color: #64748b;
  font-size: 12px;
}

.points-type-tag,
.points-owner-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 22px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.points-type-tag.is-recharge {
  background: #dbeafe;
  color: #1e40af;
}

.points-type-tag.is-gift {
  background: #fce7f3;
  color: #9d174d;
}

.points-type-tag.is-consume {
  background: #fee2e2;
  color: #991b1b;
}

.points-type-tag.is-refund {
  background: #d1fae5;
  color: #065f46;
}

.points-delta {
  font-size: 13px;
  font-weight: 900;
}

.points-delta.is-positive {
  color: #059669;
}

.points-delta.is-negative {
  color: #dc2626;
}

.points-title-cell {
  display: grid;
  gap: 2px;
}

.points-title-cell strong {
  color: #0f172a;
  font-weight: 800;
}

.points-title-cell small {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
}

.points-operator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #334155;
  font-weight: 700;
}

.points-operator i {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 999px;
  background: #e2e8f0;
  color: #64748b;
  font-style: normal;
  font-size: 12px;
  font-weight: 800;
}

.points-owner-tag {
  background: #fef3c7;
  color: #92400e;
}

.points-member-text {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 700;
}

.points-empty-cell {
  height: 180px;
  text-align: center;
}

.points-empty-cell .iconify,
.points-empty-cell span {
  display: block;
  margin: 0 auto;
}

.points-empty-cell .iconify {
  margin-bottom: 10px;
  color: #cbd5e1;
  font-size: 40px;
}

.points-pagination {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.points-pagination button {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  background: #ffffff;
  color: #64748b;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 800;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    background 0.2s ease;
}

.points-pagination button.active {
  border-color: #2563eb;
  background: #2563eb;
  color: #ffffff;
}

.points-pagination button:disabled {
  cursor: not-allowed;
  color: #cbd5e1;
}

.points-pagination button:hover:not(:disabled, .active) {
  border-color: #cbd5e1;
  color: #334155;
}

@media (max-width: 640px) {
  .points-flow-card__head,
  .points-flow-card__foot {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
