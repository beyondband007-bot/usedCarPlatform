<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { NButton, NDataTable, NDatePicker, NInput, NPagination, NSelect, NTag } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import { useAppStore } from '@/stores/app'
import { usePointsStore } from '@/stores/points'
import { useRechargeStore } from '@/stores/recharge'
import { useSubscriptionStore } from '@/stores/subscription'
import type { PointRecord, PointRecordType } from '@/types/points'

const appStore = useAppStore()
const pointsStore = usePointsStore()
const rechargeStore = useRechargeStore()
const subscriptionStore = useSubscriptionStore()

onMounted(async () => {
  await subscriptionStore.hydrate()
  await pointsStore.hydrate()
  await rechargeStore.hydrate()
})

const planName = computed(() =>
  subscriptionStore.currentPlan === 'basic'
    ? '企业基础版'
    : subscriptionStore.currentPlan === 'flagship'
      ? '企业旗舰版'
      : '企业团队版',
)

const consumeRecords = computed(() => pointsStore.records.filter((item) => item.amount < 0))

const flowKeyword = ref('')
const selectedFlowType = ref<'all' | PointRecordType>('all')
const dateRange = ref<[number, number] | null>(null)
const flowPage = ref(1)
const flowPageSize = 10

const flowTypeOptions: Array<{ label: string; value: 'all' | PointRecordType }> = [
  { label: '全部类型', value: 'all' },
  { label: '充值入账', value: 'recharge' },
  { label: '任务消费', value: 'consume' },
  { label: '套餐赠送', value: 'gift' },
  { label: '失败退回', value: 'refund' },
]

const flowTypeLabelMap: Record<PointRecordType, string> = {
  recharge: '充值入账',
  consume: '任务消费',
  gift: '套餐赠送',
  refund: '失败退回',
}

const flowTypeToneMap: Record<PointRecordType, string> = {
  recharge: 'is-positive',
  consume: 'is-cost',
  gift: 'is-positive',
  refund: 'is-refund',
}

function parseRecordTime(value: string) {
  const time = new Date(value.replace(/-/g, '/')).getTime()
  return Number.isFinite(time) ? time : 0
}

const filteredRecords = computed(() => {
  const keyword = flowKeyword.value.trim().toLowerCase()
  const [start, end] = dateRange.value ?? []

  return pointsStore.records.filter((item) => {
    const matchType = selectedFlowType.value === 'all' || item.type === selectedFlowType.value
    const matchKeyword =
      !keyword ||
      item.id.toLowerCase().includes(keyword) ||
      item.title.toLowerCase().includes(keyword) ||
      item.remark.toLowerCase().includes(keyword)
    const recordTime = parseRecordTime(item.createdAt)
    const matchDate = !start || !end || (recordTime >= start && recordTime <= end)

    return matchType && matchKeyword && matchDate
  })
})

const pagedRecords = computed(() => {
  const start = (flowPage.value - 1) * flowPageSize
  return filteredRecords.value.slice(start, start + flowPageSize)
})

function formatAmount(amount: number) {
  return `${amount > 0 ? '+' : ''}${amount.toLocaleString('zh-CN')}`
}

function resetFlowFilters() {
  flowKeyword.value = ''
  selectedFlowType.value = 'all'
  dateRange.value = null
  flowPage.value = 1
}

watch([flowKeyword, selectedFlowType, dateRange], () => {
  flowPage.value = 1
})

const flowColumns: DataTableColumns<PointRecord> = [
  {
    title: '流水编号',
    key: 'id',
    width: 190,
    ellipsis: { tooltip: true },
  },
  {
    title: '流水类型',
    key: 'type',
    width: 130,
    render(row) {
      return h(
        NTag,
        {
          round: true,
          bordered: false,
          class: ['flow-type-tag', flowTypeToneMap[row.type]],
        },
        { default: () => flowTypeLabelMap[row.type] },
      )
    },
  },
  {
    title: '业务名称',
    key: 'title',
    width: 190,
    ellipsis: { tooltip: true },
  },
  {
    title: '积分变动',
    key: 'amount',
    width: 130,
    render(row) {
      return h(
        'span',
        { class: ['flow-amount', row.amount > 0 ? 'is-up' : 'is-down'] },
        formatAmount(row.amount),
      )
    },
  },
  {
    title: '变动后余额',
    key: 'balance',
    width: 140,
    render(row) {
      return row.balance.toLocaleString('zh-CN')
    },
  },
  {
    title: '发生时间',
    key: 'createdAt',
    width: 190,
  },
  {
    title: '备注',
    key: 'remark',
    minWidth: 220,
    ellipsis: { tooltip: true },
  },
]

const summary = computed(() => [
  {
    label: '积分余额',
    value: pointsStore.summary.currentPoints.toLocaleString('zh-CN'),
    icon: 'mdi:diamond-stone',
  },
  {
    label: '累计充值',
    value: pointsStore.summary.totalRecharge.toLocaleString('zh-CN'),
    icon: 'mdi:cash-plus',
  },
  {
    label: '累计消费',
    value: pointsStore.summary.totalConsume.toLocaleString('zh-CN'),
    icon: 'mdi:cash-minus',
  },
  {
    label: '并行任务额度',
    value: `${subscriptionStore.concurrentTaskLimit}`,
    icon: 'mdi:counter',
  },
  {
    label: '当前运行任务数',
    value: `${pointsStore.summary.currentRunningTasks}`,
    icon: 'mdi:play-circle-outline',
  },
  {
    label: '剩余可用任务数',
    value: `${pointsStore.remainingTasks}`,
    icon: 'mdi:timer-outline',
  },
])
</script>

<template>
  <main class="points-page" :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'">
    <section class="points-shell">
      <header class="points-head">
        <div>
          <p class="eyebrow">积分中心</p>
          <h1>当前套餐与积分额度</h1>
          <span>Mock API + Pinia + LocalStorage 驱动，后续只替换 API 层即可接入真实后端。</span>
        </div>
      </header>

      <section class="overview-layout">
        <article class="overview-card plan-overview">
          <span class="overview-icon" aria-hidden="true"><Icon icon="mdi:briefcase-check-outline" /></span>
          <div>
            <p>套餐信息卡片</p>
            <h2>{{ planName }}</h2>
            <span>账号额度 {{ subscriptionStore.accountLimit }} 个 · 并行任务额度 {{ subscriptionStore.concurrentTaskLimit }} 个 · 赠送积分 {{ subscriptionStore.giftPoints.toLocaleString('zh-CN') }}</span>
          </div>
        </article>
        <article class="overview-card balance-overview">
          <span class="overview-icon" aria-hidden="true"><Icon icon="mdi:diamond-stone" /></span>
          <div>
            <p>积分余额卡片</p>
            <h2>{{ pointsStore.summary.currentPoints.toLocaleString('zh-CN') }}</h2>
            <span>冻结 {{ pointsStore.summary.freezePoints.toLocaleString('zh-CN') }} · 累计充值 {{ pointsStore.summary.totalRecharge.toLocaleString('zh-CN') }} · 累计消费 {{ pointsStore.summary.totalConsume.toLocaleString('zh-CN') }}</span>
          </div>
        </article>
        <article class="overview-card task-overview">
          <span class="overview-icon" aria-hidden="true"><Icon icon="mdi:progress-clock" /></span>
          <div>
            <p>任务额度卡片</p>
            <h2>{{ pointsStore.remainingTasks }}</h2>
            <span>额度 {{ subscriptionStore.concurrentTaskLimit }} · 运行中 {{ pointsStore.summary.currentRunningTasks }} · 剩余可用 {{ pointsStore.remainingTasks }}</span>
          </div>
        </article>
      </section>

      <section class="points-grid">
        <article v-for="item in summary" :key="item.label" class="points-card">
          <span class="points-icon" aria-hidden="true"><Icon :icon="item.icon" /></span>
          <div>
            <p>{{ item.label }}</p>
            <strong>{{ item.value }}</strong>
          </div>
        </article>
      </section>

      <section class="points-table">
        <header class="points-table-head">
          <div>
            <h2>积分流水</h2>
            <p>按发生时间、流水类型、业务名称或备注快速核对积分变化。</p>
          </div>
          <span>{{ filteredRecords.length }} / {{ pointsStore.records.length }} 条记录</span>
        </header>

        <form class="flow-filter" aria-label="积分流水查询条件" @submit.prevent>
          <NDatePicker
            v-model:value="dateRange"
            class="flow-date-picker"
            type="daterange"
            clearable
            start-placeholder="开始日期"
            end-placeholder="结束日期"
          />

          <NSelect
            v-model:value="selectedFlowType"
            class="flow-type-select"
            :options="flowTypeOptions"
          />

          <NInput
            v-model:value="flowKeyword"
            class="flow-keyword"
            clearable
            placeholder="搜索流水编号 / 业务名称 / 备注"
          >
            <template #prefix>
              <Icon icon="mdi:magnify" />
            </template>
          </NInput>

          <NButton class="flow-query-button" type="primary" attr-type="submit">
            查询
          </NButton>

          <NButton class="flow-reset-button" attr-type="button" @click="resetFlowFilters">
            重置
          </NButton>
        </form>

        <div class="flow-table-wrap">
          <NDataTable
            class="flow-data-table"
            :columns="flowColumns"
            :data="pagedRecords"
            :bordered="false"
            :single-line="false"
            :pagination="false"
            :row-key="(row) => row.id"
            :scroll-x="1190"
          />
        </div>

        <footer class="flow-table-footer">
          <p>共 {{ filteredRecords.length }} 条流水</p>
          <NPagination
            v-model:page="flowPage"
            class="flow-pagination"
            :page-size="flowPageSize"
            :item-count="filteredRecords.length"
          />
        </footer>
      </section>

      <section class="record-columns">
        <article class="points-table compact-table">
          <header class="points-table-head">
            <h2>充值记录</h2>
            <span>{{ rechargeStore.orders.length }} 条记录</span>
          </header>
          <div class="points-table-body">
            <article v-for="item in rechargeStore.orders" :key="item.orderId" class="points-row three-col">
              <div>
                <strong>{{ item.plan === 'basic' ? '企业基础版' : item.plan === 'flagship' ? '企业旗舰版' : '企业团队版' }}</strong>
                <p>{{ item.orderId }}</p>
              </div>
              <span class="up">+{{ item.giftPoints.toLocaleString('zh-CN') }}</span>
              <time>{{ item.paidAt ?? item.createdAt }}</time>
            </article>
            <p v-if="!rechargeStore.orders.length" class="empty-text">暂无充值记录</p>
          </div>
        </article>

        <article class="points-table compact-table">
          <header class="points-table-head">
            <h2>消费记录</h2>
            <span>{{ consumeRecords.length }} 条记录</span>
          </header>
          <div class="points-table-body">
            <article v-for="item in consumeRecords" :key="item.id" class="points-row three-col">
              <div>
                <strong>{{ item.title }}</strong>
                <p>{{ item.remark }}</p>
              </div>
              <span class="down">{{ item.amount.toLocaleString('zh-CN') }}</span>
              <time>{{ item.createdAt }}</time>
            </article>
            <p v-if="!consumeRecords.length" class="empty-text">暂无消费记录</p>
          </div>
        </article>
      </section>
    </section>
  </main>
</template>

<style scoped lang="scss">
.points-page {
  min-height: calc(100dvh - var(--app-header-offset));
  padding: clamp(16px, 2vw, 24px);
  background: var(--app-bg);
  color: var(--app-text);
}
.points-shell {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  gap: 18px;
}
.points-head h1 { margin: 0; font-size: 32px; font-weight: 900; }
.points-head .eyebrow { margin: 0 0 8px; color: var(--color-brand-primary); font-weight: 900; }
.points-head span { color: var(--app-text-soft); }
.overview-layout { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; align-items: stretch; }
.overview-card {
  display: flex;
  min-width: 0;
  min-height: 138px;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: var(--radius-card);
  background: var(--app-surface);
  box-shadow: var(--shadow-panel);
}
.overview-icon { display: grid; flex: 0 0 46px; place-items: center; width: 46px; height: 46px; border-radius: 14px; background: color-mix(in srgb, var(--color-accent-blue) 12%, transparent); color: var(--color-brand-primary); font-size: 24px; }
.overview-card p, .overview-card h2, .overview-card span { margin: 0; }
.overview-card p { color: var(--app-text-soft); font-size: 13px; font-weight: 800; }
.overview-card h2 { margin-top: 6px; color: var(--app-text); font-size: clamp(24px, 2vw, 34px); font-weight: 900; line-height: 1.1; }
.overview-card span { display: block; margin-top: 8px; color: var(--app-text-soft); font-size: 13px; line-height: 1.6; font-weight: 700; }
.points-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  align-items: stretch;
}
.points-card, .points-table { border: 1px solid var(--app-border); border-radius: var(--radius-card); background: var(--app-surface); box-shadow: var(--shadow-panel); }
.points-card {
  display: flex;
  min-height: 110px;
  align-items: center;
  gap: 12px;
  padding: 16px;
}
.points-card > div {
  min-width: 0;
}
.points-icon { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; background: color-mix(in srgb, var(--color-accent-blue) 12%, transparent); color: var(--color-brand-primary); font-size: 22px; }
.points-card p, .points-card strong { margin: 0; }
.points-card p { color: var(--app-text-soft); font-size: 13px; font-weight: 700; }
.points-card strong { display: block; margin-top: 4px; font-size: 24px; font-weight: 900; }
.points-table { padding: 16px; }
.points-table-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
.points-table-head h2 { margin: 0; font-size: 20px; }
.points-table-head p { margin: 6px 0 0; color: var(--app-text-soft); font-size: 13px; font-weight: 700; line-height: 1.5; }
.points-table-head span { flex: 0 0 auto; color: var(--app-text-soft); font-weight: 700; }
.flow-filter { display: grid; grid-template-columns: minmax(260px, 1.2fr) minmax(150px, 0.62fr) minmax(260px, 1fr) 86px 86px; gap: 12px; align-items: center; margin-bottom: 14px; padding: 14px; border: 1px solid var(--app-border); border-radius: 14px; background: var(--app-surface-soft); }
.flow-date-picker, .flow-type-select, .flow-keyword { width: 100%; min-width: 0; }
.flow-date-picker, .flow-type-select, .flow-keyword, .flow-query-button, .flow-reset-button { --n-height: 40px; --n-border-radius: 8px; --n-color: var(--app-surface); --n-color-active: var(--app-surface); --n-color-focus: var(--app-surface); --n-color-hover: #f8fafd; --n-border: 1px solid var(--app-border); --n-border-active: 1px solid color-mix(in srgb, var(--color-accent-blue) 72%, var(--app-border)); --n-border-focus: 1px solid color-mix(in srgb, var(--color-accent-blue) 72%, var(--app-border)); --n-border-hover: 1px solid color-mix(in srgb, var(--color-accent-blue) 56%, var(--app-border)); --n-box-shadow-focus: 0 0 0 2px color-mix(in srgb, var(--color-accent-blue) 14%, transparent); --n-text-color: var(--app-text); --n-placeholder-color: var(--app-text-soft); --n-icon-color: var(--app-text-soft); }
.flow-keyword :deep(.n-input__prefix) { color: var(--app-text-soft); font-size: 18px; }
.flow-query-button { --n-color: #2f6bff; --n-color-hover: #4f7fff; --n-color-pressed: #1d4ed8; --n-color-focus: #2f6bff; --n-border: 0; --n-border-hover: 0; --n-border-pressed: 0; --n-border-focus: 0; --n-text-color: #fff; --n-text-color-hover: #fff; --n-text-color-pressed: #fff; --n-text-color-focus: #fff; font-weight: 800; }
.flow-reset-button { --n-color: #ffffff; --n-color-hover: #f8fafd; --n-color-pressed: #f1f5f9; --n-color-focus: #ffffff; --n-border: 1px solid #d8e2f0; --n-border-hover: 1px solid #d8e2f0; --n-border-pressed: 1px solid #d8e2f0; --n-border-focus: 1px solid #d8e2f0; --n-text-color: #64748b; --n-text-color-hover: #64748b; --n-text-color-pressed: #64748b; --n-text-color-focus: #64748b; font-weight: 800; }
.flow-table-wrap { min-width: 0; overflow: auto; border: 1px solid var(--app-border); border-radius: 14px; background: var(--app-surface); }
.flow-data-table { --n-font-size: 14px; --n-th-color: var(--app-surface-soft); --n-th-color-hover: var(--app-surface-soft); --n-th-text-color: var(--app-text-soft); --n-td-color: transparent; --n-td-color-hover: color-mix(in srgb, var(--color-accent-blue) 7%, transparent); --n-td-text-color: var(--app-text); --n-border-color: var(--app-border); color: var(--app-text); }
.flow-data-table :deep(.n-data-table-th) { height: 48px; padding: 0 16px; font-size: 13px; font-weight: 900; white-space: nowrap; }
.flow-data-table :deep(.n-data-table-td) { height: 58px; padding: 0 16px; font-weight: 700; }
.flow-data-table :deep(.flow-type-tag) { --n-height: 26px; --n-border-radius: 999px; --n-font-size: 13px; --n-font-weight: 800; padding: 0 12px; }
.flow-data-table :deep(.flow-type-tag.is-positive) { --n-color: color-mix(in srgb, var(--color-success) 14%, transparent); --n-text-color: var(--color-success); color: var(--color-success); background: color-mix(in srgb, var(--color-success) 14%, transparent); }
.flow-data-table :deep(.flow-type-tag.is-cost) { --n-color: color-mix(in srgb, var(--color-error) 12%, transparent); --n-text-color: var(--color-error); color: var(--color-error); background: color-mix(in srgb, var(--color-error) 12%, transparent); }
.flow-data-table :deep(.flow-type-tag.is-refund) { --n-color: color-mix(in srgb, var(--color-brand-primary) 12%, transparent); --n-text-color: var(--color-brand-primary); color: var(--color-brand-primary); background: color-mix(in srgb, var(--color-brand-primary) 12%, transparent); }
.flow-data-table :deep(.flow-amount) { font-weight: 900; }
.flow-data-table :deep(.flow-amount.is-up) { color: var(--color-success); }
.flow-data-table :deep(.flow-amount.is-down) { color: var(--color-error); }
.flow-table-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 14px; }
.flow-table-footer p { margin: 0; color: var(--app-text-soft); font-size: 13px; font-weight: 700; }
.flow-pagination { --n-item-size: 30px; --n-item-border-radius: 6px; --n-item-color: var(--app-surface-soft); --n-item-color-hover: #f8fafd; --n-item-color-active: #2f6bff; --n-item-color-active-hover: #4f7fff; --n-item-border: 1px solid var(--app-border); --n-item-border-hover: 1px solid color-mix(in srgb, var(--color-accent-blue) 44%, var(--app-border)); --n-item-border-active: 1px solid #2f6bff; --n-item-text-color: var(--app-text-soft); --n-item-text-color-hover: var(--app-text); --n-item-text-color-active: #fff; --n-button-color: var(--app-surface-soft); --n-button-color-hover: #f8fafd; --n-button-border: 1px solid var(--app-border); --n-button-border-hover: 1px solid color-mix(in srgb, var(--color-accent-blue) 44%, var(--app-border)); --n-button-icon-color: var(--app-text-soft); --n-button-icon-color-hover: var(--app-text); }
.points-table-body { display: grid; gap: 10px; }
.points-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 16px; padding: 12px 14px; border: 1px solid var(--app-border); border-radius: 12px; background: var(--app-surface-soft); }
.points-row strong, .points-row p, .points-row time { margin: 0; }
.points-row strong { display: block; font-weight: 800; }
.points-row p, .points-row time { color: var(--app-text-soft); font-size: 13px; }
.record-columns { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.compact-table { min-width: 0; }
.points-row.three-col { grid-template-columns: minmax(0, 1fr) auto minmax(128px, auto); }
.empty-text { margin: 0; padding: 18px; border: 1px dashed var(--app-border); border-radius: 12px; color: var(--app-text-soft); text-align: center; font-weight: 700; }
.up { color: var(--color-success); font-weight: 900; }
.down { color: var(--color-error); font-weight: 900; }
@media (max-width: 1100px) { .overview-layout, .record-columns { grid-template-columns: minmax(0, 1fr); } .points-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .flow-filter { grid-template-columns: repeat(2, minmax(0, 1fr)); } .points-row, .points-row.three-col { grid-template-columns: minmax(0, 1fr) auto; } .points-row time { grid-column: 1 / -1; } }
@media (max-width: 700px) { .points-grid, .flow-filter { grid-template-columns: minmax(0, 1fr); } .points-table-head, .flow-table-footer { align-items: flex-start; flex-direction: column; } .points-row, .points-row.three-col { grid-template-columns: minmax(0, 1fr); } }
</style>
