<script setup lang="ts">
import { NButton } from 'naive-ui'
import { motion } from 'motion-v'
</script>

<template>
  <section class="home-bottom-cta" aria-label="预约演示">
    <motion.div
      :initial="{ opacity: 0, y: 16 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.45 }"
      class="home-bottom-cta-inner"
    >
      <h2>企业视觉内容生产，从一套车图开始</h2>
      <p>企业套餐 ¥980 起，账号、积分、图组并发同步开通</p>
      <NButton size="large" class="home-bottom-cta-button">预约演示</NButton>
    </motion.div>
  </section>
</template>

<style scoped lang="scss">
.home-bottom-cta {
  padding: 0 clamp(20px, 4vw, 48px) clamp(48px, 6vw, 72px);
}

.home-bottom-cta-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: clamp(36px, 4vw, 56px) clamp(24px, 4vw, 48px);
  border: 1px solid var(--home-border);
  border-radius: 20px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--home-section-bg) 80%, transparent), var(--home-surface)),
    var(--home-surface);
  text-align: center;
  box-shadow: var(--home-shadow-soft);
}

.home-bottom-cta-inner h2 {
  margin: 0;
  color: var(--home-text);
  font-size: clamp(24px, 3vw, 36px);
  font-weight: 950;
}

.home-bottom-cta-inner > p {
  margin: 14px 0 0;
  color: var(--home-muted);
  font-size: 16px;
  font-weight: 600;
}

.home-bottom-cta-button {
  margin-top: 28px;
  --n-color: var(--home-accent) !important;
  --n-color-hover: #f6d68d !important;
  --n-color-pressed: var(--home-accent-strong) !important;
  --n-text-color: #15120a !important;
  --n-text-color-hover: #15120a !important;
  --n-text-color-pressed: #15120a !important;
  min-width: 160px;
  height: 48px !important;
  border-radius: 8px !important;
  font-size: 16px !important;
  font-weight: 800 !important;
  box-shadow: 0 14px 32px rgba(244, 200, 111, 0.24);
}
</style>
