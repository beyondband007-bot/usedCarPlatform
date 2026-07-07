<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { NButton, NPagination, NSelect } from 'naive-ui'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

import {
  createVehicle,
  createVehicleLot,
  deleteVehicle,
  deleteVehicleLot,
  getVehicle,
  getVehicleLot,
  getVehicleLibraryHome,
  getVehicleLots,
  getVehicles,
  putVehicleMaterial,
  putVehicleLotMaterial,
  updateVehicle,
  updateVehicleLot,
  type UpsertVehiclePayload,
  type VehicleLibraryHome,
  type VehicleLibraryMaterial,
  type VehicleListParams,
  type VehicleLot,
  type VehicleMaterialSlotCode,
  type VehicleRecord,
} from '@/api/vehicle-library'
import { uploadAsset } from '@/api/visual-workbench'
import {
  normalizeVehicleInfo,
  queryVehicleByVinShowApi,
  recognizeVinFromImage,
  type VehicleBasicInfo,
} from '@/api/vehicle-info'

import './vehicle-library.scss'
import { getVehicleIdentifyTypeLabel, getVehicleLibraryServiceStatusLabel } from '@/constants/vehicle-library'
import type { VehicleIdentifyType, VehicleLibraryStatus } from '@/types/vehicle-library'

// 与后端 MAX_UPLOAD_MB / MAX_VIDEO_UPLOAD_MB 默认值保持一致，用于选文件时的即时预检。
const MAX_IMAGE_UPLOAD_MB = 20
const MAX_VIDEO_UPLOAD_MB = 200

type LibraryTab = 'vehicles' | 'lots'
type DetailTab = 'overview' | 'assets'
type VehicleFilter = 'all' | 'incomplete' | 'complete' | 'missing-exterior' | 'missing-driver' | 'missing-video'
type UploadSlotCode = Exclude<VehicleMaterialSlotCode, 'lot_image' | 'lot_video'>

const uploadSlots: Array<{
  code: UploadSlotCode
  label: string
  mediaType: 'image' | 'video'
  purpose: 'car_exterior' | 'car_interior'
}> = [
  { code: 'front_image', label: '车头图', mediaType: 'image', purpose: 'car_exterior' },
  { code: 'rear_image', label: '车尾图', mediaType: 'image', purpose: 'car_exterior' },
  { code: 'driver_image', label: '主驾驶图', mediaType: 'image', purpose: 'car_interior' },
  { code: 'front_row_video', label: '前排视频', mediaType: 'video', purpose: 'car_interior' },
  { code: 'rear_row_video', label: '后排视频', mediaType: 'video', purpose: 'car_interior' },
]

interface VehicleSlotState {
  code: UploadSlotCode
  label: string
  mediaType: 'image' | 'video'
  done: boolean
  url?: string
  fileName?: string
}

interface Vehicle {
  id: string
  title: string
  vin: string
  image?: string
  note: string
  status: string
  statusTone: 'ready' | 'warn'
  score: number
  completed: number
  missing: VehicleFilter[]
  slotStates: VehicleSlotState[]
  brand: string
  series: string
  model: string
  energy: string
  updated: string
  size: string
  brandLabel: string
  gapSummary: string
  identifyType: VehicleIdentifyType
}

const vehicles = ref<Vehicle[]>([])
const vehicleRecords = ref<VehicleRecord[]>([])
const lots = ref<VehicleLot[]>([])
const libraryHome = ref<VehicleLibraryHome | null>(null)
const loading = ref(true)
const loadError = ref('')
const lotLoading = ref(false)
const lotLoadError = ref('')
const lotKeyword = ref('')
const lotPage = ref(1)
const lotTotal = ref(0)
const lotPageSize = 10
const activeLotId = ref<string | null>(null)
const activeLotDetail = ref<VehicleLot | null>(null)
const vehiclePage = ref(1)
const vehicleTotal = ref(0)
const vehiclePageSize = 10

const activeLibraryTab = ref<LibraryTab>('vehicles')
const activeDetailTab = ref<DetailTab>('assets')
const activeFilter = ref<VehicleFilter>('incomplete')
const activeVehicleId = ref<string | null>(null)
const keyword = ref('')
const sortBy = ref('complete')
const showCompletedSlots = ref(false)
const advanceAfterMaterialSave = ref(false)
const showVehicleModal = ref(false)
const showAdvancedVehicleFields = ref(false)
const editingVehicleId = ref<string | null>(null)
const showMaterialModal = ref(false)
const highlightedMaterialSlot = ref<UploadSlotCode | null>(null)
const materialModalBodyRef = ref<HTMLElement | null>(null)
const showLotModal = ref(false)
const showLotManageModal = ref(false)
const managingLot = ref<VehicleLot | null>(null)
const savingLotManage = ref(false)
const deletingLot = ref(false)
const deleteLotTarget = ref<VehicleLot | null>(null)
const lotManageError = ref('')
const lotManageForm = reactive({ name: '', address: '' })
const lotManageFiles = reactive<{ image: File | null; video: File | null }>({
  image: null,
  video: null,
})
const lotManagePreviews = reactive<{ image: string | null; video: string | null }>({
  image: null,
  video: null,
})
const vinLoading = ref(false)
const vinOcrLoading = ref(false)
const vinError = ref('')
const vinResult = ref<VehicleBasicInfo | null>(null)
const savingVehicle = ref(false)
const savingMaterials = ref(false)
const savingLot = ref(false)
const deletingVehicle = ref(false)
const deleteVehicleTarget = ref<Vehicle | null>(null)
const operationMessage = ref('')
const operationMessageTone = ref<'success' | 'error'>('success')
let operationMessageTimer: ReturnType<typeof setTimeout> | undefined
const materialUploadError = ref('')
const lotError = ref('')
const lotForm = reactive({
  name: '',
  address: '',
  image: null as File | null,
  video: null as File | null,
})
const materialFiles = reactive<Record<UploadSlotCode, File | null>>({
  front_image: null,
  rear_image: null,
  driver_image: null,
  front_row_video: null,
  rear_row_video: null,
})
const materialPreviews = reactive<Record<UploadSlotCode, string | null>>({
  front_image: null,
  rear_image: null,
  driver_image: null,
  front_row_video: null,
  rear_row_video: null,
})
const existingMaterials = reactive<Record<UploadSlotCode, VehicleLibraryMaterial | null>>({
  front_image: null,
  rear_image: null,
  driver_image: null,
  front_row_video: null,
  rear_row_video: null,
})
const assetPreview = ref<{
  url: string
  label: string
  mediaType: 'image' | 'video'
} | null>(null)

const vehicleForm = reactive({
  vin: '',
  brand: '',
  series: '',
  modelName: '',
  model: '',
  year: '',
  carType: '',
  bodyType: '',
  energy: '',
  fuelGrade: '',
  displacement: '',
  transmission: '',
  level: '',
  emissionStandard: '',
  guidePrice: '',
  color: '',
  note: '',
})

const activeVehicle = computed(
  () => vehicles.value.find((vehicle) => vehicle.id === activeVehicleId.value) ?? null,
)

const activeVehiclePendingSlots = computed(
  () => activeVehicle.value?.slotStates.filter((slot) => !slot.done) ?? [],
)

const activeVehicleDoneSlots = computed(
  () => activeVehicle.value?.slotStates.filter((slot) => slot.done) ?? [],
)

const activeVehicleRecord = computed(
  () => vehicleRecords.value.find((item) => item.id === activeVehicleId.value) ?? null,
)

function overviewFieldValue(value?: string | null) {
  const text = value?.trim()
  return text || '待补充'
}

function formatGuidePriceDisplay(value?: string | null) {
  const text = value?.trim()
  if (!text) return '待补充'
  const numberValue = Number(text)
  if (Number.isFinite(numberValue)) return `${numberValue} 万元`
  return text
}

const vehicleOverviewRows = computed(() => {
  const record = activeVehicleRecord.value
  const vehicle = activeVehicle.value
  if (!record || !vehicle) return []
  return [
    { label: '品牌车系', value: overviewFieldValue([record.brand, record.series].filter(Boolean).join(' / ')) },
    { label: '年款', value: overviewFieldValue(record.modelYear) },
    { label: '车款名称', value: overviewFieldValue(record.model) },
    { label: '车型名称', value: overviewFieldValue(record.modelName) },
    { label: '车辆类型', value: overviewFieldValue(record.carType) },
    { label: '车身结构', value: overviewFieldValue(record.bodyType) },
    { label: '车辆级别', value: overviewFieldValue(record.vehicleLevel) },
    { label: '燃料类型', value: overviewFieldValue(record.energyType) },
    { label: '燃油标号', value: overviewFieldValue(record.fuelGrade) },
    { label: '排量', value: overviewFieldValue(record.displacement) },
    { label: '变速箱', value: overviewFieldValue(record.transmission) },
    { label: '排放标准', value: overviewFieldValue(record.emissionStandard) },
    { label: '新车指导价', value: formatGuidePriceDisplay(record.guidePrice) },
    { label: '车身颜色', value: overviewFieldValue(record.color) },
    { label: '车辆备注', value: overviewFieldValue(record.remark) },
    { label: '最近更新', value: vehicle.updated },
    { label: '容量占用', value: vehicle.size },
  ]
})

function vehicleFormHasAdvancedValues() {
  return Boolean(
    vehicleForm.modelName.trim()
    || vehicleForm.carType.trim()
    || vehicleForm.bodyType.trim()
    || vehicleForm.level.trim()
    || vehicleForm.fuelGrade.trim()
    || vehicleForm.transmission.trim()
    || vehicleForm.emissionStandard.trim()
    || vehicleForm.guidePrice.trim(),
  )
}

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

const normalizePriceInTenThousands = (value: string) => {
  const normalized = value.trim().replace(/[￥¥,\s]/g, '').replace(/万元?$/, '')
  if (!normalized || normalized === '-') return null
  const numberValue = Number(normalized)
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : null
}

function hashVehiclePaletteKey(brand: string, series: string) {
  const seed = `${brand.trim()}|${series.trim()}`
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function getLotThumbLabel(name: string) {
  const text = name.trim()
  return text ? text.slice(0, 2) : '场'
}

function getLotMonogramStyle(name: string) {
  const hue = hashVehiclePaletteKey(name, 'lot') % 360
  return {
    '--monogram-bg': `hsl(${hue} 38% 24%)`,
    '--monogram-text': `hsl(${hue} 48% 78%)`,
  }
}

function lotSummaryText(lot: VehicleLot) {
  return lot.address || lot.remark || '暂无车场说明'
}

const lotMaterialSlots = [
  { code: 'lot_image' as const, label: '车场图片', mediaType: 'image' as const },
  { code: 'lot_video' as const, label: '车场视频', mediaType: 'video' as const },
]

function getLotSlotStates(lot: VehicleLot) {
  const materials = lot.materials ?? []
  return lotMaterialSlots.map((slot) => {
    const material = materials.find((item) => item.slotCode === slot.code && item.status === 'active')
    return {
      ...slot,
      done: Boolean(material),
      url: material?.assetUrl ?? material?.assetThumbnailUrl ?? undefined,
      fileName: material?.fileName ?? undefined,
    }
  })
}

const activeLot = computed(() => activeLotDetail.value)

const activeLotSlotStates = computed(() => (activeLot.value ? getLotSlotStates(activeLot.value) : []))

const activeLotPendingSlots = computed(
  () => activeLotSlotStates.value.filter((slot) => !slot.done),
)

const activeLotDoneSlots = computed(
  () => activeLotSlotStates.value.filter((slot) => slot.done),
)

function getVehicleBrandLabel(brand: string, series: string) {
  const brandText = brand.trim()
  if (brandText) return brandText
  const seriesText = series.trim()
  return seriesText || '未知品牌'
}

function getVehicleMonogramStyle(brand: string, series: string) {
  const hue = hashVehiclePaletteKey(brand, series) % 360
  return {
    '--monogram-bg': `hsl(${hue} 38% 24%)`,
    '--monogram-text': `hsl(${hue} 48% 78%)`,
  }
}

function formatGapSummary(slotStates: VehicleSlotState[]) {
  const missing = slotStates.filter((slot) => !slot.done).map((slot) => slot.label)
  if (!missing.length) return '素材齐全'
  if (missing.length >= 5) return '缺：全部核心素材'
  return `缺：${missing.join('、')}`
}

const mapVehicle = (record: VehicleRecord): Vehicle => {
  const materials = record.materials ?? []
  const slots = new Set(materials.filter((item) => item.status === 'active').map((item) => item.slotCode))
  const missing: VehicleFilter[] = []
  if (!slots.has('front_image') || !slots.has('rear_image')) missing.push('missing-exterior')
  if (!slots.has('driver_image')) missing.push('missing-driver')
  if (!slots.has('front_row_video') || !slots.has('rear_row_video')) missing.push('missing-video')
  const slotStates: VehicleSlotState[] = uploadSlots.map((slot) => ({
    ...(() => {
      const material = materials.find(
        (item) => item.slotCode === slot.code && item.status === 'active',
      )
      return {
        code: slot.code,
        label: slot.label,
        mediaType: slot.mediaType,
        done: Boolean(material),
        url: material?.assetUrl ?? undefined,
        fileName: material?.fileName ?? undefined,
      }
    })(),
  }))
  const completed = slotStates.filter((slot) => slot.done).length
  const size = materials.reduce((total, item) => total + (item.fileSize ?? 0), 0)
  return {
    id: record.id,
    title: [record.brand, record.series, record.modelYear, record.model].filter(Boolean).join(' '),
    vin: record.vin ?? '未填写 VIN',
    image: record.coverAsset?.url ?? record.coverAsset?.thumbnailUrl ?? undefined,
    note: record.remark ?? record.lotName ?? '',
    status: record.materialStatus === 'complete' ? '素材完整' : '待补充素材',
    statusTone: record.materialStatus === 'complete' ? 'ready' : 'warn',
    score: completed * 20,
    completed,
    missing,
    slotStates,
    brand: record.brand,
    series: record.series,
    model: [record.modelYear, record.model].filter(Boolean).join(' ') || '待补充',
    energy: [record.displacement, record.energyType].filter(Boolean).join(' ') || '待补充',
    updated: new Date(record.updatedAt).toLocaleString('zh-CN'),
    size: formatBytes(size),
    brandLabel: getVehicleBrandLabel(record.brand, record.series),
    gapSummary: formatGapSummary(slotStates),
    identifyType: record.identifyType,
  }
}

// 车辆列表是服务端分页，筛选/排序/搜索都必须交给后端，否则只会作用在当前页 10 条上。
function vehicleQueryParams() {
  const params: VehicleListParams = {
    sort: sortBy.value === 'complete' ? 'complete' : 'updated',
  }
  const trimmedKeyword = keyword.value.trim()
  if (trimmedKeyword) params.search = trimmedKeyword
  if (activeFilter.value === 'complete') {
    params.materialStatus = 'complete'
  } else if (activeFilter.value === 'incomplete') {
    params.materialStatus = 'incomplete'
  } else if (activeFilter.value === 'missing-exterior') {
    params.missing = 'exterior'
  } else if (activeFilter.value === 'missing-driver') {
    params.missing = 'driver'
  } else if (activeFilter.value === 'missing-video') {
    params.missing = 'video'
  }
  return params
}

async function refreshLibraryHome() {
  libraryHome.value = await getVehicleLibraryHome()
}

async function loadLotPage() {
  lotLoading.value = true
  lotLoadError.value = ''
  try {
    const result = await getVehicleLots({
      page: lotPage.value,
      pageSize: lotPageSize,
      search: lotKeyword.value.trim() || undefined,
    })
    if (!result.items.length && lotPage.value > 1) {
      lotPage.value = 1
      return
    }
    lots.value = result.items
    lotTotal.value = result.total
    if (!lots.value.some((lot) => lot.id === activeLotId.value)) {
      if (activeLotId.value === null && lots.value.length > 0) {
        void openLotRow(lots.value[0].id)
      } else {
        activeLotId.value = null
        activeLotDetail.value = null
      }
    } else if (activeLotId.value) {
      const cached = lots.value.find((lot) => lot.id === activeLotId.value)
      if (cached) activeLotDetail.value = cached
      void loadLotDetail(activeLotId.value)
    }
  } catch (error) {
    lotLoadError.value = error instanceof Error ? error.message : '车场查询失败'
  } finally {
    lotLoading.value = false
  }
}

async function loadLibraryData() {
  loading.value = true
  loadError.value = ''
  try {
    await Promise.all([refreshLibraryHome(), loadVehiclePage(), loadLotPage()])
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '车辆库加载失败'
  } finally {
    loading.value = false
  }
}

// 服务端已完成筛选与排序，此处仅作为当前页数据的直通视图。
const filteredVehicles = computed(() => vehicles.value)
const pendingVehicleCount = computed(() =>
  Math.max(0, (libraryHome.value?.stats.activeVehicles ?? 0) - (libraryHome.value?.stats.completeVehicles ?? 0)),
)

// 企业服务状态字段：当前从 library.status 读取，展示文案暂由常量映射写死。
const libraryServiceStatus = computed<VehicleLibraryStatus>(
  () => libraryHome.value?.library.status ?? 'active',
)
const libraryServiceStatusLabel = computed(
  () => getVehicleLibraryServiceStatusLabel(libraryServiceStatus.value),
)

type CapacityUsageLevel = 'normal' | 'warn' | 'danger'

const capacityUsage = computed(() => {
  const used = libraryHome.value?.stats.usedBytes ?? 0
  const quota = libraryHome.value?.stats.quotaBytes ?? 0
  if (!quota) {
    return { percent: 0, level: 'normal' as CapacityUsageLevel, hint: '' }
  }
  const percent = Math.min(100, (used / quota) * 100)
  if (percent >= 90) {
    return { percent, level: 'danger' as CapacityUsageLevel, hint: '容量即将用尽，请清理素材' }
  }
  if (percent >= 80) {
    return { percent, level: 'warn' as CapacityUsageLevel, hint: '容量偏高，建议及时清理' }
  }
  return { percent, level: 'normal' as CapacityUsageLevel, hint: '' }
})

const hasVehiclesInLibrary = computed(
  () => (libraryHome.value?.stats.activeVehicles ?? 0) > 0,
)

const vehicleEmptyState = computed(() => {
  if (hasVehiclesInLibrary.value) {
    return {
      title: '没有匹配的车辆',
      description: '尝试更换筛选条件或搜索关键词。',
    }
  }
  return {
    title: '车辆库还是空的',
    description: '点击“新增车辆”录入第一辆车。',
  }
})

function showOperationFeedback(message: string, tone: 'success' | 'error' = 'success') {
  operationMessage.value = message
  operationMessageTone.value = tone
  if (operationMessageTimer) clearTimeout(operationMessageTimer)
  operationMessageTimer = setTimeout(() => {
    operationMessage.value = ''
  }, tone === 'error' ? 8000 : 5000)
}

function dismissOperationFeedback() {
  operationMessage.value = ''
  if (operationMessageTimer) clearTimeout(operationMessageTimer)
}

const hasActiveLotQuery = computed(() => Boolean(lotKeyword.value.trim()))

const filters: Array<{ value: VehicleFilter; label: string }> = [
  { value: 'incomplete', label: '待补素材' },
  { value: 'all', label: '全部车辆' },
  { value: 'complete', label: '素材完整' },
  { value: 'missing-exterior', label: '缺车头/车尾图' },
  { value: 'missing-driver', label: '缺主驾驶图' },
  { value: 'missing-video', label: '缺前/后排视频' },
]
const sortOptions = [
  { label: '最近更新', value: 'updated' },
  { label: '素材完整度', value: 'complete' },
]

function selectVehicle(id: string) {
  activeVehicleId.value = id
  activeDetailTab.value = 'assets'
}

type StatsFilter = 'all' | 'complete' | 'incomplete' | 'lots'

function applyStatsFilter(target: StatsFilter) {
  if (target === 'lots') {
    activeLibraryTab.value = 'lots'
    return
  }
  activeLibraryTab.value = 'vehicles'
  activeFilter.value = target
}

function isStatsStatActive(target: StatsFilter) {
  if (target === 'lots') return activeLibraryTab.value === 'lots'
  if (activeLibraryTab.value !== 'vehicles') return false
  if (target === 'all') return activeFilter.value === 'all'
  if (target === 'complete') return activeFilter.value === 'complete'
  if (target === 'incomplete') return activeFilter.value === 'incomplete'
  return false
}

function resetVehicleForm() {
  Object.assign(vehicleForm, {
    vin: '', brand: '', series: '', modelName: '', model: '',
    year: '', carType: '', bodyType: '', energy: '', fuelGrade: '', displacement: '',
    transmission: '', level: '', emissionStandard: '', guidePrice: '',
    color: '', note: '',
  })
  showAdvancedVehicleFields.value = false
}

function openVehicleModal() {
  editingVehicleId.value = null
  vinError.value = ''
  materialUploadError.value = ''
  vinResult.value = null
  resetVehicleForm()
  resetMaterialFiles()
  resetExistingMaterials()
  showVehicleModal.value = true
}

async function openEditVehicleModal(vehicleId: string) {
  const listRecord = vehicleRecords.value.find((item) => item.id === vehicleId)
  if (!listRecord) return
  const record = await getVehicle(vehicleId).catch(() => listRecord)
  if (!record) return
  editingVehicleId.value = record.id
  vinError.value = ''
  materialUploadError.value = ''
  vinResult.value = null
  resetVehicleForm()
  Object.assign(vehicleForm, {
    vin: record.vin ?? '',
    brand: record.brand,
    series: record.series,
    model: record.model ?? '',
    modelName: record.modelName ?? '',
    year: record.modelYear ?? '',
    carType: record.carType ?? '',
    bodyType: record.bodyType ?? '',
    energy: record.energyType ?? '',
    fuelGrade: record.fuelGrade ?? '',
    displacement: record.displacement ?? '',
    transmission: record.transmission ?? '',
    level: record.vehicleLevel ?? '',
    emissionStandard: record.emissionStandard ?? '',
    guidePrice: record.guidePrice ?? '',
    color: record.color ?? '',
    note: record.remark ?? '',
  })
  resetMaterialFiles()
  setExistingMaterials(record.materials ?? [])
  showAdvancedVehicleFields.value = vehicleFormHasAdvancedValues()
  showVehicleModal.value = true
  if (
    record.vin &&
    (!record.modelName || !record.carType || !record.bodyType || !record.emissionStandard)
  ) {
    try {
      const result = normalizeVehicleInfo(await queryVehicleByVinShowApi(record.vin))
      if (!vehicleForm.modelName) vehicleForm.modelName = result.modelName
      if (!vehicleForm.carType) vehicleForm.carType = result.carType
      if (!vehicleForm.bodyType) vehicleForm.bodyType = result.bodyType
      if (!vehicleForm.emissionStandard) vehicleForm.emissionStandard = result.emissionStandard
    } catch {
      // 历史车辆仍可使用数据库中已有字段，不因第三方 VIN 服务失败阻断查看。
    }
  }
}

let vehicleSearchTimer: ReturnType<typeof setTimeout> | undefined
let lotSearchTimer: ReturnType<typeof setTimeout> | undefined
async function loadVehiclePage() {
  const result = await getVehicles({
    page: vehiclePage.value,
    pageSize: vehiclePageSize,
    ...vehicleQueryParams(),
  })
  // 删除末页最后一条后当前页会越界，回退到第 1 页由 watcher 重新拉取。
  if (!result.items.length && vehiclePage.value > 1) {
    vehiclePage.value = 1
    return
  }
  vehicleRecords.value = result.items
  vehicles.value = result.items.map(mapVehicle)
  vehicleTotal.value = result.total
  if (advanceAfterMaterialSave.value) {
    const nextPending = vehicles.value.find((vehicle) => vehicle.completed < 5)
    activeVehicleId.value = nextPending?.id ?? vehicles.value[0]?.id ?? null
    activeDetailTab.value = 'assets'
    showCompletedSlots.value = false
    advanceAfterMaterialSave.value = false
  } else if (!vehicles.value.some((vehicle) => vehicle.id === activeVehicleId.value)) {
    activeVehicleId.value = activeVehicleId.value === null
      ? (vehicles.value[0]?.id ?? null)
      : null
  }
}

async function reloadLotsFromFirstPage() {
  try {
    if (lotPage.value !== 1) {
      lotPage.value = 1
    } else {
      await loadLotPage()
    }
  } catch (error) {
    lotLoadError.value = error instanceof Error ? error.message : '车场查询失败'
  }
}

async function reloadFromFirstPage() {
  try {
    if (vehiclePage.value !== 1) {
      vehiclePage.value = 1
    } else {
      await loadVehiclePage()
    }
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '车辆查询失败'
  }
}

watch(keyword, () => {
  if (vehicleSearchTimer) clearTimeout(vehicleSearchTimer)
  vehicleSearchTimer = setTimeout(reloadFromFirstPage, 300)
})

watch(lotKeyword, () => {
  if (lotSearchTimer) clearTimeout(lotSearchTimer)
  lotSearchTimer = setTimeout(reloadLotsFromFirstPage, 300)
})

watch([activeFilter, sortBy], () => {
  void reloadFromFirstPage()
})

watch(vehiclePage, async () => {
  try {
    await loadVehiclePage()
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '车辆查询失败'
  }
})

watch(lotPage, async () => {
  try {
    await loadLotPage()
  } catch (error) {
    lotLoadError.value = error instanceof Error ? error.message : '车场查询失败'
  }
})

watch(activeLibraryTab, (tab) => {
  if (tab === 'lots' && !activeLotId.value && lots.value.length > 0) {
    void openLotRow(lots.value[0].id)
  }
})

watch(showMaterialModal, (visible) => {
  if (!visible) highlightedMaterialSlot.value = null
})

watch(activeVehicleId, () => {
  showCompletedSlots.value = (activeVehicle.value?.completed ?? 0) === 5
})

function openAssetPreview(slot: VehicleSlotState) {
  if (!slot.done || !slot.url) return
  assetPreview.value = {
    url: slot.url,
    label: slot.fileName || slot.label,
    mediaType: slot.mediaType,
  }
}

async function confirmDeleteVehicle() {
  const vehicle = deleteVehicleTarget.value
  if (!vehicle) return
  deletingVehicle.value = true
  try {
    await deleteVehicle(vehicle.id)
    showOperationFeedback('车辆已删除。')
    deleteVehicleTarget.value = null
    await loadLibraryData()
  } catch (error) {
    showOperationFeedback(error instanceof Error ? error.message : '车辆删除失败', 'error')
  } finally {
    deletingVehicle.value = false
  }
}

function openLotModal() {
  lotForm.name = ''
  lotForm.address = ''
  lotForm.image = null
  lotForm.video = null
  lotError.value = ''
  showLotModal.value = true
}

function withUploadFailReason(label: string, error: unknown) {
  return error instanceof Error && error.message ? `${label}（${error.message}）` : label
}

function uploadSizeError(file: File, mediaType: 'image' | 'video') {
  const limitMb = mediaType === 'image' ? MAX_IMAGE_UPLOAD_MB : MAX_VIDEO_UPLOAD_MB
  if (file.size <= limitMb * 1024 * 1024) return ''
  return `文件不能超过 ${limitMb}MB，请压缩后重试`
}

function selectLotFile(mediaType: 'image' | 'video', event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  input.value = ''
  if (!file) return
  const valid = mediaType === 'image' ? file.type.startsWith('image/') : file.type.startsWith('video/')
  if (!valid) {
    lotError.value = `请选择${mediaType === 'image' ? '图片' : '视频'}文件`
    return
  }
  const sizeError = uploadSizeError(file, mediaType)
  if (sizeError) {
    lotError.value = `${mediaType === 'image' ? '车场图片' : '车场视频'}${sizeError}`
    return
  }
  lotForm[mediaType] = file
  lotError.value = ''
}

async function saveLot() {
  const name = lotForm.name.trim()
  const address = lotForm.address.trim()
  if (!name) {
    lotError.value = '请输入车场名称'
    return
  }
  savingLot.value = true
  lotError.value = ''
  const failedMaterials: string[] = []
  try {
    const lot = await createVehicleLot({
      name,
      address: address || null,
    })
    if (lotForm.image) {
      try {
        const asset = await uploadAsset(lotForm.image, 'car_exterior')
        await putVehicleLotMaterial(lot.id, 'lot_image', { assetId: asset.assetId })
      } catch (error) {
        failedMaterials.push(withUploadFailReason('车场图片', error))
      }
    }
    if (lotForm.video) {
      try {
        const asset = await uploadAsset(lotForm.video, 'car_interior')
        await putVehicleLotMaterial(lot.id, 'lot_video', { assetId: asset.assetId })
      } catch (error) {
        failedMaterials.push(withUploadFailReason('车场视频', error))
      }
    }
    showOperationFeedback(
      failedMaterials.length
        ? `车场已创建；${failedMaterials.join('、')}上传失败，可稍后补充。`
        : '车场已成功创建。',
      failedMaterials.length ? 'error' : 'success',
    )
    showLotModal.value = false
    await loadLibraryData()
    activeLibraryTab.value = 'lots'
    void openLotRow(lot.id)
  } catch (error) {
    lotError.value = error instanceof Error ? error.message : '车场创建失败'
  } finally {
    savingLot.value = false
  }
}

function lotMaterialUrl(lot: VehicleLot, slotCode: 'lot_image' | 'lot_video') {
  const material = (lot.materials ?? []).find(
    (item) => item.slotCode === slotCode && item.status === 'active',
  )
  return material?.assetThumbnailUrl ?? material?.assetUrl ?? null
}

function getLotCoverUrl(lot: VehicleLot) {
  return lot.coverAsset?.thumbnailUrl
    ?? lot.coverAsset?.url
    ?? lotMaterialUrl(lot, 'lot_image')
    ?? undefined
}

async function loadLotDetail(lotId: string) {
  const detailed = await getVehicleLot(lotId).catch(() => null)
  if (detailed && activeLotId.value === lotId) {
    activeLotDetail.value = detailed
  }
}

async function openLotRow(lotId: string) {
  activeLotId.value = lotId
  activeLotDetail.value = lots.value.find((lot) => lot.id === lotId) ?? null
  await loadLotDetail(lotId)
}

function openLotAssetPreview(slot: {
  label: string
  url?: string
  fileName?: string
  mediaType: 'image' | 'video'
}) {
  if (!slot.url) return
  assetPreview.value = {
    url: slot.url,
    label: slot.fileName || slot.label,
    mediaType: slot.mediaType,
  }
}

function releaseLotManagePreview(mediaType: 'image' | 'video') {
  const url = lotManagePreviews[mediaType]
  if (!url) return
  URL.revokeObjectURL(url)
  lotManagePreviews[mediaType] = null
}

async function openLotManageModal(lot: VehicleLot) {
  lotManageError.value = ''
  lotManageFiles.image = null
  lotManageFiles.video = null
  releaseLotManagePreview('image')
  releaseLotManagePreview('video')
  lotManageForm.name = lot.name
  lotManageForm.address = lot.address ?? ''
  // 详情接口带回素材清单，用于展示已上传的车场图片/视频。
  const detailed = await getVehicleLot(lot.id).catch(() => lot)
  managingLot.value = detailed
  lotManageForm.name = detailed.name
  lotManageForm.address = detailed.address ?? ''
  showLotManageModal.value = true
}

function selectLotManageFile(mediaType: 'image' | 'video', event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  input.value = ''
  if (!file) return
  const valid = mediaType === 'image' ? file.type.startsWith('image/') : file.type.startsWith('video/')
  if (!valid) {
    lotManageError.value = `请选择${mediaType === 'image' ? '图片' : '视频'}文件`
    return
  }
  const sizeError = uploadSizeError(file, mediaType)
  if (sizeError) {
    lotManageError.value = `${mediaType === 'image' ? '车场图片' : '车场视频'}${sizeError}`
    return
  }
  lotManageFiles[mediaType] = file
  releaseLotManagePreview(mediaType)
  lotManagePreviews[mediaType] = URL.createObjectURL(file)
  lotManageError.value = ''
}

function lotManagePreviewUrl(mediaType: 'image' | 'video') {
  if (lotManagePreviews[mediaType]) return lotManagePreviews[mediaType]
  if (!managingLot.value) return null
  return lotMaterialUrl(managingLot.value, mediaType === 'image' ? 'lot_image' : 'lot_video')
}

async function saveLotManage() {
  const lot = managingLot.value
  if (!lot) return
  const name = lotManageForm.name.trim()
  const address = lotManageForm.address.trim()
  if (!name) {
    lotManageError.value = '请输入车场名称'
    return
  }
  savingLotManage.value = true
  lotManageError.value = ''
  const failedMaterials: string[] = []
  try {
    if (name !== lot.name || address !== (lot.address ?? '').trim()) {
      await updateVehicleLot(lot.id, {
        name,
        address: address || null,
      })
    }
    if (lotManageFiles.image) {
      try {
        const asset = await uploadAsset(lotManageFiles.image, 'car_exterior')
        await putVehicleLotMaterial(lot.id, 'lot_image', { assetId: asset.assetId })
      } catch (error) {
        failedMaterials.push(withUploadFailReason('车场图片', error))
      }
    }
    if (lotManageFiles.video) {
      try {
        const asset = await uploadAsset(lotManageFiles.video, 'car_interior')
        await putVehicleLotMaterial(lot.id, 'lot_video', { assetId: asset.assetId })
      } catch (error) {
        failedMaterials.push(withUploadFailReason('车场视频', error))
      }
    }
    showOperationFeedback(
      failedMaterials.length
        ? `车场已更新；${failedMaterials.join('、')}上传失败，可稍后重试。`
        : '车场信息已更新。',
      failedMaterials.length ? 'error' : 'success',
    )
    showLotManageModal.value = false
    managingLot.value = null
    releaseLotManagePreview('image')
    releaseLotManagePreview('video')
    await loadLibraryData()
  } catch (error) {
    lotManageError.value = error instanceof Error ? error.message : '车场保存失败'
  } finally {
    savingLotManage.value = false
  }
}

async function confirmDeleteLot() {
  const lot = deleteLotTarget.value
  if (!lot) return
  deletingLot.value = true
  try {
    await deleteVehicleLot(lot.id)
    showOperationFeedback('车场已删除。')
    deleteLotTarget.value = null
    showLotManageModal.value = false
    managingLot.value = null
    releaseLotManagePreview('image')
    releaseLotManagePreview('video')
    await loadLibraryData()
  } catch (error) {
    lotManageError.value = error instanceof Error ? error.message : '车场删除失败'
  } finally {
    deletingLot.value = false
  }
}

function openVehicleRow(vehicleId: string) {
  selectVehicle(vehicleId)
}

function selectMaterialFile(slot: (typeof uploadSlots)[number], event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  input.value = ''
  if (!file) return
  const validType = slot.mediaType === 'image'
    ? file.type.startsWith('image/')
    : file.type.startsWith('video/')
  if (!validType) {
    materialUploadError.value = `${slot.label}请选择${slot.mediaType === 'image' ? '图片' : '视频'}文件`
    return
  }
  const sizeError = uploadSizeError(file, slot.mediaType)
  if (sizeError) {
    materialUploadError.value = `${slot.label}${sizeError}`
    return
  }
  materialFiles[slot.code] = file
  releaseMaterialPreview(slot.code)
  materialPreviews[slot.code] = URL.createObjectURL(file)
}

function releaseMaterialPreview(slotCode: UploadSlotCode) {
  const url = materialPreviews[slotCode]
  if (!url) return
  URL.revokeObjectURL(url)
  materialPreviews[slotCode] = null
  if (assetPreview.value?.url === url) assetPreview.value = null
}

function clearMaterialFile(slotCode: UploadSlotCode) {
  materialFiles[slotCode] = null
  releaseMaterialPreview(slotCode)
}

function setExistingMaterials(materials: VehicleLibraryMaterial[]) {
  uploadSlots.forEach((slot) => {
    existingMaterials[slot.code] =
      materials.find((item) => item.slotCode === slot.code && item.status === 'active') ?? null
  })
}

function materialPreviewUrl(slotCode: UploadSlotCode) {
  return materialPreviews[slotCode]
    ?? existingMaterials[slotCode]?.assetThumbnailUrl
    ?? existingMaterials[slotCode]?.assetUrl
    ?? null
}

function openMaterialPreview(slot: (typeof uploadSlots)[number]) {
  const url = materialPreviewUrl(slot.code)
  if (!url) return
  assetPreview.value = {
    url,
    label: slot.label,
    mediaType: slot.mediaType,
  }
}

function showVideoFirstFrame(event: Event) {
  const video = event.currentTarget as HTMLVideoElement
  if (Number.isFinite(video.duration) && video.duration > 0) {
    video.currentTime = Math.min(0.1, video.duration)
  }
}

function scrollToMaterialSlot(slotCode: UploadSlotCode) {
  void nextTick(() => {
    const container = materialModalBodyRef.value
    const target = container?.querySelector<HTMLElement>(`[data-material-slot="${slotCode}"]`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}

function openMaterialModalForVehicle(vehicleId: string, slotCode?: UploadSlotCode) {
  selectVehicle(vehicleId)
  materialUploadError.value = ''
  resetMaterialFiles()
  highlightedMaterialSlot.value = slotCode ?? null
  const record = vehicleRecords.value.find((item) => item.id === vehicleId)
  setExistingMaterials(record?.materials ?? [])
  showMaterialModal.value = true
  if (slotCode) scrollToMaterialSlot(slotCode)
}

function openVehicleMaterialOverview() {
  activeDetailTab.value = 'assets'
  showCompletedSlots.value = true
}

function openMaterialModal(slotCode?: UploadSlotCode) {
  if (!activeVehicle.value) return
  openMaterialModalForVehicle(activeVehicle.value.id, slotCode)
}

function selectNextPendingVehicle(afterVehicleId: string) {
  const list = vehicles.value
  const currentIdx = list.findIndex((vehicle) => vehicle.id === afterVehicleId)
  const current = list[currentIdx]

  if (current && current.completed < 5) {
    activeVehicleId.value = afterVehicleId
    activeDetailTab.value = 'assets'
    showCompletedSlots.value = false
    return
  }

  const nextOnPage =
    list.slice(currentIdx + 1).find((vehicle) => vehicle.completed < 5)
    ?? list.find((vehicle) => vehicle.completed < 5 && vehicle.id !== afterVehicleId)

  if (nextOnPage) {
    activeVehicleId.value = nextOnPage.id
    activeDetailTab.value = 'assets'
    showCompletedSlots.value = false
    return
  }

  if (vehiclePage.value * vehiclePageSize < vehicleTotal.value) {
    advanceAfterMaterialSave.value = true
    vehiclePage.value += 1
    return
  }

  activeVehicleId.value = list[0]?.id ?? null
}

async function uploadExistingVehicleMaterials() {
  const vehicle = activeVehicle.value
  if (!vehicle) return
  const selectedSlots = uploadSlots.filter((slot) => materialFiles[slot.code])
  if (!selectedSlots.length) {
    materialUploadError.value = '请至少选择一个车辆素材'
    return
  }

  savingMaterials.value = true
  materialUploadError.value = ''
  const failedSlots: string[] = []
  try {
    for (const slot of selectedSlots) {
      const file = materialFiles[slot.code]
      if (!file) continue
      try {
        const asset = await uploadAsset(file, slot.purpose)
        await putVehicleMaterial(vehicle.id, slot.code, { assetId: asset.assetId })
      } catch (error) {
        failedSlots.push(withUploadFailReason(slot.label, error))
      }
    }
    showOperationFeedback(
      failedSlots.length
        ? `${failedSlots.join('、')}上传失败，其余素材已保存。`
        : '车辆素材已保存。',
      failedSlots.length ? 'error' : 'success',
    )
    showMaterialModal.value = false
    resetMaterialFiles()
    const savedVehicleId = vehicle.id
    await loadLibraryData()
    selectNextPendingVehicle(savedVehicleId)
  } finally {
    savingMaterials.value = false
  }
}

function resetMaterialFiles() {
  uploadSlots.forEach((slot) => {
    materialFiles[slot.code] = null
    releaseMaterialPreview(slot.code)
  })
}

function resetExistingMaterials() {
  uploadSlots.forEach((slot) => {
    existingMaterials[slot.code] = null
  })
}

onBeforeUnmount(() => {
  resetMaterialFiles()
  releaseLotManagePreview('image')
  releaseLotManagePreview('video')
  if (vehicleSearchTimer) clearTimeout(vehicleSearchTimer)
  if (operationMessageTimer) clearTimeout(operationMessageTimer)
})

function fillVehicleForm(vin: string, result: VehicleBasicInfo) {
  vinResult.value = result
  Object.assign(vehicleForm, {
    vin,
    brand: result.brandName,
    series: result.seriesName,
    modelName: result.modelName,
    model: result.fullModelName,
    year: result.year,
    carType: result.carType,
    bodyType: result.bodyType,
    energy: result.fuelType,
    fuelGrade: result.fuelGrade,
    displacement: result.displacement,
    transmission: result.gearbox || result.gearboxType,
    level: result.vehicleLevel,
    emissionStandard: result.emissionStandard,
    guidePrice: result.guidePrice,
  })
}

async function recognizeVin(vinValue = vehicleForm.vin) {
  const vin = vinValue.trim().toUpperCase()
  vinError.value = ''
  vinResult.value = null
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
    vinError.value = '请输入 17 位标准 VIN 码（不包含 I、O、Q）'
    return
  }

  vinLoading.value = true
  try {
    const result = normalizeVehicleInfo(await queryVehicleByVinShowApi(vin))
    fillVehicleForm(vin, result)
  } catch (error) {
    vinError.value = error instanceof Error ? error.message : 'VIN 查询失败，请稍后重试'
  } finally {
    vinLoading.value = false
  }
}

async function recognizeVinImage(event: Event) {
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
    vehicleForm.vin = vin
    await recognizeVin(vin)
  } catch (error) {
    vinError.value = error instanceof Error ? error.message : 'VIN 图片识别失败'
  } finally {
    vinOcrLoading.value = false
  }
}

async function saveVehicle() {
  if (!vehicleForm.brand || !vehicleForm.series) {
    vinError.value = '请至少填写品牌和车系'
    return
  }
  const guidePrice = normalizePriceInTenThousands(vehicleForm.guidePrice)
  if (vehicleForm.guidePrice.trim() && vehicleForm.guidePrice.trim() !== '-' && guidePrice === null) {
    vinError.value = '新车指导价必须是非负数字，单位为万元'
    return
  }
  const isEditing = Boolean(editingVehicleId.value)
  const payload: UpsertVehiclePayload = {
    vin: vehicleForm.vin || null,
    brand: vehicleForm.brand,
    series: vehicleForm.series,
    model: vehicleForm.model || null,
    modelName: vehicleForm.modelName || null,
    modelYear: vehicleForm.year || null,
    carType: vehicleForm.carType || null,
    bodyType: vehicleForm.bodyType || null,
    energyType: vehicleForm.energy || null,
    fuelGrade: vehicleForm.fuelGrade || null,
    displacement: vehicleForm.displacement || null,
    transmission: vehicleForm.transmission || null,
    vehicleLevel: vehicleForm.level || null,
    emissionStandard: vehicleForm.emissionStandard || null,
    color: vehicleForm.color || null,
    guidePrice,
    remark: vehicleForm.note || null,
  }
  if (vinResult.value) {
    payload.identifyType = 'vin_text'
  } else if (!isEditing) {
    payload.identifyType = 'manual'
  }
  savingVehicle.value = true
  let savedVehicleId: string | null = null
  try {
    const vehicle = isEditing
      ? await updateVehicle(editingVehicleId.value!, payload)
      : await createVehicle(payload)
    savedVehicleId = vehicle.id
    const failedSlots: string[] = []
    for (const slot of uploadSlots) {
      const file = materialFiles[slot.code]
      if (!file) continue
      try {
        const asset = await uploadAsset(file, slot.purpose)
        await putVehicleMaterial(vehicle.id, slot.code, { assetId: asset.assetId })
      } catch (error) {
        failedSlots.push(withUploadFailReason(slot.label, error))
      }
    }
    const savedText = isEditing ? '车辆信息已更新' : '车辆已入库'
    showOperationFeedback(
      failedSlots.length
        ? `${savedText}；${failedSlots.join('、')}上传失败，可在车辆详情中补充。`
        : `${savedText}。`,
      failedSlots.length ? 'error' : 'success',
    )
  } catch (error) {
    vinError.value = error instanceof Error ? error.message : (isEditing ? '车辆信息保存失败' : '车辆入库失败')
    return
  } finally {
    savingVehicle.value = false
  }
  showVehicleModal.value = false
  editingVehicleId.value = null
  resetVehicleForm()
  resetMaterialFiles()
  resetExistingMaterials()
  await loadLibraryData()
  if (savedVehicleId) activeVehicleId.value = savedVehicleId
}

onMounted(loadLibraryData)
</script>

<template>
  <div class="vehicle-library-page">
    <main class="vehicle-library-shell">
      <section class="library-hero">
        <div class="hero-title">
          <h1>车辆库</h1>
          <span class="service-pill" :data-service-status="libraryServiceStatus">
            <Icon icon="mdi:shield-check-outline" />{{ libraryServiceStatusLabel }}
          </span>
        </div>
        <nav class="library-tabs" aria-label="车辆素材库分类">
          <button v-for="tab in [
            { value: 'vehicles', label: '车辆', icon: 'mdi:car-multiple' },
            { value: 'lots', label: '车场', icon: 'mdi:garage' },
          ]" :key="tab.value" type="button" :class="{ active: activeLibraryTab === tab.value }"
            @click="activeLibraryTab = tab.value as LibraryTab">
            <Icon :icon="tab.icon" />{{ tab.label }}
          </button>
        </nav>
        <div class="hero-actions">
          <NButton class="vl-button ghost" attr-type="button" @click="openLotModal">
            <Icon icon="mdi:garage-plus" />新增车场
          </NButton>
          <NButton class="vl-button primary" attr-type="button" @click="openVehicleModal">
            <Icon icon="mdi:car-2-plus" />新增车辆
          </NButton>
        </div>
      </section>
      <div
        v-if="operationMessage"
        class="operation-message"
        :class="operationMessageTone"
        role="status"
        aria-live="polite"
      >
        <span>{{ operationMessage }}</span>
        <button type="button" class="operation-message-dismiss" aria-label="关闭提示" @click="dismissOperationFeedback">
          <Icon icon="mdi:close" />
        </button>
      </div>

      <section class="stats-ribbon" aria-label="车辆库统计">
        <button
          type="button"
          class="stat stat-clickable"
          :class="{ active: isStatsStatActive('all') }"
          @click="applyStatsFilter('all')"
        >
          <span>车辆总数</span>
          <strong>{{ libraryHome?.stats.activeVehicles ?? 0 }}<em>辆</em></strong>
        </button>
        <button
          type="button"
          class="stat stat-clickable ok"
          :class="{ active: isStatsStatActive('complete') }"
          @click="applyStatsFilter('complete')"
        >
          <span>素材完整</span>
          <strong>{{ libraryHome?.stats.completeVehicles ?? 0 }}<em>辆</em></strong>
        </button>
        <button
          type="button"
          class="stat stat-clickable warn"
          :class="{ active: isStatsStatActive('incomplete') }"
          @click="applyStatsFilter('incomplete')"
        >
          <span>待补素材</span>
          <strong>{{ pendingVehicleCount }}<em>辆</em></strong>
        </button>
        <button
          type="button"
          class="stat stat-clickable"
          :class="{ active: isStatsStatActive('lots') }"
          @click="applyStatsFilter('lots')"
        >
          <span>车场</span>
          <strong>{{ libraryHome?.stats.activeLots ?? 0 }}<em>个</em></strong>
        </button>
        <div class="stat capacity" :class="capacityUsage.level">
          <span>已用容量</span>
          <strong>{{ formatBytes(libraryHome?.stats.usedBytes ?? 0) }}<em>/ {{ libraryHome?.stats.quotaBytes ? formatBytes(libraryHome.stats.quotaBytes) : '不限' }}</em></strong>
          <div class="capacity-meter"><i :style="{ width: `${capacityUsage.percent}%` }" /></div>
          <small v-if="capacityUsage.hint" class="capacity-hint">{{ capacityUsage.hint }}</small>
        </div>
      </section>

      <template v-if="activeLibraryTab === 'vehicles'">
        <section class="vehicle-workspace">
          <div class="vehicle-main-panel">
            <div class="vehicle-toolbar">
              <label class="vehicle-search">
                <Icon icon="mdi:magnify" />
                <input v-model="keyword" type="search" placeholder="VIN / 车型 / 车辆备注" />
              </label>
              <NSelect v-model:value="sortBy" class="vehicle-sort-select" :options="sortOptions" aria-label="车辆排序" />
            </div>

            <div class="filter-chips">
              <button v-for="filter in filters" :key="filter.value" type="button"
                :class="{ active: activeFilter === filter.value }" @click="activeFilter = filter.value">
                {{ filter.label }}
              </button>
            </div>

            <div v-if="loadError" class="empty-state">
              <Icon icon="mdi:alert-circle-outline" />
              <h2>车辆库加载失败</h2><p>{{ loadError }}</p>
            </div>
            <div v-else-if="loading" class="empty-state">
              <Icon icon="mdi:loading" class="spinning" />
              <h2>正在加载车辆库</h2>
            </div>
            <div v-if="filteredVehicles.length" class="vehicle-table-wrap">
              <table class="vehicle-table">
                <thead>
                  <tr>
                    <th class="col-thumb">图片</th>
                    <th>年款车型</th>
                    <th>VIN</th>
                    <th>缺口摘要</th>
                    <th>素材进度</th>
                    <th class="col-actions">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="vehicle in filteredVehicles" :key="vehicle.id"
                    :class="{ active: vehicle.id === activeVehicleId }"
                    tabindex="0"
                    @click="openVehicleRow(vehicle.id)"
                    @keydown.enter="openVehicleRow(vehicle.id)">
                    <td class="col-thumb">
                      <div class="row-thumb">
                        <img v-if="vehicle.image" :src="vehicle.image" :alt="vehicle.title" />
                        <span
                          v-else
                          class="row-thumb-monogram"
                          :style="getVehicleMonogramStyle(vehicle.brand, vehicle.series)"
                          :aria-label="vehicle.brandLabel"
                        >{{ vehicle.brandLabel }}</span>
                      </div>
                    </td>
                    <td class="cell-model">{{ vehicle.model }}</td>
                    <td class="cell-vin">{{ vehicle.vin }}</td>
                    <td class="cell-gap-summary" :class="{ complete: vehicle.completed === 5 }">
                      {{ vehicle.gapSummary }}
                    </td>
                    <td>
                      <div class="row-slots" :class="{ complete: vehicle.completed === 5 }" :aria-label="`核心素材 ${vehicle.completed}/5`">
                        <div class="slot-track">
                          <i v-for="slot in vehicle.slotStates" :key="slot.code" :class="{ done: slot.done }"
                            :title="`${slot.label}${slot.done ? '（已上传）' : '（待补充）'}`" />
                        </div>
                        <b>{{ vehicle.completed }}<i>/5</i></b>
                      </div>
                    </td>
                    <td class="col-actions">
                      <div class="row-action-group">
                        <button
                          v-if="vehicle.completed < 5"
                          type="button"
                          class="row-upload-trigger"
                          @click.stop="openMaterialModalForVehicle(vehicle.id)"
                        >
                          补素材
                        </button>
                        <span
                          class="row-edit-trigger"
                          role="button"
                          tabindex="0"
                          aria-label="编辑车辆信息"
                          title="编辑车辆信息"
                          @click.stop="openEditVehicleModal(vehicle.id)"
                          @keydown.enter.stop="openEditVehicleModal(vehicle.id)"
                          @keydown.space.prevent.stop="openEditVehicleModal(vehicle.id)"
                        >
                          <Icon icon="mdi:pencil-outline" />
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="vehicleTotal > vehiclePageSize" class="vehicle-pagination">
              <NPagination
                v-model:page="vehiclePage"
                :page-size="vehiclePageSize"
                :item-count="vehicleTotal"
                show-quick-jumper
              />
            </div>
            <div v-if="!filteredVehicles.length && !loading && !loadError" class="empty-state">
              <Icon icon="mdi:car-plus" />
              <h2>{{ vehicleEmptyState.title }}</h2>
              <p>{{ vehicleEmptyState.description }}</p>
              <NButton
                v-if="!hasVehiclesInLibrary"
                class="vl-button primary empty-state-action"
                attr-type="button"
                @click="openVehicleModal"
              >
                <Icon icon="mdi:car-2-plus" />新增第一辆车
              </NButton>
            </div>
          </div>

          <aside v-if="activeVehicle" class="vehicle-detail">
            <div class="detail-cover">
              <img v-if="activeVehicle.image" :src="activeVehicle.image" :alt="activeVehicle.title" />
              <span
                v-else
                class="detail-cover-monogram"
                :style="getVehicleMonogramStyle(activeVehicle.brand, activeVehicle.series)"
                :aria-label="activeVehicle.brandLabel"
              >{{ activeVehicle.brandLabel }}</span>
              <span class="status-badge" :class="activeVehicle.statusTone">{{ activeVehicle.status }}</span>
            </div>
            <div class="detail-body">
              <div class="detail-heading">
                <div>
                  <h2>{{ activeVehicle.title }}</h2>
                  <p class="detail-vin">VIN {{ activeVehicle.vin }}</p>
                </div>
                <button type="button" title="删除车辆" aria-label="删除车辆" @click="deleteVehicleTarget = activeVehicle">
                  <Icon icon="mdi:trash-can-outline" />
                </button>
              </div>
              <div class="detail-tags">
                <span v-if="activeVehicle.note">{{ activeVehicle.note }}</span>
                <span>{{ getVehicleIdentifyTypeLabel(activeVehicle.identifyType) }}</span>
              </div>
              <div class="detail-actions">
                <NButton
                  v-if="activeVehicle.completed < 5"
                  class="vl-button primary"
                  attr-type="button"
                  @click="openMaterialModal()"
                >
                  <Icon icon="mdi:cloud-upload-outline" />补素材
                </NButton>
                <NButton
                  v-else
                  class="vl-button primary"
                  attr-type="button"
                  @click="openVehicleMaterialOverview"
                >
                  <Icon icon="mdi:eye-outline" />预览素材
                </NButton>
                <NButton class="icon-button" attr-type="button" title="编辑信息" @click="openEditVehicleModal(activeVehicle.id)"><Icon icon="mdi:pencil-outline" /></NButton>
              </div>
              <div class="detail-tabs">
                <button v-for="tab in [
                  { value: 'assets', label: '素材清单' },
                  { value: 'overview', label: '车辆信息' },
                ]" :key="tab.value" type="button" :class="{ active: activeDetailTab === tab.value }"
                  @click="activeDetailTab = tab.value as DetailTab">{{ tab.label }}</button>
              </div>
              <div v-if="activeDetailTab === 'assets'" class="slot-checklist">
                <div
                  v-for="slot in activeVehiclePendingSlots"
                  :key="slot.code"
                  class="slot-item pending-action"
                  role="button"
                  tabindex="0"
                  @click="openMaterialModal(slot.code)"
                  @keydown.enter="openMaterialModal(slot.code)"
                  @keydown.space.prevent="openMaterialModal(slot.code)"
                >
                  <Icon :icon="slot.mediaType === 'image' ? 'mdi:image-outline' : 'mdi:video-outline'" />
                  <span>{{ slot.label }}</span>
                  <b>点击补充</b>
                </div>
                <button
                  v-if="activeVehicleDoneSlots.length"
                  type="button"
                  class="slot-done-toggle"
                  :aria-expanded="showCompletedSlots"
                  @click="showCompletedSlots = !showCompletedSlots"
                >
                  <span>已上传 {{ activeVehicleDoneSlots.length }} 项</span>
                  <Icon :icon="showCompletedSlots ? 'mdi:chevron-up' : 'mdi:chevron-down'" />
                </button>
                <div v-if="showCompletedSlots" class="slot-done-list">
                  <div
                    v-for="slot in activeVehicleDoneSlots"
                    :key="slot.code"
                    class="slot-item done previewable"
                    role="button"
                    tabindex="0"
                    @click="openAssetPreview(slot)"
                    @keydown.enter="openAssetPreview(slot)"
                    @keydown.space.prevent="openAssetPreview(slot)"
                  >
                    <Icon :icon="slot.mediaType === 'image' ? 'mdi:image-outline' : 'mdi:video-outline'" />
                    <span>{{ slot.label }}</span>
                    <b>已上传</b>
                  </div>
                </div>
                <p class="slot-checklist-hint">
                  {{ activeVehicle.completed === 5 ? '核心素材已齐全，可直接套用模板生成视频。' : `还差 ${5 - activeVehicle.completed} 项核心素材，点击待补项或「补素材」继续上传。` }}
                </p>
              </div>
              <div v-else-if="activeDetailTab === 'overview'" class="info-list">
                <div v-for="row in vehicleOverviewRows" :key="row.label">
                  <span>{{ row.label }}</span><strong>{{ row.value }}</strong>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </template>

      <section v-else-if="activeLibraryTab === 'lots'" class="vehicle-workspace lot-workspace">
        <div class="vehicle-main-panel">
          <div class="lot-panel-heading">
            <div>
              <h2>车场素材</h2>
              <p>车场图片与视频作为企业资产沉淀，后续可被模板和生成链路复用。</p>
            </div>
            <NButton class="vl-button primary" attr-type="button" @click="openLotModal">
              <Icon icon="mdi:garage-plus" />新增车场
            </NButton>
          </div>

          <div class="vehicle-toolbar">
            <label class="vehicle-search">
              <Icon icon="mdi:magnify" />
              <input v-model="lotKeyword" type="search" placeholder="车场名称 / 地址" />
            </label>
          </div>

          <div v-if="lotLoadError" class="empty-state">
            <Icon icon="mdi:alert-circle-outline" />
            <h2>车场加载失败</h2>
            <p>{{ lotLoadError }}</p>
          </div>
          <div v-else-if="lotLoading && !lots.length" class="empty-state">
            <Icon icon="mdi:loading" class="spinning" />
            <h2>正在加载车场</h2>
          </div>
          <div v-else-if="lots.length" class="vehicle-table-wrap">
            <table class="vehicle-table lot-table">
              <thead>
                <tr>
                  <th class="col-thumb">图片</th>
                  <th>车场名称</th>
                  <th>地址 / 说明</th>
                  <th>素材状态</th>
                  <th class="col-actions">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="lot in lots"
                  :key="lot.id"
                  :class="{ active: lot.id === activeLotId }"
                  tabindex="0"
                  @click="openLotRow(lot.id)"
                  @keydown.enter="openLotRow(lot.id)"
                >
                  <td class="col-thumb">
                    <div class="row-thumb">
                      <img
                        v-if="getLotCoverUrl(lot)"
                        :src="getLotCoverUrl(lot)"
                        :alt="lot.name"
                      />
                      <span
                        v-else
                        class="row-thumb-monogram"
                        :style="getLotMonogramStyle(lot.name)"
                        :aria-label="lot.name"
                      >{{ getLotThumbLabel(lot.name) }}</span>
                    </div>
                  </td>
                  <td class="cell-model">{{ lot.name }}</td>
                  <td class="cell-lot-summary">{{ lotSummaryText(lot) }}</td>
                  <td>
                    <span class="status-badge" :class="lot.materialStatus === 'complete' ? 'ready' : 'warn'">
                      {{ lot.materialStatus === 'complete' ? '素材完整' : '待补充素材' }}
                    </span>
                  </td>
                  <td class="col-actions">
                    <button
                      type="button"
                      class="row-upload-trigger"
                      :class="{ ghost: lot.materialStatus === 'complete' }"
                      @click.stop="openLotManageModal(lot)"
                    >
                      {{ lot.materialStatus === 'complete' ? '管理' : '补素材' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="lotTotal > lotPageSize" class="vehicle-pagination">
            <NPagination
              v-model:page="lotPage"
              :page-size="lotPageSize"
              :item-count="lotTotal"
              show-quick-jumper
            />
          </div>
          <div v-if="!lots.length && !lotLoading && !lotLoadError" class="empty-state">
            <Icon icon="mdi:garage-plus" />
            <h2>{{ hasActiveLotQuery ? '没有匹配的车场' : '暂无车场' }}</h2>
            <p>{{ hasActiveLotQuery ? '尝试更换搜索关键词。' : '点击“新增车场”创建第一条真实数据。' }}</p>
            <NButton
              v-if="!hasActiveLotQuery"
              class="vl-button primary empty-state-action"
              attr-type="button"
              @click="openLotModal"
            >
              <Icon icon="mdi:garage-plus" />新增车场
            </NButton>
          </div>
        </div>

        <aside v-if="activeLot" class="vehicle-detail lot-detail">
          <div class="detail-cover">
            <img v-if="getLotCoverUrl(activeLot)" :src="getLotCoverUrl(activeLot)" :alt="activeLot.name" />
            <span
              v-else
              class="detail-cover-monogram"
              :style="getLotMonogramStyle(activeLot.name)"
              :aria-label="activeLot.name"
            >{{ getLotThumbLabel(activeLot.name) }}</span>
            <span class="status-badge" :class="activeLot.materialStatus === 'complete' ? 'ready' : 'warn'">
              {{ activeLot.materialStatus === 'complete' ? '素材完整' : '待补充素材' }}
            </span>
          </div>
          <div class="detail-body">
            <div class="detail-heading">
              <div>
                <h2>{{ activeLot.name }}</h2>
                <p class="detail-vin">{{ lotSummaryText(activeLot) }}</p>
              </div>
              <button type="button" title="删除车场" aria-label="删除车场" @click="deleteLotTarget = activeLot">
                <Icon icon="mdi:trash-can-outline" />
              </button>
            </div>
            <div class="detail-actions">
              <NButton
                class="vl-button primary"
                attr-type="button"
                @click="openLotManageModal(activeLot)"
              >
                <Icon :icon="activeLot.materialStatus === 'complete' ? 'mdi:cog-outline' : 'mdi:cloud-upload-outline'" />
                {{ activeLot.materialStatus === 'complete' ? '管理车场' : '补素材' }}
              </NButton>
            </div>
            <div class="slot-checklist">
              <div
                v-for="slot in activeLotPendingSlots"
                :key="slot.code"
                class="slot-item pending-action"
                role="button"
                tabindex="0"
                @click="openLotManageModal(activeLot)"
                @keydown.enter="openLotManageModal(activeLot)"
                @keydown.space.prevent="openLotManageModal(activeLot)"
              >
                <Icon :icon="slot.mediaType === 'image' ? 'mdi:image-outline' : 'mdi:video-outline'" />
                <span>{{ slot.label }}</span>
                <b>点击补充</b>
              </div>
              <div
                v-for="slot in activeLotDoneSlots"
                :key="slot.code"
                class="slot-item done previewable"
                role="button"
                tabindex="0"
                @click="openLotAssetPreview(slot)"
                @keydown.enter="openLotAssetPreview(slot)"
                @keydown.space.prevent="openLotAssetPreview(slot)"
              >
                <Icon :icon="slot.mediaType === 'image' ? 'mdi:image-outline' : 'mdi:video-outline'" />
                <span>{{ slot.label }}</span>
                <b>已上传</b>
              </div>
              <p class="slot-checklist-hint">
                {{ activeLot.materialStatus === 'complete'
                  ? '车场图片与视频已齐全，可在模板生成时复用。'
                  : `还差 ${activeLotPendingSlots.length} 项车场素材，点击待补项继续上传。` }}
              </p>
            </div>
          </div>
        </aside>
      </section>
    </main>

    <div v-if="showVehicleModal" class="vl-modal-backdrop" @click.self="showVehicleModal = false">
      <section class="vl-modal vehicle-modal">
        <header><div><h2>{{ editingVehicleId ? '车辆信息' : '新增车辆' }}</h2><p>{{ editingVehicleId ? '查看并修改车辆信息，保存后立即生效。' : '通过 VIN 快速识别车型，也可以直接手动填写。' }}</p></div>
          <button type="button" title="关闭" @click="showVehicleModal = false"><Icon icon="mdi:close" /></button></header>
        <div class="modal-body">
          <section class="form-section">
            <div class="form-section-title"><span>1</span><div><strong>VIN 智能识别</strong><small>输入 17 位 VIN，自动带出车辆信息</small></div></div>
            <div class="vin-row"><label><span>VIN 码</span><input v-model="vehicleForm.vin" maxlength="17" placeholder="请输入 17 位 VIN" @input="vehicleForm.vin = vehicleForm.vin.toUpperCase()" /></label>
              <NButton class="vl-button primary" attr-type="button" :disabled="vinLoading || vinOcrLoading" @click="recognizeVin()">
                <Icon :icon="vinLoading ? 'mdi:loading' : 'mdi:magnify'" :class="{ spinning: vinLoading }" />{{ vinLoading ? '查询中' : '立即查询' }}
              </NButton></div>
            <div class="vin-secondary-actions">
              <label class="vl-button ghost vin-image-button" :class="{ disabled: vinLoading || vinOcrLoading }">
                <input type="file" accept="image/jpeg,image/png" :disabled="vinLoading || vinOcrLoading" @change="recognizeVinImage" />
                <Icon :icon="vinOcrLoading ? 'mdi:loading' : 'mdi:image-search-outline'" :class="{ spinning: vinOcrLoading }" />
                {{ vinOcrLoading ? '识别并查询中' : '上传图片识别 VIN' }}
              </label>
              <span>支持 JPG、PNG，识别后自动查询车辆信息</span>
            </div>
            <p v-if="vinError" class="form-error">{{ vinError }}</p>
            <div v-if="vinResult" class="recognition-success"><Icon icon="mdi:check-circle" /><div><strong>识别成功</strong><span>{{ vinResult.brandName }} {{ vinResult.seriesName }} {{ vinResult.fullModelName }}</span></div></div>
          </section>
          <section class="form-section">
            <div class="form-section-title"><span>2</span><div><strong>车辆基础信息</strong><small>车辆信息由第三方数据服务提供，仅供参考；如信息不准确，请手动修改。</small></div></div>
            <div class="vehicle-form-grid">
              <label><span>品牌 *</span><input v-model="vehicleForm.brand" placeholder="如：宝马" /></label>
              <label><span>车系 *</span><input v-model="vehicleForm.series" placeholder="如：宝马5系" /></label>
              <label><span>年款</span><input v-model="vehicleForm.year" placeholder="如：2021款" /></label>
              <label><span>车款名称</span><input v-model="vehicleForm.model" placeholder="如：530Li 领先型" /></label>
              <label><span>燃料类型</span><input v-model="vehicleForm.energy" placeholder="汽油 / 纯电 / 混动" /></label>
              <label><span>排量</span><input v-model="vehicleForm.displacement" placeholder="如：2.0T" /></label>
              <label><span>车身颜色</span><input v-model="vehicleForm.color" placeholder="如：黑色" /></label>
              <label class="full"><span>车辆备注</span><input v-model="vehicleForm.note" maxlength="100" placeholder="门店、车辆亮点或配置补充" /></label>
            </div>
            <button
              type="button"
              class="form-advanced-toggle"
              :aria-expanded="showAdvancedVehicleFields"
              @click="showAdvancedVehicleFields = !showAdvancedVehicleFields"
            >
              <Icon :icon="showAdvancedVehicleFields ? 'mdi:chevron-up' : 'mdi:chevron-down'" />
              {{ showAdvancedVehicleFields ? '收起更多参数' : '展开更多参数（选填）' }}
            </button>
            <div v-if="showAdvancedVehicleFields" class="vehicle-form-grid vehicle-form-grid-advanced">
              <label><span>车型名称</span><input v-model="vehicleForm.modelName" placeholder="如：宝马5系 530Li" /></label>
              <label><span>车辆类型</span><input v-model="vehicleForm.carType" placeholder="如：轿车" /></label>
              <label><span>车身结构</span><input v-model="vehicleForm.bodyType" placeholder="如：三厢" /></label>
              <label><span>车辆级别</span><input v-model="vehicleForm.level" placeholder="如：中大型车" /></label>
              <label><span>燃油标号</span><input v-model="vehicleForm.fuelGrade" placeholder="如：92号 / 95号；纯电可留空" /></label>
              <label><span>变速箱</span><input v-model="vehicleForm.transmission" placeholder="如：自动" /></label>
              <label><span>排放标准</span><input v-model="vehicleForm.emissionStandard" placeholder="如：国6" /></label>
              <label><span>新车指导价（万元）</span><input v-model="vehicleForm.guidePrice" placeholder="如：46.69" /></label>
            </div>
          </section>
          <section class="form-section optional-material-section">
            <div class="form-section-title">
              <span>3</span>
              <div><strong>上传车辆素材（选填）</strong><small>现在上传或入库后补充均可，不影响车辆入库。</small></div>
            </div>
            <div class="vehicle-material-uploads">
              <label v-for="slot in uploadSlots" :key="slot.code" class="material-upload-card"
                :class="{ 'has-preview': materialPreviewUrl(slot.code) }">
                <input
                  type="file"
                  :accept="slot.mediaType === 'image' ? 'image/jpeg,image/png,image/webp' : 'video/mp4,video/quicktime'"
                  :disabled="savingVehicle"
                  @change="selectMaterialFile(slot, $event)"
                />
                <template v-if="materialPreviewUrl(slot.code)">
                  <img v-if="slot.mediaType === 'image'" class="material-preview-image" :src="materialPreviewUrl(slot.code)!" :alt="`${slot.label}预览`"
                    title="点击放大预览" @click.prevent="openMaterialPreview(slot)" />
                  <video v-else class="material-preview-image" :src="materialPreviewUrl(slot.code)!" muted preload="auto"
                    @loadedmetadata="showVideoFirstFrame"
                    title="点击预览视频" @click.prevent="openMaterialPreview(slot)" />
                  <span class="material-preview-label">{{ slot.label }}{{ materialFiles[slot.code] ? ' · 待替换' : ' · 已上传' }}</span>
                  <button v-if="materialFiles[slot.code]" class="material-preview-remove" type="button" title="撤销替换" :disabled="savingVehicle"
                    @click.prevent="clearMaterialFile(slot.code)"><Icon icon="mdi:close" /></button>
                </template>
                <template v-else>
                  <Icon :icon="existingMaterials[slot.code] ? 'mdi:check-circle-outline' : (slot.mediaType === 'image' ? 'mdi:image-plus-outline' : 'mdi:video-plus-outline')" />
                  <strong>{{ slot.label }}</strong>
                  <span v-if="materialFiles[slot.code]" class="selected-file">{{ materialFiles[slot.code]?.name }}</span>
                  <span v-else-if="existingMaterials[slot.code]" class="selected-file">{{ existingMaterials[slot.code]?.fileName || '已上传素材' }}</span>
                  <span v-else>{{ slot.mediaType === 'image' ? 'JPG / PNG / WebP' : 'MP4 / MOV' }}</span>
                  <button v-if="materialFiles[slot.code]" type="button" @click.prevent="clearMaterialFile(slot.code)">
                    移除
                  </button>
                </template>
              </label>
            </div>
            <p v-if="materialUploadError" class="form-error">{{ materialUploadError }}</p>
          </section>
        </div>
        <footer><NButton class="vl-button ghost" attr-type="button" @click="showVehicleModal = false">取消</NButton>
          <NButton class="vl-button primary" attr-type="button" :disabled="savingVehicle" @click="saveVehicle">
            <Icon :icon="savingVehicle ? 'mdi:loading' : 'mdi:check'" :class="{ spinning: savingVehicle }" />
            {{ savingVehicle ? '正在保存' : (editingVehicleId ? '保存修改' : '确认入库') }}
          </NButton></footer>
      </section>
    </div>

    <div v-if="showMaterialModal" class="vl-modal-backdrop" @click.self="showMaterialModal = false">
      <section class="vl-modal compact-modal material-modal">
        <header>
          <div>
            <h2>上传车辆素材</h2>
            <p>{{ activeVehicle?.title }} · 已有槽位可直接替换</p>
          </div>
          <button type="button" title="关闭" :disabled="savingMaterials" @click="showMaterialModal = false">
            <Icon icon="mdi:close" />
          </button>
        </header>
        <div ref="materialModalBodyRef" class="modal-body">
          <div class="vehicle-material-uploads existing-material-uploads">
            <label v-for="slot in uploadSlots" :key="slot.code" class="material-upload-card"
              :class="{
                'has-preview': materialPreviewUrl(slot.code),
                focused: highlightedMaterialSlot === slot.code,
              }"
              :data-material-slot="slot.code">
              <input
                type="file"
                :accept="slot.mediaType === 'image' ? 'image/jpeg,image/png,image/webp' : 'video/mp4,video/quicktime'"
                :disabled="savingMaterials"
                @change="selectMaterialFile(slot, $event)"
              />
              <template v-if="materialPreviewUrl(slot.code)">
                <img v-if="slot.mediaType === 'image'" class="material-preview-image" :src="materialPreviewUrl(slot.code)!" :alt="`${slot.label}预览`"
                  title="点击放大预览" @click.prevent="openMaterialPreview(slot)" />
                <video v-else class="material-preview-image" :src="materialPreviewUrl(slot.code)!" muted preload="auto"
                  @loadedmetadata="showVideoFirstFrame"
                  title="点击预览视频" @click.prevent="openMaterialPreview(slot)" />
                <span class="material-preview-label">{{ slot.label }}</span>
                <button class="material-preview-remove" type="button" title="删除" :disabled="savingMaterials"
                  @click.prevent="clearMaterialFile(slot.code)"><Icon icon="mdi:close" /></button>
              </template>
              <template v-else>
                <Icon :icon="slot.mediaType === 'image' ? 'mdi:image-plus-outline' : 'mdi:video-plus-outline'" />
                <strong>{{ slot.label }}</strong>
                <span v-if="materialFiles[slot.code]" class="selected-file">{{ materialFiles[slot.code]?.name }}</span>
                <span v-else>{{ slot.mediaType === 'image' ? 'JPG / PNG / WebP' : 'MP4 / MOV' }}</span>
                <button v-if="materialFiles[slot.code]" type="button" @click.prevent="clearMaterialFile(slot.code)">移除</button>
              </template>
            </label>
          </div>
          <p class="material-upload-note">素材均为选填；再次上传同一槽位会替换原素材。</p>
          <p v-if="materialUploadError" class="form-error">{{ materialUploadError }}</p>
        </div>
        <footer>
          <NButton class="vl-button ghost" attr-type="button" :disabled="savingMaterials" @click="showMaterialModal = false">取消</NButton>
          <NButton class="vl-button primary" attr-type="button" :disabled="savingMaterials" @click="uploadExistingVehicleMaterials">
            <Icon :icon="savingMaterials ? 'mdi:loading' : 'mdi:cloud-upload-outline'" :class="{ spinning: savingMaterials }" />
            {{ savingMaterials ? '正在上传' : '保存素材' }}
          </NButton>
        </footer>
      </section>
    </div>

    <div v-if="showLotModal" class="vl-modal-backdrop" @click.self="showLotModal = false">
      <section class="vl-modal compact-modal">
        <header><div><h2>新增车场</h2><p>上传一次，后续模板可持续复用。</p></div>
          <button type="button" :disabled="savingLot" @click="showLotModal = false"><Icon icon="mdi:close" /></button>
        </header>
        <div class="modal-body">
          <label class="wide-field"><span>车场名称 *</span><input v-model="lotForm.name" placeholder="请输入车场名称" /></label>
          <label class="wide-field"><span>车场地址</span><input v-model="lotForm.address" placeholder="请输入车场地址，如：湖北省武汉市江夏区雄楚大道114号" /></label>
          <div class="upload-lanes">
            <label class="lot-upload-card">
              <input type="file" accept="image/jpeg,image/png,image/webp" :disabled="savingLot" @change="selectLotFile('image', $event)" />
              <Icon icon="mdi:image-plus-outline" /><strong>车场图片</strong>
              <span :class="{ 'selected-file': lotForm.image }">{{ lotForm.image?.name || 'JPG / PNG / WebP' }}</span>
            </label>
            <label class="lot-upload-card">
              <input type="file" accept="video/mp4,video/quicktime" :disabled="savingLot" @change="selectLotFile('video', $event)" />
              <Icon icon="mdi:video-plus-outline" /><strong>车场视频</strong>
              <span :class="{ 'selected-file': lotForm.video }">{{ lotForm.video?.name || 'MP4 / MOV，建议 10-30 秒' }}</span>
            </label>
          </div>
          <p v-if="lotError" class="form-error">{{ lotError }}</p>
        </div>
        <footer>
          <NButton class="vl-button ghost" attr-type="button" :disabled="savingLot" @click="showLotModal = false">取消</NButton>
          <NButton class="vl-button primary" attr-type="button" :disabled="savingLot" @click="saveLot">
            <Icon :icon="savingLot ? 'mdi:loading' : 'mdi:check'" :class="{ spinning: savingLot }" />
            {{ savingLot ? '正在入库' : '确认入库' }}
          </NButton>
        </footer>
      </section>
    </div>

    <div v-if="showLotManageModal && managingLot" class="vl-modal-backdrop"
      @click.self="!savingLotManage && (showLotManageModal = false)">
      <section class="vl-modal compact-modal">
        <header><div><h2>管理车场</h2><p>更新车场名称与地址，或替换车场图片与视频。</p></div>
          <button type="button" title="关闭" :disabled="savingLotManage" @click="showLotManageModal = false"><Icon icon="mdi:close" /></button>
        </header>
        <div class="modal-body">
          <label class="wide-field"><span>车场名称 *</span><input v-model="lotManageForm.name" placeholder="请输入车场名称" /></label>
          <label class="wide-field"><span>车场地址</span><input v-model="lotManageForm.address" placeholder="请输入车场地址" /></label>
          <div class="upload-lanes">
            <label class="lot-upload-card" :class="{ 'has-preview': lotManagePreviewUrl('image') }">
              <input type="file" accept="image/jpeg,image/png,image/webp" :disabled="savingLotManage" @change="selectLotManageFile('image', $event)" />
              <template v-if="lotManagePreviewUrl('image')">
                <img class="material-preview-image" :src="lotManagePreviewUrl('image')!" alt="车场图片预览" />
                <span class="material-preview-label">车场图片{{ lotManageFiles.image ? ' · 待替换' : ' · 已上传' }}</span>
              </template>
              <template v-else>
                <Icon icon="mdi:image-plus-outline" /><strong>车场图片</strong>
                <span>JPG / PNG / WebP</span>
              </template>
            </label>
            <label class="lot-upload-card" :class="{ 'has-preview': lotManagePreviewUrl('video') }">
              <input type="file" accept="video/mp4,video/quicktime" :disabled="savingLotManage" @change="selectLotManageFile('video', $event)" />
              <template v-if="lotManagePreviewUrl('video')">
                <video class="material-preview-image" :src="lotManagePreviewUrl('video')!" muted preload="auto" @loadedmetadata="showVideoFirstFrame" />
                <span class="material-preview-label">车场视频{{ lotManageFiles.video ? ' · 待替换' : ' · 已上传' }}</span>
              </template>
              <template v-else>
                <Icon icon="mdi:video-plus-outline" /><strong>车场视频</strong>
                <span>MP4 / MOV，建议 10-30 秒</span>
              </template>
            </label>
          </div>
          <p v-if="lotManageError" class="form-error">{{ lotManageError }}</p>
        </div>
        <footer>
          <NButton class="vl-button danger" attr-type="button" :disabled="savingLotManage || deletingLot" @click="deleteLotTarget = managingLot">
            <Icon icon="mdi:trash-can-outline" />删除车场
          </NButton>
          <NButton class="vl-button ghost" attr-type="button" :disabled="savingLotManage" @click="showLotManageModal = false">取消</NButton>
          <NButton class="vl-button primary" attr-type="button" :disabled="savingLotManage" @click="saveLotManage">
            <Icon :icon="savingLotManage ? 'mdi:loading' : 'mdi:check'" :class="{ spinning: savingLotManage }" />
            {{ savingLotManage ? '正在保存' : '保存修改' }}
          </NButton>
        </footer>
      </section>
    </div>

    <div v-if="deleteLotTarget" class="vl-modal-backdrop" @click.self="!deletingLot && (deleteLotTarget = null)">
      <section class="vl-modal compact-modal delete-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-lot-title">
        <header>
          <div>
            <h2 id="delete-lot-title">确认删除车场？</h2>
            <p>{{ deleteLotTarget.name }}</p>
          </div>
          <button type="button" title="关闭" :disabled="deletingLot" @click="deleteLotTarget = null">
            <Icon icon="mdi:close" />
          </button>
        </header>
        <div class="modal-body delete-confirm-content">
          <Icon icon="mdi:alert-circle-outline" />
          <div>
            <strong>删除后，车场及其素材将从车辆库移除。</strong>
            <p>该车场下的车辆会自动解除关联，操作无法撤销。</p>
          </div>
        </div>
        <footer>
          <NButton class="vl-button ghost" attr-type="button" :disabled="deletingLot" @click="deleteLotTarget = null">取消</NButton>
          <NButton class="vl-button danger" attr-type="button" :disabled="deletingLot" @click="confirmDeleteLot">
            <Icon :icon="deletingLot ? 'mdi:loading' : 'mdi:trash-can-outline'" :class="{ spinning: deletingLot }" />
            {{ deletingLot ? '正在删除' : '确认删除' }}
          </NButton>
        </footer>
      </section>
    </div>

    <div v-if="assetPreview" class="vl-modal-backdrop" @click.self="assetPreview = null">
      <section class="asset-preview-modal" role="dialog" aria-modal="true" :aria-label="assetPreview.label">
        <header>
          <strong>{{ assetPreview.label }}</strong>
          <button type="button" title="关闭预览" @click="assetPreview = null"><Icon icon="mdi:close" /></button>
        </header>
        <div class="asset-preview-content">
          <img v-if="assetPreview.mediaType === 'image'" :src="assetPreview.url" :alt="assetPreview.label" />
          <video v-else :src="assetPreview.url" controls autoplay />
        </div>
      </section>
    </div>

    <div v-if="deleteVehicleTarget" class="vl-modal-backdrop" @click.self="!deletingVehicle && (deleteVehicleTarget = null)">
      <section class="vl-modal compact-modal delete-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-vehicle-title">
        <header>
          <div>
            <h2 id="delete-vehicle-title">确认删除车辆？</h2>
            <p>{{ deleteVehicleTarget.title }}</p>
          </div>
          <button type="button" title="关闭" :disabled="deletingVehicle" @click="deleteVehicleTarget = null">
            <Icon icon="mdi:close" />
          </button>
        </header>
        <div class="modal-body delete-confirm-content">
          <Icon icon="mdi:alert-circle-outline" />
          <div>
            <strong>删除后，车辆信息将永久从数据中删除。</strong>
            <p>该操作无法撤销，请确认是否继续删除。</p>
          </div>
        </div>
        <footer>
          <NButton class="vl-button ghost" attr-type="button" :disabled="deletingVehicle" @click="deleteVehicleTarget = null">取消</NButton>
          <NButton class="vl-button danger" attr-type="button" :disabled="deletingVehicle" @click="confirmDeleteVehicle">
            <Icon :icon="deletingVehicle ? 'mdi:loading' : 'mdi:trash-can-outline'" :class="{ spinning: deletingVehicle }" />
            {{ deletingVehicle ? '正在删除' : '确认删除' }}
          </NButton>
        </footer>
      </section>
    </div>
  </div>
</template>
