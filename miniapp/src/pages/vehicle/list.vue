<script lang="ts" setup>
import type { VehicleTask, VehicleTaskStatus } from '@/types/vehicle'
import { computed, ref } from 'vue'
import { getVehicleList } from '@/api/vehicle'
import { VEHICLE_FILTER_OPTIONS, VEHICLE_STATUS_COLOR, VEHICLE_STATUS_TEXT } from '@/constants/vehicle'
import { useVehicleStore } from '@/store/vehicle'

definePage({
  style: {
    navigationBarTitleText: '车辆任务',
    enablePullDownRefresh: true,
  },
})

const PAGE_SIZE = 10
const vehicleStore = useVehicleStore()
const loading = ref(false)
const loadingMore = ref(false)
const errorMessage = ref('')
const page = ref(1)
const total = ref(0)
const keyword = ref(vehicleStore.filter.keyword || '')
const status = ref<VehicleTaskStatus | 'all'>(vehicleStore.filter.status || 'all')
const vehicles = computed(() => vehicleStore.list)
const hasMore = computed(() => vehicles.value.length < total.value)

async function loadVehicles(reset = false) {
  if (loading.value || loadingMore.value)
    return

  if (reset) {
    loading.value = true
    page.value = 1
  }
  else {
    if (!hasMore.value)
      return
    loadingMore.value = true
  }

  errorMessage.value = ''
  try {
    const result = await getVehicleList({
      page: page.value,
      pageSize: PAGE_SIZE,
      status: status.value,
      keyword: keyword.value.trim() || undefined,
    })
    total.value = result.total
    if (reset)
      vehicleStore.setList(result.list)
    else
      vehicleStore.appendList(result.list)
    if (vehicles.value.length < result.total)
      page.value += 1
  }
  catch {
    errorMessage.value = '车辆任务加载失败，请检查网络后重试'
  }
  finally {
    loading.value = false
    loadingMore.value = false
    uni.stopPullDownRefresh()
  }
}

function selectStatus(value: VehicleTaskStatus | 'all') {
  if (status.value === value)
    return
  status.value = value
  vehicleStore.setFilter({ status: value })
  loadVehicles(true)
}

function search() {
  vehicleStore.setFilter({ keyword: keyword.value.trim() })
  loadVehicles(true)
}

function goDetail(vehicle: VehicleTask) {
  vehicleStore.setCurrentVehicle(vehicle)
  uni.navigateTo({ url: `/pages/vehicle/detail?id=${vehicle.id}` })
}

function goCapture(vehicle: VehicleTask) {
  vehicleStore.setCurrentVehicle(vehicle)
  uni.navigateTo({ url: `/pages/capture/index?vehicleId=${vehicle.id}` })
}

function primaryAction(vehicle: VehicleTask) {
  goCapture(vehicle)
}

function actionText(vehicle: VehicleTask) {
  if (vehicle.photoCount >= vehicle.requiredPhotoCount)
    return '查看素材'
  if (vehicle.photoCount > 0)
    return '继续拍摄'
  return '开始拍摄'
}

onLoad(() => loadVehicles(true))
onShow(() => {
  if (page.value > 1)
    loadVehicles(true)
})
onPullDownRefresh(() => loadVehicles(true))
onReachBottom(() => loadVehicles())
</script>

<template>
  <view class="min-h-screen bg-[#F5F7FA] pb-24">
    <view class="sticky top-0 z-10 bg-white px-3 pb-3 pt-3">
      <view class="flex items-center gap-2">
        <input
          v-model="keyword"
          class="h-10 min-w-0 flex-1 rounded-2 bg-[#F3F4F6] px-3 text-3.5"
          confirm-type="search"
          placeholder="搜索 VIN、车牌或品牌"
          @confirm="search"
        >
        <button class="m-0 h-10 rounded-2 bg-[#3B82F6] px-4 text-3.5 text-white" @click="search">
          搜索
        </button>
      </view>
      <scroll-view class="mt-3 whitespace-nowrap" scroll-x>
        <view
          v-for="item in VEHICLE_FILTER_OPTIONS"
          :key="item.value"
          class="mr-2 inline-flex rounded-full px-3 py-1.5 text-3.5"
          :class="status === item.value ? 'bg-[#3B82F6] text-white' : 'bg-[#F3F4F6] text-[#6B7280]'"
          @click="selectStatus(item.value)"
        >
          {{ item.label }}
        </view>
      </scroll-view>
    </view>

    <view class="px-3 py-3">
      <view v-if="loading" class="space-y-3">
        <view v-for="item in 3" :key="item" class="h-34 rounded-3 bg-white" />
      </view>

      <view v-else-if="errorMessage && vehicles.length === 0" class="rounded-3 bg-white p-6 text-center">
        <view class="text-3.5 text-[#EF4444]">
          {{ errorMessage }}
        </view>
        <button class="mt-4 h-10 rounded-2 bg-[#3B82F6] px-5 text-3.5 text-white" @click="loadVehicles(true)">
          重新加载
        </button>
      </view>

      <view v-else-if="vehicles.length === 0" class="rounded-3 bg-white p-8 text-center">
        <view class="text-4 text-[#111827] font-600">
          暂无车辆任务
        </view>
        <view class="mt-2 text-3.5 text-[#9CA3AF]">
          创建车辆后即可开始规范拍摄
        </view>
        <button class="mt-5 h-11 rounded-2 bg-[#3B82F6] px-6 text-4 text-white" @click="uni.navigateTo({ url: '/pages/vehicle/create' })">
          创建车辆
        </button>
      </view>

      <view v-else class="space-y-3">
        <view v-for="vehicle in vehicles" :key="vehicle.id" class="rounded-3 bg-white p-3" @click="goDetail(vehicle)">
          <view class="flex gap-3">
            <image
              v-if="vehicle.coverUrl"
              class="h-21 w-28 shrink-0 rounded-2 bg-[#F3F4F6]"
              :src="vehicle.coverUrl"
              mode="aspectFill"
              lazy-load
            />
            <view v-else class="h-21 w-28 flex shrink-0 items-center justify-center rounded-2 bg-[#EFF6FF] text-3 text-[#3B82F6]">
              暂无封面
            </view>
            <view class="min-w-0 flex-1">
              <view class="flex items-start justify-between gap-2">
                <view class="line-clamp-2 text-4 text-[#111827] font-600">
                  {{ vehicle.brandName }} {{ vehicle.seriesName }} {{ vehicle.modelName }}
                </view>
                <view
                  class="shrink-0 rounded-full px-2 py-1 text-3"
                  :style="{ color: VEHICLE_STATUS_COLOR[vehicle.status], backgroundColor: `${VEHICLE_STATUS_COLOR[vehicle.status]}15` }"
                >
                  {{ VEHICLE_STATUS_TEXT[vehicle.status] }}
                </view>
              </view>
              <view class="mt-2 text-3 text-[#6B7280]">
                {{ vehicle.plateNumber || vehicle.vin || `任务 ${vehicle.id}` }}
              </view>
              <view class="mt-2 flex items-center gap-2">
                <view class="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E5E7EB]">
                  <view
                    class="h-full rounded-full bg-[#3B82F6]"
                    :style="{ width: `${Math.min(100, vehicle.requiredPhotoCount ? vehicle.photoCount / vehicle.requiredPhotoCount * 100 : 0)}%` }"
                  />
                </view>
                <text class="text-3 text-[#6B7280]">素材 {{ vehicle.photoCount }}/{{ vehicle.requiredPhotoCount }}</text>
              </view>
            </view>
          </view>
          <view class="mt-3 flex items-center justify-between border-t border-[#F3F4F6] pt-3">
            <text class="text-3 text-[#9CA3AF]">{{ vehicle.updatedAt }}</text>
            <button class="m-0 h-8 rounded-1.5 bg-[#EFF6FF] px-3 text-3 text-[#2563EB]" @click.stop="primaryAction(vehicle)">
              {{ actionText(vehicle) }}
            </button>
          </view>
        </view>
        <view class="py-3 text-center text-3 text-[#9CA3AF]">
          {{ loadingMore ? '正在加载…' : hasMore ? '上拉加载更多' : '已经到底了' }}
        </view>
      </view>
    </view>

    <button class="fixed bottom-18 right-4 z-20 h-12 rounded-full bg-[#3B82F6] px-5 text-4 text-white shadow" @click="uni.navigateTo({ url: '/pages/vehicle/create' })">
      + 创建车辆
    </button>
  </view>
</template>
