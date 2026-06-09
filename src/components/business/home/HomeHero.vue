<script setup lang="ts">
import { computed, ref } from "vue";
import type { CSSProperties } from "vue";

import ContactSupportModal from "@/components/business/home/ContactSupportModal.vue";
import PreloadImage from "@/components/common/PreloadImage.vue";
import {
  HOME_HERO_H5_LIGHT_ASPECT,
  homeHeroImageDarkSrc,
  homeHeroImageLightH5Src,
  homeHeroImageLightSrc,
} from "@/constants/home-page";
import { useAppStore } from "@/stores/app";
import { isH5ViewportRef } from "@/utils/browser-env";

/** 容器宽高比保持原图 25% ~ 100% 区间的比例（不改变 hero 高度） */
const HERO_IMAGE_WIDTH = 1672;
const HERO_IMAGE_HEIGHT = 941;
const HERO_IMAGE_CROP_START = 25;
const HERO_IMAGE_CROP_END = 100;
const HERO_IMAGE_CROP_SPAN =
  (HERO_IMAGE_CROP_END - HERO_IMAGE_CROP_START) / 100;
const HERO_VISIBLE_HEIGHT = HERO_IMAGE_HEIGHT * HERO_IMAGE_CROP_SPAN;
const HERO_VIEWPORT_ASPECT = `${HERO_IMAGE_WIDTH} / ${HERO_VISIBLE_HEIGHT}`;

/** 实际展示的背景图垂直区间（仅影响背景图内容，不影响 hero 高度，且不缩放图片） */
const HERO_DISPLAY_CROP_START = 15;
const HERO_DISPLAY_CROP_END = 75;
const HERO_DISPLAY_CROP_SPAN =
  (HERO_DISPLAY_CROP_END - HERO_DISPLAY_CROP_START) / 100;

/**
 * 车顶在“原始整图”中的垂直位置（百分比）。
 * 用于把车顶位置换算到当前裁切后的 hero 容器坐标，从而精确控制文案与车身的间距。
 */
const HERO_CAR_ROOF_IN_IMAGE = 38;
/** 车顶在当前 hero 容器中的相对位置（%） */
const HERO_CAR_ROOF_LINE = (
  ((HERO_CAR_ROOF_IN_IMAGE - HERO_DISPLAY_CROP_START) /
    (HERO_DISPLAY_CROP_SPAN * 100)) *
  100
).toFixed(2);

const appStore = useAppStore();
const supportModalVisible = ref(false);

const isH5LightHero = computed(
  () => !appStore.isDarkMode && isH5ViewportRef.value,
);

const homeHeroImageSrc = computed(() => {
  if (isH5LightHero.value) {
    return homeHeroImageLightH5Src;
  }

  return appStore.isDarkMode ? homeHeroImageDarkSrc : homeHeroImageLightSrc;
});

const heroViewportAspect = computed(() =>
  isH5LightHero.value ? HOME_HERO_H5_LIGHT_ASPECT : HERO_VIEWPORT_ASPECT,
);

/**
 * 仅展示原图 25% ~ 75% 高度的区域，且不缩放图片本身：
 * 图片按原始宽高比铺满容器宽度（height auto），再向上平移裁掉顶部 25%，
 * 容器高度负责裁掉底部，从而只露出 25% ~ 75% 的区间。
 */
const heroImageStyle = computed((): CSSProperties => {
  if (isH5LightHero.value) {
    return {
      width: "100%",
      height: "auto",
      display: "block",
    };
  }

  return {
    width: "100%",
    height: "auto",
    transform: `translateY(-${HERO_DISPLAY_CROP_START}%)`,
  };
});
</script>

<template>
  <section id="top" class="hero" :class="{ 'is-light': !appStore.isDarkMode }">
    <div
      class="hero-intro"
      :style="{ '--hero-car-roof-line': `${HERO_CAR_ROOF_LINE}%` }"
    >
      <div class="hero-copy">
        <span class="hero-eyebrow">AI CAR STUDIO</span>
        <h1>每一辆车，都值得被精心呈现</h1>
        <p class="subtitle">
          AI 场景图、精修图、成片交付，让车源展示更专业、更有质感
        </p>
      </div>
      <button
        type="button"
        class="hero-contact-btn"
        @click="supportModalVisible = true"
      >
        获取方案
      </button>
    </div>

    <div
      class="hero-visual"
      :style="{ '--hero-aspect-ratio': heroViewportAspect }"
    >
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
      </div>
    </div>

    <ContactSupportModal v-model:show="supportModalVisible" />
  </section>
</template>

<style scoped lang="scss">
.hero {
  position: relative;
  display: grid;
  width: 100%;
  flex-shrink: 0;
  margin-bottom: 0;
  grid-template-areas: "visual";
}

.hero-intro {
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  grid-area: visual;
  width: fit-content;
  max-width: calc(100% - 40px);
  margin: 0 auto;
  pointer-events: none;
  animation: hero-copy-in 620ms cubic-bezier(0.16, 1, 0.3, 1) both;
  /* 文案占据「菜单栏下方」到「车顶」之间的区域，并在其中垂直居中 */
  align-self: start;
  justify-self: center;
  height: calc(var(--hero-car-roof-line, 42%) - var(--app-header-offset, 72px));
  margin-top: var(--app-header-offset, 72px);
  --hero-car-roof-line: 42%;
}

.hero-visual {
  grid-area: visual;
  width: 100%;
  height: auto;
  aspect-ratio: var(--hero-aspect-ratio);
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
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  overflow: hidden;
  padding: 0;
  line-height: normal;
  text-align: center;
}

.hero-contact-btn {
  display: none;
}

.hero-eyebrow {
  margin: 0 0 clamp(8px, 1.4cqh, 16px);
  color: var(--home-gold, #efc24c);
  font-size: 15px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 4px;
  white-space: nowrap;
  text-transform: uppercase;
  text-shadow: 0 1px 12px rgba(0, 0, 0, 0.42);
}

.hero h1 {
  margin: 0 0 clamp(6px, 1cqh, 12px);
  color: var(--home-hero-title, #f3f3f3);
  font-size: 45px;
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: 5px;
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

.hero.is-light .hero-contact-btn {
  color: #ffffff;
  background: #000000;
  box-shadow: none;
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
    font-size: 45px;
  }

  .subtitle {
    font-size: clamp(14px, 1.85cqh, 20px);
  }
}

@supports not (width: 1cqw) {
  .hero h1 {
    font-size: 45px;
  }

  .subtitle {
    font-size: clamp(14px, 0.92vw, 20px);
  }
}

@media (max-width: 767px) {
  .hero {
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--home-hero-bg);
  }

  .hero.is-light {
    display: grid;
    background: transparent;
    grid-template-areas: "visual";
  }

  .hero-intro {
    position: relative;
    z-index: 2;
    display: flex;
    box-sizing: border-box;
    width: 100%;
    max-width: none;
    min-height: 0;
    height: auto;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 16px;
    margin-top: 0;
    margin-bottom: 0;
    padding: calc(var(--app-header-offset, 64px) + 24px) 18px 18px;
    background: linear-gradient(
      180deg,
      #0a0c10 0%,
      #121820 52%,
      #1a2230 100%
    );
    pointer-events: auto;
    animation: none;
  }

  .hero.is-light .hero-intro {
    grid-area: visual;
    align-self: start;
    justify-self: center;
    width: 100%;
    max-width: none;
    height: auto;
    min-height: 0;
    margin-top: 0;
    background: transparent;
  }

  .hero:not(.is-light) .hero-intro::after {
    position: absolute;
    right: 0;
    bottom: -18px;
    left: 0;
    height: 18px;
    content: "";
    pointer-events: none;
    background: linear-gradient(to bottom, #1a2230, transparent);
  }

  .hero-copy {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: none;
    gap: 0;
  }

  .hero-contact-btn {
    position: relative;
    z-index: 1;
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: auto;
    min-width: 72px;
    height: 24px;
    min-height: 24px;
    margin-top: 0;
    padding: 0 12px;
    border: 0;
    border-radius: 999px;
    color: #1b1b1b;
    background: linear-gradient(135deg, #f6c84f 0%, #e8a91a 100%);
    box-shadow: 0 4px 10px rgba(232, 169, 26, 0.22);
    cursor: pointer;
    font-family: "PingFang SC", sans-serif;
    font-size: 12px;
    font-weight: 600;
    transition:
      transform 0.22s ease,
      filter 0.22s ease;
  }

  .hero-contact-btn:active {
    transform: scale(0.98);
    filter: saturate(1.03);
  }

  .hero-visual {
    position: relative;
    z-index: 1;
    flex-shrink: 0;
    width: 100%;
    height: auto;
    max-height: none;
    min-height: 0;
    aspect-ratio: var(--hero-aspect-ratio);
    background: #1a2230;
  }

  .hero.is-light .hero-visual {
    grid-area: visual;
    z-index: 1;
    width: 100%;
    height: auto;
    max-height: none;
    min-height: 0;
    margin-bottom: 8px;
    aspect-ratio: var(--hero-aspect-ratio);
    background: transparent;
  }

  .hero.is-light .hero-media {
    height: auto;
  }

  .hero.is-light .hero-image {
    position: static;
    width: 100%;
    height: auto;
  }

  .hero.is-light .hero-image :deep(.preload-image) {
    position: static;
    width: 100%;
    height: auto;
  }

  .hero.is-light .hero-image :deep(.preload-image__img) {
    position: static;
    width: 100%;
    height: auto;
    object-fit: contain;
    object-position: center;
  }

  .hero-eyebrow {
    display: none;
  }

  .hero h1 {
    margin-bottom: 4px;
    font-size: clamp(20px, 5.8vw, 26px);
    letter-spacing: 1px;
    line-height: 1.25;
    white-space: normal;
  }

  .subtitle {
    font-size: clamp(12px, 3.2vw, 14px);
    line-height: 1.45;
    white-space: normal;
  }

  .hero.is-light h1 {
    margin: 0 0 8px;
    color: #071b3a;
    font-size: 21px;
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: 0.2px;
    text-shadow: none;
  }

  .hero.is-light .subtitle {
    margin: 0;
    color: #5e7188;
    font-size: 12px;
    line-height: 1.6;
    text-shadow: none;
  }
}

@media (min-width: 1440px) {
  .hero h1 {
    margin-bottom: clamp(12px, 2cqh, 24px);
    font-size: 45px;
  }

  .subtitle {
    font-size: clamp(16px, 1.55cqh, 20px);
  }
}

@media (min-width: 1600px) {
  .hero h1 {
    font-size: 45px;
  }

  .subtitle {
    font-size: clamp(16px, 1.85cqh, 25px);
  }
}

@media (max-height: 820px) and (min-width: 768px) {
  .hero h1 {
    font-size: 45px;
  }

  .subtitle {
    font-size: clamp(13px, 1.6cqh, 17px);
  }
}
</style>
