<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { NModal } from 'naive-ui'
import { computed, ref } from 'vue'

import ContactSupportModal from '@/components/business/home/ContactSupportModal.vue'
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
const supportModalVisible = ref(false)

const modalThemeClass = computed(() =>
  appStore.isDarkMode ? 'visitor-modal--dark' : 'visitor-modal--light',
)

function close() {
  emit('update:show', false)
  emit('dismiss')
}

function openSupportModal() {
  emit('update:show', false)
  supportModalVisible.value = true
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
        <Icon icon="mdi:close" class="visitor-modal-close-icon" />
      </button>

      <div class="visitor-modal-icon" aria-hidden="true">
        <Icon icon="mdi:shield-account-outline" />
      </div>

      <h2 id="visitor-modal-title" class="visitor-modal-title">
        登录后使用完整功能
      </h2>
      <p class="visitor-modal-desc">
        场景影棚、批量上新与成片交付等功能需企业账号登录后使用。登录后即可进入视觉工作台，开启专业级汽车内容生成体验。
      </p>

      <div class="visitor-modal-actions">
        <button type="button" class="visitor-modal-login" @click="emit('login')">
          企业账号登录
        </button>
        <button type="button" class="visitor-modal-support" @click="openSupportModal">
          <Icon icon="mdi:headset" />
          联系客服
        </button>
        <button type="button" class="visitor-modal-dismiss" @click="close">
          稍后再说
        </button>
      </div>
    </div>
  </NModal>

  <ContactSupportModal v-model:show="supportModalVisible" />
</template>

<style scoped lang="scss">
.visitor-modal-card {
  --visitor-scale: 1;
  --visitor-pad: 34px;

  position: relative;
  width: min(100%, 640px);
  margin-inline: auto;
  padding: var(--visitor-pad);
  border: 1px solid var(--visitor-modal-border);
  border-radius: calc(16px * var(--visitor-scale));
  background: var(--visitor-modal-bg);
  box-shadow: var(--visitor-modal-shadow);
  color: var(--visitor-modal-text);
  text-align: center;
}

.visitor-modal-card.visitor-modal--light {
  --visitor-modal-bg: #ffffff;
  --visitor-modal-border: rgba(15, 23, 42, 0.12);
  --visitor-modal-text: #0f172a;
  --visitor-modal-text-soft: #5c708c;
  --visitor-modal-close-hover: #eef2f7;
  --visitor-modal-shadow: 0 28px 64px rgba(15, 23, 42, 0.16);
  --visitor-modal-icon-bg: rgba(212, 160, 23, 0.12);
  --visitor-modal-icon-text: #9a7209;
  --visitor-modal-support-bg: #f3f5f8;
  --visitor-modal-support-border: rgba(15, 23, 42, 0.1);
  --visitor-modal-support-text: #10233c;
}

.visitor-modal-card.visitor-modal--dark {
  --visitor-modal-bg: #111318;
  --visitor-modal-border: rgba(255, 255, 255, 0.1);
  --visitor-modal-text: #f8fafc;
  --visitor-modal-text-soft: #94a3b8;
  --visitor-modal-close-hover: #1f2937;
  --visitor-modal-shadow: 0 28px 72px rgba(0, 0, 0, 0.52);
  --visitor-modal-icon-bg: rgba(244, 200, 64, 0.14);
  --visitor-modal-icon-text: #f4c840;
  --visitor-modal-support-bg: rgba(255, 255, 255, 0.05);
  --visitor-modal-support-border: rgba(255, 255, 255, 0.1);
  --visitor-modal-support-text: #f3f3f3;
}

.visitor-modal-close {
  position: absolute;
  top: calc(16px * var(--visitor-scale));
  right: calc(16px * var(--visitor-scale));
  display: inline-flex;
  width: calc(32px * var(--visitor-scale));
  height: calc(32px * var(--visitor-scale));
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--visitor-modal-text-soft);
  cursor: pointer;
  transition: background 0.2s ease;
}

.visitor-modal-close-icon {
  font-size: calc(18px * var(--visitor-scale));
}

.visitor-modal-close:hover {
  background: var(--visitor-modal-close-hover);
}

.visitor-modal-icon {
  display: grid;
  width: calc(56px * var(--visitor-scale));
  height: calc(56px * var(--visitor-scale));
  margin: 0 auto calc(18px * var(--visitor-scale));
  place-items: center;
  border-radius: 999px;
  background: var(--visitor-modal-icon-bg);
  color: var(--visitor-modal-icon-text);
  font-size: calc(28px * var(--visitor-scale));
}

.visitor-modal-title {
  margin: 0;
  font-size: calc(20px * var(--visitor-scale));
  font-weight: 900;
  line-height: 1.35;
}

.visitor-modal-desc {
  margin: calc(12px * var(--visitor-scale)) 0 0;
  color: var(--visitor-modal-text-soft);
  font-size: calc(14px * var(--visitor-scale));
  font-weight: 500;
  line-height: 1.7;
}

.visitor-modal-actions {
  display: grid;
  gap: calc(12px * var(--visitor-scale));
  margin-top: calc(24px * var(--visitor-scale));
}

.visitor-modal-login,
.visitor-modal-support {
  display: flex;
  width: 100%;
  min-height: calc(44px * var(--visitor-scale));
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: calc(10px * var(--visitor-scale));
  font-family: inherit;
  font-size: calc(14px * var(--visitor-scale));
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
  transition:
    transform 0.16s ease,
    filter 0.16s ease,
    box-shadow 0.16s ease;
}

.visitor-modal-login {
  border: 0;
  color: #171100;
  background: linear-gradient(180deg, var(--color-brand-strong, #ffd94d), var(--color-brand-primary, #efc24c));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    0 12px 28px rgba(244, 200, 64, 0.22);
}

.visitor-modal-login:hover {
  filter: brightness(1.04);
  transform: translateY(-1px);
}

.visitor-modal-support {
  border: 1px solid var(--visitor-modal-support-border);
  background: var(--visitor-modal-support-bg);
  color: var(--visitor-modal-support-text);
}

.visitor-modal-support:hover {
  filter: brightness(1.05);
}

.visitor-modal-support :deep(svg) {
  font-size: calc(18px * var(--visitor-scale));
}

.visitor-modal-dismiss {
  margin-top: calc(4px * var(--visitor-scale));
  border: 0;
  background: transparent;
  color: var(--visitor-modal-text-soft);
  font-family: inherit;
  font-size: calc(14px * var(--visitor-scale));
  font-weight: 700;
  cursor: pointer;
  transition: color 0.2s ease;
}

.visitor-modal-dismiss:hover {
  color: var(--visitor-modal-text);
}
</style>
