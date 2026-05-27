<template>
  <div class="p-6">
    <h2 class="text-xl font-bold mb-4">VueUse Hooks 演示</h2>
    
    <!-- useDark 暗黑模式 -->
    <n-card title="useDark - 暗黑模式" class="mb-4">
      <n-space align="center">
        <span>当前模式: {{ isDark ? '暗黑' : '明亮' }}</span>
        <n-switch :value="isDark" @update:value="toggleDark()">
          <template #checked-icon>
            <Icon icon="mdi:moon-waning-crescent" />
          </template>
          <template #unchecked-icon>
            <Icon icon="mdi:white-balance-sunny" />
          </template>
        </n-switch>
        <n-button @click="toggleDark()">切换模式</n-button>
      </n-space>
    </n-card>

    <!-- useLocalStorage 本地存储 -->
    <n-card title="useLocalStorage - 本地存储" class="mb-4">
      <n-space vertical>
        <n-input 
          v-model:value="storageValue" 
          placeholder="输入内容会自动保存到 localStorage"
        />
        <p class="text-gray-500">存储值: {{ storageValue }}</p>
        <n-button @click="storageValue = ''">清空</n-button>
      </n-space>
    </n-card>

    <!-- useClipboard 剪贴板 -->
    <n-card title="useClipboard - 剪贴板操作" class="mb-4">
      <n-space>
        <n-input v-model:value="copyText" placeholder="输入要复制的内容" />
        <n-button @click="copy(copyText)">
          <template #icon>
            <Icon icon="mdi:content-copy" />
          </template>
          复制
        </n-button>
        <n-tag v-if="copied" type="success">已复制!</n-tag>
      </n-space>
    </n-card>

    <!-- useFullscreen 全屏 -->
    <n-card title="useFullscreen - 全屏控制" class="mb-4">
      <n-space>
        <n-button @click="toggleFullscreen">
          <template #icon>
            <Icon :icon="isFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'" />
          </template>
          {{ isFullscreen ? '退出全屏' : '进入全屏' }}
        </n-button>
      </n-space>
    </n-card>

    <!-- useMouse 鼠标位置 -->
    <n-card title="useMouse - 鼠标追踪" class="mb-4">
      <div 
        ref="mouseArea"
        class="h-40 bg-gray-100 rounded-lg relative overflow-hidden"
      >
        <div class="absolute top-4 left-4 text-gray-600">
          页面位置: x: {{ x }}, y: {{ y }}
        </div>
        <div class="absolute top-12 left-4 text-gray-600">
          元素位置: elementX: {{ elementX }}, elementY: {{ elementY }}
        </div>
        <motion.div
          class="absolute w-4 h-4 bg-blue-500 rounded-full pointer-events-none"
          :style="{ left: elementX + 'px', top: elementY + 'px' }"
          :animate="{ scale: [1, 1.2, 1] }"
          :transition="{ duration: 0.5, repeat: Infinity }"
        />
      </div>
    </n-card>

    <!-- useNetwork 网络状态 -->
    <n-card title="useNetwork - 网络状态" class="mb-4">
      <n-space vertical>
        <div class="flex items-center gap-2">
          <div 
            class="w-3 h-3 rounded-full"
            :class="online ? 'bg-green-500' : 'bg-red-500'"
          />
          <span>网络状态: {{ online ? '在线' : '离线' }}</span>
        </div>
        <div class="text-gray-500 text-sm">
          连接类型: {{ networkType }} | 
          下载速度: {{ downlink }} Mbps | 
          RTT: {{ rtt }} ms
        </div>
      </n-space>
    </n-card>

    <!-- useIntervalFn 定时器 -->
    <n-card title="useIntervalFn - 定时任务" class="mb-4">
      <n-space align="center">
        <div class="text-3xl font-mono">{{ counter }}</div>
        <n-button @click="resume" :disabled="isActive">开始</n-button>
        <n-button @click="pause" :disabled="!isActive">暂停</n-button>
        <n-tag :type="isActive ? 'success' : 'default'">
          {{ isActive ? '运行中' : '已暂停' }}
        </n-tag>
      </n-space>
    </n-card>

    <!-- useDraggable 拖拽 -->
    <n-card title="useDraggable - 拖拽" class="mb-4">
      <div class="h-40 bg-gray-100 rounded-lg relative overflow-hidden">
        <div 
          ref="draggableEl"
          class="absolute w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center text-white cursor-move shadow-lg"
          :style="{ left: x2 + 'px', top: y2 + 'px' }"
        >
          <Icon icon="mdi:cursor-move" class="text-2xl" />
        </div>
        <div class="absolute bottom-4 left-4 text-gray-500">
          位置: {{ Math.round(x2) }}, {{ Math.round(y2) }}
        </div>
      </div>
    </n-card>

    <!-- useDebounceFn 防抖 -->
    <n-card title="useDebounceFn - 防抖输入">
      <n-space vertical>
        <n-input 
          v-model:value="searchText" 
          placeholder="输入搜索内容（防抖 500ms）"
        />
        <p class="text-gray-500">实际搜索: {{ debouncedSearch }}</p>
        <n-tag type="info">防抖延迟: 500ms</n-tag>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import { motion } from 'motion-v'
import { 
  useDark, 
  useToggle, 
  useLocalStorage, 
  useClipboard, 
  useFullscreen,
  useMouse,
  useMouseInElement,
  useNetwork,
  useIntervalFn,
  useDraggable,
  useDebounceFn,
} from '@vueuse/core'

// useDark - 暗黑模式
const isDark = useDark()
const toggleDark = useToggle(isDark)

// useLocalStorage - 本地存储
const storageValue = useLocalStorage('demo-storage', '')

// useClipboard - 剪贴板
const copyText = ref('Hello VueUse!')
const { text, copy, copied, isSupported: clipboardSupported } = useClipboard()

// useFullscreen - 全屏
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()

// useMouse - 鼠标位置
const mouseArea = ref<HTMLElement>()
const { x, y } = useMouse()
const { elementX, elementY } = useMouseInElement(mouseArea)

// useNetwork - 网络状态
const { 
  isOnline: online, 
  type: networkType, 
  downlink, 
  rtt 
} = useNetwork()

// useIntervalFn - 定时器
const counter = ref(0)
const { pause, resume, isActive } = useIntervalFn(() => {
  counter.value++
}, 1000)

// useDraggable - 拖拽
const draggableEl = ref<HTMLElement>()
const { x: x2, y: y2 } = useDraggable(draggableEl, {
  initialValue: { x: 40, y: 40 },
})

// useDebounceFn - 防抖
const searchText = ref('')
const debouncedSearch = ref('')

const debouncedUpdate = useDebounceFn((val: string) => {
  debouncedSearch.value = val
}, 500)

// 监听搜索文本变化
import { watch } from 'vue'
watch(searchText, (val) => {
  debouncedUpdate(val)
})
</script>