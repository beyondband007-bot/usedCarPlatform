<script setup lang="ts">
import { computed } from "vue";
import { NCard, NTag, NUpload, NUploadDragger, type UploadFileInfo } from "naive-ui";
import { motion } from "motion-v";

import type { WorkspaceCapability } from "@/types/workspace";

const props = defineProps<{
  capability: WorkspaceCapability;
  uploadedFileName?: string;
  isUploading?: boolean;
}>();

const emit = defineEmits<{
  selectFile: [file: File];
}>();

const uploadHint = computed(() => {
  if (props.isUploading) return "正在上传素材...";
  if (props.uploadedFileName) return props.uploadedFileName;
  return props.capability.uploadHint;
});

function handleUploadChange(options: { file: UploadFileInfo }) {
  const file = options.file.file;
  if (!file) return;
  emit("selectFile", file);
}
</script>

<template>
  <motion.div
    :key="capability.code"
    :initial="{ opacity: 0, y: 18 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.42 }"
  >
    <NCard
      :bordered="false"
      class="border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_18px_60px_rgba(0,0,0,0.14)] backdrop-blur-xl"
      content-class="!p-0"
    >
      <template #header>
        <div>
          <h1 class="text-2xl font-black text-[var(--app-text)]">
            {{ capability.title }}
          </h1>
          <p
            class="mt-2 text-base font-semibold leading-7 text-[var(--app-text-soft)]"
          >
            {{ capability.description }}
          </p>
        </div>
      </template>

      <div class="Upload">
        <NUpload
          :show-file-list="false"
          :accept="capability.accept"
          :default-upload="false"
          :disabled="isUploading"
          @change="handleUploadChange"
        >
          <NUploadDragger
            class="!rounded-2xl !border-dashed !border-[var(--app-border)] !bg-[var(--app-surface-soft)] !py-10"
          >
            <div class="flex flex-col items-center text-center">
              <span class="text-4xl">📷</span>
              <strong class="mt-4 text-xl text-[var(--app-text)]">
                {{ capability.uploadTitle }}
              </strong>
              <span
                class="mt-2 text-sm font-semibold text-[var(--app-text-soft)]"
              >
                {{ uploadHint }}
              </span>
              <NTag :bordered="false" round size="small" class="mt-4">
                {{ capability.requiredLabel }}
              </NTag>
            </div>
          </NUploadDragger>
        </NUpload>
      </div>
    </NCard>
  </motion.div>
</template>
<style scoped>
.n-card {
  border-radius: 12px;
}
.Upload {
  margin: 24px;
}
</style>
