<script setup lang="ts">
import { computed, inject, onUnmounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useMessage } from 'naive-ui'

import HoverPreviewVideo from '@/components/common/HoverPreviewVideo.vue'
import PreloadImage from '@/components/common/PreloadImage.vue'
import {
  queryVehicleByVin,
  recognizeVinFromImage,
  type VinVehicleInfo,
} from '@/api/vehicle-info'
import { VIDEO_GENERATION_FLOW_KEY } from '@/constants/video-generation'
import {
  resolveTemplatePosterUrl,
  resolveTemplatePreviewUrl,
} from '@/constants/video-template-previews'
import type { VideoGenerationFlow } from '@/composables/useVideoGenerationFlow'
import type { VideoTemplate } from '@/types/video-generation'

const currentView = ref<
  'dashboard' | 'vehicle-upload' | 'vehicle-info' | 'vehicle-template' | 'venue-upload'
>('dashboard')
const message = useMessage()
const videoFlow = inject<VideoGenerationFlow | null>(VIDEO_GENERATION_FLOW_KEY, null)
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
const vehicleInfo = ref<VinVehicleInfo | null>(null)
const showMoreVehicleInfo = ref(false)
const templateSearch = ref('')
const activeWorkflowStep = computed(() => {
  if (currentView.value === 'vehicle-template') return 2
  if (currentView.value === 'vehicle-info') return 1
  return 0
})
const singleCarTemplates = computed(() => {
  const keyword = templateSearch.value.trim().toLowerCase()
  return (videoFlow?.templateList.value ?? []).filter((item) => {
    if (item.type !== 'single-car') return false
    if (!keyword) return true
    return `${item.title} ${item.description ?? ''} ${item.styleLabel}`
      .toLowerCase()
      .includes(keyword)
  })
})
const selectedLongVideoTemplateId = computed(
  () =>
    videoFlow?.selectedTemplate.value?.type === 'single-car'
      ? videoFlow.selectedTemplate.value.templateId
      : '',
)
const templatesLoading = computed(() => videoFlow?.isLoading('bootstrap') ?? false)

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

const isVenueFlow = computed(() => currentView.value === 'venue-upload')
const currentUploadSlots = computed(() =>
  isVenueFlow.value ? venueUploadSlots : uploadSlots,
)

const coreVehicleFields = [
  ['brand_name', '品牌'],
  ['year', '年款'],
  ['sale_name', '车款名称'],
  ['model_name', '车型'],
  ['car_line', '车系'],
  ['effluent_standard', '排放标准'],
  ['engine_type', '发动机型号'],
  ['transmission_type', '变速箱类型'],
  ['fuel_Type', '燃油类型'],
  ['output_volume', '排量'],
] as const

const vehicleFieldLabels: Record<string, string> = {
  vin: '车架号',
  assembly_factory: '制造厂',
  sale_name: '车款名称',
  engine_type: '发动机型号',
  effluent_standard: '排放标准',
  model_name: '车型',
  brand_name: '品牌',
  car_type: '车辆类型',
  power: '功率',
  year: '年款',
  made_month: '生产月份',
  jet_type: '喷油类型',
  transmission_type: '变速箱类型',
  fuel_Type: '燃油类型',
  cylinder_number: '发动机气缸数',
  drive_style: '驱动类型',
  car_line: '车系',
  fuel_num: '燃油标号',
  guiding_price: '新车指导价',
  made_year: '生产年',
  output_volume: '排量',
  stop_year: '停产年',
  air_bag: '安全气囊',
  cylinder_form: '气缸形式',
  seat_num: '座位数',
  vehicle_level: '车辆级别',
  car_body: '轿车结构',
  door_num: '车门数',
  manufacturer: '制造商',
  gears_num: '档位数',
  car_weight: '整备质量',
}

const displayedCoreFields = computed(() =>
  coreVehicleFields.map(([key, label]) => ({
    key,
    label,
    value: formatVehicleValue(vehicleInfo.value?.[key], key),
  })),
)

const remainingVehicleFields = computed(() => {
  if (!vehicleInfo.value) return []
  const coreKeys = new Set<string>(coreVehicleFields.map(([key]) => key))
  return Object.entries(vehicleInfo.value)
    .filter(
      ([key]) =>
        !coreKeys.has(key) &&
        !['showapi_fee_code'].includes(key),
    )
    .map(([key, value]) => ({
      key,
      label: vehicleFieldLabels[key] ?? key,
      value: formatVehicleValue(value, key),
    }))
    .filter((item) => item.value !== '—')
})

function formatVehicleValue(value: unknown, key?: string): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'string' && /^-+$/.test(value.trim())) return '—'
  if (key === 'car_weight') return `${value} kg`
  if (key === 'power') return `${value} kW`
  if (key === 'guiding_price') return `${value} 万元`
  if (key === 'output_volume') return `${value} L`
  if (key === 'made_month') return `${value} 月`
  if (Array.isArray(value)) {
    return value
      .map((item) => formatVehicleValue(item))
      .filter((item) => item !== '—')
      .join('；') || '—'
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([childKey, childValue]) =>
        `${vehicleFieldLabels[childKey] ?? childKey}：${formatVehicleValue(childValue, childKey)}`,
      )
      .join('；')
  }
  return String(value)
}

function openProjectType(index: number) {
  if (index === 0) currentView.value = 'vehicle-upload'
  if (index === 1) currentView.value = 'venue-upload'
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
  const missingSlots = currentUploadSlots.value.filter(
    (slot) => !uploadedFiles.value[slot.label],
  )
  if (missingSlots.length) {
    message.error(`请先上传完整素材：${missingSlots.map((slot) => slot.label).join('、')}`)
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

function selectLongVideoTemplate(template: VideoTemplate) {
  videoFlow?.selectTemplate(template)
}

async function handleVinQuery() {
  const normalizedVin = vin.value.trim().toUpperCase()
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(normalizedVin)) {
    message.error('请输入正确的 17 位 VIN 车架号')
    return
  }

  vinLoading.value = true
  vehicleInfo.value = null
  showMoreVehicleInfo.value = false
  try {
    vehicleInfo.value = await queryVehicleByVin(normalizedVin)
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
      type="button"
      class="workflow-back"
      @click="currentView = 'dashboard'"
    >
      <Icon icon="mdi:arrow-left" aria-hidden="true" />
      返回
    </button>

    <nav class="workflow-steps" aria-label="创建车辆视频步骤">
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

    <template v-if="currentView === 'vehicle-upload' || currentView === 'venue-upload'">
      <header class="workflow-heading">
        <p>步骤 1 / 4</p>
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
            <strong>{{ slot.label }}<em>*</em></strong>
            <span>点击上传</span>
            <small>{{ slot.accept }}</small>
          </template>
        </label>
      </div>
    </template>

    <template v-else-if="currentView === 'vehicle-info'">
      <header class="workflow-heading">
        <p>步骤 2 / 4</p>
        <h1>车辆五维信息</h1>
        <span>输入 VIN 车架号，自动获取车辆完整信息</span>
      </header>

      <section class="vin-query-panel">
        <div class="vin-query-copy">
          <h2>VIN 智能识别</h2>
          <p>请输入车辆行驶证上的 17 位 VIN 车架号</p>
        </div>
        <div class="vin-query-form">
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
          <button type="button" :disabled="vinLoading" @click="handleVinQuery">
            <Icon :icon="vinLoading ? 'mdi:loading' : 'mdi:magnify'" :class="{ 'is-spinning': vinLoading }" />
            {{ vinLoading ? '查询中' : '查询车辆' }}
          </button>
        </div>
      </section>

      <section v-if="vehicleInfo" class="vehicle-info-panel">
        <header>
          <div>
            <h2>车辆基础信息</h2>
            <p>信息来源：万维易源 VIN 车辆信息</p>
          </div>
          <div class="vehicle-vin-state">
            <span class="vehicle-vin">{{ vehicleInfo.vin }}</span>
          </div>
        </header>

        <dl class="vehicle-info-grid">
          <div
            v-for="item in displayedCoreFields"
            :key="item.key"
          >
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </dl>

        <button
          v-if="remainingVehicleFields.length"
          type="button"
          class="more-info-button"
          @click="showMoreVehicleInfo = !showMoreVehicleInfo"
        >
          {{ showMoreVehicleInfo ? '收起更多信息' : '查看更多信息' }}
          <Icon :icon="showMoreVehicleInfo ? 'mdi:chevron-up' : 'mdi:chevron-down'" />
        </button>

        <dl v-if="showMoreVehicleInfo" class="vehicle-info-grid is-more">
          <div
            v-for="item in remainingVehicleFields"
            :key="item.key"
          >
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </dl>

      </section>
    </template>

    <template v-else>
      <header class="workflow-heading template-heading">
        <p>步骤 3 / 4</p>
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

        <div v-if="templatesLoading && !singleCarTemplates.length" class="template-empty">
          <Icon icon="mdi:loading" class="is-spinning" />
          <span>正在加载车辆模板</span>
        </div>
        <div v-else-if="!singleCarTemplates.length" class="template-empty">
          <Icon icon="mdi:movie-search-outline" />
          <span>暂无匹配的单车品介绍模板</span>
        </div>
        <div v-else class="long-template-grid">
          <article
            v-for="item in singleCarTemplates"
            :key="item.templateId"
            class="long-template-card"
            :class="{ 'is-selected': selectedLongVideoTemplateId === item.templateId }"
            role="button"
            tabindex="0"
            @click="selectLongVideoTemplate(item)"
            @keyup.enter="selectLongVideoTemplate(item)"
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
  min-height: 100%;
  flex-direction: column;
  padding: clamp(22px, 3vw, 42px);
  color: var(--lv-text);
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
  margin: 34px 0 26px;
}

.workflow-heading p {
  margin: 0 0 8px;
  color: var(--lv-primary);
  font-size: 13px;
  font-weight: 800;
}

.workflow-heading h1 {
  margin: 0;
  font-size: clamp(26px, 2.2vw, 36px);
}

.workflow-heading span {
  display: block;
  margin-top: 10px;
  color: var(--lv-muted);
  font-size: 14px;
}

.upload-slot-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 4px;
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
  min-width: 170px;
  min-height: 230px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 28px 22px;
  border: 1px dashed color-mix(in srgb, var(--lv-muted) 48%, var(--lv-border));
  border-radius: 16px;
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
  width: 54px;
  height: 54px;
  margin-bottom: 18px;
  place-items: center;
  border-radius: 13px;
  background: var(--lv-primary-soft);
  color: var(--lv-primary);
  font-size: 27px;
}

.upload-slot strong {
  font-size: 16px;
}

.upload-slot em {
  margin-left: 3px;
  color: #f04444;
  font-style: normal;
}

.upload-slot > span:not(.upload-slot-icon) {
  margin-top: 10px;
  color: var(--lv-muted);
  font-size: 13px;
}

.upload-slot small {
  max-width: 270px;
  margin-top: 12px;
  color: color-mix(in srgb, var(--lv-muted) 75%, transparent);
  font-size: 12px;
  line-height: 1.7;
}

.vin-query-panel,
.vehicle-info-panel {
  border: 1px solid var(--lv-border);
  border-radius: 18px;
  background: var(--lv-panel);
}

.vin-query-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  padding: 25px 28px;
}

.vin-query-copy h2,
.vehicle-info-panel h2 {
  margin: 0;
  font-size: 18px;
}

.vin-query-copy p,
.vehicle-info-panel header p {
  margin: 7px 0 0;
  color: var(--lv-muted);
  font-size: 13px;
}

.vin-query-form {
  display: flex;
  width: min(900px, 72%);
  gap: 12px;
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

.vin-query-form > button {
  display: inline-flex;
  min-width: 126px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 0;
  border-radius: 11px;
  background: var(--lv-primary);
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  font-weight: 700;
}

.vin-image-button {
  display: inline-flex;
  min-width: 118px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid color-mix(in srgb, var(--lv-primary) 45%, var(--lv-border));
  border-radius: 11px;
  background: var(--lv-panel);
  color: var(--lv-primary);
  cursor: pointer;
  font-size: 13px;
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

.vin-query-form > button:disabled {
  cursor: wait;
  opacity: 0.72;
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
  padding: 26px 28px;
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

.vehicle-vin-state {
  display: grid;
  justify-items: end;
  gap: 7px;
}

.vehicle-info-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0;
  margin: 0;
}

.vehicle-info-grid div {
  min-width: 0;
  padding: 20px 16px;
}

.vehicle-info-grid div:nth-child(n + 6) {
  border-top: 1px solid var(--lv-border);
}

.vehicle-info-grid dt {
  color: var(--lv-muted);
  font-size: 12px;
}

.vehicle-info-grid dd {
  margin: 7px 0 0;
  color: var(--lv-text);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.55;
  white-space: normal;
  word-break: break-word;
}

.more-info-button {
  display: flex;
  margin: 20px auto 0;
  align-items: center;
  gap: 5px;
  border: 0;
  background: transparent;
  color: var(--lv-primary);
  cursor: pointer;
  font-family: inherit;
  font-weight: 700;
}

.vehicle-info-grid.is-more {
  margin-top: 16px;
  border-top: 1px solid var(--lv-border);
}

.vehicle-info-grid.is-more dd {
  overflow: visible;
  line-height: 1.65;
  text-overflow: clip;
  white-space: normal;
  word-break: break-all;
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
  margin: auto clamp(-42px, -3vw, -22px) clamp(-42px, -3vw, -22px);
  padding: 16px clamp(22px, 3vw, 42px);
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

  .vin-query-form {
    width: 100%;
  }

  .vehicle-info-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .vehicle-info-grid div:nth-child(n + 4) {
    border-top: 1px solid var(--lv-border);
  }

  .long-template-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
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

  .vin-query-form {
    flex-direction: column;
  }

  .vin-query-form > button {
    height: 46px;
  }

  .vehicle-info-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .vehicle-info-grid div:nth-child(n + 3) {
    border-top: 1px solid var(--lv-border);
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
