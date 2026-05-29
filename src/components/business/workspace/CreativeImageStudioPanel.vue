<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { NTag } from 'naive-ui'

import PreloadImage from '@/components/common/PreloadImage.vue'
import {
  creativeImageAspectRatios,
  creativeImageDefaultPreview,
  creativeImagePromptMaxLength,
} from '@/constants/creative-image-studio'
import type { WorkspaceCapability, WorkspaceGenerateResult } from '@/types/workspace'

const props = defineProps<{
  capability: WorkspaceCapability
  isGenerating?: boolean
  generationResult?: WorkspaceGenerateResult | null
  caption?: string | null
}>()

const emit = defineEmits<{
  generate: [payload: { prompt: string; outputRatio: string }]
}>()

const prompt = ref('')
const selectedRatio = ref(creativeImageAspectRatios[0].value)

const activeRatio = computed(
  () =>
    creativeImageAspectRatios.find((item) => item.value === selectedRatio.value) ??
    creativeImageAspectRatios[0],
)

const previewImage = computed(
  () => props.generationResult?.previewImage ?? creativeImageDefaultPreview.image,
)

const previewCaption = computed(
  () =>
    props.caption ??
    props.generationResult?.caption ??
    creativeImageDefaultPreview.caption,
)

const ratioMetaLabel = computed(() => {
  if (props.generationResult?.ratioLabel) return props.generationResult.ratioLabel
  return `${activeRatio.value.label} · ${activeRatio.value.resolution}`
})

const promptLength = computed(() => prompt.value.length)

const canSubmit = computed(
  () => prompt.value.trim().length > 0 && !props.isGenerating,
)

watch(
  () => props.generationResult,
  (result) => {
    if (!result?.ratioLabel) return
    const matched = creativeImageAspectRatios.find((item) =>
      result.ratioLabel.includes(item.value),
    )
    if (matched) selectedRatio.value = matched.value
  },
)

function handleSubmit() {
  if (!canSubmit.value) return

  emit('generate', {
    prompt: prompt.value.trim(),
    outputRatio: `${activeRatio.value.label} · ${activeRatio.value.resolution}`,
  })
}

function handlePromptKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault()
    handleSubmit()
  }
}
</script>

<template>
  <section class="creative-studio" aria-label="GPT Image Studio 创意生图">
    <div class="creative-studio-preview">
      <header class="creative-studio-preview-head">
        <div class="creative-studio-brand">
          <span class="creative-studio-brand-kicker">GPT Image Studio</span>
          <h2>生成结果预览</h2>
        </div>
        <div class="creative-studio-preview-meta">
          <span class="creative-studio-ratio">{{ ratioMetaLabel }}</span>
          <NTag size="small" round :bordered="false" type="warning">Beta</NTag>
        </div>
      </header>

      <div
        class="creative-studio-canvas"
        :class="{ 'is-generating': isGenerating }"
        aria-label="生成结果展示"
      >
        <PreloadImage
          class="creative-studio-image"
          :src="previewImage"
          alt="创意生图预览"
          loading="eager"
          decoding="async"
          fit="contain"
        />

        <div v-if="isGenerating" class="creative-studio-loading" aria-live="polite">
          <span class="creative-studio-loading-ring" aria-hidden="true"></span>
          <p>正在生成创意图...</p>
        </div>
      </div>

      <p class="creative-studio-caption">{{ previewCaption }}</p>
    </div>

    <div class="creative-studio-compose">
      <header class="creative-studio-compose-head">
        <Icon icon="mdi:pencil-outline" aria-hidden="true" />
        <span>请输入您想生成的图片</span>
      </header>

      <div class="creative-studio-input-shell">
        <textarea
          v-model="prompt"
          class="creative-studio-input"
          :maxlength="creativeImagePromptMaxLength"
          placeholder="输入您的灵感..."
          rows="4"
          @keydown="handlePromptKeydown"
        />

        <footer class="creative-studio-input-foot">
          <div class="creative-studio-ratio-group" role="group" aria-label="输出比例">
            <button
              v-for="item in creativeImageAspectRatios"
              :key="item.value"
              type="button"
              class="creative-studio-ratio-btn"
              :class="{ active: selectedRatio === item.value }"
              :aria-pressed="selectedRatio === item.value"
              :disabled="isGenerating"
              @click="selectedRatio = item.value"
            >
              <strong>{{ item.label }}</strong>
              <span>{{ item.resolution }}</span>
            </button>
          </div>

          <div class="creative-studio-input-actions">
            <span class="creative-studio-counter">
              {{ promptLength }}/{{ creativeImagePromptMaxLength }}
            </span>
            <button
              type="button"
              class="creative-studio-submit"
              :disabled="!canSubmit"
              :aria-label="`生成创意图，消耗 ${capability.cost} 积分`"
              @click="handleSubmit"
            >
              <Icon
                :icon="isGenerating ? 'mdi:loading' : 'mdi:arrow-up'"
                :class="{ 'is-spinning': isGenerating }"
              />
            </button>
          </div>
        </footer>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.creative-studio {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 18px;
}

.creative-studio-preview,
.creative-studio-compose {
  border: 1px solid var(--workspace-line, rgba(47, 35, 12, 0.12));
  border-radius: 16px;
  background: color-mix(in srgb, var(--workspace-panel, #fcfaf5) 92%, white);
  box-shadow: var(--workspace-shadow, 0 14px 34px rgba(67, 47, 16, 0.08));
}

.creative-studio-preview {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 14px;
  padding: 20px 22px 18px;
}

.creative-studio-preview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.creative-studio-brand {
  min-width: 0;
}

.creative-studio-brand-kicker {
  display: block;
  color: var(--workspace-accent-strong, #a86d00);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.04em;
}

.creative-studio-brand h2 {
  margin: 6px 0 0;
  color: var(--app-text);
  font-size: clamp(22px, 2vw, 30px);
  font-weight: 950;
  line-height: 1.2;
}

.creative-studio-preview-meta {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 10px;
}

.creative-studio-ratio {
  color: var(--app-text-soft);
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
}

.creative-studio-canvas {
  position: relative;
  display: flex;
  min-height: clamp(240px, 42vh, 520px);
  flex: 1;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--workspace-accent, #c98600) 16%, var(--app-border));
  border-radius: 14px;
  background:
    radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--workspace-accent, #c98600) 8%, transparent), transparent 42%),
    color-mix(in srgb, var(--workspace-panel-soft, #f5efe4) 88%, white);
}

.creative-studio-image {
  width: 100%;
  height: 100%;
  max-height: min(52vh, 520px);
}

.creative-studio-canvas.is-generating .creative-studio-image {
  opacity: 0.42;
  filter: blur(1px);
}

.creative-studio-loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 12px;
  background: color-mix(in srgb, var(--workspace-panel, #fcfaf5) 24%, transparent);
}

.creative-studio-loading-ring {
  width: 42px;
  height: 42px;
  border: 3px solid color-mix(in srgb, var(--workspace-accent, #c98600) 24%, transparent);
  border-top-color: var(--workspace-accent, #c98600);
  border-radius: 999px;
  animation: creative-spin 0.9s linear infinite;
}

.creative-studio-loading p {
  margin: 0;
  color: var(--workspace-accent-strong, #a86d00);
  font-size: 14px;
  font-weight: 900;
}

.creative-studio-caption {
  margin: 0;
  color: var(--app-text-soft);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.75;
}

.creative-studio-compose {
  flex-shrink: 0;
  padding: 16px 18px 18px;
}

.creative-studio-compose-head {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: var(--app-text);
  font-size: 15px;
  font-weight: 900;
}

.creative-studio-compose-head .iconify {
  color: var(--workspace-accent-strong, #a86d00);
  font-size: 18px;
}

.creative-studio-input-shell {
  display: grid;
  gap: 12px;
  padding: 14px 14px 12px;
  border: 1px solid color-mix(in srgb, var(--workspace-accent, #c98600) 22%, var(--app-border));
  border-radius: 14px;
  background: color-mix(in srgb, var(--workspace-panel-soft, #f5efe4) 72%, white);
}

.creative-studio-input {
  width: 100%;
  min-height: 108px;
  border: 0;
  background: transparent;
  color: var(--app-text);
  padding: 0;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.7;
  resize: vertical;
  outline: none;
}

.creative-studio-input::placeholder {
  color: color-mix(in srgb, var(--app-text-soft) 72%, transparent);
}

.creative-studio-input-foot {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.creative-studio-ratio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.creative-studio-ratio-btn {
  display: grid;
  gap: 2px;
  min-width: 88px;
  border: 1px solid color-mix(in srgb, var(--workspace-accent, #c98600) 18%, var(--app-border));
  border-radius: 10px;
  background: color-mix(in srgb, var(--workspace-panel, #fcfaf5) 90%, white);
  color: var(--app-text-soft);
  padding: 8px 10px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.creative-studio-ratio-btn strong {
  color: var(--app-text);
  font-size: 13px;
  font-weight: 900;
  line-height: 1.2;
}

.creative-studio-ratio-btn span {
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
}

.creative-studio-ratio-btn:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--workspace-accent, #c98600) 42%, var(--app-border));
  transform: translateY(-1px);
}

.creative-studio-ratio-btn.active {
  border-color: var(--workspace-accent, #c98600);
  background: color-mix(in srgb, var(--workspace-accent, #c98600) 12%, white);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--workspace-accent, #c98600) 14%, transparent);
}

.creative-studio-ratio-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.creative-studio-input-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 12px;
}

.creative-studio-counter {
  color: var(--app-text-soft);
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.creative-studio-submit {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(180deg, #efc24c, #d9a82e);
  color: #2a1c05;
  font-size: 22px;
  cursor: pointer;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--workspace-accent, #c98600) 28%, transparent);
  transition:
    transform 0.16s ease,
    filter 0.16s ease,
    opacity 0.16s ease;
}

.creative-studio-submit:hover:not(:disabled) {
  filter: brightness(1.04);
  transform: translateY(-1px);
}

.creative-studio-submit:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  box-shadow: none;
}

.creative-studio-submit .iconify.is-spinning {
  animation: creative-spin 0.9s linear infinite;
}

@keyframes creative-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .creative-studio-preview-head {
    flex-direction: column;
  }

  .creative-studio-input-foot {
    flex-direction: column;
    align-items: stretch;
  }

  .creative-studio-input-actions {
    justify-content: space-between;
  }
}

:global([data-theme='dark']) .creative-studio-preview,
:global([data-theme='dark']) .creative-studio-compose {
  background: color-mix(in srgb, var(--workspace-panel, #151515) 94%, #0d0d0d);
}

:global([data-theme='dark']) .creative-studio-canvas {
  background:
    radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--workspace-accent, #efc24c) 10%, transparent), transparent 42%),
    color-mix(in srgb, var(--workspace-panel-soft, #101010) 90%, #080808);
}

:global([data-theme='dark']) .creative-studio-input-shell {
  background: color-mix(in srgb, var(--workspace-panel-soft, #151515) 88%, #0a0a0a);
}

:global([data-theme='dark']) .creative-studio-ratio-btn {
  background: color-mix(in srgb, var(--workspace-panel-soft, #151515) 92%, #0a0a0a);
}
</style>
