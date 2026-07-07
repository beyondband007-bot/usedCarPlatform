<script lang="ts" setup>
import type { AiResultTask, AiTaskStatus } from '@/types/result'
import { computed, ref } from 'vue'
import { getResultList } from '@/api/result'

definePage({
  style: {
    navigationBarTitleText: 'AI 处理记录',
    enablePullDownRefresh: true,
  },
})

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
const filters: { label: string, value: AiTaskStatus | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '处理中', value: 'processing' },
  { label: '已完成', value: 'success' },
  { label: '失败', value: 'failed' },
]
const PAGE_SIZE = 10
const vehicleId = ref('')
const status = ref<AiTaskStatus | 'all'>('all')
const list = ref<AiResultTask[]>([])
const page = ref(1)
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const errorMessage = ref('')
const hasMore = computed(() => list.value.length < total.value)

async function load(reset = false) {
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
  try {
    const result = await getResultList({
      page: page.value,
      pageSize: PAGE_SIZE,
      vehicleId: vehicleId.value || undefined,
      status: status.value === 'all' ? undefined : status.value,
    })
    list.value = reset ? result.list : [...list.value, ...result.list]
    total.value = result.total
    errorMessage.value = ''
    if (list.value.length < result.total)
      page.value += 1
  }
  catch {
    errorMessage.value = 'AI 处理记录加载失败'
  }
  finally {
    loading.value = false
    loadingMore.value = false
    uni.stopPullDownRefresh()
  }
}

function selectStatus(value: AiTaskStatus | 'all') {
  status.value = value
  load(true)
}

onLoad((options) => {
  vehicleId.value = String(options?.vehicleId || '')
  load(true)
})
onPullDownRefresh(() => load(true))
onReachBottom(() => load())
</script>

<template>
  <view class="min-h-screen bg-[#F5F7FA] pb-8">
    <scroll-view class="sticky top-0 z-10 whitespace-nowrap bg-white p-3" scroll-x>
      <view v-for="item in filters" :key="item.value" class="mr-2 inline-flex rounded-full px-4 py-2 text-3.5" :class="status === item.value ? 'bg-[#3B82F6] text-white' : 'bg-[#F3F4F6] text-[#6B7280]'" @click="selectStatus(item.value)">
        {{ item.label }}
      </view>
    </scroll-view>
    <view class="p-3">
      <view v-if="loading" class="space-y-3">
        <view v-for="item in 3" :key="item" class="h-32 rounded-3 bg-white" />
      </view>
      <view v-else-if="errorMessage && !list.length" class="rounded-3 bg-white p-8 text-center">
        <view class="text-3.5 text-[#EF4444]">
          {{ errorMessage }}
        </view>
        <button class="mt-4 h-10 rounded-2 bg-[#3B82F6] px-5 text-white" @click="load(true)">
          重新加载
        </button>
      </view>
      <view v-else-if="!list.length" class="rounded-3 bg-white p-8 text-center">
        <view class="text-4 text-[#111827] font-600">
          暂无 AI 处理记录
        </view>
        <view class="mt-2 text-3.5 text-[#9CA3AF]">
          车辆任务提交后可在这里查看处理进度
        </view>
      </view>
      <view v-else class="space-y-3">
        <view v-for="task in list" :key="task.id" class="rounded-3 bg-white p-3" @click="uni.navigateTo({ url: `/pages/result/detail?id=${task.id}` })">
          <view class="flex gap-3">
            <image class="h-20 w-27 shrink-0 rounded-2 bg-[#F3F4F6]" :src="task.resultUrl || task.sourceUrl" mode="aspectFill" lazy-load />
            <view class="min-w-0 flex-1">
              <view class="flex items-start justify-between gap-2">
                <view class="truncate text-4 text-[#111827] font-600">
                  {{ task.vehicleName || '车辆任务' }}
                </view>
                <view class="shrink-0 rounded-full bg-[#F3F4F6] px-2 py-1 text-3" :class="task.status === 'failed' ? 'text-[#EF4444]' : task.status === 'success' ? 'text-[#16A34A]' : 'text-[#3B82F6]'">
                  {{ statusText[task.status] }}
                </view>
              </view>
              <view class="mt-2 text-3.5 text-[#6B7280]">
                {{ typeText[task.taskType] }}
              </view>
              <view class="mt-2 flex justify-between text-3 text-[#9CA3AF]">
                <text>消耗 {{ task.pointsCost }} 积分</text><text>{{ task.createdAt }}</text>
              </view>
            </view>
          </view>
          <view v-if="task.status === 'failed'" class="mt-2 rounded-2 bg-[#FEF2F2] px-3 py-2 text-3 text-[#B91C1C]">
            {{ task.errorMessage || '处理失败，请进入详情重试' }}
          </view>
        </view>
        <view class="py-3 text-center text-3 text-[#9CA3AF]">
          {{ loadingMore ? '正在加载…' : hasMore ? '上拉加载更多' : '已经到底了' }}
        </view>
      </view>
    </view>
  </view>
</template>
