<script setup lang="ts">
import { NCard, NDataTable, NTag } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { h } from 'vue'

interface HistoryRow {
  key: number
  task: string
  type: string
  status: string
  createdAt: string
}

const columns: DataTableColumns<HistoryRow> = [
  { title: '任务名称', key: 'task' },
  { title: '类型', key: 'type' },
  {
    title: '状态',
    key: 'status',
    render(row) {
      return h(NTag, { type: 'info', round: true, bordered: false }, { default: () => row.status })
    },
  },
  { title: '创建时间', key: 'createdAt' },
]

const data: HistoryRow[] = [
  { key: 1, task: '经典白棚生成', type: '单图生成', status: 'success', createdAt: '2026-05-20 09:32' },
  { key: 2, task: '5月展厅批量上新', type: '批量生成', status: 'generating', createdAt: '2026-05-20 09:18' },
]
</script>

<template>
  <main class="min-h-[calc(100vh-74px)] bg-[#080a10] p-5 lg:p-8">
    <NCard :bordered="false" class="border border-white/10 bg-white/[0.06] backdrop-blur-xl">
      <NTag type="info" round :bordered="false">生成记录</NTag>
      <h1 class="mt-4 text-3xl font-black text-white">AI 生成历史</h1>
      <p class="mt-3 max-w-3xl text-lg font-semibold leading-8 text-slate-400">
        用于承载历史任务检索、结果复用、消耗追踪、失败重试和素材归档能力。
      </p>
      <NDataTable class="mt-8" :columns="columns" :data="data" :bordered="false" />
    </NCard>
  </main>
</template>
