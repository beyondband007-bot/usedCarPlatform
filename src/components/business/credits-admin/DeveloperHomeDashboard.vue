<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import * as echarts from 'echarts'
import {
  NButton,
  NDataTable,
  NEmpty,
  NSwitch,
  NTag,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import type {
  CreditsAdminOverview,
  CreditsCustomerProfile,
  CreditsTransaction,
  PlatformAdminPolicyOverride,
  PlatformAgentPolicyOverride,
  PlatformDashboard,
} from '@/api/visual-workbench'
import type { AccountCreationPolicyState } from '@/policies/accountProvisioning'

type ChartPeriod = 'today' | '7d' | '30d'
type ChartMetric = 'consume' | 'recharge'
type ManagementSectionKey =
  | 'adminAuthorization'
  | 'agentAuthorization'
  | 'functionBilling'
  | 'customers'
  | 'resources'

interface ApplicationCatalogItem {
  code: string
  name: string
  status: string
  statusText: string
  functions: readonly string[]
}

const props = defineProps<{
  isLoading: boolean
  overview: CreditsAdminOverview | null
  platformDashboard: PlatformDashboard | null
  selectedApplicationCode: string
  applicationCatalog: ApplicationCatalogItem[]
  filteredCustomerProfiles: CreditsCustomerProfile[]
  customerColumns: DataTableColumns<CreditsCustomerProfile>
  adminPolicyOverrides: PlatformAdminPolicyOverride[]
  agentPolicyOverrides: PlatformAgentPolicyOverride[]
  accountCreationPolicyState: AccountCreationPolicyState
  isFunctionBillingOpen: boolean
  selectedApplicationFunctions: CreditsAdminOverview['applicationFunctions']
  functionColumns: DataTableColumns<CreditsAdminOverview['applicationFunctions'][number]>
  adminAuthorizationColumns: DataTableColumns<PlatformAdminPolicyOverride>
  agentAuthorizationColumns: DataTableColumns<PlatformAgentPolicyOverride>
  selectedApplicationLabel: string
  collapseStorageKey: string
}>()

const emit = defineEmits<{
  refresh: []
  'create-account': [role: 'admin' | 'agent' | 'user']
  'update:selectedApplicationCode': [code: string]
  'update:isFunctionBillingOpen': [open: boolean]
  'update:isPermissionsOpen': [open: boolean]
}>()

const chartPeriod = ref<ChartPeriod>('7d')
const chartMetric = ref<ChartMetric>('recharge')
const chartRef = ref<HTMLElement | null>(null)
const managementSectionOpen = ref<Record<ManagementSectionKey, boolean>>({
  adminAuthorization: true,
  agentAuthorization: true,
  functionBilling: false,
  customers: true,
  resources: true,
})
let chartInstance: echarts.ECharts | null = null

const applications = computed(() => props.overview?.applications ?? [])
const creditAccounts = computed(() => props.overview?.creditAccounts ?? [])
const recentTransactions = computed(() => props.overview?.recentTransactions ?? [])
const customerProfiles = computed(() => props.overview?.customerProfiles ?? [])
const dashboardMetrics = computed(() => props.platformDashboard?.metrics ?? null)

const operationStats = computed(() => {
  const registered = applications.value.filter(
    (item) => item.status !== 'planned',
  ).length
  return [
    {
      key: 'applications',
      label: '当前应用',
      unit: '个',
      value: dashboardMetrics.value?.applicationCount ?? applications.value.length,
      icon: 'mdi:cube-outline',
      tone: 'blue',
      delta: 1,
    },
    {
      key: 'connected',
      label: '接入应用',
      unit: '个',
      value: registered,
      icon: 'mdi:puzzle-outline',
      tone: 'purple',
      delta: 0,
    },
    {
      key: 'customers',
      label: '关联客户',
      unit: '个',
      value: dashboardMetrics.value?.linkedCustomerCount ?? customerProfiles.value.length,
      icon: 'mdi:account-group-outline',
      tone: 'green',
      delta: countRecent(customerProfiles.value),
    },
    {
      key: 'tickets',
      label: '开户工单',
      unit: '单',
      value: dashboardMetrics.value?.openTicketCount ?? 0,
      icon: 'mdi:file-document-outline',
      tone: 'orange',
      delta: 0,
      hint: dashboardMetrics.value?.openTicketCount ? `待处理 ${dashboardMetrics.value.openTicketCount}` : '',
    },
  ]
})

const appCards = computed(() =>
  props.applicationCatalog.map((item) => {
    const registered = applications.value.find((app) => app.code === item.code)
    const appCustomers = customerProfiles.value.filter((profile) => profile.applicationCode === item.code)
    const earliestCustomer = appCustomers
      .map((profile) => profile.createdAt)
      .filter(Boolean)
      .sort()[0]
    return {
      code: item.code,
      name: item.name,
      status: registered?.status ?? item.status,
      statusText: item.statusText,
      customerCount: appCustomers.length,
      createdAt: earliestCustomer
        ? new Intl.DateTimeFormat('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date(earliestCustomer))
        : '-',
    }
  }),
)

const chartPeriodOptions: Array<{ value: ChartPeriod; label: string }> = [
  { value: 'today', label: '今日' },
  { value: '7d', label: '7天' },
  { value: '30d', label: '30天' },
]

const chartMetricOptions: Array<{ value: ChartMetric; label: string }> = [
  { value: 'consume', label: '积分消耗趋势' },
  { value: 'recharge', label: '积分充值趋势' },
]

const quickActions = [
  { key: 'app', label: '创建应用', icon: 'mdi:view-grid-plus-outline', action: 'scroll-apps' as const },
  { key: 'customer', label: '创建客户', icon: 'mdi:domain-plus', action: 'create-user' as const },
  { key: 'user', label: '创建用户', icon: 'mdi:account-plus-outline', action: 'create-user' as const },
  { key: 'order', label: '充值订单', icon: 'mdi:file-document-outline', action: 'scroll-customers' as const },
  { key: 'settle', label: '结算管理', icon: 'mdi:cash-multiple', action: 'scroll-customers' as const },
]

const overviewList = computed(() => {
  const trialingApps = applications.value.filter(
    (item) => item.status === 'trialing' || item.status === 'planned',
  ).length
  const trialingCustomers = customerProfiles.value.filter(
    (item) => item.status === 'trialing' || item.status === 'pending',
  ).length
  const totalBalance = creditAccounts.value.reduce(
    (sum, item) => sum + Number(item.availableBalance ?? 0),
    0,
  )
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const todayTxns = recentTransactions.value.filter(
    (item) => new Date(item.createdAt).getTime() >= start.getTime(),
  )
  const todayConsume = todayTxns
    .filter(isConsumeTxn)
    .reduce((sum, item) => sum + Math.abs(Number(item.points ?? 0)), 0)

  return [
    { key: 'trial-app', label: '试用中应用', value: String(trialingApps) },
    { key: 'trial-customer', label: '试用客户', value: String(trialingCustomers) },
    { key: 'accounts', label: '积分账号', value: String(creditAccounts.value.length) },
    { key: 'pending-settle', label: '待结算', value: String(dashboardMetrics.value?.draftSettlementCount ?? 0) },
    { key: 'balance', label: '今日订单金额', value: `¥ ${todayConsume.toLocaleString('zh-CN')}` },
    { key: 'consume', label: '今日消耗积分', value: totalBalance.toLocaleString('zh-CN') },
  ]
})

const developerResources = [
  { key: 'docs', label: '开发文档', desc: '查看接入文档与使用指南', icon: 'mdi:book-open-page-variant-outline' },
  { key: 'api', label: 'API 文档', desc: '查看 OpenAPI 接口说明', icon: 'mdi:api' },
  { key: 'sdk', label: 'SDK 下载', desc: '多语言 SDK 快速集成', icon: 'mdi:download-box-outline' },
  { key: 'demo', label: '示例代码', desc: '查看可运行的示例项目', icon: 'mdi:code-braces-box' },
]

function isConsumeTxn(transaction: CreditsTransaction) {
  return ['settle', 'freeze', 'estimate'].includes(transaction.txnType)
}

function isRechargeTxn(transaction: CreditsTransaction) {
  return ['recharge', 'adjust', 'adjustment'].includes(transaction.txnType)
}

function countRecent<T extends { createdAt?: string }>(items: T[], days = 7) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return items.filter((item) => {
    if (!item.createdAt) return false
    return new Date(item.createdAt).getTime() >= cutoff
  }).length
}

function getStatusTagType(status: string) {
  if (status === 'active' || status === 'integrated' || status === '已注册') return 'success'
  if (status === 'planned' || status === '规划中' || status === 'trialing') return 'warning'
  return 'default'
}

function getPeriodRange(period: ChartPeriod) {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date()
  if (period === 'today') {
    start.setHours(0, 0, 0, 0)
  } else if (period === '7d') {
    start.setDate(start.getDate() - 6)
    start.setHours(0, 0, 0, 0)
  } else {
    start.setDate(start.getDate() - 29)
    start.setHours(0, 0, 0, 0)
  }
  return { start, end }
}

function buildChartSeries() {
  const { start, end } = getPeriodRange(chartPeriod.value)
  const filtered = recentTransactions.value.filter((item) => {
    const time = new Date(item.createdAt).getTime()
    return time >= start.getTime() && time <= end.getTime()
  })

  const matcher = chartMetric.value === 'consume' ? isConsumeTxn : isRechargeTxn
  const labels: string[] = []
  const values: number[] = []

  if (chartPeriod.value === 'today') {
    for (let hour = 0; hour < 24; hour += 1) {
      labels.push(`${String(hour).padStart(2, '0')}:00`)
      const hourStart = new Date(start)
      hourStart.setHours(hour, 0, 0, 0)
      const hourEnd = new Date(start)
      hourEnd.setHours(hour, 59, 59, 999)
      const total = filtered
        .filter((item) => {
          const time = new Date(item.createdAt).getTime()
          return time >= hourStart.getTime() && time <= hourEnd.getTime() && matcher(item)
        })
        .reduce((sum, item) => sum + Math.abs(Number(item.points ?? 0)), 0)
      values.push(total)
    }
    return { labels, values }
  }

  const cursor = new Date(start)
  while (cursor.getTime() <= end.getTime()) {
    const dayStart = new Date(cursor)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(cursor)
    dayEnd.setHours(23, 59, 59, 999)
    labels.push(
      new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit' }).format(cursor),
    )
    const total = filtered
      .filter((item) => {
        const time = new Date(item.createdAt).getTime()
        return time >= dayStart.getTime() && time <= dayEnd.getTime() && matcher(item)
      })
      .reduce((sum, item) => sum + Math.abs(Number(item.points ?? 0)), 0)
    values.push(total)
    cursor.setDate(cursor.getDate() + 1)
  }

  return { labels, values }
}

function renderChart() {
  if (!chartRef.value) return
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }

  const { labels, values } = buildChartSeries()
  const accent = chartMetric.value === 'consume' ? '#2f6bff' : '#18b77d'

  chartInstance.setOption({
    animationDuration: 480,
    grid: { left: 12, right: 16, top: 28, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      borderWidth: 0,
      textStyle: { color: '#f8fafc', fontSize: 12 },
      formatter: (params: Array<{ axisValue: string; data: number }>) => {
        const point = params[0]
        if (!point) return ''
        return `${point.axisValue}<br/>${chartMetric.value === 'consume' ? '消耗' : '充值'}：${Number(point.data).toLocaleString('zh-CN')}`
      },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: labels,
      axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.35)' } },
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.12)' } },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 11,
        formatter: (value: number) => (value >= 10000 ? `${value / 10000}万` : String(value)),
      },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        lineStyle: { width: 2.5, color: accent },
        itemStyle: { color: accent },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: `${accent}33` },
            { offset: 1, color: `${accent}05` },
          ]),
        },
        data: values,
      },
    ],
  })
}

function handleResize() {
  chartInstance?.resize()
}

function handleQuickAction(action: (typeof quickActions)[number]['action']) {
  if (action === 'create-user') {
    emit('create-account', 'user')
    return
  }
  if (action === 'scroll-apps') {
    document.getElementById('developer-apps')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }
  document.getElementById('developer-customers')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function handleAppCardClick(code: string) {
  emit('update:selectedApplicationCode', code)
  document.getElementById('developer-customers')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function loadManagementSectionState() {
  const defaults: Record<ManagementSectionKey, boolean> = {
    adminAuthorization: true,
    agentAuthorization: true,
    functionBilling: props.isFunctionBillingOpen,
    customers: true,
    resources: true,
  }

  if (typeof window === 'undefined') {
    managementSectionOpen.value = defaults
    return
  }

  try {
    const stored = window.localStorage.getItem(props.collapseStorageKey)
    const parsed = stored ? JSON.parse(stored) as Partial<Record<ManagementSectionKey, boolean>> : {}
    managementSectionOpen.value = {
      adminAuthorization: typeof parsed.adminAuthorization === 'boolean'
        ? parsed.adminAuthorization
        : defaults.adminAuthorization,
      agentAuthorization: typeof parsed.agentAuthorization === 'boolean'
        ? parsed.agentAuthorization
        : defaults.agentAuthorization,
      functionBilling: typeof parsed.functionBilling === 'boolean'
        ? parsed.functionBilling
        : defaults.functionBilling,
      customers: typeof parsed.customers === 'boolean'
        ? parsed.customers
        : defaults.customers,
      resources: typeof parsed.resources === 'boolean'
        ? parsed.resources
        : defaults.resources,
    }
  } catch {
    managementSectionOpen.value = defaults
  }

  emit('update:isFunctionBillingOpen', managementSectionOpen.value.functionBilling)
}

function persistManagementSectionState() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(props.collapseStorageKey, JSON.stringify(managementSectionOpen.value))
  } catch {
    // Ignore storage failures; collapse controls should still work for the current session.
  }
}

function isManagementSectionOpen(key: ManagementSectionKey) {
  return managementSectionOpen.value[key]
}

function setManagementSectionOpen(key: ManagementSectionKey, open: boolean) {
  managementSectionOpen.value = {
    ...managementSectionOpen.value,
    [key]: open,
  }
  if (key === 'functionBilling') {
    emit('update:isFunctionBillingOpen', open)
  }
  persistManagementSectionState()
}

function toggleManagementSection(key: ManagementSectionKey) {
  setManagementSectionOpen(key, !managementSectionOpen.value[key])
}

watch(() => props.collapseStorageKey, loadManagementSectionState, { immediate: true })

watch([chartPeriod, chartMetric, recentTransactions], async () => {
  await nextTick()
  renderChart()
})

onMounted(async () => {
  await nextTick()
  renderChart()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  chartInstance = null
})
</script>

<template>
  <div class="dev-home">
    <!-- 第一屏：欢迎横幅 + 快速操作 -->
    <section id="developer-dashboard" class="dev-screen dev-screen-welcome">
      <article class="dev-card dev-hero-card">
        <div class="dev-hero-copy">
          <h2>欢迎使用 积分中台</h2>
          <p>统一管理积分平台的应用、客户、账户、订单与结算</p>
        </div>
        <div class="dev-hero-art" aria-hidden="true">
          <Icon icon="mdi:chart-box-outline" />
        </div>
      </article>

      <article class="dev-card dev-quick-card">
        <div class="dev-card-head">
          <p class="dev-card-kicker">快速操作</p>
          <NButton
            quaternary
            size="small"
            :loading="isLoading"
            class="dev-refresh-btn"
            @click="emit('refresh')"
          >
            <template #icon>
              <Icon icon="mdi:refresh" />
            </template>
            刷新全部数据
          </NButton>
        </div>
        <div class="dev-quick-grid">
          <button
            v-for="action in quickActions"
            :key="action.key"
            type="button"
            class="dev-quick-action"
            @click="handleQuickAction(action.action)"
          >
            <span class="dev-quick-action-icon">
              <Icon :icon="action.icon" />
            </span>
            <span>{{ action.label }}</span>
          </button>
        </div>
      </article>
    </section>

    <!-- 第二屏：运营数据统计 -->
    <section id="developer-stats" class="dev-screen">
      <div class="dev-grid-4">
        <article
          v-for="stat in operationStats"
          :key="stat.key"
          class="dev-card dev-stat-card"
        >
          <div class="dev-stat-main">
            <p class="dev-stat-label">{{ stat.label }}</p>
            <strong class="dev-stat-value">
              {{ stat.value }}<small>{{ stat.unit }}</small>
            </strong>
            <span class="dev-stat-foot">
              <template v-if="stat.delta > 0">较昨日 <em class="is-up">+{{ stat.delta }}</em></template>
              <template v-else-if="stat.hint">{{ stat.hint }}</template>
              <template v-else>较昨日 +0</template>
            </span>
          </div>
          <div class="dev-stat-icon" :class="`tone-${stat.tone}`">
            <Icon :icon="stat.icon" />
          </div>
        </article>
      </div>
    </section>

    <!-- 第三屏：系统概览 + 订单趋势 + 平台应用 -->
    <section id="developer-trends" class="dev-screen dev-screen-triple">
      <article class="dev-card dev-overview-card">
        <div class="dev-section-head">
          <h3>系统概览</h3>
        </div>
        <ul class="dev-overview-list">
          <li v-for="item in overviewList" :key="item.key">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </li>
        </ul>
      </article>

      <article class="dev-card dev-chart-card">
        <div class="dev-section-head">
          <h3>{{ chartMetricOptions.find((item) => item.value === chartMetric)?.label }}</h3>
          <div class="dev-chip-group">
            <button
              v-for="option in chartPeriodOptions"
              :key="option.value"
              type="button"
              class="dev-chip"
              :class="{ active: chartPeriod === option.value }"
              @click="chartPeriod = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        <div class="dev-chip-group dev-chip-group-metric">
          <button
            v-for="option in chartMetricOptions"
            :key="option.value"
            type="button"
            class="dev-chip"
            :class="{ active: chartMetric === option.value }"
            @click="chartMetric = option.value"
          >
            {{ option.label }}
          </button>
        </div>
        <div ref="chartRef" class="dev-chart" />
      </article>

      <article class="dev-card dev-apps-card">
        <div class="dev-section-head">
          <h3>平台应用</h3>
          <button type="button" class="dev-link-btn" @click="handleQuickAction('scroll-apps')">查看全部</button>
        </div>
        <ul class="dev-apps-list">
          <li
            v-for="app in appCards"
            :key="app.code"
            class="dev-apps-item"
            :class="{ active: selectedApplicationCode === app.code }"
            @click="handleAppCardClick(app.code)"
          >
            <div class="dev-apps-icon tone-blue">
              <Icon icon="mdi:application-outline" />
            </div>
            <div class="dev-apps-copy">
              <strong>{{ app.name }}</strong>
              <small>平台应用 · 客户 {{ app.customerCount }}</small>
            </div>
            <NTag round :bordered="false" :type="getStatusTagType(app.statusText)" size="small">
              {{ app.statusText }}
            </NTag>
          </li>
        </ul>
      </article>
    </section>

    <!-- 第四屏：账号与权限 + 最近操作 -->
    <section id="developer-permissions" class="dev-screen dev-screen-perm">
      <article class="dev-card dev-perm-card">
        <div class="dev-section-head">
          <div>
            <h3>账号与权限</h3>
            <p class="dev-section-sub">开发者可创建 Admin、Agent 和 User，并通过精细化权限控制实现安全管理</p>
          </div>
        </div>

        <div class="dev-perm-body">
          <div class="dev-action-row">
            <NButton type="primary" @click="emit('create-account', 'admin')">
              <template #icon>
                <Icon icon="mdi:account-tie-outline" />
              </template>
              创建 Admin
            </NButton>
            <NButton @click="emit('create-account', 'agent')">
              <template #icon>
                <Icon icon="mdi:handshake-outline" />
              </template>
              创建 Agent
            </NButton>
            <NButton @click="emit('create-account', 'user')">
              <template #icon>
                <Icon icon="mdi:account-plus-outline" />
              </template>
              创建 User
            </NButton>
          </div>

          <div class="dev-toggle-grid">
            <article class="dev-toggle-card">
              <div>
                <h4>允许公司管理员创建 User</h4>
              </div>
              <NSwitch v-model:value="accountCreationPolicyState.developerAllowsAdminCreateUsers" />
            </article>
            <article class="dev-toggle-card">
              <div>
                <h4>允许公司管理员创建 Agent</h4>
              </div>
              <NSwitch v-model:value="accountCreationPolicyState.developerAllowsAdminCreateAgentsAndUsers" />
            </article>
            <article class="dev-toggle-card">
              <div>
                <h4>允许代理商创建 User</h4>
              </div>
              <NSwitch v-model:value="accountCreationPolicyState.developerAllowsAgentCreateUsers" />
            </article>
          </div>

          <div class="dev-management-stack">
            <section class="dev-auth-block">
              <button
                type="button"
                class="dev-collapse-head"
                :aria-expanded="isManagementSectionOpen('adminAuthorization')"
                @click="toggleManagementSection('adminAuthorization')"
              >
                <span>
                  <strong>公司管理员授权</strong>
                  <small>二级开关，控制 Admin 是否能创建 Agent 及 User</small>
                </span>
                <Icon
                  icon="mdi:chevron-down"
                  :class="{ rotated: isManagementSectionOpen('adminAuthorization') }"
                />
              </button>
              <div v-if="isManagementSectionOpen('adminAuthorization')" class="dev-collapse-body">
                <NDataTable
                  v-if="adminPolicyOverrides.length"
                  :columns="adminAuthorizationColumns"
                  :data="adminPolicyOverrides"
                  :bordered="false"
                  :single-line="false"
                  :pagination="false"
                />
                <p v-else class="dev-auth-empty">暂无公司管理员账号</p>
              </div>
            </section>

            <section class="dev-auth-block">
              <button
                type="button"
                class="dev-collapse-head"
                :aria-expanded="isManagementSectionOpen('agentAuthorization')"
                @click="toggleManagementSection('agentAuthorization')"
              >
                <span>
                  <strong>代理商授权与管理</strong>
                  <small>控制 Agent 创建 User，并可禁用 Agent 使账号回到普通 User 身份。</small>
                </span>
                <Icon
                  icon="mdi:chevron-down"
                  :class="{ rotated: isManagementSectionOpen('agentAuthorization') }"
                />
              </button>
              <div v-if="isManagementSectionOpen('agentAuthorization')" class="dev-collapse-body">
                <NDataTable
                  v-if="agentPolicyOverrides.length"
                  :columns="agentAuthorizationColumns"
                  :data="agentPolicyOverrides"
                  :bordered="false"
                  :single-line="false"
                  :pagination="false"
                />
                <p v-else class="dev-auth-empty">暂无代理商账号</p>
              </div>
            </section>

            <section class="dev-auth-block">
              <button
                type="button"
                class="dev-collapse-head"
                :aria-expanded="isManagementSectionOpen('functionBilling')"
                @click="toggleManagementSection('functionBilling')"
              >
                <span>
                  <strong>跨应用功能计费配置 · {{ selectedApplicationLabel }}</strong>
                  <small>按当前应用筛选功能编码、计费模式、默认积分与状态。</small>
                </span>
                <Icon
                  icon="mdi:chevron-down"
                  :class="{ rotated: isManagementSectionOpen('functionBilling') }"
                />
              </button>
              <div v-if="isManagementSectionOpen('functionBilling')" class="dev-collapse-body">
                <NDataTable
                  v-if="selectedApplicationFunctions.length"
                  :columns="functionColumns"
                  :data="selectedApplicationFunctions"
                  :bordered="false"
                  :single-line="false"
                  :pagination="false"
                />
                <NEmpty
                  v-else
                  :description="selectedApplicationCode === 'all' ? '请先选择一个应用后查看功能计费配置' : '暂无功能计费配置'"
                />
              </div>
            </section>
          </div>
        </div>
      </article>

    </section>

    <!-- 第五屏：客户目录 -->
    <section id="developer-customers" class="dev-screen">
      <article class="dev-card dev-table-card">
        <button
          type="button"
          class="dev-collapse-head"
          :aria-expanded="isManagementSectionOpen('customers')"
          @click="toggleManagementSection('customers')"
        >
          <span>
            <strong>客户目录</strong>
            <small>{{ filteredCustomerProfiles.length }} 条记录</small>
          </span>
          <Icon
            icon="mdi:chevron-down"
            :class="{ rotated: isManagementSectionOpen('customers') }"
          />
        </button>
        <div v-if="isManagementSectionOpen('customers')" class="dev-collapse-body">
          <NDataTable
            v-if="filteredCustomerProfiles.length"
            class="dev-customer-table"
            :columns="customerColumns"
            :data="filteredCustomerProfiles"
            :bordered="false"
            :single-line="false"
            :pagination="false"
          />
          <NEmpty v-else description="暂无客户档案" />
        </div>
      </article>
    </section>

    <!-- 第六屏：开发者资源 -->
    <section id="developer-resources" class="dev-screen">
      <article class="dev-card dev-resource-card">
        <button
          type="button"
          class="dev-collapse-head"
          :aria-expanded="isManagementSectionOpen('resources')"
          @click="toggleManagementSection('resources')"
        >
          <span>
            <strong>开发者资源</strong>
            <small>提供接入文档、SDK、API 和工具，帮助你快速接入积分中台</small>
          </span>
          <Icon
            icon="mdi:chevron-down"
            :class="{ rotated: isManagementSectionOpen('resources') }"
          />
        </button>
        <div v-if="isManagementSectionOpen('resources')" class="dev-collapse-body">
          <div class="dev-resource-grid">
            <button
              v-for="res in developerResources"
              :key="res.key"
              type="button"
              class="dev-resource-item"
            >
              <span class="dev-resource-icon tone-blue">
                <Icon :icon="res.icon" />
              </span>
              <span class="dev-resource-copy">
                <strong>{{ res.label }}</strong>
                <small>{{ res.desc }}</small>
              </span>
            </button>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped lang="scss">
.dev-home {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dev-screen {
  display: grid;
  gap: 16px;
}

.dev-screen-welcome {
  grid-template-columns: minmax(0, 1.9fr) minmax(360px, 1fr);
}

.dev-screen-triple {
  grid-template-columns: 1fr 2fr 1fr;
}

.dev-card {
  border-radius: 12px;
  background: var(--bo-surface);
  box-shadow: var(--bo-card-shadow);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
  }
}

.dev-card-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dev-card-kicker {
  margin: 0;
  color: var(--bo-text);
  font-size: 15px;
  font-weight: 800;
}

.dev-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 800;
    color: var(--bo-text);
  }
}

.dev-section-sub {
  margin: 6px 0 0;
  color: var(--bo-text-muted);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.6;
}

.dev-section-count {
  color: var(--bo-text-muted);
  font-size: 13px;
  font-weight: 600;
}

.dev-link-btn {
  border: 0;
  background: transparent;
  color: var(--bo-accent);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.dev-card-icon {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  place-items: center;
  border-radius: 10px;
  font-size: 20px;
}

.tone-blue {
  background: rgba(47, 107, 255, 0.1);
  color: #2f6bff;
}

.tone-green {
  background: rgba(24, 183, 125, 0.1);
  color: #18b77d;
}

.tone-purple {
  background: rgba(124, 58, 237, 0.1);
  color: #7c3aed;
}

.tone-orange {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}

.dev-quick-card,
.dev-chart-card,
.dev-overview-card,
.dev-apps-card,
.dev-perm-card,
.dev-table-card,
.dev-resource-card {
  padding: 20px;
}

/* 第一屏：欢迎横幅 */
.dev-hero-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 28px 32px;
  overflow: hidden;
  background:
    radial-gradient(120% 140% at 100% 0%, rgba(47, 107, 255, 0.16), transparent 60%),
    linear-gradient(120deg, color-mix(in srgb, var(--bo-accent) 10%, var(--bo-surface)), var(--bo-surface));
}

.dev-hero-copy h2 {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 800;
  color: var(--bo-text);
}

.dev-hero-copy p {
  margin: 0;
  color: var(--bo-text-muted);
  font-size: 14px;
  font-weight: 500;
}

.dev-hero-art {
  display: grid;
  place-items: center;
  width: 120px;
  height: 96px;
  flex: 0 0 auto;
  border-radius: 16px;
  background: color-mix(in srgb, var(--bo-accent) 12%, transparent);
  color: var(--bo-accent);
  font-size: 56px;
}

/* 第一屏：快速操作 */
.dev-quick-card .dev-card-head {
  margin-bottom: 18px;
}

.dev-refresh-btn {
  margin-left: auto;
}

.dev-quick-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.dev-quick-action {
  display: grid;
  gap: 10px;
  justify-items: center;
  padding: 16px 6px;
  border: 0;
  border-radius: 12px;
  background: var(--bo-surface-soft);
  color: var(--bo-text);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--bo-accent) 8%, var(--bo-surface-soft));
    transform: translateY(-1px);
  }
}

.dev-quick-action-icon {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 10px;
  background: rgba(47, 107, 255, 0.1);
  color: #2f6bff;
  font-size: 22px;
}

/* 第二屏：指标卡 */
.dev-grid-4 {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.dev-stat-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 22px;
}

.dev-stat-label {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 700;
  color: var(--bo-text-muted);
}

.dev-stat-value {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-size: 40px;
  font-weight: 800;
  line-height: 1;
  color: var(--bo-text);

  small {
    font-size: 14px;
    font-weight: 700;
    color: var(--bo-text-muted);
  }
}

.dev-stat-foot {
  display: block;
  margin-top: 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--bo-text-muted);

  em {
    font-style: normal;

    &.is-up {
      color: #18b77d;
      font-weight: 800;
    }
  }
}

.dev-stat-icon {
  display: grid;
  width: 56px;
  height: 56px;
  flex: 0 0 56px;
  place-items: center;
  border-radius: 14px;
  font-size: 30px;
}

/* 第三屏：系统概览 */
.dev-overview-list {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 11px 0;
    border-bottom: 1px solid color-mix(in srgb, var(--bo-text-muted) 12%, transparent);
    font-size: 13px;

    &:last-child {
      border-bottom: 0;
    }

    span {
      color: var(--bo-text-soft);
      font-weight: 500;
    }

    strong {
      color: var(--bo-text);
      font-weight: 800;
    }
  }
}

/* 第三屏：图表 */
.dev-chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dev-chip-group-metric {
  margin-bottom: 8px;
}

.dev-chip {
  min-height: 28px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: var(--bo-surface-soft);
  color: var(--bo-text-soft);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &.active {
    background: color-mix(in srgb, var(--bo-accent) 12%, var(--bo-surface));
    color: var(--bo-accent);
  }
}

.dev-chart {
  width: 100%;
  height: 240px;
}

/* 第三屏：平台应用列表 */
.dev-apps-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.dev-apps-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  background: var(--bo-surface-soft);
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover,
  &.active {
    background: color-mix(in srgb, var(--bo-accent) 8%, var(--bo-surface-soft));
  }
}

.dev-apps-icon {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  place-items: center;
  border-radius: 9px;
  font-size: 18px;
}

.dev-apps-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
  margin-right: auto;

  strong {
    font-size: 14px;
    font-weight: 800;
    color: var(--bo-text);
  }

  small {
    color: var(--bo-text-muted);
    font-size: 11px;
    font-weight: 600;
  }
}

/* 第四屏：账号与权限 */
.dev-action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.dev-toggle-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.dev-toggle-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--bo-surface-soft);

  h4 {
    margin: 0;
    font-size: 13px;
    font-weight: 800;
    color: var(--bo-text);
  }
}

.dev-management-stack {
  display: grid;
  gap: 12px;
}

.dev-auth-block {
  padding: 16px;
  border-radius: 10px;
  background: var(--bo-surface-soft);

  h4 {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 800;
    color: var(--bo-text);
  }
}

.dev-collapse-head {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--bo-text);
  text-align: left;
  font: inherit;
  cursor: pointer;

  span {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  strong {
    font-size: 14px;
    font-weight: 800;
  }

  small {
    color: var(--bo-text-muted);
    font-size: 12px;
    font-weight: 500;
    line-height: 1.55;
  }

  .iconify {
    flex: 0 0 auto;
    color: var(--bo-text-muted);
    font-size: 20px;
    transition: transform 0.2s ease;

    &.rotated {
      transform: rotate(180deg);
    }
  }
}

.dev-collapse-body {
  margin-top: 12px;
}

.dev-auth-sub {
  margin: 0 0 12px;
  color: var(--bo-text-muted);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.55;
}

.dev-auth-empty {
  margin: 0;
  color: var(--bo-text-muted);
  font-size: 13px;
}

/* 第六屏：开发者资源 */
.dev-resource-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.dev-resource-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 0;
  border-radius: 10px;
  background: var(--bo-surface-soft);
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;

  &:hover {
    background: color-mix(in srgb, var(--bo-accent) 8%, var(--bo-surface-soft));
    transform: translateY(-1px);
  }
}

.dev-resource-icon {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  place-items: center;
  border-radius: 10px;
  font-size: 20px;
}

.dev-resource-copy {
  display: grid;
  gap: 3px;
  min-width: 0;

  strong {
    font-size: 14px;
    font-weight: 800;
    color: var(--bo-text);
  }

  small {
    color: var(--bo-text-muted);
    font-size: 11px;
    font-weight: 500;
  }
}

:deep(.dev-customer-table .n-data-table-tr) {
  height: 52px;
}

:deep(.dev-customer-table .n-data-table-th) {
  font-size: 13px;
  font-weight: 800;
  color: var(--bo-text-muted);
  background: var(--bo-surface-soft);
}

:deep(.dev-customer-table .n-data-table-td) {
  font-size: 13px;
}

/* 1200 ~ 1440：三列 → 收敛 */
@media (max-width: 1439.98px) {
  .dev-screen-triple {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .dev-apps-card {
    grid-column: 1 / -1;
  }

  .dev-resource-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* 768 ~ 1200：两列布局 */
@media (max-width: 1199.98px) {
  .dev-screen-welcome {
    grid-template-columns: minmax(0, 1fr);
  }

  .dev-grid-4 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dev-toggle-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* < 768：单列布局 */
@media (max-width: 767.98px) {
  .dev-screen-triple {
    grid-template-columns: minmax(0, 1fr);
  }

  .dev-grid-4,
  .dev-quick-grid,
  .dev-toggle-grid,
  .dev-resource-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .dev-hero-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .dev-quick-card,
  .dev-chart-card,
  .dev-overview-card,
  .dev-apps-card,
  .dev-perm-card,
  .dev-table-card,
  .dev-resource-card {
    padding: 16px;
  }
}

:global(.credits-admin-page.theme-dark) .dev-card:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.36);
}
</style>
