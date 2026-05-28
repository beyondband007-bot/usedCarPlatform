<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { NButton, NModal } from 'naive-ui'
import { computed } from 'vue'

import { useAppStore } from '@/stores/app'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  login: []
  dismiss: []
}>()

const appStore = useAppStore()

const modalThemeClass = computed(() =>
  appStore.isDarkMode ? 'visitor-modal--dark' : 'visitor-modal--light',
)

function close() {
  emit('update:show', false)
  emit('dismiss')
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
      class="visitor-modal-card"
      :class="modalThemeClass"
      role="dialog"
      aria-labelledby="visitor-modal-title"
    >
      <button
        type="button"
        class="visitor-modal-close"
        aria-label="关闭"
        @click="close"
      >
        <Icon icon="mdi:close" class="text-lg" />
      </button>

      <h2 id="visitor-modal-title" class="visitor-modal-title">
        登录后使用视觉工作台
      </h2>
      <p class="visitor-modal-desc">
        场景影棚、批量上新与成片交付需企业账号登录后使用。也可稍后再说，继续浏览首页能力介绍。
      </p>

      <div class="visitor-modal-actions">
        <NButton type="primary" size="large" block class="!font-bold" @click="emit('login')">
          企业账号登录
        </NButton>
        <NButton size="large" block quaternary class="!font-semibold" @click="close">
          稍后再说
        </NButton>
      </div>
    </div>
  </NModal>
</template>

<style scoped lang="scss">
/* NModal 挂载到 body，在 [data-theme] 外，需自带日夜间变量 */
.visitor-modal-card {
  position: relative;
  width: min(100%, 420px);
  margin-inline: auto;
  padding: 24px;
  border: 1px solid var(--visitor-modal-border);
  border-radius: 16px;
  background: var(--visitor-modal-bg);
  box-shadow: var(--visitor-modal-shadow);
  color: var(--visitor-modal-text);
}

.visitor-modal-card.visitor-modal--light {
  --visitor-modal-bg: #ffffff;
  --visitor-modal-border: rgba(15, 23, 42, 0.12);
  --visitor-modal-text: #0f172a;
  --visitor-modal-text-soft: #475569;
  --visitor-modal-close-hover: #eef2f7;
  --visitor-modal-shadow: 0 24px 48px rgba(15, 23, 42, 0.16);
}

.visitor-modal-card.visitor-modal--dark {
  --visitor-modal-bg: #11131b;
  --visitor-modal-border: rgba(255, 255, 255, 0.1);
  --visitor-modal-text: #f8fafc;
  --visitor-modal-text-soft: #94a3b8;
  --visitor-modal-close-hover: #1f2937;
  --visitor-modal-shadow: 0 24px 56px rgba(0, 0, 0, 0.45);
}

.visitor-modal-close {
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
  color: var(--visitor-modal-text-soft);
  cursor: pointer;
  transition: background 0.2s ease;
}

.visitor-modal-close:hover {
  background: var(--visitor-modal-close-hover);
}

.visitor-modal-title {
  margin: 0;
  padding-right: 40px;
  font-size: 20px;
  font-weight: 900;
  line-height: 1.35;
}

.visitor-modal-desc {
  margin: 8px 0 0;
  color: var(--visitor-modal-text-soft);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.65;
}

.visitor-modal-actions {
  display: grid;
  gap: 12px;
  margin-top: 24px;
}
</style>
