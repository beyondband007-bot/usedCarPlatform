<template>
  <div class="p-6">
    <h2 class="text-xl font-bold mb-4">Naive UI 组件演示</h2>
    
    <n-space vertical>
      <!-- 按钮演示 -->
      <n-card title="按钮组件">
        <n-space>
          <n-button type="primary">主要按钮</n-button>
          <n-button type="success">成功按钮</n-button>
          <n-button type="warning">警告按钮</n-button>
          <n-button type="error">错误按钮</n-button>
        </n-space>
      </n-card>

      <!-- 输入框演示 -->
      <n-card title="输入框组件">
        <n-space vertical>
          <n-input v-model:value="inputValue" placeholder="请输入内容" />
          <p class="text-gray-600">输入值: {{ inputValue }}</p>
        </n-space>
      </n-card>

      <!-- 标签页演示 -->
      <n-card title="标签页组件">
        <n-tabs v-model:value="activeTab" type="line">
          <n-tab-pane name="tab1" tab="首页">首页内容</n-tab-pane>
          <n-tab-pane name="tab2" tab="工作台">工作台内容</n-tab-pane>
          <n-tab-pane name="tab3" tab="设置">设置内容</n-tab-pane>
        </n-tabs>
      </n-card>

      <!-- 消息提示演示 -->
      <n-card title="消息提示">
        <n-space>
          <n-button @click="showSuccessMessage">成功消息</n-button>
          <n-button @click="showErrorMessage">错误消息</n-button>
        </n-space>
      </n-card>
    </n-space>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useMessage } from 'naive-ui'

const message = useMessage()
const inputValue = ref('')
const activeTab = ref('tab1')

function showSuccessMessage() {
  message.success('这是一条成功消息！')
}

function showErrorMessage() {
  message.error('这是一条错误消息！')
}
</script>