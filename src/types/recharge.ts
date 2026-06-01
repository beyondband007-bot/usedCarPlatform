import type { SubscriptionPlanCode } from './subscription'

export type PayStatus = 'pending' | 'success' | 'failed'

export interface RechargeOrder {
  orderId: string
  plan: SubscriptionPlanCode
  amount: number
  giftPoints: number
  status: PayStatus
  createdAt: string
  paidAt?: string
}

export interface CreateOrderRequest {
  plan: SubscriptionPlanCode
}
