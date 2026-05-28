<script setup lang="ts">
import { homeFeatures } from '@/constants/prototype'
import HomeFeatureCard from '@/components/business/home/HomeFeatureCard.vue'

defineEmits<{
  enterWorkbench: []
}>()
</script>

<template>
  <section class="home-feature-grid" aria-label="业务入口">
    <HomeFeatureCard
      v-for="(entry, index) in homeFeatures"
      :key="entry.title"
      :entry="entry"
      :index="index"
      @enter-workbench="$emit('enterWorkbench')"
    />
  </section>
</template>

<style scoped lang="scss">
.home-feature-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.5fr);
  gap: clamp(18px, 2vw, 28px);
  padding: clamp(28px, 4vw, 52px) clamp(22px, 3vw, 48px);
}

@media (max-width: 1280px) {
  .home-feature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .home-feature-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
