<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import {
  NButton,
  NDataTable,
  NEmpty,
  NSpin,
  NTag,
  useMessage,
} from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'

import {
  getCreditsAdminOverview,
  type CreditsAccount,
  type CreditsAdminOverview,
  type CreditsTransaction,
  type RechargeProduct,
} from '@/api/visual-workbench'
import { useAppStore } from '@/stores/app'

type RoleTab = 'developer' | 'admin' | 'agent'

const appStore = useAppStore()
const message = useMessage()

const overview = ref<CreditsAdminOverview | null>(null)
const isLoading = ref(false)
const lastError = ref<string | null>(null)
const activeRole = ref<RoleTab>('developer')

const roleTabs: Array<{ value: RoleTab; label: string; description: string; icon: string }> = [
  {
    value: 'developer',
    label: '开发者',
    description: '查看应用注册、功能计费配置与积分账户',
    icon: 'mdi:code-tags',
  },
  {
    value: 'admin',
    label: '公司管理员',
    description: '关注积分账户、充值产品与近期流水',
    icon: 'mdi:shield-account-outline',
  },
  {
    value: 'agent',
    label: '代理商',
    description: '线索、客户、消费返佣等运营视图（原型）',
    icon: 'mdi:handshake-outline',
  },
]

async function refreshOverview() {
  isLoading.value = true
  try {
    overview.value = await getCreditsAdminOverview()
    lastError.value = null
  } catch (error) {
    const text = error instanceof Error ? error.message : '加载积分后台概览失败'
    lastError.value = text
    message.error(text)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void refreshOverview()
})

const application = computed(() => overview.value?.application ?? null)
const applicationFunctions = computed(() => overview.value?.applicationFunctions ?? [])
const creditAccounts = computed(() => overview.value?.creditAccounts ?? [])
const rechargeProducts = computed(() => overview.value?.rechargeProducts ?? [])
const recentTransactions = computed(() => overview.value?.recentTransactions ?? [])

const functionColumns: DataTableColumns<CreditsAdminOverview['applicationFunctions'][number]> = [
  { title: '功能编码', key: 'code', width: 220 },
  { title: '功能名称', key: 'name', width: 200 },
  {
    title: '默认积分',
    key: 'defaultPoints',
    width: 120,
    render(row) {
      return Number(row.defaultPoints ?? 0).toLocaleString('zh-CN')
    },
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row) {
      return h(
        NTag,
        {
          round: true,
          bordered: false,
          type: row.status === 'active' ? 'success' : 'default',
        },
        { default: () => row.status },
      )
    },
  },
]

const accountColumns: DataTableColumns<CreditsAccount> = [
  { title: '账户 ID', key: 'id', width: 140 },
  { title: '用户 ID', key: 'userId', width: 100 },
  { title: '租户 ID', key: 'tenantId', width: 100, render(row) { return row.tenantId ?? '-' } },
  { title: '范围', key: 'accountScope', width: 120 },
  {
    title: '可用积分',
    key: 'availableBalance',
    width: 140,
    render(row) {
      return Number(row.availableBalance ?? 0).toLocaleString('zh-CN')
    },
  },
  {
    title: '冻结积分',
    key: 'lockedBalance',
    width: 140,
    render(row) {
      return Number(row.lockedBalance ?? 0).toLocaleString('zh-CN')
    },
  },
  {
    title: '账户总额',
    key: 'totalBalance',
    width: 140,
    render(row) {
      return Number(row.totalBalance ?? 0).toLocaleString('zh-CN')
    },
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row) {
      return h(
        NTag,
        {
          round: true,
          bordered: false,
          type: row.status === 'active' ? 'success' : 'warning',
        },
        { default: () => row.status },
      )
    },
  },
]

const productColumns: DataTableColumns<RechargeProduct> = [
  { title: '编码', key: 'code', width: 160 },
  { title: '名称', key: 'name', width: 200 },
  {
    title: '价格',
    key: 'priceText',
    width: 140,
    render(row) {
      if (row.priceText) return row.priceText
      if (typeof row.priceCents === 'number') {
        return `¥${(row.priceCents / 100).toLocaleString('zh-CN')}`
      }
      return '-'
    },
  },
  {
    title: '赠送积分',
    key: 'giftPoints',
    width: 130,
    render(row) {
      return Number(row.giftPoints ?? 0).toLocaleString('zh-CN')
    },
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row) {
      return row.status ?? '-'
    },
  },
]

const transactionColumns: DataTableColumns<CreditsTransaction> = [
  {
    title: '时间',
    key: 'createdAt',
    width: 200,
    render(row) {
      const time = new Date(row.createdAt)
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${time.getFullYear()}-${pad(time.getMonth() + 1)}-${pad(time.getDate())} ${pad(time.getHours())}:${pad(time.getMinutes())}`
    },
  },
  {
    title: '类型',
    key: 'txnType',
    width: 120,
    render(row) {
      const colorMap: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
        recharge: 'success',
        settle: 'info',
        freeze: 'warning',
        refund: 'success',
        estimate: 'default',
      }
      return h(
        NTag,
        {
          round: true,
          bordered: false,
          type: colorMap[row.txnType] ?? 'default',
        },
        { default: () => row.txnType },
      )
    },
  },
  {
    title: '积分变动',
    key: 'points',
    width: 140,
    render(row) {
      const sign = row.points > 0 ? '+' : ''
      return h(
        'span',
        { class: row.points >= 0 ? 'admin-delta is-up' : 'admin-delta is-down' },
        `${sign}${Number(row.points).toLocaleString('zh-CN')}`,
      )
    },
  },
  {
    title: '业务 ID',
    key: 'bizId',
    minWidth: 220,
    ellipsis: { tooltip: true },
    render(row) {
      return row.bizId ?? '-'
    },
  },
  {
    title: '计费任务',
    key: 'billingTaskId',
    width: 180,
    ellipsis: { tooltip: true },
    render(row) {
      return row.billingTaskId ?? '-'
    },
  },
]

const developerPlaceholder = [
  { label: 'CRUD 审批流程', status: '规划中' },
  { label: '应用密钥管理', status: '规划中' },
  { label: '功能上下架', status: '规划中' },
]

const agentSections = [
  { title: '线索/商机报备', desc: '展示代理商录入的线索，后续接入 CRM 流程' },
  { title: '客户与消费', desc: '客户消费与剩余积分明细，等待生产 API' },
  { title: '返佣记录', desc: '按月度展示佣金计算，依赖结算 API' },
  { title: '结算账单', desc: '账单生成与确认，规划中' },
  { title: '营销物料', desc: '素材、海报与培训材料，规划中' },
  { title: '工单支持', desc: '工单创建与跟进，规划中' },
]
</script>

<template>
  <main class="credits-admin-page" :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'">
    <section class="admin-shell">
      <header class="admin-hero">
        <div class="admin-hero-copy">
          <p class="admin-hero-kicker">积分后台 · Reusable Credits Platform 集成视图</p>
          <h1>三角色后台</h1>
          <p class="admin-hero-sub">
            实时数据由 usedCar 后端代理 <code>/api/v1/credits/admin/overview</code> 拉取；写操作仍处于原型阶段，待生产 API。
          </p>
        </div>
        <div class="admin-hero-actions">
          <NButton type="primary" :loading="isLoading" @click="refreshOverview">
            <template #icon>
              <Icon icon="mdi:refresh" />
            </template>
            刷新实时数据
          </NButton>
        </div>
      </header>

      <nav class="admin-tabs" aria-label="角色切换">
        <button
          v-for="tab in roleTabs"
          :key="tab.value"
          type="button"
          class="admin-tab"
          :class="{ active: activeRole === tab.value }"
          @click="activeRole = tab.value"
        >
          <Icon :icon="tab.icon" />
          <span class="admin-tab-label">{{ tab.label }}</span>
          <span class="admin-tab-desc">{{ tab.description }}</span>
        </button>
      </nav>

      <NSpin :show="isLoading">
        <p v-if="lastError" class="admin-error">{{ lastError }}</p>

        <section v-if="application" class="admin-summary" aria-label="应用概览">
          <article class="admin-summary-card">
            <p>应用</p>
            <strong>{{ application.name }}</strong>
            <span>code: {{ application.code }} · status: {{ application.status }}</span>
          </article>
          <article class="admin-summary-card">
            <p>积分账户</p>
            <strong>{{ creditAccounts.length }}</strong>
            <span>个账户</span>
          </article>
          <article class="admin-summary-card">
            <p>充值产品</p>
            <strong>{{ rechargeProducts.length }}</strong>
            <span>个产品</span>
          </article>
          <article class="admin-summary-card">
            <p>近期流水</p>
            <strong>{{ recentTransactions.length }}</strong>
            <span>条记录</span>
          </article>
        </section>

        <template v-if="activeRole === 'developer'">
          <section class="admin-section">
            <h2>应用功能计费配置</h2>
            <NDataTable
              v-if="applicationFunctions.length"
              :columns="functionColumns"
              :data="applicationFunctions"
              :bordered="false"
              :single-line="false"
              :pagination="false"
            />
            <NEmpty v-else description="暂无功能计费配置" />
          </section>

          <section class="admin-section">
            <h2>开发者待办（规划中）</h2>
            <ul class="admin-placeholder-list">
              <li v-for="item in developerPlaceholder" :key="item.label">
                <span>{{ item.label }}</span>
                <NTag round :bordered="false" type="info">{{ item.status }}</NTag>
              </li>
            </ul>
          </section>
        </template>

        <template v-else-if="activeRole === 'admin'">
          <section class="admin-section">
            <h2>积分账户</h2>
            <NDataTable
              v-if="creditAccounts.length"
              :columns="accountColumns"
              :data="creditAccounts"
              :bordered="false"
              :single-line="false"
              :pagination="false"
            />
            <NEmpty v-else description="暂无积分账户" />
          </section>

          <section class="admin-section">
            <h2>充值产品</h2>
            <NDataTable
              v-if="rechargeProducts.length"
              :columns="productColumns"
              :data="rechargeProducts"
              :bordered="false"
              :single-line="false"
              :pagination="false"
            />
            <NEmpty v-else description="暂无充值产品" />
          </section>

          <section class="admin-section">
            <h2>近期积分流水</h2>
            <NDataTable
              v-if="recentTransactions.length"
              :columns="transactionColumns"
              :data="recentTransactions"
              :bordered="false"
              :single-line="false"
              :pagination="false"
            />
            <NEmpty v-else description="暂无积分流水" />
          </section>
        </template>

        <template v-else>
          <section class="admin-section">
            <h2>代理商运营视图（原型）</h2>
            <p class="admin-section-note">
              下列模块当前仅展示静态原型，等待生产 API 接入后再点亮。详见文档第 3 节"尚未完成内容"。
            </p>
            <div class="admin-agent-grid">
              <article v-for="item in agentSections" :key="item.title" class="admin-agent-card">
                <h3>{{ item.title }}</h3>
                <p>{{ item.desc }}</p>
                <NTag round :bordered="false" type="warning">规划中</NTag>
              </article>
            </div>
          </section>
        </template>
      </NSpin>
    </section>
  </main>
</template>

<style scoped lang="scss">
.credits-admin-page {
  min-height: calc(100vh - var(--app-header-offset));
  padding: clamp(16px, 2vw, 30px);
  background: var(--app-bg);
  color: var(--app-text);
}

.admin-shell {
  display: flex;
  flex-direction: column;
  gap: clamp(16px, 1.6vw, 24px);
  width: 100%;
  max-width: 1500px;
  margin: 0 auto;
}

.admin-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 24px clamp(20px, 2vw, 32px);
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-surface);
}

.admin-hero-kicker {
  margin: 0 0 6px;
  color: var(--app-text-soft);
  font-size: 13px;
  font-weight: 700;
}

.admin-hero h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 900;
}

.admin-hero-sub {
  margin: 8px 0 0;
  max-width: 720px;
  color: var(--app-text-soft);
  font-size: 13px;
  line-height: 1.6;
}

.admin-hero-sub code {
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--app-surface-soft);
  font-size: 12px;
}

.admin-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.admin-tab {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  align-items: center;
  gap: 6px 12px;
  padding: 16px 18px;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-surface);
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.admin-tab .iconify {
  grid-row: span 2;
  font-size: 24px;
  color: var(--app-text-soft);
}

.admin-tab-label {
  font-size: 16px;
  font-weight: 900;
}

.admin-tab-desc {
  color: var(--app-text-soft);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.5;
}

.admin-tab.active {
  border-color: color-mix(in srgb, var(--color-accent-blue, #2f6bff) 64%, var(--app-border));
  background: color-mix(in srgb, var(--color-accent-blue, #2f6bff) 8%, var(--app-surface));
  box-shadow: 0 8px 22px color-mix(in srgb, var(--color-accent-blue, #2f6bff) 14%, transparent);
}

.admin-tab.active .iconify {
  color: var(--color-accent-blue, #2f6bff);
}

.admin-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.admin-summary-card {
  display: grid;
  gap: 4px;
  padding: 18px 20px;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-surface);
}

.admin-summary-card p {
  margin: 0;
  color: var(--app-text-soft);
  font-size: 13px;
  font-weight: 700;
}

.admin-summary-card strong {
  font-size: 28px;
  font-weight: 900;
}

.admin-summary-card span {
  color: var(--app-text-soft);
  font-size: 12px;
  font-weight: 600;
}

.admin-section {
  padding: 20px clamp(18px, 1.8vw, 26px);
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-surface);
}

.admin-section + .admin-section {
  margin-top: 16px;
}

.admin-section h2 {
  margin: 0 0 14px;
  font-size: 17px;
  font-weight: 900;
}

.admin-section-note {
  margin: 0 0 14px;
  color: var(--app-text-soft);
  font-size: 13px;
  line-height: 1.6;
}

.admin-placeholder-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.admin-placeholder-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px dashed var(--app-border);
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
}

.admin-agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.admin-agent-card {
  display: grid;
  gap: 6px;
  padding: 16px 18px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-surface-soft);
}

.admin-agent-card h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 900;
}

.admin-agent-card p {
  margin: 0;
  color: var(--app-text-soft);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.55;
}

.admin-error {
  margin: 0 0 12px;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, #ef4444 32%, var(--app-border));
  border-radius: 10px;
  background: color-mix(in srgb, #ef4444 8%, var(--app-surface));
  color: #ef4444;
  font-size: 13px;
  font-weight: 700;
}

:deep(.admin-delta.is-up) {
  color: #18b77d;
  font-weight: 800;
}

:deep(.admin-delta.is-down) {
  color: #e77835;
  font-weight: 800;
}

@media (max-width: 1024px) {
  .admin-tabs,
  .admin-summary {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
