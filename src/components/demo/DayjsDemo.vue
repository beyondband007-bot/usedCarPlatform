<template>
  <div class="p-6">
    <h2 class="text-xl font-bold mb-4">dayjs 时间处理演示</h2>
    
    <!-- 基础格式化 -->
    <n-card title="基础格式化" class="mb-4">
      <n-space vertical>
        <div class="flex justify-between py-2 border-b border-gray-100">
          <span class="text-gray-500">完整格式</span>
          <span class="font-mono">{{ formatDate(now) }}</span>
        </div>
        <div class="flex justify-between py-2 border-b border-gray-100">
          <span class="text-gray-500">仅日期</span>
          <span class="font-mono">{{ formatDateOnly(now) }}</span>
        </div>
        <div class="flex justify-between py-2 border-b border-gray-100">
          <span class="text-gray-500">仅时间</span>
          <span class="font-mono">{{ formatTimeOnly(now) }}</span>
        </div>
        <div class="flex justify-between py-2 border-b border-gray-100">
          <span class="text-gray-500">中文格式</span>
          <span class="font-mono">{{ formatDate(now, TIME_FORMATS.chinese) }}</span>
        </div>
        <div class="flex justify-between py-2">
          <span class="text-gray-500">时分</span>
          <span class="font-mono">{{ formatDate(now, TIME_FORMATS.hourMinute) }}</span>
        </div>
      </n-space>
    </n-card>

    <!-- 相对时间 -->
    <n-card title="相对时间" class="mb-4">
      <n-space vertical>
        <div class="flex justify-between py-2 border-b border-gray-100">
          <span class="text-gray-500">刚刚</span>
          <span>{{ formatRelativeTime(dayjs()) }}</span>
        </div>
        <div class="flex justify-between py-2 border-b border-gray-100">
          <span class="text-gray-500">1分钟前</span>
          <span>{{ formatRelativeTime(dayjs().subtract(1, 'minute')) }}</span>
        </div>
        <div class="flex justify-between py-2 border-b border-gray-100">
          <span class="text-gray-500">1小时前</span>
          <span>{{ formatRelativeTime(dayjs().subtract(1, 'hour')) }}</span>
        </div>
        <div class="flex justify-between py-2 border-b border-gray-100">
          <span class="text-gray-500">1天前</span>
          <span>{{ formatRelativeTime(dayjs().subtract(1, 'day')) }}</span>
        </div>
        <div class="flex justify-between py-2 border-b border-gray-100">
          <span class="text-gray-500">1周前</span>
          <span>{{ formatRelativeTime(dayjs().subtract(1, 'week')) }}</span>
        </div>
        <div class="flex justify-between py-2">
          <span class="text-gray-500">1月前</span>
          <span>{{ formatRelativeTime(dayjs().subtract(1, 'month')) }}</span>
        </div>
      </n-space>
    </n-card>

    <!-- 时间范围 -->
    <n-card title="常用时间范围" class="mb-4">
      <n-space vertical>
        <n-radio-group v-model:value="selectedRange" @update:value="updateRange">
          <n-radio-button value="today">今天</n-radio-button>
          <n-radio-button value="yesterday">昨天</n-radio-button>
          <n-radio-button value="week">本周</n-radio-button>
          <n-radio-button value="month">本月</n-radio-button>
          <n-radio-button value="quarter">本季度</n-radio-button>
          <n-radio-button value="year">本年</n-radio-button>
        </n-radio-group>
        
        <div class="mt-4 p-4 bg-gray-50 rounded-lg">
          <div class="flex justify-between py-2">
            <span class="text-gray-500">开始时间</span>
            <span class="font-mono">{{ currentRange.start }}</span>
          </div>
          <div class="flex justify-between py-2">
            <span class="text-gray-500">结束时间</span>
            <span class="font-mono">{{ currentRange.end }}</span>
          </div>
        </div>
      </n-space>
    </n-card>

    <!-- 倒计时 -->
    <n-card title="倒计时示例" class="mb-4">
      <n-space vertical>
        <n-date-picker 
          v-model:value="targetTime" 
          type="datetime"
          placeholder="选择目标时间"
        />
        
        <div v-if="targetTime" class="mt-4">
          <div class="flex justify-center gap-4">
            <div class="text-center">
              <div class="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
                {{ remaining.days }}
              </div>
              <div class="text-sm text-gray-500 mt-2">天</div>
            </div>
            <div class="text-center">
              <div class="w-16 h-16 bg-green-500 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
                {{ String(remaining.hours).padStart(2, '0') }}
              </div>
              <div class="text-sm text-gray-500 mt-2">时</div>
            </div>
            <div class="text-center">
              <div class="w-16 h-16 bg-orange-500 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
                {{ String(remaining.minutes).padStart(2, '0') }}
              </div>
              <div class="text-sm text-gray-500 mt-2">分</div>
            </div>
            <div class="text-center">
              <div class="w-16 h-16 bg-red-500 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
                {{ String(remaining.seconds).padStart(2, '0') }}
              </div>
              <div class="text-sm text-gray-500 mt-2">秒</div>
            </div>
          </div>
        </div>
      </n-space>
    </n-card>

    <!-- 时长格式化 -->
    <n-card title="时长格式化" class="mb-4">
      <n-space vertical>
        <n-slider v-model:value="durationSeconds" :max="86400" :step="60" />
        <div class="flex justify-between items-center">
          <span class="text-gray-500">原始秒数: {{ durationSeconds }} 秒</span>
          <span class="text-xl font-mono font-bold">{{ formatDuration(durationSeconds) }}</span>
        </div>
      </n-space>
    </n-card>

    <!-- 日期计算 -->
    <n-card title="日期计算">
      <n-space vertical>
        <div class="flex gap-4 items-center">
          <n-date-picker v-model:value="date1" type="date" />
          <span>与</span>
          <n-date-picker v-model:value="date2" type="date" />
          <span>相差</span>
          <n-tag type="info" size="large">
            {{ dateDiff.days }} 天
          </n-tag>
        </div>
        <div v-if="date1 && date2" class="p-4 bg-gray-50 rounded-lg mt-4">
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center">
              <div class="text-2xl font-bold">{{ dateDiff.days }}</div>
              <div class="text-gray-500">天</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold">{{ dateDiff.hours }}</div>
              <div class="text-gray-500">小时</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold">{{ dateDiff.minutes }}</div>
              <div class="text-gray-500">分钟</div>
            </div>
          </div>
        </div>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  dayjs,
  formatDate,
  formatDateOnly,
  formatTimeOnly,
  formatRelativeTime,
  getDiff,
  getRemainingTime,
  formatDuration,
  getTimeRange,
  TIME_FORMATS,
} from '@/utils/dayjs'

// 当前时间
const now = ref(dayjs())

// 时间范围
const selectedRange = ref('today')
const currentRange = ref(getTimeRange('today'))

const updateRange = (val: string) => {
  currentRange.value = getTimeRange(val as any)
}

// 倒计时
const targetTime = ref<number | null>(null)
const remaining = ref({ days: 0, hours: 0, minutes: 0, seconds: 0 })

// 更新倒计时
let timer: ReturnType<typeof setInterval> | null = null

watch(targetTime, (val) => {
  if (timer) clearInterval(timer)
  
  if (val) {
    const updateRemaining = () => {
      remaining.value = getRemainingTime(val)
    }
    updateRemaining()
    timer = setInterval(updateRemaining, 1000)
  }
})

// 时长格式化
const durationSeconds = ref(3661)

// 日期计算
const date1 = ref<number | null>(null)
const date2 = ref<number | null>(null)

const dateDiff = computed(() => {
  if (!date1.value || !date2.value) {
    return { days: 0, hours: 0, minutes: 0 }
  }
  
  const diffMs = Math.abs(getDiff(date1.value, date2.value))
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  
  return { days, hours, minutes }
})
</script>