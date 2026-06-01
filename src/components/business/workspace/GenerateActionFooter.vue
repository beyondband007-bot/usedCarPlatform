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
      <template v-else>
        <span class="generate-action-main">
          <strong>{{ actionLabel }}</strong>
          <Icon icon="mdi:sparkles" aria-hidden="true" />
        </span>
        <span class="generate-action-sub">消耗{{ cost }}积分/{{ costUnit }}</span>
      </template>
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
  border-top: 1px solid var(--app-border);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--app-surface-soft) 0%, transparent) 0%,
    var(--app-surface-soft) 24%,
    var(--app-surface-soft) 100%
  );
}

.generate-action-button {
  display: flex;
  width: 100%;
  min-height: 58px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px 24px;
  border: 0;
  border-radius: 999px;
  background: var(--workspace-accent, #efc24c);
  color: #111111;
  cursor: pointer;
  outline: none;
  box-shadow: 0 10px 28px
    color-mix(in srgb, var(--workspace-accent, #efc24c) 34%, transparent);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
}

.generate-action-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 14px 32px
    color-mix(in srgb, var(--workspace-accent, #efc24c) 42%, transparent);
}

.generate-action-button:focus-visible {
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--workspace-accent, #efc24c) 28%, transparent),
    0 10px 28px color-mix(in srgb, var(--workspace-accent, #efc24c) 34%, transparent);
}

.generate-action-button:disabled {
  opacity: 0.56;
  cursor: not-allowed;
}

.generate-action-main {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 18px;
  line-height: 1.2;
}

.generate-action-main strong {
  font-weight: 900;
}

.generate-action-main :deep(svg) {
  width: 18px;
  height: 18px;
  color: rgba(17, 17, 17, 0.72);
}

.generate-action-sub {
  color: rgba(17, 17, 17, 0.78);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
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
