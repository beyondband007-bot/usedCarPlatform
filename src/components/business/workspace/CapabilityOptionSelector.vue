<script setup lang="ts">
import { NCard, NProgress, NTag } from "naive-ui";
import { motion } from "motion-v";

import type { WorkspaceCapability } from "@/types/workspace";

defineProps<{
  capability: WorkspaceCapability;
  selectedOptionId: string;
}>();

const emit = defineEmits<{
  select: [id: string];
}>();
</script>

<template>
  <motion.div
    :key="capability.code"
    :initial="{ opacity: 0, y: 18 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.42, delay: 0.08 }"
  >
    <NCard
      v-if="capability.options.length"
      :bordered="false"
      class="border border-white/10 bg-white/[0.06] shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl"
    >
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <h2 class="text-xl font-black text-white">
            {{ capability.selectorTitle }}
          </h2>
          <NTag type="info" :bordered="false" round>{{
            capability.selectorTag
          }}</NTag>
        </div>
      </template>

      <div class="grid gap-4 sm:grid-cols-2">
        <motion.div
          v-for="option in capability.options"
          :key="option.id"
          :while-hover="{ y: -4, scale: 1.01 }"
          role="button"
          tabindex="0"
          class="overflow-hidden rounded-2xl border bg-white/[0.04] text-left transition"
          :class="
            option.id === selectedOptionId
              ? 'border-blue-400 shadow-[0_0_28px_rgba(68,132,255,0.22)]'
              : 'border-white/10'
          "
          @click="emit('select', option.id)"
          @keydown.enter="emit('select', option.id)"
          @keydown.space.prevent="emit('select', option.id)"
        >
          <img
            class="h-28 w-full object-cover"
            :src="option.image"
            :alt="option.title"
            loading="lazy"
          />
          <div class="p-3 text-center text-base font-black text-white">
            {{ option.title }}
          </div>
        </motion.div>
      </div>

      <div class="mt-5">
        <NProgress
          type="line"
          :percentage="58"
          :show-indicator="false"
          status="success"
        />
      </div>
    </NCard>
  </motion.div>
</template>
<style scoped>
.n-card {
  /* border: 0; */
  border-radius: 12px;
}
</style>
