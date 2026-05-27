<script setup lang="ts">
import { NBadge } from 'naive-ui'

import { topNavigation } from '@/constants/prototype'
</script>

<template>
  <header
    class="sticky top-0 z-50 flex min-h-[74px] items-center gap-5 overflow-x-auto border-b border-white/10 bg-[#11131b]/95 px-5 text-white backdrop-blur-xl"
  >
    <RouterLink to="/home" class="shrink-0 text-2xl font-black text-[#f2a20c]">
      可点击原型 v0.3
    </RouterLink>
    <p class="hidden shrink-0 text-base font-semibold text-slate-500 xl:block">
      脸谱AI汽车电商内容平台 · 第一版视觉能力
    </p>

    <nav class="flex shrink-0 items-center gap-3" aria-label="主导航">
      <RouterLink
        v-for="item in topNavigation"
        :key="item.path"
        :to="item.path"
        class="inline-flex min-h-[42px] items-center rounded-full border border-slate-700 px-5 text-base font-bold text-slate-400 transition duration-200 hover:border-amber-500/80 hover:bg-amber-500/10 hover:text-amber-200"
        active-class="border-amber-500/80 bg-amber-500/15 text-amber-200 shadow-[0_0_24px_rgba(217,150,42,0.24)]"
      >
        {{ item.label }}
      </RouterLink>
    </nav>

    <NBadge dot type="success" class="ml-auto hidden lg:block">
      <span class="text-sm font-semibold text-slate-400">AI Ready</span>
    </NBadge>
  </header>
</template>
