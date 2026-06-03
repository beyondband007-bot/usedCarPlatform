<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { computed, nextTick, ref, watch } from "vue";
import { useMessage } from "naive-ui";

import type { WorkspaceImagePreview } from "@/types/workspace";
import { downloadFile, sanitizeFilename } from "@/utils/download";

const props = withDefaults(
  defineProps<{
    preview: WorkspaceImagePreview;
    showBack?: boolean;
    downloadLabel?: string;
  }>(),
  {
    showBack: true,
    downloadLabel: "下载原图",
  },
);

const emit = defineEmits<{
  back: [];
}>();

const message = useMessage();
const naturalSize = ref<{ width: number; height: number } | null>(null);
const imageRef = ref<HTMLImageElement | null>(null);
const isImageLoading = ref(true);

const frameStyle = computed(() => {
  const width = naturalSize.value?.width ?? props.preview.imageWidth;
  const height = naturalSize.value?.height ?? props.preview.imageHeight;

  if (!width || !height) {
    return {
      height: "100%",
      maxWidth: "100%",
    };
  }

  return {
    aspectRatio: `${width} / ${height}`,
    height: "100%",
    width: "auto",
    maxWidth: "100%",
  };
});

function syncNaturalSize(image: HTMLImageElement) {
  if (!image.naturalWidth || !image.naturalHeight) return;

  naturalSize.value = {
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}

function markImageLoaded(image: HTMLImageElement) {
  syncNaturalSize(image);
  isImageLoading.value = false;
}

async function syncImageLoadingState() {
  isImageLoading.value = true;
  naturalSize.value = null;

  await nextTick();

  const image = imageRef.value;
  if (image?.complete && image.naturalWidth > 0) {
    markImageLoaded(image);
  }
}

watch(
  () => props.preview.imageUrl,
  () => {
    void syncImageLoadingState();
  },
  { immediate: true },
);

function handlePreviewLoad(event: Event) {
  markImageLoaded(event.target as HTMLImageElement);
}

function handlePreviewError() {
  isImageLoading.value = false;
}

async function handleDownload() {
  try {
    await downloadFile(
      props.preview.downloadUrl,
      `${sanitizeFilename(props.preview.imageAlt || "preview")}.jpg`,
    );
    message.success("Image download started");
  } catch {
    message.error("Download failed, please try again later");
  }
}
</script>

<template>
  <section class="image-preview" aria-label="图片预览">
    <header class="image-preview-head">
      <div class="image-preview-meta">
        <time :datetime="preview.createdAt">{{ preview.createdAt }}</time>
        <h2>{{ preview.statusText }}</h2>
      </div>
      <button
        v-if="showBack"
        type="button"
        class="image-preview-back"
        @click="emit('back')"
      >
        返回
      </button>
    </header>

    <div class="image-preview-body" aria-label="图片预览区域">
      <div
        class="image-preview-frame"
        :class="{ 'is-loading': isImageLoading }"
        :style="frameStyle"
      >
        <div
          v-if="isImageLoading"
          class="image-preview-loading"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <span class="image-preview-loading-spinner" aria-hidden="true"></span>
          <p>图片已生成，加载中</p>
        </div>

        <img
          ref="imageRef"
          class="image-preview-image"
          :class="{ 'is-visible': !isImageLoading }"
          :src="preview.imageUrl"
          :alt="preview.imageAlt"
          loading="eager"
          decoding="async"
          @load="handlePreviewLoad"
          @error="handlePreviewError"
        />
      </div>
    </div>

    <footer class="image-preview-foot">
      <p class="image-preview-ratio">{{ preview.ratioLabel }}</p>
      <button
        type="button"
        class="image-preview-download"
        @click="handleDownload"
      >
        <Icon icon="mdi:download-outline" class="image-preview-download-icon" />
        {{ downloadLabel }}
      </button>
    </footer>
  </section>
</template>

<style scoped lang="scss">
.image-preview {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 16px;
}

.image-preview-head {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.image-preview-meta {
  min-width: 0;
}

.image-preview-meta time {
  display: block;
  color: var(--assist-muted);
  font-size: 13px;
  font-weight: 700;
}

.image-preview-meta h2 {
  margin: 8px 0 0;
  color: var(--assist-text);
  font-size: clamp(18px, 1.5vw, 24px);
  font-weight: 950;
  line-height: 1.35;
}

.image-preview-back {
  flex-shrink: 0;
  height: 38px;
  border-radius: 10px;
  background: var(--assist-card-strong);
  color: var(--assist-text);
  padding: 0 18px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  transition: background 0.2s ease;
}

.image-preview-back:hover {
  background: color-mix(
    in srgb,
    var(--assist-blue) 10%,
    var(--assist-card-strong)
  );
}

.image-preview-body {
  display: flex;
  min-height: 0;
  flex: 1;
  align-items: stretch;
  justify-content: center;
  overflow: hidden;
  overscroll-behavior: contain;
  padding: 16px;
  border: 1px solid var(--assist-border, #e1eaf5);
  border-radius: 16px;
  background: transparent;
}

.image-preview-frame {
  position: relative;
  display: flex;
  height: 100%;
  width: auto;
  max-width: 100%;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  min-height: 240px;
}

.image-preview-loading {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 24px;
  text-align: center;
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--assist-blue, #3b82f6) 8%, transparent),
      transparent 52%
    ),
    color-mix(in srgb, var(--assist-card-strong, #0f172a) 88%, #111827);
}

.image-preview-loading-spinner {
  width: 34px;
  height: 34px;
  border: 2px solid color-mix(in srgb, var(--assist-blue, #60a5fa) 24%, transparent);
  border-top-color: var(--assist-blue, #60a5fa);
  border-radius: 999px;
  animation: image-preview-spin 0.8s linear infinite;
}

.image-preview-loading p {
  margin: 0;
  color: var(--assist-text, #e5e7eb);
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.image-preview-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: transparent;
  opacity: 0;
  transition: opacity 0.24s ease;
}

.image-preview-image.is-visible {
  opacity: 1;
}

@keyframes image-preview-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .image-preview-loading-spinner,
  .image-preview-image {
    animation: none;
    transition: none;
  }
}

.image-preview-foot {
  flex-shrink: 0;
  padding-top: 4px;
}

.image-preview-ratio {
  margin: 0 0 12px;
  color: var(--assist-text);
  font-size: 14px;
  font-weight: 900;
}

.image-preview-download {
  display: flex;
  width: calc(100% - 48px);
  max-width: 320px;
  height: 48px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0 auto;
  padding: 0 24px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f5c84c 0%, #ffd766 100%);
  color: #1e293b;
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(245, 200, 76, 0.25);
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease;
}

.image-preview-download-icon {
  flex-shrink: 0;
  font-size: 18px;
}

.image-preview-download:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(245, 200, 76, 0.35);
}

.image-preview-download:active {
  transform: translateY(1px);
}
</style>
