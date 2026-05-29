<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref, watch } from 'vue'

import {
  paintColorOptions,
  type PaintColorOption,
} from '@/constants/paint-colors'

const props = defineProps<{
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectedId = ref(props.modelValue ?? '')

const selectedColor = computed(() =>
  paintColorOptions.find((item) => item.id === selectedId.value),
)

watch(
  () => props.modelValue,
  (value) => {
    if ((value ?? '') !== selectedId.value) {
      selectedId.value = value ?? ''
    }
  },
)

function isLightColor(hex: string) {
  const normalized = hex.replace('#', '')
  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.72
}

function selectColor(color: PaintColorOption) {
  if (selectedId.value === color.id) {
    selectedId.value = ''
    emit('update:modelValue', '')
    return
  }

  selectedId.value = color.id
  emit('update:modelValue', color.id)
}
</script>

<template>
  <section class="paint-color-card" aria-label="目标色号选择">
    <header class="paint-color-head">
      <div>
        <h3 class="paint-color-title">选择目标色号</h3>
        <p class="paint-color-subtitle">
          选择车身改色目标，生成时将按所选色号进行烤漆翻新演示
        </p>
      </div>
    </header>

    <div
      v-if="selectedColor"
      class="paint-color-preview"
      :class="{ 'is-light': isLightColor(selectedColor.hex) }"
      :style="{ backgroundColor: selectedColor.hex }"
      aria-live="polite"
    >
      <span class="paint-color-preview-name">{{ selectedColor.nameCn }}</span>
      <span class="paint-color-preview-hex">{{ selectedColor.hex }}</span>
    </div>
    <div v-else class="paint-color-preview is-empty">
      <span class="paint-color-preview-placeholder">未选择色号</span>
    </div>

    <div class="paint-color-grid" role="listbox" aria-label="色号列表">
      <button
        v-for="color in paintColorOptions"
        :key="color.id"
        type="button"
        role="option"
        class="paint-color-option"
        :class="{
          'is-selected': selectedId === color.id,
          'is-light': isLightColor(color.hex),
        }"
        :aria-selected="selectedId === color.id"
        :title="`${color.nameCn} ${color.nameEn} ${color.hex}`"
        @click="selectColor(color)"
      >
        <span
          class="paint-color-swatch"
          :style="{ backgroundColor: color.hex }"
          aria-hidden="true"
        >
          <span class="paint-color-label">
            <span class="paint-color-name">{{ color.nameCn }}</span>
            <span class="paint-color-hex">{{ color.hex }}</span>
          </span>
          <Icon
            v-if="selectedId === color.id"
            icon="mdi:check"
            class="paint-color-check"
          />
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped lang="scss">
.paint-color-card {
  padding: 16px 18px 18px;
  border: 1px solid color-mix(in srgb, var(--workspace-accent, #efc24c) 18%, var(--app-border));
  border-radius: 12px;
  background: var(--workspace-panel, var(--app-surface));
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 75%, transparent);
}

:global([data-theme='dark']) .paint-color-card {
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 6%, transparent);
}

.paint-color-head {
  margin-bottom: 12px;
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

.paint-color-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 40px;
  margin-bottom: 12px;
  padding: 10px 16px;
  border: 1px solid color-mix(in srgb, var(--app-text) 12%, transparent);
  border-radius: 8px;
  color: #fff;
  font-weight: 700;
  line-height: 1.2;
  transition: background-color 0.2s ease;
}

.paint-color-preview.is-light {
  color: #111827;
}

.paint-color-preview.is-empty {
  background: var(--workspace-panel-soft, var(--app-surface-soft));
  color: var(--workspace-muted, var(--app-text-soft));
  border-style: dashed;
}

.paint-color-preview-name {
  font-size: 14px;
  font-weight: 800;
}

.paint-color-preview-hex {
  font-size: 13px;
  font-weight: 700;
  opacity: 0.88;
  letter-spacing: 0.02em;
}

.paint-color-preview-placeholder {
  font-size: 13px;
  font-weight: 700;
}

.paint-color-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.paint-color-option {
  display: block;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.paint-color-option:hover {
  transform: translateY(-1px);
}

.paint-color-option.is-selected {
  border-color: var(--workspace-accent, #efc24c);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--workspace-accent, #efc24c) 16%, transparent);
}

.paint-color-swatch {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, var(--app-text) 10%, transparent);
  border-radius: 6px;
  overflow: hidden;
  color: #fff;
}

.paint-color-option.is-light .paint-color-swatch {
  color: #111827;
}

.paint-color-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.paint-color-check {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 16px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.45));
}

.paint-color-option.is-light .paint-color-check {
  filter: none;
}

.paint-color-name {
  font-size: 12px;
  font-weight: 800;
  line-height: 1.25;
}

.paint-color-hex {
  font-size: 11px;
  font-weight: 700;
  opacity: 0.88;
  letter-spacing: 0.02em;
}

@media (max-width: 520px) {
  .paint-color-grid {
    grid-template-columns: 1fr;
    gap: 6px;
  }
}
</style>
