<script setup lang="ts">
import { computed, ref } from "vue";
import { Icon } from "@iconify/vue";
import { useMessage } from "naive-ui";

import PreloadImage from "@/components/common/PreloadImage.vue";
import { resolveRecentFlowMediaStyle } from "@/utils/workspace-recent-layout";
import { downloadFile, sanitizeFilename } from "@/utils/download";
import type { WorkspaceDeliveryTaskPreviewAsset } from "@/types/workspace";

const props = defineProps<{
  asset: WorkspaceDeliveryTaskPreviewAsset;
  clickable?: boolean;
}>();

const emit = defineEmits<{
  pick: [asset: WorkspaceDeliveryTaskPreviewAsset];
}>();

const message = useMessage();
const isDownloading = ref(false);

const displayImage = computed(() => {
  if (props.asset.status === "ready") {
    return props.asset.imageUrl ?? props.asset.thumbnailUrl ?? "";
  }

  return props.asset.thumbnailUrl ?? props.asset.imageUrl ?? "";
});

const caption = computed(() => {
  const label = props.asset.title?.trim();
  const time = props.asset.createdAt?.trim();

  if (!label && !time) return "";
  if (!label) return time ?? "";
  if (!time) return label;
  return `${label} ${time}`;
});

const pendingLabel = computed(
  () => props.asset.pendingStatusText ?? "生成中",
);

function handlePick() {
  if (!props.clickable) return;
  emit("pick", props.asset);
}

async function handleDownload() {
  if (!props.asset.imageUrl || isDownloading.value) return;

  isDownloading.value = true;

  try {
    await downloadFile(
      props.asset.imageUrl,
      `${sanitizeFilename(props.asset.title || "delivery-asset")}.jpg`,
    );
    message.success("下载已开始");
  } catch {
    message.error("下载失败，请稍后重试");
  } finally {
    isDownloading.value = false;
  }
}
</script>

<template>
  <article
    class="delivery-asset-card recent-flow-item"
    :class="{ 'is-clickable': clickable }"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    :aria-label="
      asset.status === 'ready'
        ? `查看大图：${asset.title}`
        : asset.generationTaskId
          ? `查看生成进度：${asset.title}`
          : `${asset.title}，${pendingLabel}`
    "
    @click="handlePick"
    @keydown.enter.prevent="handlePick"
    @keydown.space.prevent="handlePick"
  >
    <div class="delivery-asset-media" :style="resolveRecentFlowMediaStyle()">
      <PreloadImage
        v-if="displayImage"
        class="delivery-asset-image"
        :src="displayImage"
        :alt="asset.title"
        loading="lazy"
        decoding="async"
        fetchpriority="low"
        :draggable="false"
        fit="cover"
        object-position="center"
      />
      <div v-else class="delivery-asset-pending" aria-hidden="true">
        <span class="delivery-asset-pending-scan"></span>
        <Icon icon="mdi:image-sync-outline" />
        <strong>{{ pendingLabel }}</strong>
      </div>

      <span
        v-if="asset.status === 'pending'"
        class="delivery-asset-status"
      >
        {{ pendingLabel }}
      </span>

      <p v-if="caption" class="delivery-asset-caption">
        {{ caption }}
      </p>
    </div>

    <button
      v-if="asset.status === 'ready' && asset.imageUrl"
      type="button"
      class="delivery-asset-download"
      :aria-label="`下载${asset.title}`"
      :disabled="isDownloading"
      @click.stop="handleDownload"
    >
      <Icon
        :icon="isDownloading ? 'mdi:loading' : 'mdi:download-outline'"
        :class="{ 'delivery-asset-download-icon--loading': isDownloading }"
      />
    </button>
  </article>
</template>

<style scoped lang="scss">
.delivery-asset-card {
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
}

.delivery-asset-card.is-clickable {
  cursor: pointer;
}

.delivery-asset-card.is-clickable:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--assist-blue, #3b82f6) 55%, transparent);
  outline-offset: 2px;
}

.delivery-asset-media {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background: var(--media-surface, var(--assist-card-strong, var(--sv-surface, #111)));
}

.delivery-asset-media :deep(.preload-image) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.delivery-asset-image {
  display: block;
  width: 100%;
  height: 100%;
}

.delivery-asset-image :deep(.preload-image__img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.delivery-asset-pending {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  color: var(--assist-muted);
  font-size: 12px;
  font-weight: 800;
}

.delivery-asset-pending svg {
  width: 28px;
  height: 28px;
  opacity: 0.72;
}

.delivery-asset-pending-scan {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    transparent 0%,
    color-mix(in srgb, var(--assist-blue, #3b82f6) 10%, transparent) 48%,
    transparent 100%
  );
  transform: translateY(-100%);
  animation: delivery-asset-scan 1.8s ease-in-out infinite;
}

@keyframes delivery-asset-scan {
  100% {
    transform: translateY(100%);
  }
}

.delivery-asset-status {
  position: absolute;
  left: 8px;
  top: 8px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, #111 72%, transparent);
  color: #ffd75a;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  backdrop-filter: blur(6px);
}

.delivery-asset-caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  margin: 0;
  padding: 10px 36px 8px 12px;
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

.delivery-asset-download {
  position: absolute;
  right: 12px;
  bottom: 8px;
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
  color: rgba(59, 130, 246, 0.82);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition:
    opacity 0.2s ease,
    color 0.2s ease;
}

.delivery-asset-card:hover .delivery-asset-download,
.delivery-asset-card:focus-within .delivery-asset-download {
  opacity: 1;
}

.delivery-asset-download:hover:not(:disabled) {
  color: rgba(37, 99, 235, 0.96);
}

.delivery-asset-download-icon--loading {
  animation: delivery-asset-spin 1s linear infinite;
}

@keyframes delivery-asset-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
