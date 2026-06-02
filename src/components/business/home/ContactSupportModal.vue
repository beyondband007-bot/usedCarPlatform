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
        <h2 id="support-modal-title" class="support-modal-title">
          联系客服
        </h2>
        <div class="support-modal-divider" aria-hidden="true" />
      </header>

      <div class="support-modal-info">
        <a
          class="support-modal-info-row"
          :href="`tel:${contactSupportInfo.phone.replace(/-/g, '')}`"
        >
          客服手机号：{{ contactSupportInfo.phone.replace(/-/g, '') }}
        </a>
        <a
          class="support-modal-info-row"
          :href="`mailto:${contactSupportInfo.email}`"
        >
          联系邮箱：{{ contactSupportInfo.email }}
        </a>
      </div>

      <div class="support-modal-channels">
        <div class="support-modal-channel">
          <div class="support-modal-qr" aria-label="微信客服二维码">
            <div class="support-modal-qr-pattern">
              <div class="support-modal-qr-inner" />
            </div>
          </div>
          <span class="support-modal-channel-label">扫码联系</span>
        </div>

        <div class="support-modal-channel">
          <Icon
            icon="simple-icons:tencentqq"
            class="support-modal-qq-icon"
            aria-hidden="true"
          />
          <span class="support-modal-channel-label">
            QQ: {{ contactSupportInfo.qq }}
          </span>
        </div>
      </div>
    </div>
  </NModal>
</template>

<style scoped lang="scss">
.support-modal-card {
  position: relative;
  width: min(100%, 340px);
  margin-inline: auto;
  padding: 24px 24px 28px;
  border: 1px solid var(--support-border);
  border-radius: 16px;
  background: var(--support-bg);
  box-shadow: var(--support-shadow);
  color: var(--support-text);
}

.support-modal-card.support-modal--dark {
  --support-bg: linear-gradient(180deg, #1a2b4b 0%, #111827 100%);
  --support-border: rgba(255, 255, 255, 0.1);
  --support-shadow: 0 24px 56px rgba(0, 0, 0, 0.55);
  --support-text: #ffffff;
  --support-text-muted: rgba(255, 255, 255, 0.55);
  --support-close-hover: rgba(255, 255, 255, 0.1);
  --support-divider: rgba(255, 255, 255, 0.12);
  --support-info-bg: #2c3e66;
  --support-info-bg-hover: #354a75;
  --support-qr-module: #ffffff;
  --support-qr-hole: #1a2b4b;
  --support-icon: #ffffff;
}

.support-modal-card.support-modal--light {
  --support-bg: linear-gradient(180deg, #ffffff 0%, #f5f7fb 100%);
  --support-border: rgba(15, 23, 42, 0.1);
  --support-shadow: 0 20px 48px rgba(15, 23, 42, 0.12);
  --support-text: #1e293b;
  --support-text-muted: #64748b;
  --support-close-hover: rgba(15, 23, 42, 0.06);
  --support-divider: #e2e8f0;
  --support-info-bg: #eef2f7;
  --support-info-bg-hover: #e2e8f0;
  --support-qr-module: #1e293b;
  --support-qr-hole: #ffffff;
  --support-icon: #2f6bff;
}

.support-modal-close {
  position: absolute;
  top: 14px;
  right: 14px;
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--support-text-muted);
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.support-modal-close-icon {
  font-size: 18px;
}

.support-modal-close:hover {
  background: var(--support-close-hover);
  color: var(--support-text);
}

.support-modal-header {
  padding-right: 28px;
}

.support-modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--support-text);
}

.support-modal-divider {
  height: 1px;
  margin-top: 14px;
  background: var(--support-divider);
}

.support-modal-info {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.support-modal-info-row {
  display: block;
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--support-info-bg);
  color: var(--support-text);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.45;
  text-decoration: none;
  transition: background 0.2s ease;
}

.support-modal-info-row:hover {
  background: var(--support-info-bg-hover);
}

.support-modal-channels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 22px;
}

.support-modal-channel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.support-modal-qr {
  display: flex;
  width: 88px;
  height: 88px;
  align-items: center;
  justify-content: center;
}

.support-modal-qr-pattern {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 4px;
  background:
    linear-gradient(90deg, var(--support-qr-module) 2px, transparent 2px) 0 0 /
      8px 8px,
    linear-gradient(var(--support-qr-module) 2px, transparent 2px) 0 0 / 8px 8px;
  opacity: 0.92;
}

.support-modal-qr-pattern::before,
.support-modal-qr-pattern::after {
  position: absolute;
  top: 4px;
  width: 18px;
  height: 18px;
  content: '';
  border: 3px solid var(--support-qr-module);
  border-radius: 2px;
  background: transparent;
  box-shadow: inset 0 0 0 4px var(--support-qr-hole);
}

.support-modal-qr-pattern::before {
  left: 4px;
}

.support-modal-qr-pattern::after {
  right: 4px;
}

.support-modal-qr-inner {
  position: absolute;
  bottom: 4px;
  left: 4px;
  width: 18px;
  height: 18px;
  border: 3px solid var(--support-qr-module);
  border-radius: 2px;
  background: transparent;
  box-shadow: inset 0 0 0 4px var(--support-qr-hole);
}

.support-modal-qq-icon {
  width: 56px;
  height: 56px;
  color: var(--support-icon);
}

.support-modal-channel-label {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.35;
  color: var(--support-text);
  text-align: center;
}
</style>
