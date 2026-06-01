<script setup lang="ts">
import { NButton, NCheckbox, NInput, useMessage } from "naive-ui";
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
const remember = ref(true);
const submitting = ref(false);

async function handleLogin() {
  submitting.value = true;

  try {
    await authStore.login({
      username: username.value.trim(),
      password: password.value,
      remember: remember.value,
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
      <p>进入 AI CAR STUDIO 汽车内容生产平台</p>

      <div class="login-fields">
        <label class="login-field">
          <span class="login-field-label">账号</span>
          <NInput
            v-model:value="username"
            class="login-input"
            size="large"
            placeholder="admin / enterprise"
          />
        </label>
        <label class="login-field">
          <span class="login-field-label">密码</span>
          <NInput
            v-model:value="password"
            class="login-input"
            size="large"
            type="password"
            show-password-on="click"
            placeholder="123456"
          />
        </label>
      </div>

      <div class="login-options">
        <NCheckbox v-model:checked="remember">记住登录状态</NCheckbox>
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
    </form>
  </motion.div>
</template>

<style scoped lang="scss">
.login-panel {
  width: 100%;
}

.login-panel--light {
  --panel-bg: #ffffff;
  --panel-border: rgba(15, 35, 60, 0.08);
  --panel-shadow: 0 24px 64px rgba(15, 35, 60, 0.12);
  --panel-text: #10233c;
  --panel-muted: #5c708c;
  --field-bg: #f4f7fb;
  --field-border: #d5e0ed;
  --field-border-focus: #2f7cff;
  --field-focus-ring: rgba(47, 124, 255, 0.16);
  --link-color: #2f6df6;
  --submit-shadow: 0 14px 32px rgba(47, 124, 255, 0.28);
}

.login-panel--dark {
  --panel-bg: rgba(10, 18, 32, 0.94);
  --panel-border: rgba(88, 140, 255, 0.28);
  --panel-shadow: 0 28px 80px rgba(0, 0, 0, 0.45);
  --panel-text: #f8fbff;
  --panel-muted: rgba(198, 214, 236, 0.72);
  --field-bg: rgba(255, 255, 255, 0.06);
  --field-border: rgba(255, 255, 255, 0.12);
  --field-border-focus: rgba(88, 155, 255, 0.85);
  --field-focus-ring: rgba(47, 124, 255, 0.22);
  --link-color: #7eb0ff;
  --submit-shadow: 0 16px 36px rgba(47, 124, 255, 0.35);
}

.login-card {
  width: 100%;
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  background: var(--panel-bg);
  padding: clamp(32px, 3.2vw, 40px);
  box-shadow: var(--panel-shadow);
}

.login-card h1 {
  margin: 0;
  color: var(--panel-text);
  font-size: clamp(26px, 2.2vw, 32px);
  line-height: 1.2;
  font-weight: 900;
}

.login-card > p {
  margin: 10px 0 0;
  color: var(--panel-muted);
  font-size: 15px;
  line-height: 1.55;
  font-weight: 600;
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

.login-field-label {
  color: var(--panel-text);
  font-size: 14px;
  font-weight: 800;
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
  --n-caret-color: #2f7cff !important;
}

.login-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
  color: var(--panel-muted);
  font-size: 13px;
  font-weight: 700;
}

.login-submit {
  margin-top: 24px;
  height: 48px !important;
  border-radius: 8px !important;
  font-size: 16px !important;
  font-weight: 800 !important;
  --n-color: #2f7cff !important;
  --n-color-hover: #4a91ff !important;
  --n-color-pressed: #2568db !important;
  --n-color-focus: #2f7cff !important;
  box-shadow: var(--submit-shadow);
}

.login-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 10px 12px;
  margin-top: 20px;
  color: var(--panel-muted);
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
}

@media (max-width: 520px) {
  .login-options {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
