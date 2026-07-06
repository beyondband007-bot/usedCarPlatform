<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { NButton, NPagination, NSelect } from 'naive-ui'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

import {
  createVehicle,
  createVehicleLot,
  deleteVehicle,
  getVehicle,
  getVehicleLibraryHome,
  getVehicleLots,
  getVehicles,
  putVehicleMaterial,
  putVehicleLotMaterial,
  updateVehicle,
  type UpsertVehiclePayload,
  type VehicleLibraryHome,
  type VehicleLibraryMaterial,
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

// 与后端 MAX_UPLOAD_MB / MAX_VIDEO_UPLOAD_MB 默认值保持一致，用于选文件时的即时预检。
const MAX_IMAGE_UPLOAD_MB = 20
const MAX_VIDEO_UPLOAD_MB = 200

type LibraryTab = 'vehicles' | 'lots' | 'templates'
type DetailTab = 'overview' | 'assets'
type VehicleFilter = 'all' | 'complete' | 'missing-exterior' | 'missing-driver' | 'missing-video'
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
}

const vehicles = ref<Vehicle[]>([])
const vehicleRecords = ref<VehicleRecord[]>([])
const lots = ref<VehicleLot[]>([])
const libraryHome = ref<VehicleLibraryHome | null>(null)
const loading = ref(true)
const loadError = ref('')
const vehiclePage = ref(1)
const vehicleTotal = ref(0)
const vehiclePageSize = 10

const activeLibraryTab = ref<LibraryTab>('vehicles')
const activeDetailTab = ref<DetailTab>('assets')
const activeFilter = ref<VehicleFilter>('all')
const activeVehicleId = ref<string | null>(null)
const keyword = ref('')
const sortBy = ref('updated')
const showVehicleModal = ref(false)
const editingVehicleId = ref<string | null>(null)
const showMaterialModal = ref(false)
const showLotModal = ref(false)
const showTemplateModal = ref(false)
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
const lotError = ref('')
const lotForm = reactive({
  name: '',
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
  () => vehicles.value.find((vehicle) => vehicle.id === activeVehicleId.value) ?? vehicles.value[0],
)

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
  }
}

async function loadLibraryData() {
  loading.value = true
  loadError.value = ''
  try {
    const [home, vehiclePageResult, lotPage] = await Promise.all([
      getVehicleLibraryHome(),
      getVehicles({ page: 1, pageSize: vehiclePageSize }),
      getVehicleLots({ page: 1, pageSize: 100 }),
    ])
    libraryHome.value = home
    vehicleRecords.value = vehiclePageResult.items
    vehicles.value = vehiclePageResult.items.map(mapVehicle)
    vehicleTotal.value = vehiclePageResult.total
    vehiclePage.value = 1
    lots.value = lotPage.items
    activeVehicleId.value = vehicles.value[0]?.id ?? null
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '车辆库加载失败'
  } finally {
    loading.value = false
  }
}

const filteredVehicles = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase()
  return vehicles.value
    .filter((vehicle) => {
      if (activeFilter.value === 'complete' && vehicle.completed !== 5) return false
      if (activeFilter.value !== 'all' && activeFilter.value !== 'complete' && !vehicle.missing.includes(activeFilter.value)) return false
      return !normalizedKeyword
        || `${vehicle.title} ${vehicle.vin} ${vehicle.note}`.toLowerCase().includes(normalizedKeyword)
    })
    .sort((a, b) => sortBy.value === 'complete' ? b.score - a.score : b.id.localeCompare(a.id))
})

const filters: Array<{ value: VehicleFilter; label: string }> = [
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

function resetVehicleForm() {
  Object.assign(vehicleForm, {
    vin: '', brand: '', series: '', modelName: '', model: '',
    year: '', carType: '', bodyType: '', energy: '', fuelGrade: '', displacement: '',
    transmission: '', level: '', emissionStandard: '', guidePrice: '',
    color: '', note: '',
  })
}

function openVehicleModal() {
  editingVehicleId.value = null
  vinError.value = ''
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
async function loadVehiclePage() {
  const result = await getVehicles({
    page: vehiclePage.value,
    pageSize: vehiclePageSize,
    search: keyword.value.trim() || undefined,
  })
  vehicleRecords.value = result.items
  vehicles.value = result.items.map(mapVehicle)
  vehicleTotal.value = result.total
  if (!vehicles.value.some((vehicle) => vehicle.id === activeVehicleId.value)) {
    activeVehicleId.value = vehicles.value[0]?.id ?? null
  }
}

watch(keyword, () => {
  if (vehicleSearchTimer) clearTimeout(vehicleSearchTimer)
  vehicleSearchTimer = setTimeout(async () => {
    try {
      if (vehiclePage.value !== 1) {
        vehiclePage.value = 1
      } else {
        await loadVehiclePage()
      }
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : '车辆查询失败'
    }
  }, 300)
})

watch(vehiclePage, async () => {
  try {
    await loadVehiclePage()
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '车辆查询失败'
  }
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
    operationMessage.value = '车辆已删除。'
    deleteVehicleTarget.value = null
    await loadLibraryData()
  } catch (error) {
    operationMessage.value = error instanceof Error ? error.message : '车辆删除失败'
  } finally {
    deletingVehicle.value = false
  }
}

function openLotModal() {
  lotForm.name = ''
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
  if (!name) {
    lotError.value = '请输入车场名称'
    return
  }
  savingLot.value = true
  lotError.value = ''
  const failedMaterials: string[] = []
  try {
    const lot = await createVehicleLot({ name })
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
    operationMessage.value = failedMaterials.length
      ? `车场已创建；${failedMaterials.join('、')}上传失败，可稍后补充。`
      : '车场已成功创建。'
    showLotModal.value = false
    await loadLibraryData()
    activeLibraryTab.value = 'lots'
  } catch (error) {
    lotError.value = error instanceof Error ? error.message : '车场创建失败'
  } finally {
    savingLot.value = false
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
    vinError.value = `${slot.label}请选择${slot.mediaType === 'image' ? '图片' : '视频'}文件`
    return
  }
  const sizeError = uploadSizeError(file, slot.mediaType)
  if (sizeError) {
    vinError.value = `${slot.label}${sizeError}`
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

function openMaterialModal() {
  if (!activeVehicle.value) return
  vinError.value = ''
  resetMaterialFiles()
  const record = vehicleRecords.value.find((item) => item.id === activeVehicle.value?.id)
  setExistingMaterials(record?.materials ?? [])
  showMaterialModal.value = true
}

async function uploadExistingVehicleMaterials() {
  const vehicle = activeVehicle.value
  if (!vehicle) return
  const selectedSlots = uploadSlots.filter((slot) => materialFiles[slot.code])
  if (!selectedSlots.length) {
    vinError.value = '请至少选择一个车辆素材'
    return
  }

  savingMaterials.value = true
  vinError.value = ''
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
    operationMessage.value = failedSlots.length
      ? `${failedSlots.join('、')}上传失败，其余素材已保存。`
      : '车辆素材已保存。'
    showMaterialModal.value = false
    resetMaterialFiles()
    await loadLibraryData()
    activeVehicleId.value = vehicle.id
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
  if (vehicleSearchTimer) clearTimeout(vehicleSearchTimer)
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
    operationMessage.value = failedSlots.length
      ? `${savedText}；${failedSlots.join('、')}上传失败，可在车辆详情中补充。`
      : `${savedText}。`
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
          <span class="service-pill"><Icon icon="mdi:shield-check-outline" />企业服务有效</span>
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
      <p v-if="operationMessage" class="operation-message">{{ operationMessage }}</p>

      <section class="stats-ribbon">
        <div class="stat">
          <span>车辆总数</span>
          <strong>{{ libraryHome?.stats.activeVehicles ?? 0 }}<em>辆</em></strong>
        </div>
        <div class="stat ok">
          <span>素材完整</span>
          <strong>{{ libraryHome?.stats.completeVehicles ?? 0 }}<em>辆</em></strong>
        </div>
        <div class="stat warn">
          <span>待补素材</span>
          <strong>{{ Math.max(0, (libraryHome?.stats.activeVehicles ?? 0) - (libraryHome?.stats.completeVehicles ?? 0)) }}<em>辆</em></strong>
        </div>
        <div class="stat">
          <span>车场</span>
          <strong>{{ libraryHome?.stats.activeLots ?? 0 }}<em>个</em></strong>
        </div>
        <div class="stat capacity">
          <span>已用容量</span>
          <strong>{{ formatBytes(libraryHome?.stats.usedBytes ?? 0) }}<em>/ {{ libraryHome?.stats.quotaBytes ? formatBytes(libraryHome.stats.quotaBytes) : '不限' }}</em></strong>
          <div class="capacity-meter"><i :style="{ width: libraryHome?.stats.quotaBytes ? `${Math.min(100, libraryHome.stats.usedBytes / libraryHome.stats.quotaBytes * 100)}%` : '0%' }" /></div>
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
                        <Icon v-else icon="mdi:car-outline" />
                      </div>
                    </td>
                    <td class="cell-model">{{ vehicle.model }}</td>
                    <td class="cell-vin">{{ vehicle.vin }}</td>
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
              <h2>{{ vehicles.length ? '没有匹配的车辆' : '车辆库还是空的' }}</h2>
              <p>{{ vehicles.length ? '尝试更换筛选条件或搜索关键词。' : '点击“新增车辆”录入第一辆车。' }}</p>
            </div>
          </div>

          <aside v-if="activeVehicle" class="vehicle-detail">
            <div class="detail-cover">
              <img v-if="activeVehicle.image" :src="activeVehicle.image" :alt="activeVehicle.title" />
              <Icon v-else icon="mdi:car-outline" />
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
                <span>VIN 查询入库</span>
              </div>
              <div class="detail-actions">
                <NButton class="vl-button primary" attr-type="button" @click="openMaterialModal">
                  <Icon icon="mdi:cloud-upload-outline" />上传素材
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
                  v-for="slot in activeVehicle.slotStates"
                  :key="slot.code"
                  class="slot-item"
                  :class="{ done: slot.done, previewable: slot.done && slot.url }"
                  :role="slot.done && slot.url ? 'button' : undefined"
                  :tabindex="slot.done && slot.url ? 0 : undefined"
                  @click="openAssetPreview(slot)"
                  @keydown.enter="openAssetPreview(slot)"
                  @keydown.space.prevent="openAssetPreview(slot)"
                >
                  <Icon :icon="slot.mediaType === 'image' ? 'mdi:image-outline' : 'mdi:video-outline'" />
                  <span>{{ slot.label }}</span>
                  <b>{{ slot.done ? '已上传' : '待补充' }}</b>
                </div>
                <p class="slot-checklist-hint">
                  {{ activeVehicle.completed === 5 ? '核心素材已齐全，可直接套用模板生成视频。' : `还差 ${5 - activeVehicle.completed} 项核心素材，补齐后即可生成视频。` }}
                </p>
              </div>
              <div v-else-if="activeDetailTab === 'overview'" class="info-list">
                <div><span>品牌车系</span><strong>{{ activeVehicle.brand }} / {{ activeVehicle.series }}</strong></div>
                <div><span>年款车型</span><strong>{{ activeVehicle.model }}</strong></div>
                <div><span>动力类型</span><strong>{{ activeVehicle.energy }}</strong></div>
                <div><span>最近更新</span><strong>{{ activeVehicle.updated }}</strong></div>
                <div><span>容量占用</span><strong>{{ activeVehicle.size }}</strong></div>
              </div>
            </div>
          </aside>
        </section>
      </template>

      <section v-else-if="activeLibraryTab === 'lots'" class="content-panel">
        <div class="section-heading"><div><h2>车场素材</h2><p>车场图片与视频作为企业资产沉淀，后续可被模板和生成链路复用。</p></div>
          <NButton class="vl-button primary" attr-type="button" @click="openLotModal"><Icon icon="mdi:garage-plus" />新增车场</NButton></div>
        <div v-if="lots.length" class="lot-grid">
          <article v-for="lot in lots" :key="lot.id">
            <div class="lot-cover">
              <img v-if="lot.coverAsset?.thumbnailUrl || lot.coverAsset?.url" :src="lot.coverAsset.thumbnailUrl || lot.coverAsset.url || ''" :alt="lot.name" />
              <Icon v-else icon="mdi:garage" />
              <span class="status-badge" :class="lot.materialStatus === 'complete' ? 'ready' : 'warn'">{{ lot.materialStatus === 'complete' ? '素材完整' : '待补充素材' }}</span>
            </div>
            <div class="lot-body">
              <h3>{{ lot.name }}</h3>
              <p>{{ lot.address || lot.remark || '暂无车场说明' }}</p>
              <NButton class="vl-button ghost" attr-type="button">管理素材</NButton>
            </div>
          </article>
        </div>
        <div v-else class="empty-state"><Icon icon="mdi:garage-plus" /><h2>暂无车场</h2><p>点击“新增车场”创建第一条真实数据。</p></div>
      </section>

      <section v-else class="content-panel">
        <div class="section-heading"><div><h2>模板库</h2><p>一期维护模板信息和素材规则，不在此处提交视频生成任务。</p></div></div>
        <div class="template-grid">
          <article v-for="template in [
            { icon: 'mdi:cellphone-play', name: '竖屏快速讲车', ratio: '9:16', rule: '需要 3 图 2 视频', state: '启用中' },
            { icon: 'mdi:storefront-outline', name: '展厅品牌介绍', ratio: '16:9', rule: '需要车场图/视频', state: '启用中' },
            { icon: 'mdi:diamond-stone', name: '高端质感展示', ratio: '9:16', rule: '建议补充细节素材', state: '待完善' },
          ]" :key="template.name">
            <div class="template-preview"><Icon :icon="template.icon" /><span>{{ template.ratio }}</span></div>
            <div><span class="status-badge" :class="template.state === '启用中' ? 'ready' : 'warn'">{{ template.state }}</span>
              <h3>{{ template.name }}</h3><p>{{ template.rule }} · 适合短视频与门店展示</p>
              <NButton class="vl-button ghost" attr-type="button" @click="showTemplateModal = true">查看模板</NButton></div>
          </article>
        </div>
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
              <label><span>年款</span><input v-model="vehicleForm.year" placeholder="如：2021款" /></label>
              <label><span>车系 *</span><input v-model="vehicleForm.series" placeholder="如：宝马5系" /></label>
              <label><span>车型</span><input v-model="vehicleForm.modelName" placeholder="如：宝马5系" /></label>
              <label><span>车款名称</span><input v-model="vehicleForm.model" placeholder="如：530Li 领先型" /></label>
              <label><span>车辆类型</span><input v-model="vehicleForm.carType" placeholder="如：轿车" /></label>
              <label><span>车身结构</span><input v-model="vehicleForm.bodyType" placeholder="如：三厢" /></label>
              <label><span>车辆级别</span><input v-model="vehicleForm.level" placeholder="如：中大型车" /></label>
              <label><span>燃料类型</span><input v-model="vehicleForm.energy" placeholder="汽油 / 纯电 / 混动" /></label>
              <label><span>燃油标号</span><input v-model="vehicleForm.fuelGrade" placeholder="如：92号 / 95号；纯电可留空" /></label>
              <label><span>排量</span><input v-model="vehicleForm.displacement" placeholder="如：2.0T" /></label>
              <label><span>变速箱</span><input v-model="vehicleForm.transmission" placeholder="如：自动" /></label>
              <label><span>排放标准</span><input v-model="vehicleForm.emissionStandard" placeholder="如：国6" /></label>
              <label><span>新车指导价（万元）</span><input v-model="vehicleForm.guidePrice" placeholder="如：46.69" /></label>
              <label><span>车身颜色</span><input v-model="vehicleForm.color" placeholder="如：黑色" /></label>
              <label class="full"><span>车辆备注</span><input v-model="vehicleForm.note" maxlength="100" placeholder="门店、车辆亮点或配置补充" /></label>
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
        <div class="modal-body">
          <div class="vehicle-material-uploads existing-material-uploads">
            <label v-for="slot in uploadSlots" :key="slot.code" class="material-upload-card"
              :class="{ 'has-preview': materialPreviewUrl(slot.code) }">
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
          <p v-if="vinError" class="form-error">{{ vinError }}</p>
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

    <div v-if="showTemplateModal" class="vl-modal-backdrop" @click.self="showTemplateModal = false">
      <section class="vl-modal compact-modal"><header><div><h2>模板详情</h2><p>当前阶段仅展示素材规则，不会提交生成任务。</p></div><button type="button" @click="showTemplateModal = false"><Icon icon="mdi:close" /></button></header>
        <div class="modal-body"><div class="template-detail-banner"><Icon icon="mdi:cellphone-play" /><div><strong>竖屏快速讲车</strong><span>9:16 · 约 45 秒 · 适合抖音/视频号</span></div></div>
          <div class="requirement-list"><div><Icon icon="mdi:check-circle" /><span>外观前 45° 图片</span><b>必需</b></div><div><Icon icon="mdi:check-circle" /><span>车尾与主驾驶图片</span><b>必需</b></div><div><Icon icon="mdi:check-circle" /><span>前排与后排视频</span><b>必需</b></div></div></div>
        <footer><NButton class="vl-button primary" attr-type="button" @click="showTemplateModal = false">知道了</NButton></footer>
      </section>
    </div>
  </div>
</template>
