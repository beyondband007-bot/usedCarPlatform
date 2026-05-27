# -*- coding: utf-8 -*-
"""Rewrite corrupted page Vue files with valid UTF-8."""
from pathlib import Path

BASE = Path(__file__).resolve().parents[1] / "src" / "pages"

FILES: dict[str, str] = {}


def w(path: str, content: str) -> None:
    FILES[path] = content


w(
    "package-points/index.vue",
    '''<script setup lang="ts">
import { NButton, NDataTable, NDatePicker, NSelect, NTag } from "naive-ui";
import type { DataTableColumns } from "naive-ui";

type RechargeRecord = {
  orderNo: string;
  plan: string;
  amount: string;
  points: string;
  status: string;
  paidAt: string;
};

const rechargePlans = [
  { name: "\u57fa\u7840\u5957\u9910", price: "\u00a5980", points: "\u8d60\u9001 200 \u79ef\u5206", account: "1 \u8d26\u53f7", quota: "1 \u5957\u4ef6" },
  {
    name: "\u8fdb\u9636\u5957\u9910",
    price: "\u00a52,980",
    points: "\u8d60\u9001 550 \u79ef\u5206",
    account: "5 \u8d26\u53f7",
    quota: "5 \u5957\u4ef6",
    active: true,
  },
  { name: "\u5c0a\u4eab\u5957\u9910", price: "\u00a59,800", points: "\u8d60\u9001 9,800 \u79ef\u5206", account: "20 \u8d26\u53f7", quota: "20 \u4e13\u5c5e\u573a\u666f" },
];

const typeOptions = [
  { label: "\u5168\u90e8\u7c7b\u578b", value: "all" },
  { label: "\u57fa\u7840\u5957\u9910", value: "base" },
  { label: "\u8fdb\u9636\u5957\u9910", value: "pro" },
  { label: "\u5c0a\u4eab\u5957\u9910", value: "elite" },
];

const records: RechargeRecord[] = [
  { orderNo: "202605200001", plan: "\u8fdb\u9636\u5957\u9910", amount: "\u00a52,980", points: "550", status: "\u652f\u4ed8\u6210\u529f", paidAt: "2026-05-20 10:30:45" },
  { orderNo: "202605190002", plan: "\u57fa\u7840\u5957\u9910", amount: "\u00a5980", points: "200", status: "\u652f\u4ed8\u6210\u529f", paidAt: "2026-05-19 15:20:18" },
  { orderNo: "202605180003", plan: "\u5c0a\u4eab\u5957\u9910", amount: "\u00a59,800", points: "9800", status: "\u652f\u4ed8\u6210\u529f", paidAt: "2026-05-18 09:15:33" },
  { orderNo: "202605150004", plan: "\u8fdb\u9636\u5957\u9910", amount: "\u00a52,980", points: "550", status: "\u652f\u4ed8\u5931\u8d25", paidAt: "2026-05-15 11:05:22" },
  { orderNo: "202605100005", plan: "\u57fa\u7840\u5957\u9910", amount: "\u00a5980", points: "200", status: "\u652f\u4ed8\u6210\u529f", paidAt: "2026-05-10 16:40:11" },
];

const columns: DataTableColumns<RechargeRecord> = [
  { title: "\u8ba2\u5355\u53f7", key: "orderNo" },
  { title: "\u5957\u9910\u7c7b\u578b", key: "plan" },
  { title: "\u91d1\u989d\uff08\u5143\uff09", key: "amount" },
  { title: "\u83b7\u5f97\u79ef\u5206", key: "points" },
  { title: "\u72b6\u6001", key: "status" },
  { title: "\u652f\u4ed8\u65f6\u95f4", key: "paidAt" },
  { title: "\u64cd\u4f5c", key: "action", render: () => "\u67e5\u770b\u8be6\u60c5" },
];
</script>

<template>
  <main class="min-h-[calc(100vh-var(--app-header-offset))] bg-[var(--app-bg)] px-4 py-5 lg:px-6">
    <section class="mx-auto max-w-[1320px] rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
      <div class="flex min-h-[92px] items-center justify-between overflow-hidden rounded-md bg-gradient-to-r from-blue-50 via-white to-blue-100 px-6">
        <div>
          <h1 class="text-2xl font-black tracking-normal text-slate-900">\u5145\u503c\u4e2d\u5fc3</h1>
          <p class="mt-2 text-sm font-semibold text-slate-500">\u9009\u62e9\u5145\u503c\u5957\u9910\uff0c\u5feb\u901f\u83b7\u53d6\u79ef\u5206</p>
        </div>
      </div>

      <section class="mt-8">
        <h2 class="text-lg font-black tracking-normal text-[var(--app-text)]">\u9009\u62e9\u5145\u503c\u5957\u9910</h2>
        <div class="mt-5 grid gap-8 lg:grid-cols-3">
          <div
            v-for="plan in rechargePlans"
            :key="plan.name"
            class="relative flex min-h-[258px] flex-col items-center justify-center rounded-xl border bg-[var(--app-surface)] px-6 py-7 text-center shadow-[0_14px_38px_rgba(15,23,42,0.06)]"
            :class="plan.active ? 'border-blue-500' : 'border-[var(--app-border)]'"
          >
            <NTag
              v-if="plan.active"
              type="info"
              round
              :bordered="false"
              class="absolute -top-3 left-1/2 -translate-x-1/2"
            >
              \u63a8\u8350
            </NTag>
            <h3 class="text-base font-black text-[var(--app-text)]">{{ plan.name }}</h3>
            <strong class="mt-7 text-4xl font-black tracking-normal text-blue-500">{{ plan.price }}</strong>
            <p class="mt-4 text-base font-semibold text-[var(--app-text)]">{{ plan.points }}</p>
            <div class="mt-6 flex items-center gap-8 text-sm font-semibold text-[var(--app-text-soft)]">
              <span>{{ plan.account }}</span>
              <span>{{ plan.quota }}</span>
            </div>
            <NButton type="primary" round class="mt-7 min-w-48">\u7acb\u5373\u5145\u503c</NButton>
          </div>
        </div>
      </section>
    </section>

    <section class="mx-auto mt-5 max-w-[1320px] rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <h2 class="text-2xl font-black tracking-normal text-[var(--app-text)]">\u5145\u503c\u6d41\u6c34</h2>
        <div class="flex flex-wrap items-center gap-3">
          <NDatePicker type="daterange" clearable class="w-72" />
          <NSelect :options="typeOptions" default-value="all" class="w-40" />
          <NButton secondary>\u5bfc\u51fa\u8bb0\u5f55</NButton>
        </div>
      </div>

      <NDataTable
        class="mt-5"
        :columns="columns"
        :data="records"
        :bordered="false"
        :pagination="{ pageSize: 10 }"
      />
    </section>
  </main>
</template>
''',
)

# Additional files will be added in part 2 - run minimal first
if __name__ == "__main__":
    for rel, content in FILES.items():
        path = BASE / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8", newline="\n")
        path.read_text(encoding="utf-8")  # validate
        print("fixed", rel)
