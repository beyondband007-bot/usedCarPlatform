<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { h } from "vue";
import {
  NButton,
  NDataTable,
  NDatePicker,
  NPagination,
  NSelect,
  NTag,
} from "naive-ui";
import type { DataTableColumns } from "naive-ui";

import { useAppStore } from "@/stores/app";

type RechargeRecord = {
  orderNo: string;
  plan: string;
  amount: string;
  points: string;
  status: string;
  paidAt: string;
};

type RechargePlan = {
  name: string;
  price: string;
  points: string;
  account: string;
  quota: string;
  icon: string;
  tone: "blue" | "purple" | "gold";
  active?: boolean;
  badge?: string;
  features?: string[];
};

const appStore = useAppStore();

const recordTypeOptions = [
  { label: "全部类型", value: "all" },
  { label: "基础套餐", value: "basic" },
  { label: "进阶套餐", value: "advanced" },
  { label: "尊享套餐", value: "premium" },
];

const rechargePlans: RechargePlan[] = [
  {
    name: "基础套餐",
    price: "¥980",
    points: "赠送 200 积分",
    account: "1 账号",
    quota: "1 套件",
    icon: "mdi:layers-triple-outline",
    tone: "blue",
    badge: "入门优选",
    features: [
      "1 个企业账号",
      "每账号同时上传 1 套外观图组",
      "单张生成正常使用",
      "适合小团队试运行",
    ],
  },
  {
    name: "进阶套餐",
    price: "¥2,980",
    points: "赠送 550 积分",
    account: "5 账号",
    quota: "5 套件",
    icon: "mdi:layers-plus",
    tone: "purple",
    active: true,
    features: [
      "5 个企业账号",
      "每账号同时上传 5 套外观图组",
      "单张生成正常使用",
      "适合车商团队批量上新",
    ],
  },
  {
    name: "尊享套餐",
    price: "¥9,800",
    points: "赠送 9,800 积分",
    account: "20 账号",
    quota: "20 专属场景",
    icon: "mdi:crown-outline",
    tone: "gold",
    badge: "商阶之选",
    features: [
      "20 个企业账号",
      "每账号同时上传 20 套外观图组",
      "可定制 20 个专属场景",
      "适合集团化和出海团队",
    ],
  },
];

const records: RechargeRecord[] = [
  {
    orderNo: "202605200001",
    plan: "进阶套餐",
    amount: "¥2,980",
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
    orderNo: "202605150004",
    plan: "进阶套餐",
    amount: "¥2,980",
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
    width: 140,
  },
  {
    title: "金额（元）",
    key: "amount",
    width: 130,
  },
  {
    title: "获得积分",
    key: "points",
    width: 130,
  },
  {
    title: "状态",
    key: "status",
    width: 140,
    render(row) {
      return h(
        NTag,
        {
          type: row.status === "支付成功" ? "success" : "error",
          round: true,
          bordered: false,
          class: "status-tag",
        },
        { default: () => row.status },
      );
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
    width: 120,
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
        { default: () => "查看详情" },
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

        <section class="plan-section">
          <h2>选择充值套餐</h2>
          <div class="plan-grid">
            <article
              v-for="plan in rechargePlans"
              :key="plan.name"
              class="plan-card"
              :class="[`is-${plan.tone}`, { 'is-active': plan.active }]"
            >
              <span v-if="plan.active" class="recommend-badge">推荐</span>
              <div class="plan-main">
                <div v-if="plan.tone === 'blue'" class="plan-visual-stack" aria-hidden="true">
                  <span class="stack-base"></span>
                  <span class="stack-layer stack-layer-bottom"></span>
                  <span class="stack-layer stack-layer-middle"></span>
                  <span class="stack-layer stack-layer-top">
                    <Icon icon="mdi:flash" />
                  </span>
                </div>

                <div v-else class="plan-icon">
                  <Icon :icon="plan.icon" />
                </div>

                <div class="plan-copy">
                  <h3>
                    {{ plan.name }}
                    <span v-if="plan.badge" class="plan-badge">{{ plan.badge }}</span>
                  </h3>
                  <div class="plan-price-row">
                    <strong>{{ plan.price }}</strong>
                    <span>/ 套餐</span>
                  </div>
                  <p class="plan-gift">
                    <Icon icon="mdi:gift-outline" />
                    {{ plan.points }}
                  </p>
                </div>
              </div>

              <ul v-if="plan.features" class="plan-features">
                <li v-for="feature in plan.features" :key="feature">
                  <Icon icon="mdi:check-circle" />
                  <span>{{ feature }}</span>
                </li>
              </ul>

              <dl v-else class="plan-meta">
                <div>
                  <Icon icon="mdi:account-outline" />
                  <dt>{{ plan.account }}</dt>
                </div>
                <div>
                  <Icon icon="mdi:calendar-check-outline" />
                  <dt>{{ plan.quota }}</dt>
                </div>
              </dl>

              <NButton class="plan-button" type="primary" attr-type="button">
                <span class="plan-button-text">立即充值</span>
                <Icon class="plan-button-arrow" icon="mdi:arrow-right" />
              </NButton>
            </article>
          </div>
        </section>

        <section class="records-section" aria-label="充值流水">
          <div class="records-header">
            <h2>充值流水</h2>
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
                type="primary"
                secondary
                size="medium"
                attr-type="button"
              >
                导出记录
              </NButton>
            </form>
          </div>

          <div class="records-table-wrap">
            <NDataTable
              class="records-data-table"
              :columns="recordsColumns"
              :data="records"
              :bordered="false"
              :single-line="false"
              :pagination="false"
              :scroll-x="1040"
              flex-height
            />
          </div>

          <NPagination class="records-pager" :page="1" :page-count="1" />
        </section>
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
  width: min(2400px, 100%);
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
.plan-section h2,
.records-header h2 {
  margin: 0;
  color: var(--recharge-text);
  font-weight: 900;
  letter-spacing: 0;
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

.plan-section {
  position: relative;
  z-index: 0;
  flex-shrink: 0;
  min-width: 0;
  padding: clamp(18px, 1.6vw, 22px) clamp(22px, 2.4vw, 34px) clamp(28px, 2.4vw, 38px);
}

.plan-section h2,
.records-header h2 {
  font-size: 20px;
  line-height: 1.35;
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
  position: relative;
  isolation: isolate;
  contain: layout paint;
  display: flex;
  flex-direction: column;
  flex: 1 1 calc((100% - var(--plan-gap) - var(--plan-gap)) / 3);
  min-width: 0;
  width: 100%;
  max-width: calc((100% - var(--plan-gap) - var(--plan-gap)) / 3);
  aspect-ratio: 3 / 4;
  max-width: 100%;
  height: auto;
  min-height: 0;
  max-height: none;
  overflow: hidden;
  padding: clamp(18px, 1.4vw, 22px) clamp(18px, 1.5vw, 24px) 18px;
  border: 1px solid var(--recharge-border-soft);
  border-radius: 10px;
  background: var(--recharge-panel-strong);
}

.plan-card > * {
  position: relative;
  z-index: 1;
  min-width: 0;
}

.plan-card.is-blue {
  border-color: rgba(79, 151, 255, 0.46);
  background:
    radial-gradient(circle at 22% 28%, rgba(72, 166, 255, 0.22), transparent 24%),
    linear-gradient(135deg, rgba(12, 32, 64, 0.96), rgba(8, 19, 40, 0.92));
  box-shadow:
    inset 0 0 0 1px rgba(110, 174, 255, 0.08),
    0 16px 34px rgba(13, 33, 68, 0.18);
}

.theme-light .plan-card.is-blue {
  border-color: rgba(151, 191, 255, 0.76);
  background:
    radial-gradient(circle at 18% 26%, rgba(96, 174, 255, 0.18), transparent 25%),
    linear-gradient(112deg, rgba(255, 255, 255, 0.99) 0%, rgba(250, 253, 255, 0.96) 46%, rgba(232, 243, 255, 0.92) 100%);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.86),
    0 20px 42px rgba(64, 119, 186, 0.12);
}

.plan-card.is-blue::before,
.plan-card.is-blue::after {
  content: "";
  position: absolute;
  z-index: 0;
  pointer-events: none;
}

.plan-card.is-blue::before {
  inset: 0;
  opacity: 0.4;
  background:
    linear-gradient(140deg, transparent 54%, rgba(104, 180, 255, 0.32) 54.5%, transparent 55%),
    linear-gradient(150deg, transparent 62%, rgba(104, 180, 255, 0.22) 62.5%, transparent 63%),
    radial-gradient(circle at 78% 50%, rgba(104, 180, 255, 0.5) 0 3px, transparent 4px),
    radial-gradient(circle at 88% 40%, rgba(104, 180, 255, 0.38) 0 2px, transparent 3px);
}

.theme-light .plan-card.is-blue::before {
  opacity: 0.72;
}

.plan-card.is-blue::after {
  top: 18px;
  right: 22px;
  width: 150px;
  height: 74px;
  opacity: 0.34;
  background-image: radial-gradient(circle, rgba(93, 164, 255, 0.52) 1px, transparent 1.5px);
  background-size: 12px 12px;
  mask-image: linear-gradient(90deg, transparent, #000 22%, #000 70%, transparent);
}

.theme-light .plan-card {
  background: rgba(255, 255, 255, 0.74);
}

.plan-card.is-active {
  border-color: rgba(121, 91, 255, 0.92);
  box-shadow: inset 0 0 0 1px rgba(121, 91, 255, 0.28);
}

.theme-light .plan-card.is-active {
  border-color: rgba(101, 113, 255, 0.74);
  box-shadow: inset 0 0 0 1px rgba(101, 113, 255, 0.18);
}

.recommend-badge {
  position: absolute;
  top: 10px;
  right: 16px;
  padding: 4px 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, #6e74ff, #ad58ff);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
}

.plan-main {
  display: grid;
  min-width: 0;
  grid-template-columns: clamp(50px, 3.5vw, 64px) minmax(0, 1fr);
  gap: clamp(14px, 1.2vw, 18px);
  align-items: start;
}

.is-blue .plan-main {
  grid-template-columns: clamp(118px, 8.5vw, 160px) minmax(0, 1fr);
  align-items: center;
  gap: clamp(20px, 1.8vw, 28px);
}

.plan-copy {
  min-width: 0;
  overflow: hidden;
}

.plan-visual-stack {
  position: relative;
  width: clamp(112px, 8vw, 148px);
  height: clamp(104px, 7.2vw, 138px);
  align-self: center;
  justify-self: center;
  filter: drop-shadow(0 18px 18px rgba(47, 127, 238, 0.22));
}

.stack-base,
.stack-layer {
  position: absolute;
  left: 50%;
  border-radius: 16px;
  transform: translateX(-50%) rotateX(58deg) rotateZ(-45deg);
  transform-style: preserve-3d;
}

.stack-base {
  bottom: 4px;
  width: 104px;
  height: 104px;
  border: 1px solid rgba(147, 205, 255, 0.88);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(176, 224, 255, 0.6)),
    rgba(225, 244, 255, 0.78);
  box-shadow:
    0 12px 26px rgba(55, 144, 242, 0.26),
    inset 0 0 18px rgba(94, 183, 255, 0.32);
}

.stack-layer {
  width: 78px;
  height: 78px;
  background: linear-gradient(145deg, #8fd9ff, #2f80ff 72%, #1267ef);
  box-shadow:
    0 12px 24px rgba(31, 117, 231, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.48);
}

.stack-layer-bottom {
  bottom: 38px;
  opacity: 0.7;
  filter: blur(0.1px);
}

.stack-layer-middle {
  bottom: 58px;
  width: 84px;
  height: 84px;
  opacity: 0.82;
  background: linear-gradient(145deg, #a8e7ff, #4a98ff 70%, #1c73f5);
}

.stack-layer-top {
  bottom: 80px;
  display: grid;
  place-items: center;
  width: 88px;
  height: 88px;
  color: rgba(223, 247, 255, 0.92);
  font-size: 32px;
}

.stack-layer-top .iconify {
  transform: rotate(45deg) rotateX(-58deg);
  filter: drop-shadow(0 4px 8px rgba(255, 255, 255, 0.34));
}

.plan-icon {
  display: grid;
  place-items: center;
  width: clamp(50px, 3.5vw, 58px);
  height: clamp(50px, 3.5vw, 58px);
  border-radius: 14px;
  font-size: 36px;
}

.is-blue .plan-icon {
  background: rgba(52, 124, 255, 0.13);
  color: var(--recharge-blue);
}

.is-purple .plan-icon {
  background: rgba(143, 87, 255, 0.15);
  color: var(--recharge-purple);
}

.is-gold .plan-icon {
  background: rgba(244, 154, 35, 0.14);
  color: var(--recharge-gold);
}

.plan-copy h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  margin: 0;
  color: var(--recharge-text);
  font-size: 18px;
  line-height: 1.3;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plan-badge {
  flex: 0 0 auto;
  padding: 2px 7px;
  border: 1px solid rgba(77, 139, 255, 0.48);
  border-radius: 999px;
  background: rgba(59, 137, 255, 0.1);
  color: #4c88ff;
  font-size: 12px;
  line-height: 1.25;
  font-weight: 800;
}

.theme-dark .plan-badge {
  border-color: rgba(118, 184, 255, 0.46);
  background: rgba(75, 151, 255, 0.14);
  color: #95c7ff;
}

.is-gold .plan-badge {
  border-color: rgba(244, 154, 35, 0.42);
  background: rgba(244, 154, 35, 0.1);
  color: var(--recharge-gold);
}

.plan-price-row {
  display: flex;
  align-items: baseline;
  min-width: 0;
  gap: 8px;
  margin-top: 9px;
}

.plan-price-row strong {
  display: block;
  overflow: hidden;
  font-size: clamp(28px, 2vw, 34px);
  line-height: 1.1;
  font-weight: 900;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plan-price-row span {
  flex: 0 0 auto;
  color: var(--recharge-muted);
  font-size: 13px;
  font-weight: 800;
}

.is-blue .plan-price-row strong {
  color: var(--recharge-blue);
}

.is-purple .plan-price-row strong {
  color: var(--recharge-purple);
}

.is-gold .plan-price-row strong {
  color: var(--recharge-gold);
}

.plan-copy p {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  margin: 10px 0 0;
  color: var(--recharge-text);
  font-size: 14px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plan-gift .iconify {
  flex: 0 0 auto;
  color: currentColor;
  font-size: 16px;
}

.is-blue .plan-gift {
  color: #2d78f5;
}

.theme-dark .is-blue .plan-gift {
  color: #8dbdff;
}

.plan-features {
  display: grid;
  min-width: 0;
  gap: 8px;
  margin: clamp(12px, 1.1vw, 18px) 0 auto;
  padding: 0 0 0 clamp(68px, 4.8vw, 88px);
  color: var(--recharge-text);
  list-style: none;
}

.is-blue .plan-features {
  padding-left: clamp(118px, 8.5vw, 160px);
}

.plan-features li {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  line-height: 1.35;
  font-weight: 800;
}

.plan-features .iconify {
  flex: 0 0 auto;
  color: currentColor;
  font-size: 16px;
}

.is-blue .plan-features {
  color: #163358;
}

.theme-dark .is-blue .plan-features {
  color: #d7e8ff;
}

.is-blue .plan-features .iconify {
  color: var(--recharge-blue);
}

.is-purple .plan-features {
  color: color-mix(in srgb, var(--recharge-text) 88%, var(--recharge-purple));
}

.is-purple .plan-features .iconify {
  color: var(--recharge-purple);
}

.is-gold .plan-features {
  color: color-mix(in srgb, var(--recharge-text) 88%, var(--recharge-gold));
}

.is-gold .plan-features .iconify {
  color: var(--recharge-gold);
}

.plan-features span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plan-meta {
  display: flex;
  flex-wrap: wrap;
  align-self: stretch;
  justify-content: center;
  min-width: 0;
  gap: clamp(18px, 1.8vw, 32px);
  row-gap: 8px;
  margin: auto 0 14px;
  color: var(--recharge-muted);
}

.plan-meta div {
  display: flex;
  min-width: 0;
  max-width: 100%;
  align-items: center;
  gap: 6px;
}

.plan-meta dt {
  overflow: hidden;
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plan-button {
  --n-height: 40px;
  --n-border-radius: 999px;
  --n-color: transparent;
  --n-color-hover: color-mix(in srgb, currentColor 10%, transparent);
  --n-color-pressed: color-mix(in srgb, currentColor 14%, transparent);
  --n-color-focus: color-mix(in srgb, currentColor 10%, transparent);
  --n-border: 1px solid currentColor;
  --n-border-hover: 1px solid currentColor;
  --n-border-pressed: 1px solid currentColor;
  --n-border-focus: 1px solid currentColor;
  --n-text-color: currentColor;
  --n-text-color-hover: currentColor;
  --n-text-color-pressed: currentColor;
  --n-text-color-focus: currentColor;
  display: flex;
  box-sizing: border-box;
  flex: 0 0 40px;
  height: 40px;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  align-self: end;
  justify-self: stretch;
  overflow: hidden;
  border-radius: 999px;
  border: 1px solid currentColor;
  background: transparent;
  color: currentColor;
  font-family: inherit;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
}

.plan-button :deep(.n-button__content) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plan-button-arrow {
  flex: 0 0 auto;
  font-size: 17px;
}

.is-blue .plan-button {
  --n-text-color: var(--recharge-blue);
  --n-text-color-hover: var(--recharge-blue);
  --n-text-color-pressed: #1f6ed6;
  --n-text-color-focus: var(--recharge-blue);
  --n-border: 1px solid var(--recharge-blue);
  --n-border-hover: 1px solid var(--recharge-blue);
  --n-border-pressed: 1px solid #1f6ed6;
  --n-border-focus: 1px solid var(--recharge-blue);
  color: var(--recharge-blue);
}

.is-purple .plan-button {
  --n-color: #4d74ff;
  --n-color-hover: #5c82ff;
  --n-color-pressed: #435fe4;
  --n-color-focus: #4d74ff;
  --n-border: 0;
  --n-border-hover: 0;
  --n-border-pressed: 0;
  --n-border-focus: 0;
  --n-text-color: #fff;
  --n-text-color-hover: #fff;
  --n-text-color-pressed: #fff;
  --n-text-color-focus: #fff;
  border: 0;
  background: linear-gradient(100deg, #4d74ff, #b347ff);
  color: #fff;
  box-shadow: none;
}

.is-gold .plan-button {
  --n-text-color: var(--recharge-gold);
  --n-text-color-hover: var(--recharge-gold);
  --n-text-color-pressed: #c87915;
  --n-text-color-focus: var(--recharge-gold);
  --n-border: 1px solid var(--recharge-gold);
  --n-border-hover: 1px solid var(--recharge-gold);
  --n-border-pressed: 1px solid #c87915;
  --n-border-focus: 1px solid var(--recharge-gold);
  color: var(--recharge-gold);
}

.records-section {
  position: relative;
  z-index: 1;
  display: flex;
  min-width: 0;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  padding: 0 clamp(22px, 2.4vw, 34px) clamp(18px, 2vw, 28px);
}

.records-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  flex-shrink: 0;
  min-width: 0;
  flex-wrap: wrap;
  gap: 22px;
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
  --n-color: rgba(52, 124, 255, 0.12);
  --n-color-hover: rgba(52, 124, 255, 0.18);
  --n-color-pressed: rgba(52, 124, 255, 0.24);
  --n-color-focus: rgba(52, 124, 255, 0.16);
  --n-text-color: var(--recharge-blue);
  --n-text-color-hover: var(--recharge-blue);
  --n-text-color-pressed: #1f6ed6;
  --n-text-color-focus: var(--recharge-blue);
  width: 100%;
  align-self: end;
  font-size: 14px;
  font-weight: 800;
}

.records-table-wrap {
  flex: 1;
  height: auto;
  min-height: clamp(420px, 46vh, 740px);
  margin-top: 18px;
  overflow: auto;
  border: 1px solid var(--recharge-border-soft);
  border-radius: 8px;
  background: color-mix(in srgb, var(--recharge-panel-strong) 74%, transparent);
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
  --n-font-size: 15px;
  --n-th-color: var(--recharge-head);
  --n-th-color-hover: var(--recharge-head);
  --n-th-text-color: var(--recharge-text);
  --n-td-color: transparent;
  --n-td-color-hover: color-mix(in srgb, var(--recharge-blue) 8%, transparent);
  --n-td-text-color: var(--recharge-text);
  --n-border-color: var(--recharge-row);
  --n-border-radius: 8px;
  height: 100%;
  color: var(--recharge-text);
}

.records-data-table :deep(.n-data-table-wrapper),
.records-data-table :deep(.n-data-table-base-table) {
  height: 100%;
}

.records-data-table :deep(.n-data-table-th) {
  height: 50px;
  padding: 0 14px;
  font-weight: 800;
  white-space: nowrap;
}

.records-data-table :deep(.n-data-table-td) {
  height: 54px;
  padding: 0 14px;
  font-weight: 600;
}

.status-tag {
  font-weight: 800;
}

.detail-button {
  --n-text-color: var(--recharge-blue);
  --n-text-color-hover: #2b84ff;
  --n-text-color-pressed: #1f6ed6;
  --n-text-color-focus: var(--recharge-blue);
  font-weight: 800;
}

.records-pager {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  margin-top: 14px;
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
    gap: 18px;
  }

  .plan-card {
    padding-inline: 20px;
  }

  .records-filter {
    grid-template-columns: minmax(240px, 1.15fr) minmax(140px, 0.8fr) 92px;
  }
}

@media (max-width: 1180px) {
  .plan-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .plan-visual-stack {
    margin-top: 12px;
    transform: scale(0.82);
    transform-origin: center center;
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

  .plan-section {
    padding-block: 14px 16px;
  }

  .plan-grid {
    margin-top: 12px;
  }

  .plan-card {
    height: clamp(280px, 16vw, 306px);
    min-height: 280px;
    max-height: 306px;
    padding-block: 16px;
  }

  .plan-icon {
    width: 48px;
    height: 48px;
    font-size: 30px;
  }

  .plan-main {
    grid-template-columns: 56px minmax(0, 1fr);
  }

  .plan-copy strong {
    font-size: 28px;
  }

  .plan-features {
    gap: 6px;
    margin-top: 10px;
  }

  .plan-meta {
    margin-bottom: 12px;
  }

  .records-table-wrap {
    height: auto;
    min-height: 300px;
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
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .plan-card {
    height: clamp(286px, 34vw, 316px);
    min-height: 286px;
    max-height: 316px;
  }

  .export-button {
    width: 100%;
  }

  .records-section {
    min-height: 0;
  }

  .records-table-wrap {
    height: auto;
    min-height: clamp(380px, 56vh, 620px);
  }
}

@media (max-width: 680px) {
  .recharge-page {
    --recharge-page-pad: 12px;
  }

  .plan-grid,
  .records-filter {
    grid-template-columns: minmax(0, 1fr);
  }

  .plan-card {
    height: 314px;
    min-height: 314px;
    max-height: 314px;
  }

  .is-blue .plan-main {
    grid-template-columns: 96px minmax(0, 1fr);
    gap: 16px;
  }

  .plan-visual-stack {
    width: 92px;
    height: 96px;
    transform: scale(0.84);
    transform-origin: center center;
  }

  .plan-features {
    padding-left: 0;
  }
}
</style>
