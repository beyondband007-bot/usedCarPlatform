<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@iconify/vue";
import { motion } from "motion-v";

import PreloadImage from "@/components/common/PreloadImage.vue";
import type { WorkspaceCapability } from "@/types/workspace";

const props = defineProps<{
  capability: WorkspaceCapability;
  selectedOptionId: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  select: [id: string];
}>();

function handleSelect(id: string) {
  if (props.disabled) return;
  emit("select", id);
}

const optionRows = computed(() => {
  const options = props.capability.options;
  if (!options.length) return [];

  const firstRowCount = Math.ceil(options.length / 2);
  return [options.slice(0, firstRowCount), options.slice(firstRowCount)].filter(
    (row) => row.length > 0,
  );
});
</script>

<template>
  <motion.div
    :key="capability.code"
    :initial="{ opacity: 0, y: 18 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.42, delay: 0.08 }"
    class="option-selector-motion"
  >
    <section
      v-if="capability.options.length"
      class="option-selector-card"
      :class="{
        'is-scene': capability.kind === 'scene',
        'is-disabled': disabled,
      }"
      :aria-label="capability.selectorTitle"
      :aria-disabled="disabled || undefined"
    >
      <header class="option-selector-head">
        <h2 class="option-selector-title">{{ capability.selectorTitle }}</h2>
        <span
          v-if="capability.kind === 'scene'"
          class="option-selector-badge"
        >
          必选
        </span>
      </header>

      <div class="option-scroll-shell">
        <div
          class="option-scroll"
          role="listbox"
          :aria-label="`${capability.selectorTitle}列表`"
        >
          <div class="option-rows">
            <div
              v-for="(row, rowIndex) in optionRows"
              :key="`row-${rowIndex}`"
              class="option-row"
            >
              <article
                v-for="option in row"
                :key="option.id"
                role="option"
                :tabindex="disabled ? -1 : 0"
                class="option-item"
                :class="{ 'is-active': option.id === selectedOptionId }"
                :aria-selected="option.id === selectedOptionId"
                :aria-disabled="disabled || undefined"
                @click="handleSelect(option.id)"
                @keydown.enter="handleSelect(option.id)"
                @keydown.space.prevent="handleSelect(option.id)"
              >
                <PreloadImage
                  class="option-item-cover"
                  :src="option.image"
                  :alt="option.title"
                  loading="lazy"
                  decoding="async"
                  :draggable="false"
                />
                <span
                  v-if="capability.kind === 'scene' && option.id === selectedOptionId"
                  class="option-item-check"
                  aria-hidden="true"
                >
                  <Icon icon="mdi:check" />
                </span>
                <div class="option-item-caption">
                  <strong class="option-item-title">{{ option.title }}</strong>
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>
    </section>
  </motion.div>
</template>

<style scoped lang="scss">
.option-selector-motion {
  min-width: 0;
}

.option-selector-card {
  --option-gap: 12px;
  --option-visible: 2.25;

  padding: 18px 18px 14px;
  border: 1px solid var(--workspace-line, var(--app-border));
  border-radius: 14px;
  background: var(--workspace-panel, var(--app-surface));
  box-shadow: var(--workspace-shadow, 0 18px 60px rgba(15, 23, 42, 0.08));
}

:global([data-theme="dark"]) .option-selector-card {
  box-shadow: var(--workspace-shadow, 0 18px 60px rgba(0, 0, 0, 0.28));
}

.option-selector-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.option-selector-title {
  margin: 0;
  color: var(--app-text);
  font-size: 18px;
  font-weight: 900;
  line-height: 1.35;
}

.option-selector-card.is-scene .option-selector-title {
  color: #f2ca50;
  font-weight: 600;
}

.option-selector-badge {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--workspace-accent, #d4a017);
  color: #111111;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.4;
}

.option-selector-card.is-scene .option-selector-badge {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.option-selector-card.is-disabled {
  opacity: 0.55;
  pointer-events: none;
  user-select: none;
}

.option-selector-card.is-disabled .option-item {
  cursor: not-allowed;
}

.option-scroll-shell {
  position: relative;
  min-width: 0;
  container-type: inline-size;
}

.option-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 2px 2px 20px;
  scroll-padding-inline: 2px;
  scroll-snap-type: x proximity;
}

.option-rows {
  display: flex;
  width: max-content;
  min-width: 100%;
  flex-direction: column;
  gap: var(--option-gap);
}

.option-row {
  display: flex;
  gap: var(--option-gap);
}

.option-item {
  position: relative;
  flex: 0 0 auto;
  width: calc((100cqw - var(--option-gap) * 2) / var(--option-visible));
  aspect-ratio: 4 / 3;
  scroll-snap-align: start;
  overflow: hidden;
  border: 2px solid color-mix(in srgb, var(--workspace-line, var(--app-border)) 88%, transparent);
  border-radius: 10px;
  background: var(--app-surface-soft);
  cursor: pointer;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.option-selector-card.is-scene .option-item {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  transition: all 0.25s ease;
}

.option-item:hover {
  transform: translateY(-2px);
}

.option-selector-card.is-scene .option-item:hover:not(.is-active) {
  border-color: #60a5fa;
  transform: translateY(-2px);
}

.option-item.is-active {
  border-color: var(--workspace-accent, #2f6bff);
  box-shadow:
    0 0 0 2px var(--workspace-accent-glow, rgba(47, 107, 255, 0.16)),
    0 10px 24px var(--workspace-accent-glow, rgba(47, 107, 255, 0.12));
}

.option-selector-card.is-scene .option-item.is-active {
  border-color: #3b82f6;
  background: linear-gradient(
    180deg,
    rgba(59, 130, 246, 0.08) 0%,
    rgba(255, 255, 255, 0.98) 100%
  );
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18);
  transform: none;
}

.option-item:focus-visible {
  border-color: var(--workspace-accent, #2f6bff);
  box-shadow: 0 0 0 3px var(--workspace-accent-glow, rgba(47, 107, 255, 0.2));
}

.option-selector-card.is-scene .option-item:focus-visible {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18);
}

.option-item-check {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: #2563eb;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.32);
  pointer-events: none;
}

.option-item-check :deep(svg) {
  width: 14px;
  height: 14px;
}

.option-item-cover {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.option-item-cover :deep(.preload-image),
.option-item-cover :deep(.preload-image__img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.option-item-caption {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  z-index: 2;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 22px 10px 10px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(0, 0, 0, 0.38) 42%,
    rgba(0, 0, 0, 0.78) 100%
  );
  pointer-events: none;
}

.option-selector-card.is-scene .option-item-caption {
  padding: 20px 10px 10px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(15, 23, 42, 0.75) 100%
  );
}

.option-item-title {
  display: block;
  max-width: 100%;
  color: #ffffff;
  text-align: center;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.72);
}

.option-selector-card.is-scene .option-item-title {
  font-weight: 600;
  text-shadow: none;
}

.option-item.is-active .option-item-title {
  color: #ffffff;
}

@media (prefers-reduced-motion: reduce) {
  .option-item {
    transition: none;
  }

  .option-item:hover {
    transform: none;
  }
}
</style>
