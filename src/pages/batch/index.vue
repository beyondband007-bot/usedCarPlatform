<script setup lang="ts">
import { NButton, NCard, NProgress, NSkeleton, NTag } from "naive-ui";
</script>

<template>
  <main class="min-h-[calc(100vh-var(--app-header-offset))] bg-[var(--app-bg)] p-5 lg:p-8">
    <NCard :bordered="false" class="border border-white/10 bg-white/[0.06] backdrop-blur-xl">
      <template #header>
        <div>
          <NTag type="info" round :bordered="false">\u6279\u91cf\u751f\u6210</NTag>
          <h1 class="mt-4 text-3xl font-black text-white">\u6279\u91cf\u4efb\u52a1\u5904\u7406</h1>
          <p class="mt-3 max-w-3xl text-lg font-semibold leading-8 text-slate-400">
            \u6279\u91cf\u751f\u6210\u6a21\u5757\u9884\u7559\u8f66\u6e90\u5bfc\u5165\u3001\u6a21\u677f\u9009\u62e9\u3001\u4efb\u52a1\u961f\u5217\u3001\u5b9e\u65f6\u8fdb\u5ea6\u548c\u7ed3\u679c\u5bfc\u51fa\u7ed3\u6784\u3002
          </p>
        </div>
      </template>

      <div class="grid gap-5 lg:grid-cols-[360px_1fr]">
        <NCard :bordered="false" class="border border-white/10 bg-[#101621]">
          <h2 class="text-xl font-black text-white">\u6279\u91cf\u914d\u7f6e</h2>
          <div class="mt-5 grid gap-3">
            <NButton block secondary>\u8f66\u6e90\u6570\u636e\u5bfc\u5165</NButton>
            <NButton block secondary>\u8425\u9500\u6a21\u677f\u9009\u62e9</NButton>
            <NButton block secondary>\u751f\u6210\u89c4\u5219\u914d\u7f6e</NButton>
          </div>
        </NCard>

        <NCard :bordered="false" class="border border-white/10 bg-[#101621]">
          <div class="flex items-center justify-between gap-4">
            <h2 class="text-xl font-black text-white">\u4efb\u52a1\u961f\u5217</h2>
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
