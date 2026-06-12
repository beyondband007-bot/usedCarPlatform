<script setup lang="ts">
import { NPopover } from "naive-ui";
import { computed, ref, watch } from "vue";

import {
  findPaintColorByHex,
  paintColorOptions,
} from "@/constants/paint-colors";

const props = defineProps<{
  modelValue?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

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
.paint-color-card {
  padding: 16px 18px 18px;
  border: 1px solid var(--workspace-line, var(--app-border));
  border-radius: 12px;
  background: var(--workspace-panel, var(--app-surface));
  box-shadow: var(--workspace-shadow, 0 18px 60px rgba(15, 23, 42, 0.08));
}

:global([data-theme="dark"]) .paint-color-card {
  box-shadow: var(--workspace-shadow, 0 18px 60px rgba(0, 0, 0, 0.28));
}

.paint-color-head {
  margin-bottom: 14px;
}

.paint-color-title {
  margin: 0;
  color: var(--app-text);
  font-size: 17px;
  font-weight: 900;
  line-height: 1.3;
}

.paint-color-subtitle {
  margin: 6px 0 0;
  max-width: 420px;
  color: var(--app-text-soft);
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
  color: var(--app-text);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}

.paint-color-clear {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--app-text-soft);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.paint-color-clear:hover {
  color: var(--app-text);
}

.paint-color-trigger {
  display: block;
  width: 100%;
  min-height: 34px;
  padding: 0;
  border: 1px solid var(--workspace-line, var(--app-border));
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  overflow: hidden;
  transition:
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.paint-color-trigger:hover,
.paint-color-trigger:focus-visible {
  border-color: color-mix(
    in srgb,
    var(--workspace-accent, #efc24c) 55%,
    var(--workspace-line, var(--app-border))
  );
  box-shadow: 0 0 0 3px
    color-mix(in srgb, var(--workspace-accent, #efc24c) 18%, transparent);
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
  border: 1px solid var(--workspace-line, #e1eaf5);
  border-radius: 12px;
  background: var(--workspace-panel, #ffffff);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.14);
  overflow: hidden;
}

:global([data-theme="dark"]) .paint-color-panel {
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.36);
}

.paint-color-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--workspace-line, #e1eaf5);
}

.paint-color-panel-head strong {
  color: var(--app-text);
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
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;
}

.paint-color-option:hover {
  background: color-mix(
    in srgb,
    var(--workspace-accent, #efc24c) 8%,
    transparent
  );
  transform: translateY(-1px);
}

.paint-color-option.is-selected {
  border-color: var(--workspace-accent, #efc24c);
  background: color-mix(
    in srgb,
    var(--workspace-accent, #efc24c) 12%,
    transparent
  );
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
  color: var(--app-text);
  font-size: 11px;
  font-weight: 800;
  line-height: 1.25;
}

.paint-color-option-hex {
  color: var(--app-text-soft);
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
