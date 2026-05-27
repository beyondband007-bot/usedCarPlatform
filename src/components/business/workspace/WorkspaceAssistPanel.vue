<script setup lang="ts">
import { NCard, NSkeleton, NTabPane, NTabs, NTag } from 'naive-ui'
import { motion } from 'motion-v'

import type { WorkspaceCapability, WorkspaceRecentItem } from '@/types/workspace'

defineProps<{
  capability: WorkspaceCapability
}>()

const statusTypeMap: Record<WorkspaceRecentItem['status'], 'default' | 'success' | 'warning' | 'info' | 'error'> = {
  waiting: 'default',
  queue: 'info',
  generating: 'warning',
  success: 'success',
  fail: 'error',
}
</script>

<template>
  <NCard
    :bordered="false"
    class="h-full border border-white/10 bg-[#0d1018]/86 shadow-[0_24px_90px_rgba(0,0,0,0.24)] backdrop-blur-xl"
  >
    <NTabs type="line" animated default-value="guide">
      <NTabPane name="guide" tab="使用教程">
        <div class="space-y-8 pt-4">
          <section>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h2 class="text-2xl font-black text-white">使用教程</h2>
              <NTag type="info" round :bordered="false">{{ capability.label }}</NTag>
            </div>

            <div class="mt-6 grid gap-4 xl:grid-cols-4">
              <motion.div
                v-for="(step, index) in capability.tutorial"
                :key="`${capability.code}-${step.title}`"
                :initial="{ opacity: 0, y: 18 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.35, delay: index * 0.06 }"
                class="rounded-2xl border border-white/10 bg-white/[0.05] p-3"
              >
                <div class="grid h-36 place-items-center overflow-hidden rounded-xl bg-[#101621]">
                  <img
                    v-if="step.image"
                    class="h-full w-full object-cover"
                    :src="step.image"
                    :alt="step.title"
                    loading="lazy"
                  />
                  <strong v-else class="text-xl tracking-widest text-amber-200">{{ step.text }}</strong>
                </div>
                <p class="mt-3 text-center text-base font-bold text-slate-200">{{ step.title }}</p>
              </motion.div>
            </div>
          </section>

          <section>
            <h3 class="text-xl font-black text-white">初次使用？试试这些</h3>
            <div class="mt-4 grid gap-4 sm:grid-cols-3">
              <NSkeleton v-for="item in 3" :key="item" height="152px" class="!rounded-2xl" />
            </div>
          </section>

          <section>
            <h3 class="text-xl font-black text-white">素材要求</h3>
            <div class="mt-4 flex flex-wrap gap-3">
              <NTag
                v-for="item in capability.requirements"
                :key="item"
                type="success"
                round
                :bordered="false"
              >
                ✓ {{ item }}
              </NTag>
            </div>
          </section>
        </div>
      </NTabPane>

      <NTabPane name="recent" tab="最近生成">
        <div class="grid gap-4 pt-4">
          <NCard
            v-for="item in capability.recent"
            :key="item.id"
            size="small"
            class="bg-white/[0.04]"
            :bordered="false"
          >
            <div class="flex items-center gap-4">
              <img
                v-if="item.thumbnail"
                class="h-16 w-20 rounded-xl object-cover"
                :src="item.thumbnail"
                :alt="item.title"
                loading="lazy"
              />
              <NSkeleton v-else width="84px" height="64px" class="!rounded-xl" />
              <div class="min-w-0 flex-1">
                <p class="truncate font-bold text-white">{{ item.title }}</p>
                <p class="mt-1 text-sm text-slate-500">{{ item.createdAt }}</p>
              </div>
              <NTag round :bordered="false" :type="statusTypeMap[item.status]">
                {{ item.status }}
              </NTag>
            </div>
          </NCard>
        </div>
      </NTabPane>
    </NTabs>
  </NCard>
</template>
