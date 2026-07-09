<script lang="ts" setup>
import type { CapturePosition, UploadTask } from '@/types/upload'
import { computed, ref } from 'vue'
import { deleteVehicle, getVehicleDetail, submitVehicle } from '@/api/vehicle'
import { DEFAULT_CAPTURE_POSITIONS } from '@/constants/capture'
import { UPLOAD_STATUS_TEXT } from '@/constants/upload'
import { VEHICLE_STATUS_COLOR, VEHICLE_STATUS_TEXT } from '@/constants/vehicle'
import { useUploadQueue } from '@/composables/useUploadQueue'
import { useUploadStore } from '@/store/upload'
import { useVehicleStore } from '@/store/vehicle'
import { hydrateVehicleMaterialsFromServer, removeVehicleMaterial } from '@/utils/vehicleMaterials'
import { syncVehicleCaptureProgress } from '@/utils/vehicleProgress'

definePage({
  style: {
    navigationBarTitleText: '车辆详情',
    enablePullDownRefresh: true,
  },
})

const vehicleStore = useVehicleStore()
const uploadStore = useUploadStore()
const { processQueue } = useUploadQueue()
const id = ref('')
const loading = ref(true)
const materialsLoading = ref(false)
const errorMessage = ref('')
const submitting = ref(false)
const vehicle = computed(() => vehicleStore.currentVehicle)
const progress = computed(() => {
  if (!vehicle.value?.requiredPhotoCount)
    return 0
  return Math.min(100, Math.round(vehicle.value.photoCount / vehicle.value.requiredPhotoCount * 100))
})
const isMaterialsReady = computed(() =>
  !!vehicle.value && vehicle.value.photoCount >= vehicle.value.requiredPhotoCount,
)
const materialPositions = computed(() => [...DEFAULT_CAPTURE_POSITIONS].sort((a, b) => a.sort - b.sort))
const vehicleTasks = computed(() => uploadStore.queue
  .filter(task => task.vehicleId === id.value && task.status !== 'cancelled'))
const canSubmit = computed(() =>
  !!vehicle.value
  && vehicle.value.photoCount >= vehicle.value.requiredPhotoCount
  && !['uploading', 'processing', 'completed'].includes(vehicle.value.status),
)

function taskFor(code: string): UploadTask | undefined {
  return vehicleTasks.value.find(task => task.captureCode === code)
}

function isVideo(position: CapturePosition) {
  return position.mediaType === 'video'
}

function editMaterial(_position: CapturePosition) {
  goTo('/pages/capture/index')
}

async function loadMaterials() {
  if (!id.value || !isMaterialsReady.value)
    return
  materialsLoading.value = true
  try {
    await hydrateVehicleMaterialsFromServer(id.value)
  }
  catch {
    uni.showToast({ title: '素材加载失败，请下拉刷新', icon: 'none' })
  }
  finally {
    materialsLoading.value = false
  }
}

async function loadDetail() {
  if (!id.value)
    return
  loading.value = true
  errorMessage.value = ''
  try {
    vehicleStore.setCurrentVehicle(await getVehicleDetail(id.value))
    if (isMaterialsReady.value)
      await loadMaterials()
  }
  catch {
    errorMessage.value = '车辆详情加载失败，请稍后重试'
  }
  finally {
    loading.value = false
    uni.stopPullDownRefresh()
  }
}

function previewMaterial(position: CapturePosition) {
  const task = taskFor(position.code)
  const url = task?.localPath || task?.remoteUrl
  if (!url)
    return
  uni.navigateTo({ url: `/pages/capture/preview?vehicleId=${id.value}&taskId=${task.id}` })
}

function removeMaterial(position: CapturePosition) {
  const task = taskFor(position.code)
  if (!task)
    return
  const label = isVideo(position) ? '视频' : '照片'
  uni.showModal({
    title: `删除这个${label}？`,
    content: '删除后需要重新拍摄该位置素材。',
    confirmText: '删除',
    confirmColor: '#EF4444',
    success: (result) => {
      if (!result.confirm)
        return
      void (async () => {
        try {
          await removeVehicleMaterial(id.value, position.code, task)
          syncVehicleCaptureProgress(id.value)
          vehicleStore.setCurrentVehicle(await getVehicleDetail(id.value))
        }
        catch {
          uni.showToast({ title: '删除失败，请稍后重试', icon: 'none' })
        }
      })()
    },
  })
}

function goToEdit() {
  uni.navigateTo({ url: `/pages/vehicle/create?id=${id.value}` })
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
  if (!id.value)
    return
  processQueue()
  if (isMaterialsReady.value)
    void loadMaterials()
  else
    syncVehicleCaptureProgress(id.value)
  if (!loading.value && vehicle.value)
    void getVehicleDetail(id.value).then(data => vehicleStore.setCurrentVehicle(data)).catch(() => {})
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
              {{ vehicle.modelName }} · {{ vehicle.colorName || '未填写颜色' }}
            </view>
            <view
              v-if="!isMaterialsReady"
              class="mt-1 text-3"
              :style="{ color: VEHICLE_STATUS_COLOR[vehicle.status] }"
            >
              {{ VEHICLE_STATUS_TEXT[vehicle.status] }}
            </view>
          </view>
          <button
            class="m-0 shrink-0 rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-1 text-3.5 text-[#2563EB] leading-normal"
            @click="goToEdit"
          >
            编辑
          </button>
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

      <view v-if="isMaterialsReady" class="mt-3 rounded-3 bg-white p-4">
        <view class="mb-3 flex items-center justify-between">
          <view class="text-4.5 text-[#111827] font-600">
            素材信息
          </view>
          <view class="text-3 text-[#16A34A]">
            已全部上传
          </view>
        </view>
        <view v-if="materialsLoading" class="py-8 text-center text-3.5 text-[#9CA3AF]">
          正在加载素材…
        </view>
        <view v-else class="grid grid-cols-2 gap-3">
          <view v-for="position in materialPositions" :key="position.code" class="overflow-hidden rounded-2 border border-[#F3F4F6]">
            <view class="relative h-28 bg-[#F9FAFB]" @click="taskFor(position.code) ? previewMaterial(position) : editMaterial(position)">
              <image
                v-if="taskFor(position.code) && !isVideo(position)"
                class="h-full w-full"
                :src="taskFor(position.code)?.localPath || taskFor(position.code)?.remoteUrl"
                mode="aspectFill"
              />
              <video
                v-else-if="taskFor(position.code) && isVideo(position)"
                class="h-full w-full"
                :src="taskFor(position.code)?.localPath || taskFor(position.code)?.remoteUrl"
                :controls="false"
                :show-center-play-btn="true"
                object-fit="cover"
              />
              <view v-else class="h-full flex items-center justify-center text-3 text-[#9CA3AF]">
                暂无素材
              </view>
              <view v-if="taskFor(position.code)" class="absolute bottom-1.5 right-1.5 rounded-full bg-black/60 px-2 py-0.5 text-2.5 text-white">
                {{ UPLOAD_STATUS_TEXT[taskFor(position.code)!.status] }}
              </view>
            </view>
            <view class="p-2.5">
              <view class="text-3.5 text-[#111827] font-600">
                {{ position.name }}
              </view>
              <view class="mt-2 flex gap-2">
                <button
                  v-if="taskFor(position.code)"
                  class="m-0 h-7 flex-1 rounded-1.5 bg-[#EFF6FF] px-1 text-2.5 text-[#2563EB]"
                  @click.stop="previewMaterial(position)"
                >
                  预览
                </button>
                <button
                  class="m-0 h-7 flex-1 rounded-1.5 bg-[#F3F4F6] px-1 text-2.5 text-[#374151]"
                  @click.stop="editMaterial(position)"
                >
                  修改
                </button>
                <button
                  v-if="taskFor(position.code)"
                  class="m-0 h-7 flex-1 rounded-1.5 bg-[#FEF2F2] px-1 text-2.5 text-[#DC2626]"
                  @click.stop="removeMaterial(position)"
                >
                  删除
                </button>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view v-else class="mt-3 rounded-3 bg-white p-4">
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
