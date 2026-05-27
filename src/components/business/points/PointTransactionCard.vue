<script setup lang="ts">
import { NCard, NTag } from 'naive-ui'
import { motion } from 'motion-v'

import type { PointTransaction } from '@/types/prototype'

defineProps<{
  item: PointTransaction
  index: number
}>()
</script>

<template>
  <motion.div
    :initial="{ opacity: 0, y: 18 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.38, delay: index * 0.06 }"
  >
    <NCard :bordered="false" class="border border-white/10 bg-white/[0.06] backdrop-blur-xl">
      <h2 class="text-xl font-black text-white">{{ item.title }}</h2>
      <NTag :type="item.positive ? 'success' : 'warning'" round :bordered="false" class="mt-3">
        {{ item.amount }}
      </NTag>
      <p class="mt-3 text-sm font-semibold text-slate-400">{{ item.description }}</p>
    </NCard>
  </motion.div>
</template>
