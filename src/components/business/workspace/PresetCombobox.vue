<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { NPopconfirm, useMessage } from 'naive-ui'
import { onClickOutside } from '@vueuse/core'

export interface PresetComboboxOption {
  id: string
  name: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: PresetComboboxOption[]
    loading?: boolean
    placeholder?: string
    deletePreset?: (presetId: string) => Promise<unknown>
  }>(),
  {
    loading: false,
    placeholder: '输入或选择预设名称',
    deletePreset: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [option: PresetComboboxOption]
}>()

const message = useMessage()
const rootRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const isOpen = ref(false)
const deletingId = ref<string | null>(null)
const isSelecting = ref(false)

const inputValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

onClickOutside(
  rootRef,
  () => {
    if (isSelecting.value) return
    isOpen.value = false
  },
  {
    ignore: ['.n-popconfirm', '.n-popover', '.n-popconfirm-panel'],
  },
)

function openDropdown() {
  isOpen.value = true
}

function toggleDropdown() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    void nextTick(() => inputRef.value?.focus())
  }
}

function handleInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)
}

async function handleSelect(option: PresetComboboxOption) {
  isSelecting.value = true
  try {
    emit('update:modelValue', option.name)
    emit('select', option)
    isOpen.value = false
    message.success(`已选择预设「${option.name}」`)
  } catch (error) {
    const text =
      error instanceof Error ? error.message : '预设选择失败，请重试'
    message.error(text)
  } finally {
    window.setTimeout(() => {
      isSelecting.value = false
    }, 0)
  }
}

async function handleDeleteConfirm(option: PresetComboboxOption) {
  if (!props.deletePreset || deletingId.value) {
    return false
  }

  deletingId.value = option.id
  try {
    await props.deletePreset(option.id)
    message.success('预设已删除')
    if (props.modelValue.trim() === option.name) {
      emit('update:modelValue', '')
    }
    return true
  } catch (error) {
    const text =
      error instanceof Error ? error.message : '预设删除失败，请重试'
    message.error(text)
    return false
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div
    ref="rootRef"
    class="preset-combobox"
    :class="{ 'is-open': isOpen }"
  >
    <div class="preset-combobox-input-wrap">
      <input
        ref="inputRef"
        class="preset-combobox-input"
        type="text"
        :value="inputValue"
        :placeholder="placeholder"
        autocomplete="off"
        @focus="openDropdown"
        @input="handleInput"
      />
      <button
        type="button"
        class="preset-combobox-chevron"
        aria-label="展开预设列表"
        @mousedown.prevent
        @click="toggleDropdown"
      >
        <Icon icon="mdi:chevron-down" />
      </button>
    </div>

    <div
      v-if="isOpen"
      class="preset-combobox-dropdown"
      role="listbox"
      aria-label="预设列表"
    >
      <div v-if="loading" class="preset-combobox-state">
        <Icon icon="mdi:loading" class="is-spinning" />
        <span>加载中...</span>
      </div>

      <div v-else-if="!options.length" class="preset-combobox-state is-empty">
        暂无预设
      </div>

      <div
        v-for="option in options"
        v-else
        :key="option.id"
        class="preset-combobox-option"
        role="option"
        tabindex="0"
        @mousedown.prevent
        @click="handleSelect(option)"
        @keydown.enter.prevent="handleSelect(option)"
        @keydown.space.prevent="handleSelect(option)"
      >
        <span class="preset-combobox-option-name">{{ option.name }}</span>
        <span
          v-if="deletePreset"
          class="preset-combobox-option-delete-anchor"
          @click.stop
          @mousedown.stop
        >
          <NPopconfirm
            positive-text="删除"
            negative-text="取消"
            placement="right"
            :on-positive-click="() => handleDeleteConfirm(option)"
          >
            <template #trigger>
              <button
                type="button"
                class="preset-combobox-option-delete"
                :class="{ 'is-deleting': deletingId === option.id }"
                :disabled="deletingId === option.id"
                :aria-label="`删除预设${option.name}`"
                title="删除预设"
                @click.stop
                @mousedown.stop
              >
                <Icon
                  :icon="
                    deletingId === option.id
                      ? 'mdi:loading'
                      : 'mdi:trash-can-outline'
                  "
                />
              </button>
            </template>
            删除预设「{{ option.name }}」？删除后不可恢复。
          </NPopconfirm>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.preset-combobox {
  position: relative;
  width: 100%;
  min-width: 0;
}

.preset-combobox-input-wrap {
  position: relative;
}

.preset-combobox-input {
  width: 100%;
  height: 48px;
  box-sizing: border-box;
  border: 1px solid
    color-mix(in srgb, var(--workspace-accent, #efc24c) 24%, var(--app-border));
  border-radius: 8px;
  background: var(--app-surface);
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 80%, transparent);
  color: var(--app-text);
  padding: 0 40px 0 16px;
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.preset-combobox-input::placeholder {
  color: var(--app-text-soft);
  font-weight: 600;
}

.preset-combobox-input:hover {
  border-color: color-mix(
    in srgb,
    var(--workspace-accent, #efc24c) 38%,
    var(--app-border)
  );
}

.preset-combobox.is-open .preset-combobox-input,
.preset-combobox-input:focus {
  border-color: color-mix(
    in srgb,
    var(--workspace-accent, #efc24c) 58%,
    var(--app-border)
  );
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, #fff 80%, transparent),
    0 0 0 3px color-mix(in srgb, var(--workspace-accent, #efc24c) 14%, transparent);
}

.preset-combobox-chevron {
  position: absolute;
  top: 50%;
  right: 14px;
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--app-text-soft);
  cursor: pointer;
  font-size: 18px;
  transform: translateY(-50%);
  transition:
    color 0.16s ease,
    transform 0.2s ease;
}

.preset-combobox.is-open .preset-combobox-chevron {
  transform: translateY(-50%) rotate(180deg);
}

.preset-combobox-chevron:hover {
  color: var(--app-text);
}

.preset-combobox-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  left: 0;
  z-index: 20;
  overflow: hidden;
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface);
  box-shadow: 0 16px 40px color-mix(in srgb, #000 24%, transparent);
}

.preset-combobox-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  padding: 12px 16px;
  color: var(--app-text-soft);
  font-size: 14px;
  font-weight: 600;
}

.preset-combobox-state.is-empty {
  color: var(--app-text-soft);
}

.preset-combobox-state .is-spinning {
  animation: preset-combobox-spin 0.9s linear infinite;
}

.preset-combobox-option {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 12px;
  border: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--app-border) 72%, transparent);
  background: transparent;
  color: var(--app-text);
  padding: 12px 14px;
  text-align: left;
  cursor: pointer;
  font: inherit;
  transition: background 0.16s ease;
}

.preset-combobox-option:last-child {
  border-bottom: 0;
}

.preset-combobox-option:hover,
.preset-combobox-option:focus-visible {
  background: color-mix(in srgb, var(--app-text) 6%, var(--app-surface));
  outline: none;
}

.preset-combobox-option-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  font-weight: 700;
}

.preset-combobox-option-delete-anchor {
  display: flex;
  flex: 0 0 auto;
  margin-left: auto;
}

.preset-combobox-option-delete {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: color-mix(in srgb, var(--app-text-soft) 82%, transparent);
  cursor: pointer;
  font-size: 16px;
  opacity: 0;
  transition:
    opacity 0.16s ease,
    color 0.16s ease,
    background 0.16s ease;
}

.preset-combobox-option:hover .preset-combobox-option-delete,
.preset-combobox-option:focus-within .preset-combobox-option-delete,
.preset-combobox-option-delete.is-deleting {
  opacity: 1;
}

.preset-combobox-option-delete:hover:not(:disabled) {
  background: color-mix(in srgb, #e25555 14%, transparent);
  color: #e25555;
}

.preset-combobox-option-delete:disabled {
  cursor: wait;
  opacity: 0.72;
}

.preset-combobox-option-delete.is-deleting .iconify {
  animation: preset-combobox-spin 0.9s linear infinite;
}

:global([data-theme='dark']) .preset-combobox-input {
  background: color-mix(in srgb, var(--app-surface-soft) 88%, #0f172a);
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 6%, transparent);
}

:global([data-theme='dark']) .preset-combobox.is-open .preset-combobox-input,
:global([data-theme='dark']) .preset-combobox-input:focus {
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, #fff 6%, transparent),
    0 0 0 3px color-mix(in srgb, var(--workspace-accent, #efc24c) 22%, transparent);
}

:global([data-theme='dark']) .preset-combobox-dropdown {
  background: color-mix(in srgb, var(--app-surface-soft) 92%, #0f172a);
  box-shadow: 0 18px 42px color-mix(in srgb, #000 42%, transparent);
}

:global(.workspace-page.theme-light) .preset-combobox-input {
  height: 48px;
  border: 1px solid var(--batch-input-border, #d6e0ed);
  border-radius: 12px;
  background: #ffffff;
  box-shadow: none;
  color: var(--batch-text-primary, #172033);
  font-weight: 600;
}

:global(.workspace-page.theme-light) .preset-combobox-input:hover,
:global(.workspace-page.theme-light) .preset-combobox.is-open .preset-combobox-input,
:global(.workspace-page.theme-light) .preset-combobox-input:focus {
  border-color: var(--batch-brand, #2f6bff);
  box-shadow: 0 0 0 3px var(--workspace-accent-glow, rgba(47, 107, 255, 0.16));
}

:global(.workspace-page.theme-light) .preset-combobox-dropdown {
  border-color: var(--batch-input-border, #d6e0ed);
  background: #ffffff;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.12);
}

@keyframes preset-combobox-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
