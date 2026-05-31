<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import PreloadImage from '@/components/common/PreloadImage.vue'
import {
  homePromoBannerIntervalMs,
  homePromoBannerSlides,
  type HomePromoBannerSlide,
} from '@/constants/home-promo-banners'

const router = useRouter()
const activeIndex = ref(0)
const isPaused = ref(false)
const prefersReducedMotion = ref(false)

let timer: ReturnType<typeof setInterval> | null = null

function goToSlide(index: number) {
  activeIndex.value = (index + homePromoBannerSlides.length) % homePromoBannerSlides.length
}

function nextSlide() {
  goToSlide(activeIndex.value + 1)
}

function startAutoplay() {
  stopAutoplay()

  if (prefersReducedMotion.value || homePromoBannerSlides.length <= 1) {
    return
  }

  timer = setInterval(() => {
    nextSlide()
  }, homePromoBannerIntervalMs)
}

function stopAutoplay() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function handleMouseEnter() {
  isPaused.value = true
  stopAutoplay()
}

function handleMouseLeave() {
  isPaused.value = false
  startAutoplay()
}

function handleSlideClick(slide: HomePromoBannerSlide) {
  if (!slide.to) {
    return
  }

  router.push(slide.to)
}

function handleDotClick(index: number) {
  goToSlide(index)

  if (!isPaused.value) {
    stopAutoplay()
    startAutoplay()
  }
}

onMounted(() => {
  prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  startAutoplay()
})

onUnmounted(() => {
  stopAutoplay()
})
</script>

<template>
  <article
    class="promo-banner suite-card"
    aria-label="海报轮播"
    aria-roledescription="carousel"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @focusin="handleMouseEnter"
    @focusout="handleMouseLeave"
  >
    <div class="promo-banner-track">
      <button
        v-for="(slide, index) in homePromoBannerSlides"
        :key="slide.id"
        type="button"
        class="promo-banner-slide"
        :class="{ 'is-active': index === activeIndex }"
        :aria-label="`${slide.title}：${slide.subtitle ?? ''}`"
        :aria-current="index === activeIndex ? 'true' : undefined"
        @click="handleSlideClick(slide)"
      >
        <PreloadImage
          class="promo-banner-image"
          :src="slide.image"
          :alt="slide.alt"
          loading="lazy"
          decoding="async"
        />
        <div class="promo-banner-copy">
          <h2>{{ slide.title }}</h2>
          <p v-if="slide.subtitle">{{ slide.subtitle }}</p>
        </div>
      </button>
    </div>

    <div class="promo-banner-dots" role="tablist" aria-label="海报切换">
      <button
        v-for="(slide, index) in homePromoBannerSlides"
        :key="`${slide.id}-dot`"
        type="button"
        class="promo-banner-dot"
        :class="{ 'is-active': index === activeIndex }"
        role="tab"
        :aria-selected="index === activeIndex"
        :aria-label="`切换到${slide.title}`"
        @click="handleDotClick(index)"
      />
    </div>
  </article>
</template>

<style scoped lang="scss">
.promo-banner {
  position: relative;
  min-height: 259px;
  padding: 0;
  cursor: default;
}

.promo-banner-track {
  position: relative;
  width: 100%;
  min-height: 259px;
}

.promo-banner-slide {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  min-height: 259px;
  padding: 0;
  border: 0;
  border-radius: var(--home-radius-card, 28px);
  overflow: hidden;
  background: var(--home-panel);
  opacity: 0;
  cursor: pointer;
  transform: scale(1.01);
  transition:
    opacity 500ms ease,
    transform 500ms ease;
}

.promo-banner-slide.is-active {
  opacity: 1;
  z-index: 1;
  transform: scale(1);
}

.promo-banner-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.94;
  border-radius: var(--home-radius-card, 28px);
  transition: transform var(--home-motion-normal, 240ms ease);
}

.promo-banner:hover .promo-banner-image {
  transform: scale(1.03);
}

.promo-banner-copy {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  min-height: 259px;
  padding: 35px;
  text-align: left;
  background: var(--home-media-overlay);
}

.promo-banner-copy h2 {
  margin: 0 0 12px;
  color: var(--home-media-title);
  font-size: 22px;
}

.promo-banner-copy p {
  margin: 0 0 40px;
  color: var(--home-media-desc);
  font-size: 13px;
}

.promo-banner-dots {
  position: absolute;
  right: 24px;
  bottom: 20px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 14px;
}

.promo-banner-dot {
  width: 8px;
  height: 8px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.28);
  cursor: pointer;
  transition:
    width var(--home-motion-normal, 240ms ease),
    background var(--home-motion-normal, 240ms ease),
    opacity var(--home-motion-normal, 240ms ease);
}

.promo-banner-dot:hover {
  opacity: 0.78;
}

.promo-banner-dot:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--home-gold) 70%, transparent);
  outline-offset: 4px;
}

.promo-banner-dot.is-active {
  width: 22px;
  background: var(--home-gold, #f4c840);
}

@media (max-width: 700px) {
  .promo-banner,
  .promo-banner-track,
  .promo-banner-slide,
  .promo-banner-copy {
    min-height: 210px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .promo-banner-slide {
    transition: none;
  }
}
</style>
