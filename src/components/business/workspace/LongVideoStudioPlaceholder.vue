<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { NModal, useMessage } from 'naive-ui'

import TemplatePreviewVideoPlayer from '@/components/business/workspace/TemplatePreviewVideoPlayer.vue'
import {
  createLongVideoAudioPreview,
  createLongVideoDraft,
  createLongVideoTask,
  getLongVideoTask,
  updateLongVideoDraftSegments,
} from '@/api/long-video-generation'
import { uploadAsset, type UploadedAsset } from '@/api/visual-workbench'
import { VIDEO_GENERATION_FLOW_KEY } from '@/constants/video-generation'
import {
  resolveTemplatePosterUrl,
  resolveTemplatePreviewUrl,
} from '@/constants/video-template-previews'
import { resolveTemplateDefaultDigitalHumanId } from '@/constants/video-generation-local-assets'
import type { VideoGenerationFlow } from '@/composables/useVideoGenerationFlow'
import type { DigitalHuman, VideoTemplate } from '@/types/video-generation'
import type {
  LongVideoAudioPreview,
  LongVideoDraft,
  LongVideoNarrationSegment,
  LongVideoTask,
  LongVideoSlot,
} from '@/types/long-video-generation'

type StepKey = 'assets' | 'vehicle' | 'template' | 'script'
type UploadSlotKey = 'body' | 'frontInterior' | 'rearInterior'

type UploadSlot = {
  key: UploadSlotKey
  label: string
  hint: string
  accept: string
  purpose: 'car_exterior' | 'car_interior'
  kind: 'image' | 'video'
}

type UploadedSlot = {
  id: string
  file: File
  objectUrl: string
  asset: UploadedAsset | null
  status: 'local' | 'uploading' | 'uploaded' | 'failed'
  error?: string
}

const message = useMessage()
const videoFlow = inject<VideoGenerationFlow | null>(VIDEO_GENERATION_FLOW_KEY, null)

const currentStep = ref<StepKey>('assets')
const uploadedSlots = ref<Partial<Record<UploadSlotKey, UploadedSlot>>>({})
const bodyImageUploads = ref<UploadedSlot[]>([])
const vehicleInfo = ref({
  brandName: '',
  seriesName: '',
  fullModelName: '',
  year: '',
  mileage: '',
  price: '',
})
const sellingPointsText = ref('')
const selectedPreviewTemplate = ref<VideoTemplate | null>(null)
const previewDigitalHumanId = ref('')
const draft = ref<LongVideoDraft | null>(null)
const editableSegments = ref<LongVideoNarrationSegment[]>([])
const audioPreview = ref<LongVideoAudioPreview | null>(null)
const currentTask = ref<LongVideoTask | null>(null)
const activeAudioIndex = ref(0)
const audioElement = ref<HTMLAudioElement | null>(null)
const loadingAction = ref<'upload' | 'draft' | 'audio' | 'task' | null>(null)
let taskPollingTimer: ReturnType<typeof window.setInterval> | null = null

const uploadSlots: UploadSlot[] = [
  {
    key: 'body',
    label: '车身外观图',
    hint: '至少 1 张清晰车身图，用作 AI 视频统一场景参考',
    accept: 'image/jpeg,image/png,image/webp',
    purpose: 'car_exterior',
    kind: 'image',
  },
  {
    key: 'frontInterior',
    label: '前排内饰实拍',
    hint: '第一段用户实拍视频，后续会匹配画外音时长',
    accept: 'video/mp4,video/quicktime',
    purpose: 'car_interior',
    kind: 'video',
  },
  {
    key: 'rearInterior',
    label: '后排/细节实拍',
    hint: '第二段用户实拍视频，作为后半段实拍佐证',
    accept: 'video/mp4,video/quicktime',
    purpose: 'car_interior',
    kind: 'video',
  },
]

const stepItems: Array<{ key: StepKey; label: string }> = [
  { key: 'assets', label: '素材上传' },
  { key: 'vehicle', label: '车辆信息' },
  { key: 'template', label: '数字人与模板' },
  { key: 'script', label: '五段文案确认' },
]

const slotLabels: Record<LongVideoSlot, string> = {
  ai_video_1: 'AI 1 车外开场',
  user_video_1: '实拍 1 前排画外音',
  ai_video_2: 'AI 2 车内坐姿讲解',
  user_video_2: '实拍 2 后排画外音',
  ai_video_3: 'AI 3 车外收尾',
}

const selectedTemplate = computed(() =>
  videoFlow?.selectedTemplate.value?.type === 'single-car' ? videoFlow.selectedTemplate.value : null,
)
const selectedDigitalHuman = computed(() => videoFlow?.selectedDigitalHuman.value ?? null)
const digitalHumanList = computed(() => videoFlow?.digitalHumanList.value ?? [])
const templatesLoading = computed(() => videoFlow?.isLoading('bootstrap') ?? false)
const singleCarTemplates = computed(() =>
  (videoFlow?.templateList.value ?? []).filter((item) => item.type === 'single-car'),
)
const previewTemplatePosterUrl = computed(() =>
  selectedPreviewTemplate.value ? resolveTemplatePosterUrl(selectedPreviewTemplate.value) : null,
)
const previewTemplateVideoUrl = computed(() =>
  selectedPreviewTemplate.value ? resolveTemplatePreviewUrl(selectedPreviewTemplate.value) : null,
)
const isBusy = computed(() => Boolean(loadingAction.value))
const stepIndex = computed(() => stepItems.findIndex((item) => item.key === currentStep.value))
const activeAudioSegment = computed(() => audioPreview.value?.segments[activeAudioIndex.value] ?? null)
const totalAudioDuration = computed(() =>
  audioPreview.value ? formatDuration(audioPreview.value.totalDurationMs) : '0.0s',
)
const displayTaskProgress = computed(() => {
  const task = currentTask.value
  if (!task) return 0
  if (task.status === 'failed') return Math.min(task.progress ?? 0, 95)
  return Math.max(0, Math.min(100, task.progress ?? 0))
})
const taskStatusLabel = computed(() => {
  const status = currentTask.value?.status
  if (status === 'queued') return '排队中'
  if (status === 'generating_ai_video') return 'AI 视频生成中'
  if (status === 'rendering') return '拼接渲染中'
  if (status === 'completed') return '生成完成'
  if (status === 'failed') return '生成失败'
  return '未提交'
})
const hasRunningTask = computed(() =>
  Boolean(currentTask.value && !['completed', 'failed'].includes(currentTask.value.status)),
)
const primaryActionLabel = computed(() => {
  if (currentStep.value === 'template') return '生成五段文案'
  if (currentStep.value === 'script') {
    if (!audioPreview.value) return loadingAction.value === 'audio' ? '正在生成音频' : '生成五段音频'
    if (hasRunningTask.value) return '任务已提交'
    if (currentTask.value?.status === 'failed') return loadingAction.value === 'task' ? '正在重新提交' : '重新生成视频'
    return loadingAction.value === 'task' ? '正在提交任务' : '生成视频'
  }
  return '下一步'
})
const canContinueFromAssets = computed(() =>
  Boolean(
    bodyImageUploads.value.some((item) => item.asset?.assetId && item.status === 'uploaded') &&
      uploadedSlots.value.frontInterior?.asset?.assetId &&
      uploadedSlots.value.rearInterior?.asset?.assetId,
  ),
)
const canCreateDraft = computed(() =>
  Boolean(canContinueFromAssets.value && selectedTemplate.value && selectedDigitalHuman.value),
)

onMounted(() => {
  void videoFlow?.initializeFlow()
})

onUnmounted(() => {
  bodyImageUploads.value.forEach((item) => {
    if (item.objectUrl) URL.revokeObjectURL(item.objectUrl)
  })
  Object.values(uploadedSlots.value).forEach((item) => {
    if (item?.objectUrl) URL.revokeObjectURL(item.objectUrl)
  })
  stopTaskPolling()
})

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(size / 1024))} KB`
}

function formatDuration(durationMs: number) {
  return `${(durationMs / 1000).toFixed(1)}s`
}

function sellingPoints() {
  return sellingPointsText.value
    .split(/[\n,，、]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function syncEditableSegments(nextDraft: LongVideoDraft) {
  editableSegments.value = nextDraft.segments.map((segment) => ({ ...segment }))
}

function updateSegmentText(slot: LongVideoSlot, event: Event) {
  const target = event.target as HTMLTextAreaElement
  editableSegments.value = editableSegments.value.map((segment) =>
    segment.slot === slot ? { ...segment, narrationText: target.value } : segment,
  )
}

async function handleFileChange(slot: UploadSlot, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  if (slot.kind === 'image' && !file.type.startsWith('image/')) {
    message.error('请上传车身图片')
    return
  }
  if (slot.kind === 'video' && !file.type.startsWith('video/')) {
    message.error('请上传汽车内饰实拍视频')
    return
  }

  const previous = uploadedSlots.value[slot.key]
  if (previous?.objectUrl) URL.revokeObjectURL(previous.objectUrl)

  uploadedSlots.value = {
    ...uploadedSlots.value,
    [slot.key]: {
      file,
      id: `${slot.key}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      objectUrl: URL.createObjectURL(file),
      asset: null,
      status: 'uploading',
    },
  }

  loadingAction.value = 'upload'
  try {
    const asset = await uploadAsset(file, slot.purpose)
    uploadedSlots.value = {
      ...uploadedSlots.value,
      [slot.key]: {
        file,
        id:
          uploadedSlots.value[slot.key]?.id ??
          `${slot.key}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        objectUrl: uploadedSlots.value[slot.key]?.objectUrl ?? URL.createObjectURL(file),
        asset,
        status: 'uploaded',
      },
    }
    message.success(`${slot.label}已上传`)
  } catch (error) {
    uploadedSlots.value = {
      ...uploadedSlots.value,
      [slot.key]: {
        file,
        id:
          uploadedSlots.value[slot.key]?.id ??
          `${slot.key}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        objectUrl: uploadedSlots.value[slot.key]?.objectUrl ?? URL.createObjectURL(file),
        asset: null,
        status: 'failed',
        error: error instanceof Error ? error.message : '上传失败',
      },
    }
    message.error(error instanceof Error ? error.message : '上传失败，请重试')
  } finally {
    loadingAction.value = null
  }
}

async function handleBodyImagesChange(slot: UploadSlot, event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length) return

  const invalid = files.find((file) => !file.type.startsWith('image/'))
  if (invalid) {
    message.error('车身外观只支持上传图片')
    return
  }

  const pendingItems: UploadedSlot[] = files.map((file) => ({
    id: `${slot.key}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    file,
    objectUrl: URL.createObjectURL(file),
    asset: null,
    status: 'uploading',
  }))
  bodyImageUploads.value = [...bodyImageUploads.value, ...pendingItems]

  loadingAction.value = 'upload'
  const results = await Promise.allSettled(
    pendingItems.map(async (item) => ({
      id: item.id,
      asset: await uploadAsset(item.file, slot.purpose),
    })),
  )

  const assetById = new Map<string, UploadedAsset>()
  const failedIds = new Set<string>()
  for (const result of results) {
    if (result.status === 'fulfilled') {
      assetById.set(result.value.id, result.value.asset)
    } else {
      failedIds.add(pendingItems[results.indexOf(result)]?.id ?? '')
    }
  }

  bodyImageUploads.value = bodyImageUploads.value.map((item) => {
    const asset = assetById.get(item.id)
    if (asset) return { ...item, asset, status: 'uploaded' }
    if (failedIds.has(item.id)) return { ...item, status: 'failed', error: '上传失败' }
    return item
  })

  const successCount = assetById.size
  const failedCount = failedIds.size
  if (successCount > 0) message.success(`车身外观图已上传 ${successCount} 张`)
  if (failedCount > 0) message.error(`${failedCount} 张车身外观图上传失败，请删除后重试`)
  loadingAction.value = null
}

function removeUploadedFile(slot: UploadSlot) {
  const current = uploadedSlots.value[slot.key]
  if (current?.objectUrl) URL.revokeObjectURL(current.objectUrl)
  const next = { ...uploadedSlots.value }
  delete next[slot.key]
  uploadedSlots.value = next
}

function removeBodyImageUpload(id: string) {
  const target = bodyImageUploads.value.find((item) => item.id === id)
  if (target?.objectUrl) URL.revokeObjectURL(target.objectUrl)
  bodyImageUploads.value = bodyImageUploads.value.filter((item) => item.id !== id)
}

function chooseTemplate(template: VideoTemplate) {
  const defaultId =
    template.defaultDigitalHumanId ?? resolveTemplateDefaultDigitalHumanId(template.templateId) ?? ''
  previewDigitalHumanId.value = digitalHumanList.value.some((item) => item.id === defaultId)
    ? defaultId
    : digitalHumanList.value[0]?.id ?? ''
  videoFlow?.selectTemplate(template)
  const human = digitalHumanList.value.find((item) => item.id === previewDigitalHumanId.value)
  if (human) videoFlow?.selectDigitalHuman(human)
}

function openTemplatePreview(template: VideoTemplate) {
  selectedPreviewTemplate.value = template
  const defaultId =
    selectedTemplate.value?.templateId === template.templateId
      ? selectedDigitalHuman.value?.id ?? ''
      : template.defaultDigitalHumanId ?? resolveTemplateDefaultDigitalHumanId(template.templateId) ?? ''
  previewDigitalHumanId.value = digitalHumanList.value.some((item) => item.id === defaultId)
    ? defaultId
    : digitalHumanList.value[0]?.id ?? ''
}

function closeTemplatePreview() {
  selectedPreviewTemplate.value = null
}

function handleTemplatePreviewVisibleChange(show: boolean) {
  if (!show) closeTemplatePreview()
}

function confirmTemplatePreview() {
  const template = selectedPreviewTemplate.value
  if (!template) return
  chooseTemplate(template)
  closeTemplatePreview()
}

function chooseDigitalHuman(human: DigitalHuman) {
  previewDigitalHumanId.value = human.id
  videoFlow?.selectDigitalHuman(human)
}

function goNext() {
  if (currentStep.value === 'assets') {
    if (!canContinueFromAssets.value) {
      message.error('请先上传 1 张车身图和 2 段内饰实拍视频')
      return
    }
    currentStep.value = 'vehicle'
    return
  }
  if (currentStep.value === 'vehicle') {
    currentStep.value = 'template'
    return
  }
  if (currentStep.value === 'template') {
    void handleCreateDraft()
  }
}

function goPrevious() {
  if (currentStep.value === 'script') currentStep.value = 'template'
  else if (currentStep.value === 'template') currentStep.value = 'vehicle'
  else if (currentStep.value === 'vehicle') currentStep.value = 'assets'
}

async function handleCreateDraft() {
  if (!canCreateDraft.value || !selectedDigitalHuman.value) {
    message.error('请先选择模板和数字人')
    return
  }
  const bodyAssetIds = bodyImageUploads.value
    .map((item) => item.asset?.assetId)
    .filter((assetId): assetId is string => Boolean(assetId))
  const frontVideoAssetId = uploadedSlots.value.frontInterior?.asset?.assetId
  const rearVideoAssetId = uploadedSlots.value.rearInterior?.asset?.assetId
  if (!bodyAssetIds.length || !frontVideoAssetId || !rearVideoAssetId) {
    message.error('素材还没有上传完成')
    return
  }

  loadingAction.value = 'draft'
  try {
    const nextDraft = await createLongVideoDraft({
      vehicleImageAssetIds: bodyAssetIds,
      interiorVideoAssetIds: [frontVideoAssetId, rearVideoAssetId],
      digitalHumanId: selectedDigitalHuman.value.id,
      vehicleInfo: { ...vehicleInfo.value },
      sellingPoints: sellingPoints(),
      language: 'Chinese',
    })
    draft.value = nextDraft
    syncEditableSegments(nextDraft)
    audioPreview.value = null
    currentTask.value = null
    activeAudioIndex.value = 0
    currentStep.value = 'script'
    message.success('五段文案已生成，请确认')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '长视频文案生成失败')
  } finally {
    loadingAction.value = null
  }
}

async function handleCreateAudioPreview() {
  if (!draft.value) return
  if (editableSegments.value.some((segment) => !segment.narrationText.trim())) {
    message.error('五段文案不能为空')
    return
  }

  loadingAction.value = 'audio'
  try {
    const updatedDraft = await updateLongVideoDraftSegments(draft.value.draftId, {
      segments: editableSegments.value.map((segment) => ({
        slot: segment.slot,
        narrationText: segment.narrationText.trim(),
      })),
    })
    draft.value = updatedDraft
    syncEditableSegments(updatedDraft)
    const preview = await createLongVideoAudioPreview(updatedDraft.draftId)
    audioPreview.value = preview
    currentTask.value = null
    activeAudioIndex.value = 0
    message.success('五段独立音频已生成')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '音频生成失败')
  } finally {
    loadingAction.value = null
  }
}

async function handleCreateTask() {
  if (!draft.value || !audioPreview.value) return
  loadingAction.value = 'task'
  try {
    currentTask.value = await createLongVideoTask(draft.value.draftId, {
      audioPreviewId: audioPreview.value.audioPreviewId,
    })
    startTaskPolling(currentTask.value.taskId)
    message.success('长视频生成任务已提交')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '长视频任务提交失败')
  } finally {
    loadingAction.value = null
  }
}

function handlePrimaryStepAction() {
  if (currentStep.value === 'script') {
    if (audioPreview.value) {
      void handleCreateTask()
      return
    }
    void handleCreateAudioPreview()
    return
  }
  goNext()
}

function stopTaskPolling() {
  if (taskPollingTimer) {
    window.clearInterval(taskPollingTimer)
    taskPollingTimer = null
  }
}

function startTaskPolling(taskId: string) {
  stopTaskPolling()
  taskPollingTimer = window.setInterval(() => {
    void refreshTask(taskId)
  }, 8000)
  void refreshTask(taskId)
}

async function refreshTask(taskId: string) {
  try {
    const task = await getLongVideoTask(taskId)
    currentTask.value = task
    if (['completed', 'failed'].includes(task.status)) {
      stopTaskPolling()
    }
  } catch (error) {
    console.warn('long video task polling failed', error)
  }
}

function openEditor() {
  const url = currentTask.value?.editorProjectUrl
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

async function playAllAudio() {
  if (!audioPreview.value?.segments.length || !audioElement.value) return
  if (audioElement.value.paused) {
    await audioElement.value.play()
  } else {
    audioElement.value.pause()
  }
}

function playAudioSegment(index: number) {
  activeAudioIndex.value = index
  requestAnimationFrame(() => {
    void audioElement.value?.play()
  })
}

function handleAudioEnded() {
  const segments = audioPreview.value?.segments ?? []
  if (activeAudioIndex.value < segments.length - 1) {
    activeAudioIndex.value += 1
    requestAnimationFrame(() => {
      void audioElement.value?.play()
    })
  }
}
</script>

<template>
  <section class="long-video-workflow">
    <main class="workflow-grid">
      <section class="primary-panel">
        <header class="page-head">
          <div>
            <p>长视频生成</p>
            <h1>单车介绍长视频</h1>
            <span>上传素材、填写车辆信息、确认五段文案后生成长视频。</span>
          </div>
          <div class="head-meta">
            <strong>AI / 实拍 / AI / 实拍 / AI</strong>
            <span>5 段固定顺序</span>
          </div>
        </header>

        <nav class="step-nav" aria-label="长视频生成步骤">
          <button
            v-for="(step, index) in stepItems"
            :key="step.key"
            type="button"
            :class="{ 'is-active': currentStep === step.key, 'is-done': index < stepIndex }"
            @click="currentStep = step.key"
          >
            <span>{{ index + 1 }}</span>
            {{ step.label }}
          </button>
        </nav>

        <div class="step-scroll">
          <template v-if="currentStep === 'assets'">
          <header class="section-head">
            <h2>上传素材</h2>
            <p>上传 1 张车身外观图和 2 段汽车内饰实拍视频，素材会用于 AI 生成和实拍拼接。</p>
          </header>
          <div class="upload-grid upload-grid--left">
            <label
              v-for="slot in uploadSlots"
              :key="slot.key"
              class="upload-card"
              :class="{
                'is-ready':
                  slot.key === 'body'
                    ? bodyImageUploads.some((item) => item.status === 'uploaded')
                    : uploadedSlots[slot.key]?.status === 'uploaded',
                'is-multiple': slot.key === 'body',
              }"
            >
              <input
                type="file"
                :accept="slot.accept"
                :multiple="slot.key === 'body'"
                :disabled="isBusy"
                @change="
                  slot.key === 'body'
                    ? handleBodyImagesChange(slot, $event)
                    : handleFileChange(slot, $event)
                "
              />
              <template v-if="slot.key === 'body' && bodyImageUploads.length">
                <div class="body-image-grid">
                  <figure
                    v-for="item in bodyImageUploads"
                    :key="item.id"
                    :class="{ 'is-failed': item.status === 'failed' }"
                  >
                    <img :src="item.objectUrl" :alt="item.file.name" />
                    <button
                      type="button"
                      :aria-label="`删除${item.file.name}`"
                      @click.prevent="removeBodyImageUpload(item.id)"
                    >
                      <Icon icon="mdi:close" />
                    </button>
                    <figcaption>{{ item.status === 'uploading' ? '上传中' : item.status === 'uploaded' ? '已入库' : '失败' }}</figcaption>
                  </figure>
                </div>
                <div class="upload-card__body">
                  <strong>{{ slot.label }}</strong>
                  <span>已添加 {{ bodyImageUploads.length }} 张，点击继续追加</span>
                  <small>至少 1 张，支持多选上传</small>
                </div>
              </template>
              <template v-else-if="slot.key !== 'body' && uploadedSlots[slot.key]">
                <div class="upload-preview">
                  <video
                    v-if="slot.kind === 'video'"
                    :src="uploadedSlots[slot.key]?.objectUrl"
                    controls
                    preload="metadata"
                  />
                  <img v-else :src="uploadedSlots[slot.key]?.objectUrl" :alt="slot.label" />
                </div>
                <div class="upload-card__body">
                  <strong>{{ slot.label }}</strong>
                  <span>{{ uploadedSlots[slot.key]?.file.name }}</span>
                  <small>{{ formatFileSize(uploadedSlots[slot.key]?.file.size ?? 0) }}</small>
                  <em v-if="uploadedSlots[slot.key]?.status === 'uploading'">上传中</em>
                  <em v-else-if="uploadedSlots[slot.key]?.status === 'uploaded'">已入库</em>
                  <em v-else class="is-error">上传失败</em>
                </div>
                <button type="button" @click.prevent="removeUploadedFile(slot)">移除</button>
              </template>
              <template v-else>
                <Icon :icon="slot.kind === 'video' ? 'mdi:file-video-plus' : 'mdi:image-plus'" />
                <div class="upload-card__body">
                  <strong>{{ slot.label }}</strong>
                  <span>{{ slot.hint }}</span>
                </div>
              </template>
            </label>
          </div>
          </template>

          <template v-else-if="currentStep === 'vehicle'">
          <header class="section-head">
            <h2>车辆信息</h2>
            <p>这里的信息会进入全片文案，不确定的字段可以留空，后端会避免编造车况。</p>
          </header>
          <div class="vehicle-form">
            <label>
              <span>品牌</span>
              <input v-model="vehicleInfo.brandName" type="text" placeholder="例如 本田" />
            </label>
            <label>
              <span>车系</span>
              <input v-model="vehicleInfo.seriesName" type="text" placeholder="例如 雅阁" />
            </label>
            <label class="is-wide">
              <span>完整车型</span>
              <input
                v-model="vehicleInfo.fullModelName"
                type="text"
                placeholder="例如 2016款 本田雅阁 2.0L"
              />
            </label>
            <label>
              <span>年款</span>
              <input v-model="vehicleInfo.year" type="text" placeholder="例如 2016" />
            </label>
            <label>
              <span>里程</span>
              <input v-model="vehicleInfo.mileage" type="text" placeholder="例如 8万公里" />
            </label>
            <label>
              <span>价格</span>
              <input v-model="vehicleInfo.price" type="text" placeholder="例如 到店详谈" />
            </label>
            <label class="is-wide">
              <span>卖点提示</span>
              <textarea
                v-model="sellingPointsText"
                rows="4"
                placeholder="一行一个卖点，例如：外观成色好&#10;内饰干净&#10;家用空间够"
              />
            </label>
          </div>
          </template>

          <template v-else-if="currentStep === 'template'">
          <header class="section-head">
            <h2>确认模板与数字人</h2>
            <p>请在右侧选择单车介绍模板和数字人，系统会使用所选数字人的后端预设音色生成五段音频。</p>
          </header>
          <div class="selection-confirm">
            <article :class="{ 'is-ready': Boolean(selectedTemplate) }">
              <Icon :icon="selectedTemplate ? 'mdi:check-circle-outline' : 'mdi:view-grid-outline'" />
              <div>
                <strong>{{ selectedTemplate?.title ?? '未选择模板' }}</strong>
                <p>{{ selectedTemplate ? `${selectedTemplate.styleLabel} / ${selectedTemplate.outputRatio}` : '在右侧模板区选择一个单车介绍模板' }}</p>
              </div>
            </article>
            <article :class="{ 'is-ready': Boolean(selectedDigitalHuman) }">
              <Icon :icon="selectedDigitalHuman ? 'mdi:check-circle-outline' : 'mdi:account-outline'" />
              <div>
                <strong>{{ selectedDigitalHuman?.name ?? '未选择数字人' }}</strong>
                <p>{{ draft?.voice.label ?? '文案生成后自动读取该数字人的预设音色' }}</p>
              </div>
            </article>
          </div>
          </template>

          <template v-else>
          <header class="section-head">
            <h2>五段文案确认</h2>
            <p>这 5 段会分别生成 MiniMax 音频；播放时前端用一个播放器按顺序播完。</p>
          </header>
          <div v-if="!draft" class="empty-state">
            <Icon icon="mdi:text-box-search-outline" />
            <span>请先生成长视频文案</span>
          </div>
          <div v-else class="script-list">
            <article v-for="segment in editableSegments" :key="segment.slot" class="script-card">
              <header>
                <strong>{{ slotLabels[segment.slot] }}</strong>
                <span>{{ segment.targetDurationSeconds }}s 目标</span>
              </header>
              <textarea
                rows="4"
                :value="segment.narrationText"
                @input="updateSegmentText(segment.slot, $event)"
              />
              <footer>
                <span>承接：{{ segment.enterCue }}</span>
                <span>引出：{{ segment.exitCue }}</span>
              </footer>
            </article>
          </div>
          <section v-if="audioPreview" class="audio-card audio-card--inline">
            <header>
              <h2>音频预览</h2>
              <span>总时长 {{ totalAudioDuration }}</span>
            </header>
            <audio
              ref="audioElement"
              :src="activeAudioSegment?.audioUrl"
              controls
              @ended="handleAudioEnded"
            />
            <button type="button" class="primary-action" @click="playAllAudio">
              <Icon icon="mdi:play-circle-outline" />
              顺序播放五段音频
            </button>
            <div class="audio-segments">
              <button
                v-for="(segment, index) in audioPreview.segments"
                :key="segment.slot"
                type="button"
                :class="{ 'is-active': index === activeAudioIndex }"
                @click="playAudioSegment(index)"
              >
                <span>{{ slotLabels[segment.slot] }}</span>
                <small>{{ formatDuration(segment.durationMs) }}</small>
              </button>
            </div>
          </section>
          </template>

          <div v-if="currentTask" class="inline-task-status" :class="`is-${currentTask.status}`">
          <div class="inline-task-status__head">
            <strong>{{ taskStatusLabel }}</strong>
            <span>{{ displayTaskProgress }}%</span>
          </div>
          <div class="inline-task-status__bar" role="progressbar" :aria-valuenow="displayTaskProgress" aria-valuemin="0" aria-valuemax="100">
            <span :style="{ width: `${displayTaskProgress}%` }" />
          </div>
          <div
            v-if="currentTask.status === 'completed' && currentTask.resultUrl"
            class="final-video-preview"
          >
            <video :src="currentTask.resultUrl" controls playsinline preload="metadata" />
          </div>
          <p v-if="currentTask.status === 'failed'">
            {{ currentTask.errorMessage || '长视频生成失败，请稍后重试。' }}
          </p>
          <div v-if="currentTask.resultUrl || currentTask.editorProjectUrl" class="inline-task-status__actions">
            <a v-if="currentTask.resultUrl" :href="currentTask.resultUrl" target="_blank" rel="noreferrer">
              新窗口查看
            </a>
            <button
              v-if="currentTask.editorProjectUrl"
              type="button"
              class="secondary-action"
              @click="openEditor"
            >
              进入剪辑
            </button>
          </div>
        </div>
        </div>

        <footer class="step-action-bar">
          <button
            type="button"
            class="secondary-action"
            :disabled="currentStep === 'assets' || isBusy"
            @click="goPrevious"
          >
            上一步
          </button>
          <button
            type="button"
            class="primary-action"
            :disabled="isBusy || (currentStep === 'script' && (!draft || hasRunningTask))"
            @click="handlePrimaryStepAction"
          >
            <Icon
              :icon="
                loadingAction === 'draft' || loadingAction === 'audio' || loadingAction === 'task'
                  ? 'mdi:loading'
                  : currentStep === 'script' && audioPreview
                    ? 'mdi:movie-check-outline'
                    : currentStep === 'script'
                      ? 'mdi:waveform'
                      : 'mdi:arrow-right'
              "
              :class="{ 'is-spinning': loadingAction === 'draft' || loadingAction === 'audio' || loadingAction === 'task' }"
            />
            {{ primaryActionLabel }}
          </button>
        </footer>
      </section>

      <aside class="side-panel">
        <section class="template-resource-card">
          <header>
            <h2>模板</h2>
            <span>点击预览</span>
          </header>
          <div v-if="templatesLoading && !singleCarTemplates.length" class="empty-state is-compact">
            <Icon icon="mdi:loading" class="is-spinning" />
            <span>正在加载模板</span>
          </div>
          <div v-else class="template-grid">
            <button
              v-for="template in singleCarTemplates"
              :key="template.templateId"
              type="button"
              class="template-card"
              :class="{ 'is-selected': selectedTemplate?.templateId === template.templateId }"
              @click="openTemplatePreview(template)"
            >
              <img
                v-if="resolveTemplatePosterUrl(template)"
                :src="resolveTemplatePosterUrl(template)!"
                :alt="template.title"
              />
              <video
                v-else-if="resolveTemplatePreviewUrl(template)"
                :src="resolveTemplatePreviewUrl(template)!"
                muted
                preload="metadata"
              />
              <span>{{ template.title }}</span>
              <small>{{ template.styleLabel }} / {{ template.outputRatio }}</small>
            </button>
          </div>
        </section>

        <section class="human-card">
          <h2>数字人</h2>
          <div class="human-grid">
            <button
              v-for="human in digitalHumanList"
              :key="human.id"
              type="button"
              :class="{ 'is-selected': selectedDigitalHuman?.id === human.id }"
              @click="chooseDigitalHuman(human)"
            >
              <img v-if="human.previewUrl" :src="human.previewUrl" :alt="human.name" />
              <Icon v-else icon="mdi:account-outline" />
              <span>{{ human.name }}</span>
            </button>
          </div>
        </section>

        <section class="summary-card">
          <h2>当前选择</h2>
          <dl>
            <div>
              <dt>模板</dt>
              <dd>{{ selectedTemplate?.title ?? '未选择' }}</dd>
            </div>
            <div>
              <dt>数字人</dt>
              <dd>{{ selectedDigitalHuman?.name ?? '未选择' }}</dd>
            </div>
            <div>
              <dt>预设音色</dt>
              <dd>{{ draft?.voice.label ?? '生成文案后读取' }}</dd>
            </div>
            <div>
              <dt>预计 AI 视频</dt>
              <dd>{{ draft?.estimatedAiSeconds ?? 0 }}s</dd>
            </div>
          </dl>
        </section>

      </aside>
    </main>

    <NModal
      v-if="selectedPreviewTemplate"
      :show="true"
      to="body"
      :mask-closable="true"
      transform-origin="center"
      @update:show="handleTemplatePreviewVisibleChange"
    >
      <div class="lv-preview-dialog">
        <header class="lv-preview-dialog__head">
          <h3>{{ selectedPreviewTemplate.title }}</h3>
          <button type="button" aria-label="关闭" @click="closeTemplatePreview">
            <Icon icon="mdi:close" />
          </button>
        </header>
        <div class="lv-preview-dialog__body">
          <div class="lv-preview-dialog__media">
            <TemplatePreviewVideoPlayer
              v-if="previewTemplateVideoUrl"
              :key="selectedPreviewTemplate.templateId"
              :src="previewTemplateVideoUrl"
              :poster="previewTemplatePosterUrl ?? undefined"
              :template-id="selectedPreviewTemplate.templateId"
            />
            <img
              v-else-if="previewTemplatePosterUrl"
              :src="previewTemplatePosterUrl"
              :alt="selectedPreviewTemplate.title"
            />
            <div v-else class="lv-preview-dialog__empty">
              <Icon icon="mdi:movie-open-outline" />
            </div>
          </div>
          <aside class="lv-preview-dialog__side">
            <div>
              <span>{{ selectedPreviewTemplate.typeLabel }}</span>
              <span>{{ selectedPreviewTemplate.styleLabel }}</span>
              <span>{{ selectedPreviewTemplate.outputRatio }}</span>
            </div>
            <p v-if="selectedPreviewTemplate.previewSubtitle">
              {{ selectedPreviewTemplate.previewSubtitle }}
            </p>
            <button type="button" class="primary-action" @click="confirmTemplatePreview">
              确认使用此模板
            </button>
          </aside>
        </div>
      </div>
    </NModal>
  </section>
</template>

<style scoped lang="scss">
.long-video-workflow {
  --lv-primary: #2563eb;
  --lv-primary-soft: #eff6ff;
  --lv-panel: var(--workspace-panel, var(--app-surface));
  --lv-surface: var(--workspace-panel-soft, var(--app-surface-soft));
  --lv-border: var(--workspace-line, var(--app-border));
  --lv-text: var(--workspace-text, var(--app-text));
  --lv-muted: var(--workspace-text-secondary, var(--app-text-soft));

  display: flex;
  min-height: 100%;
  height: 100%;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  color: var(--lv-text);
}

.primary-panel,
.side-panel > section {
  border: 1px solid var(--lv-border);
  border-radius: 14px;
  background: var(--lv-panel);
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--lv-border);
}

.page-head p,
.section-head p,
.summary-card dt,
.asset-readiness p,
.selection-confirm p {
  margin: 0;
  color: var(--lv-muted);
  font-size: 13px;
  font-weight: 700;
}

.page-head h1,
.section-head h2,
.side-panel h2 {
  margin: 4px 0;
}

.page-head span,
.head-meta span {
  color: var(--lv-muted);
  font-size: 13px;
}

.head-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: right;
}

.step-nav {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--lv-border);
}

.step-nav button,
.secondary-action,
.primary-action,
.template-card,
.human-grid button,
.audio-segments button {
  border: 1px solid var(--lv-border);
  background: var(--lv-panel);
  color: var(--lv-text);
  cursor: pointer;
  font: inherit;
}

.step-nav button {
  display: flex;
  height: 48px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 12px;
  font-weight: 800;
}

.step-nav span {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 50%;
  background: var(--lv-surface);
}

.step-nav button.is-active,
.step-nav button.is-done {
  border-color: var(--lv-primary);
  color: var(--lv-primary);
}

.workflow-grid {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: minmax(520px, 620px) minmax(640px, 1fr);
  gap: 16px;
}

.primary-panel {
  display: flex;
  min-width: 0;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
}

.step-scroll {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: 20px;
}

.section-head {
  margin-bottom: 16px;
}

.upload-grid,
.template-grid,
.asset-readiness,
.selection-confirm {
  display: grid;
  gap: 12px;
}

.upload-grid--left {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.asset-readiness article,
.selection-confirm article {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--lv-border);
  border-radius: 12px;
  background: var(--lv-surface);
}

.asset-readiness article.is-ready,
.selection-confirm article.is-ready {
  border-color: color-mix(in srgb, var(--lv-primary) 42%, var(--lv-border));
  background: color-mix(in srgb, var(--lv-primary) 8%, var(--lv-panel));
}

.asset-readiness article.is-failed {
  border-color: color-mix(in srgb, #dc2626 48%, var(--lv-border));
}

.asset-readiness__icon,
.selection-confirm article > svg {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 10px;
  background: var(--lv-panel);
  color: var(--lv-primary);
  font-size: 22px;
}

.selection-confirm article > svg {
  width: 42px;
  height: 42px;
}

.upload-card,
.template-card {
  display: flex;
  min-height: 240px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  border: 1px dashed var(--lv-border);
  border-radius: 12px;
  text-align: center;
}

.upload-card.is-multiple {
  min-height: 280px;
  align-items: stretch;
}

.body-image-grid {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 8px;
}

.body-image-grid figure {
  position: relative;
  min-width: 0;
  overflow: hidden;
  margin: 0;
  border-radius: 10px;
  background: var(--lv-surface);
}

.body-image-grid figure.is-failed {
  outline: 2px solid #dc2626;
}

.body-image-grid img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}

.body-image-grid button {
  position: absolute;
  top: 6px;
  right: 6px;
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
}

.body-image-grid figcaption {
  padding: 5px 6px;
  color: var(--lv-muted);
  font-size: 11px;
  font-weight: 800;
}

.side-panel .template-grid {
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.upload-card__body {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.upload-card input {
  display: none;
}

.upload-card > svg {
  color: var(--lv-primary);
  font-size: 36px;
}

.upload-card span,
.upload-card small,
.template-card small,
.script-card footer,
.audio-segments small {
  color: var(--lv-muted);
  font-size: 12px;
}

.upload-card.is-ready {
  border-style: solid;
  border-color: color-mix(in srgb, var(--lv-primary) 52%, var(--lv-border));
}

.upload-preview {
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 10px;
  background: var(--lv-surface);
}

.upload-preview img,
.upload-preview video,
.template-card img,
.template-card video,
.human-grid img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-card em {
  color: var(--lv-primary);
  font-size: 12px;
  font-style: normal;
  font-weight: 800;
}

.upload-card em.is-error {
  color: #dc2626;
}

.upload-card button {
  border: 0;
  background: transparent;
  color: #dc2626;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}

.vehicle-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.vehicle-form label,
.script-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vehicle-form label.is-wide {
  grid-column: 1 / -1;
}

.vehicle-form span {
  color: var(--lv-muted);
  font-size: 13px;
  font-weight: 800;
}

.vehicle-form input,
.vehicle-form textarea,
.script-card textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--lv-border);
  border-radius: 10px;
  background: var(--lv-surface);
  color: var(--lv-text);
  font: inherit;
}

.vehicle-form input {
  height: 44px;
  padding: 0 12px;
}

.vehicle-form textarea,
.script-card textarea {
  resize: vertical;
  padding: 12px;
  line-height: 1.6;
}

.template-card {
  min-height: 250px;
  overflow: hidden;
  border-style: solid;
}

.template-card.is-selected,
.human-grid button.is-selected,
.audio-segments button.is-active {
  border-color: var(--lv-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--lv-primary) 12%, transparent);
}

.template-card img,
.template-card video {
  height: 180px;
  border-radius: 10px;
}

.script-list {
  display: grid;
  gap: 12px;
}

.script-card {
  padding: 14px;
  border: 1px solid var(--lv-border);
  border-radius: 12px;
  background: var(--lv-surface);
}

.script-card header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.script-card header span {
  color: var(--lv-primary);
  font-size: 12px;
  font-weight: 800;
}

.script-card footer {
  display: grid;
  gap: 4px;
}

.side-panel {
  display: flex;
  min-width: 0;
  height: 100%;
  flex-direction: column;
  gap: 14px;
  overflow: auto;
}

.side-panel > section {
  padding: 16px;
}

.template-resource-card header,
.audio-card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.template-resource-card header span,
.audio-card header span {
  color: var(--lv-primary);
  font-size: 12px;
  font-weight: 800;
}

.summary-card dl {
  display: grid;
  gap: 10px;
  margin: 12px 0 0;
}

.summary-card div {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 10px;
}

.summary-card dd {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.human-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(108px, 1fr));
  gap: 10px;
}

.human-grid button {
  overflow: hidden;
  padding: 8px;
  border-radius: 10px;
  text-align: center;
}

.human-grid img,
.human-grid svg {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  background: var(--lv-surface);
}

.human-grid span {
  display: block;
  overflow: hidden;
  margin-top: 6px;
  font-size: 12px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audio-card {
  display: grid;
  gap: 12px;
}

.audio-card--inline {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid var(--lv-border);
  border-radius: 12px;
  background: var(--lv-surface);
}

.audio-card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.audio-card audio {
  width: 100%;
}

.audio-card.is-empty {
  place-items: center;
  min-height: 160px;
  color: var(--lv-muted);
  text-align: center;
}

.audio-card.is-empty svg {
  color: var(--lv-primary);
  font-size: 34px;
}

.audio-segments {
  display: grid;
  gap: 8px;
}

.audio-segments button {
  display: flex;
  min-height: 40px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 10px;
  border-radius: 9px;
}

.task-status {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--lv-primary-soft);
  color: var(--lv-primary);
}

.task-status small.is-error {
  color: #dc2626;
  font-weight: 800;
}

.task-status span,
.task-status small {
  font-size: 12px;
}

.empty-state {
  display: grid;
  min-height: 240px;
  place-items: center;
  align-content: center;
  gap: 10px;
  color: var(--lv-muted);
}

.empty-state.is-compact {
  min-height: 120px;
}

.is-spinning {
  animation: spin 0.9s linear infinite;
}

.step-action-bar {
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 20px;
  border-top: 1px solid var(--lv-border);
  background: color-mix(in srgb, var(--lv-panel) 96%, transparent);
  backdrop-filter: blur(12px);
}

.inline-task-status {
  display: grid;
  gap: 8px;
  margin-top: 16px;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--lv-primary) 28%, var(--lv-border));
  border-radius: 12px;
  background: var(--lv-primary-soft);
  color: var(--lv-primary);
}

.inline-task-status.is-failed {
  border-color: color-mix(in srgb, #dc2626 45%, var(--lv-border));
  background: color-mix(in srgb, #dc2626 9%, var(--lv-panel));
  color: #dc2626;
}

.inline-task-status__head,
.inline-task-status__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.inline-task-status__bar {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--lv-primary) 16%, #fff);
}

.inline-task-status__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: currentColor;
  transition: width 0.2s ease;
}

.final-video-preview {
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--lv-primary) 24%, var(--lv-border));
  border-radius: 12px;
  background: #050505;
}

.final-video-preview video {
  display: block;
  width: 100%;
  max-height: min(58vh, 680px);
  background: #050505;
  object-fit: contain;
}

.inline-task-status p {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
}

.secondary-action,
.primary-action {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  border-radius: 10px;
  font-weight: 800;
}

.primary-action {
  border-color: var(--lv-primary);
  background: var(--lv-primary);
  color: #fff;
}

.primary-action:disabled,
.secondary-action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.lv-preview-dialog {
  width: min(1120px, calc(100vw - 48px));
  overflow: hidden;
  border: 1px solid var(--lv-border, #d6e0ed);
  border-radius: 16px;
  background: var(--lv-panel, #ffffff);
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.24);
}

.lv-preview-dialog__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--lv-border, #d6e0ed);
}

.lv-preview-dialog__head h3 {
  margin: 0;
}

.lv-preview-dialog__head button {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid var(--lv-border, #d6e0ed);
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
}

.lv-preview-dialog__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 18px;
  padding: 18px;
}

.lv-preview-dialog__media {
  display: grid;
  min-height: 560px;
  place-items: center;
  overflow: hidden;
  border-radius: 14px;
  background: #050505;
}

.lv-preview-dialog__media img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.lv-preview-dialog__empty {
  color: #fff;
  font-size: 42px;
}

.lv-preview-dialog__side {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 14px;
}

.lv-preview-dialog__side div {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.lv-preview-dialog__side span {
  padding: 6px 9px;
  border-radius: 999px;
  background: var(--lv-primary-soft, #eff6ff);
  color: var(--lv-primary, #2563eb);
  font-size: 12px;
  font-weight: 800;
}

.lv-preview-dialog__side p {
  margin: 0;
  color: var(--lv-muted, #64748b);
  line-height: 1.65;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1180px) {
  .workflow-grid {
    grid-template-columns: minmax(440px, 520px) minmax(0, 1fr);
  }
}

@media (max-width: 1120px) {
  .workflow-grid {
    grid-template-columns: 1fr;
  }

  .side-panel {
    height: auto;
    overflow: visible;
  }
}

@media (max-width: 760px) {
  .page-head,
  .step-action-bar {
    align-items: stretch;
    flex-direction: column;
  }

  .head-meta {
    text-align: left;
  }

  .step-nav,
  .upload-grid,
  .template-grid,
  .vehicle-form {
    grid-template-columns: 1fr;
  }

  .side-panel .template-grid {
    grid-template-columns: 1fr;
  }

  .lv-preview-dialog__body {
    grid-template-columns: 1fr;
  }

  .lv-preview-dialog__media {
    min-height: 420px;
  }
}
</style>
