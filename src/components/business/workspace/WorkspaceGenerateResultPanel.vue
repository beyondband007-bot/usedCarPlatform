<script setup lang="ts">
import { computed } from "vue";

import WorkspaceImagePreviewPanel from "@/components/business/workspace/WorkspaceImagePreviewPanel.vue";
import type { WorkspaceGenerateResult } from "@/types/workspace";
import { buildImagePreviewFromGenerateResult } from "@/utils/workspace-image-preview";

const props = defineProps<{
  result: WorkspaceGenerateResult;
}>();

const emit = defineEmits<{
  back: [];
}>();

const preview = computed(() => buildImagePreviewFromGenerateResult(props.result));
</script>

<template>
  <WorkspaceImagePreviewPanel :preview="preview" @back="emit('back')" />
</template>
