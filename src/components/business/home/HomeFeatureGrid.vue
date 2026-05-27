<script setup lang="ts">
import { homeFeatures } from '@/constants/prototype'
import HomeFeatureCard from '@/components/business/home/HomeFeatureCard.vue'
</script>

<template>
  <section class="grid gap-6 px-5 py-10 lg:grid-cols-2 2xl:grid-cols-[1fr_1fr_1.5fr] 2xl:px-8">
    <HomeFeatureCard
      v-for="(entry, index) in homeFeatures"
      :key="entry.title"
      :entry="entry"
      :index="index"
    />
  </section>
</template>
