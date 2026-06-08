<script setup lang="ts">
import { NModal, NSwitch, useMessage } from "naive-ui";
import { computed, ref, watch } from "vue";

import PreloadImage from "@/components/common/PreloadImage.vue";
import { useWorkspaceLogo } from "@/composables/useWorkspaceLogo";

const props = withDefaults(
  defineProps<{
    variant?: "scene" | "batch";
    embedded?: boolean;
    disabled?: boolean;
  }>(),
  {
    variant: "scene",
    embedded: false,
    disabled: false,
  },
);

const enabled = defineModel<boolean>("enabled", { default: false });

const message = useMessage();
const fileInputRef = ref<HTMLInputElement | null>(null);
const previewModalVisible = ref(false);

const {
  customLogo,
  isUploading,
  uploadedAtLabel,
  uploadCustomLogoFile,
  setLogoEnabled,
} = useWorkspaceLogo();

const isBatch = computed(() => props.variant === "batch");
const panelTitle = computed(() =>
  isBatch.value ? "使用最近 Logo" : "使用 Logo",
);
const panelDescription = computed(() =>
  isBatch.value
    ? "开启后将直接使用当前上传的 Logo，可随时重新上传替换。"
    : "开启后将直接使用当前上传的 Logo，可随时重新上传替换。",
);
const currentLogoHint = computed(() => {
  if (customLogo.value) return uploadedAtLabel.value;
  return "请先上传 PNG / JPG / SVG Logo";
});
const uploadButtonLabel = computed(() => {
  if (isUploading.value) return "上传中...";
  if (customLogo.value) return "重新上传";
  return "上传 Logo";
});

watch(
  enabled,
  (value) => {
    if (!isBatch.value) {
      setLogoEnabled(value);
    }
  },
  { immediate: true },
);

function openUpload() {
  if (props.disabled) return;
  fileInputRef.value?.click();
}

function openLogoPreview() {
  if (props.disabled || !customLogo.value?.dataUrl) return;
  previewModalVisible.value = true;
}

async function handleFileChange(event: Event) {
  if (props.disabled) return;

  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  input.value = "";

  if (!file) return;

  try {
    const hadCustomLogo = Boolean(customLogo.value);
    await uploadCustomLogoFile(file);
    message.success(hadCustomLogo ? "Logo 已更新" : "Logo 上传成功");
  } catch (error) {
    const text = error instanceof Error ? error.message : "Logo 上传失败";
    message.error(text);
  }
}
</script>

<template>
  <div
    class="workspace-logo-panel"
    :class="{
      'workspace-logo-panel--batch': isBatch,
      'workspace-logo-panel--embedded': embedded,
      'is-disabled': disabled,
    }"
  >
    <input
      ref="fileInputRef"
      type="file"
      class="logo-file-input"
      accept="image/png,image/jpeg,image/svg+xml,.png,.jpg,.jpeg,.svg"
      @change="handleFileChange"
    />

    <section
      class="logo-setting-card"
      :class="{ 'bg-[var(--app-surface)]': !embedded }"
      aria-label="Logo 设置"
    >
      <div class="logo-setting-head px-6 py-5">
        <div class="flex items-start justify-between gap-5">
          <div class="min-w-0">
            <h3 class="logo-setting-title">
              {{ panelTitle }}
            </h3>
            <p class="logo-setting-desc">
              {{ panelDescription }}
            </p>
          </div>
          <NSwitch
            v-model:value="enabled"
            size="large"
            class="logo-switch"
            :disabled="disabled"
          />
        </div>
      </div>

      <div v-if="enabled" class="logo-content-block">
        <div
          class="logo-card logo-card--selected"
          :class="{ 'is-empty': !customLogo }"
        >
          <span class="logo-card__preview">
            <button
              v-if="customLogo?.dataUrl"
              type="button"
              class="logo-card__preview-btn"
              aria-label="查看 Logo 大图"
              :disabled="disabled"
              @click="openLogoPreview"
            >
              <PreloadImage
                class="logo-card__preview-image"
                :src="customLogo.dataUrl"
                :alt="customLogo.fileName"
                loading="lazy"
                decoding="async"
                fit="contain"
              />
            </button>
            <span v-else class="logo-card__preview-placeholder">Logo</span>
          </span>
          <span class="logo-card__copy">
            <strong>{{ customLogo ? "当前 Logo" : "尚未上传 Logo" }}</strong>
            <small>{{ currentLogoHint }}</small>
          </span>
        </div>

        <button
          type="button"
          class="reupload-button"
          :disabled="disabled || isUploading"
          @click="openUpload"
        >
          {{ uploadButtonLabel }}
        </button>
      </div>
    </section>

    <NModal
      v-model:show="previewModalVisible"
      preset="card"
      title="当前 Logo"
      class="logo-preview-modal"
      :bordered="false"
      :segmented="{ content: true }"
    >
      <PreloadImage
        v-if="customLogo?.dataUrl"
        class="logo-preview-modal-image"
        :src="customLogo.dataUrl"
        :alt="customLogo.fileName"
        loading="eager"
        decoding="async"
        fit="contain"
      />
    </NModal>
  </div>
</template>

<style scoped lang="scss">
.workspace-logo-panel {
  display: grid;
  gap: 12px;
}

.workspace-logo-panel--batch {
  gap: 0;
}

.workspace-logo-panel--embedded {
  gap: 0;
}

.workspace-logo-panel--embedded .logo-setting-card {
  background: transparent !important;
  border-radius: 0;
  box-shadow: none;
}

.workspace-logo-panel--batch .logo-setting-card {
  background: transparent;
  box-shadow: none;
}

.workspace-logo-panel--batch .logo-setting-head {
  padding: 0;
}

.workspace-logo-panel--batch .logo-setting-head h3 {
  font-size: 16px;
}

.workspace-logo-panel--batch .logo-setting-head p {
  margin-top: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  line-height: 1.65;
}

.logo-switch :deep(.n-switch.n-switch--active .n-switch__rail) {
  background-color: #ffb800 !important;
}

.logo-switch :deep(.n-switch.n-switch--active .n-switch__button) {
  background-color: #ffffff !important;
}

.logo-file-input {
  display: none;
}

.logo-setting-card {
  overflow: hidden;
  border-radius: 12px;
}

.logo-setting-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
}

.logo-setting-desc {
  margin: 8px 0 12px;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.6;
}

.logo-setting-head {
  padding-bottom: 0;
}

.logo-content-block {
  display: grid;
  gap: 10px;
  padding: 0 20px 20px;
  background: var(--workspace-panel, var(--app-surface));
}

.workspace-logo-panel--embedded .logo-content-block,
.workspace-logo-panel--batch .logo-content-block {
  padding: 0;
  background: transparent;
}

.logo-card,
.reupload-button {
  width: 100%;
  border-radius: 10px;
  font-family: inherit;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
}

.logo-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 68px;
  padding: 12px 14px;
  border: none;
  background: var(--saas-logo-upload-surface, var(--saas-logo-row-surface, #ffffff));
  box-shadow: none;
  text-align: left;
}

.logo-card.is-empty {
  box-shadow: none;
}

.logo-card__preview {
  display: grid;
  place-items: center;
  width: 72px;
  height: 36px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 6px;
  background: var(--saas-logo-preview-surface, #f3f4f6);
}

.logo-card__preview-btn {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: zoom-in;
}

.logo-card__preview-btn:disabled {
  cursor: not-allowed;
}

.logo-card__preview-image {
  display: block;
  width: 100%;
  height: 100%;
  padding: 2px 4px;
}

.logo-card__preview-placeholder {
  color: #8c8c8c;
  font-size: 12px;
  font-weight: 700;
}

.logo-card__copy {
  min-width: 0;
}

.logo-card__copy strong,
.logo-card__copy small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logo-card__copy strong {
  color: var(--saas-title, #1f1f1f);
  font-size: 14px;
  font-weight: 600;
}

.logo-card__copy small {
  margin-top: 4px;
  color: var(--saas-muted, #8c8c8c);
  font-size: 12px;
  font-weight: 400;
}

.reupload-button {
  height: 44px;
  border: 1px solid var(--saas-logo-row-border, #e5e7eb);
  background: var(--saas-logo-row-surface, #ffffff);
  color: var(--saas-title, #1f1f1f);
  padding: 0 14px;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  cursor: pointer;
}

.reupload-button:hover:not(:disabled) {
  border-color: #d1d5db;
}

.reupload-button:disabled {
  cursor: wait;
  opacity: 0.72;
}

:global(html[data-theme="dark"]) .workspace-logo-panel:not(.workspace-logo-panel--embedded) {
  --saas-logo-row-surface: #14171a;
  --saas-logo-row-border: #2a2e34;
  --saas-logo-row-selected-surface: #14171a;
  --saas-logo-preview-surface: #14171a;
  --saas-title: #ffffff;
  --saas-muted: #9ca3af;
}

:global(html[data-theme="dark"]) .workspace-logo-panel:not(.workspace-logo-panel--embedded) .logo-setting-title {
  color: #ffffff;
}

:global(html[data-theme="dark"]) .workspace-logo-panel:not(.workspace-logo-panel--embedded) .logo-setting-desc {
  color: #9ca3af;
}

.workspace-logo-panel.is-disabled {
  opacity: 0.55;
  pointer-events: none;
  user-select: none;
}

.workspace-logo-panel.is-disabled .logo-setting-card {
  cursor: not-allowed;
}
</style>

<style lang="scss">
.logo-preview-modal {
  width: min(720px, calc(100vw - 32px)) !important;
  max-width: min(720px, calc(100vw - 32px)) !important;
}

.logo-preview-modal-image {
  display: block;
  width: 100%;
  height: min(60vh, 480px);
  margin: 0 auto;
  border-radius: 12px;
  background: color-mix(
    in srgb,
    var(--workspace-panel-soft, var(--app-surface-soft)) 88%,
    #0f172a
  );
}
</style>
