<script setup lang="ts">
import { NCard, NTag, NUpload, NUploadDragger } from "naive-ui";
import { motion } from "motion-v";

import type { WorkspaceCapability } from "@/types/workspace";

defineProps<{
  capability: WorkspaceCapability;
}>();
</script>

<template>
  <motion.div
    :key="capability.code"
    :initial="{ opacity: 0, y: 18 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.42 }"
  >
    <NCard
      :bordered="false"
      style="border: 0"
      class="border border-white/10 bg-white/[0.06] shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl"
    >
      <template #header>
        <div>
          <h1 class="text-2xl font-black text-white">{{ capability.title }}</h1>
          <p class="mt-2 text-base font-semibold leading-7 text-slate-400">
            {{ capability.description }}
          </p>
        </div>
      </template>

      <NUpload :show-file-list="false" :accept="capability.accept">
        <NUploadDragger
          class="!rounded-2xl !border-dashed !border-white/15 !bg-[#101621]/70 !py-10"
        >
          <div class="flex flex-col items-center text-center">
            <span class="text-4xl">📷</span>
            <strong class="mt-4 text-xl text-white">{{
              capability.uploadTitle
            }}</strong>
            <span class="mt-2 text-sm font-semibold text-slate-400">
              {{ capability.uploadHint }}
            </span>
            <NTag :bordered="false" round size="small" class="mt-4">
              {{ capability.requiredLabel }}
            </NTag>
          </div>
        </NUploadDragger>
      </NUpload>
    </NCard>
  </motion.div>
</template>
<style scoped>
.n-card {
  background: #0a0d13;
}
</style>
