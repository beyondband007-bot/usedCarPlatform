<script setup lang="ts">
import { onMounted, ref } from "vue";

import PreloadImage from "@/components/common/PreloadImage.vue";
import { homeMainCapabilities, homeTechBadges } from "@/constants/home-page";
import { useAppStore } from "@/stores/app";

const appStore = useAppStore();
const gridRef = ref<HTMLElement | null>(null);

onMounted(() => {
  const root = gridRef.value;
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

  root
    .querySelectorAll(".feature-card")
    .forEach((item) => observer.observe(item));
});
</script>

<template>
  <section
    id="engine"
    class="section-block"
    :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'"
    aria-label="全链路能力"
  >
    <div class="section-title">
      <h2>一站式AI汽车电商内容生成引擎</h2>
      <p>聚焦汽车视觉内容全流程，打造从单张精修到批量交付的一站式生成能力</p>
    </div>

    <div ref="gridRef" class="feature-grid">
      <article
        v-for="item in homeMainCapabilities"
        :key="item.title"
        class="feature-card"
      >
        <video
          v-if="item.video"
          class="feature-card-image feature-card-video"
          :src="item.video"
          autoplay
          muted
          loop
          playsinline
          preload="metadata"
          :aria-label="item.title"
        />
        <PreloadImage
          v-else-if="item.image"
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
  inset: auto 0 0;
  height: 42%;
  content: "";
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
  opacity: 0.55;
}

.feature-card-image {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 341 / 183;
  overflow: hidden;
  isolation: isolate;
  border-radius: var(--home-radius-media, 22px);
  transform: translateZ(0);
  backface-visibility: hidden;
}

.feature-card-image :deep(.preload-image),
.feature-card-image :deep(.preload-image__img) {
  width: 100%;
  height: 100%;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.feature-card-image :deep(.preload-image__img) {
  image-rendering: auto;
}

.feature-card-video {
  object-fit: cover;
  background: #0b0b0b;
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
  justify-content: space-between;
  align-items: center;
  flex-wrap: nowrap;
  width: 100%;
  margin: 38px auto 0;
  padding: 0;
  column-gap: clamp(12px, 1.6vw, 24px);
}

.badge-row span {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  min-height: 41px;
  padding: 0 20px;
  border-radius: 999px;
  font-size: clamp(25px, 2.4vw, 30px);
  font-weight: 800;
  white-space: nowrap;
  transition:
    transform var(--home-motion-fast, 160ms ease),
    border-color var(--home-motion-fast, 160ms ease),
    color var(--home-motion-fast, 160ms ease),
    background var(--home-motion-fast, 160ms ease),
    box-shadow var(--home-motion-fast, 160ms ease);
}

.section-block.theme-dark .badge-row span {
  color: #f8fafc;
  background: #0b0b0b;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.section-block.theme-dark .badge-row span:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--home-gold) 42%, transparent);
  color: #ffffff;
}

.section-block.theme-dark .badge-row span::before {
  background: linear-gradient(180deg, var(--home-gold-strong), #d6a617);
}

.section-block.theme-light .badge-row span {
  color: #334155;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafd 100%);
  border: 1px solid #e6eaf2;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    0 1px 2px rgba(47, 107, 255, 0.04);
}

.section-block.theme-light .badge-row span:hover {
  transform: translateY(-1px);
  border-color: #b8cdf4;
  background: linear-gradient(180deg, #f8fbff 0%, #f2f7ff 100%);
  color: #1e293b;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.96),
    0 6px 16px rgba(47, 107, 255, 0.1);
}

.badge-row span::before {
  display: inline-block;
  width: 22px;
  height: 22px;
  margin-right: 11px;
  content: "";
  border-radius: 5px;
}

.section-block.theme-light .badge-row span::before {
  background: linear-gradient(180deg, #4f7fff 0%, #2f6bff 100%);
  box-shadow: 0 2px 6px rgba(47, 107, 255, 0.22);
}

@media (max-width: 1100px) {
  .feature-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 22px;
  }

  .badge-row {
    flex-wrap: wrap;
    justify-content: flex-start;
    row-gap: 18px;
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
