<script setup lang="ts">
import { computed } from 'vue'
import { useMessage } from 'naive-ui'
import { AiComposer } from '@company/ai-studio-sdk/vue'

type ComposerTheme = 'light' | 'dark' | 'auto'

type ComposerAttachment = {
  id: string
  file: File
  name: string
  size: number
  type: string
  previewUrl?: string
  status: 'ready' | 'invalid'
  error?: string
}

type RatioOption = {
  value: string
  label: string
}

type ComposerActionOption = {
  id: string
  label: string
  value: string
  options: Array<{
    label: string
    value: string
  }>
}

const props = defineProps<{
  modelValue: string
  composerKey: number
  theme: ComposerTheme
  selectedRatio: string
  ratioOptions: RatioOption[]
  referencePreview?: string | null
  isEditingReference?: boolean
  isUploadingReference?: boolean
  isGenerating?: boolean
  pendingTurns?: number
  cost: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:selectedRatio': [value: string]
  send: [value: string, context: { attachments: ComposerAttachment[] }]
  'attachments-change': [attachments: ComposerAttachment[]]
}>()

const message = useMessage()

function buildReferenceAttachment(
  url: string,
  isEditing: boolean,
): ComposerAttachment {
  return {
    id: `reference-${url}`,
    file: new File([], isEditing ? '待编辑' : '参考图', { type: 'image/jpeg' }),
    name: isEditing ? '待编辑' : '参考图',
    size: 0,
    type: 'image/jpeg',
    previewUrl: url,
    status: 'ready',
  }
}

const defaultAttachments = computed<ComposerAttachment[]>(() => {
  if (!props.referencePreview) {
    return []
  }

  return [
    buildReferenceAttachment(
      props.referencePreview,
      Boolean(props.isEditingReference),
    ),
  ]
})

const composerActionOptions = computed<ComposerActionOption[]>(() => [
  {
    id: 'size',
    label: '输出比例',
    value: props.selectedRatio,
    options: props.ratioOptions,
  },
])

const composerExtraBindings = computed<Record<string, unknown>>(() => ({
  showStatusText: false,
  statusTextMap: {
    generating: 'Generating...',
  },
  actionHint: `本次消耗 ${props.cost} 积分`,
  onAttachmentsChange: (attachments: ComposerAttachment[]) =>
    emit('attachments-change', attachments),
  onAttachmentError: (errorMessage: string) => message.error(errorMessage),
}))

function handleActionOptionChange(id: string, value: string) {
  if (id === 'size') {
    emit('update:selectedRatio', value)
  }
}
</script>

<template>
  <section
    class="creative-composer-host"
    :class="{ 'is-editing-reference': isEditingReference }"
    aria-label="创意输入"
  >
    <div class="creative-composer-body">
      <AiComposer
        :key="composerKey"
        class="creative-sdk-composer"
        :value="modelValue"
        :theme="theme"
        :default-attachments="defaultAttachments"
        placeholder="输入想法、脚本或上传参考图，描述你想生成的汽车创意图片"
        :disabled="Boolean(isUploadingReference)"
        :loading="Boolean(isGenerating) || (pendingTurns ?? 0) > 0"
        :min-rows="3"
        :max-rows="10"
        :upload-options="{
          accept: ['image/*'],
          maxFiles: 1,
          maxFileSize: 10 * 1024 * 1024,
        }"
        v-bind="composerExtraBindings"
        :show-action-options="true"
        :action-options="composerActionOptions"
        :on-change="(value: string) => emit('update:modelValue', value)"
        :on-send="
          (value: string, context: { attachments: ComposerAttachment[] }) =>
            emit('send', value, context)
        "
        :on-action-option-change="handleActionOptionChange"
      />
    </div>
  </section>
</template>

<style scoped lang="scss">
.creative-composer-host {
  position: relative;
  box-sizing: border-box;
  background: transparent;
}

.creative-composer-body {
  width: 100%;
  min-width: 0;
}

.creative-composer-body :deep(.creative-sdk-composer) {
  width: 100%;
}

.creative-composer-host.is-editing-reference
  :deep([data-testid='image-stack-item'])::after {
  content: '待编辑';
  position: absolute;
  left: 6px;
  bottom: 6px;
  z-index: 2;
  border-radius: 6px;
  background: rgba(21, 21, 21, 0.88);
  color: #f9fafb;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.4;
  pointer-events: none;
}
</style>

<style lang="scss">
.theme-dark .creative-composer-host .creative-sdk-composer,
.creative-composer-host .creative-sdk-composer[data-theme='dark'] {
  background-color: #151515;
  border: 1px solid rgba(255, 255, 255, 0.08);
  --color-bg-primary: #151515;
  --color-bg-secondary: #151515;
  --color-bg-shell: #151515;
  --color-bg-elevated: #151515;
  --color-bg-input: #151515;
  --color-image-tray-bg: #151515;
  --color-image-card-bg: #151515;
  --color-image-upload-bg: #1f1f1f;
  --color-chip-bg: rgba(255, 255, 255, 0.04);
  --color-upload-action-bg: #1f1f1f;
  --color-upload-action-border: rgba(255, 255, 255, 0.08);
  --color-composer-hover-border: rgba(255, 255, 255, 0.14);
  --color-border-primary: rgba(255, 255, 255, 0.08);
  --color-border-soft: rgba(255, 255, 255, 0.06);
  --color-chip-border: rgba(255, 255, 255, 0.08);
  --color-text-primary: #f9fafb;
  --color-text-secondary: #9ca3af;
  --shadow-composer-shell: none;
  --shadow-composer-hover: none;
  --shadow-composer-tile: none;
}

.theme-dark .creative-composer-host .creative-sdk-composer:hover,
.creative-composer-host .creative-sdk-composer[data-theme='dark']:hover {
  border-color: rgba(255, 255, 255, 0.14);
  box-shadow: none;
}
</style>
