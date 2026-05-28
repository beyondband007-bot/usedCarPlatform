<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { NButton, NModal } from 'naive-ui'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  login: []
  dismiss: []
}>()

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
      class="visitor-modal-card mx-auto w-[min(100%,420px)] rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-2xl"
      role="dialog"
      aria-labelledby="visitor-modal-title"
    >
      <button
        type="button"
        class="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-full text-[var(--app-text-soft)] transition hover:bg-[var(--app-surface-soft)]"
        aria-label="关闭"
        @click="close"
      >
        <Icon icon="mdi:close" class="text-lg" />
      </button>

      <span
        class="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-500"
      >
        <Icon icon="mdi:account-group-outline" />
        访客浮层
      </span>

      <h2 id="visitor-modal-title" class="mt-4 text-xl font-black text-[var(--app-text)]">
        登录后使用视觉工作台
      </h2>
      <p class="mt-2 text-sm leading-relaxed text-[var(--app-text-soft)]">
        场景影棚、批量上新与成片交付需企业账号登录后使用。也可稍后再说，继续浏览首页能力介绍。
      </p>

      <div class="mt-6 grid gap-3">
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

<style scoped>
.visitor-modal-card {
  position: relative;
}
</style>
