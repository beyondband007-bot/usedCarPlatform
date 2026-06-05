<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import PreloadImage from "@/components/common/PreloadImage.vue";
import { homeCaseTabs } from "@/constants/home-page";

const activeTabId = ref(homeCaseTabs[0]?.id ?? "");
const layoutRef = ref<HTMLElement | null>(null);

const activeCase = computed(
  () =>
    homeCaseTabs.find((tab) => tab.id === activeTabId.value) ?? homeCaseTabs[0],
);

onMounted(() => {
  const root = layoutRef.value;
  if (!root) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.animate(
            [
              { opacity: 0, transform: "translateY(22px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            {
              duration: 620,
              easing: "cubic-bezier(.16,1,.3,1)",
              fill: "both",
            },
          );
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 },
  );

  observer.observe(root);
});
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
          <strong>交付内容</strong>
          <p>{{ activeCase.service }}</p>
        </div>
        <div>
          <strong>{{ activeCase.efficiencyTip.title }}</strong>
          <p>{{ activeCase.efficiencyTip.copy }}</p>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped lang="scss">
.section-block {
  box-sizing: border-box;
  width: 100%;
  max-width: var(--home-shell-max, 1440px);
  margin: 0 auto;
  padding: 0 var(--home-space-x, 24px) var(--home-section-pb, 130px);
}

.section-title {
  width: max-content;
  max-width: 100%;
  margin: 0 auto 64px;
  overflow-x: auto;
  text-align: center;
}

.section-title h2 {
  margin: 0 0 18px;
  color: var(--home-text);
  font-size: clamp(28px, 3.2vw, 42px);
  line-height: 1.12;
  white-space: nowrap;
}

.section-title p {
  margin: 0;
  color: var(--home-muted);
  font-size: 15px;
  line-height: 1.8;
  white-space: nowrap;
}

.tabs {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: fit-content;
  max-width: 100%;
  padding: 4px;
  margin: -28px auto 72px;
  background: var(--home-tabs-bg, #1a1a1a);
  border: 0;
  border-radius: 999px;
  box-shadow: none;
}

.tab {
  min-height: 40px;
  padding: 0 24px;
  white-space: nowrap;
  color: var(--home-tab-text, #8a8a8a);
  background: transparent;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 900;
  transition:
    color var(--home-motion-fast, 160ms ease),
    background var(--home-motion-fast, 160ms ease);
}

.tab:hover:not(.active) {
  color: rgba(255, 255, 255, 0.88);
}

.tab:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--home-gold) 70%, transparent);
  outline-offset: 3px;
}

.tab.active {
  color: var(--home-tab-active-text, #f3f3f3);
  background: var(--home-tab-active-bg, transparent);
  font-weight: 900;
}

.case-layout {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: var(--home-grid-gap, 24px);
  align-items: stretch;
  width: 100%;
  margin: 0 auto;
}

.case-image,
.case-panel {
  min-height: 480px;
  border: 1px solid var(--home-line);
  border-radius: var(--home-radius-card, 28px);
}

.case-image {
  width: 100%;
  height: 100%;
  overflow: hidden;
  isolation: isolate;
  transform: translateZ(0);
  backface-visibility: hidden;
  transition:
    transform var(--home-motion-normal, 240ms ease),
    border-color var(--home-motion-normal, 240ms ease);
}

.case-image :deep(.preload-image),
.case-image :deep(.preload-image__img) {
  width: 100%;
  height: 100%;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.case-image :deep(.preload-image__img) {
  image-rendering: auto;
  object-fit: cover;
}

.case-image:hover {
  transform: translateY(-2px);
  border-color: var(--home-card-hover-border);
}

.case-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(36px, 4.5vw, 56px);
  background: var(--home-case-panel-bg, rgb(49, 49, 49));
  box-shadow: none;
  transition: border-color var(--home-motion-normal, 240ms ease);
}

.case-panel:hover {
  border-color: var(--home-card-hover-border);
}

.case-panel h3 {
  margin: 0 0 40px;
  color: var(--home-case-panel-title, #ffffff);
  font-size: clamp(32px, 3.2vw, 46px);
  font-weight: 800;
  line-height: 1.28;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.case-panel > div + div {
  margin-top: 10px;
}

.case-panel strong {
  display: block;
  margin-bottom: 14px;
  color: var(--home-case-panel-label, #f3f3f3);
  font-size: clamp(20px, 1.55vw, 24px);
  font-weight: 700;
  line-height: 1.45;
  white-space: nowrap;
}

.case-panel p {
  margin: 0 0 34px;
  color: var(--home-case-panel-desc, rgba(255, 255, 255, 0.82));
  font-size: clamp(18px, 1.4vw, 21px);
  font-weight: 500;
  line-height: 1.82;
}

.case-panel > div:last-of-type p {
  margin-bottom: 0;
}

@media (max-width: 1023px) {
  .case-layout {
    grid-template-columns: 1fr;
  }

  .case-image,
  .case-panel {
    min-height: 380px;
  }

  .tabs {
    flex-wrap: wrap;
    justify-content: center;
    margin-right: auto;
    margin-left: auto;
    margin-bottom: 48px;
  }
}

@media (max-width: 767px) {
  .section-title {
    width: 100%;
  }

  .section-title h2,
  .section-title p {
    white-space: normal;
  }

  .section-title h2 {
    font-size: clamp(22px, 6vw, 28px);
  }

  .tabs {
    width: fit-content;
    max-width: 100%;
    margin-right: auto;
    margin-left: auto;
    margin-bottom: 38px;
    overflow-x: auto;
    justify-content: center;
    -webkit-overflow-scrolling: touch;
  }

  .tab {
    min-height: 44px;
    flex-shrink: 0;
  }

  .case-image,
  .case-panel {
    min-height: 280px;
  }

  .case-panel {
    padding: 28px;
  }

  .case-panel h3,
  .case-panel strong,
  .case-panel p {
    white-space: normal;
  }

  .case-panel h3 {
    margin-bottom: 28px;
    font-size: clamp(24px, 6vw, 32px);
  }
}
</style>
