<script setup lang="ts">
import { NButton, NCard, NTag } from "naive-ui";

import { workspaceMenuGroups } from "@/constants/workspace";

defineProps<{
  activeCode: string;
}>();

const emit = defineEmits<{
  select: [code: string];
}>();
</script>

<template>
  <NCard
    :bordered="false"
    class="workspace-sidebar h-full min-h-0 border-r border-white/10 bg-[#0d1018]/90 shadow-none backdrop-blur-xl"
    content-class="!flex !h-full !min-h-0 !flex-col !overflow-hidden !p-4"
  >
    <div class="workspace-sidebar-body">
      <section
        v-for="group in workspaceMenuGroups"
        :key="group.title"
        class="space-y-3"
      >
        <h2 class="px-2 text-base font-black text-slate-500">
          {{ group.title }}
        </h2>
        <div class="space-y-2">
          <NButton
            v-for="item in group.items"
            :key="item.code"
            quaternary
            block
            size="large"
            :type="item.code === activeCode ? 'primary' : 'default'"
            class="!h-auto !justify-start !rounded-2xl !px-3 !py-3"
            @click="emit('select', item.code)"
          >
            <div
              class="grid w-full grid-cols-[28px_1fr_auto] items-center gap-3 text-left"
            >
              <span class="text-xl">{{ item.icon }}</span>
              <span class="text-base font-bold">{{ item.label }}</span>
              <NTag :type="item.tagType" :bordered="false" round size="small">{{
                item.tag
              }}</NTag>
            </div>
          </NButton>
        </div>
      </section>

      <RouterLink to="/package-points" class="mt-auto block">
        <NButton type="warning" ghost size="large" block class="!rounded-2xl">
          套餐/积分
        </NButton>
      </RouterLink>
    </div>
  </NCard>
</template>
<style scoped lang="scss">
:deep(.workspace-sidebar.n-card) {
  display: flex;
  min-height: 0;
  flex-direction: column;
  border: 0 !important;
  padding: 0;
  margin: 0 !important;
}

.workspace-sidebar-body {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 24px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-bottom: 16px;
}
</style>
