<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { computed, ref, watch } from "vue";

import { useAppStore } from "@/stores/app";
import { useAuthStore } from "@/stores/auth";
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

const pageSize = ref(10);
const pageSizeOptions = [10, 20, 30, 50] as const;
const appStore = useAppStore();
const authStore = useAuthStore();

const pageBackgroundStyle = computed(() => {
  const backgroundImage = appStore.isDarkMode
    ? pointsQueryBackgroundDark
    : pointsQueryBackgroundLight;

  return {
    backgroundImage: `url(${backgroundImage})`,
    backgroundSize: "cover",
    backgroundPosition: "center top",
    backgroundRepeat: "no-repeat",
  };
});

const {
  version,
  records: sourceRecords,
  summaryCards: apiSummaryCards,
  isLoading,
  loadError,
  usesLiveApi,
  usesTeamDashboard,
  refresh,
  showSubAccountScope,
  accountScopeMode,
  selectedChildId,
  selectedChild,
  childMembers,
  teamName,
  setAccountScopeMode,
  selectChildAccount,
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

const canRecharge = computed(
  () => authStore.userInfo?.enterpriseAccountRole !== "child",
);

const viewConfigMap: Record<string, PointsQueryViewConfig> = {
  personal: {
    version: "personal",
    icon: "mdi:coins",
    iconClassName: "is-blue",
    subtitle: pointsQueryHeroCopy.subtitle,
    badges: [],
    tableTitle: "我的积分流水",
    showMemberFilter: false,
    showCurrentMember: false,
    showMemberColumns: false,
    adminTheme: false,
    canRecharge: true,
  },
  member: {
    version: "member",
    icon: "mdi:coins",
    iconClassName: "is-blue",
    subtitle: "子账号积分流水筛选与查看",
    teamLabel: "XX创意团队",
    badges: [
      {
        icon: "mdi:office-building-outline",
        text: "XX创意团队",
        className: "is-team",
      },
      {
        icon: "mdi:account-outline",
        text: "李芳（子账号）",
        className: "is-member",
      },
    ],
    tableTitle: "我的积分流水",
    showMemberFilter: false,
    showCurrentMember: true,
    currentMemberName: "李芳",
    showMemberColumns: false,
    adminTheme: false,
    canRecharge: true,
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
        text: "张小明（子账号）",
        className: "is-admin",
      },
    ],
    tableTitle: "团队流水记录",
    showMemberFilter: true,
    showCurrentMember: false,
    showMemberColumns: true,
    adminTheme: true,
    canRecharge: true,
  },
};

const viewConfig = computed(() => {
  if (usesTeamDashboard.value) {
    const currentRole = authStore.userInfo?.canViewEnterpriseChildren
      ? "主账号"
      : "子账号";

    return {
      version: "admin",
      icon: "mdi:office-building-outline",
      iconClassName: "is-violet",
      subtitle: "",
      teamLabel: teamName.value || authStore.userInfo?.enterpriseTenantName || "",
      badges: [
        {
          icon: "mdi:office-building-outline",
          text: teamName.value || authStore.userInfo?.enterpriseTenantName || "",
          className: "is-team",
        },
        {
          icon: "mdi:account-circle-outline",
          text:
            authStore.userInfo?.displayName
              ? `${authStore.userInfo.displayName}（${currentRole}）`
              : currentRole,
          className: authStore.userInfo?.canViewEnterpriseChildren
            ? "is-admin"
            : "is-member",
        },
        {
          icon: "mdi:account-group-outline",
          text: `团队人数 ${childMembers.value.length} 人`,
          className: "is-team",
        },
      ],
      tableTitle:
        filters.value.member && selectedChild.value
          ? `${selectedChild.value.label}的积分流水`
          : "团队积分流水",
      showMemberFilter: true,
      showCurrentMember: false,
      showMemberColumns: true,
      adminTheme: true,
      showSubAccountScope: true,
      canRecharge: canRecharge.value,
    } satisfies PointsQueryViewConfig;
  }

  const base = viewConfigMap[version.value];
  const tableTitle =
    showSubAccountScope.value && accountScopeMode.value === "child" && selectedChild.value
      ? `${selectedChild.value.label}的积分流水`
      : base.tableTitle;

  return {
    ...base,
    tableTitle,
    showSubAccountScope: showSubAccountScope.value,
    canRecharge: canRecharge.value,
  };
});
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
        key: "activeMemberCount",
        label: "活跃账号数",
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

const summaryCards = computed(() => {
  const cards = usesTeamDashboard.value
    ? apiSummaryCards.value
    : usesLiveApi.value
      ? apiSummaryCards.value
      : mockSummaryCards.value;

  return cards.filter((card) => card.key !== "memberCount");
});

const filteredRecords = computed(() => {
  const active = filters.value;
  const now = Date.now();

  return sourceRecords.value.filter((record) => {
    if (active.member && record.memberId !== active.member) {
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
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredRecords.value.slice(start, start + pageSize.value);
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
      base.push(record.memberName, record.isOwner ? "主账号" : "子账号");
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
  openRechargeModal();
}

watch(rechargeSuccessTick, () => {
  if (usesLiveApi.value || usesTeamDashboard.value) {
    void refresh();
  }
});

watch(version, () => {
  filters.value = defaultFilters();
  currentPage.value = 1;
});

watch(selectedChildId, (value) => {
  if (!usesTeamDashboard.value) return;
  filters.value = {
    ...filters.value,
    member: value ?? "",
  };
  currentPage.value = 1;
});

watch(
  () => filters.value.member,
  (value) => {
    if (!usesTeamDashboard.value) return;
    if ((value || null) === selectedChildId.value) return;
    selectedChildId.value = value || null;
  },
);

watch(filteredRecords, () => {
  const maxPage = Math.max(
    1,
    Math.ceil(filteredRecords.value.length / pageSize.value),
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
          v-model:page-size="pageSize"
          glass
          :account-scope-mode="accountScopeMode"
          :child-members="childMembers"
          :selected-child-id="selectedChildId"
          :config="viewConfig"
          :loading="isLoading && usesLiveApi"
          :page-size-options="pageSizeOptions"
          :records="pagedRecords"
          :total="filteredRecords.length"
          @export="handleExport"
          @recharge="handleRecharge"
          @select-child-account="selectChildAccount"
          @update:account-scope-mode="setAccountScopeMode"
        />
      </section>
    </div>

  </main>
</template>

<style scoped lang="scss">
.points-query-page {
  --points-gold: #d4a017;
  --points-gold-strong: #e8b84a;
  --points-content-max: 1260px;
  --points-design-w: 1260px;
  --points-shell-x: clamp(14px, 2vw, 32px);
  --points-section-gap: clamp(10px, min(1.2vw, 1.6vh), 16px);
  --points-summary-gap: clamp(10px, min(1vw, 1.4vh), 14px);
  --points-safe-gap: clamp(40px, 5.5vh, 56px);
  --points-offset-y: 0px;
  --points-flow-card-min-h: 360px;
  --points-table-min-h: 400px;
  --points-table-cell-py: clamp(13px, 1.35vh, 16px);
  --points-table-cell-px: clamp(14px, 1.2vw, 18px);
  --points-table-font-size: clamp(12px, min(0.85vw, 1.35vh), 13px);
  --points-table-row-h: calc(
    2 * var(--points-table-cell-py) + var(--points-table-font-size) * 1.45 + 1px
  );
  --points-table-head-h: var(--points-table-row-h);
  --points-table-scroll-max-h: calc(
    var(--points-table-head-h) + var(--points-table-row-h) * 10
  );
  --points-scale-w: calc(
    (100vw - 2 * var(--points-shell-x)) / var(--points-design-w)
  );
  --points-content-scale: min(1, var(--points-scale-w));

  box-sizing: border-box;
  position: relative;
  display: flex;
  width: 100%;
  min-height: 100%;
  height: auto;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: clamp(16px, 2.8vh, 28px) var(--points-shell-x)
    clamp(12px, 2vh, 24px);
  overflow-x: hidden;
  overflow-y: visible;
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
  background-attachment: scroll;
}

@media (min-width: 1281px) {
  .points-query-bg {
    background-attachment: fixed;
  }
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
  container-type: inline-size;
  position: relative;
  z-index: 1;
  display: flex;
  width: min(
    calc(100vw - 2 * var(--points-shell-x)),
    var(--points-content-max),
    calc((100dvh - var(--app-header-offset, 72px)) * 1.42)
  );
  min-width: 0;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  margin-inline: auto;
  translate: 0 var(--points-offset-y);
  zoom: var(--points-content-scale);
}

@supports not (zoom: 1) {
  .points-query-shell {
    translate: none;
    transform: scale(var(--points-content-scale))
      translateY(var(--points-offset-y));
    transform-origin: top center;
  }
}

.points-query-glass {
  display: flex;
  width: 100%;
  min-width: 0;
  flex: 0 0 auto;
  flex-direction: column;
  gap: var(--points-section-gap);
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}

.points-query-glass > :deep(.points-summary-section),
.points-query-glass > .points-query-hero,
.points-query-glass > .points-query-alert {
  flex-shrink: 0;
}

.points-query-glass > :deep(.points-flow-card--design) {
  display: flex;
  height: auto;
  min-height: var(--points-flow-card-min-h, 360px);
  flex: 0 1 auto;
  flex-direction: column;
  overflow: visible;
}

.points-query-hero {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding-top: clamp(4px, 0.8vh, 10px);
  text-align: left;
}

.points-query-hero-copy {
  width: 100%;
  max-width: 720px;
}

.points-query-hero-copy h1 {
  margin: 0;
  color: #0f172a;
  font-family:
    "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
  font-size: 20px;
  font-weight: 500;
  line-height: 1.2;
}

.points-query-hero-copy p {
  margin: clamp(6px, 1vh, 10px) 0 0;
  color: #64748b;
  font-size: clamp(12px, min(1.1vw, 1.8vh), 14px);
  line-height: 1.55;
}

.points-query-page.theme-dark .points-query-hero-copy h1 {
  color: #f8fafc;
}

.points-query-page.theme-dark .points-query-hero-copy p {
  color: #94a3b8;
}

.points-query-page.theme-dark .points-query-team-label {
  color: #ffffff;
}

.points-query-hero-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
}

.points-query-team-label {
  color: #94a3b8;
  font-family:
    "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
  font-size: 12px;
  font-weight: 900;
}

.points-query-page.theme-light .points-query-team-label {
  color: #000000;
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

.points-query-page.theme-light .points-query-badge {
  border: 1px solid #e2e8f0;
  background: #ffffff;
}

.points-query-page.theme-light .points-query-badge.is-personal,
.points-query-page.theme-light .points-query-badge.is-team {
  color: #b8860b;
}

.points-query-page.theme-light .points-query-badge.is-member {
  color: #475569;
}

.points-query-page.theme-light .points-query-badge.is-admin {
  color: #9a6700;
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

@media (max-height: 820px) {
  .points-query-page {
    --points-safe-gap: clamp(32px, 4.5vh, 44px);
    --points-table-cell-py: clamp(11px, 1.2vh, 14px);
  }
}

/* 14.5–15.4 寸笔记本（约 1366–1680 × 860–1060） */
@media (min-width: 1280px) and (max-width: 1680px) and (min-height: 860px) and (max-height: 1060px) {
  .points-query-page {
    --points-content-max: 1220px;
    --points-design-w: 1220px;
    --points-table-cell-py: clamp(14px, 1.45vh, 17px);
    --points-offset-y: 4px;
    padding-top: clamp(18px, 2.6vh, 26px);
  }
}

@media (min-width: 1024px) {
  .points-query-shell {
    flex: 0 0 auto;
  }
}

@media (max-width: 1023px) {
  .points-query-page {
    height: auto;
    min-height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    justify-content: flex-start;
    padding: clamp(12px, 2vh, 20px) var(--points-shell-x);
  }

  .points-query-shell {
    width: min(calc(100vw - 2 * var(--points-shell-x)), var(--points-content-max));
    flex: none;
    margin-block: 0 auto;
    translate: 0 0;
  }

  .points-query-glass {
    flex: none;
  }

  .points-query-glass > :deep(.points-flow-card--design) {
    flex: none;
    overflow: visible;
  }
}

@media (max-width: 640px) {
  .points-query-page {
    --points-shell-x: 12px;
  }
}
</style>
