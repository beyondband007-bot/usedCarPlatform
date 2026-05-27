<script setup lang="ts">
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
