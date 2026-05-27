<script setup lang="ts">
import { NButton, NCard, NProgress, NSkeleton, NTag } from 'naive-ui'
</script>

<template>
  <main class="min-h-[calc(100vh-74px)] bg-[#080a10] p-5 lg:p-8">
    <NCard :bordered="false" class="border border-white/10 bg-white/[0.06] backdrop-blur-xl">
      <template #header>
        <div>
          <NTag type="info" round :bordered="false">批量生成</NTag>
          <h1 class="mt-4 text-3xl font-black text-white">批量任务处理</h1>
          <p class="mt-3 max-w-3xl text-lg font-semibold leading-8 text-slate-400">
            批量生成模块预留车源导入、模板选择、任务队列、实时进度和结果导出结构。
          </p>
        </div>
      </template>

      <div class="grid gap-5 lg:grid-cols-[360px_1fr]">
        <NCard :bordered="false" class="border border-white/10 bg-[#101621]">
          <h2 class="text-xl font-black text-white">批量配置</h2>
          <div class="mt-5 grid gap-3">
            <NButton block secondary>车源数据导入</NButton>
            <NButton block secondary>营销模板选择</NButton>
            <NButton block secondary>生成规则配置</NButton>
          </div>
        </NCard>

        <NCard :bordered="false" class="border border-white/10 bg-[#101621]">
          <div class="flex items-center justify-between gap-4">
            <h2 class="text-xl font-black text-white">任务队列</h2>
            <NTag round :bordered="false" type="warning">waiting</NTag>
          </div>
          <NProgress class="mt-5" processing :percentage="28" :show-indicator="false" />
          <div class="mt-5 grid gap-3">
            <NSkeleton v-for="item in 3" :key="item" height="58px" class="!rounded-2xl" />
          </div>
        </NCard>
      </div>
    </NCard>
  </main>
</template>
