<script lang="ts" setup>
import type { AiResultTask, AiTaskStatus } from '@/types/result'
import { computed, ref } from 'vue'
import { cancelResult, getResultDetail, retryResult } from '@/api/result'
import { usePolling } from '@/composables/usePolling'
import { saveImageToAlbum } from '@/utils/saveImage'

definePage({ style: { navigationBarTitleText: '处理结果' } })

const statusText: Record<AiTaskStatus, string> = {
  queued: '排队中',
  processing: '处理中',
  success: '已完成',
  failed: '失败',
  cancelled: '已取消',
}
const typeText = {
  remove_background: '智能抠图',
  scene_generation: '场景生成',
  image_enhancement: '画质增强',
  paint_optimization: '漆面优化',
  interior_cleanup: '内饰清理',
}
const id = ref('')
const task = ref<AiResultTask>()
const loading = ref(true)
const operating = ref(false)
const errorMessage = ref('')
const processing = computed(() => task.value && ['queued', 'processing'].includes(task.value.status))
let stopPolling = () => {}

async function refreshDetail() {
  try {
    task.value = await getResultDetail(id.value)
    errorMessage.value = ''
    if (!processing.value)
      stopPolling()
  }
  catch {
    if (!task.value)
      errorMessage.value = '处理结果加载失败'
  }
  finally {
    loading.value = false
  }
}
const { start, stop } = usePolling(refreshDetail, 4000)
stopPolling = stop

async function retry() {
  if (operating.value)
    return
  operating.value = true
  try {
    task.value = await retryResult(id.value)
    uni.showToast({ title: '已重新提交', icon: 'success' })
    start()
  }
  catch {
    uni.showToast({ title: '重新提交失败', icon: 'none' })
  }
  finally {
    operating.value = false
  }
}

function cancel() {
  uni.showModal({
    title: '取消处理任务？',
    content: '取消后如需处理，需要重新提交任务。',
    confirmText: '取消任务',
    success: async (result) => {
      if (!result.confirm)
        return
      task.value = await cancelResult(id.value)
      stop()
    },
  })
}

function preview(url?: string) {
  if (url)
    uni.previewImage({ current: url, urls: [url] })
}

onLoad((options) => {
  id.value = String(options?.id || '')
  if (!id.value) {
    loading.value = false
    errorMessage.value = '缺少 AI 任务参数'
    return
  }
  refreshDetail().then(() => {
    if (processing.value)
      start()
  })
})
onShow(() => {
  if (processing.value)
    start()
})
onHide(stop)
onUnload(stop)
</script>

<template>
  <view class="min-h-screen bg-[#F5F7FA] pb-8">
    <view v-if="loading" class="h-100 bg-white" />
    <view v-else-if="errorMessage || !task" class="m-3 rounded-3 bg-white p-8 text-center">
      <view class="text-3.5 text-[#EF4444]">
        {{ errorMessage }}
      </view>
      <button class="mt-4 h-10 rounded-2 bg-[#3B82F6] px-5 text-white" @click="refreshDetail">
        重试
      </button>
    </view>
    <template v-else>
      <view v-if="task.status === 'success' && task.resultUrl" class="bg-[#111827]" @click="preview(task.resultUrl)">
        <image class="max-h-120 w-full" :src="task.resultUrl" mode="widthFix" />
      </view>
      <view v-else-if="processing" class="h-72 flex flex-col items-center justify-center bg-white">
        <view class="h-12 w-12 animate-spin border-4 border-[#DBEAFE] border-t-[#3B82F6] rounded-full" />
        <view class="mt-5 text-4 text-[#111827] font-600">
          {{ statusText[task.status] }}
        </view>
        <view class="mt-2 text-3.5 text-[#9CA3AF]">
          页面将每 4 秒自动刷新处理状态
        </view>
      </view>
      <view v-else class="m-3 rounded-3 bg-[#FEF2F2] p-5 text-center">
        <view class="text-4 text-[#B91C1C] font-600">
          {{ statusText[task.status] }}
        </view>
        <view class="mt-2 text-3.5 text-[#B91C1C]">
          {{ task.errorMessage || '任务未生成可用结果' }}
        </view>
      </view>

      <view class="m-3 rounded-3 bg-white p-4">
        <view class="flex items-center justify-between">
          <view class="text-4.5 text-[#111827] font-600">
            {{ task.vehicleName || '车辆任务' }}
          </view>
          <view class="rounded-full bg-[#F3F4F6] px-3 py-1 text-3.5">
            {{ statusText[task.status] }}
          </view>
        </view>
        <view class="mt-4 text-3.5 space-y-3">
          <view class="flex justify-between">
            <text class="text-[#9CA3AF]">处理类型</text><text>{{ typeText[task.taskType] }}</text>
          </view>
          <view class="flex justify-between">
            <text class="text-[#9CA3AF]">积分消耗</text><text>{{ task.pointsCost }} 积分</text>
          </view>
          <view class="flex justify-between">
            <text class="text-[#9CA3AF]">创建时间</text><text>{{ task.createdAt }}</text>
          </view>
          <view v-if="task.completedAt" class="flex justify-between">
            <text class="text-[#9CA3AF]">完成时间</text><text>{{ task.completedAt }}</text>
          </view>
        </view>
        <view class="grid grid-cols-2 mt-5 gap-3">
          <button class="h-11 border border-[#BFDBFE] rounded-2 bg-white text-3.5 text-[#2563EB]" @click="preview(task.sourceUrl)">
            查看原图
          </button>
          <button v-if="task.resultUrl" class="h-11 rounded-2 bg-[#3B82F6] text-3.5 text-white" @click="saveImageToAlbum(task.resultUrl).catch(() => {})">
            保存结果
          </button>
          <button v-else-if="task.status === 'failed'" class="h-11 rounded-2 bg-[#3B82F6] text-3.5 text-white" :disabled="operating" @click="retry">
            重新生成
          </button>
          <button v-else-if="processing" class="h-11 rounded-2 bg-[#F3F4F6] text-3.5 text-[#6B7280]" @click="cancel">
            取消任务
          </button>
        </view>
      </view>
    </template>
  </view>
</template>
