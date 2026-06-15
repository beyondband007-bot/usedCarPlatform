<script setup lang="ts">
import { NButton, NInput, NModal, useMessage } from "naive-ui";
import { motion } from "motion-v";
import { computed, onBeforeUnmount, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  resetPassword,
  sendLoginCode,
  sendResetPasswordCode,
} from "@/api/auth";
import { useAuthStore } from "@/stores/auth";

defineProps<{
  isDark: boolean;
}>();

const router = useRouter();
const route = useRoute();
const message = useMessage();
const authStore = useAuthStore();

const username = ref("");
const password = ref("");
const code = ref("");
const loginMode = ref<"code" | "password">("password");
const submitting = ref(false);
const sendingLoginCode = ref(false);
const loginCountdown = ref(0);

const resetVisible = ref(false);
const resetForm = reactive({
  phone: "",
  code: "",
  password: "",
  confirmPassword: "",
});
const resetSubmitting = ref(false);
const sendingResetCode = ref(false);
const resetCountdown = ref(0);

let loginTimer: number | undefined;
let resetTimer: number | undefined;

const loginCodeButtonText = computed(() => {
  if (loginCountdown.value > 0) return `${loginCountdown.value}s 后重发`;
  return "获取验证码";
});

const accountLabel = computed(() => (loginMode.value === "password" ? "账号/手机号" : "手机号"));
const accountPlaceholder = computed(() =>
  loginMode.value === "password" ? "请输入手机号或用户名" : "请输入手机号",
);

const resetCodeButtonText = computed(() => {
  if (resetCountdown.value > 0) return `${resetCountdown.value}s 后重发`;
  return "获取验证码";
});

function normalizeAccountInput(value: string) {
  return value.trim().replace(/\s/g, "");
}

function normalizePhoneInput(value: string) {
  return value.trim().replace(/[\s-]/g, "");
}

function startCountdown(target: "login" | "reset") {
  const counter = target === "login" ? loginCountdown : resetCountdown;
  const currentTimer = target === "login" ? loginTimer : resetTimer;
  if (currentTimer) window.clearInterval(currentTimer);

  counter.value = 60;
  const timer = window.setInterval(() => {
    counter.value -= 1;
    if (counter.value <= 0) {
      window.clearInterval(timer);
    }
  }, 1000);

  if (target === "login") loginTimer = timer;
  if (target === "reset") resetTimer = timer;
}

async function handleSendLoginCode() {
  const phone = normalizePhoneInput(username.value);
  if (!phone) {
    message.warning("请输入手机号");
    return;
  }

  if (loginCountdown.value > 0 || sendingLoginCode.value) return;

  sendingLoginCode.value = true;
  try {
    const result = await sendLoginCode({
      phone,
    });
    message.success(result.debugCode ? `验证码已发送：${result.debugCode}` : result.message);
    startCountdown("login");
  } catch (error) {
    message.error(error instanceof Error ? error.message : "验证码发送失败");
  } finally {
    sendingLoginCode.value = false;
  }
}

async function handleSendResetCode() {
  const phone = normalizePhoneInput(resetForm.phone);
  if (!phone) {
    message.warning("请输入手机号");
    return;
  }

  if (resetCountdown.value > 0 || sendingResetCode.value) return;

  sendingResetCode.value = true;
  try {
    const result = await sendResetPasswordCode({
      phone,
    });
    message.success(result.debugCode ? `验证码已发送：${result.debugCode}` : result.message);
    startCountdown("reset");
  } catch (error) {
    message.error(error instanceof Error ? error.message : "验证码发送失败");
  } finally {
    sendingResetCode.value = false;
  }
}

async function handleLogin() {
  const account = normalizeAccountInput(username.value);
  const phone = normalizePhoneInput(username.value);
  if (loginMode.value === "password" && !account) {
    message.warning("请输入手机号或用户名");
    return;
  }

  if (loginMode.value === "code" && !phone) {
    message.warning("请输入手机号");
    return;
  }

  if (loginMode.value === "code" && !code.value.trim()) {
    message.warning("请输入验证码");
    return;
  }

  if (loginMode.value === "password" && !password.value) {
    message.warning("请输入密码");
    return;
  }

  submitting.value = true;

  try {
    if (loginMode.value === "code") {
      await authStore.loginWithCode({
        phone,
        code: code.value.trim(),
        remember: true,
      });
    } else {
      await authStore.login({
        username: account,
        password: password.value,
        remember: true,
      });
    }

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
    message.error(error instanceof Error ? error.message : "登录失败");
  } finally {
    submitting.value = false;
  }
}

async function handleResetPassword() {
  if (
    !resetForm.phone.trim() ||
    !resetForm.code.trim() ||
    !resetForm.password ||
    !resetForm.confirmPassword
  ) {
    message.warning("请完整填写重置密码信息");
    return;
  }

  resetSubmitting.value = true;
  try {
    await resetPassword({
      phone: normalizePhoneInput(resetForm.phone),
      code: resetForm.code.trim(),
      password: resetForm.password,
      confirmPassword: resetForm.confirmPassword,
    });
    message.success("密码已重置，请使用新密码登录");
    resetVisible.value = false;
    password.value = "";
    code.value = "";
  } catch (error) {
    message.error(error instanceof Error ? error.message : "密码重置失败");
  } finally {
    resetSubmitting.value = false;
  }
}

function openResetModal() {
  resetForm.phone = normalizePhoneInput(username.value);
  resetForm.code = "";
  resetForm.password = "";
  resetForm.confirmPassword = "";
  resetVisible.value = true;
}

onBeforeUnmount(() => {
  if (loginTimer) window.clearInterval(loginTimer);
  if (resetTimer) window.clearInterval(resetTimer);
});
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
        <div class="login-mode-tabs" role="tablist" aria-label="登录方式">
          <button
            type="button"
            :class="{ 'is-active': loginMode === 'password' }"
            role="tab"
            :aria-selected="loginMode === 'password'"
            @click="loginMode = 'password'"
          >
            密码登录
          </button>
          <button
            type="button"
            :class="{ 'is-active': loginMode === 'code' }"
            role="tab"
            :aria-selected="loginMode === 'code'"
            @click="loginMode = 'code'"
          >
            验证码登录
          </button>
        </div>

        <label class="login-field">
          <span class="login-field-label">{{ accountLabel }}</span>
          <div class="login-phone-input">
            <NInput
              v-model:value="username"
              class="login-input login-input--phone"
              size="large"
              :placeholder="accountPlaceholder"
            />
          </div>
        </label>

        <div v-if="loginMode === 'password'" class="login-field login-field--password">
          <span class="login-field-label">密码</span>
          <div class="login-password-input">
            <NInput
              v-model:value="password"
              class="login-input"
              size="large"
              type="password"
              show-password-on="mousedown"
              placeholder="请输入密码"
            />
          </div>
          <div class="login-forgot-row">
            <button
              type="button"
              class="login-forgot"
              @click.stop.prevent="openResetModal"
            >
              忘记密码?
            </button>
          </div>
        </div>

        <label v-if="loginMode === 'code'" class="login-field">
          <span class="login-field-label">短信验证码</span>
          <div class="login-code-row">
            <NInput
              v-model:value="code"
              class="login-input"
              size="large"
              placeholder="请输入 6 位验证码"
            />
            <NButton
              class="login-code-button"
              :disabled="loginCountdown > 0"
              :loading="sendingLoginCode"
              @click="handleSendLoginCode"
            >
              {{ loginCodeButtonText }}
            </NButton>
          </div>
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
    </form>

    <NModal
      v-model:show="resetVisible"
      preset="card"
      :class="[
        'login-reset-modal',
        isDark ? 'login-reset-modal--dark' : 'login-reset-modal--light',
      ]"
      title="忘记密码"
      :bordered="false"
      :mask-closable="!resetSubmitting"
    >
      <div class="reset-fields">
        <div class="login-field">
          <span class="login-field-label">手机号</span>
          <div class="login-phone-input">
            <NInput
              v-model:value="resetForm.phone"
              class="login-input login-input--phone"
              size="large"
              placeholder="请输入手机号"
            />
          </div>
        </div>

        <div class="login-field">
          <span class="login-field-label">短信验证码</span>
          <div class="login-code-row">
            <NInput
              v-model:value="resetForm.code"
              class="login-input"
              size="large"
              placeholder="请输入 6 位验证码"
            />
            <NButton
              class="login-code-button"
              :disabled="resetCountdown > 0"
              :loading="sendingResetCode"
              @click="handleSendResetCode"
            >
              {{ resetCodeButtonText }}
            </NButton>
          </div>
        </div>

        <div class="login-field">
          <span class="login-field-label">新密码</span>
          <div class="login-password-input">
            <NInput
              v-model:value="resetForm.password"
              class="login-input"
              size="large"
              type="password"
              show-password-on="mousedown"
              placeholder="请输入新密码"
            />
          </div>
        </div>

        <div class="login-field">
          <span class="login-field-label">确认密码</span>
          <div class="login-password-input">
            <NInput
              v-model:value="resetForm.confirmPassword"
              class="login-input"
              size="large"
              type="password"
              show-password-on="mousedown"
              placeholder="请再次输入新密码"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <NButton
          type="primary"
          size="large"
          block
          class="login-submit reset-submit"
          :loading="resetSubmitting"
          @click="handleResetPassword"
        >
          重置密码
        </NButton>
      </template>
    </NModal>
  </motion.div>
</template>

<style scoped lang="scss">
.login-panel {
  width: 100%;
  height: auto;
  overflow: visible;
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
  height: auto;
  overflow: visible;
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
  white-space: nowrap;
}

.login-card > p {
  margin: 10px 0 0;
  color: var(--panel-muted);
  font-size: 14px;
  line-height: 1.55;
  font-weight: 500;
  white-space: nowrap;
}

.login-fields,
.reset-fields {
  display: grid;
  gap: 18px;
  margin-top: 28px;
}

.reset-fields {
  margin-top: 0;
}

.login-field {
  display: grid;
  gap: 8px;
}

.login-mode-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  padding: 4px;
  border: 1px solid var(--field-border);
  border-radius: 8px;
  background: var(--field-bg);
}

.login-mode-tabs button {
  min-width: 0;
  height: 38px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--panel-muted);
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.login-mode-tabs button.is-active {
  background: var(--accent);
  color: var(--submit-text);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.login-panel--light .login-mode-tabs button.is-active {
  background: #2f7cff;
  color: #ffffff;
}

.login-field--password {
  gap: 8px;
}

.login-forgot-row {
  display: flex;
  justify-content: flex-end;
}

.login-password-input {
  position: relative;
  z-index: 1;
  isolation: isolate;
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
  max-height: 48px;
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
  --n-suffix-text-color: var(--panel-muted) !important;
  max-height: 48px;
}

.login-input :deep(.n-input),
.login-input :deep(.n-input-wrapper) {
  max-height: 48px;
  min-height: 48px;
}

.login-input :deep(.n-input-wrapper) {
  background: var(--field-bg) !important;
}

.login-input :deep(.n-input__suffix) {
  margin: 0;
  background: transparent !important;
}

.login-input :deep(.n-input__eye) {
  position: relative;
  z-index: 2;
  display: inline-flex;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 0 !important;
  border-radius: 6px;
  background: transparent !important;
  box-shadow: none !important;
  color: var(--panel-muted);
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease;
}

.login-input :deep(.n-input__eye:hover) {
  background: color-mix(in srgb, var(--panel-text) 8%, transparent) !important;
  color: var(--panel-text);
}

.login-input :deep(.n-input__eye .n-base-icon) {
  font-size: 18px;
}

.login-input :deep(.n-input__input-el) {
  font-family: inherit;
}

.login-input--phone {
  flex: 1;
  --n-border: none !important;
  --n-border-hover: none !important;
  --n-border-focus: none !important;
  --n-box-shadow-focus: none !important;
}

.login-code-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 112px;
  gap: 10px;
}

.login-code-button {
  max-height: 48px;
  height: 48px !important;
  border-radius: 8px !important;
  font-size: 14px !important;
  font-weight: 700 !important;
}

.login-forgot {
  position: relative;
  z-index: 0;
  flex-shrink: 0;
  margin: 0;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--accent);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.login-forgot:hover {
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

.reset-submit {
  margin-top: 0;
}

.login-panel--light .login-submit {
  --n-color: #2f7cff !important;
  --n-color-hover: #4a91ff !important;
  --n-color-pressed: #2568db !important;
  --n-color-focus: #2f7cff !important;
}

@media (max-width: 520px) {
  .login-code-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .login-code-button {
    width: 100%;
  }
}
</style>

<style lang="scss">
.login-reset-modal.n-modal {
  width: min(92vw, 420px) !important;
  max-width: 420px;
}

.login-reset-modal.n-modal .n-card {
  width: 100%;
  border-radius: 12px;
}

.login-reset-modal.n-modal .n-card-header {
  padding-bottom: 8px;
}

.login-reset-modal.n-modal .n-card__content,
.login-reset-modal.n-modal .n-card__footer {
  padding-top: 0;
}

.login-reset-modal--light {
  --panel-bg: rgba(255, 255, 255, 0.94);
  --panel-border: rgba(15, 35, 60, 0.08);
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

.login-reset-modal--dark {
  --panel-bg: rgba(14, 14, 14, 0.78);
  --panel-border: rgba(255, 255, 255, 0.1);
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
</style>
