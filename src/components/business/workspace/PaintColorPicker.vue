<script setup lang="ts">
import { NColorPicker } from 'naive-ui'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function normalizeHex(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('#') ? trimmed.toUpperCase() : `#${trimmed.toUpperCase()}`
}

const colorValue = ref<string | null>(
  props.modelValue ? normalizeHex(props.modelValue) : null,
)

const displayHex = computed(() => colorValue.value ?? '')

watch(
  () => props.modelValue,
  (value) => {
    const next = value ? normalizeHex(value) : null
    if (next !== colorValue.value) {
      colorValue.value = next
    }
  },
)

function handleColorUpdate(value: string | null) {
  colorValue.value = value ? normalizeHex(value) : null
  emit('update:modelValue', value ? normalizeHex(value) : '')
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

    <div class="paint-color-field">
      <p class="paint-color-field-label">
        <template v-if="displayHex">颜色 ({{ displayHex }})</template>
        <template v-else>未选择色号</template>
      </p>

      <NColorPicker
        :value="colorValue"
        :show-alpha="false"
        :modes="['hex']"
        :swatches="[]"
        class="paint-color-picker"
        @update:value="handleColorUpdate"
      />
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

.paint-color-field-label {
  margin: 0;
  color: var(--app-text);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}

.paint-color-picker {
  width: 100%;
}

.paint-color-picker :deep(.n-color-picker) {
  width: 100%;
}

.paint-color-picker :deep(.n-color-picker-trigger) {
  width: 100%;
  min-height: 34px;
  border-radius: 4px;
}

.paint-color-picker :deep(.n-color-picker-trigger .n-color-picker-trigger__fill) {
  border-radius: 3px;
}

.paint-color-picker :deep(.n-color-picker-trigger .n-color-picker-trigger__value) {
  font-size: 14px;
  font-weight: 700;
}
</style>
