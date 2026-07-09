<script lang="ts" setup>
import { computed, ref } from 'vue'
import { CAPTURE_POSITION_MAP } from '@/constants/capture'
import { UPLOAD_STATUS_TEXT } from '@/constants/upload'
import { useUploadQueue } from '@/composables/useUploadQueue'
import { syncVehicleCaptureProgress } from '@/utils/vehicleProgress'

definePage({
  style: {
    navigationBarTitleText: '素材预览',
    navigationBarBackgroundColor: '#111827',
    navigationBarTextStyle: 'white',
  },
})

const vehicleId = ref('')
const taskId = ref('')
const { retry, uploadStore } = useUploadQueue()
const task = computed(() => uploadStore.queue.find(item => item.id === taskId.value && item.vehicleId === vehicleId.value))
const isVideo = computed(() => task.value?.mediaType === 'video')
const positionName = computed(() => CAPTURE_POSITION_MAP[task.value?.captureCode || '']?.name || task.value?.captureCode || '')

function previewImage() {
  const url = task.value?.localPath || task.value?.remoteUrl
  if (url && !isVideo.value)
    uni.previewImage({ current: url, urls: [url] })
}

function remove() {
  if (!task.value)
    return
  const label = isVideo.value ? '视频' : '照片'
  uni.showModal({
    title: `删除这个${label}？`,
    content: '删除后需要返回拍摄页重新拍摄。',
    confirmText: '删除',
    confirmColor: '#EF4444',
    success: (result) => {
      if (result.confirm && task.value) {
        uploadStore.removeTask(task.value.id)
        syncVehicleCaptureProgress(vehicleId.value)
        uni.navigateBack()
      }
    },
  })
}

onLoad((options) => {
  vehicleId.value = String(options?.vehicleId || '')
  taskId.value = String(options?.taskId || '')
})
</script>

<template>
  <view class="min-h-screen flex flex-col bg-[#111827]">
    <view v-if="task" class="min-h-0 flex flex-1 flex-col items-center justify-center" @click="previewImage">
      <video
        v-if="isVideo"
        class="max-h-full w-full"
        :src="task.localPath || task.remoteUrl"
        controls
        object-fit="contain"
      />
      <image v-else class="max-h-full w-full" :src="task.localPath || task.remoteUrl" mode="widthFix" />
      <view class="mt-3 text-3.5 text-white/70">
        {{ positionName }}
      </view>
    </view>
    <view v-else class="flex flex-1 items-center justify-center text-3.5 text-white/70">
      素材记录不存在或已被删除
    </view>
    <view v-if="task" class="safe-area-inset-bottom bg-black/40 p-4">
      <view class="mb-3 flex items-center justify-between text-3.5 text-white">
        <text>{{ UPLOAD_STATUS_TEXT[task.status] }}</text>
        <text>{{ task.progress }}%</text>
      </view>
      <view class="h-1.5 overflow-hidden rounded-full bg-white/20">
        <view class="h-full rounded-full bg-[#3B82F6]" :style="{ width: `${task.progress}%` }" />
      </view>
      <view v-if="task.errorMessage" class="mt-2 text-3 text-[#FCA5A5]">
        {{ task.errorMessage }}
      </view>
      <view class="mt-4 flex gap-3">
        <button v-if="task.status === 'failed'" class="h-10 flex-1 rounded-2 bg-[#3B82F6] text-3.5 text-white" @click="retry(task.id)">
          重新上传
        </button>
        <button class="h-10 flex-1 rounded-2 bg-white/10 text-3.5 text-white" @click="remove">
          删除素材
        </button>
      </view>
    </view>
  </view>
</template>
