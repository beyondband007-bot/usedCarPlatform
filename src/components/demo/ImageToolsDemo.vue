<template>
  <div class="p-6">
    <h2 class="text-xl font-bold mb-4">图片处理工具演示</h2>

    <!-- 图片预览演示 -->
    <n-card title="1. Viewer.js - 图片预览" class="mb-4">
      <n-space vertical>
        <p class="text-gray-500 mb-2">点击缩略图查看大图，支持缩放、旋转、拖拽</p>
        <div ref="viewerContainer" class="grid grid-cols-4 gap-4">
          <div
            v-for="(image, index) in sampleImages"
            :key="index"
            class="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
            @click="openViewer(index)"
          >
            <img
              :src="image.thumbnail"
              :alt="image.alt"
              class="w-full h-full object-cover"
            />
          </div>
        </div>

        <n-divider />

        <n-space>
          <n-button @click="previewSingleImage">
            <template #icon>
              <Icon icon="mdi:image" />
            </template>
            预览单张图片
          </n-button>
          <n-button @click="previewMultipleImages">
            <template #icon>
              <Icon icon="mdi:images" />
            </template>
            预览多张图片
          </n-button>
        </n-space>
      </n-space>
    </n-card>

    <!-- 图片裁剪演示 -->
    <n-card title="2. Cropper.js - 图片裁剪" class="mb-4">
      <n-space vertical>
        <!-- 裁剪预设 -->
        <n-radio-group v-model:value="cropAspectRatio" @update:value="applyAspectRatio">
          <n-radio-button :value="NaN">自由裁剪</n-radio-button>
          <n-radio-button :value="1">正方形 (1:1)</n-radio-button>
          <n-radio-button :value="16/9">宽屏 (16:9)</n-radio-button>
          <n-radio-button :value="3/4">竖屏 (3:4)</n-radio-button>
          <n-radio-button :value="3/2">照片 (3:2)</n-radio-button>
        </n-radio-group>

        <!-- 裁剪区域 -->
        <div class="flex gap-6">
          <div class="flex-1">
            <div class="h-80 bg-gray-100 rounded-lg overflow-hidden">
              <img
                ref="cropperImage"
                src="https://picsum.photos/800/600?random=1"
                alt="裁剪图片"
                class="max-w-full"
              />
            </div>
          </div>

          <!-- 预览和操作按钮 -->
          <div class="w-48 space-y-4">
            <div class="aspect-square bg-gray-100 rounded-lg overflow-hidden">
              <img
                v-if="croppedPreview"
                :src="croppedPreview"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
                预览
              </div>
            </div>

            <n-space vertical class="w-full">
              <n-button block @click="getCroppedResult">
                <template #icon>
                  <Icon icon="mdi:crop" />
                </template>
                获取裁剪结果
              </n-button>
              <n-button block @click="rotateCropper(90)">
                <template #icon>
                  <Icon icon="mdi:rotate-right" />
                </template>
                旋转 90°
              </n-button>
              <n-button block @click="rotateCropper(-90)">
                <template #icon>
                  <Icon icon="mdi:rotate-left" />
                </template>
                旋转 -90°
              </n-button>
              <n-button block @click="resetCropper">
                <template #icon>
                  <Icon icon="mdi:refresh" />
                </template>
                重置
              </n-button>
              <n-button type="primary" block @click="downloadCropped">
                <template #icon>
                  <Icon icon="mdi:download" />
                </template>
                下载裁剪结果
              </n-button>
            </n-space>
          </div>
        </div>
      </n-space>
    </n-card>

    <!-- 图片压缩演示 -->
    <n-card title="3. Compressor.js - 图片压缩">
      <n-space vertical>
        <!-- 文件上传 -->
        <n-upload
          accept="image/*"
          :default-upload="false"
          @change="handleFileSelect"
        >
          <n-button>
            <template #icon>
              <Icon icon="mdi:upload" />
            </template>
            选择图片
          </n-button>
        </n-upload>

        <!-- 压缩设置 -->
        <div v-if="selectedFile" class="space-y-4">
          <n-divider />

          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-gray-500 mb-2">压缩预设</div>
              <n-select v-model:value="compressionPreset" :options="presetOptions" />
            </div>
            <div>
              <div class="text-gray-500 mb-2">压缩质量 ({{ (compressionQuality * 100).toFixed(0) }}%)</div>
              <n-slider v-model:value="compressionQuality" :min="0.1" :max="1" :step="0.05" />
            </div>
          </div>

          <n-button
            type="primary"
            :loading="isCompressing"
            @click="startCompression"
          >
            {{ isCompressing ? '压缩中...' : '开始压缩' }}
          </n-button>

          <n-progress
            v-if="isCompressing || compressionProgress === 100"
            :percentage="compressionProgress"
            :indicator-placement="'inside'"
          />

          <!-- 压缩结果对比 -->
          <div v-if="compressionResult" class="grid grid-cols-2 gap-6 mt-4">
            <div class="p-4 bg-gray-50 rounded-lg">
              <div class="text-gray-500 mb-2">原始图片</div>
              <div class="space-y-1 text-sm">
                <div>大小: {{ compressionResult.original.sizeFormatted }}</div>
                <div>尺寸: {{ compressionResult.original.width }} x {{ compressionResult.original.height }}</div>
              </div>
            </div>
            <div class="p-4 bg-green-50 rounded-lg">
              <div class="text-green-600 mb-2">压缩后</div>
              <div class="space-y-1 text-sm">
                <div>大小: {{ compressionResult.compressed.sizeFormatted }}</div>
                <div>尺寸: {{ compressionResult.compressed.width }} x {{ compressionResult.compressed.height }}</div>
                <div class="text-green-600 font-bold">
                  压缩率: {{ compressionResult.compressionRatioFormatted }}
                </div>
              </div>
            </div>
          </div>

          <!-- 压缩后预览 -->
          <div v-if="compressionResult" class="flex gap-4">
            <div class="flex-1">
              <div class="text-gray-500 mb-2">原图</div>
              <img
                :src="originalImageUrl"
                class="max-h-48 rounded-lg"
              />
            </div>
            <div class="flex-1">
              <div class="text-gray-500 mb-2">压缩后</div>
              <img
                :src="compressedImageUrl"
                class="max-h-48 rounded-lg"
              />
            </div>
          </div>

          <n-space v-if="compressionResult">
            <n-button @click="downloadCompressed">
              <template #icon>
                <Icon icon="mdi:download" />
              </template>
              下载压缩图片
            </n-button>
            <n-button @click="resetCompression">
              <template #icon>
                <Icon icon="mdi:refresh" />
              </template>
              重新选择
            </n-button>
          </n-space>
        </div>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useImageViewer, previewImage, previewImages } from '@/composables/useImageViewer'
import { useImageCropper, aspectRatioPresets } from '@/composables/useImageCropper'
import { useImageCompressor, compressorPresets } from '@/composables/useImageCompressor'

// ========== 图片预览 ==========
const viewerContainer = ref<HTMLElement>()
const sampleImages = ref([
  { thumbnail: 'https://picsum.photos/300/300?random=1', full: 'https://picsum.photos/1920/1080?random=1', alt: '图片 1' },
  { thumbnail: 'https://picsum.photos/300/300?random=2', full: 'https://picsum.photos/1920/1080?random=2', alt: '图片 2' },
  { thumbnail: 'https://picsum.photos/300/300?random=3', full: 'https://picsum.photos/1920/1080?random=3', alt: '图片 3' },
  { thumbnail: 'https://picsum.photos/300/300?random=4', full: 'https://picsum.photos/1920/1080?random=4', alt: '图片 4' },
])

const { initViewer, show, destroy } = useImageViewer({
  navbar: true,
  title: true,
  toolbar: true,
  tooltip: true,
  movable: true,
  zoomable: true,
  rotatable: true,
  scalable: true,
  keyboard: true,
})

const openViewer = (index: number) => {
  // 初始化预览器
  initViewer(viewerContainer.value!)
  show(index)
}

const previewSingleImage = () => {
  previewImage('https://picsum.photos/1920/1080?random=5')
}

const previewMultipleImages = () => {
  previewImages([
    'https://picsum.photos/1920/1080?random=6',
    'https://picsum.photos/1920/1080?random=7',
    'https://picsum.photos/1920/1080?random=8',
  ], 0)
}

onMounted(() => {
  // 预加载图片
  sampleImages.value.forEach(img => {
    const preloadImg = new Image()
    preloadImg.src = img.full
  })
})

onUnmounted(() => {
  destroy()
})

// ========== 图片裁剪 ==========
const cropperImage = ref<HTMLImageElement>()
const cropAspectRatio = ref<number>(NaN)
const croppedPreview = ref('')

const {
  initCropper,
  getCroppedDataURL,
  rotate,
  reset,
  setAspectRatio,
  destroy: destroyCropper,
} = useImageCropper()

onMounted(() => {
  // 初始化裁剪器
  if (cropperImage.value) {
    initCropper(cropperImage.value, {
      aspectRatio: NaN,
      viewMode: 1,
      crop: () => {
        // 实时更新预览
        croppedPreview.value = getCroppedDataURL({ width: 200, height: 200 })
      },
    })
  }
})

const applyAspectRatio = (ratio: number) => {
  setAspectRatio(ratio)
}

const getCroppedResult = () => {
  croppedPreview.value = getCroppedDataURL()
}

const rotateCropper = (degree: number) => {
  rotate(degree)
}

const resetCropper = () => {
  reset()
}

const downloadCropped = () => {
  const dataUrl = getCroppedDataURL()
  if (dataUrl) {
    const link = document.createElement('a')
    link.download = 'cropped-image.png'
    link.href = dataUrl
    link.click()
  }
}

onUnmounted(() => {
  destroyCropper()
})

// ========== 图片压缩 ==========
const selectedFile = ref<File | null>(null)
const originalImageUrl = ref('')
const compressedImageUrl = ref('')
const compressionPreset = ref<keyof typeof compressorPresets>('medium')
const compressionQuality = ref(0.8)
const compressionResult = ref<ReturnType<ReturnType<typeof useImageCompressor>['compressWithInfo']> extends Promise<infer T> ? T : never>()

const { compressWithInfo, isCompressing, progress: compressionProgress, formatFileSize } = useImageCompressor()

const presetOptions = [
  { label: '高质量 (95%)', value: 'high' },
  { label: '中等质量 (80%)', value: 'medium' },
  { label: '低质量 (60%)', value: 'low' },
  { label: '缩略图 (40%)', value: 'thumbnail' },
  { label: '头像专用', value: 'avatar' },
  { label: '产品图片', value: 'product' },
  { label: '横幅海报', value: 'banner' },
]

const handleFileSelect = ({ fileList }: { fileList: any[] }) => {
  if (fileList.length > 0) {
    selectedFile.value = fileList[0].file
    originalImageUrl.value = URL.createObjectURL(fileList[0].file)
    compressedImageUrl.value = ''
    compressionResult.value = null
  }
}

const startCompression = async () => {
  if (!selectedFile.value) return

  try {
    const preset = compressorPresets[compressionPreset.value]
    const result = await compressWithInfo(selectedFile.value, {
      ...preset,
      quality: compressionQuality.value,
    })

    compressionResult.value = result
    compressedImageUrl.value = URL.createObjectURL(result.compressed.file)
  } catch (error) {
    console.error('压缩失败:', error)
  }
}

const downloadCompressed = () => {
  if (!compressionResult.value) return

  const file = compressionResult.value.compressed.file
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.download = `compressed_${selectedFile.value?.name || 'image.jpg'}`
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}

const resetCompression = () => {
  selectedFile.value = null
  originalImageUrl.value = ''
  compressedImageUrl.value = ''
  compressionResult.value = null
  compressionProgress.value = 0
}
</script>