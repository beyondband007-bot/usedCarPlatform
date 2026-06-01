<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { NInput, NSelect } from 'naive-ui'

import PreloadImage from '@/components/common/PreloadImage.vue'
import {
  creativeImageAspectRatios,
  creativeImageDefaultPreview,
  creativeImagePromptMaxLength,
} from '@/constants/creative-image-studio'
import type { CreativeThreadTurn, WorkspaceCapability, WorkspaceGenerateResult } from '@/types/workspace'
import { useAppStore } from '@/stores/app'
import type { CreativeImageConversation, UploadedAsset } from '@/api/visual-workbench'
import { downloadFile } from '@/utils/download'

const CREATIVE_DOWNLOAD_FILENAME = '汽车图片.jpg'

const appStore = useAppStore()

const props = defineProps<{
  capability: WorkspaceCapability
  isGenerating?: boolean
  isUploadingReference?: boolean
  generationResult?: WorkspaceGenerateResult | null
  caption?: string | null
  conversations?: CreativeImageConversation[]
  threadTurns?: CreativeThreadTurn[]
  isLoadingConversation?: boolean
  activeConversationId?: string | null
  isNewConversationDisabled?: boolean
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
  removeReference: []
}>()

const prompt = ref('')
const selectedRatio = ref(creativeImageAspectRatios[0].value)
const lastSubmittedPrompt = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const threadScrollRef = ref<HTMLElement | null>(null)
const sidebarCollapsed = ref(false)
const previewModalVisible = ref(false)
const previewImageUrl = ref('')
const editingReference = ref<{
  prompt: string
  taskId?: string | null
  resultUrl: string
} | null>(null)

const activeRatio = computed(
  () =>
    creativeImageAspectRatios.find((item) => item.value === selectedRatio.value) ??
    creativeImageAspectRatios[0],
)

const promptLength = computed(() => prompt.value.length)
const canSubmit = computed(() => prompt.value.trim().length > 0 && !props.isGenerating)

const activeConversation = computed(() =>
  props.conversations?.find((item) => item.conversationId === props.activeConversationId) ?? null,
)

const primaryResultImage = computed(
  () =>
    props.generationResult?.previewImage ??
    activeConversation.value?.lastResultUrl ??
    '',
)

const hasResult = computed(() => Boolean(primaryResultImage.value))
const hasHistoryContext = computed(
  () =>
    Boolean(
      props.activeConversationId &&
        (props.threadTurns?.length ||
          props.caption ||
          activeConversation.value?.lastMessage ||
          activeConversation.value?.lastTaskId),
    ),
)
const pendingTurns = ref<CreativeThreadTurn[]>([])
const hasConversation = computed(
  () =>
    props.isGenerating ||
    hasResult.value ||
    hasHistoryContext.value ||
    pendingTurns.value.length > 0,
)

const displayPrompt = computed(
  () =>
    props.caption ??
    props.generationResult?.caption ??
    lastSubmittedPrompt.value ??
    '',
)

const creativeImageAspectRatioOptions = computed(() =>
  creativeImageAspectRatios.map((item) => ({
    label: item.label,
    value: item.value,
  })),
)

const ratioMetaLabel = computed(() => {
  if (props.generationResult?.ratioLabel) return props.generationResult.ratioLabel
  return activeRatio.value.label
})

const threadItems = computed<CreativeThreadTurn[]>(() => {
  let base: CreativeThreadTurn[] = []
  if (props.threadTurns?.length) {
    base = props.threadTurns
  } else if (hasHistoryContext.value || hasResult.value) {
    base = [
      {
        id: 'current',
        prompt: displayPrompt.value,
        resultUrl: primaryResultImage.value || null,
        ratioLabel: ratioMetaLabel.value,
        taskId: props.generationResult?.taskId ?? null,
        isGenerating: props.isGenerating,
      },
    ]
  }
  return [...base, ...pendingTurns.value]
})

function findChainSource(beforeTurnId?: string): CreativeThreadTurn | null {
  const items = threadItems.value
  const endIdx =
    beforeTurnId !== undefined
      ? items.findIndex((t) => t.id === beforeTurnId)
      : items.length
  const limit = endIdx >= 0 ? endIdx : items.length
  for (let i = limit - 1; i >= 0; i--) {
    const turn = items[i]
    if (turn.taskId && turn.resultUrl) return turn
  }
  return null
}

const recentConversations = computed(() => props.conversations ?? [])

const pendingReferenceObjectUrl = ref<string | null>(null)
const pendingReferencePreview = ref<string | null>(null)

function clearPendingReferencePreview() {
  if (pendingReferenceObjectUrl.value) {
    URL.revokeObjectURL(pendingReferenceObjectUrl.value)
    pendingReferenceObjectUrl.value = null
  }
  pendingReferencePreview.value = null
}

const referencePreview = computed(
  () => editingReference.value?.resultUrl ?? props.referenceAsset?.url ?? pendingReferencePreview.value,
)

const isReferenceUploading = computed(
  () => Boolean(props.isUploadingReference) && !props.referenceAsset?.url,
)

watch(
  () => props.referenceAsset?.url,
  (url) => {
    if (url) clearPendingReferencePreview()
  },
)

onUnmounted(() => {
  clearPendingReferencePreview()
})

function resolveConversationTitle(conversation: CreativeImageConversation) {
  return conversation.title?.trim() || '创意生图对话'
}

function resolveConversationThumb(conversation: CreativeImageConversation) {
  if (
    conversation.conversationId === props.activeConversationId &&
    props.generationResult?.previewImage
  ) {
    return props.generationResult.previewImage
  }
  return conversation.lastResultUrl ?? creativeImageDefaultPreview.image
}

watch(
  () => props.activeConversationId,
  () => {
    prompt.value = ''
    lastSubmittedPrompt.value = ''
    pendingTurns.value = []
    editingReference.value = null
    threadScrollRef.value?.scrollTo({ top: 0 })
  },
)

watch(
  () => props.threadTurns?.length ?? 0,
  (newCount, oldCount) => {
    if (newCount > (oldCount ?? 0)) {
      pendingTurns.value = []
      scrollThreadToBottom()
    }
  },
)

function scrollThreadToBottom() {
  void nextTick().then(() => {
    const el = threadScrollRef.value
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  })
}

function pushPendingTurn(text: string) {
  pendingTurns.value = [
    ...pendingTurns.value,
    {
      id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      prompt: text,
      taskId: null,
      resultUrl: null,
      ratioLabel: `${activeRatio.value.value} · 2K`,
      isGenerating: true,
    },
  ]
  scrollThreadToBottom()
}

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
  if (!text || props.isGenerating || pendingTurns.value.length > 0) return

  lastSubmittedPrompt.value = text
  prompt.value = ''
  const editSource = editingReference.value
  const chain = editSource ? null : findChainSource()
  editingReference.value = null
  pushPendingTurn(text)
  emit('generate', {
    prompt: text,
    outputRatio: activeRatio.value.value,
    resolution: '2K',
    referenceAssetId: chain || editSource ? undefined : props.referenceAsset?.assetId,
    useLastReference: chain || editSource ? false : Boolean(props.referenceAsset?.assetId),
    sourceTaskId: editSource?.taskId ?? chain?.taskId ?? undefined,
    sourceImageUrl: editSource?.resultUrl ?? chain?.resultUrl ?? undefined,
  })
}

function handleRegenerateTurn(turn: CreativeThreadTurn) {
  const text = turn.prompt.trim()
  if (!text || props.isGenerating || pendingTurns.value.length > 0) return

  lastSubmittedPrompt.value = text
  prompt.value = ''
  const chain = findChainSource(turn.id)
  pushPendingTurn(text)
  emit('generate', {
    prompt: text,
    outputRatio: activeRatio.value.value,
    resolution: '2K',
    referenceAssetId: chain ? undefined : props.referenceAsset?.assetId,
    useLastReference: chain ? false : Boolean(props.referenceAsset?.assetId),
    sourceTaskId: chain?.taskId ?? undefined,
    sourceImageUrl: chain?.resultUrl ?? undefined,
  })
}

function handleEditTurn(turn: CreativeThreadTurn) {
  const text = turn.prompt.trim()
  if (!text || !turn.resultUrl || props.isGenerating || pendingTurns.value.length > 0) return

  clearPendingReferencePreview()
  editingReference.value = {
    prompt: text,
    taskId: turn.taskId,
    resultUrl: turn.resultUrl,
  }
  prompt.value = text
}

function resolveTurnRatioLabel(turn: CreativeThreadTurn) {
  return turn.ratioLabel || ratioMetaLabel.value
}

function shouldShowResultCard(turn: CreativeThreadTurn) {
  return Boolean(turn.resultUrl || turn.taskId || turn.isLoadingImage)
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

  editingReference.value = null
  clearPendingReferencePreview()
  const objectUrl = URL.createObjectURL(file)
  pendingReferenceObjectUrl.value = objectUrl
  pendingReferencePreview.value = objectUrl

  emit('uploadReference', file)
}

function handleRemoveReference() {
  if (editingReference.value) {
    editingReference.value = null
    return
  }

  clearPendingReferencePreview()
  emit('removeReference')
}

function openImagePreview(imageUrl?: string | null) {
  const url = imageUrl || primaryResultImage.value
  if (!url) return
  previewImageUrl.value = url
  previewModalVisible.value = true
}

async function handleDownloadResult(imageUrl?: string | null) {
  const url =
    imageUrl ??
    props.generationResult?.downloadUrl ??
    props.generationResult?.previewImage ??
    previewImageUrl.value
  if (!url) return

  await downloadFile(url, CREATIVE_DOWNLOAD_FILENAME)
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}
</script>

<template>
  <section
    class="creative-app"
    :class="[
      appStore.isDarkMode ? 'theme-dark' : 'theme-light',
      { 'sidebar-collapsed': sidebarCollapsed },
    ]"
    aria-label="创意生图工作台"
  >
    <aside class="creative-sidebar" aria-label="创意生图会话" :aria-hidden="sidebarCollapsed">
      <header class="creative-sidebar-head">
        <strong>开启创作</strong>
        <button type="button" aria-label="折叠会话栏" @click="toggleSidebar">
          <Icon icon="mdi:dock-left" />
        </button>
      </header>

      <button
        type="button"
        class="creative-new-chat"
        :disabled="props.isNewConversationDisabled"
        @click="emit('newConversation')"
      >
        <Icon icon="mdi:pencil-outline" />
        新对话
      </button>

      <section class="creative-recent">
        <p>最近</p>
        <div class="creative-recent-list">
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
                :key="`${conversation.conversationId}-${resolveConversationThumb(conversation)}`"
                :src="resolveConversationThumb(conversation)"
                :alt="resolveConversationTitle(conversation)"
                fit="cover"
              />
            </span>
            <span>{{ resolveConversationTitle(conversation) }}</span>
          </button>
        </div>
      </section>

      <footer class="creative-sidebar-foot">
        <span class="creative-credit">
          <Icon icon="mdi:star-four-points" />
          {{ props.capability.balance }} 积分
        </span>
      </footer>
    </aside>

    <main class="creative-main" :class="{ 'is-empty': !hasConversation }">
      <button
        v-if="sidebarCollapsed"
        type="button"
        class="creative-sidebar-expand"
        aria-label="展开会话栏"
        @click="toggleSidebar"
      >
        <Icon icon="mdi:dock-right" />
      </button>

      <div class="creative-main-stack">
        <section v-if="!hasConversation" class="creative-empty-state creative-content-shell">
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

        <section v-else ref="threadScrollRef" class="creative-thread" aria-live="polite">
          <div class="creative-content-shell">
          <div
            v-if="props.isLoadingConversation && !threadItems.length"
            class="creative-turn"
          >
            <div class="creative-result-placeholder" aria-label="图片加载中">
              <span class="creative-result-placeholder-spinner" aria-hidden="true"></span>
              <span>图片加载中</span>
            </div>
          </div>

          <div
            v-for="turn in threadItems"
            :key="turn.id"
            class="creative-turn"
          >
            <div v-if="turn.prompt" class="creative-user-message">
              <p>{{ turn.prompt }}</p>
            </div>

            <div v-if="turn.isGenerating" class="creative-thinking">
              <span aria-hidden="true"></span>
              <strong>认真思考中...</strong>
            </div>

            <article
              v-else-if="shouldShowResultCard(turn)"
              class="creative-result-card"
            >
              <p class="creative-result-status">已完成 <Icon icon="mdi:chevron-right" /></p>
              <h2>
                已提交生成创意图片，输出 {{ resolveTurnRatioLabel(turn) }}，提示词：{{ turn.prompt }}
              </h2>

              <button
                v-if="turn.resultUrl"
                type="button"
                class="creative-result-preview"
                aria-label="放大查看生成图片"
                @click="openImagePreview(turn.resultUrl)"
              >
                <img
                  :src="turn.resultUrl"
                  :alt="turn.prompt"
                  class="creative-result-preview-img"
                  loading="lazy"
                  decoding="async"
                />
                <span>AI 生成</span>
              </button>
              <div
                v-else
                class="creative-result-placeholder"
                aria-label="图片加载中"
              >
                <span class="creative-result-placeholder-spinner" aria-hidden="true"></span>
                <span>图片加载中</span>
              </div>

              <p class="creative-result-meta">
                以上内容由 AI 生成 · 本次消耗 {{ props.capability.cost }} 积分
              </p>

              <div class="creative-result-actions">
                <button type="button" @click="handleRegenerateTurn(turn)">
                  <Icon icon="mdi:reload" />
                  重新生成
                </button>
                <button
                  type="button"
                  :disabled="!turn.resultUrl || props.isGenerating || pendingTurns.length > 0"
                  @click="handleEditTurn(turn)"
                >
                  <Icon icon="mdi:image-edit-outline" />
                  重新编辑
                </button>
                <button
                  type="button"
                  :disabled="!turn.resultUrl"
                  @click="handleDownloadResult(turn.resultUrl)"
                >
                  <Icon icon="mdi:download-outline" />
                  下载
                </button>
              </div>
            </article>
          </div>
          </div>
        </section>
      </div>

      <Teleport to="body">
        <div
          v-if="previewModalVisible"
          class="creative-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="图片预览"
          @click.self="previewModalVisible = false"
        >
          <div class="creative-lightbox-frame">
            <button
              type="button"
              class="creative-lightbox-close"
              aria-label="关闭预览"
              @click="previewModalVisible = false"
            >
              <Icon icon="mdi:close" />
            </button>
            <img
              :src="previewImageUrl"
              :alt="displayPrompt"
              class="creative-lightbox-img"
            />
          </div>
        </div>
      </Teleport>

      <section
        class="creative-composer creative-content-shell"
        :class="{ 'is-inline': !hasConversation, 'is-docked': hasConversation }"
        aria-label="创意输入"
      >
        <div v-if="referencePreview" class="creative-attachments">
          <div
            class="creative-attachment"
            :class="{ 'is-loading': isReferenceUploading }"
          >
            <img
              :src="referencePreview"
              alt="参考图"
              class="creative-attachment-img"
            />
            <span
              v-if="isReferenceUploading"
              class="creative-attachment-overlay"
              aria-hidden="true"
            >
              <span class="creative-attachment-spinner"></span>
            </span>
            <span v-else-if="editingReference" class="creative-attachment-badge">
              待编辑
            </span>
            <button
              type="button"
              class="creative-attachment-remove"
              aria-label="移除参考图"
              @click="handleRemoveReference"
            >
              <Icon icon="mdi:close" />
            </button>
          </div>
        </div>

        <div class="creative-composer-row">
          <button
            type="button"
            class="creative-upload"
            :class="{ 'is-spinning': props.isGenerating || props.isUploadingReference }"
            :disabled="props.isGenerating"
            aria-label="上传参考图"
            @click="openReferencePicker"
          >
            <Icon v-if="props.isUploadingReference" icon="mdi:loading" />
            <Icon v-else icon="mdi:plus" />
          </button>
          <input
            ref="fileInputRef"
            class="creative-hidden-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            @change="handleReferenceSelected"
          />
          <NInput
            v-model:value="prompt"
            class="creative-prompt-input"
            type="textarea"
            size="small"
            :maxlength="creativeImagePromptMaxLength"
            placeholder="输入想法、脚本或上传参考图，描述你想生成的汽车创意图片"
            :autosize="{ minRows: 3, maxRows: 5 }"
            @keydown="handlePromptKeydown"
          />
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

        <footer class="creative-composer-foot">
          <div class="creative-submit-row">
            <div class="creative-ratio-field">
              <span class="creative-ratio-label">输出比例</span>
              <NSelect
                v-model:value="selectedRatio"
                :options="creativeImageAspectRatioOptions"
                size="large"
                :disabled="props.isGenerating"
                class="creative-ratio-select"
              />
            </div>
            <span class="creative-prompt-count">
              {{ promptLength }}/{{ creativeImagePromptMaxLength }}
            </span>
          </div>
        </footer>
      </section>
    </main>
  </section>
</template>

<style scoped lang="scss">
.creative-app {
  --creative-bg: #101114;
  --creative-content-max: 1800px;
  --creative-content-width: min(var(--creative-content-max), 80%);
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
  --creative-submit-bg: #f4f7fb;
  --creative-submit-text: #101114;
  --creative-submit-disabled-bg: #3b414d;
  --creative-submit-disabled-text: #737b89;
  --creative-composer-shadow: 0 24px 70px rgba(0, 0, 0, 0.28);
  --creative-main-glow: radial-gradient(circle at 54% 42%, rgba(255, 255, 255, 0.035), transparent 30%);

  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: auto minmax(0, 1fr);
  overflow: hidden;
  background: var(--creative-bg);
  color: var(--creative-text);
}

.creative-app.theme-light {
  --creative-bg: #f7fafd;
  --creative-sidebar-bg: #ffffff;
  --creative-main-bg: #f7fafd;
  --creative-text: #172033;
  --creative-text-soft: #334155;
  --creative-muted: #64748b;
  --creative-line: #e8edf5;
  --creative-surface: #ffffff;
  --creative-surface-soft: #f7fafd;
  --creative-surface-elevated: #ffffff;
  --creative-composer-bg: #ffffff;
  --creative-upload-bg: #edf4ff;
  --creative-icon: #475569;
  --creative-accent: #0a8fb8;
  --creative-accent-border: rgba(10, 143, 184, 0.22);
  --creative-submit-bg: #172033;
  --creative-submit-text: #ffffff;
  --creative-submit-disabled-bg: #e8edf5;
  --creative-submit-disabled-text: #cbd5e1;
  --creative-composer-shadow: 0 18px 48px rgba(78, 111, 148, 0.09);
  --creative-main-glow: radial-gradient(circle at 54% 42%, rgba(47, 107, 255, 0.05), transparent 32%);
}

.creative-sidebar {
  display: grid;
  width: 280px;
  min-width: 0;
  min-height: 0;
  grid-template-rows: auto auto 1fr auto;
  gap: 22px;
  overflow: hidden;
  border-right: 1px solid var(--creative-line);
  background: var(--creative-sidebar-bg);
  padding: 24px 22px;
  transition:
    width 0.24s ease,
    padding 0.24s ease,
    opacity 0.2s ease,
    border-color 0.24s ease;
}

.creative-app.sidebar-collapsed .creative-sidebar {
  width: 0;
  padding-inline: 0;
  opacity: 0;
  border-right-color: transparent;
  pointer-events: none;
}

.creative-sidebar-head,
.creative-composer-foot,
.creative-submit-row,
.creative-result-actions {
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
.creative-composer button,
.creative-result-actions button,
.creative-suggestion-row button,
.creative-result-preview {
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
  transition:
    background 0.16s ease,
    color 0.16s ease;
}

.creative-sidebar-head button:hover {
  background: color-mix(in srgb, var(--creative-text) 8%, transparent);
  color: var(--creative-text);
}

.creative-sidebar-expand {
  position: absolute;
  top: 18px;
  left: 18px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--creative-line);
  border-radius: 10px;
  background: var(--creative-surface-elevated);
  color: var(--creative-icon);
  font-family: inherit;
  font-size: 20px;
  cursor: pointer;
  transition:
    background 0.16s ease,
    color 0.16s ease,
    border-color 0.16s ease;
}

.creative-sidebar-expand:hover {
  border-color: var(--creative-accent-border);
  color: var(--creative-accent);
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

.creative-new-chat:disabled {
  cursor: default;
  opacity: 0.58;
}

.creative-recent {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.creative-recent-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding-right: 2px;
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
  grid-template-columns: 42px minmax(0, 1fr);
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

.creative-recent-item.active {
  background: color-mix(in srgb, var(--creative-accent) 10%, var(--creative-surface));
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
  width: 100%;
  min-width: 0;
  min-height: 0;
  grid-template-rows: minmax(0, 1fr) auto;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  overflow: hidden;
  border: 1px solid var(--creative-line);
  border-radius: 14px;
  margin: 12px;
  background: var(--creative-main-glow), var(--creative-main-bg);
}

.creative-content-shell {
  width: var(--creative-content-width);
  max-width: var(--creative-content-max);
  margin-inline: auto;
}

.creative-main-stack {
  grid-row: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.creative-main.is-empty .creative-main-stack {
  flex: 0 0 auto;
  width: 100%;
  overflow: visible;
}

.creative-empty-state,
.creative-thread {
  min-height: 0;
  width: 100%;
}

.creative-thread {
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 24px 0 32px;
}

.creative-composer.is-docked {
  grid-row: 2;
  flex-shrink: 0;
  margin-bottom: 28px;
}

.creative-empty-state {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 34px;
  padding: 40px 0 0;
}

.creative-main.is-empty .creative-composer.is-inline {
  flex: 0 0 auto;
  margin-top: 34px;
  margin-bottom: 40px;
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

.creative-turn {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.creative-turn + .creative-turn {
  margin-top: 48px;
}

.creative-user-message {
  align-self: flex-end;
  width: fit-content;
  max-width: min(100%, 520px);
  margin-bottom: 28px;
  border-radius: 18px;
  background: var(--creative-surface-soft);
  padding: 14px 20px;
}

.creative-user-message p {
  margin: 0;
  color: var(--creative-text);
  font-size: 16px;
  font-weight: 800;
  line-height: 1.65;
  word-break: break-word;
}

.creative-thinking {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
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

.creative-main.is-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: auto;
}

.creative-result-card {
  width: 100%;
  max-width: var(--creative-content-max);
  margin: 0;
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

.creative-result-preview {
  position: relative;
  display: block;
  width: fit-content;
  max-width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: zoom-in;
}

.creative-result-preview-img {
  display: block;
  width: auto;
  max-width: 100%;
  height: auto;
  max-height: min(72vh, 1200px);
  object-fit: contain;
  border-radius: 8px;
}

.creative-result-empty,
.creative-result-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: min(100%, 320px);
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  background: var(--creative-surface-soft);
  color: var(--creative-muted);
  font-size: 14px;
  font-weight: 800;
}

.creative-result-placeholder-spinner {
  width: 28px;
  height: 28px;
  border: 2px solid color-mix(in srgb, var(--creative-accent) 20%, transparent);
  border-top-color: var(--creative-accent);
  border-radius: 999px;
  animation: creative-spin 0.9s linear infinite;
}

.creative-result-preview span {
  position: absolute;
  top: 10px;
  left: 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.24);
  color: rgba(255, 255, 255, 0.68);
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 800;
  pointer-events: none;
}

.creative-lightbox {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(8, 10, 14, 0.88);
}

.creative-lightbox-frame {
  position: relative;
  display: inline-flex;
  max-width: min(96vw, 1200px);
  max-height: 92vh;
}

.creative-lightbox-close {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  transition: background 0.16s ease;
}

.creative-lightbox-close:hover {
  background: rgba(0, 0, 0, 0.62);
}

.creative-lightbox-img {
  display: block;
  max-width: min(96vw, 1200px);
  max-height: 92vh;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
}

.creative-result-meta {
  margin-top: 26px;
}

.creative-result-actions {
  flex-wrap: wrap;
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

.creative-result-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.52;
}

.creative-composer {
  box-sizing: border-box;
  border: 1px solid var(--creative-line);
  border-radius: 16px;
  background: var(--creative-composer-bg);
  padding: 16px 18px 14px;
  box-shadow: var(--creative-composer-shadow);
}

.creative-composer-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.creative-upload {
  display: grid;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 8px;
  background: var(--creative-upload-bg);
  color: var(--creative-muted);
  font-size: 20px;
  margin-top: 2px;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.creative-upload.is-spinning {
  color: var(--creative-accent);
  animation: creative-upload-spin 1.1s linear infinite;
}

.creative-upload:disabled {
  cursor: not-allowed;
  opacity: 0.88;
}

.creative-hidden-input {
  display: none;
}

.creative-prompt-input {
  flex: 1;
  min-width: 0;
}

.creative-prompt-input :deep(.n-input) {
  background: transparent;
}

.creative-prompt-input :deep(.n-input__border),
.creative-prompt-input :deep(.n-input__state-border) {
  display: none;
}

.creative-prompt-input :deep(.n-input-wrapper) {
  padding: 0 !important;
}

.creative-prompt-input :deep(.n-input__textarea-el) {
  padding: 2px 0;
  color: var(--creative-text);
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.7;
}

.creative-prompt-input :deep(.n-input__placeholder) {
  color: var(--creative-muted);
}

.creative-composer-foot {
  justify-content: flex-start;
  gap: 14px;
  margin-top: 14px;
  padding-top: 2px;
}

.creative-submit-row {
  gap: 8px;
  width: 100%;
  justify-content: flex-start;
  align-items: center;
}

.creative-prompt-count {
  margin-left: auto;
  color: var(--creative-muted);
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.creative-submit {
  display: grid;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 999px;
  background: var(--creative-submit-bg);
  color: var(--creative-submit-text);
  font-size: 18px;
  margin-top: 2px;
}

.creative-ratio-field {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  min-width: 280px;
  max-width: 360px;
}

.creative-ratio-label {
  color: var(--creative-text-soft);
  font-size: 15px;
  font-weight: 800;
  white-space: nowrap;
}

.creative-ratio-select {
  min-width: 0;
}

.creative-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.creative-attachment {
  position: relative;
  width: 64px;
  height: 64px;
  flex-shrink: 0;
}

.creative-attachment-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 12px;
  background: var(--creative-surface-soft);
}

.creative-attachment-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.42);
}

.creative-attachment-spinner {
  width: 22px;
  height: 22px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 999px;
  animation: creative-spin 0.9s linear infinite;
}

.creative-attachment-badge {
  position: absolute;
  left: 6px;
  bottom: 6px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--creative-composer-bg) 82%, var(--creative-accent));
  color: var(--creative-text);
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.4;
  box-shadow: 0 0 0 1px var(--creative-line);
}

.creative-attachment-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  padding: 0;
  border: 2px solid var(--creative-composer-bg);
  border-radius: 999px;
  background: var(--creative-text);
  color: var(--creative-composer-bg);
  font-size: 12px;
  cursor: pointer;
  transition: transform 0.16s ease;
}

.creative-attachment-remove:hover {
  transform: scale(1.08);
}

@keyframes creative-spin {
  to {
    transform: rotate(360deg);
  }
}

.creative-submit:disabled {
  background: var(--creative-submit-disabled-bg);
  color: var(--creative-submit-disabled-text);
  cursor: not-allowed;
}

@keyframes creative-upload-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1200px) {
  .creative-sidebar {
    width: 240px;
  }

  .creative-composer-foot {
    align-items: stretch;
  }

  .creative-submit-row {
    flex-wrap: wrap;
    justify-content: space-between;
  }
}

@media (max-width: 860px) {
  .creative-app {
    grid-template-columns: minmax(0, 1fr);
  }

  .creative-sidebar,
  .creative-app.sidebar-collapsed .creative-sidebar {
    display: none;
    width: 0;
    opacity: 0;
    pointer-events: none;
  }

  .creative-sidebar-expand {
    display: none;
  }
}
</style>
