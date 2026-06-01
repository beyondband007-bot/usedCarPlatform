import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  getCreditAccounts,
  getCreditTransactions,
  getRechargeProducts,
  type CreditAccount,
  type CreditTransaction,
  type RechargeProduct,
} from '@/api/visual-workbench'
import { getCreditsIdentity } from '@/utils/credits-identity'

export const useCreditsStore = defineStore('credits', () => {
  const accounts = ref<CreditAccount[]>([])
  const transactions = ref<CreditTransaction[]>([])
  const rechargeProducts = ref<RechargeProduct[]>([])

  const isLoadingAccounts = ref(false)
  const isLoadingTransactions = ref(false)
  const isLoadingProducts = ref(false)

  const accountsLoaded = ref(false)
  const transactionsLoaded = ref(false)
  const productsLoaded = ref(false)

  const lastError = ref<string | null>(null)

  const activeAccount = computed<CreditAccount | null>(() => {
    const identity = getCreditsIdentity()
    const matched = accounts.value.find(
      (account) => String(account.userId) === String(identity.userId)
        && account.accountScope === identity.accountScope,
    )
    return matched ?? accounts.value[0] ?? null
  })

  const availableBalance = computed(() => Number(activeAccount.value?.availableBalance ?? 0))
  const lockedBalance = computed(() => Number(activeAccount.value?.lockedBalance ?? 0))
  const totalBalance = computed(() => Number(activeAccount.value?.totalBalance ?? 0))

  async function hydrateAccounts(force = false) {
    if (!force && accountsLoaded.value) return
    isLoadingAccounts.value = true
    try {
      const result = await getCreditAccounts()
      accounts.value = result.accounts
      accountsLoaded.value = true
      lastError.value = null
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : '积分账户加载失败'
    } finally {
      isLoadingAccounts.value = false
    }
  }

  async function loadTransactions(params?: { page?: number; pageSize?: number }) {
    isLoadingTransactions.value = true
    try {
      const result = await getCreditTransactions({
        limit: params?.pageSize ?? 50,
      })
      transactions.value = result.transactions
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
      const result = await getRechargeProducts()
      rechargeProducts.value = result.products
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
