<script setup lang="ts">
import { NButton, NCard, NTag } from "naive-ui";
import { motion } from "motion-v";

import type { PricingPlan } from "@/types/prototype";

defineProps<{
  plan: PricingPlan;
  index: number;
}>();
</script>

<template>
  <motion.div
    :initial="{ opacity: 0, y: 22 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.42, delay: index * 0.08 }"
    :while-hover="{ y: -6 }"
    class="h-full min-w-0"
  >
    <NCard
      :bordered="false"
      class="h-full border bg-[#10141d] shadow-[0_18px_60px_rgba(0,0,0,0.22)]"
      :class="plan.featured ? 'border-amber-300/70' : 'border-white/10'"
      content-class="!p-0"
    >
      <div class="flex h-full min-h-[360px] flex-col px-6 py-6 xl:px-7 xl:py-7">
        <div class="mb-5 flex min-h-7 items-start justify-between gap-4">
          <h2
            class="text-2xl font-black tracking-normal text-white xl:text-3xl"
          >
            {{ plan.name }}
          </h2>
          <NTag v-if="plan.badge" type="warning" round :bordered="false">
            {{ plan.badge }}
          </NTag>
        </div>

        <p
          class="flex items-end gap-2 text-4xl font-black tracking-normal text-white xl:text-5xl"
        >
          {{ plan.price }}
          <span class="pb-1 text-base font-bold text-slate-400 xl:text-lg"
            >/ 套餐</span
          >
        </p>

        <ul
          class="mt-7 grid gap-3 text-sm font-semibold leading-6 text-slate-300 xl:text-base"
        >
          <li
            v-for="benefit in plan.benefits"
            :key="benefit"
            class="flex gap-2"
          >
            <span class="mt-1 shrink-0 text-emerald-300">✓</span>
            <span class="min-w-0 flex-1">{{ benefit }}</span>
          </li>
        </ul>

        <div class="mt-auto pt-6">
          <NButton type="warning" size="large" block class="!rounded-xl">
            {{ plan.action }}
          </NButton>
        </div>
      </div>
    </NCard>
  </motion.div>
</template>
