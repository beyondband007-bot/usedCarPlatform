<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'

import PreloadImage from '@/components/common/PreloadImage.vue'
import {
  creativeImageAspectRatios,
  creativeImageDefaultPreview,
  creativeImagePromptMaxLength,
} from '@/constants/creative-image-studio'
import type { WorkspaceCapability, WorkspaceGenerateResult } from '@/types/workspace'
import { useAppStore } from '@/stores/app'
import type { CreativeImageConversation, UploadedAsset } from '@/api/visual-workbench'

const appStore = useAppStore()

const props = defineProps<{
  capability: WorkspaceCapability
  isGenerating?: boolean
  isUploadingReference?: boolean
  generationResult?: WorkspaceGenerateResult | null
  caption?: string | null
  conversations?: CreativeImageConversation[]
  activeConversationId?: string | null
  referenceAsset?: UploadedAsset | null
}>()

const emit = defineEmits<{
  generate: [payload: {
    prompt: string
    outputRatio: string
    resolution?: string
    referenceAssetId?: string
    useLastReference?: boolean
    sourceTaskId?: string
    sourceImageUrl?: string
  }]
  newConversation: []
  selectConversation: [conversationId: string]
  uploadReference: [file: File]
}>()

const prompt = ref('')
const selectedRatio = ref(creativeImageAspectRatios[0].value)
const lastSubmittedPrompt = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

const activeRatio = computed(
  () =>
    creativeImageAspectRatios.find((item) => item.value === selectedRatio.value) ??
    creativeImageAspectRatios[0],
)

const promptLength = computed(() => prompt.value.length)
const canSubmit = computed(() => prompt.value.trim().length > 0 && !props.isGenerating)
const hasResult = computed(() => Boolean(props.generationResult?.previewImage))
const hasConversation = computed(() => props.isGenerating || hasResult.value)

const displayPrompt = computed(
  () =>
    props.caption ??
    props.generationResult?.caption ??
    lastSubmittedPrompt.value ??
    '生成一张具有高级汽车广告质感的创意图片',
)

const ratioMetaLabel = computed(() => {
  if (props.generationResult?.ratioLabel) return props.generationResult.ratioLabel
  return `${activeRatio.value.label} · ${activeRatio.value.resolution}`
})

const resultCards = computed(() => {
  const captions = ['主视觉', '细节版', '海报版', '社媒版']
  const images = props.generationResult?.resultImages?.length
    ? props.generationResult.resultImages.map((item) => item.url)
    : [props.generationResult?.previewImage ?? creativeImageDefaultPreview.image]

  return images.map((image, index) => ({
    id: `${captions[index] ?? '结果'}-${index}`,
    title: captions[index] ?? `结果 ${index + 1}`,
    image,
  }))
})

const recentConversations = computed(() => props.conversations ?? [])
const referencePreview = computed(() => props.referenceAsset?.url ?? null)

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
  const text = prompt.value.trim()
  if (!text || props.isGenerating) return

  lastSubmittedPrompt.value = text
  emit('generate', {
    prompt: text,
    outputRatio: activeRatio.value.value,
    resolution: '2K',
    referenceAssetId: props.referenceAsset?.assetId,
    useLastReference: Boolean(props.referenceAsset?.assetId),
  })
}

function handlePromptKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault()
    handleSubmit()
  }
}

function applyPromptSuggestion(text: string) {
  prompt.value = text
}

function openReferencePicker() {
  if (props.isUploadingReference || props.isGenerating) return
  fileInputRef.value?.click()
}

function handleReferenceSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  emit('uploadReference', file)
}

function handleReviseResult(imageUrl?: string) {
  const sourceTaskId = props.generationResult?.taskId
  const sourceImageUrl = imageUrl ?? props.generationResult?.previewImage
  if (!sourceTaskId || !sourceImageUrl || props.isGenerating) return

  const text = prompt.value.trim() || '继续优化这张图，保持主体一致，提升真实感和地面反射'
  lastSubmittedPrompt.value = text
  emit('generate', {
    prompt: text,
    outputRatio: activeRatio.value.value,
    resolution: '2K',
    sourceTaskId,
    sourceImageUrl,
  })
}
</script>

<template>
  <section
    class="creative-app"
    :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'"
    aria-label="创意生图工作台"
  >
    <aside class="creative-sidebar" aria-label="创意生图会话">
      <header class="creative-sidebar-head">
        <strong>开启创作</strong>
        <button type="button" aria-label="折叠会话栏">
          <Icon icon="mdi:dock-left" />
        </button>
      </header>

      <button type="button" class="creative-new-chat" @click="emit('newConversation')">
        <Icon icon="mdi:pencil-outline" />
        新对话
      </button>

      <section class="creative-recent">
        <p>最近</p>
        <button
          v-for="conversation in recentConversations"
          :key="conversation.conversationId"
          type="button"
          class="creative-recent-item"
          :class="{ active: conversation.conversationId === props.activeConversationId }"
          @click="emit('selectConversation', conversation.conversationId)"
        >
          <span class="creative-recent-thumb">
            <PreloadImage
              :src="props.generationResult?.previewImage ?? creativeImageDefaultPreview.image"
              :alt="conversation.title"
              fit="cover"
            />
          </span>
          <span>{{ conversation.title }}</span>
          <Icon icon="mdi:dots-horizontal" />
        </button>
      </section>

      <footer class="creative-sidebar-foot">
        <span class="creative-credit">
          <Icon icon="mdi:star-four-points" />
          {{ props.capability.balance }} 积分
        </span>
      </footer>
    </aside>

    <main class="creative-main">
      <header class="creative-toolbar">
        <div class="creative-search">
          <Icon icon="mdi:magnify" />
          <span></span>
          <button type="button">时间 <Icon icon="mdi:chevron-down" /></button>
          <button type="button">生成模式 <Icon icon="mdi:chevron-down" /></button>
          <button type="button">操作类型 <Icon icon="mdi:chevron-down" /></button>
          <button type="button" class="creative-assets">
            <Icon icon="mdi:folder-outline" />
            资产库
          </button>
        </div>
      </header>

      <section v-if="!hasConversation" class="creative-empty-state">
        <h1>你好，想创作什么?</h1>
        <div class="creative-suggestion-row">
          <button
            type="button"
            @click="applyPromptSuggestion('生成一张汽车电商主图，白色 SUV 停在现代展厅内，干净背景，高级广告光影')"
          >
            汽车电商主图
          </button>
          <button
            type="button"
            @click="applyPromptSuggestion('为二手车生成一张暗调豪华展厅海报，车辆居中，电影级灯光，背景克制')"
          >
            暗调展厅海报
          </button>
          <button
            type="button"
            @click="applyPromptSuggestion('生成一张户外道路动态汽车图，强烈速度感，适合社媒投放')"
          >
            道路动态广告
          </button>
        </div>
      </section>

      <section v-else class="creative-thread" aria-live="polite">
        <header class="creative-day-head">
          <h1>{{ hasResult ? '今天' : '正在创作' }}</h1>
          <button type="button">{{ displayPrompt || '生成一张汽车创意图' }}</button>
        </header>

        <div v-if="props.isGenerating" class="creative-thinking">
          <span aria-hidden="true"></span>
          <strong>认真思考中...</strong>
        </div>

        <article v-if="hasResult && props.generationResult" class="creative-result-card">
          <p class="creative-result-status">已完成 <Icon icon="mdi:chevron-right" /></p>
          <h2>
            已提交生成创意图片，输出 {{ ratioMetaLabel }}，提示词：{{ displayPrompt }}
          </h2>

          <div class="creative-result-grid">
            <button
              v-for="item in resultCards"
              :key="item.id"
              type="button"
              class="creative-result-image"
            >
              <PreloadImage :src="item.image" :alt="item.title" fit="cover" />
              <span>AI 生成</span>
            </button>
          </div>

          <p class="creative-result-meta">
            以上内容由 AI 生成 · 本次消耗 {{ props.capability.cost }} 积分
          </p>

          <div class="creative-result-actions">
            <button type="button" @click="handleSubmit">
              <Icon icon="mdi:reload" />
              重新生成
            </button>
            <button type="button" @click="handleReviseResult()">
              <Icon icon="mdi:image-sync-outline" />
              修改这张图
            </button>
            <button type="button" aria-label="引用提示词">
              <Icon icon="mdi:format-quote-close" />
            </button>
            <button type="button" aria-label="更多操作">
              <Icon icon="mdi:dots-horizontal" />
            </button>
          </div>
        </article>
      </section>

      <section class="creative-composer" aria-label="创意输入">
        <div class="creative-composer-input">
          <button
            type="button"
            class="creative-upload"
            aria-label="上传参考图"
            @click="openReferencePicker"
          >
            <Icon icon="mdi:plus" />
          </button>
          <input
            ref="fileInputRef"
            class="creative-hidden-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            @change="handleReferenceSelected"
          />
          <textarea
            v-model="prompt"
            :maxlength="creativeImagePromptMaxLength"
            placeholder="输入想法、脚本或上传参考，支持 “/” 使用技能，@ 添加主体，和 Agent 一起创作"
            rows="3"
            @keydown="handlePromptKeydown"
          />
        </div>

        <footer class="creative-composer-foot">
          <div class="creative-mode-row">
            <button type="button" class="is-accent">
              <Icon icon="mdi:waves" />
              Agent 模式
              <Icon icon="mdi:chevron-down" />
            </button>
            <button type="button">
              <Icon icon="mdi:tune-variant" />
              自动
            </button>
            <button type="button">
              <Icon icon="mdi:wrench-outline" />
              使用技能
            </button>
            <button type="button">
              <Icon icon="mdi:at" />
            </button>
          </div>

          <div class="creative-submit-row">
            <span v-if="referencePreview" class="creative-reference-pill">
              已选参考图
            </span>
            <div class="creative-ratio-group" role="group" aria-label="输出比例">
              <button
                v-for="item in creativeImageAspectRatios"
                :key="item.value"
                type="button"
                :class="{ active: selectedRatio === item.value }"
                :disabled="props.isGenerating"
                @click="selectedRatio = item.value"
              >
                <strong>{{ item.label }}</strong>
                <span>{{ item.resolution }}</span>
              </button>
            </div>
            <span>{{ promptLength }}/{{ creativeImagePromptMaxLength }}</span>
            <button
              type="button"
              class="creative-submit"
              :disabled="!canSubmit"
              :aria-label="`生成创意图，消耗 ${props.capability.cost} 积分`"
              @click="handleSubmit"
            >
              <Icon :icon="props.isGenerating ? 'mdi:stop' : 'mdi:arrow-up'" />
            </button>
          </div>
        </footer>
      </section>
    </main>
  </section>
</template>

<style scoped lang="scss">
.creative-app {
  --creative-bg: #101114;
  --creative-sidebar-bg: #15171c;
  --creative-main-bg: #101114;
  --creative-text: #f4f7fb;
  --creative-text-soft: #c6cbd5;
  --creative-muted: #777e8d;
  --creative-line: rgba(255, 255, 255, 0.07);
  --creative-surface: #242731;
  --creative-surface-soft: #20232b;
  --creative-surface-elevated: #1c1f27;
  --creative-composer-bg: #1d2028;
  --creative-upload-bg: #2a2d37;
  --creative-icon: #dce3ee;
  --creative-accent: #00d6ff;
  --creative-accent-border: rgba(0, 214, 255, 0.18);
  --creative-ratio-active-border: rgba(239, 194, 76, 0.85);
  --creative-ratio-active-bg: rgba(239, 194, 76, 0.12);
  --creative-ratio-active-text: #f4c64a;
  --creative-submit-bg: #f4f7fb;
  --creative-submit-text: #101114;
  --creative-submit-disabled-bg: #3b414d;
  --creative-submit-disabled-text: #737b89;
  --creative-composer-shadow: 0 24px 70px rgba(0, 0, 0, 0.28);
  --creative-main-glow: radial-gradient(circle at 54% 42%, rgba(255, 255, 255, 0.035), transparent 30%);

  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: 280px minmax(0, 1fr);
  overflow: hidden;
  background: var(--creative-bg);
  color: var(--creative-text);
}

.creative-app.theme-light {
  --creative-bg: #fcfaf5;
  --creative-sidebar-bg: #f5efe4;
  --creative-main-bg: #fcfaf5;
  --creative-text: #1f1a14;
  --creative-text-soft: #5c5346;
  --creative-muted: #8a8072;
  --creative-line: rgba(47, 35, 12, 0.1);
  --creative-surface: #eee6da;
  --creative-surface-soft: #f8f4ec;
  --creative-surface-elevated: #ffffff;
  --creative-composer-bg: #ffffff;
  --creative-upload-bg: #f0e8dc;
  --creative-icon: #5c5346;
  --creative-accent: #0a8fb8;
  --creative-accent-border: rgba(10, 143, 184, 0.22);
  --creative-ratio-active-border: rgba(201, 134, 0, 0.55);
  --creative-ratio-active-bg: rgba(201, 134, 0, 0.1);
  --creative-ratio-active-text: #a86d00;
  --creative-submit-bg: #1f1a14;
  --creative-submit-text: #fcfaf5;
  --creative-submit-disabled-bg: #d8d0c4;
  --creative-submit-disabled-text: #8a8072;
  --creative-composer-shadow: 0 18px 48px rgba(67, 47, 16, 0.1);
  --creative-main-glow: radial-gradient(circle at 54% 42%, rgba(201, 134, 0, 0.05), transparent 32%);
}

.creative-sidebar {
  display: grid;
  min-height: 0;
  grid-template-rows: auto auto 1fr auto;
  gap: 22px;
  border-right: 1px solid var(--creative-line);
  background: var(--creative-sidebar-bg);
  padding: 24px 22px;
}

.creative-sidebar-head,
.creative-toolbar,
.creative-composer-foot,
.creative-submit-row,
.creative-mode-row,
.creative-result-actions,
.creative-day-head {
  display: flex;
  align-items: center;
}

.creative-sidebar-head {
  justify-content: space-between;
}

.creative-sidebar-head strong {
  font-size: 20px;
  font-weight: 800;
}

.creative-sidebar button,
.creative-toolbar button,
.creative-composer button,
.creative-result-actions button,
.creative-day-head button,
.creative-suggestion-row button,
.creative-result-image {
  border: 0;
  font-family: inherit;
  cursor: pointer;
}

.creative-sidebar-head button {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: transparent;
  color: var(--creative-icon);
  font-size: 18px;
}

.creative-new-chat {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 52px;
  border-radius: 10px;
  background: var(--creative-surface);
  color: var(--creative-text);
  padding: 0 14px;
  font-size: 16px;
  font-weight: 800;
  text-align: left;
}

.creative-new-chat .iconify {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 9px;
  background: color-mix(in srgb, var(--creative-text) 6%, transparent);
  font-size: 22px;
}

.creative-recent {
  min-width: 0;
}

.creative-recent p {
  margin: 0 0 12px;
  color: var(--creative-muted);
  font-size: 14px;
  font-weight: 700;
}

.creative-recent-item {
  display: grid;
  width: 100%;
  min-width: 0;
  grid-template-columns: 42px minmax(0, 1fr) 24px;
  align-items: center;
  gap: 12px;
  border-radius: 10px;
  background: var(--creative-surface);
  color: var(--creative-text);
  padding: 8px;
  text-align: left;
}

.creative-recent-thumb {
  overflow: hidden;
  width: 42px;
  height: 42px;
  border-radius: 8px;
}

.creative-recent-item > span:not(.creative-recent-thumb) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 800;
}

.creative-recent-item > .iconify {
  color: var(--creative-muted);
}

.creative-recent-item.active {
  outline: 2px solid var(--creative-accent-border);
  background: var(--creative-surface-soft);
}

.creative-sidebar-foot {
  display: flex;
  align-items: end;
}

.creative-credit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  border: 1px solid var(--creative-accent-border);
  border-radius: 10px;
  color: var(--creative-accent);
  padding: 0 12px;
  font-size: 13px;
  font-weight: 900;
}

.creative-main {
  position: relative;
  display: grid;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
  background: var(--creative-main-glow), var(--creative-main-bg);
}

.creative-toolbar {
  justify-content: flex-end;
  min-height: 78px;
  padding: 16px 28px 0;
}

.creative-search {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  min-height: 48px;
  border: 1px solid var(--creative-line);
  border-radius: 12px;
  background: var(--creative-surface-elevated);
  padding: 0 14px;
  color: var(--creative-text);
}

.creative-search > span {
  width: 1px;
  height: 20px;
  background: var(--creative-line);
}

.creative-search button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  color: var(--creative-text);
  font-size: 14px;
  font-weight: 800;
}

.creative-assets {
  border-left: 1px solid var(--creative-line) !important;
  padding-left: 14px;
}

.creative-empty-state,
.creative-thread {
  min-height: 0;
  overflow: auto;
}

.creative-empty-state {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 34px;
  padding: 40px 32px 24px;
}

.creative-empty-state h1 {
  margin: 0;
  font-size: clamp(26px, 3vw, 38px);
  font-weight: 950;
  letter-spacing: 0;
}

.creative-suggestion-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.creative-suggestion-row button {
  min-height: 36px;
  border: 1px solid var(--creative-line);
  border-radius: 999px;
  background: color-mix(in srgb, var(--creative-text) 4%, transparent);
  color: var(--creative-text-soft);
  padding: 0 14px;
  font-size: 13px;
  font-weight: 800;
}

.creative-thread {
  padding: 0 clamp(40px, 7vw, 96px) 26px;
}

.creative-day-head {
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 38px;
}

.creative-day-head h1 {
  margin: 0;
  color: var(--creative-muted);
  font-size: 32px;
  font-weight: 950;
}

.creative-day-head button {
  max-width: 360px;
  border-radius: 18px;
  background: var(--creative-surface-soft);
  color: var(--creative-text);
  padding: 18px 24px;
  font-size: 17px;
  font-weight: 800;
}

.creative-thinking {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 120px;
  color: var(--creative-text);
}

.creative-thinking span {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 2px solid color-mix(in srgb, var(--creative-accent) 20%, transparent);
  border-top-color: var(--creative-accent);
  animation: creative-spin 0.9s linear infinite;
}

.creative-result-card {
  max-width: 1180px;
  margin: 0 auto;
}

.creative-result-status,
.creative-result-meta {
  margin: 0;
  color: var(--creative-muted);
  font-size: 15px;
  font-weight: 800;
}

.creative-result-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 28px;
}

.creative-result-card h2 {
  margin: 0 0 28px;
  max-width: 980px;
  color: var(--creative-text);
  font-size: 18px;
  font-weight: 800;
  line-height: 1.75;
}

.creative-result-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 2px;
  overflow: hidden;
  border-radius: 2px;
}

.creative-result-image {
  position: relative;
  display: block;
  min-width: 0;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: var(--creative-surface-soft);
  padding: 0;
}

.creative-result-image span {
  position: absolute;
  top: 10px;
  left: 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.24);
  color: rgba(255, 255, 255, 0.68);
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 800;
}

.creative-result-meta {
  margin-top: 26px;
}

.creative-result-actions {
  gap: 8px;
  margin-top: 24px;
}

.creative-result-actions button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  border-radius: 10px;
  background: var(--creative-surface-soft);
  color: var(--creative-text);
  padding: 0 16px;
  font-size: 14px;
  font-weight: 800;
}

.creative-composer {
  width: min(860px, calc(100% - 72px));
  justify-self: center;
  margin-bottom: 28px;
  border: 1px solid var(--creative-line);
  border-radius: 28px;
  background: var(--creative-composer-bg);
  padding: 20px 22px 22px;
  box-shadow: var(--creative-composer-shadow);
}

.creative-composer-input {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.creative-upload {
  display: grid;
  width: 62px;
  height: 84px;
  place-items: center;
  border-radius: 6px;
  background: var(--creative-upload-bg);
  color: var(--creative-muted);
  font-size: 24px;
  transform: rotate(-7deg);
}

.creative-hidden-input {
  display: none;
}

.creative-composer textarea {
  min-height: 94px;
  border: 0;
  background: transparent;
  color: var(--creative-text);
  padding: 8px 0 0;
  font: inherit;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.7;
  resize: none;
  outline: none;
}

.creative-composer textarea::placeholder {
  color: var(--creative-muted);
}

.creative-composer-foot {
  justify-content: space-between;
  gap: 14px;
  margin-top: 14px;
}

.creative-mode-row,
.creative-submit-row {
  gap: 8px;
}

.creative-mode-row button,
.creative-ratio-group button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 42px;
  border: 1px solid var(--creative-line);
  border-radius: 10px;
  background: transparent;
  color: var(--creative-text-soft);
  padding: 0 14px;
  font-size: 13px;
  font-weight: 900;
}

.creative-mode-row button.is-accent {
  color: var(--creative-accent);
}

.creative-ratio-group {
  display: flex;
  gap: 6px;
}

.creative-ratio-group button {
  display: grid;
  gap: 1px;
  min-width: 74px;
  padding: 7px 9px;
  text-align: left;
}

.creative-ratio-group button.active {
  border-color: var(--creative-ratio-active-border);
  background: var(--creative-ratio-active-bg);
  color: var(--creative-ratio-active-text);
}

.creative-ratio-group strong,
.creative-ratio-group span {
  line-height: 1.1;
}

.creative-ratio-group strong {
  font-size: 12px;
}

.creative-ratio-group span {
  color: var(--creative-muted);
  font-size: 10px;
}

.creative-submit-row > span {
  color: var(--creative-muted);
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.creative-reference-pill {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  border: 1px solid var(--creative-accent-border);
  border-radius: 999px;
  color: var(--creative-accent) !important;
  padding: 0 10px;
}

.creative-submit {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 999px;
  background: var(--creative-submit-bg);
  color: var(--creative-submit-text);
  font-size: 22px;
}

.creative-submit:disabled {
  background: var(--creative-submit-disabled-bg);
  color: var(--creative-submit-disabled-text);
  cursor: not-allowed;
}

@keyframes creative-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1200px) {
  .creative-app {
    grid-template-columns: 240px minmax(0, 1fr);
  }

  .creative-result-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .creative-composer-foot {
    align-items: stretch;
    flex-direction: column;
  }

  .creative-submit-row {
    justify-content: space-between;
  }
}

@media (max-width: 860px) {
  .creative-app {
    grid-template-columns: minmax(0, 1fr);
  }

  .creative-sidebar {
    display: none;
  }

  .creative-toolbar {
    justify-content: flex-start;
    overflow-x: auto;
  }

  .creative-search {
    min-width: max-content;
  }

  .creative-composer {
    width: calc(100% - 28px);
  }
}
</style>
