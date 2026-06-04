<script setup lang="ts">
import { computed } from "vue";

import PreloadImage from "@/components/common/PreloadImage.vue";
import {
  homeHeroImageDarkSrc,
  homeHeroImageLightSrc,
} from "@/constants/home-page";
import { useAppStore } from "@/stores/app";

const appStore = useAppStore();

const homeHeroImageSrc = computed(() =>
  appStore.isDarkMode ? homeHeroImageDarkSrc : homeHeroImageLightSrc,
);
</script>

<template>
  <section id="top" class="hero" :class="{ 'is-light': !appStore.isDarkMode }">
    <div class="hero-visual">
      <div class="hero-media">
        <PreloadImage
          class="hero-image"
          :src="homeHeroImageSrc"
          alt=""
          fit="cover"
          object-position="center 52%"
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
  margin-bottom: var(--home-hero-bottom-gap, 24px);
}

.hero-visual {
  width: 100%;
  overflow: hidden;
  background: var(--home-hero-bg);
}

.hero-media {
  container-type: size;
  container-name: hero-media;
  position: relative;
  width: 100%;
  height: calc(
    100dvh - var(--app-header-offset, 72px) - var(--home-suite-peek, calc(259px / 3)) -
      var(--home-hero-bottom-gap, 24px) - var(--home-suite-top-gap, 24px)
  );
  min-height: 420px;
  line-height: 0;
  --hero-text-top: max(18%, calc(var(--app-header-offset, 72px) + 16px));
  --hero-car-top: 56%;
  --hero-text-car-gap: 24px;
}

.hero-image {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.hero-image :deep(.preload-image) {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 100%;
  background: transparent !important;
}

.hero-image :deep(.preload-image__img) {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 100%;
  object-fit: cover;
  object-position: center 52%;
  image-rendering: auto;
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
  width: min(900px, calc(100% - 40px));
  max-height: calc(
    var(--hero-car-top) - var(--hero-text-top) - var(--hero-text-car-gap)
  );
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
  font-size: clamp(22px, 2.2cqw, 46px);
  line-height: 1.12;
  letter-spacing: 0;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.42);
}

.subtitle {
  margin: 0;
  color: var(--home-hero-sub, #d5d5d5);
  font-size: clamp(14px, 0.92cqw, 20px);
  line-height: 1.35;
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

@media (max-width: 700px) {
  .hero-copy {
    width: min(100% - 28px, 900px);
  }
}

@media (min-width: 1600px) {
  .hero-media {
    --hero-text-top: max(15%, calc(var(--app-header-offset, 72px) + 16px));
    --hero-car-top: 50%;
    --hero-text-car-gap: 48px;
  }

  .hero h1 {
    margin-bottom: 24px;
    font-size: clamp(27px, 4.8cqh, 54px);
    font-weight: 800;
  }

  .subtitle {
    font-size: clamp(19px, 1.85cqh, 25px);
  }
}
</style>
