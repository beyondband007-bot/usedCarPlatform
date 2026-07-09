<script lang="ts" setup>
import { computed, ref } from 'vue'
import { CAPTURE_POSITION_MAP } from '@/constants/capture'
import { UPLOAD_STATUS_TEXT } from '@/constants/upload'
import { useUploadQueue } from '@/composables/useUploadQueue'
import { syncVehicleCaptureProgress } from '@/utils/vehicleProgress'

definePage({
  style: {
    navigationBarTitleText: '上传状态',
  },
})

const vehicleId = ref('')
const { processQueue, retry, retryAll, uploadStore } = useUploadQueue()
const tasks = computed(() => uploadStore.queue
  .filter(task => task.vehicleId === vehicleId.value && task.status !== 'cancelled')
  .sort((a, b) => a.createdAt - b.createdAt))
const successCount = computed(() => tasks.value.filter(task => task.status === 'success').length)
const failedCount = computed(() => tasks.value.filter(task => task.status === 'failed').length)
const activeCount = computed(() => tasks.value.filter(task => ['waiting', 'uploading'].includes(task.status)).length)
const totalProgress = computed(() => tasks.value.length
  ? Math.round(tasks.value.reduce((sum, task) => sum + task.progress, 0) / tasks.value.length)
  : 0)

function positionName(code: string) {
  return CAPTURE_POSITION_MAP[code]?.name || code
}

function remove(id: string) {
  uni.showModal({
    title: '移除上传记录？',
    content: '移除后可返回拍摄页重新选择素材。',
    confirmText: '移除',
    success: (result) => {
      if (result.confirm) {
        uploadStore.removeTask(id)
        syncVehicleCaptureProgress(vehicleId.value)
      }
    },
  })
}

onLoad((options) => {
  vehicleId.value = String(options?.vehicleId || '')
  processQueue()
  if (vehicleId.value)
    syncVehicleCaptureProgress(vehicleId.value)
})
onShow(() => {
  processQueue()
  if (vehicleId.value)
    syncVehicleCaptureProgress(vehicleId.value)
})
</script>

<template>
  <view class="min-h-screen bg-[#F5F7FA] px-3 pb-8 pt-3">
    <view class="rounded-3 bg-white p-4">
      <view class="flex items-end justify-between">
        <view>
          <view class="text-4.5 text-[#111827] font-600">
            整体上传进度
          </view>
          <view class="mt-1 text-3 text-[#6B7280]">
            成功 {{ successCount }} · 上传中 {{ activeCount }} · 失败 {{ failedCount }}
          </view>
        </view>
        <view class="text-7 text-[#3B82F6] font-700">
          {{ totalProgress }}%
        </view>
      </view>
      <view class="mt-4 h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
        <view class="h-full rounded-full bg-[#3B82F6]" :style="{ width: `${totalProgress}%` }" />
      </view>
      <button v-if="failedCount" class="mt-4 h-10 w-full rounded-2 bg-[#FEF2F2] text-3.5 text-[#DC2626]" @click="retryAll(vehicleId)">
        重试全部失败任务
      </button>
    </view>

    <view v-if="tasks.length === 0" class="mt-3 rounded-3 bg-white p-8 text-center">
      <view class="text-4 text-[#111827] font-600">
        暂无上传任务
      </view>
      <view class="mt-2 text-3.5 text-[#9CA3AF]">
        返回拍摄页选择照片或视频后会自动开始上传
      </view>
      <button class="mt-5 h-10 rounded-2 bg-[#3B82F6] px-5 text-3.5 text-white" @click="uni.navigateBack()">
        返回拍摄
      </button>
    </view>

    <view v-else class="mt-3 space-y-3">
      <view v-for="task in tasks" :key="task.id" class="rounded-3 bg-white p-3">
        <view class="flex gap-3">
          <view class="relative h-18 w-24 shrink-0 overflow-hidden rounded-2 bg-[#F3F4F6]">
            <video
              v-if="task.mediaType === 'video'"
              class="h-full w-full"
              :src="task.localPath || task.remoteUrl"
              :controls="false"
              :show-center-play-btn="true"
              object-fit="cover"
            />
            <image
              v-else
              class="h-full w-full"
              :src="task.localPath || task.remoteUrl"
              mode="aspectFill"
            />
          </view>
          <view class="min-w-0 flex-1">
            <view class="flex items-center justify-between gap-2">
              <view class="truncate text-3.5 text-[#111827] font-600">
                {{ positionName(task.captureCode) }}
              </view>
              <view class="shrink-0 text-3" :class="task.status === 'failed' ? 'text-[#EF4444]' : task.status === 'success' ? 'text-[#16A34A]' : 'text-[#3B82F6]'">
                {{ UPLOAD_STATUS_TEXT[task.status] }}
              </view>
            </view>
            <view class="mt-1 text-3 text-[#9CA3AF]">
              {{ task.mediaType === 'video' ? '视频' : '图片' }}
            </view>
            <view class="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E5E7EB]">
              <view class="h-full rounded-full" :class="task.status === 'failed' ? 'bg-[#EF4444]' : 'bg-[#3B82F6]'" :style="{ width: `${task.progress}%` }" />
            </view>
            <view class="mt-2 flex items-center justify-between">
              <text class="text-3 text-[#9CA3AF]">{{ task.progress }}%</text>
              <view class="flex gap-3">
                <text v-if="task.status === 'failed'" class="text-3 text-[#2563EB]" @click="retry(task.id)">重试</text>
                <text v-if="task.status !== 'uploading'" class="text-3 text-[#EF4444]" @click="remove(task.id)">移除</text>
              </view>
            </view>
          </view>
        </view>
        <view v-if="task.errorMessage" class="mt-2 rounded-1.5 bg-[#FEF2F2] px-2 py-1.5 text-3 text-[#B91C1C]">
          {{ task.errorMessage }}
        </view>
      </view>
    </view>
  </view>
</template>
