<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { NModal } from 'naive-ui'
import { computed } from 'vue'

import { contactSupportInfo } from '@/constants/contact-support'
import { useAppStore } from '@/stores/app'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const appStore = useAppStore()

const modalThemeClass = computed(() =>
  appStore.isDarkMode ? 'support-modal--dark' : 'support-modal--light',
)

function close() {
  emit('update:show', false)
}
</script>

<template>
  <NModal
    :show="show"
    :mask-closable="true"
    transform-origin="center"
    @update:show="emit('update:show', $event)"
  >
    <div
      class="support-modal-card"
      :class="modalThemeClass"
      role="dialog"
      aria-labelledby="support-modal-title"
    >
      <button
        type="button"
        class="support-modal-close"
        aria-label="关闭"
        @click="close"
      >
        <Icon icon="mdi:close" class="support-modal-close-icon" />
      </button>

      <header class="support-modal-header">
        <div class="support-modal-header-icon" aria-hidden="true">
          <Icon icon="mdi:face-agent" />
        </div>
        <div class="support-modal-header-text">
          <h2 id="support-modal-title" class="support-modal-title">
            联系客服
          </h2>
          <p class="support-modal-subtitle">我们将竭诚为您服务</p>
        </div>
      </header>

      <div class="support-modal-rows">
        <div class="support-modal-row">
          <div class="support-modal-row-icon support-modal-row-icon--phone">
            <Icon icon="mdi:phone-outline" />
          </div>
          <div class="support-modal-row-body">
            <span class="support-modal-row-label">手机号</span>
            <span class="support-modal-row-hint">
              工作时间：{{ contactSupportInfo.phoneHours }}
            </span>
          </div>
          <a
            class="support-modal-row-value support-modal-row-value--phone"
            :href="`tel:${contactSupportInfo.phone.replace(/-/g, '')}`"
          >
            {{ contactSupportInfo.phone }}
          </a>
        </div>

        <div class="support-modal-row">
          <div class="support-modal-row-icon support-modal-row-icon--wechat">
            <Icon icon="mdi:qrcode" />
          </div>
          <div class="support-modal-row-body">
            <span class="support-modal-row-label">微信扫一扫</span>
            <span class="support-modal-row-hint">关注公众号，在线联系客服</span>
          </div>
          <div class="support-modal-qr" aria-label="微信客服二维码">
            <div class="support-modal-qr-pattern">
              <div class="support-modal-qr-inner" />
              <div class="support-modal-qr-center">
                <Icon icon="mdi:wechat" />
              </div>
            </div>
          </div>
        </div>

        <div class="support-modal-row">
          <div class="support-modal-row-icon support-modal-row-icon--email">
            <Icon icon="mdi:email-outline" />
          </div>
          <div class="support-modal-row-body">
            <span class="support-modal-row-label">联系邮箱</span>
          </div>
          <a
            class="support-modal-row-value support-modal-row-value--email"
            :href="`mailto:${contactSupportInfo.email}`"
          >
            {{ contactSupportInfo.email }}
          </a>
        </div>

        <div class="support-modal-row support-modal-row--last">
          <div class="support-modal-row-icon support-modal-row-icon--qq">
            <Icon icon="simple-icons:tencentqq" />
          </div>
          <div class="support-modal-row-body">
            <span class="support-modal-row-label">QQ 号</span>
          </div>
          <span class="support-modal-row-value support-modal-row-value--qq">
            {{ contactSupportInfo.qq }}
          </span>
        </div>
      </div>

      <p class="support-modal-footer">
        工作时间：{{ contactSupportInfo.workHours }}
      </p>
    </div>
  </NModal>
</template>

<style scoped lang="scss">
.support-modal-card {
  position: relative;
  width: min(100%, 520px);
  margin-inline: auto;
  padding: 28px 28px 24px;
  border: 1px solid var(--support-modal-border);
  border-radius: 20px;
  background: var(--support-modal-bg);
  box-shadow: var(--support-modal-shadow);
  color: var(--support-modal-text);
}

.support-modal-card.support-modal--light {
  --support-modal-bg: #ffffff;
  --support-modal-border: rgba(15, 23, 42, 0.1);
  --support-modal-text: #0f172a;
  --support-modal-text-soft: #64748b;
  --support-modal-close-hover: #eef2f7;
  --support-modal-shadow: 0 28px 64px rgba(15, 23, 42, 0.16);
  --support-modal-header-icon-bg: rgba(47, 107, 255, 0.1);
  --support-modal-header-icon-text: #2f6bff;
  --support-modal-divider: rgba(15, 23, 42, 0.08);
  --support-modal-phone-bg: rgba(47, 107, 255, 0.1);
  --support-modal-phone-text: #2f6bff;
  --support-modal-wechat-bg: rgba(7, 193, 96, 0.1);
  --support-modal-wechat-text: #07c160;
  --support-modal-email-bg: rgba(245, 158, 11, 0.12);
  --support-modal-email-text: #d97706;
  --support-modal-qq-bg: rgba(47, 107, 255, 0.1);
  --support-modal-qq-text: #2f6bff;
  --support-modal-qr-bg: #ffffff;
  --support-modal-qr-border: rgba(15, 23, 42, 0.08);
}

.support-modal-card.support-modal--dark {
  --support-modal-bg: #111318;
  --support-modal-border: rgba(255, 255, 255, 0.1);
  --support-modal-text: #f8fafc;
  --support-modal-text-soft: #94a3b8;
  --support-modal-close-hover: #1f2937;
  --support-modal-shadow: 0 28px 72px rgba(0, 0, 0, 0.52);
  --support-modal-header-icon-bg: rgba(47, 107, 255, 0.16);
  --support-modal-header-icon-text: #5b9bff;
  --support-modal-divider: rgba(255, 255, 255, 0.08);
  --support-modal-phone-bg: rgba(47, 107, 255, 0.14);
  --support-modal-phone-text: #5b9bff;
  --support-modal-wechat-bg: rgba(7, 193, 96, 0.14);
  --support-modal-wechat-text: #34d399;
  --support-modal-email-bg: rgba(245, 158, 11, 0.14);
  --support-modal-email-text: #fbbf24;
  --support-modal-qq-bg: rgba(47, 107, 255, 0.14);
  --support-modal-qq-text: #5b9bff;
  --support-modal-qr-bg: #ffffff;
  --support-modal-qr-border: rgba(255, 255, 255, 0.12);
}

.support-modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--support-modal-text-soft);
  cursor: pointer;
  transition: background 0.2s ease;
}

.support-modal-close-icon {
  font-size: 18px;
}

.support-modal-close:hover {
  background: var(--support-modal-close-hover);
}

.support-modal-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--support-modal-divider);
}

.support-modal-header-icon {
  display: grid;
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  place-items: center;
  border-radius: 999px;
  background: var(--support-modal-header-icon-bg);
  color: var(--support-modal-header-icon-text);
  font-size: 28px;
}

.support-modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: 900;
  line-height: 1.3;
}

.support-modal-subtitle {
  margin: 4px 0 0;
  color: var(--support-modal-text-soft);
  font-size: 13px;
  font-weight: 500;
}

.support-modal-rows {
  display: grid;
}

.support-modal-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 18px 0;
  border-bottom: 1px solid var(--support-modal-divider);
}

.support-modal-row--last {
  border-bottom: 0;
}

.support-modal-row-icon {
  display: grid;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 12px;
  font-size: 22px;
}

.support-modal-row-icon--phone {
  background: var(--support-modal-phone-bg);
  color: var(--support-modal-phone-text);
}

.support-modal-row-icon--wechat {
  background: var(--support-modal-wechat-bg);
  color: var(--support-modal-wechat-text);
}

.support-modal-row-icon--email {
  background: var(--support-modal-email-bg);
  color: var(--support-modal-email-text);
}

.support-modal-row-icon--qq {
  background: var(--support-modal-qq-bg);
  color: var(--support-modal-qq-text);
}

.support-modal-row-body {
  display: grid;
  gap: 4px;
  min-width: 0;
  text-align: left;
}

.support-modal-row-label {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
}

.support-modal-row-hint {
  color: var(--support-modal-text-soft);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
}

.support-modal-row-value {
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.support-modal-row-value--phone,
.support-modal-row-value--qq {
  color: var(--support-modal-phone-text);
}

.support-modal-row-value--email {
  color: var(--support-modal-email-text);
}

.support-modal-qr {
  display: flex;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: 1px solid var(--support-modal-qr-border);
  border-radius: 8px;
  background: var(--support-modal-qr-bg);
}

.support-modal-qr-pattern {
  position: relative;
  width: 100%;
  height: 100%;
  background: #fff;
}

.support-modal-qr-pattern::before,
.support-modal-qr-pattern::after {
  position: absolute;
  top: 3px;
  width: 14px;
  height: 14px;
  content: '';
  background: #000;
  box-shadow:
    0 0 0 2px #fff,
    0 0 0 3px #000;
}

.support-modal-qr-pattern::before {
  left: 3px;
}

.support-modal-qr-pattern::after {
  right: 3px;
}

.support-modal-qr-inner {
  position: absolute;
  bottom: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  background: #000;
  box-shadow:
    0 0 0 2px #fff,
    0 0 0 3px #000;
}

.support-modal-qr-center {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  width: 18px;
  height: 18px;
  place-items: center;
  color: #07c160;
  font-size: 12px;
  background: #fff;
  border-radius: 4px;
  transform: translate(-50%, -50%);
}

.support-modal-footer {
  margin: 8px 0 0;
  padding-top: 16px;
  border-top: 1px solid var(--support-modal-divider);
  color: var(--support-modal-text-soft);
  font-size: 12px;
  font-weight: 500;
  text-align: center;
}
</style>
