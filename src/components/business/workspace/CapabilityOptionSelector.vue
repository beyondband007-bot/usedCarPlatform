<script setup lang="ts">
import { computed } from "vue";
import { motion } from "motion-v";

import PreloadImage from "@/components/common/PreloadImage.vue";
import type { WorkspaceCapability } from "@/types/workspace";

const props = defineProps<{
  capability: WorkspaceCapability;
  selectedOptionId: string;
}>();

const emit = defineEmits<{
  select: [id: string];
}>();

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
      :aria-label="capability.selectorTitle"
    >
      <header class="option-selector-head">
        <h2 class="option-selector-title">{{ capability.selectorTitle }}</h2>
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
                tabindex="0"
                class="option-item"
                :class="{ 'is-active': option.id === selectedOptionId }"
                :aria-selected="option.id === selectedOptionId"
                @click="emit('select', option.id)"
                @keydown.enter="emit('select', option.id)"
                @keydown.space.prevent="emit('select', option.id)"
              >
                <PreloadImage
                  class="option-item-cover"
                  :src="option.image"
                  :alt="option.title"
                  loading="lazy"
                  decoding="async"
                  :draggable="false"
                />
                <strong class="option-item-title">{{ option.title }}</strong>
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
  --option-scroll-track: color-mix(in srgb, var(--workspace-muted, #969186) 16%, transparent);
  --option-scroll-track-glow: color-mix(in srgb, var(--workspace-accent, #efc24c) 16%, transparent);
  --option-scroll-thumb-start: var(--workspace-accent, #efc24c);
  --option-scroll-thumb-end: var(--workspace-accent-strong, #ffd75a);
  --option-scroll-thumb-glow: color-mix(in srgb, var(--workspace-accent, #efc24c) 38%, transparent);

  padding: 18px 18px 14px;
  border: 1px solid var(--workspace-line, var(--app-border));
  border-radius: 14px;
  background: var(--workspace-panel, var(--app-surface));
  box-shadow: var(--workspace-shadow, 0 18px 60px rgba(15, 23, 42, 0.08));
}

:global([data-theme="dark"]) .option-selector-card {
  --option-scroll-track: rgba(255, 255, 255, 0.08);
  --option-scroll-track-glow: color-mix(in srgb, var(--workspace-accent, #efc24c) 20%, transparent);
  --option-scroll-thumb-start: var(--workspace-accent, #efc24c);
  --option-scroll-thumb-end: var(--workspace-accent-strong, #ffd75a);
  --option-scroll-thumb-glow: color-mix(in srgb, var(--workspace-accent, #efc24c) 42%, transparent);

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

.option-scroll-shell {
  position: relative;
  min-width: 0;
  container-type: inline-size;
}

.option-scroll-shell::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  bottom: 22px;
  z-index: 2;
  width: clamp(18px, 4vw, 32px);
  pointer-events: none;
  background: linear-gradient(
    270deg,
    var(--app-surface) 0%,
    color-mix(in srgb, var(--app-surface) 72%, transparent) 55%,
    transparent 100%
  );
}

.option-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 2px 2px 20px;
  scroll-padding-inline: 2px;
  scroll-snap-type: x proximity;
  scrollbar-width: thin;
  scrollbar-color: var(--option-scroll-thumb-end) var(--option-scroll-track);
}

.option-scroll::-webkit-scrollbar {
  height: 9px;
}

.option-scroll::-webkit-scrollbar-track {
  margin-inline: 4px;
  border-radius: 999px;
  background:
    linear-gradient(
      90deg,
      transparent 0%,
      var(--option-scroll-track-glow) 18%,
      var(--option-scroll-track-glow) 82%,
      transparent 100%
    ),
    repeating-linear-gradient(
      90deg,
      color-mix(in srgb, var(--app-border) 55%, transparent) 0 1px,
      transparent 1px 7px
    ),
    var(--option-scroll-track);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, #fff 70%, transparent),
    inset 0 -1px 0 color-mix(in srgb, var(--option-scroll-thumb-end) 18%, transparent);
}

.option-scroll::-webkit-scrollbar-thumb {
  border: 2px solid var(--option-scroll-track);
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    var(--option-scroll-thumb-start) 0%,
    var(--option-scroll-thumb-end) 58%,
    color-mix(in srgb, var(--option-scroll-thumb-end) 72%, #6b8cff) 100%
  );
  box-shadow:
    0 0 10px var(--option-scroll-thumb-glow),
    0 0 2px color-mix(in srgb, var(--option-scroll-thumb-start) 65%, transparent);
}

.option-scroll::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--option-scroll-thumb-start) 88%, #fff) 0%,
    color-mix(in srgb, var(--option-scroll-thumb-end) 90%, #fff) 55%,
    #6b8cff 100%
  );
  box-shadow:
    0 0 14px var(--option-scroll-thumb-glow),
    0 0 4px color-mix(in srgb, var(--option-scroll-thumb-start) 75%, transparent);
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
  flex: 0 0 auto;
  width: calc((100cqw - var(--option-gap) * 2) / var(--option-visible));
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

.option-item:hover {
  transform: translateY(-2px);
}

.option-item.is-active {
  border-color: var(--workspace-accent, #efc24c);
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--workspace-accent, #efc24c) 14%, transparent),
    0 10px 24px color-mix(in srgb, var(--workspace-accent, #efc24c) 16%, transparent);
}

.option-item:focus-visible {
  border-color: var(--workspace-accent, #efc24c);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--workspace-accent, #efc24c) 22%, transparent);
}

.option-item-cover {
  display: block;
  width: 100%;
  height: clamp(96px, 10vw, 124px);
  pointer-events: none;
}

.option-item-title {
  display: block;
  padding: 8px 6px;
  color: var(--app-text);
  text-align: center;
  font-size: 13px;
  font-weight: 900;
  line-height: 1.35;
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
