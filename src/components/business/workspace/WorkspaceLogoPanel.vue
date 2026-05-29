<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { NSwitch, useMessage } from 'naive-ui'
import { ref, watch } from 'vue'

import { useWorkspaceLogo } from '@/composables/useWorkspaceLogo'

const enabled = defineModel<boolean>('enabled', { default: false })

const message = useMessage()
const fileInputRef = ref<HTMLInputElement | null>(null)

const {
  recentLogo,
  useRecentLogo,
  isUploading,
  isLoading,
  uploadedAtLabel,
  refreshDefaultLogo,
  uploadLogoFile,
  selectRecentLogo,
} = useWorkspaceLogo()

watch(
  enabled,
  async (value) => {
    if (!value) return

    try {
      await refreshDefaultLogo()
    } catch {
      message.warning('Logo 读取失败，请稍后重试')
    }
  },
  { immediate: true },
)

function openUpload() {
  fileInputRef.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  input.value = ''

  if (!file) return

  try {
    await uploadLogoFile(file)
    message.success('Logo 上传成功')
  } catch (error) {
    const text = error instanceof Error ? error.message : 'Logo 上传失败'
    message.error(text)
  }
}

function handleSelectRecent() {
  if (!selectRecentLogo()) {
    message.info('请先上传 Logo')
    return
  }

  message.success('已选择默认 Logo')
}
</script>

<template>
  <div class="workspace-logo-panel">
    <input
      ref="fileInputRef"
      type="file"
      class="logo-file-input"
      accept="image/png,image/svg+xml,.png,.svg"
      @change="handleFileChange"
    />

    <section
      class="logo-setting-card border border-[var(--app-border)] bg-[var(--app-surface)]"
      aria-label="Logo 设置"
    >
      <div class="logo-setting-head px-6 py-5">
        <div class="flex items-start justify-between gap-5">
          <div class="min-w-0">
            <h3 class="text-base font-black tracking-normal text-[var(--app-text)]">使用 Logo</h3>
            <p class="mt-3 text-sm font-semibold leading-6 text-[var(--app-text-soft)]">
              开启后创建任务会传 useLogo，后端自动使用当前账号默认 Logo。
            </p>
          </div>
          <NSwitch v-model:value="enabled" size="large" />
        </div>
      </div>

      <div v-if="enabled" class="logo-recent-block">
        <button
          type="button"
          class="recent-logo-row"
          :class="{ 'is-active': useRecentLogo && recentLogo }"
          :disabled="!recentLogo || isLoading"
          @click="handleSelectRecent"
        >
          <span class="logo-preview">
            <img
              v-if="recentLogo?.dataUrl"
              :src="recentLogo.dataUrl"
              :alt="recentLogo.fileName"
            />
            <span v-else class="logo-preview-placeholder">Logo</span>
          </span>
          <span class="logo-copy">
            <strong>{{ recentLogo ? '使用默认 Logo' : '暂无默认 Logo' }}</strong>
            <small>{{ recentLogo ? uploadedAtLabel : '请先上传 PNG / SVG Logo' }}</small>
          </span>
        </button>

        <button
          v-if="recentLogo"
          type="button"
          class="reupload-button"
          :disabled="isUploading"
          @click="openUpload"
        >
          {{ isUploading ? '上传中...' : '重新上传' }}
        </button>
      </div>
    </section>

    <button
      v-if="enabled"
      type="button"
      class="logo-upload-drop"
      :disabled="isUploading"
      @click="openUpload"
    >
      <Icon icon="mdi:tag-heart-outline" />
      <strong>{{ isUploading ? '上传中...' : '上传 Logo' }}</strong>
      <span>PNG / SVG · <= 2MB</span>
    </button>
  </div>
</template>

<style scoped lang="scss">
.workspace-logo-panel {
  --logo-accent: var(--workspace-accent, #efc24c);
  --logo-accent-border: color-mix(in srgb, var(--logo-accent) 55%, var(--workspace-line, var(--app-border)));
  --logo-drop-bg: color-mix(in srgb, var(--workspace-panel, var(--app-surface)) 92%, var(--logo-accent) 8%);
  --logo-drop-border: color-mix(in srgb, var(--logo-accent) 44%, var(--workspace-line, var(--app-border)));
  --logo-preview-bg: color-mix(in srgb, var(--workspace-panel-deep, #111722) 92%, transparent);
  --logo-preview-text: var(--workspace-accent-strong, #f5d37a);
  --logo-preview-border: color-mix(in srgb, var(--workspace-accent-strong, #f5d37a) 62%, transparent);
  --logo-icon: var(--workspace-accent-strong, #f4a329);

  display: grid;
  gap: 12px;
}

:global([data-theme='dark']) .workspace-logo-panel {
  --logo-drop-bg: color-mix(in srgb, var(--workspace-panel, var(--app-surface)) 78%, var(--logo-accent) 22%);
  --logo-drop-border: color-mix(in srgb, var(--logo-accent) 55%, var(--workspace-line, var(--app-border)));
  --logo-preview-bg: color-mix(in srgb, var(--workspace-panel-deep, #0a101c) 94%, transparent);
  --logo-preview-text: var(--workspace-accent-strong, #f8d891);
  --logo-preview-border: color-mix(in srgb, var(--workspace-accent-strong, #f8d891) 45%, transparent);
}

.logo-file-input {
  display: none;
}

.logo-setting-card {
  overflow: hidden;
  border-radius: 12px;
}

.logo-recent-block {
  display: grid;
  gap: 12px;
  border-top: 1px solid var(--workspace-line, var(--app-border));
  background: var(--workspace-panel, var(--app-surface));
  padding: 0 20px 20px;
}

.recent-logo-row,
.reupload-button {
  width: 100%;
  border-radius: 10px;
  font-family: inherit;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
}

.recent-logo-row {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 68px;
  margin-top: 16px;
  padding: 12px 16px;
  border: 1px solid var(--workspace-line, var(--app-border));
  background: var(--workspace-panel, var(--app-surface));
  text-align: left;
  cursor: pointer;
}

.recent-logo-row.is-active {
  border-color: var(--logo-accent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--logo-accent) 18%, transparent);
}

.recent-logo-row:disabled {
  cursor: not-allowed;
  opacity: 0.85;
}

.logo-preview {
  display: grid;
  place-items: center;
  width: 96px;
  height: 34px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 5px;
  border: 1px solid var(--logo-preview-border);
  background:
    linear-gradient(90deg, rgba(255, 214, 114, 0.14), transparent 55%),
    var(--logo-preview-bg);
}

.logo-preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 2px 4px;
  background: var(--logo-preview-bg);
}

.logo-preview-placeholder {
  color: var(--logo-preview-text);
  font-size: 13px;
  font-weight: 900;
}

.logo-copy {
  min-width: 0;
}

.logo-copy strong,
.logo-copy small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logo-copy strong {
  color: var(--app-text);
  font-size: 15px;
  font-weight: 900;
}

.logo-copy small {
  margin-top: 4px;
  color: var(--workspace-muted, var(--app-text-soft));
  font-size: 14px;
  font-weight: 700;
}

.reupload-button {
  height: 48px;
  border: 1px solid var(--workspace-line, var(--app-border));
  background: var(--workspace-panel, var(--app-surface));
  color: var(--app-text);
  text-align: left;
  padding: 0 18px;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
}

.reupload-button:hover:not(:disabled) {
  border-color: var(--logo-accent-border);
}

.reupload-button:disabled,
.logo-upload-drop:disabled {
  cursor: wait;
  opacity: 0.72;
}

.logo-upload-drop {
  display: grid;
  width: 100%;
  place-items: center;
  min-height: 190px;
  border: 1px dashed var(--logo-drop-border);
  border-radius: 12px;
  background: var(--logo-drop-bg);
  color: var(--app-text);
  cursor: pointer;
  font-family: inherit;
}

.logo-upload-drop .iconify {
  margin-bottom: 12px;
  color: var(--logo-icon);
  font-size: 34px;
}

.logo-upload-drop strong {
  font-size: 18px;
  font-weight: 900;
}

.logo-upload-drop span {
  margin-top: 8px;
  color: var(--workspace-muted, var(--app-text-soft));
  font-size: 14px;
  font-weight: 700;
}
</style>
