<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'

import { homeHeroPosterSrc, homeHeroVideoSrc } from '@/constants/home-page'

defineEmits<{
  enterWorkbench: []
}>()

const heroRef = useTemplateRef<HTMLElement>('heroRef')
const videoRef = useTemplateRef<HTMLVideoElement>('videoRef')
const shouldLoadVideo = ref(false)
const isVideoReady = ref(false)
const prefersReducedMotion = ref(false)

let observer: IntersectionObserver | null = null

async function playHeroVideo() {
  const video = videoRef.value
  if (!video || prefersReducedMotion.value) {
    return
  }

  try {
    await video.play()
  } catch {
    // Autoplay may be blocked; poster remains visible until user interaction.
  }
}

function handleVideoReady() {
  isVideoReady.value = true
}

onMounted(() => {
  prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const root = heroRef.value
  if (!root || prefersReducedMotion.value) {
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) {
        return
      }

      shouldLoadVideo.value = true
      observer?.disconnect()
      observer = null
    },
    {
      rootMargin: '120px 0px',
      threshold: 0.01,
    },
  )

  observer.observe(root)
})

watch(shouldLoadVideo, async (load) => {
  if (!load) {
    return
  }

  await nextTick()
  await playHeroVideo()
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<template>
  <section id="top" ref="heroRef" class="hero">
    <div class="hero-copy">
      <p class="eyebrow">AI CAR STUDIO</p>
      <h1>让每一辆车，都值得被精心呈现</h1>
      <p>针对汽车电商、出海商朝打造专业级的内容生成平台</p>
    </div>

    <div class="hero-media" aria-hidden="true">
      <img
        class="hero-poster"
        :class="{ 'is-hidden': isVideoReady }"
        :src="homeHeroPosterSrc"
        alt=""
        fetchpriority="high"
        decoding="async"
      />
      <video
        v-if="shouldLoadVideo"
        ref="videoRef"
        class="hero-video"
        :class="{ 'is-ready': isVideoReady }"
        muted
        loop
        playsinline
        autoplay
        preload="none"
        :poster="homeHeroPosterSrc"
        @loadeddata="handleVideoReady"
        @canplay="handleVideoReady"
      >
        <source :src="homeHeroVideoSrc" type="video/mp4" />
      </video>
    </div>

    <div class="hero-action">
      <button type="button" class="button gold" @click="$emit('enterWorkbench')">
        进入视觉工作台
      </button>
    </div>
  </section>
</template>

<style scoped lang="scss">
.hero {
  position: relative;
  height: clamp(680px, 56.28vw, 1107px);
  min-height: 0;
  padding-top: clamp(148px, 11.3vw, 222px);
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 26%, rgba(121, 115, 105, 0.3), transparent 31rem),
    radial-gradient(circle at 70% 36%, rgba(244, 200, 64, 0.08), transparent 28rem),
    #080808;
}

.hero::after {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  height: 220px;
  content: '';
  background: linear-gradient(to bottom, transparent, var(--home-bg) 84%);
  pointer-events: none;
}

.hero-copy {
  position: relative;
  z-index: 3;
  width: min(900px, calc(100% - 40px));
  margin: 0 auto;
  text-align: center;
}

.eyebrow {
  margin: 0 0 24px;
  color: var(--home-gold);
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.hero h1 {
  margin: 0 0 18px;
  color: #f3f3f3;
  font-size: clamp(34px, 2.8vw, 55px);
  line-height: 1.08;
  letter-spacing: 0;
}

.hero p:not(.eyebrow) {
  margin: 0;
  color: #d5d5d5;
  font-size: clamp(16px, 1.27vw, 25px);
}

.hero-action {
  position: absolute;
  left: 50%;
  bottom: clamp(36px, 4.2vw, 68px);
  z-index: 3;
  transform: translateX(-50%);
}

.hero-action .button {
  min-height: 56px;
  padding: 0 40px;
  font-size: 16px;
}

.hero-media {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
}

.hero-poster,
.hero-video {
  position: absolute;
  left: 50%;
  top: clamp(42px, 3.4vw, 66px);
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: cover;
  object-position: center center;
  transform: translateX(-50%);
}

.hero-poster {
  transition: opacity 0.45s ease;
}

.hero-poster.is-hidden {
  opacity: 0;
}

.hero-video {
  opacity: 0;
  transition: opacity 0.45s ease;
}

.hero-video.is-ready {
  opacity: 1;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 24px;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 900;
  transition:
    transform 0.22s ease,
    filter 0.22s ease,
    box-shadow 0.22s ease;
}

.button:hover {
  transform: translateY(-2px);
  filter: saturate(1.08);
}

.button:active {
  transform: translateY(0);
}

.button.gold {
  color: #171100;
  background: linear-gradient(180deg, var(--home-gold-strong), #e9b82c);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    0 12px 34px rgba(244, 200, 64, 0.18);
}

@media (max-width: 1100px) {
  .hero {
    height: 720px;
    padding-top: 144px;
  }
}

@media (max-width: 700px) {
  .hero {
    height: 620px;
    padding-top: 120px;
  }

  .hero-copy {
    width: min(100% - 28px, 900px);
  }

  .hero h1 {
    font-size: 36px;
  }

  .hero-action {
    bottom: 32px;
    width: calc(100% - 28px);
  }

  .hero-action .button {
    width: 100%;
    min-height: 52px;
    padding: 0 32px;
    font-size: 15px;
  }

  .hero-poster,
  .hero-video {
    width: 980px;
    height: 100%;
    top: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-video {
    display: none;
  }

  .hero-poster {
    opacity: 1 !important;
  }
}
</style>
