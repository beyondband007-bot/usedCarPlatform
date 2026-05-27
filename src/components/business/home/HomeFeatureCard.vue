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
    class="h-full"
  >
    <NCard
      :bordered="false"
      class="h-full overflow-hidden border border-white/10 bg-white/[0.06] shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl"
      content-class="!p-0"
    >
      <div class="grid min-h-[292px] gap-6 p-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div class="relative z-10 flex flex-col items-start justify-center">
          <NTag
            :type="
              entry.highlighted ? 'warning' : entry.dark ? 'info' : 'success'
            "
            :bordered="false"
            round
            class="mb-5"
          >
            AI 能力
          </NTag>
          <h2 class="text-3xl font-black text-white">{{ entry.title }}</h2>
          <p
            class="mt-4 max-w-xs text-lg font-semibold leading-8 text-slate-400"
          >
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

        <div
          class="relative min-h-[210px] overflow-hidden rounded-2xl border border-white/10"
        >
          <img
            class="h-full w-full object-cover"
            :src="entry.image"
            :alt="entry.title"
            loading="lazy"
          />
          <div
            class="absolute inset-0 bg-gradient-to-t from-[#080a10]/70 to-transparent"
          ></div>
        </div>
      </div>
    </NCard>
  </motion.div>
</template>
<style scoped>
::v-deep .NCard {
  border-radius: 0;
}
</style>
