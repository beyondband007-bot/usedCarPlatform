<script lang="ts" setup>
import type { CapturePosition, UploadTask } from '@/types/upload'
import { computed, ref } from 'vue'
import { getCapturePositions } from '@/api/capture'
import { submitVehicle } from '@/api/vehicle'
import { DEFAULT_CAPTURE_POSITIONS } from '@/constants/capture'
import { UPLOAD_LIMITS, UPLOAD_STATUS_TEXT } from '@/constants/upload'
import { useUploadQueue } from '@/composables/useUploadQueue'
import { syncVehicleCaptureProgress } from '@/utils/vehicleProgress'
import { hydrateVehicleMaterialsFromServer, removeVehicleMaterial } from '@/utils/vehicleMaterials'

definePage({
  style: {
    navigationBarTitleText: '拍摄素材',
    enablePullDownRefresh: true,
  },
})

const vehicleId = ref('')
const positions = ref<CapturePosition[]>([])
const loading = ref(true)
const errorMessage = ref('')
const choosingCode = ref('')
const submitting = ref(false)
const { enqueue, processQueue, retry, uploadStore } = useUploadQueue()

const vehicleTasks = computed(() => uploadStore.queue.filter(task => task.vehicleId === vehicleId.value && task.status !== 'cancelled'))
const hasUploadingTask = computed(() => vehicleTasks.value.some(task => ['waiting', 'uploading'].includes(task.status)))
const requiredPositions = computed(() => positions.value.filter(item => item.required))
const completedRequired = computed(() => requiredPositions.value.filter(item => taskFor(item.code)?.status === 'success').length)
const progress = computed(() => requiredPositions.value.length ? Math.round(completedRequired.value / requiredPositions.value.length * 100) : 0)
const canSubmit = computed(() => requiredPositions.value.length > 0 && completedRequired.value === requiredPositions.value.length)

function taskFor(code: string): UploadTask | undefined {
  return vehicleTasks.value.find(task => task.captureCode === code)
}

function isVideo(position: CapturePosition) {
  return position.mediaType === 'video'
}

function persistFile(path: string) {
  if (typeof (uni as any).saveFile !== 'function')
    return Promise.resolve(path)
  return new Promise<string>((resolve) => {
    uni.saveFile({
      tempFilePath: path,
      success: result => resolve(result.savedFilePath),
      fail: () => resolve(path),
    })
  })
}

function enqueueMedia(position: CapturePosition, path: string, fileSize?: number) {
  const localPath = path
  enqueue({
    vehicleId: vehicleId.value,
    captureCode: position.code,
    mediaType: position.mediaType,
    localPath,
    fileSize,
    fileName: localPath.split('/').pop(),
  })
}

function handleAuthError(error: unknown) {
  const message = String((error as any).errMsg || '')
  if (message.includes('auth') || message.includes('authorize')) {
    uni.showModal({
      title: '需要相机或相册权限',
      content: '请在设置中允许访问后再继续拍摄。',
      confirmText: '前往设置',
      success: result => result.confirm && uni.openSetting({}),
    })
  }
}

async function chooseImage(position: CapturePosition) {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['camera', 'album'],
    success: async (result) => {
      const path = result.tempFilePaths[0]
      const file = result.tempFiles?.[0] as any
      if (!path)
        return
      if (file?.size > UPLOAD_LIMITS.maxSize) {
        uni.showToast({ title: `图片不能超过 ${Math.round(UPLOAD_LIMITS.maxSize / 1024 / 1024)}MB`, icon: 'none' })
        return
      }
      const localPath = await persistFile(path)
      enqueueMedia(position, localPath, file?.size)
    },
    fail: handleAuthError,
    complete: () => {
      choosingCode.value = ''
    },
  })
}

async function chooseVideo(position: CapturePosition) {
  uni.chooseVideo({
    sourceType: ['camera', 'album'],
    compressed: true,
    maxDuration: UPLOAD_LIMITS.maxVideoDuration,
    success: async (result) => {
      const path = result.tempFilePath
      if (!path)
        return
      if (result.size > UPLOAD_LIMITS.maxVideoSize) {
        uni.showToast({ title: `视频不能超过 ${Math.round(UPLOAD_LIMITS.maxVideoSize / 1024 / 1024)}MB`, icon: 'none' })
        return
      }
      const localPath = await persistFile(path)
      enqueueMedia(position, localPath, result.size)
    },
    fail: handleAuthError,
    complete: () => {
      choosingCode.value = ''
    },
  })
}

function choose(position: CapturePosition) {
  if (choosingCode.value)
    return
  choosingCode.value = position.code
  if (isVideo(position))
    chooseVideo(position)
  else
    chooseImage(position)
}

async function loadPositions() {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await getCapturePositions(vehicleId.value)
    positions.value = result.length ? [...result].sort((a, b) => a.sort - b.sort) : DEFAULT_CAPTURE_POSITIONS
  }
  catch {
    positions.value = DEFAULT_CAPTURE_POSITIONS
    errorMessage.value = '未能获取最新拍摄规范，当前使用默认拍摄位'
  }

  try {
    await hydrateVehicleMaterialsFromServer(vehicleId.value)
    syncVehicleCaptureProgress(vehicleId.value)
  }
  catch {
    errorMessage.value = errorMessage.value || '已有素材加载失败，请下拉刷新重试'
  }
  finally {
    loading.value = false
    uni.stopPullDownRefresh()
  }
}

function preview(position: CapturePosition) {
  const task = taskFor(position.code)
  const url = task?.localPath || task?.remoteUrl
  if (url)
    uni.navigateTo({ url: `/pages/capture/preview?vehicleId=${vehicleId.value}&taskId=${task?.id}` })
}

function remove(position: CapturePosition) {
  const task = taskFor(position.code)
  if (!task)
    return
  const label = isVideo(position) ? '视频' : '照片'
  uni.showModal({
    title: `删除这个${label}？`,
    content: `删除后需要重新拍摄该位置。`,
    confirmText: '删除',
    confirmColor: '#EF4444',
    success: (result) => {
      if (!result.confirm)
        return
      void (async () => {
        try {
          await removeVehicleMaterial(vehicleId.value, position.code, task)
          syncVehicleCaptureProgress(vehicleId.value)
        }
        catch (error) {
          uni.showToast({
            title: error instanceof Error ? error.message : '删除失败，请稍后重试',
            icon: 'none',
          })
        }
      })()
    },
  })
}

async function submit() {
  if (!canSubmit.value) {
    uni.showToast({ title: `还有 ${requiredPositions.value.length - completedRequired.value} 项素材未完成上传`, icon: 'none' })
    return
  }
  if (hasUploadingTask.value) {
    uni.showToast({ title: '还有素材正在上传，请稍候', icon: 'none' })
    return
  }
  if (submitting.value)
    return

  submitting.value = true
  try {
    await submitVehicle(vehicleId.value)
    syncVehicleCaptureProgress(vehicleId.value)
    uni.showModal({
      title: '素材已齐全',
      content: '5 项素材已全部上传成功，可在车辆详情查看进度。',
      showCancel: false,
      success: () => {
        uni.redirectTo({ url: `/pages/vehicle/detail?id=${vehicleId.value}` })
      },
    })
  }
  catch (error) {
    uni.showToast({
      title: error instanceof Error ? error.message : '提交失败，请稍后重试',
      icon: 'none',
    })
  }
  finally {
    submitting.value = false
  }
}

onLoad((options) => {
  vehicleId.value = String(options?.vehicleId || options?.id || '')
  if (!vehicleId.value) {
    loading.value = false
    errorMessage.value = '缺少车辆任务参数'
    return
  }
  loadPositions()
  processQueue()
})
onShow(() => {
  processQueue()
  if (vehicleId.value)
    syncVehicleCaptureProgress(vehicleId.value)
})
onPullDownRefresh(loadPositions)
</script>

<template>
  <view class="min-h-screen bg-[#F5F7FA] pb-28">
    <view class="bg-white px-4 pb-4 pt-4">
      <view class="flex items-center justify-between">
        <view class="text-4.5 text-[#111827] font-600">
          素材进度
        </view>
        <view class="text-4 text-[#3B82F6] font-600">
          {{ completedRequired }}/{{ requiredPositions.length }}
        </view>
      </view>
      <view class="mt-3 h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
        <view class="h-full rounded-full bg-[#3B82F6]" :style="{ width: `${progress}%` }" />
      </view>
      <view v-if="errorMessage" class="mt-3 rounded-2 bg-[#FFFBEB] px-3 py-2 text-3 text-[#92400E]">
        {{ errorMessage }}
      </view>
    </view>

    <view class="grid grid-cols-2 gap-3 p-3">
      <view v-for="position in positions" :key="position.code" class="overflow-hidden rounded-3 bg-white">
        <view class="relative h-32 bg-[#EFF6FF]" @click="taskFor(position.code) ? preview(position) : choose(position)">
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
          <image v-else-if="position.referenceImage" class="h-full w-full opacity-70" :src="position.referenceImage" mode="aspectFill" />
          <view v-else class="h-full flex flex-col items-center justify-center text-[#3B82F6]">
            <view class="text-7">
              +
            </view>
            <view class="text-3">
              {{ isVideo(position) ? '拍摄或选择视频' : '拍照或选择照片' }}
            </view>
          </view>
          <view v-if="isVideo(position) && !taskFor(position.code)" class="absolute left-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-2.5 text-white">
            视频
          </view>
          <view v-if="taskFor(position.code)" class="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-1 text-2.5 text-white">
            {{ UPLOAD_STATUS_TEXT[taskFor(position.code)!.status] }}
          </view>
        </view>
        <view class="p-3">
          <view class="flex items-center justify-between">
            <view class="text-3.5 text-[#111827] font-600">
              {{ position.name }}
            </view>
            <view class="text-2.5 text-[#EF4444]">
              必拍
            </view>
          </view>
          <view v-if="position.description" class="line-clamp-2 mt-1 text-3 text-[#9CA3AF]">
            {{ position.description }}
          </view>
          <view v-if="taskFor(position.code)" class="mt-3 flex gap-2">
            <button class="m-0 h-8 flex-1 rounded-1.5 bg-[#EFF6FF] px-2 text-3 text-[#2563EB]" @click.stop="choose(position)">
              重拍
            </button>
            <button v-if="taskFor(position.code)?.status === 'failed'" class="m-0 h-8 flex-1 rounded-1.5 bg-[#FEF2F2] px-2 text-3 text-[#DC2626]" @click.stop="retry(taskFor(position.code)!.id)">
              重试
            </button>
            <button v-else class="m-0 h-8 flex-1 rounded-1.5 bg-[#F3F4F6] px-2 text-3 text-[#6B7280]" @click.stop="remove(position)">
              删除
            </button>
          </view>
        </view>
      </view>
    </view>

    <view v-if="loading" class="fixed inset-0 z-30 flex items-center justify-center bg-white/70 text-3.5 text-[#6B7280]">
      正在加载拍摄规范…
    </view>
    <view class="safe-area-inset-bottom fixed bottom-0 left-0 right-0 border-t border-[#E5E7EB] bg-white p-3">
      <view class="flex gap-3">
        <button class="h-12 flex-1 rounded-2 bg-[#EFF6FF] text-3.5 text-[#2563EB]" @click="uni.navigateTo({ url: `/pages/capture/upload?vehicleId=${vehicleId}` })">
          上传状态
        </button>
        <button class="h-12 flex-[2] rounded-2 text-4 text-white" :class="canSubmit && !hasUploadingTask ? 'bg-[#111827]' : 'bg-[#9CA3AF]'" :disabled="submitting" @click="submit">
          {{ submitting ? '提交中…' : hasUploadingTask ? '上传中…' : '完成拍摄' }}
        </button>
      </view>
    </view>
  </view>
</template>
