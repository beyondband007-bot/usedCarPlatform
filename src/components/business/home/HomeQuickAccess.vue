<script setup lang="ts">
import { onMounted, ref } from 'vue'

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
        <img :src="entry.image" :alt="entry.title" loading="lazy" />
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
  border-radius: 35px;
  background: var(--home-panel);
}

.suite-card::after {
  position: absolute;
  inset: 0;
  content: '';
  pointer-events: none;
  background: linear-gradient(110deg, rgba(255, 255, 255, 0.08), transparent 42%);
  opacity: 0;
  transition: opacity 0.25s ease;
}

.suite-card:hover::after {
  opacity: 1;
}

.suite-card img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.94;
  border-radius: 35px;
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
  background: linear-gradient(90deg, rgba(4, 4, 4, 0.88), rgba(4, 4, 4, 0.18));
}

.suite-card h2 {
  margin: 0 0 12px;
  font-size: 22px;
}

.suite-card p {
  margin: 0 0 48px;
  color: #d7d7d7;
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
    transform 0.22s ease,
    filter 0.22s ease,
    box-shadow 0.22s ease;
}

.button:hover:not(:disabled) {
  transform: translateY(-2px);
  filter: saturate(1.08);
}

.button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.button.gold {
  color: #171100;
  background: linear-gradient(180deg, var(--home-gold-strong), #e9b82c);
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
