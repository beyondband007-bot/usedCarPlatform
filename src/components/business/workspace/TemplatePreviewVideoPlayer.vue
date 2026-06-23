<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

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
  <video
    :key="templateId"
    ref="videoRef"
    class="template-preview-video-player"
    controls
    playsinline
    preload="metadata"
    :poster="poster"
    :src="src"
  >
    当前浏览器不支持视频播放。
  </video>
</template>

<style scoped lang="scss">
.template-preview-video-player {
  display: block;
  width: auto;
  max-width: 100%;
  height: auto;
  max-height: min(72vh, 640px);
  border-radius: 12px;
  background: #000;
  object-fit: contain;
}
</style>
