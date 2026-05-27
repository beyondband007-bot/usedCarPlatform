<script setup lang="ts">
import { NButton, NCard, NTag } from 'naive-ui'
import { motion } from 'motion-v'

import type { PricingPlan } from '@/types/prototype'

defineProps<{
  plan: PricingPlan
  index: number
}>()
</script>

<template>
  <motion.div
    :initial="{ opacity: 0, y: 22 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.42, delay: index * 0.08 }"
    :while-hover="{ y: -6 }"
    class="h-full"
  >
    <NCard
      :bordered="false"
      class="relative h-full min-h-[520px] border bg-white/[0.06] shadow-[0_28px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl"
      :class="plan.featured ? 'border-amber-300/70' : 'border-white/10'"
    >
      <NTag
        v-if="plan.badge"
        type="warning"
        round
        :bordered="false"
        class="absolute right-8 top-8"
      >
        {{ plan.badge }}
      </NTag>

      <h2 class="text-3xl font-black text-white">{{ plan.name }}</h2>
      <p class="mt-9 text-5xl font-black text-white">
        {{ plan.price }}
        <span class="text-lg font-bold text-slate-400">/ 套餐</span>
      </p>

      <ul class="mt-8 grid gap-4 text-lg font-semibold text-slate-300">
        <li v-for="benefit in plan.benefits" :key="benefit" class="flex gap-3">
          <span class="text-emerald-300">✓</span>
          <span>{{ benefit }}</span>
        </li>
      </ul>

      <NButton type="warning" size="large" block class="absolute bottom-8 left-8 right-8 !w-auto !rounded-xl">
        {{ plan.action }}
      </NButton>
    </NCard>
  </motion.div>
</template>
