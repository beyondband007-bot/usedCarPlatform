<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { useMessage } from "naive-ui";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

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
  () =>
    props.result.mediaType === "video" &&
    (Boolean(videoUrl.value) || props.result.previewLoading),
);
const isDownloadingVideo = ref(false);

const videoAspectRatio = computed(() => {
  const width = props.result.imageWidth ?? 16;
  const height = props.result.imageHeight ?? 9;
  return `${width} / ${height}`;
});

const isVideoReady = ref(false);
const measuredVideoAspectRatio = ref("");

const resolvedVideoAspectRatio = computed(
  () => measuredVideoAspectRatio.value || videoAspectRatio.value,
);

const isPortraitVideo = computed(() => {
  const [rawWidth, rawHeight] = resolvedVideoAspectRatio.value
    .split("/")
    .map((part) => Number(part.trim()));

  if (!rawWidth || !rawHeight) return true;
  return rawWidth < rawHeight;
});

const showVideoLoading = computed(
  () => Boolean(props.result.previewLoading) || !isVideoReady.value,
);

function ensureVideoPaused() {
  const video = videoRef.value;
  if (!video) return;
  video.pause();
}

function handleVideoLoadStart() {
  isVideoReady.value = false;
}

function handleVideoLoadedMetadata() {
  const video = videoRef.value;
  if (video?.videoWidth && video?.videoHeight) {
    measuredVideoAspectRatio.value = `${video.videoWidth} / ${video.videoHeight}`;
  }
}

function handleVideoCanPlay() {
  const wasReady = isVideoReady.value;
  isVideoReady.value = true;
  if (!wasReady) {
    ensureVideoPaused();
  }
}

function markVideoReadyIfPossible() {
  const video = videoRef.value;
  if (!video) return;
  if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    handleVideoCanPlay();
  }
}

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

function handleVideoShortcut(event: KeyboardEvent) {
  if (event.code !== "Space") return;

  const target = event.target instanceof HTMLElement ? event.target : null;
  if (target?.matches("input, textarea, select, [contenteditable='true']")) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const video = videoRef.value;
  video?.blur();
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

watch(videoUrl, async () => {
  await nextTick();
  const video = videoRef.value;

  isVideoReady.value = false;
  measuredVideoAspectRatio.value = "";

  if (!video) return;

  ensureVideoPaused();
  video.load();
  markVideoReadyIfPossible();
});

watch(
  () => props.result.previewLoading,
  async (loading) => {
    if (loading) {
      isVideoReady.value = false;
      return;
    }

    await nextTick();
    markVideoReadyIfPossible();
  },
);

onMounted(() => {
  markVideoReadyIfPossible();
  window.addEventListener("keydown", handleVideoShortcut, true);
  window.addEventListener("keyup", handleVideoShortcut, true);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleVideoShortcut, true);
  window.removeEventListener("keyup", handleVideoShortcut, true);
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
      <div
        v-if="showVideoLoading"
        class="video-preview-waiting"
        aria-live="polite"
      >
        <div
          class="video-preview-waiting-visual"
          :class="{
            'is-portrait': isPortraitVideo,
            'is-landscape': !isPortraitVideo,
          }"
          :style="{ aspectRatio: resolvedVideoAspectRatio }"
          aria-hidden="true"
        >
          <span class="video-preview-waiting-scan"></span>
          <Icon icon="mdi:video-outline" />
        </div>

        <div class="video-preview-waiting-copy">
          <p>{{ result.ratioLabel }}</p>
          <h2>视频加载中</h2>
          <span>正在准备预览，请稍候</span>
        </div>

        <div
          class="video-preview-waiting-progress"
          role="progressbar"
          aria-label="视频加载进度"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <span></span>
        </div>
      </div>

      <div
        class="video-preview-frame"
        :class="{ 'is-hidden': showVideoLoading }"
        :style="{ aspectRatio: resolvedVideoAspectRatio }"
      >
        <video
          v-if="videoUrl"
          ref="videoRef"
          class="video-preview-player"
          controls
          playsinline
          preload="auto"
          :src="videoUrl"
          @loadstart="handleVideoLoadStart"
          @loadedmetadata="handleVideoLoadedMetadata"
          @canplay="handleVideoCanPlay"
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
        :disabled="isDownloadingVideo || showVideoLoading"
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
  gap: 12px;
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
  margin: 6px 0 0;
  color: var(--assist-text);
  font-size: clamp(17px, 1.25vw, 21px);
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
  position: relative;
  display: flex;
  min-height: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  overscroll-behavior: contain;
  padding: clamp(12px, 1.8vh, 24px) clamp(14px, 2vw, 30px);
  border: 1px solid var(--assist-border, #e1eaf5);
  border-radius: 16px;
  background: transparent;
}

.video-preview-waiting {
  position: relative;
  z-index: 1;
  display: grid;
  align-content: center;
  justify-items: center;
  width: 100%;
  height: 100%;
  min-height: 0;
  gap: clamp(12px, 1.7vh, 20px);
  padding: clamp(12px, 1.8vh, 22px) clamp(12px, 1.5vw, 20px);
}

.video-preview-waiting-visual {
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px dashed color-mix(in srgb, var(--assist-blue, #3b82f6) 28%, var(--assist-border, #e1eaf5));
  border-radius: clamp(16px, 1.6vw, 24px);
  background:
    radial-gradient(
      circle at 50% 42%,
      color-mix(in srgb, var(--assist-blue, #3b82f6) 16%, transparent),
      transparent 38%
    ),
    linear-gradient(180deg, #151922 0%, #0d1117 100%);
}

.video-preview-waiting-visual.is-portrait {
  height: min(42vh, 480px);
  width: auto;
  max-width: min(86%, 320px);
}

.video-preview-waiting-visual.is-landscape {
  width: min(86%, 720px);
  height: auto;
  max-height: min(38vh, 420px);
}

.video-preview-waiting-visual .iconify {
  position: relative;
  z-index: 1;
  color: var(--assist-blue, #3b82f6);
  font-size: clamp(40px, 5vmin, 64px);
  filter: drop-shadow(0 8px 24px color-mix(in srgb, var(--assist-blue, #3b82f6) 18%, transparent));
  animation: video-preview-pulse 1.6s ease-in-out infinite;
}

.video-preview-waiting-scan {
  position: absolute;
  inset: 12% 16%;
  border-radius: 14px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(59, 130, 246, 0.16) 48%,
    rgba(59, 130, 246, 0.04) 52%,
    transparent 100%
  );
  opacity: 0.75;
  animation: video-preview-scan 1.8s linear infinite;
}

.video-preview-waiting-copy {
  display: grid;
  width: min(100%, clamp(360px, 52vw, 720px));
  justify-items: center;
  gap: 6px;
  text-align: center;
}

.video-preview-waiting-copy p,
.video-preview-waiting-copy h2,
.video-preview-waiting-copy span {
  margin: 0;
}

.video-preview-waiting-copy p {
  color: var(--assist-blue, #3b82f6);
  font-size: clamp(12px, 1vw, 14px);
  font-weight: 800;
  letter-spacing: 0.02em;
}

.video-preview-waiting-copy h2 {
  color: var(--assist-text);
  font-size: clamp(20px, 2vw, 28px);
  font-weight: 900;
  line-height: 1.25;
}

.video-preview-waiting-copy span {
  display: block;
  max-width: min(100%, 560px);
  color: var(--assist-muted);
  font-size: clamp(12px, 1vw, 14px);
  line-height: 1.5;
}

.video-preview-waiting-progress {
  width: min(82%, 520px);
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--assist-border, #e1eaf5) 70%, transparent);
}

.video-preview-waiting-progress span {
  display: block;
  width: 42%;
  min-width: 8%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    var(--assist-blue, #3b82f6),
    color-mix(in srgb, var(--assist-blue, #3b82f6) 55%, white) 70%,
    color-mix(in srgb, var(--assist-blue, #3b82f6) 25%, white)
  );
  animation: video-preview-progress 1.6s ease-in-out infinite;
}

.video-preview-frame {
  position: relative;
  display: flex;
  width: auto;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  margin: 0 auto;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 12px;
  background: #050914;
}

.video-preview-frame.is-hidden {
  position: absolute;
  inset: 16px;
  opacity: 0;
  pointer-events: none;
  z-index: 0;
}

.video-preview-player {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 12px;
  background: #050914;
  object-fit: contain;
}

.video-preview-player:fullscreen {
  width: 100%;
  height: 100%;
  border-radius: 0;
}

.video-preview-foot {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.video-preview-ratio {
  margin: 0;
  color: var(--assist-muted);
  font-size: 13px;
  font-weight: 700;
}

.video-preview-download {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  border: 0;
  border-radius: 10px;
  background: var(--assist-blue, #3b82f6);
  color: #fff;
  padding: 0 18px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.video-preview-download:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.video-preview-download-icon {
  font-size: 18px;
}

@keyframes video-preview-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.92;
  }

  50% {
    transform: scale(1.04);
    opacity: 1;
  }
}

@keyframes video-preview-scan {
  0% {
    transform: translateY(-120%);
  }

  100% {
    transform: translateY(120%);
  }
}

@keyframes video-preview-progress {
  0% {
    transform: translateX(-120%);
  }

  100% {
    transform: translateX(260%);
  }
}
</style>
