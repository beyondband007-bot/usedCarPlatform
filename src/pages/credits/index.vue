<script setup lang="ts">
import { Icon } from "@iconify/vue";

import { useAppStore } from "@/stores/app";
import {
  creditsAccountOptions,
  creditsFlowData,
  creditsPageCopy,
  creditsStats,
  creditsTypeOptions,
} from "@/constants/credits-page";

const appStore = useAppStore();
const copy = creditsPageCopy;

const stats = creditsStats.map((stat) => {
  const visual =
    stat.tone === "success"
      ? { className: "is-green", glyph: "累", icon: "mdi:leaf" }
      : stat.tone === "warning"
        ? { className: "is-orange", glyph: "累", icon: "mdi:flash" }
        : stat.tone === "info"
          ? { className: "is-blue", glyph: "当", icon: "mdi:diamond-stone" }
          : { className: "is-purple", glyph: "近", icon: "mdi:chart-timeline-variant-shimmer" };

  return { ...stat, ...visual };
});

const tagClass = (flowType: string) => {
  if (flowType === "套餐赠送" || flowType === "失败退款") return "is-positive";
  if (flowType === "单图生成") return "is-warning";
  return "is-cost";
};
</script>

<template>
  <main class="credits-page" :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'">
    <div class="credits-shell">
      <section class="query-panel" aria-label="积分查询筛选与概要">
        <header class="query-header">
          <div class="query-title">
            <h1>{{ copy.title }}</h1>
            <p>{{ copy.subtitle }}</p>
          </div>
          <button class="query-button" type="button">查分查询</button>
        </header>

        <form class="filter-bar" aria-label="积分流水查询条件">
          <label class="date-range">
            <span class="sr-only">开始日期</span>
            <input type="date" value="2026-05-01" />
            <Icon icon="mdi:arrow-right" />
            <span class="sr-only">结束日期</span>
            <input type="date" value="2026-05-27" />
          </label>

          <label class="filter-select">
            <span class="sr-only">{{ copy.typePlaceholder }}</span>
            <select>
              <option v-for="option in creditsTypeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <Icon icon="mdi:chevron-down" />
          </label>

          <label class="filter-select">
            <span class="sr-only">{{ copy.accountPlaceholder }}</span>
            <select>
              <option v-for="option in creditsAccountOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <Icon icon="mdi:chevron-down" />
          </label>

          <button class="export-button" type="button">{{ copy.export }}</button>
        </form>

        <section class="stats-grid" aria-label="积分统计">
          <article v-for="stat in stats" :key="stat.label" class="stat-card" :class="stat.className">
            <div class="stat-glyph">{{ stat.glyph }}</div>
            <div class="stat-content">
              <p>{{ stat.label }}</p>
              <strong>{{ stat.value }}</strong>
              <span>{{ copy.pointsUnit }}</span>
            </div>
            <Icon :icon="stat.icon" class="stat-icon" />
          </article>
        </section>
      </section>

      <section class="flow-panel" aria-label="积分流水明细">
        <h2>{{ copy.tableTitle }}</h2>

        <div class="flow-table-wrap">
          <table class="flow-table">
            <thead>
              <tr>
                <th>{{ copy.colFlowNo }}</th>
                <th>{{ copy.colFlowType }}</th>
                <th>{{ copy.colDelta }}</th>
                <th>{{ copy.colBalance }}</th>
                <th>{{ copy.colAccount }}</th>
                <th>{{ copy.colCreatedAt }}</th>
                <th>{{ copy.colRemark }}</th>
                <th>{{ copy.colAction }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in creditsFlowData" :key="row.flowNo">
                <td>{{ row.flowNo }}</td>
                <td>
                  <span class="flow-tag" :class="tagClass(row.flowType)">{{ row.flowType }}</span>
                </td>
                <td class="delta" :class="row.delta.startsWith('+') ? 'is-up' : 'is-down'">
                  {{ row.delta }}
                </td>
                <td>{{ row.balance }}</td>
                <td>{{ row.account }}</td>
                <td>{{ row.createdAt }}</td>
                <td>{{ row.remark }}</td>
                <td>
                  <button class="detail-button" type="button">{{ copy.viewDetail }}</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <nav class="pager" aria-label="流水分页">
          <button type="button" disabled aria-label="上一页">
            <Icon icon="mdi:chevron-left" />
          </button>
          <button class="active" type="button" aria-current="page">1</button>
          <button type="button" disabled aria-label="下一页">
            <Icon icon="mdi:chevron-right" />
          </button>
        </nav>
      </section>
    </div>
  </main>
</template>

<style scoped lang="scss">
.credits-page {
  --credit-bg-a: rgba(20, 31, 50, 0.8);
  --credit-bg-b: rgba(7, 13, 26, 0.98);
  --credit-panel: rgba(16, 25, 40, 0.8);
  --credit-panel-strong: rgba(14, 22, 37, 0.94);
  --credit-border: rgba(103, 132, 167, 0.34);
  --credit-border-soft: rgba(119, 145, 175, 0.18);
  --credit-text: #edf5ff;
  --credit-text-soft: #a4b5ca;
  --credit-field: rgba(255, 255, 255, 0.055);
  --credit-head: rgba(255, 255, 255, 0.065);
  --credit-row-border: rgba(112, 136, 164, 0.22);
  --credit-link: #438dff;
  --credit-blue: #3282fa;
  --panel-shadow:
    0 0 0 1px rgba(53, 118, 174, 0.08),
    0 24px 56px rgba(0, 0, 0, 0.24),
    0 0 34px rgba(26, 123, 205, 0.14);

  min-width: 0;
  height: calc(100vh - var(--app-header-offset));
  min-height: 0;
  overflow: hidden;
  padding: clamp(18px, 2.4vw, 34px);
  background:
    radial-gradient(840px 140px at 50% 0%, rgba(31, 139, 223, 0.14), transparent 68%),
    linear-gradient(180deg, var(--credit-bg-a), var(--credit-bg-b));
  color: var(--credit-text);
}

.credits-shell {
  display: grid;
  width: min(1760px, 100%);
  height: 100%;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr);
  gap: clamp(16px, 1.6vw, 24px);
  margin: 0 auto;
}

.credits-page.theme-light {
  --credit-bg-a: #f7fbff;
  --credit-bg-b: #edf5fc;
  --credit-panel: rgba(255, 255, 255, 0.72);
  --credit-panel-strong: rgba(255, 255, 255, 0.78);
  --credit-border: rgba(184, 205, 226, 0.34);
  --credit-border-soft: rgba(190, 207, 225, 0.26);
  --credit-text: #182331;
  --credit-text-soft: #5d6978;
  --credit-field: rgba(236, 242, 248, 0.78);
  --credit-head: rgba(229, 236, 243, 0.76);
  --credit-row-border: rgba(139, 158, 178, 0.18);
  --credit-link: #2e78df;
  --panel-shadow:
    0 16px 40px rgba(91, 126, 163, 0.08),
    0 0 28px rgba(124, 190, 237, 0.11);

  background:
    radial-gradient(820px 160px at 50% 4%, rgba(156, 211, 247, 0.18), transparent 66%),
    linear-gradient(180deg, var(--credit-bg-a), var(--credit-bg-b));
}

.credits-page.theme-light .query-panel,
.credits-page.theme-light .flow-panel {
  border-color: rgba(180, 201, 223, 0.32);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.64)),
    var(--credit-panel);
}

.credits-page.theme-light .query-header,
.credits-page.theme-light .filter-bar {
  background: rgba(255, 255, 255, 0.68);
}

.credits-page.theme-light .flow-table th {
  color: #303a46;
}

.credits-page.theme-light .flow-table td {
  color: #2f3a47;
}

.query-panel,
.flow-panel {
  border: 1px solid var(--credit-border);
  border-radius: 10px;
  background: var(--credit-panel);
  box-shadow: var(--panel-shadow);
  backdrop-filter: blur(16px);
}

.query-panel {
  min-width: 0;
  padding: clamp(16px, 1.5vw, 22px);
}

.query-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: clamp(72px, 8vh, 88px);
  padding: 16px clamp(18px, 2vw, 26px);
  border: 1px solid var(--credit-border-soft);
  border-radius: 8px;
  background: var(--credit-head);
}

.query-title h1 {
  margin: 0;
  font-size: 27px;
  line-height: 1.25;
  font-weight: 800;
  letter-spacing: 0;
}

.query-title p {
  margin: 7px 0 0;
  color: var(--credit-text-soft);
  font-size: 14px;
  line-height: 1.5;
  font-weight: 500;
}

.query-button,
.export-button,
.detail-button,
.pager button {
  border: 0;
  font-family: inherit;
  cursor: pointer;
  transition:
    transform 160ms ease,
    filter 160ms ease,
    border-color 160ms ease;
}

.query-button {
  height: clamp(46px, 5vh, 56px);
  min-width: clamp(116px, 8vw, 136px);
  border-radius: 12px;
  background: linear-gradient(140deg, #3685ef, #1d61c8);
  box-shadow: 0 12px 26px rgba(33, 99, 202, 0.26);
  color: #fff;
  font-size: 17px;
  font-weight: 700;
}

.query-button:active,
.export-button:active,
.detail-button:active {
  transform: translateY(1px);
}

.filter-bar {
  display: grid;
  grid-template-columns: minmax(280px, 1.12fr) minmax(190px, 1fr) minmax(190px, 1fr) minmax(122px, 0.42fr);
  gap: clamp(10px, 1.1vw, 16px);
  align-items: center;
  margin-top: clamp(14px, 1.5vw, 20px);
  padding: clamp(12px, 1.2vw, 16px) clamp(14px, 1.6vw, 22px);
  border: 1px solid var(--credit-border-soft);
  border-radius: 8px;
  background: var(--credit-panel-strong);
}

.date-range,
.filter-select {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
  height: 46px;
  border: 1px solid transparent;
  border-radius: 5px;
  background: var(--credit-field);
  color: var(--credit-text-soft);
}

.date-range {
  padding: 0 14px;
  gap: 10px;
}

.date-range input {
  width: calc(50% - 17px);
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--credit-text);
  font-size: 14px;
  font-family: inherit;
}

.date-range input::-webkit-calendar-picker-indicator {
  opacity: 0.58;
  filter: var(--calendar-filter, invert(1));
}

.credits-page.theme-light .date-range input::-webkit-calendar-picker-indicator {
  --calendar-filter: none;
}

.filter-select select {
  width: 100%;
  height: 100%;
  padding: 0 42px 0 16px;
  appearance: none;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--credit-text);
  font-family: inherit;
  font-size: 14px;
}

.filter-select .iconify {
  position: absolute;
  right: 14px;
  color: var(--credit-text-soft);
  font-size: 18px;
  pointer-events: none;
}

.export-button {
  height: 42px;
  border: 1px solid rgba(75, 144, 232, 0.9);
  border-radius: 22px;
  background: rgba(34, 104, 207, 0.14);
  color: #3183ee;
  font-size: 15px;
  font-weight: 700;
}

.credits-page.theme-light .export-button {
  border: 0;
  background: linear-gradient(140deg, #3a8cf5, #266aca);
  color: #fff;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: clamp(12px, 1.2vw, 18px);
  margin-top: clamp(14px, 1.5vw, 20px);
}

.stat-card {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  min-height: clamp(104px, 11vh, 122px);
  overflow: hidden;
  padding: clamp(16px, 1.5vw, 22px);
  border-radius: 7px;
  color: #fff;
}

.stat-card::before {
  content: "";
  position: absolute;
  inset: 1px;
  z-index: -1;
  border-radius: 6px;
  background: linear-gradient(116deg, rgba(255, 255, 255, 0.1), transparent 60%);
}

.stat-card.is-green {
  border: 1px solid rgba(82, 245, 181, 0.82);
  background: linear-gradient(116deg, #17c994, #088354);
  box-shadow: 0 0 20px rgba(29, 214, 154, 0.34);
}

.stat-card.is-orange {
  border: 1px solid rgba(255, 174, 78, 0.9);
  background: linear-gradient(116deg, #f29d25, #df4f07);
  box-shadow: 0 0 20px rgba(247, 130, 28, 0.38);
}

.stat-card.is-blue {
  border: 1px solid rgba(79, 162, 255, 0.95);
  background: linear-gradient(116deg, #258cf0, #1550be);
  box-shadow: 0 0 20px rgba(41, 126, 241, 0.38);
}

.stat-card.is-purple {
  border: 1px solid rgba(206, 91, 255, 0.9);
  background: linear-gradient(116deg, #7c4bd9, #62199b);
  box-shadow: 0 0 20px rgba(151, 58, 219, 0.36);
}

.credits-page.theme-light .stat-card {
  border-color: transparent;
  box-shadow: 0 10px 24px rgba(39, 73, 115, 0.14);
}

.stat-glyph {
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.9);
  color: currentColor;
  font-size: 29px;
  font-weight: 800;
}

.is-green .stat-glyph {
  color: #0ea571;
}

.is-orange .stat-glyph {
  color: #e56d16;
}

.is-blue .stat-glyph {
  color: #2473d6;
}

.is-purple .stat-glyph {
  color: #762ec2;
}

.stat-content {
  min-width: 0;
  margin-left: 20px;
}

.stat-content p,
.stat-content span {
  margin: 0;
  color: rgba(255, 255, 255, 0.82);
  font-size: 14px;
  font-weight: 600;
}

.stat-content strong {
  display: block;
  margin: 4px 0;
  color: #fff;
  font-size: clamp(26px, 2vw, 32px);
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: 0;
}

.stat-icon {
  position: absolute;
  right: 18px;
  bottom: 17px;
  color: rgba(255, 255, 255, 0.65);
  font-size: 22px;
}

.flow-panel {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  padding: clamp(18px, 1.6vw, 24px) clamp(16px, 1.5vw, 22px) clamp(14px, 1.4vw, 20px);
}

.flow-panel h2 {
  margin: 0 0 18px;
  color: var(--credit-text);
  font-size: 25px;
  line-height: 1.3;
  font-weight: 800;
  letter-spacing: 0;
}

.flow-table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--credit-border-soft);
  border-radius: 8px;
  scrollbar-width: thin;
  scrollbar-color: rgba(80, 137, 211, 0.58) transparent;
}

.flow-table-wrap::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.flow-table-wrap::-webkit-scrollbar-track {
  background: color-mix(in srgb, var(--credit-field) 82%, transparent);
  border-radius: 999px;
}

.flow-table-wrap::-webkit-scrollbar-thumb {
  border: 2px solid color-mix(in srgb, var(--credit-field) 82%, transparent);
  border-radius: 999px;
  background: linear-gradient(180deg, #3c8cff, #1f6ed6);
}

.flow-table {
  width: max(100%, 1120px);
  min-width: 0;
  border-collapse: collapse;
  table-layout: fixed;
  color: var(--credit-text);
  font-size: 14px;
}

.flow-table th {
  position: sticky;
  top: 0;
  z-index: 2;
  height: 52px;
  padding: 0 16px;
  background: var(--credit-head);
  color: var(--credit-text);
  text-align: left;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
}

.flow-table td {
  height: 56px;
  padding: 0 16px;
  border-bottom: 1px solid var(--credit-row-border);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.flow-table th:nth-child(1) {
  width: 16%;
}

.flow-table th:nth-child(2) {
  width: 13%;
}

.flow-table th:nth-child(3),
.flow-table th:nth-child(4) {
  width: 10%;
}

.flow-table th:nth-child(5) {
  width: 15%;
}

.flow-table th:nth-child(6) {
  width: 18%;
}

.flow-table th:nth-child(7) {
  width: 13%;
}

.flow-table th:nth-child(8) {
  width: 10%;
}

.flow-tag {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 12px;
  border-radius: 13px;
  font-size: 13px;
  font-weight: 700;
}

.flow-tag.is-positive {
  background: rgba(20, 201, 130, 0.14);
  color: #18b77d;
}

.flow-tag.is-warning {
  background: rgba(242, 150, 42, 0.16);
  color: #f1962d;
}

.flow-tag.is-cost {
  background: rgba(223, 98, 29, 0.14);
  color: #e77835;
}

.delta {
  font-weight: 700;
}

.delta.is-up {
  color: #18b77d;
}

.delta.is-down {
  color: #e78136;
}

.detail-button {
  padding: 0;
  background: transparent;
  color: var(--credit-link);
  font-size: 14px;
  font-weight: 700;
}

.pager {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.pager button {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--credit-border);
  border-radius: 4px;
  background: var(--credit-field);
  color: var(--credit-text-soft);
  font-size: 18px;
}

.pager .active {
  background: transparent;
  color: var(--credit-text);
  font-size: 14px;
  font-weight: 700;
}

.pager button:disabled {
  opacity: 0.5;
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
  .credits-page {
    padding: 18px;
  }

  .query-panel {
    padding: 18px;
  }

  .filter-bar {
    grid-template-columns: minmax(240px, 1.15fr) minmax(180px, 1fr) minmax(180px, 1fr) 118px;
    gap: 10px;
    padding-inline: 14px;
  }

  .stats-grid {
    gap: 12px;
  }

  .stat-card {
    padding: 18px 14px;
  }

  .stat-content {
    margin-left: 12px;
  }

  .stat-content strong {
    font-size: 27px;
  }
}

@media (max-width: 980px) {
  .credits-page {
    height: auto;
    min-height: calc(100vh - var(--app-header-offset));
    overflow: auto;
  }

  .credits-shell {
    height: auto;
    grid-template-rows: auto auto;
  }

  .query-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .query-button {
    width: 100%;
  }

  .filter-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .export-button {
    width: 100%;
  }

  .flow-panel {
    min-height: 520px;
  }

  .flow-table-wrap {
    min-height: 390px;
  }
}

@media (max-width: 680px) {
  .credits-page {
    padding: 12px;
  }

  .filter-bar,
  .stats-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .date-range {
    flex-wrap: wrap;
    height: auto;
    min-height: 46px;
    padding-block: 9px;
  }

  .date-range input {
    width: calc(50% - 18px);
  }
}

@media (min-width: 1600px) {
  .credits-page {
    padding-top: 36px;
  }

  .query-panel {
    padding: 25px;
  }

  .query-header {
    min-height: 94px;
  }

}
</style>
