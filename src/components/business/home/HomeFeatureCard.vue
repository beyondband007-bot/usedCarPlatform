<script setup lang="ts">
import { NButton, NCard, NTag } from "naive-ui";
import { motion } from "motion-v";

import type { FeatureEntry } from "@/types/prototype";

defineProps<{
  entry: FeatureEntry;
  index: number;
}>();
</script>

<template>
  <motion.div
    :initial="{ opacity: 0, y: 24 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.45, delay: index * 0.08 }"
    :while-hover="{ y: -6 }"
    class="h-full min-w-0"
  >
    <NCard
      :bordered="false"
      class="h-full overflow-hidden border border-white/10 bg-white/[0.06] shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl"
      content-class="!p-0"
    >
      <div class="grid min-h-[280px] gap-5 p-6 lg:grid-cols-[0.9fr_1.1fr] xl:min-h-[292px] xl:gap-6 xl:p-8">
        <div class="relative z-10 flex min-w-0 flex-col items-start justify-center">
          <NTag
            :type="entry.highlighted ? 'warning' : entry.dark ? 'info' : 'success'"
            :bordered="false"
            round
            class="mb-5"
          >
            AI 能力
          </NTag>
          <h2 class="text-2xl font-black tracking-normal text-white xl:text-3xl">
            {{ entry.title }}
          </h2>
          <p class="mt-4 max-w-xs text-base font-semibold leading-7 text-slate-400 xl:text-lg xl:leading-8">
            {{ entry.description }}
          </p>
          <RouterLink v-if="entry.to" :to="entry.to" class="mt-7">
            <NButton :type="entry.highlighted ? 'warning' : 'primary'" round>
              {{ entry.action }}
            </NButton>
          </RouterLink>
          <NButton v-else class="mt-7" secondary round>
            {{ entry.action }}
          </NButton>
        </div>

        <div class="relative min-h-[190px] overflow-hidden rounded-2xl border border-white/10 xl:min-h-[210px]">
          <img
            class="h-full w-full object-cover"
            :src="entry.image"
            :alt="entry.title"
            loading="lazy"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-[#080a10]/70 to-transparent"></div>
        </div>
      </div>
    </NCard>
  </motion.div>
</template>
