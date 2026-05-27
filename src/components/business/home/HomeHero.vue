<script setup lang="ts">
import { NButton, NTag } from 'naive-ui'
import { motion } from 'motion-v'
</script>

<template>
  <section
    class="relative isolate min-h-[520px] overflow-hidden rounded-b-[28px] border-b border-white/10 bg-[#090b11] xl:min-h-[560px]"
  >
    <img
      class="absolute inset-0 h-full w-full object-cover opacity-70"
      src="https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=2200&q=82"
      alt="黑色豪华汽车湖边展示"
    />
    <div class="absolute inset-0 bg-gradient-to-r from-[#080a10] via-[#080a10]/80 to-[#080a10]/20"></div>
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_24%_40%,rgba(214,179,111,0.18),transparent_32%)]"></div>

    <motion.div
      :initial="{ opacity: 0, y: 28 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.62, ease: 'easeOut' }"
    class="relative z-10 flex min-h-[520px] max-w-4xl flex-col items-start justify-center px-6 py-14 lg:px-14 xl:min-h-[560px] xl:px-16"
    >
      <NTag :bordered="false" round class="mb-7 bg-amber-400/10 text-amber-200">
        AI CAR STUDIO
      </NTag>
      <h1 class="max-w-2xl text-[2.3rem] font-black leading-tight tracking-normal text-white md:text-5xl xl:text-6xl">
        让每一辆车，都值得被精心呈现
      </h1>
      <p class="mt-6 max-w-2xl text-lg font-bold leading-8 text-slate-200 md:text-2xl xl:text-3xl xl:leading-9">
        针对汽车电商、出海车商打造专业级的内容生成平台
      </p>
      <RouterLink to="/workspace" class="mt-8 xl:mt-10">
        <NButton type="warning" size="large" round class="min-w-56 font-black">
          进入视觉工作台
        </NButton>
      </RouterLink>
    </motion.div>
  </section>
</template>
