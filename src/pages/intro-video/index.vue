<script setup lang="ts">
import { useRouter } from 'vue-router'

import introVideoUrl from '@/assets/video/首页视频.mp4'
import { INTRO_VIDEO_SESSION_KEY, markIntroVideoPlayed } from '@/constants/intro-video'

const router = useRouter()

let hasFinished = false

function finishIntro() {
  if (hasFinished) return
  hasFinished = true

  window.localStorage.removeItem(INTRO_VIDEO_SESSION_KEY)
  markIntroVideoPlayed()
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
      preload="auto"
      @ended="finishIntro"
    />

    <aside class="intro-video-panel" aria-label="进入引导">
      <p class="intro-video-panel__title">进入视觉工作台</p>
      <p class="intro-video-panel__hint">开启您的汽车内容创作之旅</p>
      <div class="intro-video-panel__divider" aria-hidden="true" />
      <button
        type="button"
        class="intro-video-panel__enter"
        @click="finishIntro"
      >
        立即进入 →
      </button>
    </aside>
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
  object-fit: contain;
  background: #000;
}

.intro-video-panel {
  position: fixed;
  right: clamp(18px, 2.4vw, 36px);
  bottom: clamp(18px, 2.4vw, 36px);
  z-index: 1;
  display: grid;
  gap: 10px;
  width: min(100% - 36px, 320px);
  padding: 22px 24px 20px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  background: rgba(18, 18, 18, 0.58);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.34);
}

.intro-video-panel__title {
  margin: 0;
  color: rgba(255, 255, 255, 0.92);
  font-size: 15px;
  font-weight: 800;
  line-height: 1.5;
}

.intro-video-panel__hint {
  margin: 0;
  color: rgba(255, 255, 255, 0.52);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.55;
}

.intro-video-panel__divider {
  height: 1px;
  margin: 2px 0 4px;
  background: rgba(255, 255, 255, 0.1);
}

.intro-video-panel__enter {
  justify-self: start;
  padding: 0;
  border: 0;
  background: transparent;
  color: #efc24c;
  cursor: pointer;
  font-family: inherit;
  font-size: 15px;
  font-weight: 900;
  line-height: 1.4;
  transition: color 0.2s ease, opacity 0.2s ease;
}

.intro-video-panel__enter:hover {
  color: #ffd75a;
}

.intro-video-panel__enter:focus-visible {
  outline: 2px solid rgba(239, 194, 76, 0.72);
  outline-offset: 3px;
  border-radius: 4px;
}

@media (max-width: 640px) {
  .intro-video-panel {
    right: 16px;
    bottom: 16px;
    width: min(100% - 32px, 300px);
    padding: 18px 18px 16px;
  }

  .intro-video-panel__title {
    font-size: 14px;
  }
}
</style>
