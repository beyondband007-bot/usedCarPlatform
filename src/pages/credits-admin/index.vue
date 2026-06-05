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
  getCommissionPolicy,
  getAgentOperationsOverview,
  getCreditsAdminOverview,
  getPlatformAgents,
  getPlatformDashboard,
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
  type PlatformAgentProfile,
  type PlatformDashboard,
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
type DetailRecord = Record<string, unknown>

const appStore = useAppStore()
const authStore = useAuthStore()
const message = useMessage()

const overview = ref<CreditsAdminOverview | null>(null)
const agentOverview = ref<AgentOperationsOverview | null>(null)
const platformAgents = ref<PlatformAgentProfile[]>([])
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
const isCreateLeadModalOpen = ref(false)
const isCreatingLead = ref(false)
const isCreateTicketModalOpen = ref(false)
const isCreatingTicket = ref(false)
const confirmingSettlementId = ref<string | null>(null)
const selectedCapabilityUser = ref<CreditsCustomerProfile | null>(null)
const selectedDetail = ref<{ title: string; row: DetailRecord } | null>(null)
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
    const [creditsResult, operationsResult, dashboardResult, agentsResult, commissionPolicyResult] =
      await Promise.allSettled([
        getCreditsAdminOverview(),
        getAgentOperationsOverview(),
        getPlatformDashboard(),
        authStore.role === 'developer' || authStore.role === 'admin'
          ? getPlatformAgents()
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

const planOptions: Array<{ label: string; value: PlatformUserPlanCode }> = [
  { label: 'Basic / 普通用户默认', value: 'basic' },
  { label: 'Team / 代理商默认', value: 'team' },
  { label: 'Flagship / 管理员默认', value: 'flagship' },
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

const filteredApplicationFunctions = computed(() =>
  applicationFunctions.value.filter((item) => matchesSelectedApplication(item.applicationCode)),
)

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
          ? effectiveAccountCreationPolicy.value.adminCanCreateAgents
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

function defaultPlanForRole(role: PlatformUserTargetRole): PlatformUserPlanCode {
  if (role === 'admin') return 'flagship'
  if (role === 'agent') return 'team'
  return 'basic'
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

function deleteActionText(row: CreditsCustomerProfile) {
  const targetRole = matrixTargetRole(row.role)
  if (activeRole.value === 'admin' && targetRole === 'agent') return '禁用代理商'
  return '删除'
}

function agentProfileToCustomerProfile(row: PlatformAgentProfile): CreditsCustomerProfile {
  return {
    id: `agent:${row.userId}`,
    applicationCode: row.applications[0] ?? 'used-car-platform',
    userId: row.userId,
    username: row.username,
    displayName: row.displayName,
    phone: row.phone ?? null,
    role: 'agent',
    creditsUserId: row.creditsUserId ?? '',
    accountScope: 'personal',
    creditsTenantId: null,
    createdByUserId: row.assignedByUserId ?? '',
    createdByRole: row.assignedByUsername ? `assigned by ${row.assignedByUsername}` : 'back-office',
    status: row.status,
    createdAt: row.createdAt,
  }
}

function openDeleteAgentModal(row: PlatformAgentProfile) {
  openDeleteAccountModal(agentProfileToCustomerProfile(row))
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
  createAccountForm.initialPoints = 0
}

function openCreateAccountModal(role: PlatformUserTargetRole) {
  if (!canCreateTargetRole(role)) {
    message.warning('当前账号创建权限已被上级开关关闭')
    return
  }

  resetCreateAccountForm(role)
  isCreateAccountModalOpen.value = true
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

    message.success(`已创建 ${targetRoleLabel(createAccountForm.targetRole)}：${result.user.username}`)
    isCreateAccountModalOpen.value = false
    await refreshOverview()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '创建账号失败')
  } finally {
    isCreatingAccount.value = false
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

function policyTagType(enabled: boolean, controlled: boolean) {
  if (!enabled) return 'error'
  return controlled ? 'warning' : 'success'
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
  {
    title: '能力操作',
    key: 'actions',
    width: 210,
    render(row) {
      const canAdjust = canAdjustCustomer(row)
      const canDelete = canDeleteCustomer(row)
      if (!canAdjust && !canDelete) return '-'

      return h(
        'div',
        { class: 'admin-table-actions' },
        [
          h(
            NButton,
            {
              size: 'small',
              secondary: true,
              disabled: !canAdjust,
              onClick: () => openAdjustCreditsModal(row),
            },
            {
              icon: () => h(Icon, { icon: 'mdi:plus-minus-variant' }),
              default: () => '增减积分',
            },
          ),
          h(
            NButton,
            {
              size: 'small',
              type: 'error',
              secondary: true,
              disabled: !canDelete,
              onClick: () => openDeleteAccountModal(row),
            },
            {
              icon: () => h(Icon, { icon: 'mdi:trash-can-outline' }),
              default: () => '删除',
            },
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
      const canDelete = canDeleteCustomer(agentProfileToCustomerProfile(row))
      return h(
        NButton,
        {
          size: 'small',
          type: 'error',
          secondary: true,
          disabled: !canDelete,
          onClick: () => openDeleteAgentModal(row),
        },
        {
          icon: () => h(Icon, { icon: 'mdi:account-cancel-outline' }),
          default: () => deleteActionText(agentProfileToCustomerProfile(row)),
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
  {
    title: '操作',
    key: 'actions',
    width: 130,
    render(row) {
      return renderDetailButton('代理商客户详情', row)
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
            当前主入口为 <code>/reusable-credits-console</code>；<code>/credits-admin</code> 仅作为历史兼容入口。控制台面向所有接入应用，usedCarPlatform 只是其中一个应用。
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
              开发者可创建 Admin、Agent 和 User；开发者开关控制公司管理员是否能创建 Agent，也可禁用代理商创建 User。
            </p>
            <div class="admin-action-row" aria-label="开发者创建账号">
              <NButton type="primary" @click="openCreateAccountModal('admin')">
                <template #icon>
                  <Icon icon="mdi:account-tie-outline" />
                </template>
                创建 Admin
              </NButton>
              <NButton @click="openCreateAccountModal('agent')">
                <template #icon>
                  <Icon icon="mdi:handshake-outline" />
                </template>
                创建 Agent
              </NButton>
              <NButton @click="openCreateAccountModal('user')">
                <template #icon>
                  <Icon icon="mdi:account-plus-outline" />
                </template>
                创建 User
              </NButton>
            </div>
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
                  <h3>允许公司管理员创建 Agent</h3>
                  <p>关闭后，公司管理员不能创建 Agent，也不能让 User 成为 Agent。</p>
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
              公司管理员可创建和管理 Agent；普通 User 清单只读。公司管理员还可以控制代理商创建 User，以及 User 是否能成为 Agent。
            </p>
            <div class="admin-action-row" aria-label="公司管理员创建账号">
              <NButton
                type="primary"
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
              公司管理员可读取全部客户余额/流水；普通 User 清单只读，不能直接调账、禁用或启用普通用户。
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
        v-model:show="isCreateAccountModalOpen"
        preset="card"
        class="admin-create-modal"
        :title="`创建 ${targetRoleLabel(createAccountForm.targetRole)}`"
        :mask-closable="!isCreatingAccount"
      >
        <NForm label-placement="top" class="admin-create-form">
          <NFormItem label="账号类型">
            <NSelect
              v-model:value="createAccountForm.targetRole"
              :options="createTargetOptions"
              @update:value="(value) => { createAccountForm.planCode = defaultPlanForRole(value as PlatformUserTargetRole) }"
            />
          </NFormItem>
          <div class="admin-create-form-grid">
            <NFormItem label="用户名">
              <NInput
                v-model:value="createAccountForm.username"
                placeholder="lowercase_name"
                maxlength="32"
              />
            </NFormItem>
            <NFormItem label="初始密码">
              <NInput
                v-model:value="createAccountForm.password"
                type="password"
                show-password-on="click"
                maxlength="64"
              />
            </NFormItem>
          </div>
          <div class="admin-create-form-grid">
            <NFormItem label="显示名称">
              <NInput v-model:value="createAccountForm.displayName" placeholder="默认使用用户名" />
            </NFormItem>
            <NFormItem label="手机号">
              <NInput v-model:value="createAccountForm.phone" placeholder="可选" />
            </NFormItem>
          </div>
          <NFormItem label="邮箱">
            <NInput v-model:value="createAccountForm.email" placeholder="可选，未填时后端生成本地邮箱" />
          </NFormItem>
          <div class="admin-create-form-grid">
            <NFormItem label="接入应用">
              <NSelect
                v-model:value="createAccountForm.applicationCode"
                :options="applicationSelectOptions"
              />
            </NFormItem>
            <NFormItem label="订阅计划">
              <NSelect v-model:value="createAccountForm.planCode" :options="planOptions" />
            </NFormItem>
          </div>
          <NFormItem label="初始积分">
            <NInputNumber
              v-model:value="createAccountForm.initialPoints"
              :min="0"
              :precision="0"
              :show-button="true"
              class="admin-create-number"
            />
          </NFormItem>
        </NForm>
        <template #footer>
          <div class="admin-modal-footer">
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

.admin-dashboard-band {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
}

.admin-dashboard-metric {
  display: grid;
  gap: 5px;
  min-height: 108px;
  padding: 14px 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface-soft);
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

.admin-action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0 0 14px;
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

.admin-section-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin: -4px 0 12px;
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
</style>
