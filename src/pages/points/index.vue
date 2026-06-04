<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { computed, ref, watch } from "vue";

import { useAppStore } from "@/stores/app";
import { usePointsQuery } from "@/composables/usePointsQuery";
import { usePointsRechargeModal } from "@/composables/usePointsRechargeModal";
import PointsFlowTable from "@/components/business/points/PointsFlowTable.vue";
import PointsSummaryCards from "@/components/business/points/PointsSummaryCards.vue";
import {
  pointsQueryBackgroundDark,
  pointsQueryBackgroundLight,
  pointsQueryHeroCopy,
} from "@/constants/points-page";
import type {
  PointsQueryFilters,
  PointsQueryViewConfig,
  PointsSummaryCard,
  PointsTxnType,
} from "@/types/points-query";

const pageSize = 10;
const appStore = useAppStore();

const pageBackgroundStyle = computed(() => {
  const backgroundImage = appStore.isDarkMode
    ? pointsQueryBackgroundDark
    : pointsQueryBackgroundLight;

  return {
    backgroundImage: `url(${backgroundImage})`,
    backgroundSize: "cover",
    backgroundPosition: "center top",
    backgroundRepeat: "no-repeat",
    backgroundAttachment: "fixed",
  };
});

const {
  version,
  records: sourceRecords,
  summaryCards: apiSummaryCards,
  isLoading,
  loadError,
  usesLiveApi,
  refresh,
} = usePointsQuery();

const defaultFilters = (): PointsQueryFilters => ({
  member: "",
  txnType: "",
  dateRange: "90",
  startDate: "",
  endDate: "",
  bizSource: "",
  status: "",
});

const filters = ref<PointsQueryFilters>(defaultFilters());
const currentPage = ref(1);
const { rechargeSuccessTick, openRechargeModal } = usePointsRechargeModal();

const viewConfigMap: Record<string, PointsQueryViewConfig> = {
  personal: {
    version: "personal",
    icon: "mdi:coins",
    iconClassName: "is-blue",
    subtitle: pointsQueryHeroCopy.subtitle,
    badges: [
      {
        icon: "mdi:account-outline",
        text: "个人账户",
        className: "is-personal",
      },
    ],
    tableTitle: "我的积分流水",
    showMemberFilter: false,
    showCurrentMember: false,
    showMemberColumns: false,
    adminTheme: false,
  },
  member: {
    version: "member",
    icon: "mdi:coins",
    iconClassName: "is-blue",
    subtitle: "成员积分流水筛选与查看",
    teamLabel: "XX创意团队",
    badges: [
      {
        icon: "mdi:office-building-outline",
        text: "XX创意团队",
        className: "is-team",
      },
      {
        icon: "mdi:account-outline",
        text: "李芳（成员）",
        className: "is-member",
      },
    ],
    tableTitle: "我的积分流水",
    showMemberFilter: false,
    showCurrentMember: true,
    currentMemberName: "李芳",
    showMemberColumns: false,
    adminTheme: false,
  },
  admin: {
    version: "admin",
    icon: "mdi:office-building-outline",
    iconClassName: "is-violet",
    subtitle: "团队积分管理与流水查看",
    teamLabel: "XX创意团队",
    badges: [
      {
        icon: "mdi:office-building-outline",
        text: "XX创意团队",
        className: "is-team",
      },
      {
        icon: "mdi:shield-check-outline",
        text: "张小明（管理员）",
        className: "is-admin",
      },
    ],
    tableTitle: "团队流水记录",
    showMemberFilter: true,
    showCurrentMember: false,
    showMemberColumns: true,
    adminTheme: true,
  },
};

const viewConfig = computed(() => viewConfigMap[version.value]);

const mockSummaryCards = computed<PointsSummaryCard[]>(() => {
  if (version.value === "admin") {
    return [
      {
        key: "teamBalance",
        label: "当前团队可用总余额",
        value: "18,650",
        unit: "积分",
        icon: "mdi:bank-outline",
        tone: "blue",
      },
      {
        key: "totalGained",
        label: "累计获得",
        value: "45,200",
        unit: "积分",
        icon: "mdi:trending-up",
        tone: "emerald",
      },
      {
        key: "totalConsumed",
        label: "累计消费",
        value: "26,550",
        unit: "积分",
        icon: "mdi:shopping-bag-outline",
        tone: "rose",
      },
      {
        key: "memberCount",
        label: "成员总数",
        value: "5",
        unit: "人",
        icon: "mdi:account-group-outline",
        tone: "violet",
      },
      {
        key: "activeMemberCount",
        label: "活跃成员数",
        value: "4",
        unit: "人",
        note: "（近30天）",
        icon: "mdi:account-check-outline",
        tone: "cyan",
      },
      {
        key: "recentNet",
        label: "近30天净变动",
        value: "+3,680",
        unit: "积分",
        icon: "mdi:zap",
        tone: "amber",
      },
    ];
  }

  if (version.value === "member") {
    return [
      {
        key: "teamBalance",
        label: "当前可用余额",
        value: "8,500",
        unit: "积分",
        icon: "mdi:wallet-outline",
        tone: "blue",
      },
      {
        key: "totalGained",
        label: "累计获得",
        value: "6,000",
        unit: "积分",
        icon: "mdi:trending-up",
        tone: "emerald",
      },
      {
        key: "totalConsumed",
        label: "累计消费",
        value: "1,190",
        unit: "积分",
        icon: "mdi:shopping-bag-outline",
        tone: "rose",
      },
      {
        key: "recentNet",
        label: "近30天净变动",
        value: "-1,130",
        unit: "积分",
        icon: "mdi:calendar-clock",
        tone: "amber",
      },
    ];
  }

  return [];
});

const summaryCards = computed(() =>
  usesLiveApi.value ? apiSummaryCards.value : mockSummaryCards.value,
);

const filteredRecords = computed(() => {
  const active = filters.value;
  const now = Date.now();

  return sourceRecords.value.filter((record) => {
    if (
      version.value === "admin" &&
      active.member &&
      record.memberId !== active.member
    ) {
      return false;
    }

    if (active.txnType && record.txnType !== active.txnType) return false;
    if (active.bizSource && record.bizSource !== active.bizSource) return false;

    if (active.status) {
      const recordStatus =
        record.status ?? (record.txnType === "gift" ? "pending" : "effective");
      if (recordStatus !== active.status) return false;
    }

    const recordDate = new Date(record.createdAt.replace(/-/g, "/")).getTime();
    if (Number.isNaN(recordDate)) return true;

    if (active.dateRange && active.dateRange !== "custom") {
      const cutoff = now - Number(active.dateRange) * 24 * 60 * 60 * 1000;
      if (recordDate < cutoff) return false;
    }

    if (active.dateRange === "custom" && active.startDate && active.endDate) {
      const start = new Date(
        `${active.startDate} 00:00:00`.replace(/-/g, "/"),
      ).getTime();
      const end = new Date(
        `${active.endDate} 23:59:59`.replace(/-/g, "/"),
      ).getTime();
      if (recordDate < start || recordDate > end) return false;
    }

    return true;
  });
});

const pagedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredRecords.value.slice(start, start + pageSize);
});

const txnTypeExportNameMap: Record<"" | PointsTxnType, string> = {
  "": "全部",
  recharge: "充值",
  gift: "赠送",
  consume: "消费",
  refund: "退款",
};

const txnTypeExcelLabelMap: Record<PointsTxnType, string> = {
  recharge: "充值",
  gift: "赠送",
  consume: "消费",
  refund: "退款",
};

function escapeExcelCell(value: string | number | boolean | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildExcelTable(
  headers: string[],
  rows: Array<Array<string | number | boolean | undefined>>,
) {
  const head = headers
    .map((header) => `<th>${escapeExcelCell(header)}</th>`)
    .join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell) =>
              `<td style="mso-number-format:'\\@';">${escapeExcelCell(cell)}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
  </head>
  <body>
    <table border="1">
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  </body>
</html>`;
}

function handleExport() {
  const headers = viewConfig.value.showMemberColumns
    ? [
        "流水编号",
        "流水类型",
        "变动积分",
        "变动后余额",
        "使用场景",
        "操作人",
        "身份",
        "发生时间",
      ]
    : [
        "流水编号",
        "流水类型",
        "变动积分",
        "变动后余额",
        "使用场景",
        "发生时间",
      ];

  const rows = filteredRecords.value.map((record) => {
    const base: Array<string | number | boolean | undefined> = [
      record.id,
      txnTypeExcelLabelMap[record.txnType],
      record.pointsChange,
      record.balanceAfter,
      record.title,
    ];

    if (viewConfig.value.showMemberColumns) {
      base.push(record.memberName, record.isOwner ? "主账号" : "成员");
    }

    base.push(record.createdAt);
    return base;
  });

  const excel = buildExcelTable(headers, rows);
  const blob = new Blob([excel], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${txnTypeExportNameMap[filters.value.txnType]}积分查询.xls`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function handleRecharge() {
  if (version.value === "admin" && !filters.value.member) {
    window.alert("请先选择成员账号");
    return;
  }

  openRechargeModal();
}

watch(rechargeSuccessTick, () => {
  if (usesLiveApi.value) {
    void refresh();
  }
});

watch(version, () => {
  filters.value = defaultFilters();
  currentPage.value = 1;
});

watch(filteredRecords, () => {
  const maxPage = Math.max(
    1,
    Math.ceil(filteredRecords.value.length / pageSize),
  );
  if (currentPage.value > maxPage) currentPage.value = maxPage;
});
</script>

<template>
  <main
    class="points-query-page"
    :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'"
  >
    <div class="points-query-bg" aria-hidden="true" :style="pageBackgroundStyle"></div>

    <div class="points-query-shell">
      <section class="points-query-glass" aria-label="积分查询">
        <header class="points-query-hero">
          <div class="points-query-hero-copy">
            <h1>{{ pointsQueryHeroCopy.title }}</h1>
            <p>{{ viewConfig.subtitle }}</p>
          </div>

          <div v-if="viewConfig.badges.length" class="points-query-hero-badges">
            <span v-if="viewConfig.teamLabel" class="points-query-team-label">
              当前团队：
            </span>
            <div
              v-for="badge in viewConfig.badges"
              :key="badge.text"
              class="points-query-badge"
              :class="badge.className"
            >
              <Icon :icon="badge.icon" />
              {{ badge.text }}
            </div>
          </div>
        </header>

        <p v-if="loadError" class="points-query-alert is-error" role="alert">
          {{ loadError }}
        </p>

        <PointsSummaryCards
          glass
          :admin-theme="viewConfig.adminTheme"
          :cards="summaryCards"
          :loading="isLoading && usesLiveApi"
        />

        <PointsFlowTable
          v-model:current-page="currentPage"
          v-model:filters="filters"
          glass
          :config="viewConfig"
          :loading="isLoading && usesLiveApi"
          :page-size="pageSize"
          :records="pagedRecords"
          :total="filteredRecords.length"
          @export="handleExport"
          @recharge="handleRecharge"
        />
      </section>
    </div>

  </main>
</template>

<style scoped lang="scss">
.points-query-page {
  --points-gold: #d4a017;
  --points-gold-strong: #e8b84a;
  --points-viewport-h: calc(100dvh - var(--app-header-offset, 72px));
  --points-content-top: calc(var(--points-viewport-h) * 0.15);
  --points-content-height: calc(var(--points-viewport-h) * 0.7);
  --points-content-bottom: calc(var(--points-viewport-h) * 0.15);

  position: relative;
  margin-top: calc(-1 * var(--app-header-offset, 72px));
  height: 100dvh;
  min-height: 100dvh;
  overflow: hidden;
  color: #0f172a;
  font-family:
    "Noto Sans SC", "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.points-query-page.theme-dark {
  --points-gold: #efc24c;
  --points-gold-strong: #ffd75a;

  color: #f3f4f6;
  color-scheme: dark;
}

.points-query-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-color: #f8fafc;
  background-size: cover;
  background-position: center top;
  background-repeat: no-repeat;
}

.points-query-page.theme-dark .points-query-bg {
  background-color: #0b1220;
}

.points-query-page,
.points-query-page *,
.points-query-page *::before,
.points-query-page *::after {
  box-sizing: border-box;
}

.points-query-shell {
  position: relative;
  z-index: 1;
  display: flex;
  width: min(100%, 1500px);
  height: var(--points-content-height);
  flex-direction: column;
  margin: calc(var(--app-header-offset, 72px) + var(--points-content-top)) auto
    var(--points-content-bottom);
  padding: 0 clamp(16px, 2vw, 28px);
  min-height: 0;
}

.points-query-glass {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: clamp(12px, 1.4vw, 18px);
  overflow: hidden;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}

.points-query-glass > .points-query-hero,
.points-query-glass > .points-query-alert,
.points-query-glass > :deep(.points-summary-section) {
  flex-shrink: 0;
}

.points-query-glass > :deep(.points-flow-card--design) {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

.points-query-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
}

.points-query-hero-copy {
  width: 100%;
}

.points-query-hero-copy h1 {
  margin: 0;
  color: #0f172a;
  font-size: clamp(28px, 2.6vw, 36px);
  font-weight: 800;
  line-height: 1.2;
}

.points-query-hero-copy p {
  max-width: 720px;
  margin: 10px auto 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.6;
}

.points-query-page.theme-dark .points-query-hero-copy h1 {
  color: #f8fafc;
}

.points-query-page.theme-dark .points-query-hero-copy p {
  color: #94a3b8;
}

.points-query-hero-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.points-query-team-label {
  color: #94a3b8;
  font-size: 12px;
}

.points-query-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
}

.points-query-badge.is-personal,
.points-query-badge.is-team {
  background: rgb(239 194 76 / 14%);
  color: #b8860b;
}

.points-query-badge.is-member {
  background: rgb(148 163 184 / 16%);
  color: #475569;
}

.points-query-badge.is-admin {
  background: rgb(212 160 23 / 18%);
  color: #9a6700;
  font-weight: 700;
}

.points-query-page.theme-dark .points-query-badge.is-personal,
.points-query-page.theme-dark .points-query-badge.is-team {
  background: rgb(239 194 76 / 16%);
  color: var(--points-gold-strong);
}

.points-query-page.theme-dark .points-query-badge.is-member {
  background: #1a2436;
  color: #9ca3af;
}

.points-query-page.theme-dark .points-query-badge.is-admin {
  background: rgb(245 166 35 / 16%);
  color: var(--points-gold-strong);
}

.points-query-alert {
  margin: 0;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
}

.points-query-alert.is-error {
  background: rgb(254 226 226 / 90%);
  color: #991b1b;
}

.theme-dark .points-query-alert.is-error {
  background: rgb(127 29 29 / 35%);
  color: #fecaca;
}

@media (max-width: 900px) {
  .points-query-hero-badges {
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .points-query-shell {
    padding-inline: 12px;
  }

  .points-query-glass {
    padding: 16px;
    border-radius: 18px;
  }
}

@media (max-height: 720px) {
  .points-query-page {
    --points-content-top: 12px;
    --points-content-height: calc(100dvh - var(--app-header-offset, 72px) - 24px);
    --points-content-bottom: 12px;

    overflow-y: auto;
  }
}
</style>
