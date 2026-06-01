import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  activateSubscription,
  getSubscription,
  subscriptionPlans,
} from '@/mock/mock-subscription'
import type { SubscriptionPlanCode, SubscriptionStateSnapshot } from '@/types/subscription'

const STATE_KEY = 'ai-car-studio:subscription-state'

function readState() {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(STATE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SubscriptionStateSnapshot
  } catch {
    return null
  }
}

function writeState(value: SubscriptionStateSnapshot) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STATE_KEY, JSON.stringify(value))
}

export const useSubscriptionStore = defineStore('subscription', () => {
  const snapshot = ref<SubscriptionStateSnapshot | null>(readState())
  const initialized = ref(false)

  const currentPlan = computed(() => snapshot.value?.currentPlan ?? 'team')
  const accountLimit = computed(() => snapshot.value?.accountLimit ?? subscriptionPlans.team.accountLimit)
  const concurrentTaskLimit = computed(
    () => snapshot.value?.concurrentTaskLimit ?? subscriptionPlans.team.concurrentTaskLimit,
  )
  const giftPoints = computed(() => snapshot.value?.giftPoints ?? subscriptionPlans.team.giftPoints)
  const expireTime = computed(() => snapshot.value?.expireTime ?? '')

  async function hydrate() {
    if (initialized.value) return
    initialized.value = true
    snapshot.value = await getSubscription()
    if (snapshot.value) writeState(snapshot.value)
  }

  async function activatePlan(plan: SubscriptionPlanCode) {
    snapshot.value = await activateSubscription(plan)
    writeState(snapshot.value)
    return snapshot.value
  }

  function applySubscriptionSnapshot(next: SubscriptionStateSnapshot) {
    snapshot.value = next
    writeState(next)
  }

  return {
    snapshot,
    initialized,
    currentPlan,
    accountLimit,
    concurrentTaskLimit,
    giftPoints,
    expireTime,
    hydrate,
    activatePlan,
    applySubscriptionSnapshot,
  }
})
