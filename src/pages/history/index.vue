<script setup lang="ts">
import { h } from "vue";
import { NCard, NDataTable, NTag } from "naive-ui";
import type { DataTableColumns } from "naive-ui";

interface HistoryRow {
  key: number;
  task: string;
  type: string;
  status: string;
  createdAt: string;
}

const columns: DataTableColumns<HistoryRow> = [
  { title: "\u4efb\u52a1\u540d\u79f0", key: "task" },
  { title: "\u7c7b\u578b", key: "type" },
  {
    title: "\u72b6\u6001",
    key: "status",
    render(row) {
      return h(NTag, { type: "info", round: true, bordered: false }, { default: () => row.status });
    },
  },
  { title: "\u521b\u5efa\u65f6\u95f4", key: "createdAt" },
];

const data: HistoryRow[] = [
  { key: 1, task: "\u7ecf\u5178\u767d\u68da\u751f\u6210", type: "\u5355\u56fe\u751f\u6210", status: "success", createdAt: "2026-05-20 09:32" },
  { key: 2, task: "5\u6708\u5c55\u5385\u6279\u91cf\u4e0a\u65b0", type: "\u6279\u91cf\u751f\u6210", status: "generating", createdAt: "2026-05-20 09:18" },
];
</script>

<template>
  <main class="min-h-[calc(100vh-var(--app-header-offset))] bg-[var(--app-bg)] p-5 lg:p-8">
    <NCard :bordered="false" class="border border-white/10 bg-white/[0.06] backdrop-blur-xl">
      <NTag type="info" round :bordered="false">\u751f\u6210\u8bb0\u5f55</NTag>
      <h1 class="mt-4 text-3xl font-black text-white">AI \u751f\u6210\u5386\u53f2</h1>
      <p class="mt-3 max-w-3xl text-lg font-semibold leading-8 text-slate-400">
        \u7528\u4e8e\u627f\u8f7d\u5386\u53f2\u4efb\u52a1\u68c0\u7d22\u3001\u7ed3\u679c\u590d\u7528\u3001\u6d88\u8017\u8ffd\u8e2a\u3001\u5931\u8d25\u91cd\u8bd5\u548c\u7d20\u6750\u5f52\u6863\u80fd\u529b\u3002
      </p>
      <NDataTable class="mt-8" :columns="columns" :data="data" :bordered="false" />
    </NCard>
  </main>
</template>
