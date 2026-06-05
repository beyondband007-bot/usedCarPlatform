<script setup lang="ts">
import { computed, ref } from "vue";
import { Icon } from "@iconify/vue";
import {
  NButton,
  NModal,
  NSpin,
  NUpload,
  NUploadDragger,
  type UploadFileInfo,
} from "naive-ui";
import { motion } from "motion-v";

import uploadIconSrc from "@/assets/img/icon/上传.svg";
import PreloadImage from "@/components/common/PreloadImage.vue";
import type { WorkspaceCapability } from "@/types/workspace";

const props = defineProps<{
  capability: WorkspaceCapability;
  uploadPreviewUrl?: string | null;
  isUploading?: boolean;
  uploadDisabled?: boolean;
  compact?: boolean;
  embedded?: boolean;
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

const displayUploadActionText = computed(() => {
  const title = displayUploadTitle.value.trim();
  if (/^点击/.test(title)) return title;

  const subject = title.startsWith("上传") ? title.slice(2) : title;
  return `点击或拖拽上传${subject}`;
});

const displayUploadFormatText = computed(() => {
  const hint = displayUploadHint.value.trim();
  if (/^支持/.test(hint)) return hint;

  const stripped = hint
    .replace(/^点击[/／]拖拽上传\s*[·•]\s*/i, "")
    .replace(/^[·•]\s*/g, "")
    .trim();

  if (!stripped) return hint;
  return `支持 ${stripped.replace(/\s*[·•]\s*/g, " ")}`;
});

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

const isUploadBlocked = computed(
  () => Boolean(props.isUploading || props.uploadDisabled),
);

function handleUploadChange(options: { file: UploadFileInfo }) {
  if (isUploadBlocked.value) return;

  const file = options.file.file;
  if (!file) return;
  emit("selectFile", file);
}

function handleReupload() {
  if (isUploadBlocked.value) return;
  replaceInputRef.value?.click();
}

function handleReplaceInputChange(event: Event) {
  if (isUploadBlocked.value) return;

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
    <section
      :class="[
        compact ? 'upload-compact-shell' : 'upload-task-card',
        { 'is-embedded': embedded },
      ]"
    >
      <header v-if="!compact" class="upload-task-card__header">
        <div class="upload-task-card__title-row">
          <h1 class="upload-task-card__title">{{ capability.title }}</h1>
          <span class="upload-task-card__badge">{{ displayRequiredLabel }}</span>
        </div>
        <p class="upload-task-card__desc">{{ capability.description }}</p>
      </header>

      <div :class="compact ? 'upload-compact-panel' : 'upload-panel'">
        <div v-if="hasUploadedImage" class="upload-preview">
          <div class="upload-preview-media">
            <button
              type="button"
              class="upload-preview-image-btn"
              aria-label="查看车辆大图"
              @click="openPreviewModal"
            >
              <PreloadImage
                class="upload-preview-image"
                :src="uploadPreviewUrl!"
                :alt="displayUploadTitle"
                loading="lazy"
                decoding="async"
                fit="contain"
              />
            </button>
          </div>

          <NButton
            type="default"
            size="large"
            block
            class="upload-reupload-btn"
            :disabled="isUploadBlocked"
            @click="handleReupload"
          >
            {{ uploadDisabled ? "生成中" : "重新上传" }}
          </NButton>
        </div>

        <div v-else-if="isPreviewLoading" class="upload-loading">
          <NSpin size="large" />
          <p>正在上传车辆图片...</p>
          <PreloadImage
            v-if="uploadPreviewUrl"
            class="upload-loading-image"
            :src="uploadPreviewUrl"
            :alt="displayUploadTitle"
            loading="lazy"
            decoding="async"
            fit="contain"
          />
        </div>

        <NUpload
          v-else
          :show-file-list="false"
          :accept="capability.accept"
          :default-upload="false"
          :disabled="isUploadBlocked"
          @change="handleUploadChange"
        >
          <NUploadDragger
            :class="[
              compact ? 'upload-compact-dragger' : 'upload-dragger',
              { 'is-blocked': uploadDisabled },
            ]"
          >
            <div
              :class="
                compact
                  ? 'upload-compact-trigger'
                  : 'upload-trigger'
              "
            >
              <span v-if="!compact" class="upload-trigger-icon-wrap">
                <img
                  :src="uploadIconSrc"
                  alt=""
                  class="upload-trigger-icon"
                  draggable="false"
                />
              </span>
              <Icon
                v-else
                :icon="displayUploadIcon"
                class="upload-compact-icon"
                :class="{ 'is-interior': uploadIcon === 'mdi:seat-passenger' }"
              />
              <strong class="upload-trigger-title">
                {{
                  compact
                    ? displayUploadTitle
                    : uploadDisabled
                      ? "当前任务生成中，请等待完成后再上传"
                      : displayUploadActionText
                }}
              </strong>
              <span v-if="!uploadDisabled || compact" class="upload-trigger-hint">
                {{ compact ? displayUploadHint : displayUploadFormatText }}
              </span>
              <b v-if="compact" class="upload-compact-required">
                {{ displayRequiredLabel }}
              </b>
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
    </section>

    <NModal
      v-model:show="previewModalVisible"
      preset="card"
      :title="displayUploadTitle"
      class="upload-preview-modal"
      :bordered="false"
      :segmented="{ content: true }"
    >
      <PreloadImage
        class="upload-preview-modal-image"
        :src="uploadPreviewUrl ?? ''"
        :alt="displayUploadTitle"
        loading="eager"
        decoding="async"
        fit="contain"
      />
    </NModal>
  </motion.div>
</template>

<style scoped lang="scss">
.upload-task-card {
  --upload-accent-border: var(--workspace-accent, #efc24c);
  --upload-accent-badge-border: rgb(255, 183, 0);
  --upload-accent-badge-bg: rgb(255, 183, 0);
  --upload-accent-badge-text: #000000;
  --upload-surface: var(--workspace-panel-soft, #151515);
  --upload-shadow: var(
    --workspace-shadow,
    0 18px 42px rgba(0, 0, 0, 0.24)
  );

  border-radius: 12px;
  background: var(--workspace-panel, var(--app-surface));
  box-shadow: var(--upload-shadow);
}

.upload-task-card.is-embedded {
  background: transparent;
  box-shadow: none;
  border-radius: 0;
}

:global(.workspace-page.theme-light) .upload-task-card {
  --upload-accent-border: var(--workspace-commercial-strong, #d4a017);
  --upload-accent-badge-border: rgb(255, 183, 0);
  --upload-accent-badge-bg: rgb(255, 183, 0);
  --upload-accent-badge-text: #000000;
  --upload-surface: var(--workspace-panel-soft, #f7fafd);
  --upload-shadow: var(
    --workspace-shadow,
    0 0 0 1px rgba(174, 191, 213, 0.2),
    0 18px 42px rgba(78, 111, 148, 0.11)
  );
}

.upload-task-card__header {
  padding: 24px 24px 0;
}

.upload-task-card__title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.upload-task-card__title {
  margin: 0;
  color: var(--app-text);
  font-size: 24px;
  font-weight: 900;
  line-height: 1.25;
}

.upload-task-card__badge {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  height: 24px;
  padding: 0 10px;
  border: 1px solid var(--upload-accent-badge-border);
  border-radius: 999px;
  background: var(--upload-accent-badge-bg);
  color: var(--upload-accent-badge-text);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.upload-task-card__desc {
  margin: 10px 0 0;
  color: var(--workspace-muted, var(--app-text-soft));
  font-size: 14px;
  font-weight: 600;
  line-height: 1.65;
}

.upload-panel {
  padding: 18px 24px 24px;
}

.upload-dragger {
  min-height: 220px !important;
  padding: 36px 24px !important;
  border: 1px solid var(--upload-accent-border) !important;
  border-style: solid !important;
  border-radius: 16px !important;
  background: var(--upload-surface) !important;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.upload-dragger:hover:not(.is-blocked) {
  border-color: color-mix(
    in srgb,
    var(--upload-accent-border) 82%,
    #ffffff
  ) !important;
  box-shadow: 0 0 0 1px
    color-mix(in srgb, var(--upload-accent-border) 24%, transparent);
}

:global(.workspace-page.theme-light) .upload-dragger:hover:not(.is-blocked) {
  border-color: var(--workspace-commercial, #d89a00) !important;
  box-shadow: 0 0 0 3px
    color-mix(in srgb, var(--upload-accent-border) 16%, transparent);
}

.upload-trigger {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  text-align: center;
}

.upload-trigger-icon {
  display: block;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
}

.upload-trigger-title {
  margin-top: 18px;
  color: var(--app-text);
  font-size: 18px;
  font-weight: 800;
  line-height: 1.45;
}

.upload-trigger-hint {
  margin-top: 8px;
  color: var(--workspace-muted, var(--app-text-soft));
  font-size: 13px;
  font-weight: 600;
  line-height: 1.55;
}

.upload-compact-shell {
  display: block;
}

.upload-compact-panel {
  margin: 0;
}

.upload-compact-dragger {
  min-height: 178px !important;
  padding: 0 !important;
  border: 1px solid var(--upload-accent-border, var(--workspace-accent, #efc24c)) !important;
  border-style: solid !important;
  border-radius: 12px !important;
  background: var(--upload-surface, color-mix(in srgb, var(--app-surface) 92%, var(--workspace-accent, #efc24c) 8%)) !important;
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

.upload-compact-trigger .upload-trigger-title {
  margin-top: 8px;
  font-size: 17px;
}

.upload-compact-trigger .upload-trigger-hint {
  margin-top: 6px;
  font-size: 13px;
}

.upload-compact-required {
  margin-top: 10px;
  padding: 4px 9px;
  border-radius: 999px;
  background: var(--app-surface-soft);
  color: var(--app-text-soft);
  font-size: 12px;
  font-weight: 700;
}

.upload-preview {
  display: grid;
  gap: 16px;
}

.upload-preview-media {
  position: relative;
  overflow: visible;
  background: transparent;
}

.upload-preview-image-btn {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: zoom-in;
}

.upload-preview-image {
  display: block;
  width: 100%;
  height: auto;
}

.upload-preview-image :deep(.preload-image) {
  height: auto;
  overflow: visible;
  background: transparent;
}

.upload-preview-image :deep(.preload-image:not(.is-loaded)) {
  min-height: clamp(178px, 24vw, 280px);
}

.upload-preview-image :deep(.preload-image__img) {
  width: 100%;
  height: auto;
  max-height: min(70vh, 480px);
  border-radius: 12px;
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
  border: 1px solid var(--upload-accent-border, var(--workspace-accent, #efc24c));
  border-radius: 16px;
  background: var(--upload-surface, var(--workspace-panel-soft, var(--app-surface-soft)));
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

.upload-compact-dragger.is-blocked,
.upload-dragger.is-blocked,
:deep(.n-upload-dragger.is-blocked) {
  cursor: not-allowed;
  opacity: 0.72;
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
  height: min(72vh, 720px);
  margin: 0 auto;
  border-radius: 12px;
  background: color-mix(
    in srgb,
    var(--workspace-panel-soft, var(--app-surface-soft)) 88%,
    #0f172a
  );
}
</style>
