<script setup lang="ts">
import { computed } from "vue";

import PreloadImage from "@/components/common/PreloadImage.vue";
import {
  homeHeroImageDarkSrc,
  homeHeroImageLightSrc,
} from "@/constants/home-page";
import { useAppStore } from "@/stores/app";

const appStore = useAppStore();

/** 原图 1672×941，展示纵向 25%~90% 区间 */
const HERO_IMAGE_WIDTH = 1672;
const HERO_IMAGE_HEIGHT = 941;
const HERO_CROP_TOP = 0.25;
const HERO_CROP_BOTTOM = 0.9;
const HERO_CROP_HEIGHT = HERO_CROP_BOTTOM - HERO_CROP_TOP;
const HERO_VIEWPORT_ASPECT = `${HERO_IMAGE_WIDTH} / ${HERO_IMAGE_HEIGHT * HERO_CROP_HEIGHT}`;

const homeHeroImageSrc = computed(() =>
  appStore.isDarkMode ? homeHeroImageDarkSrc : homeHeroImageLightSrc,
);
</script>

<template>
  <section id="top" class="hero" :class="{ 'is-light': !appStore.isDarkMode }">
    <div class="hero-visual">
      <div
        class="hero-media"
        :style="{
          '--hero-crop-top': `${HERO_CROP_TOP * 100}%`,
          aspectRatio: HERO_VIEWPORT_ASPECT,
        }"
      >
        <PreloadImage
          class="hero-image"
          :src="homeHeroImageSrc"
          alt=""
          fit="none"
          loading="eager"
          fetchpriority="high"
          decoding="async"
        />

        <div class="hero-copy">
          <h1>每一辆车，都值得被精心呈现</h1>
          <p class="subtitle">针对汽车电商、出海车商打造的专业内容生产平台</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.hero {
  position: relative;
  width: 100%;
}

.hero-visual {
  overflow: hidden;
  background: var(--home-hero-bg);
}

.hero-media {
  position: relative;
  width: 100%;
  overflow: hidden;
  line-height: 0;
}

.hero-image {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  width: 100%;
}

.hero-image :deep(.preload-image) {
  display: block;
  width: 100%;
  height: auto;
  min-height: 0;
  background: transparent !important;
}

.hero-image :deep(.preload-image__img) {
  display: block;
  width: 100%;
  height: auto;
  object-fit: unset;
  image-rendering: auto;
  transform: translate3d(0, calc(-1 * var(--hero-crop-top, 25%)), 0);
  backface-visibility: hidden;
}

.hero-copy {
  position: absolute;
  z-index: 2;
  top: calc(clamp(56px, 12%, 120px) + 20px);
  right: 0;
  left: 0;
  width: min(900px, calc(100% - 40px));
  margin: 0 auto;
  padding: 0;
  line-height: normal;
  text-align: center;
  pointer-events: none;
  animation: hero-copy-in 620ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.hero h1 {
  margin: 0 0 14px;
  color: var(--home-hero-title, #f3f3f3);
  font-size: clamp(34px, 2.8vw, 55px);
  line-height: 1.08;
  letter-spacing: 0;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.42);
}

.subtitle {
  margin: 0;
  color: var(--home-hero-sub, #d5d5d5);
  font-size: clamp(16px, 1.27vw, 25px);
  line-height: 1.4;
  text-shadow: 0 1px 14px rgba(0, 0, 0, 0.38);
}

.hero.is-light h1 {
  color: #0f172a;
  text-shadow: 0 2px 16px rgba(255, 255, 255, 0.78);
}

.hero.is-light .subtitle {
  color: #475569;
  text-shadow: 0 1px 12px rgba(255, 255, 255, 0.65);
}

@keyframes hero-copy-in {
  from {
    opacity: 0;
    transform: translateY(14px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 700px) {
  .hero-copy {
    top: calc(clamp(48px, 10%, 88px) + 20px);
    width: min(100% - 28px, 900px);
  }

  .hero h1 {
    font-size: 36px;
  }
}
</style>
