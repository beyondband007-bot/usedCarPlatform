<script setup lang="ts">
import { NButton, NInput, useMessage } from "naive-ui";
import { motion } from "motion-v";
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useAuthStore } from "@/stores/auth";

defineProps<{
  isDark: boolean;
}>();

const router = useRouter();
const route = useRoute();
const message = useMessage();
const authStore = useAuthStore();

const username = ref("enterprise");
const password = ref("123456");
const submitting = ref(false);

async function handleLogin() {
  submitting.value = true;

  try {
    await authStore.login({
      username: username.value.trim(),
      password: password.value,
      remember: true,
    });

    const redirect =
      typeof route.query.redirect === "string" &&
      route.query.redirect.startsWith("/")
        ? route.query.redirect
        : "/workspace";

    if (
      redirect === "/auth" ||
      redirect === "/enterprise" ||
      redirect === "/login"
    ) {
      await router.push("/workspace");
      return;
    }

    await router.push(redirect);
  } catch (error) {
    const text = error instanceof Error ? error.message : "登录失败";
    message.error(text);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <motion.div
    :initial="{ opacity: 0, x: 24 }"
    :animate="{ opacity: 1, x: 0 }"
    :transition="{ duration: 0.48, delay: 0.06 }"
    class="login-panel"
    :class="isDark ? 'login-panel--dark' : 'login-panel--light'"
  >
    <form class="login-card" @submit.prevent="handleLogin">
      <h1>企业账号登录</h1>
      <p>进入 AI CARXEN 汽车内容资产平台</p>

      <div class="login-fields">
        <label class="login-field">
          <span class="login-field-label">账号</span>
          <div class="login-phone-input">
            <span class="login-phone-prefix" aria-hidden="true">+86</span>
            <NInput
              v-model:value="username"
              class="login-input login-input--phone"
              size="large"
              placeholder="11位手机号"
            />
          </div>
        </label>

        <label class="login-field">
          <span class="login-field-row">
            <span class="login-field-label">密码</span>
            <button type="button" class="login-forgot">忘记密码？</button>
          </span>
          <NInput
            v-model:value="password"
            class="login-input"
            size="large"
            type="password"
            show-password-on="click"
            placeholder="请输入密码"
          />
        </label>
      </div>

      <NButton
        type="primary"
        size="large"
        block
        class="login-submit"
        attr-type="submit"
        :loading="submitting"
      >
        登录
      </NButton>

      <p class="login-footer">
        没有账号？
        <button type="button" class="login-footer-link">去开通企业账户</button>
      </p>
    </form>
  </motion.div>
</template>

<style scoped lang="scss">
.login-panel {
  width: 100%;
}

.login-panel--light {
  --panel-bg: rgba(255, 255, 255, 0.94);
  --panel-border: rgba(15, 35, 60, 0.08);
  --panel-shadow: 0 24px 64px rgba(15, 35, 60, 0.12);
  --panel-text: #10233c;
  --panel-muted: #5c708c;
  --field-bg: #f4f7fb;
  --field-border: #d5e0ed;
  --field-border-focus: #2f7cff;
  --field-focus-ring: rgba(47, 124, 255, 0.16);
  --accent: #d4a017;
  --accent-strong: #e5b85c;
  --accent-pressed: #b88912;
  --submit-text: #ffffff;
  --submit-shadow: 0 14px 32px rgba(47, 124, 255, 0.24);
}

.login-panel--dark {
  --panel-bg: rgba(14, 14, 14, 0.78);
  --panel-border: rgba(255, 255, 255, 0.1);
  --panel-shadow: 0 28px 80px rgba(0, 0, 0, 0.42);
  --panel-text: #ffffff;
  --panel-muted: rgba(255, 255, 255, 0.58);
  --field-bg: rgba(255, 255, 255, 0.06);
  --field-border: rgba(255, 255, 255, 0.12);
  --field-border-focus: rgba(239, 194, 76, 0.72);
  --field-focus-ring: rgba(239, 194, 76, 0.18);
  --accent: #efc24c;
  --accent-strong: #f4d36a;
  --accent-pressed: #d4ad3f;
  --submit-text: #1a1400;
  --submit-shadow: 0 14px 32px rgba(239, 194, 76, 0.28);
}

.login-card {
  width: 100%;
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  background: var(--panel-bg);
  padding: clamp(30px, 3vw, 38px);
  box-shadow: var(--panel-shadow);
  backdrop-filter: blur(18px);
}

.login-card h1 {
  margin: 0;
  color: var(--panel-text);
  font-size: clamp(24px, 2vw, 30px);
  line-height: 1.2;
  font-weight: 900;
}

.login-card > p {
  margin: 10px 0 0;
  color: var(--panel-muted);
  font-size: 14px;
  line-height: 1.55;
  font-weight: 500;
}

.login-fields {
  display: grid;
  gap: 20px;
  margin-top: 28px;
}

.login-field {
  display: grid;
  gap: 8px;
}

.login-field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.login-field-label {
  color: var(--panel-text);
  font-size: 14px;
  font-weight: 700;
}

.login-phone-input {
  display: flex;
  align-items: stretch;
  overflow: hidden;
  border: 1px solid var(--field-border);
  border-radius: 8px;
  background: var(--field-bg);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.login-phone-input:focus-within {
  border-color: var(--field-border-focus);
  box-shadow: 0 0 0 3px var(--field-focus-ring);
}

.login-phone-prefix {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  padding: 0 14px;
  border-right: 1px solid var(--field-border);
  color: var(--panel-muted);
  font-size: 15px;
  font-weight: 700;
}

.login-input {
  --n-height: 48px !important;
  --n-border-radius: 8px !important;
  --n-color: var(--field-bg) !important;
  --n-color-focus: var(--field-bg) !important;
  --n-border: 1px solid var(--field-border) !important;
  --n-border-hover: 1px solid var(--field-border-focus) !important;
  --n-border-focus: 1px solid var(--field-border-focus) !important;
  --n-box-shadow-focus: 0 0 0 3px var(--field-focus-ring) !important;
  --n-text-color: var(--panel-text) !important;
  --n-placeholder-color: var(--panel-muted) !important;
  --n-caret-color: var(--accent) !important;
}

.login-panel--light .login-submit {
  --n-color: #2f7cff !important;
  --n-color-hover: #4a91ff !important;
  --n-color-pressed: #2568db !important;
  --n-color-focus: #2f7cff !important;
}

.login-input--phone {
  flex: 1;
  --n-border: none !important;
  --n-border-hover: none !important;
  --n-border-focus: none !important;
  --n-box-shadow-focus: none !important;
}

.login-forgot,
.login-footer-link {
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--accent);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  transition: color 0.2s ease;
}

.login-forgot:hover,
.login-footer-link:hover {
  color: var(--accent-strong);
}

.login-submit {
  margin-top: 24px;
  height: 48px !important;
  border: none !important;
  border-radius: 8px !important;
  font-size: 16px !important;
  font-weight: 800 !important;
  --n-color: var(--accent) !important;
  --n-color-hover: var(--accent-strong) !important;
  --n-color-pressed: var(--accent-pressed) !important;
  --n-color-focus: var(--accent) !important;
  --n-text-color: var(--submit-text) !important;
  --n-text-color-hover: var(--submit-text) !important;
  --n-text-color-pressed: var(--submit-text) !important;
  --n-text-color-focus: var(--submit-text) !important;
  box-shadow: var(--submit-shadow);
}

.login-footer {
  margin: 20px 0 0;
  color: var(--panel-muted);
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
}

@media (max-width: 520px) {
  .login-field-row {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
