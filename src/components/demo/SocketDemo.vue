<template>
  <div class="p-6">
    <h2 class="text-xl font-bold mb-4">Socket.IO 实时通信演示</h2>
    
    <!-- 连接控制 -->
    <n-card title="连接控制" class="mb-4">
      <n-space align="center">
        <div class="flex items-center gap-2">
          <div 
            class="w-3 h-3 rounded-full"
            :class="{
              'bg-green-500': connectionState === 'connected',
              'bg-red-500': connectionState === 'disconnected',
              'bg-yellow-500': connectionState === 'connecting',
              'bg-blue-500': connectionState === 'reconnecting',
            }"
          />
          <span>{{ connectionStateText }}</span>
        </div>
        
        <n-button 
          v-if="!isConnected" 
          type="primary" 
          @click="connect"
          :loading="connectionState === 'connecting'"
        >
          连接
        </n-button>
        <n-button 
          v-else 
          type="error" 
          @click="disconnect"
        >
          断开
        </n-button>
      </n-space>
    </n-card>

    <!-- 实时通知 -->
    <n-card title="实时通知" class="mb-4">
      <n-space vertical>
        <div class="flex gap-2">
          <n-button @click="simulateNotification('info')">模拟信息通知</n-button>
          <n-button type="success" @click="simulateNotification('success')">模拟成功通知</n-button>
          <n-button type="warning" @click="simulateNotification('warning')">模拟警告通知</n-button>
          <n-button type="error" @click="simulateNotification('error')">模拟错误通知</n-button>
        </div>
        
        <div class="max-h-60 overflow-y-auto space-y-2">
          <motion.div
            v-for="(notification, index) in notifications" 
            :key="notification.id"
            :initial="{ opacity: 0, x: 50 }"
            :animate="{ opacity: 1, x: 0 }"
            :class="[
              'p-3 rounded-lg border-l-4',
              {
                'bg-blue-50 border-blue-500': notification.type === 'info',
                'bg-green-50 border-green-500': notification.type === 'success',
                'bg-yellow-50 border-yellow-500': notification.type === 'warning',
                'bg-red-50 border-red-500': notification.type === 'error',
              }
            ]"
          >
            <div class="flex justify-between items-start">
              <div>
                <div class="font-medium">{{ notification.title }}</div>
                <div class="text-sm text-gray-600">{{ notification.message }}</div>
              </div>
              <n-button text size="tiny" @click="removeNotification(index)">
                <Icon icon="mdi:close" />
              </n-button>
            </div>
            <div class="text-xs text-gray-400 mt-1">
              {{ formatTime(notification.timestamp) }}
            </div>
          </motion.div>
          
          <div v-if="notifications.length === 0" class="text-center text-gray-400 py-8">
            暂无通知
          </div>
        </div>
      </n-space>
    </n-card>

    <!-- 任务进度模拟 -->
    <n-card title="任务进度模拟（图片生成）" class="mb-4">
      <n-space vertical>
        <div class="flex gap-2">
          <n-button 
            type="primary" 
            @click="startImageGeneration"
            :disabled="imageTask?.status === 'processing'"
            :loading="imageTask?.status === 'processing'"
          >
            开始生成图片
          </n-button>
          <n-button 
            v-if="imageTask?.status === 'processing'"
            @click="cancelImageGeneration"
          >
            取消任务
          </n-button>
        </div>
        
        <div v-if="imageTask" class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-gray-500">任务状态</span>
            <n-tag :type="getTaskStatusType(imageTask.status)">
              {{ getTaskStatusText(imageTask.status) }}
            </n-tag>
          </div>
          
          <div v-if="imageTask.status === 'processing'">
            <div class="flex justify-between text-sm mb-2">
              <span>{{ imageTask.currentStep }}/{{ imageTask.totalSteps }} - {{ imageTask.stepName }}</span>
              <span>{{ Math.round(imageTask.progress) }}%</span>
            </div>
            <n-progress 
              :percentage="Math.round(imageTask.progress)"
              :indicator-placement="'inside'"
              :processing="imageTask.status === 'processing'"
              :status="imageTask.status === 'failed' ? 'error' : undefined"
            />
            <div v-if="imageTask.estimatedTimeRemaining" class="text-sm text-gray-500 mt-2">
              预计剩余时间: {{ Math.ceil(imageTask.estimatedTimeRemaining / 1000) }} 秒
            </div>
          </div>
          
          <div v-if="imageTask.status === 'completed'" class="grid grid-cols-4 gap-4">
            <div 
              v-for="i in 4" 
              :key="i"
              class="aspect-square bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center"
            >
              <Icon icon="mdi:image" class="text-4xl text-gray-400" />
            </div>
          </div>
          
          <div v-if="imageTask.status === 'failed'" class="p-4 bg-red-50 rounded-lg text-red-600">
            <Icon icon="mdi:alert-circle" class="inline mr-2" />
            任务失败: {{ imageTask.error }}
          </div>
        </div>
      </n-space>
    </n-card>

    <!-- 批量处理模拟 -->
    <n-card title="批量处理模拟" class="mb-4">
      <n-space vertical>
        <div class="flex gap-2">
          <n-button 
            type="primary" 
            @click="startBatchProcessing"
            :disabled="batchTask?.status === 'processing'"
            :loading="batchTask?.status === 'processing'"
          >
            开始批量处理（10张图片）
          </n-button>
        </div>
        
        <div v-if="batchTask" class="space-y-4">
          <div class="grid grid-cols-3 gap-4 text-center">
            <div class="p-3 bg-gray-50 rounded">
              <div class="text-2xl font-bold">{{ batchTask.total }}</div>
              <div class="text-sm text-gray-500">总数</div>
            </div>
            <div class="p-3 bg-green-50 rounded">
              <div class="text-2xl font-bold text-green-600">{{ batchTask.completed }}</div>
              <div class="text-sm text-green-500">已完成</div>
            </div>
            <div class="p-3 bg-red-50 rounded">
              <div class="text-2xl font-bold text-red-600">{{ batchTask.failed }}</div>
              <div class="text-sm text-red-500">失败</div>
            </div>
          </div>
          
          <n-progress 
            :percentage="Math.round(batchTask.progress)"
            :indicator-placement="'inside'"
            :processing="batchTask.status === 'processing'"
          />
          
          <div v-if="batchTask.currentItem" class="text-sm text-gray-500">
            正在处理: 第 {{ batchTask.currentItem.index }} 张 - {{ batchTask.currentItem.status }}
          </div>
        </div>
      </n-space>
    </n-card>

    <!-- 积分变动通知 -->
    <n-card title="积分变动模拟">
      <n-space vertical>
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <div class="text-gray-500">总积分</div>
            <div class="text-2xl font-bold">{{ credits.total }}</div>
          </div>
          <div>
            <div class="text-gray-500">已使用</div>
            <div class="text-2xl font-bold text-orange-600">{{ credits.used }}</div>
          </div>
          <div>
            <div class="text-gray-500">剩余</div>
            <div 
              class="text-2xl font-bold"
              :class="credits.remaining < 100 ? 'text-red-600' : 'text-green-600'"
            >
              {{ credits.remaining }}
            </div>
          </div>
        </div>
        
        <div class="flex gap-2">
          <n-button @click="simulateCreditChange(-20)">消费 20 积分</n-button>
          <n-button type="success" @click="simulateCreditChange(100)">充值 100 积分</n-button>
          <n-button type="error" @click="simulateCreditChange(-500)">大额消费（触发低积分警告）</n-button>
        </div>
        
        <div v-if="creditHistory.length > 0" class="space-y-2">
          <div 
            v-for="(record, index) in creditHistory" 
            :key="index"
            class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
          >
            <span>{{ record.message }}</span>
            <span :class="record.change > 0 ? 'text-green-600' : 'text-red-600'">
              {{ record.change > 0 ? '+' : '' }}{{ record.change }}
            </span>
          </div>
        </div>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { motion } from 'motion-v'
import { formatDate } from '@/utils/dayjs'
import { socketService } from '@/services/socket'

// 连接状态
const isConnected = computed(() => socketService.isConnected)
const connectionState = computed(() => socketService.connectionState)
const connectionStateText = computed(() => {
  const stateMap = {
    connected: '已连接',
    disconnected: '未连接',
    connecting: '连接中...',
    reconnecting: '重连中...',
  }
  return stateMap[connectionState.value]
})

// 通知列表
const notifications = ref<Array<{
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: string
}>>([])

// 图片生成任务
const imageTask = ref<{
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  currentStep: number
  totalSteps: number
  stepName: string
  estimatedTimeRemaining?: number
  error?: string
} | null>(null)

// 批量任务
const batchTask = ref<{
  id: string
  status: string
  total: number
  completed: number
  failed: number
  progress: number
  currentItem?: {
    index: number
    status: string
  }
} | null>(null)

// 积分
const credits = ref({
  total: 1000,
  used: 150,
  remaining: 850,
})
const creditHistory = ref<Array<{ change: number; message: string; time: string }>>([])

// 取消订阅函数列表
const unsubscribeList: Array<() => void> = []

// 连接
const connect = () => {
  socketService.connect('demo-user-123')
  setupListeners()
}

// 断开
const disconnect = () => {
  socketService.disconnect()
  unsubscribeList.forEach(unsub => unsub())
  unsubscribeList.length = 0
}

// 设置监听器
const setupListeners = () => {
  // 监听通知
  const unsubNotification = socketService.on('notification', (data) => {
    notifications.value.unshift({
      ...data,
      timestamp: new Date().toISOString(),
    })
    // 限制数量
    if (notifications.value.length > 10) {
      notifications.value.pop()
    }
  })
  unsubscribeList.push(unsubNotification)
  
  // 监听积分变动
  const unsubCredits = socketService.on('credits:updated', (data) => {
    credits.value = data
  })
  unsubscribeList.push(unsubCredits)
  
  // 监听低积分警告
  const unsubCreditsLow = socketService.on('credits:low', (data) => {
    notifications.value.unshift({
      id: Date.now().toString(),
      type: 'warning',
      title: '积分不足',
      message: `您的积分仅剩 ${data.remaining}，请及时充值`,
      timestamp: new Date().toISOString(),
    })
  })
  unsubscribeList.push(unsubCreditsLow)
  
  // 监听图片生成进度
  const unsubImageProgress = socketService.on('image:progress', (data) => {
    if (imageTask.value && imageTask.value.id === data.taskId) {
      imageTask.value.progress = data.progress
      imageTask.value.currentStep = data.currentStep
      imageTask.value.totalSteps = data.totalSteps
      imageTask.value.stepName = data.stepName
      imageTask.value.estimatedTimeRemaining = data.estimatedTimeRemaining
    }
  })
  unsubscribeList.push(unsubImageProgress)
  
  // 监听图片生成完成
  const unsubImageCompleted = socketService.on('image:completed', (data) => {
    if (imageTask.value && imageTask.value.id === data.taskId) {
      imageTask.value.status = 'completed'
      imageTask.value.progress = 100
      // 扣除积分
      credits.value.remaining -= data.creditsUsed
      credits.value.used += data.creditsUsed
      
      notifications.value.unshift({
        id: Date.now().toString(),
        type: 'success',
        title: '图片生成完成',
        message: `成功生成 ${data.images.length} 张图片，消耗 ${data.creditsUsed} 积分`,
        timestamp: new Date().toISOString(),
      })
    }
  })
  unsubscribeList.push(unsubImageCompleted)
  
  // 监听批量处理进度
  const unsubBatchProgress = socketService.on('batch:progress', (data) => {
    if (batchTask.value && batchTask.value.id === data.batchId) {
      batchTask.value.completed = data.completed
      batchTask.value.failed = data.failed
      batchTask.value.progress = data.progress
      batchTask.value.currentItem = data.currentItem
    }
  })
  unsubscribeList.push(unsubBatchProgress)
  
  // 监听批量处理完成
  const unsubBatchCompleted = socketService.on('batch:completed', (data) => {
    if (batchTask.value && batchTask.value.id === data.batchId) {
      batchTask.value.status = 'completed'
      batchTask.value.progress = 100
      
      credits.value.remaining -= data.creditsUsed
      credits.value.used += data.creditsUsed
      
      notifications.value.unshift({
        id: Date.now().toString(),
        type: 'success',
        title: '批量处理完成',
        message: `完成 ${data.completed} 张，失败 ${data.failed} 张，消耗 ${data.creditsUsed} 积分`,
        timestamp: new Date().toISOString(),
      })
    }
  })
  unsubscribeList.push(unsubBatchCompleted)
}

// 模拟通知
const simulateNotification = (type: 'info' | 'success' | 'warning' | 'error') => {
  const titles = {
    info: '系统消息',
    success: '操作成功',
    warning: '注意',
    error: '发生错误',
  }
  const messages = {
    info: '系统将于今晚 22:00 进行例行维护',
    success: '图片已成功保存到您的相册',
    warning: '您的存储空间即将用完',
    error: '网络连接超时，请稍后重试',
  }
  
  // 由于目前没有真实后端，直接添加到本地
  notifications.value.unshift({
    id: Date.now().toString(),
    type,
    title: titles[type],
    message: messages[type],
    timestamp: new Date().toISOString(),
  })
}

// 移除通知
const removeNotification = (index: number) => {
  notifications.value.splice(index, 1)
}

// 开始图片生成（模拟）
const startImageGeneration = () => {
  const taskId = `task_${Date.now()}`
  imageTask.value = {
    id: taskId,
    status: 'processing',
    progress: 0,
    currentStep: 1,
    totalSteps: 5,
    stepName: '初始化...',
    estimatedTimeRemaining: 15000,
  }
  
  // 模拟进度更新
  let step = 1
  const steps = ['初始化...', '分析图片内容...', '应用 AI 模型...', '优化图像质量...', '生成最终图片...']
  
  const progressInterval = setInterval(() => {
    if (!imageTask.value || imageTask.value.status !== 'processing') {
      clearInterval(progressInterval)
      return
    }
    
    imageTask.value.progress += Math.random() * 20
    
    if (imageTask.value.progress >= step * 20 && step < 5) {
      step++
      imageTask.value.currentStep = step
      imageTask.value.stepName = steps[step - 1]
    }
    
    if (imageTask.value.progress >= 100) {
      clearInterval(progressInterval)
      // 90% 概率成功
      if (Math.random() > 0.1) {
        imageTask.value.status = 'completed'
        imageTask.value.progress = 100
        notifications.value.unshift({
          id: Date.now().toString(),
          type: 'success',
          title: '图片生成完成',
          message: '成功生成 4 张高质量图片，消耗 20 积分',
          timestamp: new Date().toISOString(),
        })
        credits.value.remaining -= 20
        credits.value.used += 20
      } else {
        imageTask.value.status = 'failed'
        imageTask.value.error = 'AI 模型处理异常，请重试'
      }
    }
  }, 1000)
}

// 取消图片生成
const cancelImageGeneration = () => {
  if (imageTask.value) {
    imageTask.value.status = 'failed'
    imageTask.value.error = '用户取消'
  }
}

// 开始批量处理（模拟）
const startBatchProcessing = () => {
  const batchId = `batch_${Date.now()}`
  const total = 10
  batchTask.value = {
    id: batchId,
    status: 'processing',
    total,
    completed: 0,
    failed: 0,
    progress: 0,
  }
  
  let completed = 0
  let failed = 0
  
  const processInterval = setInterval(() => {
    if (!batchTask.value || batchTask.value.status !== 'processing') {
      clearInterval(processInterval)
      return
    }
    
    // 随机完成或失败
    if (Math.random() > 0.2) {
      completed++
    } else {
      failed++
    }
    
    batchTask.value.completed = completed
    batchTask.value.failed = failed
    batchTask.value.progress = ((completed + failed) / total) * 100
    batchTask.value.currentItem = {
      index: completed + failed,
      status: Math.random() > 0.2 ? '处理成功' : '处理失败',
    }
    
    if (completed + failed >= total) {
      clearInterval(processInterval)
      batchTask.value.status = 'completed'
      notifications.value.unshift({
        id: Date.now().toString(),
        type: 'success',
        title: '批量处理完成',
        message: `完成 ${completed} 张，失败 ${failed} 张，消耗 ${completed * 5} 积分`,
        timestamp: new Date().toISOString(),
      })
      credits.value.remaining -= completed * 5
      credits.value.used += completed * 5
    }
  }, 800)
}

// 模拟积分变动
const simulateCreditChange = (change: number) => {
  const newRemaining = credits.value.remaining + change
  
  if (newRemaining < 0) {
    notifications.value.unshift({
      id: Date.now().toString(),
      type: 'error',
      title: '积分不足',
      message: '您的积分不足以执行此操作',
      timestamp: new Date().toISOString(),
    })
    return
  }
  
  credits.value.remaining = newRemaining
  credits.value.used -= change
  
  creditHistory.value.unshift({
    change,
    message: change > 0 ? '积分充值' : '图片生成消费',
    time: formatDate(new Date()),
  })
  
  if (creditHistory.value.length > 5) {
    creditHistory.value.pop()
  }
  
  // 低积分警告
  if (newRemaining < 100) {
    notifications.value.unshift({
      id: Date.now().toString(),
      type: 'warning',
      title: '积分不足警告',
      message: `您的积分仅剩 ${newRemaining}，请及时充值`,
      timestamp: new Date().toISOString(),
    })
  }
}

// 任务状态样式
const getTaskStatusType = (status: string) => {
  const typeMap: Record<string, 'default' | 'success' | 'warning' | 'error' | 'processing'> = {
    pending: 'default',
    processing: 'processing',
    completed: 'success',
    failed: 'error',
  }
  return typeMap[status] || 'default'
}

const getTaskStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    pending: '等待中',
    processing: '处理中',
    completed: '已完成',
    failed: '失败',
  }
  return textMap[status] || status
}

// 格式化时间
const formatTime = (timestamp: string) => {
  return formatDate(timestamp, 'HH:mm:ss')
}

onUnmounted(() => {
  disconnect()
})
</script>