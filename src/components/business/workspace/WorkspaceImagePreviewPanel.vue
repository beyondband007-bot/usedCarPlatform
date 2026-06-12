<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useMessage } from "naive-ui";

import type { WorkspaceImagePreview } from "@/types/workspace";
import { downloadFile, sanitizeFilename } from "@/utils/download";

const props = withDefaults(
  defineProps<{
    preview: WorkspaceImagePreview;
    gallery?: WorkspaceImagePreview[];
    initialIndex?: number;
    showBack?: boolean;
    downloadLabel?: string;
  }>(),
  {
    gallery: () => [],
    initialIndex: 0,
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
const previewBodyRef = ref<HTMLElement | null>(null);
const stripRef = ref<HTMLElement | null>(null);
const isImageLoading = ref(true);
const currentIndex = ref(0);
let wheelLockTimer: number | null = null;

const galleryItems = computed(() =>
  props.gallery?.length ? props.gallery : [props.preview],
);

const activePreview = computed(
  () => galleryItems.value[currentIndex.value] ?? props.preview,
);

const canGoPrev = computed(() => currentIndex.value > 0);
const canGoNext = computed(
  () => currentIndex.value < galleryItems.value.length - 1,
);
const showGalleryNav = computed(() => galleryItems.value.length > 1);

const frameStyle = computed(() => {
  const width = naturalSize.value?.width ?? activePreview.value.imageWidth;
  const height = naturalSize.value?.height ?? activePreview.value.imageHeight;

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

function syncGalleryIndex() {
  const maxIndex = Math.max(galleryItems.value.length - 1, 0);
  const nextIndex = Math.min(
    Math.max(props.initialIndex ?? 0, 0),
    maxIndex,
  );
  currentIndex.value = nextIndex;
}

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
  () => [props.preview.imageUrl, props.gallery, props.initialIndex] as const,
  () => {
    syncGalleryIndex();
    void syncImageLoadingState();
  },
  { immediate: true, deep: true },
);

watch(
  () => activePreview.value.imageUrl,
  () => {
    void syncImageLoadingState();
  },
);

watch(currentIndex, () => {
  void scrollActiveThumbIntoView();
});

function handlePreviewLoad(event: Event) {
  markImageLoaded(event.target as HTMLImageElement);
}

function handlePreviewError() {
  isImageLoading.value = false;
}

function goToImage(index: number) {
  if (index < 0 || index >= galleryItems.value.length) return;
  if (index === currentIndex.value) return;
  currentIndex.value = index;
}

function showPrevImage() {
  goToImage(currentIndex.value - 1);
}

function showNextImage() {
  goToImage(currentIndex.value + 1);
}

async function scrollActiveThumbIntoView() {
  await nextTick();
  const strip = stripRef.value;
  if (!strip) return;

  const activeThumb = strip.querySelector<HTMLElement>(
    ".image-preview-thumb.is-active",
  );
  activeThumb?.scrollIntoView({
    behavior: "smooth",
    inline: "center",
    block: "nearest",
  });
}

function handleStripWheel(event: WheelEvent) {
  const strip = stripRef.value;
  if (!strip) return;

  const delta =
    Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ? event.deltaX
      : event.deltaY;
  if (Math.abs(delta) < 1) return;

  event.preventDefault();
  event.stopPropagation();
  strip.scrollLeft += delta;
}

function handleThumbHover(index: number) {
  goToImage(index);
}

function handleGalleryWheel(event: WheelEvent) {
  if (!showGalleryNav.value) return;

  const target = event.target as Node | null;
  if (stripRef.value?.contains(target ?? null)) return;

  const delta =
    Math.abs(event.deltaY) >= Math.abs(event.deltaX)
      ? event.deltaY
      : event.deltaX;
  if (Math.abs(delta) < 12) return;

  event.preventDefault();

  if (wheelLockTimer !== null) return;

  if (delta > 0) {
    showNextImage();
  } else {
    showPrevImage();
  }

  wheelLockTimer = window.setTimeout(() => {
    wheelLockTimer = null;
  }, 260);
}

function handleGalleryKeydown(event: KeyboardEvent) {
  if (!showGalleryNav.value) return;

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    showPrevImage();
    return;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    showNextImage();
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleGalleryKeydown);
  previewBodyRef.value?.addEventListener("wheel", handleGalleryWheel, {
    passive: false,
  });
  void scrollActiveThumbIntoView();
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleGalleryKeydown);
  previewBodyRef.value?.removeEventListener("wheel", handleGalleryWheel);
  if (wheelLockTimer !== null) {
    window.clearTimeout(wheelLockTimer);
  }
});

async function handleDownload() {
  try {
    await downloadFile(
      activePreview.value.downloadUrl,
      `${sanitizeFilename(activePreview.value.imageAlt || "preview")}.jpg`,
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
        <time :datetime="activePreview.createdAt">{{
          activePreview.createdAt
        }}</time>
        <h2>{{ activePreview.statusText }}</h2>
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

    <div
      ref="previewBodyRef"
      class="image-preview-body"
      aria-label="图片预览区域"
    >
      <button
        v-if="showGalleryNav"
        type="button"
        class="image-preview-nav image-preview-nav--prev"
        :disabled="!canGoPrev"
        aria-label="上一张"
        @click="showPrevImage"
      >
        <Icon icon="mdi:chevron-left" />
      </button>

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
          :src="activePreview.imageUrl"
          :alt="activePreview.imageAlt"
          loading="eager"
          decoding="async"
          @load="handlePreviewLoad"
          @error="handlePreviewError"
        />
      </div>

      <button
        v-if="showGalleryNav"
        type="button"
        class="image-preview-nav image-preview-nav--next"
        :disabled="!canGoNext"
        aria-label="下一张"
        @click="showNextImage"
      >
        <Icon icon="mdi:chevron-right" />
      </button>
    </div>

    <div
      v-if="showGalleryNav"
      ref="stripRef"
      class="image-preview-strip"
      role="tablist"
      aria-label="图片列表"
      @wheel.prevent="handleStripWheel"
    >
      <button
        v-for="(item, index) in galleryItems"
        :key="`${item.imageUrl}-${index}`"
        type="button"
        class="image-preview-thumb"
        :class="{ 'is-active': index === currentIndex }"
        role="tab"
        :aria-selected="index === currentIndex"
        :aria-label="`查看第 ${index + 1} 张`"
        @mouseenter="handleThumbHover(index)"
        @focus="handleThumbHover(index)"
        @click="goToImage(index)"
      >
        <img
          :src="item.imageUrl"
          :alt="item.imageAlt"
          loading="lazy"
          decoding="async"
          draggable="false"
        />
      </button>
    </div>

    <footer class="image-preview-foot">
      <p class="image-preview-ratio">
        {{ activePreview.ratioLabel }}
        <span v-if="showGalleryNav" class="image-preview-counter">
          · {{ currentIndex + 1 }}/{{ galleryItems.length }}
        </span>
      </p>
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
  position: relative;
  display: flex;
  min-height: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 12px;
  overflow: hidden;
  overscroll-behavior: contain;
  padding: 16px;
  border: 1px solid var(--assist-border, #e1eaf5);
  border-radius: 16px;
  background: transparent;
}

.image-preview-nav {
  z-index: 3;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid color-mix(in srgb, var(--assist-border, #e1eaf5) 80%, #ffffff);
  border-radius: 999px;
  background: color-mix(in srgb, var(--assist-card-strong, #0f172a) 88%, #111827);
  color: var(--assist-text, #e5e7eb);
  cursor: pointer;
  font-size: 24px;
  transition:
    transform 0.16s ease,
    opacity 0.16s ease,
    box-shadow 0.16s ease;
}

.image-preview-nav:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
}

.image-preview-nav:disabled {
  cursor: not-allowed;
  opacity: 0.34;
}

.image-preview-frame {
  position: relative;
  display: flex;
  height: 100%;
  width: auto;
  max-width: 100%;
  flex: 1 1 auto;
  flex-shrink: 1;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  min-width: 0;
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
  .image-preview-image,
  .image-preview-nav {
    animation: none;
    transition: none;
  }
}

.image-preview-strip {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 2px 4px 10px;
  scroll-behavior: smooth;
  scroll-snap-type: x proximity;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-gutter: stable both-edges;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--assist-muted, #94a3b8) 72%, transparent)
    color-mix(in srgb, var(--assist-border, #e1eaf5) 72%, transparent);
  cursor: default;
}

.image-preview-strip::-webkit-scrollbar {
  height: 6px;
}

.image-preview-strip::-webkit-scrollbar-track {
  border-radius: 999px;
  background: color-mix(in srgb, var(--assist-border, #e1eaf5) 72%, transparent);
}

.image-preview-strip::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: color-mix(in srgb, var(--assist-muted, #94a3b8) 72%, transparent);
}

.image-preview-thumb {
  display: block;
  flex: 0 0 auto;
  width: 68px;
  height: 68px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 10px;
  background: color-mix(in srgb, var(--assist-card-strong, #0f172a) 88%, #111827);
  cursor: pointer;
  overflow: hidden;
  scroll-snap-align: center;
  transition:
    border-color 0.16s ease,
    transform 0.16s ease,
    opacity 0.16s ease;
}

.image-preview-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-preview-thumb:hover,
.image-preview-thumb:focus-visible {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--workspace-accent, #f5c84c) 55%, transparent);
}

.image-preview-thumb.is-active {
  border-color: var(--workspace-accent, #f5c84c);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--workspace-accent, #f5c84c) 40%, transparent);
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

.image-preview-counter {
  color: var(--assist-muted);
  font-weight: 800;
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

@media (max-width: 767px) {
  .image-preview-body {
    gap: 8px;
    padding: 12px;
  }

  .image-preview-nav {
    width: 34px;
    height: 34px;
    font-size: 20px;
  }
}
</style>
