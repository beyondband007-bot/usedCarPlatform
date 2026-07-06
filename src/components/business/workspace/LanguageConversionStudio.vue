<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { NModal, useMessage } from 'naive-ui'
import {
  createLanguageConversionTask,
  getLanguageConversionTask,
  listLanguageConversionTasks,
} from '@/api/language-conversion'
import { formatDate } from '@/utils/dayjs'

import originalExampleVideo from '@/assets/video/语言转换/处理前.mp4'
import convertedExampleVideo from '@/assets/video/语言转换/处理后.mp4'
import {
  languageConversionLanguages,
  type CreateLanguageConversionPayload,
} from '@/types/language-conversion'
import type { LanguageConversionTask } from '@/types/language-conversion'
import { downloadFile, sanitizeFilename } from '@/utils/download'

const MAX_VIDEO_SIZE = 500 * 1024 * 1024
const POLL_INTERVAL_MS = 3000
const MAX_POLL_FAILURES = 3

const emit = defineEmits<{
  submit: [payload: CreateLanguageConversionPayload]
}>()

const message = useMessage()
const fileInputRef = ref<HTMLInputElement | null>(null)
const originalVideoRef = ref<HTMLVideoElement | null>(null)
const resultVideoRef = ref<HTMLVideoElement | null>(null)

const sourceFile = ref<File | null>(null)
const sourceVideoUrl = ref('')
const sourceLanguage = ref('auto')
const targetLanguage = ref('en-US')
const activeTask = ref<LanguageConversionTask | null>(null)
const isSubmitting = ref(false)
const pollTimer = ref<number | null>(null)
const pollFailures = ref(0)
const isDragging = ref(false)
const isDownloading = ref(false)

const activeView = ref<'convert' | 'history'>('convert')
const historyTasks = ref<LanguageConversionTask[]>([])
const isLoadingHistory = ref(false)
const previewTask = ref<LanguageConversionTask | null>(null)
const previewOriginalRef = ref<HTMLVideoElement | null>(null)
const previewResultRef = ref<HTMLVideoElement | null>(null)

const availableSourceLanguages = computed(() =>
  languageConversionLanguages.filter((item) => item.status === 'available'),
)
const availableTargetLanguages = computed(() =>
  languageConversionLanguages.filter(
    (item) => item.status === 'available' && item.value !== 'auto',
  ),
)
const canSwapLanguages = computed(() => sourceLanguage.value !== 'auto')
const canSubmit = computed(
  () =>
    Boolean(sourceFile.value) &&
    sourceLanguage.value !== targetLanguage.value &&
    activeTask.value?.status !== 'processing' &&
    !isSubmitting.value,
)
const originalPreviewVideoUrl = computed(
  () => sourceVideoUrl.value || originalExampleVideo,
)
const resultPreviewVideoUrl = convertedExampleVideo
const convertedVideoUrl = computed(() =>
  sourceFile.value && activeTask.value?.resultVideoUrl
    ? activeTask.value.resultVideoUrl
    : resultPreviewVideoUrl,
)
const resultDownloadUrl = computed(() => activeTask.value?.resultVideoUrl || '')
const showResultVideo = computed(
  () => !sourceFile.value || activeTask.value?.status === 'success',
)
const conversionStatusText = computed(() => {
  if (!activeTask.value) return ''
  if (activeTask.value.status === 'success') return '转换完成'
  if (activeTask.value.status === 'failed') return activeTask.value.errorMessage || '转换失败'
  return `转换中 ${activeTask.value.progress}%`
})
const conversionProgress = computed(() => {
  if (activeTask.value?.status === 'failed') return 0
  return Math.min(100, Math.max(0, activeTask.value?.progress ?? 0))
})
const isTaskProcessing = computed(() => activeTask.value?.status === 'processing')

function openFilePicker() {
  fileInputRef.value?.click()
}

function acceptSourceFile(file?: File) {
  if (!file) return
  if (!['video/mp4', 'video/quicktime', 'video/webm'].includes(file.type)) {
    message.error('仅支持 MP4、MOV 或 WebM 视频')
    return
  }
  if (file.size > MAX_VIDEO_SIZE) {
    message.error('视频文件不能超过 500MB')
    return
  }
  pauseBoth()
  if (sourceVideoUrl.value) URL.revokeObjectURL(sourceVideoUrl.value)
  sourceFile.value = file
  sourceVideoUrl.value = URL.createObjectURL(file)
  activeTask.value = null
  stopPolling()
  void nextTick(syncVideoSources)
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  acceptSourceFile(file)
}

function handleDrop(event: DragEvent) {
  isDragging.value = false
  acceptSourceFile(event.dataTransfer?.files?.[0])
}

function removeSourceVideo() {
  pauseBoth()
  if (sourceVideoUrl.value) URL.revokeObjectURL(sourceVideoUrl.value)
  sourceFile.value = null
  sourceVideoUrl.value = ''
  activeTask.value = null
  stopPolling()
}

function swapLanguages() {
  if (!canSwapLanguages.value) return
  const previous = sourceLanguage.value
  sourceLanguage.value = targetLanguage.value
  targetLanguage.value = previous
}

async function handleSubmit() {
  if (!sourceFile.value) {
    message.error('请先上传需要转换的视频')
    return
  }
  if (sourceLanguage.value === targetLanguage.value) {
    message.error('当前语言和目标语言不能相同')
    return
  }
  const payload: CreateLanguageConversionPayload = {
    sourceFileName: sourceFile.value.name,
    sourceLanguage: sourceLanguage.value,
    targetLanguage: targetLanguage.value,
    preserveSpeakerVoice: true,
    preserveBackgroundAudio: true,
  }
  emit('submit', payload)
  isSubmitting.value = true
  activeTask.value = null
  stopPolling()
  try {
    const task = await createLanguageConversionTask({
      ...payload,
      sourceFile: sourceFile.value,
    })
    activeTask.value = task
    message.success('语言转换任务已提交')
    startPolling(task.taskId)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '语言转换任务提交失败')
  } finally {
    isSubmitting.value = false
  }
}

function startPolling(taskId: string) {
  stopPolling()
  pollFailures.value = 0
  void refreshTask(taskId)
}

function stopPolling() {
  if (pollTimer.value !== null) {
    window.clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

async function refreshTask(taskId: string) {
  try {
    const task = await getLanguageConversionTask(taskId)
    pollFailures.value = 0
    activeTask.value = task
    if (task.status === 'success') {
      stopPolling()
      message.success('语言转换完成')
      void nextTick(syncVideoSources)
    } else if (task.status === 'failed') {
      stopPolling()
      message.error(task.errorMessage || '语言转换失败')
    } else {
      pollTimer.value = window.setTimeout(() => {
        void refreshTask(taskId)
      }, POLL_INTERVAL_MS)
    }
  } catch (error) {
    pollFailures.value += 1
    if (pollFailures.value >= MAX_POLL_FAILURES) {
      stopPolling()
      message.error(error instanceof Error ? error.message : '语言转换状态查询失败')
      return
    }
    pollTimer.value = window.setTimeout(() => {
      void refreshTask(taskId)
    }, POLL_INTERVAL_MS)
  }
}

function syncVideoSources() {
  const original = originalVideoRef.value
  const result = resultVideoRef.value
  if (!original || !result) return
  original.currentTime = 0
  result.currentTime = 0
}

function pauseBoth() {
  originalVideoRef.value?.pause()
  resultVideoRef.value?.pause()
}

// 双视频联动：进度、播放、暂停均同步；状态判断保证不会来回循环触发
function syncTime(video: HTMLVideoElement | null, pairedVideo: HTMLVideoElement | null) {
  if (!video || !pairedVideo) return
  if (Math.abs(pairedVideo.currentTime - video.currentTime) > 0.15) {
    pairedVideo.currentTime = video.currentTime
  }
}

function syncPlay(pairedVideo: HTMLVideoElement | null) {
  if (pairedVideo?.paused) {
    void pairedVideo.play().catch(() => {})
  }
}

function syncPause(pairedVideo: HTMLVideoElement | null) {
  if (pairedVideo && !pairedVideo.paused) {
    pairedVideo.pause()
  }
}

function pairedVideoOf(kind: 'original' | 'result') {
  return kind === 'original' ? resultVideoRef.value : originalVideoRef.value
}

function handleTimeSync(kind: 'original' | 'result') {
  const video = kind === 'original' ? originalVideoRef.value : resultVideoRef.value
  syncTime(video, pairedVideoOf(kind))
}

function handlePlaySync(kind: 'original' | 'result') {
  syncPlay(pairedVideoOf(kind))
}

function handlePauseSync(kind: 'original' | 'result') {
  syncPause(pairedVideoOf(kind))
}

const shortLanguageLabels: Record<string, string> = {
  zh: '中文（普通话）',
  en: '英语',
  ja: '日语',
  ko: '韩语',
  es: '西班牙语',
  fr: '法语',
  de: '德语',
}

function languageLabel(value: string) {
  return (
    languageConversionLanguages.find((item) => item.value === value)?.label ??
    shortLanguageLabels[value] ??
    value
  )
}

const historyStatusLabels: Record<string, string> = {
  parsing: '解析中',
  ready: '待转换',
  processing: '转换中',
  success: '已完成',
  failed: '失败',
}

function switchView(view: 'convert' | 'history') {
  activeView.value = view
  if (view === 'history') void loadHistory()
}

async function loadHistory() {
  isLoadingHistory.value = true
  try {
    historyTasks.value = await listLanguageConversionTasks()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '历史记录加载失败')
  } finally {
    isLoadingHistory.value = false
  }
}

function openHistoryPreview(task: LanguageConversionTask) {
  previewTask.value = task
}

function handlePreviewVisibleChange(visible: boolean) {
  if (visible) return
  previewOriginalRef.value?.pause()
  previewResultRef.value?.pause()
  previewTask.value = null
}

async function downloadTaskResult(task: LanguageConversionTask) {
  if (!task.resultVideoUrl || isDownloading.value) return
  isDownloading.value = true
  try {
    const sourceName = task.sourceFileName.replace(/\.[^.]+$/, '') || 'language-conversion'
    await downloadFile(
      task.resultVideoUrl,
      sanitizeFilename(`${sourceName}-${task.targetLanguage}.mp4`),
    )
    message.success('转换结果已开始下载')
  } catch {
    message.error('转换结果下载失败，请稍后重试')
  } finally {
    isDownloading.value = false
  }
}

async function downloadResultVideo() {
  if (!resultDownloadUrl.value || isDownloading.value) return
  isDownloading.value = true
  try {
    const sourceName = sourceFile.value?.name.replace(/\.[^.]+$/, '') || 'language-conversion'
    await downloadFile(
      resultDownloadUrl.value,
      sanitizeFilename(`${sourceName}-${targetLanguage.value}.mp4`),
    )
    message.success('转换结果已开始下载')
  } catch {
    message.error('转换结果下载失败，请稍后重试')
  } finally {
    isDownloading.value = false
  }
}

onUnmounted(() => {
  if (sourceVideoUrl.value) URL.revokeObjectURL(sourceVideoUrl.value)
  stopPolling()
})
</script>

<template>
  <section class="language-studio" aria-label="视频语言转换工作台">
    <nav class="studio-tabs" role="tablist" aria-label="语言转换视图切换">
      <button
        type="button"
        role="tab"
        :aria-selected="activeView === 'convert'"
        :class="{ 'is-active': activeView === 'convert' }"
        @click="switchView('convert')"
      >
        语言转换
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="activeView === 'history'"
        :class="{ 'is-active': activeView === 'history' }"
        @click="switchView('history')"
      >
        历史记录
      </button>
    </nav>

    <div v-show="activeView === 'convert'" class="language-main-layout">
    <section class="language-card compare-card">
      <input
        ref="fileInputRef"
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        hidden
        @change="handleFileChange"
      />
      <header class="compare-heading">
        <div>
          <div>
            <h2>{{ sourceFile ? '转换效果预览' : '效果案例' }}</h2>
            <p>原视频与转换后视频可分别播放、调节音量和全屏查看</p>
          </div>
        </div>
        <span v-if="!sourceFile" class="example-badge">中文 → 英语案例</span>
        <span v-else class="contract-badge" :class="activeTask ? `is-${activeTask.status}` : ''">
          {{ activeTask ? conversionStatusText : '上传视频并设置语言后开始转换' }}
        </span>
      </header>

      <div class="compare-stage">
        <article class="video-player">
          <span>原视频</span>
          <video
            ref="originalVideoRef"
            :src="originalPreviewVideoUrl"
            controls
            playsinline
            preload="metadata"
            @timeupdate="handleTimeSync('original')"
            @seeked="handleTimeSync('original')"
            @play="handlePlaySync('original')"
            @pause="handlePauseSync('original')"
          />
          <footer class="video-inline-controls">
            <button type="button" class="inline-upload-button" @click="openFilePicker">
              <Icon icon="mdi:tray-arrow-up" />
              {{ sourceFile ? '更换视频' : '上传视频' }}
            </button>
            <label>
              <span>当前语言</span>
              <select v-model="sourceLanguage">
                <option
                  v-for="item in availableSourceLanguages"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </option>
              </select>
            </label>
          </footer>
        </article>
        <article class="video-player">
          <span>处理后视频</span>
          <button
            v-if="showResultVideo && resultDownloadUrl"
            type="button"
            class="download-result"
            :disabled="isDownloading"
            aria-label="下载生成视频"
            @click="downloadResultVideo"
          >
            <Icon :icon="isDownloading ? 'mdi:loading' : 'mdi:download'" :class="{ spinning: isDownloading }" />
          </button>
          <video
            v-if="showResultVideo"
            ref="resultVideoRef"
            :src="convertedVideoUrl"
            controls
            playsinline
            preload="metadata"
            @timeupdate="handleTimeSync('result')"
            @seeked="handleTimeSync('result')"
            @play="handlePlaySync('result')"
            @pause="handlePauseSync('result')"
          />
          <div v-else class="result-waiting-state">
            <Icon icon="mdi:movie-open-clock-outline" />
            <strong>等待转换结果</strong>
            <small>转换完成后，处理后的视频将在这里显示</small>
          </div>
          <footer class="video-inline-controls result-controls">
            <label>
              <span>目标语言</span>
              <select v-model="targetLanguage">
                <option
                  v-for="item in availableTargetLanguages"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </option>
              </select>
            </label>
            <button
              type="button"
              class="start-conversion"
              :disabled="!canSubmit"
              @click="handleSubmit"
            >
              <Icon :icon="isSubmitting || isTaskProcessing ? 'mdi:loading' : 'mdi:translate'" :class="{ spinning: isSubmitting || isTaskProcessing }" />
              {{ isSubmitting ? '正在提交' : isTaskProcessing ? '转换处理中' : activeTask?.status === 'failed' ? '重新转换' : '开始转换' }}
            </button>
            <div v-if="activeTask" class="conversion-progress" :class="`is-${activeTask.status}`">
              <div><span>{{ conversionStatusText }}</span><b>{{ conversionProgress }}%</b></div>
              <progress :value="conversionProgress" max="100">{{ conversionProgress }}%</progress>
            </div>
          </footer>
        </article>
      </div>
    </section>
    </div>

    <section v-if="activeView === 'history'" class="language-card history-panel">
      <header>
        <div>
          <h2>历史记录</h2>
          <p>查看已提交的语言转换任务，点击“查看”可对比原视频与转换结果</p>
        </div>
      </header>

      <div v-if="isLoadingHistory" class="history-empty">
        <Icon icon="mdi:loading" class="spinning" />
        <strong>正在加载历史记录</strong>
      </div>
      <div v-else-if="!historyTasks.length" class="history-empty">
        <Icon icon="mdi:inbox-outline" />
        <strong>暂无历史记录</strong>
        <small>提交语言转换任务后，可以在这里查看记录</small>
      </div>
      <ul v-else class="history-list">
        <li v-for="task in historyTasks" :key="task.taskId">
          <div class="history-meta">
            <strong :title="task.sourceFileName">{{ task.sourceFileName }}</strong>
            <span>
              {{ languageLabel(task.sourceLanguage) }} → {{ languageLabel(task.targetLanguage) }}
              · {{ formatDate(task.createdAt) }}
            </span>
          </div>
          <span
            class="history-status"
            :class="`is-${task.status}`"
            :title="task.errorMessage"
          >
            {{ historyStatusLabels[task.status] ?? task.status }}
          </span>
          <button
            type="button"
            class="history-view"
            :disabled="task.status !== 'success' || !task.resultVideoUrl"
            @click="openHistoryPreview(task)"
          >
            <Icon icon="mdi:play-box-multiple-outline" />
            查看
          </button>
        </li>
      </ul>
    </section>

    <NModal
      :show="Boolean(previewTask)"
      preset="card"
      to="body"
      transform-origin="center"
      :style="{ width: 'min(1080px, calc(100vw - 48px))' }"
      :title="previewTask?.sourceFileName ?? '转换记录对比'"
      @update:show="handlePreviewVisibleChange"
    >
      <div v-if="previewTask" class="compare-stage history-compare">
        <article class="video-player">
          <span>原视频</span>
          <video
            ref="previewOriginalRef"
            :src="previewTask.sourceVideoUrl"
            controls
            playsinline
            preload="metadata"
            @timeupdate="syncTime(previewOriginalRef, previewResultRef)"
            @seeked="syncTime(previewOriginalRef, previewResultRef)"
            @play="syncPlay(previewResultRef)"
            @pause="syncPause(previewResultRef)"
          />
        </article>
        <article class="video-player">
          <span>处理后视频</span>
          <button
            type="button"
            class="download-result"
            :disabled="isDownloading"
            aria-label="下载生成视频"
            @click="downloadTaskResult(previewTask)"
          >
            <Icon :icon="isDownloading ? 'mdi:loading' : 'mdi:download'" :class="{ spinning: isDownloading }" />
          </button>
          <video
            ref="previewResultRef"
            :src="previewTask.resultVideoUrl"
            controls
            playsinline
            preload="metadata"
            @timeupdate="syncTime(previewResultRef, previewOriginalRef)"
            @seeked="syncTime(previewResultRef, previewOriginalRef)"
            @play="syncPlay(previewOriginalRef)"
            @pause="syncPause(previewOriginalRef)"
          />
        </article>
      </div>
    </NModal>
  </section>
</template>

<style scoped lang="scss">
.language-studio {
  --lc-primary: #2f7cff;
  --lc-panel: var(--workspace-panel, var(--app-surface));
  --lc-surface: var(--workspace-panel-soft, var(--app-surface-soft));
  --lc-border: var(--workspace-line, var(--app-border));
  --lc-text: var(--workspace-text, var(--app-text));
  --lc-muted: var(--workspace-text-secondary, var(--app-text-soft));
  --lc-player-stage: var(--workspace-panel, var(--app-surface));
  --lc-player-background: var(--workspace-panel, var(--app-surface));

  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  color: var(--lc-text);
  box-sizing: border-box;
}

.studio-tabs {
  display: flex;
  flex: 0 0 auto;
  gap: 34px;
}

.studio-tabs button {
  position: relative;
  padding: 0 2px 6px;
  border: 0;
  background: transparent;
  color: var(--lc-muted);
  cursor: pointer;
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  transition: color 0.2s ease;
}

.studio-tabs button::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 3px;
  border-radius: 999px;
  background: var(--workspace-accent-underline, var(--workspace-accent, var(--lc-primary)));
  content: '';
  opacity: 0;
  transform: scaleX(0.4);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.studio-tabs button:hover:not(.is-active) {
  color: var(--lc-text);
}

.studio-tabs button.is-active {
  color: var(--lc-text);
  font-weight: 800;
}

.studio-tabs button.is-active::after {
  opacity: 1;
  transform: scaleX(1);
}

.language-main-layout {
  display: grid;
  flex: 0 0 auto;
  height: calc(100vh - 150px);
  min-height: 600px;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  align-items: stretch;
  gap: 18px;
  overflow: hidden;
}

.language-hero,
.language-card header,
.compare-heading > div {
  display: flex;
  align-items: center;
}

.language-hero {
  justify-content: space-between;
  gap: 28px;
  margin-bottom: 22px;
}

.language-hero p {
  margin: 0 0 7px;
  color: var(--lc-primary);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.language-hero h1 {
  margin: 0;
  font-size: clamp(28px, 2.3vw, 38px);
}

.language-hero > div > span {
  display: block;
  margin-top: 10px;
  color: var(--lc-muted);
}

.language-support {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--lc-panel);
  color: var(--lc-muted);
  font-size: 12px;
}

.language-config-grid {
  display: grid;
  min-height: 0;
  grid-template-columns: 1fr;
  grid-auto-rows: max-content;
  align-items: start;
  align-content: start;
  gap: 10px;
  padding-right: 4px;
  overflow-x: hidden;
  overflow-y: auto;
  order: 1;
}

.language-config-grid > .language-card {
  min-height: max-content;
  padding: 12px 10px;
}

.settings-card {
  order: initial;
}

.upload-card {
  order: initial;
}

.language-card {
  padding: clamp(14px, 1.25vw, 20px);
  border: 1px solid var(--lc-border);
  border-radius: 18px;
  background: var(--lc-panel);
}

.language-card header {
  gap: 12px;
  margin-bottom: 12px;
}

.language-config-grid .language-card header {
  gap: 8px;
  margin-bottom: 10px;
}

.language-config-grid .language-card header p {
  display: none;
}

.language-config-grid .language-card h2 {
  font-size: 14px;
}

.language-config-grid .section-number {
  width: 26px;
  height: 26px;
  font-size: 12px;
}

.language-card h2 {
  margin: 0;
  font-size: 18px;
}

.language-card header p {
  margin: 5px 0 0;
  color: var(--lc-muted);
  font-size: 12px;
}

.section-number {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--lc-primary) 13%, transparent);
  color: var(--lc-primary);
  font-weight: 800;
}

.language-upload-zone {
  display: flex;
  width: 100%;
  min-height: 132px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 11px;
  border: 1px dashed color-mix(in srgb, var(--lc-muted) 48%, var(--lc-border));
  border-radius: 14px;
  background: var(--lc-surface);
  color: var(--lc-text);
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;
}

.language-config-grid .language-upload-zone {
  min-height: 112px;
  gap: 8px;
  padding: 10px 6px;
}

.language-config-grid .language-upload-zone > span {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  font-size: 20px;
}

.language-config-grid .language-upload-zone strong {
  font-size: 12px;
}

.language-config-grid .language-upload-zone small {
  display: none;
}

.language-upload-zone.is-dragging {
  border-color: var(--lc-primary);
  background: color-mix(in srgb, var(--lc-primary) 9%, var(--lc-surface));
  transform: translateY(-2px);
}

.language-upload-zone > span {
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  border-radius: 14px;
  background: color-mix(in srgb, var(--lc-primary) 13%, transparent);
  color: var(--lc-primary);
  font-size: 25px;
}

.language-upload-zone small {
  color: var(--lc-muted);
}

.language-uploaded-file {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr) auto;
  min-height: 132px;
  align-items: center;
  gap: 16px;
  padding: 14px;
  border-radius: 14px;
  background: var(--lc-surface);
}

.language-uploaded-file video {
  width: 92px;
  height: 108px;
  border-radius: 10px;
  background: #080d16;
  object-fit: cover;
}

.language-uploaded-file > div {
  display: grid;
  min-width: 0;
  gap: 7px;
}

.language-uploaded-file strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.language-uploaded-file span {
  color: var(--lc-muted);
  font-size: 12px;
}

.language-uploaded-file button {
  border: 0;
  background: transparent;
  color: var(--lc-muted);
  cursor: pointer;
  font-size: 20px;
}

.language-pair {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: end;
  gap: 12px;
}

.language-config-grid .language-pair {
  grid-template-columns: 1fr;
  align-items: stretch;
  gap: 8px;
}

.language-config-grid .language-pair label > span {
  margin-bottom: 5px;
  font-size: 11px;
}

.language-config-grid .language-pair select {
  height: 38px;
  padding: 0 8px;
  font-size: 12px;
}

.language-config-grid .swap-language {
  display: none;
}

.language-pair label,
.language-pair label > span {
  display: grid;
}

.language-pair label > span {
  margin-bottom: 8px;
  color: var(--lc-muted);
  font-size: 12px;
  font-weight: 700;
}

.language-pair select {
  width: 100%;
  height: 46px;
  padding: 0 12px;
  border: 1px solid var(--lc-border);
  border-radius: 10px;
  outline: 0;
  background: var(--lc-surface);
  color: var(--lc-text);
  font: inherit;
}

.swap-language {
  display: grid;
  width: 42px;
  height: 42px;
  margin: 0 0 2px;
  place-items: center;
  border: 1px solid var(--lc-border);
  border-radius: 50%;
  background: var(--lc-panel);
  color: var(--lc-primary);
  cursor: pointer;
  font-size: 20px;
}

.swap-language:disabled {
  color: var(--lc-muted);
  cursor: not-allowed;
  opacity: 0.45;
}

.start-conversion {
  display: flex;
  width: 100%;
  height: 46px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  border: 0;
  border-radius: 11px;
  background: var(--lc-primary);
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  font-weight: 800;
}

.start-conversion:disabled {
  background: var(--lc-surface);
  color: var(--lc-muted);
  cursor: not-allowed;
}

.language-config-grid .start-conversion {
  height: 40px;
  margin-top: 10px;
  font-size: 12px;
}

.conversion-progress {
  display: grid;
  gap: 7px;
  margin-top: 12px;
}

.conversion-progress > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--lc-muted);
  font-size: 12px;
}

.conversion-progress b {
  color: var(--lc-text);
}

.conversion-progress progress {
  width: 100%;
  height: 8px;
  overflow: hidden;
  border: 0;
  border-radius: 999px;
  accent-color: var(--lc-primary);
}

.conversion-progress.is-success progress {
  accent-color: #16a36a;
}

.conversion-progress.is-failed progress {
  accent-color: #dc4c4c;
}

.spinning {
  animation: language-spin 0.9s linear infinite;
}

@keyframes language-spin {
  to {
    transform: rotate(360deg);
  }
}

.compare-card {
  display: flex;
  min-height: 0;
  min-width: 0;
  flex-direction: column;
  margin: 0;
  padding: 12px 16px 16px;
  order: 2;
}

.compare-heading {
  justify-content: space-between;
  margin-bottom: 10px !important;
}

.compare-heading > div {
  gap: 12px;
}

.compare-heading > div > div {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 12px;
}

.compare-heading > div > div p {
  margin: 0;
}

.example-badge,
.contract-badge {
  padding: 7px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--lc-primary) 12%, transparent);
  color: var(--lc-primary);
  font-size: 11px;
  font-weight: 700;
}

.contract-badge.is-success {
  background: color-mix(in srgb, #16a36a 14%, transparent);
  color: #168452;
}

.contract-badge.is-failed {
  background: color-mix(in srgb, #dc4c4c 12%, transparent);
  color: #c23f3f;
}

.compare-stage {
  display: grid;
  height: auto;
  min-height: 0;
  flex: 1;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 14px;
  border-radius: 15px;
  background: var(--lc-player-stage);
}

.compare-stage article {
  position: relative;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  border-radius: 11px;
  background: var(--lc-player-background);
}

.compare-stage article > span {
  position: absolute;
  z-index: 1;
  top: 12px;
  left: 12px;
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(3, 8, 18, 0.7);
  color: #fff;
  font-size: 11px;
}

.compare-stage video {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: var(--lc-player-background);
  object-fit: contain;
}

.video-player {
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.video-player > video,
.video-player > .result-waiting-state {
  height: 0;
  min-height: 0;
  flex: 1;
}

.video-inline-controls {
  display: grid;
  flex: 0 0 auto;
  grid-template-columns: minmax(120px, 0.45fr) minmax(180px, 1fr);
  align-items: end;
  gap: 12px;
  padding: 12px;
  background: var(--lc-panel);
}

.video-inline-controls label,
.video-inline-controls label > span {
  display: grid;
}

.video-inline-controls label > span {
  margin-bottom: 6px;
  color: var(--lc-muted);
  font-size: 11px;
  font-weight: 700;
}

.video-inline-controls select,
.inline-upload-button {
  width: 100%;
  height: 40px;
  border: 1px solid var(--lc-border);
  border-radius: 10px;
  background: var(--lc-surface);
  color: var(--lc-text);
  font: inherit;
}

.inline-upload-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: var(--lc-primary);
  cursor: pointer;
  font-weight: 700;
}

.video-inline-controls select {
  padding: 0 10px;
}

.result-controls {
  grid-template-columns: minmax(180px, 1fr) minmax(120px, 0.45fr);
}

.result-controls .start-conversion {
  height: 40px;
  margin-top: 0;
}

.result-controls .conversion-progress {
  grid-column: 1 / -1;
  margin-top: 0;
}

.download-result {
  position: absolute;
  z-index: 2;
  top: 10px;
  right: 10px;
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: rgba(3, 8, 18, 0.7);
  color: #fff;
  cursor: pointer;
  font-size: 16px;
}

.download-result:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.result-waiting-state {
  display: grid;
  width: 100%;
  min-height: 0;
  place-content: center;
  justify-items: center;
  gap: 8px;
  padding: 24px;
  box-sizing: border-box;
  color: rgba(255, 255, 255, 0.72);
  text-align: center;
}

.result-waiting-state svg {
  font-size: 34px;
}

.result-waiting-state strong {
  color: #fff;
  font-size: 14px;
}

.result-waiting-state small {
  font-size: 12px;
}

.shared-player-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 15px;
  border-radius: 0 0 15px 15px;
  background: #111927;
  color: #fff;
}

.shared-player-controls > button {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  cursor: pointer;
}

.shared-player-controls > button:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.shared-player-controls > span {
  flex: 0 0 auto;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 11px;
}

.shared-player-controls > input {
  min-width: 80px;
  flex: 1;
  accent-color: var(--lc-primary);
}

.audio-mixer {
  display: flex;
  gap: 10px;
}

.audio-mixer label {
  display: grid;
  grid-template-columns: auto 72px 34px;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.72);
  font-size: 11px;
}

.audio-mixer input {
  width: 72px;
  accent-color: var(--lc-primary);
}

.audio-mixer output {
  color: #fff;
  text-align: right;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

.history-panel {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}

.history-list {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.history-list li {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border: 1px solid var(--lc-border);
  border-radius: 12px;
  background: var(--lc-surface);
}

.history-meta {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: 4px;
}

.history-meta strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-meta span {
  color: var(--lc-muted);
  font-size: 12px;
}

.history-status {
  flex: 0 0 auto;
  padding: 5px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--lc-primary) 12%, transparent);
  color: var(--lc-primary);
  font-size: 11px;
  font-weight: 700;
}

.history-status.is-success {
  background: color-mix(in srgb, #16a36a 14%, transparent);
  color: #168452;
}

.history-status.is-failed {
  background: color-mix(in srgb, #dc4c4c 12%, transparent);
  color: #c23f3f;
}

.history-view {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 0;
  border-radius: 10px;
  background: var(--lc-primary);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
}

.history-view:disabled {
  background: var(--lc-surface);
  color: var(--lc-muted);
  cursor: not-allowed;
}

.history-empty {
  display: grid;
  flex: 1;
  min-height: 0;
  place-content: center;
  justify-items: center;
  gap: 8px;
  color: var(--lc-muted);
  text-align: center;
}

.history-empty svg {
  font-size: 34px;
}

.history-compare {
  flex: none;
  height: min(62vh, 560px);
}

:global(html[data-theme='dark']) .language-studio,
:global(.workspace-page.theme-dark) .language-studio {
  --lc-primary: #66a0ff;
  --lc-player-stage: #0b1019;
  --lc-player-background: #05080d;
}

@media (width < 1180px) {
  .language-studio {
    gap: 8px;
  }

  .studio-tabs button {
    padding-bottom: 5px;
    font-size: 14px;
  }

  .compare-heading h2 {
    white-space: nowrap;
  }

}

@media (max-width: 1100px) {
  .upload-card,
  .settings-card {
    order: initial;
  }
}

@media (max-width: 900px) {
  .language-main-layout {
    height: auto;
    min-height: 0;
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
    overflow: visible;
  }

  .language-config-grid {
    grid-template-columns: 1fr;
    padding-right: 0;
    overflow: visible;
    order: 2;
  }

  .compare-card {
    min-height: 520px;
    order: 1;
  }
}

@media (max-width: 720px) {
  .language-studio {
    padding: 0;
  }

  .language-hero,
  .long-language-toolbar,
  .compare-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .compare-stage {
    grid-template-columns: 1fr;
  }

  .video-inline-controls,
  .result-controls {
    grid-template-columns: 1fr;
  }

  .language-config-grid {
    grid-template-columns: 1fr;
  }

  .shared-player-controls {
    flex-wrap: wrap;
  }

  .shared-player-controls > input {
    min-width: 140px;
  }

  .audio-mixer {
    width: 100%;
  }

  .audio-mixer label {
    flex: 1;
    grid-template-columns: auto minmax(60px, 1fr) 34px;
  }

  .audio-mixer input {
    width: 100%;
  }
}
</style>
