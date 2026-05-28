<script setup lang="ts">
import { NButton } from 'naive-ui'
import { motion } from 'motion-v'

import { homeHeroImage } from '@/constants/home-page'

defineEmits<{
  enterWorkbench: []
}>()
</script>

<template>
  <section class="home-hero">
    <img class="home-hero-image" :src="homeHeroImage" alt="" />
    <div class="home-hero-overlay" aria-hidden="true"></div>

    <motion.div
      :initial="{ opacity: 0, y: 28 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.62, ease: 'easeOut' }"
      class="home-hero-content"
    >
      <span class="home-hero-kicker">AI CAR STUDIO</span>
      <h1>让每一辆车，<br />都值得被精心呈现</h1>
      <p>针对汽车电商、出海车商打造专业级的内容生成平台</p>
      <div class="home-hero-action">
        <NButton size="large" class="home-primary-button" @click="$emit('enterWorkbench')">
          进入视觉工作台
        </NButton>
      </div>
    </motion.div>
  </section>
</template>

<style scoped lang="scss">
.home-hero {
  position: relative;
  isolation: isolate;
  min-height: clamp(520px, 58vh, 640px);
  overflow: hidden;
  background: #080d16;
}

.home-hero-image,
.home-hero-overlay {
  position: absolute;
  inset: 0;
}

.home-hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 55%;
  filter: saturate(1.1) brightness(0.72);
  transform: scale(1.04);
}

.home-hero-overlay {
  z-index: 1;
  background:
    linear-gradient(90deg, rgba(6, 10, 18, 0.92) 0%, rgba(8, 12, 22, 0.72) 42%, rgba(8, 12, 22, 0.35) 100%),
    linear-gradient(180deg, rgba(4, 8, 14, 0.2) 0%, rgba(4, 8, 14, 0.75) 100%);
}

.home-hero-content {
  position: relative;
  z-index: 2;
  display: flex;
  min-height: clamp(520px, 58vh, 640px);
  max-width: min(780px, 92vw);
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  margin: 0 auto;
  padding: clamp(48px, 6vw, 88px) clamp(24px, 5vw, 64px);
}

.home-hero-kicker {
  display: inline-flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.72);
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.home-hero-content h1 {
  margin: 20px 0 0;
  color: #ffffff;
  font-size: clamp(40px, 5vw, 64px);
  line-height: 1.14;
  font-weight: 950;
  letter-spacing: -0.02em;
}

.home-hero-content > p {
  max-width: 560px;
  margin: 20px 0 0;
  color: rgba(255, 255, 255, 0.78);
  font-size: clamp(16px, 1.6vw, 20px);
  line-height: 1.6;
  font-weight: 600;
}

.home-hero-action {
  margin-top: 36px;
}

.home-primary-button {
  --n-color: var(--home-accent) !important;
  --n-color-hover: #f6d68d !important;
  --n-color-pressed: var(--home-accent-strong) !important;
  --n-color-focus: var(--home-accent) !important;
  --n-border: 1px solid transparent !important;
  --n-border-hover: 1px solid transparent !important;
  --n-border-pressed: 1px solid transparent !important;
  --n-border-focus: 1px solid transparent !important;
  --n-text-color: #15120a !important;
  --n-text-color-hover: #15120a !important;
  --n-text-color-pressed: #15120a !important;
  --n-text-color-focus: #15120a !important;

  min-width: 200px;
  height: 48px !important;
  border-radius: 8px !important;
  font-size: 16px !important;
  font-weight: 800 !important;
  box-shadow: 0 16px 40px rgba(244, 200, 111, 0.28);
}
</style>
