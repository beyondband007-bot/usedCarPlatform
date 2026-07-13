<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { NModal, NStep, NSteps, useMessage } from 'naive-ui'

import PreloadImage from '@/components/common/PreloadImage.vue'
import HoverPreviewVideo from '@/components/common/HoverPreviewVideo.vue'
import TemplatePreviewVideoPlayer from '@/components/business/workspace/TemplatePreviewVideoPlayer.vue'
import {
  createLongVideoAudioPreview,
  createLongVideoDraft,
  createLongVideoTask,
  getLongVideoTask,
  retryLongVideoTask,
  updateLongVideoDraftSegments,
} from '@/api/long-video-generation'
import { getVehicles, type VehicleLibraryMaterial, type VehicleRecord } from '@/api/vehicle-library'
import {
  normalizeVehicleInfo,
  queryVehicleByVinShowApi,
  recognizeVinFromImage,
  type VehicleBasicInfo,
} from '@/api/vehicle-info'
import {
  getRecentGenerationTasks,
  uploadAsset,
  type RecentGenerationTask,
  type UploadedAsset,
} from '@/api/visual-workbench'
import { validateArkImageFile, validateArkMaterialDimensions } from '@/utils/ark-media-validation'
import { validateVehicleLibraryVideo } from '@/utils/video-upload'
import { VIDEO_GENERATION_FLOW_KEY } from '@/constants/video-generation'
import {
  resolveTemplatePosterUrl,
  resolveTemplatePreviewUrl,
} from '@/constants/video-template-previews'
import { resolveTemplateDefaultDigitalHumanId } from '@/constants/video-generation-local-assets'
import {
  shortVideoTemplateCategories,
  shortVideoTemplateStyles,
  type ShortVideoTemplateCategory,
} from '@/constants/short-video-templates'
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
type LongVideoRightView = 'templates' | 'recent'
type UploadSlotKey = 'frontImage' | 'rearImage' | 'driverImage' | 'frontInterior' | 'rearInterior'
type AssetSourceMode = 'library' | 'upload'

const GENERATION_LOADING_VIDEO_URL = '/videos/generation-loading.mp4'
let hasRequestedGenerationLoadingVideoPreload = false

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
  file?: File
  objectUrl: string
  asset: UploadedAsset | null
  status: 'local' | 'uploading' | 'uploaded' | 'failed'
  source: AssetSourceMode
  error?: string
}

const message = useMessage()
const videoFlow = inject<VideoGenerationFlow | null>(VIDEO_GENERATION_FLOW_KEY, null)

const currentStep = ref<StepKey>('assets')
const maxReachedStepIndex = ref(0)
const assetSourceMode = ref<AssetSourceMode>('library')
const uploadedSlots = ref<Partial<Record<UploadSlotKey, UploadedSlot>>>({})
const libraryVehicles = ref<VehicleRecord[]>([])
const selectedLibraryVehicleId = ref('')
const libraryVehiclesLoading = ref(false)
const libraryVehiclesError = ref('')
const libraryVehicleSearchQuery = ref('')
const vehicleInfo = ref({
  vin: '',
  brandName: '',
  seriesName: '',
  fullModelName: '',
  year: '',
  mileage: '',
  price: '',
})
const vinLoading = ref(false)
const vinOcrLoading = ref(false)
const vinError = ref('')
const sellingPointsText = ref('')
const selectedPreviewTemplate = ref<VideoTemplate | null>(null)
const assetPreview = ref<{ title: string; url: string; kind: 'image' | 'video' } | null>(null)
const previewDigitalHumanId = ref('')
const humanPreviewModalVisible = ref(false)
const previewingDigitalHuman = ref<DigitalHuman | null>(null)
const enlargedHumanPreview = ref<{ label: string; url: string } | null>(null)
const draft = ref<LongVideoDraft | null>(null)
const editableSegments = ref<LongVideoNarrationSegment[]>([])
const audioPreview = ref<LongVideoAudioPreview | null>(null)
const currentTask = ref<LongVideoTask | null>(null)
const activeRightView = ref<LongVideoRightView>('templates')
const activeTemplateCategory = ref<ShortVideoTemplateCategory>('all')
const activeTemplateStyle = ref('all')
const templateSearchQuery = ref('')
const historyTasks = ref<RecentGenerationTask[]>([])
const historyLoading = ref(false)
const historyError = ref('')
const focusedTaskId = ref('')
const focusedLongVideoTask = ref<LongVideoTask | null>(null)
const retryingHistoryTaskId = ref('')
const activeAudioIndex = ref(0)
const audioElement = ref<HTMLAudioElement | null>(null)
const loadingAction = ref<'upload' | 'draft' | 'audio' | 'task' | null>(null)
let historyPollingTimer: ReturnType<typeof window.setInterval> | null = null

const uploadSlots: UploadSlot[] = [
  {
    key: 'frontImage',
    label: '车头图',
    hint: '上传清晰车头视角，用作 AI 开场外观参考',
    accept: 'image/jpeg,image/png,image/webp',
    purpose: 'car_exterior',
    kind: 'image',
  },
  {
    key: 'rearImage',
    label: '车尾图',
    hint: '上传清晰车尾视角，用作 AI 收尾外观参考',
    accept: 'image/jpeg,image/png,image/webp',
    purpose: 'car_exterior',
    kind: 'image',
  },
  {
    key: 'driverImage',
    label: '主驾驶位图',
    hint: '上传主驾驶或前排内饰图片，用作车内讲解参考',
    accept: 'image/jpeg,image/png,image/webp',
    purpose: 'car_interior',
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

const libraryMaterialSlotByUploadKey: Record<UploadSlotKey, VehicleLibraryMaterial['slotCode']> = {
  frontImage: 'front_image',
  rearImage: 'rear_image',
  driverImage: 'driver_image',
  frontInterior: 'front_row_video',
  rearInterior: 'rear_row_video',
}

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
const templateList = computed(() => videoFlow?.templateList.value ?? [])

const longVideoCategoryTypeMap: Record<Exclude<ShortVideoTemplateCategory, 'all'>, string> = {
  showroom: 'dealership',
  'single-car': 'single-car',
  'vehicle-ad': 'vehicle-ad',
}

const longVideoTemplateCategories = shortVideoTemplateCategories.filter(
  (category) => category.id === 'all' || category.id === 'single-car',
)

const filteredTemplates = computed(() => {
  const keyword = templateSearchQuery.value.trim().toLowerCase()

  return templateList.value.filter((item) => {
    if (item.type !== 'single-car') return false

    if (activeTemplateCategory.value !== 'all') {
      const mappedType = longVideoCategoryTypeMap[activeTemplateCategory.value]
      if (item.type !== mappedType) return false
    }

    if (activeTemplateStyle.value !== 'all' && item.style !== activeTemplateStyle.value) {
      return false
    }

    if (!keyword) return true

    const haystack = [item.title, item.typeLabel, item.styleLabel, item.stylePrompt]
      .join(' ')
      .toLowerCase()
    return haystack.includes(keyword)
  })
})
const previewTemplatePosterUrl = computed(() =>
  selectedPreviewTemplate.value ? resolveTemplatePosterUrl(selectedPreviewTemplate.value) : null,
)
const previewTemplateVideoUrl = computed(() =>
  selectedPreviewTemplate.value ? resolveTemplatePreviewUrl(selectedPreviewTemplate.value) : null,
)
const selectedTemplatePosterUrl = computed(() =>
  selectedTemplate.value ? resolveTemplatePosterUrl(selectedTemplate.value) : null,
)
const selectedTemplateVideoUrl = computed(() =>
  selectedTemplate.value ? resolveTemplatePreviewUrl(selectedTemplate.value) : null,
)
const activeHumanPreviewImages = computed(
  () => previewingDigitalHuman.value?.previewImages?.slice(0, 4) ?? [],
)
const isBusy = computed(() => Boolean(loadingAction.value))
const stepIndex = computed(() => stepItems.findIndex((item) => item.key === currentStep.value))
const workflowStepCurrent = computed(() => Math.max(stepIndex.value + 1, 1))
const canEnterStep = (index: number) => index <= maxReachedStepIndex.value
const filteredLibraryVehicles = computed(() => {
  const keyword = libraryVehicleSearchQuery.value.trim().toLowerCase()
  if (!keyword) return libraryVehicles.value

  return libraryVehicles.value.filter((vehicle) => {
    const haystack = [
      vehicle.vin,
      vehicle.brand,
      vehicle.series,
      vehicle.model,
      vehicle.modelName,
      vehicle.modelYear,
      vehicleTitle(vehicle),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(keyword)
  })
})
const activeAudioSegment = computed(() => audioPreview.value?.segments[activeAudioIndex.value] ?? null)
const totalAudioDuration = computed(() =>
  audioPreview.value ? formatDuration(audioPreview.value.totalDurationMs) : '0.0s',
)
const taskStatusLabel = computed(() => {
  const status = focusedLongVideoTask.value?.status ?? currentTask.value?.status
  if (status === 'queued') return '排队中'
  if (status === 'generating_ai_video') return 'AI 视频生成中'
  if (status === 'rendering') return '拼接渲染中'
  if (status === 'completed') return '生成完成'
  if (status === 'failed') return '生成失败'
  return '未提交'
})
const hasRunningTask = computed(() =>
  Boolean(
    currentStep.value === 'script' &&
      draft.value &&
      currentTask.value &&
      currentTask.value.draftId === draft.value.draftId &&
      !['completed', 'failed'].includes(currentTask.value.status),
  ),
)
const focusedTaskProgress = computed(() => {
  const task = focusedLongVideoTask.value
  if (!task) return 0
  if (task.status === 'failed') return Math.min(task.progress ?? 0, 95)
  return Math.max(0, Math.min(100, task.progress ?? 0))
})
const focusedTaskIsRunning = computed(() =>
  Boolean(focusedLongVideoTask.value && !['completed', 'failed'].includes(focusedLongVideoTask.value.status)),
)
const showRecentGeneratingView = computed(
  () =>
    activeRightView.value === 'recent' &&
    Boolean(
      focusedLongVideoTask.value &&
        (focusedTaskIsRunning.value || focusedLongVideoTask.value.status === 'failed'),
    ),
)
const generatingDescription = computed(() => {
  const status = focusedLongVideoTask.value?.status
  if (status === 'queued') return '任务排队中，请稍候。'
  if (status === 'generating_ai_video') return 'AI 片段生成中，通常需要几分钟。'
  if (status === 'rendering') return '正在拼接最终成片。'
  return '视频生成中，左侧可继续准备下一条素材。'
})
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
    uploadedSlots.value.frontImage?.asset?.assetId &&
      uploadedSlots.value.rearImage?.asset?.assetId &&
      uploadedSlots.value.driverImage?.asset?.assetId &&
      uploadedSlots.value.frontInterior?.asset?.assetId &&
      uploadedSlots.value.rearInterior?.asset?.assetId,
  ),
)
const hasVehicleInfo = computed(() =>
  Boolean(
    vehicleInfo.value.fullModelName.trim() ||
      vehicleInfo.value.brandName.trim() ||
      vehicleInfo.value.seriesName.trim(),
  ),
)
const canCreateDraft = computed(() =>
  Boolean(
    canContinueFromAssets.value &&
      hasVehicleInfo.value &&
      selectedTemplate.value &&
      selectedDigitalHuman.value,
  ),
)

onMounted(() => {
  void videoFlow?.initializeFlow()
  void loadLibraryVehicles()
  void loadHistoryTasks()
  preloadGenerationLoadingVideo()
})

function preloadGenerationLoadingVideo() {
  if (hasRequestedGenerationLoadingVideoPreload || typeof document === 'undefined') return
  hasRequestedGenerationLoadingVideoPreload = true
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'video'
  link.href = GENERATION_LOADING_VIDEO_URL
  document.head.appendChild(link)
}

watch(
  () => focusedLongVideoTask.value?.status,
  (status) => {
    if (status === 'completed' || status === 'failed') {
      void loadHistoryTasks()
    }
  },
)

onUnmounted(() => {
  dismissOverlayState()
  Object.values(uploadedSlots.value).forEach((item) => {
    cleanupUploadedSlot(item)
  })
  stopHistoryPolling()
})

function cleanupUploadedSlot(item?: UploadedSlot | null) {
  if (item?.source === 'upload' && item.objectUrl) URL.revokeObjectURL(item.objectUrl)
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(size / 1024))} KB`
}

function slotDisplayName(item?: UploadedSlot | null) {
  return item?.file?.name || item?.asset?.fileName || '车辆库素材'
}

function slotDisplaySize(item?: UploadedSlot | null) {
  return formatFileSize(item?.file?.size ?? item?.asset?.size ?? 0)
}

function openAssetPreview(slot: UploadSlot, item?: UploadedSlot | null) {
  const url = item?.objectUrl || item?.asset?.url || item?.asset?.thumbnailUrl || ''
  if (!url) return
  assetPreview.value = {
    title: `${slot.label} · ${slotDisplayName(item)}`,
    url,
    kind: slot.kind,
  }
}

function closeAssetPreview() {
  assetPreview.value = null
}

function handleAssetPreviewVisibleChange(show: boolean) {
  if (!show) closeAssetPreview()
}

function dismissOverlayState() {
  closeTemplatePreview()
  humanPreviewModalVisible.value = false
  previewingDigitalHuman.value = null
  enlargedHumanPreview.value = null
  closeAssetPreview()
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

async function loadLibraryVehicles() {
  libraryVehiclesLoading.value = true
  libraryVehiclesError.value = ''
  try {
    const result = await getVehicles({
      page: 1,
      pageSize: 20,
      sort: 'complete',
    })
    libraryVehicles.value = result.items
  } catch (error) {
    libraryVehiclesError.value = error instanceof Error ? error.message : '车辆库读取失败'
  } finally {
    libraryVehiclesLoading.value = false
  }
}

function findLibraryMaterial(vehicle: VehicleRecord, key: UploadSlotKey) {
  const slotCode = libraryMaterialSlotByUploadKey[key]
  return (
    (vehicle.materials ?? []).find(
      (item) => item.slotCode === slotCode && item.status === 'active',
    ) ?? null
  )
}

function getVehicleMissingSlotLabels(vehicle: VehicleRecord) {
  return uploadSlots
    .filter((slot) => !findLibraryMaterial(vehicle, slot.key))
    .map((slot) => slot.label)
}

function vehicleTitle(vehicle: VehicleRecord) {
  return (
    [vehicle.brand, vehicle.series, vehicle.modelYear, vehicle.model].filter(Boolean).join(' ') ||
    vehicle.modelName ||
    vehicle.vin ||
    '未命名车辆'
  )
}

function materialToUploadedSlot(material: VehicleLibraryMaterial, slot: UploadSlot): UploadedSlot {
  return {
    id: `library-${material.id}`,
    objectUrl: material.assetUrl || material.assetThumbnailUrl || '',
    asset: {
      assetId: material.assetId,
      purpose: slot.purpose,
      url: material.assetUrl || material.assetThumbnailUrl || '',
      thumbnailUrl: material.assetThumbnailUrl ?? null,
      fileName: material.fileName || slot.label,
      mimeType: material.assetMimeType || (slot.kind === 'video' ? 'video/mp4' : 'image/jpeg'),
      size: material.fileSize ?? 0,
    },
    status: 'uploaded',
    source: 'library',
  }
}

function fillVehicleInfoFromLibrary(vehicle: VehicleRecord) {
  vehicleInfo.value = {
    vin: vehicle.vin || '',
    brandName: vehicle.brand || '',
    seriesName: vehicle.series || '',
    fullModelName:
      vehicle.modelName ||
      [vehicle.modelYear, vehicle.brand, vehicle.series, vehicle.model].filter(Boolean).join(' '),
    year: vehicle.modelYear || '',
    mileage: vehicle.mileageKm ? `${vehicle.mileageKm}公里` : '',
    price: vehicle.salePrice ? `${vehicle.salePrice}万元` : '',
  }
}

function normalizeVinModelYear(year: string) {
  return year.match(/(?:19|20)\d{2}/)?.[0] ?? year.trim()
}

function fillVehicleInfoFromVin(vin: string, result: VehicleBasicInfo) {
  vehicleInfo.value = {
    ...vehicleInfo.value,
    vin,
    brandName: result.brandName || vehicleInfo.value.brandName,
    seriesName: result.seriesName || vehicleInfo.value.seriesName,
    fullModelName:
      result.modelName || result.fullModelName || vehicleInfo.value.fullModelName,
    year: normalizeVinModelYear(result.year) || vehicleInfo.value.year,
  }
}

function normalizeVinInput(event: Event) {
  vehicleInfo.value.vin = (event.target as HTMLInputElement).value.toUpperCase()
}

async function recognizeLongVideoVin(vinValue = vehicleInfo.value.vin) {
  const vin = vinValue.trim().toUpperCase()
  vinError.value = ''
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
    vinError.value = '请输入 17 位标准 VIN 码（不包含 I、O、Q）'
    return
  }

  vinLoading.value = true
  try {
    const result = normalizeVehicleInfo(await queryVehicleByVinShowApi(vin))
    fillVehicleInfoFromVin(vin, result)
    message.success('车辆信息已自动填充')
  } catch (error) {
    vinError.value = error instanceof Error ? error.message : 'VIN 查询失败，请稍后重试'
  } finally {
    vinLoading.value = false
  }
}

async function recognizeLongVideoVinImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  vinError.value = ''
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    vinError.value = '仅支持 JPG、JPEG 或 PNG 图片'
    return
  }
  if (file.size > 7 * 1024 * 1024) {
    vinError.value = 'VIN 图片大小不能超过 7MB'
    return
  }

  vinOcrLoading.value = true
  try {
    const vin = await recognizeVinFromImage(file)
    vehicleInfo.value.vin = vin
    await recognizeLongVideoVin(vin)
  } catch (error) {
    vinError.value = error instanceof Error ? error.message : 'VIN 图片识别失败'
  } finally {
    vinOcrLoading.value = false
  }
}

function clearUploadedSlots() {
  Object.values(uploadedSlots.value).forEach((item) => cleanupUploadedSlot(item))
  uploadedSlots.value = {}
  selectedLibraryVehicleId.value = ''
}

function switchAssetSourceMode(mode: AssetSourceMode) {
  if (assetSourceMode.value === mode) return
  clearUploadedSlots()
  resetFlowAfterAssetChange()
  assetSourceMode.value = mode
  if (mode !== 'library') {
    libraryVehicleSearchQuery.value = ''
  }
  if (mode === 'library' && !libraryVehicles.value.length) {
    void loadLibraryVehicles()
  }
}

function selectLibraryVehicle(vehicle: VehicleRecord) {
  const missing = getVehicleMissingSlotLabels(vehicle)
  if (missing.length) {
    message.error(`该车辆缺少：${missing.join('、')}`)
    return
  }

  for (const slot of uploadSlots) {
    const material = findLibraryMaterial(vehicle, slot.key)
    if (!material) continue
    const dimensionError = validateArkMaterialDimensions({
      width: material.width,
      height: material.height,
      mediaType: slot.kind === 'video' ? 'video' : 'image',
    })
    if (dimensionError) {
      message.error(`${slot.label}：${dimensionError}`)
      return
    }
  }

  const nextSlots: Partial<Record<UploadSlotKey, UploadedSlot>> = {}
  for (const slot of uploadSlots) {
    const material = findLibraryMaterial(vehicle, slot.key)
    if (material) nextSlots[slot.key] = materialToUploadedSlot(material, slot)
  }

  clearUploadedSlots()
  resetFlowAfterAssetChange()
  uploadedSlots.value = nextSlots
  selectedLibraryVehicleId.value = vehicle.id
  fillVehicleInfoFromLibrary(vehicle)
  message.success('已从车辆库带入车辆素材和车辆信息')
}

function openVehicleLibrary() {
  window.location.assign('/vehicle-library')
}

function syncEditableSegments(nextDraft: LongVideoDraft) {
  editableSegments.value = nextDraft.segments.map((segment) => ({ ...segment }))
}

function updateSegmentText(slot: LongVideoSlot, event: Event) {
  const target = event.target as HTMLTextAreaElement
  editableSegments.value = editableSegments.value.map((segment) =>
    segment.slot === slot ? { ...segment, narrationText: target.value } : segment,
  )
  // Any script change invalidates the already synthesized narration. Requiring a
  // fresh audio preview prevents submitting a video with stale voice-over text.
  if (audioPreview.value) {
    audioElement.value?.pause()
    audioPreview.value = null
    activeAudioIndex.value = 0
  }
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

  if (slot.kind === 'image') {
    const dimensionError = await validateArkImageFile(file)
    if (dimensionError) {
      message.error(`${slot.label}：${dimensionError}`)
      return
    }
  } else {
    const videoError = await validateVehicleLibraryVideo(file)
    if (videoError) {
      message.error(`${slot.label}：${videoError}`)
      return
    }
  }

  resetFlowAfterAssetChange()
  const previous = uploadedSlots.value[slot.key]
  cleanupUploadedSlot(previous)

  uploadedSlots.value = {
    ...uploadedSlots.value,
    [slot.key]: {
      file,
      id: `${slot.key}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      objectUrl: URL.createObjectURL(file),
      asset: null,
      status: 'uploading',
      source: 'upload',
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
        source: 'upload',
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
        source: 'upload',
        error: error instanceof Error ? error.message : '上传失败',
      },
    }
    message.error(error instanceof Error ? error.message : '上传失败，请重试')
  } finally {
    loadingAction.value = null
  }
}

function removeUploadedFile(slot: UploadSlot) {
  const current = uploadedSlots.value[slot.key]
  cleanupUploadedSlot(current)
  const next = { ...uploadedSlots.value }
  delete next[slot.key]
  uploadedSlots.value = next
  resetFlowAfterAssetChange()
}

function resolvePreviewDefaultDigitalHumanId(template: VideoTemplate) {
  const activeId =
    selectedTemplate.value?.templateId === template.templateId ? selectedDigitalHuman.value?.id ?? '' : ''
  if (activeId && digitalHumanList.value.some((item) => item.id === activeId)) {
    return activeId
  }

  const defaultId =
    template.defaultDigitalHumanId ?? resolveTemplateDefaultDigitalHumanId(template.templateId) ?? ''
  if (defaultId && digitalHumanList.value.some((item) => item.id === defaultId)) {
    return defaultId
  }

  return digitalHumanList.value[0]?.id ?? ''
}

function commitTemplateSelection(template: VideoTemplate, digitalHumanId: string) {
  videoFlow?.selectTemplate(template)

  const human = digitalHumanList.value.find((item) => item.id === digitalHumanId)
  if (human) videoFlow?.selectDigitalHuman(human)
}

function resolveTemplateCardSubtitle(template: VideoTemplate) {
  if (template.previewSubtitle) return template.previewSubtitle
  return [template.typeLabel, template.styleLabel].filter(Boolean).join(' · ')
}

function openTemplatePreview(template: VideoTemplate) {
  selectedPreviewTemplate.value = template
  previewDigitalHumanId.value = resolvePreviewDefaultDigitalHumanId(template)
}

function closeTemplatePreview() {
  selectedPreviewTemplate.value = null
  previewDigitalHumanId.value = ''
}

function handleTemplatePreviewVisibleChange(show: boolean) {
  if (!show) closeTemplatePreview()
}

function confirmTemplatePreview() {
  const template = selectedPreviewTemplate.value
  if (!template) return
  const human = digitalHumanList.value.find((item) => item.id === previewDigitalHumanId.value)
  if (!human) {
    message.error('请先选择数字人')
    return
  }
  commitTemplateSelection(template, human.id)
  closeTemplatePreview()
  message.success('已确认使用该模板')
}

function handleSelectPreviewDigitalHuman(human: DigitalHuman) {
  if (isBusy.value) return
  previewDigitalHumanId.value = human.id
  previewingDigitalHuman.value = human
  humanPreviewModalVisible.value = Boolean(human.previewImages?.length)
}

function openHumanPreviewImage(item: { label: string; url: string }) {
  enlargedHumanPreview.value = item
}

function closeEnlargedHumanPreview() {
  enlargedHumanPreview.value = null
}

function stepIndexByKey(step: StepKey) {
  return stepItems.findIndex((item) => item.key === step)
}

function advanceToStep(step: StepKey) {
  const nextIndex = stepIndexByKey(step)
  if (nextIndex < 0) return
  currentStep.value = step
  maxReachedStepIndex.value = Math.max(maxReachedStepIndex.value, nextIndex)
}

function handleStepNavClick(step: StepKey, index: number) {
  if (!canEnterStep(index) || isBusy.value) return
  currentStep.value = step
}

function handleStepsCurrentChange(nextCurrent: number) {
  const index = nextCurrent - 1
  const step = stepItems[index]
  if (!step) return
  handleStepNavClick(step.key, index)
}

function resetLeftPanelToStart() {
  maxReachedStepIndex.value = 0
  currentStep.value = 'assets'
  draft.value = null
  editableSegments.value = []
  audioPreview.value = null
  activeAudioIndex.value = 0
  clearUploadedSlots()
  vehicleInfo.value = {
    vin: '',
    brandName: '',
    seriesName: '',
    fullModelName: '',
    year: '',
    mileage: '',
    price: '',
  }
  vinError.value = ''
  sellingPointsText.value = ''
}

function formatTaskTime(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function historyRecentStatusLabel(item: RecentGenerationTask) {
  const status = String(item.uiStatus ?? item.status ?? '')
  if (status === 'generating' || status === 'processing') return '生成中'
  if (status === 'success') return '已完成'
  if (status === 'fail' || status === 'failed') return '失败'
  if (status === 'waiting' || status === 'queued' || status === 'queue') return '排队中'
  return '处理中'
}

function isRecentTaskRunning(item: RecentGenerationTask) {
  const status = String(item.uiStatus ?? item.status ?? '')
  return ['waiting', 'queued', 'queue', 'generating', 'processing'].includes(status)
}

function isRecentTaskFailed(item: RecentGenerationTask) {
  const status = String(item.uiStatus ?? item.status ?? '')
  return ['fail', 'failed'].includes(status)
}

async function loadHistoryTasks() {
  historyLoading.value = true
  historyError.value = ''
  try {
    const result = await getRecentGenerationTasks({
      moduleCode: 'long-video-generation',
      page: 1,
      pageSize: 30,
    })
    historyTasks.value = result.items
    if (historyTasks.value.some(isRecentTaskRunning) && !historyPollingTimer) {
      startHistoryPolling()
    }
  } catch (error) {
    historyError.value = error instanceof Error ? error.message : '历史记录加载失败'
  } finally {
    historyLoading.value = false
  }
}

function openTemplatesView() {
  activeRightView.value = 'templates'
}

function openRecentView() {
  activeRightView.value = 'recent'
  void loadHistoryTasks()
  if (focusedTaskId.value) {
    void refreshFocusedTask(focusedTaskId.value)
    if (focusedTaskIsRunning.value) {
      startHistoryPolling()
    }
  }
}

function resolveHistoryCoverUrl(item: RecentGenerationTask) {
  return item.thumbnail || item.previewImage || item.inputAssetThumbnailUrl || null
}

function resolveHistoryVideoUrl(item: RecentGenerationTask) {
  if (item.status !== 'success') return null
  const url = item.downloadUrl?.trim()
  return url || null
}

function shouldShowHistoryStatus(item: RecentGenerationTask) {
  const status = String(item.uiStatus ?? item.status ?? '')
  return status !== 'success'
}

async function focusHistoryTask(item: RecentGenerationTask) {
  focusedTaskId.value = item.taskId
  activeRightView.value = 'recent'
  await refreshFocusedTask(item.taskId)
  if (focusedTaskIsRunning.value) {
    startHistoryPolling()
  } else {
    stopHistoryPolling()
  }

  const videoUrl = focusedLongVideoTask.value?.resultUrl?.trim() || resolveHistoryVideoUrl(item)
  if (focusedLongVideoTask.value?.status === 'completed' && videoUrl) {
    assetPreview.value = {
      title: item.title || '长视频预览',
      url: videoUrl,
      kind: 'video',
    }
  } else if (focusedLongVideoTask.value?.status === 'failed') {
    message.error(focusedLongVideoTask.value.errorMessage || '长视频生成失败，请重新生成')
  }
}

async function retryHistoryTask(item: RecentGenerationTask) {
  if (retryingHistoryTaskId.value) return
  retryingHistoryTaskId.value = item.taskId
  try {
    const task = await retryLongVideoTask(item.taskId)
    currentTask.value = task
    focusedTaskId.value = task.taskId
    focusedLongVideoTask.value = task
    activeRightView.value = 'recent'
    await loadHistoryTasks()
    startHistoryPolling()
    message.success('已重新提交长视频任务')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '重新提交失败，请稍后重试')
  } finally {
    retryingHistoryTaskId.value = ''
  }
}

async function retryFocusedTask() {
  const task = focusedLongVideoTask.value
  if (!task || task.status !== 'failed' || retryingHistoryTaskId.value) return

  retryingHistoryTaskId.value = task.taskId
  try {
    const nextTask = await retryLongVideoTask(task.taskId)
    currentTask.value = nextTask
    focusedTaskId.value = nextTask.taskId
    focusedLongVideoTask.value = nextTask
    await loadHistoryTasks()
    startHistoryPolling()
    message.success('已重新提交长视频任务')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '重新提交失败，请稍后重试')
  } finally {
    retryingHistoryTaskId.value = ''
  }
}

function resetFlowAfterAssetChange() {
  maxReachedStepIndex.value = 0
  currentStep.value = 'assets'
  draft.value = null
  editableSegments.value = []
  audioPreview.value = null
  currentTask.value = null
  activeAudioIndex.value = 0
}

function goNext() {
  if (currentStep.value === 'assets') {
    if (!canContinueFromAssets.value) {
      message.error('请先上传车头图、车尾图、主驾驶位图和 2 段内饰实拍视频')
      return
    }
    advanceToStep('vehicle')
    return
  }
  if (currentStep.value === 'vehicle') {
    if (!hasVehicleInfo.value) {
      message.error('请填写车辆名称，或使用 VIN 查询自动填充')
      return
    }
    advanceToStep('template')
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
  const imageAssetIds = [
    uploadedSlots.value.frontImage?.asset?.assetId,
    uploadedSlots.value.rearImage?.asset?.assetId,
    uploadedSlots.value.driverImage?.asset?.assetId,
  ].filter((assetId): assetId is string => Boolean(assetId))
  const frontVideoAssetId = uploadedSlots.value.frontInterior?.asset?.assetId
  const rearVideoAssetId = uploadedSlots.value.rearInterior?.asset?.assetId
  if (imageAssetIds.length !== 3 || !frontVideoAssetId || !rearVideoAssetId) {
    message.error('素材还没有上传完成')
    return
  }

  loadingAction.value = 'draft'
  try {
    const nextDraft = await createLongVideoDraft({
      vehicleImageAssetIds: imageAssetIds,
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
    advanceToStep('script')
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
    const task = await createLongVideoTask(draft.value.draftId, {
      audioPreviewId: audioPreview.value.audioPreviewId,
    })
    currentTask.value = task
    focusedTaskId.value = task.taskId
    focusedLongVideoTask.value = task
    activeRightView.value = 'recent'
    resetLeftPanelToStart()
    void loadHistoryTasks()
    startHistoryPolling()
    message.success('长视频生成任务已提交，可在右侧查看进度')
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

function stopHistoryPolling() {
  if (historyPollingTimer) {
    window.clearInterval(historyPollingTimer)
    historyPollingTimer = null
  }
}

function startHistoryPolling() {
  stopHistoryPolling()
  historyPollingTimer = window.setInterval(() => {
    if (focusedTaskId.value) {
      void refreshFocusedTask(focusedTaskId.value)
    }
    const focusedRunning = Boolean(
      focusedLongVideoTask.value &&
        !['completed', 'failed'].includes(focusedLongVideoTask.value.status),
    )
    if (focusedRunning || historyTasks.value.some(isRecentTaskRunning)) {
      void loadHistoryTasks()
    } else {
      stopHistoryPolling()
    }
  }, 8000)
}

async function refreshFocusedTask(taskId: string) {
  try {
    const task = await getLongVideoTask(taskId)
    focusedLongVideoTask.value = task
    currentTask.value = task
    if (['completed', 'failed'].includes(task.status)) {
      stopHistoryPolling()
      void loadHistoryTasks()
    }
  } catch (error) {
    console.warn('long video focused task polling failed', error)
  }
}

function startAudioSegment(index: number) {
  const segments = audioPreview.value?.segments ?? []
  if (!segments[index]) return
  activeAudioIndex.value = index
  requestAnimationFrame(() => {
    const audio = audioElement.value
    if (!audio) return
    audio.currentTime = 0
    void audio.play().catch((error) => {
      console.warn('long video audio playback failed', error)
      message.error('音频暂时无法播放，请稍后重试')
    })
  })
}

function playAllAudio() {
  startAudioSegment(0)
}

function playAudioSegment(index: number) {
  startAudioSegment(index)
}

function handleAudioEnded() {
  const segments = audioPreview.value?.segments ?? []
  if (activeAudioIndex.value < segments.length - 1) {
    startAudioSegment(activeAudioIndex.value + 1)
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

        <NSteps
          class="workflow-steps"
          :current="workflowStepCurrent"
          size="small"
          aria-label="长视频生成步骤"
          @update:current="handleStepsCurrentChange"
        >
          <NStep
            v-for="(step, index) in stepItems"
            :key="step.key"
            :title="step.label"
            :disabled="!canEnterStep(index) || isBusy"
          />
        </NSteps>

        <div class="step-scroll">
          <template v-if="currentStep === 'assets'">
          <header class="section-head">
            <h2>上传素材</h2>
            <p>上传车头图、车尾图、主驾驶位图和 2 段汽车内饰实拍视频，素材会用于 AI 生成和实拍拼接。</p>
          </header>
          <div class="asset-source-tabs" aria-label="素材来源">
            <button
              type="button"
              :class="{ 'is-active': assetSourceMode === 'library' }"
              @click="switchAssetSourceMode('library')"
            >
              从车辆库选择
            </button>
            <button
              type="button"
              :class="{ 'is-active': assetSourceMode === 'upload' }"
              @click="switchAssetSourceMode('upload')"
            >
              本地上传
            </button>
          </div>

          <label v-if="assetSourceMode === 'library'" class="library-vehicle-search">
            <Icon icon="mdi:magnify" aria-hidden="true" />
            <input
              v-model="libraryVehicleSearchQuery"
              type="search"
              placeholder="搜索 VIN / 车辆名称"
              :disabled="libraryVehiclesLoading"
            />
          </label>

          <div v-if="assetSourceMode === 'library'" class="library-picker">
            <div class="library-picker__head">
              <div>
                <strong>选择车辆库素材</strong>
                <span>完整车辆可一键带入 5 个素材槽，并自动填入车辆信息。</span>
              </div>
              <button type="button" class="secondary-action" @click="loadLibraryVehicles">
                刷新
              </button>
            </div>
            <div v-if="libraryVehiclesLoading" class="library-empty">正在读取车辆库</div>
            <div v-else-if="libraryVehiclesError" class="library-empty is-error">
              {{ libraryVehiclesError }}
            </div>
            <div v-else-if="!libraryVehicles.length" class="library-empty">
              <span>车辆库还没有车辆素材</span>
              <button type="button" class="secondary-action" @click="openVehicleLibrary">
                去车辆库
              </button>
            </div>
            <div v-else-if="!filteredLibraryVehicles.length" class="library-empty">
              <span>未找到匹配车辆，请调整搜索关键词</span>
            </div>
            <div v-else class="library-vehicle-list">
              <article
                v-for="vehicle in filteredLibraryVehicles"
                :key="vehicle.id"
                class="library-vehicle-card"
                :class="{ 'is-selected': selectedLibraryVehicleId === vehicle.id }"
              >
                <img
                  v-if="vehicle.coverAsset?.thumbnailUrl || vehicle.coverAsset?.url"
                  :src="vehicle.coverAsset?.thumbnailUrl || vehicle.coverAsset?.url || ''"
                  :alt="vehicleTitle(vehicle)"
                />
                <div v-else class="library-vehicle-card__placeholder">
                  <Icon icon="mdi:car-outline" />
                </div>
                <div class="library-vehicle-card__body">
                  <strong>{{ vehicleTitle(vehicle) }}</strong>
                  <span>{{ vehicle.vin || '未填写 VIN' }}</span>
                  <small v-if="getVehicleMissingSlotLabels(vehicle).length">
                    缺：{{ getVehicleMissingSlotLabels(vehicle).join('、') }}
                  </small>
                  <small v-else>素材完整，可直接使用</small>
                </div>
                <button
                  type="button"
                  :class="getVehicleMissingSlotLabels(vehicle).length ? 'secondary-action' : 'primary-action'"
                  @click="
                    getVehicleMissingSlotLabels(vehicle).length
                      ? openVehicleLibrary()
                      : selectLibraryVehicle(vehicle)
                  "
                >
                  {{ getVehicleMissingSlotLabels(vehicle).length ? '去补充' : '使用这辆车' }}
                </button>
              </article>
            </div>

            <div v-if="canContinueFromAssets" class="selected-library-assets">
              <strong>已带入素材</strong>
              <div class="upload-grid upload-grid--left">
                <article
                  v-for="slot in uploadSlots"
                  :key="slot.key"
                  class="upload-card is-ready is-readonly"
                >
                  <button
                    type="button"
                    class="upload-preview"
                    :aria-label="`预览${slot.label}`"
                    @click="openAssetPreview(slot, uploadedSlots[slot.key])"
                  >
                    <video
                      v-if="slot.kind === 'video'"
                      :src="uploadedSlots[slot.key]?.objectUrl"
                      muted
                      preload="metadata"
                    />
                    <img v-else :src="uploadedSlots[slot.key]?.objectUrl" :alt="slot.label" />
                    <span class="upload-preview__hint">点击预览</span>
                  </button>
                  <div class="upload-card__body">
                    <strong>{{ slot.label }}</strong>
                    <span>{{ slotDisplayName(uploadedSlots[slot.key]) }}</span>
                    <small>{{ slotDisplaySize(uploadedSlots[slot.key]) }}</small>
                  </div>
                </article>
              </div>
            </div>
          </div>

          <div v-else class="upload-grid upload-grid--left">
            <label
              v-for="slot in uploadSlots"
              :key="slot.key"
              class="upload-card"
              :class="{
                'is-ready': uploadedSlots[slot.key]?.status === 'uploaded',
              }"
            >
              <input
                type="file"
                :accept="slot.accept"
                :disabled="isBusy"
                @change="handleFileChange(slot, $event)"
              />
              <template v-if="uploadedSlots[slot.key]">
                <button
                  type="button"
                  class="upload-preview"
                  :aria-label="`预览${slot.label}`"
                  @click.prevent="openAssetPreview(slot, uploadedSlots[slot.key])"
                >
                  <video
                    v-if="slot.kind === 'video'"
                    :src="uploadedSlots[slot.key]?.objectUrl"
                    muted
                    preload="metadata"
                  />
                  <img v-else :src="uploadedSlots[slot.key]?.objectUrl" :alt="slot.label" />
                  <span class="upload-preview__hint">点击预览</span>
                </button>
                <div class="upload-card__body">
                  <strong>{{ slot.label }}</strong>
                  <span>{{ slotDisplayName(uploadedSlots[slot.key]) }}</span>
                  <small>{{ slotDisplaySize(uploadedSlots[slot.key]) }}</small>
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

          <div class="lv-vin-panel">
            <div class="lv-vin-panel-head">
              <span class="lv-vin-panel-icon" aria-hidden="true">
                <Icon icon="mdi:barcode-scan" />
              </span>
              <div>
                <strong>VIN 智能识别</strong>
                <p>输入 17 位 VIN 或上传图片，自动填充下方车型信息</p>
              </div>
            </div>
            <div class="lv-vin-row">
              <label class="lv-vin-field">
                <span>VIN 码</span>
                <input
                  v-model="vehicleInfo.vin"
                  type="text"
                  maxlength="17"
                  placeholder="请输入 17 位 VIN"
                  :disabled="isBusy || vinLoading || vinOcrLoading"
                  @input="normalizeVinInput"
                  @keyup.enter="recognizeLongVideoVin()"
                />
              </label>
              <button
                type="button"
                class="lv-vin-query-btn"
                :disabled="isBusy || vinLoading || vinOcrLoading"
                @click="recognizeLongVideoVin()"
              >
                <Icon
                  :icon="vinLoading ? 'mdi:loading' : 'mdi:magnify'"
                  :class="{ 'is-spinning': vinLoading }"
                  aria-hidden="true"
                />
                {{ vinLoading ? '查询中' : '立即查询' }}
              </button>
            </div>
            <div class="lv-vin-secondary">
              <label
                class="lv-vin-image-btn"
                :class="{
                  'is-loading': vinOcrLoading,
                  'is-disabled': isBusy || vinLoading || vinOcrLoading,
                }"
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  :disabled="isBusy || vinLoading || vinOcrLoading"
                  @change="recognizeLongVideoVinImage"
                />
                <Icon
                  :icon="vinOcrLoading ? 'mdi:loading' : 'mdi:image-search-outline'"
                  :class="{ 'is-spinning': vinOcrLoading }"
                  aria-hidden="true"
                />
                {{ vinOcrLoading ? '识别并查询中' : '上传图片识别 VIN' }}
              </label>
              <span>支持 JPG、PNG，识别后自动查询车辆信息</span>
            </div>
            <p class="lv-vin-disclaimer">VIN 识别及车型信息由第三方数据服务提供，仅供参考。</p>
            <p v-if="vinError" class="lv-vin-error">{{ vinError }}</p>
          </div>

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
            <article class="selection-confirm__card selection-confirm__card--template" :class="{ 'is-ready': Boolean(selectedTemplate) }">
              <div class="selection-confirm__preview">
                <PreloadImage
                  v-if="selectedTemplatePosterUrl"
                  :src="selectedTemplatePosterUrl"
                  :alt="selectedTemplate?.title ?? '已选模板'"
                  fit="cover"
                />
                <video
                  v-else-if="selectedTemplateVideoUrl"
                  :src="selectedTemplateVideoUrl"
                  muted
                  preload="metadata"
                />
                <Icon v-else :icon="selectedTemplate ? 'mdi:check-circle-outline' : 'mdi:view-grid-outline'" />
              </div>
              <div class="selection-confirm__body">
                <strong>{{ selectedTemplate?.title ?? '未选择模板' }}</strong>
                <p>{{ selectedTemplate ? `${selectedTemplate.styleLabel} / ${selectedTemplate.outputRatio}` : '在右侧模板区选择一个单车介绍模板' }}</p>
              </div>
            </article>
            <article class="selection-confirm__card selection-confirm__card--human" :class="{ 'is-ready': Boolean(selectedDigitalHuman) }">
              <div class="selection-confirm__preview selection-confirm__preview--avatar">
                <PreloadImage
                  v-if="selectedDigitalHuman?.previewUrl"
                  :src="selectedDigitalHuman.previewUrl"
                  :alt="selectedDigitalHuman.name"
                  fit="cover"
                />
                <Icon v-else :icon="selectedDigitalHuman ? 'mdi:check-circle-outline' : 'mdi:account-outline'" />
              </div>
              <div class="selection-confirm__body">
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
              从头顺序播放五段音频
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

      <aside class="side-panel" aria-label="长视频右侧面板">
        <div class="lv-right-main-shell" aria-label="长视频辅助面板">
          <header class="lv-right-primary-tabs" role="tablist" aria-label="长视频视图">
            <button
              type="button"
              role="tab"
              class="lv-right-primary-tab"
              :class="{ 'is-active': activeRightView === 'recent' }"
              :aria-selected="activeRightView === 'recent'"
              @click="openRecentView"
            >
              最近生成
            </button>
            <button
              type="button"
              role="tab"
              class="lv-right-primary-tab"
              :class="{ 'is-active': activeRightView === 'templates' }"
              :aria-selected="activeRightView === 'templates'"
              @click="openTemplatesView"
            >
              模板库
            </button>
          </header>

          <section
            v-if="activeRightView === 'recent'"
            class="lv-right-recent-panel"
            :class="{ 'is-generating': showRecentGeneratingView }"
            aria-label="最近生成"
          >
            <section
              v-if="showRecentGeneratingView && focusedLongVideoTask"
              class="lv-right-generating"
              aria-live="polite"
            >
              <div class="lv-right-generating-visual" aria-hidden="true">
                <video
                  class="lv-right-generating-video"
                  :src="GENERATION_LOADING_VIDEO_URL"
                  autoplay
                  loop
                  muted
                  playsinline
                  preload="auto"
                />
              </div>
              <div class="lv-right-generating-copy">
                <p>长视频生成</p>
                <h2>{{ taskStatusLabel }}</h2>
                <span>{{ generatingDescription }}</span>
                <p v-if="focusedLongVideoTask.status === 'failed'" class="lv-right-generating-error">
                  {{ focusedLongVideoTask.errorMessage || '长视频生成失败，请稍后重试。' }}
                </p>
                <button
                  v-if="focusedLongVideoTask.status === 'failed'"
                  type="button"
                  class="lv-right-generating-retry"
                  :disabled="Boolean(retryingHistoryTaskId)"
                  @click="retryFocusedTask"
                >
                  {{ retryingHistoryTaskId === focusedLongVideoTask.taskId ? '重新提交中' : '重新生成' }}
                </button>
              </div>
              <div
                class="lv-right-generating-progress"
                role="progressbar"
                :aria-valuenow="focusedTaskProgress"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <span :style="{ width: `${Math.max(focusedTaskProgress, 8)}%` }" />
              </div>
            </section>

            <template v-else>
              <div v-if="historyLoading && !historyTasks.length" class="lv-right-empty">
                <Icon icon="mdi:loading" class="is-spinning" />
                <span>正在加载最近生成</span>
              </div>
              <div v-else-if="historyError && !historyTasks.length" class="lv-right-empty is-error">
                <span>{{ historyError }}</span>
              </div>
              <div v-else-if="!historyTasks.length" class="lv-right-empty">
                <Icon icon="mdi:video-off-outline" />
                <span>暂无最近生成记录</span>
              </div>
              <div v-else class="lv-right-template-grid lv-right-recent-grid">
                <article
                  v-for="item in historyTasks"
                  :key="item.taskId"
                  class="lv-right-recent-card is-clickable"
                  :class="{ 'is-selected': focusedTaskId === item.taskId }"
                  role="button"
                  tabindex="0"
                  @click="focusHistoryTask(item)"
                  @keydown.enter.prevent="focusHistoryTask(item)"
                >
                  <div class="lv-right-recent-card-media">
                    <video
                      v-if="resolveHistoryVideoUrl(item)"
                      class="lv-right-recent-card-cover lv-right-recent-card-cover--video"
                      :src="resolveHistoryVideoUrl(item)!"
                      :poster="resolveHistoryCoverUrl(item) || undefined"
                      muted
                      playsinline
                      preload="metadata"
                    />
                    <PreloadImage
                      v-else-if="resolveHistoryCoverUrl(item)"
                      class="lv-right-recent-card-cover"
                      :src="resolveHistoryCoverUrl(item)!"
                      :alt="item.title || '长视频'"
                      loading="lazy"
                      fit="cover"
                    />
                    <div v-else class="lv-right-recent-card-placeholder">
                      <Icon icon="mdi:video-off-outline" />
                    </div>
                    <span
                      v-if="shouldShowHistoryStatus(item)"
                      class="lv-right-recent-card-status"
                      :class="{ 'is-running': isRecentTaskRunning(item) }"
                    >
                      {{ historyRecentStatusLabel(item) }}
                    </span>
                    <div class="lv-right-recent-card-body">
                      <strong>{{ item.title || '长视频生成任务' }}</strong>
                      <span>{{ formatTaskTime(item.createdAt) }}</span>
                      <button
                        v-if="isRecentTaskFailed(item)"
                        type="button"
                        class="lv-right-recent-card-retry"
                        :disabled="Boolean(retryingHistoryTaskId)"
                        @click.stop="retryHistoryTask(item)"
                      >
                        {{ retryingHistoryTaskId === item.taskId ? '重新提交中' : '重新生成' }}
                      </button>
                    </div>
                  </div>
                </article>
              </div>
            </template>
          </section>

          <section v-else class="lv-right-gallery" aria-label="长视频模板库">
            <header class="lv-gallery-toolbar">
              <div class="lv-gallery-tabs" role="tablist" aria-label="模板分类">
                <button
                  v-for="category in longVideoTemplateCategories"
                  :key="category.id"
                  type="button"
                  role="tab"
                  class="lv-gallery-tab"
                  :class="{ 'is-active': activeTemplateCategory === category.id }"
                  :aria-selected="activeTemplateCategory === category.id"
                  @click="activeTemplateCategory = category.id"
                >
                  {{ category.label }}
                </button>
              </div>

              <div class="lv-gallery-actions">
                <label class="lv-style-filter">
                  <span class="lv-style-filter-label">风格筛选</span>
                  <select v-model="activeTemplateStyle">
                    <option
                      v-for="style in shortVideoTemplateStyles"
                      :key="style.id"
                      :value="style.id"
                    >
                      {{ style.label }}
                    </option>
                  </select>
                  <Icon icon="mdi:chevron-down" aria-hidden="true" />
                </label>

                <label class="lv-search">
                  <Icon icon="mdi:magnify" aria-hidden="true" />
                  <input
                    v-model="templateSearchQuery"
                    type="search"
                    placeholder="搜索模板名称或关键词..."
                  />
                </label>
              </div>
            </header>

            <div v-if="templatesLoading && !templateList.length" class="lv-right-empty lv-right-empty--inline">
              <Icon icon="mdi:loading" class="is-spinning" />
              <span>正在加载模板库</span>
            </div>
            <div v-else-if="!filteredTemplates.length" class="lv-right-empty lv-right-empty--inline">
              <Icon icon="mdi:movie-search-outline" />
              <span>未找到匹配模板，请调整筛选条件</span>
            </div>
            <div v-else class="lv-right-template-grid">
              <article
                v-for="template in filteredTemplates"
                :key="template.templateId"
                class="lv-right-template-card"
                :class="{ 'is-selected': selectedTemplate?.templateId === template.templateId }"
                role="button"
                tabindex="0"
                :aria-label="`预览模板 ${template.title}`"
                @click="openTemplatePreview(template)"
                @keydown.enter.prevent="openTemplatePreview(template)"
                @keydown.space.prevent="openTemplatePreview(template)"
              >
                <div class="lv-right-template-media">
                  <PreloadImage
                    v-if="resolveTemplatePosterUrl(template)"
                    class="lv-right-template-cover lv-right-template-cover--poster"
                    :src="resolveTemplatePosterUrl(template)!"
                    :alt="template.title"
                    loading="lazy"
                    decoding="async"
                    fit="cover"
                  />
                  <HoverPreviewVideo
                    v-if="resolveTemplatePreviewUrl(template)"
                    class="lv-right-template-cover lv-right-template-cover--video"
                    :class="{
                      'is-poster-backed': Boolean(resolveTemplatePosterUrl(template)),
                    }"
                    :src="resolveTemplatePreviewUrl(template)!"
                    :alt="template.title"
                    lazy
                    lazy-root-margin="60px"
                    :defer-src-until-hover="Boolean(resolveTemplatePosterUrl(template))"
                    :preload="resolveTemplatePosterUrl(template) ? 'none' : 'metadata'"
                  />
                  <div
                    v-if="!resolveTemplatePreviewUrl(template) && !resolveTemplatePosterUrl(template)"
                    class="lv-right-template-cover lv-right-template-cover--placeholder"
                  >
                    <Icon icon="mdi:image-outline" />
                  </div>
                  <div class="lv-right-template-caption">
                    <strong class="lv-right-template-caption__title">{{ template.title }}</strong>
                    <div
                      v-if="resolveTemplateCardSubtitle(template)"
                      class="lv-right-template-caption__hover-meta"
                    >
                      <span class="lv-right-template-caption__subtitle">
                        {{ resolveTemplateCardSubtitle(template) }}
                      </span>
                    </div>
                  </div>
                  <span
                    v-if="selectedTemplate?.templateId === template.templateId"
                    class="lv-right-template-selected-badge"
                  >
                    已选
                  </span>
                </div>
              </article>
            </div>
          </section>
        </div>
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
            <PreloadImage
              v-else-if="previewTemplatePosterUrl"
              :src="previewTemplatePosterUrl"
              :alt="selectedPreviewTemplate.title"
              fit="contain"
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
          <aside class="lv-preview-dialog__humans">
            <h4>选择数字人形象</h4>
            <p>已按模板默认推荐，可手动更换</p>
            <div v-if="digitalHumanList.length" class="lv-preview-dialog__humans-grid">
              <button
                v-for="human in digitalHumanList"
                :key="human.id"
                type="button"
                class="lv-preview-dialog__human"
                :class="{ 'is-active': previewDigitalHumanId === human.id }"
                :title="human.name"
                @click="handleSelectPreviewDigitalHuman(human)"
              >
                <span class="lv-preview-dialog__human-avatar">
                  <PreloadImage
                    v-if="human.previewUrl"
                    :src="human.previewUrl"
                    :alt="human.name"
                    fit="cover"
                  />
                  <Icon v-else icon="mdi:account-outline" />
                </span>
                <span class="lv-preview-dialog__human-name">{{ human.name }}</span>
              </button>
            </div>
            <p v-else class="lv-preview-dialog__humans-empty">暂无可用数字人</p>
          </aside>
        </div>
      </div>
    </NModal>

    <NModal
      v-model:show="humanPreviewModalVisible"
      preset="card"
      to="body"
      transform-origin="center"
      class="lv-human-preview-modal"
      :style="{ width: '80vw', height: '60vh', maxWidth: 'none' }"
      :bordered="false"
      :segmented="{ content: true }"
    >
      <template #header>
        <div class="lv-human-preview-head">
          <strong>{{ previewingDigitalHuman?.name }}</strong>
          <span>四视图预览</span>
        </div>
      </template>

      <div class="lv-human-preview-grid">
        <figure
          v-for="item in activeHumanPreviewImages"
          :key="item.url"
          class="lv-human-preview-item"
        >
          <button
            type="button"
            class="lv-human-preview-image-button"
            :aria-label="`放大查看${previewingDigitalHuman?.name ?? '数字人'}${item.label}`"
            @click="openHumanPreviewImage(item)"
          >
            <PreloadImage
              class="lv-human-preview-image"
              :src="item.url"
              :alt="`${previewingDigitalHuman?.name ?? '数字人'}${item.label}`"
              loading="eager"
              fit="contain"
            />
          </button>
          <figcaption>{{ item.label }}</figcaption>
        </figure>
      </div>
    </NModal>

    <NModal
      v-if="enlargedHumanPreview"
      :show="true"
      to="body"
      :mask-closable="true"
      transform-origin="center"
      @update:show="(show) => { if (!show) closeEnlargedHumanPreview() }"
    >
      <div class="lv-human-preview-large">
        <header class="lv-human-preview-head">
          <strong>{{ previewingDigitalHuman?.name }}</strong>
          <button type="button" aria-label="关闭" @click="closeEnlargedHumanPreview">
            <Icon icon="mdi:close" />
          </button>
        </header>
        <PreloadImage
          :src="enlargedHumanPreview.url"
          :alt="`${previewingDigitalHuman?.name ?? '数字人'}${enlargedHumanPreview.label}`"
          fit="contain"
        />
      </div>
    </NModal>

    <NModal
      v-if="assetPreview"
      :show="true"
      to="body"
      :mask-closable="true"
      transform-origin="center"
      @update:show="handleAssetPreviewVisibleChange"
    >
      <div class="asset-preview-dialog">
        <header class="asset-preview-dialog__head">
          <h3>{{ assetPreview.title }}</h3>
          <button type="button" aria-label="关闭" @click="closeAssetPreview">
            <Icon icon="mdi:close" />
          </button>
        </header>
        <div class="asset-preview-dialog__body">
          <video
            v-if="assetPreview.kind === 'video'"
            :src="assetPreview.url"
            controls
            autoplay
            playsinline
          />
          <img v-else :src="assetPreview.url" :alt="assetPreview.title" />
        </div>
      </div>
    </NModal>
  </section>
</template>

<style scoped lang="scss">
.long-video-workflow {
  --lv-primary: #2563eb;
  --lv-primary-soft: #eff6ff;
  --lv-accent: var(--workspace-accent, #d4a017);
  --lv-accent-soft: color-mix(in srgb, var(--workspace-accent, #d4a017) 12%, transparent);
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
.side-panel {
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
.asset-readiness p,
.selection-confirm p {
  margin: 0;
  color: var(--lv-muted);
  font-size: 13px;
  font-weight: 700;
}

.page-head h1,
.section-head h2 {
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

.workflow-steps {
  flex-shrink: 0;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--lv-border);
}

.workflow-steps :deep(.n-step-content-header__title) {
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.workflow-steps :deep(.n-step--finish-status .n-step-indicator) {
  background-color: var(--lv-accent);
  border-color: var(--lv-accent);
  color: #fff;
}

.workflow-steps :deep(.n-step--process-status .n-step-indicator) {
  background-color: var(--lv-accent);
  border-color: var(--lv-accent);
  color: #fff;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--lv-accent) 18%, transparent);
}

.workflow-steps :deep(.n-step--wait-status .n-step-indicator) {
  background-color: var(--lv-panel);
  border-color: var(--lv-border);
  color: var(--lv-muted);
}

.workflow-steps :deep(.n-step--finish-status .n-step-splitor) {
  background-color: color-mix(in srgb, var(--lv-accent) 55%, var(--lv-border));
}

.workflow-steps :deep(.n-step--process-status .n-step-splitor),
.workflow-steps :deep(.n-step--wait-status .n-step-splitor) {
  background-color: var(--lv-border);
}

.workflow-steps :deep(.n-step--finish-status .n-step-content-header__title) {
  color: var(--lv-text);
}

.workflow-steps :deep(.n-step--process-status .n-step-content-header__title) {
  color: var(--lv-accent);
  font-weight: 800;
}

.workflow-steps :deep(.n-step--wait-status .n-step-content-header__title) {
  color: var(--lv-muted);
}

.workflow-steps :deep(.n-step--disabled .n-step-indicator),
.workflow-steps :deep(.n-step--disabled .n-step-content-header__title) {
  opacity: 0.45;
}

.secondary-action,
.primary-action,
.template-card,
.audio-segments button {
  border: 1px solid var(--lv-border);
  background: var(--lv-panel);
  color: var(--lv-text);
  cursor: pointer;
  font: inherit;
}

.workflow-grid {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: minmax(0, 4fr) minmax(0, 6fr);
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

.asset-source-tabs {
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(120px, 1fr));
  gap: 6px;
  padding: 4px;
  margin-bottom: 16px;
  border: 1px solid var(--lv-border);
  border-radius: 12px;
  background: var(--lv-surface);
}

.asset-source-tabs button {
  min-height: 38px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--lv-muted);
  cursor: pointer;
  font: inherit;
  font-weight: 900;
}

.asset-source-tabs button.is-active {
  background: var(--lv-panel);
  color: var(--lv-primary);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--lv-primary) 32%, transparent);
}

.library-picker {
  display: grid;
  gap: 14px;
}

.library-vehicle-search {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  margin-top: 14px;
  padding: 0 12px;
  border: 1px solid var(--lv-border);
  border-radius: 10px;
  background: var(--lv-panel);
  color: var(--lv-muted);
}

.library-vehicle-search input {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--lv-text);
  font: inherit;
  font-size: 13px;
  outline: none;
}

.library-vehicle-search input::placeholder {
  color: color-mix(in srgb, var(--lv-muted) 84%, transparent);
}

.library-vehicle-search input:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.library-picker__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.library-picker__head div {
  display: grid;
  gap: 4px;
}

.library-picker__head span,
.library-empty,
.library-vehicle-card small,
.library-vehicle-card span {
  color: var(--lv-muted);
}

.library-empty {
  display: flex;
  min-height: 96px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 18px;
  border: 1px dashed var(--lv-border);
  border-radius: 12px;
  background: var(--lv-surface);
  font-weight: 800;
}

.library-empty.is-error {
  color: #dc2626;
}

.library-vehicle-list {
  display: grid;
  gap: 10px;
}

.library-vehicle-card {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border: 1px solid var(--lv-border);
  border-radius: 12px;
  background: var(--lv-panel);
}

.library-vehicle-card.is-selected {
  border-color: var(--lv-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--lv-primary) 12%, transparent);
}

.library-vehicle-card img,
.library-vehicle-card__placeholder {
  width: 88px;
  aspect-ratio: 4 / 3;
  border-radius: 10px;
}

.library-vehicle-card img {
  object-fit: cover;
}

.library-vehicle-card__placeholder {
  display: grid;
  place-items: center;
  background: var(--lv-surface);
  color: var(--lv-muted);
  font-size: 28px;
}

.library-vehicle-card__body {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.library-vehicle-card__body strong,
.library-vehicle-card__body span,
.library-vehicle-card__body small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selected-library-assets {
  display: grid;
  gap: 10px;
  padding-top: 4px;
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

.selection-confirm__card {
  grid-template-columns: 86px minmax(0, 1fr) !important;
  align-items: center;
  min-height: 128px;
}

.selection-confirm__card--template {
  grid-template-columns: 78px minmax(0, 1fr) !important;
}

.selection-confirm__card--human {
  grid-template-columns: 72px minmax(0, 1fr) !important;
}

.selection-confirm__preview {
  display: grid;
  width: 72px;
  aspect-ratio: 9 / 16;
  place-items: center;
  overflow: hidden;
  border-radius: 10px;
  background: var(--lv-panel);
  color: var(--lv-primary);
  font-size: 24px;
}

.selection-confirm__preview--avatar {
  width: 58px;
  aspect-ratio: 1;
  border-radius: 14px;
}

.selection-confirm__preview :deep(.preload-image),
.selection-confirm__preview :deep(.preload-image__img),
.selection-confirm__preview video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.selection-confirm__body {
  display: grid;
  min-width: 0;
  gap: 6px;
}

.selection-confirm__body strong,
.selection-confirm__body p {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selection-confirm__body strong {
  color: var(--lv-text);
  font-size: 15px;
  font-weight: 900;
}

.selection-confirm__body p {
  margin: 0;
  color: var(--lv-muted);
  font-size: 13px;
  font-weight: 800;
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

.upload-card__body {
  display: grid;
  min-width: 0;
  width: 100%;
  gap: 3px;
}

.upload-card__body strong,
.upload-card__body span,
.upload-card__body small,
.upload-card__body em {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  padding: 0;
  overflow: hidden;
  border: 0;
  border-radius: 10px;
  background: var(--lv-surface);
  cursor: zoom-in;
}

.upload-preview img,
.upload-preview video,
.template-card img,
.template-card video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-preview__hint {
  position: absolute;
  top: 8px;
  right: 8px;
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid rgba(37, 99, 235, 0.22);
  background: rgba(255, 255, 255, 0.88);
  color: var(--lv-primary);
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
  opacity: 0.92;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(8px);
  transition: opacity 0.18s ease;
}

.upload-preview:hover .upload-preview__hint {
  opacity: 0.92;
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

.lv-vin-panel {
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, var(--lv-accent) 24%, var(--lv-border));
  border-radius: 14px;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--lv-accent) 7%, transparent),
      transparent 72%
    ),
    var(--lv-surface);
}

.lv-vin-panel-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.lv-vin-panel-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--lv-accent-soft);
  color: var(--lv-accent);
  font-size: 20px;
}

.lv-vin-panel-head strong {
  display: block;
  margin-bottom: 2px;
  font-size: 14px;
  font-weight: 700;
}

.lv-vin-panel-head p {
  margin: 0;
  color: var(--lv-muted);
  font-size: 12px;
  line-height: 1.5;
}

.lv-vin-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
}

.lv-vin-field {
  display: grid;
  gap: 8px;
}

.lv-vin-field span {
  color: var(--lv-muted);
  font-size: 13px;
  font-weight: 800;
}

.lv-vin-field input {
  width: 100%;
  height: 42px;
  box-sizing: border-box;
  padding: 0 12px;
  border: 1px solid var(--lv-border);
  border-radius: 10px;
  background: var(--lv-panel);
  color: var(--lv-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 14px;
  letter-spacing: 0.06em;
}

.lv-vin-field input:focus {
  border-color: color-mix(in srgb, var(--lv-primary) 45%, var(--lv-border));
  outline: none;
}

.lv-vin-field input:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.lv-vin-query-btn {
  display: inline-flex;
  height: 42px;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  border: 0;
  border-radius: 10px;
  background: var(--lv-primary);
  color: #fff;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.lv-vin-query-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.lv-vin-secondary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  align-items: center;
  color: var(--lv-muted);
  font-size: 12px;
}

.lv-vin-image-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 12px;
  border: 1px dashed color-mix(in srgb, var(--lv-accent) 40%, var(--lv-border));
  border-radius: 10px;
  background: color-mix(in srgb, var(--lv-accent) 6%, var(--lv-panel));
  color: var(--lv-text);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.lv-vin-image-btn.is-disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.lv-vin-image-btn input {
  display: none;
}

.lv-vin-disclaimer {
  margin: 0;
  color: var(--lv-muted);
  font-size: 12px;
  line-height: 1.5;
}

.lv-vin-error {
  margin: 0;
  color: #b91c1c;
  font-size: 12px;
  line-height: 1.5;
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
  min-height: 0;
  overflow: hidden;
  border-style: solid;
}

.template-card.is-selected,
.audio-segments button.is-active {
  border-color: var(--lv-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--lv-primary) 12%, transparent);
}

.template-card img,
.template-card video {
  width: 100%;
  aspect-ratio: 9 / 16;
  height: auto;
  border-radius: 10px;
  object-fit: cover;
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
  overflow: hidden;
  padding: 0;
}

.lv-right-main-shell {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  padding-top: 12px;
}

.lv-right-primary-tabs {
  display: inline-flex;
  flex-shrink: 0;
  gap: 34px;
  align-self: flex-start;
  align-items: center;
  min-height: 32px;
  margin: 0 18px;
  padding: 0;
  border-radius: 0;
  background: transparent;
}

.lv-right-primary-tab {
  position: relative;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--lv-muted);
  padding: 0;
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s ease;
}

.lv-right-primary-tab:hover:not(.is-active) {
  color: var(--lv-text);
}

.lv-right-primary-tab.is-active {
  background: transparent;
  color: var(--lv-text);
  font-weight: 800;
}

.lv-right-primary-tab.is-active::after {
  position: absolute;
  right: 0;
  bottom: -9px;
  left: 0;
  height: 3px;
  border-radius: 999px;
  background: var(--lv-primary);
  box-shadow: 0 2px 6px color-mix(in srgb, var(--lv-primary) 34%, transparent);
  content: '';
}

.lv-right-gallery,
.lv-right-recent-panel {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

.lv-right-recent-panel {
  padding: 0 16px 20px 18px;
}

.lv-right-gallery {
  gap: 16px;
  padding: 0 16px 20px 18px;
}

.lv-right-recent-panel.is-generating {
  padding: 0;
}

.lv-gallery-toolbar {
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex-shrink: 0;
}

.lv-gallery-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.lv-gallery-tab {
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--lv-text);
  padding: 8px 16px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 180ms ease,
    color 180ms ease;
}

.lv-gallery-tab.is-active {
  background: var(--lv-accent-soft);
  color: var(--lv-accent);
}

.lv-gallery-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.lv-style-filter {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid var(--lv-border);
  border-radius: 10px;
  background: var(--lv-panel);
  color: var(--lv-muted);
  font-size: 13px;
}

.lv-style-filter select {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--lv-text);
  font-family: inherit;
  font-size: 13px;
  outline: none;
  cursor: pointer;
}

.lv-style-filter > svg {
  position: absolute;
  right: 10px;
  pointer-events: none;
  font-size: 16px;
}

.lv-style-filter-label {
  color: var(--lv-muted);
  white-space: nowrap;
}

.lv-search {
  display: inline-flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  min-width: min(100%, 260px);
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid var(--lv-border);
  border-radius: 10px;
  background: var(--lv-panel);
  color: var(--lv-muted);
}

.lv-search input {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--lv-text);
  font-family: inherit;
  font-size: 13px;
  outline: none;
}

.lv-search input::placeholder {
  color: color-mix(in srgb, var(--lv-muted) 84%, transparent);
}

.lv-right-template-grid {
  --lv-grid-gap: 16px;
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: repeat(
    auto-fill,
    minmax(max(180px, calc((100% - 5 * var(--lv-grid-gap)) / 6)), 1fr)
  );
  gap: var(--lv-grid-gap);
  align-content: flex-start;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
  scrollbar-width: thin;
}

.lv-right-recent-grid {
  min-height: 0;
  flex: 1;
}

.lv-right-template-card,
.lv-right-recent-card {
  position: relative;
  display: block;
  min-width: 0;
  width: 100%;
  border: 0;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
}

.lv-right-template-media,
.lv-right-recent-card-media {
  position: relative;
  overflow: hidden;
  aspect-ratio: 9 / 16;
  border-radius: 14px;
  background: var(--lv-surface);
  transition: transform 0.28s ease, box-shadow 0.2s ease;
}

.lv-right-template-card:hover .lv-right-template-media,
.lv-right-template-card:focus-within .lv-right-template-media,
.lv-right-recent-card.is-clickable:hover .lv-right-recent-card-media {
  transform: scale(1.03);
}

.lv-right-template-card.is-selected .lv-right-template-media {
  box-shadow:
    0 0 0 3px var(--lv-accent),
    0 10px 26px color-mix(in srgb, var(--lv-accent) 32%, transparent);
  transform: none;
}

.lv-right-recent-card.is-selected .lv-right-recent-card-media {
  box-shadow: 0 0 0 2px var(--lv-accent);
}

.lv-right-template-cover,
.lv-right-recent-card-cover,
.lv-right-recent-card-cover--video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lv-right-template-cover--poster {
  z-index: 0;
}

.lv-right-template-cover--video {
  z-index: 1;
  opacity: 1;
}

.lv-right-template-cover--video.is-poster-backed {
  opacity: 0;
  transition: opacity 0.18s ease;
}

.lv-right-template-card:hover .lv-right-template-cover--video.is-poster-backed,
.lv-right-template-card:focus-within .lv-right-template-cover--video.is-poster-backed {
  opacity: 1;
}

.lv-right-template-cover :deep(.preload-image),
.lv-right-template-cover :deep(.preload-image__img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lv-right-template-cover--placeholder,
.lv-right-recent-card-placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: var(--lv-muted);
  font-size: 28px;
}

.lv-right-template-caption {
  position: absolute;
  right: 14px;
  bottom: 14px;
  left: 14px;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
  pointer-events: none;
}

.lv-right-template-caption__title {
  overflow: hidden;
  max-width: 100%;
  margin: 0;
  color: rgba(255, 255, 255, 0.95);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.72),
    0 2px 10px rgba(0, 0, 0, 0.55);
}

.lv-right-template-caption__hover-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
  max-width: 100%;
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transform: translateY(8px);
  transition:
    max-height 0.3s ease,
    opacity 0.26s ease,
    transform 0.26s ease;
}

.lv-right-template-card:hover .lv-right-template-caption__hover-meta,
.lv-right-template-card:focus-within .lv-right-template-caption__hover-meta {
  max-height: 24px;
  opacity: 1;
  transform: translateY(0);
}

.lv-right-template-caption__subtitle {
  overflow: hidden;
  max-width: 100%;
  color: rgba(255, 255, 255, 0.76);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lv-right-template-selected-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 5;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--lv-accent);
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.4px;
  box-shadow:
    0 0 0 2px rgba(255, 255, 255, 0.28),
    0 6px 18px rgba(0, 0, 0, 0.28);
  pointer-events: none;
}

.lv-right-recent-card-body {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  gap: 2px;
  padding: 28px 10px 10px;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.72));
  color: #fff;
}

.lv-right-template-caption strong,
.lv-right-recent-card-body strong {
  overflow: hidden;
  font-size: 13px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lv-right-template-caption span,
.lv-right-recent-card-body span {
  overflow: hidden;
  color: rgba(255, 255, 255, 0.82);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lv-right-recent-card-retry {
  justify-self: start;
  padding: 3px 7px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.45);
  color: #fff;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.25;
  cursor: pointer;
}

.lv-right-recent-card-retry:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.lv-right-recent-card-retry:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.lv-right-recent-card-status {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 1;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  font-size: 11px;
  font-style: normal;
  font-weight: 700;
}

.lv-right-recent-card-status.is-running {
  background: rgba(37, 99, 235, 0.88);
}

.lv-right-empty {
  display: grid;
  flex: 1;
  place-items: center;
  gap: 10px;
  min-height: 220px;
  padding: 24px;
  border: 1px dashed var(--lv-border);
  border-radius: 14px;
  color: var(--lv-muted);
  text-align: center;
}

.lv-right-empty.is-error {
  border-color: #fecaca;
  color: #b91c1c;
}

.lv-right-empty--inline {
  min-height: 180px;
}

.lv-right-generating {
  position: relative;
  display: flex;
  min-height: 0;
  flex: 1;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
  padding: clamp(28px, 5vh, 64px) clamp(20px, 4vw, 72px);
  border-radius: 0 0 14px 14px;
  background: #050914;
}

.lv-right-generating-visual {
  position: absolute;
  inset: 0;
}

.lv-right-generating-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.42;
}

.lv-right-generating-copy {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 8px;
  max-width: 420px;
  color: #fff;
  text-align: center;
}

.lv-right-generating-copy p,
.lv-right-generating-copy span {
  margin: 0;
  color: rgba(255, 255, 255, 0.72);
  font-size: 13px;
}

.lv-right-generating-copy h2 {
  margin: 0;
  font-size: clamp(24px, 3vw, 34px);
}

.lv-right-generating-error {
  color: #fecaca !important;
}

.lv-right-generating-retry {
  justify-self: center;
  padding: 8px 14px;
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
}

.lv-right-generating-retry:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.22);
}

.lv-right-generating-retry:disabled {
  cursor: wait;
  opacity: 0.62;
}

.lv-right-generating-progress {
  position: relative;
  z-index: 1;
  width: min(420px, 100%);
  height: 8px;
  margin-top: 18px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
}

.lv-right-generating-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  transition: width 0.35s ease;
}

.audio-card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.audio-card header span {
  color: var(--lv-primary);
  font-size: 12px;
  font-weight: 800;
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
  display: flex;
  width: 60vw;
  height: 60vh;
  min-height: 60vh;
  max-height: 60vh;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  background: #fff;
  color-scheme: light;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
}

.lv-preview-dialog__head {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.lv-preview-dialog__head h3 {
  margin: 0;
  color: #111;
  font-size: 16px;
  font-weight: 700;
}

.lv-preview-dialog__head button {
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #666;
  font-size: 20px;
  cursor: pointer;
}

.lv-preview-dialog__head button:hover {
  background: #f5f5f5;
}

.lv-preview-dialog__body {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: minmax(0, 1fr) auto;
}

.lv-preview-dialog__media {
  display: flex;
  min-height: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  overflow: hidden;
  border-right: 1px solid #eee;
  background: #fafafa;
}

.lv-preview-dialog__media :deep(.template-preview-video-shell) {
  width: 100%;
  height: 100%;
  max-height: 100%;
}

.lv-preview-dialog__media :deep(.template-preview-video-player) {
  width: auto;
  height: 100%;
  max-width: 100%;
  max-height: 100% !important;
  border-radius: 8px;
  object-fit: contain;
}

.lv-preview-dialog__media :deep(.preload-image),
.lv-preview-dialog__media :deep(.preload-image__img) {
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  border-radius: 8px;
  object-fit: contain;
}

.lv-preview-dialog__empty {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: #999;
  font-size: 48px;
}

.lv-preview-dialog__side {
  min-width: 0;
  grid-column: 1;
  grid-row: 2;
  flex-shrink: 0;
  padding: 10px 16px 14px;
  border-top: 1px solid #eee;
  border-right: 1px solid #eee;
  background: #fff;
}

.lv-preview-dialog__side div {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.lv-preview-dialog__side span {
  padding: 3px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
}

.lv-preview-dialog__side p {
  margin: 0 0 12px;
  color: #334155;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.55;
}

.lv-preview-dialog__side .primary-action {
  width: 100%;
  min-height: 40px;
  border: 0;
  border-radius: 10px;
  background: #d4a017;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}

.lv-preview-dialog__side .primary-action:hover:not(:disabled) {
  background: #e5b85c;
}

.lv-preview-dialog__humans {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  grid-column: 2;
  grid-row: 1 / span 2;
  padding: 16px 20px;
}

.lv-preview-dialog__humans h4 {
  margin: 0 0 4px;
  color: #222;
  font-size: 15px;
  font-weight: 800;
}

.lv-preview-dialog__humans > p {
  margin: 0 0 14px;
  color: #666;
  font-size: 12px;
  font-weight: 600;
}

.lv-preview-dialog__humans-grid {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 10px;
  align-content: start;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.65) #f1f5f9;
}

.lv-preview-dialog__humans-grid::-webkit-scrollbar {
  width: 8px;
}

.lv-preview-dialog__humans-grid::-webkit-scrollbar-track {
  border-radius: 999px;
  background: #f1f5f9;
}

.lv-preview-dialog__humans-grid::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.65);
}

.lv-preview-dialog__humans-grid::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.78);
}

.lv-preview-dialog__human {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 6px;
  border: 2px solid #eee;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.15s;
}

.lv-preview-dialog__human:hover:not(:disabled) {
  border-color: #d4a017;
}

.lv-preview-dialog__human.is-active {
  border-color: #d4a017;
  background: #fffbf0;
}

.lv-preview-dialog__human-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  overflow: hidden;
  border-radius: 8px;
  background: #f0f0f0;
  color: #d4a017;
  font-size: 24px;
}

.lv-preview-dialog__human-avatar :deep(.preload-image),
.lv-preview-dialog__human-avatar :deep(.preload-image__img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lv-preview-dialog__human-name {
  overflow: hidden;
  max-width: 100%;
  color: #333;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
  text-align: center;
  word-break: break-all;
}

.lv-preview-dialog__humans-empty {
  margin: 0;
  color: #999;
  font-size: 13px;
}

.lv-human-preview-modal {
  overflow: hidden;
  border-radius: 16px;
}

.lv-human-preview-modal > :deep(.n-card-header) {
  padding: 16px 20px;
}

.lv-human-preview-modal > :deep(.n-card__content) {
  height: calc(60vh - 66px);
  padding: 18px 20px;
  overflow: auto;
}

.lv-human-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.lv-human-preview-head strong {
  color: #111;
  font-size: 16px;
}

.lv-human-preview-head span {
  color: #777;
  font-size: 13px;
}

.lv-human-preview-grid {
  display: grid;
  height: 100%;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.lv-human-preview-item {
  display: grid;
  min-width: 0;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 8px;
  margin: 0;
}

.lv-human-preview-image-button {
  min-width: 0;
  overflow: hidden;
  padding: 0;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
  cursor: zoom-in;
}

.lv-human-preview-image,
.lv-human-preview-image :deep(.preload-image),
.lv-human-preview-image :deep(.preload-image__img) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.lv-human-preview-item figcaption {
  color: #475569;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}

.lv-human-preview-large {
  display: grid;
  width: min(920px, calc(100vw - 48px));
  max-height: calc(100vh - 64px);
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
  border-radius: 16px;
  background: #fff;
}

.lv-human-preview-large .lv-human-preview-head {
  padding: 14px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.lv-human-preview-large .lv-human-preview-head button {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
}

.lv-human-preview-large :deep(.preload-image),
.lv-human-preview-large :deep(.preload-image__img) {
  width: 100%;
  height: min(76vh, 760px);
  object-fit: contain;
}

.asset-preview-dialog {
  width: min(960px, calc(100vw - 48px));
  max-height: calc(100vh - 64px);
  overflow: hidden;
  border: 1px solid var(--lv-border, #d6e0ed);
  border-radius: 16px;
  background: var(--lv-panel, #fff);
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.24);
}

.asset-preview-dialog__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--lv-border, #d6e0ed);
}

.asset-preview-dialog__head h3 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--lv-text, #0f172a);
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-preview-dialog__head button {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--lv-border, #d6e0ed);
  border-radius: 10px;
  background: var(--lv-surface, #f8fafc);
  color: var(--lv-text, #0f172a);
  cursor: pointer;
}

.asset-preview-dialog__body {
  display: grid;
  max-height: calc(100vh - 140px);
  place-items: center;
  padding: 16px;
  background: #0f172a;
}

.asset-preview-dialog__body img,
.asset-preview-dialog__body video {
  display: block;
  max-width: 100%;
  max-height: calc(100vh - 172px);
  border-radius: 10px;
  object-fit: contain;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
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

  .upload-grid,
  .template-grid,
  .vehicle-form,
  .lv-vin-row {
    grid-template-columns: 1fr;
  }

  .lv-preview-dialog__body {
    grid-template-columns: 1fr;
  }

  .lv-preview-dialog__humans {
    grid-column: 1;
    grid-row: auto;
  }

  .lv-preview-dialog__media {
    min-height: 420px;
  }
}
</style>

<style lang="scss">
.lv-human-preview-modal {
  display: flex !important;
  width: 80vw !important;
  height: 60vh !important;
  max-width: none !important;
  flex-direction: column !important;
  background: #fff !important;
  color: #0f172a !important;
  color-scheme: light !important;
}

.lv-human-preview-modal > .n-card-header {
  background: #fff !important;
  border-bottom: 1px solid #eef2f7 !important;
}

.lv-human-preview-modal > .n-card-header .n-card-header__main,
.lv-human-preview-modal > .n-card-header .n-card-header__extra,
.lv-human-preview-modal > .n-card-header .n-base-close {
  color: #0f172a !important;
}

.lv-human-preview-modal > .n-card__content {
  padding: 28px 36px 24px !important;
  overflow: hidden;
  background: #fff !important;
}

.lv-human-preview-modal .lv-human-preview-grid {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24px;
}

.lv-human-preview-modal .lv-human-preview-item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
  margin: 0;
}

.lv-human-preview-modal .lv-human-preview-image-button {
  display: block;
  width: 100%;
  height: min(420px, calc(60vh - 150px));
  padding: 0;
  overflow: hidden;
  border: 0;
  border-radius: 10px;
  background: #f8fafc;
  cursor: zoom-in;
  outline: none;
}

.lv-human-preview-modal .lv-human-preview-image,
.lv-human-preview-modal .lv-human-preview-image.preload-image,
.lv-human-preview-modal .lv-human-preview-image .preload-image,
.lv-human-preview-modal .lv-human-preview-image .preload-image.is-loaded,
.lv-human-preview-modal .lv-human-preview-image .preload-image__img,
.lv-human-preview-modal .lv-human-preview-image .preload-image.is-loaded .preload-image__img {
  width: 100%;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  border-radius: 10px;
  background: #f8fafc !important;
  background-color: #f8fafc !important;
  object-fit: contain;
}

.lv-human-preview-modal .lv-human-preview-image-button:hover,
.lv-human-preview-modal .lv-human-preview-image-button:focus-visible {
  box-shadow: inset 0 0 0 2px #c99518;
}

.lv-human-preview-modal .lv-human-preview-item figcaption {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #0f172a;
  font-size: 13px;
  font-weight: 700;
}
</style>
