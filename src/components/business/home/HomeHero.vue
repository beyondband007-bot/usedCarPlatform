<script setup lang="ts">
import { computed } from "vue";
import type { CSSProperties } from "vue";

import PreloadImage from "@/components/common/PreloadImage.vue";
import {
  homeHeroImageDarkSrc,
  homeHeroImageLightSrc,
} from "@/constants/home-page";
import { useAppStore } from "@/stores/app";

/** 背景图仅展示原图垂直 25% ~ 100% 区间 */
const HERO_IMAGE_WIDTH = 1672;
const HERO_IMAGE_HEIGHT = 941;
const HERO_IMAGE_CROP_START = 25;
const HERO_IMAGE_CROP_END = 100;
const HERO_IMAGE_CROP_SPAN = (HERO_IMAGE_CROP_END - HERO_IMAGE_CROP_START) / 100;
const HERO_VISIBLE_HEIGHT = HERO_IMAGE_HEIGHT * HERO_IMAGE_CROP_SPAN;
const HERO_VIEWPORT_ASPECT = `${HERO_IMAGE_WIDTH} / ${HERO_VISIBLE_HEIGHT}`;

const appStore = useAppStore();

const homeHeroImageSrc = computed(() =>
  appStore.isDarkMode ? homeHeroImageDarkSrc : homeHeroImageLightSrc,
);

const heroImageStyle = computed(
  (): CSSProperties => ({
    width: "100%",
    height: `${100 / HERO_IMAGE_CROP_SPAN}%`,
    minHeight: `${100 / HERO_IMAGE_CROP_SPAN}%`,
    objectFit: "cover",
    objectPosition: "center 31%",
    transform: `translateY(-${HERO_IMAGE_CROP_START}%)`,
  }),
);
</script>

<template>
  <section id="top" class="hero" :class="{ 'is-light': !appStore.isDarkMode }">
    <div class="hero-visual" :style="{ aspectRatio: HERO_VIEWPORT_ASPECT }">
      <div class="hero-media">
        <PreloadImage
          class="hero-image"
          :src="homeHeroImageSrc"
          alt=""
          fit="cover"
          object-position="center top"
          :img-style="heroImageStyle"
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
  flex-shrink: 0;
  margin-bottom: 0;
}

.hero-visual {
  width: 100%;
  height: auto;
  max-height: calc(100dvh - var(--app-header-offset, 72px));
  overflow: hidden;
  background: var(--home-hero-bg);
}

.hero-media {
  container-type: size;
  container-name: hero-media;
  position: relative;
  width: 100%;
  height: 100%;
  line-height: 0;
  --hero-car-roof-line: 42%;
  --hero-text-gap: clamp(30px, 4.2cqh, 56px);
  --hero-text-top: calc(var(--app-header-offset, 72px) + var(--hero-text-gap));
  --hero-text-car-gap: clamp(12px, 2.5cqh, 28px);
}

.hero-image {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: block;
  overflow: hidden;
  width: 100%;
  height: 100%;
}

.hero-image :deep(.preload-image) {
  display: block;
  overflow: hidden;
  width: 100%;
  height: 100%;
  background: transparent !important;
}

.hero-copy {
  position: absolute;
  z-index: 2;
  top: var(--hero-text-top);
  right: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  width: fit-content;
  max-width: calc(100% - 40px);
  max-height: calc(
    var(--hero-car-roof-line, 42%) - var(--hero-text-top) -
      var(--hero-text-car-gap)
  );
  overflow: hidden;
  margin: 0 auto;
  padding: 0;
  line-height: normal;
  text-align: center;
  pointer-events: none;
  animation: hero-copy-in 620ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.hero h1 {
  margin: 0 0 clamp(6px, 1cqh, 12px);
  color: var(--home-hero-title, #f3f3f3);
  font-size: clamp(22px, 4.8cqh, 46px);
  line-height: 1.12;
  letter-spacing: 0;
  white-space: nowrap;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.42);
}

.subtitle {
  margin: 0;
  color: var(--home-hero-sub, #d5d5d5);
  font-size: clamp(14px, 1.85cqh, 20px);
  line-height: 1.35;
  white-space: nowrap;
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

@supports (width: 1cqw) {
  .hero h1 {
    font-size: clamp(22px, 4.8cqh, 46px);
  }

  .subtitle {
    font-size: clamp(14px, 1.85cqh, 20px);
  }
}

@supports not (width: 1cqw) {
  .hero h1 {
    font-size: clamp(22px, 2.2vw, 46px);
  }

  .subtitle {
    font-size: clamp(14px, 0.92vw, 20px);
  }
}

@media (max-width: 1279px) {
  .hero-media {
    --hero-car-roof-line: 40%;
  }
}

@media (max-width: 1023px) {
  .hero-media {
    --hero-car-roof-line: 38%;
  }
}

@media (max-width: 767px) {
  .hero-media {
    --hero-car-roof-line: 36%;
  }

  .hero-copy {
    width: min(100% - (var(--home-space-x, 16px) * 2), 900px);
    max-width: calc(100% - (var(--home-space-x, 16px) * 2));
  }

  .hero h1,
  .subtitle {
    white-space: normal;
  }

  .hero h1 {
    font-size: clamp(20px, 5.2vw, 28px);
  }

  .subtitle {
    font-size: clamp(13px, 3.6vw, 16px);
  }
}

@media (min-width: 1440px) {
  .hero-media {
    --hero-car-roof-line: 44%;
    --hero-text-car-gap: clamp(16px, 2.8cqh, 36px);
  }

  .hero h1 {
    margin-bottom: clamp(12px, 2cqh, 24px);
    font-size: clamp(28px, 4.2cqh, 46px);
    font-weight: 800;
  }

  .subtitle {
    font-size: clamp(16px, 1.55cqh, 20px);
  }
}

@media (min-width: 1600px) {
  .hero h1 {
    font-size: clamp(28px, 4.2cqh, 54px);
  }

  .subtitle {
    font-size: clamp(16px, 1.85cqh, 25px);
  }
}

@media (max-height: 820px) {
  .hero-media {
    --hero-car-roof-line: 40%;
    --hero-text-gap: clamp(24px, 3.5cqh, 48px);
  }

  .hero h1 {
    font-size: clamp(20px, 4.2cqh, 36px);
  }

  .subtitle {
    font-size: clamp(13px, 1.6cqh, 17px);
  }
}
</style>
