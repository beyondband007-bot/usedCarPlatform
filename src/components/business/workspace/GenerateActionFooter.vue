<script setup lang="ts">
import { Icon } from "@iconify/vue";

import { useAppStore } from "@/stores/app";

const appStore = useAppStore();

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
  <footer
    class="generate-panel-footer"
    :class="{ 'is-theme-dark': appStore.isDarkMode }"
  >
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
        <span class="generate-action-main">
          <strong>{{ actionLabel }}</strong>
          <Icon icon="mdi:sparkles" aria-hidden="true" />
        </span>
        <span class="generate-action-cost">消耗{{ cost }}积分/{{ costUnit }}</span>
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
  padding-top: 20px;
  background: linear-gradient(
    180deg,
    rgba(245, 246, 248, 0) 0%,
    #f5f6f8 28%,
    #f5f6f8 100%
  );
}

.generate-panel-footer.is-theme-dark,
:global(html[data-theme="dark"]) .generate-panel-footer {
  background: linear-gradient(
    180deg,
    rgba(20, 23, 26, 0) 0%,
    #14171a 28%,
    #14171a 100%
  );
}

.generate-action-button {
  display: flex;
  width: 100%;
  min-height: 64px;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  border: 0;
  border-radius: 18px;
  background: #ffb800;
  color: #000000;
  cursor: pointer;
  outline: none;
  box-shadow: none;
  transition:
    background-color 0.2s ease,
    opacity 0.2s ease;
}

.generate-action-button:hover:not(:disabled) {
  background: #ffca28;
}

.generate-action-button:focus-visible {
  box-shadow: 0 0 0 3px rgba(255, 184, 0, 0.28);
}

.generate-action-button:disabled {
  opacity: 0.56;
  cursor: not-allowed;
}

.generate-action-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.generate-action-main {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 18px;
  line-height: 1.2;
}

.generate-action-main strong {
  font-weight: 700;
}

.generate-action-main :deep(svg) {
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
  font-weight: 700;
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

  .generate-action-loading :deep(svg) {
    animation: none;
  }
}
</style>
