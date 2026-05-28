<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { NButton, NTag } from 'naive-ui'
import { motion } from 'motion-v'

import { homeQuickEntries } from '@/constants/home-page'
import type { HomeQuickEntry } from '@/constants/home-page'

const emit = defineEmits<{
  enterWorkbench: []
}>()

function handleClick(entry: HomeQuickEntry) {
  if (entry.disabled || entry.to) {
    return
  }

  if (entry.workbenchEntry) {
    emit('enterWorkbench')
  }
}
</script>

<template>
  <section class="home-quick-access" aria-label="快捷入口">
    <div class="home-quick-access-grid">
      <motion.article
        v-for="(entry, index) in homeQuickEntries"
        :key="entry.title"
        :initial="{ opacity: 0, y: 20 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: index * 0.07 }"
        class="home-quick-card"
      >
        <div class="home-quick-card-copy">
          <div class="home-quick-card-head">
            <h2>{{ entry.title }}</h2>
            <NTag v-if="entry.tag" size="small" round :bordered="false" type="info">
              {{ entry.tag }}
            </NTag>
          </div>
          <p>{{ entry.description }}</p>

          <RouterLink v-if="entry.to" :to="entry.to" class="home-quick-action">
            <NButton type="primary" text class="home-quick-button">
              {{ entry.action }}
              <Icon icon="mdi:arrow-right" class="ml-1 text-base" />
            </NButton>
          </RouterLink>
          <NButton
            v-else-if="entry.workbenchEntry"
            type="primary"
            text
            class="home-quick-button"
            @click="handleClick(entry)"
          >
            {{ entry.action }}
            <Icon icon="mdi:arrow-right" class="ml-1 text-base" />
          </NButton>
          <NButton v-else text disabled class="home-quick-button">
            {{ entry.action }}
          </NButton>
        </div>

        <div class="home-quick-card-visual">
          <img :src="entry.image" :alt="entry.title" loading="lazy" />
        </div>
      </motion.article>
    </div>
  </section>
</template>

<style scoped lang="scss">
.home-quick-access {
  padding: clamp(24px, 3vw, 40px) clamp(20px, 4vw, 48px) 0;
}

.home-quick-access-grid {
  display: grid;
  max-width: 1280px;
  margin: 0 auto;
  gap: clamp(16px, 2vw, 24px);
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.home-quick-card {
  display: grid;
  min-height: 200px;
  grid-template-columns: minmax(0, 1fr) minmax(120px, 42%);
  gap: 12px;
  overflow: hidden;
  border: 1px solid var(--home-border);
  border-radius: 16px;
  background: var(--home-surface);
  box-shadow: var(--home-shadow-soft);
}

.home-quick-card-copy {
  display: flex;
  flex-direction: column;
  padding: clamp(20px, 2.2vw, 28px);
}

.home-quick-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.home-quick-card-head h2 {
  margin: 0;
  color: var(--home-text);
  font-size: clamp(20px, 1.8vw, 24px);
  font-weight: 900;
}

.home-quick-card-copy > p {
  flex: 1;
  margin: 10px 0 16px;
  color: var(--home-muted);
  font-size: 14px;
  line-height: 1.6;
  font-weight: 600;
}

.home-quick-button {
  justify-content: flex-start !important;
  padding: 0 !important;
  font-weight: 800 !important;
}

.home-quick-card-visual {
  overflow: hidden;
  border-left: 1px solid var(--home-border);
}

.home-quick-card-visual img {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 200px;
  object-fit: cover;
  filter: var(--home-card-image-filter);
}

@media (max-width: 1080px) {
  .home-quick-access-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .home-quick-card {
    grid-template-columns: minmax(0, 1fr) minmax(140px, 38%);
  }
}

@media (max-width: 640px) {
  .home-quick-card {
    grid-template-columns: minmax(0, 1fr);
  }

  .home-quick-card-visual {
    border-top: 1px solid var(--home-border);
    border-left: 0;
  }

  .home-quick-card-visual img {
    min-height: 160px;
  }
}
</style>
