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
          webkit-playsinline
          x5-playsinline
          x5-video-player-type="h5"
          x5-video-player-fullscreen="false"
          preload="metadata"
          :aria-label="item.title"
        />
        <PreloadImage
          v-else-if="item.image"
          class="feature-card-image"
          :src="item.image"
          :fallback-src="item.fallbackImage"
          :alt="item.title"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
        />
        <h3>{{ item.title }}</h3>
        <p>{{ item.description }}</p>
      </article>
    </div>

    <div class="badge-row" aria-label="能力标签">
      <span
        v-for="badge in homeTechBadges"
        :key="badge.label"
        class="tech-badge"
      >
        <img class="tech-badge-icon" :src="badge.icon" alt="" aria-hidden="true" />
        <span class="tech-badge-label">{{ badge.label }}</span>
      </span>
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
  font-family: "PingFang SC", sans-serif;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.12;
  white-space: nowrap;
}

.section-title p {
  margin: 0;
  color: var(--home-muted);
  font-family: "PingFang SC", sans-serif;
  font-size: 18px;
  font-weight: 500;
  line-height: 1.8;
  white-space: nowrap;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--home-grid-gap, 24px);
  width: 100%;
  margin: 0 auto;
}

@media (min-width: 1280px) {
  .feature-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
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
  font-family: "PingFang SC", sans-serif;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feature-card p {
  margin: 0 14px;
  overflow: hidden;
  color: var(--home-card-muted);
  font-family: "PingFang SC", sans-serif;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.65;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: clamp(10px, 1.2vw, 16px);
  width: 100%;
  margin: 32px auto 0;
  padding: 0;
}

.tech-badge {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 8px 18px;
  border: 1px solid var(--home-badge-border, rgba(255, 255, 255, 0.06));
  border-radius: 999px;
  color: var(--home-badge-text, #f8fafc);
  background: var(--home-badge-bg, #1a1a1a);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
  transition:
    transform var(--home-motion-fast, 160ms ease),
    border-color var(--home-motion-fast, 160ms ease),
    background var(--home-motion-fast, 160ms ease);
}

.tech-badge:hover {
  border-color: rgba(255, 255, 255, 0.14);
  background: var(--home-badge-bg-hover, #242424);
  transform: translateY(-1px);
}

.section-block.theme-light .tech-badge {
  background: rgb(71, 71, 73);
  border-color: rgba(255, 255, 255, 0.08);
}

.section-block.theme-light .tech-badge:hover {
  background: rgb(82, 82, 84);
  border-color: rgba(255, 255, 255, 0.12);
}

.tech-badge-icon {
  display: block;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.tech-badge-label {
  font-family: "PingFang SC", sans-serif;
  font-size: 18px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}

.section-block.theme-light .tech-badge-label {
  color: #ffffff;
}

.section-block.theme-dark .tech-badge {
  background: #141414;
  border-color: rgba(255, 255, 255, 0.08);
}

.section-block.theme-dark .tech-badge:hover {
  border-color: color-mix(in srgb, var(--home-gold) 36%, transparent);
  background: var(--home-badge-bg-hover, #1f1f1f);
}

@media (max-width: 1023px) {
  .badge-row {
    justify-content: center;
  }
}

@media (max-width: 700px) {
  .tech-badge-label {
    font-size: 13px;
  }
}

@media (max-width: 767px) {
  .section-block {
    padding-bottom: calc(var(--home-section-pb, 86px) + var(--h5-bottom-inset, 0px));
  }

  .section-title {
    width: 100%;
    margin-bottom: 28px;
  }

  .section-title h2,
  .section-title p {
    white-space: normal;
  }

  .section-title h2 {
    font-size: clamp(18px, 5.2vw, 24px);
    line-height: 1.25;
  }

  .section-title p {
    font-size: clamp(12px, 3.2vw, 14px);
    line-height: 1.6;
  }

  .feature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--home-grid-gap, 12px);
  }

  .feature-card {
    padding: 8px 8px 14px;
    border-radius: var(--home-radius-card, 16px);
  }

  .feature-card-image {
    border-radius: var(--home-radius-media, 12px);
  }

  .feature-card h3 {
    margin: 10px 6px 4px;
    font-size: clamp(12px, 3.4vw, 14px);
    line-height: 1.35;
    white-space: normal;
  }

  .feature-card p {
    margin: 0 6px;
    font-size: clamp(10px, 2.8vw, 12px);
    line-height: 1.45;
    white-space: normal;
  }

  .badge-row {
    gap: 8px;
    margin-top: 24px;
  }

  .tech-badge {
    min-height: 32px;
    padding: 6px 12px;
    gap: 6px;
  }

  .tech-badge-icon {
    width: 14px;
    height: 14px;
  }

  .tech-badge-label {
    font-size: 12px;
  }
}
</style>
