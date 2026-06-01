<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { NButton, NModal, NSpin } from 'naive-ui'

import { useAppStore } from '@/stores/app'
import { usePointsStore } from '@/stores/points'
import { useRechargeStore } from '@/stores/recharge'
import { useSubscriptionStore } from '@/stores/subscription'
import { subscriptionPlans } from '@/mock/mock-subscription'
import type { SubscriptionPlanCode } from '@/types/subscription'

const appStore = useAppStore()
const pointsStore = usePointsStore()
const subscriptionStore = useSubscriptionStore()
const rechargeStore = useRechargeStore()
const selectedPlan = ref<SubscriptionPlanCode>('team')
const pollingTimer = ref<ReturnType<typeof window.setInterval> | null>(null)
const showQrModal = ref(false)
const orderReady = ref(false)

onMounted(async () => {
  await subscriptionStore.hydrate()
  await pointsStore.hydrate()
  await rechargeStore.hydrate()
})

onBeforeUnmount(() => {
  stopPolling()
})

const plans = computed(() => Object.values(subscriptionPlans))

function stopPolling() {
  if (pollingTimer.value !== null) {
    window.clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }
}

async function startRecharge() {
  stopPolling()
  orderReady.value = false
  await rechargeStore.createRechargeOrder(selectedPlan.value)
  showQrModal.value = true
  pollingTimer.value = window.setInterval(async () => {
    const result = await rechargeStore.pollActiveOrder()
    if (result?.status === 'success' || result?.status === 'failed') {
      stopPolling()
      orderReady.value = result.status === 'success'
      await subscriptionStore.hydrate()
      await pointsStore.hydrate()
    }
  }, 3000)
}

const activePlan = computed(
  () => subscriptionPlans[selectedPlan.value],
)

const rechargeStatusText = computed(() => {
  if (rechargeStore.activeOrderStatus === 'success') return '支付成功'
  if (rechargeStore.activeOrderStatus === 'failed') return '支付失败'
  if (rechargeStore.activeOrderStatus === 'pending') return '支付处理中，请等待结果'
  return '待创建订单'
})
</script>

<template>
  <main class="recharge-page" :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'">
    <section class="recharge-shell">
      <header class="recharge-head">
        <div>
          <p class="eyebrow">充值中心</p>
          <h1>选择套餐并生成支付二维码</h1>
          <span>10 秒后自动成功，支付成功后自动刷新套餐与积分。</span>
        </div>
      </header>

      <section class="recharge-grid">
        <article
          v-for="plan in plans"
          :key="plan.plan"
          class="plan-card"
          :class="{ selected: selectedPlan === plan.plan }"
          @click="selectedPlan = plan.plan"
        >
          <div class="plan-top">
            <strong>{{ plan.name }}</strong>
            <span>￥{{ plan.price }}</span>
          </div>
          <p>{{ plan.accountLimit }} 账号 / 后台并发 {{ plan.concurrentTaskLimit }} 个生成请求 / 赠送 {{ plan.giftPoints }} 积分</p>
        </article>
      </section>

      <section class="recharge-panel">
        <div class="qrcode-box">
          <div class="placeholder">
            <Icon icon="mdi:qrcode" />
            <span>点击创建订单后显示二维码弹窗</span>
          </div>
        </div>

        <div class="recharge-actions">
          <div>
            <p>当前订单状态</p>
            <strong>{{ rechargeStatusText }}</strong>
          </div>
          <NButton type="primary" size="large" @click="startRecharge">创建订单并开始轮询</NButton>
        </div>
      </section>
    </section>

    <NModal v-model:show="showQrModal" preset="card" title="支付二维码" :mask-closable="false">
      <div class="qr-modal">
        <div class="qr-preview">
          <img v-if="rechargeStore.qrCodeUrl" :src="rechargeStore.qrCodeUrl" alt="支付二维码" />
          <NSpin v-else size="large" />
        </div>
        <div class="qr-meta">
          <strong>{{ activePlan.name }}</strong>
          <p>{{ activePlan.price }} · 赠送 {{ activePlan.giftPoints }} 积分</p>
          <span>状态：{{ rechargeStatusText }}</span>
          <span>系统将每 3 秒轮询一次，约 10 秒后自动成功。</span>
        </div>
        <div class="qr-actions">
          <NButton secondary @click="showQrModal = false">关闭</NButton>
          <NButton type="primary" @click="showQrModal = false">我已支付</NButton>
        </div>
      </div>
    </NModal>
  </main>
</template>

<style scoped lang="scss">
.recharge-page {
  min-height: calc(100dvh - var(--app-header-offset));
  padding: clamp(16px, 2vw, 24px);
  background: var(--app-bg);
  color: var(--app-text);
}
.recharge-shell { max-width: 1400px; margin: 0 auto; display: grid; gap: 18px; }
.recharge-head h1 { margin: 0; font-size: 32px; font-weight: 900; }
.recharge-head .eyebrow { margin: 0 0 8px; color: var(--color-brand-primary); font-weight: 900; }
.recharge-head span { color: var(--app-text-soft); }
.recharge-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.plan-card, .recharge-panel { border: 1px solid var(--app-border); border-radius: var(--radius-card); background: var(--app-surface); box-shadow: var(--shadow-panel); }
.plan-card { padding: 16px; cursor: pointer; transition: .2s ease; }
.plan-card.selected { border-color: var(--color-brand-primary); box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-brand-primary) 18%, transparent), var(--shadow-panel); }
.plan-top { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.plan-top strong { font-size: 18px; }
.plan-top span { color: var(--color-brand-primary); font-weight: 900; }
.plan-card p { margin: 10px 0 0; color: var(--app-text-soft); }
.recharge-panel { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 18px; padding: 18px; align-items: center; }
.qrcode-box { min-height: 240px; display: grid; place-items: center; border-radius: 14px; border: 1px solid var(--app-border); background: var(--app-surface-soft); overflow: hidden; }
.qrcode-box img { width: 220px; height: 220px; object-fit: contain; }
.placeholder { display: grid; place-items: center; gap: 10px; color: var(--app-text-soft); }
.placeholder .iconify { font-size: 54px; color: var(--color-brand-primary); }
.recharge-actions { display: grid; gap: 14px; align-content: center; }
.recharge-actions p { margin: 0; color: var(--app-text-soft); }
.recharge-actions strong { font-size: 28px; font-weight: 900; text-transform: uppercase; }
.qr-modal { display: grid; gap: 14px; min-width: min(86vw, 520px); }
.qr-preview { display: grid; place-items: center; min-height: 240px; border: 1px solid var(--app-border); border-radius: 14px; background: var(--app-surface-soft); }
.qr-preview img { width: 220px; height: 220px; object-fit: contain; }
.qr-meta { display: grid; gap: 6px; }
.qr-meta strong { font-size: 20px; font-weight: 900; }
.qr-meta p, .qr-meta span { margin: 0; color: var(--app-text-soft); font-size: 13px; line-height: 1.6; }
.qr-actions { display: flex; justify-content: flex-end; gap: 10px; }
@media (max-width: 1100px) { .recharge-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .recharge-panel { grid-template-columns: 1fr; } }
@media (max-width: 700px) { .recharge-grid { grid-template-columns: 1fr; } }
</style>
