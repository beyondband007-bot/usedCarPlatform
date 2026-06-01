<script setup lang="ts">
import { onMounted, ref } from 'vue'

import PreloadImage from '@/components/common/PreloadImage.vue'
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
        <PreloadImage
          class="feature-card-image"
          :src="item.image"
          :alt="item.title"
          loading="lazy"
          decoding="async"
        />
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
  width: min(1660px, calc(100% - 40px));
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
  color: var(--home-text);
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
  gap: 24px;
  width: 100%;
  margin: 0 auto;
}

.feature-card {
  position: relative;
  overflow: hidden;
  padding: 10px 10px 24px;
  background: var(--home-card-bg);
  border: 1px solid var(--home-line);
  border-radius: var(--home-radius-card, 28px);
  box-shadow: var(--home-card-shadow);
  transition:
    transform var(--home-motion-normal, 240ms ease),
    border-color var(--home-motion-normal, 240ms ease),
    box-shadow var(--home-motion-normal, 240ms ease);
}

.feature-card::after {
  position: absolute;
  inset: 0;
  content: '';
  pointer-events: none;
  background: var(--home-card-shine);
  opacity: 0;
  transition: opacity var(--home-motion-normal, 240ms ease);
}

.feature-card:hover {
  border-color: var(--home-card-hover-border);
  transform: translateY(-4px);
  box-shadow:
    var(--home-card-shadow),
    0 0 0 1px color-mix(in srgb, var(--home-gold) 14%, transparent),
    0 18px 42px color-mix(in srgb, var(--home-gold) 8%, transparent);
}

.feature-card:hover::after {
  opacity: 1;
}

.feature-card-image {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 341 / 183;
  border-radius: var(--home-radius-media, 22px);
  transition: transform var(--home-motion-normal, 240ms ease), filter var(--home-motion-normal, 240ms ease);
}

.feature-card:hover .feature-card-image {
  transform: scale(1.025);
}

.feature-card h3 {
  margin: 24px 14px 6px;
  overflow: hidden;
  color: var(--home-card-title);
  font-size: 21px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feature-card p {
  margin: 0 14px;
  overflow: hidden;
  color: var(--home-card-muted);
  font-size: 14px;
  line-height: 1.65;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  color: var(--home-badge-text);
  background: var(--home-badge-bg);
  border: 1px solid var(--home-badge-border);
  border-radius: 999px;
  font-size: 18px;
  font-weight: 800;
  transition:
    transform var(--home-motion-fast, 160ms ease),
    border-color var(--home-motion-fast, 160ms ease),
    color var(--home-motion-fast, 160ms ease);
}

.badge-row span:hover {
  transform: translateY(-1px);
  border-color: var(--home-card-hover-border);
  color: var(--home-gold-strong);
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
    gap: 22px;
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

  .feature-card h3,
  .feature-card p {
    white-space: normal;
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
