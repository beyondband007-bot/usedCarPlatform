<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { NModal, useMessage } from "naive-ui";
import { computed, ref, watch } from "vue";

import { createRechargeOrder } from "@/api/visual-workbench";
import {
  calcPointsFromAmount,
  createLocalRechargeOrder,
  defaultRecentRechargeOrders,
  pointsRechargePresets,
  type PointsRechargeOrderItem,
} from "@/constants/points-recharge";
import { useAppStore } from "@/stores/app";
import { useCreditsStore } from "@/stores/credits";

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  "update:show": [value: boolean];
  success: [];
}>();

const appStore = useAppStore();
const creditsStore = useCreditsStore();
const message = useMessage();

const selectedAmount = ref(pointsRechargePresets[0].amount);
const customAmount = ref(String(pointsRechargePresets[0].amount));
const isCreating = ref(false);
const recentOrders = ref<PointsRechargeOrderItem[]>([
  ...defaultRecentRechargeOrders,
]);
const latestOrder = ref<PointsRechargeOrderItem | null>(null);
const qrCodeUrl = ref("");

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

const currentDisplayOrder = computed(
  () => latestOrder.value ?? recentOrders.value[0] ?? null,
);

const orderStatusLabelMap: Record<PointsRechargeOrderItem["status"], string> = {
  pending: "待扫码",
  paid: "已支付",
  failed: "支付失败",
};

watch(
  () => props.show,
  (visible) => {
    if (!visible) return;

    selectedAmount.value = pointsRechargePresets[0].amount;
    customAmount.value = String(pointsRechargePresets[0].amount);
    latestOrder.value = recentOrders.value[0] ?? null;
    qrCodeUrl.value = buildFallbackQrCode(
      recentOrders.value[0]?.orderNo ?? "AI-CARXEN",
    );
    void creditsStore.hydrateRechargeProducts();
    void creditsStore.hydrateAccounts();
  },
);

function close() {
  emit("update:show", false);
}

function selectPreset(amount: number) {
  selectedAmount.value = amount;
  customAmount.value = String(amount);
}

function activateCustomAmount() {
  if (!customAmount.value) {
    customAmount.value = String(activeAmount.value);
  }
}

function handleCustomInput(event: Event) {
  const value = (event.target as HTMLInputElement).value.replace(/\D/g, "");
  customAmount.value = value;

  const parsed = Number.parseInt(value, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    selectedAmount.value = parsed;
  }
}

function resolveProductId(amountYuan: number) {
  const amountCents = amountYuan * 100;
  return creditsStore.rechargeProducts.find((product) => {
    if (product.priceCents === amountCents) return true;
    const priceText = product.priceText?.replace(/[^\d.]/g, "");
    return Number(priceText) === amountYuan;
  })?.id;
}

function buildFallbackQrCode(text: string) {
  const safeText = text.replace(/[<>&"]/g, "");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
      <rect width="240" height="240" rx="20" fill="#ffffff"/>
      <rect x="18" y="18" width="60" height="60" rx="10" fill="#111111"/>
      <rect x="30" y="30" width="36" height="36" rx="6" fill="#ffffff"/>
      <rect x="162" y="18" width="60" height="60" rx="10" fill="#111111"/>
      <rect x="174" y="30" width="36" height="36" rx="6" fill="#ffffff"/>
      <rect x="18" y="162" width="60" height="60" rx="10" fill="#111111"/>
      <rect x="30" y="174" width="36" height="36" rx="6" fill="#ffffff"/>
      <rect x="106" y="32" width="14" height="14" rx="3" fill="#111111"/>
      <rect x="128" y="32" width="14" height="14" rx="3" fill="#111111"/>
      <rect x="106" y="54" width="14" height="14" rx="3" fill="#111111"/>
      <rect x="142" y="54" width="14" height="14" rx="3" fill="#111111"/>
      <rect x="96" y="96" width="18" height="18" rx="4" fill="#111111"/>
      <rect x="122" y="96" width="18" height="18" rx="4" fill="#111111"/>
      <rect x="148" y="96" width="18" height="18" rx="4" fill="#111111"/>
      <rect x="96" y="122" width="18" height="18" rx="4" fill="#111111"/>
      <rect x="148" y="122" width="18" height="18" rx="4" fill="#111111"/>
      <rect x="96" y="148" width="18" height="18" rx="4" fill="#111111"/>
      <rect x="122" y="148" width="18" height="18" rx="4" fill="#111111"/>
      <rect x="148" y="148" width="18" height="18" rx="4" fill="#111111"/>
      <rect x="184" y="112" width="18" height="18" rx="4" fill="#111111"/>
      <rect x="184" y="148" width="18" height="18" rx="4" fill="#111111"/>
      <text x="120" y="210" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#6b7280">${safeText}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function handleGeneratePaymentCode() {
  if (isCreating.value) return;

  const amount = activeAmount.value;
  if (amount < 1) {
    message.warning("请输入有效充值金额");
    return;
  }

  isCreating.value = true;

  try {
    const productId = resolveProductId(amount);
    let orderNo = "";
    let nextQrCodeUrl = "";

    if (productId) {
      const order = await createRechargeOrder({
        productId,
        payChannel: "alipay",
      });
      orderNo = order.orderNo;
      nextQrCodeUrl = order.qrCodeUrl ?? "";
    } else {
      orderNo = createLocalRechargeOrder(amount).orderNo;
    }

    const nextOrder = createLocalRechargeOrder(amount);
    nextOrder.orderNo = orderNo || nextOrder.orderNo;
    latestOrder.value = nextOrder;
    qrCodeUrl.value = nextQrCodeUrl || buildFallbackQrCode(nextOrder.orderNo);
    recentOrders.value = [nextOrder, ...recentOrders.value].slice(0, 8);

    message.success("支付宝付款码已生成，请扫码完成支付");
    emit("success");
  } catch (error) {
    const text = error instanceof Error ? error.message : "生成付款码失败";
    message.error(text);
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
        @click="close"
      >
        <Icon icon="mdi:close" />
      </button>

      <header class="points-recharge-modal__topbar">
        <h2 id="points-recharge-modal-title">积分充值</h2>
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
            <input
              id="points-recharge-custom-amount"
              :value="customAmount"
              inputmode="numeric"
              autocomplete="off"
              placeholder="请输入充值金额"
              @input="handleCustomInput"
            />
            <span>{{ activePoints.toLocaleString("zh-CN") }}积分</span>
          </div>
        </div>
      </section>

      <section class="points-recharge-modal__content">
        <div class="points-recharge-modal__orders">
          <header class="points-recharge-modal__subhead">
            <span class="points-recharge-modal__subhead-bar" />
            <h3>近期充值订单</h3>
          </header>

          <ul v-if="recentOrders.length" class="points-recharge-modal__order-list">
            <li
              v-for="order in recentOrders"
              :key="order.orderNo"
              class="points-recharge-modal__order-item"
            >
              <div class="points-recharge-modal__order-main">
                <strong>{{ order.amountYuan.toFixed(0) }}元</strong>
                <span>{{ order.orderNo }}</span>
              </div>
              <div class="points-recharge-modal__order-side">
                <strong>{{ order.points.toLocaleString("zh-CN") }}积分</strong>
                <span>{{ orderStatusLabelMap[order.status] }}</span>
              </div>
            </li>
          </ul>

          <p v-else class="points-recharge-modal__empty">暂无充值订单</p>
        </div>

        <aside class="points-recharge-modal__pay-panel">
          <div class="points-recharge-modal__pay-card">
            <div class="points-recharge-modal__qr-frame">
              <img
                v-if="qrCodeUrl"
                :src="qrCodeUrl"
                class="points-recharge-modal__qr-image"
                alt="支付二维码"
              />
              <div v-else class="points-recharge-modal__qr-placeholder">
                <Icon icon="mdi:qrcode-scan" />
              </div>
            </div>

            <p class="points-recharge-modal__pay-tip">请扫码完成支付</p>

            <div v-if="currentDisplayOrder" class="points-recharge-modal__pay-meta">
              <strong>{{ currentDisplayOrder.amountYuan.toFixed(0) }}元</strong>
              <span>{{ currentDisplayOrder.orderNo }}</span>
            </div>

            <button
              type="button"
              class="points-recharge-modal__submit"
              :disabled="isCreating"
              @click="handleGeneratePaymentCode"
            >
              <Icon icon="mdi:qrcode-scan" />
              {{ isCreating ? "生成中..." : "生成支付宝付款码" }}
            </button>
          </div>

          <p class="points-recharge-modal__notice">
            温馨提示: 积分不可兑换会员、不可转赠，也不可提现。积分充值后无限期拥有，不支持退款或反向兑换为人民币积分规则。
          </p>
        </aside>
      </section>
    </div>
  </NModal>
</template>

<style scoped lang="scss">
.points-recharge-modal {
  --prm-bg: rgba(255, 255, 255, 0.96);
  --prm-panel: rgba(255, 255, 255, 0.86);
  --prm-panel-strong: #ffffff;
  --prm-border: rgba(15, 23, 42, 0.1);
  --prm-border-strong: rgba(15, 23, 42, 0.18);
  --prm-text: #111111;
  --prm-muted: #6b7280;
  --prm-soft: #f4f4f5;
  --prm-accent: #f3c543;
  --prm-accent-strong: #d0a42a;
  --prm-accent-soft: rgba(243, 197, 67, 0.16);
  --prm-shadow: 0 28px 72px rgba(15, 23, 42, 0.16);
  --prm-font:
    "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;

  position: relative;
  width: min(820px, calc(100vw - 40px));
  padding: 26px 26px 20px;
  border: 1px solid var(--prm-border);
  border-radius: 18px;
  background: var(--prm-bg);
  backdrop-filter: blur(18px);
  box-shadow: var(--prm-shadow);
  color: var(--prm-text);
  font-family: var(--prm-font);
}

.points-recharge-modal--dark {
  --prm-bg: rgba(20, 20, 20, 0.9);
  --prm-panel: rgba(30, 30, 30, 0.9);
  --prm-panel-strong: rgba(28, 28, 28, 0.98);
  --prm-border: rgba(255, 255, 255, 0.08);
  --prm-border-strong: rgba(243, 197, 67, 0.72);
  --prm-text: #f5f5f5;
  --prm-muted: rgba(255, 255, 255, 0.6);
  --prm-soft: rgba(255, 255, 255, 0.04);
  --prm-accent: #f3c543;
  --prm-accent-strong: #f7cf59;
  --prm-accent-soft: rgba(243, 197, 67, 0.12);
  --prm-shadow: 0 28px 84px rgba(0, 0, 0, 0.42);
}

.points-recharge-modal__close {
  position: absolute;
  top: 24px;
  right: 24px;
  display: inline-flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 999px;
  background: var(--prm-accent);
  color: #141414;
  cursor: pointer;
  font-size: 18px;
  transition: transform 0.2s ease, filter 0.2s ease;
}

.points-recharge-modal__close:hover {
  filter: brightness(1.02);
  transform: rotate(90deg);
}

.points-recharge-modal__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-right: 52px;
  margin-bottom: 22px;
}

.points-recharge-modal__topbar h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.points-recharge-modal__balance {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--prm-soft);
  color: var(--prm-text);
  font-size: 13px;
  line-height: 1;
}

.points-recharge-modal__balance span {
  color: var(--prm-muted);
}

.points-recharge-modal__balance strong {
  font-size: 15px;
  font-weight: 700;
}

.points-recharge-modal__section {
  margin-bottom: 24px;
}

.points-recharge-modal__presets {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.points-recharge-modal__preset {
  display: flex;
  min-height: 82px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--prm-border);
  border-radius: 12px;
  background: var(--prm-panel);
  color: var(--prm-text);
  cursor: pointer;
  font-family: inherit;
  text-align: center;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.points-recharge-modal__preset:hover {
  transform: translateY(-1px);
}

.points-recharge-modal__preset strong {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.1;
}

.points-recharge-modal__preset span {
  color: var(--prm-muted);
  font-size: 12px;
  font-weight: 600;
}

.points-recharge-modal__preset.is-active {
  border-color: var(--prm-border-strong);
  background: var(--prm-accent-soft);
  box-shadow: 0 0 0 1px rgba(243, 197, 67, 0.28);
}

.points-recharge-modal--light .points-recharge-modal__preset.is-active {
  background: rgba(255, 255, 255, 0.92);
}

.points-recharge-modal__preset--custom strong {
  font-size: 17px;
}

.points-recharge-modal__custom {
  margin-top: 16px;
}

.points-recharge-modal__custom label {
  display: block;
  margin-bottom: 8px;
  color: var(--prm-muted);
  font-size: 12px;
  font-weight: 600;
}

.points-recharge-modal__custom-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.points-recharge-modal__custom-row input {
  flex: 1;
  min-width: 0;
  height: 46px;
  padding: 0 14px;
  border: 1px solid var(--prm-border);
  border-radius: 12px;
  background: var(--prm-panel-strong);
  color: var(--prm-text);
  font-family: inherit;
  font-size: 16px;
  font-weight: 600;
}

.points-recharge-modal__custom-row input::placeholder {
  color: var(--prm-muted);
}

.points-recharge-modal__custom-row input:focus {
  outline: none;
  border-color: var(--prm-accent-strong);
  box-shadow: 0 0 0 3px rgba(243, 197, 67, 0.14);
}

.points-recharge-modal__custom-row span {
  flex-shrink: 0;
  color: var(--prm-accent-strong);
  font-size: 15px;
  font-weight: 700;
}

.points-recharge-modal__content {
  display: grid;
  grid-template-columns: minmax(0, 1.75fr) minmax(220px, 0.95fr);
  gap: 22px;
  align-items: start;
}

.points-recharge-modal__orders {
  min-width: 0;
}

.points-recharge-modal__subhead {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.points-recharge-modal__subhead h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.points-recharge-modal__subhead-bar {
  width: 4px;
  height: 20px;
  border-radius: 999px;
  background: var(--prm-accent);
}

.points-recharge-modal__order-list {
  display: grid;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.points-recharge-modal__order-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 52px;
  padding: 12px 14px;
  border: 1px solid var(--prm-border);
  border-radius: 12px;
  background: var(--prm-panel);
}

.points-recharge-modal__order-main,
.points-recharge-modal__order-side {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.points-recharge-modal__order-side {
  align-items: flex-end;
  text-align: right;
}

.points-recharge-modal__order-main strong,
.points-recharge-modal__order-side strong {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.2;
}

.points-recharge-modal__order-main span,
.points-recharge-modal__order-side span {
  color: var(--prm-muted);
  font-size: 12px;
  line-height: 1.35;
  word-break: break-all;
}

.points-recharge-modal__pay-panel {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 14px;
}

.points-recharge-modal__pay-card {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--prm-border);
  border-radius: 16px;
  background: var(--prm-panel);
}

.points-recharge-modal__qr-frame {
  display: flex;
  width: 160px;
  height: 160px;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
}

.points-recharge-modal__qr-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.points-recharge-modal__qr-placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #111111;
  font-size: 48px;
}

.points-recharge-modal__pay-tip {
  margin: 0;
  color: var(--prm-text);
  font-size: 13px;
  font-weight: 700;
}

.points-recharge-modal__pay-meta {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 4px;
  padding-top: 2px;
  text-align: center;
}

.points-recharge-modal__pay-meta strong {
  font-size: 16px;
  font-weight: 700;
}

.points-recharge-modal__pay-meta span {
  color: var(--prm-muted);
  font-size: 12px;
  line-height: 1.35;
  word-break: break-all;
}

.points-recharge-modal__submit {
  display: inline-flex;
  width: 100%;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 14px;
  border: none;
  border-radius: 12px;
  background: var(--prm-accent);
  color: #111111;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  transition: filter 0.2s ease, transform 0.2s ease;
}

.points-recharge-modal__submit:hover:not(:disabled) {
  filter: brightness(1.02);
  transform: translateY(-1px);
}

.points-recharge-modal__submit:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.points-recharge-modal__notice {
  margin: 0;
  color: var(--prm-muted);
  font-size: 11px;
  line-height: 1.55;
  text-align: center;
}

.points-recharge-modal__empty {
  margin: 0;
  padding: 22px 16px;
  border: 1px dashed var(--prm-border);
  border-radius: 12px;
  color: var(--prm-muted);
  font-size: 13px;
  text-align: center;
}

@media (max-width: 760px) {
  .points-recharge-modal {
    width: min(820px, calc(100vw - 24px));
    padding: 22px 18px 18px;
  }

  .points-recharge-modal__presets {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .points-recharge-modal__content {
    grid-template-columns: 1fr;
  }

  .points-recharge-modal__pay-card {
    max-width: 320px;
    margin: 0 auto;
  }
}

@media (max-width: 480px) {
  .points-recharge-modal__topbar {
    align-items: flex-start;
    flex-direction: column;
    padding-right: 48px;
  }

  .points-recharge-modal__custom-row {
    align-items: stretch;
    flex-direction: column;
  }

  .points-recharge-modal__custom-row span {
    text-align: right;
  }

  .points-recharge-modal__order-item {
    align-items: flex-start;
    flex-direction: column;
  }

  .points-recharge-modal__order-side {
    align-items: flex-start;
    text-align: left;
  }
}
</style>
