<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import PreloadImage from '@/components/common/PreloadImage.vue'
import { homeCaseTabs } from '@/constants/home-page'

const activeTabId = ref(homeCaseTabs[0]?.id ?? '')
const layoutRef = ref<HTMLElement | null>(null)

const activeCase = computed(
  () => homeCaseTabs.find((tab) => tab.id === activeTabId.value) ?? homeCaseTabs[0],
)

onMounted(() => {
  const root = layoutRef.value
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

  observer.observe(root)
})
</script>

<template>
  <section id="cases" class="section-block cases" aria-label="真实成片交付案例">
    <div class="section-title">
      <h2>真实成片交付案例</h2>
      <p>专为汽车电商打造的 AI 内容交付方案，帮助车辆快速出图上架</p>
    </div>

    <div class="tabs" role="tablist" aria-label="案例分类">
      <button
        v-for="tab in homeCaseTabs"
        :key="tab.id"
        type="button"
        role="tab"
        class="tab"
        :class="{ active: tab.id === activeTabId }"
        :aria-selected="tab.id === activeTabId"
        @click="activeTabId = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="activeCase" ref="layoutRef" class="case-layout">
      <PreloadImage
        class="case-image"
        :src="activeCase.image"
        :alt="`${activeCase.title}案例成片`"
        loading="lazy"
        decoding="async"
      />
      <article class="case-panel">
        <h3>{{ activeCase.title }}</h3>
        <div>
          <strong>核心痛点</strong>
          <p>{{ activeCase.pain }}</p>
        </div>
        <div>
          <strong>交付服务项</strong>
          <p>{{ activeCase.service }}</p>
        </div>
        <dl class="metric-card">
          <div v-for="stat in activeCase.stats" :key="stat.label">
            <dt>{{ stat.value }}</dt>
            <dd>{{ stat.label }}</dd>
          </div>
        </dl>
      </article>
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

.tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  width: min(430px, 100%);
  padding: 8px;
  margin: -28px auto 72px;
  background: var(--home-tabs-bg);
  border: 1px solid var(--home-line);
  border-radius: 999px;
}

.tab {
  min-height: 42px;
  color: var(--home-tab-text);
  background: transparent;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 900;
}

.tab.active {
  color: var(--home-tab-active-text);
  background: var(--home-tab-active-bg);
}

.case-layout {
  display: grid;
  grid-template-columns: 0.96fr 1.04fr;
  gap: 56px;
  align-items: stretch;
  width: min(1220px, 100%);
  margin: 0 auto;
}

.case-image,
.case-panel {
  min-height: 480px;
  border: 1px solid var(--home-line);
  border-radius: 24px;
}

.case-image {
  width: 100%;
  height: 100%;
}

.case-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(34px, 5vw, 64px);
  background: var(--home-case-panel-bg);
  box-shadow: var(--home-card-shadow);
}

.case-panel h3 {
  margin: 0 0 40px;
  color: var(--home-card-title);
  font-size: clamp(28px, 3vw, 42px);
}

.case-panel strong {
  display: block;
  margin-bottom: 10px;
  color: var(--home-card-title);
  font-size: 17px;
}

.case-panel p {
  margin: 0 0 32px;
  color: var(--home-card-muted);
  line-height: 1.8;
}

.metric-card {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  margin: 14px 0 0;
  padding: 42px 24px;
  background: var(--home-metric-bg);
  border: 1px solid var(--home-line);
  border-radius: 24px;
}

.metric-card div + div {
  border-left: 1px solid var(--home-line);
}

.metric-card dt {
  color: var(--home-gold);
  font-size: clamp(44px, 5vw, 62px);
  font-weight: 900;
  text-align: center;
}

.metric-card dd {
  margin: 8px 0 0;
  color: var(--home-card-muted);
  font-size: 13px;
  font-weight: 800;
  text-align: center;
}

@media (max-width: 1100px) {
  .case-layout {
    grid-template-columns: 1fr;
  }

  .case-image,
  .case-panel {
    min-height: 380px;
  }
}

@media (max-width: 700px) {
  .section-block {
    width: min(100% - 28px, 1520px);
    padding-bottom: 86px;
  }

  .tabs {
    margin-bottom: 38px;
  }

  .case-layout {
    gap: 20px;
  }

  .case-panel {
    padding: 28px;
  }

  .metric-card {
    padding: 28px 12px;
  }

  .metric-card dt {
    font-size: 38px;
  }
}
</style>
