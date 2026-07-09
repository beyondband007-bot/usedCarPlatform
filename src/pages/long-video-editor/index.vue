<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'

import { getLongVideoTask } from '@/api/long-video-generation'
import type { LongVideoTask } from '@/types/long-video-generation'

const route = useRoute()
const task = ref<LongVideoTask | null>(null)
const loading = ref(false)
const errorMessage = ref('')

const taskId = computed(() => {
  const value = route.query.taskId
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
})

async function loadTask() {
  if (!taskId.value) {
    errorMessage.value = '缺少长视频任务 ID'
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    task.value = await getLongVideoTask(taskId.value)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '读取长视频任务失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadTask()
})
</script>

<template>
  <main class="long-video-editor-page">
    <header class="editor-head">
      <div>
        <p>长视频剪辑</p>
        <h1>成片剪辑入口</h1>
        <span>生成完成后进入这里，后续接入 ai-video-state / OpenReel 编辑器。</span>
      </div>
      <button type="button" :disabled="loading" @click="loadTask">
        <Icon :icon="loading ? 'mdi:loading' : 'mdi:refresh'" :class="{ 'is-spinning': loading }" />
        刷新
      </button>
    </header>

    <section v-if="errorMessage" class="state-card is-error">
      <Icon icon="mdi:alert-circle-outline" />
      <span>{{ errorMessage }}</span>
    </section>

    <section v-else-if="!task" class="state-card">
      <Icon icon="mdi:loading" class="is-spinning" />
      <span>正在读取长视频任务</span>
    </section>

    <section v-else class="editor-grid">
      <article class="video-panel">
        <video v-if="task.resultUrl" :src="task.resultUrl" controls playsinline />
        <div v-else class="video-empty">
          <Icon icon="mdi:movie-clock-outline" />
          <span>成片尚未生成完成</span>
        </div>
      </article>

      <aside class="meta-panel">
        <section>
          <h2>任务状态</h2>
          <dl>
            <div>
              <dt>任务 ID</dt>
              <dd>{{ task.taskId }}</dd>
            </div>
            <div>
              <dt>状态</dt>
              <dd>{{ task.status }}</dd>
            </div>
            <div>
              <dt>进度</dt>
              <dd>{{ task.progress }}%</dd>
            </div>
            <div>
              <dt>计费</dt>
              <dd>{{ task.estimatedPoints ?? '-' }}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h2>OpenReel 接入</h2>
          <p>
            当前任务已输出 pipeline-job，后续编辑器从该路径创建 OpenReel 项目。
          </p>
          <code>{{ task.renderPlan.editorIntegration.pipelineJobPath }}</code>
        </section>
      </aside>
    </section>
  </main>
</template>

<style scoped lang="scss">
.long-video-editor-page {
  min-height: 100vh;
  padding: 24px;
  background: var(--app-bg);
  color: var(--app-text);
}

.editor-head,
.state-card,
.video-panel,
.meta-panel section {
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-surface);
}

.editor-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
}

.editor-head p,
.editor-head span,
.meta-panel dt,
.meta-panel p {
  color: var(--app-text-soft);
}

.editor-head h1,
.meta-panel h2 {
  margin: 4px 0;
}

.editor-head button {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-surface-soft);
  color: var(--app-text);
  cursor: pointer;
  font: inherit;
  font-weight: 800;
}

.editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 16px;
  margin-top: 16px;
}

.video-panel {
  min-height: 70vh;
  overflow: hidden;
  background: #05070d;
}

.video-panel video,
.video-empty {
  width: 100%;
  height: 100%;
}

.video-panel video {
  display: block;
  object-fit: contain;
}

.video-empty,
.state-card {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  color: var(--app-text-soft);
}

.state-card {
  min-height: 240px;
  margin-top: 16px;
}

.state-card.is-error {
  color: #dc2626;
}

.video-empty svg,
.state-card svg {
  font-size: 34px;
}

.meta-panel {
  display: grid;
  align-content: start;
  gap: 16px;
}

.meta-panel section {
  padding: 16px;
}

.meta-panel dl {
  display: grid;
  gap: 10px;
  margin: 12px 0 0;
}

.meta-panel div {
  display: grid;
  gap: 4px;
}

.meta-panel dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  font-weight: 800;
}

.meta-panel code {
  display: block;
  overflow-wrap: anywhere;
  padding: 10px;
  border-radius: 8px;
  background: var(--app-surface-soft);
  font-size: 12px;
}

.is-spinning {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .editor-grid {
    grid-template-columns: 1fr;
  }
}
</style>
