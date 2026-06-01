<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { computed, h, onMounted, ref } from "vue";
import {
  NButton,
  NDataTable,
  NDatePicker,
  NPagination,
  NSelect,
} from "naive-ui";
import type { DataTableColumns } from "naive-ui";

import {
  createPaymentOrder,
  getCreditAccounts,
  getCreditTransactions,
  getRechargeProducts,
  type CreditTransaction,
  type RechargeProduct,
} from "@/api/visual-workbench";
import RechargePlanCard from "@/components/business/package-points/RechargePlanCard.vue";
import {
  rechargePlanToneMap,
  rechargePlans,
  type RechargePlan,
  type RechargePlanTone,
} from "@/constants/recharge-plans";
import { useAppStore } from "@/stores/app";
import { useAuthStore } from "@/stores/auth";

type RechargeRecord = {
  orderNo: string;
  plan: string;
  amount: string;
  points: string;
  status: "支付成功" | "支付中" | "支付失败";
  paidAt: string;
};

type RecordSummary = {
  label: string;
  value: string;
  tone: "blue" | "gold" | "navy";
  icon: string;
};

function getPlanTone(plan: string): RechargePlanTone {
  const tone = rechargePlanToneMap[plan] ?? "blue";
  return tone === "purple" ? "blue" : tone;
}

const formatNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return "0";
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(parsed);
};

const formatCurrency = (value: string | number | null | undefined) => `¥${formatNumber(value)}`;

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date).replace(/\//g, "-");
};

const productDisplayName = (product: RechargeProduct, index: number) => {
  if (product.name.includes("Team")) return "企业团队版";
  if (product.name.includes("Flagship")) return "企业旗舰版";
  if (product.name.includes("Basic")) return "企业基础版";
  return rechargePlans[index]?.name ?? product.name;
};

const productTone = (index: number): RechargePlanTone =>
  index === 1 ? "blue" : index === 2 ? "gold" : "blue";

const planTypeMeta: Record<
  string,
  { icon: string; tone: RechargePlanTone }
> = {
  企业基础版: { icon: "mdi:layers-triple-outline", tone: "blue" },
  企业团队版: { icon: "mdi:chart-bar", tone: "blue" },
  企业旗舰版: { icon: "mdi:crown-outline", tone: "gold" },
};

const selectedPlanName = ref("企业团队版");
const pressingPlanName = ref<string | null>(null);
const plans = ref<RechargePlan[]>(rechargePlans);
const productsByPlan = ref<Record<string, RechargeProduct>>({});
const records = ref<RechargeRecord[]>([]);
const isLoadingRecharge = ref(false);
const isCreatingOrder = ref(false);

const appStore = useAppStore();
const authStore = useAuthStore();

const recordTypeOptions = [
  { label: "全部类型", value: "all" },
  { label: "企业基础版", value: "basic" },
  { label: "企业团队版", value: "advanced" },
  { label: "企业旗舰版", value: "premium" },
];

function handlePlanPointerDown(name: string) {
  pressingPlanName.value = name;
}

function clearPlanPress() {
  pressingPlanName.value = null;
}

function handlePlanSelect(name: string) {
  selectedPlanName.value = name;
  void createOrderForPlan(name);
}

const recordSummary = computed<RecordSummary[]>(() => {
  const successfulRecords = records.value.filter((record) => record.status === "支付成功");
  const today = new Date().toISOString().slice(0, 10);
  const todayRecords = successfulRecords.filter((record) => record.paidAt.startsWith(today));
  const sumAmount = (items: RechargeRecord[]) =>
    items.reduce((sum, record) => sum + Number(record.amount.replace(/[¥,]/g, "")), 0);
  const sumPoints = (items: RechargeRecord[]) =>
    items.reduce((sum, record) => sum + Number(record.points.replace(/,/g, "")), 0);

  return [
    {
      label: "今日充值金额 (元)",
      value: formatNumber(sumAmount(todayRecords)),
      tone: "blue",
      icon: "mdi:cash-multiple",
    },
    {
      label: "今日获得积分",
      value: formatNumber(sumPoints(todayRecords)),
      tone: "blue",
      icon: "mdi:diamond-stone",
    },
    {
      label: "累计充值金额 (元)",
      value: formatNumber(sumAmount(successfulRecords)),
      tone: "gold",
      icon: "mdi:chart-line",
    },
    {
      label: "累计获得积分",
      value: formatNumber(sumPoints(successfulRecords)),
      tone: "navy",
      icon: "mdi:star-four-points",
    },
  ];
});

function mapProductToPlan(product: RechargeProduct, index: number): RechargePlan {
  const fallback = rechargePlans[index] ?? rechargePlans[0];
  const name = productDisplayName(product, index);
  return {
    ...fallback,
    name,
    price: formatCurrency(product.amount),
    giftPoints: formatNumber(Number(product.points) + Number(product.bonusPoints)),
    tone: productTone(index),
    badge: fallback.badge,
  };
}

function mapTransactionToRechargeRecord(transaction: CreditTransaction): RechargeRecord | null {
  if (!transaction.paymentOrderId || Number(transaction.points) <= 0) return null;
  return {
    orderNo: String(transaction.paymentOrderId),
    plan: "积分充值",
    amount: "—",
    points: formatNumber(transaction.points),
    status: "支付成功",
    paidAt: formatDateTime(transaction.createdAt),
  };
}

async function loadRechargeData() {
  isLoadingRecharge.value = true;
  try {
    const [{ products }, { accounts }] = await Promise.all([
      getRechargeProducts(),
      getCreditAccounts(),
    ]);
    const enabledProducts = products.filter((product) => product.enabled);
    plans.value = enabledProducts.map(mapProductToPlan);
    productsByPlan.value = Object.fromEntries(
      enabledProducts.map((product, index) => [productDisplayName(product, index), product]),
    );
    selectedPlanName.value = plans.value[1]?.name ?? plans.value[0]?.name ?? selectedPlanName.value;
    const account = accounts.find((item) => item.accountScope === "personal") ?? accounts[0];
    if (account) {
      authStore.credits = formatNumber(account.availableBalance);
      const transactionResult = await getCreditTransactions({ accountId: account.id, limit: 50 });
      records.value = transactionResult.transactions
        .map(mapTransactionToRechargeRecord)
        .filter((record): record is RechargeRecord => Boolean(record));
    }
  } catch (error) {
    console.warn("failed to load recharge data", error);
    plans.value = rechargePlans;
  } finally {
    isLoadingRecharge.value = false;
  }
}

async function createOrderForPlan(name: string) {
  const product = productsByPlan.value[name];
  if (!product || isCreatingOrder.value) return;

  isCreatingOrder.value = true;
  try {
    const order = await createPaymentOrder({
      productId: product.id,
      payChannel: "wechat",
      idempotencyKey: `recharge:${product.id}:${Date.now()}`,
    });
    records.value = [
      {
        orderNo: order.orderNo,
        plan: name,
        amount: formatCurrency(order.amount),
        points: formatNumber(Number(order.points) + Number(order.bonusPoints)),
        status: order.status === "failed" ? "支付失败" : order.status === "paid" ? "支付成功" : "支付中",
        paidAt: formatDateTime(order.paidAt) === "—" ? formatDateTime(new Date().toISOString()) : formatDateTime(order.paidAt),
      },
      ...records.value,
    ];
  } finally {
    isCreatingOrder.value = false;
  }
}

const recordsColumns: DataTableColumns<RechargeRecord> = [
  {
    title: "订单号",
    key: "orderNo",
    width: 180,
    ellipsis: { tooltip: true },
  },
  {
    title: "套餐类型",
    key: "plan",
    width: 168,
    render(row) {
      const meta = planTypeMeta[row.plan] ?? planTypeMeta["企业基础版"];
      return h(
        "span",
        { class: ["plan-type-pill", `is-${meta.tone}`] },
        [
          h(Icon, { icon: meta.icon, class: "plan-type-pill-icon" }),
          h("span", row.plan),
        ],
      );
    },
  },
  {
    title: "金额 (元)",
    key: "amount",
    width: 130,
    render(row) {
      const tone = getPlanTone(row.plan);
      return h("span", { class: ["amount-cell", `is-${tone}`] }, row.amount);
    },
  },
  {
    title: "获得积分",
    key: "points",
    width: 140,
    render(row) {
      return h("span", { class: "points-cell" }, [
        h(Icon, { icon: "mdi:coin", class: "points-cell-icon" }),
        h("span", row.points),
      ]);
    },
  },
  {
    title: "状态",
    key: "status",
    width: 120,
    render(row) {
      const statusClass =
        row.status === "支付成功"
          ? "is-success"
          : row.status === "支付中"
            ? "is-pending"
            : "is-failed";
      return h("span", { class: ["status-text", statusClass] }, row.status);
    },
  },
  {
    title: "支付时间",
    key: "paidAt",
    width: 190,
  },
  {
    title: "操作",
    key: "action",
    width: 128,
    fixed: "right",
    render() {
      return h(
        NButton,
        {
          text: true,
          type: "primary",
          size: "small",
          attrType: "button",
          class: "detail-button",
        },
        {
          default: () => [
            "查看详情",
            h(Icon, { icon: "mdi:chevron-right", class: "detail-button-icon" }),
          ],
        },
      );
    },
  },
];

onMounted(() => {
  void loadRechargeData();
});
</script>

<template>
  <main
    class="recharge-page"
    :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'"
  >
    <section class="recharge-shell">
      <section class="recharge-panel" aria-label="充值套餐选择">
        <div class="recharge-body">
          <section class="plan-module" aria-label="选择充值套餐">
            <div class="plan-grid">
              <RechargePlanCard
                v-for="plan in plans"
                :key="plan.name"
                :plan="plan"
                :selected="selectedPlanName === plan.name"
                :pressing="pressingPlanName === plan.name"
                @select="handlePlanSelect(plan.name)"
                @pointerdown="handlePlanPointerDown(plan.name)"
                @pointerup="clearPlanPress"
                @pointerleave="clearPlanPress"
                @pointercancel="clearPlanPress"
              />
            </div>
          </section>

          <section class="records-module" aria-label="充值流水">
            <div class="records-header">
              <h2 class="section-title">充值流水</h2>
              <form class="records-filter" aria-label="充值流水筛选条件">
                <NDatePicker
                  class="records-date-picker"
                  type="daterange"
                  clearable
                  size="medium"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                />

                <NSelect
                  class="records-type-select"
                  :options="recordTypeOptions"
                  default-value="all"
                  size="medium"
                />

                <NButton
                  class="export-button"
                  size="medium"
                  attr-type="button"
                >
                  <template #icon>
                    <Icon icon="mdi:tray-arrow-up" />
                  </template>
                  导出记录
                </NButton>
              </form>
            </div>

            <div class="records-summary" aria-label="充值统计概览">
              <article
                v-for="item in recordSummary"
                :key="item.label"
                class="summary-card"
                :class="`is-${item.tone}`"
              >
                <span class="summary-card-icon" aria-hidden="true">
                  <Icon :icon="item.icon" />
                </span>
                <div class="summary-card-copy">
                  <p>{{ item.label }}</p>
                  <strong>{{ item.value }}</strong>
                </div>
              </article>
            </div>

            <div class="records-table-panel">
              <div class="records-table-wrap">
                <NDataTable
                  class="records-data-table"
                  :columns="recordsColumns"
                  :data="records"
                  :loading="isLoadingRecharge || isCreatingOrder"
                  :bordered="false"
                  :single-line="false"
                  :pagination="false"
                  :scroll-x="1080"
                />
              </div>

              <footer class="records-footer">
                <p class="records-total">共 {{ records.length }} 条</p>
                <NPagination
                  class="records-pager"
                  :page="1"
                  :page-size="10"
                  :item-count="records.length"
                  :page-sizes="[10, 20, 50]"
                  show-size-picker
                  show-quick-jumper
                />
              </footer>
            </div>
          </section>
        </div>
      </section>
    </section>
  </main>
</template>

<style scoped lang="scss">
.recharge-page {
  --recharge-page-pad: clamp(16px, 2vw, 30px);
  --recharge-bg: #050505;
  --recharge-panel: #101010;
  --recharge-panel-strong: #151515;
  --recharge-border: rgba(255, 255, 255, 0.1);
  --recharge-border-soft: rgba(255, 255, 255, 0.08);
  --recharge-text: #f4f1e9;
  --recharge-muted: #969186;
  --recharge-head: #151515;
  --recharge-row: rgba(255, 255, 255, 0.08);
  --recharge-field: #0b0b0b;
  --recharge-blue: #efc24c;
  --recharge-gold: #efc24c;
  --shell-shadow: 0 24px 60px rgba(0, 0, 0, 0.34);

  min-width: 0;
  height: auto;
  min-height: calc(100vh - var(--app-header-offset));
  overflow-x: hidden;
  overflow-y: auto;
  padding: var(--recharge-page-pad);
  background: var(--app-bg);
  color: var(--recharge-text);
}

.recharge-page,
.recharge-page *,
.recharge-page *::before,
.recharge-page *::after {
  box-sizing: border-box;
}

.recharge-page.theme-light {
  --recharge-bg: #f6f9fc;
  --recharge-panel: #ffffff;
  --recharge-panel-strong: #ffffff;
  --recharge-border: #e6ecf5;
  --recharge-border-soft: #e6ecf5;
  --recharge-text: #172033;
  --recharge-muted: #64748b;
  --recharge-head: #ffffff;
  --recharge-row: rgba(148, 163, 184, 0.18);
  --recharge-field: #ffffff;
  --recharge-blue: #2f6bff;
  --recharge-gold: #d4a017;
  --shell-shadow: 0 18px 52px rgba(78, 111, 148, 0.09);

  background:
    radial-gradient(
      860px 220px at 63% 0%,
      rgba(47, 107, 255, 0.06),
      transparent 72%
    ),
    #f6f9fc;
}

.recharge-shell {
  width: 100%;
  max-width: 1500px;
  min-height: calc(100vh - var(--app-header-offset) - var(--recharge-page-pad) - var(--recharge-page-pad));
  margin: 0 auto;
}

.recharge-panel {
  display: flex;
  min-width: 0;
  min-height: inherit;
  flex-direction: column;
  overflow: visible;
  border: 1px solid var(--recharge-border);
  border-radius: 20px;
  background: var(--recharge-panel);
  box-shadow: var(--shell-shadow);
}

.recharge-page.theme-light .recharge-panel {
  background:
    radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.06), transparent 70%),
    var(--recharge-panel);
}

.recharge-hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  min-height: 100px;
  padding: 14px clamp(22px, 2.4vw, 34px);
  overflow: hidden;
  border-bottom: 1px solid var(--recharge-border-soft);
  background: var(--recharge-head);
}

.recharge-page.theme-light .recharge-hero {
  background:
    radial-gradient(circle at 80% 50%, rgba(59, 130, 246, 0.08), transparent 55%),
    var(--recharge-head);
}

.theme-light .recharge-hero {
  background:
    linear-gradient(
      90deg,
      rgba(238, 244, 255, 0.96),
      rgba(242, 247, 255, 0.88) 52%,
      rgba(207, 224, 255, 0.72)
    ),
    var(--recharge-head);
}

.recharge-hero h1,
.section-title {
  margin: 0;
  color: var(--recharge-text);
  font-weight: 900;
  letter-spacing: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  line-height: 1.35;
}

.section-title::before {
  content: "";
  flex: 0 0 4px;
  width: 4px;
  height: 18px;
  border-radius: 999px;
  background: linear-gradient(180deg, #4d9dff, #2f6bff);
}

.recharge-hero h1 {
  font-size: 26px;
  line-height: 1.25;
}

.recharge-hero p {
  margin: 6px 0 0;
  color: var(--recharge-muted);
  font-size: 14px;
  font-weight: 700;
}

.hero-visual {
  position: relative;
  width: clamp(200px, 20vw, 280px);
  height: 80px;
  transform: scale(0.88);
  transform-origin: right center;
}

.orbit {
  position: absolute;
  border-radius: 999px;
  border: 1px solid rgba(72, 142, 255, 0.28);
  transform: rotate(-5deg);
}

.orbit-one {
  right: 34px;
  top: 24px;
  width: 240px;
  height: 60px;
  background: rgba(67, 133, 237, 0.08);
}

.orbit-two {
  right: 78px;
  top: 42px;
  width: 150px;
  height: 38px;
  background: rgba(67, 133, 237, 0.08);
}

.shield {
  position: absolute;
  right: 130px;
  top: 18px;
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(140deg, #5b8fff, #2f6bff);
  box-shadow: 0 10px 24px rgba(47, 107, 255, 0.28);
  color: #fff;
  font-size: 34px;
}

.chip {
  position: absolute;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #5d9cff;
  box-shadow: 0 8px 18px rgba(58, 123, 222, 0.16);
}

.chip-one {
  right: 226px;
  top: 28px;
}

.chip-two {
  right: 82px;
  top: 34px;
}

.recharge-body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: clamp(22px, 2.2vw, 32px);
  padding: clamp(18px, 1.6vw, 24px) clamp(22px, 2.4vw, 34px) clamp(24px, 2vw, 32px);
}

.plan-module {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  width: 100%;
  max-width: 1280px;
  min-width: 0;
  margin-inline: auto;
}

.plan-module > .section-title {
  margin-left: 0;
  justify-content: center;
}

.plan-grid {
  --plan-gap: clamp(18px, 1.8vw, 28px);

  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  justify-content: center;
  gap: var(--plan-gap);
  margin-top: 0;
  margin-inline: auto;
}

.records-module {
  position: relative;
  z-index: 0;
  display: flex;
  width: 100%;
  max-width: 1280px;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  margin-inline: auto;
  padding: clamp(20px, 1.8vw, 28px);
  border: 1px solid #e8edf5;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.theme-dark .records-module {
  border-color: rgba(255, 255, 255, 0.1);
  background: #101010;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.34);
}

.records-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  min-width: 0;
  flex-wrap: wrap;
  gap: 16px 22px;
}

.records-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(12px, 1.2vw, 18px);
  margin-top: clamp(18px, 1.6vw, 24px);
  padding: clamp(14px, 1.2vw, 18px);
  border: 1px solid rgba(188, 205, 223, 0.45);
  border-radius: 12px;
  background:
    radial-gradient(circle, rgba(148, 163, 184, 0.14) 1px, transparent 1.5px) 0 0 / 18px 18px,
    linear-gradient(135deg, rgba(241, 247, 255, 0.92), rgba(255, 255, 255, 0.88));
}

.theme-dark .records-summary {
  border-color: rgba(255, 255, 255, 0.08);
  background: #151515;
}

.summary-card {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: clamp(10px, 1vw, 14px);
  padding: clamp(10px, 1vw, 14px) clamp(12px, 1.1vw, 16px);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 8px 22px rgba(71, 99, 132, 0.08);
}

.theme-dark .summary-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #101010;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.34);
}

.summary-card-icon {
  display: grid;
  flex: 0 0 clamp(46px, 4vw, 56px);
  place-items: center;
  width: clamp(46px, 4vw, 56px);
  height: clamp(46px, 4vw, 56px);
  border-radius: 14px;
  font-size: clamp(24px, 2.2vw, 30px);
  color: #fff;
  clip-path: polygon(25% 6%, 75% 6%, 94% 50%, 75% 94%, 25% 94%, 6% 50%);
}

.summary-card.is-blue .summary-card-icon {
  background: linear-gradient(145deg, #5b8fff, #2f6bff);
  box-shadow: 0 8px 18px rgba(47, 107, 255, 0.28);
}

.summary-card.is-gold .summary-card-icon {
  background: linear-gradient(145deg, #e5b85c, #d4a017);
  box-shadow: 0 8px 18px rgba(212, 160, 23, 0.28);
}

.summary-card.is-navy .summary-card-icon {
  background: linear-gradient(145deg, #4f7fff, #2f6bff);
  box-shadow: 0 8px 18px rgba(47, 107, 255, 0.24);
}

.summary-card-copy {
  min-width: 0;
}

.summary-card-copy p {
  margin: 0;
  color: var(--recharge-muted);
  font-size: clamp(12px, 1vw, 14px);
  font-weight: 700;
  line-height: 1.35;
}

.summary-card-copy strong {
  display: block;
  margin-top: 6px;
  overflow: hidden;
  font-size: clamp(22px, 2.2vw, 30px);
  line-height: 1.1;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-card.is-blue .summary-card-copy strong {
  color: #2f6bff;
}

.summary-card.is-gold .summary-card-copy strong {
  color: #d4a017;
}

.summary-card.is-navy .summary-card-copy strong {
  color: #2f6bff;
}

.theme-dark .summary-card.is-navy .summary-card-copy strong {
  color: #7eb0ff;
}

.records-table-panel {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  margin-top: clamp(18px, 1.6vw, 24px);
  padding: clamp(14px, 1.2vw, 18px);
  border: 1px solid rgba(188, 205, 223, 0.42);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.88);
}

.theme-dark .records-table-panel {
  border-color: rgba(255, 255, 255, 0.08);
  background: #101010;
}

.records-filter {
  display: grid;
  grid-template-columns: minmax(260px, 1.25fr) minmax(150px, 0.72fr) minmax(92px, 0.42fr);
  gap: 12px;
  align-items: center;
  width: min(100%, 620px);
  min-width: min(100%, 560px);
}

.records-date-picker,
.records-type-select {
  width: 100%;
  min-width: 0;
}

.records-date-picker,
.records-type-select,
.export-button {
  --n-height: 38px;
  --n-border-radius: 5px;
  --n-color: var(--recharge-field);
  --n-color-active: var(--recharge-field);
  --n-color-focus: var(--recharge-field);
  --n-color-hover: color-mix(in srgb, var(--recharge-field) 88%, var(--recharge-blue));
  --n-border: 1px solid var(--recharge-border-soft);
  --n-border-active: 1px solid rgba(52, 124, 255, 0.66);
  --n-border-focus: 1px solid rgba(52, 124, 255, 0.72);
  --n-border-hover: 1px solid rgba(52, 124, 255, 0.48);
  --n-box-shadow-focus: 0 0 0 2px rgba(52, 124, 255, 0.12);
  --n-text-color: var(--recharge-text);
  --n-placeholder-color: var(--recharge-muted);
  --n-icon-color: var(--recharge-muted);
}

.records-date-picker :deep(.n-input__input-el),
.records-type-select :deep(.n-base-selection-label),
.records-type-select :deep(.n-base-selection-placeholder) {
  font-size: 14px;
  font-weight: 600;
}

.export-button {
  --n-height: 38px;
  --n-border-radius: 8px;
  --n-color: #ffffff;
  --n-color-hover: #f8fafd;
  --n-color-pressed: #f1f5f9;
  --n-color-focus: #ffffff;
  --n-border: 1px solid #d8e2f0;
  --n-border-hover: 1px solid #d8e2f0;
  --n-border-pressed: 1px solid #d8e2f0;
  --n-border-focus: 1px solid #d8e2f0;
  --n-text-color: #64748b;
  --n-text-color-hover: #64748b;
  --n-text-color-pressed: #64748b;
  --n-text-color-focus: #64748b;
  width: 100%;
  font-size: 14px;
  font-weight: 800;
}

.records-table-wrap {
  min-width: 0;
  overflow: auto;
}

.records-data-table {
  --n-font-size: 14px;
  --n-th-color: rgba(241, 246, 252, 0.96);
  --n-th-color-hover: rgba(241, 246, 252, 0.96);
  --n-th-text-color: #52647a;
  --n-td-color: transparent;
  --n-td-color-hover: rgba(52, 124, 255, 0.06);
  --n-td-text-color: var(--recharge-text);
  --n-border-color: rgba(226, 234, 244, 0.92);
  --n-border-radius: 0;
  color: var(--recharge-text);
}

.theme-dark .records-data-table {
  --n-th-color: #151515;
  --n-th-color-hover: #151515;
  --n-th-text-color: #959083;
  --n-td-color-hover: rgba(239, 194, 76, 0.08);
  --n-border-color: rgba(255, 255, 255, 0.08);
}

.records-data-table :deep(.n-data-table-th) {
  height: 48px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 800;
  white-space: nowrap;
}

.records-data-table :deep(.n-data-table-td) {
  height: 56px;
  padding: 0 16px;
  font-weight: 700;
}

.records-data-table :deep(.plan-type-pill) {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 8px;
  padding: 5px 12px 5px 8px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
}

.records-data-table :deep(.plan-type-pill-icon) {
  display: inline-flex;
  flex: 0 0 auto;
  font-size: 16px;
}

.records-data-table :deep(.amount-cell) {
  font-size: 15px;
  font-weight: 900;
}

.records-data-table :deep(.plan-type-pill.is-blue) {
  background: #eef4ff;
  color: #2f6bff;
}

.records-data-table :deep(.plan-type-pill.is-gold) {
  background: #fff6e0;
  color: #d4a017;
}

.records-data-table :deep(.amount-cell.is-blue) {
  color: #2f6bff;
}

.records-data-table :deep(.amount-cell.is-gold) {
  color: #d4a017;
}

.records-data-table :deep(.points-cell-icon) {
  display: inline-flex;
  flex: 0 0 auto;
  color: #d4a017;
  font-size: 18px;
}

.records-data-table :deep(.points-cell) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 800;
  white-space: nowrap;
}

.records-data-table :deep(.points-cell > span) {
  line-height: 1;
}

.records-data-table :deep(.status-text) {
  font-size: 14px;
  font-weight: 800;
}

.records-data-table :deep(.status-text.is-success) {
  color: #18a058;
}

.records-data-table :deep(.status-text.is-pending) {
  color: #347cff;
}

.records-data-table :deep(.status-text.is-failed) {
  color: #d03050;
}

.detail-button {
  --n-text-color: var(--recharge-blue);
  --n-text-color-hover: #2b84ff;
  --n-text-color-pressed: #1f6ed6;
  --n-text-color-focus: var(--recharge-blue);
  font-weight: 800;
}

.detail-button :deep(.n-button__content) {
  gap: 2px;
}

.detail-button-icon {
  font-size: 18px;
}

.records-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 18px;
  margin-top: 16px;
  padding-top: 4px;
}

.records-total {
  margin: 0;
  color: var(--recharge-muted);
  font-size: 14px;
  font-weight: 700;
}

.records-pager {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  --n-item-size: 30px;
  --n-item-border-radius: 5px;
  --n-item-color: var(--recharge-field);
  --n-item-color-hover: color-mix(in srgb, var(--recharge-field) 84%, var(--recharge-blue));
  --n-item-color-active: var(--recharge-blue);
  --n-item-color-active-hover: var(--recharge-blue);
  --n-item-border: 1px solid var(--recharge-border-soft);
  --n-item-border-hover: 1px solid rgba(52, 124, 255, 0.42);
  --n-item-border-active: 1px solid var(--recharge-blue);
  --n-item-text-color: var(--recharge-muted);
  --n-item-text-color-hover: var(--recharge-text);
  --n-item-text-color-active: #fff;
  --n-button-color: var(--recharge-field);
  --n-button-color-hover: color-mix(in srgb, var(--recharge-field) 84%, var(--recharge-blue));
  --n-button-border: 1px solid var(--recharge-border-soft);
  --n-button-border-hover: 1px solid rgba(52, 124, 255, 0.42);
  --n-button-icon-color: var(--recharge-muted);
  --n-button-icon-color-hover: var(--recharge-text);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (max-width: 1279px) {
  .recharge-page {
    --recharge-page-pad: 18px;
  }

  .plan-grid {
    --plan-gap: 18px;
  }

  .records-filter {
    grid-template-columns: minmax(240px, 1.15fr) minmax(140px, 0.8fr) 92px;
  }
}

@media (max-width: 1180px) {
  :deep(.recharge-plan-card) {
    flex-basis: calc((100% - var(--plan-gap)) / 2);
    max-width: calc((100% - var(--plan-gap)) / 2);
  }
}

@media (max-height: 820px) and (min-width: 981px) {
  .recharge-page {
    --recharge-page-pad: 14px;
  }

  .recharge-hero {
    min-height: 88px;
    padding-block: 10px;
  }

  .recharge-hero h1 {
    font-size: 24px;
  }

  .hero-visual {
    height: 72px;
    transform: scale(0.8);
    transform-origin: right center;
  }

  .recharge-body {
    gap: 18px;
    padding-block: 14px 18px;
  }

  .plan-grid {
    margin-top: 12px;
  }
}

@media (max-width: 980px) {
  .recharge-page {
    min-height: calc(100vh - var(--app-header-offset));
  }

  .recharge-shell,
  .recharge-panel {
    min-height: 0;
  }

  .recharge-hero,
  .records-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-visual {
    width: min(100%, 360px);
  }

  .records-filter {
    width: 100%;
    min-width: 0;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .plan-grid {
    --plan-gap: 18px;
  }

  .export-button {
    width: 100%;
  }

  .records-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .records-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .records-pager {
    justify-content: center;
  }
}

@media (max-width: 680px) {
  .recharge-page {
    --recharge-page-pad: 12px;
  }

  .records-filter {
    grid-template-columns: minmax(0, 1fr);
  }

  :deep(.recharge-plan-card) {
    flex-basis: 100%;
    max-width: 100%;
  }

  .plan-grid {
    margin-inline: auto;
  }

  .records-summary {
    grid-template-columns: minmax(0, 1fr);
  }

  .records-module {
    padding: 16px;
  }
}
</style>
