<script setup lang="ts">
import { NButton, NCard, NTag } from 'naive-ui'

import SecondaryNav from '@/components/common/SecondaryNav.vue'
import PackageOptionCard from '@/components/business/package/PackageOptionCard.vue'
import { packageOptions } from '@/constants/prototype'
</script>

<template>
  <main class="min-h-[calc(100vh-74px)] bg-[#080a10]">
    <SecondaryNav />

    <section class="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <NTag type="info" round :bordered="false">当前企业套餐</NTag>
      <h1 class="mt-5 text-5xl font-light text-white">企业团队档</h1>
      <p class="mt-3 text-xl font-bold text-slate-400">
        可用积分 1,250 · 账号使用 3 / 5 · 图组并发 2 / 5 · 专属场景 0 / 0
      </p>

      <h2 class="mt-10 text-2xl font-black text-white">选择企业套餐</h2>
      <div class="mt-6 grid gap-5 lg:grid-cols-3">
        <PackageOptionCard
          v-for="(item, index) in packageOptions"
          :key="item.price"
          :item="item"
          :index="index"
        />
      </div>

      <NCard :bordered="false" class="mt-8 border border-white/10 bg-white/[0.05] backdrop-blur-xl">
        <h2 class="text-2xl font-black text-white">积分流水</h2>
        <p class="mt-5 text-lg font-bold text-slate-400">
          2026-05-20 套餐赠送 +550 · 2026-05-19 单张生成 -15 · 2026-05-18 失败退款 +15
        </p>
        <NButton type="warning" size="large" class="mt-7 !rounded-xl">
          预约演示
        </NButton>
      </NCard>
    </section>
  </main>
</template>
