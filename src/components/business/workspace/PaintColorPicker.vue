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

const selectedId = ref(props.modelValue ?? paintColorOptions[0]?.id ?? '')

const selectedColor = computed(() =>
  paintColorOptions.find((item) => item.id === selectedId.value),
)

watch(
  () => props.modelValue,
  (value) => {
    if (value && value !== selectedId.value) {
      selectedId.value = value
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
      <div v-if="selectedColor" class="paint-color-current">
        <span
          class="paint-color-current-swatch"
          :style="{ backgroundColor: selectedColor.hex }"
          aria-hidden="true"
        />
        <div class="paint-color-current-copy">
          <strong>{{ selectedColor.nameCn }}</strong>
          <span>{{ selectedColor.nameEn }} · {{ selectedColor.hex }}</span>
        </div>
      </div>
    </header>

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
          <Icon
            v-if="selectedId === color.id"
            icon="mdi:check"
            class="paint-color-check"
          />
        </span>
        <span class="paint-color-name">{{ color.nameCn }}</span>
        <span class="paint-color-hex">{{ color.hex }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped lang="scss">
.paint-color-card {
  padding: 16px 18px 18px;
  border: 1px solid color-mix(in srgb, #2f7cff 18%, var(--app-border));
  border-radius: 12px;
  background: var(--app-surface);
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 75%, transparent);
}

:global([data-theme='dark']) .paint-color-card {
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 6%, transparent);
}

.paint-color-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 16px;
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

.paint-color-current {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-surface-soft);
}

.paint-color-current-swatch {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--app-text) 12%, transparent);
  border-radius: 8px;
}

.paint-color-current-copy {
  display: grid;
  gap: 2px;
}

.paint-color-current-copy strong {
  color: var(--app-text);
  font-size: 13px;
  font-weight: 900;
}

.paint-color-current-copy span {
  color: var(--app-text-soft);
  font-size: 11px;
  font-weight: 700;
}

.paint-color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: 10px;
}

.paint-color-option {
  display: grid;
  gap: 6px;
  justify-items: center;
  padding: 10px 8px 8px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-surface-soft);
  cursor: pointer;
  font-family: inherit;
  text-align: center;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.paint-color-option:hover {
  border-color: color-mix(in srgb, #2f7cff 42%, var(--app-border));
  transform: translateY(-1px);
}

.paint-color-option.is-selected {
  border-color: #2f7cff;
  background: color-mix(in srgb, #2f7cff 8%, var(--app-surface));
  box-shadow: 0 0 0 3px color-mix(in srgb, #2f7cff 16%, transparent);
}

.paint-color-swatch {
  position: relative;
  display: grid;
  width: 100%;
  aspect-ratio: 1.35;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--app-text) 10%, transparent);
  border-radius: 10px;
  overflow: hidden;
}

.paint-color-check {
  font-size: 22px;
  color: #fff;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.45));
}

.paint-color-option.is-light .paint-color-check {
  color: #111827;
  filter: none;
}

.paint-color-name {
  color: var(--app-text);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.25;
}

.paint-color-hex {
  color: var(--app-text-soft);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

@media (max-width: 520px) {
  .paint-color-grid {
    grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
    gap: 8px;
  }

  .paint-color-current {
    width: 100%;
  }
}
</style>
