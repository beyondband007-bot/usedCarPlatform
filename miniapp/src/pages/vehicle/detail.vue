<script lang="ts" setup>
import { computed, ref } from 'vue'
import { deleteVehicle, getVehicleDetail, submitVehicle } from '@/api/vehicle'
import { VEHICLE_STATUS_COLOR, VEHICLE_STATUS_TEXT } from '@/constants/vehicle'
import { useVehicleStore } from '@/store/vehicle'
import { syncVehicleCaptureProgress } from '@/utils/vehicleProgress'

definePage({
  style: {
    navigationBarTitleText: '车辆详情',
    enablePullDownRefresh: true,
  },
})

const vehicleStore = useVehicleStore()
const id = ref('')
const loading = ref(true)
const errorMessage = ref('')
const submitting = ref(false)
const vehicle = computed(() => vehicleStore.currentVehicle)
const progress = computed(() => {
  if (!vehicle.value?.requiredPhotoCount)
    return 0
  return Math.min(100, Math.round(vehicle.value.photoCount / vehicle.value.requiredPhotoCount * 100))
})
const canSubmit = computed(() =>
  !!vehicle.value
  && vehicle.value.photoCount >= vehicle.value.requiredPhotoCount
  && !['uploading', 'processing', 'completed'].includes(vehicle.value.status),
)

async function loadDetail() {
  if (!id.value)
    return
  loading.value = true
  errorMessage.value = ''
  try {
    vehicleStore.setCurrentVehicle(await getVehicleDetail(id.value))
  }
  catch {
    errorMessage.value = '车辆详情加载失败，请稍后重试'
  }
  finally {
    loading.value = false
    uni.stopPullDownRefresh()
  }
}

function goTo(path: string) {
  uni.navigateTo({ url: `${path}${path.includes('?') ? '&' : '?'}vehicleId=${id.value}` })
}

async function submitTask() {
  if (!canSubmit.value || submitting.value)
    return
  submitting.value = true
  try {
    vehicleStore.setCurrentVehicle(await submitVehicle(id.value))
    uni.showToast({ title: '任务已提交', icon: 'success' })
  }
  catch {
    uni.showToast({ title: '提交失败，请稍后重试', icon: 'none' })
  }
  finally {
    submitting.value = false
  }
}

function confirmDelete() {
  uni.showModal({
    title: '删除车辆任务？',
    content: '删除后相关任务数据将无法恢复。',
    confirmText: '删除',
    confirmColor: '#EF4444',
    success: async (result) => {
      if (!result.confirm)
        return
      try {
        await deleteVehicle(id.value)
        vehicleStore.setCurrentVehicle(undefined)
        vehicleStore.setList(vehicleStore.list.filter(item => item.id !== id.value))
        uni.showToast({ title: '已删除', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 500)
      }
      catch {
        uni.showToast({ title: '删除失败，请稍后重试', icon: 'none' })
      }
    },
  })
}

onLoad((options) => {
  id.value = String(options?.id || options?.vehicleId || '')
  if (!id.value) {
    errorMessage.value = '缺少车辆任务参数'
    loading.value = false
    return
  }
  loadDetail()
})
onPullDownRefresh(loadDetail)
onShow(() => {
  if (id.value)
    syncVehicleCaptureProgress(id.value)
})
</script>

<template>
  <view class="min-h-screen bg-[#F5F7FA] px-3 pb-8 pt-3">
    <view v-if="loading" class="space-y-3">
      <view class="h-36 rounded-3 bg-white" />
      <view class="h-44 rounded-3 bg-white" />
    </view>
    <view v-else-if="errorMessage && !vehicle" class="rounded-3 bg-white p-8 text-center">
      <view class="text-3.5 text-[#EF4444]">
        {{ errorMessage }}
      </view>
      <button class="mt-4 h-10 rounded-2 bg-[#3B82F6] px-5 text-3.5 text-white" @click="loadDetail">
        重新加载
      </button>
    </view>
    <template v-else-if="vehicle">
      <view class="rounded-3 bg-white p-4">
        <view class="flex items-start justify-between gap-3">
          <view>
            <view class="text-5 text-[#111827] font-700">
              {{ vehicle.brandName }} {{ vehicle.seriesName }}
            </view>
            <view class="mt-1 text-3.5 text-[#6B7280]">
              {{ vehicle.modelName }} · {{ vehicle.colorName }}
            </view>
          </view>
          <view
            class="shrink-0 rounded-full px-3 py-1 text-3.5"
            :style="{ color: VEHICLE_STATUS_COLOR[vehicle.status], backgroundColor: `${VEHICLE_STATUS_COLOR[vehicle.status]}15` }"
          >
            {{ VEHICLE_STATUS_TEXT[vehicle.status] }}
          </view>
        </view>
        <view class="grid grid-cols-2 mt-4 gap-x-4 gap-y-3 border-t border-[#F3F4F6] pt-4">
          <view>
            <text class="text-3 text-[#9CA3AF]">车牌号</text><view class="mt-1 text-3.5 text-[#374151]">
              {{ vehicle.plateNumber || '未填写' }}
            </view>
          </view>
          <view>
            <text class="text-3 text-[#9CA3AF]">车架号</text><view class="mt-1 break-all text-3.5 text-[#374151]">
              {{ vehicle.vin || '未填写' }}
            </view>
          </view>
          <view>
            <text class="text-3 text-[#9CA3AF]">上牌时间</text><view class="mt-1 text-3.5 text-[#374151]">
              {{ vehicle.registerDate || '未填写' }}
            </view>
          </view>
          <view>
            <text class="text-3 text-[#9CA3AF]">行驶里程</text><view class="mt-1 text-3.5 text-[#374151]">
              {{ vehicle.mileage != null ? `${vehicle.mileage} 公里` : '未填写' }}
            </view>
          </view>
        </view>
      </view>

      <view class="mt-3 rounded-3 bg-white p-4">
        <view class="flex items-center justify-between">
          <view class="text-4.5 text-[#111827] font-600">
          素材进度
          </view>
          <view class="text-4 text-[#3B82F6] font-600">
            {{ vehicle.photoCount }}/{{ vehicle.requiredPhotoCount }}
          </view>
        </view>
        <view class="mt-3 h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
          <view class="h-full rounded-full bg-[#3B82F6]" :style="{ width: `${progress}%` }" />
        </view>
        <view class="mt-2 text-3 text-[#6B7280]">
          必拍素材完成 {{ progress }}%
        </view>
      </view>

      <view v-if="vehicle.status === 'failed'" class="mt-3 rounded-3 bg-[#FEF2F2] p-4 text-3.5 text-[#B91C1C]">
        任务处理失败，请检查图片上传状态后重新提交。
      </view>

      <view class="mt-3 rounded-3 bg-white p-4">
        <view class="mb-3 text-4.5 text-[#111827] font-600">
          任务操作
        </view>
        <view class="grid grid-cols-1 gap-3">
          <button class="h-11 rounded-2 bg-[#3B82F6] text-3.5 text-white" @click="goTo('/pages/capture/index')">
            继续拍摄
          </button>
          <button class="h-11 rounded-2 border border-[#BFDBFE] bg-white text-3.5 text-[#2563EB]" @click="goTo('/pages/capture/upload')">
            查看上传状态
          </button>
        </view>
        <button
          class="mt-3 h-11 w-full rounded-2 text-3.5 text-white"
          :class="canSubmit ? 'bg-[#111827]' : 'bg-[#9CA3AF]'"
          :disabled="!canSubmit || submitting"
          @click="submitTask"
        >
          {{ submitting ? '正在提交…' : vehicle.status === 'failed' ? '重新提交' : '提交任务' }}
        </button>
      </view>

      <view v-if="vehicle.remark" class="mt-3 rounded-3 bg-white p-4">
        <view class="text-3 text-[#9CA3AF]">
          车辆备注
        </view>
        <view class="mt-2 whitespace-pre-wrap text-3.5 text-[#374151]">
          {{ vehicle.remark }}
        </view>
      </view>
      <button class="mt-5 h-11 w-full bg-transparent text-3.5 text-[#EF4444]" @click="confirmDelete">
        删除车辆任务
      </button>
    </template>
  </view>
</template>
