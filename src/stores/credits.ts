import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  getCreditsAccounts,
  getCreditsTransactions,
  getRechargeProducts,
  type CreditsAccount,
  type CreditsTransaction,
  type RechargeProduct,
} from '@/api/visual-workbench'
import { getCreditsIdentity } from '@/utils/credits-identity'

export const useCreditsStore = defineStore('credits', () => {
  const accounts = ref<CreditsAccount[]>([])
  const transactions = ref<CreditsTransaction[]>([])
  const rechargeProducts = ref<RechargeProduct[]>([])

  const isLoadingAccounts = ref(false)
  const isLoadingTransactions = ref(false)
  const isLoadingProducts = ref(false)

  const accountsLoaded = ref(false)
  const transactionsLoaded = ref(false)
  const productsLoaded = ref(false)

  const lastError = ref<string | null>(null)

  const activeAccount = computed<CreditsAccount | null>(() => {
    const identity = getCreditsIdentity()
    const matched = accounts.value.find(
      (account) => String(account.userId) === String(identity.userId)
        && account.accountScope === identity.accountScope,
    )
    return matched ?? accounts.value[0] ?? null
  })

  const availableBalance = computed(() => activeAccount.value?.availableBalance ?? 0)
  const lockedBalance = computed(() => activeAccount.value?.lockedBalance ?? 0)
  const totalBalance = computed(() => activeAccount.value?.totalBalance ?? 0)

  async function hydrateAccounts(force = false) {
    if (!force && accountsLoaded.value) return
    isLoadingAccounts.value = true
    try {
      accounts.value = await getCreditsAccounts()
      accountsLoaded.value = true
      lastError.value = null
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '积分账户加载失败'
    } finally {
      isLoadingAccounts.value = false
    }
  }

  async function loadTransactions(params?: { limit?: number }) {
    isLoadingTransactions.value = true
    try {
      const result = await getCreditsTransactions({
        limit: params?.limit ?? 50,
      })
      transactions.value = result.items
      transactionsLoaded.value = true
      lastError.value = null
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '积分流水加载失败'
    } finally {
      isLoadingTransactions.value = false
    }
  }

  async function hydrateRechargeProducts(force = false) {
    if (!force && productsLoaded.value) return
    isLoadingProducts.value = true
    try {
      rechargeProducts.value = await getRechargeProducts()
      productsLoaded.value = true
      lastError.value = null
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '充值产品加载失败'
    } finally {
      isLoadingProducts.value = false
    }
  }

  function reset() {
    accounts.value = []
    transactions.value = []
    rechargeProducts.value = []
    accountsLoaded.value = false
    transactionsLoaded.value = false
    productsLoaded.value = false
    lastError.value = null
  }

  return {
    accounts,
    transactions,
    rechargeProducts,
    isLoadingAccounts,
    isLoadingTransactions,
    isLoadingProducts,
    accountsLoaded,
    transactionsLoaded,
    productsLoaded,
    lastError,
    activeAccount,
    availableBalance,
    lockedBalance,
    totalBalance,
    hydrateAccounts,
    loadTransactions,
    hydrateRechargeProducts,
    reset,
  }
})
