<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { motion } from 'motion-v'

import {
  homeMainCapabilities,
  homeSceneChips,
  homeTechItems,
} from '@/constants/home-page'
</script>

<template>
  <section class="home-capabilities" aria-label="全链路能力">
    <div class="home-capabilities-inner">
      <header class="home-capabilities-header">
        <h2>全链路 AI 汽车电商内容生成</h2>
        <p>从单图上传到企业级并发交付，围绕汽车电商素材生产建立稳定工作流</p>
      </header>

      <div class="home-capabilities-main">
        <motion.article
          v-for="(item, index) in homeMainCapabilities"
          :key="item.title"
          :initial="{ opacity: 0, y: 18 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.42, delay: index * 0.06 }"
          class="home-capability-card"
        >
          <img :src="item.image" :alt="item.title" loading="lazy" />
          <div class="home-capability-card-mask">
            <h3>{{ item.title }}</h3>
            <p>{{ item.description }}</p>
          </div>
        </motion.article>
      </div>

      <div class="home-scene-chips">
        <article v-for="chip in homeSceneChips" :key="chip.title" class="home-scene-chip">
          <img :src="chip.image" :alt="chip.title" loading="lazy" />
          <span>{{ chip.title }}</span>
        </article>
      </div>

      <div class="home-tech-bar" aria-label="技术能力">
        <div v-for="item in homeTechItems" :key="item.label" class="home-tech-item">
          <Icon :icon="item.icon" />
          <span>{{ item.label }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.home-capabilities {
  padding: clamp(48px, 6vw, 80px) clamp(20px, 4vw, 48px);
  background: var(--home-section-bg);
}

.home-capabilities-inner {
  max-width: 1280px;
  margin: 0 auto;
}

.home-capabilities-header {
  text-align: center;
}

.home-capabilities-header h2 {
  margin: 0;
  color: var(--home-text);
  font-size: clamp(28px, 3.2vw, 40px);
  font-weight: 950;
}

.home-capabilities-header p {
  max-width: 720px;
  margin: 12px auto 0;
  color: var(--home-muted);
  font-size: 16px;
  line-height: 1.65;
  font-weight: 600;
}

.home-capabilities-main {
  display: grid;
  gap: 16px;
  margin-top: 36px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.home-capability-card {
  position: relative;
  overflow: hidden;
  border-radius: 14px;
  aspect-ratio: 4 / 5;
  background: var(--home-soft);
}

.home-capability-card img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: var(--home-card-image-filter);
}

.home-capability-card-mask {
  position: absolute;
  inset: auto 0 0;
  padding: 16px;
  background: linear-gradient(180deg, transparent, rgba(8, 12, 22, 0.88));
}

.home-capability-card-mask h3 {
  margin: 0;
  color: #fff;
  font-size: 17px;
  font-weight: 900;
}

.home-capability-card-mask p {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
  line-height: 1.5;
  font-weight: 600;
}

.home-scene-chips {
  display: grid;
  gap: 12px;
  margin-top: 16px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.home-scene-chip {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--home-border);
  border-radius: 12px;
  aspect-ratio: 16 / 10;
  background: var(--home-surface);
}

.home-scene-chip img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.home-scene-chip span {
  position: absolute;
  inset: auto 0 0;
  padding: 10px 12px;
  background: linear-gradient(180deg, transparent, rgba(8, 12, 22, 0.82));
  color: #fff;
  font-size: 14px;
  font-weight: 800;
}

.home-tech-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px 24px;
  margin-top: 28px;
  padding: 18px 20px;
  border: 1px solid var(--home-border);
  border-radius: 12px;
  background: var(--home-surface);
}

.home-tech-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--home-muted);
  font-size: 14px;
  font-weight: 700;
}

.home-tech-item :deep(svg) {
  font-size: 20px;
  color: var(--home-blue);
}

@media (max-width: 1024px) {
  .home-capabilities-main,
  .home-scene-chips {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .home-capabilities-main,
  .home-scene-chips {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
