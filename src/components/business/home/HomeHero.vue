<script setup lang="ts">
import { NButton } from 'naive-ui'
import { motion } from 'motion-v'

defineEmits<{
  enterWorkbench: []
}>()
</script>

<template>
  <section class="home-hero">
    <img
      class="home-hero-image"
      src="https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=2200&q=82"
      alt="运动中的黄色跑车"
    />
    <div class="home-hero-overlay" aria-hidden="true"></div>
    <div class="home-hero-line" aria-hidden="true"></div>

    <motion.div
      :initial="{ opacity: 0, y: 28 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.62, ease: 'easeOut' }"
      class="home-hero-content"
    >
      <span class="home-hero-kicker">AI CAR STUDIO</span>
      <h1>
        让每一辆车，<br />都值得被精心呈现
      </h1>
      <p>
        针对汽车电商、出海车商打造专业级的内容生成平台
      </p>
      <div class="home-hero-action">
        <NButton
          size="large"
          round
          class="home-primary-button"
          @click="$emit('enterWorkbench')"
        >
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
  min-height: clamp(560px, 63vh, 680px);
  overflow: hidden;
  border-bottom: 1px solid var(--home-border);
  border-radius: 0 0 32px 32px;
  background: #080d16;
}

.home-hero-image,
.home-hero-overlay,
.home-hero-line {
  position: absolute;
  inset: 0;
}

.home-hero-image {
  width: 100%;
  height: 100%;
  filter: var(--home-hero-image-filter);
  object-fit: cover;
  object-position: center;
  transform: scale(1.02);
}

.home-hero-overlay {
  z-index: 1;
  background: var(--home-hero-overlay);
}

.home-hero-line {
  z-index: 2;
  background:
    linear-gradient(90deg, rgba(244, 200, 111, 0.18), transparent 24%),
    radial-gradient(circle at 21% 44%, rgba(244, 200, 111, 0.16), transparent 28%);
}

.home-hero-content {
  position: relative;
  z-index: 3;
  display: flex;
  min-height: clamp(560px, 63vh, 680px);
  max-width: 780px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: clamp(56px, 7vw, 100px) clamp(28px, 5vw, 84px);
}

.home-hero-kicker {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--home-surface-strong) 64%, transparent);
  color: var(--home-muted);
  padding: 0 16px;
  font-size: 15px;
  font-weight: 900;
  box-shadow: inset 0 0 0 1px var(--home-border);
}

.home-hero-content h1 {
  margin: 30px 0 0;
  color: var(--home-hero-text);
  font-size: clamp(48px, 5.6vw, 86px);
  line-height: 1.12;
  font-weight: 950;
  letter-spacing: 0;
}

.home-hero-content p {
  max-width: 640px;
  margin: 28px 0 0;
  color: var(--home-hero-muted);
  font-size: clamp(23px, 2.1vw, 34px);
  line-height: 1.35;
  font-weight: 900;
}

.home-hero-action {
  margin-top: 44px;
  text-decoration: none;
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

  min-width: 240px;
  height: 54px !important;
  border-radius: 999px !important;
  font-size: 17px !important;
  font-weight: 900 !important;
  box-shadow: 0 18px 44px rgba(244, 200, 111, 0.2);
}

@media (max-width: 880px) {
  .home-hero,
  .home-hero-content {
    min-height: 560px;
  }

  .home-hero-content {
    max-width: 100%;
  }
}
</style>
