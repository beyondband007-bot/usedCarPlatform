<script setup lang="ts">
import { NButton } from "naive-ui";
import { motion } from "motion-v";

import PreloadImage from "@/components/common/PreloadImage.vue";
import type { FeatureEntry } from "@/types/prototype";

const props = defineProps<{
  entry: FeatureEntry;
  index: number;
}>();

const emit = defineEmits<{
  enterWorkbench: [];
}>();

function handleAction() {
  if (props.entry.workbenchEntry) {
    emit("enterWorkbench");
  }
}
</script>

<template>
  <motion.div
    :initial="{ opacity: 0, y: 24 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.45, delay: index * 0.08 }"
    :while-hover="{ y: -6 }"
    class="home-feature-motion"
  >
    <article
      class="home-feature-card"
      :class="{
        'is-highlighted': entry.highlighted,
        'is-wide': index === 2,
      }"
    >
      <div class="home-feature-copy">
        <span>{{ entry.highlighted ? "套餐能力" : "AI 能力" }}</span>
        <h2>{{ entry.title }}</h2>
        <p>{{ entry.description }}</p>
        <RouterLink v-if="entry.to" :to="entry.to" class="home-feature-action">
          <NButton round class="home-feature-button">
            {{ entry.action }}
          </NButton>
        </RouterLink>
        <NButton
          v-else-if="entry.workbenchEntry"
          round
          class="home-feature-button"
          @click="handleAction"
        >
          {{ entry.action }}
        </NButton>
        <NButton v-else round class="home-feature-button is-disabled">
          {{ entry.action }}
        </NButton>
      </div>

      <div class="home-feature-visual">
        <PreloadImage
          class="home-feature-image"
          :src="entry.image"
          :alt="entry.title"
          loading="lazy"
          decoding="async"
        />
      </div>
    </article>
  </motion.div>
</template>

<style scoped lang="scss">
.home-feature-motion {
  height: 100%;
  min-width: 0;
}

.home-feature-card {
  position: relative;
  display: grid;
  height: 100%;
  min-height: 330px;
  grid-template-columns: minmax(0, 0.88fr) minmax(190px, 1.05fr);
  gap: clamp(18px, 2vw, 28px);
  overflow: hidden;
  border: 1px solid var(--home-border);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--home-surface) 94%, transparent), color-mix(in srgb, var(--home-surface) 78%, transparent)),
    var(--home-surface);
  padding: clamp(24px, 2.5vw, 34px);
  box-shadow: var(--home-shadow);
}

.home-feature-card::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(244, 200, 111, 0.1), transparent 28%),
    radial-gradient(circle at 82% 12%, rgba(47, 124, 255, 0.1), transparent 34%);
}

.home-feature-card.is-wide {
  grid-template-columns: minmax(0, 0.9fr) minmax(300px, 1.1fr);
}

.home-feature-copy,
.home-feature-visual {
  position: relative;
  z-index: 1;
}

.home-feature-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
}

.home-feature-copy > span {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  border-radius: 999px;
  background: rgba(31, 185, 129, 0.14);
  color: var(--home-green);
  padding: 0 13px;
  font-size: 14px;
  font-weight: 900;
}

.home-feature-card.is-highlighted .home-feature-copy > span {
  background: rgba(244, 200, 111, 0.16);
  color: var(--home-accent-strong);
}

.home-feature-copy h2 {
  margin: 24px 0 0;
  color: var(--home-text);
  font-size: clamp(30px, 2.35vw, 44px);
  line-height: 1.15;
  font-weight: 950;
  letter-spacing: 0;
}

.home-feature-copy p {
  max-width: 320px;
  margin: 18px 0 0;
  color: var(--home-muted);
  font-size: clamp(17px, 1.2vw, 21px);
  line-height: 1.55;
  font-weight: 850;
}

.home-feature-action {
  margin-top: 28px;
  text-decoration: none;
}

.home-feature-button {
  --n-color: var(--home-accent) !important;
  --n-color-hover: #f6d68d !important;
  --n-color-pressed: var(--home-accent-strong) !important;
  --n-color-focus: var(--home-accent) !important;
  --n-border: 1px solid transparent !important;
  --n-border-hover: 1px solid transparent !important;
  --n-border-pressed: 1px solid transparent !important;
  --n-border-focus: 1px solid transparent !important;
  --n-text-color: #15120a !important;
  --n-text-color-hover: #15120a !important;
  --n-text-color-pressed: #15120a !important;
  --n-text-color-focus: #15120a !important;

  min-width: 132px;
  height: 44px !important;
  font-weight: 900 !important;
}

.home-feature-button.is-disabled {
  --n-color: color-mix(in srgb, var(--home-muted) 18%, transparent) !important;
  --n-color-hover: color-mix(in srgb, var(--home-muted) 24%, transparent) !important;
  --n-color-pressed: color-mix(in srgb, var(--home-muted) 22%, transparent) !important;
  --n-text-color: var(--home-muted) !important;
  --n-text-color-hover: var(--home-muted) !important;
  --n-text-color-pressed: var(--home-muted) !important;
}

.home-feature-visual {
  align-self: center;
  min-height: 224px;
  overflow: hidden;
  border: 1px solid var(--home-border);
  border-radius: 18px;
  background: var(--home-soft);
}

.home-feature-image {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 224px;
  filter: var(--home-card-image-filter);
}

@media (max-width: 1480px) {
  .home-feature-card,
  .home-feature-card.is-wide {
    grid-template-columns: minmax(0, 0.9fr) minmax(190px, 1fr);
  }
}

@media (max-width: 820px) {
  .home-feature-card,
  .home-feature-card.is-wide {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
