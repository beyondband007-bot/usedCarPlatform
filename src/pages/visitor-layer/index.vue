<script setup lang="ts">
import { NButton, NCard, NInput, NTag } from "naive-ui";
import { motion } from "motion-v";
</script>

<template>
  <main class="grid min-h-[calc(100vh-var(--app-header-offset))] place-items-center bg-[var(--app-bg)] p-5">
    <motion.section
      :initial="{ opacity: 0, y: 24 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.46 }"
      class="w-full max-w-3xl text-center"
    >
      <NTag type="warning" round :bordered="false">\u8bbf\u5ba2\u6d6e\u5c42</NTag>
      <h1 class="mt-5 text-4xl font-black text-white md:text-5xl">\u8bbf\u5ba2\u5f15\u5bfc\u4e0e\u7559\u8d44\u6d6e\u5c42</h1>
      <p class="mx-auto mt-5 max-w-2xl text-lg font-semibold leading-8 text-slate-400">
        \u5f53\u524d\u4e3a\u9759\u6001\u5360\u4f4d\u9875\u9762\uff0c\u540e\u7eed\u53ef\u63a5\u5165\u8bd5\u7528\u7533\u8bf7\u3001\u5ba2\u670d\u4e8c\u7ef4\u7801\u548c\u4f01\u4e1a\u8d26\u53f7\u5f00\u901a\u5165\u53e3\u3002
      </p>

      <NCard
        :bordered="false"
        class="mx-auto mt-10 max-w-md border border-white/10 bg-white/[0.07] text-left shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl"
      >
        <strong class="text-2xl text-white">\u7533\u8bf7\u8bd5\u7528\u89c6\u89c9\u5de5\u4f5c\u53f0</strong>
        <p class="mt-3 text-base font-semibold text-slate-400">\u7559\u4e0b\u624b\u673a\u53f7\uff0c\u83b7\u53d6\u4f01\u4e1a\u5957\u9910\u6f14\u793a\u540d\u989d\u3002</p>
        <NInput class="mt-6" size="large" placeholder="\u8bf7\u8f93\u5165\u624b\u673a\u53f7" />
        <NButton type="warning" size="large" block class="mt-4 !rounded-xl">
          \u63d0\u4ea4\u7533\u8bf7
        </NButton>
      </NCard>
    </motion.section>
  </main>
</template>
