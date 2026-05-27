<script setup lang="ts">
import { NCard, NProgress } from 'naive-ui'
import { motion } from 'motion-v'

const steps = ['上传车图', '选择场景', '生成素材', '成片交付']
</script>

<template>
  <section class="px-5 pb-20 text-center 2xl:px-8">
    <motion.div
      :initial="{ opacity: 0, y: 20 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.22 }"
    >
      <h2 class="text-4xl font-black text-white md:text-5xl">全链路 AI 汽车电商内容生成</h2>
      <p class="mx-auto mt-4 max-w-2xl text-lg font-semibold leading-8 text-slate-400">
        从单图上传到企业级并发交付，围绕汽车电商素材生产建立稳定工作流。
      </p>

      <NCard
        :bordered="false"
        class="mx-auto mt-9 max-w-6xl border border-white/10 bg-white/[0.06] shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl"
      >
        <div class="grid gap-4 md:grid-cols-4">
          <div v-for="(step, index) in steps" :key="step" class="rounded-2xl bg-white/[0.06] p-5 text-left">
            <span class="text-sm font-black text-amber-200">0{{ index + 1 }}</span>
            <h3 class="mt-3 text-xl font-black text-white">{{ step }}</h3>
            <NProgress
              class="mt-5"
              type="line"
              :percentage="(index + 1) * 25"
              :show-indicator="false"
              status="success"
            />
          </div>
        </div>
      </NCard>
    </motion.div>
  </section>
</template>
