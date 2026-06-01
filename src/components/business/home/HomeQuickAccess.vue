<script setup lang="ts">
import { onMounted, ref } from 'vue'

import PreloadImage from '@/components/common/PreloadImage.vue'
import HomePromoBanner from '@/components/business/home/HomePromoBanner.vue'
import { homeQuickEntries, type HomeQuickEntry } from '@/constants/home-page'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const gridRef = ref<HTMLElement | null>(null)

function entryImage(entry: HomeQuickEntry) {
  return appStore.isDarkMode ? entry.imageDark : entry.imageLight
}

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

  root.querySelectorAll('.suite-card, .promo-banner').forEach((item) => observer.observe(item))
})
</script>

<template>
  <section
    id="suite"
    class="suite-shell"
    :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'"
    aria-label="快捷入口"
  >
    <div ref="gridRef" class="suite-grid">
      <article
        v-for="entry in homeQuickEntries"
        :key="entry.title"
        class="suite-card"
      >
        <PreloadImage
          class="suite-card-image"
          :src="entryImage(entry)"
          :alt="entry.title"
          loading="lazy"
          decoding="async"
        />
        <div class="suite-card-copy">
          <h2>{{ entry.title }}</h2>
          <p>{{ entry.description }}</p>
        </div>
      </article>

      <HomePromoBanner />
    </div>
  </section>
</template>

<style scoped lang="scss">
.suite-shell {
  position: relative;
  z-index: 3;
  width: min(1660px, calc(100% - 40px));
  margin: 126px auto 0;
  padding-bottom: 126px;
}

.suite-grid {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 3fr) minmax(0, 4fr);
  gap: 40px;
  width: 100%;
  margin: 0 auto;
}

.suite-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 259px;
  overflow: hidden;
  border: 1px solid var(--home-line);
  border-radius: var(--home-radius-card, 28px);
  background: var(--home-panel);
  box-shadow: var(--home-card-shadow);
  transition:
    transform var(--home-motion-normal, 240ms ease),
    border-color var(--home-motion-normal, 240ms ease),
    box-shadow var(--home-motion-normal, 240ms ease);
}

.suite-card div,
.suite-card-copy {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  min-height: 259px;
  max-width: 58%;
  padding: 48px 35px 28px;
  background: var(--home-media-overlay);
}

.suite-card div::after,
.suite-card-copy::after {
  position: absolute;
  inset: 0;
  content: '';
  pointer-events: none;
  background: var(--home-card-shine);
  opacity: 0;
  transition: opacity var(--home-motion-normal, 240ms ease);
}

.suite-card:hover:not(.promo-banner) div::after,
.suite-card:hover:not(.promo-banner) .suite-card-copy::after {
  opacity: 0.55;
}

.suite-card:hover:not(.promo-banner) {
  transform: translateY(-4px);
  border-color: var(--home-card-hover-border);
  box-shadow: 0 18px 48px color-mix(in srgb, var(--home-gold) 8%, transparent);
}

.suite-card-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  isolation: isolate;
  opacity: 0.94;
  border-radius: var(--home-radius-card, 28px);
  transform: translateZ(0);
  backface-visibility: hidden;
}

.suite-card-image :deep(.preload-image),
.suite-card-image :deep(.preload-image__img) {
  width: 100%;
  height: 100%;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.suite-card-image :deep(.preload-image__img) {
  image-rendering: auto;
  object-fit: cover;
}

.suite-card h2 {
  margin: 0 0 12px;
  color: var(--home-media-title);
  font-size: 28px;
  font-weight: 700;
  line-height: 1.3;
}

.suite-card p {
  margin: 0 0 8px;
  color: var(--home-media-desc);
  font-size: 15px;
  line-height: 1.5;
}

.suite-card p:last-of-type {
  margin-bottom: 0;
}

.suite-shell.theme-light .suite-card div,
.suite-shell.theme-light .suite-card-copy {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.96) 0%,
    rgba(255, 255, 255, 0.72) 58%,
    rgba(255, 255, 255, 0.08) 100%
  );
}

.suite-shell.theme-light .suite-card h2 {
  color: #0f172a;
}

.suite-shell.theme-light .suite-card p {
  color: #475569;
}

@media (max-width: 1100px) {
  .suite-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .suite-grid :deep(.promo-banner) {
    grid-column: 1 / -1;
  }
}

@media (max-width: 700px) {
  .suite-shell {
    width: min(100% - 28px, 1660px);
    margin-top: 80px;
    padding-bottom: 80px;
  }

  .suite-grid {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .suite-card,
  .suite-card div,
  .suite-card-copy {
    min-height: 210px;
  }

  .suite-card div,
  .suite-card-copy {
    max-width: 72%;
    padding: 34px 20px 20px;
  }

  .suite-card h2 {
    font-size: 22px;
  }

  .suite-card p {
    font-size: 14px;
  }
}
</style>
