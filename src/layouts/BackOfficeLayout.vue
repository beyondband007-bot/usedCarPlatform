<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import CreditsAdminPage from '@/pages/credits-admin/index.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const activeNavAnchor = ref('')

const roleThemeClass = computed(() => {
  if (authStore.role === 'admin') return 'role-theme-admin'
  if (authStore.role === 'agent') return 'role-theme-agent'
  return 'role-theme-developer'
})

const roleLabel = computed(() => {
  if (authStore.role === 'developer') return '开发者后台'
  if (authStore.role === 'admin') return '公司管理员后台'
  if (authStore.role === 'agent') return '代理商后台'
  return '未授权'
})

const roleScope = computed(() => {
  if (authStore.role === 'developer') return '全平台 / 全应用 / 全客户'
  if (authStore.role === 'admin') return '销售部 / 全平台只读 / 代理商运营'
  if (authStore.role === 'agent') return '本人名下客户 / 返佣结算'
  return '需要后台账号'
})

const navItems = computed(() => {
  if (authStore.role === 'developer') {
    return [
      { label: '系统总览', anchor: 'developer-dashboard', icon: 'mdi:view-dashboard-outline' },
      { label: '用户/账户管理', anchor: 'developer-permissions', icon: 'mdi:account-cog-outline' },
      { label: '充值与订单', anchor: 'developer-customers', icon: 'mdi:credit-card-outline' },
      { label: '代理商管理', anchor: 'developer-permissions', icon: 'mdi:handshake-outline' },
      { label: '运营记录', anchor: 'developer-trends', icon: 'mdi:chart-timeline-variant' },
      { label: '结算管理', anchor: 'developer-customers', icon: 'mdi:cash-multiple' },
    ]
  }

  if (authStore.role === 'admin') {
    return [
      { label: '系统总览', anchor: 'admin-dashboard', icon: 'mdi:view-dashboard-outline' },
      { label: '代理商管理', anchor: 'admin-agents', icon: 'mdi:handshake-outline' },
      { label: '客户目录', anchor: 'admin-users', icon: 'mdi:account-group-outline' },
      { label: '结算审批', anchor: 'admin-settlements', icon: 'mdi:cash-check' },
    ]
  }

  if (authStore.role === 'agent') {
    return [
      { label: '代理工作台', anchor: 'agent-dashboard', icon: 'mdi:view-dashboard-outline' },
      { label: '客户表', anchor: 'agent-customers', icon: 'mdi:account-group-outline' },
      { label: '流水表', anchor: 'agent-consumption', icon: 'mdi:chart-line' },
      { label: '返佣结算', anchor: 'agent-settlements', icon: 'mdi:cash-multiple' },
    ]
  }

  return []
})

const activeNavKey = computed(() => activeNavAnchor.value || navItems.value[0]?.anchor)

function getHashNavAnchor() {
  if (typeof window === 'undefined') return ''
  const hash = window.location.hash.replace(/^#/, '')
  return navItems.value.some((item) => item.anchor === hash) ? hash : ''
}

watch(
  () => authStore.role,
  () => {
    activeNavAnchor.value = authStore.role === 'agent' ? getHashNavAnchor() : ''
  },
)

onMounted(() => {
  if (authStore.role === 'agent') {
    activeNavAnchor.value = getHashNavAnchor()
  }
})

async function handleNavClick(anchor: string) {
  activeNavAnchor.value = anchor
  await nextTick()
  if (authStore.role === 'agent') {
    window.history.replaceState(null, '', `#${anchor}`)
    return
  }
  window.requestAnimationFrame(() => {
    document.getElementById(anchor)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
    window.history.replaceState(null, '', `#${anchor}`)
  })
}

async function handleLogout() {
  await authStore.logout()
  router.push('/back-office/login')
}
</script>

<template>
  <div class="back-office-layout" :class="roleThemeClass">
    <aside class="back-office-sidebar">
      <RouterLink class="back-office-brand" to="/back-office">
        <span class="back-office-logo">积</span>
        <span>
          <strong>积分后台</strong>
          <small>Reusable Credits Console</small>
        </span>
      </RouterLink>

      <p class="back-office-nav-label">{{ roleLabel.replace('后台', '') }}</p>
      <section class="back-office-profile">
        <strong>{{ roleLabel }}</strong>
        <small>{{ roleScope }}</small>
      </section>

      <p class="back-office-nav-label">功能</p>
      <nav class="back-office-nav" aria-label="后台菜单">
        <button
          v-for="(item, index) in navItems"
          :key="`${item.anchor}-${index}`"
          type="button"
          class="back-office-nav-link"
          :class="{ active: activeNavKey === item.anchor }"
          @click="handleNavClick(item.anchor)"
        >
          <Icon :icon="item.icon" />
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <button type="button" class="back-office-logout" @click="handleLogout">
        <Icon icon="mdi:logout" />
        退出后台
      </button>
    </aside>

    <main class="back-office-main">
      <header class="back-office-topbar back-office-topbar-fixed">
        <div>
          <p>Reusable Credits Platform Console</p>
          <h1>{{ roleLabel }}</h1>
        </div>
        <div class="back-office-topbar-actions">
          <button type="button" class="back-office-icon-btn" aria-label="通知">
            <Icon icon="mdi:bell-outline" />
          </button>
          <button type="button" class="back-office-icon-btn" aria-label="帮助">
            <Icon icon="mdi:help-circle-outline" />
          </button>
          <div class="back-office-app-signal">
            <Icon icon="mdi:apps" />
            <span>AI Carxen(车新新)</span>
          </div>
          <div class="back-office-user">
            <span class="back-office-user-avatar">{{ authStore.userName?.slice(0, 1) || 'U' }}</span>
            <span class="back-office-user-name">{{ authStore.userName }}</span>
          </div>
        </div>
      </header>

      <div class="back-office-content">
        <CreditsAdminPage :active-agent-page="authStore.role === 'agent' ? activeNavKey : undefined" />
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
.back-office-layout {
  display: grid;
  min-height: 100vh;
  grid-template-columns: 220px minmax(0, 1fr);
  --bo-role-bg: #f5f7ff;
  --bo-role-sidebar: #0f172a;
  --bo-role-sidebar-soft: rgba(255, 255, 255, 0.06);
  --bo-role-accent: #2f6bff;
  --bo-role-accent-strong: #1d4ed8;
  --bo-role-accent-soft: #eaf1ff;
  background: var(--bo-role-bg);
  color: #0f172a;
}

.back-office-layout.role-theme-developer {
  --bo-role-bg: #f5f7ff;
  --bo-role-sidebar: #0f172a;
  --bo-role-sidebar-soft: rgba(47, 107, 255, 0.14);
  --bo-role-accent: #2f6bff;
  --bo-role-accent-strong: #1d4ed8;
  --bo-role-accent-soft: #eaf1ff;
}

.back-office-layout.role-theme-admin {
  --bo-role-bg: #f3faf7;
  --bo-role-sidebar: #063f32;
  --bo-role-sidebar-soft: rgba(16, 185, 129, 0.14);
  --bo-role-accent: #059669;
  --bo-role-accent-strong: #047857;
  --bo-role-accent-soft: #dcfce7;
}

.back-office-layout.role-theme-agent {
  --bo-role-bg: #fff8ed;
  --bo-role-sidebar: #422006;
  --bo-role-sidebar-soft: rgba(245, 158, 11, 0.16);
  --bo-role-accent: #d97706;
  --bo-role-accent-strong: #b45309;
  --bo-role-accent-soft: #fef3c7;
}

.back-office-sidebar {
  position: sticky;
  top: 0;
  display: flex;
  height: 100vh;
  flex-direction: column;
  overflow-y: auto;
  background: var(--bo-role-sidebar);
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
  background: var(--bo-role-accent);
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
  gap: 4px;
  margin: 6px 0 18px;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--bo-role-sidebar-soft);
}

.back-office-profile strong {
  font-size: 14px;
}

.back-office-profile small {
  font-size: 11px;
  line-height: 1.5;
}

.back-office-nav-label {
  margin: 16px 0 8px;
  font-size: 12px;
  font-weight: 700;
  color: #94a3b8;
}

.back-office-nav {
  display: grid;
  gap: 4px;
}

.back-office-nav-link {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #cbd5e1;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;
}

.back-office-nav-link .iconify {
  font-size: 18px;
}

.back-office-nav-link:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.back-office-nav-link.active {
  background: var(--bo-role-accent);
  color: #fff;
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
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100vh;
  overflow: hidden;
}

.back-office-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.back-office-topbar-fixed {
  flex: 0 0 auto;
  padding: 16px 16px 12px;
}

.back-office-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 16px 16px;
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

.back-office-topbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-office-icon-btn {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 0;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  color: #64748b;
  font-size: 20px;
  cursor: pointer;
  transition: color 0.18s ease;
}

.back-office-icon-btn:hover {
  color: var(--bo-role-accent);
}

.back-office-app-signal {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  padding: 9px 12px;
  color: #334155;
  font-size: 13px;
  font-weight: 800;
}

.back-office-user {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  padding: 6px 12px 6px 6px;
}

.back-office-user-avatar {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 50%;
  background: var(--bo-role-accent);
  color: #fff;
  font-size: 13px;
  font-weight: 900;
}

.back-office-user-name {
  color: #334155;
  font-size: 13px;
  font-weight: 700;
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
