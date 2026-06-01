import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { checkPayStatus, createOrder, getPayQRCode, getRechargeRecords } from '@/mock/mock-recharge'
import type { PayStatus, RechargeOrder } from '@/types/recharge'
import type { SubscriptionPlanCode } from '@/types/subscription'

import { usePointsStore } from './points'
import { useSubscriptionStore } from './subscription'

export const useRechargeStore = defineStore('recharge', () => {
  const orders = ref<RechargeOrder[]>([])
  const activeOrder = ref<RechargeOrder | null>(null)
  const qrCodeUrl = ref('')
  const polling = ref(false)

  const activeOrderStatus = computed<PayStatus | null>(() => activeOrder.value?.status ?? null)

  async function hydrate() {
    orders.value = await getRechargeRecords()
  }

  async function createRechargeOrder(plan: SubscriptionPlanCode) {
    activeOrder.value = await createOrder({ plan })
    orders.value = [activeOrder.value, ...orders.value.filter((item) => item.orderId !== activeOrder.value?.orderId)]
    const qr = await getPayQRCode(activeOrder.value.orderId)
    qrCodeUrl.value = qr.qrCodeUrl
    return activeOrder.value
  }

  async function pollActiveOrder() {
    if (!activeOrder.value) return null

    polling.value = true
    const result = await checkPayStatus(activeOrder.value.orderId)
    activeOrder.value = { ...activeOrder.value, status: result.status }
    orders.value = orders.value.map((item) =>
      item.orderId === activeOrder.value?.orderId ? { ...item, status: result.status } : item,
    )
    if (result.status === 'success') {
      const pointsStore = usePointsStore()
      const subscriptionStore = useSubscriptionStore()
      const order = activeOrder.value
      if (order) {
        await subscriptionStore.activatePlan(order.plan)
        await pointsStore.applyRecharge({
          amount: order.amount,
          points: order.giftPoints,
          title: `${order.plan} 套餐充值`,
        })
      }
    }
    polling.value = false
    return result
  }

  return {
    orders,
    activeOrder,
    qrCodeUrl,
    polling,
    activeOrderStatus,
    hydrate,
    createRechargeOrder,
    pollActiveOrder,
  }
})
