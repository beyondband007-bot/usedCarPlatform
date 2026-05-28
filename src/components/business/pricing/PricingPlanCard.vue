<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { motion } from "motion-v";
import { computed } from "vue";

import type { PricingPlan } from "@/types/prototype";

const props = defineProps<{
  plan: PricingPlan;
  index: number;
}>();

const planVisuals = [
  {
    icon: "mdi:rocket-launch-outline",
    description: "适合新团队启动视觉生产流程，先验证素材标准与交付节奏。",
    iconClass: "bg-blue-500/10 text-blue-500",
  },
  {
    icon: "mdi:account-group-outline",
    description: "适合门店或车商团队并行上新，兼顾账号、积分与图组并发。",
    iconClass: "bg-orange-500/10 text-orange-500",
  },
  {
    icon: "mdi:shield-crown-outline",
    description: "适合集团化业务、出海车源与专属场景长期配置。",
    iconClass: "bg-emerald-500/10 text-emerald-500",
  },
] as const;

const visual = computed(() => planVisuals[props.index] ?? planVisuals[0]);

const cardClass = computed(() =>
  props.plan.featured
    ? "border-orange-400 shadow-[0_24px_80px_rgba(249,115,22,0.18)]"
    : "border-[var(--app-border)] shadow-[0_18px_54px_rgba(15,23,42,0.08)] hover:border-orange-300/80",
);

const actionClass = computed(() =>
  props.plan.featured
    ? "bg-orange-500 text-white hover:bg-orange-600"
    : "border border-[var(--app-border)] bg-[var(--app-surface-soft)] text-[var(--app-text)] hover:border-orange-400 hover:text-orange-500",
);
</script>

<template>
  <motion.div
    :initial="{ opacity: 0, y: 18 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.36, delay: index * 0.06 }"
    :while-hover="{ y: -4 }"
    class="h-full min-w-0"
  >
    <article
      class="relative flex h-full min-h-[520px] flex-col overflow-hidden rounded-lg border bg-[var(--app-surface)] p-6 transition duration-200 xl:p-7"
      :class="cardClass"
    >
      <div
        v-if="plan.featured"
        class="absolute inset-x-0 top-0 h-1 bg-orange-500"
      ></div>

      <div class="flex items-start justify-between gap-4">
        <span
          class="grid size-12 shrink-0 place-items-center rounded-md"
          :class="visual.iconClass"
        >
          <Icon :icon="visual.icon" class="text-2xl" />
        </span>

        <span
          v-if="plan.badge"
          class="rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-white shadow-[0_10px_24px_rgba(249,115,22,0.24)]"
        >
          {{ plan.badge }}
        </span>
      </div>

      <div class="mt-6">
        <h2 class="text-2xl font-black tracking-normal text-[var(--app-text)]">
          {{ plan.name }}
        </h2>
        <p class="mt-3 min-h-12 break-words text-sm font-semibold leading-6 text-[var(--app-text-soft)] [overflow-wrap:anywhere]">
          {{ visual.description }}
        </p>
      </div>

      <div class="mt-7 flex items-end gap-2">
        <strong class="text-4xl font-black tracking-normal text-[var(--app-text)] xl:text-5xl">
          {{ plan.price }}
        </strong>
        <span class="pb-1 text-sm font-bold text-[var(--app-text-soft)] xl:text-base">
          / 套餐
        </span>
      </div>

      <div class="my-7 h-px bg-[var(--app-border)]"></div>

      <ul class="grid gap-4 text-sm font-semibold leading-6 text-[var(--app-text)]">
        <li
          v-for="benefit in plan.benefits"
          :key="benefit"
          class="flex items-start gap-3"
        >
          <Icon
            icon="mdi:check-circle"
            class="mt-0.5 shrink-0 text-lg text-orange-500"
          />
          <span class="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{{ benefit }}</span>
        </li>
      </ul>

      <div class="mt-auto pt-7">
        <button
          type="button"
          class="inline-flex h-12 w-full items-center justify-center rounded-full px-5 text-sm font-black transition duration-200 active:translate-y-px"
          :class="actionClass"
        >
          {{ plan.action }}
          <Icon icon="mdi:arrow-right" class="ml-2 text-lg" />
        </button>
      </div>
    </article>
  </motion.div>
</template>
