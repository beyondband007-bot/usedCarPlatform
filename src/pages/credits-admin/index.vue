<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watchEffect } from 'vue'
import { Icon } from '@iconify/vue'
import {
  NButton,
  NDataTable,
  NEmpty,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  NSpin,
  NSwitch,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import {
  adjustPlatformCredits,
  confirmAgentSettlement,
  createAgentLead,
  createAgentTicket,
  createPlatformUser,
  deletePlatformUser,
  disablePlatformAgent,
  getAgentCustomerLedger,
  getCommissionPolicy,
  getAgentOperationsOverview,
  getCreditsAdminOverview,
  getPlatformAdminPolicyOverrides,
  getPlatformAgentPolicyOverrides,
  getPlatformAgents,
  getPlatformDashboard,
  promotePlatformUserToAgent,
  updatePlatformAdminPolicyOverride,
  updatePlatformAgentPolicyOverride,
  updateApplicationFunctionDefaultPoints,
  type AgentCustomerLedger,
  type AgentCustomerLedgerTransaction,
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
  type CommissionPolicy,
  type PlatformUserPlanCode,
  type PlatformUserTargetRole,
  type PlatformAdminPolicyOverride,
  type PlatformAgentPolicyOverride,
  type PlatformAgentProfile,
  type PlatformDashboard,
  type RechargeProduct,
} from '@/api/visual-workbench'
import {
  defaultAccountCreationPolicyState,
  resolveAccountCreationPolicy,
  reusableCreditsApplicationCatalog,
  type BackOfficeRole,
} from '@/policies/accountProvisioning'
import DeveloperHomeDashboard from '@/components/business/credits-admin/DeveloperHomeDashboard.vue'
import { useAuthStore } from '@/stores/auth'

type RoleTab = BackOfficeRole
type DetailRecord = Record<string, unknown>

const authStore = useAuthStore()
const message = useMessage()

const overview = ref<CreditsAdminOverview | null>(null)
const agentOverview = ref<AgentOperationsOverview | null>(null)
const platformAgents = ref<PlatformAgentProfile[]>([])
const adminPolicyOverrides = ref<PlatformAdminPolicyOverride[]>([])
const agentPolicyOverrides = ref<PlatformAgentPolicyOverride[]>([])
const platformDashboard = ref<PlatformDashboard | null>(null)
const commissionPolicy = ref<CommissionPolicy | null>(null)
const isLoading = ref(false)
const lastError = ref<string | null>(null)
const activeRole = ref<RoleTab>('developer')
const selectedApplicationCode = ref('all')
const accountCreationPolicyState = reactive({ ...defaultAccountCreationPolicyState })
const isCreateAccountModalOpen = ref(false)
const isCreatingAccount = ref(false)
const isAdjustCreditsModalOpen = ref(false)
const isAdjustingCredits = ref(false)
const isDeleteAccountModalOpen = ref(false)
const isDeletingAccount = ref(false)
const isFunctionBillingOpen = ref(false)
const promotingUserId = ref<string | null>(null)
const disablingAgentUserId = ref<string | null>(null)
const isCreateLeadModalOpen = ref(false)
const isCreatingLead = ref(false)
const isCreateTicketModalOpen = ref(false)
const isCreatingTicket = ref(false)
const confirmingSettlementId = ref<string | null>(null)
const updatingAdminPolicyUserId = ref<string | null>(null)
const updatingAgentPolicyUserId = ref<string | null>(null)
const updatingFunctionKey = ref<string | null>(null)
const selectedCapabilityUser = ref<CreditsCustomerProfile | null>(null)
const selectedDetail = ref<{ title: string; row: DetailRecord } | null>(null)
const selectedAgentCustomer = ref<AgentOperationsCustomer | null>(null)
const agentCustomerLedger = ref<AgentCustomerLedger | null>(null)
const isAgentCustomerLedgerOpen = ref(false)
const isLoadingAgentCustomerLedger = ref(false)
const interactionFeedback = ref('')
const createAccountForm = reactive({
  targetRole: 'user' as PlatformUserTargetRole,
  username: '',
  password: '123456',
  displayName: '',
  phone: '',
  email: '',
  applicationCode: 'used-car-platform',
  planCode: 'basic' as PlatformUserPlanCode,
  initialPoints: 0 as number | null,
})
const adjustCreditsForm = reactive({
  points: 0 as number | null,
  reason: '',
})
const deleteAccountForm = reactive({
  reason: '',
})
const leadForm = reactive({
  applicationCode: 'used-car-platform',
  customerName: '',
  phone: '',
  source: 'agent_referral',
  stage: 'new',
  expectedPoints: 0 as number | null,
  note: '',
})
const ticketForm = reactive({
  subject: '',
  category: 'billing',
  priority: 'normal',
  message: '',
})
const functionPointDrafts = reactive<Record<string, number | null>>({})

const detailEntries = computed(() =>
  selectedDetail.value
    ? Object.entries(selectedDetail.value.row).map(([key, value]) => ({
      key,
      value: formatDetailValue(value),
    }))
    : [],
)

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
    description: '销售运营、代理商管理、全平台只读',
    icon: 'mdi:shield-account-outline',
  },
  {
    value: 'agent',
    label: '代理商',
    description: '创建 User，读取自建 User 流水余额',
    icon: 'mdi:handshake-outline',
  },
]

const visibleRoleTabs = computed(() => {
  const role = authStore.role
  if (role === 'developer' || role === 'admin' || role === 'agent') {
    return roleTabs.filter((tab) => tab.value === role)
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
    const [
      creditsResult,
      operationsResult,
      dashboardResult,
      agentsResult,
      adminPolicyResult,
      agentPolicyResult,
      commissionPolicyResult,
    ] =
      await Promise.allSettled([
        getCreditsAdminOverview(),
        getAgentOperationsOverview(),
        getPlatformDashboard(),
        authStore.role === 'developer' || authStore.role === 'admin'
          ? getPlatformAgents()
          : Promise.resolve({ items: [] }),
        authStore.role === 'developer' || authStore.role === 'admin'
          ? getPlatformAdminPolicyOverrides()
          : Promise.resolve({ items: [] }),
        authStore.role === 'developer' || authStore.role === 'admin' || authStore.role === 'agent'
          ? getPlatformAgentPolicyOverrides()
          : Promise.resolve({ items: [] }),
        getCommissionPolicy(),
      ])

    if (creditsResult.status === 'fulfilled') {
      overview.value = creditsResult.value
    }
    if (operationsResult.status === 'fulfilled') {
      agentOverview.value = operationsResult.value
    }
    if (dashboardResult.status === 'fulfilled') {
      platformDashboard.value = dashboardResult.value
    }
    if (agentsResult.status === 'fulfilled') {
      platformAgents.value = agentsResult.value.items
    }
    if (adminPolicyResult.status === 'fulfilled') {
      adminPolicyOverrides.value = adminPolicyResult.value.items
    }
    if (agentPolicyResult.status === 'fulfilled') {
      agentPolicyOverrides.value = agentPolicyResult.value.items
    }
    if (commissionPolicyResult.status === 'fulfilled') {
      commissionPolicy.value = commissionPolicyResult.value
    }

    const primaryError = [creditsResult, dashboardResult].find((item) => item.status === 'rejected')
    if (primaryError?.status === 'rejected') {
      const text = primaryError.reason instanceof Error
        ? primaryError.reason.message
        : '加载积分平台控制台概览失败'
      lastError.value = text
      message.error(text)
    } else {
      lastError.value = null
    }
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
const dashboardMetrics = computed(() => platformDashboard.value?.metrics ?? null)
const dashboardScopeLabel = computed(() => {
  if (!platformDashboard.value) return '后台权限范围'
  return platformDashboard.value.scope === 'own_agent_scope' ? '代理商自有范围' : '全局后台范围'
})
const dashboardGeneratedAtText = computed(() => {
  if (!platformDashboard.value?.generatedAt) return '尚未加载'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(platformDashboard.value.generatedAt))
})

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

const applicationSelectOptions = computed(() =>
  applicationCatalog.value.map((item) => ({
    label: `${item.name} (${item.code})`,
    value: item.code,
  })),
)

const planInitialPoints: Record<PlatformUserPlanCode, number> = {
  basic: 20_000,
  team: 100_000,
  flagship: 800_000,
}

const planOptions: Array<{ label: string; value: PlatformUserPlanCode }> = [
  { label: '企业基础档', value: 'basic' },
  { label: '企业团队档', value: 'team' },
  { label: '企业旗舰档', value: 'flagship' },
]

const leadStageOptions = [
  { label: 'New / 新线索', value: 'new' },
  { label: 'Demo Scheduled / 已约演示', value: 'demo_scheduled' },
  { label: 'Negotiating / 洽谈中', value: 'negotiating' },
  { label: 'Review / 待审核', value: 'review' },
]

const ticketCategoryOptions = [
  { label: 'Billing / 充值积分', value: 'billing' },
  { label: 'Account / 账号', value: 'account' },
  { label: 'Product / 产品使用', value: 'product' },
  { label: 'General / 其他', value: 'general' },
]

const ticketPriorityOptions = [
  { label: 'Normal / 普通', value: 'normal' },
  { label: 'High / 高', value: 'high' },
  { label: 'Urgent / 紧急', value: 'urgent' },
]

const createTargetOptions = computed(() => {
  if (activeRole.value === 'developer') {
    return [
      { label: 'Admin / 公司管理员', value: 'admin' },
      { label: 'Agent / 代理商', value: 'agent' },
      { label: 'User / 普通用户', value: 'user' },
    ]
  }

  if (activeRole.value === 'admin') {
    return [
      {
        label: 'User / 普通用户',
        value: 'user',
        disabled: !effectiveAccountCreationPolicy.value.adminCanCreateUsers,
      },
      {
        label: 'Agent / 代理商',
        value: 'agent',
        disabled: !effectiveAccountCreationPolicy.value.adminCanCreateAgents,
      },
    ]
  }

  return [
    {
      label: 'User / 普通用户',
      value: 'user',
      disabled: !effectiveAccountCreationPolicy.value.agentCanCreateUsers,
    },
  ]
})

const selectedApplicationLabel = computed(() =>
  applicationFilterOptions.value.find((item) => item.code === selectedApplicationCode.value)?.name ??
  '全部应用',
)

function matchesSelectedApplication(applicationCode?: string | null) {
  return selectedApplicationCode.value === 'all' || applicationCode === selectedApplicationCode.value
}

function formatDetailValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  if (Array.isArray(value)) return value.length ? value.join(' / ') : '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function openRowDetail(title: string, row: unknown) {
  selectedDetail.value = {
    title,
    row: { ...(row as DetailRecord) },
  }
}

function exportRows(filename: string, rows: unknown[]) {
  if (!rows.length) {
    interactionFeedback.value = '当前没有可导出的数据'
    message.warning('当前没有可导出的数据')
    return
  }

  const records = rows.map((row) => ({ ...(row as DetailRecord) }))
  const headers = Array.from(new Set(records.flatMap((row) => Object.keys(row))))
  const escapeCsv = (value: unknown) => {
    const text = formatDetailValue(value).replaceAll('"', '""')
    return `"${text}"`
  }
  const csv = [
    headers.map(escapeCsv).join(','),
    ...records.map((row) => headers.map((key) => escapeCsv(row[key])).join(',')),
  ].join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
  interactionFeedback.value = `已导出 ${records.length} 条记录`
  message.success(`已导出 ${records.length} 条记录`)
}

const selectedApplicationFunctions = computed(() => {
  if (selectedApplicationCode.value === 'all') return []
  return applicationFunctions.value.filter((item) => item.applicationCode === selectedApplicationCode.value)
})

const filteredRecentTransactions = computed(() =>
  recentTransactions.value.filter((item) => matchesSelectedApplication(item.applicationCode)),
)

const filteredCustomerProfiles = computed(() =>
  customerProfiles.value.filter((item) => matchesSelectedApplication(item.applicationCode)),
)

const filteredAgentProfiles = computed(() =>
  platformAgents.value.filter((item) =>
    selectedApplicationCode.value === 'all' || item.applications.includes(selectedApplicationCode.value),
  ),
)

const filteredRegularUserProfiles = computed(() =>
  filteredCustomerProfiles.value.filter((item) => matrixTargetRole(item.role) === 'user'),
)

const agentCustomerCountByUserId = computed(
  () => new Map(platformAgents.value.map((item) => [item.userId, item.customerCount])),
)

const adminPolicyByUserId = computed(
  () => new Map(adminPolicyOverrides.value.map((item) => [item.userId, item])),
)

const agentPolicyByUserId = computed(
  () => new Map(agentPolicyOverrides.value.map((item) => [item.userId, item])),
)

const currentAdminDeveloperGate = computed(() => {
  if (authStore.role !== 'admin') return true
  const currentUserId = authStore.userInfo?.id
  if (!currentUserId) return true
  return adminPolicyByUserId.value.get(currentUserId)?.developerAllowsCreateAgents ?? true
})

const currentAgentDeveloperGate = computed(() => {
  if (authStore.role !== 'agent') return true
  const currentUserId = authStore.userInfo?.id
  if (!currentUserId) return true
  return agentPolicyByUserId.value.get(currentUserId)?.developerAllowsCreateUsers ?? true
})

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

const effectiveAccountCreationPolicy = computed(() => {
  const state = {
    ...accountCreationPolicyState,
    developerAllowsAdminCreateAgentsAndUsers:
      accountCreationPolicyState.developerAllowsAdminCreateAgentsAndUsers &&
      currentAdminDeveloperGate.value,
    developerAllowsAdminCreateUsers:
      accountCreationPolicyState.developerAllowsAdminCreateUsers,
    developerAllowsAgentCreateUsers:
      accountCreationPolicyState.developerAllowsAgentCreateUsers &&
      currentAgentDeveloperGate.value,
  }
  return resolveAccountCreationPolicy(state)
})

const agentCreationGateText = computed(() => {
  if (!accountCreationPolicyState.developerAllowsAgentCreateUsers) {
    return '开发者已禁用代理商创建 User'
  }
  if (!accountCreationPolicyState.adminAllowsAgentCreateUsers) {
    return '公司管理员未允许代理商创建 User'
  }
  return '公司管理员已允许，开发者未禁用'
})

function defaultPlanForRole(role: PlatformUserTargetRole): PlatformUserPlanCode {
  if (role === 'admin') return 'flagship'
  if (role === 'agent') return 'team'
  return 'basic'
}

function syncPlanInitialPoints(planCode: PlatformUserPlanCode) {
  createAccountForm.initialPoints = planInitialPoints[planCode]
}

function handleCreateTargetRoleChange(value: string | number | null) {
  const role = value as PlatformUserTargetRole
  const nextPlan = defaultPlanForRole(role)
  createAccountForm.planCode = nextPlan
  syncPlanInitialPoints(nextPlan)
}

function handleCreatePlanChange(value: string | number | null) {
  syncPlanInitialPoints(value as PlatformUserPlanCode)
}

function targetRoleLabel(role: PlatformUserTargetRole) {
  if (role === 'admin') return 'Admin'
  if (role === 'agent') return 'Agent'
  return 'User'
}

function matrixTargetRole(role?: string | null): PlatformUserTargetRole | 'developer' | null {
  if (role === 'developer' || role === 'admin' || role === 'agent') return role
  if (role === 'enterprise' || role === 'user') return 'user'
  return null
}

function canMutateCustomer(row: CreditsCustomerProfile) {
  const targetRole = matrixTargetRole(row.role)
  if (!targetRole || targetRole === 'developer' || authStore.userInfo?.id === row.userId) {
    return false
  }

  if (activeRole.value === 'developer') {
    return targetRole === 'admin' || targetRole === 'agent' || targetRole === 'user'
  }

  if (activeRole.value === 'admin') {
    return targetRole === 'agent' || targetRole === 'user'
  }

  return false
}

function canAdjustCustomer(row: CreditsCustomerProfile) {
  return (
    activeRole.value === 'developer' &&
    canMutateCustomer(row) &&
    authStore.permissions.includes('credits:points:adjust')
  )
}

function canDeleteCustomer(row: CreditsCustomerProfile) {
  const targetRole = matrixTargetRole(row.role)
  if (activeRole.value === 'admin' && targetRole !== 'agent') return false
  return (
    canMutateCustomer(row) &&
    !!targetRole &&
    targetRole !== 'developer' &&
    authStore.permissions.includes(`account:delete:${targetRole}`)
  )
}

function canPromoteCustomer(row: CreditsCustomerProfile) {
  const targetRole = matrixTargetRole(row.role)
  if (targetRole !== 'user' || row.status !== 'active' || authStore.userInfo?.id === row.userId) {
    return false
  }

  if (activeRole.value === 'developer') return true
  return activeRole.value === 'admin' && effectiveAccountCreationPolicy.value.adminCanPromoteUserToAgent
}

function canDisableAgent(row: PlatformAgentProfile) {
  if (row.status !== 'active' || authStore.userInfo?.id === row.userId) return false
  if (!authStore.permissions.includes('account:delete:agent')) return false
  return activeRole.value === 'developer' || activeRole.value === 'admin'
}

function deleteActionText(row: CreditsCustomerProfile) {
  const targetRole = matrixTargetRole(row.role)
  if (activeRole.value === 'admin' && targetRole === 'agent') return '禁用代理商'
  return '删除'
}

function formatCreditsBalance(row: CreditsCustomerProfile) {
  const value = row.creditsAvailableBalance ?? row.creditsTotalBalance
  if (value === null || value === undefined || value === '') return '-'

  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return String(value)
  return numeric.toLocaleString('zh-CN', {
    minimumFractionDigits: numeric % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 4,
  })
}

function formatCurrencyAmount(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0)
  if (!Number.isFinite(numeric)) return '-'
  return `¥${numeric.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDateTime(value: string) {
  const time = new Date(value)
  if (Number.isNaN(time.getTime())) return '-'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${time.getFullYear()}-${pad(time.getMonth() + 1)}-${pad(time.getDate())} ${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`
}

function transactionTypeLabel(type: string) {
  const labels: Record<string, string> = {
    recharge: '充值',
    bonus: '赠送',
    settle: '消费',
    freeze: '冻结',
    refund: '退款',
    estimate: '预估',
    grant: '发放',
    adjustment: '调整',
    adjust: '调整',
    commission_grant: '返佣',
  }
  return labels[type] ?? type
}

function transactionTagType(type: string): 'success' | 'info' | 'warning' | 'error' | 'default' {
  if (type === 'recharge' || type === 'bonus' || type === 'refund' || type === 'grant') return 'success'
  if (type === 'settle') return 'error'
  if (type === 'freeze' || type === 'adjustment' || type === 'adjust') return 'warning'
  return 'default'
}

function formatSignedPoints(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0)
  if (!Number.isFinite(numeric)) return '-'
  const sign = numeric > 0 ? '+' : ''
  return `${sign}${numeric.toLocaleString('zh-CN')}`
}

function ledgerSourceText(row: AgentCustomerLedgerTransaction) {
  return row.functionName ?? row.functionCode ?? row.remark ?? row.bizType ?? row.txnType
}

function ledgerActorText(row: AgentCustomerLedgerTransaction) {
  const actorName = row.actorDisplayName || row.actorUsername || `Credits User ${row.userId}`
  return row.actorIdentityLabel ? `${actorName} · ${row.actorIdentityLabel}` : actorName
}

function ledgerModalTitle() {
  return agentCustomerLedger.value?.customer.accountScope === 'tenant'
    ? '(团队)积分流水'
    : '积分流水'
}

function formatAgentCustomerCount(row: CreditsCustomerProfile) {
  if (matrixTargetRole(row.role) !== 'agent') return 'N/A'
  return String(agentCustomerCountByUserId.value.get(row.userId) ?? 0)
}

function formatEnterpriseAccountRelation(row: CreditsCustomerProfile) {
  if (row.enterpriseAccountRole === 'mother') {
    return row.enterpriseTenantName ? `母账号 · ${row.enterpriseTenantName}` : '母账号'
  }
  if (row.enterpriseAccountRole === 'child') {
    const owner = row.enterpriseOwnerDisplayName || row.enterpriseOwnerUsername || row.enterpriseOwnerUserId
    return owner ? `子账号 · 母账号 ${owner}` : '子账号'
  }
  return '-'
}

function canCreateTargetRole(role: PlatformUserTargetRole) {
  if (activeRole.value === 'developer') {
    return true
  }

  if (activeRole.value === 'admin') {
    return role === 'agent'
      ? effectiveAccountCreationPolicy.value.adminCanCreateAgents
      : role === 'user' && effectiveAccountCreationPolicy.value.adminCanCreateUsers
  }

  return role === 'user' && effectiveAccountCreationPolicy.value.agentCanCreateUsers
}

function defaultApplicationCode() {
  if (selectedApplicationCode.value !== 'all') return selectedApplicationCode.value
  return applicationCatalog.value[0]?.code ?? 'used-car-platform'
}

function resetCreateAccountForm(role: PlatformUserTargetRole) {
  createAccountForm.targetRole = role
  createAccountForm.username = ''
  createAccountForm.password = '123456'
  createAccountForm.displayName = ''
  createAccountForm.phone = ''
  createAccountForm.email = ''
  createAccountForm.applicationCode = defaultApplicationCode()
  createAccountForm.planCode = defaultPlanForRole(role)
  syncPlanInitialPoints(createAccountForm.planCode)
}

function openCreateAccountModal(role: PlatformUserTargetRole) {
  if (!canCreateTargetRole(role)) {
    message.warning('当前账号创建权限已被上级开关关闭')
    return
  }

  resetCreateAccountForm(role)
  isCreateAccountModalOpen.value = true
}

async function handleAdminGateChange(
  adminUserId: string,
  gate: 'createUsers' | 'createAgents',
  enabled: boolean,
) {
  const previous = [...adminPolicyOverrides.value]
  adminPolicyOverrides.value = adminPolicyOverrides.value.map((item) =>
    item.userId === adminUserId
      ? {
          ...item,
          ...(gate === 'createUsers'
            ? {
                developerAllowsCreateUsers: enabled,
                effectiveCanCreateUsers:
                  accountCreationPolicyState.developerAllowsAdminCreateUsers && enabled,
              }
            : {
                developerAllowsCreateAgents: enabled,
                effectiveCanCreateAgents:
                  accountCreationPolicyState.developerAllowsAdminCreateAgentsAndUsers && enabled,
              }),
        }
      : item,
  )
  updatingAdminPolicyUserId.value = adminUserId

  try {
    const result = await updatePlatformAdminPolicyOverride(adminUserId, {
      ...(gate === 'createUsers'
        ? { developerAllowsCreateUsers: enabled }
        : { developerAllowsCreateAgents: enabled }),
    })
    adminPolicyOverrides.value = result.items
    message.success(
      gate === 'createUsers'
        ? enabled
          ? '已允许该 Admin 创建 User'
          : '已关闭该 Admin 创建 User'
        : enabled
          ? '已允许该 Admin 创建 Agent'
          : '已关闭该 Admin 创建 Agent',
    )
  } catch (error) {
    adminPolicyOverrides.value = previous
    const text = error instanceof Error ? error.message : '更新公司管理员授权失败'
    message.error(text)
  } finally {
    updatingAdminPolicyUserId.value = null
  }
}

async function handleAgentCreateUserDisableChange(agentUserId: string, disabled: boolean) {
  const previous = [...agentPolicyOverrides.value]
  const enabled = !disabled
  agentPolicyOverrides.value = agentPolicyOverrides.value.map((item) =>
    item.userId === agentUserId
      ? {
          ...item,
          developerAllowsCreateUsers: enabled,
          developerDisabledCreateUsers: disabled,
          effectiveCanCreateUsers:
            accountCreationPolicyState.developerAllowsAgentCreateUsers &&
            accountCreationPolicyState.adminAllowsAgentCreateUsers &&
            enabled,
        }
      : item,
  )
  updatingAgentPolicyUserId.value = agentUserId

  try {
    const result = await updatePlatformAgentPolicyOverride(agentUserId, {
      developerAllowsCreateUsers: enabled,
    })
    agentPolicyOverrides.value = result.items
    message.success(disabled ? '已禁用该 Agent 创建 User' : '已允许该 Agent 创建 User')
  } catch (error) {
    agentPolicyOverrides.value = previous
    const text = error instanceof Error ? error.message : '更新代理商授权失败'
    message.error(text)
  } finally {
    updatingAgentPolicyUserId.value = null
  }
}

async function handleCreateAccount() {
  const username = createAccountForm.username.trim().toLowerCase()
  const password = createAccountForm.password

  if (!/^[a-z0-9_]{3,32}$/.test(username)) {
    message.error('用户名需为 3-32 位小写字母、数字或下划线')
    return
  }

  if (password.length < 6) {
    message.error('初始密码至少 6 位')
    return
  }

  if (!canCreateTargetRole(createAccountForm.targetRole)) {
    message.error('当前账号创建权限已被上级开关关闭')
    return
  }

  isCreatingAccount.value = true
  try {
    const idempotencyKey = [
      'reusable-credits-console',
      authStore.userInfo?.id ?? 'operator',
      createAccountForm.targetRole,
      Date.now(),
      Math.random().toString(36).slice(2, 10),
    ].join(':')

    const result = await createPlatformUser({
      idempotencyKey,
      targetRole: createAccountForm.targetRole,
      username,
      password,
      displayName: createAccountForm.displayName.trim() || username,
      phone: createAccountForm.phone.trim() || undefined,
      email: createAccountForm.email.trim() || undefined,
      applicationCode: createAccountForm.applicationCode,
      accountScope: 'personal',
      planCode: createAccountForm.planCode,
      initialPoints: Number(createAccountForm.initialPoints ?? 0),
    })

    message.success(
      result.childAccounts?.length
        ? `已创建 ${targetRoleLabel(createAccountForm.targetRole)}：${result.user.username}，并创建 ${result.childAccounts.length} 个子账号`
        : `已创建 ${targetRoleLabel(createAccountForm.targetRole)}：${result.user.username}`,
    )
    isCreateAccountModalOpen.value = false
    await refreshOverview()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '创建账号失败')
  } finally {
    isCreatingAccount.value = false
  }
}

async function handlePromoteUserToAgent(row: CreditsCustomerProfile) {
  if (!canPromoteCustomer(row)) {
    message.warning('当前 User 升级为 Agent 的权限已关闭')
    return
  }

  promotingUserId.value = row.userId
  try {
    const result = await promotePlatformUserToAgent(row.userId, {
      applicationCode: row.applicationCode,
    })
    message.success(`已将 ${result.user.displayName} 升级为代理`)
    await refreshOverview()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '升级为代理失败')
  } finally {
    promotingUserId.value = null
  }
}

async function handleDisableAgent(row: PlatformAgentProfile) {
  if (!canDisableAgent(row)) {
    message.warning('当前角色不能禁用该代理商')
    return
  }

  disablingAgentUserId.value = row.userId
  try {
    const result = await disablePlatformAgent(row.userId, {
      reason: 'back-office disabled Agent role',
    })
    message.success(`已禁用代理商：${result.user.displayName}，账号已回到用户清单`)
    await refreshOverview()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '禁用代理商失败')
  } finally {
    disablingAgentUserId.value = null
  }
}

function resetLeadForm() {
  leadForm.applicationCode = defaultApplicationCode()
  leadForm.customerName = ''
  leadForm.phone = ''
  leadForm.source = 'agent_referral'
  leadForm.stage = 'new'
  leadForm.expectedPoints = 0
  leadForm.note = ''
}

function openCreateLeadModal() {
  resetLeadForm()
  isCreateLeadModalOpen.value = true
}

async function handleCreateLead() {
  const customerName = leadForm.customerName.trim()
  if (!customerName) {
    message.error('请输入客户名称')
    return
  }

  isCreatingLead.value = true
  try {
    await createAgentLead({
      applicationCode: leadForm.applicationCode,
      customerName,
      phone: leadForm.phone.trim() || undefined,
      source: leadForm.source.trim() || undefined,
      stage: leadForm.stage,
      expectedPoints: Number(leadForm.expectedPoints ?? 0),
      note: leadForm.note.trim() || undefined,
    })
    message.success(`已报备线索：${customerName}`)
    isCreateLeadModalOpen.value = false
    await refreshOverview()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '线索报备失败')
  } finally {
    isCreatingLead.value = false
  }
}

function resetTicketForm() {
  ticketForm.subject = ''
  ticketForm.category = 'billing'
  ticketForm.priority = 'normal'
  ticketForm.message = ''
}

function openCreateTicketModal() {
  resetTicketForm()
  isCreateTicketModalOpen.value = true
}

async function handleCreateTicket() {
  const subject = ticketForm.subject.trim()
  if (!subject) {
    message.error('请输入工单主题')
    return
  }

  isCreatingTicket.value = true
  try {
    await createAgentTicket({
      subject,
      category: ticketForm.category,
      priority: ticketForm.priority,
      message: ticketForm.message.trim() || undefined,
    })
    message.success(`已创建工单：${subject}`)
    isCreateTicketModalOpen.value = false
    await refreshOverview()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '工单创建失败')
  } finally {
    isCreatingTicket.value = false
  }
}

async function handleConfirmSettlement(row: AgentOperationsSettlementBill) {
  if (row.status !== 'draft') {
    message.warning('只有草稿结算单可以确认')
    return
  }

  confirmingSettlementId.value = row.id
  try {
    await confirmAgentSettlement(row.id)
    message.success(`已确认结算单：${row.period}`)
    await refreshOverview()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '结算确认失败')
  } finally {
    confirmingSettlementId.value = null
  }
}

function openAdjustCreditsModal(row: CreditsCustomerProfile) {
  if (!canAdjustCustomer(row)) {
    message.warning('当前角色不能为该账号增减积分')
    return
  }
  selectedCapabilityUser.value = row
  adjustCreditsForm.points = 0
  adjustCreditsForm.reason = ''
  isAdjustCreditsModalOpen.value = true
}

async function handleAdjustCredits() {
  const target = selectedCapabilityUser.value
  const points = Number(adjustCreditsForm.points ?? 0)
  if (!target) return
  if (!Number.isFinite(points) || points === 0) {
    message.error('积分变动必须是非 0 数字')
    return
  }
  if (!canAdjustCustomer(target)) {
    message.error('当前角色不能为该账号增减积分')
    return
  }

  isAdjustingCredits.value = true
  try {
    const result = await adjustPlatformCredits({
      idempotencyKey: [
        'reusable-credits-console-adjust',
        authStore.userInfo?.id ?? 'operator',
        target.userId,
        Date.now(),
        Math.random().toString(36).slice(2, 10),
      ].join(':'),
      targetUserId: target.userId,
      points,
      reason: adjustCreditsForm.reason.trim() || undefined,
    })

    message.success(
      `已调整 ${target.username}：${points > 0 ? '+' : ''}${points.toLocaleString('zh-CN')}，余额 ${result.adjustment.balanceAfter}`,
    )
    isAdjustCreditsModalOpen.value = false
    selectedCapabilityUser.value = null
    await refreshOverview()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '积分调整失败')
  } finally {
    isAdjustingCredits.value = false
  }
}

function openDeleteAccountModal(row: CreditsCustomerProfile) {
  if (!canDeleteCustomer(row)) {
    message.warning('当前角色不能删除该账号')
    return
  }
  selectedCapabilityUser.value = row
  deleteAccountForm.reason = ''
  isDeleteAccountModalOpen.value = true
}

async function handleDeleteAccount() {
  const target = selectedCapabilityUser.value
  if (!target) return
  if (!canDeleteCustomer(target)) {
    message.error('当前角色不能删除该账号')
    return
  }

  isDeletingAccount.value = true
  try {
    await deletePlatformUser(target.userId, {
      reason: deleteAccountForm.reason.trim() || undefined,
    })
    message.success(`${deleteActionText(target)}成功：${target.username}`)
    isDeleteAccountModalOpen.value = false
    selectedCapabilityUser.value = null
    await refreshOverview()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '删除账号失败')
  } finally {
    isDeletingAccount.value = false
  }
}

function renderDetailButton(title: string, row: unknown) {
  return h(
    NButton,
    {
      size: 'small',
      secondary: true,
      onClick: () => openRowDetail(title, row),
    },
    {
      icon: () => h(Icon, { icon: 'mdi:eye-outline' }),
      default: () => '查看详情',
    },
  )
}

async function openAgentCustomerLedger(row: AgentOperationsCustomer) {
  selectedAgentCustomer.value = row
  agentCustomerLedger.value = null
  isAgentCustomerLedgerOpen.value = true
  isLoadingAgentCustomerLedger.value = true
  try {
    agentCustomerLedger.value = await getAgentCustomerLedger(row.id)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载积分流水失败')
  } finally {
    isLoadingAgentCustomerLedger.value = false
  }
}

function functionDraftKey(row: CreditsAdminOverview['applicationFunctions'][number]) {
  return `${row.applicationCode ?? 'unknown'}:${row.code}`
}

function functionDraftValue(row: CreditsAdminOverview['applicationFunctions'][number]) {
  const key = functionDraftKey(row)
  return functionPointDrafts[key] ?? Number(row.defaultPoints ?? 0)
}

function canEditFunctionDefaultPoints(row: CreditsAdminOverview['applicationFunctions'][number]) {
  return (
    activeRole.value === 'developer' &&
    selectedApplicationCode.value !== 'all' &&
    !!row.applicationCode &&
    row.status !== 'planned'
  )
}

async function handleSaveFunctionDefaultPoints(
  row: CreditsAdminOverview['applicationFunctions'][number],
) {
  if (!canEditFunctionDefaultPoints(row) || !row.applicationCode) {
    message.warning('请选择已接入应用后再编辑默认积分')
    return
  }

  const value = Number(functionDraftValue(row))
  if (!Number.isFinite(value) || value < 0) {
    message.error('默认积分必须为非负数字')
    return
  }

  const key = functionDraftKey(row)
  updatingFunctionKey.value = key
  try {
    await updateApplicationFunctionDefaultPoints(row.applicationCode, row.code, value)
    message.success(`已更新 ${row.name} 默认积分`)
    await refreshOverview()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '更新默认积分失败')
  } finally {
    updatingFunctionKey.value = null
  }
}

const functionColumns: DataTableColumns<CreditsAdminOverview['applicationFunctions'][number]> = [
  { title: '功能编码', key: 'code', width: 220 },
  { title: '功能名称', key: 'name', width: 200 },
  { title: '计费模式', key: 'chargeMode', width: 140, render(row) { return row.chargeMode ?? '-' } },
  {
    title: '默认积分',
    key: 'defaultPoints',
    width: 230,
    render(row) {
      return h(
        'div',
        { class: 'admin-function-points-cell' },
        [
          h(NInputNumber, {
            value: functionDraftValue(row),
            min: 0,
            precision: 4,
            size: 'small',
            disabled: !canEditFunctionDefaultPoints(row),
            'onUpdate:value': (value: number | null) => {
              functionPointDrafts[functionDraftKey(row)] = value
            },
          }),
          h(
            NButton,
            {
              size: 'small',
              type: 'primary',
              secondary: true,
              disabled: !canEditFunctionDefaultPoints(row),
              loading: updatingFunctionKey.value === functionDraftKey(row),
              onClick: () => handleSaveFunctionDefaultPoints(row),
            },
            { default: () => '保存' },
          ),
        ],
      )
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
        adjustment: 'warning',
        adjust: 'warning',
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
  {
    title: '账号关系',
    key: 'enterpriseAccountRole',
    width: 190,
    render(row) {
      return formatEnterpriseAccountRelation(row)
    },
  },
  { title: '角色', key: 'role', width: 110 },
  { title: '手机号', key: 'phone', width: 140, render(row) { return row.phone ?? '-' } },
  {
    title: '积分余额',
    key: 'creditsAvailableBalance',
    width: 130,
    render(row) {
      return formatCreditsBalance(row)
    },
  },
  {
    title: '名下客户数',
    key: 'agentCustomerCount',
    width: 130,
    render(row) {
      return formatAgentCustomerCount(row)
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
  {
    title: '能力操作',
    key: 'actions',
    width: 210,
    render(row) {
      const canAdjust = canAdjustCustomer(row)
      const canDelete = canDeleteCustomer(row)
      const canPromote = canPromoteCustomer(row)
      if (!canAdjust && !canDelete && !canPromote) return '-'

      const actions = []
      if (matrixTargetRole(row.role) === 'user') {
        actions.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'success',
              secondary: true,
              disabled: !canPromote,
              loading: promotingUserId.value === row.userId,
              onClick: () => handlePromoteUserToAgent(row),
            },
            {
              icon: () => h(Icon, { icon: 'mdi:account-arrow-up-outline' }),
              default: () => '升级为代理',
            },
          ),
        )
      }
      if (canAdjust) {
        actions.push(
          h(
            NButton,
            {
              size: 'small',
              secondary: true,
              onClick: () => openAdjustCreditsModal(row),
            },
            {
              icon: () => h(Icon, { icon: 'mdi:plus-minus-variant' }),
              default: () => '增减积分',
            },
          ),
        )
      }
      if (canDelete) {
        actions.push(
          h(
            NButton,
            {
              size: 'small',
              type: 'error',
              secondary: true,
              onClick: () => openDeleteAccountModal(row),
            },
            {
              icon: () => h(Icon, { icon: 'mdi:trash-can-outline' }),
              default: () => '删除',
            },
          ),
        )
      }

      return h(
        'div',
        { class: 'admin-table-actions' },
        actions,
      )
    },
  },
]

const adminAuthorizationColumns: DataTableColumns<PlatformAdminPolicyOverride> = [
  {
    title: '公司管理员',
    key: 'displayName',
    minWidth: 220,
    render(row) {
      return `${row.displayName} (${row.username})`
    },
  },
  { title: '手机号', key: 'phone', width: 140, render(row) { return row.phone ?? '-' } },
  {
    title: '允许创建 User',
    key: 'developerAllowsCreateUsers',
    minWidth: 220,
    render(row) {
      const rowEnabled = row.developerAllowsCreateUsers
      const effectiveEnabled =
        accountCreationPolicyState.developerAllowsAdminCreateUsers && rowEnabled

      return h(
        'div',
        { class: 'admin-auth-switch-cell' },
        [
          h(NSwitch, {
            value: rowEnabled,
            loading: updatingAdminPolicyUserId.value === row.userId,
            disabled: !accountCreationPolicyState.developerAllowsAdminCreateUsers,
            'onUpdate:value': (value: boolean) =>
              handleAdminGateChange(row.userId, 'createUsers', value),
          }),
          h(
            'span',
            { class: effectiveEnabled ? 'is-enabled' : 'is-disabled' },
            effectiveEnabled ? '已允许' : '已关闭',
          ),
        ],
      )
    },
  },
  {
    title: '允许创建 Agent / User 成为 Agent',
    key: 'developerAllowsCreateAgents',
    minWidth: 260,
    render(row) {
      const rowEnabled = row.developerAllowsCreateAgents
      const effectiveEnabled =
        accountCreationPolicyState.developerAllowsAdminCreateAgentsAndUsers && rowEnabled

      return h(
        'div',
        { class: 'admin-auth-switch-cell' },
        [
          h(NSwitch, {
            value: rowEnabled,
            loading: updatingAdminPolicyUserId.value === row.userId,
            disabled: !accountCreationPolicyState.developerAllowsAdminCreateAgentsAndUsers,
            'onUpdate:value': (value: boolean) =>
              handleAdminGateChange(row.userId, 'createAgents', value),
          }),
          h(
            'span',
            { class: effectiveEnabled ? 'is-enabled' : 'is-disabled' },
            effectiveEnabled ? '已允许' : '已关闭',
          ),
        ],
      )
    },
  },
]

const agentAuthorizationColumns: DataTableColumns<PlatformAgentPolicyOverride> = [
  {
    title: '代理商',
    key: 'displayName',
    minWidth: 220,
    render(row) {
      return `${row.displayName} (${row.username})`
    },
  },
  { title: '手机号', key: 'phone', width: 140, render(row) { return row.phone ?? '-' } },
  {
    title: '创建 User',
    key: 'developerDisabledCreateUsers',
    minWidth: 240,
    render(row) {
      const effectiveEnabled =
        accountCreationPolicyState.developerAllowsAgentCreateUsers &&
        accountCreationPolicyState.adminAllowsAgentCreateUsers &&
        !row.developerDisabledCreateUsers

      return h(
        'div',
        { class: 'admin-auth-switch-cell' },
        [
          h(NSwitch, {
            value: !row.developerDisabledCreateUsers,
            loading: updatingAgentPolicyUserId.value === row.userId,
            disabled: !accountCreationPolicyState.developerAllowsAgentCreateUsers,
            'onUpdate:value': (value: boolean) =>
              handleAgentCreateUserDisableChange(row.userId, !value),
          }),
          h(
            'span',
            { class: effectiveEnabled ? 'is-enabled' : 'is-disabled' },
            effectiveEnabled ? '可创建 User' : '已禁用',
          ),
        ],
      )
    },
  },
]

const agentManagementColumns: DataTableColumns<PlatformAgentProfile> = [
  {
    title: '代理商',
    key: 'displayName',
    minWidth: 190,
    render(row) {
      return `${row.displayName} (${row.username})`
    },
  },
  {
    title: '接入应用',
    key: 'applications',
    minWidth: 170,
    render(row) {
      return row.applications.join(' / ') || '-'
    },
  },
  { title: '手机号', key: 'phone', width: 140, render(row) { return row.phone ?? '-' } },
  { title: 'Credits User', key: 'creditsUserId', width: 130 },
  { title: '客户数', key: 'customerCount', width: 90 },
  { title: '线索数', key: 'leadCount', width: 90 },
  { title: '开放工单', key: 'openTicketCount', width: 100 },
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
  {
    title: '管理动作',
    key: 'actions',
    width: 150,
    render(row) {
      const isBusy = disablingAgentUserId.value === row.userId
      return h(
        NButton,
        {
          size: 'small',
          type: 'error',
          secondary: true,
          loading: isBusy,
          disabled: isBusy || !canDisableAgent(row),
          onClick: () => handleDisableAgent(row),
        },
        {
          icon: () => h(Icon, { icon: 'mdi:account-cancel-outline' }),
          default: () => '禁用代理商',
        },
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
  {
    title: '累计充值金额',
    key: 'totalTopUpAmount',
    width: 140,
    render(row) {
      return formatCurrencyAmount(row.totalTopUpAmount)
    },
  },
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
  {
    title: '操作',
    key: 'actions',
    width: 130,
    render(row) {
      return h(
        NButton,
        {
          size: 'small',
          secondary: true,
          onClick: () => void openAgentCustomerLedger(row),
        },
        {
          icon: () => h(Icon, { icon: 'mdi:eye-outline' }),
          default: () => '查看详情',
        },
      )
    },
  },
]

const agentCustomerLedgerColumns: DataTableColumns<AgentCustomerLedgerTransaction> = [
  {
    title: '时间',
    key: 'createdAt',
    width: 190,
    render(row) {
      return formatDateTime(row.createdAt)
    },
  },
  {
    title: '积分类型',
    key: 'txnType',
    width: 130,
    render(row) {
      return h(
        NTag,
        {
          round: true,
          bordered: false,
          type: transactionTagType(row.txnType),
        },
        { default: () => transactionTypeLabel(row.txnType) },
      )
    },
  },
  {
    title: '积分变动',
    key: 'points',
    width: 130,
    render(row) {
      return h(
        'span',
        { class: row.points >= 0 ? 'admin-delta is-up' : 'admin-delta is-down' },
        formatSignedPoints(row.points),
      )
    },
  },
  {
    title: '状态',
    key: 'status',
    width: 120,
    render() {
      return h('span', { class: 'agent-ledger-status' }, [
        h('span', { class: 'agent-ledger-status-dot' }),
        '已生效',
      ])
    },
  },
  {
    title: '来源/用途',
    key: 'source',
    minWidth: 170,
    render(row) {
      return ledgerSourceText(row)
    },
  },
  {
    title: '操作人',
    key: 'actorIdentityLabel',
    minWidth: 180,
    render(row) {
      return h(
        NTag,
        {
          round: true,
          bordered: false,
          type: row.actorIdentityLabel === '主账号' ? 'warning' : 'default',
        },
        { default: () => ledgerActorText(row) },
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
  {
    title: '操作',
    key: 'actions',
    width: 130,
    render(row) {
      return renderDetailButton('线索详情', row)
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
  {
    title: '操作',
    key: 'actions',
    width: 130,
    render(row) {
      return renderDetailButton('返佣详情', row)
    },
  },
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
  {
    title: '操作',
    key: 'actions',
    width: 240,
    render(row) {
      return h(
        'div',
        { class: 'admin-table-actions' },
        [
          renderDetailButton('结算账单详情', row),
          h(
            NButton,
            {
              size: 'small',
              secondary: true,
              type: 'primary',
              disabled: row.status !== 'draft',
              loading: confirmingSettlementId.value === row.id,
              onClick: () => handleConfirmSettlement(row),
            },
            {
              icon: () => h(Icon, { icon: 'mdi:check-decagram-outline' }),
              default: () => row.status === 'draft' ? '确认结算' : '已处理',
            },
          ),
        ],
      )
    },
  },
]

const agentMaterialColumns: DataTableColumns<AgentOperationsMaterial> = [
  { title: '标题', key: 'title', minWidth: 220 },
  { title: '类别', key: 'category', width: 120 },
  { title: '应用', key: 'applicationCode', width: 150, render(row) { return row.applicationCode ?? '全部应用' } },
  { title: '地址', key: 'url', minWidth: 260, ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    width: 130,
    render(row) {
      return renderDetailButton('资料详情', row)
    },
  },
]

const agentTicketColumns: DataTableColumns<AgentOperationsTicket> = [
  { title: '主题', key: 'subject', minWidth: 220 },
  { title: '类别', key: 'category', width: 120 },
  { title: '优先级', key: 'priority', width: 100 },
  { title: '状态', key: 'status', width: 100 },
  { title: '最近消息', key: 'lastMessage', minWidth: 220, ellipsis: { tooltip: true }, render(row) { return row.lastMessage ?? '-' } },
  {
    title: '操作',
    key: 'actions',
    width: 130,
    render(row) {
      return renderDetailButton('工单详情', row)
    },
  },
]

</script>

<template>
  <main class="credits-admin-page theme-light">
    <section class="admin-shell">
      <header v-if="activeRole !== 'developer'" class="admin-hero">
        <div class="admin-hero-copy">
          <p class="admin-hero-kicker">Reusable Credits Platform Console</p>
          <h1>三角色积分平台控制台</h1>
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

      <nav v-if="visibleRoleTabs.length > 1" class="admin-tabs" aria-label="角色切换">
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
        <p v-if="interactionFeedback" class="admin-feedback">{{ interactionFeedback }}</p>

        <template v-if="activeRole !== 'developer'">
          <section class="admin-summary" aria-label="平台概览">
            <article class="admin-summary-card">
              <p>当前筛选</p>
              <strong>{{ selectedApplicationLabel }}</strong>
              <span>{{ selectedApplicationCode === 'all' ? '跨应用平台视图' : `code: ${selectedApplicationCode}` }}</span>
            </article>
            <article class="admin-summary-card">
              <p>后台范围</p>
              <strong>{{ dashboardScopeLabel }}</strong>
              <span>更新于 {{ dashboardGeneratedAtText }}</span>
            </article>
            <article class="admin-summary-card">
              <p>关联客户</p>
              <strong>{{ dashboardMetrics?.linkedCustomerCount ?? filteredCustomerProfiles.length }}</strong>
              <span>应用客户链接</span>
            </article>
            <article class="admin-summary-card">
              <p>开放工单</p>
              <strong>{{ dashboardMetrics?.openTicketCount ?? agentOverview?.metrics.openTicketCount ?? 0 }}</strong>
              <span>待处理支持事项</span>
            </article>
          </section>

          <section v-if="platformDashboard" class="admin-dashboard-band" aria-label="MVP 运营总览">
            <article class="admin-dashboard-metric">
              <p>接入应用</p>
              <strong>{{ dashboardMetrics?.applicationCount ?? 0 }}</strong>
              <span>{{ platformDashboard.metrics.applications.join(' / ') || '暂无应用' }}</span>
            </article>
            <article class="admin-dashboard-metric">
              <p>活跃代理商</p>
              <strong>{{ dashboardMetrics?.activeAgentCount ?? 0 }}</strong>
              <span>Developer/Admin 为全局，Agent 为自身</span>
            </article>
            <article class="admin-dashboard-metric">
              <p>活跃线索</p>
              <strong>{{ dashboardMetrics?.activeLeadCount ?? 0 }}</strong>
              <span>CRM 报备与跟进</span>
            </article>
            <article class="admin-dashboard-metric">
              <p>待确认结算</p>
              <strong>{{ dashboardMetrics?.draftSettlementCount ?? 0 }}</strong>
              <span>settlement workflow</span>
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
        </template>

        <DeveloperHomeDashboard
          v-if="activeRole === 'developer'"
          :is-loading="isLoading"
          :overview="overview"
          :platform-dashboard="platformDashboard"
          :selected-application-code="selectedApplicationCode"
          :application-catalog="applicationCatalog"
          :filtered-customer-profiles="filteredCustomerProfiles"
          :customer-columns="customerColumns"
          :admin-policy-overrides="adminPolicyOverrides"
          :agent-policy-overrides="agentPolicyOverrides"
          :filtered-agent-profiles="filteredAgentProfiles"
          :account-creation-policy-state="accountCreationPolicyState"
          :is-function-billing-open="isFunctionBillingOpen"
          :selected-application-functions="selectedApplicationFunctions"
          :function-columns="functionColumns"
          :admin-authorization-columns="adminAuthorizationColumns"
          :agent-authorization-columns="agentAuthorizationColumns"
          :agent-management-columns="agentManagementColumns"
          :selected-application-label="selectedApplicationLabel"
          @refresh="refreshOverview"
          @create-account="openCreateAccountModal"
          @update:selected-application-code="selectedApplicationCode = $event"
          @update:is-function-billing-open="isFunctionBillingOpen = $event"
        />

        <template v-else-if="activeRole === 'admin'">
          <section class="admin-section">
            <h2>账号创建权限</h2>
            <p class="admin-section-note">
              公司管理员可创建 User 和 Agent；也可以将普通 User 升级为 Agent。代理商创建 User 仍由公司管理员开关控制，开发者可覆盖禁用。
            </p>
            <div class="admin-action-row" aria-label="公司管理员创建账号">
              <NButton
                type="primary"
                :disabled="!effectiveAccountCreationPolicy.adminCanCreateUsers"
                @click="openCreateAccountModal('user')"
              >
                <template #icon>
                  <Icon icon="mdi:account-plus-outline" />
                </template>
                创建 User
              </NButton>
              <NButton
                :disabled="!effectiveAccountCreationPolicy.adminCanCreateAgents"
                @click="openCreateAccountModal('agent')"
              >
                <template #icon>
                  <Icon icon="mdi:handshake-outline" />
                </template>
                创建 Agent
              </NButton>
            </div>
            <div class="admin-toggle-grid">
              <article class="admin-toggle-card">
                <div>
                  <h3>公司管理员创建 User</h3>
                  <p>{{ effectiveAccountCreationPolicy.adminCanCreateUsers ? '开发者已开启' : '开发者已关闭' }}</p>
                </div>
                <NSwitch :value="effectiveAccountCreationPolicy.adminCanCreateUsers" disabled />
              </article>
              <article class="admin-toggle-card">
                <div>
                  <h3>公司管理员创建 Agent</h3>
                  <p>{{ effectiveAccountCreationPolicy.adminCanCreateAgents ? '开发者已开启' : '开发者已关闭' }}</p>
                </div>
                <NSwitch :value="effectiveAccountCreationPolicy.adminCanCreateAgents" disabled />
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
                  <p>公司管理员开关；若开发者关闭公司管理员创建 Agent，此开关不会生效。</p>
                </div>
                <NSwitch
                  v-model:value="accountCreationPolicyState.adminAllowsUserBecomeAgent"
                  :disabled="!accountCreationPolicyState.developerAllowsAdminCreateAgentsAndUsers"
                />
              </article>
            </div>
          </section>

          <section class="admin-section">
            <h2>代理商管理</h2>
            <p class="admin-section-note">
              公司管理员可以创建 Agent，并可禁用 Agent；不能调整 Agent 或 User 的积分。
            </p>
            <NDataTable
              v-if="filteredAgentProfiles.length"
              :columns="agentManagementColumns"
              :data="filteredAgentProfiles"
              :bordered="false"
              :single-line="false"
              :pagination="false"
            />
            <NEmpty v-else description="暂无代理商账号" />
          </section>

          <section class="admin-section">
            <h2>用户清单</h2>
            <p class="admin-section-note">
              公司管理员可读取全部客户余额/流水；普通 User 可以通过“升级为代理”获得 Agent 后台登录权限。
            </p>
            <NDataTable
              v-if="filteredRegularUserProfiles.length"
              :columns="customerColumns"
              :data="filteredRegularUserProfiles"
              :bordered="false"
              :single-line="false"
              :pagination="false"
            />
            <NEmpty v-else description="暂无客户档案" />
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
            <div class="admin-action-row" aria-label="代理商创建账号">
              <NButton
                type="primary"
                :disabled="!effectiveAccountCreationPolicy.agentCanCreateUsers"
                @click="openCreateAccountModal('user')"
              >
                <template #icon>
                  <Icon icon="mdi:account-plus-outline" />
                </template>
                创建 User
              </NButton>
              <NButton @click="openCreateLeadModal">
                <template #icon>
                  <Icon icon="mdi:clipboard-plus-outline" />
                </template>
                报备线索
              </NButton>
              <NButton @click="openCreateTicketModal">
                <template #icon>
                  <Icon icon="mdi:lifebuoy" />
                </template>
                新建工单
              </NButton>
            </div>
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
            <div class="admin-section-actions">
              <NButton size="small" secondary @click="exportRows('agent-customers', filteredAgentCustomers)">
                <template #icon>
                  <Icon icon="mdi:download-outline" />
                </template>
                导出
              </NButton>
            </div>
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
            <div class="admin-section-actions">
              <NButton size="small" secondary @click="exportRows('agent-leads', filteredAgentLeads)">
                <template #icon>
                  <Icon icon="mdi:download-outline" />
                </template>
                导出
              </NButton>
              <NButton size="small" secondary @click="openCreateLeadModal">
                <template #icon>
                  <Icon icon="mdi:clipboard-plus-outline" />
                </template>
                报备线索
              </NButton>
            </div>
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
            <div class="admin-section-actions">
              <NButton size="small" secondary @click="exportRows('agent-commissions', filteredAgentCommissions)">
                <template #icon>
                  <Icon icon="mdi:download-outline" />
                </template>
                导出
              </NButton>
            </div>
            <div v-if="commissionPolicy" class="admin-rule-grid" aria-label="返佣与结算规则">
              <article class="admin-rule-card">
                <p>积分汇率</p>
                <strong>1 RMB = {{ commissionPolicy.creditsPerRmb }} credits</strong>
                <span>{{ commissionPolicy.currency }}</span>
              </article>
              <article class="admin-rule-card">
                <p>固定返佣</p>
                <strong>{{ (commissionPolicy.commissionRate * 100).toFixed(0) }}%</strong>
                <span>基于客户实际充值金额</span>
              </article>
              <article class="admin-rule-card">
                <p>结算日</p>
                <strong>每月 {{ commissionPolicy.settlementDayOfMonth }} 日</strong>
                <span>结算上一个自然月</span>
              </article>
              <article class="admin-rule-card">
                <p>退款处理</p>
                <strong>追加冲正</strong>
                <span>不修改原返佣记录</span>
              </article>
            </div>
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
            <div class="admin-section-actions">
              <NButton size="small" secondary @click="exportRows('agent-settlements', agentSettlements)">
                <template #icon>
                  <Icon icon="mdi:download-outline" />
                </template>
                导出
              </NButton>
            </div>
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
            <div class="admin-section-actions">
              <NButton size="small" secondary @click="exportRows('agent-materials', filteredAgentMaterials)">
                <template #icon>
                  <Icon icon="mdi:download-outline" />
                </template>
                导出
              </NButton>
            </div>
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
            <div class="admin-section-actions">
              <NButton size="small" secondary @click="exportRows('agent-tickets', agentTickets)">
                <template #icon>
                  <Icon icon="mdi:download-outline" />
                </template>
                导出
              </NButton>
              <NButton size="small" secondary @click="openCreateTicketModal">
                <template #icon>
                  <Icon icon="mdi:lifebuoy" />
                </template>
                新建工单
              </NButton>
            </div>
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

      <NModal
        :show="!!selectedDetail"
        preset="card"
        class="admin-create-modal"
        :title="selectedDetail?.title ?? '详情'"
        @update:show="(show) => { if (!show) selectedDetail = null }"
      >
        <div class="admin-detail-grid">
          <article
            v-for="item in detailEntries"
            :key="item.key"
            class="admin-detail-item"
          >
            <span>{{ item.key }}</span>
            <strong>{{ item.value }}</strong>
          </article>
        </div>
        <template #footer>
          <div class="admin-modal-footer">
            <NButton @click="selectedDetail = null">
              关闭
            </NButton>
          </div>
        </template>
      </NModal>

      <NModal
        v-model:show="isAgentCustomerLedgerOpen"
        preset="card"
        class="admin-create-modal agent-ledger-modal"
        :title="ledgerModalTitle()"
        :style="{ width: '920px', maxWidth: '94vw', maxHeight: 'calc(100vh - 80px)' }"
        @update:show="(show) => {
          if (!show) {
            selectedAgentCustomer = null
            agentCustomerLedger = null
          }
        }"
      >
        <template #header>
          <div class="agent-ledger-header">
            <span class="agent-ledger-header-mark" />
            <div>
              <strong>{{ ledgerModalTitle() }}</strong>
              <small>
                {{ selectedAgentCustomer?.customerDisplayName ?? '客户' }}
                <template v-if="agentCustomerLedger?.customer.enterpriseTenantName">
                  · {{ agentCustomerLedger.customer.enterpriseTenantName }}
                </template>
              </small>
            </div>
          </div>
        </template>

        <div class="agent-ledger-toolbar">
          <div class="agent-ledger-summary">
            <span>当前余额</span>
            <strong>{{ Number(agentCustomerLedger?.account?.availableBalance ?? 0).toLocaleString('zh-CN') }}</strong>
          </div>
          <NButton
            size="small"
            secondary
            :disabled="!agentCustomerLedger?.transactions.length"
            @click="exportRows('agent-customer-ledger', agentCustomerLedger?.transactions ?? [])"
          >
            <template #icon>
              <Icon icon="mdi:download-outline" />
            </template>
            导出
          </NButton>
        </div>

        <NSpin :show="isLoadingAgentCustomerLedger">
          <NDataTable
            v-if="agentCustomerLedger?.transactions.length"
            :columns="agentCustomerLedgerColumns"
            :data="agentCustomerLedger.transactions"
            :bordered="false"
            :single-line="false"
            :pagination="false"
            class="agent-ledger-table"
          />
          <NEmpty v-else description="暂无积分流水" />
        </NSpin>

        <template #footer>
          <div class="admin-modal-footer">
            <NButton @click="isAgentCustomerLedgerOpen = false">
              关闭
            </NButton>
          </div>
        </template>
      </NModal>

      <NModal
        v-model:show="isCreateAccountModalOpen"
        preset="card"
        class="admin-create-modal account-create-modal"
        :style="{ width: '600px', maxWidth: '92vw', maxHeight: 'calc(100vh - 80px)' }"
        :mask-closable="!isCreatingAccount"
      >
        <template #header>
          <div class="account-create-header">
            <span class="account-create-header-icon">
              <Icon icon="mdi:account-plus-outline" />
            </span>
            <div>
              <strong>创建 {{ targetRoleLabel(createAccountForm.targetRole) }}</strong>
              <small>填写用户信息，完成后将自动创建账号</small>
            </div>
          </div>
        </template>
        <NForm label-placement="top" class="admin-create-form account-create-form" :show-feedback="false">
          <div class="account-create-grid">
            <NFormItem label="账号类型" required>
              <NSelect
                v-model:value="createAccountForm.targetRole"
                :options="createTargetOptions"
                @update:value="handleCreateTargetRoleChange"
              />
            </NFormItem>
            <NFormItem label="初始密码" required>
              <NInput
                v-model:value="createAccountForm.password"
                type="password"
                show-password-on="click"
                maxlength="64"
              />
            </NFormItem>
            <NFormItem label="用户名" required>
              <NInput
                v-model:value="createAccountForm.username"
                placeholder="lowercase_name"
                maxlength="32"
              />
            </NFormItem>
            <NFormItem label="手机号">
              <NInput v-model:value="createAccountForm.phone" placeholder="可选" />
            </NFormItem>
            <NFormItem label="显示名称">
              <NInput v-model:value="createAccountForm.displayName" placeholder="默认使用用户名" />
            </NFormItem>
            <NFormItem label="邮箱">
              <NInput v-model:value="createAccountForm.email" placeholder="可选，未填时后端生成本地邮箱" />
            </NFormItem>
            <NFormItem label="接入应用">
              <NSelect
                v-model:value="createAccountForm.applicationCode"
                :options="applicationSelectOptions"
              />
            </NFormItem>
            <NFormItem label="订阅计划">
              <NSelect
                v-model:value="createAccountForm.planCode"
                :options="planOptions"
                @update:value="handleCreatePlanChange"
              />
            </NFormItem>
            <NFormItem label="初始积分" required class="account-create-full">
              <NInputNumber
                v-model:value="createAccountForm.initialPoints"
                :min="0"
                :precision="0"
                :show-button="true"
                class="admin-create-number"
              />
            </NFormItem>
          </div>
        </NForm>
        <template #footer>
          <div class="admin-modal-footer account-create-footer">
            <NButton :disabled="isCreatingAccount" @click="isCreateAccountModalOpen = false">
              取消
            </NButton>
            <NButton type="primary" :loading="isCreatingAccount" @click="handleCreateAccount">
              <template #icon>
                <Icon icon="mdi:check" />
              </template>
              创建账号
            </NButton>
          </div>
        </template>
      </NModal>

      <NModal
        v-model:show="isCreateLeadModalOpen"
        preset="card"
        class="admin-create-modal"
        title="报备线索"
        :mask-closable="!isCreatingLead"
      >
        <NForm label-placement="top" class="admin-create-form">
          <div class="admin-create-form-grid">
            <NFormItem label="客户名称">
              <NInput
                v-model:value="leadForm.customerName"
                placeholder="公司或联系人名称"
                maxlength="120"
              />
            </NFormItem>
            <NFormItem label="手机号">
              <NInput v-model:value="leadForm.phone" placeholder="可选" maxlength="32" />
            </NFormItem>
          </div>
          <div class="admin-create-form-grid">
            <NFormItem label="接入应用">
              <NSelect v-model:value="leadForm.applicationCode" :options="applicationSelectOptions" />
            </NFormItem>
            <NFormItem label="阶段">
              <NSelect v-model:value="leadForm.stage" :options="leadStageOptions" />
            </NFormItem>
          </div>
          <div class="admin-create-form-grid">
            <NFormItem label="来源">
              <NInput v-model:value="leadForm.source" placeholder="agent_referral" maxlength="80" />
            </NFormItem>
            <NFormItem label="预计积分">
              <NInputNumber
                v-model:value="leadForm.expectedPoints"
                :min="0"
                :precision="0"
                class="admin-create-number"
              />
            </NFormItem>
          </div>
          <NFormItem label="备注">
            <NInput
              v-model:value="leadForm.note"
              type="textarea"
              placeholder="记录客户需求、跟进计划或 30 天保护期说明"
              maxlength="500"
              show-count
            />
          </NFormItem>
        </NForm>
        <template #footer>
          <div class="admin-modal-footer">
            <NButton :disabled="isCreatingLead" @click="isCreateLeadModalOpen = false">
              取消
            </NButton>
            <NButton type="primary" :loading="isCreatingLead" @click="handleCreateLead">
              <template #icon>
                <Icon icon="mdi:check" />
              </template>
              提交报备
            </NButton>
          </div>
        </template>
      </NModal>

      <NModal
        v-model:show="isCreateTicketModalOpen"
        preset="card"
        class="admin-create-modal"
        title="新建工单"
        :mask-closable="!isCreatingTicket"
      >
        <NForm label-placement="top" class="admin-create-form">
          <NFormItem label="主题">
            <NInput
              v-model:value="ticketForm.subject"
              placeholder="例如：客户充值后积分到账确认"
              maxlength="160"
            />
          </NFormItem>
          <div class="admin-create-form-grid">
            <NFormItem label="类别">
              <NSelect v-model:value="ticketForm.category" :options="ticketCategoryOptions" />
            </NFormItem>
            <NFormItem label="优先级">
              <NSelect v-model:value="ticketForm.priority" :options="ticketPriorityOptions" />
            </NFormItem>
          </div>
          <NFormItem label="消息">
            <NInput
              v-model:value="ticketForm.message"
              type="textarea"
              placeholder="描述需要后台协助处理的事项"
              maxlength="500"
              show-count
            />
          </NFormItem>
        </NForm>
        <template #footer>
          <div class="admin-modal-footer">
            <NButton :disabled="isCreatingTicket" @click="isCreateTicketModalOpen = false">
              取消
            </NButton>
            <NButton type="primary" :loading="isCreatingTicket" @click="handleCreateTicket">
              <template #icon>
                <Icon icon="mdi:check" />
              </template>
              创建工单
            </NButton>
          </div>
        </template>
      </NModal>

      <NModal
        v-model:show="isAdjustCreditsModalOpen"
        preset="card"
        class="admin-create-modal"
        title="增减积分"
        :mask-closable="!isAdjustingCredits"
      >
        <div class="admin-modal-context" v-if="selectedCapabilityUser">
          <strong>{{ selectedCapabilityUser.displayName }}</strong>
          <span>{{ selectedCapabilityUser.username }} · {{ matrixTargetRole(selectedCapabilityUser.role) }}</span>
        </div>
        <NForm label-placement="top" class="admin-create-form">
          <NFormItem label="积分变动">
            <NInputNumber
              v-model:value="adjustCreditsForm.points"
              :precision="0"
              :show-button="true"
              class="admin-create-number"
              placeholder="正数增加，负数扣减"
            />
          </NFormItem>
          <NFormItem label="原因">
            <NInput
              v-model:value="adjustCreditsForm.reason"
              type="textarea"
              placeholder="例如：人工补偿、活动赠送、误扣修正"
              maxlength="240"
              show-count
            />
          </NFormItem>
        </NForm>
        <template #footer>
          <div class="admin-modal-footer">
            <NButton :disabled="isAdjustingCredits" @click="isAdjustCreditsModalOpen = false">
              取消
            </NButton>
            <NButton type="primary" :loading="isAdjustingCredits" @click="handleAdjustCredits">
              <template #icon>
                <Icon icon="mdi:plus-minus-variant" />
              </template>
              确认调整
            </NButton>
          </div>
        </template>
      </NModal>

      <NModal
        v-model:show="isDeleteAccountModalOpen"
        preset="card"
        class="admin-create-modal"
        :title="selectedCapabilityUser ? deleteActionText(selectedCapabilityUser) : '删除账号'"
        :mask-closable="!isDeletingAccount"
      >
        <div class="admin-modal-context" v-if="selectedCapabilityUser">
          <strong>{{ selectedCapabilityUser.displayName }}</strong>
          <span>{{ selectedCapabilityUser.username }} · {{ matrixTargetRole(selectedCapabilityUser.role) }}</span>
        </div>
        <NForm label-placement="top" class="admin-create-form">
          <NFormItem :label="activeRole === 'admin' ? '禁用原因' : '删除原因'">
            <NInput
              v-model:value="deleteAccountForm.reason"
              type="textarea"
              :placeholder="activeRole === 'admin' ? '记录禁用原因，便于后续审计' : '记录删除原因，便于后续审计'"
              maxlength="240"
              show-count
            />
          </NFormItem>
        </NForm>
        <template #footer>
          <div class="admin-modal-footer">
            <NButton :disabled="isDeletingAccount" @click="isDeleteAccountModalOpen = false">
              取消
            </NButton>
            <NButton type="error" :loading="isDeletingAccount" @click="handleDeleteAccount">
              <template #icon>
                <Icon :icon="activeRole === 'admin' ? 'mdi:account-cancel-outline' : 'mdi:trash-can-outline'" />
              </template>
              {{ selectedCapabilityUser ? deleteActionText(selectedCapabilityUser) : '删除账号' }}
            </NButton>
          </div>
        </template>
      </NModal>
    </section>
  </main>
</template>

<style scoped lang="scss">
.credits-admin-page {
  padding: 0;
  background: var(--app-bg);
  color: var(--app-text);
}

.credits-admin-page.theme-light {
  color-scheme: light;
  --app-bg: #f5f7fa;
  --app-surface: #ffffff;
  --app-surface-soft: #f8fafd;
  --app-border: transparent;
  --app-text: #0f172a;
  --app-text-soft: #475569;
  --app-text-muted: #64748b;
  --app-text-disabled: #94a3b8;
  --color-accent-blue: #2f6bff;
  --bo-text: #0f172a;
  --bo-text-soft: #475569;
  --bo-text-muted: #64748b;
  --bo-surface: #ffffff;
  --bo-surface-soft: #f8fafc;
  --bo-accent: #2f6bff;
  --bo-card-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.credits-admin-page.theme-dark {
  color-scheme: dark;
  --app-bg: #0b1220;
  --app-surface: #111827;
  --app-surface-soft: #1a2332;
  --app-border: transparent;
  --app-text: #f8fafc;
  --app-text-soft: #cbd5e1;
  --app-text-muted: #94a3b8;
  --app-text-disabled: #64748b;
  --color-accent-blue: #5b8cff;
  --bo-text: #f8fafc;
  --bo-text-soft: #cbd5e1;
  --bo-text-muted: #94a3b8;
  --bo-surface: #111827;
  --bo-surface-soft: #1a2332;
  --bo-accent: #5b8cff;
  --bo-card-shadow: 0 2px 12px rgba(0, 0, 0, 0.28);
}

.admin-shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.admin-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 24px;
  border-radius: 12px;
  background: var(--app-surface);
  box-shadow: var(--bo-card-shadow, 0 2px 12px rgba(0, 0, 0, 0.04));
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
  }
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
  border: 0;
  border-radius: 12px;
  background: var(--app-surface);
  box-shadow: var(--bo-card-shadow, 0 2px 12px rgba(0, 0, 0, 0.04));
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
  border: 0;
  border-radius: 12px;
  background: var(--app-surface);
  box-shadow: var(--bo-card-shadow, 0 2px 12px rgba(0, 0, 0, 0.04));
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
  }
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

.admin-dashboard-band {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  padding: 0;
  border: 0;
  border-radius: 12px;
  background: transparent;
}

.admin-dashboard-metric {
  display: grid;
  gap: 5px;
  min-height: 108px;
  padding: 18px 20px;
  border: 0;
  border-radius: 12px;
  background: var(--app-surface);
  box-shadow: var(--bo-card-shadow, 0 2px 12px rgba(0, 0, 0, 0.04));
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
  }
}

.admin-dashboard-metric p {
  margin: 0;
  color: var(--app-text-soft);
  font-size: 12px;
  font-weight: 800;
}

.admin-dashboard-metric strong {
  overflow-wrap: anywhere;
  font-size: 26px;
  font-weight: 900;
  line-height: 1.15;
}

.admin-dashboard-metric span {
  color: var(--app-text-soft);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.45;
}

.admin-filter-band {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 16px;
  border: 0;
  border-radius: 12px;
  background: var(--app-surface);
  box-shadow: var(--bo-card-shadow, 0 2px 12px rgba(0, 0, 0, 0.04));
}

.admin-filter-chip {
  display: grid;
  gap: 2px;
  min-width: 160px;
  padding: 10px 14px;
  border: 0;
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
  border: 0;
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

.admin-action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0 0 14px;
}

.admin-subsection {
  display: grid;
  gap: 10px;
  margin: 0 0 14px;
  padding: 14px;
  border: 0;
  border-radius: 12px;
  background: var(--app-surface-soft);
}

.admin-subsection h3,
.admin-subsection p {
  margin: 0;
}

.admin-subsection h3 {
  font-size: 15px;
  font-weight: 900;
}

.admin-subsection p {
  color: var(--app-text-soft);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.55;
}

.admin-section {
  padding: 20px 24px;
  border: 0;
  border-radius: 12px;
  background: var(--app-surface);
  box-shadow: var(--bo-card-shadow, 0 2px 12px rgba(0, 0, 0, 0.04));
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
  }
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

.admin-collapse-trigger {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--app-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.admin-collapse-trigger span {
  display: grid;
  gap: 4px;
}

.admin-collapse-trigger strong {
  font-size: 17px;
  font-weight: 900;
}

.admin-collapse-trigger small {
  color: var(--app-text-soft);
  font-size: 12px;
  font-weight: 700;
}

.admin-collapse-trigger svg {
  flex: 0 0 auto;
  color: var(--app-text-soft);
  font-size: 22px;
}

.admin-collapse-body {
  margin-top: 14px;
}

.admin-section-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin: -4px 0 12px;
}

:deep(.admin-function-points-cell) {
  display: flex;
  align-items: center;
  gap: 8px;
}

:deep(.admin-function-points-cell .n-input-number) {
  width: 124px;
  flex: 0 0 124px;
}

.admin-agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.admin-rule-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 0 0 14px;
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

.admin-rule-card {
  display: grid;
  gap: 5px;
  min-height: 98px;
  padding: 14px 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface-soft);
}

.admin-rule-card p {
  margin: 0;
  color: var(--app-text-soft);
  font-size: 12px;
  font-weight: 800;
}

.admin-rule-card strong {
  font-size: 18px;
  font-weight: 900;
  line-height: 1.25;
}

.admin-rule-card span {
  color: var(--app-text-soft);
  font-size: 12px;
  font-weight: 600;
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

.admin-feedback {
  margin: 0 0 12px;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, #18b77d 34%, var(--app-border));
  border-radius: 10px;
  background: color-mix(in srgb, #18b77d 8%, var(--app-surface));
  color: #12845d;
  font-size: 13px;
  font-weight: 800;
}

.admin-create-form {
  display: grid;
  gap: 2px;
}

.admin-create-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.admin-create-number {
  width: 100%;
}

.admin-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.admin-modal-context {
  display: grid;
  gap: 4px;
  margin-bottom: 14px;
  padding: 12px 14px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface-soft);
}

.admin-modal-context strong {
  font-size: 15px;
  font-weight: 900;
}

.admin-modal-context span {
  color: var(--app-text-soft);
  font-size: 12px;
  font-weight: 700;
}

.admin-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.admin-detail-item {
  display: grid;
  gap: 5px;
  min-width: 0;
  padding: 11px 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface-soft);
}

.admin-detail-item span {
  color: var(--app-text-soft);
  font-size: 12px;
  font-weight: 800;
}

.admin-detail-item strong {
  overflow-wrap: anywhere;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
}

:deep(.admin-table-actions) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

:deep(.admin-auth-switch-cell) {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

:deep(.admin-auth-switch-cell span) {
  font-size: 12px;
  font-weight: 800;
}

:deep(.admin-auth-switch-cell .is-enabled) {
  color: #12845d;
}

:deep(.admin-auth-switch-cell .is-disabled) {
  color: #b45309;
}

:deep(.admin-create-modal.n-modal) {
  width: min(720px, calc(100vw - 32px));
}

:deep(.admin-delta.is-up) {
  color: #18b77d;
  font-weight: 800;
}

:deep(.admin-delta.is-down) {
  color: #e77835;
  font-weight: 800;
}

.agent-ledger-header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.agent-ledger-header-mark {
  width: 5px;
  height: 24px;
  border-radius: 999px;
  background: #e8ae25;
}

.agent-ledger-header strong {
  display: block;
  color: var(--app-text);
  font-size: 20px;
  font-weight: 900;
  line-height: 1.25;
}

.agent-ledger-header small {
  display: block;
  margin-top: 4px;
  color: var(--app-text-soft);
  font-size: 13px;
  font-weight: 700;
}

.agent-ledger-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.agent-ledger-summary {
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
  color: var(--app-text-soft);
  font-size: 13px;
  font-weight: 800;
}

.agent-ledger-summary strong {
  color: var(--app-text);
  font-size: 20px;
}

:deep(.agent-ledger-table .n-data-table-th) {
  color: #8da0bc;
  font-weight: 900;
}

:deep(.agent-ledger-table .n-data-table-td) {
  background: #f1f7ff;
}

:deep(.agent-ledger-status) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #506178;
  font-weight: 800;
}

:deep(.agent-ledger-status-dot) {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: #23c267;
}

@media (max-width: 1024px) {
  .admin-tabs,
  .admin-summary,
  .admin-dashboard-band,
  .admin-rule-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .admin-create-form-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .admin-detail-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* ===== 创建账号弹窗（企业级表单样式，作用域限定，不影响其它共用弹窗） ===== */
/* 宽度与最大高度由模板控制；高度由内容自适应，内容过长时内部滚动。 */
:deep(.account-create-modal.n-card) {
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.18);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

:deep(.account-create-modal .n-card__content) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 24px 24px;
}

:deep(.account-create-modal .n-card-header) {
  padding: 20px 24px 14px;
}

:deep(.account-create-modal .n-card-header__close) {
  margin: 18px 18px 0 0;
}

.account-create-header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.account-create-header-icon {
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  place-items: center;
  border-radius: 12px;
  background: rgba(47, 107, 255, 0.1);
  color: #2f6bff;
  font-size: 24px;
}

.account-create-header strong {
  display: block;
  font-size: 22px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.3;
}

.account-create-header small {
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
}

.account-create-form {
  padding: 16px;
  border: 1px solid #e5eaf3;
  border-radius: 12px;
  background: #fff;
}

.account-create-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
  row-gap: 16px;
}

.account-create-full {
  grid-column: 1 / -1;
}

:deep(.account-create-form .n-form-item-label) {
  padding-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

:deep(.account-create-form .n-form-item-label__asterisk) {
  color: #ef4444;
}

:deep(.account-create-form .n-input),
:deep(.account-create-form .n-base-selection) {
  --n-height: 42px;
  border-radius: 8px;
}

:deep(.account-create-form .n-input .n-input__input-el),
:deep(.account-create-form .n-base-selection .n-base-selection-label) {
  min-height: 42px;
}

:deep(.account-create-form .n-input__placeholder),
:deep(.account-create-form .n-base-selection-placeholder) {
  color: #a3aab8;
}

:deep(.account-create-footer) {
  padding: 16px 24px 20px;
  border-top: 1px solid #eef2f7;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

:deep(.account-create-footer .n-button) {
  height: 40px;
  border-radius: 8px;
}

:deep(.account-create-footer .n-button--default-type) {
  padding: 0 22px;
}

:deep(.account-create-footer .n-button--primary-type) {
  padding: 0 24px;
  box-shadow: 0 6px 14px rgba(47, 107, 255, 0.24);
}

@media (max-width: 900px) {
  :deep(.account-create-modal.n-modal) {
    width: 94vw;
  }

  .account-create-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .account-create-full {
    grid-column: 1 / -1;
  }
}
</style>
