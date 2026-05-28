<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { h, ref } from "vue";
import {
  NButton,
  NDataTable,
  NDatePicker,
  NPagination,
  NSelect,
} from "naive-ui";
import type { DataTableColumns } from "naive-ui";

import { useAppStore } from "@/stores/app";

import planBasicBg from "@/img/基础套餐.png";
import planAdvancedBg from "@/img/进阶套餐.png";
import planPremiumBg from "@/img/尊享套餐.png";

type PlanTone = "blue" | "purple" | "gold";

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
  tone: "blue" | "purple" | "gold" | "navy";
  icon: string;
};

const planToneMap: Record<string, PlanTone> = {
  基础套餐: "blue",
  进阶套餐: "purple",
  尊享套餐: "gold",
};

function getPlanTone(plan: string): PlanTone {
  return planToneMap[plan] ?? "blue";
}

const recordSummary: RecordSummary[] = [
  {
    label: "今日充值金额 (元)",
    value: "12,680",
    tone: "blue",
    icon: "mdi:cash-multiple",
  },
  {
    label: "今日获得积分",
    value: "126,800",
    tone: "purple",
    icon: "mdi:diamond-stone",
  },
  {
    label: "累计充值金额 (元)",
    value: "236,580",
    tone: "gold",
    icon: "mdi:chart-line",
  },
  {
    label: "累计获得积分",
    value: "2,365,800",
    tone: "navy",
    icon: "mdi:star-four-points",
  },
];

const planTypeMeta: Record<
  string,
  { icon: string; tone: PlanTone }
> = {
  基础套餐: { icon: "mdi:layers-triple-outline", tone: "blue" },
  进阶套餐: { icon: "mdi:chart-bar", tone: "purple" },
  尊享套餐: { icon: "mdi:crown-outline", tone: "gold" },
};

type RechargePlan = {
  name: string;
  image: string;
  tone: PlanTone;
};

const selectedPlanName = ref("进阶套餐");
const pressingPlanName = ref<string | null>(null);

const appStore = useAppStore();

const recordTypeOptions = [
  { label: "全部类型", value: "all" },
  { label: "基础套餐", value: "basic" },
  { label: "进阶套餐", value: "advanced" },
  { label: "尊享套餐", value: "premium" },
];

const rechargePlans: RechargePlan[] = [
  { name: "基础套餐", image: planBasicBg, tone: "blue" },
  { name: "进阶套餐", image: planAdvancedBg, tone: "purple" },
  { name: "尊享套餐", image: planPremiumBg, tone: "gold" },
];

function handlePlanPointerDown(name: string) {
  pressingPlanName.value = name;
}

function clearPlanPress() {
  pressingPlanName.value = null;
}

function handlePlanSelect(name: string) {
  selectedPlanName.value = name;
}

const records: RechargeRecord[] = [
  {
    orderNo: "202605200001",
    plan: "进阶套餐",
    amount: "¥3,980",
    points: "550",
    status: "支付成功",
    paidAt: "2026-05-20 10:30:45",
  },
  {
    orderNo: "202605190002",
    plan: "基础套餐",
    amount: "¥980",
    points: "200",
    status: "支付成功",
    paidAt: "2026-05-19 15:20:18",
  },
  {
    orderNo: "202605180003",
    plan: "尊享套餐",
    amount: "¥9,800",
    points: "9800",
    status: "支付成功",
    paidAt: "2026-05-18 09:15:33",
  },
  {
    orderNo: "202605160006",
    plan: "尊享套餐",
    amount: "¥9,800",
    points: "9800",
    status: "支付中",
    paidAt: "2026-05-16 14:22:09",
  },
  {
    orderNo: "202605150004",
    plan: "进阶套餐",
    amount: "¥3,980",
    points: "550",
    status: "支付失败",
    paidAt: "2026-05-15 11:05:22",
  },
  {
    orderNo: "202605100005",
    plan: "基础套餐",
    amount: "¥980",
    points: "200",
    status: "支付成功",
    paidAt: "2026-05-10 16:40:11",
  },
];

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
      const meta = planTypeMeta[row.plan] ?? planTypeMeta["基础套餐"];
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
</script>

<template>
  <main
    class="recharge-page"
    :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'"
  >
    <section class="recharge-shell">
      <section class="recharge-panel" aria-label="充值套餐选择">
        <header class="recharge-hero">
          <div>
            <h1>充值中心</h1>
            <p>选择充值套餐，快速获取积分</p>
          </div>
          <div class="hero-visual" aria-hidden="true">
            <span class="orbit orbit-one"></span>
            <span class="orbit orbit-two"></span>
            <span class="shield">
              <Icon icon="mdi:check-decagram" />
            </span>
            <span class="chip chip-one"><Icon icon="mdi:diamond-stone" /></span>
            <span class="chip chip-two"><Icon icon="mdi:plus-circle" /></span>
          </div>
        </header>

        <div class="recharge-body">
          <section class="plan-module" aria-label="选择充值套餐">
            <h2 class="section-title">选择充值套餐</h2>
            <div class="plan-grid">
              <article
                v-for="plan in rechargePlans"
                :key="plan.name"
                class="plan-card"
                :class="[
                  `is-${plan.tone}`,
                  {
                    'is-selected': selectedPlanName === plan.name,
                    'is-pressing': pressingPlanName === plan.name,
                  },
                ]"
                role="button"
                tabindex="0"
                :aria-pressed="selectedPlanName === plan.name"
                :aria-label="`${plan.name}，点击选择并充值`"
                @click="handlePlanSelect(plan.name)"
                @keydown.enter.prevent="handlePlanSelect(plan.name)"
                @keydown.space.prevent="handlePlanSelect(plan.name)"
                @pointerdown="handlePlanPointerDown(plan.name)"
                @pointerup="clearPlanPress"
                @pointerleave="clearPlanPress"
                @pointercancel="clearPlanPress"
              >
                <span
                  v-if="selectedPlanName === plan.name"
                  class="plan-card-check"
                  aria-hidden="true"
                >
                  <Icon icon="mdi:check" />
                </span>
                <img
                  class="plan-card-bg"
                  :src="plan.image"
                  :alt="plan.name"
                  loading="lazy"
                  decoding="async"
                  draggable="false"
                />
              </article>
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
                  :bordered="false"
                  :single-line="false"
                  :pagination="false"
                  :scroll-x="1080"
                />
              </div>

              <footer class="records-footer">
                <p class="records-total">共 128 条</p>
                <NPagination
                  class="records-pager"
                  :page="1"
                  :page-size="10"
                  :item-count="128"
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
  --recharge-bg: #071226;
  --recharge-panel: rgba(7, 15, 32, 0.78);
  --recharge-panel-strong: rgba(8, 16, 35, 0.92);
  --recharge-border: rgba(73, 106, 148, 0.42);
  --recharge-border-soft: rgba(91, 117, 151, 0.22);
  --recharge-text: #eef6ff;
  --recharge-muted: #9fb0c7;
  --recharge-head: rgba(255, 255, 255, 0.06);
  --recharge-row: rgba(125, 150, 181, 0.18);
  --recharge-field: rgba(255, 255, 255, 0.055);
  --recharge-blue: #347cff;
  --recharge-purple: #8f57ff;
  --recharge-gold: #f49a23;
  --shell-shadow:
    0 0 0 1px rgba(79, 139, 220, 0.08), 0 28px 72px rgba(0, 0, 0, 0.28),
    0 0 42px rgba(39, 124, 235, 0.12);

  min-width: 0;
  height: auto;
  min-height: calc(100vh - var(--app-header-offset));
  overflow-x: hidden;
  overflow-y: auto;
  padding: var(--recharge-page-pad);
  background:
    radial-gradient(
      820px 220px at 68% 0%,
      rgba(48, 128, 255, 0.16),
      transparent 70%
    ),
    linear-gradient(180deg, #0e1d34, var(--recharge-bg));
  color: var(--recharge-text);
}

.recharge-page,
.recharge-page *,
.recharge-page *::before,
.recharge-page *::after {
  box-sizing: border-box;
}

.recharge-page.theme-light {
  --recharge-bg: #edf3fa;
  --recharge-panel: rgba(255, 255, 255, 0.86);
  --recharge-panel-strong: rgba(255, 255, 255, 0.92);
  --recharge-border: rgba(175, 194, 215, 0.42);
  --recharge-border-soft: rgba(188, 205, 223, 0.42);
  --recharge-text: #071a34;
  --recharge-muted: #52647a;
  --recharge-head: rgba(231, 238, 247, 0.72);
  --recharge-row: rgba(148, 163, 184, 0.18);
  --recharge-field: rgba(247, 250, 253, 0.94);
  --shell-shadow:
    0 18px 52px rgba(71, 99, 132, 0.12), 0 0 30px rgba(125, 184, 238, 0.14);

  background:
    radial-gradient(
      860px 220px at 63% 0%,
      rgba(166, 210, 255, 0.32),
      transparent 72%
    ),
    linear-gradient(180deg, #f6fbff, var(--recharge-bg));
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
  border-radius: 10px;
  background: var(--recharge-panel);
  box-shadow: var(--shell-shadow);
  backdrop-filter: blur(18px);
}

.recharge-hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  min-height: clamp(104px, 12vh, 128px);
  padding: 18px clamp(22px, 2.4vw, 34px);
  overflow: hidden;
  border-bottom: 1px solid var(--recharge-border-soft);
  background:
    linear-gradient(
      90deg,
      rgba(47, 118, 225, 0.13),
      rgba(47, 118, 225, 0.02) 48%,
      rgba(54, 132, 245, 0.18)
    ),
    var(--recharge-head);
}

.theme-light .recharge-hero {
  background:
    linear-gradient(
      90deg,
      rgba(242, 247, 253, 0.94),
      rgba(238, 246, 255, 0.86) 52%,
      rgba(214, 231, 252, 0.9)
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
  font-size: 30px;
  line-height: 1.25;
}

.recharge-hero p {
  margin: 9px 0 0;
  color: var(--recharge-muted);
  font-size: 15px;
  font-weight: 700;
}

.hero-visual {
  position: relative;
  width: clamp(260px, 25vw, 360px);
  height: 116px;
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
  top: 26px;
  display: grid;
  place-items: center;
  width: 70px;
  height: 70px;
  border-radius: 20px;
  background: linear-gradient(140deg, #5fb4ff, #2d6bff);
  box-shadow: 0 10px 24px rgba(44, 105, 255, 0.34);
  color: #fff;
  font-size: 42px;
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
  gap: clamp(22px, 2.2vw, 32px);
  padding: clamp(18px, 1.6vw, 24px) clamp(22px, 2.4vw, 34px) clamp(24px, 2vw, 32px);
}

.plan-module {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  min-width: 0;
}

.plan-grid {
  --plan-gap: clamp(18px, 1.8vw, 28px);

  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: var(--plan-gap);
  margin-top: 18px;
}

.plan-card {
  --plan-shadow: 0 14px 34px rgba(56, 112, 190, 0.12);
  --plan-ring: transparent;
  --plan-lift: 0px;

  position: relative;
  flex: 1 1 calc((100% - var(--plan-gap) - var(--plan-gap)) / 3);
  min-width: 0;
  width: 100%;
  max-width: calc((100% - var(--plan-gap) - var(--plan-gap)) / 3);
  overflow: hidden;
  border: 0;
  border-radius: clamp(14px, 1.2vw, 20px);
  background: transparent;
  box-shadow: var(--plan-shadow);
  transform: translateY(var(--plan-lift));
  cursor: pointer;
  outline: none;
  transition:
    transform 0.26s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.26s cubic-bezier(0.22, 1, 0.36, 1);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.plan-card::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 2;
  border: 3px solid var(--plan-ring);
  border-radius: inherit;
  pointer-events: none;
  opacity: 0;
  transition:
    opacity 0.26s ease,
    border-color 0.26s ease;
}

.plan-card.is-blue {
  --plan-accent: #2f7dff;
  --plan-shadow: 0 14px 34px rgba(47, 125, 255, 0.14);
}

.plan-card.is-purple {
  --plan-accent: #8f57ff;
  --plan-shadow: 0 14px 34px rgba(143, 87, 255, 0.16);
}

.plan-card.is-gold {
  --plan-accent: #f49a23;
  --plan-shadow: 0 14px 34px rgba(244, 154, 35, 0.16);
}

.theme-dark .plan-card.is-blue {
  --plan-shadow: 0 16px 36px rgba(47, 125, 255, 0.22);
}

.theme-dark .plan-card.is-purple {
  --plan-shadow: 0 16px 36px rgba(143, 87, 255, 0.24);
}

.theme-dark .plan-card.is-gold {
  --plan-shadow: 0 16px 36px rgba(244, 154, 35, 0.22);
}

.plan-card:hover {
  --plan-lift: -5px;
}

.plan-card.is-pressing {
  --plan-lift: 2px;

  transition-duration: 0.12s;
}

.plan-card.is-selected {
  --plan-lift: -8px;
  --plan-ring: var(--plan-accent);
}

.plan-card.is-selected.is-blue {
  --plan-shadow:
    0 0 0 1px rgba(47, 125, 255, 0.2),
    0 10px 26px rgba(47, 125, 255, 0.22),
    0 24px 52px rgba(47, 125, 255, 0.32);
}

.plan-card.is-selected.is-purple {
  --plan-shadow:
    0 0 0 1px rgba(143, 87, 255, 0.22),
    0 10px 26px rgba(143, 87, 255, 0.24),
    0 24px 52px rgba(143, 87, 255, 0.34);
}

.plan-card.is-selected.is-gold {
  --plan-shadow:
    0 0 0 1px rgba(244, 154, 35, 0.24),
    0 10px 26px rgba(244, 154, 35, 0.24),
    0 24px 52px rgba(244, 154, 35, 0.34);
}

.plan-card.is-selected::after {
  opacity: 1;
}

.plan-card:focus-visible {
  --plan-ring: var(--plan-accent);
}

.plan-card:focus-visible::after {
  opacity: 1;
}

.plan-card-check {
  position: absolute;
  top: clamp(10px, 1vw, 14px);
  right: clamp(10px, 1vw, 14px);
  z-index: 3;
  display: grid;
  place-items: center;
  width: clamp(28px, 2.4vw, 34px);
  height: clamp(28px, 2.4vw, 34px);
  border-radius: 999px;
  background: var(--plan-accent);
  color: #fff;
  font-size: 18px;
  box-shadow: 0 8px 18px color-mix(in srgb, var(--plan-accent) 42%, transparent);
  animation: plan-check-pop 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes plan-check-pop {
  0% {
    opacity: 0;
    transform: scale(0.6);
  }

  70% {
    transform: scale(1.08);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.plan-card-bg {
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
  vertical-align: top;
  pointer-events: none;
  transition: filter 0.26s ease;
}

.plan-card:not(.is-selected) .plan-card-bg {
  filter: saturate(0.94) brightness(0.98);
}

.plan-card.is-selected .plan-card-bg {
  filter: saturate(1.04) brightness(1.02);
}

.plan-card.is-pressing .plan-card-bg {
  filter: saturate(1) brightness(0.96);
}

@media (prefers-reduced-motion: reduce) {
  .plan-card,
  .plan-card::after,
  .plan-card-bg,
  .plan-card-check {
    animation: none;
    transition: none;
  }
}

.records-module {
  position: relative;
  z-index: 0;
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  padding: clamp(20px, 1.8vw, 28px);
  border: 1px solid rgba(188, 205, 223, 0.62);
  border-radius: 16px;
  background:
    radial-gradient(circle at 12% 0%, rgba(166, 210, 255, 0.2), transparent 34%),
    radial-gradient(circle at 88% 8%, rgba(255, 214, 153, 0.14), transparent 28%),
    linear-gradient(180deg, #fbfdff 0%, #ffffff 38%, #f7faff 100%);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.72) inset,
    0 16px 42px rgba(71, 99, 132, 0.1);
}

.theme-dark .records-module {
  border-color: rgba(73, 106, 148, 0.5);
  background:
    radial-gradient(circle at 12% 0%, rgba(48, 128, 255, 0.14), transparent 34%),
    linear-gradient(180deg, rgba(10, 20, 40, 0.96) 0%, rgba(8, 16, 35, 0.98) 100%);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.05) inset,
    0 18px 44px rgba(0, 0, 0, 0.28);
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
  border-color: rgba(73, 106, 148, 0.38);
  background:
    radial-gradient(circle, rgba(125, 150, 181, 0.16) 1px, transparent 1.5px) 0 0 / 18px 18px,
    linear-gradient(135deg, rgba(12, 24, 48, 0.92), rgba(8, 16, 35, 0.88));
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
  background: rgba(255, 255, 255, 0.04);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
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
  background: linear-gradient(145deg, #5eb0ff, #2f7dff);
  box-shadow: 0 8px 18px rgba(47, 125, 255, 0.34);
}

.summary-card.is-purple .summary-card-icon {
  background: linear-gradient(145deg, #b58cff, #7b4dff);
  box-shadow: 0 8px 18px rgba(123, 77, 255, 0.34);
}

.summary-card.is-gold .summary-card-icon {
  background: linear-gradient(145deg, #ffc857, #f49a23);
  box-shadow: 0 8px 18px rgba(244, 154, 35, 0.34);
}

.summary-card.is-navy .summary-card-icon {
  background: linear-gradient(145deg, #4f7fd6, #1f4f9c);
  box-shadow: 0 8px 18px rgba(31, 79, 156, 0.34);
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
  color: #2f7dff;
}

.summary-card.is-purple .summary-card-copy strong {
  color: #8f57ff;
}

.summary-card.is-gold .summary-card-copy strong {
  color: #f49a23;
}

.summary-card.is-navy .summary-card-copy strong {
  color: #1f4f9c;
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
  border-color: rgba(73, 106, 148, 0.38);
  background: rgba(255, 255, 255, 0.03);
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
  --n-color: rgba(255, 248, 238, 0.92);
  --n-color-hover: rgba(255, 241, 224, 0.98);
  --n-color-pressed: rgba(255, 232, 204, 0.98);
  --n-color-focus: rgba(255, 244, 232, 0.96);
  --n-border: 1px solid rgba(244, 154, 35, 0.52);
  --n-border-hover: 1px solid rgba(244, 154, 35, 0.72);
  --n-border-pressed: 1px solid rgba(216, 132, 19, 0.82);
  --n-border-focus: 1px solid rgba(244, 154, 35, 0.72);
  --n-text-color: #d88413;
  --n-text-color-hover: #c87915;
  --n-text-color-pressed: #a96510;
  --n-text-color-focus: #d88413;
  width: 100%;
  font-size: 14px;
  font-weight: 800;
}

.records-table-wrap {
  min-width: 0;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(80, 137, 211, 0.58) transparent;
}

.records-table-wrap::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.records-table-wrap::-webkit-scrollbar-track {
  border-radius: 999px;
  background: color-mix(in srgb, var(--recharge-field) 82%, transparent);
}

.records-table-wrap::-webkit-scrollbar-thumb {
  border: 2px solid color-mix(in srgb, var(--recharge-field) 82%, transparent);
  border-radius: 999px;
  background: linear-gradient(180deg, #3c8cff, #1f6ed6);
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
  --n-th-color: rgba(255, 255, 255, 0.05);
  --n-th-color-hover: rgba(255, 255, 255, 0.05);
  --n-th-text-color: #9fb0c7;
  --n-border-color: rgba(125, 150, 181, 0.22);
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

.plan-type-pill {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 8px;
  padding: 5px 12px 5px 8px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
}

.plan-type-pill-icon {
  flex: 0 0 auto;
  font-size: 16px;
}

.plan-type-pill.is-blue {
  background: rgba(47, 125, 255, 0.1);
  color: #2f7dff;
}

.plan-type-pill.is-purple {
  background: rgba(143, 87, 255, 0.1);
  color: #8f57ff;
}

.plan-type-pill.is-gold {
  background: rgba(244, 154, 35, 0.12);
  color: #f49a23;
}

.amount-cell {
  font-size: 15px;
  font-weight: 900;
}

.amount-cell.is-blue {
  color: #2f7dff;
}

.amount-cell.is-purple {
  color: #8f57ff;
}

.amount-cell.is-gold {
  color: #f49a23;
}

.points-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 800;
}

.points-cell-icon {
  color: #f49a23;
  font-size: 18px;
}

.status-text {
  font-size: 14px;
  font-weight: 800;
}

.status-text.is-success {
  color: #18a058;
}

.status-text.is-pending {
  color: #347cff;
}

.status-text.is-failed {
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
  .plan-card {
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
    padding-block: 12px;
  }

  .recharge-hero h1 {
    font-size: 26px;
  }

  .hero-visual {
    height: 86px;
    transform: scale(0.86);
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

  .plan-card {
    flex-basis: 100%;
    max-width: 100%;
  }

  .records-summary {
    grid-template-columns: minmax(0, 1fr);
  }

  .records-module {
    padding: 16px;
  }
}
</style>
