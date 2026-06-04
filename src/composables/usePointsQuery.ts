import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import {
  getCreditsAccounts,
  getCreditsTransactions,
  type CreditsAccount,
} from '@/api/visual-workbench'
import { useCreditsStore } from '@/stores/credits'
import { getCreditsIdentity } from '@/utils/credits-identity'
import {
  buildPersonalSummaryCards,
  mapCreditsTransactionToFlowRecord,
} from '@/utils/points-query-mapper'
import type {
  PointsFlowRecord,
  PointsQueryVersion,
  PointsSummaryCard,
} from '@/types/points-query'

import { memberRecords, adminRecords } from '@/constants/points-query-mock'

function resolveVersion(raw: unknown): PointsQueryVersion {
  if (raw === 'member' || raw === 'enterprise-member') return 'member'
  if (raw === 'admin' || raw === 'enterprise-admin') return 'admin'
  return 'personal'
}

export function usePointsQuery() {
  const route = useRoute()
  const creditsStore = useCreditsStore()

  const version = ref<PointsQueryVersion>(resolveVersion(route.query.view))
  const records = ref<PointsFlowRecord[]>([])
  const summaryCards = ref<PointsSummaryCard[]>([])
  const activeAccount = ref<CreditsAccount | null>(null)
  const isLoading = ref(false)
  const loadError = ref<string | null>(null)
  const dataSource = ref<'api' | 'mock'>('mock')

  const usesLiveApi = computed(() => version.value === 'personal')

  async function loadPersonalData() {
    isLoading.value = true
    loadError.value = null

    try {
      const identity = getCreditsIdentity()
      const [accounts, transactionResult] = await Promise.all([
        getCreditsAccounts(),
        getCreditsTransactions({
          limit: 100,
          accountScope: identity.accountScope,
          tenantId: identity.tenantId ?? undefined,
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

      const flowRecords = transactionResult.items.map(mapCreditsTransactionToFlowRecord)
      records.value = flowRecords.sort(
        (a, b) =>
          new Date(b.createdAt.replace(/-/g, '/')).getTime()
          - new Date(a.createdAt.replace(/-/g, '/')).getTime(),
      )

      summaryCards.value = buildPersonalSummaryCards({
        availableBalance: Number(activeAccount.value?.availableBalance ?? 0),
        records: records.value,
      })
      creditsStore.$patch({
        accounts,
        transactions: transactionResult.items,
        accountsLoaded: true,
        transactionsLoaded: true,
        lastError: null,
      })
      dataSource.value = 'api'
    } catch (error) {
      loadError.value =
        error instanceof Error ? error.message : '积分流水加载失败'
      records.value = []
      summaryCards.value = buildPersonalSummaryCards({
        availableBalance: 0,
        records: [],
      })
      dataSource.value = 'api'
    } finally {
      isLoading.value = false
    }
  }

  function loadMockData() {
    records.value = version.value === 'member' ? memberRecords : adminRecords
    dataSource.value = 'mock'
    loadError.value = null
    isLoading.value = false
  }

  async function refresh() {
    if (usesLiveApi.value) {
      await loadPersonalData()
      return
    }
    loadMockData()
  }

  watch(
    () => route.query.view,
    (value) => {
      version.value = resolveVersion(value)
    },
  )

  watch(version, () => {
    void refresh()
  })

  onMounted(() => {
    void refresh()
  })

  return {
    version,
    records,
    summaryCards,
    activeAccount,
    isLoading,
    loadError,
    dataSource,
    usesLiveApi,
    refresh,
  }
}
