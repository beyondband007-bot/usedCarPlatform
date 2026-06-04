<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { useAppStore } from "@/stores/app";
import { usePointsQuery } from "@/composables/usePointsQuery";
import PointsFlowTable from "@/components/business/points/PointsFlowTable.vue";
import PointsQueryHeader from "@/components/business/points/PointsQueryHeader.vue";
import PointsRechargeModal from "@/components/business/points/PointsRechargeModal.vue";
import PointsSummaryCards from "@/components/business/points/PointsSummaryCards.vue";
import type {
  PointsQueryFilters,
  PointsQueryViewConfig,
  PointsSummaryCard,
} from "@/types/points-query";

const pageSize = 10;
const appStore = useAppStore();

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
  dateRange: "",
  startDate: "",
  endDate: "",
  bizSource: "",
});

const filters = ref<PointsQueryFilters>(defaultFilters());
const currentPage = ref(1);
const rechargeModalVisible = ref(false);

const viewConfigMap: Record<string, PointsQueryViewConfig> = {
  personal: {
    version: "personal",
    icon: "mdi:coins",
    iconClassName: "is-blue",
    subtitle: "个人积分流水筛选与查看",
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

function escapeCsv(value: string | number | boolean | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function handleExport() {
  const headers = viewConfig.value.showMemberColumns
    ? [
        "流水编号",
        "流水类型",
        "变动积分",
        "变动后余额",
        "使用场景",
        "功能",
        "备注",
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
        "功能",
        "备注",
        "发生时间",
      ];

  const rows = filteredRecords.value.map((record) => {
    const base: Array<string | number | boolean | undefined> = [
      record.id,
      record.txnType,
      record.pointsChange,
      record.balanceAfter,
      record.title,
      record.functionName,
      record.remark,
    ];

    if (viewConfig.value.showMemberColumns) {
      base.push(record.memberName, record.isOwner ? "主账号" : "成员");
    }

    base.push(record.createdAt);
    return base.map(escapeCsv).join(",");
  });

  const csv = [headers.map(escapeCsv).join(","), ...rows].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `points-flow-${version.value}.csv`;
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

  rechargeModalVisible.value = true;
}

function handleRechargeSuccess() {
  if (usesLiveApi.value) {
    void refresh();
  }
}

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
    <PointsQueryHeader :config="viewConfig" />

    <div class="points-query-shell">
      <p v-if="loadError" class="points-query-alert is-error" role="alert">
        {{ loadError }}
      </p>

      <PointsSummaryCards
        :admin-theme="viewConfig.adminTheme"
        :cards="summaryCards"
        :loading="isLoading && usesLiveApi"
      />

      <PointsFlowTable
        v-model:current-page="currentPage"
        v-model:filters="filters"
        :config="viewConfig"
        :loading="isLoading && usesLiveApi"
        :page-size="pageSize"
        :records="pagedRecords"
        :total="filteredRecords.length"
        @export="handleExport"
        @recharge="handleRecharge"
      />
    </div>

    <PointsRechargeModal
      v-model:show="rechargeModalVisible"
      @success="handleRechargeSuccess"
    />
  </main>
</template>

<style scoped lang="scss">
.points-query-page {
  min-height: calc(100dvh - var(--app-header-offset, 0px));
  background: #f8fafc;
  color: #0f172a;
  font-family:
    "Noto Sans SC", "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.points-query-page.theme-dark {
  background: #0b1220;
  color: #f3f4f6;
  color-scheme: dark;
}

.points-query-page,
.points-query-page *,
.points-query-page *::before,
.points-query-page *::after {
  box-sizing: border-box;
}

.points-query-shell {
  width: min(100%, 1440px);
  margin: 0 auto;
  padding: 24px;
}

.points-query-alert {
  margin: 0 0 16px;
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

@media (max-width: 640px) {
  .points-query-shell {
    padding: 16px;
  }
}
</style>
