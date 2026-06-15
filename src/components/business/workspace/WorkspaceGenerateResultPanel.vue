<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { useMessage } from "naive-ui";
import { computed, nextTick, ref, watch } from "vue";

import WorkspaceImagePreviewPanel from "@/components/business/workspace/WorkspaceImagePreviewPanel.vue";
import type { WorkspaceGenerateResult } from "@/types/workspace";
import { downloadFile, sanitizeFilename } from "@/utils/download";
import { buildImagePreviewFromGenerateResult } from "@/utils/workspace-image-preview";

const props = defineProps<{
  result: WorkspaceGenerateResult;
}>();

const emit = defineEmits<{
  back: [];
}>();

const preview = computed(() => buildImagePreviewFromGenerateResult(props.result));
const videoRef = ref<HTMLVideoElement | null>(null);
const message = useMessage();
const videoUrl = computed(() => props.result.previewVideo ?? props.result.downloadUrl);
const videoDownloadUrl = computed(() => props.result.downloadUrl ?? videoUrl.value);
const isVideoResult = computed(
  () => props.result.mediaType === "video" && Boolean(videoUrl.value),
);
const isDownloadingVideo = ref(false);

async function handleDownloadVideo() {
  if (!videoDownloadUrl.value || isDownloadingVideo.value) return;

  isDownloadingVideo.value = true;

  try {
    const filename = sanitizeFilename("short-video-result.mp4");
    await downloadFile(videoDownloadUrl.value, filename, { fallback: "none" });
    message.success("视频下载已开始");
  } catch {
    message.error("视频下载失败，请稍后重试");
  } finally {
    isDownloadingVideo.value = false;
  }
}

watch(videoUrl, async () => {
  await nextTick();
  videoRef.value?.load();
});
</script>

<template>
  <section v-if="isVideoResult" class="video-preview" aria-label="视频预览">
    <header class="video-preview-head">
      <div class="video-preview-meta">
        <time :datetime="result.createdAt">{{ result.createdAt }}</time>
        <h2>{{ result.statusText }}</h2>
      </div>
      <button type="button" class="video-preview-back" @click="emit('back')">
        返回
      </button>
    </header>

    <div class="video-preview-body" aria-label="视频预览区域">
      <div class="video-preview-frame">
        <video
          ref="videoRef"
          class="video-preview-player"
          controls
          playsinline
          preload="metadata"
          :src="videoUrl"
        >
          当前浏览器不支持视频播放。
        </video>
      </div>
    </div>

    <footer class="video-preview-foot">
      <p class="video-preview-ratio">{{ result.ratioLabel }}</p>
      <button
        type="button"
        class="video-preview-download"
        :disabled="isDownloadingVideo"
        @click="handleDownloadVideo"
      >
        <Icon icon="mdi:download-outline" class="video-preview-download-icon" />
        {{ isDownloadingVideo ? "下载中..." : "下载原视频" }}
      </button>
    </footer>
  </section>

  <WorkspaceImagePreviewPanel
    v-else
    :preview="preview"
    :gallery="result.previewGallery"
    :initial-index="result.previewGalleryIndex ?? 0"
    @back="emit('back')"
  />
</template>

<style scoped lang="scss">
.video-preview {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 16px;
}

.video-preview-head {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.video-preview-meta {
  min-width: 0;
}

.video-preview-meta time {
  display: block;
  color: var(--assist-muted);
  font-size: 13px;
  font-weight: 700;
}

.video-preview-meta h2 {
  margin: 8px 0 0;
  color: var(--assist-text);
  font-size: clamp(18px, 1.5vw, 24px);
  font-weight: 950;
  line-height: 1.35;
}

.video-preview-back {
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

.video-preview-back:hover {
  background: color-mix(
    in srgb,
    var(--assist-blue) 10%,
    var(--assist-card-strong)
  );
}

.video-preview-body {
  display: flex;
  min-height: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  overscroll-behavior: contain;
  padding: 16px;
  border: 1px solid var(--assist-border, #e1eaf5);
  border-radius: 16px;
  background: transparent;
}

.video-preview-frame {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 240px;
  align-items: center;
  justify-content: center;
}

.video-preview-player {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  max-height: 100%;
  border-radius: 12px;
  background: #050914;
  object-fit: contain;
}

.video-preview-foot {
  flex-shrink: 0;
  padding-top: 4px;
}

.video-preview-ratio {
  margin: 0 0 12px;
  color: var(--assist-text);
  font-size: 14px;
  font-weight: 900;
}

.video-preview-download {
  display: flex;
  width: calc(100% - 48px);
  max-width: 320px;
  height: 48px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0 auto;
  padding: 0 24px;
  border: 0;
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

.video-preview-download:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.video-preview-download-icon {
  flex-shrink: 0;
  font-size: 18px;
}

.video-preview-download:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(245, 200, 76, 0.35);
}

.video-preview-download:active:not(:disabled) {
  transform: translateY(1px);
}
</style>
