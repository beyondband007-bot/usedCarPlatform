<script setup lang="ts">
import { computed } from "vue";
import { Icon } from "@iconify/vue";

import PreloadImage from "@/components/common/PreloadImage.vue";
import {
  recentStatusIconMap,
  recentStatusLabelMap,
  formatRecentCardCaption,
  resolveRecentDisplayImage,
} from "@/utils/workspace-recent";
import {
  resolveRecentFlowClass,
  resolveRecentFlowMediaStyle,
} from "@/utils/workspace-recent-layout";
import type { WorkspaceRecentItem } from "@/types/workspace";

const props = defineProps<{
  item: WorkspaceRecentItem;
  clickable?: boolean;
  selected?: boolean;
  deleting?: boolean;
  statusLabel?: string;
  showStatus?: boolean;
}>();

const emit = defineEmits<{
  pick: [item: WorkspaceRecentItem];
  delete: [item: WorkspaceRecentItem];
}>();

const statusIconMap = recentStatusIconMap;

function resolveMediaStyle() {
  return resolveRecentFlowMediaStyle();
}

function resolveCardClass() {
  return resolveRecentFlowClass(props.item);
}

const recentCaption = computed(() => formatRecentCardCaption(props.item));

function handlePick() {
  if (!props.clickable) return;
  emit("pick", props.item);
}
</script>

<template>
  <article
    class="recent-card recent-card--image-only recent-flow-item"
    :class="[
      resolveCardClass(),
      {
        'is-clickable': clickable,
        'is-selected': selected,
      },
    ]"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    :aria-label="clickable ? `查看${item.title}` : item.title"
    :aria-current="selected ? 'true' : undefined"
    @click="handlePick"
    @keydown.enter.prevent="handlePick"
    @keydown.space.prevent="handlePick"
  >
    <div class="recent-media recent-media--flow" :style="resolveMediaStyle()">
      <PreloadImage
        v-if="resolveRecentDisplayImage(item)"
        class="recent-image recent-image--cover"
        :src="resolveRecentDisplayImage(item)"
        :alt="item.title"
        loading="lazy"
        decoding="async"
        fetchpriority="low"
        :draggable="false"
        fit="cover"
        object-position="center"
      />
      <div v-else class="recent-empty">
        <Icon icon="mdi:image-outline" />
      </div>
      <span
        v-if="showStatus"
        class="recent-status recent-status--subtle"
        :class="`is-${item.status}`"
      >
        <Icon :icon="statusIconMap[item.status]" class="recent-status-icon" />
        {{ statusLabel ?? recentStatusLabelMap[item.status] }}
      </span>
      <p v-if="recentCaption" class="recent-caption">
        {{ recentCaption }}
      </p>
    </div>
    <button
      type="button"
      class="recent-delete-btn recent-delete-btn--overlay"
      :aria-label="`删除${item.title}`"
      :disabled="deleting"
      @click.stop="emit('delete', item)"
    >
      <Icon
        :icon="deleting ? 'mdi:loading' : 'mdi:trash-can-outline'"
        :class="{ 'recent-delete-icon--loading': deleting }"
      />
    </button>
  </article>
</template>

<style scoped lang="scss">
.recent-card {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  min-width: 0;
  border: 1px solid var(--assist-border, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  background: color-mix(
    in srgb,
    var(--assist-card, var(--sv-surface, #1a1a1a)) 92%,
    white
  );
  box-shadow: var(--assist-shadow, 0 8px 24px rgba(15, 23, 42, 0.08));
  overflow: hidden;
  transform-origin: center center;
  transition: transform 0.35s ease, z-index 0s;
}

.recent-card.is-clickable {
  cursor: pointer;
}

.recent-card.is-clickable:hover {
  transform: scale(1.1);
  z-index: 30;
}

.recent-card.is-clickable:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--assist-blue, #3b82f6) 55%, transparent);
  outline-offset: 2px;
}

.recent-card--image-only {
  overflow: hidden;
}

.recent-flow-item {
  display: block;
  width: 100%;
  min-width: 0;
  height: auto;
}

.recent-media--flow {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--workspace-accent, #efc24c) 8%, transparent),
      transparent 42%
    ),
    var(--assist-card-strong, var(--sv-surface, #111));
}

.recent-media--flow :deep(.preload-image) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.recent-image--cover {
  display: block;
  width: 100%;
  height: 100%;
}

.recent-image--cover :deep(.preload-image__img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.recent-image--cover :deep(.preload-image__placeholder) {
  position: absolute;
  inset: 0;
}

.recent-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--assist-muted, var(--app-text-soft));
  font-size: 26px;
}

.recent-caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  margin: 0;
  padding: 10px 12px 8px;
  overflow: hidden;
  background: linear-gradient(
    180deg,
    rgba(15, 23, 42, 0) 0%,
    rgba(15, 23, 42, 0.28) 100%
  );
  color: rgba(255, 255, 255, 0.72);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.3;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.recent-delete-btn--overlay {
  position: absolute;
  top: 16px;
  right: 12px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: rgba(239, 68, 68, 0.72);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition:
    opacity 0.2s ease,
    color 0.2s ease;
}

.recent-card:hover .recent-delete-btn--overlay,
.recent-card:focus-within .recent-delete-btn--overlay {
  opacity: 1;
}

.recent-delete-btn--overlay:hover:not(:disabled) {
  background: transparent;
  color: rgba(220, 38, 38, 0.88);
}

.recent-status {
  position: absolute;
  left: 8px;
  top: 8px;
  z-index: 1;
  display: inline-flex;
  max-width: calc(100% - 16px);
  align-items: center;
  gap: 4px;
  overflow: hidden;
  padding: 3px 7px;
  border-radius: 999px;
  backdrop-filter: blur(6px);
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

.recent-status.is-generating {
  background: rgba(255, 193, 7, 0.92);
  color: #7a4f00;
}

.recent-status.is-fail {
  background: rgba(239, 99, 99, 0.92);
  color: #fff;
}

.recent-delete-icon--loading {
  animation: recent-card-spin 1s linear infinite;
}

@keyframes recent-card-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
