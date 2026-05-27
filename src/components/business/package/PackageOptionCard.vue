<script setup lang="ts">
import { NButton, NCard, NTag } from 'naive-ui'
import { motion } from 'motion-v'

import type { PackageOption } from '@/types/prototype'

defineProps<{
  item: PackageOption
  index: number
}>()
</script>

<template>
  <motion.div
    :initial="{ opacity: 0, y: 18 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.36, delay: index * 0.06 }"
  >
    <NCard
      :bordered="false"
      class="relative border bg-white/[0.06] backdrop-blur-xl"
      :class="item.active ? 'border-amber-300/70 shadow-[0_0_38px_rgba(214,179,111,0.2)]' : 'border-white/10'"
    >
      <NTag v-if="item.active" type="warning" round :bordered="false" class="absolute right-5 top-5">
        鎺ㄨ崘
      </NTag>
      <strong class="text-3xl font-black text-white">{{ item.price }}</strong>
      <p class="mt-2 text-lg font-bold text-slate-400">{{ item.description }}</p>
      <NButton class="mt-5" :type="item.active ? 'warning' : 'default'" ghost>
        {{ item.action }}
      </NButton>
    </NCard>
  </motion.div>
</template>
