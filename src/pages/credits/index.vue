<script setup lang="ts">
import { NButton, NCard, NSelect } from 'naive-ui'

import SecondaryNav from '@/components/common/SecondaryNav.vue'
import PointTransactionCard from '@/components/business/points/PointTransactionCard.vue'
import { pointTransactions } from '@/constants/prototype'

const filterOptions = [
  { label: '全部时间', value: 'all-time' },
  { label: '近 7 天', value: '7d' },
  { label: '近 30 天', value: '30d' },
]

const typeOptions = [
  { label: '全部类型', value: 'all-type' },
  { label: '套餐赠送', value: 'package' },
  { label: '任务消耗', value: 'consume' },
]
</script>

<template>
  <main class="min-h-[calc(100vh-74px)] bg-[#080a10]">
    <SecondaryNav />

    <section class="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <div>
        <h1 class="text-4xl font-black text-white">积分查询</h1>
        <p class="mt-3 text-lg font-semibold text-slate-400">
          查看套餐赠送、任务消耗、失败退款等积分流水。
        </p>
      </div>

      <NCard :bordered="false" class="mt-8 border border-white/10 bg-white/[0.05] backdrop-blur-xl">
        <div class="grid gap-3 md:grid-cols-[180px_180px_180px_auto]">
          <NSelect :options="filterOptions" default-value="all-time" />
          <NSelect :options="typeOptions" default-value="all-type" />
          <NSelect :options="[{ label: '全部账号', value: 'all-account' }]" default-value="all-account" />
          <NButton type="primary" ghost>导出流水</NButton>
        </div>
      </NCard>

      <div class="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <PointTransactionCard
          v-for="(item, index) in pointTransactions"
          :key="item.title"
          :item="item"
          :index="index"
        />
      </div>
    </section>
  </main>
</template>
