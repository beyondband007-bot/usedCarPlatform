<script lang="ts" setup>
import type { VehicleLibraryStats } from '@/api/vehicle'
import { computed, ref } from 'vue'
import { getVehicleLibraryHome } from '@/api/vehicle'
import { canAccessVehicleLibrary } from '@/constants/vehicle-library'
import { useTokenStore } from '@/store/token'
import { useUserStore } from '@/store/user'

definePage({
  style: {
    navigationBarTitleText: '我的',
    enablePullDownRefresh: true,
  },
})

const userStore = useUserStore()
const tokenStore = useTokenStore()

const loading = ref(false)
const stats = ref<VehicleLibraryStats | null>(null)

const userInfo = computed(() => userStore.userInfo)
const hasVehicleLibrary = computed(() => canAccessVehicleLibrary(userInfo.value.packageName))
const accountName = computed(() => userInfo.value.username || userInfo.value.nickname || '未命名用户')
const avatar = computed(() => userInfo.value.avatar || '/static/images/default-avatar.png')
const vehicleCount = computed(() => stats.value?.activeVehicles ?? 0)
const completedCount = computed(() => stats.value?.completeVehicles ?? 0)
const pendingCount = computed(() => Math.max(0, vehicleCount.value - completedCount.value))
const lotCount = computed(() => stats.value?.activeLots ?? 0)

const quotaLabel = computed(() => {
  if (!hasVehicleLibrary.value) {
    return '基础版 · 车辆库未开通'
  }
  const quotaVehicles = stats.value?.quotaVehicles
  const quotaLots = stats.value?.quotaLots
  if (quotaVehicles && quotaLots) {
    return `${vehicleCount.value}/${quotaVehicles}辆车 · ${lotCount.value}/${quotaLots}个车场`
  }
  return `${vehicleCount.value}辆车 · ${lotCount.value}个车场`
})

async function loadStats() {
  if (!hasVehicleLibrary.value) {
    stats.value = null
    uni.stopPullDownRefresh()
    return
  }
  if (loading.value)
    return
  loading.value = true
  try {
    const home = await getVehicleLibraryHome()
    stats.value = home.stats
  }
  catch {
    uni.showToast({
      title: '统计数据加载失败',
      icon: 'none',
    })
  }
  finally {
    loading.value = false
    uni.stopPullDownRefresh()
  }
}

function logout() {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出当前账号吗？',
    success: async (res) => {
      if (!res.confirm)
        return
      await tokenStore.logout()
      uni.reLaunch({ url: '/pages/auth/login' })
    },
  })
}

onShow(() => {
  loadStats()
})

onPullDownRefresh(() => {
  loadStats()
})
</script>

<template>
  <view class="min-h-screen bg-[#F5F7FA] px-3 py-4">
    <view class="mb-3 rounded-2 bg-white p-4">
      <view class="flex items-center gap-3">
        <image :src="avatar" class="h-14 w-14 rounded-full bg-[#F3F4F6]" mode="aspectFill" />
        <view class="min-w-0 flex-1">
          <view class="truncate text-5 text-[#111827] font-700">
            {{ accountName }}
          </view>
          <view class="mt-1 text-3.5 text-[#6B7280]">
            {{ quotaLabel }}
          </view>
        </view>
      </view>
    </view>

    <view class="grid grid-cols-2 mb-3 gap-3">
      <view class="rounded-2 bg-white p-4">
        <view class="text-3.5 text-[#6B7280]">
          车辆总数
        </view>
        <view class="mt-2 text-7 text-[#3B82F6] font-700">
          {{ vehicleCount }}
        </view>
      </view>
      <view class="rounded-2 bg-white p-4">
        <view class="text-3.5 text-[#6B7280]">
          素材完整
        </view>
        <view class="mt-2 text-7 text-[#16A34A] font-700">
          {{ completedCount }}
        </view>
      </view>
      <view class="rounded-2 bg-white p-4">
        <view class="text-3.5 text-[#6B7280]">
          待补素材
        </view>
        <view class="mt-2 text-7 text-[#D97706] font-700">
          {{ pendingCount }}
        </view>
      </view>
      <view class="rounded-2 bg-white p-4">
        <view class="text-3.5 text-[#6B7280]">
          车场
        </view>
        <view class="mt-2 text-7 text-[#111827] font-700">
          {{ lotCount }}
        </view>
      </view>
    </view>

    <view class="rounded-2 bg-white">
      <view class="flex items-center justify-between px-4 py-4" @click="logout">
        <text class="text-4 text-[#EF4444]">
          退出登录
        </text>
      </view>
    </view>
  </view>
</template>
