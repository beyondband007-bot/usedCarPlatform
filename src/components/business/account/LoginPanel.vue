<script setup lang="ts">
import { NButton, NInput } from 'naive-ui'
import { motion } from 'motion-v'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

function handleLogin() {
  authStore.login()

  const redirect =
    typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
      ? route.query.redirect
      : '/workspace'

  if (redirect === '/auth' || redirect === '/enterprise') {
    router.push('/workspace')
    return
  }

  router.push(redirect)
}
</script>

<template>
  <motion.div
    :initial="{ opacity: 0, x: 28 }"
    :animate="{ opacity: 1, x: 0 }"
    :transition="{ duration: 0.5, delay: 0.08 }"
    class="login-panel"
  >
    <div class="login-card">
      <h1>企业账号登录</h1>
      <p>进入脸谱AI汽车电商内容平台</p>

      <div class="login-fields">
        <label>
          手机号
          <NInput class="login-input" size="large" value="+86 · 11 位手机号" />
        </label>
        <label>
          密码
          <NInput class="login-input" size="large" type="password" value="password" />
        </label>
      </div>

      <NButton type="primary" size="large" block class="login-submit" @click="handleLogin">
        登录
      </NButton>

      <div class="login-links">
        <a href="#">忘记密码？</a>
        <span>|</span>
        <a href="#">申请开通企业租户</a>
      </div>
    </div>
  </motion.div>
</template>

<style scoped lang="scss">
.login-panel {
  --panel-bg: rgba(8, 15, 28, 0.68);
  --panel-border: rgba(85, 147, 255, 0.35);
  --panel-text: #f8fbff;
  --panel-muted: rgba(198, 214, 236, 0.68);
  --field-bg: rgba(255, 255, 255, 0.1);
  --field-border: rgba(255, 255, 255, 0.1);
  --link-color: #74a7ff;

  width: 100%;
}

:global([data-theme="light"]) .login-panel {
  --panel-bg: rgba(255, 255, 255, 0.78);
  --panel-border: rgba(255, 255, 255, 0.9);
  --panel-text: #10233c;
  --panel-muted: rgba(68, 86, 112, 0.74);
  --field-bg: rgba(239, 245, 253, 0.86);
  --field-border: rgba(183, 203, 228, 0.58);
  --link-color: #2f6df6;
}

:global([data-theme="dark"]) .login-panel {
  --panel-bg: rgba(8, 15, 28, 0.72);
  --panel-border: rgba(69, 131, 246, 0.42);
  --panel-text: #f8fbff;
  --panel-muted: rgba(198, 214, 236, 0.7);
  --field-bg: rgba(255, 255, 255, 0.1);
  --field-border: rgba(255, 255, 255, 0.11);
  --link-color: #75a8ff;
}

.login-card {
  width: 100%;
  border: 1px solid var(--panel-border);
  border-radius: 18px;
  background: var(--panel-bg);
  padding: clamp(28px, 3vw, 38px);
  box-shadow:
    0 22px 70px rgba(3, 10, 22, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(18px) saturate(130%);
}

.login-card h1 {
  margin: 0;
  color: var(--panel-text);
  font-size: clamp(25px, 2vw, 32px);
  line-height: 1.2;
  font-weight: 900;
  letter-spacing: 0;
}

.login-card p {
  margin: 12px 0 0;
  color: var(--panel-muted);
  font-size: 15px;
  line-height: 1.6;
  font-weight: 750;
}

.login-fields {
  display: grid;
  gap: 18px;
  margin-top: 30px;
}

.login-fields label {
  display: grid;
  gap: 9px;
  color: var(--panel-text);
  font-size: 14px;
  font-weight: 850;
}

.login-input {
  --n-height: 46px !important;
  --n-border-radius: 8px !important;
  --n-color: var(--field-bg) !important;
  --n-color-focus: var(--field-bg) !important;
  --n-border: 1px solid var(--field-border) !important;
  --n-border-hover: 1px solid rgba(47, 124, 255, 0.58) !important;
  --n-border-focus: 1px solid rgba(47, 124, 255, 0.8) !important;
  --n-box-shadow-focus: 0 0 0 3px rgba(47, 124, 255, 0.14) !important;
  --n-text-color: var(--panel-text) !important;
  --n-placeholder-color: var(--panel-muted) !important;
  --n-caret-color: #2f7cff !important;
}

.login-submit {
  margin-top: 26px;
  height: 48px !important;
  border-radius: 9px !important;
  font-weight: 900 !important;
  box-shadow: 0 14px 30px rgba(47, 124, 255, 0.28);
}

.login-links {
  display: flex;
  justify-content: center;
  gap: 13px;
  margin-top: 22px;
  color: var(--panel-muted);
  font-size: 14px;
  font-weight: 800;
}

.login-links a {
  color: var(--link-color);
  text-decoration: none;
}

.login-links a:hover {
  color: #2f7cff;
}
</style>
