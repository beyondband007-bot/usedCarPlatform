<script setup lang="ts">
import { onMounted, ref } from 'vue'

import PreloadImage from '@/components/common/PreloadImage.vue'
import HomePromoBanner from '@/components/business/home/HomePromoBanner.vue'
import { homeQuickEntries } from '@/constants/home-page'
import type { HomeQuickEntry } from '@/constants/home-page'

const emit = defineEmits<{
  enterWorkbench: []
}>()

const gridRef = ref<HTMLElement | null>(null)

function handleClick(entry: HomeQuickEntry) {
  if (entry.disabled) {
    return
  }

  if (entry.workbenchEntry) {
    emit('enterWorkbench')
  }
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
  <section id="suite" class="suite-shell" aria-label="快捷入口">
    <div ref="gridRef" class="suite-grid">
      <article
        v-for="entry in homeQuickEntries"
        :key="entry.title"
        class="suite-card"
      >
        <PreloadImage
          class="suite-card-image"
          :src="entry.image"
          :alt="entry.title"
          loading="lazy"
          decoding="async"
        />
        <div>
          <h2>{{ entry.title }}</h2>
          <p>{{ entry.description }}</p>
          <RouterLink
            v-if="entry.to"
            :to="entry.to"
            class="button gold small"
          >
            {{ entry.action }}
          </RouterLink>
          <button
            v-else-if="entry.workbenchEntry"
            type="button"
            class="button gold small"
            @click="handleClick(entry)"
          >
            {{ entry.action }}
          </button>
          <button
            v-else
            type="button"
            class="button gold small"
            disabled
          >
            {{ entry.action }}
          </button>
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
  width: min(1520px, calc(100% - 40px));
  margin: 70px auto 0;
  padding-bottom: 126px;
}

.suite-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
  width: min(1575px, 100%);
  margin: 0 auto;
}

.suite-card {
  position: relative;
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

.suite-card::after {
  position: absolute;
  inset: 0;
  content: '';
  pointer-events: none;
  background: var(--home-card-shine);
  opacity: 0;
  transition: opacity var(--home-motion-normal, 240ms ease);
}

.suite-card:hover::after {
  opacity: 1;
}

.suite-card:hover {
  transform: translateY(-4px);
  border-color: var(--home-card-hover-border);
  box-shadow: 0 18px 48px color-mix(in srgb, var(--home-gold) 8%, transparent);
}

.suite-card-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.94;
  border-radius: var(--home-radius-card, 28px);
  transition: transform var(--home-motion-normal, 240ms ease), opacity var(--home-motion-normal, 240ms ease);
}

.suite-card:hover .suite-card-image {
  transform: scale(1.03);
}

.suite-card div {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  min-height: 259px;
  padding: 35px;
  background: var(--home-media-overlay);
}

.suite-card h2 {
  margin: 0 0 12px;
  color: var(--home-media-title);
  font-size: 22px;
}

.suite-card p {
  margin: 0 0 48px;
  color: var(--home-media-desc);
  font-size: 13px;
}

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 24px;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 900;
  text-decoration: none;
  transition:
    transform var(--home-motion-normal, 240ms ease),
    filter var(--home-motion-normal, 240ms ease),
    box-shadow var(--home-motion-normal, 240ms ease),
    background var(--home-motion-normal, 240ms ease);
}

.button:hover:not(:disabled) {
  transform: translateY(-2px);
  filter: saturate(1.08);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.58),
    0 14px 34px color-mix(in srgb, var(--home-gold) 24%, transparent);
}

.button:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--home-gold) 72%, transparent);
  outline-offset: 4px;
}

.button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.button.gold {
  color: #171100;
  background: linear-gradient(180deg, var(--home-gold-strong), var(--home-gold));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    0 12px 34px rgba(244, 200, 64, 0.18);
}

.button.small {
  min-height: 36px;
  padding: 0 20px;
  font-size: 12px;
}

@media (max-width: 1100px) {
  .suite-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 700px) {
  .suite-shell {
    width: min(100% - 28px, 1520px);
    margin-top: 26px;
    padding-bottom: 80px;
  }

  .suite-grid {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .suite-card,
  .suite-card div {
    min-height: 210px;
  }
}
</style>
