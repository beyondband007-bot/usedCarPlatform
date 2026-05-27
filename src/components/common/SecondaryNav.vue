<script setup lang="ts">
import { NTag } from 'naive-ui'

import { secondaryNavigation } from '@/constants/prototype'
</script>

<template>
  <section
    class="flex min-h-[78px] flex-col gap-3 border-b border-white/10 bg-[#0e1119]/90 px-5 py-4 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-0"
  >
    <nav class="flex items-center gap-4 overflow-x-auto text-base font-bold text-slate-400 lg:text-lg">
      <RouterLink
        v-for="item in secondaryNavigation"
        :key="item.path"
        :to="item.path"
        class="shrink-0 transition hover:text-amber-200"
        active-class="text-amber-200"
      >
        {{ item.label }}
      </RouterLink>
    </nav>

    <NTag type="warning" round size="large" :bordered="false" class="w-fit">
      积分余额 1,250 💎
    </NTag>
  </section>
</template>
