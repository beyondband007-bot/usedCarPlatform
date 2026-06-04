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
import {
  creditsAccountOptions,
  creditsFlowData,
  creditsPageCopy,
  creditsStats,
  creditsTypeOptions,
} from "@/constants/credits-page";
import type { CreditFlowRow } from "@/constants/credits-page";

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

const flowColumns: DataTableColumns<CreditFlowRow> = [
  {
    title: copy.colFlowNo,
    key: "flowNo",
    width: 180,
    ellipsis: { tooltip: true },
  },
  {
    title: copy.colFlowType,
    key: "flowType",
    width: 150,
    render(row) {
      return h(
        NTag,
        {
          round: true,
          bordered: false,
          class: ["flow-tag", tagClass(row.flowType)],
        },
        { default: () => row.flowType },
      );
    },
  },
  {
    title: copy.colDelta,
    key: "delta",
    width: 130,
    render(row) {
      return h(
        "span",
        {
          class: ["delta", row.delta.startsWith("+") ? "is-up" : "is-down"],
        },
        row.delta,
      );
    },
  },
  {
    title: copy.colBalance,
    key: "balance",
    width: 130,
  },
  {
    title: copy.colAccount,
    key: "account",
    width: 170,
    ellipsis: { tooltip: true },
  },
  {
    title: copy.colCreatedAt,
    key: "createdAt",
    width: 190,
  },
  {
    title: copy.colRemark,
    key: "remark",
    width: 210,
    ellipsis: { tooltip: true },
  },
  {
    title: copy.colAction,
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
        { default: () => copy.viewDetail },
      );
    },
  },
];
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
          <NButton class="query-button" type="primary" attr-type="button">
            查分查询
          </NButton>
        </header>

        <form class="filter-bar" aria-label="积分流水查询条件">
          <NDatePicker
            class="date-range"
            type="daterange"
            clearable
            size="large"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
          />

          <NSelect
            class="filter-select"
            :options="creditsTypeOptions"
            default-value="all-type"
            size="large"
          />

          <NSelect
            class="filter-select"
            :options="creditsAccountOptions"
            default-value="all-account"
            size="large"
          />

          <NButton
            class="export-button"
            type="primary"
            size="large"
            attr-type="button"
          >
            {{ copy.export }}
          </NButton>
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
          <NDataTable
            class="flow-data-table"
            :columns="flowColumns"
            :data="creditsFlowData"
            :bordered="false"
            :single-line="false"
            :pagination="false"
            :scroll-x="1280"
            flex-height
          />
        </div>

        <NPagination class="pager" :page="1" :page-count="1" />
      </section>
    </div>
  </main>
</template>

<style scoped lang="scss">
.credits-page {
  --credit-page-pad: clamp(16px, 2vw, 30px);

  min-width: 0;
  height: auto;
  min-height: calc(100vh - var(--app-header-offset));
  overflow-x: hidden;
  overflow-y: auto;
  padding: var(--credit-page-pad);
}

.credits-page.theme-dark {
  --credit-page-bg: var(--app-bg, #050505);
  --credit-panel: var(--app-surface, #101010);
  --credit-panel-strong: #151515;
  --credit-border: var(--app-border, rgba(255, 255, 255, 0.1));
  --credit-border-soft: rgba(255, 255, 255, 0.08);
  --credit-text: var(--app-text, #f4f1e9);
  --credit-text-soft: var(--app-text-soft, #959083);
  --credit-text-secondary: var(--app-text-muted, #7a7568);
  --credit-field: #0b0b0b;
  --credit-head: #151515;
  --credit-row-border: rgba(255, 255, 255, 0.08);
  --credit-link: #efc24c;
  --credit-accent: #efc24c;
  --credit-accent-soft: rgba(239, 194, 76, 0.14);
  --credit-table-head-text: var(--credit-text);
  --credit-table-body-text: var(--credit-text-soft);
  --credit-focus-ring: rgba(239, 194, 76, 0.16);
  --credit-focus-border: rgba(239, 194, 76, 0.52);
  --panel-shadow: 0 24px 60px rgba(0, 0, 0, 0.34);

  background: var(--credit-page-bg);
  color: var(--credit-text);
}

.credits-page.theme-light {
  --credit-page-bg: var(--app-bg, #f6f9fc);
  --credit-panel: var(--app-surface, #ffffff);
  --credit-panel-strong: var(--app-surface-soft, #f8fafd);
  --credit-border: var(--app-border, #e6ecf5);
  --credit-border-soft: #e6ecf5;
  --credit-text: var(--app-text, #0f172a);
  --credit-text-soft: var(--app-text-muted, #64748b);
  --credit-text-secondary: var(--app-text-soft, #475569);
  --credit-field: #ffffff;
  --credit-head: #f8fafd;
  --credit-row-border: #e6ecf5;
  --credit-link: #2f6bff;
  --credit-accent: #2f6bff;
  --credit-accent-soft: rgba(47, 107, 255, 0.08);
  --credit-table-head-text: #303a46;
  --credit-table-body-text: #2f3a47;
  --credit-focus-ring: rgba(47, 107, 255, 0.13);
  --credit-focus-border: rgba(47, 107, 255, 0.52);
  --panel-shadow: 0 18px 52px rgba(78, 111, 148, 0.09);

  background:
    radial-gradient(circle at 30% 0%, rgba(47, 107, 255, 0.06), transparent 28rem),
    var(--credit-page-bg);
  color: var(--credit-text);
}

.credits-page.theme-light .query-panel,
.credits-page.theme-light .flow-panel {
  background:
    radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.05), transparent 70%),
    var(--credit-panel);
}

.credits-page,
.credits-page *,
.credits-page *::before,
.credits-page *::after {
  box-sizing: border-box;
}

.credits-shell {
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
  max-width: 1500px;
  min-height: calc(100vh - var(--app-header-offset) - var(--credit-page-pad) - var(--credit-page-pad));
  gap: clamp(16px, 1.6vw, 24px);
  margin: 0 auto;
}

.query-panel,
.flow-panel {
  min-width: 0;
  overflow: visible;
  border: 1px solid var(--credit-border);
  border-radius: 20px;
  background: var(--credit-panel);
  box-shadow: var(--panel-shadow);
  color: var(--credit-text);
}

.query-panel {
  min-width: 0;
  padding: clamp(16px, 1.5vw, 22px);
}

.query-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  flex-wrap: wrap;
  gap: 18px;
  min-height: clamp(72px, 8vh, 88px);
  padding: 16px clamp(18px, 2vw, 26px);
  border: 1px solid var(--credit-border-soft);
  border-radius: 12px;
  background: var(--credit-head);
}

.query-title h1 {
  overflow: hidden;
  margin: 0;
  font-size: 18px;
  line-height: 1.25;
  font-weight: 600;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.credits-page.theme-dark .query-title h1 {
  color: #f3f4f6;
}

.query-title p {
  overflow: hidden;
  margin: 7px 0 0;
  font-size: 12px;
  line-height: 1.5;
  font-weight: 400;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.credits-page.theme-light .query-title p {
  color: #94a3b8;
}

.credits-page.theme-dark .query-title p {
  color: #9ca3af;
}

.export-button,
.detail-button {
  border: 0;
  font-family: inherit;
  cursor: pointer;
  transition:
    transform 160ms ease,
    filter 160ms ease,
    border-color 160ms ease;
}

.query-button {
  --n-height: clamp(46px, 5vh, 56px);
  --n-border-radius: 12px;
  --n-color: #2f6bff;
  --n-color-hover: #4f7fff;
  --n-color-pressed: #1d4ed8;
  --n-color-focus: #2f6bff;
  --n-border: 0;
  --n-border-hover: 0;
  --n-border-pressed: 0;
  --n-border-focus: 0;
  --n-text-color: #fff;
  --n-text-color-hover: #fff;
  --n-text-color-pressed: #fff;
  --n-text-color-focus: #fff;
  --n-ripple-color: transparent;
  height: clamp(46px, 5vh, 56px);
  max-width: 100%;
  flex-shrink: 0;
  min-width: clamp(116px, 8vw, 136px);
  overflow: hidden;
  border: 0;
  border-radius: 12px;
  background: #2f6bff !important;
  box-shadow: 0 12px 26px rgba(47, 107, 255, 0.22);
  color: #fff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 160ms ease, box-shadow 160ms ease;
}

.query-button:hover,
.query-button:focus,
.query-button:focus-visible,
.query-button:not(:disabled):hover,
.query-button:not(:disabled):focus,
.query-button:active,
.query-button:not(:disabled):active {
  background: #4f7fff !important;
  box-shadow: 0 12px 26px rgba(47, 107, 255, 0.28);
  color: #fff !important;
  filter: none;
  transform: none;
}

.query-button :deep(.n-button:not(:disabled):hover),
.query-button :deep(.n-button:not(:disabled):focus),
.query-button :deep(.n-button:not(:disabled):active) {
  background: #4f7fff !important;
  color: #fff !important;
}

.query-button:active,
.query-button:not(:disabled):active {
  background: #1d4ed8 !important;
}

.query-button :deep(.n-button__border),
.query-button :deep(.n-button__state-border) {
  border: 0 !important;
  box-shadow: none !important;
}

.query-button:hover :deep(.n-button__state-border),
.query-button:focus :deep(.n-button__state-border),
.query-button:focus-visible :deep(.n-button__state-border) {
  border: 0 !important;
  box-shadow: none !important;
}

.query-button:active {
  transform: translateY(1px);
}

.export-button:active,
.detail-button:active {
  transform: translateY(1px);
}

.filter-bar {
  display: grid;
  grid-template-columns: minmax(280px, 1.12fr) minmax(190px, 1fr) minmax(190px, 1fr) minmax(122px, 0.42fr);
  gap: clamp(10px, 1.1vw, 16px);
  align-items: center;
  min-width: 0;
  margin-top: clamp(14px, 1.5vw, 20px);
  padding: clamp(12px, 1.2vw, 16px) clamp(14px, 1.6vw, 22px);
  border: 1px solid var(--credit-border-soft);
  border-radius: 8px;
  background: var(--credit-panel-strong);
}

.date-range,
.filter-select {
  width: 100%;
  min-width: 0;
}

.date-range,
.filter-select,
.export-button {
  --n-height: 46px;
  --n-border-radius: 5px;
  --n-color: var(--credit-field);
  --n-color-active: var(--credit-field);
  --n-color-focus: var(--credit-field);
  --n-color-hover: color-mix(in srgb, var(--credit-field) 88%, var(--credit-accent));
  --n-border: 1px solid var(--credit-border-soft);
  --n-border-active: 1px solid var(--credit-focus-border);
  --n-border-focus: 1px solid var(--credit-focus-border);
  --n-border-hover: 1px solid color-mix(in srgb, var(--credit-accent) 42%, var(--credit-border-soft));
  --n-box-shadow-focus: 0 0 0 2px var(--credit-focus-ring);
  --n-text-color: var(--credit-text);
  --n-placeholder-color: var(--credit-text-soft);
  --n-icon-color: var(--credit-text-soft);
}

.date-range :deep(.n-input__input-el),
.filter-select :deep(.n-base-selection-label),
.filter-select :deep(.n-base-selection-placeholder) {
  font-size: 14px;
  font-weight: 600;
}

.export-button {
  --n-border-radius: 23px;
  --n-color: rgba(34, 104, 207, 0.14);
  --n-color-hover: rgba(34, 104, 207, 0.2);
  --n-color-pressed: rgba(34, 104, 207, 0.26);
  --n-color-focus: rgba(34, 104, 207, 0.18);
  --n-border: 1px solid rgba(75, 144, 232, 0.9);
  --n-border-hover: 1px solid rgba(75, 144, 232, 1);
  --n-border-pressed: 1px solid rgba(62, 126, 221, 1);
  --n-border-focus: 1px solid rgba(75, 144, 232, 1);
  --n-text-color: #3183ee;
  --n-text-color-hover: #4292ff;
  --n-text-color-pressed: #2474db;
  --n-text-color-focus: #3183ee;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  font-size: 15px;
  font-weight: 700;
}

.credits-page.theme-light .export-button {
  --n-color: var(--credit-field);
  --n-color-hover: var(--credit-panel-strong);
  --n-color-pressed: #f1f5f9;
  --n-color-focus: var(--credit-field);
  --n-border: 1px solid var(--credit-border);
  --n-border-hover: 1px solid var(--credit-border);
  --n-border-pressed: 1px solid var(--credit-border);
  --n-border-focus: 1px solid var(--credit-border);
  --n-text-color: var(--credit-text-soft);
  --n-text-color-hover: var(--credit-text-soft);
  --n-text-color-pressed: var(--credit-text-soft);
  --n-text-color-focus: var(--credit-text-soft);
}

.credits-page.theme-dark .export-button {
  --n-color: var(--credit-accent-soft);
  --n-color-hover: color-mix(in srgb, var(--credit-accent-soft) 80%, var(--credit-accent));
  --n-color-pressed: color-mix(in srgb, var(--credit-accent-soft) 65%, var(--credit-accent));
  --n-color-focus: var(--credit-accent-soft);
  --n-border: 1px solid color-mix(in srgb, var(--credit-accent) 56%, transparent);
  --n-border-hover: 1px solid var(--credit-accent);
  --n-border-pressed: 1px solid var(--credit-accent);
  --n-border-focus: 1px solid var(--credit-accent);
  --n-text-color: var(--credit-link);
  --n-text-color-hover: #ffd75a;
  --n-text-color-pressed: #e5b54a;
  --n-text-color-focus: var(--credit-link);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: stretch;
  gap: clamp(12px, 1.2vw, 18px);
  margin-top: clamp(14px, 1.5vw, 20px);
}

.stat-card {
  position: relative;
  isolation: isolate;
  display: flex;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  align-items: center;
  height: clamp(96px, 6vw, 128px);
  min-height: 96px;
  max-height: 128px;
  overflow: hidden;
  padding: clamp(14px, 1.4vw, 22px);
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
  width: clamp(46px, 3.2vw, 60px);
  height: clamp(46px, 3.2vw, 60px);
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
  overflow: hidden;
  margin-left: 20px;
}

.stat-content p,
.stat-content span {
  margin: 0;
  color: rgba(255, 255, 255, 0.82);
  font-size: 11px;
  font-weight: 400;
}

.stat-content strong {
  display: block;
  overflow: hidden;
  margin: 4px 0;
  color: #fff;
  font-size: clamp(24px, 1.8vw, 32px);
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  flex: 1;
  flex-direction: column;
  padding: clamp(18px, 1.6vw, 24px) clamp(16px, 1.5vw, 22px) clamp(14px, 1.4vw, 20px);
}

.flow-panel h2 {
  margin: 0 0 18px;
  color: var(--credit-text);
  font-size: 14px;
  line-height: 1.3;
  font-weight: 600;
  letter-spacing: 0;
}

.flow-table-wrap {
  flex: 1;
  height: auto;
  min-height: clamp(420px, 48vh, 760px);
  overflow: auto;
  border: 1px solid var(--credit-border-soft);
  border-radius: 8px;
  background: color-mix(in srgb, var(--credit-panel-strong) 74%, transparent);
}

.flow-data-table {
  --n-font-size: 12px;
  --n-th-color: var(--credit-head);
  --n-th-color-hover: var(--credit-head);
  --n-th-text-color: var(--credit-table-head-text);
  --n-td-color: transparent;
  --n-td-color-hover: var(--credit-accent-soft);
  --n-td-text-color: var(--credit-table-body-text);
  --n-border-color: var(--credit-row-border);
  --n-border-radius: 8px;
  height: 100%;
  color: var(--credit-text);
}

.flow-data-table :deep(.n-data-table-wrapper),
.flow-data-table :deep(.n-data-table-base-table) {
  height: 100%;
}

.flow-data-table :deep(.n-data-table-th) {
  height: 56px;
  padding: 0 16px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.flow-data-table :deep(.n-data-table-td) {
  height: 60px;
  padding: 0 16px;
  font-weight: 500;
}

.flow-tag {
  --n-height: 26px;
  --n-border-radius: 13px;
  --n-font-size: 13px;
  --n-font-weight: 700;
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 12px;
  border-radius: 13px;
  font-size: 13px;
  font-weight: 700;
}

.flow-tag.is-positive {
  --n-color: rgba(20, 201, 130, 0.14);
  --n-text-color: #18b77d;
  background: rgba(20, 201, 130, 0.14);
  color: #18b77d;
}

.flow-tag.is-warning {
  --n-color: rgba(242, 150, 42, 0.16);
  --n-text-color: #f1962d;
  background: rgba(242, 150, 42, 0.16);
  color: #f1962d;
}

.flow-tag.is-cost {
  --n-color: rgba(223, 98, 29, 0.14);
  --n-text-color: #e77835;
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
  --n-text-color: var(--credit-link);
  --n-text-color-hover: color-mix(in srgb, var(--credit-link) 82%, #ffffff);
  --n-text-color-pressed: color-mix(in srgb, var(--credit-link) 72%, #000000);
  --n-text-color-focus: var(--credit-link);
  font-size: 14px;
  font-weight: 700;
}

.credits-page.theme-light .detail-button {
  --n-text-color-hover: #4292ff;
  --n-text-color-pressed: #2474db;
}

.credits-page.theme-dark .detail-button {
  --n-text-color-hover: #ffd75a;
  --n-text-color-pressed: #e5b54a;
}

.pager {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  margin-top: 16px;
  --n-item-size: 30px;
  --n-item-border-radius: 4px;
  --n-item-color: var(--credit-field);
  --n-item-color-hover: color-mix(in srgb, var(--credit-field) 84%, var(--credit-accent));
  --n-item-color-active: transparent;
  --n-item-color-active-hover: color-mix(in srgb, var(--credit-field) 82%, var(--credit-accent));
  --n-item-border: 1px solid var(--credit-border);
  --n-item-border-hover: 1px solid var(--credit-focus-border);
  --n-item-border-active: 1px solid var(--credit-focus-border);
  --n-item-text-color: var(--credit-text-soft);
  --n-item-text-color-hover: var(--credit-text);
  --n-item-text-color-active: var(--credit-text);
  --n-button-color: var(--credit-field);
  --n-button-color-hover: color-mix(in srgb, var(--credit-field) 84%, var(--credit-accent));
  --n-button-border: 1px solid var(--credit-border);
  --n-button-border-hover: 1px solid var(--credit-focus-border);
  --n-button-icon-color: var(--credit-text-soft);
  --n-button-icon-color-hover: var(--credit-text);
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
    --credit-page-pad: 18px;
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

@media (max-width: 1180px) {
  .filter-bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-height: 820px) and (min-width: 981px) {
  .credits-page {
    --credit-page-pad: 14px;
  }

  .query-panel {
    padding: 14px;
  }

  .query-header {
    min-height: 70px;
    padding-block: 12px;
  }

  .query-title h1 {
    font-size: 18px;
  }

  .query-button {
    height: 44px;
  }

  .filter-bar {
    margin-top: 12px;
    padding-block: 10px;
  }

  .stats-grid {
    margin-top: 12px;
  }

  .stat-card {
    height: clamp(92px, 5.8vw, 112px);
    min-height: 92px;
    max-height: 112px;
    padding-block: 14px;
  }

  .stat-glyph {
    width: 48px;
    height: 48px;
    font-size: 24px;
  }

  .stat-content strong {
    font-size: 24px;
  }

  .flow-panel {
    min-height: 0;
    padding-block: 16px 14px;
  }

  .flow-panel h2 {
    margin-bottom: 12px;
    font-size: 14px;
  }

  .flow-table-wrap {
    height: auto;
    min-height: 300px;
  }
}

@media (max-width: 980px) {
  .credits-page {
    min-height: calc(100vh - var(--app-header-offset));
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

  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stat-card {
    height: clamp(96px, 13vw, 118px);
    min-height: 96px;
    max-height: 118px;
  }

  .export-button {
    width: 100%;
  }

  .flow-panel {
    min-height: 0;
  }

  .flow-table-wrap {
    height: auto;
    min-height: clamp(380px, 56vh, 620px);
  }
}

@media (max-width: 680px) {
  .credits-page {
    --credit-page-pad: 12px;
  }

  .filter-bar,
  .stats-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .stat-card {
    height: 102px;
    min-height: 102px;
    max-height: 102px;
  }
}

@media (min-width: 1600px) {
  .query-panel {
    padding: 25px;
  }

  .query-header {
    min-height: 94px;
  }

}
</style>
