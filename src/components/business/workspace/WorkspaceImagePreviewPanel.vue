<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { computed, ref, watch } from "vue";
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

const mediaStyle = computed(() => {
  const width = naturalSize.value?.width ?? props.preview.imageWidth;
  const height = naturalSize.value?.height ?? props.preview.imageHeight;

  if (!width || !height) return undefined;

  return {
    aspectRatio: `${width} / ${height}`,
  };
});

watch(
  () => props.preview.imageUrl,
  () => {
    naturalSize.value = null;
  },
);

function handlePreviewLoad(event: Event) {
  const image = event.target as HTMLImageElement;

  if (!image.naturalWidth || !image.naturalHeight) return;

  naturalSize.value = {
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
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
      <img
        class="image-preview-image"
        :style="mediaStyle"
        :src="preview.imageUrl"
        :alt="preview.imageAlt"
        loading="eager"
        decoding="async"
        @load="handlePreviewLoad"
      />
    </div>

    <footer class="image-preview-foot">
      <p class="image-preview-ratio">{{ preview.ratioLabel }}</p>
      <button type="button" class="image-preview-download" @click="handleDownload">
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
  transition:
    background 0.2s ease;
}

.image-preview-back:hover {
  background: color-mix(in srgb, var(--assist-blue) 10%, var(--assist-card-strong));
}

.image-preview-body {
  display: flex;
  min-height: 0;
  flex: 1;
  align-items: flex-start;
  justify-content: center;
  overflow: auto;
  overscroll-behavior: contain;
  border: 1px solid var(--assist-border, #e1eaf5);
  border-radius: 16px;
  background: transparent;
}

.image-preview-image {
  display: block;
  width: 100%;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  background: transparent;
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
  background: linear-gradient(135deg, #F5C84C 0%, #FFD766 100%);
  color: #1E293B;
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
