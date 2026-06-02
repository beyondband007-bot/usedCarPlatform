<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useMessage } from "naive-ui";

import {
  createCreativeImageConversation,
  createCreativeImageGeneration,
  createInteriorCollageTask,
  createGenerationTask,
  getBatchTaskDetail,
  getCreativeImageConversations,
  getCreativeImageMessages,
  getGenerationTask,
  getRecentGenerationTasks,
  uploadCreativeImageReference,
  type BatchTaskDetail,
  type CreateGenerationTaskPayload,
  type CreativeImageConversation,
  type CreativeImageMessage,
  type GenerationTaskDetail,
  type GenerationTaskStatus,
  type RecentGenerationTask,
  type UploadedAsset,
} from "@/api/visual-workbench";
import CapabilityGeneratePanel from "@/components/business/workspace/CapabilityGeneratePanel.vue";
import CreativeImageStudioPanel from "@/components/business/workspace/CreativeImageStudioPanel.vue";
import WorkspaceAssistPanel from "@/components/business/workspace/WorkspaceAssistPanel.vue";
import WorkspaceSidebar from "@/components/business/workspace/WorkspaceSidebar.vue";
import {
  DEFAULT_GENERATION_OUTPUT_RATIO,
} from "@/constants/output-ratio";
import {
  defaultWorkspaceCapabilityCode,
  workspaceCapabilities,
} from "@/constants/workspace";
import { usePointsStore } from "@/stores/points";
import { useSubscriptionStore } from "@/stores/subscription";
import type {
  CreativeThreadTurn,
  WorkspaceBatchActiveJob,
  WorkspaceBatchCreatedPayload,
  WorkspaceDeliveryTaskPreview,
  WorkspaceGeneratePayload,
  WorkspaceGenerateResult,
  WorkspaceImagePreview,
  WorkspaceRecentItem,
} from "@/types/workspace";
import { isInteriorBatchItemKind } from "@/utils/batch-task";
import { formatDate } from "@/utils/dayjs";
import { useAppStore } from "@/stores/app";

const route = useRoute();
const router = useRouter();
const message = useMessage();
const appStore = useAppStore();
const pointsStore = usePointsStore();
const subscriptionStore = useSubscriptionStore();
const SHORT_VIDEO_CAPABILITY_CODE = "short-video";

function isShortVideoModuleCode(moduleCode?: string) {
  return moduleCode === SHORT_VIDEO_CAPABILITY_CODE;
}

function getViewMediaFailureMessage(moduleCode?: string) {
  return isShortVideoModuleCode(moduleCode) ? "查看视频失败" : "查看图片失败";
}
const INTERIOR_COLLAGE_CAPABILITY_CODE = "interior-stitch";
const ACTIVE_GENERATION_TASK_KEY = "workspace-active-generation-task";
const RECENT_GENERATION_SCAN_PAGE_SIZE = 50;
const runningGenerationStatuses = new Set([
  "waiting",
  "queued",
  "queue",
  "generating",
]);
const recentGenerationModuleCodes = workspaceCapabilities
  .filter(
    (capability) =>
      capability.code !== "batch-new" && capability.code !== "delivery",
  )
  .map((capability) => resolveModuleCodeForCapability(capability.code));

interface ActiveGenerationTaskSnapshot {
  taskId: string;
  moduleCode: string;
  optionId?: string;
}

function resolveCapabilityCode(code: unknown) {
  if (typeof code !== "string") return defaultWorkspaceCapabilityCode;
  return workspaceCapabilities.some((item) => item.code === code)
    ? code
    : defaultWorkspaceCapabilityCode;
}

const activeCode = ref(resolveCapabilityCode(route.params.code));
const generationResult = ref<WorkspaceGenerateResult | null>(null);
const creativeImageCaption = ref<string | null>(null);
const creativeConversations = ref<CreativeImageConversation[]>([]);
const creativeThreadTurns = ref<CreativeThreadTurn[]>([]);
const activeCreativeConversationId = ref<string | null>(null);
const creativeReferenceAsset = ref<UploadedAsset | null>(null);
const isUploadingCreativeReference = ref(false);
const isCreatingCreativeConversation = ref(false);
const isLoadingCreativeConversation = ref(false);
const deliveryImagePreview = ref<WorkspaceImagePreview | null>(null);
const deliveryTaskPreview = ref<WorkspaceDeliveryTaskPreview | null>(null);
const previewedDeliveryTaskId = ref<string | null>(null);
const isDeliveryListLoading = ref(false);
const isGenerating = ref(false);
const generatingCapabilityCode = ref<string | null>(null);
const shortVideoPlayRequest = ref(0);
const assistPanelRef = ref<InstanceType<typeof WorkspaceAssistPanel> | null>(
  null,
);
const batchActiveJobs = ref<WorkspaceBatchActiveJob[]>([]);
const trackedRunningTasks = ref<Record<string, string>>({});
let batchPollTimer: number | null = null;
let globalGenerationPollTimer: number | null = null;
let isRefreshingRunningTasks = false;

function resolveCapabilityCodeFromModule(moduleCode: string) {
  const matched = workspaceCapabilities.find(
    (capability) =>
      capability.code === moduleCode || capability.apiCode === moduleCode,
  );
  return matched?.code ?? null;
}

function resolveModuleCodeForCapability(code: string) {
  if (code === INTERIOR_COLLAGE_CAPABILITY_CODE) return "interior-collage";
  return code;
}

function readActiveGenerationTask() {
  const raw = window.localStorage.getItem(ACTIVE_GENERATION_TASK_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ActiveGenerationTaskSnapshot>;
    if (!parsed.taskId || !parsed.moduleCode) return null;
    return parsed as ActiveGenerationTaskSnapshot;
  } catch {
    return null;
  }
}

function saveActiveGenerationTask(task: ActiveGenerationTaskSnapshot) {
  window.localStorage.setItem(ACTIVE_GENERATION_TASK_KEY, JSON.stringify(task));
}

const ACTIVE_CREATIVE_CONVERSATION_KEY =
  "workspace-active-creative-conversation";

function readActiveCreativeConversationId() {
  return window.localStorage.getItem(ACTIVE_CREATIVE_CONVERSATION_KEY);
}

function saveActiveCreativeConversationId(conversationId: string | null) {
  if (!conversationId) {
    window.localStorage.removeItem(ACTIVE_CREATIVE_CONVERSATION_KEY);
    return;
  }

  window.localStorage.setItem(ACTIVE_CREATIVE_CONVERSATION_KEY, conversationId);
}

function clearActiveGenerationTask(taskId?: string) {
  if (!taskId) {
    window.localStorage.removeItem(ACTIVE_GENERATION_TASK_KEY);
    return;
  }

  const activeTask = readActiveGenerationTask();
  if (activeTask?.taskId === taskId) {
    window.localStorage.removeItem(ACTIVE_GENERATION_TASK_KEY);
  }
}

function isTerminalGenerationStatus(task: GenerationTaskDetail) {
  return (
    task.status === "success" ||
    task.status === "fail" ||
    task.status === "canceled"
  );
}

function isTerminalBatchStatus(
  status: GenerationTaskStatus | WorkspaceRecentItem["status"],
) {
  return status === "success" || status === "fail" || status === "canceled";
}

function mapBatchStatus(
  status: GenerationTaskStatus,
): WorkspaceRecentItem["status"] {
  if (status === "queued") return "queued";
  return status;
}

function normalizeRecentTaskStatus(task: RecentGenerationTask) {
  const status = task.uiStatus ?? task.status;
  return status === "queue" ? "queued" : status;
}

function isRunningGenerationStatus(status?: string | null) {
  return Boolean(status && runningGenerationStatuses.has(status));
}

function setTrackedRunningTasks(next: Record<string, string>) {
  trackedRunningTasks.value = next;
  pointsStore.setRunningTasks(Object.keys(next).length);

  if (Object.keys(next).length) {
    startGlobalGenerationPolling();
  } else {
    stopGlobalGenerationPolling();
  }
}

function trackRunningTask(taskId: string, moduleCode: string) {
  setTrackedRunningTasks({
    ...trackedRunningTasks.value,
    [taskId]: moduleCode,
  });
}

function stopGlobalGenerationPolling() {
  if (globalGenerationPollTimer !== null) {
    window.clearInterval(globalGenerationPollTimer);
    globalGenerationPollTimer = null;
  }
}

function startGlobalGenerationPolling() {
  if (globalGenerationPollTimer !== null) return;

  globalGenerationPollTimer = window.setInterval(() => {
    void pollTrackedRunningTasks();
  }, 4000);
}

function mapBatchDetailToJob(
  detail: BatchTaskDetail,
  existing: WorkspaceBatchActiveJob,
): WorkspaceBatchActiveJob {
  return {
    ...existing,
    status: mapBatchStatus(detail.status),
    total: detail.total,
    completed: detail.completed,
    failed: detail.failed,
    progress: detail.progress,
    items: detail.items.map((item) => ({
      itemId: item.itemId,
      groupTitle: item.groupTitle,
      itemKind: item.itemKind,
      status: mapBatchStatus(item.status),
      progress: item.progress,
      thumbnail: isInteriorBatchItemKind(item.itemKind)
        ? undefined
        : existing.previewUrl || undefined,
    })),
  };
}

function resolveCreativeMessageRatioLabel(message: CreativeImageMessage) {
  const outputRatio = message.metadata?.outputRatio;
  const resolution = message.metadata?.resolution;

  if (outputRatio && resolution) return `${outputRatio} · ${resolution}`;
  if (outputRatio) return `${outputRatio} · 2K`;
  return undefined;
}

function buildCreativeThreadTurns(
  messages: CreativeImageMessage[],
  conversation: CreativeImageConversation | null,
): CreativeThreadTurn[] {
  const turns: CreativeThreadTurn[] = [];
  let lastUserTurn: CreativeThreadTurn | null = null;

  for (const message of messages) {
    if (message.role === "assistant") {
      if (lastUserTurn) {
        lastUserTurn.taskId = message.taskId ?? lastUserTurn.taskId;
        lastUserTurn.ratioLabel =
          lastUserTurn.ratioLabel ?? resolveCreativeMessageRatioLabel(message);
        if (message.resultUrl) {
          lastUserTurn.resultUrl = message.resultUrl;
        }
      }
      continue;
    }

    const turn = {
      id: message.messageId,
      prompt: message.content,
      taskId: message.taskId ?? null,
      createdAt: message.createdAt,
      ratioLabel: resolveCreativeMessageRatioLabel(message),
      resultUrl: message.resultUrl ?? null,
      isGenerating: false,
    };
    turns.push(turn);
    lastUserTurn = turn;
  }

  if (!turns.length && conversation?.lastMessage) {
    turns.push({
      id: conversation.conversationId,
      prompt: conversation.lastMessage,
      taskId: conversation.lastTaskId,
      createdAt: conversation.updatedAt,
      resultUrl: conversation.lastResultUrl,
      isGenerating: Boolean(
        conversation.lastTaskId && !conversation.lastResultUrl,
      ),
    });
    return turns;
  }

  if (conversation?.lastTaskId) {
    const lastTurn = [...turns]
      .reverse()
      .find((turn) => turn.taskId === conversation.lastTaskId);
    if (lastTurn) {
      if (!lastTurn.resultUrl) {
        lastTurn.resultUrl = conversation.lastResultUrl;
      }
      lastTurn.isGenerating = Boolean(
        conversation.lastTaskId && !lastTurn.resultUrl,
      );
    }
  }

  return turns;
}

async function refreshBatchJob(batchId: string) {
  try {
    const detail = await getBatchTaskDetail(batchId);
    const index = batchActiveJobs.value.findIndex(
      (job) => job.batchId === batchId,
    );
    if (index < 0) return;
    batchActiveJobs.value[index] = mapBatchDetailToJob(
      detail,
      batchActiveJobs.value[index],
    );
  } catch {
    // Keep placeholder card visible while polling retries.
  }
}

function stopBatchPolling() {
  if (batchPollTimer !== null) {
    window.clearInterval(batchPollTimer);
    batchPollTimer = null;
  }
}

function shouldPollBatchJobs() {
  return batchActiveJobs.value.some(
    (job) => !isTerminalBatchStatus(job.status),
  );
}

function startBatchPolling() {
  stopBatchPolling();
  if (!shouldPollBatchJobs()) return;

  batchPollTimer = window.setInterval(() => {
    if (!shouldPollBatchJobs()) {
      stopBatchPolling();
      return;
    }

    for (const job of batchActiveJobs.value) {
      if (!isTerminalBatchStatus(job.status)) {
        void refreshBatchJob(job.batchId);
      }
    }
  }, 5000);
}

function handleBatchCreated(payload: WorkspaceBatchCreatedPayload) {
  batchActiveJobs.value.push({
    batchId: payload.batchId,
    projectName: payload.projectName,
    previewUrl: payload.previewUrl,
    createdAt: payload.createdAt,
    status: payload.status,
    total: payload.total,
    completed: payload.completed,
    failed: payload.failed,
    progress: payload.progress,
    items: [],
  });
  void refreshBatchJob(payload.batchId);
  startBatchPolling();
}

function syncWorkspaceFromTask(
  task: Pick<GenerationTaskDetail, "moduleCode" | "optionId">,
) {
  const matchedCapability = workspaceCapabilities.find(
    (capability) =>
      capability.code === task.moduleCode ||
      capability.apiCode === task.moduleCode,
  );

  if (!matchedCapability) return;

  activeCode.value = matchedCapability.code;

  if (route.params.code !== matchedCapability.code) {
    router.replace({
      name: "Workspace",
      params: { code: matchedCapability.code },
    });
  }

  if (
    task.optionId &&
    matchedCapability.options.some((item) => item.id === task.optionId)
  ) {
    selectedOptionId.value = task.optionId;
  }
}

function shouldSyncWorkspaceForTask(
  task: Pick<GenerationTaskDetail, "moduleCode">,
  options: { restored?: boolean } = {},
) {
  if (options.restored) return true;

  const taskCapabilityCode = resolveCapabilityCodeFromModule(task.moduleCode);
  if (!taskCapabilityCode) return false;

  return activeCode.value === taskCapabilityCode;
}

function getCapabilityLabel(code: string) {
  return (
    workspaceCapabilities.find((capability) => capability.code === code)
      ?.label ?? code
  );
}

async function refreshTrackedRunningTasks() {
  if (isRefreshingRunningTasks)
    return Object.keys(trackedRunningTasks.value).length;
  isRefreshingRunningTasks = true;

  try {
    const next: Record<string, string> = {};
    const activeTask = readActiveGenerationTask();

    if (activeTask?.taskId) {
      next[activeTask.taskId] = activeTask.moduleCode;
    }

    const results = await Promise.allSettled(
      recentGenerationModuleCodes.map((moduleCode) =>
        getRecentGenerationTasks({
          moduleCode,
          page: 1,
          pageSize: RECENT_GENERATION_SCAN_PAGE_SIZE,
        }).then((result) => ({ moduleCode, items: result.items })),
      ),
    );

    for (const result of results) {
      if (result.status !== "fulfilled") continue;

      for (const task of result.value.items) {
        const status = normalizeRecentTaskStatus(task);
        const taskId = task.taskId ?? task.id;
        if (!taskId || !isRunningGenerationStatus(status)) continue;

        next[taskId] = task.moduleCode ?? result.value.moduleCode;
      }
    }

    setTrackedRunningTasks(next);
    return Object.keys(next).length;
  } finally {
    isRefreshingRunningTasks = false;
  }
}

async function pollTrackedRunningTasks() {
  const entries = Object.entries(trackedRunningTasks.value);
  if (!entries.length) {
    stopGlobalGenerationPolling();
    return;
  }

  const next: Record<string, string> = { ...trackedRunningTasks.value };
  let hasTerminalTask = false;

  const results = await Promise.allSettled(
    entries.map(([taskId]) => getGenerationTask(taskId)),
  );

  for (const result of results) {
    if (result.status !== "fulfilled") continue;

    const task = result.value;
    if (isTerminalGenerationStatus(task)) {
      delete next[task.taskId];
      clearActiveGenerationTask(task.taskId);
      hasTerminalTask = true;
      continue;
    }

    next[task.taskId] = task.moduleCode;
  }

  setTrackedRunningTasks(next);

  if (hasTerminalTask) {
    if (activeCode.value === "creative-image") {
      void refreshCreativeConversations();
    }
    void assistPanelRef.value?.refreshRecentItems();
  }
}

async function refreshRunningTaskSummary() {
  await subscriptionStore.hydrate();

  if (!pointsStore.initialized) {
    await pointsStore.hydrate();
  }

  return refreshTrackedRunningTasks();
}

async function canStartGeneration() {
  const runningTasks = await refreshRunningTaskSummary();
  const limit = subscriptionStore.concurrentTaskLimit;

  if (runningTasks >= limit) {
    message.warning(
      `当前已有 ${runningTasks} 个任务正在生成，已达到套餐并发上限 ${limit} 个，请等待任务完成后再提交`,
    );
    return false;
  }

  return true;
}

watch(
  () => route.params.code,
  (code) => {
    const resolved = resolveCapabilityCode(code);
    activeCode.value = resolved;
    void refreshRunningTaskSummary();
  },
);

function handleSelectCapability(code: string) {
  activeCode.value = code;
  void refreshRunningTaskSummary();

  if (
    code === SHORT_VIDEO_CAPABILITY_CODE &&
    sidebarGeneratingCodes.value.includes(code)
  ) {
    assistPanelRef.value?.focusShortVideoGeneratingView?.();
  }

  if (route.params.code !== code) {
    router.replace({ name: "Workspace", params: { code } });
  }
}

const sidebarGeneratingCodes = computed(() => {
  const codes = new Set<string>();

  if (isGenerating.value && generatingCapabilityCode.value) {
    codes.add(generatingCapabilityCode.value);
  }

  if (batchActiveJobs.value.some((job) => !isTerminalBatchStatus(job.status))) {
    codes.add("batch-new");
  }

  for (const moduleCode of Object.values(trackedRunningTasks.value)) {
    const code = resolveCapabilityCodeFromModule(moduleCode);
    if (code) {
      codes.add(code);
    }
  }

  return [...codes];
});

const activeCapability = computed(
  () =>
    workspaceCapabilities.find(
      (capability) => capability.code === activeCode.value,
    ) ?? workspaceCapabilities[0],
);

const activeModuleGenerating = computed(() => {
  if (
    isGenerating.value &&
    generatingCapabilityCode.value === activeCode.value
  ) {
    return true;
  }

  return Object.values(trackedRunningTasks.value).some((moduleCode) => {
    const resolvedCode = resolveCapabilityCodeFromModule(moduleCode);
    return resolvedCode === activeCode.value;
  });
});

const activeCreativeConversation = computed(
  () =>
    creativeConversations.value.find(
      (item) => item.conversationId === activeCreativeConversationId.value,
    ) ?? null,
);

const hasActiveCreativeConversationDraft = computed(() => {
  const conversation = activeCreativeConversation.value;
  if (!conversation) return false;
  return (
    !conversation.lastMessage &&
    !conversation.lastTaskId &&
    !conversation.lastResultUrl &&
    !conversation.lastReferenceAssetId
  );
});

const selectedOptionId = ref(activeCapability.value.options[0]?.id ?? "");

watch(activeCode, () => {
  const capability = activeCapability.value;
  const hasSelected = capability.options.some(
    (item) => item.id === selectedOptionId.value,
  );

  if (!hasSelected) {
    selectedOptionId.value = capability.options[0]?.id ?? "";
  }

  generationResult.value = null;
  creativeImageCaption.value = null;
  deliveryImagePreview.value = null;
  deliveryTaskPreview.value = null;
  previewedDeliveryTaskId.value = null;
  isDeliveryListLoading.value = false;
});

function handlePreviewDeliveryTask(task: WorkspaceDeliveryTaskPreview | null) {
  deliveryTaskPreview.value = task;
  deliveryImagePreview.value = null;
  generationResult.value = null;
  previewedDeliveryTaskId.value = task?.id ?? null;
}

function handleDeliveryListLoadingChange(loading: boolean) {
  isDeliveryListLoading.value = loading;
}

function handleOpenDeliveryAssetResult(result: WorkspaceGenerateResult) {
  generationResult.value = result;
  deliveryImagePreview.value = null;
}

function handleOpenDeliveryImagePreview(preview: WorkspaceImagePreview) {
  deliveryImagePreview.value = preview;
  generationResult.value = null;
}

function clearDeliveryImagePreview() {
  if (deliveryImagePreview.value && deliveryTaskPreview.value) {
    deliveryImagePreview.value = null;
    return;
  }

  deliveryImagePreview.value = null;
  deliveryTaskPreview.value = null;
  previewedDeliveryTaskId.value = null;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function pollGenerationTask(taskId: string) {
  let latest: GenerationTaskDetail | null = null;

  for (let index = 0; index < 90; index += 1) {
    const task = await getGenerationTask(taskId);
    latest = task;

    if (isTerminalGenerationStatus(task)) {
      return task;
    }

    await sleep(index === 0 ? 1500 : 4000);
  }

  return latest;
}

function buildResultFromTask(
  task: GenerationTaskDetail,
): WorkspaceGenerateResult | null {
  const isShortVideo = task.moduleCode === SHORT_VIDEO_CAPABILITY_CODE;
  const image = task.resultImages[0];
  const videoUrl =
    task.resultVideos?.[0]?.url ??
    task.videoUrl ??
    task.previewVideo ??
    task.downloadUrl ??
    image?.url;
  const resultUrl = isShortVideo ? videoUrl : image?.url;
  if (!resultUrl) return null;

  const option = activeCapability.value.options.find(
    (item) => item.id === task.optionId,
  );
  const sceneTitle = isShortVideo
    ? "短视频生成"
    : (option?.title ?? activeCapability.value.label);
  const ratioLabel = isShortVideo
    ? `${task.outputRatio || "16:9"} · 720p · 10秒`
    : `${task.outputRatio} · ${task.resolution}`;

  return {
    createdAt: formatDate(task.updatedAt ?? task.createdAt ?? new Date()),
    statusText: isShortVideo
      ? `已完成 · ${sceneTitle} · 营销视频`
      : `已完成 · ${sceneTitle} · 单图生成结果`,
    ratioLabel,
    mediaType: isShortVideo ? "video" : "image",
    previewImage: isShortVideo ? "" : resultUrl,
    previewVideo: isShortVideo ? resultUrl : undefined,
    previewAlt: `${sceneTitle}生成结果`,
    downloadUrl: resultUrl,
    resultImages: task.resultImages,
    taskId: task.taskId,
    imageWidth: 1600,
    imageHeight: 900,
  };
}

function buildInteriorCollageResult(
  tasks: GenerationTaskDetail[],
  outputRatio: string,
  resolution: string,
): WorkspaceGenerateResult | null {
  const resultImages = tasks.flatMap((task) => task.resultImages ?? []);
  const firstImage = resultImages[0];

  if (!firstImage?.url) return null;

  return {
    createdAt: formatDate(
      tasks[0]?.updatedAt ?? tasks[0]?.createdAt ?? new Date(),
    ),
    statusText: `已完成 · 内饰拼图 · ${resultImages.length} 张结果图`,
    ratioLabel: `${outputRatio} · ${resolution}`,
    mediaType: "image",
    previewImage: firstImage.url,
    previewAlt: "内饰拼图生成结果",
    downloadUrl: firstImage.url,
    resultImages,
    taskId: tasks[0]?.taskId,
    imageWidth: 1600,
    imageHeight: 900,
  };
}

async function resolveInteriorCollageTasks(
  taskIds: string[],
  outputRatio: string,
  resolution: string,
) {
  const results = await Promise.allSettled(
    taskIds.map((taskId) => pollGenerationTask(taskId)),
  );
  const finishedTasks = results
    .filter(
      (result): result is PromiseFulfilledResult<GenerationTaskDetail | null> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value)
    .filter((task): task is GenerationTaskDetail => Boolean(task));

  const successTasks = finishedTasks.filter(
    (task) => task.status === "success",
  );
  const failedCount = finishedTasks.filter(
    (task) => task.status !== "success",
  ).length;

  if (failedCount > 0) {
    message.warning(`${failedCount} 个内饰拼图任务生成失败，其它任务不受影响`);
  }

  const result = buildInteriorCollageResult(
    successTasks,
    outputRatio,
    resolution,
  );
  if (!result) {
    message.warning("任务完成，但没有返回内饰拼图结果");
    return;
  }

  generationResult.value = result;
  clearActiveGenerationTask(result.taskId);
  await assistPanelRef.value?.refreshRecentItems();
}

async function resolveGenerationTask(
  taskId: string,
  options: { restored?: boolean } = {},
) {
  isGenerating.value = true;
  generationResult.value = null;
  let taskModuleCode: string | undefined;

  try {
    const initialTask = await getGenerationTask(taskId);
    taskModuleCode = initialTask.moduleCode;
    const taskCapabilityCode = resolveCapabilityCodeFromModule(
      initialTask.moduleCode,
    );
    generatingCapabilityCode.value = taskCapabilityCode ?? activeCode.value;
    const shouldSyncWorkspace = shouldSyncWorkspaceForTask(initialTask, options);

    if (shouldSyncWorkspace) {
      syncWorkspaceFromTask(initialTask);
    }

    const task = isTerminalGenerationStatus(initialTask)
      ? initialTask
      : await pollGenerationTask(taskId);
    taskModuleCode = task?.moduleCode ?? taskModuleCode;

    if (!task) {
      message.warning("任务仍在处理中，请稍后刷新查看");
      return;
    }

    const shouldSyncAfterPoll = shouldSyncWorkspaceForTask(task, options);
    if (shouldSyncAfterPoll) {
      syncWorkspaceFromTask(task);
    }

    if (task.status !== "success") {
      message.error(getViewMediaFailureMessage(task.moduleCode));
      return;
    }

    const result = buildResultFromTask(task);
    if (!result) {
      message.warning(
        isShortVideoModuleCode(task.moduleCode)
          ? "任务完成，但没有返回视频"
          : "任务完成，但没有返回图片",
      );
      return;
    }

    if (shouldSyncAfterPoll) {
      generationResult.value = result;
      if (!options.restored) {
        message.success("生成完成");
      }
    } else if (!options.restored) {
      const label = taskCapabilityCode
        ? getCapabilityLabel(taskCapabilityCode)
        : "任务";
      message.success(`${label}生成完成，可在「最近生成」中查看`);
    }
    if (
      task.moduleCode === "creative-image" &&
      activeCreativeConversationId.value
    ) {
      await refreshCreativeConversations();
    }
    await assistPanelRef.value?.refreshRecentItems();
  } catch (error) {
    clearActiveGenerationTask(taskId);
    message.error(getViewMediaFailureMessage(taskModuleCode));
  } finally {
    clearActiveGenerationTask(taskId);
    isGenerating.value = false;
    generatingCapabilityCode.value = null;
    void refreshRunningTaskSummary();
  }
}

async function refreshCreativeConversations() {
  try {
    const result = await getCreativeImageConversations({
      page: 1,
      pageSize: 20,
    });
    creativeConversations.value = result.items;
    const savedConversationId = readActiveCreativeConversationId();
    const nextConversationId =
      activeCreativeConversationId.value ??
      (savedConversationId &&
      result.items.some((item) => item.conversationId === savedConversationId)
        ? savedConversationId
        : result.items[0]?.conversationId);

    if (
      nextConversationId &&
      activeCreativeConversationId.value !== nextConversationId
    ) {
      activeCreativeConversationId.value = nextConversationId;
      saveActiveCreativeConversationId(nextConversationId);
    }

    if (nextConversationId) {
      await loadCreativeConversationThread(nextConversationId);
    }
  } catch {
    // 创意生图历史不影响当前生成流程。
  }
}

async function loadCreativeConversationThread(conversationId: string) {
  const conversation =
    creativeConversations.value.find(
      (item) => item.conversationId === conversationId,
    ) ?? null;

  creativeImageCaption.value = conversation?.lastMessage ?? null;
  isLoadingCreativeConversation.value = true;

  try {
    const result = await getCreativeImageMessages(conversationId);
    if (activeCreativeConversationId.value !== conversationId) return;
    creativeThreadTurns.value = buildCreativeThreadTurns(
      result.items,
      conversation,
    );
  } catch {
    if (activeCreativeConversationId.value !== conversationId) return;
    creativeThreadTurns.value = buildCreativeThreadTurns([], conversation);
  } finally {
    if (activeCreativeConversationId.value === conversationId) {
      isLoadingCreativeConversation.value = false;
    }
  }
}

async function ensureCreativeConversation(prompt?: string) {
  if (activeCreativeConversationId.value)
    return activeCreativeConversationId.value;

  const title = prompt?.trim().slice(0, 24) || "创意生图对话";
  const conversation = await createCreativeImageConversation({ title });
  activeCreativeConversationId.value = conversation.conversationId;
  saveActiveCreativeConversationId(conversation.conversationId);
  creativeConversations.value = [conversation, ...creativeConversations.value];
  return conversation.conversationId;
}

function syncCreativeConversationTitle(conversationId: string, prompt: string) {
  const title = prompt.trim().slice(0, 24);
  if (!title) return;

  creativeConversations.value = creativeConversations.value.map((item) =>
    item.conversationId === conversationId
      ? { ...item, title, lastMessage: prompt.trim() }
      : item,
  );
}

async function handleNewCreativeConversation() {
  if (isCreatingCreativeConversation.value) return;
  if (hasActiveCreativeConversationDraft.value) {
    message.info("当前已经是新对话");
    return;
  }

  isCreatingCreativeConversation.value = true;
  try {
    const conversation = await createCreativeImageConversation({
      title: "创意生图对话",
    });
    activeCreativeConversationId.value = conversation.conversationId;
    saveActiveCreativeConversationId(conversation.conversationId);
    creativeReferenceAsset.value = null;
    generationResult.value = null;
    creativeImageCaption.value = null;
    creativeThreadTurns.value = [];
    creativeConversations.value = [
      conversation,
      ...creativeConversations.value,
    ];
    message.success("已新建对话");
  } catch (error) {
    const text = error instanceof Error ? error.message : "新建对话失败";
    message.error(text);
  } finally {
    isCreatingCreativeConversation.value = false;
  }
}

function handleSelectCreativeConversation(conversationId: string) {
  activeCreativeConversationId.value = conversationId;
  saveActiveCreativeConversationId(conversationId);
  const conversation = creativeConversations.value.find(
    (item) => item.conversationId === conversationId,
  );
  creativeImageCaption.value = conversation?.lastMessage ?? null;
  generationResult.value = null;
  creativeThreadTurns.value = [];

  if (conversation?.lastTaskId) {
    void resolveGenerationTask(conversation.lastTaskId, { restored: true });
  }
  void loadCreativeConversationThread(conversationId);
}

async function handleUploadCreativeReference(file: File) {
  isUploadingCreativeReference.value = true;

  try {
    const conversationId = await ensureCreativeConversation();
    const asset = await uploadCreativeImageReference(conversationId, file);
    creativeReferenceAsset.value = asset;
    message.success("参考图上传成功");
    await refreshCreativeConversations();
    if (activeCreativeConversationId.value) {
      await loadCreativeConversationThread(activeCreativeConversationId.value);
    }
  } catch (error) {
    const text = error instanceof Error ? error.message : "参考图上传失败";
    message.error(text);
  } finally {
    isUploadingCreativeReference.value = false;
  }
}

function handleRemoveCreativeReference() {
  creativeReferenceAsset.value = null;
}

async function handleCreativeGenerate(payload: {
  prompt: string;
  outputRatio: string;
  resolution?: string;
  referenceAssetId?: string;
  useLastReference?: boolean;
  sourceTaskId?: string;
  sourceImageUrl?: string;
}) {
  if (!payload.prompt.trim()) {
    message.warning("请输入生成提示词");
    return;
  }

  if (!(await canStartGeneration())) {
    return;
  }

  isGenerating.value = true;
  generationResult.value = null;
  creativeImageCaption.value = null;
  generatingCapabilityCode.value = "creative-image";

  try {
    const conversationId = await ensureCreativeConversation(payload.prompt);
    const created = await createCreativeImageGeneration(conversationId, {
      prompt: payload.prompt,
      outputRatio: payload.outputRatio,
      resolution: payload.resolution ?? "2K",
      referenceAssetId:
        payload.referenceAssetId ?? creativeReferenceAsset.value?.assetId,
      useLastReference: payload.useLastReference,
      sourceTaskId: payload.sourceTaskId,
      sourceImageUrl: payload.sourceImageUrl,
    });
    saveActiveGenerationTask({
      taskId: created.taskId,
      moduleCode: created.moduleCode,
    });
    trackRunningTask(created.taskId, created.moduleCode);
    message.info("任务已创建，正在轮询生成结果", { duration: 3000 });
    await refreshRunningTaskSummary();
    creativeImageCaption.value = payload.prompt;
    syncCreativeConversationTitle(conversationId, payload.prompt);
    await refreshCreativeConversations();
    await loadCreativeConversationThread(conversationId);
    await resolveGenerationTask(created.taskId);
    await refreshCreativeConversations();
    await loadCreativeConversationThread(conversationId);
    await assistPanelRef.value?.refreshRecentItems();
  } catch (error) {
    clearActiveGenerationTask();
    const text =
      error instanceof Error ? error.message : "创意生图任务创建失败";
    message.error(text);
  } finally {
    isGenerating.value = false;
    generatingCapabilityCode.value = null;
  }
}

async function handleGenerate(payload: WorkspaceGeneratePayload) {
  if (activeCode.value === INTERIOR_COLLAGE_CAPABILITY_CODE) {
    const assetIds = [...new Set(payload.assetIds ?? [])];

    if (assetIds.length < 2 || assetIds.length > 10) {
      message.warning("请上传 2-10 张内饰图");
      return;
    }

    if (!(await canStartGeneration())) {
      return;
    }

    const outputRatio = payload.outputRatio || DEFAULT_GENERATION_OUTPUT_RATIO;
    const resolution = payload.resolution || "2K";

    isGenerating.value = true;
    generationResult.value = null;
    generatingCapabilityCode.value = INTERIOR_COLLAGE_CAPABILITY_CODE;

    try {
      const created = await createInteriorCollageTask({
        assetIds,
        outputRatio,
        resolution,
      });
      const taskIds = created.tasks.map((task) => task.taskId).filter(Boolean);

      if (!taskIds.length) {
        message.warning("内饰拼图任务创建失败，请稍后重试");
        return;
      }

      const firstTask = created.tasks[0];
      saveActiveGenerationTask({
        taskId: firstTask.taskId,
        moduleCode: firstTask.moduleCode || created.moduleCode,
        optionId: firstTask.optionId,
      });

      for (const task of created.tasks) {
        trackRunningTask(task.taskId, task.moduleCode || created.moduleCode);
      }

      message.info(`任务已创建，正在生成 ${created.outputCount} 张内饰拼图`, {
        duration: 3000,
      });
      await refreshRunningTaskSummary();
      await resolveInteriorCollageTasks(taskIds, outputRatio, resolution);
    } catch (error) {
      clearActiveGenerationTask();
      const text =
        error instanceof Error ? error.message : "内饰拼图任务创建失败";
      message.error(text);
    } finally {
      isGenerating.value = false;
      generatingCapabilityCode.value = null;
    }

    return;
  }

  if (!payload.inputAssetId) {
    message.warning("请先上传车辆图片");
    return;
  }

  if (activeCode.value === "interior-stitch") {
    message.info("内饰拼接功能暂未接入接口，当前仅展示效果图");
    return;
  }

  if (!(await canStartGeneration())) {
    return;
  }

  isGenerating.value = true;
  generationResult.value = null;
  const startedOnCode = activeCapability.value.code;
  generatingCapabilityCode.value = startedOnCode;

  try {
    const createPayload: CreateGenerationTaskPayload = {
      inputAssetId: payload.inputAssetId,
      optionId: payload.optionId,
      sceneReferenceImageUrl: payload.sceneReferenceImageUrl,
      useLogo: payload.useLogo,
      logoAssetId: payload.logoAssetId,
      colorCode: payload.colorCode,
      outputRatio:
        activeCode.value === SHORT_VIDEO_CAPABILITY_CODE
          ? "16:9"
          : payload.outputRatio || DEFAULT_GENERATION_OUTPUT_RATIO,
      extra:
        activeCode.value === SHORT_VIDEO_CAPABILITY_CODE
          ? { videoResolution: "720p" }
          : undefined,
    };

    const created = await createGenerationTask(
      activeCapability.value.code,
      createPayload,
    );
    saveActiveGenerationTask({
      taskId: created.taskId,
      moduleCode: created.moduleCode || activeCapability.value.code,
      optionId: created.optionId ?? payload.optionId,
    });
    trackRunningTask(
      created.taskId,
      created.moduleCode || activeCapability.value.code,
    );
    message.info("任务已创建，正在轮询生成结果", { duration: 3000 });
    await refreshRunningTaskSummary();

    await resolveGenerationTask(created.taskId);
  } catch (error) {
    clearActiveGenerationTask();
    const text = error instanceof Error ? error.message : "生成任务创建失败";
    message.error(text);
  } finally {
    isGenerating.value = false;
    generatingCapabilityCode.value = null;
  }
}

function buildResultFromRecent(
  item: WorkspaceRecentItem,
): WorkspaceGenerateResult | null {
  const isShortVideo = isShortVideoModuleCode(item.moduleCode);
  const mediaUrl = item.downloadUrl ?? item.previewImage;

  if (item.status !== "success" || !mediaUrl) return null;
  const sceneTitle = isShortVideo
    ? "短视频生成"
    : (item.sceneLabel ?? item.title);

  return {
    createdAt: formatDate(item.createdAt),
    statusText: isShortVideo
      ? `已完成 · ${sceneTitle} · 营销视频`
      : `已完成 · ${sceneTitle} · 单图生成结果`,
    ratioLabel: isShortVideo
      ? `${item.outputRatio ?? "16:9"} · 720p · 10秒`
      : (item.ratioLabel ??
        (item.outputRatio ? `${item.outputRatio} · 2K` : "主图")),
    mediaType: isShortVideo ? "video" : "image",
    previewImage: isShortVideo ? "" : (item.previewImage ?? mediaUrl),
    previewVideo: isShortVideo ? mediaUrl : undefined,
    previewAlt: item.title,
    downloadUrl: mediaUrl,
    taskId: item.taskId,
    imageWidth: item.imageWidth,
    imageHeight: item.imageHeight,
  };
}

function handlePickRecent(item: WorkspaceRecentItem) {
  if (item.status === "fail" || item.status === "canceled") {
    message.error(getViewMediaFailureMessage(item.moduleCode));
    return;
  }

  if (item.status === "success") {
    const result = buildResultFromRecent(item);
    if (result) {
      generationResult.value = result;
      return;
    }

    message.error(getViewMediaFailureMessage(item.moduleCode));
    return;
  }

  if (item.taskId) {
    void resolveGenerationTask(item.taskId, { restored: true });
  }
}

function clearGenerationResult() {
  generationResult.value = null;
}

function handlePickTemplate(payload: {
  capabilityCode: string;
  optionId: string;
}) {
  selectedOptionId.value = payload.optionId;
  activeCode.value = payload.capabilityCode;
  generationResult.value = null;
}

onMounted(() => {
  void refreshRunningTaskSummary();
  void refreshCreativeConversations();

  const activeTask = readActiveGenerationTask();
  if (!activeTask) return;

  syncWorkspaceFromTask({
    moduleCode: activeTask.moduleCode,
    optionId: activeTask.optionId,
  });

  void resolveGenerationTask(activeTask.taskId, { restored: true });
});

onUnmounted(() => {
  stopGlobalGenerationPolling();
  stopBatchPolling();
});
</script>

<template>
  <main
    class="workspace-page bg-[var(--app-bg)]"
    :class="[
      appStore.isDarkMode ? 'theme-dark' : 'theme-light',
      {
        'workspace-page--feature-compare':
          activeCode === 'watermark-remove' ||
          activeCode === 'paint-refresh' ||
          activeCode === 'light-consistency' ||
          activeCode === 'interior-clean' ||
          activeCode === 'interior-stitch',
        'workspace-page--creative-image': activeCode === 'creative-image',
      },
    ]"
  >
    <section
      class="workspace-shell"
      :class="{ 'workspace-shell--studio': activeCode === 'creative-image' }"
    >
      <div class="workspace-col workspace-col--nav">
        <WorkspaceSidebar
          :active-code="activeCode"
          :generating-codes="sidebarGeneratingCodes"
          @select="handleSelectCapability"
        />
      </div>

      <section
        class="workspace-col workspace-col--main"
        :class="{
          'workspace-col--batch': activeCapability.kind === 'batch',
          'workspace-col--delivery': activeCapability.kind === 'delivery',
          'workspace-col--studio': activeCode === 'creative-image',
        }"
      >
        <div class="workspace-col-scroll">
          <CreativeImageStudioPanel
            v-if="activeCode === 'creative-image'"
            :capability="activeCapability"
            :is-generating="activeModuleGenerating"
            :is-uploading-reference="isUploadingCreativeReference"
            :generation-result="generationResult"
            :caption="creativeImageCaption"
            :conversations="creativeConversations"
            :thread-turns="creativeThreadTurns"
            :is-loading-conversation="isLoadingCreativeConversation"
            :active-conversation-id="activeCreativeConversationId"
            :is-new-conversation-disabled="
              isCreatingCreativeConversation ||
              hasActiveCreativeConversationDraft
            "
            :reference-asset="creativeReferenceAsset"
            @generate="handleCreativeGenerate"
            @new-conversation="handleNewCreativeConversation"
            @select-conversation="handleSelectCreativeConversation"
            @upload-reference="handleUploadCreativeReference"
            @remove-reference="handleRemoveCreativeReference"
          />
          <CapabilityGeneratePanel
            v-else
            :key="`${activeCapability.code}-${appStore.isDarkMode ? 'dark' : 'light'}`"
            :capability="activeCapability"
            :selected-option-id="selectedOptionId"
            :is-generating="activeModuleGenerating"
            :previewed-delivery-task-id="previewedDeliveryTaskId"
            @select-option="selectedOptionId = $event"
            @generate="handleGenerate"
            @preview-delivery-task="handlePreviewDeliveryTask"
            @delivery-list-loading-change="handleDeliveryListLoadingChange"
            @batch-created="handleBatchCreated"
          />
        </div>
      </section>

      <div
        v-if="activeCode !== 'creative-image'"
        class="workspace-col workspace-col--assist"
      >
        <WorkspaceAssistPanel
          ref="assistPanelRef"
          :key="`${activeCapability.code}-${appStore.isDarkMode ? 'dark' : 'light'}-assist`"
          :capability="activeCapability"
          :selected-option-id="selectedOptionId"
          :is-generating="activeModuleGenerating"
          :generation-result="generationResult"
          :delivery-task-preview="deliveryTaskPreview"
          :delivery-image-preview="deliveryImagePreview"
          :delivery-list-loading="isDeliveryListLoading"
          :short-video-play-request="shortVideoPlayRequest"
          :batch-active-jobs="batchActiveJobs"
          @back-from-result="clearGenerationResult"
          @close-delivery-image-preview="clearDeliveryImagePreview"
          @open-delivery-image-preview="handleOpenDeliveryImagePreview"
          @open-delivery-asset-result="handleOpenDeliveryAssetResult"
          @pick-template="handlePickTemplate"
          @pick-recent="handlePickRecent"
        />
      </div>
    </section>
  </main>
</template>

<style scoped lang="scss">
.workspace-page {
  --workspace-accent: #2f6bff;
  --workspace-accent-strong: #2f6bff;
  --workspace-panel: #ffffff;
  --workspace-panel-soft: #f7fafd;
  --workspace-panel-deep: #f7fafd;
  --workspace-line: #d6e0ed;
  --workspace-line-strong: #aebfd5;
  --workspace-muted: #64748b;
  --workspace-shadow: 0 18px 42px rgba(78, 111, 148, 0.11);

  display: flex;
  width: 100%;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  color: var(--app-text);
  background: var(--app-bg);
}

.workspace-page.theme-dark {
  --workspace-accent: #efc24c;
  --workspace-accent-strong: #ffd75a;
  --workspace-panel: #101010;
  --workspace-panel-soft: #151515;
  --workspace-panel-deep: #080808;
  --workspace-line: rgba(255, 255, 255, 0.12);
  --workspace-line-strong: rgba(239, 194, 76, 0.42);
  --workspace-muted: #969186;
  --workspace-shadow: 0 24px 60px rgba(0, 0, 0, 0.34);
}

.workspace-page.theme-light {
  --app-border: #d6e0ed;
  --workspace-text: #172033;
  --workspace-text-secondary: #334155;
  --workspace-muted: #64748b;
  --workspace-text-placeholder: #94a3b8;
  --workspace-text-disabled: #cbd5e1;
  --workspace-accent: #2f6bff;
  --workspace-accent-strong: #2f6bff;
  --workspace-accent-border: #b8cdf4;
  --workspace-accent-bg: #f2f7ff;
  --workspace-accent-glow: rgba(47, 107, 255, 0.16);
  --workspace-accent-underline: #4f7fff;
  --workspace-hover-bg: #f3f7fc;
  --workspace-commercial: #d89a00;
  --workspace-commercial-strong: #d4a017;
  --workspace-commercial-bg: #fff8e8;
  --workspace-tag-available-bg: #eaf8f1;
  --workspace-tag-available-text: #00a870;
  --workspace-tag-demo-bg: #fff4e5;
  --workspace-tag-demo-text: #f59e0b;
  --workspace-tag-beta-bg: #eef4ff;
  --workspace-tag-beta-text: #2f6bff;
  --workspace-tag-planned-bg: #f1f5f9;
  --workspace-tag-planned-text: #94a3b8;
  --workspace-panel: #ffffff;
  --workspace-panel-soft: #f7fafd;
  --workspace-panel-deep: #f7fafd;
  --workspace-line: #d6e0ed;
  --workspace-line-strong: #aebfd5;
  --workspace-shadow:
    0 0 0 1px rgba(174, 191, 213, 0.2), 0 18px 42px rgba(78, 111, 148, 0.11);

  color: var(--workspace-text);

  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 0 !important;
  transform: none !important;
  background: var(--app-bg) !important;
}

.workspace-page.theme-light .workspace-col--main {
  border-color: var(--workspace-line);
  background: var(--workspace-panel);
  box-shadow: var(--workspace-shadow);
}

.workspace-page.theme-light .workspace-shell {
  background: #eef4fb;
}

.workspace-shell {
  display: grid;
  width: 100%;
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

.workspace-col--assist > :deep(*) {
  flex: 1;
  min-height: 0;
  width: 100%;
}

.workspace-col--main {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--workspace-line);
  border-radius: 20px;
  background: var(--workspace-panel);
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

.workspace-page--feature-compare .workspace-shell {
  @media (width >= 1024px) {
    grid-template-columns: 240px minmax(340px, 430px) minmax(0, 1fr);
  }

  @media (width >= 1536px) {
    grid-template-columns: 260px minmax(360px, 440px) minmax(0, 1fr);
  }
}

.workspace-page--creative-image .workspace-shell {
  @media (width >= 1024px) {
    grid-template-columns: 240px minmax(0, 1fr);
  }

  @media (width >= 1536px) {
    grid-template-columns: 260px minmax(0, 1fr);
  }
}

.workspace-page--creative-image .workspace-col--main {
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.workspace-col--studio {
  border-radius: 0;
}

.workspace-col--studio .workspace-col-scroll {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.workspace-col--studio .workspace-col-scroll > :deep(*) {
  flex: 1;
  min-height: 0;
}
</style>
