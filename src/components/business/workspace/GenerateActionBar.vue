<script setup lang="ts">
import { NButton, NCard, NProgress, NTag } from "naive-ui";

import type { WorkspaceCapability } from "@/types/workspace";

defineProps<{
  capability: WorkspaceCapability;
}>();
</script>

<template>
  <div class="GenerateActionBar">
    <div class="flex flex-wrap items-center gap-3">
      <NTag type="warning" round :bordered="false"
        >预计消耗 {{ capability.cost }} 积分</NTag
      >
      <NTag type="success" round :bordered="false"
        >余额 {{ capability.balance }} 积分</NTag
      >
      <!-- <NTag type="info" round :bordered="false">{{ capability.apiCode }}</NTag> -->
      <NButton type="primary" size="large" class="min-w-44 !rounded-xl">
        {{ capability.actionLabel }} 💎 {{ capability.cost }}
      </NButton>
    </div>
  </div>
</template>
<style score>
.GenerateActionBar {
  display: flex;
  width: 100%;
  justify-content: space-around;
}
</style>
