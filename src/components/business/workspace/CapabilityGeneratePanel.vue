<script setup lang="ts">
import type { WorkspaceCapability } from "@/types/workspace";

import CapabilityOptionSelector from "@/components/business/workspace/CapabilityOptionSelector.vue";
import UploadTaskCard from "@/components/business/workspace/UploadTaskCard.vue";

defineProps<{
  capability: WorkspaceCapability;
  selectedOptionId: string;
}>();

const emit = defineEmits<{
  selectOption: [id: string];
}>();
</script>

<template>
  <div class="space-y-5">
    <UploadTaskCard :capability="capability" />
    <CapabilityOptionSelector
      class="CapabilityOptionSelector"
      :capability="capability"
      :selected-option-id="selectedOptionId"
      @select="emit('selectOption', $event)"
    />
  </div>
</template>
<style scoped>
::v-deep .CapabilityOptionSelector {
  margin: 0 20px 20px 20px;
}
</style>
