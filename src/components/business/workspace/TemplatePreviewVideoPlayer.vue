<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { Icon } from "@iconify/vue";

const props = defineProps<{
  src: string;
  poster?: string;
  templateId: string;
}>();

const videoRef = ref<HTMLVideoElement | null>(null);

function destroyPlayback() {
  const video = videoRef.value;
  if (!video) return;
  video.pause();
  video.removeAttribute("src");
  video.load();
}

async function toggleFullscreen() {
  const video = videoRef.value;
  if (!video) return;

  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }

  if (video.requestFullscreen) {
    await video.requestFullscreen();
    return;
  }

  const webkitVideo = video as HTMLVideoElement & {
    webkitEnterFullscreen?: () => void;
  };
  webkitVideo.webkitEnterFullscreen?.();
}

onMounted(async () => {
  const video = videoRef.value;
  if (!video) return;
  video.currentTime = 0;
  try {
    await video.play();
  } catch {
    // 浏览器可能阻止自动播放，保留控件供用户手动播放。
  }
});

onBeforeUnmount(() => {
  destroyPlayback();
});
</script>

<template>
  <div class="template-preview-video-shell">
    <video
      :key="templateId"
      ref="videoRef"
      class="template-preview-video-player"
      controls
      controlslist="nodownload noplaybackrate"
      playsinline
      preload="metadata"
      :poster="poster"
      :src="src"
    >
      当前浏览器不支持视频播放。
    </video>
    <button
      type="button"
      class="template-preview-video-zoom"
      aria-label="放大播放"
      @click.stop="toggleFullscreen"
    >
      <Icon icon="mdi:fullscreen" />
    </button>
  </div>
</template>

<style scoped lang="scss">
.template-preview-video-shell {
  position: relative;
  display: flex;
  width: 100%;
  max-width: 100%;
  max-height: 100%;
  align-items: center;
  justify-content: center;
}

.template-preview-video-player {
  display: block;
  width: auto;
  max-width: 100%;
  height: auto;
  max-height: 100%;
  border-radius: 12px;
  background: #000;
  object-fit: contain;
}

.template-preview-video-player:fullscreen {
  width: 100%;
  height: 100%;
  max-height: none;
  border-radius: 0;
  object-fit: contain;
}

.template-preview-video-zoom {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.58);
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.template-preview-video-zoom:hover {
  background: rgba(0, 0, 0, 0.78);
}
</style>
