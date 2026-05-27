<template>
  <div class="p-6">
    <h2 class="text-xl font-bold mb-4">GSAP 高级动画演示</h2>
    
    <!-- 基础动画 -->
    <n-card title="基础入场动画" class="mb-4">
      <n-space>
        <div ref="fadeBox" class="bg-blue-500 text-white px-6 py-3 rounded-lg cursor-pointer">
          淡入上移
        </div>
        <n-button @click="playFadeIn">播放动画</n-button>
      </n-space>
    </n-card>

    <!-- 交错动画 -->
    <n-card title="交错列表动画" class="mb-4">
      <n-button @click="playStagger" class="mb-4">播放交错动画</n-button>
      <div class="flex gap-3">
        <div 
          v-for="i in 5" 
          :key="i"
          :ref="el => { if (el) staggerBoxes[i-1] = el }"
          class="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white text-xl"
        >
          {{ i }}
        </div>
      </div>
    </n-card>

    <!-- 时间轴动画 -->
    <n-card title="时间轴序列动画" class="mb-4">
      <n-button @click="playTimeline" class="mb-4">播放序列</n-button>
      <div class="relative h-20 bg-gray-100 rounded-lg overflow-hidden">
        <div ref="timelineBox" class="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-white">
          <Icon icon="mdi:rocket" />
        </div>
      </div>
    </n-card>

    <!-- 文字效果 -->
    <n-card title="文字打字效果" class="mb-4">
      <n-button @click="playTypewriter" class="mb-4">开始打字</n-button>
      <div class="bg-gray-900 text-green-400 p-4 rounded-lg font-mono">
        <span ref="typeText"></span>
        <span class="animate-pulse">|</span>
      </div>
    </n-card>

    <!-- 数字滚动 -->
    <n-card title="数字滚动动画" class="mb-4">
      <n-button @click="playCounter" class="mb-4">开始计数</n-button>
      <div class="flex gap-8">
        <div class="text-center">
          <div ref="counter1" class="text-5xl font-bold text-blue-600">0</div>
          <div class="text-gray-500 mt-2">生成图片数</div>
        </div>
        <div class="text-center">
          <div ref="counter2" class="text-5xl font-bold text-green-600">0</div>
          <div class="text-gray-500 mt-2">服务企业</div>
        </div>
        <div class="text-center">
          <div ref="counter3" class="text-5xl font-bold text-purple-600">0</div>
          <div class="text-gray-500 mt-2">节省工时(小时)</div>
        </div>
      </div>
    </n-card>

    <!-- 弹性动画 -->
    <n-card title="弹性动画效果" class="mb-4">
      <n-button @click="playElastic" class="mb-4">播放弹性动画</n-button>
      <div class="flex gap-4 items-end h-32">
        <div 
          v-for="(item, index) in elasticItems" 
          :key="index"
          :ref="el => { if (el) elasticBoxes[index] = el }"
          class="w-12 bg-gradient-to-t from-orange-500 to-yellow-400 rounded-t-lg"
          :style="{ height: item.height + 'px' }"
        />
      </div>
    </n-card>

    <!-- 3D翻转 -->
    <n-card title="3D 翻转效果">
      <n-button @click="playFlip" class="mb-4">翻转</n-button>
      <div class="perspective-1000">
        <div 
          ref="flipCard"
          class="w-48 h-32 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-lg cursor-pointer shadow-xl"
        >
          <div class="flex flex-col items-center">
            <Icon icon="mdi:credit-card" class="text-3xl mb-2" />
            <span>企业套餐</span>
          </div>
        </div>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { gsap } from '@/composables/useGSAP'

// 引用元素
const fadeBox = ref<HTMLElement>()
const staggerBoxes = ref<HTMLElement[]>([])
const timelineBox = ref<HTMLElement>()
const typeText = ref<HTMLElement>()
const counter1 = ref<HTMLElement>()
const counter2 = ref<HTMLElement>()
const counter3 = ref<HTMLElement>()
const elasticBoxes = ref<HTMLElement[]>([])
const flipCard = ref<HTMLElement>()

const elasticItems = ref([
  { height: 40 },
  { height: 80 },
  { height: 120 },
  { height: 60 },
  { height: 100 },
])

// 淡入动画
const playFadeIn = () => {
  gsap.fromTo(fadeBox.value, 
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
  )
}

// 交错动画
const playStagger = () => {
  gsap.fromTo(staggerBoxes.value,
    { opacity: 0, y: 30, scale: 0.8 },
    { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      duration: 0.5, 
      stagger: 0.1,
      ease: 'back.out(1.7)'
    }
  )
}

// 时间轴动画
const playTimeline = () => {
  const tl = gsap.timeline()
  
  tl.to(timelineBox.value, { x: 100, duration: 0.5, ease: 'power2.inOut' })
    .to(timelineBox.value, { rotation: 360, duration: 0.5 })
    .to(timelineBox.value, { x: 300, scale: 1.5, duration: 0.5 })
    .to(timelineBox.value, { x: 0, scale: 1, rotation: 0, duration: 0.8, ease: 'power2.out' })
}

// 打字效果
const playTypewriter = () => {
  gsap.to(typeText.value, {
    text: {
      value: 'AI 汽车电商视觉平台正在启动...',
      delimiter: '',
    },
    duration: 2,
    ease: 'none',
  })
}

// 数字滚动
const playCounter = () => {
  const counters = [
    { el: counter1.value, end: 10000, suffix: '+' },
    { el: counter2.value, end: 500, suffix: '+' },
    { el: counter3.value, end: 10000, suffix: '' },
  ]
  
  counters.forEach(({ el, end, suffix }) => {
    const obj = { value: 0 }
    gsap.to(obj, {
      value: end,
      duration: 2,
      ease: 'power2.out',
      onUpdate: () => {
        if (el) {
          el.textContent = Math.round(obj.value).toLocaleString() + suffix
        }
      }
    })
  })
}

// 弹性动画
const playElastic = () => {
  gsap.fromTo(elasticBoxes.value,
    { scaleY: 0 },
    { 
      scaleY: 1, 
      duration: 0.8, 
      stagger: 0.1,
      ease: 'elastic.out(1, 0.3)'
    }
  )
}

// 3D翻转
const playFlip = () => {
  gsap.to(flipCard.value, {
    rotationY: 180,
    duration: 0.6,
    ease: 'power2.inOut',
    onComplete: () => {
      gsap.to(flipCard.value, {
        rotationY: 360,
        duration: 0.6,
        ease: 'power2.inOut',
      })
    }
  })
}

onMounted(() => {
  // 页面加载时播放一些入场动画
  playFadeIn()
})
</script>

<style scoped>
.perspective-1000 {
  perspective: 1000px;
}
</style>