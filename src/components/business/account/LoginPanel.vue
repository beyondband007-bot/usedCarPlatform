<script setup lang="ts">
import { NButton, NCard, NInput } from 'naive-ui'
import { motion } from 'motion-v'
</script>

<template>
  <motion.div
    :initial="{ opacity: 0, x: 28 }"
    :animate="{ opacity: 1, x: 0 }"
    :transition="{ duration: 0.5, delay: 0.08 }"
    class="w-full max-w-xl"
  >
    <NCard
      :bordered="false"
      class="border border-white/10 bg-white/[0.07] shadow-[0_28px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl"
    >
      <h1 class="text-3xl font-medium text-white">企业账号登录</h1>
      <p class="mt-5 text-lg font-semibold text-slate-400">进入脸谱AI汽车电商内容平台</p>

      <div class="mt-8 grid gap-5">
        <label class="grid gap-2 text-base font-bold text-slate-300">
          手机号
          <NInput size="large" value="+86 · 11 位手机号" />
        </label>
        <label class="grid gap-2 text-base font-bold text-slate-300">
          密码
          <NInput size="large" type="password" value="password" />
        </label>
      </div>

      <NButton type="warning" size="large" block class="mt-7 !h-16 !rounded-xl">
        登录
      </NButton>

      <div class="mt-6 flex justify-center gap-3 text-base font-semibold text-slate-500">
        <a href="#" class="hover:text-amber-200">忘记密码？</a>
        <span>|</span>
        <a href="#" class="hover:text-amber-200">申请开通企业租户</a>
      </div>
    </NCard>
  </motion.div>
</template>
