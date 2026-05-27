<template>
  <div class="p-6">
    <h2 class="text-xl font-bold mb-4">Motion Vue 动画演示</h2>

    <!-- 入场动画演示 -->
    <n-card title="入场动画" class="mb-4">
      <n-space>
        <motion.div
          :initial="{ opacity: 0, y: 20 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5 }"
          class="bg-blue-500 text-white px-4 py-2 rounded"
        >
          淡入下滑
        </motion.div>

        <motion.div
          :initial="{ opacity: 0, scale: 0 }"
          :animate="{ opacity: 1, scale: 1 }"
          :transition="{ duration: 0.5, delay: 0.2 }"
          class="bg-green-500 text-white px-4 py-2 rounded"
        >
          缩放入场
        </motion.div>

        <motion.div
          :initial="{ opacity: 0, x: -50 }"
          :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.5, delay: 0.4, type: 'spring' }"
          class="bg-purple-500 text-white px-4 py-2 rounded"
        >
          弹簧滑入
        </motion.div>
      </n-space>
    </n-card>

    <!-- 交互式动画 -->
    <n-card title="交互式动画（点击/悬停）" class="mb-4">
      <n-space>
        <motion.button
          :while-hover="{ scale: 1.1 }"
          :while-press="{ scale: 0.95 }"
          class="bg-blue-500 text-white px-6 py-3 rounded-lg cursor-pointer"
        >
          点击缩放
        </motion.button>

        <motion.div
          :while-hover="{ rotate: 360, scale: 1.2 }"
          :transition="{ duration: 0.5 }"
          class="bg-orange-500 text-white w-16 h-16 rounded-lg flex items-center justify-center cursor-pointer"
        >
          <Icon icon="mdi:refresh" class="text-2xl" />
        </motion.div>

        <motion.div
          :while-hover="{
            scale: 1.1,
            boxShadow: '0 0px 25px -5px rgba(0, 0, 0, 0.1)',
          }"
          class="bg-white border-2 border-gray-200 px-6 py-3 rounded-lg cursor-pointer shadow-md"
        >
          悬停阴影
        </motion.div>
      </n-space>
    </n-card>

    <!-- 列表动画 -->
    <n-card title="列表交错动画" class="mb-4">
      <n-space vertical>
        <motion.div
          v-for="(item, index) in listItems"
          :key="item.id"
          :initial="{ opacity: 0, x: -30 }"
          :animate="{ opacity: 1, x: 0 }"
          :transition="{
            duration: 0.3,
            delay: index * 0.1,
          }"
          class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
        >
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center text-white"
            :class="item.color"
          >
            <Icon :icon="item.icon" />
          </div>
          <div>
            <div class="font-medium">{{ item.title }}</div>
            <div class="text-sm text-gray-500">{{ item.desc }}</div>
          </div>
        </motion.div>
      </n-space>
    </n-card>

    <!-- 循环动画 -->
    <n-card title="循环动画" class="mb-4">
      <n-space>
        <motion.div
          :animate="{
            y: [0, -10, 0],
          }"
          :transition="{
            duration: 1,
            repeat: Infinity,
            ease: 'easeInOut',
          }"
          class="bg-blue-500 text-white px-4 py-2 rounded"
        >
          上下跳动
        </motion.div>

        <motion.div
          :animate="{
            rotate: 360,
          }"
          :transition="{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }"
          class="bg-green-500 text-white w-12 h-12 rounded-full flex items-center justify-center"
        >
          <Icon icon="mdi:loading" class="text-xl" />
        </motion.div>

        <motion.div
          :animate="{
            scale: [1, 1.2, 1],
            opacity: [1, 0.7, 1],
          }"
          :transition="{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }"
          class="bg-red-500 text-white w-12 h-12 rounded-full flex items-center justify-center"
        >
          <Icon icon="mdi:bell" class="text-xl" />
        </motion.div>
      </n-space>
    </n-card>

    <!-- 手势拖拽 -->
    <n-card title="拖拽交互">
      <div class="h-40 bg-gray-100 rounded-lg relative overflow-hidden">
        <motion.div
          :drag="true"
          :drag-constraints="{ left: -100, right: 100, top: -50, bottom: 50 }"
          :drag-elastic="0.2"
          :while-drag="{ scale: 1.1, cursor: 'grabbing' }"
          class="bg-blue-500 text-white px-6 py-3 rounded-lg cursor-grab absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 shadow-lg"
        >
          <Icon icon="mdi:cursor-move" class="inline mr-2" />
          拖拽我
        </motion.div>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { motion } from "motion-v";
import { Icon } from "@iconify/vue";

const listItems = [
  {
    id: 1,
    title: "图片生成完成",
    desc: "AI 已成功生成 4 张图片",
    icon: "mdi:image",
    color: "bg-blue-500",
  },
  {
    id: 2,
    title: "批量处理完成",
    desc: "10 张图片已批量美化",
    icon: "mdi:check-circle",
    color: "bg-green-500",
  },
  {
    id: 3,
    title: "展厅更新",
    desc: "3D 展厅模板已更新",
    icon: "mdi:cube",
    color: "bg-purple-500",
  },
  {
    id: 4,
    title: "积分消耗",
    desc: "本次操作消耗 20 积分",
    icon: "mdi:cash",
    color: "bg-orange-500",
  },
];
</script>
