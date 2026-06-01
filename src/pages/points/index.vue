<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { NButton, NDataTable, NPagination, NSelect } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import pointsNightBg from '@/assets/img/积分查询/夜间背景图.jpg'
import { useAppStore } from '@/stores/app'
import { useCreditsStore } from '@/stores/credits'
import { useSubscriptionStore } from '@/stores/subscription'
import type { CreditsTransaction, CreditsTransactionType } from '@/api/visual-workbench'

type TimeFilter = 'recent-3-months' | 'recent-30-days' | 'this-month' | 'all'
type StatusFilter = 'all' | 'in' | 'out'

interface CreditsDisplayRow {
  id: string | number
  createdAt: string
  txnType: CreditsTransactionType
  txnTypeLabel: string
  points: number
  pointsText: string
  status: StatusFilter
  source: string
  balanceAfter?: number
}

const appStore = useAppStore()
const creditsStore = useCreditsStore()
const subscriptionStore = useSubscriptionStore()

const timeFilter = ref<TimeFilter>('recent-3-months')
const selectedFlowType = ref<'all' | CreditsTransactionType>('all')
const selectedStatus = ref<StatusFilter>('all')
const currentPage = ref(1)
const pageSize = 10

onMounted(async () => {
  await subscriptionStore.hydrate()
  await creditsStore.hydrateAccounts()
  await creditsStore.loadTransactions({ page: 1, pageSize: 50 })
})

const pageStyle = {
  '--points-night-image': `url(${pointsNightBg})`,
}

const timeOptions: Array<{ label: string; value: TimeFilter }> = [
  { label: '近三个月', value: 'recent-3-months' },
  { label: '近30天', value: 'recent-30-days' },
  { label: '本月', value: 'this-month' },
  { label: '全部时间', value: 'all' },
]

const flowTypeOptions: Array<{ label: string; value: 'all' | CreditsTransactionType }> = [
  { label: '全部积分类型', value: 'all' },
  { label: '充值', value: 'recharge' },
  { label: '预估', value: 'estimate' },
  { label: '冻结', value: 'freeze' },
  { label: '结算', value: 'settle' },
  { label: '退款', value: 'refund' },
  { label: '调整', value: 'adjust' },
]

const statusOptions: Array<{ label: string; value: StatusFilter }> = [
  { label: '全部状态', value: 'all' },
  { label: '收入', value: 'in' },
  { label: '支出', value: 'out' },
]

const txnTypeLabelMap: Record<string, string> = {
  recharge: '充值积分',
  estimate: '预估冻结',
  freeze: '冻结积分',
  settle: '结算扣减',
  refund: '失败退回',
  adjust: '人工调整',
}

const txnSourceMap: Record<string, string> = {
  recharge: '充值产品到账',
  estimate: '生成任务预估',
  freeze: '生成任务冻结',
  settle: '生成任务结算',
  refund: '失败任务退回',
  adjust: '账户调整',
}

function parseTime(value: string) {
  const normalized = value.includes('T') ? value : value.replace(/-/g, '/')
  const time = new Date(normalized).getTime()
  return Number.isFinite(time) ? time : 0
}

function deriveStatus(points: number): StatusFilter {
  return points >= 0 ? 'in' : 'out'
}

function buildDisplayRow(txn: CreditsTransaction): CreditsDisplayRow {
  return {
    id: txn.id,
    createdAt: txn.createdAt,
    txnType: txn.txnType,
    txnTypeLabel: txnTypeLabelMap[txn.txnType] ?? txn.txnType,
    points: txn.points,
    pointsText: formatSignedAmount(txn.points),
    status: deriveStatus(txn.points),
    source: txn.remark || txnSourceMap[txn.txnType] || txn.bizType || '-',
    balanceAfter: txn.balanceAfter,
  }
}

const displayRecords = computed<CreditsDisplayRow[]>(() =>
  creditsStore.transactions.map(buildDisplayRow),
)

const filteredRecords = computed(() => {
  const now = Date.now()
  const thirtyDays = 30 * 24 * 60 * 60 * 1000
  const threeMonths = 92 * 24 * 60 * 60 * 1000

  return displayRecords.value.filter((record) => {
    const matchType = selectedFlowType.value === 'all' || record.txnType === selectedFlowType.value
    const matchStatus = selectedStatus.value === 'all' || record.status === selectedStatus.value
    const recordTime = parseTime(record.createdAt)
    const matchTime =
      timeFilter.value === 'all' ||
      (timeFilter.value === 'recent-30-days' && now - recordTime <= thirtyDays) ||
      (timeFilter.value === 'recent-3-months' && now - recordTime <= threeMonths) ||
      (timeFilter.value === 'this-month' && record.createdAt.startsWith(new Date().toISOString().slice(0, 7)))

    return matchType && matchStatus && matchTime
  })
})

const pagedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredRecords.value.slice(start, start + pageSize)
})

const availablePoints = computed(() => creditsStore.availableBalance)
const lockedPoints = computed(() => creditsStore.lockedBalance)

const monthDelta = computed(() => {
  const month = new Date().toISOString().slice(0, 7)
  return displayRecords.value
    .filter((record) => record.createdAt.startsWith(month))
    .reduce((total, record) => total + record.points, 0)
})

const refundPoints = computed(() =>
  displayRecords.value
    .filter((record) => record.txnType === 'refund' && record.points > 0)
    .reduce((total, record) => total + record.points, 0),
)

const statCards = computed(() => [
  {
    label: '可用积分',
    value: availablePoints.value.toLocaleString('zh-CN'),
    suffix: '积分',
    desc: '可用于单图生成、批量任务等',
    icon: 'mdi:database',
  },
  {
    label: '冻结中积分',
    value: lockedPoints.value.toLocaleString('zh-CN'),
    suffix: '积分',
    desc: '生成任务预估冻结额度',
    icon: 'mdi:credit-card-clock-outline',
  },
  {
    label: '本月积分变动',
    value: formatSignedAmount(monthDelta.value),
    suffix: '积分',
    desc: '收入与支出净额',
    icon: 'mdi:calendar-month-outline',
  },
  {
    label: '本期失败退回积分',
    value: refundPoints.value.toLocaleString('zh-CN'),
    suffix: '积分',
    desc: '生成任务失败自动退回',
    icon: 'mdi:cash-refund',
  },
])

function formatSignedAmount(amount: number) {
  if (!Number.isFinite(amount)) return '0'
  return `${amount > 0 ? '+' : ''}${amount.toLocaleString('zh-CN')}`
}

function formatStatus(status: StatusFilter) {
  if (status === 'in') return '收入'
  if (status === 'out') return '支出'
  return '全部'
}

function formatCreatedAt(value: string) {
  const time = parseTime(value)
  if (!time) return value
  const d = new Date(time)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

watch([timeFilter, selectedFlowType, selectedStatus], () => {
  currentPage.value = 1
})

const flowColumns: DataTableColumns<CreditsDisplayRow> = [
  {
    title: '时间',
    key: 'createdAt',
    width: 200,
    render(row) {
      return formatCreatedAt(row.createdAt)
    },
  },
  {
    title: '积分类型',
    key: 'txnType',
    width: 150,
    render(row) {
      return row.txnTypeLabel
    },
  },
  {
    title: '积分变动',
    key: 'points',
    width: 140,
    render(row) {
      return h(
        'span',
        { class: ['points-delta', row.points > 0 ? 'is-up' : 'is-down'] },
        row.pointsText,
      )
    },
  },
  {
    title: '方向',
    key: 'status',
    width: 120,
    render(row) {
      return h(
        'span',
        { class: ['points-status', `is-${row.status === 'in' ? 'active' : 'expired'}`] },
        [
          h('i', { class: 'points-status-dot', 'aria-hidden': 'true' }),
          h('span', formatStatus(row.status)),
        ],
      )
    },
  },
  {
    title: '来源/用途',
    key: 'source',
    minWidth: 220,
    ellipsis: { tooltip: true },
  },
  {
    title: '当前余额',
    key: 'balanceAfter',
    width: 150,
    render(row) {
      return row.balanceAfter == null ? '-' : Number(row.balanceAfter).toLocaleString('zh-CN')
    },
  },
]
</script>

<template>
  <main
    class="points-page"
    :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'"
    :style="pageStyle"
  >
    <div class="points-bg" aria-hidden="true" />

    <section class="points-shell" aria-label="积分查询">
      <header class="points-hero">
        <h1>积分查询</h1>
        <p>三档套餐覆盖试运行、团队批量上新与集团化交付场景</p>
      </header>

      <form class="points-filter" aria-label="积分筛选条件" @submit.prevent>
        <NSelect
          v-model:value="timeFilter"
          class="points-select"
          :options="timeOptions"
          size="large"
        />
        <NSelect
          v-model:value="selectedFlowType"
          class="points-select"
          :options="flowTypeOptions"
          size="large"
        />
        <NSelect
          v-model:value="selectedStatus"
          class="points-select"
          :options="statusOptions"
          size="large"
        />
        <NButton class="points-query-button" size="large" attr-type="submit">
          <template #icon>
            <Icon icon="mdi:magnify" />
          </template>
          查询
        </NButton>
      </form>

      <section class="points-stats" aria-label="积分统计">
        <article v-for="item in statCards" :key="item.label" class="points-stat-card">
          <span class="points-stat-icon" aria-hidden="true">
            <Icon :icon="item.icon" />
          </span>
          <div class="points-stat-copy">
            <p>{{ item.label }}</p>
            <strong>{{ item.value }} <span>{{ item.suffix }}</span></strong>
            <small>{{ item.desc }}</small>
          </div>
        </article>
      </section>

      <section class="points-detail">
        <header class="points-detail-head">
          <span aria-hidden="true" />
          <h2>积分明细</h2>
        </header>

        <div class="points-table-wrap">
          <NDataTable
            class="points-data-table"
            :columns="flowColumns"
            :data="pagedRecords"
            :bordered="false"
            :single-line="false"
            :pagination="false"
            :row-key="(row) => row.id"
            :scroll-x="1080"
          />
        </div>

        <footer class="points-table-footer">
          <p>共 {{ filteredRecords.length }} 条记录</p>
          <NPagination
            v-model:page="currentPage"
            class="points-pagination"
            :page-size="pageSize"
            :item-count="filteredRecords.length"
          />
        </footer>
      </section>
    </section>
  </main>
</template>

<style scoped lang="scss">
.points-page {
  --points-gold: #d7ad32;
  --points-gold-strong: #f2cf56;
  --points-bg: #050505;
  --points-bg-image: var(--points-night-image);
  --points-bg-position: right top;
  --points-bg-size: cover;
  --points-panel: rgba(27, 28, 28, 0.9);
  --points-panel-strong: rgba(16, 17, 17, 0.9);
  --points-border: rgba(255, 255, 255, 0.1);
  --points-border-strong: rgba(215, 173, 50, 0.34);
  --points-text: #f7f7f4;
  --points-text-soft: rgba(247, 247, 244, 0.7);
  --points-text-muted: rgba(247, 247, 244, 0.54);
  --points-success: #27d184;
  --points-warning: #f2c74a;
  --points-danger: #ff4f4f;

  position: relative;
  min-height: calc(100dvh - var(--app-header-offset));
  overflow-x: hidden;
  overflow-y: auto;
  background: var(--points-bg);
  color: var(--points-text);
}

.points-page,
.points-page *,
.points-page *::before,
.points-page *::after {
  box-sizing: border-box;
}

.points-page.theme-light {
  --points-bg: #f6f9fc;
  --points-bg-image:
    linear-gradient(rgba(47, 107, 255, 0.075) 1px, transparent 1px),
    linear-gradient(90deg, rgba(47, 107, 255, 0.075) 1px, transparent 1px),
    radial-gradient(circle at 72% 18%, rgba(47, 107, 255, 0.18), transparent 34%),
    radial-gradient(circle at 28% 42%, rgba(125, 181, 255, 0.16), transparent 34%),
    linear-gradient(135deg, #ffffff 0%, #f4f8ff 46%, #eaf2ff 100%);
  --points-bg-position: center top, center top, center top, center top, center top;
  --points-bg-size: 44px 44px, 44px 44px, cover, cover, cover;
  --points-panel: rgba(255, 255, 255, 0.9);
  --points-panel-strong: rgba(248, 250, 252, 0.94);
  --points-border: rgba(15, 23, 42, 0.1);
  --points-border-strong: rgba(47, 107, 255, 0.24);
  --points-text: #0f172a;
  --points-text-soft: #475569;
  --points-text-muted: #64748b;
  --points-gold: #2f6bff;
  --points-gold-strong: #4f7fff;
}

.points-bg {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  z-index: 0;
  width: min(100%, 2200px);
  background-color: var(--points-bg);
  background-image: var(--points-bg-image);
  background-position: var(--points-bg-position);
  background-repeat: no-repeat;
  background-size: var(--points-bg-size);
  transform: translateX(-50%);
}

.points-bg::after {
  position: absolute;
  inset: 0;
  content: "";
  background:
    linear-gradient(90deg, rgba(5, 5, 5, 0.82) 0%, rgba(5, 5, 5, 0.52) 38%, rgba(5, 5, 5, 0.16) 72%, rgba(5, 5, 5, 0.46) 100%),
    linear-gradient(180deg, rgba(5, 5, 5, 0.02) 0%, rgba(5, 5, 5, 0.46) 58%, #050505 100%);
}

.theme-light .points-bg::after {
  background:
    linear-gradient(90deg, rgba(246, 249, 252, 0.88) 0%, rgba(246, 249, 252, 0.58) 44%, rgba(246, 249, 252, 0.32) 78%, rgba(246, 249, 252, 0.7) 100%),
    linear-gradient(180deg, rgba(246, 249, 252, 0.06) 0%, rgba(246, 249, 252, 0.74) 62%, #f6f9fc 100%);
}

.points-shell {
  position: relative;
  z-index: 1;
  width: min(2200px, 100%);
  min-height: calc(100dvh - var(--app-header-offset));
  margin: 0 auto;
  padding: clamp(84px, 10vh, 116px) clamp(80px, 10vw, 320px) clamp(70px, 8vh, 104px);
}

.points-hero {
  width: min(720px, 100%);
}

.points-hero h1 {
  margin: 0;
  color: var(--points-text);
  font-size: clamp(38px, 3.3vw, 52px);
  font-weight: 950;
  line-height: 1.1;
  letter-spacing: 0;
}

.points-hero p {
  margin: 16px 0 0;
  color: var(--points-text-soft);
  font-size: clamp(18px, 1.35vw, 24px);
  font-weight: 700;
  line-height: 1.45;
}

.points-filter {
  display: grid;
  width: min(1040px, 100%);
  grid-template-columns: repeat(3, minmax(210px, 1fr)) 180px;
  gap: 16px;
  margin-top: 34px;
}

.points-select,
.points-query-button {
  --n-height: 48px;
  --n-border-radius: 8px;
  --n-color: rgba(17, 18, 18, 0.76);
  --n-color-active: rgba(17, 18, 18, 0.88);
  --n-color-focus: rgba(17, 18, 18, 0.88);
  --n-color-hover: rgba(22, 23, 23, 0.92);
  --n-border: 1px solid rgba(255, 255, 255, 0.12);
  --n-border-active: 1px solid var(--points-border-strong);
  --n-border-focus: 1px solid var(--points-border-strong);
  --n-border-hover: 1px solid rgba(215, 173, 50, 0.26);
  --n-box-shadow-focus: 0 0 0 2px rgba(215, 173, 50, 0.1);
  --n-text-color: var(--points-text);
  --n-placeholder-color: var(--points-text-soft);
  --n-icon-color: var(--points-text-soft);
  width: 100%;
  min-width: 0;
}

.theme-light .points-select,
.theme-light .points-query-button {
  --n-color: rgba(255, 255, 255, 0.86);
  --n-color-active: #ffffff;
  --n-color-focus: #ffffff;
  --n-color-hover: #ffffff;
  --n-border: 1px solid rgba(15, 23, 42, 0.1);
  --n-border-hover: 1px solid rgba(47, 107, 255, 0.28);
  --n-text-color: var(--points-text);
  --n-placeholder-color: var(--points-text-soft);
  --n-icon-color: var(--points-text-soft);
}

.points-query-button {
  --n-color: rgba(215, 173, 50, 0.08);
  --n-color-hover: rgba(215, 173, 50, 0.14);
  --n-color-pressed: rgba(215, 173, 50, 0.2);
  --n-color-focus: rgba(215, 173, 50, 0.12);
  --n-border: 1px solid rgba(215, 173, 50, 0.72);
  --n-border-hover: 1px solid rgba(242, 207, 86, 0.88);
  --n-border-pressed: 1px solid rgba(242, 207, 86, 0.78);
  --n-border-focus: 1px solid rgba(242, 207, 86, 0.88);
  --n-text-color: var(--points-gold-strong);
  --n-text-color-hover: var(--points-gold-strong);
  --n-text-color-pressed: var(--points-gold);
  --n-text-color-focus: var(--points-gold-strong);
  font-size: 15px;
  font-weight: 900;
}

.points-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(300px, 1fr));
  gap: 24px;
  margin-top: 34px;
  overflow: visible;
}

.points-stat-card {
  display: flex;
  min-width: 0;
  min-height: 144px;
  align-items: center;
  gap: clamp(14px, 1.1vw, 22px);
  padding: clamp(20px, 1.4vw, 28px);
  border: 1px solid var(--points-border);
  border-radius: 8px;
  background: var(--points-panel);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 18px 46px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(10px);
}

.points-stat-icon {
  display: grid;
  flex: 0 0 clamp(52px, 3.2vw, 68px);
  width: clamp(52px, 3.2vw, 68px);
  height: clamp(52px, 3.2vw, 68px);
  place-items: center;
  border-radius: 999px;
  background: rgba(215, 173, 50, 0.12);
  color: var(--points-gold-strong);
  font-size: 30px;
}

.points-stat-copy {
  min-width: 0;
}

.points-stat-copy p,
.points-stat-copy strong,
.points-stat-copy small {
  margin: 0;
}

.points-stat-copy p {
  overflow: hidden;
  color: var(--points-text-soft);
  font-size: 14px;
  font-weight: 900;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.points-stat-copy strong {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 8px;
  min-width: 0;
  overflow: visible;
  color: var(--points-gold-strong);
  font-size: clamp(27px, 2vw, 42px);
  font-weight: 950;
  line-height: 1.1;
  white-space: nowrap;
}

.points-stat-copy strong span {
  flex: 0 0 auto;
  color: var(--points-text-soft);
  font-size: 14px;
  font-weight: 800;
}

.points-stat-copy small {
  display: block;
  margin-top: 10px;
  overflow: hidden;
  color: var(--points-text-muted);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.points-stat-card:nth-child(3) .points-stat-copy small {
  color: var(--points-gold-strong);
}

.points-detail {
  margin-top: 48px;
}

.points-detail-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 22px;
}

.points-detail-head span {
  width: 5px;
  height: 28px;
  border-radius: 999px;
  background: var(--points-gold-strong);
}

.points-detail-head h2 {
  margin: 0;
  color: var(--points-text);
  font-size: 24px;
  font-weight: 950;
  line-height: 1.25;
}

.points-table-wrap {
  overflow-x: auto;
  overflow-y: hidden;
  border: 1px solid var(--points-border);
  border-radius: 8px;
  background: rgba(15, 16, 16, 0.86);
  backdrop-filter: blur(10px);
}

.theme-light .points-table-wrap {
  background: rgba(255, 255, 255, 0.92);
}

.points-data-table {
  --n-font-size: 16px;
  --n-th-color: rgba(36, 37, 37, 0.94);
  --n-th-color-hover: rgba(36, 37, 37, 0.94);
  --n-th-text-color: rgba(247, 247, 244, 0.62);
  --n-td-color: rgba(15, 16, 16, 0.5);
  --n-td-color-hover: rgba(215, 173, 50, 0.08);
  --n-td-text-color: rgba(247, 247, 244, 0.68);
  --n-border-color: rgba(255, 255, 255, 0.07);
  color: var(--points-text-soft);
}

.theme-light .points-data-table {
  --n-th-color: rgba(248, 250, 252, 0.94);
  --n-th-color-hover: rgba(248, 250, 252, 0.94);
  --n-th-text-color: #64748b;
  --n-td-color: rgba(255, 255, 255, 0.54);
  --n-td-color-hover: rgba(47, 107, 255, 0.06);
  --n-td-text-color: #475569;
  --n-border-color: rgba(15, 23, 42, 0.08);
}

.points-data-table :deep(.n-data-table-th) {
  height: 64px;
  padding: 0 34px;
  font-size: 15px;
  font-weight: 900;
  white-space: nowrap;
}

.points-data-table :deep(.n-data-table-td) {
  height: 72px;
  padding: 0 34px;
  font-weight: 800;
}

.points-table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 18px;
}

.points-table-footer p {
  margin: 0;
  color: var(--points-text-muted);
  font-size: 13px;
  font-weight: 800;
}

.points-pagination {
  --n-item-size: 32px;
  --n-item-border-radius: 6px;
  --n-item-color: rgba(15, 16, 16, 0.76);
  --n-item-color-hover: rgba(215, 173, 50, 0.1);
  --n-item-color-active: rgba(215, 173, 50, 0.16);
  --n-item-color-active-hover: rgba(215, 173, 50, 0.22);
  --n-item-border: 1px solid var(--points-border);
  --n-item-border-hover: 1px solid rgba(215, 173, 50, 0.34);
  --n-item-border-active: 1px solid rgba(215, 173, 50, 0.54);
  --n-item-text-color: var(--points-text-muted);
  --n-item-text-color-hover: var(--points-text);
  --n-item-text-color-active: var(--points-gold-strong);
  --n-button-color: rgba(15, 16, 16, 0.76);
  --n-button-color-hover: rgba(215, 173, 50, 0.1);
  --n-button-border: 1px solid var(--points-border);
  --n-button-border-hover: 1px solid rgba(215, 173, 50, 0.34);
  --n-button-icon-color: var(--points-text-muted);
  --n-button-icon-color-hover: var(--points-text);
}

.theme-light .points-pagination {
  --n-item-color: rgba(255, 255, 255, 0.9);
  --n-item-color-hover: rgba(47, 107, 255, 0.08);
  --n-item-color-active: rgba(47, 107, 255, 0.12);
  --n-item-color-active-hover: rgba(47, 107, 255, 0.16);
  --n-button-color: rgba(255, 255, 255, 0.9);
  --n-button-color-hover: rgba(47, 107, 255, 0.08);
}

.points-data-table :deep(.points-delta) {
  font-weight: 950;
}

.points-data-table :deep(.points-delta.is-up) {
  color: var(--points-gold-strong);
}

.points-data-table :deep(.points-delta.is-down) {
  color: var(--points-danger);
}

.points-data-table :deep(.points-status) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--points-text-soft);
}

.points-data-table :deep(.points-status-dot) {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--points-success);
}

.points-data-table :deep(.points-status.is-pending .points-status-dot) {
  background: var(--points-warning);
}

.points-data-table :deep(.points-status.is-expired .points-status-dot) {
  background: var(--points-danger);
}

@media (max-width: 1180px) {
  .points-shell {
    width: min(100% - 32px, 1040px);
    padding-right: 0;
    padding-left: 0;
  }

  .points-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1500px) {
  .points-shell {
    padding-right: clamp(120px, 12vw, 360px);
    padding-left: clamp(120px, 12vw, 360px);
  }

  .points-stat-card {
    min-height: 148px;
  }
}

@media (max-width: 820px) {
  .points-shell {
    width: min(100% - 24px, 720px);
    padding-top: 54px;
    padding-bottom: 56px;
  }

  .points-filter {
    grid-template-columns: minmax(0, 1fr);
  }

  .points-stats {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }

  .points-stat-card {
    min-height: 112px;
    padding: 18px;
  }

  .points-data-table :deep(.n-data-table-th),
  .points-data-table :deep(.n-data-table-td) {
    padding: 0 18px;
  }

  .points-table-footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
