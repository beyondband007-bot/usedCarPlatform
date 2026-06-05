<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const roleLabel = computed(() => {
  if (authStore.role === 'developer') return '开发者后台'
  if (authStore.role === 'admin') return '公司管理员后台'
  if (authStore.role === 'agent') return '代理商后台'
  return '未授权'
})

const roleScope = computed(() => {
  if (authStore.role === 'developer') return '全平台 / 全应用 / 全客户'
  if (authStore.role === 'admin') return '销售部 / 全平台只读 / 代理商运营'
  if (authStore.role === 'agent') return '本人名下客户 / 线索 / 返佣结算'
  return '需要后台账号'
})

const navItems = computed(() => {
  if (authStore.role === 'developer') {
    return [
      { label: '系统总览', anchor: 'developer-dashboard' },
      { label: '租户/客户管理', anchor: 'developer-customers' },
      { label: '用户/账户管理', anchor: 'developer-accounts' },
      { label: '充值与订单', anchor: 'developer-recharge' },
      { label: '代理商管理', anchor: 'developer-agents' },
      { label: '返佣记录', anchor: 'developer-commissions' },
      { label: '结算管理', anchor: 'developer-settlements' },
    ]
  }

  if (authStore.role === 'admin') {
    return [
      { label: '系统总览', anchor: 'admin-dashboard' },
      { label: '代理商管理', anchor: 'admin-agents' },
      { label: '用户清单', anchor: 'admin-users' },
      { label: '充值记录', anchor: 'admin-recharge' },
      { label: '工单处理', anchor: 'admin-tickets' },
      { label: '结算审批', anchor: 'admin-settlements' },
      { label: '线索/报备', anchor: 'admin-leads' },
    ]
  }

  if (authStore.role === 'agent') {
    return [
      { label: '代理工作台', anchor: 'agent-dashboard' },
      { label: '线索/报备', anchor: 'agent-leads' },
      { label: '我的客户', anchor: 'agent-customers' },
      { label: '客户消费', anchor: 'agent-consumption' },
      { label: '返佣结算', anchor: 'agent-settlements' },
    ]
  }

  return []
})

async function handleLogout() {
  await authStore.logout()
  router.push('/back-office/login')
}
</script>

<template>
  <div class="back-office-layout">
    <aside class="back-office-sidebar">
      <RouterLink class="back-office-brand" to="/back-office">
        <span class="back-office-logo">积</span>
        <span>
          <strong>积分后台</strong>
          <small>Reusable Credits Console</small>
        </span>
      </RouterLink>

      <section class="back-office-profile">
        <strong>{{ authStore.userName }}</strong>
        <span>{{ roleLabel }}</span>
        <small>{{ roleScope }}</small>
      </section>

      <p class="back-office-nav-label">功能</p>
      <nav class="back-office-nav" aria-label="后台菜单">
        <a
          v-for="item in navItems"
          :key="item.anchor"
          :href="`#${item.anchor}`"
          class="back-office-nav-link"
        >
          <span>{{ item.label }}</span>
          <Icon icon="mdi:chevron-right" />
        </a>
      </nav>

      <button type="button" class="back-office-logout" @click="handleLogout">
        <Icon icon="mdi:logout" />
        退出后台
      </button>
    </aside>

    <main class="back-office-main">
      <header class="back-office-topbar">
        <div>
          <p>Reusable Credits Platform Console</p>
          <h1>{{ roleLabel }}</h1>
        </div>
        <div class="back-office-app-signal">
          <Icon icon="mdi:apps" />
          <span>当前接入：usedCarPlatform</span>
        </div>
      </header>

      <RouterView />
    </main>
  </div>
</template>

<style scoped lang="scss">
.back-office-layout {
  display: grid;
  min-height: 100vh;
  grid-template-columns: 292px minmax(0, 1fr);
  background: #f8fafc;
  color: #0f172a;
}

.back-office-sidebar {
  position: sticky;
  top: 0;
  display: flex;
  height: 100vh;
  flex-direction: column;
  overflow-y: auto;
  background: #0f172a;
  color: #fff;
  padding: 24px 20px;
}

.back-office-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  color: inherit;
  text-decoration: none;
}

.back-office-logo {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 8px;
  background: #2563eb;
  font-size: 18px;
  font-weight: 900;
}

.back-office-brand strong {
  display: block;
  font-size: 16px;
}

.back-office-brand small,
.back-office-profile small,
.back-office-profile span,
.back-office-nav-label {
  color: #cbd5e1;
}

.back-office-profile {
  display: grid;
  gap: 6px;
  margin: 22px 0 18px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
}

.back-office-profile strong {
  font-size: 15px;
}

.back-office-profile span,
.back-office-profile small {
  font-size: 12px;
  line-height: 1.5;
}

.back-office-nav-label {
  margin: 4px 0 8px;
  font-size: 12px;
  font-weight: 700;
}

.back-office-nav {
  display: grid;
  gap: 4px;
}

.back-office-nav-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-radius: 8px;
  color: inherit;
  padding: 10px 11px;
  text-decoration: none;
}

.back-office-nav-link:hover {
  background: rgba(255, 255, 255, 0.08);
}

.back-office-logout {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  background: transparent;
  color: #fff;
  padding: 10px 12px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.back-office-main {
  min-width: 0;
  padding: 28px;
}

.back-office-topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.back-office-topbar p {
  margin: 0 0 6px;
  color: #64748b;
  font-size: 13px;
  font-weight: 800;
}

.back-office-topbar h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 900;
}

.back-office-app-signal {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  padding: 9px 12px;
  color: #334155;
  font-size: 13px;
  font-weight: 800;
}

@media (max-width: 900px) {
  .back-office-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .back-office-sidebar {
    position: static;
    height: auto;
  }

  .back-office-main {
    padding: 18px;
  }

  .back-office-topbar {
    flex-direction: column;
  }
}
</style>
