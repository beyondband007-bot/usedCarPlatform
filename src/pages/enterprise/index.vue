<script setup lang="ts">
import LoginPanel from '@/components/business/account/LoginPanel.vue'
import LoginShowcase from '@/components/business/account/LoginShowcase.vue'
</script>

<template>
  <main class="grid min-h-[calc(100vh-var(--app-header-offset))] gap-8 bg-[var(--app-bg)] p-5 lg:grid-cols-[1.1fr_1fr] lg:p-12">
    <section class="grid place-items-center rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
      <LoginShowcase />
    </section>

    <section class="grid place-items-center rounded-[28px] border border-white/10 bg-[#0d1018]/80 p-6 backdrop-blur-xl">
      <LoginPanel />
    </section>
  </main>
</template>
