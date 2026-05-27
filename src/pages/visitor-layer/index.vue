<script setup lang="ts">
import { NButton, NCard, NInput, NTag } from 'naive-ui'
import { motion } from 'motion-v'
</script>

<template>
  <main class="grid min-h-[calc(100vh-74px)] place-items-center bg-[#080a10] p-5">
    <motion.section
      :initial="{ opacity: 0, y: 24 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.46 }"
      class="w-full max-w-3xl text-center"
    >
      <NTag type="warning" round :bordered="false">访客浮层</NTag>
      <h1 class="mt-5 text-4xl font-black text-white md:text-5xl">访客引导与留资浮层</h1>
      <p class="mx-auto mt-5 max-w-2xl text-lg font-semibold leading-8 text-slate-400">
        当前为静态占位页面，后续可接入试用申请、客服二维码和企业账号开通入口。
      </p>

      <NCard
        :bordered="false"
        class="mx-auto mt-10 max-w-md border border-white/10 bg-white/[0.07] text-left shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl"
      >
        <strong class="text-2xl text-white">申请试用视觉工作台</strong>
        <p class="mt-3 text-base font-semibold text-slate-400">留下手机号，获取企业套餐演示名额。</p>
        <NInput class="mt-6" size="large" placeholder="请输入手机号" />
        <NButton type="warning" size="large" block class="mt-4 !rounded-xl">
          提交申请
        </NButton>
      </NCard>
    </motion.section>
  </main>
</template>
