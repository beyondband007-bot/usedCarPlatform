<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { NModal, useMessage } from 'naive-ui'

import HoverPreviewVideo from '@/components/common/HoverPreviewVideo.vue'
import PreloadImage from '@/components/common/PreloadImage.vue'
import TemplatePreviewVideoPlayer from '@/components/business/workspace/TemplatePreviewVideoPlayer.vue'
import {
  queryVehicleByVinShowApi,
  normalizeVehicleInfo,
  recognizeVinFromImage,
  type VehicleBasicInfo,
  type VinVehicleCandidate,
} from '@/api/vehicle-info'
import { VIDEO_GENERATION_FLOW_KEY } from '@/constants/video-generation'
import {
  resolveTemplatePosterUrl,
  resolveTemplatePreviewUrl,
} from '@/constants/video-template-previews'
import { resolveTemplateDefaultDigitalHumanId } from '@/constants/video-generation-local-assets'
import type { VideoGenerationFlow } from '@/composables/useVideoGenerationFlow'
import type { DigitalHuman, VideoTemplate } from '@/types/video-generation'

const currentView = ref<
  'dashboard' | 'vehicle-upload' | 'vehicle-info' | 'vehicle-template' | 'venue-upload'
>('vehicle-upload')
const message = useMessage()
const videoFlow = inject<VideoGenerationFlow | null>(VIDEO_GENERATION_FLOW_KEY, null)
const longVideoMode = ref<'vehicle' | 'venue'>('vehicle')
type LocalUploadPreview = {
  name: string
  size: number
  type: string
  url: string
}
const uploadedFiles = ref<Record<string, LocalUploadPreview>>({})
const vin = ref('')
const vinLoading = ref(false)
const vinOcrLoading = ref(false)
const vehicleInfo = ref<VehicleBasicInfo | null>(null)
const vehicleCandidates = ref<VinVehicleCandidate[]>([])
const selectedVehicleCandidateId = ref<number | null>(null)
const templateSearch = ref('')
const templatePreviewSession = ref<VideoTemplate | null>(null)
const previewDigitalHumanId = ref('')
const activeWorkflowStep = computed(() => {
  if (currentView.value === 'vehicle-template') return 2
  if (currentView.value === 'vehicle-info') return 1
  return 0
})
const longVideoTemplates = computed(() => {
  const keyword = templateSearch.value.trim().toLowerCase()
  const targetType = isVenueFlow.value ? 'dealership' : 'single-car'
  return (videoFlow?.templateList.value ?? []).filter((item) => {
    if (item.type !== targetType) return false
    if (!keyword) return true
    return `${item.title} ${item.description ?? ''} ${item.styleLabel}`
      .toLowerCase()
      .includes(keyword)
  })
})
const selectedLongVideoTemplateId = computed(
  () =>
    videoFlow?.selectedTemplate.value?.type === (isVenueFlow.value ? 'dealership' : 'single-car')
      ? videoFlow.selectedTemplate.value.templateId
      : '',
)
const selectedLongVideoTemplate = computed(() =>
  longVideoTemplates.value.find((item) => item.templateId === selectedLongVideoTemplateId.value) ??
  null,
)
const templatesLoading = computed(() => videoFlow?.isLoading('bootstrap') ?? false)
const digitalHumanList = computed(() => videoFlow?.digitalHumanList.value ?? [])
const selectedDigitalHuman = computed(() => videoFlow?.selectedDigitalHuman.value ?? null)

const projectTypes = [
  {
    icon: 'mdi:car-hatchback',
    title: '车辆介绍视频',
    description: '适合单车讲解、车型亮点与车况展示',
    requirement: '3 张图片 + 2 个视频 · 约 2～5 分钟',
    action: '创建车辆视频',
    tone: 'blue',
    badge: '常用',
  },
  {
    icon: 'mdi:office-building-outline',
    title: '车场介绍视频',
    description: '适合门店环境、品牌实力与服务介绍',
    requirement: '1 张图片 + 1 个视频 · 约 1～3 分钟',
    action: '创建车场视频',
    tone: 'green',
  },
] as const

const recentProjects = [
  {
    icon: 'mdi:car-hatchback',
    title: '2023 款精品 SUV 介绍',
    meta: '车辆介绍 · 已完成 35%',
    progress: 35,
    status: '草稿',
    action: '继续编辑',
    tone: 'blue',
  },
  {
    icon: 'mdi:office-building-outline',
    title: '诚信车行展厅介绍',
    meta: '车场介绍 · 已完成 68%',
    progress: 68,
    status: '视频渲染中',
    action: '查看进度',
    tone: 'green',
  },
] as const

const workflowSteps = ['素材上传', '信息填写', '数字人与模板', '脚本确认'] as const

const uploadSlots = [
  {
    label: '车头图片',
    accept: 'image/jpeg、image/png、image/webp · 最大 20.0 MB',
    acceptValue: 'image/jpeg,image/png,image/webp',
  },
  {
    label: '副驾图片',
    accept: 'image/jpeg、image/png、image/webp · 最大 20.0 MB',
    acceptValue: 'image/jpeg,image/png,image/webp',
  },
  {
    label: '车尾图片',
    accept: 'image/jpeg、image/png、image/webp · 最大 20.0 MB',
    acceptValue: 'image/jpeg,image/png,image/webp',
  },
  {
    label: '前排视频',
    accept: 'video/mp4、video/quicktime · 最大 500.0 MB',
    acceptValue: 'video/mp4,video/quicktime',
  },
  {
    label: '后排视频',
    accept: 'video/mp4、video/quicktime · 最大 500.0 MB',
    acceptValue: 'video/mp4,video/quicktime',
  },
] as const

const venueUploadSlots = [
  {
    label: '车场图片',
    accept: 'image/jpeg、image/png、image/webp · 最大 20.0 MB',
    acceptValue: 'image/jpeg,image/png,image/webp',
  },
  {
    label: '车场视频',
    accept: 'video/mp4、video/quicktime · 最大 500.0 MB',
    acceptValue: 'video/mp4,video/quicktime',
  },
] as const

const isVenueFlow = computed(() => longVideoMode.value === 'venue')
const currentUploadSlots = computed(() =>
  isVenueFlow.value ? venueUploadSlots : uploadSlots,
)

type EditableVehicleField =
  | 'brandName'
  | 'year'
  | 'fullModelName'
  | 'vehicleLevel'
  | 'seriesName'
  | 'emissionStandard'
  | 'engineModel'
  | 'gearbox'
  | 'fuelType'
  | 'displacement'

const coreVehicleFields: ReadonlyArray<readonly [EditableVehicleField, string]> = [
  ['brandName', '品牌'],
  ['year', '年款'],
  ['fullModelName', '车款名称'],
  ['vehicleLevel', '车辆级别'],
  ['seriesName', '车系'],
  ['emissionStandard', '排放标准'],
  ['engineModel', '发动机型号'],
  ['gearbox', '变速箱'],
  ['fuelType', '燃油类型'],
  ['displacement', '排量'],
] as const

const displayedCoreFields = computed(() =>
  coreVehicleFields.map(([key, label]) => ({
    key,
    label,
    value: vehicleInfo.value?.[key] ?? '',
  })),
)

function startManualVehicleInfoInput() {
  vehicleInfo.value = normalizeVehicleInfo({})
  vehicleCandidates.value = []
  selectedVehicleCandidateId.value = null
  message.info('已切换为手动录入，请填写车辆信息')
}

function updateVehicleInfo(key: EditableVehicleField, event: Event) {
  if (!vehicleInfo.value) return
  vehicleInfo.value[key] = (event.target as HTMLInputElement).value
}

function extractCandidateYear(name: string): string {
  return name.match(/(?:19|20)\d{2}(?=款)/)?.[0] ?? ''
}

function selectVehicleCandidate(candidate: VinVehicleCandidate) {
  if (!vehicleInfo.value) return
  selectedVehicleCandidateId.value = candidate.carid
  vehicleInfo.value.fullModelName = candidate.name
  vehicleInfo.value.seriesName = candidate.typename || vehicleInfo.value.seriesName
  vehicleInfo.value.year = extractCandidateYear(candidate.name) || vehicleInfo.value.year
  vehicleInfo.value.displacement = candidate.displacement || vehicleInfo.value.displacement
  vehicleInfo.value.guidePrice = candidate.price || vehicleInfo.value.guidePrice
}

function setLongVideoMode(mode: 'vehicle' | 'venue') {
  longVideoMode.value = mode
  currentView.value = mode === 'venue' ? 'venue-upload' : 'vehicle-upload'
  const expectedType = mode === 'venue' ? 'dealership' : 'single-car'
  if (videoFlow?.selectedTemplate.value && videoFlow.selectedTemplate.value.type !== expectedType) {
    videoFlow.selectedTemplate.value = null
    videoFlow.goBackToTemplate()
  }
}

function openProjectType(index: number) {
  setLongVideoMode(index === 1 ? 'venue' : 'vehicle')
}

function handleFileChange(label: string, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const previous = uploadedFiles.value[label]
  if (previous?.url) URL.revokeObjectURL(previous.url)
  uploadedFiles.value = {
    ...uploadedFiles.value,
    [label]: {
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
    },
  }
  input.value = ''
}

function removeUploadedFile(label: string) {
  const current = uploadedFiles.value[label]
  if (current?.url) URL.revokeObjectURL(current.url)
  const next = { ...uploadedFiles.value }
  delete next[label]
  uploadedFiles.value = next
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(size / 1024))} KB`
}

onUnmounted(() => {
  Object.values(uploadedFiles.value).forEach((item) => {
    if (item.url) URL.revokeObjectURL(item.url)
  })
})

onMounted(() => {
  void videoFlow?.initializeFlow()
})

function handleNextStep() {
  if (currentView.value === 'vehicle-info') {
    currentView.value = 'vehicle-template'
    if (!videoFlow?.templateList.value.length) {
      void videoFlow?.initializeFlow()
    }
    return
  }
  if (currentView.value === 'vehicle-template') {
    if (!selectedLongVideoTemplateId.value) {
      message.error('请先选择一个车辆介绍模板')
    }
    return
  }
  if (currentView.value === 'vehicle-upload') {
    currentView.value = 'vehicle-info'
  }
}

function handlePreviousStep() {
  if (currentView.value === 'vehicle-template') {
    currentView.value = 'vehicle-info'
    return
  }
  if (currentView.value === 'vehicle-info') {
    currentView.value = 'vehicle-upload'
  }
}

function resolvePreviewDefaultDigitalHumanId(template: VideoTemplate): string {
  const activeId =
    videoFlow?.selectedTemplate.value?.templateId === template.templateId
      ? videoFlow.activeDigitalHumanId.value
      : ''
  if (activeId && digitalHumanList.value.some((item) => item.id === activeId)) {
    return activeId
  }

  const defaultId =
    template.defaultDigitalHumanId ??
    resolveTemplateDefaultDigitalHumanId(template.templateId) ??
    ''
  if (!defaultId) return ''
  return digitalHumanList.value.some((item) => item.id === defaultId) ? defaultId : ''
}

function openLongVideoTemplatePreview(template: VideoTemplate) {
  templatePreviewSession.value = template
  previewDigitalHumanId.value = resolvePreviewDefaultDigitalHumanId(template)
}

function closeLongVideoTemplatePreview() {
  templatePreviewSession.value = null
  previewDigitalHumanId.value = ''
}

function handleLongVideoPreviewVisibleChange(show: boolean) {
  if (!show) closeLongVideoTemplatePreview()
}

function selectPreviewDigitalHuman(human: DigitalHuman) {
  previewDigitalHumanId.value = human.id
}

function confirmLongVideoTemplatePreview() {
  const template = templatePreviewSession.value
  if (!template || !videoFlow) return

  videoFlow.selectTemplate(template)

  const human = digitalHumanList.value.find((item) => item.id === previewDigitalHumanId.value)
  if (human) {
    videoFlow.selectDigitalHuman(human)
  }

  closeLongVideoTemplatePreview()
  message.success('已选择模板和数字人')
}

async function handleVinQuery() {
  const normalizedVin = vin.value.trim().toUpperCase()
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(normalizedVin)) {
    message.error('请输入正确的 17 位 VIN 车架号')
    return
  }

  vinLoading.value = true
  vehicleInfo.value = null
  vehicleCandidates.value = []
  selectedVehicleCandidateId.value = null
  try {
    const result = await queryVehicleByVinShowApi(normalizedVin)
    vehicleInfo.value = normalizeVehicleInfo(result)
    vehicleCandidates.value = []
    selectedVehicleCandidateId.value = null
    vin.value = normalizedVin
  } catch (error) {
    message.error(error instanceof Error ? error.message : 'VIN 查询失败，请稍后重试')
  } finally {
    vinLoading.value = false
  }
}

async function handleVinImageChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    message.error('仅支持 JPG、JPEG 或 PNG 图片')
    return
  }
  if (file.size > 7 * 1024 * 1024) {
    message.error('VIN 图片大小不能超过 7MB')
    return
  }

  vinOcrLoading.value = true
  try {
    vin.value = await recognizeVinFromImage(file)
    message.success('VIN 识别成功')
    await handleVinQuery()
  } catch (error) {
    message.error(error instanceof Error ? error.message : 'VIN 图片识别失败')
  } finally {
    vinOcrLoading.value = false
  }
}
</script>

<template>
  <section
    v-if="currentView === 'dashboard'"
    class="long-video-workbench"
    aria-label="长视频生成工作台"
  >
    <header class="workbench-header">
      <div>
        <h1>今天想制作什么视频？</h1>
        <p class="workbench-description">
          选择一个创作类型，上传素材后即可生成专业的二手车介绍视频。
        </p>
      </div>

      <dl class="project-summary" aria-label="项目统计">
        <div>
          <dt>2</dt>
          <dd>全部项目</dd>
        </div>
        <div>
          <dt>1</dt>
          <dd>生成中</dd>
        </div>
        <div>
          <dt>0</dt>
          <dd>已完成</dd>
        </div>
      </dl>
    </header>

    <div class="project-type-grid">
      <article
        v-for="(item, index) in projectTypes"
        :key="item.title"
        class="project-type-card"
        :class="`is-${item.tone}`"
      >
        <span class="card-decoration" aria-hidden="true" />
        <span v-if="'badge' in item" class="type-badge">{{ item.badge }}</span>
        <span class="type-icon" aria-hidden="true">
          <Icon :icon="item.icon" />
        </span>
        <h2>{{ item.title }}</h2>
        <p>{{ item.description }}</p>
        <p class="type-requirement">
          <Icon icon="mdi:clock-outline" aria-hidden="true" />
          {{ item.requirement }}
        </p>
        <button class="type-action" type="button" @click="openProjectType(index)">
          <span><Icon icon="mdi:plus" />{{ item.action }}</span>
          <Icon icon="mdi:arrow-right" aria-hidden="true" />
        </button>
      </article>
    </div>

    <section class="generating-banner" aria-label="当前生成项目">
      <span class="generating-play" aria-hidden="true">
        <Icon icon="mdi:play" />
      </span>
      <div class="generating-content">
        <div class="generating-title">
          <strong>正在生成</strong>
          <span>诚信车行展厅介绍</span>
        </div>
        <div class="progress-track">
          <span style="width: 68%" />
        </div>
      </div>
      <span class="generating-state">视频渲染 · 68%</span>
      <Icon class="row-arrow" icon="mdi:chevron-right" aria-hidden="true" />
    </section>

    <section class="recent-panel">
      <header class="recent-header">
        <div>
          <h2><Icon icon="mdi:folder-play-outline" />最近项目</h2>
          <p>从上次离开的地方继续</p>
        </div>
        <span class="view-all">查看全部 <Icon icon="mdi:arrow-right" /></span>
      </header>

      <div
        v-for="item in recentProjects"
        :key="item.title"
        class="recent-row"
        :class="`is-${item.tone}`"
      >
        <span class="recent-icon" aria-hidden="true">
          <Icon :icon="item.icon" />
        </span>
        <div class="recent-info">
          <strong>{{ item.title }}</strong>
          <span>{{ item.meta }}</span>
        </div>
        <div class="recent-progress">
          <div class="progress-track">
            <span :style="{ width: `${item.progress}%` }" />
          </div>
        </div>
        <span class="recent-status">{{ item.status }}</span>
        <span class="recent-action">{{ item.action }} <Icon icon="mdi:chevron-right" /></span>
      </div>
    </section>
  </section>

  <section
    v-else
    class="vehicle-upload-workflow"
    :class="{ 'is-venue-flow': isVenueFlow }"
    aria-label="长视频素材上传"
  >
    <button
      v-if="false"
      type="button"
      class="workflow-back"
      @click="currentView = 'dashboard'"
    >
      <Icon icon="mdi:arrow-left" aria-hidden="true" />
      返回
    </button>

    <nav v-if="false" class="workflow-steps" aria-label="创建车辆视频步骤">
      <div
        v-for="(step, index) in workflowSteps"
        :key="step"
        class="workflow-step"
        :class="{ 'is-active': index === activeWorkflowStep, 'is-complete': index < activeWorkflowStep }"
      >
        <span>{{ index + 1 }}</span>
        <strong>{{ step }}</strong>
      </div>
    </nav>

    <div class="long-video-compose-grid">
      <main class="long-video-params-panel" aria-label="长视频生成参数">
        <header class="workflow-heading long-video-compose-heading">
          <p>长视频生成</p>
          <h1>选择参数</h1>
          <span>左侧填写素材和车辆信息，右侧选择模板与数字人。</span>
        </header>

        <div class="long-video-mode-switch" role="tablist" aria-label="长视频类型">
          <button
            type="button"
            role="tab"
            :aria-selected="!isVenueFlow"
            :class="{ 'is-active': !isVenueFlow }"
            @click="setLongVideoMode('vehicle')"
          >
            <Icon icon="mdi:car-hatchback" aria-hidden="true" />
            车辆介绍
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="isVenueFlow"
            :class="{ 'is-active': isVenueFlow }"
            @click="setLongVideoMode('venue')"
          >
            <Icon icon="mdi:office-building-outline" aria-hidden="true" />
            车场介绍
          </button>
        </div>

        <article
          v-if="selectedLongVideoTemplate"
          class="long-selected-template-card"
          aria-label="已选择的长视频模板"
        >
          <PreloadImage
            v-if="resolveTemplatePosterUrl(selectedLongVideoTemplate)"
            class="long-selected-template-card__cover"
            :src="resolveTemplatePosterUrl(selectedLongVideoTemplate)!"
            :alt="selectedLongVideoTemplate.title"
            fit="cover"
          />
          <div v-else class="long-selected-template-card__cover long-selected-template-card__cover--empty">
            <Icon icon="mdi:movie-open-outline" />
          </div>
          <div class="long-selected-template-card__body">
            <strong>{{ selectedLongVideoTemplate.title }}</strong>
            <span>
              {{ selectedLongVideoTemplate.typeLabel }} ·
              {{ selectedLongVideoTemplate.durationSeconds }}S ·
              {{ selectedLongVideoTemplate.styleLabel }}
            </span>
            <div class="long-selected-template-card__tags">
              <em>{{ selectedLongVideoTemplate.typeLabel }}</em>
              <em>{{ selectedLongVideoTemplate.styleLabel }}</em>
              <em>{{ selectedLongVideoTemplate.outputRatio }} {{ selectedLongVideoTemplate.outputRatio === '9:16' ? '竖屏' : '横屏' }}</em>
            </div>
            <small v-if="selectedDigitalHuman">数字人：{{ selectedDigitalHuman.name }}</small>
          </div>
        </article>

    <template v-if="currentView === 'vehicle-upload' || currentView === 'venue-upload'">
      <header class="workflow-heading">
        <p>素材参数</p>
        <h1>{{ isVenueFlow ? '上传车场素材' : '上传车辆素材' }}</h1>
        <span>
          {{
            isVenueFlow
              ? '选择能体现门店环境与服务能力的清晰素材'
              : '清晰、稳定的素材能显著提升成片效果'
          }}
        </span>
      </header>

      <div class="upload-slot-grid" :class="{ 'is-venue': isVenueFlow }">
        <label
          v-for="slot in currentUploadSlots"
          :key="slot.label"
          class="upload-slot"
          :class="{ 'is-uploaded': uploadedFiles[slot.label] }"
        >
          <input
            class="upload-slot-input"
            type="file"
            :accept="slot.acceptValue"
            @change="handleFileChange(slot.label, $event)"
          />
          <span
            v-if="!uploadedFiles[slot.label]"
            class="upload-slot-icon"
            aria-hidden="true"
          >
            <Icon icon="mdi:tray-arrow-up" />
          </span>
          <template v-if="uploadedFiles[slot.label]">
            <header class="uploaded-slot-header">
              <div>
                <Icon
                  :icon="
                    uploadedFiles[slot.label].type.startsWith('video/')
                      ? 'mdi:file-video-outline'
                      : 'mdi:file-image-outline'
                  "
                />
                <strong>{{ slot.label }}</strong>
              </div>
              <span
                class="uploaded-slot-remove"
                role="button"
                tabindex="0"
                aria-label="删除素材"
                @click.prevent.stop="removeUploadedFile(slot.label)"
                @keyup.enter.prevent.stop="removeUploadedFile(slot.label)"
              >
                <Icon icon="mdi:close" />
              </span>
            </header>
            <p class="uploaded-slot-name">
              {{ uploadedFiles[slot.label].name }} ·
              {{ formatFileSize(uploadedFiles[slot.label].size) }}
            </p>
            <video
              v-if="uploadedFiles[slot.label].type.startsWith('video/')"
              class="uploaded-slot-preview"
              :src="uploadedFiles[slot.label].url"
              controls
              preload="metadata"
              @click.stop
            />
            <img
              v-else
              class="uploaded-slot-preview"
              :src="uploadedFiles[slot.label].url"
              :alt="slot.label"
            />
            <span class="uploaded-slot-ready">
              <Icon icon="mdi:check-circle-outline" />
              素材已就绪
            </span>
          </template>
          <template v-else>
            <strong>{{ slot.label }}</strong>
            <span>点击上传</span>
            <small>{{ slot.accept }}</small>
          </template>
        </label>
      </div>
    </template>

    <template v-else-if="currentView === 'vehicle-info'">
      <header class="workflow-heading">
        <p>车型参数</p>
        <h1>车辆五维信息</h1>
        <span>输入 VIN 车架号，自动获取车辆完整信息</span>
      </header>

      <section class="vin-query-panel">
        <div class="vin-query-copy">
          <span class="vin-query-icon" aria-hidden="true">
            <Icon icon="mdi:barcode-scan" />
          </span>
          <div class="vin-query-copy-text">
            <h2>VIN 智能识别</h2>
            <p>请输入车辆行驶证上的 17 位 VIN 车架号</p>
          </div>
        </div>
        <div class="vin-query-form">
          <div class="vin-query-form-primary">
            <div class="vin-input-wrap">
              <Icon icon="mdi:car-search-outline" aria-hidden="true" />
              <input
                v-model="vin"
                maxlength="17"
                placeholder="请输入 17 位 VIN 车架号"
                @keyup.enter="handleVinQuery"
              />
              <span>{{ vin.length }}/17</span>
            </div>
            <button type="button" :disabled="vinLoading" @click="handleVinQuery">
              <Icon :icon="vinLoading ? 'mdi:loading' : 'mdi:magnify'" :class="{ 'is-spinning': vinLoading }" />
              {{ vinLoading ? '查询中' : '查询车辆' }}
            </button>
          </div>
          <div class="vin-query-form-secondary">
            <label class="vin-image-button" :class="{ 'is-loading': vinOcrLoading }">
              <input
                type="file"
                accept="image/jpeg,image/png"
                :disabled="vinOcrLoading || vinLoading"
                @change="handleVinImageChange"
              />
              <Icon :icon="vinOcrLoading ? 'mdi:loading' : 'mdi:image-search-outline'" :class="{ 'is-spinning': vinOcrLoading }" />
              {{ vinOcrLoading ? '识别中' : '图片识别' }}
            </label>
            <button type="button" class="vin-manual-button" @click="startManualVehicleInfoInput">
              <Icon icon="mdi:pencil-outline" aria-hidden="true" />
              手动录入
            </button>
          </div>
        </div>
      </section>

      <section v-if="vehicleInfo" class="vehicle-info-panel">
        <header>
          <div class="vehicle-info-panel-title">
            <span class="vehicle-info-status-icon" aria-hidden="true">
              <Icon icon="mdi:check-circle-outline" />
            </span>
            <div>
              <h2>车辆基础信息</h2>
              <p>识别结果仅供参考，所有信息均可直接修改。</p>
            </div>
          </div>
          <span v-if="vin" class="vehicle-vin">{{ vin }}</span>
        </header>

        <section v-if="vehicleCandidates.length" class="vehicle-candidate-section">
          <div class="vehicle-candidate-heading">
            <div>
              <strong>请选择准确车型与年款</strong>
              <span>VIN 匹配到 {{ vehicleCandidates.length }} 个相近结果，请根据实车信息确认</span>
            </div>
            <span class="vehicle-candidate-count">
              <Icon icon="mdi:format-list-bulleted" aria-hidden="true" />
              {{ vehicleCandidates.length }} 个候选
            </span>
          </div>
          <div class="vehicle-candidate-grid">
            <label
              v-for="(candidate, index) in vehicleCandidates"
              :key="candidate.carid"
              class="vehicle-candidate-card"
              :class="{ 'is-selected': selectedVehicleCandidateId === candidate.carid }"
            >
              <input
                type="radio"
                name="vehicle-candidate"
                :value="candidate.carid"
                :checked="selectedVehicleCandidateId === candidate.carid"
                @change="selectVehicleCandidate(candidate)"
              />
              <span class="vehicle-candidate-radio" aria-hidden="true"></span>
              <span class="vehicle-candidate-content">
                <span class="vehicle-candidate-name">
                  {{ candidate.name }}
                  <em v-if="index === 0">推荐</em>
                </span>
                <span class="vehicle-candidate-meta">
                  <span v-if="candidate.displacement">{{ candidate.displacement }}</span>
                  <span v-if="candidate.price">指导价 {{ candidate.price }}</span>
                </span>
              </span>
            </label>
          </div>
        </section>

        <dl class="vehicle-info-grid">
          <div
            v-for="item in displayedCoreFields"
            :key="item.key"
          >
            <dt>{{ item.label }}</dt>
            <dd>
              <input
                class="vehicle-info-input"
                type="text"
                :value="item.value"
                :aria-label="item.label"
                :placeholder="`请输入${item.label}`"
                @input="updateVehicleInfo(item.key, $event)"
              />
            </dd>
          </div>
        </dl>
      </section>
    </template>

    <template v-else>
      <header class="workflow-heading template-heading">
        <p>模板参数</p>
        <h1>选择数字人与模板</h1>
        <span>选择适合当前车辆的单车品介绍模板</span>
      </header>

      <section class="long-template-panel">
        <header class="long-template-toolbar">
          <div>
            <h2>单车品介绍</h2>
            <p>仅展示适用于车辆介绍的模板</p>
          </div>
          <label class="long-template-search">
            <Icon icon="mdi:magnify" aria-hidden="true" />
            <input
              v-model="templateSearch"
              type="search"
              placeholder="搜索模板名称或关键词..."
            />
          </label>
        </header>

        <div v-if="templatesLoading && !longVideoTemplates.length" class="template-empty">
          <Icon icon="mdi:loading" class="is-spinning" />
          <span>正在加载车辆模板</span>
        </div>
        <div v-else-if="!longVideoTemplates.length" class="template-empty">
          <Icon icon="mdi:movie-search-outline" />
          <span>暂无匹配的单车品介绍模板</span>
        </div>
        <div v-else class="long-template-grid">
          <article
            v-for="item in longVideoTemplates"
            :key="item.templateId"
            class="long-template-card"
            :class="{ 'is-selected': selectedLongVideoTemplateId === item.templateId }"
            role="button"
            tabindex="0"
            @click="openLongVideoTemplatePreview(item)"
            @keyup.enter="openLongVideoTemplatePreview(item)"
          >
            <div class="long-template-media">
              <PreloadImage
                v-if="resolveTemplatePosterUrl(item)"
                class="long-template-cover"
                :src="resolveTemplatePosterUrl(item)!"
                :alt="item.title"
                fit="cover"
                loading="lazy"
              />
              <HoverPreviewVideo
                v-if="resolveTemplatePreviewUrl(item)"
                class="long-template-cover"
                :src="resolveTemplatePreviewUrl(item)!"
                :alt="item.title"
                :defer-src-until-hover="Boolean(resolveTemplatePosterUrl(item))"
                :preload="resolveTemplatePosterUrl(item) ? 'none' : 'metadata'"
                lazy
              />
              <span
                v-if="selectedLongVideoTemplateId === item.templateId"
                class="long-template-selected"
              >
                已选
              </span>
              <div class="long-template-caption">
                <strong>{{ item.title }}</strong>
                <span>{{ item.styleLabel }}</span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </template>
      </main>

      <aside class="long-video-picker-panel" aria-label="长视频模板与数字人">
        <section class="long-picker-section">
          <header class="long-picker-header">
            <div>
              <p>模板库</p>
              <h2>{{ isVenueFlow ? '车场介绍模板' : '单车介绍模板' }}</h2>
            </div>
            <label class="long-template-search long-template-search--compact">
              <Icon icon="mdi:magnify" aria-hidden="true" />
              <input
                v-model="templateSearch"
                type="search"
                placeholder="搜索模板..."
              />
            </label>
          </header>

          <div v-if="templatesLoading && !longVideoTemplates.length" class="template-empty template-empty--compact">
            <Icon icon="mdi:loading" class="is-spinning" />
            <span>正在加载模板</span>
          </div>
          <div v-else-if="!longVideoTemplates.length" class="template-empty template-empty--compact">
            <Icon icon="mdi:movie-search-outline" />
            <span>暂无匹配模板</span>
          </div>
          <div v-else class="long-picker-template-grid">
            <article
              v-for="item in longVideoTemplates"
              :key="item.templateId"
              class="long-template-card long-template-card--compact"
              :class="{ 'is-selected': selectedLongVideoTemplateId === item.templateId }"
              role="button"
              tabindex="0"
              @click="openLongVideoTemplatePreview(item)"
              @keyup.enter="openLongVideoTemplatePreview(item)"
            >
              <div class="long-template-media">
                <PreloadImage
                  v-if="resolveTemplatePosterUrl(item)"
                  class="long-template-cover"
                  :src="resolveTemplatePosterUrl(item)!"
                  :alt="item.title"
                  fit="cover"
                  loading="lazy"
                />
                <HoverPreviewVideo
                  v-if="resolveTemplatePreviewUrl(item)"
                  class="long-template-cover"
                  :src="resolveTemplatePreviewUrl(item)!"
                  :alt="item.title"
                  :defer-src-until-hover="Boolean(resolveTemplatePosterUrl(item))"
                  :preload="resolveTemplatePosterUrl(item) ? 'none' : 'metadata'"
                  lazy
                />
                <span
                  v-if="selectedLongVideoTemplateId === item.templateId"
                  class="long-template-selected"
                >
                  已选
                </span>
                <div class="long-template-caption">
                  <strong>{{ item.title }}</strong>
                </div>
              </div>
            </article>
          </div>
        </section>

      </aside>
    </div>

    <footer class="workflow-footer">
      <button
        type="button"
        class="workflow-button is-previous"
        :disabled="currentView === 'vehicle-upload' || currentView === 'venue-upload'"
        @click="handlePreviousStep"
      >
        上一步
      </button>
      <div class="workflow-footer-actions">
        <button type="button" class="workflow-button is-save">保存草稿</button>
        <button
          type="button"
          class="workflow-button is-next"
          :disabled="
            (currentView === 'vehicle-info' && !vehicleInfo) ||
            (currentView === 'vehicle-template' && !selectedLongVideoTemplateId)
          "
          @click="handleNextStep"
        >
          下一步
          <Icon icon="mdi:arrow-right" aria-hidden="true" />
        </button>
      </div>
    </footer>
  </section>

  <NModal
    v-if="templatePreviewSession"
    :show="true"
    to="body"
    :mask-closable="true"
    transform-origin="center"
    @update:show="handleLongVideoPreviewVisibleChange"
  >
    <div class="lv-preview-dialog">
      <header class="lv-preview-dialog__head">
        <h3>{{ templatePreviewSession.title }}</h3>
        <button type="button" aria-label="关闭" @click="closeLongVideoTemplatePreview">
          <Icon icon="mdi:close" />
        </button>
      </header>

      <div class="lv-preview-dialog__body">
        <div class="lv-preview-dialog__main">
          <div class="lv-preview-dialog__media">
            <TemplatePreviewVideoPlayer
              v-if="resolveTemplatePreviewUrl(templatePreviewSession)"
              :key="templatePreviewSession.templateId"
              :src="resolveTemplatePreviewUrl(templatePreviewSession)!"
              :poster="resolveTemplatePosterUrl(templatePreviewSession) ?? undefined"
              :template-id="templatePreviewSession.templateId"
            />
            <PreloadImage
              v-else-if="resolveTemplatePosterUrl(templatePreviewSession)"
              :src="resolveTemplatePosterUrl(templatePreviewSession)!"
              :alt="templatePreviewSession.title"
              fit="contain"
            />
            <div v-else class="lv-preview-dialog__video-empty">
              <Icon icon="mdi:movie-open-outline" />
            </div>
          </div>

          <div class="lv-preview-dialog__meta">
            <div class="lv-preview-dialog__tags">
              <span>最长时长：{{ templatePreviewSession.durationSeconds }}s</span>
              <span class="is-accent">
                视频内容：{{ templatePreviewSession.previewSubtitle || templatePreviewSession.styleLabel }}
              </span>
            </div>
            <p v-if="templatePreviewSession.description || templatePreviewSession.stylePrompt">
              {{ templatePreviewSession.description || templatePreviewSession.stylePrompt }}
            </p>
            <button
              type="button"
              class="lv-preview-dialog__confirm"
              :disabled="!previewDigitalHumanId"
              @click="confirmLongVideoTemplatePreview"
            >
              确认使用此模板
            </button>
          </div>
        </div>

        <div class="lv-preview-dialog__humans">
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
              @click="selectPreviewDigitalHuman(human)"
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
              <span>{{ human.name }}</span>
            </button>
          </div>
          <p v-else class="lv-preview-dialog__humans-empty">暂无可用数字人</p>
        </div>
      </div>
    </div>
  </NModal>
</template>

<style scoped lang="scss">
.long-video-workbench {
  --lv-primary: #2f7cff;
  --lv-primary-soft: #eaf2ff;
  --lv-green: #15966f;
  --lv-green-soft: #e8f6f1;
  --lv-panel: var(--workspace-panel, var(--app-surface));
  --lv-surface: var(--workspace-panel-soft, var(--app-surface-soft));
  --lv-border: var(--workspace-line, var(--app-border));
  --lv-text: var(--workspace-text, var(--app-text));
  --lv-muted: var(--workspace-text-secondary, var(--app-text-soft));

  min-height: 100%;
  padding: clamp(22px, 3vw, 42px);
  color: var(--lv-text);
}

.workbench-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
}

h1 {
  margin: 0;
  font-size: clamp(28px, 2.3vw, 38px);
  letter-spacing: -0.04em;
}

.workbench-description {
  margin: 12px 0 0;
  color: var(--lv-muted);
  font-size: 15px;
}

.project-summary {
  display: flex;
  min-width: 360px;
  margin: 0;
  padding: 18px 10px;
  border: 1px solid var(--lv-border);
  border-radius: 16px;
  background: var(--lv-panel);
}

.project-summary div {
  display: flex;
  flex: 1;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  border-right: 1px solid var(--lv-border);
}

.project-summary div:last-child {
  border-right: 0;
}

.project-summary dt {
  font-size: 27px;
  font-weight: 800;
}

.project-summary dd {
  margin: 0;
  color: var(--lv-muted);
  font-size: 13px;
}

.project-type-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-top: 28px;
}

.project-type-card {
  position: relative;
  min-height: 300px;
  overflow: hidden;
  padding: 30px 30px 0;
  border: 1px solid var(--lv-border);
  border-radius: 18px;
  background: var(--lv-panel);
}

.card-decoration {
  position: absolute;
  top: -95px;
  right: -70px;
  width: 230px;
  height: 230px;
  border-radius: 50%;
  background: var(--lv-primary-soft);
  opacity: 0.8;
}

.project-type-card.is-green .card-decoration {
  background: var(--lv-green-soft);
}

.type-badge {
  position: absolute;
  z-index: 1;
  top: 30px;
  right: 30px;
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--lv-primary-soft);
  color: var(--lv-primary);
  font-size: 12px;
  font-weight: 700;
}

.type-icon,
.recent-icon {
  display: grid;
  place-items: center;
  border-radius: 13px;
  background: var(--lv-primary-soft);
  color: var(--lv-primary);
}

.type-icon {
  position: relative;
  width: 50px;
  height: 50px;
  font-size: 25px;
}

.is-green .type-icon,
.recent-row.is-green .recent-icon {
  background: var(--lv-green-soft);
  color: var(--lv-green);
}

.project-type-card h2 {
  margin: 26px 0 0;
  font-size: 23px;
}

.project-type-card > p {
  margin: 12px 0 0;
  color: var(--lv-muted);
}

.type-requirement {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
}

.type-action {
  position: absolute;
  right: 30px;
  bottom: 0;
  left: 30px;
  display: flex;
  height: 72px;
  align-items: center;
  justify-content: space-between;
  border: 0;
  border-top: 1px solid var(--lv-border);
  color: var(--lv-primary);
  font-weight: 700;
  appearance: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
}

.type-action span {
  display: flex;
  align-items: center;
  gap: 9px;
}

.is-green .type-action {
  color: var(--lv-green);
}

.generating-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
  padding: 16px 22px;
  border: 1px solid color-mix(in srgb, var(--lv-primary) 30%, var(--lv-border));
  border-radius: 15px;
  background: color-mix(in srgb, var(--lv-primary-soft) 68%, var(--lv-panel));
}

.generating-play {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: var(--lv-primary);
  color: #fff;
}

.generating-content {
  width: min(520px, 48%);
}

.generating-title {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  font-size: 13px;
}

.generating-title strong {
  color: var(--lv-primary);
}

.progress-track {
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--lv-primary) 12%, var(--lv-border));
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--lv-primary);
}

.generating-state {
  margin-left: auto;
  color: var(--lv-muted);
  font-size: 13px;
}

.row-arrow {
  font-size: 22px;
}

.recent-panel {
  overflow: hidden;
  margin-top: 20px;
  border: 1px solid var(--lv-border);
  border-radius: 18px;
  background: var(--lv-panel);
}

.recent-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 28px;
}

.recent-header h2 {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0;
  font-size: 18px;
}

.recent-header h2 svg,
.view-all {
  color: var(--lv-primary);
}

.recent-header p {
  margin: 6px 0 0 28px;
  color: var(--lv-muted);
  font-size: 13px;
}

.view-all,
.recent-action {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
}

.recent-row {
  display: grid;
  grid-template-columns: 44px minmax(220px, 1fr) minmax(120px, 220px) auto auto;
  align-items: center;
  gap: 18px;
  padding: 18px 28px;
  border-top: 1px solid var(--lv-border);
}

.recent-icon {
  width: 40px;
  height: 40px;
  font-size: 20px;
}

.recent-info {
  display: grid;
  gap: 5px;
}

.recent-info span,
.recent-action {
  color: var(--lv-muted);
  font-size: 13px;
}

.recent-status {
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--lv-surface);
  color: var(--lv-muted);
  font-size: 12px;
  white-space: nowrap;
}

.recent-row.is-green .recent-status {
  background: var(--lv-primary-soft);
  color: var(--lv-primary);
}

:global(.workspace-page.theme-dark) .long-video-workbench {
  --lv-primary: #66a0ff;
  --lv-primary-soft: #182a47;
  --lv-green: #52cba2;
  --lv-green-soft: #15372f;
}

:global(.workspace-page.theme-dark) .project-type-card,
:global(.workspace-page.theme-dark) .project-summary,
:global(.workspace-page.theme-dark) .recent-panel {
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.025);
}

.vehicle-upload-workflow {
  --lv-primary: #2f7cff;
  --lv-primary-soft: #eaf2ff;
  --lv-panel: var(--workspace-panel, var(--app-surface));
  --lv-surface: var(--workspace-panel-soft, var(--app-surface-soft));
  --lv-border: var(--workspace-line, var(--app-border));
  --lv-text: var(--workspace-text, var(--app-text));
  --lv-muted: var(--workspace-text-secondary, var(--app-text-soft));

  display: flex;
  box-sizing: border-box;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  padding: 20px;
  color: var(--lv-text);
}

.long-video-compose-grid {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: minmax(400px, 470px) minmax(560px, 1fr);
  gap: 18px;
  overflow: hidden;
}

.long-video-params-panel,
.long-video-picker-panel {
  min-width: 0;
  min-height: 0;
}

.long-video-params-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: auto;
  padding: 2px 4px 96px 0;
}

.long-video-picker-panel {
  overflow: auto;
  padding: 18px;
  border: 1px solid var(--lv-border);
  border-radius: 16px;
  background: var(--lv-panel);
}

.long-video-compose-heading {
  margin-bottom: 0;
}

.long-video-mode-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 5px;
  border: 1px solid var(--lv-border);
  border-radius: 14px;
  background: var(--lv-panel);
}

.long-video-mode-switch button {
  display: inline-flex;
  height: 40px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--lv-muted);
  cursor: pointer;
  font: inherit;
  font-weight: 800;
}

.long-selected-template-card {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 14px;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--lv-primary) 44%, var(--lv-border));
  border-radius: 16px;
  background: var(--lv-panel);
  box-shadow: 0 10px 26px color-mix(in srgb, var(--lv-primary) 8%, transparent);
}

.long-selected-template-card__cover {
  width: 88px;
  height: 106px;
  overflow: hidden;
  border-radius: 10px;
  background: var(--lv-surface);
}

.long-selected-template-card__cover--empty {
  display: grid;
  place-items: center;
  color: var(--lv-muted);
  font-size: 28px;
}

.long-selected-template-card__body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.long-selected-template-card__body strong {
  overflow: hidden;
  color: var(--lv-text);
  font-size: 18px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.long-selected-template-card__body span,
.long-selected-template-card__body small {
  overflow: hidden;
  color: var(--lv-muted);
  font-size: 13px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.long-selected-template-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.long-selected-template-card__tags em {
  padding: 5px 9px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--lv-primary) 10%, var(--lv-surface));
  color: var(--lv-primary);
  font-size: 12px;
  font-style: normal;
  font-weight: 800;
}

.long-video-mode-switch button.is-active {
  background: var(--lv-primary);
  color: #fff;
  box-shadow: 0 8px 18px color-mix(in srgb, var(--lv-primary) 22%, transparent);
}

.long-picker-section + .long-picker-section {
  margin-top: 26px;
}

.long-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.long-picker-header p {
  margin: 0 0 5px;
  color: var(--lv-muted);
  font-size: 13px;
  font-weight: 800;
}

.long-picker-header h2 {
  margin: 0;
  font-size: 19px;
}

.long-template-search--compact {
  width: min(300px, 48%);
  height: 42px;
  border-radius: 10px;
}

.long-picker-template-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.long-template-card--compact {
  border-radius: 14px;
}

.long-template-card--compact .long-template-caption {
  right: 12px;
  bottom: 12px;
  left: 12px;
}

.long-template-card--compact .long-template-caption strong {
  font-size: 14px;
}

.template-empty--compact {
  min-height: 180px;
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
  cursor: pointer;
  font-size: 20px;
}

.lv-preview-dialog__head button:hover {
  background: #f5f5f5;
}

.lv-preview-dialog__body {
  display: grid;
  min-height: 0;
  flex: 1;
  grid-template-columns: 1fr 1fr;
}

.lv-preview-dialog__main {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  border-right: 1px solid #eee;
  background: #fafafa;
}

.lv-preview-dialog__media {
  display: flex;
  min-height: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 12px 16px;
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

.lv-preview-dialog__video-empty {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: #999;
  font-size: 48px;
}

.lv-preview-dialog__meta {
  flex-shrink: 0;
  padding: 10px 16px 14px;
  border-top: 1px solid #eee;
  background: #fff;
}

.lv-preview-dialog__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.lv-preview-dialog__tags span {
  padding: 3px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
}

.lv-preview-dialog__tags .is-accent {
  background: #fff7e6;
  color: #b8860b;
}

.lv-preview-dialog__meta p {
  margin: 0 0 12px;
  color: #334155;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.55;
}

.lv-preview-dialog__confirm {
  display: inline-flex;
  width: 100%;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  border: 0;
  border-radius: 10px;
  background: #d4a017;
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  transition:
    background 0.15s ease,
    opacity 0.15s ease;
}

.lv-preview-dialog__confirm:hover:not(:disabled) {
  background: #e5b85c;
}

.lv-preview-dialog__confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lv-preview-dialog__humans {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  padding: 16px 20px;
}

.lv-preview-dialog__humans h4 {
  margin: 0 0 4px;
  color: #111;
  font-size: 15px;
  font-weight: 700;
}

.lv-preview-dialog__humans p {
  margin: 0 0 12px;
  color: #888;
  font-size: 12px;
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
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 8px;
  background: #f0f0f0;
  color: #d4a017;
  font-size: 24px;
}

.lv-preview-dialog__human-avatar :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lv-preview-dialog__human > span:last-child {
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

.vehicle-upload-workflow.is-venue-flow {
  position: relative;
  height: 100%;
  min-height: 0;
  padding-bottom: 96px;
  overflow: hidden;
}

:global(.workspace-col-scroll:has(.is-venue-flow)) {
  overflow-y: hidden;
}

.is-venue-flow .workflow-heading {
  flex: 0 0 auto;
  margin: 22px 0 20px;
}

.is-venue-flow .upload-slot-grid {
  min-height: 0;
  flex: 0 0 clamp(260px, 32vh, 340px);
}

.is-venue-flow .upload-slot {
  height: 100%;
  min-height: 0;
}

.is-venue-flow .workflow-footer {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  margin: 0;
}

.workflow-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.workflow-back {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 7px;
  margin-bottom: 18px;
  padding: 7px 4px;
  border: 0;
  background: transparent;
  color: var(--lv-muted);
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  transition:
    color 0.2s ease,
    transform 0.2s ease;
}

.workflow-back:hover {
  color: var(--lv-primary);
  transform: translateX(-2px);
}

.workflow-step {
  display: flex;
  height: 72px;
  align-items: center;
  gap: 14px;
  padding: 0 20px;
  border: 1px solid var(--lv-border);
  border-radius: 15px;
  background: var(--lv-panel);
  color: var(--lv-muted);
}

.workflow-step span {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: var(--lv-surface);
  font-weight: 800;
}

.workflow-step strong {
  font-size: 15px;
}

.workflow-step.is-active {
  border-color: color-mix(in srgb, var(--lv-primary) 62%, var(--lv-border));
  background: color-mix(in srgb, var(--lv-primary-soft) 52%, var(--lv-panel));
  color: var(--lv-primary);
  box-shadow: 0 10px 26px color-mix(in srgb, var(--lv-primary) 8%, transparent);
}

.workflow-step.is-active span {
  background: var(--lv-primary);
  color: #fff;
}

.workflow-step.is-complete {
  color: var(--lv-primary);
}

.workflow-step.is-complete span {
  background: color-mix(in srgb, var(--lv-primary) 14%, var(--lv-panel));
  color: var(--lv-primary);
}

.workflow-heading {
  margin: 4px 0 2px;
}

.workflow-heading p {
  margin: 0 0 6px;
  color: var(--lv-primary);
  font-size: 13px;
  font-weight: 800;
}

.workflow-heading h1 {
  margin: 0;
  font-size: 26px;
  letter-spacing: 0;
}

.workflow-heading span {
  display: block;
  margin-top: 8px;
  color: var(--lv-muted);
  font-size: 14px;
}

.upload-slot-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  overflow: visible;
  padding-bottom: 0;
}

.upload-slot-grid.is-venue {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  overflow-x: hidden;
}

.upload-slot-grid.is-venue .upload-slot {
  min-height: 0;
}

.upload-slot {
  display: flex;
  min-width: 0;
  min-height: 154px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  box-sizing: border-box;
  padding: 18px 14px;
  border: 1px dashed color-mix(in srgb, var(--lv-muted) 48%, var(--lv-border));
  border-radius: 14px;
  background: var(--lv-panel);
  color: var(--lv-text);
  cursor: pointer;
  font-family: inherit;
  text-align: center;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;
}

.upload-slot-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

.upload-slot:hover {
  border-color: var(--lv-primary);
  background: color-mix(in srgb, var(--lv-primary-soft) 28%, var(--lv-panel));
  transform: translateY(-2px);
}

.upload-slot.is-uploaded {
  align-items: stretch;
  justify-content: flex-start;
  padding: 16px;
  border-color: color-mix(in srgb, #22a06b 65%, var(--lv-border));
  background: var(--lv-panel);
  text-align: left;
}

.upload-slot.is-uploaded .upload-slot-icon {
  background: color-mix(in srgb, #22a06b 14%, var(--lv-panel));
  color: #22a06b;
}

.uploaded-slot-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.uploaded-slot-header > div {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.uploaded-slot-header > div > svg {
  flex: 0 0 auto;
  color: var(--lv-primary);
  font-size: 21px;
}

.uploaded-slot-header strong {
  overflow: hidden;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uploaded-slot-remove {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  margin: 0;
  place-items: center;
  border-radius: 7px;
  color: var(--lv-muted);
  cursor: pointer;
  font-size: 18px;
}

.uploaded-slot-remove:hover {
  background: var(--lv-surface);
  color: #e5484d;
}

.uploaded-slot-name {
  overflow: hidden;
  margin: 7px 0 10px;
  color: var(--lv-muted);
  font-size: 11px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.uploaded-slot-preview {
  display: block;
  width: 100%;
  min-height: 0;
  flex: 1;
  overflow: hidden;
  border-radius: 10px;
  background: #0d1117;
  object-fit: cover;
}

.uploaded-slot-ready {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 10px 0 0 !important;
  color: #15966f !important;
  font-size: 12px !important;
  font-weight: 700;
}

.upload-slot-icon {
  display: grid;
  width: 46px;
  height: 46px;
  margin-bottom: 12px;
  place-items: center;
  border-radius: 13px;
  background: var(--lv-primary-soft);
  color: var(--lv-primary);
  font-size: 24px;
}

.upload-slot strong {
  max-width: 100%;
  overflow: hidden;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-slot em {
  margin-left: 3px;
  color: #f04444;
  font-style: normal;
}

.upload-slot > span:not(.upload-slot-icon) {
  margin-top: 7px;
  color: var(--lv-muted);
  font-size: 12px;
}

.upload-slot small {
  max-width: 100%;
  margin-top: 8px;
  color: color-mix(in srgb, var(--lv-muted) 75%, transparent);
  font-size: 11px;
  line-height: 1.45;
  word-break: break-word;
}

.vin-query-panel,
.vehicle-info-panel {
  border: 1px solid var(--lv-border);
  border-radius: 18px;
  background: var(--lv-panel);
}

.vin-query-panel {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
  padding: 20px 24px;
}

.vin-query-copy {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.vin-query-icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 11px;
  background: var(--lv-primary-soft);
  color: var(--lv-primary);
  font-size: 22px;
}

.vin-query-copy-text {
  display: grid;
  gap: 3px;
}

.vin-query-copy h2,
.vehicle-info-panel h2 {
  margin: 0;
  font-size: 17px;
}

.vin-query-copy p,
.vehicle-info-panel header p {
  margin: 0;
  color: var(--lv-muted);
  font-size: 13px;
}

.vin-query-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.vin-query-form-primary {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.vin-query-form-primary .vin-input-wrap {
  width: 100%;
  box-sizing: border-box;
}

.vin-query-form-primary button {
  width: 100%;
  height: 46px;
}

.vin-query-form-secondary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.vin-query-form-secondary .vin-image-button,
.vin-query-form-secondary .vin-manual-button {
  width: 100%;
  height: 40px;
}

.vin-input-wrap {
  display: flex;
  height: 48px;
  flex: 1;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border: 1px solid var(--lv-border);
  border-radius: 11px;
  background: var(--lv-surface);
  color: var(--lv-muted);
}

.vin-input-wrap:focus-within {
  border-color: var(--lv-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--lv-primary) 11%, transparent);
}

.vin-input-wrap input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--lv-text);
  font: inherit;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.vin-input-wrap span {
  font-size: 12px;
}

.vin-query-form button {
  display: inline-flex;
  min-width: 112px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 16px;
  border: 0;
  border-radius: 11px;
  background: var(--lv-primary);
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
}

.vin-image-button {
  display: inline-flex;
  min-width: 112px;
  height: 40px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 16px;
  border: 1px solid color-mix(in srgb, var(--lv-primary) 45%, var(--lv-border));
  border-radius: 11px;
  background: var(--lv-panel);
  color: var(--lv-primary);
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
}

.vin-image-button input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.vin-image-button.is-loading {
  cursor: wait;
  opacity: 0.72;
}

.vin-query-form button:disabled {
  cursor: wait;
  opacity: 0.72;
}

.vin-query-form .vin-manual-button {
  border: 1px solid color-mix(in srgb, var(--lv-primary) 36%, var(--lv-border));
  background: var(--lv-primary-soft);
  color: var(--lv-primary);
}

.is-spinning {
  animation: vin-spin 0.9s linear infinite;
}

@keyframes vin-spin {
  to {
    transform: rotate(360deg);
  }
}

.vehicle-info-panel {
  margin-top: 18px;
  padding: 22px 24px;
}

.vehicle-info-panel > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--lv-border);
}

.vehicle-vin {
  padding: 7px 11px;
  border-radius: 8px;
  background: var(--lv-primary-soft);
  color: var(--lv-primary);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
  letter-spacing: 0.06em;
}

.vehicle-info-panel-title {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
}

.vehicle-info-status-icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 11px;
  background: color-mix(in srgb, #22a06b 14%, var(--lv-panel));
  color: #22a06b;
  font-size: 22px;
}

.vehicle-candidate-section {
  padding: 20px 0 4px;
}

.vehicle-candidate-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.vehicle-candidate-heading > div {
  display: grid;
  gap: 4px;
}

.vehicle-candidate-heading strong {
  color: var(--lv-text);
  font-size: 14px;
}

.vehicle-candidate-heading > div > span {
  color: var(--lv-muted);
  font-size: 12px;
}

.vehicle-candidate-count {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border-radius: 7px;
  background: var(--lv-primary-soft);
  color: var(--lv-primary);
  font-size: 12px;
  font-weight: 700;
}

.vehicle-candidate-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.vehicle-candidate-card {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 10px;
  padding: 13px 14px;
  border: 1px solid var(--lv-border);
  border-radius: 10px;
  background: var(--lv-surface);
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease;
}

.vehicle-candidate-card:hover {
  border-color: color-mix(in srgb, var(--lv-primary) 50%, var(--lv-border));
}

.vehicle-candidate-card.is-selected {
  border-color: var(--lv-primary);
  background: color-mix(in srgb, var(--lv-primary-soft) 42%, var(--lv-panel));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--lv-primary) 8%, transparent);
}

.vehicle-candidate-card > input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.vehicle-candidate-radio {
  width: 15px;
  height: 15px;
  flex: 0 0 auto;
  margin-top: 2px;
  border: 1.5px solid color-mix(in srgb, var(--lv-muted) 65%, var(--lv-border));
  border-radius: 50%;
  background: var(--lv-panel);
  box-shadow: inset 0 0 0 3px var(--lv-panel);
}

.vehicle-candidate-card.is-selected .vehicle-candidate-radio {
  border-color: var(--lv-primary);
  background: var(--lv-primary);
}

.vehicle-candidate-content {
  display: grid;
  min-width: 0;
  gap: 6px;
}

.vehicle-candidate-name {
  color: var(--lv-text);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
}

.vehicle-candidate-name em {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--lv-primary);
  color: #fff;
  font-size: 10px;
  font-style: normal;
  line-height: 18px;
  vertical-align: 1px;
}

.vehicle-candidate-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 12px;
  color: var(--lv-muted);
  font-size: 11px;
}

.vehicle-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin: 20px 0 0;
}

.vehicle-info-grid div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border: 1px solid var(--lv-border);
  border-radius: 12px;
  background: var(--lv-surface);
}

.vehicle-info-grid dt {
  color: var(--lv-muted);
  font-size: 12px;
}

.vehicle-info-grid dd {
  margin: 0;
  width: 100%;
}

.vehicle-info-input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  height: 40px;
  padding: 0 11px;
  border: 1px solid var(--lv-border);
  border-radius: 8px;
  outline: none;
  background: var(--lv-panel);
  color: var(--lv-text);
  font: inherit;
  font-weight: 600;
}

.vehicle-info-input:focus {
  border-color: var(--lv-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--lv-primary) 12%, transparent);
}

.vehicle-info-input::placeholder {
  color: color-mix(in srgb, var(--lv-muted) 65%, transparent);
  font-weight: 400;
}

.template-heading {
  margin-bottom: 22px;
}

.long-template-panel {
  padding: 22px;
  border: 1px solid var(--lv-border);
  border-radius: 18px;
  background: var(--lv-panel);
}

.long-template-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
  margin-bottom: 20px;
}

.long-template-toolbar h2 {
  margin: 0;
  font-size: 19px;
}

.long-template-toolbar p {
  margin: 6px 0 0;
  color: var(--lv-muted);
  font-size: 13px;
}

.long-template-search {
  display: flex;
  width: min(480px, 50%);
  height: 46px;
  align-items: center;
  gap: 10px;
  padding: 0 15px;
  border: 1px solid var(--lv-border);
  border-radius: 12px;
  background: var(--lv-surface);
  color: var(--lv-muted);
}

.long-template-search:focus-within {
  border-color: var(--lv-primary);
}

.long-template-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--lv-text);
  font: inherit;
}

.long-template-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.long-template-card {
  min-width: 0;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 18px;
  background: var(--lv-surface);
  cursor: pointer;
  outline: 0;
}

.long-template-card.is-selected {
  border-color: var(--lv-primary);
  box-shadow: 0 10px 24px color-mix(in srgb, var(--lv-primary) 16%, transparent);
}

.long-template-media {
  position: relative;
  overflow: hidden;
  aspect-ratio: 9 / 13;
  background: var(--lv-surface);
}

.long-template-cover {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.long-template-media::after {
  position: absolute;
  inset: 55% 0 0;
  background: linear-gradient(transparent, rgba(5, 12, 25, 0.82));
  content: '';
  pointer-events: none;
}

.long-template-selected {
  position: absolute;
  z-index: 3;
  top: 14px;
  right: 14px;
  padding: 6px 11px;
  border-radius: 999px;
  background: var(--lv-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
}

.long-template-caption {
  position: absolute;
  z-index: 2;
  right: 18px;
  bottom: 17px;
  left: 18px;
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
  color: #fff;
}

.long-template-caption strong {
  font-size: 17px;
  line-height: 1.4;
}

.long-template-caption span {
  flex: 0 0 auto;
  font-size: 11px;
  opacity: 0.8;
}

.template-empty {
  display: grid;
  min-height: 280px;
  place-items: center;
  align-content: center;
  gap: 12px;
  color: var(--lv-muted);
}

.template-empty svg {
  font-size: 30px;
}

.workflow-footer {
  position: sticky;
  z-index: 4;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  flex: 0 0 auto;
  margin: auto -20px -20px;
  padding: 14px 20px;
  border-top: 1px solid var(--lv-border);
  background: color-mix(in srgb, var(--lv-panel) 94%, transparent);
  box-shadow: 0 -12px 30px rgba(20, 36, 62, 0.06);
  backdrop-filter: blur(14px);
}

.workflow-footer-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.workflow-button {
  display: inline-flex;
  min-width: 104px;
  height: 44px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 20px;
  border: 1px solid var(--lv-border);
  border-radius: 10px;
  background: var(--lv-panel);
  color: var(--lv-text);
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}

.workflow-button:not(:disabled):hover {
  transform: translateY(-1px);
}

.workflow-button.is-save:hover {
  border-color: color-mix(in srgb, var(--lv-primary) 55%, var(--lv-border));
  color: var(--lv-primary);
}

.workflow-button.is-next {
  border-color: var(--lv-primary);
  background: var(--lv-primary);
  color: #fff;
  box-shadow: 0 8px 18px color-mix(in srgb, var(--lv-primary) 22%, transparent);
}

.workflow-button.is-next:hover {
  background: color-mix(in srgb, var(--lv-primary) 88%, #0d3f99);
}

.workflow-button:disabled {
  background: var(--lv-surface);
  color: color-mix(in srgb, var(--lv-muted) 48%, transparent);
  cursor: not-allowed;
}

:global(.workspace-page.theme-dark) .vehicle-upload-workflow {
  --lv-primary: #66a0ff;
  --lv-primary-soft: #182a47;
}

:global(.workspace-page.theme-dark) .workflow-footer {
  box-shadow: 0 -12px 30px rgba(0, 0, 0, 0.24);
}

@media (max-width: 1100px) {
  .long-video-compose-grid {
    grid-template-columns: 1fr;
  }

  .long-picker-template-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .workbench-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .project-summary {
    width: 100%;
  }

  .recent-row {
    grid-template-columns: 44px minmax(180px, 1fr) 130px auto;
  }

  .recent-action {
    display: none;
  }

  .workflow-steps,
  .workflow-steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .upload-slot-grid.is-venue {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .vin-query-panel {
    align-items: stretch;
    flex-direction: column;
  }

  .vehicle-candidate-grid {
    grid-template-columns: 1fr;
  }

  .long-template-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .long-video-compose-grid {
    gap: 16px;
  }

  .long-video-picker-panel {
    padding: 16px;
  }

  .long-picker-header {
    align-items: stretch;
    flex-direction: column;
  }

  .long-template-search--compact {
    width: 100%;
  }

  .long-picker-template-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .lv-preview-dialog {
    width: calc(100vw - 24px);
    height: calc(100vh - 24px);
    min-height: 0;
    max-height: calc(100vh - 24px);
  }

  .lv-preview-dialog__head {
    padding: 14px 18px;
  }

  .lv-preview-dialog__body {
    grid-template-columns: 1fr;
    overflow: auto;
  }

  .lv-preview-dialog__main {
    border-right: 0;
    border-bottom: 1px solid #eee;
  }

  .lv-preview-dialog__media,
  .lv-preview-dialog__humans {
    padding: 18px;
  }

  .lv-preview-dialog__humans-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .long-video-workbench {
    padding: 18px;
  }

  .project-summary {
    min-width: 0;
  }

  .project-summary div {
    align-items: center;
    flex-direction: column;
    gap: 2px;
    padding: 0 8px;
  }

  .project-type-grid {
    grid-template-columns: 1fr;
  }

  .generating-state {
    display: none;
  }

  .generating-content {
    width: 100%;
  }

  .recent-row {
    grid-template-columns: 40px 1fr auto;
  }

  .recent-progress {
    display: none;
  }

  .workflow-steps,
  .workflow-steps {
    grid-template-columns: 1fr;
  }

  .upload-slot-grid.is-venue {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .workflow-step {
    height: 60px;
  }

  .vin-query-form-secondary {
    grid-template-columns: 1fr;
  }

  .vin-query-form-secondary .vin-image-button,
  .vin-query-form-secondary .vin-manual-button {
    height: 46px;
  }

  .vehicle-candidate-heading {
    align-items: flex-start;
  }

  .long-template-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .long-template-search {
    width: 100%;
    box-sizing: border-box;
  }

  .long-template-grid {
    grid-template-columns: 1fr;
  }

  .upload-slot {
    min-height: 230px;
  }

  .workflow-footer {
    margin: auto -18px -18px;
    padding: 14px 18px;
  }

  .workflow-button {
    min-width: 88px;
    padding: 0 14px;
  }
}
</style>
