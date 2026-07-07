<script lang="ts" setup>
import type { VehicleTask } from '@/types/vehicle'
import type { VehicleLibraryStats } from '@/api/vehicle'
import { computed, ref } from 'vue'
import { DEFAULT_CAPTURE_POSITIONS } from '@/constants/capture'
import { VEHICLE_STATUS_TEXT } from '@/constants/vehicle'
import { getVehicleLibraryHome } from '@/api/vehicle'
import { useUploadStore } from '@/store/upload'
import { useUserStore } from '@/store/user'
import { useVehicleStore } from '@/store/vehicle'

defineOptions({
  name: 'WorkbenchHome',
})

definePage({
  type: 'home',
  style: {
    navigationBarTitleText: '素材采集',
    enablePullDownRefresh: true,
  },
})

const userStore = useUserStore()
const vehicleStore = useVehicleStore()
const uploadStore = useUploadStore()
const libraryStats = ref<VehicleLibraryStats | null>(null)

const userInfo = computed(() => userStore.userInfo)
const displayName = computed(() => userInfo.value.nickname || userInfo.value.username || '车辆拍摄员')
const recentVehicles = computed(() => vehicleStore.list.slice(0, 5))
const pendingCount = computed(() => {
  if (libraryStats.value)
    return Math.max(0, libraryStats.value.activeVehicles - libraryStats.value.completeVehicles)
  return vehicleStore.list.filter(item => item.photoCount < item.requiredPhotoCount).length
})
const completedCount = computed(() => libraryStats.value?.completeVehicles
  ?? vehicleStore.list.filter(item => item.photoCount >= item.requiredPhotoCount).length)
const uploadingCount = computed(() => uploadStore.unfinishedTasks.length)

async function loadLibraryStats() {
  try {
    const home = await getVehicleLibraryHome()
    libraryStats.value = home.stats
  }
  catch {
    // 首页统计失败时保留列表本地兜底，不打断主流程。
  }
}

function goTo(url: string, tabbar = false) {
  if (tabbar) {
    uni.switchTab({ url })
    return
  }
  uni.navigateTo({ url })
}

function goCapture(vehicle: VehicleTask) {
  vehicleStore.setCurrentVehicle(vehicle)
  goTo(`/pages/capture/index?vehicleId=${vehicle.id}`)
}

onShow(() => {
  loadLibraryStats()
})

onPullDownRefresh(() => {
  loadLibraryStats().finally(() => {
    uni.stopPullDownRefresh()
  })
})
</script>

<template>
  <view class="min-h-screen bg-[#F5F7FA] pb-6">
    <view class="bg-white px-4 pb-5 pt-5">
      <view class="text-5 text-[#111827] font-700">
        {{ displayName }}
      </view>
      <view class="mt-1 text-3.5 text-[#6B7280]">
        拍摄并上传车辆素材到车辆库
      </view>
    </view>

    <view class="px-3 py-3">
      <view class="mb-3 rounded-3 bg-white p-4">
        <button class="h-12 w-full rounded-2 bg-[#3B82F6] text-4 text-white" @click="goTo('/pages/vehicle/create')">
          创建车辆并开始拍摄
        </button>
        <button class="mt-3 h-11 w-full rounded-2 border border-[#BFDBFE] bg-[#EFF6FF] text-3.5 text-[#2563EB]" @click="goTo('/pages/vehicle/list', true)">
          查看车辆列表
        </button>
      </view>

      <view class="mb-3 grid grid-cols-3 gap-3">
        <view class="rounded-2 bg-white p-3 text-center">
          <view class="text-6 text-[#3B82F6] font-700">
            {{ pendingCount }}
          </view>
          <view class="mt-1 text-3 text-[#6B7280]">
            待补素材
          </view>
        </view>
        <view class="rounded-2 bg-white p-3 text-center">
          <view class="text-6 text-[#16A34A] font-700">
            {{ completedCount }}
          </view>
          <view class="mt-1 text-3 text-[#6B7280]">
            素材完整
          </view>
        </view>
        <view class="rounded-2 bg-white p-3 text-center">
          <view class="text-6 text-[#0EA5E9] font-700">
            {{ uploadingCount }}
          </view>
          <view class="mt-1 text-3 text-[#6B7280]">
            上传中
          </view>
        </view>
      </view>

      <view class="rounded-3 bg-white p-4">
        <view class="mb-3 flex items-center justify-between">
          <view class="text-4.5 text-[#111827] font-600">
            最近车辆
          </view>
          <text class="text-3.5 text-[#3B82F6]" @click="goTo('/pages/vehicle/list', true)">
            全部
          </text>
        </view>
        <view v-if="recentVehicles.length === 0" class="py-6 text-center text-3.5 text-[#9CA3AF]">
          暂无车辆，点击上方按钮创建
        </view>
        <view
          v-for="vehicle in recentVehicles"
          :key="vehicle.id"
          class="border-t border-[#F3F4F6] py-3 first:border-t-0"
        >
          <view class="flex items-center justify-between gap-3">
            <view class="min-w-0 flex-1" @click="goTo(`/pages/vehicle/detail?id=${vehicle.id}`)">
              <view class="truncate text-4 text-[#111827] font-600">
                {{ vehicle.vin || vehicle.plateNumber || `车辆 ${vehicle.id}` }}
              </view>
              <view class="mt-1 text-3 text-[#6B7280]">
                素材 {{ vehicle.photoCount }}/{{ vehicle.requiredPhotoCount || DEFAULT_CAPTURE_POSITIONS.length }}
              </view>
            </view>
            <view class="flex shrink-0 items-center gap-2">
              <view class="rounded-1 bg-[#F3F4F6] px-2 py-1 text-3 text-[#6B7280]">
                {{ VEHICLE_STATUS_TEXT[vehicle.status] }}
              </view>
              <button class="m-0 h-8 rounded-1.5 bg-[#EFF6FF] px-3 text-3 text-[#2563EB]" @click="goCapture(vehicle)">
                拍摄
              </button>
            </view>
          </view>
        </view>
      </view>

      <view class="mt-3 rounded-3 bg-[#EFF6FF] p-4 text-3.5 text-[#1D4ED8]">
        每台车需拍摄 {{ DEFAULT_CAPTURE_POSITIONS.length }} 项素材：3 张图片 + 2 段视频
      </view>
    </view>
  </view>
</template>
