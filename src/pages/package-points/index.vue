<script setup lang="ts">
import { Icon } from "@iconify/vue";

import { useAppStore } from "@/stores/app";

type RechargeRecord = {
  orderNo: string;
  plan: string;
  amount: string;
  points: string;
  status: string;
  paidAt: string;
};

const appStore = useAppStore();

const rechargePlans = [
  {
    name: "基础套餐",
    price: "¥980",
    points: "赠送 200 积分",
    account: "1 账号",
    quota: "1 套件",
    icon: "mdi:layers-triple-outline",
    tone: "blue",
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
  },
  {
    name: "尊享套餐",
    price: "¥9,800",
    points: "赠送 9,800 积分",
    account: "20 账号",
    quota: "20 专属场景",
    icon: "mdi:crown-outline",
    tone: "gold",
  },
] as const;

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
                <div class="plan-icon">
                  <Icon :icon="plan.icon" />
                </div>

                <div class="plan-copy">
                  <h3>{{ plan.name }}</h3>
                  <strong>{{ plan.price }}</strong>
                  <p>{{ plan.points }}</p>
                </div>
              </div>

              <dl class="plan-meta">
                <div>
                  <Icon icon="mdi:account-outline" />
                  <dt>{{ plan.account }}</dt>
                </div>
                <div>
                  <Icon icon="mdi:calendar-check-outline" />
                  <dt>{{ plan.quota }}</dt>
                </div>
              </dl>

              <button class="plan-button" type="button">立即充值</button>
            </article>
          </div>
        </section>

        <section class="records-section" aria-label="充值流水">
          <div class="records-header">
            <h2>充值流水</h2>
            <form class="records-filter">
              <label class="date-filter">
                <span class="sr-only">开始日期</span>
                <input type="text" value="开始日期" readonly />
                <Icon icon="mdi:arrow-right" />
                <span class="sr-only">结束日期</span>
                <input type="text" value="结束日期" readonly />
                <Icon icon="mdi:calendar-month-outline" />
              </label>

              <label class="type-filter">
                <span class="sr-only">全部类型</span>
                <select>
                  <option>全部类型</option>
                  <option>基础套餐</option>
                  <option>进阶套餐</option>
                  <option>尊享套餐</option>
                </select>
                <Icon icon="mdi:chevron-down" />
              </label>

              <button type="button" class="export-button">导出记录</button>
            </form>
          </div>

          <div class="records-table-wrap">
            <table class="records-table">
              <thead>
                <tr>
                  <th>订单号</th>
                  <th>套餐类型</th>
                  <th>金额（元）</th>
                  <th>获得积分</th>
                  <th>状态</th>
                  <th>支付时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="record in records" :key="record.orderNo">
                  <td>{{ record.orderNo }}</td>
                  <td>{{ record.plan }}</td>
                  <td>{{ record.amount }}</td>
                  <td>{{ record.points }}</td>
                  <td>
                    <span
                      class="status-dot"
                      :class="
                        record.status === '支付成功'
                          ? 'is-success'
                          : 'is-failed'
                      "
                    ></span>
                    {{ record.status }}
                  </td>
                  <td>{{ record.paidAt }}</td>
                  <td>
                    <button type="button" class="detail-button">
                      查看详情
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <nav class="records-pager" aria-label="充值流水分页">
            <button type="button" disabled aria-label="上一页">
              <Icon icon="mdi:chevron-left" />
            </button>
            <button class="active" type="button" aria-current="page">1</button>
            <button type="button" disabled aria-label="下一页">
              <Icon icon="mdi:chevron-right" />
            </button>
          </nav>
        </section>
      </section>
    </section>
  </main>
</template>

<style scoped lang="scss">
.recharge-page {
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
  height: calc(100vh - var(--app-header-offset));
  min-height: 0;
  overflow: hidden;
  padding: clamp(18px, 2.4vw, 34px);
  background:
    radial-gradient(
      820px 220px at 68% 0%,
      rgba(48, 128, 255, 0.16),
      transparent 70%
    ),
    linear-gradient(180deg, #0e1d34, var(--recharge-bg));
  color: var(--recharge-text);
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
  width: min(1760px, 100%);
  height: 100%;
  min-height: 0;
  margin: 0 auto;
}

.recharge-panel {
  display: flex;
  height: 100%;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
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
  flex-shrink: 0;
  min-width: 0;
  padding: clamp(18px, 1.6vw, 22px) clamp(22px, 2.4vw, 34px) clamp(20px, 2vw, 30px);
}

.plan-section h2,
.records-header h2 {
  font-size: 20px;
  line-height: 1.35;
}

.plan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: clamp(18px, 2.2vw, 38px);
  margin-top: 18px;
}

.plan-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: clamp(196px, 22vh, 214px);
  padding: clamp(20px, 1.6vw, 24px) clamp(20px, 1.8vw, 26px) 20px;
  border: 1px solid var(--recharge-border-soft);
  border-radius: 10px;
  background: var(--recharge-panel-strong);
}

.theme-light .plan-card {
  background: rgba(255, 255, 255, 0.74);
}

.plan-card.is-active {
  border-color: rgba(121, 91, 255, 0.92);
  box-shadow: 0 0 26px rgba(126, 88, 255, 0.22);
}

.theme-light .plan-card.is-active {
  border-color: rgba(101, 113, 255, 0.74);
  box-shadow: 0 14px 30px rgba(113, 98, 245, 0.14);
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
  grid-template-columns: 70px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.plan-icon {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
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
  margin: 0;
  color: var(--recharge-text);
  font-size: 18px;
  line-height: 1.3;
  font-weight: 900;
}

.plan-copy strong {
  display: block;
  margin-top: 9px;
  font-size: 34px;
  line-height: 1.1;
  font-weight: 900;
  letter-spacing: 0;
}

.is-blue .plan-copy strong {
  color: var(--recharge-blue);
}

.is-purple .plan-copy strong {
  color: var(--recharge-purple);
}

.is-gold .plan-copy strong {
  color: var(--recharge-gold);
}

.plan-copy p {
  margin: 10px 0 0;
  color: var(--recharge-text);
  font-size: 14px;
  font-weight: 800;
}

.plan-meta {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin: auto 0 18px;
  color: var(--recharge-muted);
}

.plan-meta div {
  display: flex;
  align-items: center;
  gap: 6px;
}

.plan-meta dt {
  font-size: 14px;
  font-weight: 700;
}

.plan-button {
  height: 36px;
  border-radius: 12px;
  border: 1px solid currentColor;
  background: transparent;
  color: currentColor;
  font-family: inherit;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
}

.is-blue .plan-button {
  color: var(--recharge-blue);
}

.is-purple .plan-button {
  border: 0;
  background: linear-gradient(100deg, #4d74ff, #b347ff);
  color: #fff;
  box-shadow: 0 10px 22px rgba(132, 80, 255, 0.25);
}

.is-gold .plan-button {
  color: var(--recharge-gold);
}

.records-section {
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
  gap: 22px;
}

.records-filter {
  display: grid;
  grid-template-columns: minmax(260px, 1.25fr) minmax(150px, 0.72fr) minmax(92px, 0.42fr);
  gap: 12px;
  align-items: center;
  min-width: min(100%, 560px);
}

.date-filter,
.type-filter {
  position: relative;
  display: flex;
  align-items: center;
  height: 38px;
  border: 1px solid var(--recharge-border-soft);
  border-radius: 5px;
  background: var(--recharge-field);
  color: var(--recharge-muted);
}

.date-filter {
  padding: 0 12px;
  gap: 10px;
}

.date-filter input {
  width: 92px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--recharge-muted);
  font: inherit;
  font-size: 14px;
}

.type-filter select {
  width: 100%;
  height: 100%;
  padding: 0 36px 0 14px;
  appearance: none;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--recharge-text);
  font: inherit;
  font-size: 14px;
}

.type-filter > .iconify {
  position: absolute;
  right: 10px;
  color: var(--recharge-muted);
}

.export-button {
  height: 38px;
  border: 0;
  border-radius: 5px;
  background: rgba(52, 124, 255, 0.12);
  color: var(--recharge-blue);
  font-family: inherit;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.records-table-wrap {
  flex: 1;
  min-height: 0;
  margin-top: 18px;
  overflow: auto;
  border: 1px solid var(--recharge-border-soft);
  border-radius: 8px;
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

.records-table {
  width: max(100%, 1040px);
  min-width: 0;
  border-collapse: collapse;
  table-layout: fixed;
  color: var(--recharge-text);
  font-size: 14px;
}

.records-table th {
  position: sticky;
  top: 0;
  z-index: 2;
  height: 42px;
  padding: 0 14px;
  background: var(--recharge-head);
  color: var(--recharge-text);
  text-align: left;
  font-weight: 800;
}

.records-table td {
  height: 42px;
  padding: 0 14px;
  border-bottom: 1px solid var(--recharge-row);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.records-table th:nth-child(1) {
  width: 18%;
}

.records-table th:nth-child(2) {
  width: 14%;
}

.records-table th:nth-child(3),
.records-table th:nth-child(4),
.records-table th:nth-child(5) {
  width: 12%;
}

.records-table th:nth-child(6) {
  width: 20%;
}

.records-table th:nth-child(7) {
  width: 12%;
}

.status-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 8px;
  border-radius: 999px;
  vertical-align: middle;
}

.status-dot.is-success {
  background: #19c27d;
}

.status-dot.is-failed {
  background: #ff4e55;
}

.detail-button {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--recharge-blue);
  font-family: inherit;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.records-pager {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}

.records-pager button {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--recharge-border-soft);
  border-radius: 5px;
  background: var(--recharge-field);
  color: var(--recharge-muted);
  font: inherit;
  cursor: pointer;
}

.records-pager .active {
  border-color: var(--recharge-blue);
  background: var(--recharge-blue);
  color: #fff;
  font-weight: 900;
}

.records-pager button:disabled {
  opacity: 0.55;
  cursor: default;
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
    padding: 18px;
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

@media (max-width: 980px) {
  .recharge-page {
    height: auto;
    min-height: calc(100vh - var(--app-header-offset));
    overflow: auto;
  }

  .recharge-shell,
  .recharge-panel {
    height: auto;
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

  .export-button {
    width: 100%;
  }

  .records-section {
    min-height: 520px;
  }

  .records-table-wrap {
    min-height: 390px;
  }
}

@media (max-width: 680px) {
  .recharge-page {
    padding: 12px;
  }

  .plan-grid,
  .records-filter {
    grid-template-columns: minmax(0, 1fr);
  }

  .date-filter {
    flex-wrap: wrap;
    height: auto;
    min-height: 38px;
    padding-block: 8px;
  }

  .date-filter input {
    width: calc(50% - 18px);
  }
}
</style>
