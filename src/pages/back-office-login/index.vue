<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@/types/auth'

type BackOfficeLoginRole = Extract<UserRole, 'developer' | 'admin' | 'agent'>

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isSubmitting = ref(false)
const errorText = ref('')
const form = reactive({
  role: 'developer' as BackOfficeLoginRole,
  username: 'developer',
  password: '123456',
})

const accounts: Array<{
  role: BackOfficeLoginRole
  title: string
  description: string
  badge: string
  username: string
}> = [
  {
    role: 'developer',
    title: '开发者账号',
    description: '全平台配置、充值档位、积分调账、应用接入',
    badge: 'Developer',
    username: 'developer',
  },
  {
    role: 'admin',
    title: '公司管理员账号',
    description: '销售运营、代理商管理、工单与结算审批',
    badge: 'Admin',
    username: 'admin',
  },
  {
    role: 'agent',
    title: '代理商账号',
    description: '名下客户、线索报备、客户消费、返佣结算',
    badge: 'Agent',
    username: 'agent',
  },
]

const submitText = computed(() => {
  if (form.role === 'developer') return '登录开发者后台'
  if (form.role === 'admin') return '登录公司管理员后台'
  return '登录代理商后台'
})

function selectAccount(role: BackOfficeLoginRole) {
  const account = accounts.find((item) => item.role === role)
  if (!account) return
  form.role = role
  form.username = account.username
  form.password = '123456'
  errorText.value = ''
}

async function handleSubmit() {
  isSubmitting.value = true
  errorText.value = ''

  try {
    const user = await authStore.login({
      username: form.username,
      password: form.password,
      remember: true,
    })

    if (user.role !== 'developer' && user.role !== 'admin' && user.role !== 'agent') {
      await authStore.logout(false)
      errorText.value = '该账号不是后台角色，无法进入积分后台控制台。'
      return
    }

    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/back-office')
      ? route.query.redirect
      : '/back-office'
    router.push(redirect)
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '登录失败，请检查账号和密码。'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="back-office-login">
    <section class="login-brand-panel">
      <div>
        <div class="login-brand-row">
          <span class="login-brand-logo">积</span>
          <span>
            <strong>积分后台</strong>
            <small>Reusable Credits Console</small>
          </span>
        </div>
        <h1>独立积分后台控制台</h1>
        <p>
          用后台角色进入 Reusable Credits Platform Console。usedCarPlatform 是当前接入应用之一，未来应用将共用同一积分账户与余额。
        </p>
      </div>
      <div class="login-brand-foot">
        <Icon icon="mdi:shield-check-outline" />
        <span>Developer / Admin / Agent 权限由后台会话决定</span>
      </div>
    </section>

    <section class="login-panel" aria-label="积分后台登录">
      <div class="login-card">
        <h2>登录</h2>
        <p>选择演示账号后登录。真实环境由后端返回角色、菜单和数据边界。</p>

        <div class="account-list">
          <button
            v-for="account in accounts"
            :key="account.role"
            type="button"
            class="account-option"
            :class="{ active: form.role === account.role }"
            @click="selectAccount(account.role)"
          >
            <span>
              <strong>{{ account.title }}</strong>
              <small>{{ account.description }}</small>
            </span>
            <em>{{ account.badge }}</em>
          </button>
        </div>

        <form class="login-form" @submit.prevent="handleSubmit">
          <label>
            <span>账号</span>
            <input v-model="form.username" autocomplete="username" />
          </label>
          <label>
            <span>密码</span>
            <input v-model="form.password" type="password" autocomplete="current-password" />
          </label>
          <p v-if="errorText" class="login-error">{{ errorText }}</p>
          <button type="submit" class="login-submit" :disabled="isSubmitting">
            <Icon icon="mdi:login" />
            {{ isSubmitting ? '登录中...' : submitText }}
          </button>
        </form>

        <p class="login-hint">
          普通产品用户请继续使用 usedCarPlatform 产品登录；未成为 Agent 的 User 不能进入本控制台。
        </p>
      </div>
    </section>
  </main>
</template>

<style scoped lang="scss">
.back-office-login {
  display: grid;
  min-height: 100vh;
  grid-template-columns: minmax(380px, 42%) minmax(0, 58%);
  background: #fff;
  color: #0f172a;
}

.login-brand-panel {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  justify-content: space-between;
  background: #0f172a;
  color: #fff;
  padding: 56px;
}

.login-brand-row,
.login-brand-foot {
  display: flex;
  align-items: center;
  gap: 14px;
}

.login-brand-logo {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 8px;
  background: #2563eb;
  font-weight: 900;
}

.login-brand-row strong {
  display: block;
  font-size: 16px;
}

.login-brand-row small,
.login-brand-panel p,
.login-brand-foot {
  color: #cbd5e1;
}

.login-brand-panel h1 {
  margin: 70px 0 16px;
  max-width: 560px;
  font-size: 38px;
  line-height: 1.2;
}

.login-brand-panel p {
  max-width: 560px;
  margin: 0;
  line-height: 1.8;
}

.login-brand-foot {
  font-size: 13px;
  font-weight: 700;
}

.login-panel {
  display: grid;
  place-items: center;
  padding: 44px;
}

.login-card {
  width: min(560px, 100%);
}

.login-card h2 {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 900;
}

.login-card > p {
  margin: 0 0 24px;
  color: #64748b;
  line-height: 1.65;
}

.account-list {
  display: grid;
  gap: 12px;
  margin-bottom: 18px;
}

.account-option {
  display: grid;
  width: 100%;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  padding: 16px;
  text-align: left;
  font: inherit;
}

.account-option:hover,
.account-option.active {
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.account-option strong,
.account-option small {
  display: block;
}

.account-option strong {
  margin-bottom: 5px;
  font-size: 16px;
}

.account-option small {
  color: #64748b;
  line-height: 1.45;
}

.account-option em {
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  padding: 4px 8px;
  font-size: 12px;
  font-style: normal;
  font-weight: 900;
}

.login-form {
  display: grid;
  gap: 12px;
}

.login-form label {
  display: grid;
  gap: 7px;
  color: #334155;
  font-size: 13px;
  font-weight: 800;
}

.login-form input {
  min-height: 44px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 12px 13px;
  font: inherit;
}

.login-error {
  margin: 0;
  border: 1px solid #fecdd3;
  border-radius: 8px;
  background: #fff1f2;
  color: #be123c;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 700;
}

.login-submit {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 8px;
  background: #1d4ed8;
  color: #fff;
  padding: 10px 13px;
  font: inherit;
  font-weight: 900;
  cursor: pointer;
}

.login-submit:disabled {
  cursor: wait;
  opacity: 0.72;
}

.login-hint {
  margin-top: 12px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 900px) {
  .back-office-login {
    grid-template-columns: minmax(0, 1fr);
  }

  .login-brand-panel {
    min-height: auto;
    padding: 34px;
  }

  .login-brand-panel h1 {
    margin-top: 38px;
    font-size: 30px;
  }

  .login-panel {
    padding: 18px;
  }
}
</style>
