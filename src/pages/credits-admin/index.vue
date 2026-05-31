<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { computed, h, onMounted, ref } from "vue";
import { NButton, NDataTable, NTag } from "naive-ui";
import type { DataTableColumns } from "naive-ui";

import {
  getCreditsAdminOverview,
  type CreditAccount,
  type CreditTransaction,
  type CreditsFunction,
  type RechargeProduct,
} from "@/api/visual-workbench";

const isLoading = ref(false);
const accounts = ref<CreditAccount[]>([]);
const functions = ref<CreditsFunction[]>([]);
const transactions = ref<CreditTransaction[]>([]);
const products = ref<RechargeProduct[]>([]);

const formatPoints = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return "0";
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(parsed);
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date).replace(/\//g, "-");
};

const statusTag = (status: string) => {
  const type = status === "active" ? "success" : status === "pending" ? "warning" : "default";
  return h(NTag, { type, round: true, bordered: false }, { default: () => status });
};

const transactionTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    grant: "赠送",
    estimate: "预估",
    freeze: "冻结",
    settle: "结算",
    refund: "退款",
  };
  return labels[type] ?? type;
};

const metrics = computed(() => {
  const totalBalance = accounts.value.reduce((sum, account) => sum + Number(account.totalBalance), 0);
  const lockedBalance = accounts.value.reduce((sum, account) => sum + Number(account.lockedBalance), 0);
  const activeFunctions = functions.value.filter((item) => item.status === "active").length;
  const rechargeProductCount = products.value.filter((item) => item.enabled).length;
  return [
    { label: "账户总余额", value: formatPoints(totalBalance), icon: "mdi:wallet-outline" },
    { label: "冻结积分", value: formatPoints(lockedBalance), icon: "mdi:lock-clock" },
    { label: "启用功能", value: String(activeFunctions), icon: "mdi:function-variant" },
    { label: "充值产品", value: String(rechargeProductCount), icon: "mdi:cart-outline" },
  ];
});

const accountColumns: DataTableColumns<CreditAccount> = [
  { title: "账户ID", key: "id", width: 100 },
  {
    title: "范围",
    key: "accountScope",
    width: 120,
    render(row) {
      return row.accountScope === "tenant" ? "企业账户" : "个人账户";
    },
  },
  { title: "用户ID", key: "userId", width: 120 },
  { title: "租户ID", key: "tenantId", width: 120 },
  {
    title: "可用积分",
    key: "availableBalance",
    width: 150,
    render(row) {
      return h("span", { class: "num" }, formatPoints(row.availableBalance));
    },
  },
  {
    title: "状态",
    key: "status",
    width: 120,
    render(row) {
      return statusTag(row.status);
    },
  },
];

const functionColumns: DataTableColumns<CreditsFunction> = [
  { title: "功能代码", key: "code", width: 190 },
  { title: "名称", key: "name", width: 200 },
  { title: "计费模式", key: "chargeMode", width: 130 },
  {
    title: "默认积分",
    key: "defaultPoints",
    width: 130,
    render(row) {
      return h("span", { class: "num" }, formatPoints(row.defaultPoints));
    },
  },
  {
    title: "状态",
    key: "status",
    width: 120,
    render(row) {
      return statusTag(row.status);
    },
  },
];

const transactionColumns: DataTableColumns<CreditTransaction> = [
  { title: "流水ID", key: "id", width: 100 },
  {
    title: "类型",
    key: "txnType",
    width: 120,
    render(row) {
      return transactionTypeLabel(row.txnType);
    },
  },
  {
    title: "积分",
    key: "points",
    width: 130,
    render(row) {
      const points = Number(row.points);
      return h(
        "span",
        { class: ["num", points >= 0 ? "positive" : "negative"] },
        `${points > 0 ? "+" : ""}${formatPoints(points)}`,
      );
    },
  },
  { title: "账户ID", key: "accountId", width: 110 },
  { title: "计费任务", key: "billingTaskId", width: 130 },
  { title: "业务类型", key: "bizType", width: 130 },
  { title: "业务ID", key: "bizId", width: 180, ellipsis: { tooltip: true } },
  {
    title: "时间",
    key: "createdAt",
    width: 170,
    render(row) {
      return formatDateTime(row.createdAt);
    },
  },
];

async function loadOverview() {
  isLoading.value = true;
  try {
    const overview = await getCreditsAdminOverview();
    accounts.value = overview.accounts;
    functions.value = overview.functions;
    transactions.value = overview.transactions;
    products.value = overview.rechargeProducts;
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  void loadOverview();
});
</script>

<template>
  <main class="credits-admin-page">
    <aside class="admin-sidebar">
      <div class="brand">
        <span class="logo">C</span>
        <div>
          <strong>积分后台</strong>
          <span>Reusable Credits Console</span>
        </div>
      </div>
      <div class="profile-box">
        <strong>只读运维视图</strong>
        <span>用于检查 usedCarPlatform 接入后的账户、功能和流水状态。</span>
      </div>
      <button class="nav-btn active" type="button">
        概览
        <small>Live</small>
      </button>
      <button class="nav-btn" type="button">账户</button>
      <button class="nav-btn" type="button">功能定价</button>
      <button class="nav-btn" type="button">积分流水</button>
    </aside>

    <section class="main">
      <header class="topbar">
        <div>
          <h1>积分后台概览</h1>
          <p class="subtitle">从 usedCar 后端代理读取 Reusable Credits Platform 的实时数据。</p>
        </div>
        <NButton type="primary" :loading="isLoading" @click="loadOverview">
          <template #icon>
            <Icon icon="mdi:refresh" />
          </template>
          刷新
        </NButton>
      </header>

      <section class="metrics" aria-label="积分后台指标">
        <article v-for="metric in metrics" :key="metric.label" class="metric">
          <Icon :icon="metric.icon" class="metric-icon" />
          <label>{{ metric.label }}</label>
          <strong>{{ metric.value }}</strong>
        </article>
      </section>

      <div class="grid">
        <section class="panel">
          <header class="panel-head">
            <h2>账户状态</h2>
            <NTag round :bordered="false" type="info">{{ accounts.length }} 个账户</NTag>
          </header>
          <NDataTable
            :columns="accountColumns"
            :data="accounts"
            :loading="isLoading"
            :bordered="false"
            :pagination="false"
            :scroll-x="860"
          />
        </section>

        <section class="panel">
          <header class="panel-head">
            <h2>充值产品</h2>
          </header>
          <div class="side-list">
            <article v-for="product in products" :key="product.id" class="side-item">
              <div>
                <strong>{{ product.name }}</strong>
                <span>{{ formatPoints(product.points) }} 积分 · ¥{{ formatPoints(product.amount) }}</span>
              </div>
              <NTag round :bordered="false" :type="product.enabled ? 'success' : 'default'">
                {{ product.enabled ? "启用" : "停用" }}
              </NTag>
            </article>
          </div>
        </section>
      </div>

      <section class="panel">
        <header class="panel-head">
          <h2>usedCarPlatform 功能定价</h2>
          <NTag round :bordered="false" type="success">{{ functions.length }} 项</NTag>
        </header>
        <NDataTable
          :columns="functionColumns"
          :data="functions"
          :loading="isLoading"
          :bordered="false"
          :pagination="false"
          :scroll-x="900"
        />
      </section>

      <section class="panel">
        <header class="panel-head">
          <h2>最近积分流水</h2>
          <NTag round :bordered="false" type="info">{{ transactions.length }} 条</NTag>
        </header>
        <NDataTable
          :columns="transactionColumns"
          :data="transactions"
          :loading="isLoading"
          :bordered="false"
          :pagination="{ pageSize: 10 }"
          :scroll-x="1120"
        />
      </section>
    </section>
  </main>
</template>

<style scoped lang="scss">
.credits-admin-page {
  min-height: calc(100vh - var(--app-header-offset));
  display: grid;
  grid-template-columns: 292px minmax(0, 1fr);
  background: #f8fafc;
  color: #1e293b;
}

.admin-sidebar {
  position: sticky;
  top: var(--app-header-offset);
  height: calc(100vh - var(--app-header-offset));
  overflow: auto;
  background: #0f172a;
  color: #fff;
  padding: 24px 20px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.logo {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: #2563eb;
  display: grid;
  place-items: center;
  font-weight: 800;
}

.brand strong,
.profile-box strong {
  display: block;
}

.brand span,
.profile-box span {
  display: block;
  margin-top: 4px;
  color: #cbd5e1;
  font-size: 12px;
  line-height: 1.5;
}

.profile-box {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 18px;
}

.nav-btn {
  width: 100%;
  border: 0;
  color: inherit;
  background: transparent;
  text-align: left;
  border-radius: 8px;
  padding: 10px 11px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.nav-btn.active {
  background: #1d4ed8;
}

.nav-btn small {
  color: #cbd5e1;
  font-size: 11px;
}

.main {
  min-width: 0;
  padding: 28px;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 22px;
}

h1 {
  margin: 0 0 8px;
  font-size: 28px;
  letter-spacing: 0;
}

.subtitle {
  margin: 0;
  color: #64748b;
  line-height: 1.6;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.metric {
  position: relative;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 18px;
  min-height: 108px;
}

.metric-icon {
  position: absolute;
  right: 18px;
  top: 18px;
  color: #2563eb;
  font-size: 24px;
}

.metric label {
  display: block;
  margin-bottom: 10px;
  color: #64748b;
  font-size: 13px;
}

.metric strong {
  font-size: 25px;
  font-variant-numeric: tabular-nums;
}

.grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(340px, 0.55fr);
  gap: 18px;
  align-items: start;
}

.panel {
  min-width: 0;
  margin-bottom: 18px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.panel-head {
  border-bottom: 1px solid #e2e8f0;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.panel-head h2 {
  margin: 0;
  font-size: 17px;
}

.side-list {
  padding: 8px 18px 18px;
}

.side-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  padding: 13px 0;
  border-bottom: 1px solid #e2e8f0;
}

.side-item:last-child {
  border-bottom: 0;
}

.side-item strong {
  display: block;
  margin-bottom: 5px;
}

.side-item span {
  color: #64748b;
  font-size: 13px;
  line-height: 1.45;
}

:deep(.num) {
  font-variant-numeric: tabular-nums;
  font-weight: 800;
}

:deep(.positive) {
  color: #047857;
}

:deep(.negative) {
  color: #be123c;
}

@media (max-width: 1120px) {
  .credits-admin-page {
    grid-template-columns: 1fr;
  }

  .admin-sidebar {
    position: static;
    height: auto;
  }

  .metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .main {
    padding: 16px;
  }

  .topbar {
    flex-direction: column;
  }

  .metrics {
    grid-template-columns: 1fr;
  }
}
</style>

