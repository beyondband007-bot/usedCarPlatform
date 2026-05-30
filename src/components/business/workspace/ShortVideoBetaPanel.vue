<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

import { shortVideoBetaDemo } from '@/constants/short-video-beta'
import type { WorkspaceGenerateResult } from '@/types/workspace'

const props = defineProps<{
  playRequest?: number
  generationResult?: WorkspaceGenerateResult | null
}>()

const videoRef = ref<HTMLVideoElement | null>(null)

async function playDemoVideo() {
  await nextTick()

  const video = videoRef.value
  if (!video) {
    return
  }

  video.currentTime = 0

  try {
    await video.play()
  } catch {
    // 浏览器可能拦截自动播放，保留控件供用户手动播放。
  }
}

watch(
  () => props.playRequest,
  (request) => {
    if (!request) {
      return
    }

    void playDemoVideo()
  },
)
</script>

<template>
  <section class="short-video-panel" aria-label="短视频 Beta 预览">
    <header class="short-video-head">
      <div>
        <p class="short-video-eyebrow">Beta 能力</p>
        <h2>{{ shortVideoBetaDemo.title }}</h2>
        <span>{{ shortVideoBetaDemo.subtitle }}</span>
      </div>
    </header>

    <div class="short-video-stage">
      <video
        ref="videoRef"
        class="short-video-player"
        controls
        playsinline
        preload="metadata"
        :poster="shortVideoBetaDemo.poster"
        :src="props.generationResult?.downloadUrl ?? shortVideoBetaDemo.src"
      >
        您的浏览器暂不支持视频播放。
      </video>
    </div>
  </section>
</template>

<style scoped lang="scss">
.short-video-panel {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: clamp(12px, 1.2vw, 14px);
  overflow: hidden;
}

.short-video-head {
  flex-shrink: 0;
}

.short-video-head p,
.short-video-head h2,
.short-video-head span {
  margin: 0;
}

.short-video-eyebrow {
  color: var(--assist-blue);
  font-size: 13px;
  font-weight: 900;
}

.short-video-head h2 {
  margin-top: 6px;
  color: var(--assist-text);
  font-size: clamp(20px, 1.6vw, 28px);
  font-weight: 950;
  line-height: 1.2;
}

.short-video-head span {
  display: block;
  margin-top: 8px;
  color: var(--assist-muted);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.55;
}

.short-video-stage {
  display: flex;
  min-height: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 2px 0;
}

.short-video-player {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  max-height: 100%;
  border: 1px solid var(--assist-border);
  border-radius: 14px;
  background: #0b1220;
  box-shadow: var(--assist-shadow);
  object-fit: contain;
}

</style>
