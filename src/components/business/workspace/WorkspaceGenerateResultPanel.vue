<script setup lang="ts">
import { computed, ref, watch } from "vue";

import type { WorkspaceGenerateResult } from "@/types/workspace";

const props = defineProps<{
  result: WorkspaceGenerateResult;
}>();

const emit = defineEmits<{
  back: [];
}>();

const naturalSize = ref<{ width: number; height: number } | null>(null);

const mediaStyle = computed(() => {
  const width = naturalSize.value?.width ?? props.result.imageWidth;
  const height = naturalSize.value?.height ?? props.result.imageHeight;

  if (!width || !height) return undefined;

  return {
    aspectRatio: `${width} / ${height}`,
  };
});

watch(
  () => props.result.previewImage,
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

function handleDownload(url: string, alt: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = `${alt || "generate-result"}.jpg`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.append(link);
  link.click();
  link.remove();
}
</script>

<template>
  <section class="generate-result" aria-label="生成结果">
    <header class="generate-result-head">
      <div class="generate-result-meta">
        <time :datetime="result.createdAt">{{ result.createdAt }}</time>
        <h2>{{ result.statusText }}</h2>
      </div>
      <button type="button" class="generate-result-back" @click="emit('back')">
        返回
      </button>
    </header>

    <div class="generate-result-preview" aria-label="生成预览">
      <div class="generate-result-media" :style="mediaStyle">
        <img
          :src="result.previewImage"
          :alt="result.previewAlt"
          :width="result.imageWidth"
          :height="result.imageHeight"
          loading="eager"
          decoding="async"
          @load="handlePreviewLoad"
        />
      </div>
    </div>

    <footer class="generate-result-foot">
      <p class="generate-result-ratio">{{ result.ratioLabel }}</p>
      <button
        type="button"
        class="generate-result-download"
        @click="handleDownload(result.downloadUrl, result.previewAlt)"
      >
        下载该图
      </button>
    </footer>
  </section>
</template>

<style scoped lang="scss">
.generate-result {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 16px;
}

.generate-result-head {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.generate-result-meta {
  min-width: 0;
}

.generate-result-meta time {
  display: block;
  color: var(--assist-muted);
  font-size: 13px;
  font-weight: 700;
}

.generate-result-meta h2 {
  margin: 8px 0 0;
  color: var(--assist-text);
  font-size: clamp(18px, 1.5vw, 24px);
  font-weight: 950;
  line-height: 1.35;
}

.generate-result-back {
  flex-shrink: 0;
  height: 38px;
  border: 1px solid var(--assist-border);
  border-radius: 10px;
  background: var(--assist-card-strong);
  color: var(--assist-text);
  padding: 0 18px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.generate-result-back:hover {
  border-color: color-mix(in srgb, var(--assist-blue) 45%, var(--assist-border));
  background: color-mix(in srgb, var(--assist-blue) 10%, var(--assist-card-strong));
}

.generate-result-preview {
  display: flex;
  min-height: 0;
  flex: 1;
  justify-content: center;
  overflow: auto;
  overscroll-behavior: contain;
  padding: 4px 2px;
}

.generate-result-media {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--assist-border);
  border-radius: 12px;
  background: var(--assist-card-strong);
  box-shadow: var(--assist-shadow);
}

.generate-result-media img {
  display: block;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: min(72vh, 920px);
  border-radius: 12px;
  object-fit: contain;
  background: #0b1220;
}

.theme-light .generate-result-media img {
  background: #e8eef6;
}

.generate-result-foot {
  flex-shrink: 0;
  padding-top: 4px;
}

.generate-result-ratio {
  margin: 0 0 12px;
  color: var(--assist-text);
  font-size: 14px;
  font-weight: 900;
}

.generate-result-download {
  display: flex;
  width: 100%;
  height: 52px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(180deg, #d6b36f, #c9a05e);
  color: #1a1208;
  font-family: inherit;
  font-size: 16px;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 12px 28px rgba(201, 160, 94, 0.28);
  transition: transform 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease;
}

.generate-result-download:hover {
  filter: brightness(1.04);
  box-shadow: 0 14px 32px rgba(201, 160, 94, 0.34);
}

.generate-result-download:active {
  transform: translateY(1px);
}
</style>
