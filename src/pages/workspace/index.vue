<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'

import { createGenerationTask, getGenerationTask, type GenerationTaskDetail, type CreateGenerationTaskPayload } from '@/api/visual-workbench'
import CapabilityGeneratePanel from '@/components/business/workspace/CapabilityGeneratePanel.vue'
import WorkspaceAssistPanel from '@/components/business/workspace/WorkspaceAssistPanel.vue'
import WorkspaceSidebar from '@/components/business/workspace/WorkspaceSidebar.vue'
import { defaultWorkspaceCapabilityCode, workspaceCapabilities } from '@/constants/workspace'
import { SHORT_VIDEO_BETA_MESSAGE } from '@/constants/short-video-beta'
import type {
  WorkspaceDeliveryTaskPreview,
  WorkspaceGeneratePayload,
  WorkspaceGenerateResult,
  WorkspaceImagePreview,
  WorkspaceRecentItem,
} from '@/types/workspace'
import { buildImagePreviewFromDeliveryTask } from '@/utils/workspace-image-preview'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const appStore = useAppStore()
const SHORT_VIDEO_CAPABILITY_CODE = 'future-short-video'
const ACTIVE_GENERATION_TASK_KEY = 'workspace-active-generation-task'

interface ActiveGenerationTaskSnapshot {
  taskId: string
  moduleCode: string
  optionId?: string
}

function resolveCapabilityCode(code: unknown) {
  if (typeof code !== 'string') return defaultWorkspaceCapabilityCode
  return workspaceCapabilities.some((item) => item.code === code) ? code : defaultWorkspaceCapabilityCode
}

const activeCode = ref(resolveCapabilityCode(route.params.code))
const generationResult = ref<WorkspaceGenerateResult | null>(null)
const deliveryImagePreview = ref<WorkspaceImagePreview | null>(null)
const previewedDeliveryTaskId = ref<string | null>(null)
const isGenerating = ref(false)
const shortVideoPlayRequest = ref(0)

function readActiveGenerationTask() {
  const raw = window.localStorage.getItem(ACTIVE_GENERATION_TASK_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<ActiveGenerationTaskSnapshot>
    if (!parsed.taskId || !parsed.moduleCode) return null
    return parsed as ActiveGenerationTaskSnapshot
  } catch {
    return null
  }
}

function saveActiveGenerationTask(task: ActiveGenerationTaskSnapshot) {
  window.localStorage.setItem(ACTIVE_GENERATION_TASK_KEY, JSON.stringify(task))
}

function clearActiveGenerationTask(taskId?: string) {
  if (!taskId) {
    window.localStorage.removeItem(ACTIVE_GENERATION_TASK_KEY)
    return
  }

  const activeTask = readActiveGenerationTask()
  if (activeTask?.taskId === taskId) {
    window.localStorage.removeItem(ACTIVE_GENERATION_TASK_KEY)
  }
}

function isTerminalGenerationStatus(task: GenerationTaskDetail) {
  return task.status === 'success' || task.status === 'fail' || task.status === 'canceled'
}

function syncWorkspaceFromTask(task: Pick<GenerationTaskDetail, 'moduleCode' | 'optionId'>) {
  const matchedCapability = workspaceCapabilities.find(
    (capability) => capability.code === task.moduleCode || capability.apiCode === task.moduleCode,
  )

  if (!matchedCapability) return

  activeCode.value = matchedCapability.code

  if (route.params.code !== matchedCapability.code) {
    router.replace({ name: 'Workspace', params: { code: matchedCapability.code } })
  }

  if (task.optionId && matchedCapability.options.some((item) => item.id === task.optionId)) {
    selectedOptionId.value = task.optionId
  }
}

watch(
  () => route.params.code,
  (code, previousCode) => {
    const resolved = resolveCapabilityCode(code)
    activeCode.value = resolved

    if (resolved === SHORT_VIDEO_CAPABILITY_CODE && previousCode !== code) {
      notifyShortVideoBeta()
    }
  },
)

function notifyShortVideoBeta() {
  message.info(SHORT_VIDEO_BETA_MESSAGE, { duration: 4500 })
}

function handleSelectCapability(code: string) {
  activeCode.value = code

  if (route.params.code !== code) {
    router.replace({ name: 'Workspace', params: { code } })
    return
  }

  if (code === SHORT_VIDEO_CAPABILITY_CODE) {
    notifyShortVideoBeta()
  }
}

const activeCapability = computed(
  () => workspaceCapabilities.find((capability) => capability.code === activeCode.value) ?? workspaceCapabilities[0],
)

const selectedOptionId = ref(activeCapability.value.options[0]?.id ?? '')

watch(activeCode, () => {
  const capability = activeCapability.value
  const hasSelected = capability.options.some((item) => item.id === selectedOptionId.value)

  if (!hasSelected) {
    selectedOptionId.value = capability.options[0]?.id ?? ''
  }

  generationResult.value = null
  deliveryImagePreview.value = null
  previewedDeliveryTaskId.value = null
})

function handlePreviewDeliveryTask(task: WorkspaceDeliveryTaskPreview) {
  deliveryImagePreview.value = buildImagePreviewFromDeliveryTask(task)
  previewedDeliveryTaskId.value = task.id
}

function handleOpenDeliveryImagePreview(preview: WorkspaceImagePreview) {
  deliveryImagePreview.value = preview
  previewedDeliveryTaskId.value = null
}

function clearDeliveryImagePreview() {
  deliveryImagePreview.value = null
  previewedDeliveryTaskId.value = null
}

function formatGenerateTime(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function pollGenerationTask(taskId: string) {
  let latest: GenerationTaskDetail | null = null

  for (let index = 0; index < 90; index += 1) {
    const task = await getGenerationTask(taskId)
    latest = task

    if (isTerminalGenerationStatus(task)) {
      return task
    }

    await sleep(index === 0 ? 1500 : 4000)
  }

  return latest
}

function buildResultFromTask(task: GenerationTaskDetail): WorkspaceGenerateResult | null {
  const image = task.resultImages[0]
  if (!image?.url) return null

  const option = activeCapability.value.options.find((item) => item.id === task.optionId)
  const sceneTitle = option?.title ?? activeCapability.value.label

  return {
    createdAt: task.updatedAt ?? task.createdAt ?? formatGenerateTime(),
    statusText: `已完成 · ${sceneTitle} · 单图生成结果`,
    ratioLabel: `${task.outputRatio} · ${task.resolution}`,
    previewImage: image.url,
    previewAlt: `${sceneTitle}生成结果`,
    downloadUrl: image.url,
    imageWidth: 1600,
    imageHeight: 900,
  }
}

async function resolveGenerationTask(taskId: string, options: { restored?: boolean } = {}) {
  isGenerating.value = true
  generationResult.value = null

  try {
    const initialTask = await getGenerationTask(taskId)
    syncWorkspaceFromTask(initialTask)

    const task = isTerminalGenerationStatus(initialTask)
      ? initialTask
      : await pollGenerationTask(taskId)

    if (!task) {
      message.warning('任务仍在处理中，请稍后刷新查看')
      return
    }

    syncWorkspaceFromTask(task)

    if (task.status !== 'success') {
      message.error(task.error?.message || '生成任务失败')
      return
    }

    const result = buildResultFromTask(task)
    if (!result) {
      message.warning('任务完成，但没有返回图片')
      return
    }

    generationResult.value = result
    if (!options.restored) {
      message.success('生成完成')
    }
  } catch (error) {
    clearActiveGenerationTask(taskId)
    const text = error instanceof Error ? error.message : '生成任务查询失败'
    message.error(text)
  } finally {
    clearActiveGenerationTask(taskId)
    isGenerating.value = false
  }
}

async function handleGenerate(payload: WorkspaceGeneratePayload) {
  if (activeCode.value === SHORT_VIDEO_CAPABILITY_CODE) {
    shortVideoPlayRequest.value += 1
    message.success('演示视频已开始播放')
    return
  }

  isGenerating.value = true
  generationResult.value = null

  try {
    const createPayload: CreateGenerationTaskPayload = {
      inputAssetId: payload.inputAssetId,
      optionId: payload.optionId,
      useLogo: payload.useLogo,
      colorCode: payload.colorCode,
    }

    const created = await createGenerationTask(activeCapability.value.code, createPayload)
    saveActiveGenerationTask({
      taskId: created.taskId,
      moduleCode: created.moduleCode || activeCapability.value.code,
      optionId: created.optionId ?? payload.optionId,
    })
    message.info('任务已创建，正在轮询生成结果', { duration: 3000 })

    await resolveGenerationTask(created.taskId)
  } catch (error) {
    clearActiveGenerationTask()
    const text = error instanceof Error ? error.message : '生成任务创建失败'
    message.error(text)
  } finally {
    isGenerating.value = false
  }
}

function buildResultFromRecent(item: WorkspaceRecentItem): WorkspaceGenerateResult | null {
  if (item.status !== 'success' || !item.previewImage) return null

  return {
    createdAt: item.createdAt,
    statusText: `已完成 · ${item.sceneLabel ?? item.title} · 单图生成结果`,
    ratioLabel: item.ratioLabel ?? '主图',
    previewImage: item.previewImage,
    previewAlt: item.title,
    downloadUrl: item.previewImage,
    imageWidth: item.imageWidth,
    imageHeight: item.imageHeight,
  }
}

function handlePickRecent(item: WorkspaceRecentItem) {
  const result = buildResultFromRecent(item)
  if (result) generationResult.value = result
}

function clearGenerationResult() {
  generationResult.value = null
}

function handlePickTemplate(payload: { capabilityCode: string; optionId: string }) {
  selectedOptionId.value = payload.optionId
  activeCode.value = payload.capabilityCode
  generationResult.value = null
}

onMounted(() => {
  const activeTask = readActiveGenerationTask()
  if (!activeTask) return

  syncWorkspaceFromTask({
    moduleCode: activeTask.moduleCode,
    optionId: activeTask.optionId,
  })

  void resolveGenerationTask(activeTask.taskId, { restored: true })
})

</script>

<template>
  <main
    class="workspace-page bg-[var(--app-bg)]"
    :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'"
  >
    <section class="workspace-shell">
      <div class="workspace-col workspace-col--nav">
        <WorkspaceSidebar :active-code="activeCode" @select="handleSelectCapability" />
      </div>

      <section
        class="workspace-col workspace-col--main"
        :class="{
          'workspace-col--batch': activeCapability.kind === 'batch',
          'workspace-col--delivery': activeCapability.kind === 'delivery',
        }"
      >
        <div class="workspace-col-scroll">
          <CapabilityGeneratePanel
            :capability="activeCapability"
            :selected-option-id="selectedOptionId"
            :is-generating="isGenerating"
            :previewed-delivery-task-id="previewedDeliveryTaskId"
            @select-option="selectedOptionId = $event"
            @generate="handleGenerate"
            @preview-delivery-task="handlePreviewDeliveryTask"
          />
        </div>
      </section>

      <div class="workspace-col workspace-col--assist">
        <WorkspaceAssistPanel
          :capability="activeCapability"
          :selected-option-id="selectedOptionId"
          :is-generating="isGenerating"
          :generation-result="generationResult"
          :delivery-image-preview="deliveryImagePreview"
          :short-video-play-request="shortVideoPlayRequest"
          @back-from-result="clearGenerationResult"
          @close-delivery-image-preview="clearDeliveryImagePreview"
          @open-delivery-image-preview="handleOpenDeliveryImagePreview"
          @pick-template="handlePickTemplate"
          @pick-recent="handlePickRecent"
        />
      </div>
    </section>
  </main>
</template>

<style scoped lang="scss">
.workspace-page {
  --workspace-accent: #efc24c;
  --workspace-accent-strong: #ffd75a;
  --workspace-panel: #101010;
  --workspace-panel-soft: #151515;
  --workspace-panel-deep: #080808;
  --workspace-line: rgba(255, 255, 255, 0.12);
  --workspace-line-strong: rgba(239, 194, 76, 0.42);
  --workspace-muted: #969186;
  --workspace-shadow: 0 24px 60px rgba(0, 0, 0, 0.34);

  display: flex;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  color: var(--app-text);
  background:
    radial-gradient(circle at 30% 0%, rgba(239, 194, 76, 0.08), transparent 28rem),
    var(--app-bg);
}

.workspace-page.theme-light {
  --workspace-accent: #c98600;
  --workspace-accent-strong: #a86d00;
  --workspace-panel: #fcfaf5;
  --workspace-panel-soft: #f5efe4;
  --workspace-panel-deep: #eee6da;
  --workspace-line: rgba(47, 35, 12, 0.12);
  --workspace-line-strong: rgba(201, 134, 0, 0.34);
  --workspace-muted: #6b6252;
  --workspace-shadow: 0 20px 46px rgba(67, 47, 16, 0.1);

  background:
    radial-gradient(circle at 30% 0%, rgba(201, 134, 0, 0.06), transparent 28rem),
    var(--app-bg);
}

.workspace-page.theme-light .workspace-col--main {
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.72), transparent 42%),
    var(--workspace-panel);
}

.workspace-shell {
  display: grid;
  min-height: 0;
  flex: 1;
  height: 100%;
  gap: 0;
  overflow: hidden;
  grid-template-columns: minmax(0, 1fr);
  background: var(--workspace-panel-deep);

  @media (width >= 1024px) {
    gap: 14px;
    grid-template-columns: 240px minmax(360px, 500px) minmax(0, 1fr);
    padding: 16px;
  }

  @media (width >= 1536px) {
    grid-template-columns: 260px minmax(380px, 520px) minmax(0, 1fr);
    padding: 18px;
  }
}

.workspace-col {
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.workspace-col--nav,
.workspace-col--assist {
  display: flex;
  flex-direction: column;
}

.workspace-col--main {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--workspace-line);
  border-radius: 18px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.035), transparent 36%),
    var(--workspace-panel);
  box-shadow: var(--workspace-shadow);
}

.workspace-col-scroll {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 20px 20px 32px;

  @media (width >= 1024px) {
    padding: 32px 32px 40px;
  }
}

.workspace-col--batch .workspace-col-scroll,
.workspace-col--delivery .workspace-col-scroll {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-bottom: clamp(12px, 1.5vw, 20px);

  @media (width >= 1024px) {
    padding: clamp(20px, 2vw, 28px) clamp(20px, 2vw, 28px)
      clamp(12px, 1.5vw, 20px);
  }
}

@media (width < 1024px) {
  .workspace-page {
    height: auto;
    max-height: none;
    min-height: calc(100dvh - var(--app-header-offset));
    overflow: visible;
  }

  .workspace-shell {
    height: auto;
    flex: none;
    overflow: visible;
    background: var(--app-bg);
  }

  .workspace-col {
    height: auto;
    overflow: visible;
  }

  .workspace-col--main {
    border-radius: 0;
    border-inline: 0;
  }

  .workspace-col-scroll {
    overflow: visible;
  }
}
</style>
