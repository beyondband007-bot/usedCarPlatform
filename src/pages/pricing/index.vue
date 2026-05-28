<script setup lang="ts">
import { Icon } from "@iconify/vue";

import PricingPlanCard from "@/components/business/pricing/PricingPlanCard.vue";
import {
  pricingPageCopy,
  pricingPageMetrics,
  pricingPlans,
} from "@/constants/prototype";

const copy = pricingPageCopy;

const metricIcons = [
  "mdi:account-multiple-outline",
  "mdi:cash-fast",
  "mdi:image-filter-center-focus-strong-outline",
] as const;

const metrics = pricingPageMetrics.map((metric, index) => ({
  ...metric,
  icon: metricIcons[index] ?? "mdi:chart-line",
}));

const heroHighlights = [
  { label: "开通账号", value: "1 - 20", icon: "mdi:account-key-outline" },
  { label: "积分额度", value: "200 - 9,800", icon: "mdi:diamond-stone" },
  { label: "图组并发", value: "1 - 20", icon: "mdi:layers-triple-outline" },
] as const;

const serviceItems = [
  {
    title: "账号协同",
    desc: "多账号按套餐开通，适合门店与运营团队并行处理。",
    icon: "mdi:account-network-outline",
  },
  {
    title: "素材产能",
    desc: "外观图组、单张生成和场景配置可按业务节奏使用。",
    icon: "mdi:image-multiple-outline",
  },
  {
    title: "采购可控",
    desc: "套餐权益清晰，积分有效期与使用范围在购买前明确展示。",
    icon: "mdi:clipboard-check-outline",
  },
] as const;

const purchaseNotes = [
  "套餐购买后积分立即到账",
  "积分有效期为购买日起 12 个月",
  "旗舰档支持专属场景配置沟通",
] as const;
</script>

<template>
  <main
    class="min-h-[calc(100vh-var(--app-header-offset))] bg-[var(--app-bg)] px-3 py-6 sm:px-4 lg:px-6"
  >
    <section class="mx-auto w-full max-w-[1320px] space-y-6">
      <section
        class="relative w-full max-w-full overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_24px_90px_rgba(15,23,42,0.12)]"
      >
        <div
          class="grid min-w-0 gap-8 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:p-8 xl:p-10"
        >
          <div class="min-w-0 max-w-full">
            <div
              class="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-sm font-black text-orange-500"
            >
              <Icon icon="mdi:briefcase-check-outline" class="text-lg" />
              企业采购方案
            </div>

            <h1
              class="mt-6 max-w-3xl break-words text-[2.35rem] font-black leading-tight tracking-normal text-[var(--app-text)] [overflow-wrap:anywhere] sm:text-4xl md:text-5xl"
            >
              {{ copy.title }}
            </h1>
            <p
              class="mt-5 max-w-3xl break-words text-[15px] font-semibold leading-7 text-[var(--app-text-soft)] [overflow-wrap:anywhere] sm:text-base sm:leading-8 md:text-lg"
            >
              {{ copy.subtitle }}
            </p>
            <p
              class="mt-4 max-w-2xl break-words text-sm font-semibold leading-6 text-[var(--app-text-soft)] [overflow-wrap:anywhere]"
            >
              {{ copy.tag }}
            </p>

            <div class="mt-7 grid gap-3 sm:flex sm:flex-wrap">
              <a
                href="#pricing-plans"
                class="inline-flex h-12 w-full items-center justify-center rounded-full bg-orange-500 px-6 text-sm font-black text-white shadow-[0_14px_30px_rgba(249,115,22,0.24)] transition hover:bg-orange-600 active:translate-y-px sm:w-auto"
              >
                查看套餐
                <Icon icon="mdi:arrow-down" class="ml-2 text-lg" />
              </a>
              <RouterLink
                to="/enterprise"
                class="inline-flex h-12 w-full items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-6 text-sm font-black text-[var(--app-text)] transition hover:border-orange-400 hover:text-orange-500 active:translate-y-px sm:w-auto"
              >
                申请企业账号
                <Icon icon="mdi:arrow-right" class="ml-2 text-lg" />
              </RouterLink>
            </div>

            <dl class="mt-8 grid gap-3 sm:grid-cols-3">
              <div
                v-for="item in heroHighlights"
                :key="item.label"
                class="min-w-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4"
              >
                <dt
                  class="flex items-center gap-2 text-sm font-bold text-[var(--app-text-soft)]"
                >
                  <Icon :icon="item.icon" class="text-lg text-orange-500" />
                  {{ item.label }}
                </dt>
                <dd
                  class="mt-3 text-2xl font-black tracking-normal text-[var(--app-text)]"
                >
                  {{ item.value }}
                </dd>
              </div>
            </dl>
          </div>

          <aside
            class="w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-soft)]"
            aria-label="套餐服务概览"
          >
            <img
              class="h-40 w-full object-cover"
              src="https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=900&q=82"
              alt="汽车展厅车辆内容生产场景"
            />
            <div class="space-y-4 p-5">
              <div>
                <p class="text-sm font-black text-orange-500">团队产能配置</p>
                <h2
                  class="mt-2 text-2xl font-black tracking-normal text-[var(--app-text)]"
                >
                  从试运行到集团交付
                </h2>
              </div>

              <div class="grid gap-3">
                <div
                  v-for="item in serviceItems"
                  :key="item.title"
                  class="flex min-w-0 gap-3 rounded-lg bg-[var(--app-surface)] p-4"
                >
                  <Icon
                    :icon="item.icon"
                    class="mt-0.5 shrink-0 text-xl text-orange-500"
                  />
                  <div class="min-w-0">
                    <h3
                      class="break-words text-sm font-black text-[var(--app-text)] [overflow-wrap:anywhere]"
                    >
                      {{ item.title }}
                    </h3>
                    <p
                      class="mt-1 break-words text-sm font-semibold leading-6 text-[var(--app-text-soft)] [overflow-wrap:anywhere]"
                    >
                      {{ item.desc }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section
        id="pricing-plans"
        class="grid scroll-mt-28 gap-5 lg:grid-cols-3"
      >
        <PricingPlanCard
          v-for="(plan, index) in pricingPlans"
          :key="plan.name"
          :plan="plan"
          :index="index"
        />
      </section>
    </section>
  </main>
</template>
