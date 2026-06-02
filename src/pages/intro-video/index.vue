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

    <button
      type="button"
      class="intro-video-skip"
      aria-label="跳过视频"
      @click="finishIntro"
    >
      跳过
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
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  background: #000;
}

.intro-video-skip {
  position: fixed;
  top: clamp(18px, 2.4vw, 32px);
  right: clamp(18px, 2.4vw, 32px);
  z-index: 1;
  padding: 10px 20px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  background: rgba(18, 18, 18, 0.48);
  backdrop-filter: blur(12px);
  color: rgba(255, 255, 255, 0.88);
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.02em;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.intro-video-skip:hover {
  background: rgba(28, 28, 28, 0.62);
  border-color: rgba(255, 255, 255, 0.22);
  color: #fff;
}

.intro-video-skip:focus-visible {
  outline: 2px solid rgba(239, 194, 76, 0.72);
  outline-offset: 3px;
}

@media (max-width: 640px) {
  .intro-video-skip {
    top: 16px;
    right: 16px;
    padding: 9px 18px;
    font-size: 13px;
  }
}
</style>
