import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { addRechargePoints, consumePoints, getPointRecords, getPoints } from '@/mock/mock-points'
import type { PointRecord, PointsSummary } from '@/types/points'

import { useSubscriptionStore } from './subscription'

export const usePointsStore = defineStore('points', () => {
  const summary = ref<PointsSummary>({
    currentPoints: 0,
    freezePoints: 0,
    totalConsume: 0,
    totalRecharge: 0,
    currentRunningTasks: 0,
  })
  const records = ref<PointRecord[]>([])
  const initialized = ref(false)

  const remainingTasks = computed(() => {
    const subscriptionStore = useSubscriptionStore()
    return Math.max(0, subscriptionStore.concurrentTaskLimit - summary.value.currentRunningTasks)
  })

  async function hydrate() {
    if (initialized.value) return
    initialized.value = true
    summary.value = await getPoints()
    records.value = await getPointRecords()
  }

  async function applyRecharge(input: { amount: number; points: number; title: string }) {
    const result = await addRechargePoints(input)
    summary.value = result.summary
    records.value = result.records
  }

  async function applyConsume(input: { points: number; title: string; remark?: string }) {
    const result = await consumePoints(input)
    summary.value = result.summary
    records.value = result.records
    return result
  }

  function setRunningTasks(count: number) {
    summary.value.currentRunningTasks = count
  }

  return {
    summary,
    records,
    initialized,
    remainingTasks,
    hydrate,
    applyRecharge,
    applyConsume,
    setRunningTasks,
  }
})
