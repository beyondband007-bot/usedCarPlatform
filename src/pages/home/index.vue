<script setup lang="ts">
import HomeFeatureGrid from '@/components/business/home/HomeFeatureGrid.vue'
import HomeHero from '@/components/business/home/HomeHero.vue'
import HomeWorkflow from '@/components/business/home/HomeWorkflow.vue'
</script>

<template>
  <main class="min-h-[calc(100vh-74px)] bg-[#080a10]">
    <HomeHero />
    <HomeFeatureGrid />
    <HomeWorkflow />
  </main>
</template>
