<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watchEffect } from 'vue'
import { Icon } from '@iconify/vue'
import {
  NButton,
  NDataTable,
  NEmpty,
  NSpin,
  NSwitch,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import {
  getAgentOperationsOverview,
  getCreditsAdminOverview,
  type AgentOperationsCommissionPreview,
  type AgentOperationsCustomer,
  type AgentOperationsLead,
  type AgentOperationsMaterial,
  type AgentOperationsOverview,
  type AgentOperationsSettlementBill,
  type AgentOperationsTicket,
  type CreditsAccount,
  type CreditsAdminOverview,
  type CreditsCustomerProfile,
  type CreditsTransaction,
  type RechargeProduct,
} from '@/api/visual-workbench'
import {
  accountCreationPolicies,
  defaultAccountCreationPolicyState,
  resolveAccountCreationPolicy,
  reusableCreditsApplicationCatalog,
  type BackOfficeRole,
} from '@/policies/accountProvisioning'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'

type RoleTab = BackOfficeRole

const appStore = useAppStore()
const authStore = useAuthStore()
const message = useMessage()

const overview = ref<CreditsAdminOverview | null>(null)
const agentOverview = ref<AgentOperationsOverview | null>(null)
const isLoading = ref(false)
const lastError = ref<string | null>(null)
const activeRole = ref<RoleTab>('developer')
const selectedApplicationCode = ref('all')
const accountCreationPolicyState = reactive({ ...defaultAccountCreationPolicyState })

const roleTabs: Array<{ value: RoleTab; label: string; description: string; icon: string }> = [
  {
    value: 'developer',
    label: '开发者',
    description: '全局 CRUD、全部流水余额、积分增减',
    icon: 'mdi:code-tags',
  },
  {
    value: 'admin',
    label: '公司管理员',
    description: 'Agent/User CRUD、全部流水余额、积分增减',
    icon: 'mdi:shield-account-outline',
  },
  {
    value: 'agent',
    label: '代理商',
    description: '创建 User，读取自建 User 流水余额',
    icon: 'mdi:handshake-outline',
  },
]

const roleAccess: Record<RoleTab, RoleTab[]> = {
  developer: ['developer', 'admin', 'agent'],
  admin: ['admin', 'agent'],
  agent: ['agent'],
}

const visibleRoleTabs = computed(() => {
  const role = authStore.role
  if (role === 'developer' || role === 'admin' || role === 'agent') {
    return roleTabs.filter((tab) => roleAccess[role].includes(tab.value))
  }
  return []
})

watchEffect(() => {
  if (!visibleRoleTabs.value.some((tab) => tab.value === activeRole.value)) {
    activeRole.value = visibleRoleTabs.value[0]?.value ?? 'agent'
  }
})

async function refreshOverview() {
  isLoading.value = true
  try {
    const [creditsOverview, operationsOverview] = await Promise.all([
      getCreditsAdminOverview(),
      getAgentOperationsOverview().catch(() => null),
    ])
    overview.value = creditsOverview
    agentOverview.value = operationsOverview
    lastError.value = null
  } catch (error) {
    const text = error instanceof Error ? error.message : '加载积分平台控制台概览失败'
    lastError.value = text
    message.error(text)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void refreshOverview()
})

const applications = computed(() => overview.value?.applications ?? [])
const applicationFunctions = computed(() => overview.value?.applicationFunctions ?? [])
const creditAccounts = computed(() => overview.value?.creditAccounts ?? [])
const rechargeProducts = computed(() => overview.value?.rechargeProducts ?? [])
const recentTransactions = computed(() => overview.value?.recentTransactions ?? [])
const customerProfiles = computed(() => overview.value?.customerProfiles ?? [])
const agentCustomers = computed(() => agentOverview.value?.customers ?? [])
const agentLeads = computed(() => agentOverview.value?.leads ?? [])
const agentCommissions = computed(() => agentOverview.value?.commissionPreviews ?? [])
const agentSettlements = computed(() => agentOverview.value?.settlementBills ?? [])
const agentMaterials = computed(() => agentOverview.value?.materials ?? [])
const agentTickets = computed(() => agentOverview.value?.tickets ?? [])

const registeredApplicationsByCode = computed(
  () => new Map(applications.value.map((item) => [item.code, item])),
)

const applicationCatalog = computed(() =>
  reusableCreditsApplicationCatalog.map((item) => {
    const registered = registeredApplicationsByCode.value.get(item.code)
    return {
      ...item,
      statusText: registered && registered.status !== 'planned'
        ? '已注册'
        : item.status === 'planned' || registered?.status === 'planned'
          ? '规划中'
          : item.status,
    }
  }),
)

const applicationFilterOptions = computed(() => [
  { code: 'all', name: '全部应用', statusText: '平台视图' },
  ...applicationCatalog.value.map((item) => ({
    code: item.code,
    name: item.name,
    statusText: item.statusText,
  })),
])

const selectedApplicationLabel = computed(() =>
  applicationFilterOptions.value.find((item) => item.code === selectedApplicationCode.value)?.name ??
  '全部应用',
)

function matchesSelectedApplication(applicationCode?: string | null) {
  return selectedApplicationCode.value === 'all' || applicationCode === selectedApplicationCode.value
}

const filteredApplicationFunctions = computed(() =>
  applicationFunctions.value.filter((item) => matchesSelectedApplication(item.applicationCode)),
)

const filteredRecentTransactions = computed(() =>
  recentTransactions.value.filter((item) => matchesSelectedApplication(item.applicationCode)),
)

const filteredCustomerProfiles = computed(() =>
  customerProfiles.value.filter((item) => matchesSelectedApplication(item.applicationCode)),
)

const filteredAgentCustomers = computed(() =>
  agentCustomers.value.filter((item) => matchesSelectedApplication(item.applicationCode)),
)

const filteredAgentLeads = computed(() =>
  agentLeads.value.filter((item) => matchesSelectedApplication(item.applicationCode)),
)

const filteredAgentCommissions = computed(() =>
  agentCommissions.value.filter((item) => matchesSelectedApplication(item.applicationCode)),
)

const filteredAgentMaterials = computed(() =>
  agentMaterials.value.filter((item) => matchesSelectedApplication(item.applicationCode)),
)

const effectiveAccountCreationPolicy = computed(() =>
  resolveAccountCreationPolicy(accountCreationPolicyState),
)

const accountCreationPolicyRows = computed(() =>
  accountCreationPolicies.map((policy) => {
    const enabled =
      policy.role === 'developer'
        ? effectiveAccountCreationPolicy.value.developerCanCreateAdmins &&
          effectiveAccountCreationPolicy.value.developerCanCreateAgents &&
          effectiveAccountCreationPolicy.value.developerCanCreateUsers
        : policy.role === 'admin'
          ? effectiveAccountCreationPolicy.value.adminCanCreateAgents &&
            effectiveAccountCreationPolicy.value.adminCanCreateUsers
          : effectiveAccountCreationPolicy.value.agentCanCreateUsers

    return {
      ...policy,
      enabled,
      controllerText: policy.controllerText
        ? policy.controllerText
        : policy.controlledBy.length
        ? policy.controlledBy.map((role) => roleTabs.find((tab) => tab.value === role)?.label ?? role).join(' + ')
        : '始终开启',
    }
  }),
)

const agentCreationGateText = computed(() => {
  if (!accountCreationPolicyState.developerAllowsAgentCreateUsers) {
    return '开发者已禁用代理商创建 User'
  }
  if (!accountCreationPolicyState.adminAllowsAgentCreateUsers) {
    return '公司管理员未允许代理商创建 User'
  }
  return '公司管理员已允许，开发者未禁用'
})

function policyTagType(enabled: boolean, controlled: boolean) {
  if (!enabled) return 'error'
  return controlled ? 'warning' : 'success'
}

const functionColumns: DataTableColumns<CreditsAdminOverview['applicationFunctions'][number]> = [
  {
    title: '应用',
    key: 'applicationCode',
    width: 160,
    render(row) {
      return row.applicationName ?? row.applicationCode ?? '-'
    },
  },
  { title: '功能编码', key: 'code', width: 220 },
  { title: '功能名称', key: 'name', width: 200 },
  { title: '计费模式', key: 'chargeMode', width: 140, render(row) { return row.chargeMode ?? '-' } },
  {
    title: '默认积分',
    key: 'defaultPoints',
    width: 120,
    render(row) {
      return Number(row.defaultPoints ?? 0).toLocaleString('zh-CN')
    },
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row) {
      return h(
        NTag,
        {
          round: true,
          bordered: false,
          type: row.status === 'active' ? 'success' : 'default',
        },
        { default: () => row.status },
      )
    },
  },
]

const accountColumns: DataTableColumns<CreditsAccount> = [
  { title: '账户 ID', key: 'id', width: 140 },
  { title: '用户 ID', key: 'userId', width: 100 },
  { title: '租户 ID', key: 'tenantId', width: 100, render(row) { return row.tenantId ?? '-' } },
  { title: '范围', key: 'accountScope', width: 120 },
  {
    title: '可用积分',
    key: 'availableBalance',
    width: 140,
    render(row) {
      return Number(row.availableBalance ?? 0).toLocaleString('zh-CN')
    },
  },
  {
    title: '冻结积分',
    key: 'lockedBalance',
    width: 140,
    render(row) {
      return Number(row.lockedBalance ?? 0).toLocaleString('zh-CN')
    },
  },
  {
    title: '账户总额',
    key: 'totalBalance',
    width: 140,
    render(row) {
      return Number(row.totalBalance ?? 0).toLocaleString('zh-CN')
    },
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row) {
      return h(
        NTag,
        {
          round: true,
          bordered: false,
          type: row.status === 'active' ? 'success' : 'warning',
        },
        { default: () => row.status },
      )
    },
  },
]

const productColumns: DataTableColumns<RechargeProduct> = [
  { title: '编码', key: 'code', width: 160 },
  { title: '名称', key: 'name', width: 200 },
  {
    title: '价格',
    key: 'priceText',
    width: 140,
    render(row) {
      if (row.priceText) return row.priceText
      if (typeof row.priceCents === 'number') {
        return `¥${(row.priceCents / 100).toLocaleString('zh-CN')}`
      }
      return '-'
    },
  },
  {
    title: '赠送积分',
    key: 'giftPoints',
    width: 130,
    render(row) {
      return Number(row.giftPoints ?? 0).toLocaleString('zh-CN')
    },
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row) {
      return row.status ?? '-'
    },
  },
]

const transactionColumns: DataTableColumns<CreditsTransaction> = [
  {
    title: '时间',
    key: 'createdAt',
    width: 200,
    render(row) {
      const time = new Date(row.createdAt)
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${time.getFullYear()}-${pad(time.getMonth() + 1)}-${pad(time.getDate())} ${pad(time.getHours())}:${pad(time.getMinutes())}`
    },
  },
  {
    title: '应用',
    key: 'applicationCode',
    width: 150,
    render(row) {
      return row.applicationName ?? row.applicationCode ?? '-'
    },
  },
  {
    title: '功能',
    key: 'functionCode',
    width: 170,
    render(row) {
      return row.functionName ?? row.functionCode ?? '-'
    },
  },
  {
    title: '类型',
    key: 'txnType',
    width: 120,
    render(row) {
      const colorMap: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
        recharge: 'success',
        settle: 'info',
        freeze: 'warning',
        refund: 'success',
        estimate: 'default',
      }
      return h(
        NTag,
        {
          round: true,
          bordered: false,
          type: colorMap[row.txnType] ?? 'default',
        },
        { default: () => row.txnType },
      )
    },
  },
  {
    title: '积分变动',
    key: 'points',
    width: 140,
    render(row) {
      const sign = row.points > 0 ? '+' : ''
      return h(
        'span',
        { class: row.points >= 0 ? 'admin-delta is-up' : 'admin-delta is-down' },
        `${sign}${Number(row.points).toLocaleString('zh-CN')}`,
      )
    },
  },
  {
    title: '业务 ID',
    key: 'bizId',
    minWidth: 220,
    ellipsis: { tooltip: true },
    render(row) {
      return row.bizId ?? '-'
    },
  },
  {
    title: '计费任务',
    key: 'billingTaskId',
    width: 180,
    ellipsis: { tooltip: true },
    render(row) {
      return row.billingTaskId ?? '-'
    },
  },
]

const customerColumns: DataTableColumns<CreditsCustomerProfile> = [
  {
    title: '应用',
    key: 'applicationCode',
    width: 150,
  },
  {
    title: '客户',
    key: 'displayName',
    minWidth: 180,
    render(row) {
      return `${row.displayName} (${row.username})`
    },
  },
  { title: '角色', key: 'role', width: 110 },
  { title: '手机号', key: 'phone', width: 140, render(row) { return row.phone ?? '-' } },
  { title: 'Credits User', key: 'creditsUserId', width: 130 },
  { title: '创建角色', key: 'createdByRole', width: 120 },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row) {
      return h(
        NTag,
        {
          round: true,
          bordered: false,
          type: row.status === 'active' ? 'success' : 'default',
        },
        { default: () => row.status },
      )
    },
  },
]

const agentCustomerColumns: DataTableColumns<AgentOperationsCustomer> = [
  { title: '应用', key: 'applicationCode', width: 150 },
  {
    title: '客户',
    key: 'customerDisplayName',
    minWidth: 190,
    render(row) {
      return `${row.customerDisplayName} (${row.customerUsername})`
    },
  },
  { title: '手机号', key: 'customerPhone', width: 140, render(row) { return row.customerPhone ?? '-' } },
  { title: 'Credits User', key: 'customerCreditsUserId', width: 130 },
  { title: '关系', key: 'relationType', width: 100 },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row) {
      return h(
        NTag,
        {
          round: true,
          bordered: false,
          type: row.status === 'active' ? 'success' : 'default',
        },
        { default: () => row.status },
      )
    },
  },
]

const agentLeadColumns: DataTableColumns<AgentOperationsLead> = [
  { title: '应用', key: 'applicationCode', width: 150 },
  { title: '线索客户', key: 'customerName', minWidth: 180 },
  { title: '手机号', key: 'phone', width: 140, render(row) { return row.phone ?? '-' } },
  { title: '来源', key: 'source', width: 130, render(row) { return row.source ?? '-' } },
  { title: '阶段', key: 'stage', width: 140 },
  {
    title: '预计积分',
    key: 'expectedPoints',
    width: 130,
    render(row) {
      return Number(row.expectedPoints ?? 0).toLocaleString('zh-CN')
    },
  },
]

const agentCommissionColumns: DataTableColumns<AgentOperationsCommissionPreview> = [
  { title: '周期', key: 'period', width: 110 },
  { title: '应用', key: 'applicationCode', width: 150 },
  {
    title: '客户',
    key: 'customerDisplayName',
    minWidth: 160,
    render(row) {
      return row.customerDisplayName ?? row.customerUsername ?? '-'
    },
  },
  {
    title: '消耗积分',
    key: 'consumedPoints',
    width: 130,
    render(row) {
      return Number(row.consumedPoints ?? 0).toLocaleString('zh-CN')
    },
  },
  {
    title: '返佣比例',
    key: 'commissionRate',
    width: 110,
    render(row) {
      return `${(Number(row.commissionRate ?? 0) * 100).toFixed(1)}%`
    },
  },
  {
    title: '预计返佣',
    key: 'commissionPoints',
    width: 130,
    render(row) {
      return Number(row.commissionPoints ?? 0).toLocaleString('zh-CN')
    },
  },
  { title: '状态', key: 'status', width: 100 },
]

const agentSettlementColumns: DataTableColumns<AgentOperationsSettlementBill> = [
  { title: '周期', key: 'period', width: 110 },
  {
    title: '返佣积分',
    key: 'totalCommissionPoints',
    width: 140,
    render(row) {
      return Number(row.totalCommissionPoints ?? 0).toLocaleString('zh-CN')
    },
  },
  { title: '状态', key: 'status', width: 120 },
  { title: '确认时间', key: 'confirmedAt', minWidth: 180, render(row) { return row.confirmedAt ?? '-' } },
]

const agentMaterialColumns: DataTableColumns<AgentOperationsMaterial> = [
  { title: '标题', key: 'title', minWidth: 220 },
  { title: '类别', key: 'category', width: 120 },
  { title: '应用', key: 'applicationCode', width: 150, render(row) { return row.applicationCode ?? '全部应用' } },
  { title: '地址', key: 'url', minWidth: 260, ellipsis: { tooltip: true } },
]

const agentTicketColumns: DataTableColumns<AgentOperationsTicket> = [
  { title: '主题', key: 'subject', minWidth: 220 },
  { title: '类别', key: 'category', width: 120 },
  { title: '优先级', key: 'priority', width: 100 },
  { title: '状态', key: 'status', width: 100 },
  { title: '最近消息', key: 'lastMessage', minWidth: 220, ellipsis: { tooltip: true }, render(row) { return row.lastMessage ?? '-' } },
]

const developerPlaceholder = [
  { label: '跨应用 CRUD 审批流程', status: '规划中' },
  { label: '应用密钥管理', status: '规划中' },
  { label: '功能上下架与计费策略', status: '规划中' },
]
</script>

<template>
  <main class="credits-admin-page" :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'">
    <section class="admin-shell">
      <header class="admin-hero">
        <div class="admin-hero-copy">
          <p class="admin-hero-kicker">Reusable Credits Platform Console</p>
          <h1>三角色积分平台控制台</h1>
          <p class="admin-hero-sub">
            当前路由保留 <code>/credits-admin</code> 作为兼容入口；控制台面向所有接入应用，usedCarPlatform 只是其中一个应用。
          </p>
        </div>
        <div class="admin-hero-actions">
          <NButton type="primary" :loading="isLoading" @click="refreshOverview">
            <template #icon>
              <Icon icon="mdi:refresh" />
            </template>
            刷新实时数据
          </NButton>
        </div>
      </header>

      <nav class="admin-tabs" aria-label="角色切换">
        <button
          v-for="tab in visibleRoleTabs"
          :key="tab.value"
          type="button"
          class="admin-tab"
          :class="{ active: activeRole === tab.value }"
          @click="activeRole = tab.value"
        >
          <Icon :icon="tab.icon" />
          <span class="admin-tab-label">{{ tab.label }}</span>
          <span class="admin-tab-desc">{{ tab.description }}</span>
        </button>
      </nav>

      <NSpin :show="isLoading">
        <p v-if="lastError" class="admin-error">{{ lastError }}</p>

        <section class="admin-summary" aria-label="平台概览">
          <article class="admin-summary-card">
            <p>当前筛选</p>
            <strong>{{ selectedApplicationLabel }}</strong>
            <span>{{ selectedApplicationCode === 'all' ? '跨应用平台视图' : `code: ${selectedApplicationCode}` }}</span>
          </article>
          <article class="admin-summary-card">
            <p>已注册应用</p>
            <strong>{{ applications.length }}</strong>
            <span>个应用</span>
          </article>
          <article class="admin-summary-card">
            <p>积分账户</p>
            <strong>{{ creditAccounts.length }}</strong>
            <span>当前身份可见账户</span>
          </article>
          <article class="admin-summary-card">
            <p>近期流水</p>
            <strong>{{ filteredRecentTransactions.length }}</strong>
            <span>条记录</span>
          </article>
        </section>

        <section class="admin-filter-band" aria-label="应用筛选">
          <button
            v-for="item in applicationFilterOptions"
            :key="item.code"
            type="button"
            class="admin-filter-chip"
            :class="{ active: selectedApplicationCode === item.code }"
            @click="selectedApplicationCode = item.code"
          >
            <span>{{ item.name }}</span>
            <small>{{ item.statusText }}</small>
          </button>
        </section>

        <section class="admin-section">
          <h2>应用接入目录</h2>
          <div class="admin-app-grid">
            <article
              v-for="item in applicationCatalog"
              :key="item.code"
              class="admin-app-card"
            >
              <div>
                <h3>{{ item.name }}</h3>
                <p>{{ item.code }}</p>
              </div>
              <NTag
                round
                :bordered="false"
                :type="item.statusText === '已注册' ? 'success' : 'info'"
              >
                {{ item.statusText }}
              </NTag>
              <span>{{ item.functions.join(' / ') }}</span>
            </article>
          </div>
        </section>

        <template v-if="activeRole === 'developer'">
          <section class="admin-section">
            <h2>跨应用功能计费配置</h2>
            <NDataTable
              v-if="filteredApplicationFunctions.length"
              :columns="functionColumns"
              :data="filteredApplicationFunctions"
              :bordered="false"
              :single-line="false"
              :pagination="false"
            />
            <NEmpty v-else description="暂无功能计费配置" />
          </section>

          <section class="admin-section">
            <h2>账号创建权限层级</h2>
            <p class="admin-section-note">
              开发者可创建 Admin、Agent 和 User；开发者开关控制公司管理员是否能创建 Agent/User，也可禁用代理商创建 User。
            </p>
            <div class="admin-toggle-grid">
              <article class="admin-toggle-card">
                <div>
                  <h3>开发者创建 Admin / Agent / User</h3>
                  <p>最高层级权限，始终开启。</p>
                </div>
                <NSwitch :value="true" disabled />
              </article>
              <article class="admin-toggle-card">
                <div>
                  <h3>允许公司管理员创建 Agent / User</h3>
                  <p>关闭后，公司管理员不能创建 Agent 或 User，也不能让 User 成为 Agent。</p>
                </div>
                <NSwitch v-model:value="accountCreationPolicyState.developerAllowsAdminCreateAgentsAndUsers" />
              </article>
              <article class="admin-toggle-card">
                <div>
                  <h3>禁用代理商创建 User</h3>
                  <p>开发者覆盖开关；公司管理员通常控制代理商是否可创建 User。</p>
                </div>
                <NSwitch
                  :value="!accountCreationPolicyState.developerAllowsAgentCreateUsers"
                  @update:value="accountCreationPolicyState.developerAllowsAgentCreateUsers = !$event"
                />
              </article>
            </div>
            <div class="admin-policy-grid">
              <article
                v-for="policy in accountCreationPolicyRows"
                :key="policy.role"
                class="admin-policy-card"
              >
                <div>
                  <h3>{{ policy.label }}</h3>
                  <p>{{ policy.scope }}</p>
                  <p>{{ policy.capabilities.join(' / ') }}</p>
                </div>
                <NTag
                  round
                  :bordered="false"
                  :type="policyTagType(policy.enabled, policy.controlledBy.length > 0)"
                >
                  {{ policy.enabled ? '可执行' : '已关闭' }} · {{ policy.controllerText }}
                </NTag>
              </article>
            </div>
          </section>

          <section class="admin-section">
            <h2>跨应用客户档案</h2>
            <NDataTable
              v-if="filteredCustomerProfiles.length"
              :columns="customerColumns"
              :data="filteredCustomerProfiles"
              :bordered="false"
              :single-line="false"
              :pagination="false"
            />
            <NEmpty v-else description="暂无客户档案" />
          </section>

          <section class="admin-section">
            <h2>开发者待办（规划中）</h2>
            <ul class="admin-placeholder-list">
              <li v-for="item in developerPlaceholder" :key="item.label">
                <span>{{ item.label }}</span>
                <NTag round :bordered="false" type="info">{{ item.status }}</NTag>
              </li>
            </ul>
          </section>
        </template>

        <template v-else-if="activeRole === 'admin'">
          <section class="admin-section">
            <h2>账号创建权限</h2>
            <p class="admin-section-note">
              公司管理员可创建 Agent 和 User；该权限由开发者开启或关闭。公司管理员还可以控制代理商创建 User，以及 User 是否能成为 Agent。
            </p>
            <div class="admin-toggle-grid">
              <article class="admin-toggle-card">
                <div>
                  <h3>公司管理员创建 Agent / User</h3>
                  <p>{{ effectiveAccountCreationPolicy.adminCanCreateUsers ? '开发者已开启' : '开发者已关闭' }}</p>
                </div>
                <NSwitch :value="effectiveAccountCreationPolicy.adminCanCreateUsers" disabled />
              </article>
              <article class="admin-toggle-card">
                <div>
                  <h3>允许代理商创建 User</h3>
                  <p>公司管理员主开关；若开发者禁用代理商权限，此开关不会生效。</p>
                </div>
                <NSwitch
                  v-model:value="accountCreationPolicyState.adminAllowsAgentCreateUsers"
                  :disabled="!accountCreationPolicyState.developerAllowsAgentCreateUsers"
                />
              </article>
              <article class="admin-toggle-card">
                <div>
                  <h3>允许 User 成为 Agent</h3>
                  <p>公司管理员开关；若开发者关闭公司管理员创建 Agent/User，此开关不会生效。</p>
                </div>
                <NSwitch
                  v-model:value="accountCreationPolicyState.adminAllowsUserBecomeAgent"
                  :disabled="!accountCreationPolicyState.developerAllowsAdminCreateAgentsAndUsers"
                />
              </article>
            </div>
          </section>

          <section class="admin-section">
            <h2>积分账户</h2>
            <NDataTable
              v-if="creditAccounts.length"
              :columns="accountColumns"
              :data="creditAccounts"
              :bordered="false"
              :single-line="false"
              :pagination="false"
            />
            <NEmpty v-else description="暂无积分账户" />
          </section>

          <section class="admin-section">
            <h2>充值产品</h2>
            <NDataTable
              v-if="rechargeProducts.length"
              :columns="productColumns"
              :data="rechargeProducts"
              :bordered="false"
              :single-line="false"
              :pagination="false"
            />
            <NEmpty v-else description="暂无充值产品" />
          </section>

          <section class="admin-section">
            <h2>近期积分流水</h2>
            <NDataTable
              v-if="filteredRecentTransactions.length"
              :columns="transactionColumns"
              :data="filteredRecentTransactions"
              :bordered="false"
              :single-line="false"
              :pagination="false"
            />
            <NEmpty v-else description="暂无积分流水" />
          </section>
        </template>

        <template v-else>
          <section class="admin-section">
            <h2>代理商运营视图</h2>
            <p class="admin-section-note">
              代理商可创建 User 取决于公司管理员开关；开发者可以禁用该能力。当前状态：{{ agentCreationGateText }}。
              当前代理：{{ agentOverview?.agent.displayName ?? '未加载' }}。
            </p>
            <div class="admin-agent-grid" v-if="agentOverview">
              <article class="admin-agent-card">
                <h3>自有客户</h3>
                <strong>{{ agentOverview.metrics.customerCount }}</strong>
                <p>来自 agent_customer_relations</p>
              </article>
              <article class="admin-agent-card">
                <h3>活跃线索</h3>
                <strong>{{ agentOverview.metrics.activeLeadCount }}</strong>
                <p>CRM 报备与跟进</p>
              </article>
              <article class="admin-agent-card">
                <h3>预计返佣</h3>
                <strong>{{ Number(agentOverview.metrics.previewCommissionPoints).toLocaleString('zh-CN') }}</strong>
                <p>预览中佣金积分</p>
              </article>
              <article class="admin-agent-card">
                <h3>待确认账单</h3>
                <strong>{{ agentOverview.metrics.draftSettlementCount }}</strong>
                <p>结算账单草稿</p>
              </article>
              <article class="admin-agent-card">
                <h3>开放工单</h3>
                <strong>{{ agentOverview.metrics.openTicketCount }}</strong>
                <p>支持处理中</p>
              </article>
            </div>
            <NEmpty v-else description="暂无代理商运营数据" />
          </section>

          <section class="admin-section">
            <h2>代理商客户</h2>
            <NDataTable
              v-if="filteredAgentCustomers.length"
              :columns="agentCustomerColumns"
              :data="filteredAgentCustomers"
              :bordered="false"
              :single-line="false"
              :pagination="false"
            />
            <NEmpty v-else description="暂无代理商客户" />
          </section>

          <section class="admin-section">
            <h2>线索 / 商机报备</h2>
            <NDataTable
              v-if="filteredAgentLeads.length"
              :columns="agentLeadColumns"
              :data="filteredAgentLeads"
              :bordered="false"
              :single-line="false"
              :pagination="false"
            />
            <NEmpty v-else description="暂无线索" />
          </section>

          <section class="admin-section">
            <h2>返佣预览</h2>
            <NDataTable
              v-if="filteredAgentCommissions.length"
              :columns="agentCommissionColumns"
              :data="filteredAgentCommissions"
              :bordered="false"
              :single-line="false"
              :pagination="false"
            />
            <NEmpty v-else description="暂无返佣预览" />
          </section>

          <section class="admin-section">
            <h2>结算账单</h2>
            <NDataTable
              v-if="agentSettlements.length"
              :columns="agentSettlementColumns"
              :data="agentSettlements"
              :bordered="false"
              :single-line="false"
              :pagination="false"
            />
            <NEmpty v-else description="暂无结算账单" />
          </section>

          <section class="admin-section">
            <h2>营销物料 / 培训资料</h2>
            <NDataTable
              v-if="filteredAgentMaterials.length"
              :columns="agentMaterialColumns"
              :data="filteredAgentMaterials"
              :bordered="false"
              :single-line="false"
              :pagination="false"
            />
            <NEmpty v-else description="暂无资料" />
          </section>

          <section class="admin-section">
            <h2>工单支持</h2>
            <NDataTable
              v-if="agentTickets.length"
              :columns="agentTicketColumns"
              :data="agentTickets"
              :bordered="false"
              :single-line="false"
              :pagination="false"
            />
            <NEmpty v-else description="暂无工单" />
          </section>
        </template>
      </NSpin>
    </section>
  </main>
</template>

<style scoped lang="scss">
.credits-admin-page {
  min-height: calc(100vh - var(--app-header-offset));
  padding: clamp(16px, 2vw, 30px);
  background: var(--app-bg);
  color: var(--app-text);
}

.admin-shell {
  display: flex;
  flex-direction: column;
  gap: clamp(16px, 1.6vw, 24px);
  width: 100%;
  max-width: 1500px;
  margin: 0 auto;
}

.admin-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 24px clamp(20px, 2vw, 32px);
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-surface);
}

.admin-hero-kicker {
  margin: 0 0 6px;
  color: var(--app-text-soft);
  font-size: 13px;
  font-weight: 700;
}

.admin-hero h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 900;
}

.admin-hero-sub {
  margin: 8px 0 0;
  max-width: 720px;
  color: var(--app-text-soft);
  font-size: 13px;
  line-height: 1.6;
}

.admin-hero-sub code {
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--app-surface-soft);
  font-size: 12px;
}

.admin-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.admin-tab {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  align-items: center;
  gap: 6px 12px;
  padding: 16px 18px;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-surface);
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.admin-tab .iconify {
  grid-row: span 2;
  font-size: 24px;
  color: var(--app-text-soft);
}

.admin-tab-label {
  font-size: 16px;
  font-weight: 900;
}

.admin-tab-desc {
  color: var(--app-text-soft);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.5;
}

.admin-tab.active {
  border-color: color-mix(in srgb, var(--color-accent-blue, #2f6bff) 64%, var(--app-border));
  background: color-mix(in srgb, var(--color-accent-blue, #2f6bff) 8%, var(--app-surface));
  box-shadow: 0 8px 22px color-mix(in srgb, var(--color-accent-blue, #2f6bff) 14%, transparent);
}

.admin-tab.active .iconify {
  color: var(--color-accent-blue, #2f6bff);
}

.admin-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.admin-summary-card {
  display: grid;
  gap: 4px;
  padding: 18px 20px;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-surface);
}

.admin-summary-card p {
  margin: 0;
  color: var(--app-text-soft);
  font-size: 13px;
  font-weight: 700;
}

.admin-summary-card strong {
  font-size: 28px;
  font-weight: 900;
}

.admin-summary-card span {
  color: var(--app-text-soft);
  font-size: 12px;
  font-weight: 600;
}

.admin-filter-band {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-surface);
}

.admin-filter-chip {
  display: grid;
  gap: 2px;
  min-width: 160px;
  padding: 10px 14px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface-soft);
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}

.admin-filter-chip span {
  font-size: 14px;
  font-weight: 900;
}

.admin-filter-chip small {
  color: var(--app-text-soft);
  font-size: 11px;
  font-weight: 700;
}

.admin-filter-chip.active {
  border-color: color-mix(in srgb, var(--color-accent-blue, #2f6bff) 64%, var(--app-border));
  background: color-mix(in srgb, var(--color-accent-blue, #2f6bff) 8%, var(--app-surface));
}

.admin-app-grid,
.admin-policy-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.admin-app-card,
.admin-policy-card {
  display: grid;
  gap: 10px;
  align-items: flex-start;
  padding: 16px 18px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-surface-soft);
}

.admin-app-card h3,
.admin-policy-card h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 900;
}

.admin-app-card p,
.admin-policy-card p,
.admin-app-card span {
  margin: 0;
  color: var(--app-text-soft);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.55;
}

.admin-toggle-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.admin-toggle-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 92px;
  padding: 16px 18px;
  border: 1px dashed var(--app-border);
  border-radius: 12px;
  background: var(--app-surface-soft);
}

.admin-toggle-card h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 900;
}

.admin-toggle-card p {
  margin: 6px 0 0;
  color: var(--app-text-soft);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.55;
}

.admin-section {
  padding: 20px clamp(18px, 1.8vw, 26px);
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-surface);
}

.admin-section + .admin-section {
  margin-top: 16px;
}

.admin-section h2 {
  margin: 0 0 14px;
  font-size: 17px;
  font-weight: 900;
}

.admin-section-note {
  margin: 0 0 14px;
  color: var(--app-text-soft);
  font-size: 13px;
  line-height: 1.6;
}

.admin-placeholder-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.admin-placeholder-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px dashed var(--app-border);
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
}

.admin-agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.admin-agent-card {
  display: grid;
  gap: 6px;
  padding: 16px 18px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-surface-soft);
}

.admin-agent-card h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 900;
}

.admin-agent-card strong {
  font-size: 26px;
  font-weight: 900;
}

.admin-agent-card p {
  margin: 0;
  color: var(--app-text-soft);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.55;
}

.admin-error {
  margin: 0 0 12px;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, #ef4444 32%, var(--app-border));
  border-radius: 10px;
  background: color-mix(in srgb, #ef4444 8%, var(--app-surface));
  color: #ef4444;
  font-size: 13px;
  font-weight: 700;
}

:deep(.admin-delta.is-up) {
  color: #18b77d;
  font-weight: 800;
}

:deep(.admin-delta.is-down) {
  color: #e77835;
  font-weight: 800;
}

@media (max-width: 1024px) {
  .admin-tabs,
  .admin-summary {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
