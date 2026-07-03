<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useMessage } from 'naive-ui'
import {
  createLanguageConversionTask,
  getLanguageConversionTask,
} from '@/api/language-conversion'

import originalExampleVideo from '@/assets/video/语言转换/处理前.mp4'
import convertedExampleVideo from '@/assets/video/语言转换/处理后.mp4'
import {
  languageConversionLanguages,
  type CreateLanguageConversionPayload,
} from '@/types/language-conversion'
import type { LanguageConversionTask } from '@/types/language-conversion'

const emit = defineEmits<{
  submit: [payload: CreateLanguageConversionPayload]
}>()

const message = useMessage()
const fileInputRef = ref<HTMLInputElement | null>(null)
const originalVideoRef = ref<HTMLVideoElement | null>(null)
const resultVideoRef = ref<HTMLVideoElement | null>(null)
const compareStageRef = ref<HTMLElement | null>(null)

const sourceFile = ref<File | null>(null)
const sourceVideoUrl = ref('')
const sourceLanguage = ref('auto')
const targetLanguage = ref('en-US')
const activeTask = ref<LanguageConversionTask | null>(null)
const isSubmitting = ref(false)
const pollTimer = ref<number | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const originalVolume = ref(1)
const resultVolume = ref(1)

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
    sourceLanguage.value !== targetLanguage.value,
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

function openFilePicker() {
  fileInputRef.value?.click()
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!['video/mp4', 'video/quicktime', 'video/webm'].includes(file.type)) {
    message.error('仅支持 MP4、MOV 或 WebM 视频')
    return
  }
  if (sourceVideoUrl.value) URL.revokeObjectURL(sourceVideoUrl.value)
  sourceFile.value = file
  sourceVideoUrl.value = URL.createObjectURL(file)
  activeTask.value = null
  stopPolling()
  currentTime.value = 0
  duration.value = 0
  void nextTick(syncVideoSources)
}

function removeSourceVideo() {
  pauseBoth()
  if (sourceVideoUrl.value) URL.revokeObjectURL(sourceVideoUrl.value)
  sourceFile.value = null
  sourceVideoUrl.value = ''
  activeTask.value = null
  currentTime.value = 0
  duration.value = 0
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
  pollTimer.value = window.setInterval(() => {
    void refreshTask(taskId)
  }, 5000)
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
    activeTask.value = task
    if (task.status === 'success') {
      stopPolling()
      message.success('语言转换完成')
      void nextTick(syncVideoSources)
    } else if (task.status === 'failed') {
      stopPolling()
      message.error(task.errorMessage || '语言转换失败')
    }
  } catch (error) {
    stopPolling()
    message.error(error instanceof Error ? error.message : '语言转换状态查询失败')
  }
}

function syncVideoSources() {
  const original = originalVideoRef.value
  const result = resultVideoRef.value
  if (!original || !result) return
  original.currentTime = 0
  result.currentTime = 0
  updateAudioState()
}

function updateAudioState() {
  if (originalVideoRef.value) {
    originalVideoRef.value.muted = false
    originalVideoRef.value.volume = originalVolume.value
  }
  if (resultVideoRef.value) {
    resultVideoRef.value.muted = false
    resultVideoRef.value.volume = resultVolume.value
  }
}

watch([originalVolume, resultVolume], updateAudioState)

async function togglePlayback() {
  if (isPlaying.value) {
    pauseBoth()
    return
  }
  const videos = [originalVideoRef.value, resultVideoRef.value].filter(
    (item): item is HTMLVideoElement => Boolean(item),
  )
  try {
    await Promise.all(videos.map((item) => item.play()))
    isPlaying.value = true
  } catch {
    pauseBoth()
  }
}

function pauseBoth() {
  originalVideoRef.value?.pause()
  resultVideoRef.value?.pause()
  isPlaying.value = false
}

function handleTimelineInput(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  currentTime.value = value
  if (originalVideoRef.value) originalVideoRef.value.currentTime = value
  if (resultVideoRef.value) resultVideoRef.value.currentTime = value
}

function handleOriginalTimeUpdate() {
  const original = originalVideoRef.value
  const result = resultVideoRef.value
  if (!original) return
  currentTime.value = original.currentTime
  if (result && Math.abs(result.currentTime - original.currentTime) > 0.15) {
    result.currentTime = original.currentTime
  }
}

function handleMetadata(event: Event) {
  const video = event.target as HTMLVideoElement
  if (sourceFile.value) {
    if (video === originalVideoRef.value) {
      duration.value = video.duration || 0
    }
  } else {
    duration.value = Math.max(duration.value, video.duration || 0)
  }
  updateAudioState()
}

function handleWaiting() {
  if (isPlaying.value) pauseBoth()
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '00:00'
  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

async function toggleFullscreen() {
  if (!compareStageRef.value?.requestFullscreen) return
  await compareStageRef.value.requestFullscreen()
}

function downloadResultVideo() {
  if (!resultDownloadUrl.value) return
  const link = document.createElement('a')
  link.href = resultDownloadUrl.value
  link.download = `${activeTask.value?.taskId || 'language-conversion'}-result.mp4`
  document.body.appendChild(link)
  link.click()
  link.remove()
}

onUnmounted(() => {
  if (sourceVideoUrl.value) URL.revokeObjectURL(sourceVideoUrl.value)
  stopPolling()
})
</script>

<template>
  <section class="language-studio" aria-label="视频语言转换工作台">
    <header class="language-hero">
      <div>
        <p>AI VIDEO TRANSLATION</p>
        <h1>视频语言转换</h1>
        <span>保留说话人音色与视频节奏，将原始语音自然转换为目标语言。</span>
      </div>
      <div class="language-support">
        <Icon icon="mdi:information-outline" />
        MP4 / MOV / WebM · 建议包含清晰人声
      </div>
    </header>

    <div class="language-config-grid">
      <section class="language-card upload-card">
        <header>
          <span class="section-number">1</span>
          <div>
            <h2>上传视频</h2>
            <p>选择需要进行语言转换的原始视频</p>
          </div>
        </header>

        <input
          ref="fileInputRef"
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          hidden
          @change="handleFileChange"
        />

        <button
          v-if="!sourceFile"
          type="button"
          class="language-upload-zone"
          @click="openFilePicker"
        >
          <span><Icon icon="mdi:tray-arrow-up" /></span>
          <strong>点击或拖拽上传视频</strong>
          <small>建议时长不超过 10 分钟，文件不超过 500MB</small>
        </button>

        <div v-else class="language-uploaded-file">
          <video :src="sourceVideoUrl" muted preload="metadata" />
          <div>
            <strong>{{ sourceFile.name }}</strong>
            <span>{{ (sourceFile.size / 1024 / 1024).toFixed(1) }} MB</span>
          </div>
          <button type="button" aria-label="删除视频" @click="removeSourceVideo">
            <Icon icon="mdi:close" />
          </button>
        </div>
      </section>

      <section class="language-card settings-card">
        <header>
          <span class="section-number">2</span>
          <div>
            <h2>设置转换语言</h2>
            <p>自动识别原语言，选择需要输出的目标语言</p>
          </div>
        </header>

        <div class="language-pair">
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
          <button
            type="button"
            class="swap-language"
            :disabled="!canSwapLanguages"
            aria-label="交换语言"
            @click="swapLanguages"
          >
            <Icon icon="mdi:swap-horizontal" />
          </button>
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
        </div>

        <button
          type="button"
          class="start-conversion"
          :disabled="!canSubmit || isSubmitting || activeTask?.status === 'processing'"
          @click="handleSubmit"
        >
          <Icon icon="mdi:translate" />
          开始转换
        </button>
        <p v-if="conversionStatusText" class="conversion-status">
          {{ conversionStatusText }}
        </p>
      </section>
    </div>

    <section class="language-card compare-card">
      <header class="compare-heading">
        <div>
          <span class="section-number">3</span>
          <div>
            <h2>{{ sourceFile ? '转换效果预览' : '效果案例' }}</h2>
            <p>两个视频使用同一时间轴，便于逐帧比较语言转换效果</p>
          </div>
        </div>
        <span v-if="!sourceFile" class="example-badge">中文 → 英语案例</span>
        <span v-else class="contract-badge">结果视频等待后端字段 resultVideoUrl</span>
      </header>

      <div ref="compareStageRef" class="compare-stage">
        <article>
          <span>原视频</span>
          <video
            ref="originalVideoRef"
            :src="originalPreviewVideoUrl"
            playsinline
            preload="metadata"
            @loadedmetadata="handleMetadata"
            @timeupdate="handleOriginalTimeUpdate"
            @waiting="handleWaiting"
            @ended="pauseBoth"
          />
        </article>
        <article>
          <span>处理后视频</span>
          <video
            v-if="showResultVideo"
            ref="resultVideoRef"
            :src="convertedVideoUrl"
            playsinline
            preload="metadata"
            @loadedmetadata="handleMetadata"
            @waiting="handleWaiting"
            @ended="pauseBoth"
          />
          <div v-else class="result-waiting-state">
            <Icon icon="mdi:movie-open-clock-outline" />
            <strong>等待转换结果</strong>
            <small>转换完成后，处理后的视频将在这里显示</small>
          </div>
        </article>
      </div>

      <div class="shared-player-controls">
        <button type="button" :aria-label="isPlaying ? '暂停' : '播放'" @click="togglePlayback">
          <Icon :icon="isPlaying ? 'mdi:pause' : 'mdi:play'" />
        </button>
        <span>{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
        <input
          type="range"
          min="0"
          :max="duration || 0"
          step="0.01"
          :value="currentTime"
          aria-label="共用视频时间轴"
          @input="handleTimelineInput"
        />
        <div class="audio-mixer">
          <label>
            <span>原声音量</span>
            <input
              v-model.number="originalVolume"
              type="range"
              min="0"
              max="1"
              step="0.01"
              aria-label="原声音量"
            />
            <output>{{ Math.round(originalVolume * 100) }}%</output>
          </label>
          <label>
            <span>转换后音量</span>
            <input
              v-model.number="resultVolume"
              type="range"
              min="0"
              max="1"
              step="0.01"
              aria-label="转换后音量"
            />
            <output>{{ Math.round(resultVolume * 100) }}%</output>
          </label>
        </div>
        <button type="button" aria-label="全屏" @click="toggleFullscreen">
          <Icon icon="mdi:fullscreen" />
        </button>
        <button
          v-if="resultDownloadUrl"
          type="button"
          class="download-result"
          aria-label="下载生成视频"
          @click="downloadResultVideo"
        >
          <Icon icon="mdi:download" />
        </button>
      </div>
    </section>
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

  min-height: 100%;
  padding: clamp(22px, 3vw, 40px);
  color: var(--lc-text);
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
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: 18px;
}

.language-card {
  padding: 22px;
  border: 1px solid var(--lc-border);
  border-radius: 18px;
  background: var(--lc-panel);
}

.language-card header {
  gap: 12px;
  margin-bottom: 18px;
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
  min-height: 210px;
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
  grid-template-columns: 150px minmax(0, 1fr) auto;
  min-height: 210px;
  align-items: center;
  gap: 16px;
  padding: 14px;
  border-radius: 14px;
  background: var(--lc-surface);
}

.language-uploaded-file video {
  width: 150px;
  height: 180px;
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
  margin-bottom: 2px;
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

.conversion-status {
  margin: 10px 0 0;
  color: var(--lc-muted);
  font-size: 12px;
}

.compare-card {
  margin-top: 18px;
}

.compare-heading {
  justify-content: space-between;
}

.compare-heading > div {
  gap: 12px;
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

.compare-stage {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 14px;
  border-radius: 15px 15px 0 0;
  background: #0b1019;
}

.compare-stage article {
  position: relative;
  min-width: 0;
  overflow: hidden;
  border-radius: 11px;
  background: #05080d;
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
  aspect-ratio: 16 / 9;
  object-fit: contain;
}

.result-waiting-state {
  display: grid;
  width: 100%;
  aspect-ratio: 16 / 9;
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

:global(.workspace-page.theme-dark) .language-studio {
  --lc-primary: #66a0ff;
}

@media (max-width: 980px) {
  .language-config-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .language-studio {
    padding: 18px;
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
