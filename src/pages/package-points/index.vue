<script setup lang="ts">
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
  { name: "基础套餐", price: "¥980", points: "赠送 200 积分", account: "1 账号", quota: "1 套件" },
  {
    name: "进阶套餐",
    price: "¥2,980",
    points: "赠送 550 积分",
    account: "5 账号",
    quota: "5 套件",
    active: true,
  },
  { name: "尊享套餐", price: "¥9,800", points: "赠送 9,800 积分", account: "20 账号", quota: "20 专属场景" },
];

const typeOptions = [
  { label: "全部类型", value: "all" },
  { label: "基础套餐", value: "base" },
  { label: "进阶套餐", value: "pro" },
  { label: "尊享套餐", value: "elite" },
];

const records: RechargeRecord[] = [
  { orderNo: "202605200001", plan: "进阶套餐", amount: "¥2,980", points: "550", status: "支付成功", paidAt: "2026-05-20 10:30:45" },
  { orderNo: "202605190002", plan: "基础套餐", amount: "¥980", points: "200", status: "支付成功", paidAt: "2026-05-19 15:20:18" },
  { orderNo: "202605180003", plan: "尊享套餐", amount: "¥9,800", points: "9800", status: "支付成功", paidAt: "2026-05-18 09:15:33" },
  { orderNo: "202605150004", plan: "进阶套餐", amount: "¥2,980", points: "550", status: "支付失败", paidAt: "2026-05-15 11:05:22" },
  { orderNo: "202605100005", plan: "基础套餐", amount: "¥980", points: "200", status: "支付成功", paidAt: "2026-05-10 16:40:11" },
];

const columns: DataTableColumns<RechargeRecord> = [
  { title: "订单号", key: "orderNo" },
  { title: "套餐类型", key: "plan" },
  { title: "金额（元）", key: "amount" },
  { title: "获得积分", key: "points" },
  { title: "状态", key: "status" },
  { title: "支付时间", key: "paidAt" },
  { title: "操作", key: "action", render: () => "查看详情" },
];
</script>

<template>
  <main class="min-h-[calc(100vh-var(--app-header-offset))] bg-[var(--app-bg)] px-4 py-5 lg:px-6">
    <section class="mx-auto max-w-[1320px] rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
      <div class="flex min-h-[92px] items-center justify-between overflow-hidden rounded-md bg-gradient-to-r from-blue-50 via-white to-blue-100 px-6">
        <div>
          <h1 class="text-2xl font-black tracking-normal text-slate-900">充值中心</h1>
          <p class="mt-2 text-sm font-semibold text-slate-500">选择充值套餐，快速获取积分</p>
        </div>
      </div>

      <section class="mt-8">
        <h2 class="text-lg font-black tracking-normal text-[var(--app-text)]">选择充值套餐</h2>
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
              推荐
            </NTag>
            <h3 class="text-base font-black text-[var(--app-text)]">{{ plan.name }}</h3>
            <strong class="mt-7 text-4xl font-black tracking-normal text-blue-500">{{ plan.price }}</strong>
            <p class="mt-4 text-base font-semibold text-[var(--app-text)]">{{ plan.points }}</p>
            <div class="mt-6 flex items-center gap-8 text-sm font-semibold text-[var(--app-text-soft)]">
              <span>{{ plan.account }}</span>
              <span>{{ plan.quota }}</span>
            </div>
            <NButton type="primary" round class="mt-7 min-w-48">立即充值</NButton>
          </div>
        </div>
      </section>
    </section>

    <section class="mx-auto mt-5 max-w-[1320px] rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <h2 class="text-2xl font-black tracking-normal text-[var(--app-text)]">充值流水</h2>
        <div class="flex flex-wrap items-center gap-3">
          <NDatePicker type="daterange" clearable class="w-72" />
          <NSelect :options="typeOptions" default-value="all" class="w-40" />
          <NButton secondary>导出记录</NButton>
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
