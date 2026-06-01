<script setup lang="ts">
import PreloadImage from '@/components/common/PreloadImage.vue'
import { homeHeroImageSrc } from '@/constants/home-page'

defineEmits<{
  enterWorkbench: []
}>()
</script>

<template>
  <section id="top" class="hero">
    <div class="hero-copy">
      <p class="eyebrow">AI CAR STUDIO</p>
      <h1>每一辆车，都值得被精心呈现</h1>
      <p>针对汽车电商、出海车商打造的专业内容生产平台</p>
    </div>

    <div class="hero-media" aria-hidden="true">
      <PreloadImage
        class="hero-image"
        :src="homeHeroImageSrc"
        alt=""
        loading="eager"
        fetchpriority="high"
        decoding="async"
        fit="contain"
      />
    </div>

    <div class="hero-action">
      <button type="button" class="button gold" @click="$emit('enterWorkbench')">
        立即体验
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
    radial-gradient(circle at 50% 24%, rgba(121, 115, 105, 0.26), transparent 31rem),
    radial-gradient(circle at 70% 36%, color-mix(in srgb, var(--home-gold) 10%, transparent), transparent 28rem),
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent 34%),
    var(--home-hero-bg);
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
  animation: hero-copy-in 620ms cubic-bezier(0.16, 1, 0.3, 1) both;
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

.eyebrow {
  margin: 0 0 24px;
  color: var(--home-gold);
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-shadow: 0 0 22px color-mix(in srgb, var(--home-gold) 22%, transparent);
}

.hero h1 {
  margin: 0 0 18px;
  color: var(--home-hero-title);
  font-size: clamp(34px, 2.8vw, 55px);
  line-height: 1.08;
  letter-spacing: 0;
  text-shadow: 0 4px 28px rgba(0, 0, 0, 0.42);
}

.hero p:not(.eyebrow) {
  margin: 0;
  color: var(--home-hero-sub);
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

.hero-image {
  position: absolute;
  left: 50%;
  top: clamp(42px, 3.4vw, 66px);
  width: 100%;
  height: 100%;
  max-width: none;
  transform: translateX(-50%);
}

.hero-image :deep(.preload-image__img) {
  object-fit: contain;
  object-position: center center;
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
    transform var(--home-motion-normal),
    filter var(--home-motion-normal),
    box-shadow var(--home-motion-normal),
    background var(--home-motion-normal);
}

.button:hover {
  transform: translateY(-2px);
  filter: saturate(1.08);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.62),
    0 16px 42px color-mix(in srgb, var(--home-gold) 26%, transparent);
}

.button:active {
  transform: translateY(0);
}

.button:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--home-gold) 72%, transparent);
  outline-offset: 4px;
}

.button.gold {
  color: #171100;
  background: linear-gradient(180deg, var(--home-gold-strong), var(--home-gold));
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

  .hero-image {
    width: 980px;
    height: 100%;
    top: 0;
  }
}
</style>
