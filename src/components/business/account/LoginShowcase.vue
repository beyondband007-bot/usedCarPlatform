<script setup lang="ts">
import { NCard, NTag } from 'naive-ui'
import { motion } from 'motion-v'
</script>

<template>
  <motion.div
    :initial="{ opacity: 0, x: -28 }"
    :animate="{ opacity: 1, x: 0 }"
    :transition="{ duration: 0.5 }"
    class="w-full max-w-2xl"
  >
    <NCard
      :bordered="false"
      class="overflow-hidden border border-white/10 bg-white/[0.06] shadow-[0_28px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl"
      content-class="!p-0"
    >
      <div class="relative">
        <img
          class="h-[455px] w-full object-cover"
          src="https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=920&q=82"
          alt="车辆外观优化案例"
        />
        <div class="absolute inset-y-0 left-0 w-[45%] bg-[#080a10]/55"></div>
        <div class="absolute inset-y-0 left-[45%] w-px bg-white/70"></div>
        <NTag class="absolute left-5 top-5" type="warning" round :bordered="false">
          Before / After
        </NTag>
      </div>
    </NCard>
    <p class="mt-5 text-center text-lg font-bold text-slate-500">案例轮播 · 5s 切换（演示静态）</p>
  </motion.div>
</template>
