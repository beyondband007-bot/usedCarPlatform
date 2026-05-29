<script setup lang="ts">
import { useRouter } from 'vue-router'

import introVideoUrl from '@/assets/video/首页视频.mp4'

const INTRO_VIDEO_STORAGE_KEY = 'used-car-platform:intro-video-played'

const router = useRouter()

function finishIntro() {
  window.localStorage.setItem(INTRO_VIDEO_STORAGE_KEY, 'true')
  router.replace('/home')
}
</script>

<template>
  <main class="intro-video-page">
    <video
      class="intro-video-page__video"
      :src="introVideoUrl"
      autoplay
      playsinline
      muted
      @ended="finishIntro"
    />

    <button class="intro-video-page__skip" type="button" @click="finishIntro">
      结束播放
    </button>
  </main>
</template>

<style scoped lang="scss">
.intro-video-page {
  position: fixed;
  inset: 0;
  z-index: 9999;
  overflow: hidden;
  background: #000;
}

.intro-video-page__video {
  display: block;
  width: 100vw;
  height: 100vh;
  object-fit: cover;
  background: #000;
}

.intro-video-page__skip {
  position: fixed;
  top: 28px;
  right: 28px;
  z-index: 1;
  min-width: 96px;
  height: 40px;
  padding: 0 18px;
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 4px;
  color: #fff;
  font-size: 14px;
  line-height: 1;
  background: rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(12px);
  transition:
    background 160ms ease,
    border-color 160ms ease;
}

.intro-video-page__skip:hover {
  border-color: rgba(255, 255, 255, 0.78);
  background: rgba(0, 0, 0, 0.62);
}

.intro-video-page__skip:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.9);
  outline-offset: 3px;
}

@media (max-width: 640px) {
  .intro-video-page__skip {
    top: 18px;
    right: 18px;
    height: 38px;
    min-width: 88px;
    padding: 0 14px;
  }
}
</style>
