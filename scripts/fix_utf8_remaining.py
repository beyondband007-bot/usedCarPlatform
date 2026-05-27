# -*- coding: utf-8 -*-
from pathlib import Path

BASE = Path(__file__).resolve().parents[1] / "src" / "pages"

FILES = {
    "batch/index.vue": r'''<script setup lang="ts">
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
''',
    "history/index.vue": r'''<script setup lang="ts">
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
''',
    "visitor-layer/index.vue": r'''<script setup lang="ts">
import { NButton, NCard, NInput, NTag } from "naive-ui";
import { motion } from "motion-v";
</script>

<template>
  <main class="grid min-h-[calc(100vh-var(--app-header-offset))] place-items-center bg-[var(--app-bg)] p-5">
    <motion.section
      :initial="{ opacity: 0, y: 24 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.46 }"
      class="w-full max-w-3xl text-center"
    >
      <NTag type="warning" round :bordered="false">\u8bbf\u5ba2\u6d6e\u5c42</NTag>
      <h1 class="mt-5 text-4xl font-black text-white md:text-5xl">\u8bbf\u5ba2\u5f15\u5bfc\u4e0e\u7559\u8d44\u6d6e\u5c42</h1>
      <p class="mx-auto mt-5 max-w-2xl text-lg font-semibold leading-8 text-slate-400">
        \u5f53\u524d\u4e3a\u9759\u6001\u5360\u4f4d\u9875\u9762\uff0c\u540e\u7eed\u53ef\u63a5\u5165\u8bd5\u7528\u7533\u8bf7\u3001\u5ba2\u670d\u4e8c\u7ef4\u7801\u548c\u4f01\u4e1a\u8d26\u53f7\u5f00\u901a\u5165\u53e3\u3002
      </p>

      <NCard
        :bordered="false"
        class="mx-auto mt-10 max-w-md border border-white/10 bg-white/[0.07] text-left shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl"
      >
        <strong class="text-2xl text-white">\u7533\u8bf7\u8bd5\u7528\u89c6\u89c9\u5de5\u4f5c\u53f0</strong>
        <p class="mt-3 text-base font-semibold text-slate-400">\u7559\u4e0b\u624b\u673a\u53f7\uff0c\u83b7\u53d6\u4f01\u4e1a\u5957\u9910\u6f14\u793a\u540d\u989d\u3002</p>
        <NInput class="mt-6" size="large" placeholder="\u8bf7\u8f93\u5165\u624b\u673a\u53f7" />
        <NButton type="warning" size="large" block class="mt-4 !rounded-xl">
          \u63d0\u4ea4\u7533\u8bf7
        </NButton>
      </NCard>
    </motion.section>
  </main>
</template>
''',
}

# credits is large - write separate data ts + thin vue
CONST_BASE = Path(__file__).resolve().parents[1] / "src" / "constants"
CREDITS_TS = r'''export type CreditFlowRow = {
  flowNo: string
  flowType: string
  delta: string
  balance: string
  account: string
  createdAt: string
  remark: string
}

export const creditsTypeOptions = [
  { label: "\u5168\u90e8\u7c7b\u578b", value: "all-type" },
  { label: "\u5957\u9910\u8d60\u9001", value: "package" },
  { label: "\u5355\u56fe\u751f\u6210", value: "single" },
  { label: "\u6279\u91cf\u4e0a\u65b0\u4efb\u52a1", value: "batch" },
  { label: "\u5931\u8d25\u9000\u6b3e", value: "refund" },
]

export const creditsAccountOptions = [
  { label: "\u5168\u90e8\u8d26\u53f7", value: "all-account" },
  { label: "\u4f01\u4e1a\u56e2\u961f\u6863", value: "team" },
  { label: "\u7ecf\u5178\u767d\u68da", value: "white-studio" },
  { label: "5\u6708\u5c55\u5385\u6279\u91cf\u4e0a\u65b0", value: "batch-may" },
]

export const creditsStats = [
  { label: "\u7d2f\u8ba1\u83b7\u5f97", value: "+12,850", tone: "success" as const },
  { label: "\u7d2f\u8ba1\u6d88\u8017", value: "-8,320", tone: "warning" as const },
  { label: "\u5f53\u524d\u53ef\u7528", value: "1,250", tone: "info" as const },
  { label: "\u8fd130\u5929\u6d41\u6c34", value: "+1,280", tone: "purple" as const },
]

export const creditsFlowData: CreditFlowRow[] = [
  {
    flowNo: "20260520090001",
    flowType: "\u5957\u9910\u8d60\u9001",
    delta: "+550",
    balance: "1,250",
    account: "\u4f01\u4e1a\u56e2\u961f\u6863",
    createdAt: "2026-05-20 09:00:00",
    remark: "\u4f01\u4e1a\u56e2\u961f\u6863\u5f00\u901a",
  },
  {
    flowNo: "20260520093202",
    flowType: "\u5355\u56fe\u751f\u6210",
    delta: "-15",
    balance: "700",
    account: "\u7ecf\u5178\u767d\u68da",
    createdAt: "2026-05-20 09:32:18",
    remark: "\u751f\u6210\u5355\u56fe\u6d88\u8017",
  },
  {
    flowNo: "20260520091803",
    flowType: "\u6279\u91cf\u4e0a\u65b0\u4efb\u52a1",
    delta: "-120",
    balance: "715",
    account: "5\u6708\u5c55\u5385\u6279\u91cf\u4e0a\u65b0",
    createdAt: "2026-05-20 09:18:45",
    remark: "\u6279\u91cf\u4e0a\u65b0\u4efb\u52a1\u6d88\u8017",
  },
  {
    flowNo: "20260519200504",
    flowType: "\u5931\u8d25\u9000\u6b3e",
    delta: "+15",
    balance: "835",
    account: "\u2014",
    createdAt: "2026-05-19 20:05:12",
    remark: "\u4efb\u52a1\u5931\u8d25\u81ea\u52a8\u9000\u56de",
  },
  {
    flowNo: "20260518153005",
    flowType: "\u5957\u9910\u8d60\u9001",
    delta: "+200",
    balance: "820",
    account: "\u57fa\u7840\u5957\u9910",
    createdAt: "2026-05-18 15:30:22",
    remark: "\u57fa\u7840\u5957\u9910\u8d60\u9001",
  },
]

export const creditsPageCopy = {
  title: "\u79ef\u5206\u67e5\u8be2",
  subtitle: "\u67e5\u770b\u5957\u9910\u8d60\u9001\u3001\u4efb\u52a1\u6d88\u8017\u3001\u5931\u8d25\u9000\u6b3e\u7b49\u79ef\u5206\u6d41\u6c34\u3002",
  datePlaceholder: "\u5168\u90e8\u65f6\u95f4",
  typePlaceholder: "\u5168\u90e8\u7c7b\u578b",
  accountPlaceholder: "\u5168\u90e8\u8d26\u53f7",
  export: "\u5bfc\u51fa\u6d41\u6c34",
  pointsUnit: "\u79ef\u5206",
  tableTitle: "\u79ef\u5206\u6d41\u6c34",
  colFlowNo: "\u6d41\u6c34\u7f16\u53f7",
  colFlowType: "\u6d41\u6c34\u7c7b\u578b",
  colDelta: "\u79ef\u5206\u53d8\u52a8",
  colBalance: "\u79ef\u5206\u4f59\u989d",
  colAccount: "\u5173\u8054\u8d26\u53f7",
  colCreatedAt: "\u53d1\u751f\u65f6\u95f4",
  colRemark: "\u5907\u6ce8",
  colAction: "\u64cd\u4f5c",
  viewDetail: "\u67e5\u770b\u8be6\u60c5",
} as const
'''

CREDITS_VUE = r'''<script setup lang="ts">
import { h } from "vue";
import { NButton, NCard, NDataTable, NDatePicker, NSelect, NTag } from "naive-ui";
import type { DataTableColumns } from "naive-ui";

import {
  creditsAccountOptions,
  creditsFlowData,
  creditsPageCopy,
  creditsStats,
  creditsTypeOptions,
  type CreditFlowRow,
} from "@/constants/credits-page";

const copy = creditsPageCopy;
const typeOptions = creditsTypeOptions;
const accountOptions = creditsAccountOptions;
const stats = creditsStats;
const data = creditsFlowData;

const columns: DataTableColumns<CreditFlowRow> = [
  { title: copy.colFlowNo, key: "flowNo" },
  {
    title: copy.colFlowType,
    key: "flowType",
    render(row) {
      const typeColor =
        row.flowType === "\u5957\u9910\u8d60\u9001" || row.flowType === "\u5931\u8d25\u9000\u6b3e"
          ? "success"
          : row.flowType === "\u5355\u56fe\u751f\u6210"
            ? "warning"
            : "error";
      return h(NTag, { type: typeColor, round: true, bordered: false }, () => row.flowType);
    },
  },
  {
    title: copy.colDelta,
    key: "delta",
    render(row) {
      return h(
        "span",
        { class: row.delta.startsWith("+") ? "text-emerald-500" : "text-orange-500" },
        row.delta,
      );
    },
  },
  { title: copy.colBalance, key: "balance" },
  { title: copy.colAccount, key: "account" },
  { title: copy.colCreatedAt, key: "createdAt" },
  { title: copy.colRemark, key: "remark" },
  {
    title: copy.colAction,
    key: "action",
    render() {
      return h("a", { class: "text-blue-500" }, copy.viewDetail);
    },
  },
];
</script>

<template>
  <main class="min-h-[calc(100vh-var(--app-header-offset))] bg-[var(--app-bg)] px-4 py-5 lg:px-6">
    <section class="mx-auto max-w-[1320px] rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
      <div class="flex min-h-[92px] items-center justify-between overflow-hidden rounded-md bg-gradient-to-r from-blue-50 via-white to-blue-100 px-6">
        <div>
          <h1 class="text-2xl font-black tracking-normal text-slate-900">{{ copy.title }}</h1>
          <p class="mt-2 text-sm font-semibold text-slate-500">{{ copy.subtitle }}</p>
        </div>
        <div class="hidden h-20 w-72 items-center justify-end md:flex">
          <div class="h-16 w-36 rounded-2xl bg-blue-500/90 shadow-[0_18px_40px_rgba(59,130,246,0.25)]"></div>
        </div>
      </div>

      <section class="mt-5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-6 py-5">
        <div class="grid gap-4 xl:grid-cols-[1fr_1fr_1fr_auto]">
          <NDatePicker type="daterange" clearable :placeholder="copy.datePlaceholder" />
          <NSelect :options="typeOptions" default-value="all-type" :placeholder="copy.typePlaceholder" />
          <NSelect :options="accountOptions" default-value="all-account" :placeholder="copy.accountPlaceholder" />
          <NButton ghost type="primary" class="min-w-36">{{ copy.export }}</NButton>
        </div>
      </section>

      <section class="mt-5 grid gap-4 xl:grid-cols-4">
        <NCard
          v-for="stat in stats"
          :key="stat.label"
          :bordered="false"
          class="border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
        >
          <div class="flex items-center gap-4">
            <div
              class="grid h-16 w-16 place-items-center rounded-2xl text-2xl font-black"
              :class="
                stat.tone === 'success'
                  ? 'bg-emerald-50 text-emerald-500'
                  : stat.tone === 'warning'
                    ? 'bg-orange-50 text-orange-500'
                    : stat.tone === 'info'
                      ? 'bg-blue-50 text-blue-500'
                      : 'bg-violet-50 text-violet-500'
              "
            >
              {{ stat.label.slice(0, 1) }}
            </div>
            <div>
              <div class="text-sm font-semibold text-[var(--app-text-soft)]">{{ stat.label }}</div>
              <div
                class="mt-2 text-3xl font-black tracking-normal"
                :class="
                  stat.tone === 'success'
                    ? 'text-emerald-500'
                    : stat.tone === 'warning'
                      ? 'text-orange-500'
                      : stat.tone === 'info'
                        ? 'text-blue-500'
                        : 'text-violet-500'
                "
              >
                {{ stat.value }}
              </div>
              <div class="mt-1 text-sm font-semibold text-[var(--app-text-soft)]">{{ copy.pointsUnit }}</div>
            </div>
          </div>
        </NCard>
      </section>
    </section>

    <section class="mx-auto mt-5 max-w-[1320px] rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
      <h2 class="text-2xl font-black tracking-normal text-[var(--app-text)]">{{ copy.tableTitle }}</h2>
      <NDataTable
        class="mt-5"
        :columns="columns"
        :data="data"
        :bordered="false"
        :pagination="{ pageSize: 10 }"
      />
    </section>
  </main>
</template>
'''

if __name__ == "__main__":
    for rel, content in FILES.items():
        path = BASE / rel
        path.write_text(content, encoding="utf-8", newline="\n")
        print("fixed", rel)

    credits_path = CONST_BASE / "credits-page.ts"
    credits_path.write_text(CREDITS_TS, encoding="utf-8", newline="\n")
    print("fixed constants/credits-page.ts")

    (BASE / "credits/index.vue").write_text(CREDITS_VUE, encoding="utf-8", newline="\n")
    print("fixed credits/index.vue")

    # validate all vue under pages
    for p in BASE.rglob("*.vue"):
        p.read_text(encoding="utf-8")
    print("all pages utf-8 ok")
