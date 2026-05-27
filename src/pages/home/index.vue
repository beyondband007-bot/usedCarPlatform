<script setup lang="ts">
import HomeFeatureGrid from '@/components/business/home/HomeFeatureGrid.vue'
import HomeHero from '@/components/business/home/HomeHero.vue'
import HomeWorkflow from '@/components/business/home/HomeWorkflow.vue'
</script>

<template>
  <main class="min-h-[calc(100vh-var(--app-header-offset))] overflow-x-hidden bg-[var(--app-bg)]">
    <HomeHero />
    <HomeFeatureGrid />
    <HomeWorkflow />
  </main>
</template>
