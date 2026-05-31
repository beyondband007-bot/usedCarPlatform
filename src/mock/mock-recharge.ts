import type { CreateOrderRequest, PayStatus, RechargeOrder } from '@/types/recharge'

import { subscriptionPlans } from './mock-subscription'
import { mockDelay, readMockStorage, writeMockStorage } from './mock-storage'

const ORDERS_KEY = 'ai-car-studio:recharge-orders'
const SUCCESS_DELAY = 10000

function readOrders() {
  return readMockStorage<RechargeOrder[]>(ORDERS_KEY, [])
}

function writeOrders(orders: RechargeOrder[]) {
  writeMockStorage(ORDERS_KEY, orders)
}

function resolveOrderStatus(order: RechargeOrder): RechargeOrder {
  if (order.status !== 'pending') return order

  const createdAt = Date.parse(order.createdAt)
  if (Number.isFinite(createdAt) && Date.now() - createdAt >= SUCCESS_DELAY) {
    return {
      ...order,
      status: 'success',
      paidAt: new Date().toISOString(),
    }
  }

  return order
}

export async function createOrder(payload: CreateOrderRequest) {
  const plan = subscriptionPlans[payload.plan]
  const order: RechargeOrder = {
    orderId: `order_${Date.now()}`,
    plan: plan.plan,
    amount: plan.price,
    giftPoints: plan.giftPoints,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }

  writeOrders([order, ...readOrders()])
  return mockDelay(order)
}

export async function getPayQRCode(orderId: string) {
  const qrText = `AI CAR STUDIO ${orderId}`
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
      <rect width="220" height="220" rx="18" fill="#ffffff"/>
      <rect x="18" y="18" width="54" height="54" rx="8" fill="#111827"/>
      <rect x="30" y="30" width="30" height="30" rx="4" fill="#ffffff"/>
      <rect x="148" y="18" width="54" height="54" rx="8" fill="#111827"/>
      <rect x="160" y="30" width="30" height="30" rx="4" fill="#ffffff"/>
      <rect x="18" y="148" width="54" height="54" rx="8" fill="#111827"/>
      <rect x="30" y="160" width="30" height="30" rx="4" fill="#ffffff"/>
      <path d="M92 28h14v14H92zM120 28h14v14h-14zM92 58h42v14H92zM88 92h14v14H88zM116 88h14v14h-14zM144 92h14v14h-14zM172 88h14v14h-14zM88 120h28v14H88zM130 118h14v14h-14zM158 120h44v14h-44zM92 148h14v14H92zM120 148h14v14h-14zM144 146h14v14h-14zM176 148h14v14h-14zM88 176h42v14H88zM146 176h14v14h-14zM174 176h28v14h-28z" fill="#111827"/>
      <text x="110" y="112" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#2563eb">AI CAR STUDIO</text>
      <text x="110" y="208" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="#64748b">${qrText}</text>
    </svg>`
  const qrCodeUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  return mockDelay({
    orderId,
    qrCodeUrl,
  })
}

export async function checkPayStatus(orderId: string): Promise<{ orderId: string; status: PayStatus }> {
  const orders = readOrders()
  const index = orders.findIndex((item) => item.orderId === orderId)
  if (index < 0) throw new Error('订单不存在')

  const resolved = resolveOrderStatus(orders[index])
  if (resolved !== orders[index]) {
    orders[index] = resolved
    writeOrders(orders)
  }

  return mockDelay({ orderId, status: resolved.status })
}

export async function getRechargeRecords() {
  const resolved = readOrders().map(resolveOrderStatus)
  writeOrders(resolved)
  return mockDelay(resolved)
}
