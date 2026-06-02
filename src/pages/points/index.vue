<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { useAppStore } from "@/stores/app";
import PointsFlowTable from "@/components/business/points/PointsFlowTable.vue";
import PointsQueryHeader from "@/components/business/points/PointsQueryHeader.vue";
import PointsRechargeModal from "@/components/business/points/PointsRechargeModal.vue";
import PointsSummaryCards from "@/components/business/points/PointsSummaryCards.vue";
import type {
  PointsFlowRecord,
  PointsQueryFilters,
  PointsQueryVersion,
  PointsQueryViewConfig,
  PointsSummaryCard,
} from "@/types/points-query";

const pageSize = 10;
const route = useRoute();
const appStore = useAppStore();

const defaultFilters = (): PointsQueryFilters => ({
  member: "",
  txnType: "",
  dateRange: "",
  startDate: "2025-05-01",
  endDate: "2025-05-31",
  bizSource: "",
});

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

const memberRecords: PointsFlowRecord[] = [
  {
    id: "TXN-20250530-001",
    txnType: "recharge",
    pointsChange: 5000,
    balanceAfter: 8500,
    bizSource: "purchase",
    title: "充值购买",
    functionName: "积分充值",
    remark: "团队统一充值分配",
    memberId: "u002",
    memberName: "李芳",
    isOwner: false,
    isCurrentUser: true,
    createdAt: "2025-05-30 10:00:00",
  },
  {
    id: "TXN-20250529-002",
    txnType: "gift",
    pointsChange: 200,
    balanceAfter: 3500,
    bizSource: "package",
    title: "套餐赠送",
    functionName: "月度套餐",
    remark: "5月会员福利",
    memberId: "u002",
    memberName: "李芳",
    isOwner: false,
    isCurrentUser: true,
    createdAt: "2025-05-29 09:15:22",
  },
  {
    id: "TXN-20250528-101",
    txnType: "consume",
    pointsChange: -120,
    balanceAfter: 3380,
    bizSource: "single",
    title: "单图生成",
    functionName: "展厅光影",
    remark: "经典白棚",
    memberId: "u002",
    memberName: "李芳",
    isOwner: false,
    isCurrentUser: true,
    createdAt: "2025-05-28 14:32:18",
  },
  {
    id: "TXN-20250528-102",
    txnType: "consume",
    pointsChange: -200,
    balanceAfter: 3180,
    bizSource: "batch",
    title: "批量上新",
    functionName: "批量生成",
    remark: "5月展厅批量上新",
    memberId: "u002",
    memberName: "李芳",
    isOwner: false,
    isCurrentUser: true,
    createdAt: "2025-05-28 11:15:30",
  },
  {
    id: "TXN-20250527-003",
    txnType: "consume",
    pointsChange: -80,
    balanceAfter: 3100,
    bizSource: "single",
    title: "单图生成",
    functionName: "户外街景",
    remark: "春季新品拍摄",
    memberId: "u002",
    memberName: "李芳",
    isOwner: false,
    isCurrentUser: true,
    createdAt: "2025-05-27 16:45:10",
  },
  {
    id: "TXN-20250526-105",
    txnType: "gift",
    pointsChange: 500,
    balanceAfter: 3600,
    bizSource: "package",
    title: "套餐赠送",
    functionName: "月度套餐",
    remark: "老客户回馈活动",
    memberId: "u002",
    memberName: "李芳",
    isOwner: false,
    isCurrentUser: true,
    createdAt: "2025-05-26 10:00:00",
  },
  {
    id: "TXN-20250526-106",
    txnType: "consume",
    pointsChange: -150,
    balanceAfter: 3080,
    bizSource: "single",
    title: "单图生成",
    functionName: "家居场景",
    remark: "北欧风格系列",
    memberId: "u002",
    memberName: "李芳",
    isOwner: false,
    isCurrentUser: true,
    createdAt: "2025-05-26 14:20:05",
  },
  {
    id: "TXN-20250525-107",
    txnType: "consume",
    pointsChange: -300,
    balanceAfter: 2780,
    bizSource: "batch",
    title: "批量上新",
    functionName: "批量生成",
    remark: "夏季新品系列",
    memberId: "u002",
    memberName: "李芳",
    isOwner: false,
    isCurrentUser: true,
    createdAt: "2025-05-25 16:45:30",
  },
  {
    id: "TXN-20250524-110",
    txnType: "consume",
    pointsChange: -90,
    balanceAfter: 2690,
    bizSource: "single",
    title: "单图生成",
    functionName: "产品特写",
    remark: "细节展示需求",
    memberId: "u002",
    memberName: "李芳",
    isOwner: false,
    isCurrentUser: true,
    createdAt: "2025-05-24 13:30:00",
  },
  {
    id: "TXN-20250523-111",
    txnType: "consume",
    pointsChange: -250,
    balanceAfter: 2440,
    bizSource: "batch",
    title: "批量上新",
    functionName: "批量生成",
    remark: "618预热上新",
    memberId: "u002",
    memberName: "李芳",
    isOwner: false,
    isCurrentUser: true,
    createdAt: "2025-05-23 09:45:18",
  },
  {
    id: "TXN-20250522-113",
    txnType: "refund",
    pointsChange: 60,
    balanceAfter: 2500,
    bizSource: "fail",
    title: "失败退款",
    functionName: "单图生成",
    remark: "生成失败自动退款",
    memberId: "u002",
    memberName: "李芳",
    isOwner: false,
    isCurrentUser: true,
    createdAt: "2025-05-22 17:08:33",
  },
  {
    id: "TXN-20250521-114",
    txnType: "gift",
    pointsChange: 300,
    balanceAfter: 2800,
    bizSource: "package",
    title: "套餐赠送",
    functionName: "季度套餐",
    remark: "活动赠送",
    memberId: "u002",
    memberName: "李芳",
    isOwner: false,
    isCurrentUser: true,
    createdAt: "2025-05-21 11:30:00",
  },
];

const adminRecords: PointsFlowRecord[] = [
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

function resolveVersion(raw: unknown): PointsQueryVersion {
  if (raw === "member" || raw === "enterprise-member") return "member";
  if (raw === "admin" || raw === "enterprise-admin") return "admin";
  return "personal";
}

const version = ref<PointsQueryVersion>(resolveVersion(route.query.view));
const filters = ref<PointsQueryFilters>(defaultFilters());
const currentPage = ref(1);
const rechargeModalVisible = ref(false);

const viewConfigMap: Record<PointsQueryVersion, PointsQueryViewConfig> = {
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

const sourceRecords = computed(() => {
  if (version.value === "member") return memberRecords;
  if (version.value === "admin") return adminRecords;
  return personalRecords;
});

const summaryCards = computed<PointsSummaryCard[]>(() => {
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

  return [
    {
      key: "availableBalance",
      label: "当前可用余额",
      value: "4,340",
      unit: "积分",
      icon: "mdi:wallet-outline",
      tone: "blue",
    },
    {
      key: "totalGained",
      label: "累计获得",
      value: "12,580",
      unit: "积分",
      icon: "mdi:trending-up",
      tone: "emerald",
    },
    {
      key: "totalConsumed",
      label: "累计消费",
      value: "8,240",
      unit: "积分",
      icon: "mdi:shopping-bag-outline",
      tone: "rose",
    },
    {
      key: "recentNet",
      label: "近30天净变动",
      value: "+1,250",
      unit: "积分",
      icon: "mdi:zap",
      tone: "amber",
    },
  ];
});

const filteredRecords = computed(() => {
  const active = filters.value;
  const now = new Date("2025-06-01 00:00:00").getTime();

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

    if (active.dateRange && active.dateRange !== "custom") {
      const cutoff = now - Number(active.dateRange) * 24 * 60 * 60 * 1000;
      if (recordDate < cutoff) return false;
    }

    if (active.dateRange === "custom") {
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

watch(
  () => route.query.view,
  (value) => {
    version.value = resolveVersion(value);
  },
);

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
      <PointsSummaryCards
        :admin-theme="viewConfig.adminTheme"
        :cards="summaryCards"
      />

      <PointsFlowTable
        v-model:current-page="currentPage"
        v-model:filters="filters"
        :config="viewConfig"
        :page-size="pageSize"
        :records="pagedRecords"
        :total="filteredRecords.length"
        @export="handleExport"
        @recharge="handleRecharge"
      />
    </div>

    <PointsRechargeModal v-model:show="rechargeModalVisible" />
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

@media (max-width: 640px) {
  .points-query-shell {
    padding: 16px;
  }
}
</style>
