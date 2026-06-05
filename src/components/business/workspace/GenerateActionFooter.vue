<script setup lang="ts">
import { Icon } from "@iconify/vue";

withDefaults(
  defineProps<{
    actionLabel: string;
    cost: number;
    loading?: boolean;
    disabled?: boolean;
    costUnit?: string;
  }>(),
  {
    loading: false,
    disabled: false,
    costUnit: "张",
  },
);

const emit = defineEmits<{
  generate: [];
}>();
</script>

<template>
  <footer class="generate-panel-footer">
    <button
      type="button"
      class="generate-action-button"
      :class="{ 'is-loading': loading }"
      :disabled="disabled || loading"
      :aria-label="`${actionLabel}，消耗 ${cost} 积分/${costUnit}`"
      @click="emit('generate')"
    >
      <span v-if="loading" class="generate-action-loading">
        <Icon icon="mdi:loading" aria-hidden="true" />
        <span>生成中...</span>
      </span>
      <span v-else class="generate-action-content">
        <strong>{{ actionLabel }}</strong>
        <span class="generate-action-cost">消耗{{ cost }}积分/{{ costUnit }}</span>
        <Icon icon="mdi:sparkles" aria-hidden="true" />
      </span>
    </button>
  </footer>
</template>

<style scoped lang="scss">
.generate-panel-footer {
  position: sticky;
  bottom: 0;
  z-index: 2;
  flex-shrink: 0;
  padding-top: 12px;
  --generate-action-bg: #efc24c;
  --generate-action-text: #000000;
}

.generate-action-button {
  display: flex;
  width: 100%;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  border: 0;
  border-radius: 999px;
  background: var(--generate-action-bg);
  color: var(--generate-action-text);
  cursor: pointer;
  outline: none;
  box-shadow: 0 8px 22px
    color-mix(in srgb, var(--generate-action-bg) 30%, transparent);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
}

.generate-action-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 14px 32px
    color-mix(in srgb, var(--generate-action-bg) 42%, transparent);
}

.generate-action-button:focus-visible {
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--generate-action-bg) 28%, transparent),
    0 10px 28px color-mix(in srgb, var(--generate-action-bg) 34%, transparent);
}

.generate-action-button:disabled {
  opacity: 0.56;
  cursor: not-allowed;
}

.generate-action-content {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  line-height: 1.2;
}

.generate-action-content strong {
  font-weight: 900;
}

.generate-action-content :deep(svg) {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: rgba(0, 0, 0, 0.72);
}

.generate-action-cost {
  color: rgba(0, 0, 0, 0.76);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
}

.generate-action-loading {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.2;
}

.generate-action-loading :deep(svg) {
  width: 18px;
  height: 18px;
  animation: generate-action-spin 0.8s linear infinite;
}

@keyframes generate-action-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .generate-action-button {
    transition: none;
  }

  .generate-action-button:hover:not(:disabled) {
    transform: none;
  }

  .generate-action-loading :deep(svg) {
    animation: none;
  }
}
</style>
