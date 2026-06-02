<script setup lang="ts">
import { computed, ref, watch } from "vue";

import PointsFilterPanel from "@/components/business/points/PointsFilterPanel.vue";
import PointsFlowTable from "@/components/business/points/PointsFlowTable.vue";
import PointsQueryHeader from "@/components/business/points/PointsQueryHeader.vue";
import PointsSummaryCards from "@/components/business/points/PointsSummaryCards.vue";
import type {
  PointsFlowRecord,
  PointsQueryFilters,
  PointsQueryVersion,
  PointsSummaryCard,
} from "@/types/points-query";

const pageSize = 12;

const version = ref<PointsQueryVersion>("personal");
const currentPage = ref(1);
const filters = ref<PointsQueryFilters>({
  member: "",
  txnType: "",
  dateRange: "",
  startDate: "2025-05-01",
  endDate: "2025-05-31",
  bizSource: "",
});
const appliedFilters = ref<PointsQueryFilters>({ ...filters.value });

const personalRecords: PointsFlowRecord[] = [
  {
    id: "TXN-20250528-001",
    txnType: "consume",
    pointsChange: -120,
    balanceAfter: 4340,
    bizSource: "single",
    title: "单图生成",
    functionName: "展厅光影",
    remark: "经典白棚",
    createdAt: "2025-05-28 14:32:18",
  },
  {
    id: "TXN-20250527-002",
    txnType: "consume",
    pointsChange: -80,
    balanceAfter: 4460,
    bizSource: "single",
    title: "单图生成",
    functionName: "户外街景",
    remark: "春季新品",
    createdAt: "2025-05-27 09:15:42",
  },
  {
    id: "TXN-20250526-003",
    txnType: "gift",
    pointsChange: 500,
    balanceAfter: 4540,
    bizSource: "package",
    title: "套餐赠送",
    functionName: "月度套餐",
    remark: "5月会员福利",
    createdAt: "2025-05-26 10:00:00",
  },
  {
    id: "TXN-20250525-004",
    txnType: "consume",
    pointsChange: -200,
    balanceAfter: 4040,
    bizSource: "batch",
    title: "批量上新",
    functionName: "批量生成",
    remark: "5月展厅批量上新",
    createdAt: "2025-05-25 16:45:30",
  },
  {
    id: "TXN-20250524-005",
    txnType: "recharge",
    pointsChange: 1000,
    balanceAfter: 4240,
    bizSource: "purchase",
    title: "充值购买",
    functionName: "积分充值",
    remark: "支付宝支付",
    createdAt: "2025-05-24 11:22:08",
  },
  {
    id: "TXN-20250523-006",
    txnType: "consume",
    pointsChange: -150,
    balanceAfter: 3240,
    bizSource: "single",
    title: "单图生成",
    functionName: "家居场景",
    remark: "北欧风格",
    createdAt: "2025-05-23 13:50:15",
  },
  {
    id: "TXN-20250522-007",
    txnType: "refund",
    pointsChange: 80,
    balanceAfter: 3390,
    bizSource: "fail",
    title: "失败退款",
    functionName: "单图生成",
    remark: "生成失败自动退款",
    createdAt: "2025-05-22 08:30:00",
  },
  {
    id: "TXN-20250521-008",
    txnType: "consume",
    pointsChange: -300,
    balanceAfter: 3310,
    bizSource: "batch",
    title: "批量上新",
    functionName: "批量生成",
    remark: "夏季系列",
    createdAt: "2025-05-21 15:10:22",
  },
  {
    id: "TXN-20250520-009",
    txnType: "recharge",
    pointsChange: 2000,
    balanceAfter: 3610,
    bizSource: "purchase",
    title: "充值购买",
    functionName: "积分充值",
    remark: "企业采购",
    createdAt: "2025-05-20 09:00:00",
  },
  {
    id: "TXN-20250519-010",
    txnType: "consume",
    pointsChange: -90,
    balanceAfter: 1610,
    bizSource: "single",
    title: "单图生成",
    functionName: "产品特写",
    remark: "细节展示",
    createdAt: "2025-05-19 11:35:48",
  },
  {
    id: "TXN-20250518-011",
    txnType: "gift",
    pointsChange: 200,
    balanceAfter: 1700,
    bizSource: "package",
    title: "套餐赠送",
    functionName: "季度套餐",
    remark: "老客户回馈",
    createdAt: "2025-05-18 14:00:00",
  },
  {
    id: "TXN-20250517-012",
    txnType: "consume",
    pointsChange: -60,
    balanceAfter: 1500,
    bizSource: "single",
    title: "单图生成",
    functionName: "场景合成",
    remark: "室内场景",
    createdAt: "2025-05-17 10:20:33",
  },
];

const enterpriseRecords: PointsFlowRecord[] = [
  {
    id: "TXN-20250528-101",
    txnType: "consume",
    pointsChange: -120,
    balanceAfter: 4340,
    bizSource: "single",
    title: "单图生成",
    functionName: "展厅光影",
    remark: "经典白棚",
    memberId: "u001",
    memberName: "张小明",
    isOwner: true,
    createdAt: "2025-05-28 14:32:18",
  },
  {
    id: "TXN-20250528-102",
    txnType: "consume",
    pointsChange: -200,
    balanceAfter: 3800,
    bizSource: "batch",
    title: "批量上新",
    functionName: "批量生成",
    remark: "5月上新",
    memberId: "u002",
    memberName: "李芳",
    isOwner: false,
    createdAt: "2025-05-28 11:15:30",
  },
  {
    id: "TXN-20250527-103",
    txnType: "recharge",
    pointsChange: 5000,
    balanceAfter: 8800,
    bizSource: "purchase",
    title: "充值购买",
    functionName: "积分充值",
    remark: "团队充值",
    memberId: "u001",
    memberName: "张小明",
    isOwner: true,
    createdAt: "2025-05-27 09:00:00",
  },
  {
    id: "TXN-20250527-104",
    txnType: "consume",
    pointsChange: -80,
    balanceAfter: 3720,
    bizSource: "single",
    title: "单图生成",
    functionName: "户外街景",
    remark: "春季新品",
    memberId: "u003",
    memberName: "王强",
    isOwner: false,
    createdAt: "2025-05-27 10:45:12",
  },
  {
    id: "TXN-20250526-105",
    txnType: "gift",
    pointsChange: 500,
    balanceAfter: 4220,
    bizSource: "package",
    title: "套餐赠送",
    functionName: "月度套餐",
    remark: "5月福利",
    memberId: "u001",
    memberName: "张小明",
    isOwner: true,
    createdAt: "2025-05-26 10:00:00",
  },
  {
    id: "TXN-20250526-106",
    txnType: "consume",
    pointsChange: -150,
    balanceAfter: 3570,
    bizSource: "single",
    title: "单图生成",
    functionName: "家居场景",
    remark: "北欧风格",
    memberId: "u004",
    memberName: "赵雪",
    isOwner: false,
    createdAt: "2025-05-26 14:20:05",
  },
  {
    id: "TXN-20250525-107",
    txnType: "consume",
    pointsChange: -300,
    balanceAfter: 3270,
    bizSource: "batch",
    title: "批量上新",
    functionName: "批量生成",
    remark: "夏季系列",
    memberId: "u002",
    memberName: "李芳",
    isOwner: false,
    createdAt: "2025-05-25 16:45:30",
  },
  {
    id: "TXN-20250525-108",
    txnType: "refund",
    pointsChange: 120,
    balanceAfter: 3390,
    bizSource: "fail",
    title: "失败退款",
    functionName: "批量生成",
    remark: "生成失败",
    memberId: "u003",
    memberName: "王强",
    isOwner: false,
    createdAt: "2025-05-25 08:10:00",
  },
  {
    id: "TXN-20250524-109",
    txnType: "recharge",
    pointsChange: 2000,
    balanceAfter: 5270,
    bizSource: "purchase",
    title: "充值购买",
    functionName: "积分充值",
    remark: "支付宝",
    memberId: "u001",
    memberName: "张小明",
    isOwner: true,
    createdAt: "2025-05-24 11:22:08",
  },
  {
    id: "TXN-20250524-110",
    txnType: "consume",
    pointsChange: -90,
    balanceAfter: 3180,
    bizSource: "single",
    title: "单图生成",
    functionName: "产品特写",
    remark: "细节展示",
    memberId: "u004",
    memberName: "赵雪",
    isOwner: false,
    createdAt: "2025-05-24 13:30:00",
  },
  {
    id: "TXN-20250523-111",
    txnType: "consume",
    pointsChange: -250,
    balanceAfter: 2930,
    bizSource: "batch",
    title: "批量上新",
    functionName: "批量生成",
    remark: "新品上架",
    memberId: "u002",
    memberName: "李芳",
    isOwner: false,
    createdAt: "2025-05-23 09:45:18",
  },
  {
    id: "TXN-20250523-112",
    txnType: "gift",
    pointsChange: 300,
    balanceAfter: 3230,
    bizSource: "package",
    title: "套餐赠送",
    functionName: "季度套餐",
    remark: "活动赠送",
    memberId: "u001",
    memberName: "张小明",
    isOwner: true,
    createdAt: "2025-05-23 15:00:00",
  },
];

const sourceRecords = computed(() =>
  version.value === "personal" ? personalRecords : enterpriseRecords,
);

const summaryCards = computed<PointsSummaryCard[]>(() => {
  if (version.value === "enterprise") {
    return [
      {
        key: "teamBalance",
        label: "团队总余额",
        value: "18,650",
        unit: "积分",
        icon: "mdi:bank-outline",
        tone: "blue",
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
        key: "totalGained",
        label: "累计获得",
        value: "45,200",
        unit: "积分",
        icon: "mdi:arrow-bottom-left",
        tone: "emerald",
      },
      {
        key: "totalConsumed",
        label: "累计消耗",
        value: "26,550",
        unit: "积分",
        icon: "mdi:arrow-top-right",
        tone: "rose",
      },
      {
        key: "recentNet",
        label: "近30天净变动",
        value: "+3,680",
        unit: "积分",
        icon: "mdi:pulse",
        tone: "amber",
      },
    ];
  }

  return [
    {
      key: "totalGained",
      label: "累计获得",
      value: "12,580",
      unit: "积分",
      icon: "mdi:arrow-bottom-left",
      tone: "blue",
    },
    {
      key: "totalConsumed",
      label: "累计消耗",
      value: "8,240",
      unit: "积分",
      icon: "mdi:arrow-top-right",
      tone: "rose",
    },
    {
      key: "available",
      label: "当前可用",
      value: "4,340",
      unit: "积分",
      icon: "mdi:wallet-outline",
      tone: "emerald",
    },
    {
      key: "recentNet",
      label: "近30天净变动",
      value: "+1,250",
      unit: "积分",
      icon: "mdi:pulse",
      tone: "amber",
    },
  ];
});

const filteredRecords = computed(() => {
  const active = appliedFilters.value;
  const now = new Date("2025-06-01 00:00:00").getTime();

  return sourceRecords.value.filter((record) => {
    if (active.txnType && record.txnType !== active.txnType) return false;
    if (active.bizSource && record.bizSource !== active.bizSource) return false;

    if (version.value === "enterprise" && active.member) {
      const memberId = active.member === "self" ? "u001" : active.member;
      if (record.memberId !== memberId) return false;
    }

    const recordDate = new Date(record.createdAt.replace(/-/g, "/")).getTime();
    if (active.dateRange && active.dateRange !== "custom") {
      const days = Number(active.dateRange);
      const cutoff = now - days * 24 * 60 * 60 * 1000;
      if (recordDate < cutoff) return false;
    }

    if (active.dateRange === "custom") {
      const start = new Date(`${active.startDate} 00:00:00`.replace(/-/g, "/")).getTime();
      const end = new Date(`${active.endDate} 23:59:59`.replace(/-/g, "/")).getTime();
      if (recordDate < start || recordDate > end) return false;
    }

    return true;
  });
});

const pagedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredRecords.value.slice(start, start + pageSize);
});

function handleQuery() {
  appliedFilters.value = { ...filters.value };
  currentPage.value = 1;
}

function escapeCsv(value: string | number | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function handleExport() {
  const headers =
    version.value === "enterprise"
      ? [
          "流水编号",
          "流水类型",
          "变动积分",
          "变动后余额",
          "业务来源",
          "标题",
          "功能",
          "补充说明",
          "操作人",
          "身份",
          "发生时间",
        ]
      : [
          "流水编号",
          "流水类型",
          "变动积分",
          "变动后余额",
          "业务来源",
          "标题",
          "功能",
          "补充说明",
          "发生时间",
        ];

  const rows = filteredRecords.value.map((record) => {
    const base = [
      record.id,
      record.txnType,
      record.pointsChange,
      record.balanceAfter,
      record.bizSource,
      record.title,
      record.functionName,
      record.remark,
    ];

    if (version.value === "enterprise") {
      base.push(record.memberName ?? "", record.isOwner ? "主账号" : "成员");
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

watch(version, () => {
  filters.value = {
    member: "",
    txnType: "",
    dateRange: "",
    startDate: "2025-05-01",
    endDate: "2025-05-31",
    bizSource: "",
  };
  appliedFilters.value = { ...filters.value };
  currentPage.value = 1;
});
</script>

<template>
  <main class="points-query-page">
    <PointsQueryHeader v-model:version="version" />

    <div class="points-query-shell">
      <PointsFilterPanel
        v-model:filters="filters"
        :version="version"
        @query="handleQuery"
      />

      <PointsSummaryCards :cards="summaryCards" />

      <PointsFlowTable
        v-model:current-page="currentPage"
        :version="version"
        :records="pagedRecords"
        :total="filteredRecords.length"
        :page-size="pageSize"
        @export="handleExport"
      />
    </div>
  </main>
</template>

<style scoped lang="scss">
.points-query-page {
  min-height: calc(100dvh - var(--app-header-offset, 0px));
  background: #f8fafc;
  color: #0f172a;
  font-family:
    "Microsoft YaHei",
    "PingFang SC",
    "Noto Sans SC",
    system-ui,
    sans-serif;
}

.points-query-page,
.points-query-page *,
.points-query-page *::before,
.points-query-page *::after {
  box-sizing: border-box;
}

.points-query-shell {
  display: grid;
  width: min(100%, 1440px);
  gap: 20px;
  margin: 0 auto;
  padding: 24px;
}

@media (max-width: 640px) {
  .points-query-shell {
    padding: 16px;
  }
}
</style>
