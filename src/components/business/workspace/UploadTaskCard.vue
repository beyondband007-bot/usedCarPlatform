<script setup lang="ts">
import { computed, ref } from "vue";
import { Icon } from "@iconify/vue";
import {
  NButton,
  NCard,
  NModal,
  NSpin,
  NTag,
  NUpload,
  NUploadDragger,
  type UploadFileInfo,
} from "naive-ui";
import { motion } from "motion-v";

import type { WorkspaceCapability } from "@/types/workspace";

const props = defineProps<{
  capability: WorkspaceCapability;
  uploadPreviewUrl?: string | null;
  isUploading?: boolean;
  compact?: boolean;
  uploadTitle?: string;
  uploadHint?: string;
  requiredLabel?: string;
  uploadIcon?: string;
}>();

const displayUploadTitle = computed(
  () => props.uploadTitle ?? props.capability.uploadTitle,
);
const displayUploadHint = computed(
  () => props.uploadHint ?? props.capability.uploadHint,
);
const displayRequiredLabel = computed(
  () => props.requiredLabel ?? props.capability.requiredLabel,
);
const displayUploadIcon = computed(
  () => props.uploadIcon ?? "mdi:camera",
);

const emit = defineEmits<{
  selectFile: [file: File];
  remove: [];
}>();

const replaceInputRef = ref<HTMLInputElement | null>(null);
const previewModalVisible = ref(false);

const hasUploadedImage = computed(
  () => Boolean(props.uploadPreviewUrl) && !props.isUploading,
);

const isPreviewLoading = computed(
  () => Boolean(props.uploadPreviewUrl) && props.isUploading,
);

function handleUploadChange(options: { file: UploadFileInfo }) {
  const file = options.file.file;
  if (!file) return;
  emit("selectFile", file);
}

function handleRemove() {
  emit("remove");
}

function handleReupload() {
  replaceInputRef.value?.click();
}

function handleReplaceInputChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";

  if (!file) return;
  emit("selectFile", file);
}

function openPreviewModal() {
  if (!props.uploadPreviewUrl || props.isUploading) return;
  previewModalVisible.value = true;
}
</script>

<template>
  <motion.div
    :key="capability.code"
    :initial="{ opacity: 0, y: 18 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.42 }"
    :class="{ 'upload-task-card--compact': compact }"
  >
    <component
      :is="compact ? 'div' : NCard"
      :bordered="false"
      :class="
        compact
          ? 'upload-compact-shell'
          : 'border border-[var(--workspace-line,var(--app-border))] bg-[var(--workspace-panel,var(--app-surface))] shadow-[var(--workspace-shadow,0_18px_60px_rgba(0,0,0,0.14))] backdrop-blur-xl'
      "
      :content-class="compact ? undefined : '!p-0'"
    >
      <template v-if="!compact" #header>
        <div>
          <h1 class="text-2xl font-black text-[var(--app-text)]">
            {{ capability.title }}
          </h1>
          <p
            class="mt-2 text-base font-semibold leading-7 text-[var(--workspace-muted,var(--app-text-soft))]"
          >
            {{ capability.description }}
          </p>
        </div>
      </template>

      <div :class="compact ? 'upload-compact-panel' : 'upload-panel'">
        <div v-if="hasUploadedImage" class="upload-preview">
          <div class="upload-preview-media">
            <button
              type="button"
              class="upload-preview-image-btn"
              aria-label="查看车辆大图"
              @click="openPreviewModal"
            >
              <img
                :src="uploadPreviewUrl!"
                :alt="displayUploadTitle"
                loading="lazy"
                decoding="async"
              />
            </button>

            <button
              type="button"
              class="upload-preview-remove"
              aria-label="删除车辆图片"
              @click="handleRemove"
            >
              <Icon icon="mdi:close" />
            </button>
          </div>

          <NButton
            type="default"
            size="large"
            block
            class="upload-reupload-btn"
            @click="handleReupload"
          >
            重新生成
          </NButton>
        </div>

        <div v-else-if="isPreviewLoading" class="upload-loading">
          <NSpin size="large" />
          <p>正在上传车辆图片...</p>
          <img
            v-if="uploadPreviewUrl"
            class="upload-loading-image"
            :src="uploadPreviewUrl"
            :alt="displayUploadTitle"
          />
        </div>

        <NUpload
          v-else
          :show-file-list="false"
          :accept="capability.accept"
          :default-upload="false"
          :disabled="isUploading"
          @change="handleUploadChange"
        >
          <NUploadDragger
            :class="
              compact
                ? 'upload-compact-dragger'
                : '!rounded-2xl !border-dashed !border-[var(--workspace-line,var(--app-border))] !bg-[var(--workspace-panel-soft,var(--app-surface-soft))] !py-10'
            "
          >
            <div
              :class="
                compact
                  ? 'upload-compact-trigger'
                  : 'flex flex-col items-center text-center'
              "
            >
              <Icon
                v-if="compact"
                :icon="displayUploadIcon"
                class="upload-compact-icon"
                :class="{ 'is-interior': uploadIcon === 'mdi:seat-passenger' }"
              />
              <span v-else class="text-4xl">📷</span>
              <strong
                :class="
                  compact ? undefined : 'mt-4 text-xl text-[var(--app-text)]'
                "
              >
                {{ displayUploadTitle }}
              </strong>
              <span
                :class="
                  compact
                    ? undefined
                    : 'mt-2 text-sm font-semibold text-[var(--workspace-muted,var(--app-text-soft))]'
                "
              >
                {{ displayUploadHint }}
              </span>
              <b v-if="compact">{{ displayRequiredLabel }}</b>
              <NTag v-else :bordered="false" round size="small" class="mt-4">
                {{ displayRequiredLabel }}
              </NTag>
            </div>
          </NUploadDragger>
        </NUpload>

        <input
          ref="replaceInputRef"
          type="file"
          class="upload-hidden-input"
          :accept="capability.accept"
          @change="handleReplaceInputChange"
        />
      </div>
    </component>

    <NModal
      v-model:show="previewModalVisible"
      preset="card"
      :title="displayUploadTitle"
      class="upload-preview-modal"
      :bordered="false"
      :segmented="{ content: true }"
    >
      <img
        class="upload-preview-modal-image"
        :src="uploadPreviewUrl ?? ''"
        :alt="displayUploadTitle"
      />
    </NModal>
  </motion.div>
</template>

<style scoped>
.upload-compact-shell {
  display: block;
}

.upload-compact-panel {
  margin: 0;
}

.upload-compact-dragger {
  min-height: 178px !important;
  padding: 0 !important;
  border: 1px dashed color-mix(in srgb, var(--workspace-accent, #efc24c) 38%, var(--app-border)) !important;
  border-radius: 12px !important;
  background: color-mix(in srgb, var(--app-surface) 92%, var(--workspace-accent, #efc24c) 8%) !important;
}

.upload-compact-trigger {
  display: grid;
  place-items: center;
  min-height: 178px;
  padding: 24px 16px;
  color: var(--app-text);
  text-align: center;
}

.upload-compact-icon {
  color: var(--workspace-accent-strong, #ffd75a);
  font-size: 34px;
}

.upload-task-card--compact .upload-compact-icon.is-interior {
  color: #a56966;
}

.upload-compact-trigger strong {
  margin-top: 8px;
  font-size: 17px;
  font-weight: 900;
}

.upload-compact-trigger span {
  margin-top: 6px;
  color: var(--app-text-soft);
  font-size: 13px;
  font-weight: 700;
}

.upload-compact-trigger b {
  margin-top: 10px;
  padding: 4px 9px;
  border-radius: 999px;
  background: var(--app-surface-soft);
  color: var(--app-text-soft);
  font-size: 12px;
  font-weight: 700;
}

.n-card {
  border-radius: 12px;
}

.upload-panel {
  margin: 24px;
}

.upload-preview {
  display: grid;
  gap: 16px;
}

.upload-preview-media {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--workspace-panel-soft, var(--app-surface-soft));
}

.upload-preview-image-btn {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: zoom-in;
}

.upload-preview-image-btn img {
  display: block;
  width: 100%;
  max-height: 320px;
  object-fit: contain;
  background: color-mix(in srgb, var(--workspace-panel-soft, var(--app-surface-soft)) 88%, #0f172a);
}

.upload-preview-remove {
  position: absolute;
  top: 12px;
  right: 12px;
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--workspace-panel-deep, #101010) 72%, transparent);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}

.upload-preview-remove:hover {
  background: rgba(220, 38, 38, 0.88);
  transform: scale(1.04);
}

.upload-reupload-btn {
  height: 48px !important;
  border-radius: 12px !important;
  font-weight: 800 !important;
}

.upload-loading {
  position: relative;
  display: grid;
  min-height: 220px;
  place-items: center;
  gap: 12px;
  overflow: hidden;
  border: 1px dashed var(--app-border);
  border-radius: 16px;
  background: var(--workspace-panel-soft, var(--app-surface-soft));
  padding: 28px;
}

.upload-loading p {
  margin: 0;
  color: var(--workspace-muted, var(--app-text-soft));
  font-size: 14px;
  font-weight: 700;
}

.upload-loading-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0.18;
}

.upload-hidden-input {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}
</style>

<style lang="scss">
.upload-preview-modal {
  width: min(960px, calc(100vw - 32px)) !important;
  max-width: min(960px, calc(100vw - 32px)) !important;
}

.upload-preview-modal-image {
  display: block;
  width: 100%;
  max-height: min(72vh, 720px);
  margin: 0 auto;
  object-fit: contain;
  border-radius: 12px;
  background: color-mix(in srgb, var(--workspace-panel-soft, var(--app-surface-soft)) 88%, #0f172a);
}
</style>
