<script lang="ts" setup>
import type { LotMaterialStatus, LotTask } from '@/types/lot'
import { computed, ref } from 'vue'
import { getLotList } from '@/api/lot'
import { DEFAULT_LOT_CAPTURE_POSITIONS, LOT_MATERIAL_STATUS_TEXT } from '@/constants/capture'

definePage({
  style: {
    navigationBarTitleText: '车场任务',
    enablePullDownRefresh: true,
  },
})

const PAGE_SIZE = 10
const loading = ref(false)
const loadingMore = ref(false)
const errorMessage = ref('')
const page = ref(1)
const total = ref(0)
const keyword = ref('')
const materialStatus = ref<LotMaterialStatus | 'all'>('all')
const lots = ref<LotTask[]>([])

const filteredLots = computed(() => {
  if (materialStatus.value === 'all')
    return lots.value
  return lots.value.filter(item => item.materialStatus === materialStatus.value)
})
const hasMore = computed(() => lots.value.length < total.value)

const FILTER_OPTIONS = [
  { label: '全部', value: 'all' as const },
  { label: LOT_MATERIAL_STATUS_TEXT.incomplete, value: 'incomplete' as const },
  { label: LOT_MATERIAL_STATUS_TEXT.complete, value: 'complete' as const },
]

async function loadLots(reset = false) {
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
    const result = await getLotList({
      page: page.value,
      pageSize: PAGE_SIZE,
      keyword: keyword.value.trim() || undefined,
    })
    total.value = result.total
    if (reset)
      lots.value = result.list
    else
      lots.value = [...lots.value, ...result.list]
    if (lots.value.length < result.total)
      page.value += 1
  }
  catch {
    errorMessage.value = '车场任务加载失败，请检查网络后重试'
  }
  finally {
    loading.value = false
    loadingMore.value = false
    uni.stopPullDownRefresh()
  }
}

function selectStatus(value: LotMaterialStatus | 'all') {
  materialStatus.value = value
}

function search() {
  loadLots(true)
}

function goCapture(lot: LotTask) {
  uni.navigateTo({ url: `/pages/lot/capture?lotId=${lot.id}` })
}

function goCreateLot() {
  uni.navigateTo({ url: '/pages/lot/create' })
}

function actionText(lot: LotTask) {
  if (lot.materialStatus === 'complete')
    return '查看素材'
  if (lot.photoCount > 0)
    return '继续补充'
  return '补素材'
}

onLoad(() => loadLots(true))
onShow(() => {
  if (page.value > 1)
    loadLots(true)
})
onPullDownRefresh(() => loadLots(true))
onReachBottom(() => loadLots())
</script>

<template>
  <view class="min-h-screen bg-[#F5F7FA] pb-24">
    <view class="sticky top-0 z-10 bg-white px-3 pb-3 pt-3">
      <view class="flex items-center gap-2">
        <input
          v-model="keyword"
          class="h-10 min-w-0 flex-1 rounded-2 bg-[#F3F4F6] px-3 text-3.5"
          confirm-type="search"
          placeholder="搜索车场名称或地址"
          @confirm="search"
        >
        <button class="m-0 h-10 rounded-2 bg-[#3B82F6] px-4 text-3.5 text-white" @click="search">
          搜索
        </button>
      </view>
      <scroll-view class="mt-3 whitespace-nowrap" scroll-x>
        <view
          v-for="item in FILTER_OPTIONS"
          :key="item.value"
          class="mr-2 inline-flex rounded-full px-3 py-1.5 text-3.5"
          :class="materialStatus === item.value ? 'bg-[#3B82F6] text-white' : 'bg-[#F3F4F6] text-[#6B7280]'"
          @click="selectStatus(item.value)"
        >
          {{ item.label }}
        </view>
      </scroll-view>
    </view>

    <view class="px-3 py-3">
      <view v-if="loading" class="space-y-3">
        <view v-for="item in 3" :key="item" class="h-28 rounded-3 bg-white" />
      </view>

      <view v-else-if="errorMessage && lots.length === 0" class="rounded-3 bg-white p-6 text-center">
        <view class="text-3.5 text-[#EF4444]">
          {{ errorMessage }}
        </view>
        <button class="mt-4 h-10 rounded-2 bg-[#3B82F6] px-5 text-3.5 text-white" @click="loadLots(true)">
          重新加载
        </button>
      </view>

      <view v-else-if="filteredLots.length === 0" class="rounded-3 bg-white p-8 text-center">
        <view class="text-4 text-[#111827] font-600">
          暂无车场任务
        </view>
        <view class="mt-2 text-3.5 text-[#9CA3AF]">
          点击“新增车场并上传素材”即可在小程序完成创建和素材上传
        </view>
        <button class="mt-5 h-11 rounded-2 bg-[#3B82F6] px-6 text-4 text-white" @click="goCreateLot">
          新增车场并上传素材
        </button>
      </view>

      <view v-else class="space-y-3">
        <view v-for="lot in filteredLots" :key="lot.id" class="rounded-3 bg-white p-3" @click="goCapture(lot)">
          <view class="flex gap-3">
            <image
              v-if="lot.coverUrl"
              class="h-21 w-28 shrink-0 rounded-2 bg-[#F3F4F6]"
              :src="lot.coverUrl"
              mode="aspectFill"
              lazy-load
            />
            <view v-else class="h-21 w-28 flex shrink-0 items-center justify-center rounded-2 bg-[#EFF6FF] text-3 text-[#3B82F6]">
              车场
            </view>
            <view class="min-w-0 flex-1">
              <view class="flex items-start justify-between gap-2">
                <view class="line-clamp-2 text-4 text-[#111827] font-600">
                  {{ lot.name }}
                </view>
                <view
                  class="shrink-0 rounded-full px-2 py-1 text-3"
                  :class="lot.materialStatus === 'complete' ? 'bg-[#DCFCE7] text-[#16A34A]' : 'bg-[#EFF6FF] text-[#2563EB]'"
                >
                  {{ LOT_MATERIAL_STATUS_TEXT[lot.materialStatus] }}
                </view>
              </view>
              <view class="mt-2 text-3 text-[#6B7280]">
                {{ lot.address || '暂无地址' }}
              </view>
              <view class="mt-2 flex items-center gap-2">
                <view class="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E5E7EB]">
                  <view
                    class="h-full rounded-full bg-[#3B82F6]"
                    :style="{ width: `${Math.min(100, lot.requiredPhotoCount ? lot.photoCount / lot.requiredPhotoCount * 100 : 0)}%` }"
                  />
                </view>
                <text class="text-3 text-[#6B7280]">素材 {{ lot.photoCount }}/{{ lot.requiredPhotoCount }}</text>
              </view>
            </view>
          </view>
          <view class="mt-3 flex items-center justify-between border-t border-[#F3F4F6] pt-3">
            <text class="text-3 text-[#9CA3AF]">{{ lot.updatedAt }}</text>
            <button class="m-0 h-8 rounded-1.5 bg-[#EFF6FF] px-3 text-3 text-[#2563EB]" @click.stop="goCapture(lot)">
              {{ actionText(lot) }}
            </button>
          </view>
        </view>
        <view class="py-3 text-center text-3 text-[#9CA3AF]">
          {{ loadingMore ? '正在加载…' : hasMore ? '上拉加载更多' : '已经到底了' }}
        </view>
      </view>
    </view>
  </view>
</template>
