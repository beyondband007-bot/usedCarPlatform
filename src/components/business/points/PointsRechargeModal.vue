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

const modalThemeClass = computed(() =>
  appStore.isDarkMode ? "points-recharge-modal--dark" : "points-recharge-modal--light",
);

const activeAmount = computed(() => {
  const parsed = Number.parseInt(customAmount.value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return selectedAmount.value;
  return parsed;
});

const activePoints = computed(() => calcPointsFromAmount(activeAmount.value));

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
    void creditsStore.hydrateRechargeProducts();
  },
);

function close() {
  emit("update:show", false);
}

function selectPreset(amount: number) {
  selectedAmount.value = amount;
  customAmount.value = String(amount);
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

    if (productId) {
      const order = await createRechargeOrder({ productId });
      orderNo = order.orderNo;
    } else {
      orderNo = createLocalRechargeOrder(amount).orderNo;
    }

    const nextOrder = createLocalRechargeOrder(amount);
    nextOrder.orderNo = orderNo || nextOrder.orderNo;
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

      <section class="points-recharge-modal__section">
        <header class="points-recharge-modal__head">
          <Icon icon="mdi:wallet-outline" />
          <h2 id="points-recharge-modal-title">支付宝充值</h2>
        </header>

        <div class="points-recharge-modal__presets">
          <button
            v-for="preset in pointsRechargePresets"
            :key="preset.amount"
            type="button"
            class="points-recharge-modal__preset"
            :class="{ 'is-active': selectedAmount === preset.amount }"
            @click="selectPreset(preset.amount)"
          >
            <strong>{{ preset.amount }} 元</strong>
            <span>{{ preset.points.toLocaleString("zh-CN") }} 积分</span>
          </button>
        </div>

        <div class="points-recharge-modal__custom">
          <label for="points-recharge-custom-amount">自定义金额</label>
          <div class="points-recharge-modal__custom-row">
            <input
              id="points-recharge-custom-amount"
              :value="customAmount"
              inputmode="numeric"
              autocomplete="off"
              placeholder="请输入金额"
              @input="handleCustomInput"
            />
            <span>{{ activePoints.toLocaleString("zh-CN") }} 积分</span>
          </div>
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
      </section>

      <section class="points-recharge-modal__section points-recharge-modal__orders">
        <header class="points-recharge-modal__head">
          <Icon icon="mdi:file-document-outline" />
          <h3>近期充值订单</h3>
        </header>

        <ul v-if="recentOrders.length" class="points-recharge-modal__order-list">
          <li
            v-for="order in recentOrders"
            :key="order.orderNo"
            class="points-recharge-modal__order-item"
          >
            <div class="points-recharge-modal__order-main">
              <strong>{{ order.amountYuan.toFixed(2) }} 元</strong>
              <span>{{ order.orderNo }}</span>
            </div>
            <div class="points-recharge-modal__order-side">
              <strong>{{ order.points.toLocaleString("zh-CN") }} 积分</strong>
              <span>{{ orderStatusLabelMap[order.status] }}</span>
            </div>
          </li>
        </ul>

        <p v-else class="points-recharge-modal__empty">暂无充值订单</p>
      </section>
    </div>
  </NModal>
</template>

<style scoped lang="scss">
.points-recharge-modal {
  --prm-bg: #ffffff;
  --prm-border: #e2e8f0;
  --prm-text: #0f172a;
  --prm-muted: #64748b;
  --prm-card: #f8fafc;
  --prm-card-active: #f5f3ff;
  --prm-accent: #7c3aed;
  --prm-accent-soft: #ede9fe;
  --prm-submit-start: #7c3aed;
  --prm-submit-end: #6366f1;
  --prm-close: #94a3b8;

  position: relative;
  width: min(760px, calc(100vw - 32px));
  padding: 24px;
  border: 1px solid var(--prm-border);
  border-radius: 16px;
  background: var(--prm-bg);
  color: var(--prm-text);
  box-shadow: 0 24px 64px rgb(15 23 42 / 18%);
}

.points-recharge-modal--dark {
  --prm-bg: #111318;
  --prm-border: rgb(255 255 255 / 10%);
  --prm-text: #f8fafc;
  --prm-muted: #94a3b8;
  --prm-card: #17181f;
  --prm-card-active: rgb(124 58 237 / 12%);
  --prm-accent: #a78bfa;
  --prm-accent-soft: rgb(124 58 237 / 18%);
  --prm-submit-start: #7c3aed;
  --prm-submit-end: #6366f1;
  --prm-close: #94a3b8;
}

.points-recharge-modal__close {
  position: absolute;
  top: 16px;
  right: 16px;
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--prm-close);
  cursor: pointer;
  font-size: 18px;
}

.points-recharge-modal__close:hover {
  background: rgb(148 163 184 / 12%);
}

.points-recharge-modal__section + .points-recharge-modal__section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--prm-border);
}

.points-recharge-modal__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  color: var(--prm-text);
}

.points-recharge-modal__head .iconify {
  color: var(--prm-accent);
  font-size: 18px;
}

.points-recharge-modal__head h2,
.points-recharge-modal__head h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.points-recharge-modal__presets {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.points-recharge-modal__preset {
  display: flex;
  min-height: 72px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 8px;
  border: 1px solid var(--prm-border);
  border-radius: 10px;
  background: var(--prm-card);
  color: var(--prm-text);
  cursor: pointer;
  font-family: inherit;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.points-recharge-modal__preset strong {
  font-size: 14px;
  font-weight: 700;
}

.points-recharge-modal__preset span {
  color: var(--prm-muted);
  font-size: 12px;
}

.points-recharge-modal__preset.is-active {
  border-color: var(--prm-accent);
  background: var(--prm-card-active);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--prm-accent) 36%, transparent);
}

.points-recharge-modal__custom {
  margin-top: 16px;
}

.points-recharge-modal__custom label {
  display: block;
  margin-bottom: 8px;
  color: var(--prm-muted);
  font-size: 13px;
}

.points-recharge-modal__custom-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.points-recharge-modal__custom-row input {
  flex: 1;
  min-width: 0;
  height: 44px;
  padding: 0 14px;
  border: 1px solid var(--prm-border);
  border-radius: 10px;
  background: var(--prm-card);
  color: var(--prm-text);
  font-family: inherit;
  font-size: 14px;
}

.points-recharge-modal__custom-row input:focus {
  outline: none;
  border-color: var(--prm-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--prm-accent) 18%, transparent);
}

.points-recharge-modal__custom-row span {
  flex-shrink: 0;
  color: var(--prm-accent);
  font-size: 14px;
  font-weight: 700;
}

.points-recharge-modal__submit {
  display: flex;
  width: 100%;
  height: 48px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 18px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(
    90deg,
    var(--prm-submit-start),
    var(--prm-submit-end)
  );
  color: #ffffff;
  cursor: pointer;
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
  transition: opacity 0.2s ease;
}

.points-recharge-modal__submit:disabled {
  cursor: not-allowed;
  opacity: 0.72;
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
  padding: 14px 16px;
  border: 1px solid var(--prm-border);
  border-radius: 12px;
  background: var(--prm-card);
}

.points-recharge-modal__order-main,
.points-recharge-modal__order-side {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.points-recharge-modal__order-side {
  align-items: flex-end;
  text-align: right;
}

.points-recharge-modal__order-main strong,
.points-recharge-modal__order-side strong {
  font-size: 14px;
  font-weight: 700;
}

.points-recharge-modal__order-main span,
.points-recharge-modal__order-side span {
  color: var(--prm-muted);
  font-size: 12px;
  line-height: 1.35;
  word-break: break-all;
}

.points-recharge-modal__empty {
  margin: 0;
  color: var(--prm-muted);
  font-size: 13px;
  text-align: center;
}

@media (max-width: 760px) {
  .points-recharge-modal__presets {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .points-recharge-modal {
    padding: 20px 16px;
  }

  .points-recharge-modal__presets {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .points-recharge-modal__custom-row {
    flex-direction: column;
    align-items: stretch;
  }

  .points-recharge-modal__custom-row span {
    text-align: right;
  }
}
</style>
