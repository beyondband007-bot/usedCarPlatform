<script setup lang="ts">
import { onMounted, onUnmounted, ref, inject } from 'vue'
import { useRouter } from 'vue-router'

import PreloadImage from '@/components/common/PreloadImage.vue'
import {
  homePromoBannerIntervalMs,
  homePromoBannerSlides,
  type HomePromoBannerSlide,
} from '@/constants/home-promo-banners'
import { WORKBENCH_ENTRY_KEY } from '@/composables/workbench-entry-key'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const workbenchEntry = inject(WORKBENCH_ENTRY_KEY)
const authStore = useAuthStore()
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

function handleActionClick(slide: HomePromoBannerSlide) {
  if (slide.opensConsultModal) {
    workbenchEntry?.openVisitorModal()
    return
  }

  if (!slide.actionTo) {
    return
  }

  router.push(slide.actionTo)
}

function handleDotClick(index: number) {
  goToSlide(index)

  if (!isPaused.value) {
    stopAutoplay()
    startAutoplay()
  }
}

function shouldShowAction(slide: HomePromoBannerSlide) {
  if (!slide.actionLabel) {
    return false
  }

  if (slide.opensConsultModal && authStore.isLoggedIn) {
    return false
  }

  return true
}

function slideAriaLabel(slide: HomePromoBannerSlide) {
  if (slide.hideCopy) {
    return slide.alt
  }

  const parts = [slide.title, ...(slide.lines ?? [])].filter(Boolean)
  return parts.join('，')
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
        :class="{ 'is-active': index === activeIndex, 'is-image-only': slide.hideCopy }"
        :aria-label="slideAriaLabel(slide)"
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
        <div
          v-if="!slide.hideCopy"
          class="promo-banner-copy"
          :class="{
            'is-overlay-hidden': slide.copyOverlay === false,
            'is-elevated': slide.copyLayout === 'elevated',
            'is-dark-copy': slide.copyTone === 'dark',
          }"
        >
          <h2 v-if="slide.title">{{ slide.title }}</h2>
          <p v-for="line in slide.lines" :key="line">{{ line }}</p>
          <span
            v-if="shouldShowAction(slide)"
            role="button"
            tabindex="0"
            class="promo-banner-action"
            @click.stop="handleActionClick(slide)"
            @keydown.enter.stop.prevent="handleActionClick(slide)"
            @keydown.space.stop.prevent="handleActionClick(slide)"
          >
            {{ slide.actionLabel }}
          </span>
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
        :aria-label="`切换到${slide.alt}`"
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
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 259px;
  padding: 0;
  border: 0;
  border-radius: var(--home-radius-card, 28px);
  overflow: hidden;
  background: var(--home-panel);
  opacity: 0;
  cursor: pointer;
  transition: opacity 500ms ease;
}

.promo-banner-slide.is-image-only {
  cursor: default;
}

.promo-banner-slide.is-active {
  opacity: 1;
  z-index: 1;
}

.promo-banner-slide:not(.is-image-only)::before {
  position: absolute;
  inset: 0;
  z-index: 1;
  content: '';
  background: var(--home-media-overlay-full);
  pointer-events: none;
}

.promo-banner-slide:has(.promo-banner-copy.is-overlay-hidden)::before {
  content: none;
}

.promo-banner-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  isolation: isolate;
  opacity: 0.94;
  border-radius: var(--home-radius-card, 28px);
  transform: translateZ(0);
  backface-visibility: hidden;
}

.promo-banner-image :deep(.preload-image),
.promo-banner-image :deep(.preload-image__img) {
  width: 100%;
  height: 100%;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.promo-banner-image :deep(.preload-image__img) {
  image-rendering: auto;
  object-fit: cover;
  object-position: center;
}

.promo-banner-copy {
  position: relative;
  z-index: 2;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  min-height: 259px;
  max-width: 58%;
  padding: 117px 35px 35px;
  text-align: left;
  background: transparent;
}

.promo-banner-copy h2 {
  margin: 0 0 12px;
  color: var(--home-media-title);
  font-size: 28px;
  font-weight: 700;
  line-height: 1.3;
}

.promo-banner-copy p {
  margin: 0 0 8px;
  color: var(--home-media-desc);
  font-size: 15px;
  line-height: 1.5;
}

.promo-banner-copy p:last-of-type {
  margin-bottom: 0;
}

.promo-banner-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  margin-top: 14px;
  padding: 0 20px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--home-gold-strong), var(--home-gold));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    0 12px 34px rgba(244, 200, 64, 0.18);
  color: #171100;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 900;
}

.promo-banner-action:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--home-gold) 72%, transparent);
  outline-offset: 4px;
}

.promo-banner-copy:not(:has(.promo-banner-action)) p:last-of-type {
  margin-bottom: 0;
}

.promo-banner-copy.is-overlay-hidden {
  background: transparent;
}

.promo-banner-copy.is-elevated {
  justify-content: flex-start;
  padding: 48px 35px 28px;
}

.promo-banner-copy.is-elevated .promo-banner-action {
  margin-top: 16px;
}

.promo-banner-copy.is-dark-copy h2 {
  color: #241a10;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.42);
}

.promo-banner-copy.is-dark-copy p {
  color: #5a4c3c;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.32);
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
    background var(--home-motion-normal, 240ms ease);
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

  .promo-banner-copy {
    max-width: 72%;
    padding: 95px 20px 24px;
  }

  .promo-banner-copy.is-elevated {
    padding: 34px 20px 20px;
  }

  .promo-banner-copy h2 {
    font-size: 22px;
  }

  .promo-banner-copy p {
    font-size: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .promo-banner-slide {
    transition: none;
  }
}
</style>
