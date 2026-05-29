<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { homeMainCapabilities, homeTechBadges } from '@/constants/home-page'

const gridRef = ref<HTMLElement | null>(null)

onMounted(() => {
  const root = gridRef.value
  if (!root) {
    return
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.animate(
            [
              { opacity: 0, transform: 'translateY(22px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ],
            {
              duration: 620,
              easing: 'cubic-bezier(.16,1,.3,1)',
              fill: 'both',
            },
          )
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.12 },
  )

  root.querySelectorAll('.feature-card').forEach((item) => observer.observe(item))
})
</script>

<template>
  <section id="engine" class="section-block" aria-label="全链路能力">
    <div class="section-title">
      <h2>链路 AI 汽车电商内容生成引擎</h2>
      <p>聚焦汽车视觉内容全流程，打造从单张精修到批量交付的一站式生成能力</p>
    </div>

    <div ref="gridRef" class="feature-grid">
      <article
        v-for="item in homeMainCapabilities"
        :key="item.title"
        class="feature-card"
      >
        <img :src="item.image" :alt="item.title" loading="lazy" />
        <h3>{{ item.title }}</h3>
        <p>{{ item.description }}</p>
      </article>
    </div>

    <div class="badge-row" aria-label="能力标签">
      <span v-for="badge in homeTechBadges" :key="badge">{{ badge }}</span>
    </div>
  </section>
</template>

<style scoped lang="scss">
.section-block {
  width: min(1520px, calc(100% - 40px));
  margin: 0 auto;
  padding-bottom: 130px;
}

.section-title {
  width: min(760px, 100%);
  margin: 0 auto 64px;
  text-align: center;
}

.section-title h2 {
  margin: 0 0 18px;
  font-size: clamp(28px, 3.2vw, 42px);
  line-height: 1.12;
}

.section-title p {
  margin: 0;
  color: var(--home-muted);
  font-size: 15px;
  line-height: 1.8;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 36px;
  width: min(1575px, 100%);
  margin: 0 auto;
}

.feature-card {
  position: relative;
  overflow: hidden;
  padding: 10px 10px 24px;
  background: linear-gradient(180deg, #151515, #0b0b0b);
  border: 1px solid var(--home-line);
  border-radius: 35px;
  transition:
    transform 0.25s ease,
    border-color 0.25s ease;
}

.feature-card::after {
  position: absolute;
  inset: 0;
  content: '';
  pointer-events: none;
  background: linear-gradient(110deg, rgba(255, 255, 255, 0.08), transparent 42%);
  opacity: 0;
  transition: opacity 0.25s ease;
}

.feature-card:hover {
  border-color: rgba(244, 200, 64, 0.38);
  transform: translateY(-6px);
}

.feature-card:hover::after {
  opacity: 1;
}

.feature-card img {
  width: 100%;
  aspect-ratio: 341 / 183;
  object-fit: cover;
  border-radius: 30px;
}

.feature-card h3 {
  margin: 24px 18px 6px;
  font-size: 22px;
}

.feature-card p {
  margin: 0 18px;
  color: var(--home-muted);
  font-size: 15px;
  line-height: 1.7;
}

.badge-row {
  display: flex;
  justify-content: center;
  gap: 80px;
  flex-wrap: wrap;
  width: min(808px, 100%);
  margin: 38px auto 0;
}

.badge-row span {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 29px;
  padding: 0 15px;
  color: #d7d7d7;
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  font-size: 18px;
  font-weight: 800;
}

.badge-row span::before {
  display: inline-block;
  width: 18px;
  height: 18px;
  margin-right: 9px;
  content: '';
  background: linear-gradient(180deg, var(--home-gold-strong), #d6a617);
  border-radius: 5px;
}

@media (max-width: 1100px) {
  .feature-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 700px) {
  .section-block {
    width: min(100% - 28px, 1520px);
    padding-bottom: 86px;
  }

  .section-title {
    margin-bottom: 34px;
  }

  .feature-grid {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .badge-row {
    justify-content: flex-start;
    gap: 18px;
  }

  .badge-row span {
    font-size: 13px;
  }
}
</style>
