<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { NModal, useMessage } from "naive-ui";
import { computed, onBeforeUnmount, ref, watch } from "vue";

import {
  createRechargeOrder,
  syncRechargeOrder,
  type CreditsPayChannel,
} from "@/api/visual-workbench";
import {
  calcPointsFromAmount,
  createLocalRechargeOrder,
  pointsRechargePresets,
  type PointsRechargeOrderItem,
} from "@/constants/points-recharge";
import { useAppStore } from "@/stores/app";
import { useCreditsStore } from "@/stores/credits";

const PAYMENT_EXPIRES_SECONDS = 3 * 60;
const PAYMENT_POLL_INTERVAL_MS = 5000;

const props = defineProps<{ show: boolean }>();

const emit = defineEmits<{
  "update:show": [value: boolean];
  success: [];
}>();

const appStore = useAppStore();
const creditsStore = useCreditsStore();
const message = useMessage();

const selectedAmount = ref(pointsRechargePresets[0].amount);
const customAmount = ref(String(pointsRechargePresets[0].amount));
const selectedPayChannel =
  ref<Extract<CreditsPayChannel, "alipay" | "wechat">>("alipay");
const isCreating = ref(false);
const showPaymentCode = ref(false);
const paymentSecondsLeft = ref(PAYMENT_EXPIRES_SECONDS);
const activePaymentOrderId = ref<number | string | null>(null);
const activePaymentOrder = ref<PointsRechargeOrderItem | null>(null);
const qrCodeUrl = ref("");

let paymentPollTimer: ReturnType<typeof setInterval> | null = null;
let paymentCountdownTimer: ReturnType<typeof setInterval> | null = null;

const modalThemeClass = computed(() =>
  appStore.isDarkMode
    ? "points-recharge-modal--dark"
    : "points-recharge-modal--light",
);

const activeAmount = computed(() => {
  const parsed = Number.parseInt(customAmount.value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return selectedAmount.value;
  return parsed;
});

const activePoints = computed(() => calcPointsFromAmount(activeAmount.value));
const balanceLabel = computed(() =>
  creditsStore.availableBalance.toLocaleString("zh-CN"),
);
const customCardActive = computed(
  () => !pointsRechargePresets.some((preset) => preset.amount === activeAmount.value),
);
const paymentChannelName = computed(() =>
  selectedPayChannel.value === "alipay" ? "支付宝" : "微信支付",
);
const paymentChannelIcon = computed(() =>
  selectedPayChannel.value === "alipay" ? "ri:alipay-fill" : "ri:wechat-fill",
);
const countdownLabel = computed(() => {
  const minutes = Math.floor(paymentSecondsLeft.value / 60);
  const seconds = paymentSecondsLeft.value % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
});

watch(
  () => props.show,
  (visible) => {
    if (!visible) return;
    selectedAmount.value = pointsRechargePresets[0].amount;
    customAmount.value = String(pointsRechargePresets[0].amount);
    selectedPayChannel.value = "alipay";
    void creditsStore.hydrateRechargeProducts(true);
    void creditsStore.hydrateAccounts();
  },
);

onBeforeUnmount(stopPaymentTimers);

function stopPaymentTimers() {
  if (paymentPollTimer) clearInterval(paymentPollTimer);
  if (paymentCountdownTimer) clearInterval(paymentCountdownTimer);
  paymentPollTimer = null;
  paymentCountdownTimer = null;
}

function closeRechargeModal() {
  emit("update:show", false);
}

function closePaymentCode() {
  stopPaymentTimers();
  showPaymentCode.value = false;
  activePaymentOrderId.value = null;
  activePaymentOrder.value = null;
  qrCodeUrl.value = "";
}

function selectPreset(amount: number) {
  selectedAmount.value = amount;
  customAmount.value = String(amount);
}

function activateCustomAmount() {
  if (!customAmount.value) customAmount.value = String(activeAmount.value);
}

function handleCustomInput(event: Event) {
  const value = (event.target as HTMLInputElement).value.replace(/\D/g, "");
  customAmount.value = value;
  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed > 0) selectedAmount.value = parsed;
}

function resolveProductId(amountYuan: number) {
  const amountCents = Math.round(amountYuan * 100);
  return creditsStore.rechargeProducts.find((product) => {
    if (typeof product.priceCents === "number") return product.priceCents === amountCents;
    const priceText = product.priceText?.replace(/[^\d.]/g, "");
    return Math.round(Number(priceText) * 100) === amountCents;
  })?.id;
}

function startPaymentTimers() {
  stopPaymentTimers();
  paymentSecondsLeft.value = PAYMENT_EXPIRES_SECONDS;

  paymentCountdownTimer = setInterval(() => {
    paymentSecondsLeft.value -= 1;
    if (paymentSecondsLeft.value > 0) return;
    closePaymentCode();
    message.warning("订单码已过期，请重新发起支付");
  }, 1000);

  paymentPollTimer = setInterval(() => void pollPaymentStatus(), PAYMENT_POLL_INTERVAL_MS);
}

async function pollPaymentStatus() {
  if (!activePaymentOrderId.value || !activePaymentOrder.value) return;

  try {
    const order = await syncRechargeOrder(activePaymentOrderId.value);
    if (order.status === "paid") {
      activePaymentOrder.value.status = "paid";
      stopPaymentTimers();
      showPaymentCode.value = false;
      message.success("支付成功，积分已到账");
      emit("success");
      void creditsStore.hydrateAccounts(true);
      return;
    }

    if (order.status === "failed" || order.status === "refunded") {
      activePaymentOrder.value.status = "failed";
      stopPaymentTimers();
      showPaymentCode.value = false;
      message.error("支付未完成，请重新发起支付");
    }
  } catch {
    // 短暂网络波动时保留订单码，下一轮继续查询。
  }
}

async function handlePayNow() {
  if (isCreating.value) return;
  if (activeAmount.value < 1) {
    message.warning("请输入有效充值金额");
    return;
  }

  if (!creditsStore.productsLoaded || creditsStore.isLoadingProducts) {
    await creditsStore.hydrateRechargeProducts(true);
  }

  const productId = resolveProductId(activeAmount.value);
  if (!productId) {
    message.warning("充值套餐加载失败，请稍后重试");
    return;
  }

  isCreating.value = true;
  try {
    const order = await createRechargeOrder({
      productId,
      payChannel: selectedPayChannel.value,
    });
    if (!order.qrCodeUrl) throw new Error("支付平台未返回有效订单码");

    const displayOrder = createLocalRechargeOrder(activeAmount.value);
    displayOrder.orderNo = order.orderNo;
    activePaymentOrderId.value = order.id;
    activePaymentOrder.value = displayOrder;
    qrCodeUrl.value = order.qrCodeUrl;

    closeRechargeModal();
    showPaymentCode.value = true;
    startPaymentTimers();
  } catch (error) {
    message.error(error instanceof Error ? error.message : "创建支付订单失败");
  } finally {
    isCreating.value = false;
  }
}
</script>

<template>
  <NModal
    :show="show"
    :mask-closable="true"
    transform-origin="center"
    @update:show="emit('update:show', $event)"
  >
    <div
      class="points-recharge-modal"
      :class="modalThemeClass"
      role="dialog"
      aria-labelledby="points-recharge-modal-title"
    >
      <button
        type="button"
        class="points-recharge-modal__close"
        aria-label="关闭"
        @click="closeRechargeModal"
      >
        <Icon icon="mdi:close" />
      </button>

      <header class="points-recharge-modal__topbar">
        <div>
          <h2 id="points-recharge-modal-title">积分充值</h2>
          <p>选择充值金额与支付方式</p>
        </div>
        <div class="points-recharge-modal__balance">
          <span>积分余额</span>
          <strong>{{ balanceLabel }}</strong>
        </div>
      </header>

      <section class="points-recharge-modal__section">
        <div class="points-recharge-modal__presets">
          <button
            v-for="preset in pointsRechargePresets"
            :key="preset.amount"
            type="button"
            class="points-recharge-modal__preset"
            :class="{ 'is-active': selectedAmount === preset.amount }"
            @click="selectPreset(preset.amount)"
          >
            <strong>{{ preset.amount }}元</strong>
            <span>{{ preset.points.toLocaleString("zh-CN") }}积分</span>
          </button>

          <button
            type="button"
            class="points-recharge-modal__preset points-recharge-modal__preset--custom"
            :class="{ 'is-active': customCardActive }"
            @click="activateCustomAmount"
          >
            <strong>自定义金额</strong>
            <span>{{ activePoints.toLocaleString("zh-CN") }}积分</span>
          </button>
        </div>

        <div class="points-recharge-modal__custom">
          <label for="points-recharge-custom-amount">输入自定义金额</label>
          <div class="points-recharge-modal__custom-row">
            <div class="points-recharge-modal__amount-input">
              <span>¥</span>
              <input
                id="points-recharge-custom-amount"
                :value="customAmount"
                inputmode="numeric"
                autocomplete="off"
                placeholder="请输入充值金额"
                @input="handleCustomInput"
              />
            </div>
            <strong>{{ activePoints.toLocaleString("zh-CN") }}积分</strong>
          </div>
        </div>
      </section>

      <section class="points-recharge-modal__payment-section">
        <h3>支付方式</h3>
        <div class="points-recharge-modal__payment-options">
          <button
            type="button"
            class="points-recharge-modal__payment-option is-alipay"
            :class="{ 'is-active': selectedPayChannel === 'alipay' }"
            @click="selectedPayChannel = 'alipay'"
          >
            <span class="points-recharge-modal__payment-icon">
              <Icon icon="ri:alipay-fill" />
            </span>
            <span>
              <strong>支付宝支付</strong>
              <small>使用支付宝扫码完成支付</small>
            </span>
            <Icon
              class="points-recharge-modal__payment-check"
              :icon="
                selectedPayChannel === 'alipay'
                  ? 'mdi:check-circle'
                  : 'mdi:circle-outline'
              "
            />
          </button>

          <button
            type="button"
            class="points-recharge-modal__payment-option is-wechat"
            :class="{ 'is-active': selectedPayChannel === 'wechat' }"
            @click="selectedPayChannel = 'wechat'"
          >
            <span class="points-recharge-modal__payment-icon">
              <Icon icon="ri:wechat-fill" />
            </span>
            <span>
              <strong>微信支付</strong>
              <small>使用微信扫码完成支付</small>
            </span>
            <Icon
              class="points-recharge-modal__payment-check"
              :icon="
                selectedPayChannel === 'wechat'
                  ? 'mdi:check-circle'
                  : 'mdi:circle-outline'
              "
            />
          </button>
        </div>
      </section>

      <footer class="points-recharge-modal__footer">
        <p>充值积分不支持提现、转赠或兑换现金。</p>
        <button
          type="button"
          class="points-recharge-modal__submit"
          :disabled="isCreating || creditsStore.isLoadingProducts"
          @click="handlePayNow"
        >
          <Icon v-if="isCreating" icon="mdi:loading" class="is-spinning" />
          <Icon v-else :icon="paymentChannelIcon" />
          {{
            creditsStore.isLoadingProducts
              ? "正在加载充值套餐..."
              : isCreating
                ? "正在创建订单..."
                : `立即支付 ¥${activeAmount}`
          }}
        </button>
      </footer>
    </div>
  </NModal>

  <NModal
    :show="showPaymentCode"
    :mask-closable="false"
    transform-origin="center"
    @update:show="!$event && closePaymentCode()"
  >
    <div
      class="payment-code-modal"
      :class="[modalThemeClass, `payment-code-modal--${selectedPayChannel}`]"
      role="dialog"
      aria-labelledby="payment-code-modal-title"
    >
      <button
        type="button"
        class="payment-code-modal__close"
        aria-label="关闭订单码"
        @click="closePaymentCode"
      >
        <Icon icon="mdi:close" />
      </button>

      <header class="payment-code-modal__header">
        <span class="payment-code-modal__brand-icon">
          <Icon :icon="paymentChannelIcon" />
        </span>
        <div>
          <h2 id="payment-code-modal-title">{{ paymentChannelName }}订单码</h2>
          <p>请使用{{ paymentChannelName }}扫描二维码完成支付</p>
        </div>
      </header>

      <div class="payment-code-modal__countdown">
        <span>订单码有效时间</span>
        <strong>{{ countdownLabel }}</strong>
      </div>

      <div class="payment-code-modal__qr-frame">
        <img :src="qrCodeUrl" alt="真实支付订单二维码" />
        <span class="payment-code-modal__qr-logo">
          <Icon :icon="paymentChannelIcon" />
        </span>
      </div>

      <div class="payment-code-modal__amount">
        <span>支付金额</span>
        <strong>¥{{ activePaymentOrder?.amountYuan.toFixed(2) }}</strong>
        <small>到账 {{ activePaymentOrder?.points.toLocaleString("zh-CN") }} 积分</small>
      </div>

      <div class="payment-code-modal__order">
        <span>订单号</span>
        <strong>{{ activePaymentOrder?.orderNo }}</strong>
      </div>

      <p class="payment-code-modal__status">
        <span />
        正在等待支付结果，请勿关闭页面
      </p>
    </div>
  </NModal>
</template>

<style scoped lang="scss">
.points-recharge-modal,
.payment-code-modal {
  --prm-bg: rgba(255, 255, 255, 0.98);
  --prm-panel: #ffffff;
  --prm-panel-soft: #f7f7f8;
  --prm-border: rgba(15, 23, 42, 0.1);
  --prm-border-strong: rgba(15, 23, 42, 0.2);
  --prm-text: #171717;
  --prm-muted: #747474;
  --prm-accent: #f3c543;
  --prm-accent-strong: #d0a42a;
  --prm-accent-soft: rgba(243, 197, 67, 0.13);
  --prm-shadow: 0 28px 80px rgba(15, 23, 42, 0.2);
  color: var(--prm-text);
  font-family: "PingFang SC", "Microsoft YaHei", "Helvetica Neue", sans-serif;
}

.points-recharge-modal--dark {
  --prm-bg: rgba(24, 24, 24, 0.98);
  --prm-panel: #222222;
  --prm-panel-soft: #1c1c1c;
  --prm-border: rgba(255, 255, 255, 0.08);
  --prm-border-strong: rgba(243, 197, 67, 0.62);
  --prm-text: #f4f4f4;
  --prm-muted: rgba(255, 255, 255, 0.56);
  --prm-accent: #f3c543;
  --prm-accent-strong: #f6cf5c;
  --prm-accent-soft: rgba(243, 197, 67, 0.1);
  --prm-shadow: 0 30px 90px rgba(0, 0, 0, 0.56);
}

.points-recharge-modal {
  position: relative;
  width: min(760px, calc(100vw - 32px));
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 26px;
  border: 1px solid var(--prm-border);
  border-radius: 18px;
  background: var(--prm-bg);
  box-shadow: var(--prm-shadow);
}

.points-recharge-modal__close,
.payment-code-modal__close {
  position: absolute;
  z-index: 2;
  top: 22px;
  right: 22px;
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 999px;
  background: var(--prm-accent);
  color: #171717;
  cursor: pointer;
  font-size: 18px;
  transition: transform 0.2s ease, filter 0.2s ease;
}

.points-recharge-modal__close:hover,
.payment-code-modal__close:hover {
  filter: brightness(1.04);
  transform: rotate(90deg);
}

.points-recharge-modal__topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding-right: 52px;
  margin-bottom: 22px;
}

.points-recharge-modal__topbar h2,
.payment-code-modal__header h2 {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
}

.points-recharge-modal__topbar p,
.payment-code-modal__header p {
  margin: 6px 0 0;
  color: var(--prm-muted);
  font-size: 12px;
}

.points-recharge-modal__balance {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 13px;
  border-radius: 999px;
  background: var(--prm-panel-soft);
  font-size: 12px;
  white-space: nowrap;
}

.points-recharge-modal__balance span {
  color: var(--prm-muted);
}

.points-recharge-modal__balance strong {
  font-size: 14px;
}

.points-recharge-modal__section {
  padding-bottom: 20px;
  border-bottom: 1px solid var(--prm-border);
}

.points-recharge-modal__presets {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.points-recharge-modal__preset {
  display: flex;
  min-height: 72px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border: 1px solid var(--prm-border);
  border-radius: 10px;
  background: var(--prm-panel);
  color: var(--prm-text);
  cursor: pointer;
  font-family: inherit;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;
}

.points-recharge-modal__preset:hover {
  border-color: var(--prm-border-strong);
  transform: translateY(-1px);
}

.points-recharge-modal__preset.is-active {
  border-color: var(--prm-accent-strong);
  background: var(--prm-accent-soft);
  box-shadow: inset 0 0 0 1px rgba(243, 197, 67, 0.18);
}

.points-recharge-modal__preset strong {
  font-size: 18px;
}

.points-recharge-modal__preset span {
  color: var(--prm-muted);
  font-size: 11px;
  font-weight: 600;
}

.points-recharge-modal__preset--custom strong {
  font-size: 15px;
}

.points-recharge-modal__custom {
  margin-top: 14px;
}

.points-recharge-modal__custom label,
.points-recharge-modal__payment-section h3 {
  display: block;
  margin: 0 0 9px;
  font-size: 12px;
  font-weight: 700;
}

.points-recharge-modal__custom-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.points-recharge-modal__amount-input {
  display: flex;
  flex: 1;
  height: 44px;
  align-items: center;
  padding: 0 13px;
  border: 1px solid var(--prm-border);
  border-radius: 10px;
  background: var(--prm-panel);
}

.points-recharge-modal__amount-input:focus-within {
  border-color: var(--prm-accent-strong);
  box-shadow: 0 0 0 3px var(--prm-accent-soft);
}

.points-recharge-modal__amount-input span {
  color: var(--prm-muted);
  font-size: 16px;
}

.points-recharge-modal__amount-input input {
  width: 100%;
  min-width: 0;
  padding: 0 9px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--prm-text);
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
}

.points-recharge-modal__custom-row > strong {
  color: var(--prm-accent-strong);
  font-size: 14px;
  white-space: nowrap;
}

.points-recharge-modal__payment-section {
  padding: 20px 0;
  border-bottom: 1px solid var(--prm-border);
}

.points-recharge-modal__payment-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.points-recharge-modal__payment-option {
  display: grid;
  grid-template-columns: 42px 1fr 20px;
  align-items: center;
  gap: 11px;
  min-height: 68px;
  padding: 11px 13px;
  border: 1px solid var(--prm-border);
  border-radius: 11px;
  background: var(--prm-panel);
  color: var(--prm-text);
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.points-recharge-modal__payment-option.is-active {
  border-color: var(--prm-accent-strong);
  background: var(--prm-accent-soft);
}

.points-recharge-modal__payment-icon {
  display: inline-flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #ffffff;
  font-size: 27px;
}

.is-alipay .points-recharge-modal__payment-icon {
  color: #1677ff;
}

.is-wechat .points-recharge-modal__payment-icon {
  color: #07c160;
}

.points-recharge-modal__payment-option > span:nth-child(2) {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.points-recharge-modal__payment-option strong {
  font-size: 13px;
}

.points-recharge-modal__payment-option small {
  color: var(--prm-muted);
  font-size: 10px;
}

.points-recharge-modal__payment-check {
  color: var(--prm-accent-strong);
  font-size: 19px;
}

.points-recharge-modal__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding-top: 20px;
}

.points-recharge-modal__footer p {
  margin: 0;
  color: var(--prm-muted);
  font-size: 10px;
}

.points-recharge-modal__submit {
  display: inline-flex;
  min-width: 210px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 18px;
  border: none;
  border-radius: 10px;
  background: var(--prm-accent);
  color: #171717;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  transition: filter 0.2s ease, transform 0.2s ease;
}

.points-recharge-modal__submit:hover:not(:disabled) {
  filter: brightness(1.04);
  transform: translateY(-1px);
}

.points-recharge-modal__submit:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.is-spinning {
  animation: payment-spin 0.8s linear infinite;
}

.payment-code-modal {
  position: relative;
  width: min(390px, calc(100vw - 32px));
  padding: 26px;
  border: 1px solid var(--prm-border);
  border-radius: 18px;
  background: var(--prm-bg);
  box-shadow: var(--prm-shadow);
}

.payment-code-modal__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-right: 42px;
}

.payment-code-modal__brand-icon {
  display: inline-flex;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #ffffff;
  font-size: 30px;
}

.payment-code-modal--alipay .payment-code-modal__brand-icon,
.payment-code-modal--alipay .payment-code-modal__qr-logo {
  color: #1677ff;
}

.payment-code-modal--wechat .payment-code-modal__brand-icon,
.payment-code-modal--wechat .payment-code-modal__qr-logo {
  color: #07c160;
}

.payment-code-modal__countdown {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20px 0 15px;
  padding: 10px 13px;
  border-radius: 9px;
  background: var(--prm-accent-soft);
}

.payment-code-modal__countdown span {
  color: var(--prm-muted);
  font-size: 11px;
}

.payment-code-modal__countdown strong {
  color: var(--prm-accent-strong);
  font-size: 18px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.05em;
}

.payment-code-modal__qr-frame {
  position: relative;
  width: 224px;
  height: 224px;
  padding: 12px;
  margin: 0 auto;
  border-radius: 15px;
  background: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
}

.payment-code-modal__qr-frame img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.payment-code-modal__qr-logo {
  position: absolute;
  top: 50%;
  left: 50%;
  display: inline-flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 4px solid #ffffff;
  border-radius: 10px;
  background: #ffffff;
  font-size: 26px;
  transform: translate(-50%, -50%);
}

.payment-code-modal__amount {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 4px;
  padding: 16px 0;
}

.payment-code-modal__amount span,
.payment-code-modal__amount small,
.payment-code-modal__order span {
  color: var(--prm-muted);
  font-size: 10px;
}

.payment-code-modal__amount strong {
  font-size: 27px;
  line-height: 1.2;
}

.payment-code-modal__order {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 12px;
  border-radius: 9px;
  background: var(--prm-panel-soft);
}

.payment-code-modal__order strong {
  overflow: hidden;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.payment-code-modal__status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 15px 0 0;
  color: var(--prm-muted);
  font-size: 10px;
}

.payment-code-modal__status span {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--prm-accent);
  box-shadow: 0 0 0 4px var(--prm-accent-soft);
  animation: payment-pulse 1.6s ease-in-out infinite;
}

@keyframes payment-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes payment-pulse {
  50% {
    opacity: 0.35;
  }
}

@media (max-width: 640px) {
  .points-recharge-modal {
    padding: 22px 18px;
  }

  .points-recharge-modal__presets {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .points-recharge-modal__payment-options {
    grid-template-columns: 1fr;
  }

  .points-recharge-modal__footer {
    align-items: stretch;
    flex-direction: column;
  }

  .points-recharge-modal__submit {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .points-recharge-modal *,
  .payment-code-modal * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
