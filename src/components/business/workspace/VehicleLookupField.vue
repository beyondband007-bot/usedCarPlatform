<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { Icon } from "@iconify/vue";
import { onClickOutside } from "@vueuse/core";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    options: string[];
    placeholder?: string;
    disabled?: boolean;
    matched?: boolean;
    openOnFocus?: boolean;
  }>(),
  {
    placeholder: "",
    disabled: false,
    matched: false,
    openOnFocus: true,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  select: [value: string];
  clear: [];
}>();

const rootRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const isOpen = ref(false);
const dropdownStyle = ref({
  top: "0px",
  left: "0px",
  width: "0px",
});

const filteredOptions = computed(() => {
  const query = props.modelValue.trim().toLowerCase();
  if (!query) return props.options.slice(0, 80);
  return props.options
    .filter((item) => item.toLowerCase().includes(query))
    .slice(0, 80);
});

const showDropdown = computed(
  () => isOpen.value && !props.disabled && filteredOptions.value.length > 0,
);

const showClearButton = computed(
  () => !props.disabled && props.modelValue.trim().length > 0,
);

function updateDropdownPosition() {
  const root = rootRef.value;
  if (!root) return;
  const rect = root.getBoundingClientRect();
  dropdownStyle.value = {
    top: `${rect.bottom + 6}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  };
}

function openDropdown() {
  if (props.disabled) return;
  isOpen.value = true;
  void nextTick(updateDropdownPosition);
}

function closeDropdown() {
  isOpen.value = false;
}

onClickOutside(rootRef, closeDropdown);

watch(showDropdown, (visible) => {
  if (visible) {
    void nextTick(updateDropdownPosition);
  }
});

function handleInput(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  emit("update:modelValue", value);
  openDropdown();
}

function handleFocus() {
  if (!props.openOnFocus || props.disabled) return;
  openDropdown();
}

function selectOption(value: string) {
  emit("update:modelValue", value);
  emit("select", value);
  closeDropdown();
  void nextTick(() => inputRef.value?.blur());
}

function handleClear(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
  emit("update:modelValue", "");
  emit("clear");
  closeDropdown();
  void nextTick(() => inputRef.value?.focus());
}

function handleWindowChange() {
  if (showDropdown.value) {
    updateDropdownPosition();
  }
}

onMounted(() => {
  window.addEventListener("resize", handleWindowChange);
  window.addEventListener("scroll", handleWindowChange, true);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleWindowChange);
  window.removeEventListener("scroll", handleWindowChange, true);
});

defineExpose({
  focus: () => inputRef.value?.focus(),
  open: openDropdown,
});
</script>

<template>
  <div
    ref="rootRef"
    class="vehicle-lookup-field"
    :class="{
      'is-open': showDropdown,
      'is-matched': matched,
    }"
  >
    <div class="vehicle-lookup-input-wrap">
      <input
        ref="inputRef"
        class="vehicle-lookup-input"
        type="text"
        :value="modelValue"
        :placeholder="placeholder"
        autocomplete="off"
        :disabled="disabled"
        @focus="handleFocus"
        @input="handleInput"
      />

      <button
        v-if="showClearButton"
        type="button"
        class="vehicle-lookup-clear"
        aria-label="清除输入"
        @mousedown.prevent
        @click="handleClear"
      >
        <Icon icon="mdi:close-circle" />
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="showDropdown"
        class="vehicle-lookup-dropdown"
        :style="dropdownStyle"
        role="listbox"
        @mousedown.stop
      >
        <button
          v-for="option in filteredOptions"
          :key="option"
          type="button"
          class="vehicle-lookup-option"
          role="option"
          @mousedown.prevent
          @click="selectOption(option)"
        >
          {{ option }}
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.vehicle-lookup-field {
  position: relative;
}

.vehicle-lookup-input-wrap {
  position: relative;
}

.vehicle-lookup-input {
  width: 100%;
  min-height: 42px;
  padding: 0 36px 0 12px;
  border: 1px solid var(--sv-card-border, #e2e8f0);
  border-radius: 10px;
  background: color-mix(in srgb, var(--sv-card-bg, #fff) 88%, #000);
  color: var(--sv-text, #0f172a);
  font-size: 14px;
  outline: none;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.vehicle-lookup-clear {
  position: absolute;
  top: 50%;
  right: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--sv-text-soft, #94a3b8);
  cursor: pointer;
  font-size: 18px;
  transform: translateY(-50%);
  transition:
    color 160ms ease,
    background 160ms ease;
}

.vehicle-lookup-clear:hover {
  color: var(--sv-text, #0f172a);
  background: color-mix(in srgb, var(--sv-text-soft, #94a3b8) 16%, transparent);
}

.vehicle-lookup-field.is-matched .vehicle-lookup-input {
  border-color: color-mix(in srgb, #22c55e 58%, var(--sv-card-border, #e2e8f0));
}

.vehicle-lookup-field.is-open .vehicle-lookup-input,
.vehicle-lookup-input:focus {
  border-color: color-mix(in srgb, var(--sv-accent, #2f6bff) 52%, var(--sv-card-border, #e2e8f0));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--sv-accent, #2f6bff) 12%, transparent);
}

.vehicle-lookup-field.is-matched.is-open .vehicle-lookup-input,
.vehicle-lookup-field.is-matched .vehicle-lookup-input:focus {
  border-color: color-mix(in srgb, #22c55e 62%, var(--sv-card-border, #e2e8f0));
  box-shadow: 0 0 0 3px color-mix(in srgb, #22c55e 16%, transparent);
}
</style>

<style lang="scss">
.vehicle-lookup-dropdown {
  position: fixed;
  z-index: 4000;
  overflow: hidden auto;
  max-height: 240px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.14);
}

html[data-theme="dark"] .vehicle-lookup-dropdown {
  border-color: #2a3038;
  background: #14171a;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.42);
}

.vehicle-lookup-option {
  display: block;
  width: 100%;
  border: 0;
  border-bottom: 1px solid color-mix(in srgb, #e2e8f0 72%, transparent);
  background: transparent;
  color: #0f172a;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  line-height: 1.4;
  transition: background 160ms ease;
}

html[data-theme="dark"] .vehicle-lookup-option {
  border-bottom-color: color-mix(in srgb, #2a3038 72%, transparent);
  color: #f3f4f6;
}

.vehicle-lookup-option:last-child {
  border-bottom: 0;
}

.vehicle-lookup-option:hover,
.vehicle-lookup-option:focus-visible {
  background: color-mix(in srgb, #2f6bff 10%, #ffffff);
  outline: none;
}

html[data-theme="dark"] .vehicle-lookup-option:hover,
html[data-theme="dark"] .vehicle-lookup-option:focus-visible {
  background: color-mix(in srgb, #efc24c 12%, #14171a);
}
</style>
