<script setup lang="ts">
import { NPopover } from "naive-ui";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import {
  findPaintColorByHex,
  paintColorOptions,
} from "@/constants/paint-colors";
import { useAppStore } from "@/stores/app";
import { isH5ViewportRef } from "@/utils/browser-env";

const props = defineProps<{
  modelValue?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const appStore = useAppStore();

function normalizeHex(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("#")
    ? trimmed.toUpperCase()
    : `#${trimmed.toUpperCase()}`;
}

const colorValue = ref("");
const showPanel = ref(false);

const selectedOption = computed(() => findPaintColorByHex(colorValue.value));

const displayHex = computed(() => colorValue.value);

const fieldLabel = computed(() => {
  if (!displayHex.value) return "未选择色号";
  if (selectedOption.value) {
    return `${selectedOption.value.name} (${displayHex.value})`;
  }
  return `颜色 (${displayHex.value})`;
});

watch(
  () => props.modelValue,
  (value) => {
    const next = value ? normalizeHex(value) : "";
    if (next !== colorValue.value) {
      colorValue.value = next;
    }
  },
  { immediate: true },
);

watch(
  () => appStore.isDarkMode,
  () => {
    showPanel.value = false;
  },
);

watch(
  () => isH5ViewportRef.value,
  () => {
    showPanel.value = false;
  },
);

function handleColorUpdate(value: string) {
  colorValue.value = value ? normalizeHex(value) : "";
  emit("update:modelValue", colorValue.value);
}

function handleSelect(optionHex: string) {
  handleColorUpdate(optionHex);
  showPanel.value = false;
}

function handleClear() {
  handleColorUpdate("");
  showPanel.value = false;
}

function isSelected(optionHex: string) {
  return normalizeHex(optionHex) === displayHex.value;
}

function handleViewportChange() {
  showPanel.value = false;
}

onMounted(() => {
  window.addEventListener("resize", handleViewportChange, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener("resize", handleViewportChange);
});
</script>

<template>
  <section class="paint-color-card" aria-label="目标色号选择">
    <header class="paint-color-head">
      <div>
        <h3 class="paint-color-title">选择目标色号</h3>
        <p class="paint-color-subtitle">
          选择车身改色目标，生成时将按所选色号进行烤漆翻新
        </p>
      </div>
    </header>

    <div class="paint-color-field">
      <div class="paint-color-field-row">
        <p class="paint-color-field-label">{{ fieldLabel }}</p>
        <button
          v-if="displayHex"
          type="button"
          class="paint-color-clear"
          aria-label="清除已选色号"
          @click="handleClear"
        >
          清除
        </button>
      </div>

      <NPopover
        v-model:show="showPanel"
        trigger="click"
        placement="bottom-start"
        :show-arrow="false"
        :animated="false"
        raw
        class="paint-color-popover"
      >
        <template #trigger>
          <button
            type="button"
            class="paint-color-trigger"
            :class="{ 'is-selected': Boolean(displayHex) }"
            :aria-label="displayHex ? `已选色号 ${fieldLabel}` : '打开色号选择器'"
            :style="
              displayHex
                ? {
                    backgroundColor: displayHex,
                  }
                : undefined
            "
          >
            <span v-if="!displayHex" class="paint-color-trigger-empty" />
          </button>
        </template>

        <section class="paint-color-panel" aria-label="汽车色号色卡">
          <header class="paint-color-panel-head">
            <strong>常用汽车色号</strong>
          </header>

          <div class="paint-color-grid">
            <button
              v-for="option in paintColorOptions"
              :key="option.hex"
              type="button"
              class="paint-color-option"
              :class="{ 'is-selected': isSelected(option.hex) }"
              :aria-label="`${option.name} ${option.hex}`"
              :aria-pressed="isSelected(option.hex)"
              @click="handleSelect(option.hex)"
            >
              <span
                class="paint-color-option-swatch"
                :style="{ backgroundColor: option.hex }"
              />
              <span class="paint-color-option-name">{{ option.name }}</span>
              <span class="paint-color-option-hex">{{ option.hex }}</span>
            </button>
          </div>
        </section>
      </NPopover>
    </div>
  </section>
</template>

<style scoped lang="scss">
:global(html[data-theme="light"]) .paint-color-card,
:global(html[data-theme="light"]) .paint-color-panel {
  --paint-picker-surface: #ffffff;
  --paint-picker-border: #d6e0ed;
  --paint-picker-text: #172033;
  --paint-picker-text-soft: #64748b;
  --paint-picker-hover-bg: rgba(15, 23, 42, 0.04);
  --paint-picker-selected-border: #d4a017;
  --paint-picker-selected-bg: rgba(212, 160, 23, 0.08);
  --paint-picker-focus-ring: rgba(212, 160, 23, 0.16);
}

:global(html[data-theme="dark"]) .paint-color-card,
:global(html[data-theme="dark"]) .paint-color-panel {
  --paint-picker-surface: #151515;
  --paint-picker-border: rgba(255, 255, 255, 0.12);
  --paint-picker-text: #f8fafc;
  --paint-picker-text-soft: #94a3b8;
  --paint-picker-hover-bg: rgba(255, 255, 255, 0.05);
  --paint-picker-selected-border: rgba(255, 255, 255, 0.72);
  --paint-picker-selected-bg: rgba(255, 255, 255, 0.08);
  --paint-picker-focus-ring: rgba(255, 255, 255, 0.14);
}

:global(html[data-theme="dark"]) .paint-color-panel {
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.36);
}

.paint-color-card {
  padding: 16px 18px 18px;
  border: 1px solid var(--paint-picker-border, var(--workspace-line, var(--app-border)));
  border-radius: 12px;
  background: var(--paint-picker-surface, var(--workspace-panel, var(--app-surface)));
  box-shadow: var(--workspace-shadow, 0 18px 60px rgba(15, 23, 42, 0.08));
}

.paint-color-head {
  margin-bottom: 14px;
}

.paint-color-title {
  margin: 0;
  color: var(--paint-picker-text, var(--app-text));
  font-size: 17px;
  font-weight: 900;
  line-height: 1.3;
}

.paint-color-subtitle {
  margin: 6px 0 0;
  max-width: 420px;
  color: var(--paint-picker-text-soft, var(--app-text-soft));
  font-size: 12px;
  font-weight: 600;
  line-height: 1.55;
}

.paint-color-field {
  display: grid;
  gap: 6px;
}

.paint-color-field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.paint-color-field-label {
  margin: 0;
  color: var(--paint-picker-text, var(--app-text));
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}

.paint-color-clear {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--paint-picker-text-soft, var(--app-text-soft));
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.paint-color-clear:hover {
  color: var(--paint-picker-text, var(--app-text));
}

.paint-color-trigger {
  display: block;
  width: 100%;
  min-height: 34px;
  padding: 0;
  border: 1px solid var(--paint-picker-border, var(--workspace-line, var(--app-border)));
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  overflow: hidden;
}

.paint-color-trigger:hover,
.paint-color-trigger:focus-visible {
  border-color: var(--paint-picker-selected-border);
  box-shadow: 0 0 0 3px var(--paint-picker-focus-ring);
  outline: none;
}

.paint-color-trigger-empty {
  display: block;
  width: 100%;
  min-height: 34px;
  background:
    linear-gradient(45deg, #d9dee5 25%, transparent 25%),
    linear-gradient(-45deg, #d9dee5 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #d9dee5 75%),
    linear-gradient(-45deg, transparent 75%, #d9dee5 75%);
  background-color: #f3f5f8;
  background-size: 12px 12px;
  background-position:
    0 0,
    0 6px,
    6px -6px,
    -6px 0;
}

.paint-color-panel {
  width: min(420px, calc(100vw - 32px));
  max-height: min(420px, calc(100vh - 120px));
  padding: 14px;
  border: 1px solid var(--paint-picker-border, #d6e0ed);
  border-radius: 12px;
  background: var(--paint-picker-surface, #ffffff);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.14);
  overflow: hidden;
}

.paint-color-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--paint-picker-border, #d6e0ed);
}

.paint-color-panel-head strong {
  color: var(--paint-picker-text, var(--app-text));
  font-size: 14px;
  font-weight: 900;
}

.paint-color-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  max-height: 340px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 2px;
}

.paint-color-option {
  display: grid;
  gap: 4px;
  padding: 6px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  text-align: center;
}

.paint-color-option:hover {
  background: var(--paint-picker-hover-bg);
}

.paint-color-option.is-selected {
  border-color: var(--paint-picker-selected-border);
  background: var(--paint-picker-selected-bg);
}

.paint-color-option-swatch {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 8px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}

.paint-color-option-name {
  color: var(--paint-picker-text, var(--app-text));
  font-size: 11px;
  font-weight: 800;
  line-height: 1.25;
}

.paint-color-option-hex {
  color: var(--paint-picker-text-soft, var(--app-text-soft));
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
}

@media (max-width: 767px) {
  .paint-color-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
