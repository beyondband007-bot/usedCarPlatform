<script setup lang="ts">
import { motion } from 'motion-v'

const steps = [
  { title: '上传车图', desc: '外观、内饰、Logo 素材统一进入工作台' },
  { title: '选择场景', desc: '白棚、户外、道路动态和天空影棚快速切换' },
  { title: '生成素材', desc: 'AI 处理光污、烤漆、裁切和详情页素材' },
  { title: '成片交付', desc: '批量结果按比例流式交付，可集中下载' },
]
</script>

<template>
  <section class="home-workflow">
    <motion.div
      :initial="{ opacity: 0, y: 20 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.22 }"
      class="home-workflow-inner"
    >
      <h2>全链路 AI 汽车电商内容生成</h2>
      <p>
        从单图上传到企业级并发交付，围绕汽车电商素材生产建立稳定工作流。
      </p>

      <div class="home-workflow-grid">
        <article v-for="(step, index) in steps" :key="step.title">
          <span>0{{ index + 1 }}</span>
          <h3>{{ step.title }}</h3>
          <p>{{ step.desc }}</p>
          <div class="workflow-bar">
            <i :style="{ width: `${(index + 1) * 25}%` }"></i>
          </div>
        </article>
      </div>
    </motion.div>
  </section>
</template>

<style scoped lang="scss">
.home-workflow {
  padding: 14px clamp(22px, 3vw, 48px) clamp(56px, 6vw, 90px);
}

.home-workflow-inner {
  border: 1px solid var(--home-border);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--home-surface) 94%, transparent), color-mix(in srgb, var(--home-surface) 78%, transparent)),
    var(--home-surface);
  padding: clamp(28px, 4vw, 54px);
  box-shadow: var(--home-shadow);
}

.home-workflow h2 {
  margin: 0;
  color: var(--home-text);
  text-align: center;
  font-size: clamp(34px, 3.5vw, 56px);
  line-height: 1.16;
  font-weight: 950;
  letter-spacing: 0;
}

.home-workflow-inner > p {
  max-width: 780px;
  margin: 16px auto 0;
  color: var(--home-muted);
  text-align: center;
  font-size: 18px;
  line-height: 1.75;
  font-weight: 760;
}

.home-workflow-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 34px;
}

.home-workflow-grid article {
  display: flex;
  min-height: 178px;
  flex-direction: column;
  border: 1px solid var(--home-border);
  background: color-mix(in srgb, var(--home-surface-strong) 78%, transparent);
  padding: 22px;
}

.home-workflow-grid span {
  color: var(--home-accent-strong);
  font-size: 14px;
  font-weight: 950;
}

.home-workflow-grid h3 {
  margin: 14px 0 0;
  color: var(--home-text);
  font-size: 22px;
  font-weight: 950;
}

.home-workflow-grid p {
  margin: 10px 0 0;
  color: var(--home-muted);
  font-size: 14px;
  line-height: 1.65;
  font-weight: 720;
}

.workflow-bar {
  height: 6px;
  overflow: hidden;
  margin-top: auto;
  border-radius: 999px;
  background: color-mix(in srgb, var(--home-muted) 18%, transparent);
}

.workflow-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--home-accent), var(--home-blue));
}

@media (max-width: 1080px) {
  .home-workflow-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .home-workflow-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
