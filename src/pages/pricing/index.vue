<script setup lang="ts">
import { NButton, NCard } from 'naive-ui'
import { motion } from 'motion-v'

import PricingPlanCard from '@/components/business/pricing/PricingPlanCard.vue'
import { pricingPlans } from '@/constants/prototype'
</script>

<template>
  <main class="min-h-[calc(100vh-74px)] bg-[#080a10]">
    <section class="border-b border-white/10 bg-[#0a0c12] px-6 py-6">
      <div class="flex items-center justify-between">
        <strong class="text-xl font-black text-white">脸谱AI · 企业套餐</strong>
        <RouterLink to="/home" class="text-base font-bold text-slate-400 hover:text-amber-200">
          返回首页
        </RouterLink>
      </div>
    </section>

    <section class="relative overflow-hidden bg-[#171923] px-6 py-24 text-center">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(214,179,111,0.15),transparent_34%)]"></div>
      <motion.div
        :initial="{ opacity: 0, y: 24 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.5 }"
        class="relative z-10 mx-auto max-w-3xl"
      >
        <h1 class="text-5xl font-light text-white">企业套餐</h1>
        <p class="mt-7 text-2xl font-bold leading-10 text-slate-400">
          面向汽车电商与出海车商，按账号、积分、外观图组并发和专属场景配置团队产能。
        </p>
        <NButton type="warning" size="large" round class="mt-9 min-w-48">
          预约演示
        </NButton>
      </motion.div>
    </section>

    <section class="-mt-14 px-6 pb-24">
      <div class="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">
        <PricingPlanCard
          v-for="(plan, index) in pricingPlans"
          :key="plan.name"
          :plan="plan"
          :index="index"
        />
      </div>
    </section>

    <section class="px-6 pb-20">
      <NCard
        :bordered="false"
        class="mx-auto max-w-7xl border border-white/10 bg-white/[0.05] backdrop-blur-xl"
      >
        <div class="grid gap-5 md:grid-cols-3">
          <div class="rounded-2xl bg-white/[0.05] p-5">
            <p class="text-sm font-black text-amber-200">账号并发</p>
            <strong class="mt-3 block text-3xl text-white">1 - 20</strong>
          </div>
          <div class="rounded-2xl bg-white/[0.05] p-5">
            <p class="text-sm font-black text-amber-200">积分到账</p>
            <strong class="mt-3 block text-3xl text-white">200 - 9,800</strong>
          </div>
          <div class="rounded-2xl bg-white/[0.05] p-5">
            <p class="text-sm font-black text-amber-200">专属场景</p>
            <strong class="mt-3 block text-3xl text-white">可定制</strong>
          </div>
        </div>
      </NCard>
    </section>
  </main>
</template>
