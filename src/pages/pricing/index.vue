<script setup lang="ts">
import { NButton, NTag } from "naive-ui";

import { pricingPageCopy, pricingPageMetrics, pricingPlans } from "@/constants/prototype";

const plans = pricingPlans.map((plan, index) => ({
  name: plan.name,
  description: plan.benefits[plan.benefits.length - 1] ?? "",
  price: plan.price,
  tone: index === 1 ? "amber" : index === 2 ? "violet" : "blue",
  action: plan.action,
  recommended: plan.featured ?? false,
  benefits: plan.benefits,
}));

const metrics = pricingPageMetrics;
const copy = pricingPageCopy;
</script>

<template>
  <main class="min-h-[calc(100vh-var(--app-header-offset))] bg-[var(--app-bg)] px-4 py-5 lg:px-6">
    <section class="mx-auto max-w-[1320px]">
      <div
        class="relative overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-6 py-8 shadow-[0_18px_60px_rgba(15,23,42,0.08)] lg:px-8"
      >
        <div class="relative z-10 max-w-3xl">
          <h1 class="text-4xl font-black tracking-normal text-[var(--app-text)]">{{ copy.title }}</h1>
          <p class="mt-4 text-base font-semibold leading-7 text-[var(--app-text-soft)]">
            {{ copy.subtitle }}
          </p>
          <NTag type="info" round :bordered="false" class="mt-5">{{ copy.tag }}</NTag>
        </div>

        <div class="absolute right-8 top-5 hidden h-28 w-80 rounded-[32px] bg-blue-100/80 lg:block">
          <div class="absolute bottom-5 left-10 h-10 w-20 rounded-full bg-blue-500/70"></div>
          <div class="absolute right-14 top-5 h-20 w-16 rounded-xl bg-blue-400/70"></div>
          <div class="absolute right-5 bottom-4 h-16 w-10 rounded-lg bg-cyan-200"></div>
        </div>
      </div>

      <section class="mt-5 grid gap-5 lg:grid-cols-3">
        <div
          v-for="plan in plans"
          :key="plan.name"
          class="relative flex min-h-[500px] flex-col rounded-xl border bg-[var(--app-surface)] p-8 shadow-[0_18px_52px_rgba(15,23,42,0.08)]"
          :class="plan.recommended ? 'border-amber-400 shadow-[0_20px_60px_rgba(245,158,11,0.18)]' : 'border-[var(--app-border)]'"
        >
          <div
            v-if="plan.recommended"
            class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-300 px-6 py-1 text-sm font-black text-amber-950"
          >
            {{ copy.recommended }}
          </div>

          <div class="flex items-start gap-5">
            <div
              class="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-3xl font-black"
              :class="
                plan.tone === 'amber'
                  ? 'bg-amber-50 text-amber-500'
                  : plan.tone === 'violet'
                    ? 'bg-violet-50 text-violet-500'
                    : 'bg-blue-50 text-blue-500'
              "
            >
              {{ plan.name.slice(0, 1) }}
            </div>
            <div>
              <h2 class="text-2xl font-black tracking-normal text-[var(--app-text)]">
                {{ plan.name }}
              </h2>
              <p class="mt-2 text-sm font-semibold text-[var(--app-text-soft)]">
                {{ plan.description }}
              </p>
            </div>
          </div>

          <div class="mt-7 flex items-end gap-2">
            <strong
              class="text-4xl font-black tracking-normal"
              :class="plan.tone === 'amber' ? 'text-amber-500' : 'text-blue-500'"
            >
              {{ plan.price }}
            </strong>
            <span class="pb-1 text-base font-semibold text-[var(--app-text-soft)]">{{ copy.unit }}</span>
          </div>

          <div class="my-7 h-px bg-[var(--app-border)]"></div>

          <ul class="grid gap-4 text-sm font-semibold text-[var(--app-text)]">
            <li v-for="benefit in plan.benefits" :key="benefit" class="flex items-start gap-3">
              <span
                class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs text-white"
                :class="plan.tone === 'amber' ? 'bg-amber-500' : 'bg-blue-500'"
              >
                +
              </span>
              <span class="min-w-0 flex-1">{{ benefit }}</span>
            </li>
          </ul>

          <NButton
            size="large"
            round
            class="mt-auto"
            :type="plan.recommended ? 'warning' : 'primary'"
            :ghost="!plan.recommended"
          >
            {{ plan.action }}
          </NButton>
        </div>
      </section>

      <section
        class="mt-5 grid gap-4 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[0_18px_52px_rgba(15,23,42,0.06)] lg:grid-cols-3"
      >
        <div
          v-for="metric in metrics"
          :key="metric.label"
          class="flex items-center gap-5 rounded-xl bg-[var(--app-surface-soft)] p-5"
        >
          <div
            class="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-blue-100 text-2xl font-black text-blue-500"
          >
            {{ metric.label.slice(0, 1) }}
          </div>
          <div>
            <p class="text-sm font-semibold text-[var(--app-text-soft)]">{{ metric.label }}</p>
            <strong class="mt-2 block text-3xl font-black tracking-normal text-[var(--app-text)]">
              {{ metric.value }}
            </strong>
            <p class="mt-2 text-sm font-semibold text-[var(--app-text-soft)]">{{ metric.desc }}</p>
          </div>
        </div>
      </section>

      <div
        class="mt-5 flex items-center justify-between rounded-lg bg-blue-50 px-5 py-4 text-sm font-semibold text-blue-600"
      >
        <span>{{ copy.footer }}</span>
        <button type="button" class="font-black">{{ copy.footerAction }}</button>
      </div>
    </section>
  </main>
</template>
