<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, reactive, ref } from 'vue'

import {
  normalizeVehicleInfo,
  queryVehicleByVinShowApi,
  recognizeVinFromImage,
  type VehicleBasicInfo,
} from '@/api/vehicle-info'

import './vehicle-library.scss'

type LibraryTab = 'vehicles' | 'lots' | 'templates'
type DetailTab = 'overview' | 'assets' | 'suggestions'
type VehicleFilter = 'all' | 'complete' | 'missing-exterior' | 'missing-driver' | 'missing-video'

interface Vehicle {
  id: number
  title: string
  vin: string
  image: string
  note: string
  status: string
  statusTone: 'ready' | 'warn'
  score: number
  completed: number
  missing: VehicleFilter[]
  assets: string[]
  brand: string
  series: string
  model: string
  energy: string
  updated: string
  size: string
}

const vehicles = ref<Vehicle[]>([
  {
    id: 1,
    title: '宝马 5系 2021款 530Li',
    vin: 'LBV******123456',
    image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=900&q=85',
    note: '黑色宝马530 - 门店A',
    status: '素材完整',
    statusTone: 'ready',
    score: 82,
    completed: 5,
    missing: [],
    assets: ['车头/车尾 ✓', '主驾 ✓', '前/后排视频 ✓'],
    brand: '宝马',
    series: '5系',
    model: '2021款 530Li',
    energy: '2.0T 汽油',
    updated: '今天 13:42',
    size: '186MB',
  },
  {
    id: 2,
    title: '奔驰 C级 2020款 C260L',
    vin: 'LE4******998812',
    image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=900&q=85',
    note: '白色奔驰C级 - 门店B',
    status: '缺主驾驶图',
    statusTone: 'warn',
    score: 45,
    completed: 2,
    missing: ['missing-driver', 'missing-video'],
    assets: ['缺主驾图', '缺前排视频', '缺后排视频'],
    brand: '奔驰',
    series: 'C级',
    model: '2020款 C260L',
    energy: '1.5T 汽油',
    updated: '昨天 18:20',
    size: '72MB',
  },
  {
    id: 3,
    title: '奥迪 A6L 2022款 45TFSI',
    vin: 'LFV******660219',
    image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=900&q=85',
    note: '奥迪A6L - 精品展厅',
    status: '缺前/后排视频',
    statusTone: 'warn',
    score: 68,
    completed: 3,
    missing: ['missing-video'],
    assets: ['车头/车尾 ✓', '主驾 ✓', '缺前/后排视频'],
    brand: '奥迪',
    series: 'A6L',
    model: '2022款 45TFSI',
    energy: '2.0T 汽油',
    updated: '6月28日 09:30',
    size: '104MB',
  },
  {
    id: 4,
    title: '特斯拉 Model 3 2023款',
    vin: 'LRW******762501',
    image: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=900&q=85',
    note: 'Model 3 - 新能源专区',
    status: '素材完整',
    statusTone: 'ready',
    score: 91,
    completed: 5,
    missing: [],
    assets: ['车头/车尾 ✓', '主驾 ✓', '前/后排视频 ✓'],
    brand: '特斯拉',
    series: 'Model 3',
    model: '2023款',
    energy: '纯电动',
    updated: '6月27日 16:08',
    size: '213MB',
  },
])

const activeLibraryTab = ref<LibraryTab>('vehicles')
const activeDetailTab = ref<DetailTab>('overview')
const activeFilter = ref<VehicleFilter>('all')
const activeVehicleId = ref(1)
const keyword = ref('')
const sortBy = ref('updated')
const showVehicleModal = ref(false)
const showLotModal = ref(false)
const showTemplateModal = ref(false)
const vinLoading = ref(false)
const vinOcrLoading = ref(false)
const vinError = ref('')
const vinResult = ref<VehicleBasicInfo | null>(null)

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

const filteredVehicles = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase()
  return vehicles.value
    .filter((vehicle) => {
      if (activeFilter.value === 'complete' && vehicle.completed !== 5) return false
      if (activeFilter.value !== 'all' && activeFilter.value !== 'complete' && !vehicle.missing.includes(activeFilter.value)) return false
      return !normalizedKeyword
        || `${vehicle.title} ${vehicle.vin} ${vehicle.note}`.toLowerCase().includes(normalizedKeyword)
    })
    .sort((a, b) => sortBy.value === 'complete' ? b.score - a.score : b.id - a.id)
})

const filters: Array<{ value: VehicleFilter; label: string }> = [
  { value: 'all', label: '全部车辆' },
  { value: 'complete', label: '素材完整' },
  { value: 'missing-exterior', label: '缺车头/车尾图' },
  { value: 'missing-driver', label: '缺主驾驶图' },
  { value: 'missing-video', label: '缺前/后排视频' },
]

function selectVehicle(id: number) {
  activeVehicleId.value = id
  activeDetailTab.value = 'overview'
}

function openVehicleModal() {
  vinError.value = ''
  vinResult.value = null
  showVehicleModal.value = true
}

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

function addVehicle() {
  if (!vehicleForm.brand || !vehicleForm.series) {
    vinError.value = '请至少填写品牌和车系'
    return
  }
  const id = Math.max(...vehicles.value.map((vehicle) => vehicle.id)) + 1
  vehicles.value.unshift({
    id,
    title: [vehicleForm.brand, vehicleForm.series, vehicleForm.year, vehicleForm.model].filter(Boolean).join(' '),
    vin: vehicleForm.vin || '未填写 VIN',
    image: 'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=900&q=85',
    note: vehicleForm.note || '新建车辆草稿',
    status: '待补充素材',
    statusTone: 'warn',
    score: 0,
    completed: 0,
    missing: ['missing-exterior', 'missing-driver', 'missing-video'],
    assets: ['缺车头/车尾图', '缺主驾图', '缺前/后排视频'],
    brand: vehicleForm.brand,
    series: vehicleForm.series,
    model: [vehicleForm.year, vehicleForm.model].filter(Boolean).join(' '),
    energy: [vehicleForm.displacement, vehicleForm.energy].filter(Boolean).join(' ') || '待补充',
    updated: '刚刚',
    size: '0MB',
  })
  activeVehicleId.value = id
  showVehicleModal.value = false
  Object.assign(vehicleForm, {
    vin: '', brand: '', series: '', modelName: '', model: '',
    year: '', carType: '', bodyType: '', energy: '', displacement: '',
    transmission: '', level: '', emissionStandard: '', guidePrice: '',
    color: '', note: '',
  })
}
</script>

<template>
  <div class="vehicle-library-page">
    <main class="vehicle-library-shell">
      <section class="library-hero">
        <div>
          <h1>车辆库</h1>
        </div>
        <div class="hero-actions">
          <button class="vl-button ghost" type="button" @click="showLotModal = true">
            <Icon icon="mdi:garage-plus" />新增车场
          </button>
          <button class="vl-button primary" type="button" @click="openVehicleModal">
            <Icon icon="mdi:car-2-plus" />新增车辆
          </button>
        </div>
      </section>

      <section class="metric-grid">
        <article class="metric-card service-card">
          <span>企业服务</span><strong>服务有效</strong>
          <small><Icon icon="mdi:shield-check-outline" /> 大客户车辆素材库权限已开启</small>
        </article>
        <article class="metric-card">
          <span>已用容量</span><strong>428MB / 1GB</strong>
          <div class="capacity-meter"><i /></div>
        </article>
        <article class="metric-card">
          <span>车辆数</span><strong>36 辆</strong><small>本月新增 8 辆</small>
        </article>
        <article class="metric-card">
          <span>素材数</span><strong>284 个</strong><small>图片 252，视频 32</small>
        </article>
      </section>

      <nav class="library-tabs" aria-label="车辆素材库分类">
        <button v-for="tab in [
          { value: 'vehicles', label: '车辆', icon: 'mdi:car-multiple' },
          { value: 'lots', label: '车场', icon: 'mdi:garage' },
        ]" :key="tab.value" type="button" :class="{ active: activeLibraryTab === tab.value }"
          @click="activeLibraryTab = tab.value as LibraryTab">
          <Icon :icon="tab.icon" />{{ tab.label }}
        </button>
      </nav>

      <template v-if="activeLibraryTab === 'vehicles'">
        <section class="vehicle-workspace">
          <div class="vehicle-main-panel">
            <div class="vehicle-toolbar">
              <label class="vehicle-search">
                <Icon icon="mdi:magnify" />
                <input v-model="keyword" type="search" placeholder="VIN / 车型 / 车辆备注" />
              </label>
              <select v-model="sortBy" aria-label="车辆排序">
                <option value="updated">最近更新</option>
                <option value="complete">素材完整度</option>
              </select>
              <button class="vl-button accent" type="button" @click="showTemplateModal = true">
                <Icon icon="mdi:play-box-multiple-outline" />查看模板
              </button>
            </div>

            <div class="filter-chips">
              <button v-for="filter in filters" :key="filter.value" type="button"
                :class="{ active: activeFilter === filter.value }" @click="activeFilter = filter.value">
                {{ filter.label }}
              </button>
            </div>

            <div class="status-strip">
              <div><span>素材完整</span><strong>21 辆</strong></div>
              <div><span>待补核心素材</span><strong>15 辆</strong></div>
              <div><span>车辆草稿</span><strong>3 辆</strong></div>
              <div><span>容量预警</span><strong>2 辆</strong></div>
            </div>

            <div v-if="filteredVehicles.length" class="vehicle-grid">
              <button v-for="vehicle in filteredVehicles" :key="vehicle.id" type="button"
                class="vehicle-card" :class="{ active: vehicle.id === activeVehicleId }"
                @click="selectVehicle(vehicle.id)">
                <div class="vehicle-cover">
                  <img :src="vehicle.image" :alt="vehicle.title" />
                  <span class="status-badge" :class="vehicle.statusTone">{{ vehicle.status }}</span>
                </div>
                <div class="vehicle-card-body">
                  <h3>{{ vehicle.title }}</h3>
                  <p>VIN：{{ vehicle.vin }}</p>
                  <div class="completeness">
                    <span>核心素材</span>
                    <div><i :style="{ width: `${vehicle.score}%` }" /></div>
                    <b>{{ vehicle.completed }}/5</b>
                  </div>
                  <div class="asset-tags"><span v-for="asset in vehicle.assets" :key="asset">{{ asset }}</span></div>
                  <div class="vehicle-card-actions">
                    <span>{{ vehicle.completed === 5 ? '查看模板' : '补充素材' }}</span>
                    <Icon icon="mdi:chevron-right" />
                  </div>
                </div>
              </button>
            </div>
            <div v-else class="empty-state">
              <Icon icon="mdi:car-search-outline" />
              <h2>没有匹配的车辆</h2><p>尝试更换筛选条件或搜索关键词。</p>
            </div>
          </div>

          <aside v-if="activeVehicle" class="vehicle-detail">
            <div class="detail-cover"><img :src="activeVehicle.image" :alt="activeVehicle.title" /></div>
            <div class="detail-body">
              <div class="detail-heading">
                <div><h2>{{ activeVehicle.title }}</h2><p>VIN：{{ activeVehicle.vin }}</p></div>
                <button type="button" title="更多操作"><Icon icon="mdi:dots-horizontal" /></button>
              </div>
              <div class="detail-tags">
                <span>{{ activeVehicle.note }}</span><span>VIN 查询入库</span><span>核心素材 {{ activeVehicle.completed }}/5</span>
              </div>
              <div class="detail-actions">
                <button class="vl-button accent" type="button" @click="showTemplateModal = true"><Icon icon="mdi:movie-open-play-outline" />查看模板</button>
                <button class="vl-button ghost" type="button"><Icon icon="mdi:cloud-upload-outline" />上传素材</button>
                <button class="icon-button" type="button" title="编辑信息"><Icon icon="mdi:pencil-outline" /></button>
              </div>
              <div class="detail-tabs">
                <button v-for="tab in [
                  { value: 'overview', label: '概览' },
                  { value: 'assets', label: '全部素材' },
                  { value: 'suggestions', label: '模板建议' },
                ]" :key="tab.value" type="button" :class="{ active: activeDetailTab === tab.value }"
                  @click="activeDetailTab = tab.value as DetailTab">{{ tab.label }}</button>
              </div>
              <div v-if="activeDetailTab === 'overview'" class="info-list">
                <div><span>品牌车系</span><strong>{{ activeVehicle.brand }} / {{ activeVehicle.series }}</strong></div>
                <div><span>年款车型</span><strong>{{ activeVehicle.model }}</strong></div>
                <div><span>动力类型</span><strong>{{ activeVehicle.energy }}</strong></div>
                <div><span>最近更新</span><strong>{{ activeVehicle.updated }}</strong></div>
                <div><span>容量占用</span><strong>{{ activeVehicle.size }}</strong></div>
              </div>
              <div v-else-if="activeDetailTab === 'assets'" class="material-grid">
                <article v-for="(asset, index) in ['外观正前', '外观侧面', '主驾驶图', '车尾图', '前排视频', '后排视频']" :key="asset">
                  <div><img v-if="index < activeVehicle.completed" :src="activeVehicle.image" :alt="asset" /><Icon v-else icon="mdi:image-plus-outline" /></div>
                  <span>{{ asset }}</span>
                </article>
              </div>
              <div v-else class="suggestion-list">
                <article><Icon icon="mdi:cellphone-play" /><div><strong>竖屏快速讲车</strong><span>9:16 · 需要 3 图 2 视频</span></div></article>
                <article><Icon icon="mdi:storefront-outline" /><div><strong>展厅品牌介绍</strong><span>16:9 · 建议关联车场素材</span></div></article>
                <article><Icon icon="mdi:diamond-outline" /><div><strong>高端质感展示</strong><span>建议补充车辆细节素材</span></div></article>
              </div>
            </div>
          </aside>
        </section>
      </template>

      <section v-else-if="activeLibraryTab === 'lots'" class="content-panel">
        <div class="section-heading"><div><h2>车场素材</h2><p>车场图片与视频作为企业资产沉淀，后续可被模板和生成链路复用。</p></div>
          <button class="vl-button primary" type="button" @click="showLotModal = true"><Icon icon="mdi:garage-plus" />新增车场</button></div>
        <div class="lot-grid">
          <article v-for="lot in [
            { name: '虹桥精品展厅', image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=85', meta: '场地图片 1 张 · 场地视频 1 个 · 已关联 18 辆车' },
            { name: '浦东室外车场', image: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=900&q=85', meta: '场地图片 1 张 · 场地视频 1 个 · 已关联 11 辆车' },
            { name: '松江交付区', image: 'https://images.unsplash.com/photo-1565043666747-69f6646db940?auto=format&fit=crop&w=900&q=85', meta: '场地图片 1 张 · 场地视频 0 个 · 草稿' },
          ]" :key="lot.name">
            <img :src="lot.image" :alt="lot.name" /><div><span class="status-badge ready">素材资产</span><h3>{{ lot.name }}</h3><p>{{ lot.meta }}</p>
              <button class="vl-button ghost" type="button">管理素材</button></div>
          </article>
        </div>
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
              <button class="vl-button ghost" type="button" @click="showTemplateModal = true">查看模板</button></div>
          </article>
        </div>
      </section>
    </main>

    <div v-if="showVehicleModal" class="vl-modal-backdrop" @click.self="showVehicleModal = false">
      <section class="vl-modal vehicle-modal">
        <header><div><h2>新增车辆</h2><p>通过 VIN 快速识别车型，也可以直接手动填写。</p></div>
          <button type="button" title="关闭" @click="showVehicleModal = false"><Icon icon="mdi:close" /></button></header>
        <div class="modal-body">
          <section class="form-section">
            <div class="form-section-title"><span>1</span><div><strong>VIN 智能识别</strong><small>输入 17 位 VIN，自动带出车辆信息</small></div></div>
            <div class="vin-row"><label><span>VIN 码</span><input v-model="vehicleForm.vin" maxlength="17" placeholder="请输入 17 位 VIN" @input="vehicleForm.vin = vehicleForm.vin.toUpperCase()" /></label>
              <button class="vl-button primary" type="button" :disabled="vinLoading || vinOcrLoading" @click="recognizeVin()">
                <Icon :icon="vinLoading ? 'mdi:loading' : 'mdi:magnify'" :class="{ spinning: vinLoading }" />{{ vinLoading ? '查询中' : '立即查询' }}
              </button></div>
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
            <div class="form-section-title"><span>2</span><div><strong>车辆基础信息</strong><small>识别结果可继续编辑</small></div></div>
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
              <label><span>排量</span><input v-model="vehicleForm.displacement" placeholder="如：2.0T" /></label>
              <label><span>变速箱</span><input v-model="vehicleForm.transmission" placeholder="如：自动" /></label>
              <label><span>排放标准</span><input v-model="vehicleForm.emissionStandard" placeholder="如：国6" /></label>
              <label><span>新车指导价（万元）</span><input v-model="vehicleForm.guidePrice" placeholder="如：46.69" /></label>
              <label><span>车身颜色</span><input v-model="vehicleForm.color" placeholder="如：黑色" /></label>
              <label class="full"><span>车辆备注</span><input v-model="vehicleForm.note" maxlength="100" placeholder="门店、车辆亮点或配置补充" /></label>
            </div>
          </section>
          <section class="material-tip"><Icon icon="mdi:cloud-upload-outline" /><div><strong>下一步：上传车辆素材</strong><span>入库后可继续补充车头、车尾、主驾驶及前后排视频。</span></div></section>
        </div>
        <footer><button class="vl-button ghost" type="button" @click="showVehicleModal = false">取消</button>
          <button class="vl-button primary" type="button" @click="addVehicle"><Icon icon="mdi:check" />确认入库</button></footer>
      </section>
    </div>

    <div v-if="showLotModal" class="vl-modal-backdrop" @click.self="showLotModal = false">
      <section class="vl-modal compact-modal"><header><div><h2>新增车场</h2><p>上传一次，后续模板可持续复用。</p></div><button type="button" @click="showLotModal = false"><Icon icon="mdi:close" /></button></header>
        <div class="modal-body"><label class="wide-field"><span>车场名称 *</span><input value="虹桥精品展厅" /></label>
          <div class="upload-lanes"><button type="button"><Icon icon="mdi:image-plus-outline" /><strong>车场图片</strong><span>JPG / PNG / WebP</span></button>
            <button type="button"><Icon icon="mdi:video-plus-outline" /><strong>车场视频</strong><span>MP4 / MOV，建议 10-30 秒</span></button></div></div>
        <footer><button class="vl-button ghost" type="button" @click="showLotModal = false">取消</button><button class="vl-button primary" type="button" @click="showLotModal = false">确认入库</button></footer>
      </section>
    </div>

    <div v-if="showTemplateModal" class="vl-modal-backdrop" @click.self="showTemplateModal = false">
      <section class="vl-modal compact-modal"><header><div><h2>模板详情</h2><p>当前阶段仅展示素材规则，不会提交生成任务。</p></div><button type="button" @click="showTemplateModal = false"><Icon icon="mdi:close" /></button></header>
        <div class="modal-body"><div class="template-detail-banner"><Icon icon="mdi:cellphone-play" /><div><strong>竖屏快速讲车</strong><span>9:16 · 约 45 秒 · 适合抖音/视频号</span></div></div>
          <div class="requirement-list"><div><Icon icon="mdi:check-circle" /><span>外观前 45° 图片</span><b>必需</b></div><div><Icon icon="mdi:check-circle" /><span>车尾与主驾驶图片</span><b>必需</b></div><div><Icon icon="mdi:check-circle" /><span>前排与后排视频</span><b>必需</b></div></div></div>
        <footer><button class="vl-button primary" type="button" @click="showTemplateModal = false">知道了</button></footer>
      </section>
    </div>
  </div>
</template>
