<template>
  <div class="p-6">
    <h2 class="text-xl font-bold mb-4">Iconify 图标演示</h2>
    
    <n-card title="基础图标使用">
      <n-space>
        <!-- 使用 Icon 组件 -->
        <Icon icon="mdi:home" class="text-2xl text-blue-500" />
        <Icon icon="mdi:account" class="text-2xl text-green-500" />
        <Icon icon="mdi:settings" class="text-2xl text-gray-500" />
        <Icon icon="mdi:bell" class="text-2xl text-red-500" />
        <Icon icon="mdi:search" class="text-2xl text-purple-500" />
      </n-space>
    </n-card>

    <n-card title="不同尺寸" class="mt-4">
      <n-space align="center">
        <Icon icon="mdi:heart" class="text-sm text-red-500" />
        <Icon icon="mdi:heart" class="text-base text-red-500" />
        <Icon icon="mdi:heart" class="text-lg text-red-500" />
        <Icon icon="mdi:heart" class="text-xl text-red-500" />
        <Icon icon="mdi:heart" class="text-2xl text-red-500" />
        <Icon icon="mdi:heart" class="text-3xl text-red-500" />
        <Icon icon="mdi:heart" class="text-4xl text-red-500" />
      </n-space>
    </n-card>

    <n-card title="常用图标集合" class="mt-4">
      <n-space>
        <div class="flex flex-col items-center gap-2">
          <Icon icon="mdi:home-outline" class="text-2xl" />
          <span class="text-xs text-gray-500">首页</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <Icon icon="mdi:image-edit-outline" class="text-2xl" />
          <span class="text-xs text-gray-500">编辑</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <Icon icon="mdi:cloud-upload-outline" class="text-2xl" />
          <span class="text-xs text-gray-500">上传</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <Icon icon="mdi:download-outline" class="text-2xl" />
          <span class="text-xs text-gray-500">下载</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <Icon icon="mdi:trash-can-outline" class="text-2xl" />
          <span class="text-xs text-gray-500">删除</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <Icon icon="mdi:pencil-outline" class="text-2xl" />
          <span class="text-xs text-gray-500">编辑</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <Icon icon="mdi:check-circle-outline" class="text-2xl" />
          <span class="text-xs text-gray-500">完成</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <Icon icon="mdi:alert-circle-outline" class="text-2xl" />
          <span class="text-xs text-gray-500">警告</span>
        </div>
      </n-space>
    </n-card>

    <n-card title="与 Naive UI 按钮结合" class="mt-4">
      <n-space>
        <n-button>
          <template #icon>
            <Icon icon="mdi:plus" />
          </template>
          新建
        </n-button>
        <n-button type="primary">
          <template #icon>
            <Icon icon="mdi:save" />
          </template>
          保存
        </n-button>
        <n-button type="error">
          <template #icon>
            <Icon icon="mdi:delete" />
          </template>
          删除
        </n-button>
        <n-button type="warning">
          <template #icon>
            <Icon icon="mdi:refresh" />
          </template>
          刷新
        </n-button>
      </n-space>
    </n-card>

    <n-card title="AI 相关图标" class="mt-4">
      <n-space>
        <div class="flex flex-col items-center gap-2">
          <Icon icon="mdi:robot" class="text-2xl text-blue-500" />
          <span class="text-xs text-gray-500">AI</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <Icon icon="mdi:brain" class="text-2xl text-purple-500" />
          <span class="text-xs text-gray-500">智能</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <Icon icon="mdi:magic" class="text-2xl text-pink-500" />
          <span class="text-xs text-gray-500">魔法</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <Icon icon="mdi:image-auto-adjust" class="text-2xl text-green-500" />
          <span class="text-xs text-gray-500">图像处理</span>
        </div>
        <div class="flex flex-col items-center gap-2">
          <Icon icon="mdi:cube-outline" class="text-2xl text-orange-500" />
          <span class="text-xs text-gray-500">3D</span>
        </div>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
</script>