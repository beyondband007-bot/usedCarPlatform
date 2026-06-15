import { computed, onMounted, ref, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'

import {
  getCreditsAccounts,
  getCreditsTransactions,
  type CreditsAccount,
} from '@/api/visual-workbench'
import {
  getEnterpriseChildMembers,
  getEnterpriseCreditsOverview,
  type EnterpriseChildMember,
  type EnterpriseCreditsMember,
} from '@/api/enterprise'
import { flagshipSubAccountFallback } from '@/constants/flagship-sub-accounts'
import { useAuthStore } from '@/stores/auth'
import { useCreditsStore } from '@/stores/credits'
import { useSubscriptionStore } from '@/stores/subscription'
import { getCreditsIdentity } from '@/utils/credits-identity'
import {
  canUseFlagshipSubAccountSwitch,
  type PointsAccountScopeMode,
} from '@/utils/points-query-access'
import {
  buildPersonalSummaryCards,
  buildPersonalSummaryCardsFromAggregate,
  buildTeamSummaryCards,
  isCustomerVisibleCreditsTransaction,
  mapCreditsTransactionToFlowRecord,
  mapEnterpriseCreditsTransactionToFlowRecord,
} from '@/utils/points-query-mapper'
import type {
  PointsFlowRecord,
  PointsQueryFilters,
  PointsQueryVersion,
  PointsSubAccountOption,
  PointsSummaryCard,
} from '@/types/points-query'

function resolveVersion(raw: unknown): PointsQueryVersion {
  if (raw === 'member' || raw === 'enterprise-member') return 'member'
  if (raw === 'admin' || raw === 'enterprise-admin') return 'admin'
  return 'personal'
}

function normalizeMemberRole(value: string | null | undefined): 'owner' | 'admin' | 'member' {
  if (value === 'owner' || value === 'admin') return value
  return 'member'
}

function mapChildMembers(members: EnterpriseChildMember[]): PointsSubAccountOption[] {
  const options: PointsSubAccountOption[] = []

  for (const member of members) {
    const rawCreditsUserId = member.creditsUserId
    if (rawCreditsUserId == null) continue
    const creditsUserId = Number(rawCreditsUserId)
    if (!Number.isInteger(creditsUserId) || creditsUserId <= 0) continue
    options.push({
      id: member.id,
      label: member.displayName,
      username: member.username,
      creditsUserId,
      memberRole: normalizeMemberRole(member.memberRole),
      isOwner: member.memberRole === 'owner',
    })
  }

  return options
}

function mapTeamMembers(
  members: EnterpriseCreditsMember[],
  currentUser: ReturnType<typeof useAuthStore>['userInfo'],
): PointsSubAccountOption[] {
  const options: PointsSubAccountOption[] = []

  for (const member of members) {
    const rawCreditsUserId = member.creditsUserId
    if (rawCreditsUserId == null) continue
    const creditsUserId = Number(rawCreditsUserId)
    if (!Number.isInteger(creditsUserId) || creditsUserId <= 0) continue
    options.push({
      id: member.id,
      label: member.displayName,
      username: member.username,
      creditsUserId,
      memberRole: normalizeMemberRole(member.memberRole),
      isOwner: member.isOwner,
    })
  }

  if (
    currentUser?.id
    && currentUser.creditsUserId
    && !options.some((member) => member.id === currentUser.id)
  ) {
    options.unshift({
      id: currentUser.id,
      label: currentUser.displayName,
      username: currentUser.username,
      creditsUserId: currentUser.creditsUserId,
      memberRole:
        currentUser.canViewEnterpriseChildren
          ? 'owner'
          : normalizeMemberRole(currentUser.enterpriseMemberRole),
      isOwner: Boolean(currentUser.canViewEnterpriseChildren),
    })
  }

  return options
}

type UsePointsQueryOptions = {
  filters?: Ref<PointsQueryFilters>
  currentPage?: Ref<number>
  pageSize?: Ref<number>
}

function resolveDateRange(filters?: PointsQueryFilters) {
  if (!filters) return { from: undefined, to: undefined }

  if (filters.dateRange === 'custom') {
    return {
      from: filters.startDate || undefined,
      to: filters.endDate || undefined,
    }
  }

  if (filters.dateRange) {
    const days = Number(filters.dateRange)
    if (Number.isFinite(days) && days > 0) {
      const now = new Date()
      const fromDate = new Date()
      fromDate.setDate(now.getDate() - days + 1)
      const format = (value: Date) => {
        const pad = (part: number) => String(part).padStart(2, '0')
        return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
      }
      return {
        from: format(fromDate),
        to: format(now),
      }
    }
  }

  return { from: undefined, to: undefined }
}

export function usePointsQuery(options: UsePointsQueryOptions = {}) {
  const route = useRoute()
  const authStore = useAuthStore()
  const subscriptionStore = useSubscriptionStore()
  const creditsStore = useCreditsStore()

  const version = ref<PointsQueryVersion>(resolveVersion(route.query.view))
  const records = ref<PointsFlowRecord[]>([])
  const totalRecords = ref(0)
  const summaryCards = ref<PointsSummaryCard[]>([])
  const activeAccount = ref<CreditsAccount | null>(null)
  const isLoading = ref(false)
  const loadError = ref<string | null>(null)
  const dataSource = ref<'api'>('api')

  const accountScopeMode = ref<PointsAccountScopeMode>('self')
  const selectedChildId = ref<string | null>(null)
  const childMembers = ref<PointsSubAccountOption[]>([])
  const teamName = ref<string>('')

  const showSubAccountScope = computed(() =>
    canUseFlagshipSubAccountSwitch({
      userInfo: authStore.userInfo,
      currentPlan: subscriptionStore.currentPlan,
    }),
  )

  const isFlagshipChildAccount = computed(() =>
    subscriptionStore.currentPlan === 'flagship'
    && authStore.userInfo?.enterpriseAccountRole === 'child',
  )

  const selectedChild = computed(() =>
    childMembers.value.find((member) => member.id === selectedChildId.value) ?? null,
  )

  const usesTeamDashboard = computed(() => showSubAccountScope.value)
  const usesLiveApi = computed(() => true)

  const activeTargetCreditsUserId = computed(() => {
    if (!showSubAccountScope.value || accountScopeMode.value === 'self') {
      return null
    }
    return selectedChild.value?.creditsUserId ?? null
  })

  async function ensureEnterpriseIdentityReady() {
    const user = authStore.userInfo
    if (!user || user.role !== 'enterprise' || !authStore.token) return

    const hasEnterpriseTenant = Boolean(user.enterpriseTenantId)
    const hasRoleMetadata =
      user.canViewEnterpriseChildren !== undefined
      && Boolean(user.enterpriseMemberRole || user.enterpriseAccountRole)

    if (hasEnterpriseTenant && hasRoleMetadata) return

    try {
      await authStore.refreshUserInfo()
    } catch {
      // Keep the page resilient even if the identity refresh fails.
    }
  }

  async function loadChildMembers() {
    if (!showSubAccountScope.value) {
      childMembers.value = []
      selectedChildId.value = null
      accountScopeMode.value = 'self'
      return
    }

    try {
      const members = await getEnterpriseChildMembers()
      childMembers.value = mapChildMembers(members.length ? members : flagshipSubAccountFallback)
    } catch {
      childMembers.value = mapChildMembers(flagshipSubAccountFallback)
    }

    if (!childMembers.value.length) {
      selectedChildId.value = null
      accountScopeMode.value = 'self'
      return
    }

    if (!selectedChildId.value || !childMembers.value.some((item) => item.id === selectedChildId.value)) {
      selectedChildId.value = null
    }
  }

  async function loadPersonalData() {
    isLoading.value = true
    loadError.value = null

    try {
      const identity = getCreditsIdentity()
      const targetCreditsUserId = activeTargetCreditsUserId.value ?? undefined
      const activeFilters = options.filters?.value
      const { from, to } = resolveDateRange(activeFilters)

      const [accounts, transactionResult] = await Promise.all([
        targetCreditsUserId ? Promise.resolve([] as CreditsAccount[]) : getCreditsAccounts(),
        getCreditsTransactions({
          page: options.currentPage?.value ?? 1,
          pageSize: options.pageSize?.value ?? 10,
          accountScope: identity.accountScope,
          tenantId: identity.tenantId ?? undefined,
          targetCreditsUserId,
          txnType: activeFilters?.txnType || undefined,
          bizSource: activeFilters?.bizSource || undefined,
          from,
          to,
        }),
      ])

      activeAccount.value =
        transactionResult.account
        ?? accounts.find(
          (account) =>
            account.accountScope === identity.accountScope
            && (identity.tenantId == null || String(account.tenantId) === String(identity.tenantId)),
        )
        ?? accounts[0]
        ?? null

      records.value = transactionResult.items
        .filter(isCustomerVisibleCreditsTransaction)
        .map(mapCreditsTransactionToFlowRecord)
      totalRecords.value = transactionResult.total

      summaryCards.value = transactionResult.summary
        ? buildPersonalSummaryCardsFromAggregate({
            availableBalance: Number(activeAccount.value?.availableBalance ?? 0),
            totalGained: transactionResult.summary.totalGained,
            totalConsumed: transactionResult.summary.totalConsumed,
            recentNet: transactionResult.summary.recentNet,
            availableBalanceLabel: isFlagshipChildAccount.value ? '团队可用积分' : undefined,
          })
        : buildPersonalSummaryCards({
            availableBalance: Number(activeAccount.value?.availableBalance ?? 0),
            records: records.value,
            availableBalanceLabel: isFlagshipChildAccount.value ? '团队可用积分' : undefined,
          })

      if (!targetCreditsUserId) {
        creditsStore.$patch({
          accounts,
          transactions: transactionResult.items,
          accountsLoaded: true,
          transactionsLoaded: true,
          lastError: null,
        })
      }

      dataSource.value = 'api'
    } catch (error) {
      loadError.value =
        error instanceof Error ? error.message : '积分流水加载失败'
      records.value = []
      totalRecords.value = 0
      summaryCards.value = buildPersonalSummaryCards({
        availableBalance: 0,
        records: [],
        availableBalanceLabel: isFlagshipChildAccount.value ? '团队可用积分' : undefined,
      })
      dataSource.value = 'api'
    } finally {
      isLoading.value = false
    }
  }

  async function loadTeamData() {
    isLoading.value = true
    loadError.value = null

    try {
      const overview = await getEnterpriseCreditsOverview()
      teamName.value = overview.team.name
      childMembers.value = mapTeamMembers(overview.members, authStore.userInfo)
      activeAccount.value = overview.account

      if (overview.account) {
        creditsStore.$patch({
          accounts: [overview.account],
          accountsLoaded: true,
          lastError: null,
        })
      }

      if (!selectedChildId.value || !childMembers.value.some((item) => item.id === selectedChildId.value)) {
        selectedChildId.value = null
      }

      records.value = overview.transactions
        .map((transaction) =>
          mapEnterpriseCreditsTransactionToFlowRecord(transaction, authStore.userInfo?.id ?? null),
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt.replace(/-/g, '/')).getTime()
            - new Date(a.createdAt.replace(/-/g, '/')).getTime(),
        )
      totalRecords.value = records.value.length

      summaryCards.value = buildTeamSummaryCards({
        availableBalance: Number(activeAccount.value?.availableBalance ?? 0),
        records: records.value,
      })

      dataSource.value = 'api'
    } catch (error) {
      loadError.value =
        error instanceof Error ? error.message : '团队积分流水加载失败'
      records.value = []
      totalRecords.value = 0
      summaryCards.value = buildTeamSummaryCards({
        availableBalance: 0,
        records: [],
      })
      dataSource.value = 'api'
    } finally {
      isLoading.value = false
    }
  }

  async function refresh() {
    if (usesTeamDashboard.value) {
      await loadTeamData()
      return
    }

    await loadPersonalData()
  }

  function setAccountScopeMode(mode: PointsAccountScopeMode) {
    if (!showSubAccountScope.value) return
    accountScopeMode.value = mode
    if (mode === 'self') {
      selectedChildId.value = null
    } else if (!selectedChildId.value && childMembers.value.length) {
      selectedChildId.value = childMembers.value[0]?.id ?? null
    }

    if (!usesTeamDashboard.value) {
      void refresh()
    }
  }

  function selectChildAccount(childId: string) {
    if (!showSubAccountScope.value) return
    selectedChildId.value = childId
    accountScopeMode.value = childId === authStore.userInfo?.id ? 'self' : 'child'
    if (!usesTeamDashboard.value) {
      void refresh()
    }
  }

  watch(
    () => route.query.view,
    (value) => {
      version.value = resolveVersion(value)
    },
  )

  watch(version, () => {
    accountScopeMode.value = 'self'
    selectedChildId.value = null
    void refresh()
  })

  watch(showSubAccountScope, async (enabled, previousEnabled) => {
    if (!enabled) {
      accountScopeMode.value = 'self'
      selectedChildId.value = null
      childMembers.value = []
      teamName.value = ''
      return
    }

    await loadChildMembers()

    if (!previousEnabled || dataSource.value !== 'api' || loadError.value) {
      await refresh()
    }
  })

  watch(
    () => authStore.userInfo?.id,
    () => {
      if (showSubAccountScope.value) {
        void loadChildMembers()
        void refresh()
      }
    },
  )

  watch(
    () => [
      options.filters?.value.txnType ?? '',
      options.filters?.value.bizSource ?? '',
      options.filters?.value.dateRange ?? '',
      options.filters?.value.startDate ?? '',
      options.filters?.value.endDate ?? '',
      options.currentPage?.value ?? 1,
      options.pageSize?.value ?? 10,
    ],
    () => {
      if (usesLiveApi.value) {
        void refresh()
      }
    },
  )

  onMounted(async () => {
    await ensureEnterpriseIdentityReady()

    if (showSubAccountScope.value) {
      await loadChildMembers()
    }
    await refresh()
  })

  return {
    version,
    records,
    totalRecords,
    summaryCards,
    activeAccount,
    isLoading,
    loadError,
    dataSource,
    usesLiveApi,
    usesTeamDashboard,
    refresh,
    showSubAccountScope,
    accountScopeMode,
    selectedChildId,
    selectedChild,
    childMembers,
    teamName,
    setAccountScopeMode,
    selectChildAccount,
  }
}
