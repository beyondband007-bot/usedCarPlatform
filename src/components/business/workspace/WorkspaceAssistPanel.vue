<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { Icon } from "@iconify/vue";
import { useDialog, useMessage } from "naive-ui";

import {
  deleteRecentGenerationTask,
  getRecentGenerationTasks,
  type RecentGenerationTask,
} from "@/api/visual-workbench";
import SceneTemplateRecommendations, {
  type SceneTemplateRecommendationItem,
} from "@/components/business/workspace/SceneTemplateRecommendations.vue";
import ShortVideoBetaPanel from "@/components/business/workspace/ShortVideoBetaPanel.vue";
import WorkspaceTutorialGuide from "@/components/business/workspace/WorkspaceTutorialGuide.vue";
import PreloadImage from "@/components/common/PreloadImage.vue";
import WorkspaceGenerateResultPanel from "@/components/business/workspace/WorkspaceGenerateResultPanel.vue";
import WorkspaceImagePreviewPanel from "@/components/business/workspace/WorkspaceImagePreviewPanel.vue";
import { formatOutputRatioLabel } from "@/constants/output-ratio";
import { RECENT_REFRESH_MS } from "@/constants/workspace-polling";
import { workspaceTemplateRecommendations } from "@/constants/workspace";
import { useAppStore } from "@/stores/app";
import { useRecentGenerateStore } from "@/stores/recentGenerate";
import {
  RECENT_GENERATE_STALE_MS,
  resolveRecentGenerateCacheKey,
} from "@/utils/recent-generate-cache";
import { downloadFilesAsZip, sanitizeFilename } from "@/utils/download";
import { resolveBatchRecentSceneLabel } from "@/utils/batch-display-title";
import {
  getBatchItemKindLabel,
  isInteriorBatchItemKind,
} from "@/utils/batch-task";
import { formatDate } from "@/utils/dayjs";
import {
  recentStatusIconMap,
  recentStatusLabelMap,
  resolveWorkspaceOptionTitle,
} from "@/utils/workspace-recent";
import {
  isWorkspaceFeatureCompareCode,
  workspaceFeatureCompareMap,
} from "@/constants/workspace-feature-compare";
import type {
  WorkspaceBatchActiveJob,
  WorkspaceCapability,
  WorkspaceDeliveryTaskPreview,
  WorkspaceGenerateResult,
  WorkspaceImagePreview,
  WorkspaceRecentItem,
} from "@/types/workspace";

const props = defineProps<{
  capability: WorkspaceCapability;
  selectedOptionId: string;
  isGenerating?: boolean;
  generationResult?: WorkspaceGenerateResult | null;
  deliveryTaskPreview?: WorkspaceDeliveryTaskPreview | null;
  deliveryImagePreview?: WorkspaceImagePreview | null;
  deliveryListLoading?: boolean;
  shortVideoPlayRequest?: number;
  shortVideoSessionPreview?: WorkspaceGenerateResult | null;
  batchActiveJobs?: WorkspaceBatchActiveJob[];
}>();

const emit = defineEmits<{
  backFromResult: [];
  closeDeliveryImagePreview: [];
  openDeliveryImagePreview: [preview: WorkspaceImagePreview];
  openDeliveryAssetResult: [result: WorkspaceGenerateResult];
  openDeliveryPendingAsset: [
    payload: { deliveryTaskId: string; generationTaskId: string },
  ];
  pickTemplate: [payload: { capabilityCode: string; optionId: string }];
  pickRecent: [item: WorkspaceRecentItem];
}>();

function canOpenRecent(item: WorkspaceRecentItem) {
  return (
    Boolean(item.taskId) ||
    (item.status === "success" && Boolean(item.previewImage))
  );
}

function handleRecentPick(item: WorkspaceRecentItem) {
  if (!canOpenRecent(item)) return;
  saveRecentScrollPosition();
  persistRecentCache();
  emit("pickRecent", item);
}

function resolveRecentTaskId(item: WorkspaceRecentItem) {
  return item.taskId ?? item.id;
}

function isDeletingRecent(item: WorkspaceRecentItem) {
  const taskId = resolveRecentTaskId(item);
  return taskId ? deletingRecentIds.value.includes(taskId) : false;
}

function removeRecentItem(taskId: string) {
  recentItems.value = recentItems.value.filter(
    (entry) => resolveRecentTaskId(entry) !== taskId,
  );
  persistRecentCache();
}

function handleDeleteRecent(item: WorkspaceRecentItem) {
  const taskId = resolveRecentTaskId(item);
  if (!taskId || isDeletingRecent(item)) return;

  dialog.warning({
    title: "删除记录",
    content: `确定删除「${item.title}」吗？删除后不可恢复。`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: () => {
      deletingRecentIds.value = [...deletingRecentIds.value, taskId];
      return deleteRecentGenerationTask(taskId)
        .then(() => {
          removeRecentItem(taskId);
          if (props.generationResult?.taskId === taskId) {
            emit("backFromResult");
          }
          message.success("已删除");
        })
        .catch((error: unknown) => {
          const text = error instanceof Error ? error.message : "删除失败";
          message.error(text);
        })
        .finally(() => {
          deletingRecentIds.value = deletingRecentIds.value.filter(
            (id) => id !== taskId,
          );
        });
    },
  });
}

const templateDescriptionMap: Record<string, string> = {
  经典白棚: "纯净背景·突出车身线条",
  城市主干道: "城市日间主干道动态场景",
  夕阳高速: "高速公路夕阳行驶场景",
  雨夜城市: "雨夜城市街道光影场景",
  山路弯道: "山区弯道行驶场景",
  海岸公路: "滨海公路动态场景",
  林荫大道: "林荫大道自然光场景",
  商务园区: "园区道路商务场景",
  雪后公路: "雪后公路质感场景",
  傍晚高架: "傍晚高架桥动态场景",
  隧道出口: "隧道出口光线过渡场景",
  玻璃展厅: "通透空间·自然光影",
  暗调奢华: "低调奢华·气质感",
  柔光灯顶: "柔光均匀·减少硬阴影",
  极简留白: "留白克制·主体更集中",
  广角空间: "空间更开阔·适合展示全景",
  暖调米棚: "暖调米白·质感柔和",
  深灰光晕: "深灰光框·层次高级",
  炭灰岩墙: "炭灰岩面·沉稳大气",
  竖光展厅: "竖向光带·空间通透",
  林荫公园: "自然绿意·日常外景",
  山野湖畔: "山野开阔·环境更自然",
  城市街区: "城市质感·适合门店传播",
  海滨城市: "明亮通透·度假氛围",
  道路动态1: "高速跟拍·突出速度感",
  道路动态2: "城市动感·增强行驶氛围",
  道路动态3: "夜景道路·强化光轨质感",
  道路动态4: "山路弯道·突出操控感",
  天空镜场: "镜面天空·反射质感更强",
  夕阳车镜: "暖色夕照·氛围更柔和",
  云海展台: "云海展台·层次更丰富",
  云镜车场: "云镜车场·场景更完整",
};

const templateCards = computed<SceneTemplateRecommendationItem[]>(() =>
  workspaceTemplateRecommendations
    .filter((item) => item.capabilityCode === props.capability.code)
    .slice(0, 4)
    .map((item) => ({
      id: item.optionId,
      title: item.title,
      image: item.image,
      description: templateDescriptionMap[item.title] ?? "推荐的视觉工作台场景",
    })),
);

const featureCompareActiveView = ref<"features" | "recent" | "generating">(
  "features",
);

const isFeatureCompareCapability = computed(() =>
  isWorkspaceFeatureCompareCode(props.capability.code),
);

const featureCompareContent = computed(() => {
  if (!isWorkspaceFeatureCompareCode(props.capability.code)) return null;
  return workspaceFeatureCompareMap[props.capability.code];
});

const featureCompareCards = computed(
  () => featureCompareContent.value?.cards ?? [],
);

const featureCompareProgress = ref([50]);
const featureCompareMediaRefs = ref<(HTMLElement | null)[]>([]);
const activeFeatureCompareDrag = ref<{
  index: number;
  pointerId: number;
} | null>(null);

function handleTemplatePick(item: SceneTemplateRecommendationItem) {
  emit("pickTemplate", {
    capabilityCode: props.capability.code,
    optionId: item.id,
  });
}

function clampFeatureCompareProgress(value: number) {
  return Math.min(88, Math.max(12, value));
}

function setFeatureCompareMediaRef(index: number, element: unknown) {
  featureCompareMediaRefs.value[index] =
    element instanceof HTMLElement ? element : null;
}

function updateFeatureCompareProgress(index: number, clientX: number) {
  const element = featureCompareMediaRefs.value[index];
  if (!element) return;

  const rect = element.getBoundingClientRect();
  if (!rect.width) return;

  const next = ((clientX - rect.left) / rect.width) * 100;
  featureCompareProgress.value[index] = clampFeatureCompareProgress(next);
}

function handleFeatureComparePointerMove(event: PointerEvent) {
  const drag = activeFeatureCompareDrag.value;
  if (!drag || event.pointerId !== drag.pointerId) return;

  updateFeatureCompareProgress(drag.index, event.clientX);
}

function endFeatureCompareDrag() {
  activeFeatureCompareDrag.value = null;
  window.removeEventListener("pointermove", handleFeatureComparePointerMove);
  window.removeEventListener("pointerup", endFeatureCompareDrag);
  window.removeEventListener("pointercancel", endFeatureCompareDrag);
}

function startFeatureCompareDrag(index: number, event: PointerEvent) {
  activeFeatureCompareDrag.value = {
    index,
    pointerId: event.pointerId,
  };
  updateFeatureCompareProgress(index, event.clientX);
  window.addEventListener("pointermove", handleFeatureComparePointerMove);
  window.addEventListener("pointerup", endFeatureCompareDrag);
  window.addEventListener("pointercancel", endFeatureCompareDrag);
}

const appStore = useAppStore();
const message = useMessage();
const dialog = useDialog();
const recentGenerateStore = useRecentGenerateStore();
const activeTab = ref<"guide" | "generating" | "batchProcessing" | "recent">(
  "guide",
);
const recentItems = ref<WorkspaceRecentItem[]>([]);
const recentLoading = ref(false);
const recentLoaded = ref(false);
const recentLayoutRef = ref<HTMLElement | null>(null);
const shortVideoInitialView = ref<
  "guide" | "preview" | "generating" | "recent"
>("guide");
let recentRefreshTimer: number | null = null;

const isBatchCapability = computed(() => props.capability.kind === "batch");

const isDeliveryCapability = computed(
  () => props.capability.kind === "delivery",
);

function isTerminalBatchJobStatus(status: WorkspaceRecentItem["status"]) {
  return status === "success" || status === "fail" || status === "canceled";
}

const hasRunningBatchJobs = computed(
  () =>
    props.batchActiveJobs?.some(
      (job) => !isTerminalBatchJobStatus(job.status),
    ) ?? false,
);

const isBatchProcessingView = computed(
  () => isDeliveryCapability.value && hasRunningBatchJobs.value,
);

interface BatchDisplayCard {
  id: string;
  title: string;
  sceneLabel?: string;
  createdAt: string;
  status: WorkspaceRecentItem["status"];
  thumbnail?: string;
  progress?: number;
  isInteriorItem?: boolean;
  errorCode?: string;
  error?: string;
}

const batchDisplayCards = computed<BatchDisplayCard[]>(() => {
  const cards: BatchDisplayCard[] = [];

  for (const job of props.batchActiveJobs ?? []) {
    const createdAt = formatDate(job.createdAt, "YYYY-MM-DD HH:mm");

    if (job.items.length) {
      for (const item of job.items) {
        cards.push({
          id: `${job.batchId}-${item.itemId}`,
          title: item.groupTitle || job.projectName,
          sceneLabel: getBatchItemKindLabel(item.itemKind),
          createdAt,
          status: item.status,
          thumbnail:
            item.thumbnail ||
            (isInteriorBatchItemKind(item.itemKind)
              ? undefined
              : job.previewUrl || undefined),
          progress: item.progress,
          isInteriorItem: isInteriorBatchItemKind(item.itemKind),
          errorCode: item.errorCode,
          error: item.error,
        });
      }
      continue;
    }

    cards.push({
      id: job.batchId,
      title: job.projectName,
      createdAt,
      status: job.status,
      thumbnail: job.previewUrl || undefined,
      progress: job.progress,
    });
  }

  return cards;
});

const showTemplateRecommendations = computed(
  () =>
    props.capability.kind !== "beauty" &&
    props.capability.kind !== "interior" &&
    props.capability.kind !== "batch",
);

const requirementDescriptionMap: Record<string, string> = {
  车辆完整入镜: "建议四周留白，车辆完整不被切断。",
  画面清晰无遮挡: "主体清晰，无重度雾气或前景遮挡物。",
  光线均匀少反光: "避免强烈曝光、眩光、大面积镜面反射。",
};

const requirementCards = computed(() =>
  (props.capability.requirements ?? []).map((item) => ({
    title: item,
    desc: requirementDescriptionMap[item] ?? "",
  })),
);

const deletingRecentIds = ref<string[]>([]);
const isDownloadingDeliveryGroup = ref(false);

watch(
  () => props.capability.kind,
  () => {
    emit("closeDeliveryImagePreview");
  },
);

function openDeliveryGroupAssetPreview(
  asset: WorkspaceDeliveryTaskPreview["assets"][number],
) {
  if (asset.status !== "ready" || !asset.imageUrl) return;

  persistRecentCache();

  emit("openDeliveryAssetResult", {
    createdAt: asset.createdAt ?? "",
    statusText: `已完成 · ${asset.title} · 成片交付结果`,
    ratioLabel: asset.ratio,
    mediaType: "image",
    previewImage: asset.imageUrl,
    previewAlt: asset.title,
    downloadUrl: asset.imageUrl,
    imageWidth: asset.width,
    imageHeight: asset.height,
  });
}

function openDeliveryGroupPendingAsset(
  asset: WorkspaceDeliveryTaskPreview["assets"][number],
) {
  if (asset.status !== "pending" || !asset.generationTaskId) return;

  emit("openDeliveryPendingAsset", {
    deliveryTaskId: props.deliveryTaskPreview?.id ?? "",
    generationTaskId: asset.generationTaskId,
  });
}

function handleDeliveryGroupAssetPick(
  asset: WorkspaceDeliveryTaskPreview["assets"][number],
) {
  if (asset.status === "ready") {
    openDeliveryGroupAssetPreview(asset);
    return;
  }

  openDeliveryGroupPendingAsset(asset);
}

function closeDeliveryImagePreview() {
  emit("closeDeliveryImagePreview");
}

const deliveryReadyAssetCount = computed(
  () =>
    props.deliveryTaskPreview?.assets.filter(
      (asset) => asset.status === "ready",
    ).length ?? 0,
);

async function handleDownloadDeliveryGroup() {
  const task = props.deliveryTaskPreview;
  const readyAssets =
    task?.assets.filter(
      (asset) => asset.status === "ready" && asset.imageUrl,
    ) ?? [];

  if (!readyAssets.length) {
    message.warning("当前任务组没有可下载成片");
    return;
  }

  isDownloadingDeliveryGroup.value = true;

  try {
    const files = readyAssets.map((asset, index) => ({
      url: asset.imageUrl!,
      filename: `${sanitizeFilename(task!.title)}-${String(index + 1).padStart(2, "0")}-${sanitizeFilename(asset.title)}.jpg`,
    }));
    const count = await downloadFilesAsZip(
      files,
      `${sanitizeFilename(task!.title)}-成片交付.zip`,
    );
    message.success(`已开始下载 ${count} 张成片`);
  } catch {
    message.error("批量下载失败，请稍后重试");
  } finally {
    isDownloadingDeliveryGroup.value = false;
  }
}

const statusLabelMap = recentStatusLabelMap;
const statusIconMap = recentStatusIconMap;

const generationFailureMessageMap: Record<string, string> = {
  KIE_UPLOAD_TIMEOUT: "图片上传超时，请重试",
  KIE_CREATE_TIMEOUT: "生成服务连接超时，请重试",
  KIE_DETAIL_TIMEOUT: "生成状态查询超时，请稍后刷新",
  KIE_REQUEST_TIMEOUT: "生成服务网络超时，请重试",
  KIE_NETWORK_TIMEOUT: "生成服务网络异常，请重试",
  KIE_KEY_UNAVAILABLE: "生成服务繁忙，请稍后重试",
};

function getRecentStatusLabel(item: WorkspaceRecentItem) {
  if (item.status === "fail" && item.errorCode === "KIE_TASK_TIMEOUT") {
    return "生成超时";
  }
  return statusLabelMap[item.status];
}

function getBatchFailureReason(item: BatchDisplayCard) {
  if (item.status !== "fail") return "";
  if (item.errorCode === "KIE_TASK_TIMEOUT") return "生成超时，请重试";
  if (item.errorCode && generationFailureMessageMap[item.errorCode]) {
    return generationFailureMessageMap[item.errorCode];
  }
  return item.error || item.errorCode || "生成失败，请重试";
}
const recentTaskModuleCodes = new Set([
  "showroom-light",
  "outdoor-scene",
  "road-motion",
  "sky-studio",
  "paint-refresh",
  "light-consistency",
  "interior-clean",
  "interior-stitch",
  "watermark-remove",
  "short-video",
]);

function resolveRecentModuleCode() {
  if (props.capability.code === "interior-stitch") {
    return "interior-collage";
  }
  if (isDeliveryCapability.value) {
    return "batch-new";
  }
  return props.capability.code;
}

function resolveRecentCacheKey() {
  return resolveRecentGenerateCacheKey({
    capabilityCode: props.capability.code,
    capabilityKind: props.capability.kind,
  });
}

function persistRecentCache(taskList = recentItems.value) {
  if (isDeliveryCapability.value) return;
  const key = resolveRecentCacheKey();
  if (!key) return;
  recentGenerateStore.patchTaskList(key, taskList, { touchFetchTime: false });
}

function saveRecentScrollPosition() {
  const key = resolveRecentCacheKey();
  const element = recentLayoutRef.value;
  if (!key || !element) return;
  recentGenerateStore.setScrollTop(key, element.scrollTop);
}

async function restoreRecentScrollPosition() {
  const key = resolveRecentCacheKey();
  const element = recentLayoutRef.value;
  if (!key || !element) return;

  const scrollTop = recentGenerateStore.getCache(key).scrollTop;
  if (scrollTop <= 0) return;

  await nextTick();
  element.scrollTop = scrollTop;
  requestAnimationFrame(() => {
    element.scrollTop = scrollTop;
  });
}

function applyCachedRecentList(key: ReturnType<typeof resolveRecentCacheKey>) {
  if (!key) return false;
  const cached = recentGenerateStore.getCache(key);
  if (!cached.taskList.length) return false;
  recentItems.value = cached.taskList;
  recentLoaded.value = true;
  return true;
}

function handleReturnToRecentList() {
  if (isDeliveryCapability.value) return;

  const key = resolveRecentCacheKey();
  if (!key) return;

  const returning = recentGenerateStore.consumeReturningFromDetail(key);
  if (!returning) return;

  if (isFeatureCompareCapability.value) {
    featureCompareActiveView.value = "recent";
  } else if (!isBatchCapability.value) {
    activeTab.value = "recent";
  }

  applyCachedRecentList(key);
  void nextTick(() => restoreRecentScrollPosition());

  if (recentGenerateStore.isCacheStale(key, RECENT_GENERATE_STALE_MS)) {
    void loadRecentItems({ silent: true, force: true });
  } else {
    startRecentAutoRefresh();
  }
}

const showGenerationResultOverlay = computed(
  () =>
    Boolean(props.generationResult) && props.capability.code !== "short-video",
);

const showDeliveryImageOverlay = computed(
  () => isDeliveryCapability.value && Boolean(props.deliveryImagePreview),
);

const isRecentListUnderDetail = computed(
  () => showGenerationResultOverlay.value || showDeliveryImageOverlay.value,
);

function canLoadRecentTasks() {
  if (isBatchCapability.value || isDeliveryCapability.value) return false;
  return recentTaskModuleCodes.has(props.capability.code);
}

function mapRecentStatus(
  item: RecentGenerationTask,
): WorkspaceRecentItem["status"] {
  const status = (item.uiStatus ??
    item.status ??
    "waiting") as WorkspaceRecentItem["status"];
  return status === "queue" ? "queued" : status;
}

function mapRecentItem(item: RecentGenerationTask): WorkspaceRecentItem {
  const sceneTitle = resolveWorkspaceOptionTitle(
    item.moduleCode,
    item.sceneLabel,
  );
  const isShortVideo = item.moduleCode === "short-video";
  const coverUrl =
    item.inputAssetThumbnailUrl ??
    item.thumbnail ??
    item.inputAssetUrl ??
    undefined;

  return {
    id: item.id || item.taskId,
    taskId: item.taskId,
    moduleCode: item.moduleCode,
    title: item.title,
    status: mapRecentStatus(item),
    createdAt: formatDate(item.createdAt, "YYYY-MM-DD HH:mm"),
    updatedAt: item.updatedAt
      ? formatDate(item.updatedAt, "YYYY-MM-DD HH:mm")
      : undefined,
    thumbnail: coverUrl,
    previewImage: coverUrl,
    ratioLabel: isShortVideo
      ? "16:9 · 720p · 10秒"
      : (item.ratioLabel ??
        formatOutputRatioLabel(item.outputRatio) ??
        undefined),
    sceneLabel: isShortVideo
      ? "营销短视频"
      : item.moduleCode === "batch-new"
        ? resolveBatchRecentSceneLabel(item.sceneLabel)
        : (sceneTitle ?? item.sceneLabel ?? undefined),
    outputRatio: item.outputRatio ?? undefined,
    inputAssetId: item.inputAssetId ?? undefined,
    inputAssetThumbnailUrl: item.inputAssetThumbnailUrl ?? undefined,
    progress: item.progress ?? undefined,
    resultCount: item.resultCount ?? undefined,
    activeModel: item.activeModel ?? undefined,
    fallbackStarted: item.fallbackStarted ?? false,
    deadlineAt: item.deadlineAt ?? undefined,
    softTimeoutAt: item.softTimeoutAt ?? undefined,
    winningModel: item.winningModel ?? undefined,
    errorCode:
      typeof item.error === "string"
        ? undefined
        : (item.error?.code ?? undefined),
    error: isShortVideo
      ? undefined
      : typeof item.error === "string"
        ? item.error
        : (item.error?.message ?? undefined),
  };
}

function mergeRecentItems(incoming: WorkspaceRecentItem[]) {
  const previousById = new Map(
    recentItems.value.map((item) => [item.id, item]),
  );

  return incoming.map((item) => {
    const previous = previousById.get(item.id);
    if (!previous) return item;

    return {
      ...item,
      thumbnail: item.thumbnail ?? previous.thumbnail,
      previewImage: item.previewImage ?? previous.previewImage,
    };
  });
}

function canAutoRefreshRecent(items: WorkspaceRecentItem[]) {
  return items.some((item) =>
    ["waiting", "queued", "queue", "generating"].includes(item.status),
  );
}

function shouldPollRecent() {
  if (props.capability.code === "short-video") {
    return canAutoRefreshRecent(recentItems.value);
  }
  if (
    isFeatureCompareCapability.value &&
    (featureCompareActiveView.value === "recent" ||
      featureCompareActiveView.value === "generating")
  ) {
    return canAutoRefreshRecent(recentItems.value);
  }
  if (activeTab.value !== "recent") return false;
  return canAutoRefreshRecent(recentItems.value);
}

type LoadRecentItemsOptions = {
  force?: boolean;
  silent?: boolean;
};

async function loadRecentItems(options: LoadRecentItemsOptions = {}) {
  if (!canLoadRecentTasks()) {
    recentItems.value = [];
    recentLoaded.value = true;
    recentLoading.value = false;
    return;
  }

  const cacheKey = resolveRecentCacheKey();

  if (
    !options.force &&
    cacheKey &&
    applyCachedRecentList(cacheKey) &&
    !recentGenerateStore.isCacheStale(cacheKey, RECENT_GENERATE_STALE_MS)
  ) {
    return;
  }

  if (!options.silent) {
    recentLoading.value = true;
  }

  try {
    const result = await getRecentGenerationTasks({
      moduleCode: resolveRecentModuleCode(),
      page: 1,
      pageSize: 20,
    });
    recentItems.value = mergeRecentItems(result.items.map(mapRecentItem));
    recentLoaded.value = true;
    if (cacheKey) {
      recentGenerateStore.setTaskList(cacheKey, recentItems.value);
    }
  } catch (error) {
    if (!recentLoaded.value && !options.silent) {
      recentItems.value = [];
    }
    if (!options.silent) {
      const text = error instanceof Error ? error.message : "最近生成加载失败";
      message.error(text);
    }
  } finally {
    if (!options.silent) {
      recentLoading.value = false;
    }
  }
}

function handleResultBack() {
  const cacheKey = resolveRecentCacheKey();
  if (cacheKey) {
    saveRecentScrollPosition();
    persistRecentCache();
    recentGenerateStore.markReturningFromDetail(cacheKey);
  }

  if (
    props.capability.code === "short-video" &&
    props.generationResult?.mediaType === "video"
  ) {
    shortVideoInitialView.value = "recent";
  } else if (!isBatchCapability.value) {
    activeTab.value = "recent";
  }

  emit("backFromResult");
}

function stopRecentAutoRefresh() {
  if (recentRefreshTimer !== null) {
    window.clearInterval(recentRefreshTimer);
    recentRefreshTimer = null;
  }
}

function startRecentAutoRefresh() {
  stopRecentAutoRefresh();

  if (!shouldPollRecent()) return;

  recentRefreshTimer = window.setInterval(() => {
    if (!shouldPollRecent()) {
      stopRecentAutoRefresh();
      return;
    }

    void loadRecentItems({ silent: true, force: true });
  }, RECENT_REFRESH_MS);
}

function syncShortVideoInitialView() {
  if (props.capability.code !== "short-video") return;
  if (props.isGenerating) {
    shortVideoInitialView.value = "generating";
    return;
  }
  if (props.shortVideoSessionPreview?.previewVideo) {
    shortVideoInitialView.value = "preview";
    return;
  }
  shortVideoInitialView.value = "guide";
}

function focusShortVideoGeneratingView() {
  if (props.capability.code !== "short-video") return;
  shortVideoInitialView.value = "generating";
}

function focusGeneratingView() {
  if (!props.isGenerating) return;

  if (isFeatureCompareCapability.value) {
    featureCompareActiveView.value = "generating";
    return;
  }

  if (isBatchProcessingView.value) {
    activeTab.value = "batchProcessing";
    return;
  }

  if (props.capability.code === "short-video") {
    syncShortVideoInitialView();
    return;
  }

  if (!isBatchCapability.value) {
    activeTab.value = "generating";
  }
}

function focusShortVideoPreviewView() {
  if (props.capability.code !== "short-video") return;
  shortVideoInitialView.value = "preview";
}

function focusDeliveryBatchProcessingView() {
  if (!isDeliveryCapability.value || !isBatchProcessingView.value) return;
  activeTab.value = "batchProcessing";
}

watch(
  () => [props.capability.code, isBatchProcessingView.value] as const,
  ([code, isProcessing]) => {
    if (code === "delivery" && isProcessing) {
      activeTab.value = "batchProcessing";
    }
  },
);

watch(
  () => props.isGenerating,
  (generating, wasGenerating) => {
    if (generating) {
      focusGeneratingView();
      if (!isBatchCapability.value) {
        void loadRecentItems({ force: true });
      }
      return;
    }

    if (isFeatureCompareCapability.value) {
      if (featureCompareActiveView.value === "generating") {
        featureCompareActiveView.value = "features";
      }
    } else if (!isBatchCapability.value && activeTab.value === "generating") {
      activeTab.value = "guide";
    }

    if (wasGenerating && !isBatchCapability.value) {
      void loadRecentItems({ force: true });
    }

    if (props.capability.code === "short-video") {
      syncShortVideoInitialView();
    }
  },
  { immediate: true },
);

watch(
  () => props.shortVideoSessionPreview?.previewVideo,
  () => {
    if (props.capability.code === "short-video") {
      syncShortVideoInitialView();
    }
  },
);

watch(
  () => [props.generationResult, props.deliveryImagePreview] as const,
  ([generationResult, deliveryImagePreview], previous) => {
    const wasViewingDetail = Boolean(previous?.[0] || previous?.[1]);
    const isViewingDetail = Boolean(generationResult || deliveryImagePreview);
    if (wasViewingDetail && !isViewingDetail) {
      handleReturnToRecentList();
    }
  },
);

watch(
  () => props.capability.code,
  () => {
    stopRecentAutoRefresh();

    if (isDeliveryCapability.value) {
      recentItems.value = [];
      recentLoaded.value = false;
      activeTab.value = isBatchProcessingView.value
        ? "batchProcessing"
        : "guide";
      return;
    }

    const cacheKey = resolveRecentCacheKey();
    if (cacheKey && applyCachedRecentList(cacheKey)) {
      recentLoaded.value = true;
      if (
        recentGenerateStore.isCacheStale(cacheKey, RECENT_GENERATE_STALE_MS)
      ) {
        void loadRecentItems({ silent: true, force: true });
      }
    } else {
      recentItems.value = [];
      recentLoaded.value = false;
    }

    if (isFeatureCompareCapability.value) {
      featureCompareActiveView.value = props.isGenerating
        ? "generating"
        : "features";
      featureCompareProgress.value = featureCompareCards.value.map(() => 50);
    } else if (isBatchCapability.value) {
      activeTab.value = "guide";
    } else if (props.capability.code === "short-video") {
      syncShortVideoInitialView();
    } else {
      activeTab.value = props.isGenerating ? "generating" : "guide";
    }

    if (
      !isBatchCapability.value &&
      (props.isGenerating ||
        activeTab.value === "recent" ||
        isFeatureCompareCapability.value ||
        props.capability.code === "short-video")
    ) {
      void loadRecentItems();
    }
  },
);

watch(
  () => featureCompareActiveView.value,
  (view) => {
    if (!isFeatureCompareCapability.value) return;

    if (view === "recent" || view === "generating") {
      if (!recentLoaded.value) {
        void loadRecentItems();
        return;
      }
      startRecentAutoRefresh();
      return;
    }

    stopRecentAutoRefresh();
  },
);

watch(
  () =>
    [activeTab.value, props.isGenerating, isBatchProcessingView.value] as const,
  ([tab]) => {
    if (tab === "recent") {
      if (!recentLoaded.value) {
        void loadRecentItems();
        return;
      }
      startRecentAutoRefresh();
      return;
    }

    stopRecentAutoRefresh();
  },
  { immediate: true },
);

onMounted(() => {
  if (canLoadRecentTasks()) {
    void loadRecentItems();
  }
});

onUnmounted(() => {
  stopRecentAutoRefresh();
  endFeatureCompareDrag();
});

defineExpose({
  refreshRecentItems: () => loadRecentItems({ force: true }),
  focusGeneratingView,
  focusShortVideoGeneratingView,
  focusShortVideoPreviewView,
  focusDeliveryBatchProcessingView,
});
</script>

<template>
  <aside
    class="assist-panel h-full min-h-0"
    :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'"
  >
    <div v-show="showGenerationResultOverlay" class="assist-detail-layer">
      <WorkspaceGenerateResultPanel
        v-if="generationResult && capability.code !== 'short-video'"
        :result="generationResult"
        @back="handleResultBack"
      />
    </div>

    <div v-show="showDeliveryImageOverlay" class="assist-detail-layer">
      <WorkspaceImagePreviewPanel
        v-if="isDeliveryCapability && deliveryImagePreview"
        :preview="deliveryImagePreview"
        @back="closeDeliveryImagePreview"
      />
    </div>

    <section
      v-if="
        isDeliveryCapability && deliveryTaskPreview && !deliveryImagePreview
      "
      class="delivery-group-preview"
      aria-label="成片图组预览"
    >
      <header class="delivery-group-head">
        <div class="delivery-group-copy">
          <p>成片交付</p>
          <h2
            class="delivery-ellipsis-text"
            :data-tooltip="deliveryTaskPreview.title"
            :title="deliveryTaskPreview.title"
          >
            {{ deliveryTaskPreview.title }}
          </h2>
          <span>
            {{ deliveryTaskPreview.meta }} ·
            {{ deliveryTaskPreview.completedCount }}/{{
              deliveryTaskPreview.totalCount
            }}
            张成片
          </span>
        </div>
        <div class="delivery-group-actions">
          <button
            type="button"
            class="delivery-group-download-all"
            :disabled="
              isDownloadingDeliveryGroup || deliveryReadyAssetCount === 0
            "
            @click="handleDownloadDeliveryGroup"
          >
            <Icon icon="mdi:download-multiple" />
            {{ isDownloadingDeliveryGroup ? "下载中..." : "全部下载" }}
          </button>
          <button
            type="button"
            class="delivery-group-back"
            @click="closeDeliveryImagePreview"
          >
            返回
          </button>
        </div>
      </header>

      <div class="delivery-group-grid">
        <article
          v-for="asset in deliveryTaskPreview.assets"
          :key="asset.id"
          class="delivery-group-card"
          :class="{
            'is-clickable':
              asset.status === 'ready' || Boolean(asset.generationTaskId),
          }"
          :role="
            asset.status === 'ready' || asset.generationTaskId
              ? 'button'
              : undefined
          "
          :tabindex="
            asset.status === 'ready' || asset.generationTaskId ? 0 : undefined
          "
          :aria-label="
            asset.status === 'ready'
              ? `查看大图：${asset.title}`
              : asset.generationTaskId
                ? `查看生成进度：${asset.title}`
                : `${asset.title}，${asset.pendingStatusText ?? '生成中'}`
          "
          @click="handleDeliveryGroupAssetPick(asset)"
          @keydown.enter.prevent="handleDeliveryGroupAssetPick(asset)"
          @keydown.space.prevent="handleDeliveryGroupAssetPick(asset)"
        >
          <div
            class="delivery-group-media"
            :class="{ 'is-pending': asset.status === 'pending' }"
          >
            <PreloadImage
              v-if="asset.thumbnailUrl"
              class="delivery-group-image"
              :src="asset.thumbnailUrl"
              :alt="asset.title"
              loading="lazy"
              decoding="async"
              fetchpriority="low"
              :draggable="false"
              fit="cover"
              object-position="center"
            />
            <div v-else class="delivery-group-pending" aria-hidden="true">
              <span class="delivery-group-pending-scan"></span>
              <Icon icon="mdi:image-sync-outline" />
              <strong>{{ asset.pendingStatusText ?? "生成中" }}</strong>
            </div>
            <span
              v-if="asset.status === 'pending'"
              class="delivery-slot-status"
            >
              {{ asset.pendingStatusText ?? "生成中" }}
            </span>
          </div>
          <footer class="delivery-group-foot">
            <div>
              <strong
                class="delivery-ellipsis-text"
                :data-tooltip="asset.title"
                :title="asset.title"
                >{{ asset.title }}</strong
              >
              <span>{{ asset.ratio }}</span>
              <span v-if="asset.createdAt" class="delivery-group-time">{{
                asset.createdAt
              }}</span>
            </div>
            <a
              v-if="asset.status === 'ready' && asset.imageUrl"
              class="delivery-group-download"
              :href="asset.imageUrl"
              download
              target="_blank"
              rel="noreferrer"
              aria-label="下载成片"
              @click.stop
            >
              <Icon icon="mdi:download" />
            </a>
          </footer>
        </article>
      </div>
    </section>

    <template v-else-if="isFeatureCompareCapability && featureCompareContent">
      <div
        class="assist-shell"
        :class="{ 'is-under-detail': isRecentListUnderDetail }"
      >
        <header class="assist-tabs">
          <div
            class="tab-group"
            role="tablist"
            :aria-label="featureCompareContent.tabListLabel"
          >
            <template v-if="isGenerating">
              <button
                type="button"
                role="tab"
                :aria-selected="featureCompareActiveView === 'generating'"
                :class="{ active: featureCompareActiveView === 'generating' }"
                @click="featureCompareActiveView = 'generating'"
              >
                正在生成
              </button>
              <button
                type="button"
                role="tab"
                :aria-selected="featureCompareActiveView === 'recent'"
                :class="{ active: featureCompareActiveView === 'recent' }"
                @click="featureCompareActiveView = 'recent'"
              >
                最近生成
              </button>
            </template>
            <template v-else>
              <button
                type="button"
                role="tab"
                :aria-selected="featureCompareActiveView === 'features'"
                :class="{ active: featureCompareActiveView === 'features' }"
                @click="featureCompareActiveView = 'features'"
              >
                功能描述
              </button>
              <button
                type="button"
                role="tab"
                :aria-selected="featureCompareActiveView === 'recent'"
                :class="{ active: featureCompareActiveView === 'recent' }"
                @click="featureCompareActiveView = 'recent'"
              >
                最近生成
              </button>
            </template>
          </div>
        </header>

        <div class="assist-body">
          <section
            v-if="isGenerating && featureCompareActiveView === 'generating'"
            class="generation-waiting"
            aria-live="polite"
          >
            <div class="waiting-visual" aria-hidden="true">
              <span class="waiting-scan"></span>
              <Icon icon="mdi:image-sync-outline" />
            </div>
            <div class="waiting-copy">
              <p>图片待处理</p>
              <h2>{{ featureCompareContent.generatingTitle }}</h2>
              <span>{{ featureCompareContent.generatingDesc }}</span>
            </div>
            <div class="waiting-progress" aria-hidden="true">
              <span></span>
            </div>
          </section>

          <section
            v-else-if="featureCompareActiveView === 'features'"
            class="watermark-feature-layout"
            :class="{
              'is-result-mode': featureCompareContent.mode === 'result',
            }"
            :aria-label="featureCompareContent.featureSectionLabel"
          >
            <section class="watermark-assist-hero">
              <div class="watermark-assist-copy">
                <p>{{ featureCompareContent.heroBadge }}</p>
                <h2>{{ featureCompareContent.heroTitle }}</h2>
                <span>{{ featureCompareContent.heroDesc }}</span>
              </div>
            </section>

            <section
              v-if="featureCompareContent.mode === 'result'"
              class="watermark-result-section"
              aria-label="生成效果图"
            >
              <header class="watermark-section-head">
                <div>
                  <h3>{{ featureCompareContent.compareTitle }}</h3>
                  <p>{{ featureCompareContent.compareHint }}</p>
                </div>
              </header>

              <article class="watermark-result-card">
                <div class="watermark-result-media">
                  <PreloadImage
                    class="watermark-result-image"
                    :src="
                      featureCompareCards[0]?.after ??
                      featureCompareCards[0]?.before
                    "
                    :alt="featureCompareContent.afterAlt"
                    loading="lazy"
                    decoding="async"
                    :draggable="false"
                    fit="cover"
                    object-position="center"
                  />
                </div>
              </article>
            </section>

            <section
              v-else
              class="watermark-compare-section"
              aria-label="效果对比"
            >
              <header class="watermark-section-head">
                <div>
                  <h3>{{ featureCompareContent.compareTitle }}</h3>
                  <p>{{ featureCompareContent.compareHint }}</p>
                </div>
              </header>

              <div class="watermark-compare-grid">
                <article
                  v-for="(card, index) in featureCompareCards"
                  :key="card.before"
                  class="watermark-compare-card"
                >
                  <div
                    :ref="
                      (element) => setFeatureCompareMediaRef(index, element)
                    "
                    class="watermark-compare-media"
                    :style="{
                      '--compare-progress': `${featureCompareProgress[index]}%`,
                    }"
                    @pointerdown.prevent="
                      startFeatureCompareDrag(index, $event)
                    "
                  >
                    <PreloadImage
                      class="watermark-compare-image"
                      :src="card.before"
                      :alt="featureCompareContent.beforeAlt"
                      loading="lazy"
                      decoding="async"
                    />
                    <PreloadImage
                      class="watermark-compare-image watermark-compare-image--after"
                      :src="card.after"
                      :alt="featureCompareContent.afterAlt"
                      loading="lazy"
                      decoding="async"
                    />
                    <div class="watermark-compare-divider" aria-hidden="true">
                      <span></span>
                    </div>
                    <span
                      class="watermark-compare-badge watermark-compare-badge--before"
                      >处理前</span
                    >
                    <span
                      class="watermark-compare-badge watermark-compare-badge--after"
                      >处理后</span
                    >
                    <button
                      type="button"
                      class="watermark-compare-handle"
                      :aria-label="featureCompareContent.handleAriaLabel"
                      @pointerdown.prevent.stop="
                        startFeatureCompareDrag(index, $event)
                      "
                    >
                      <Icon icon="mdi:arrow-left-right" />
                    </button>
                  </div>
                </article>
              </div>
            </section>
          </section>

          <section
            v-show="featureCompareActiveView === 'recent'"
            ref="recentLayoutRef"
            class="recent-layout"
            aria-label="最近生成"
          >
            <div
              v-if="recentLoading && !recentItems.length"
              class="recent-empty-state"
            >
              <Icon icon="mdi:loading" class="recent-loading-icon" />
              <span>正在加载最近生成</span>
            </div>
            <div v-else-if="!recentItems.length" class="recent-empty-state">
              <Icon icon="mdi:image-off-outline" class="recent-loading-icon" />
              <span>暂无最近生成记录</span>
            </div>
            <article
              v-for="item in recentItems"
              :key="item.id"
              class="recent-card"
              :class="{ 'is-clickable': canOpenRecent(item) }"
              :role="canOpenRecent(item) ? 'button' : undefined"
              :tabindex="canOpenRecent(item) ? 0 : undefined"
              :aria-label="
                canOpenRecent(item) ? `查看${item.title}` : item.title
              "
              @click="handleRecentPick(item)"
              @keydown.enter.prevent="handleRecentPick(item)"
              @keydown.space.prevent="handleRecentPick(item)"
            >
              <div class="recent-media">
                <PreloadImage
                  v-if="item.thumbnail"
                  class="recent-image"
                  :src="item.thumbnail"
                  :alt="item.title"
                  loading="lazy"
                  decoding="async"
                  fetchpriority="low"
                  :draggable="false"
                  fit="cover"
                  object-position="center"
                />
                <div v-else class="recent-empty">
                  <Icon icon="mdi:image-outline" />
                </div>
                <span class="recent-status" :class="`is-${item.status}`">
                  <Icon
                    :icon="statusIconMap[item.status]"
                    class="recent-status-icon"
                  />
                  {{ getRecentStatusLabel(item) }}
                </span>
              </div>
              <footer class="recent-foot">
                <strong class="recent-name">{{ item.title }}</strong>
                <p v-if="item.sceneLabel" class="recent-scene">
                  {{ item.sceneLabel }}
                </p>
                <p v-if="getBatchFailureReason(item)" class="recent-scene">
                  {{ getBatchFailureReason(item) }}
                </p>
                <div class="recent-foot-actions">
                  <span class="recent-time">
                    <Icon icon="mdi:clock-outline" class="recent-time-icon" />
                    {{ item.createdAt }}
                  </span>
                  <button
                    type="button"
                    class="recent-delete-btn"
                    :aria-label="`删除${item.title}`"
                    :disabled="isDeletingRecent(item)"
                    @click.stop="handleDeleteRecent(item)"
                  >
                    <Icon
                      :icon="
                        isDeletingRecent(item)
                          ? 'mdi:loading'
                          : 'mdi:trash-can-outline'
                      "
                      :class="{
                        'recent-delete-icon--loading': isDeletingRecent(item),
                      }"
                    />
                  </button>
                </div>
              </footer>
            </article>
          </section>
        </div>
      </div>
    </template>
    <ShortVideoBetaPanel
      v-else-if="capability.code === 'short-video'"
      :play-request="shortVideoPlayRequest"
      :is-generating="props.isGenerating"
      :session-preview="props.shortVideoSessionPreview"
      :generation-result="props.generationResult"
      :recent-items="recentItems"
      :recent-loading="recentLoading"
      :initial-view="shortVideoInitialView"
      @pick-recent="handleRecentPick"
      @delete-recent="handleDeleteRecent"
    />

    <section
      v-else-if="isDeliveryCapability && !isBatchProcessingView"
      class="delivery-panel delivery-panel--placeholder"
      aria-label="成片交付预览"
    >
      <div v-if="props.deliveryListLoading" class="recent-empty-state">
        <Icon icon="mdi:loading" class="recent-loading-icon" />
        <span>正在加载交付列表</span>
      </div>
      <div v-else class="recent-empty-state">
        <Icon icon="mdi:image-off-outline" class="recent-loading-icon" />
        <span>暂无交付任务，请先在左侧创建批量任务</span>
      </div>
    </section>

    <template v-else>
      <div
        class="assist-shell"
        :class="{ 'is-under-detail': isRecentListUnderDetail }"
      >
        <header class="assist-tabs">
          <div class="tab-group" role="tablist" aria-label="辅助面板">
            <template v-if="isBatchCapability">
              <button
                type="button"
                role="tab"
                aria-selected="true"
                class="active"
              >
                使用教程
              </button>
            </template>
            <template v-else-if="isBatchProcessingView">
              <button
                type="button"
                role="tab"
                aria-selected="true"
                class="active"
              >
                正在生成
              </button>
            </template>
            <template v-else-if="isGenerating">
              <button
                type="button"
                role="tab"
                :aria-selected="activeTab === 'generating'"
                :class="{ active: activeTab === 'generating' }"
                @click="activeTab = 'generating'"
              >
                正在生成
              </button>
              <button
                type="button"
                role="tab"
                :aria-selected="activeTab === 'recent'"
                :class="{ active: activeTab === 'recent' }"
                @click="activeTab = 'recent'"
              >
                最近生成
              </button>
            </template>
            <template v-else>
              <button
                type="button"
                role="tab"
                :aria-selected="activeTab === 'guide'"
                :class="{ active: activeTab === 'guide' }"
                @click="activeTab = 'guide'"
              >
                使用教程
              </button>
              <button
                type="button"
                role="tab"
                :aria-selected="activeTab === 'recent'"
                :class="{ active: activeTab === 'recent' }"
                @click="activeTab = 'recent'"
              >
                最近生成
              </button>
            </template>
          </div>
        </header>

        <div class="assist-body">
          <section
            v-if="isBatchProcessingView"
            class="recent-layout batch-processing-layout"
            aria-label="批量任务处理中"
          >
            <article
              v-for="item in batchDisplayCards"
              :key="item.id"
              class="recent-card"
            >
              <div class="recent-media">
                <PreloadImage
                  v-if="item.thumbnail"
                  class="recent-image"
                  :src="item.thumbnail"
                  :alt="item.title"
                  loading="lazy"
                  decoding="async"
                  :draggable="false"
                  fit="cover"
                  object-position="center"
                />
                <div
                  v-else-if="item.isInteriorItem && item.status !== 'success'"
                  class="delivery-group-pending recent-pending-slot"
                  aria-hidden="true"
                >
                  <span class="delivery-group-pending-scan"></span>
                  <Icon icon="mdi:image-sync-outline" />
                  <strong>待生成</strong>
                </div>
                <div v-else class="recent-empty">
                  <Icon icon="mdi:image-outline" />
                </div>
                <span class="recent-status" :class="`is-${item.status}`">
                  <Icon
                    :icon="statusIconMap[item.status]"
                    class="recent-status-icon"
                  />
                  {{ getRecentStatusLabel(item) }}
                </span>
              </div>
              <footer class="recent-foot">
                <strong class="recent-name">{{ item.title }}</strong>
                <p v-if="item.sceneLabel" class="recent-scene">
                  {{ item.sceneLabel }}
                </p>
                <span class="recent-time">
                  <Icon icon="mdi:clock-outline" class="recent-time-icon" />
                  {{ item.createdAt }}
                  <template
                    v-if="item.progress !== undefined && item.progress < 100"
                  >
                    · 进度 {{ item.progress }}%
                  </template>
                </span>
              </footer>
            </article>
          </section>

          <section
            v-else-if="isGenerating && activeTab === 'generating'"
            class="generation-waiting"
            aria-live="polite"
          >
            <div class="waiting-visual" aria-hidden="true">
              <span class="waiting-scan"></span>
              <Icon icon="mdi:image-sync-outline" />
            </div>
            <div class="waiting-copy">
              <p>图片待生成</p>
              <h2>正在生成效果图</h2>
              <span>AI 正在分析车辆素材并匹配场景光影，请稍候。</span>
            </div>
            <div class="waiting-progress" aria-hidden="true">
              <span></span>
            </div>
          </section>

          <section
            v-else-if="
              isBatchCapability ||
              (!isGenerating && activeTab === 'guide' && !isBatchProcessingView)
            "
            class="guide-layout"
            :class="{ 'is-compact-guide': !showTemplateRecommendations }"
          >
            <WorkspaceTutorialGuide
              :animation-key="capability.code"
              :theme="appStore.isDarkMode ? 'dark' : 'light'"
              :variant="isBatchCapability ? 'batch-new' : 'showroom'"
            />

            <SceneTemplateRecommendations
              v-if="showTemplateRecommendations"
              :key="capability.code"
              :items="templateCards"
              :active-id="selectedOptionId"
              :theme="appStore.isDarkMode ? 'dark' : 'light'"
              @select="handleTemplatePick"
            >
              <template #footer>
                <section
                  class="requirement-section is-inline"
                  aria-label="素材要求"
                >
                  <strong class="requirement-title">素材要求</strong>
                  <div class="requirement-grid">
                    <article
                      v-for="item in requirementCards"
                      :key="item.title"
                      class="requirement-card"
                    >
                      <div class="requirement-card-copy">
                        <strong>{{ item.title }}</strong>
                        <span>{{ item.desc }}</span>
                      </div>
                    </article>
                  </div>
                </section>
              </template>
            </SceneTemplateRecommendations>
            <template v-else>
              <section class="requirement-section" aria-label="素材要求">
                <strong class="requirement-title">素材要求</strong>
                <div class="requirement-grid">
                  <article
                    v-for="item in requirementCards"
                    :key="item.title"
                    class="requirement-card"
                  >
                    <div class="requirement-card-copy">
                      <strong>{{ item.title }}</strong>
                      <span>{{ item.desc }}</span>
                    </div>
                  </article>
                </div>
              </section>
            </template>
          </section>

          <section
            v-show="!isBatchCapability && activeTab === 'recent'"
            ref="recentLayoutRef"
            class="recent-layout"
            aria-label="最近生成"
          >
            <div
              v-if="recentLoading && !recentItems.length"
              class="recent-empty-state"
            >
              <Icon icon="mdi:loading" class="recent-loading-icon" />
              <span>正在加载最近生成</span>
            </div>
            <div v-else-if="!recentItems.length" class="recent-empty-state">
              <Icon icon="mdi:image-off-outline" class="recent-loading-icon" />
              <span>暂无最近生成记录</span>
            </div>
            <article
              v-for="item in recentItems"
              :key="item.id"
              class="recent-card"
              :class="{ 'is-clickable': canOpenRecent(item) }"
              :role="canOpenRecent(item) ? 'button' : undefined"
              :tabindex="canOpenRecent(item) ? 0 : undefined"
              :aria-label="
                canOpenRecent(item) ? `查看${item.title}` : item.title
              "
              @click="handleRecentPick(item)"
              @keydown.enter.prevent="handleRecentPick(item)"
              @keydown.space.prevent="handleRecentPick(item)"
            >
              <div class="recent-media">
                <PreloadImage
                  v-if="item.thumbnail"
                  class="recent-image"
                  :src="item.thumbnail"
                  :alt="item.title"
                  loading="lazy"
                  decoding="async"
                  fetchpriority="low"
                  :draggable="false"
                  fit="cover"
                  object-position="center"
                />
                <div v-else class="recent-empty">
                  <Icon icon="mdi:image-outline" />
                </div>
                <span class="recent-status" :class="`is-${item.status}`">
                  <Icon
                    :icon="statusIconMap[item.status]"
                    class="recent-status-icon"
                  />
                  {{ getRecentStatusLabel(item) }}
                </span>
              </div>
              <footer class="recent-foot">
                <strong class="recent-name">{{ item.title }}</strong>
                <p v-if="item.sceneLabel" class="recent-scene">
                  {{ item.sceneLabel }}
                </p>
                <div class="recent-foot-actions">
                  <span class="recent-time">
                    <Icon icon="mdi:clock-outline" class="recent-time-icon" />
                    {{ item.createdAt }}
                  </span>
                  <button
                    type="button"
                    class="recent-delete-btn"
                    :aria-label="`删除${item.title}`"
                    :disabled="isDeletingRecent(item)"
                    @click.stop="handleDeleteRecent(item)"
                  >
                    <Icon
                      :icon="
                        isDeletingRecent(item)
                          ? 'mdi:loading'
                          : 'mdi:trash-can-outline'
                      "
                      :class="{
                        'recent-delete-icon--loading': isDeletingRecent(item),
                      }"
                    />
                  </button>
                </div>
              </footer>
            </article>
          </section>
        </div>
      </div>
    </template>
  </aside>
</template>

<style scoped lang="scss">
.assist-panel {
  --assist-bg: var(--workspace-panel, rgba(10, 10, 10, 0.92));
  --assist-card: rgba(255, 255, 255, 0.05);
  --assist-card-strong: rgba(255, 255, 255, 0.075);
  --assist-border: var(--workspace-line, rgba(255, 255, 255, 0.12));
  --assist-border-soft: rgba(255, 255, 255, 0.08);
  --assist-text: var(--app-text);
  --assist-muted: var(--workspace-muted, var(--app-text-soft));
  --assist-blue: var(--workspace-accent, #efc24c);
  --assist-green: var(--workspace-accent-strong, #ffd75a);
  --assist-shadow: var(--workspace-shadow, 0 24px 60px rgba(0, 0, 0, 0.34));
  --assist-tab-color: #999999;
  --assist-tab-active-color: #ffffff;
  --assist-tab-hover-color: #ffffff;

  position: relative;
  display: flex;
  container-type: inline-size;
  container-name: assist;
  width: 100%;
  height: 100%;
  max-height: 100%;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  padding: 18px 20px 20px;
  border: 1px solid var(--workspace-line, var(--assist-border));
  border-radius: 20px;
  background: var(--assist-bg);
  color: var(--assist-text);
}

.assist-panel.theme-dark {
  border-color: var(--workspace-line, var(--assist-border));
  background: var(--assist-bg);
  box-shadow: none;
}

.assist-panel.theme-light {
  --assist-bg: #f6faff;
  --assist-card: #ffffff;
  --assist-card-strong: #f8fbff;
  --assist-border: #e1eaf5;
  --assist-border-soft: #edf4ff;
  --assist-text: var(--workspace-text, var(--app-text));
  --assist-muted: var(
    --workspace-muted,
    var(--app-text-muted, var(--app-text-soft))
  );
  --assist-blue: var(--workspace-accent, #2f6bff);
  --assist-green: var(--workspace-accent-strong, #2f6bff);
  --assist-shadow: var(
    --workspace-shadow,
    0 14px 34px rgba(78, 111, 148, 0.09)
  );
  --assist-tab-color: #8a95a3;
  --assist-tab-active-color: #111827;
  --assist-tab-hover-color: #64748b;

  border: 1px solid #dce6f3;
  background:
    radial-gradient(
      circle at 62% 32%,
      rgba(207, 224, 255, 0.46),
      rgba(246, 250, 255, 0) 34%
    ),
    linear-gradient(180deg, #fbfdff 0%, #f3f7fc 100%);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.72),
    0 18px 42px rgba(78, 111, 148, 0.1);
}

.delivery-group-preview {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

.delivery-group-head {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.delivery-group-copy {
  position: relative;
  min-width: 0;
}

.delivery-group-copy p,
.delivery-group-copy h2,
.delivery-group-copy span {
  margin: 0;
}

.delivery-group-copy p {
  color: var(--assist-blue);
  font-size: 12px;
  font-weight: 900;
  line-height: 1.35;
}

.delivery-group-copy h2 {
  margin-top: 6px;
}

.delivery-ellipsis-text {
  display: block;
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delivery-ellipsis-text[data-tooltip]:hover::after {
  position: absolute;
  z-index: 12;
  left: 0;
  bottom: calc(100% + 8px);
  max-width: min(360px, 70vw);
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, #12151c 92%, transparent);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.34);
  color: #f5f7fb;
  content: attr(data-tooltip);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.45;
  pointer-events: none;
  white-space: normal;
  word-break: break-word;
}

.delivery-group-copy h2.delivery-ellipsis-text {
  color: var(--assist-text);
  font-size: clamp(18px, 1.35vw, 24px);
  font-weight: 950;
  line-height: 1.25;
}

.delivery-group-copy span {
  display: block;
  margin-top: 8px;
  color: var(--assist-muted);
  font-size: 13px;
  font-weight: 800;
}

.delivery-group-actions {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 10px;
}

.delivery-group-back,
.delivery-group-download-all {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-shrink: 0;
  height: 38px;
  border-radius: 10px;
  background: var(--assist-card-strong);
  color: var(--assist-text);
  padding: 0 18px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  transition: background 0.2s ease;
}

.delivery-group-download-all {
  color: var(--assist-blue);
}

.delivery-group-download-all:disabled {
  cursor: not-allowed;
  opacity: 0.56;
}

.delivery-group-back:hover,
.delivery-group-download-all:hover:not(:disabled) {
  background: color-mix(
    in srgb,
    var(--assist-blue) 10%,
    var(--assist-card-strong)
  );
}

.delivery-group-grid {
  --delivery-group-columns: 4;
  display: grid;
  flex: 1;
  min-height: 0;
  align-content: start;
  gap: 16px;
  grid-template-columns: repeat(var(--delivery-group-columns), minmax(0, 1fr));
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 2px 6px 20px 0;
}

@media (max-width: 1180px) {
  .delivery-group-grid {
    --delivery-group-columns: 3;
  }
}

@media (max-width: 860px) {
  .delivery-group-grid {
    --delivery-group-columns: 2;
  }
}

.delivery-group-card {
  display: flex;
  min-width: 0;
  overflow: hidden;
  flex-direction: column;
  border: 1px solid var(--assist-border);
  border-radius: 12px;
  background: var(--assist-card);
  box-shadow: var(--assist-shadow);
}

.delivery-group-card.is-clickable {
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.delivery-group-card.is-clickable:hover {
  border-color: color-mix(
    in srgb,
    var(--assist-blue) 42%,
    var(--assist-border)
  );
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--assist-blue) 12%, transparent),
    var(--assist-shadow);
  transform: translateY(-1px);
}

.delivery-group-card.is-clickable:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--assist-blue) 55%, transparent);
  outline-offset: 2px;
}

.delivery-group-media {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--assist-card-strong);
}

.delivery-group-media.is-pending {
  border-bottom: 1px dashed
    color-mix(in srgb, var(--assist-border) 88%, transparent);
}

.delivery-slot-status {
  position: absolute;
  left: 8px;
  top: 8px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, #111 72%, transparent);
  color: #ffd75a;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  backdrop-filter: blur(6px);
}

.delivery-group-pending {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  width: 100%;
  height: 100%;
  color: var(--assist-muted);
  font-size: 12px;
  font-weight: 800;
}

.delivery-group-pending svg {
  width: 28px;
  height: 28px;
  opacity: 0.72;
}

.delivery-group-pending strong {
  color: var(--assist-muted);
  font-size: 12px;
  font-weight: 900;
}

.delivery-group-pending-scan {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    transparent 0%,
    color-mix(in srgb, var(--assist-blue) 8%, transparent) 48%,
    transparent 100%
  );
  animation: delivery-pending-scan 2.4s ease-in-out infinite;
}

@keyframes delivery-pending-scan {
  0% {
    transform: translateY(-100%);
  }

  100% {
    transform: translateY(100%);
  }
}

.delivery-group-time {
  display: block;
  margin-top: 4px;
  color: var(--assist-muted);
  font-size: 11px;
  font-weight: 700;
}

.delivery-group-image,
.delivery-group-image :deep(.preload-image),
.delivery-group-image :deep(.preload-image__img) {
  width: 100%;
  height: 100%;
}

.delivery-group-foot {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px 12px;
}

.delivery-group-foot div {
  min-width: 0;
  position: relative;
}

.delivery-group-foot strong.delivery-ellipsis-text {
  color: var(--assist-text);
  font-size: 12px;
  font-weight: 900;
  line-height: 1.35;
}

.delivery-group-foot span {
  display: block;
  margin-top: 4px;
  color: var(--assist-muted);
  font-size: 11px;
  font-weight: 800;
}

.delivery-group-download {
  display: grid;
  flex: 0 0 34px;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 10px;
  background: color-mix(
    in srgb,
    var(--assist-blue) 10%,
    var(--assist-card-strong)
  );
  color: var(--assist-blue);
  font-size: 18px;
  text-decoration: none;
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}

.delivery-group-download:hover {
  background: color-mix(
    in srgb,
    var(--assist-blue) 16%,
    var(--assist-card-strong)
  );
  transform: translateY(-1px);
}

.assist-tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 18px;
  min-height: 32px;
  margin-bottom: 18px;
}

.assist-detail-layer {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  min-height: 0;
  flex-direction: column;
  padding: inherit;
  background: var(--assist-bg);
}

.assist-detail-layer > :deep(*) {
  flex: 1;
  min-height: 0;
}

.assist-shell {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
}

.assist-shell.is-under-detail {
  visibility: hidden;
  pointer-events: none;
}

.assist-body {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
}

.generation-waiting {
  display: grid;
  align-content: center;
  justify-items: center;
  min-height: 0;
  flex: 1;
  gap: 18px;
  padding: clamp(24px, 3vw, 40px);
  border: 1px solid var(--assist-border);
  border-radius: 14px;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--workspace-accent, #efc24c) 8%, transparent),
      transparent 42%
    ),
    var(--assist-card);
  box-shadow: var(--assist-shadow);
}

.waiting-visual {
  position: relative;
  display: grid;
  place-items: center;
  width: min(100%, 320px);
  aspect-ratio: 16 / 10;
  border: 1px dashed
    color-mix(in srgb, var(--assist-blue) 28%, var(--assist-border));
  border-radius: 18px;
  background:
    radial-gradient(
      circle at 50% 42%,
      color-mix(in srgb, var(--workspace-accent, #efc24c) 16%, transparent),
      transparent 38%
    ),
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.08),
      rgba(255, 255, 255, 0.02)
    ),
    var(--assist-card-strong);
  overflow: hidden;
}

.theme-light .waiting-visual {
  background:
    radial-gradient(
      circle at 50% 42%,
      color-mix(in srgb, var(--workspace-accent, #efc24c) 13%, transparent),
      transparent 38%
    ),
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.88),
      rgba(241, 247, 255, 0.82)
    ),
    var(--assist-card-strong);
}

.waiting-visual .iconify {
  position: relative;
  z-index: 2;
  color: var(--assist-blue);
  font-size: clamp(58px, 7vw, 92px);
  filter: drop-shadow(
    0 8px 24px
      color-mix(in srgb, var(--workspace-accent, #efc24c) 18%, transparent)
  );
  animation: waiting-pulse 1.6s ease-in-out infinite;
}

.waiting-scan {
  position: absolute;
  inset: 12% 16%;
  border-radius: 14px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    color-mix(in srgb, var(--workspace-accent, #efc24c) 16%, transparent) 48%,
    color-mix(in srgb, var(--workspace-accent, #efc24c) 4%, transparent) 52%,
    transparent 100%
  );
  opacity: 0.75;
  animation: waiting-scan 1.8s linear infinite;
}

.waiting-copy {
  display: grid;
  width: min(100%, 520px);
  justify-items: center;
  gap: 6px;
  text-align: center;
}

.waiting-copy p,
.waiting-copy h2,
.waiting-copy span {
  margin: 0;
}

.waiting-copy p {
  color: var(--assist-blue);
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.04em;
}

.waiting-copy h2 {
  color: var(--assist-text);
  font-size: clamp(20px, 1.8vw, 28px);
  line-height: 1.2;
  font-weight: 950;
}

.waiting-copy span {
  width: 100%;
  max-width: none;
  color: var(--assist-muted);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.7;
  white-space: nowrap;
}

.waiting-progress {
  width: min(100%, 320px);
  height: 8px;
  border-radius: 999px;
  background: color-mix(
    in srgb,
    var(--assist-blue) 12%,
    var(--assist-border-soft)
  );
  overflow: hidden;
}

.waiting-progress span {
  display: block;
  width: 38%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--assist-blue), #63a6ff 60%, #9bc6ff);
  animation: waiting-progress 1.5s ease-in-out infinite;
}

.delivery-result-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 18px;
  margin-bottom: 18px;
}

.delivery-result-head p,
.delivery-result-head h2,
.delivery-result-head span {
  margin: 0;
}

.delivery-result-head p {
  color: var(--assist-blue);
  font-size: 13px;
  font-weight: 900;
}

.delivery-result-head h2 {
  margin-top: 6px;
  color: var(--assist-text);
  font-size: clamp(20px, 1.6vw, 28px);
  line-height: 1.2;
  font-weight: 950;
}

.delivery-result-head span {
  display: block;
  margin-top: 8px;
  color: var(--assist-muted);
  font-size: 13px;
  font-weight: 700;
}

.delivery-panel {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 0;
}

.delivery-panel--placeholder {
  align-items: center;
  justify-content: center;
}

.delivery-download-all {
  flex-shrink: 0;
  height: 40px;
  border: 1px solid
    color-mix(in srgb, var(--workspace-accent, #efc24c) 34%, transparent);
  border-radius: 10px;
  background: color-mix(
    in srgb,
    var(--workspace-accent, #efc24c) 13%,
    transparent
  );
  color: var(--assist-blue);
  padding: 0 16px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}

.delivery-download-all:hover:not(:disabled) {
  border-color: color-mix(
    in srgb,
    var(--workspace-accent, #efc24c) 50%,
    transparent
  );
  background: color-mix(
    in srgb,
    var(--workspace-accent, #efc24c) 20%,
    transparent
  );
}

.delivery-download-all:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.delivery-result-layout {
  display: grid;
  flex: 1;
  min-height: 0;
  align-content: start;
  gap: clamp(10px, 1.2vw, 14px);
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 132px), 1fr));
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 2px 6px 24px 0;
}

@container (min-width: 420px) {
  .delivery-result-layout {
    grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  }
}

@container (min-width: 640px) {
  .delivery-result-layout {
    grid-template-columns: repeat(auto-fill, minmax(156px, 1fr));
  }
}

@container (min-width: 900px) {
  .delivery-result-layout {
    grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  }
}

@container (min-width: 1180px) {
  .delivery-result-layout {
    grid-template-columns: repeat(auto-fill, minmax(176px, 1fr));
  }
}

.delivery-result-card {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  border: 1px solid var(--assist-border);
  border-radius: 12px;
  background: var(--assist-card);
  box-shadow: var(--assist-shadow);
  overflow: hidden;
}

.delivery-result-card.is-clickable {
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.delivery-result-card.is-clickable:hover {
  border-color: color-mix(
    in srgb,
    var(--assist-blue) 42%,
    var(--assist-border)
  );
  box-shadow: 0 10px 24px
    color-mix(in srgb, var(--workspace-accent, #efc24c) 12%, transparent);
  transform: translateY(-1px);
}

.delivery-result-card.is-clickable:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--assist-blue) 55%, transparent);
  outline-offset: 2px;
}

.delivery-result-media {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--workspace-accent, #efc24c) 8%, transparent),
      transparent 42%
    ),
    var(--assist-card-strong);
}

.delivery-result-image {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--assist-card-strong);
}

.delivery-result-foot {
  display: grid;
  gap: 4px;
  padding: 10px 12px 11px;
  border-top: 1px solid var(--assist-border-soft);
  background: color-mix(in srgb, var(--assist-card) 92%, white);
}

.theme-light .delivery-result-foot {
  background: #fff;
}

.delivery-result-name,
.delivery-result-ratio {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delivery-result-name {
  color: var(--assist-text);
  font-size: 13px;
  font-weight: 900;
  line-height: 1.35;
}

.delivery-result-ratio {
  color: var(--assist-muted);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.03em;
  line-height: 1.25;
}

.watermark-feature-layout {
  display: grid;
  flex: 1;
  min-height: 0;
  align-content: start;
  gap: 16px;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0 6px 24px 0;
}

.watermark-feature-layout.is-result-mode {
  grid-template-rows: auto minmax(0, 1fr);
  align-content: stretch;
  gap: 14px;
  overflow: hidden;
  padding: 0 6px 0 0;
}

.watermark-assist-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  min-height: 104px;
  padding: 14px 18px 16px;
  border: 1px solid var(--assist-border);
  border-radius: 14px;
  background: var(--assist-card);
  box-shadow: var(--assist-shadow);
}

.assist-panel.theme-light .watermark-assist-hero,
.assist-panel.theme-light .watermark-compare-section,
.assist-panel.theme-light .watermark-result-section,
.assist-panel.theme-light .generation-waiting {
  border-color: #e1eaf5;
  background: rgba(255, 255, 255, 0.92);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.86),
    0 16px 36px rgba(78, 111, 148, 0.08);
}

.watermark-assist-copy {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.watermark-assist-copy p,
.watermark-assist-copy h2,
.watermark-assist-copy span {
  margin: 0;
}

.watermark-assist-copy p {
  color: var(--assist-blue);
  font-size: 12px;
  font-weight: 950;
  line-height: 1.3;
}

.watermark-assist-copy h2 {
  color: var(--assist-text);
  font-size: 21px;
  font-weight: 950;
  line-height: 1.28;
}

.watermark-assist-copy span {
  display: block;
  color: var(--assist-muted);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
}

.watermark-compare-section {
  padding: 18px;
  border: 1px solid var(--assist-border);
  border-radius: 14px;
  background: var(--assist-card);
  box-shadow: var(--assist-shadow);
}

.watermark-result-section {
  display: flex;
  min-height: 0;
  flex-direction: column;
  padding: 18px;
  border: 1px solid var(--assist-border);
  border-radius: 14px;
  background: var(--assist-card);
  box-shadow: var(--assist-shadow);
}

.watermark-section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.watermark-section-head h3,
.watermark-section-head p {
  margin: 0;
}

.watermark-section-head h3 {
  color: var(--assist-text);
  font-size: 18px;
  font-weight: 950;
  line-height: 1.3;
}

.watermark-section-head p {
  margin-top: 4px;
  color: var(--assist-muted);
  font-size: 12px;
  font-weight: 700;
}

.watermark-compare-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}

.watermark-result-card {
  flex: 1;
  min-width: 0;
  min-height: 0;
  width: 100%;
}

.watermark-result-media {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--assist-border);
  border-radius: 14px;
  background:
    radial-gradient(
      circle at 50% 42%,
      rgba(207, 224, 255, 0.52),
      rgba(248, 251, 255, 0) 44%
    ),
    var(--assist-card-strong);
}

.watermark-result-image {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--assist-card-strong);
}

.assist-panel.theme-light .watermark-result-media {
  border-color: #dce6f3;
  background:
    radial-gradient(
      circle at 50% 42%,
      rgba(207, 224, 255, 0.5),
      rgba(248, 251, 255, 0) 44%
    ),
    linear-gradient(180deg, #ffffff 0%, #f5f8fd 100%);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.78),
    0 14px 32px rgba(78, 111, 148, 0.1);
}

.watermark-compare-card {
  min-width: 0;
  width: 100%;
}

.watermark-compare-media {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 6.75;
  border: 1px solid var(--assist-border);
  border-radius: 14px;
  background: var(--assist-card-strong);
  cursor: ew-resize;
  touch-action: none;
  user-select: none;
}

.watermark-compare-image {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.watermark-compare-image--after {
  z-index: 1;
  clip-path: inset(0 0 0 var(--compare-progress, 50%));
}

.watermark-compare-divider {
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--compare-progress, 50%);
  z-index: 2;
  display: block;
  transform: translateX(-50%);
  pointer-events: none;
}

.watermark-compare-divider span {
  display: block;
  width: 2px;
  height: 100%;
  background: linear-gradient(
    180deg,
    transparent,
    var(--assist-blue),
    transparent
  );
}

.watermark-compare-handle {
  position: absolute;
  top: 50%;
  left: var(--compare-progress, 50%);
  z-index: 3;
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 2px solid #fff;
  border-radius: 999px;
  background: color-mix(in srgb, var(--assist-blue) 88%, #000);
  color: #fff;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
  transform: translate(-50%, -50%);
  cursor: ew-resize;
  touch-action: none;
}

.watermark-compare-handle .iconify {
  font-size: 20px;
}

.watermark-compare-badge {
  position: absolute;
  top: 10px;
  z-index: 4;
  display: inline-flex;
  align-items: center;
  height: 26px;
  border-radius: 999px;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 900;
}

.watermark-compare-badge--before {
  left: 10px;
  background: rgba(0, 0, 0, 0.72);
  color: #fff;
}

.watermark-compare-badge--after {
  right: 10px;
  background: color-mix(in srgb, var(--assist-blue) 90%, #000);
  color: #fff;
}

.tab-group {
  display: flex;
  gap: 34px;
}

.tab-group button,
.expand-button {
  border: 0;
  background: transparent;
  font-family: inherit;
  cursor: pointer;
}

.tab-group button {
  position: relative;
  padding: 0;
  color: var(--assist-tab-color);
  font-size: 15px;
  font-weight: 600;
  transition: color 0.2s ease;
}

.tab-group button:hover:not(.active) {
  color: var(--assist-tab-hover-color);
}

.tab-group button.active {
  color: var(--assist-tab-active-color);
  font-weight: 800;
}

.tab-group button.active:hover {
  color: var(--assist-tab-active-color);
}

.expand-button {
  color: #d4a017;
  font-size: 14px;
  font-weight: 900;
}

.guide-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 2px 20px 0;
}

.assist-panel.theme-dark .guide-layout {
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.28) rgba(255, 255, 255, 0.06);
}

.assist-panel.theme-dark .guide-layout::-webkit-scrollbar {
  width: 8px;
}

.assist-panel.theme-dark .guide-layout::-webkit-scrollbar-track {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
}

.assist-panel.theme-dark .guide-layout::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.28);
}

.assist-panel.theme-dark .guide-layout::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.42);
}

.assist-panel.theme-light .guide-layout {
  padding-right: 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.assist-panel.theme-light .guide-layout::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

.guide-layout.is-compact-guide {
  gap: 12px;
}

.recent-card {
  border: 1px solid var(--assist-border);
  background: var(--assist-card);
  box-shadow: var(--assist-shadow);
}

.assist-panel.theme-light .requirement-section {
  border-color: rgba(203, 213, 225, 0.82);
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
}

.assist-panel.theme-light .requirement-title {
  color: #111827;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.requirement-section {
  display: grid;
  gap: 8px;
  margin-top: auto;
  flex-shrink: 0;
  border-radius: 16px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: #111111;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.requirement-section.is-inline {
  margin-top: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.requirement-title {
  color: #fff;
  font-size: 16px;
  font-weight: 900;
  line-height: 1.3;
}

.requirement-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.requirement-card {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  min-height: 60px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  transition:
    transform 0.25s ease,
    border-color 0.25s ease,
    box-shadow 0.25s ease,
    background-color 0.25s ease;
}

.assist-panel.theme-light .requirement-card {
  border-color: rgba(203, 213, 225, 0.82);
  background: #f8fafc;
  box-shadow: none;
}

.assist-panel.theme-light .requirement-section.is-inline {
  background: transparent;
  box-shadow: none;
}

.requirement-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(
    in srgb,
    var(--workspace-accent, #d4a017) 34%,
    rgba(255, 255, 255, 0.08)
  );
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.assist-panel.theme-light .requirement-card:hover {
  border-color: rgba(212, 160, 23, 0.42);
  background: #ffffff;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.08);
}

.requirement-card-copy {
  display: grid;
  gap: 4px;
  width: 100%;
  min-width: 0;
  text-align: center;
}

.requirement-card-copy strong {
  color: #fff;
  font-size: 12px;
  line-height: 1.35;
  font-weight: 900;
}

.assist-panel.theme-light .requirement-card-copy strong {
  color: #111827;
}

.requirement-card-copy span {
  color: rgba(255, 255, 255, 0.68);
  font-size: 11px;
  line-height: 1.3;
  font-weight: 600;
}

.assist-panel.theme-light .requirement-card-copy span {
  color: rgba(71, 85, 105, 0.86);
}

.recent-layout {
  display: grid;
  flex: 1;
  min-height: 0;
  align-content: start;
  gap: 10px;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  grid-auto-rows: max-content;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 2px 2px 20px 0;
}

.assist-panel.theme-dark .recent-layout {
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.28) rgba(255, 255, 255, 0.06);
}

.assist-panel.theme-dark .recent-layout::-webkit-scrollbar {
  width: 8px;
}

.assist-panel.theme-dark .recent-layout::-webkit-scrollbar-track {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
}

.assist-panel.theme-dark .recent-layout::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.28);
}

.assist-panel.theme-dark .recent-layout::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.42);
}

.assist-panel.theme-light .recent-layout {
  padding-right: 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.assist-panel.theme-light .recent-layout::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

@container assist (max-width: 480px) {
  .recent-layout {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@container assist (max-width: 360px) {
  .recent-layout {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@container assist (max-width: 280px) {
  .recent-layout {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.recent-empty-state {
  grid-column: 1 / -1;
  display: grid;
  min-height: 180px;
  place-items: center;
  align-content: center;
  gap: 10px;
  border: 1px dashed var(--assist-border);
  border-radius: 14px;
  background: var(--assist-card);
  color: var(--assist-muted);
  font-size: 13px;
}

.recent-loading-icon {
  width: 26px;
  height: 26px;
  color: var(--assist-blue);
}

.recent-empty-state .recent-loading-icon {
  animation: recent-loading-spin 1s linear infinite;
}

@keyframes recent-loading-spin {
  to {
    transform: rotate(360deg);
  }
}

.recent-card {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  border: 1px solid var(--assist-border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--assist-card) 92%, white);
  box-shadow: var(--assist-shadow);
  overflow: hidden;
}

.theme-light .recent-card {
  background: #fff;
}

.recent-card.is-clickable {
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.recent-card.is-clickable:hover {
  transform: translateY(-1px);
  border-color: var(
    --workspace-accent-border,
    color-mix(in srgb, var(--assist-blue) 45%, var(--assist-border))
  );
  background: var(--workspace-hover-bg, inherit);
  box-shadow:
    0 0 0 2px
      var(
        --workspace-accent-glow,
        color-mix(in srgb, var(--workspace-accent, #efc24c) 12%, transparent)
      ),
    var(--assist-shadow);
}

.recent-card.is-clickable:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--assist-blue) 55%, transparent);
  outline-offset: 2px;
}

.recent-media {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 10px 10px 0 0;
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--workspace-accent, #efc24c) 8%, transparent),
      transparent 42%
    ),
    var(--assist-card-strong);

  :deep(.preload-image) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
}

.recent-image {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 10px 10px 0 0;
  background: var(--assist-card-strong);
}

.recent-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--assist-muted);
  font-size: 26px;
}

.recent-pending-slot {
  position: absolute;
  inset: 0;
}

.recent-foot {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 4px;
  min-height: 68px;
  padding: 9px 10px 11px;
  background: inherit;
}

.recent-name,
.recent-scene,
.recent-time {
  margin: 0;
  min-width: 0;
  line-height: 1.4;
}

.recent-name {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--assist-text);
  font-size: 12px;
  font-weight: 800;
}

.recent-scene {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  color: var(--assist-muted);
  font-size: 11px;
  font-weight: 600;
}

.recent-foot-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
}

.recent-time {
  display: inline-flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  color: var(--assist-muted);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.recent-time-icon {
  flex-shrink: 0;
  font-size: 13px;
  opacity: 0.72;
}

.recent-delete-btn {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #ef4444;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    opacity 0.2s ease;
}

.recent-delete-btn:hover:not(:disabled) {
  background: rgba(220, 38, 38, 0.12);
  color: #dc2626;
}

.recent-delete-btn:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.recent-delete-icon--loading {
  animation: recent-loading-spin 1s linear infinite;
}

.recent-status {
  position: absolute;
  left: 8px;
  top: 8px;
  z-index: 1;
  display: inline-flex;
  max-width: calc(100% - 16px);
  align-items: center;
  gap: 4px;
  overflow: hidden;
  padding: 4px 8px;
  border-radius: 6px;
  backdrop-filter: blur(6px);
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
}

.recent-status-icon {
  flex-shrink: 0;
  font-size: 12px;
}

.recent-status.is-generating {
  background: rgba(255, 193, 7, 0.92);
  color: #7a4f00;
}

.recent-status.is-success {
  background: rgba(39, 183, 125, 0.92);
  color: #fff;
}

.recent-status.is-waiting {
  background: rgba(255, 214, 102, 0.94);
  color: #7a5b00;
}

.recent-status.is-queued,
.recent-status.is-queue {
  background: rgba(255, 167, 64, 0.94);
  color: #7a3b00;
}

.recent-status.is-fail {
  background: rgba(239, 99, 99, 0.92);
  color: #fff;
}

.recent-status.is-canceled {
  background: rgba(120, 120, 120, 0.88);
  color: #fff;
}

@media (max-height: 820px) {
  .assist-panel {
    padding: 12px 14px 14px;
  }

  .assist-tabs {
    margin-bottom: 18px;
    min-height: 32px;
  }

  .recent-layout {
    gap: 8px;
    padding-bottom: 16px;
  }

  .recent-foot {
    min-height: 58px;
    padding: 7px 8px 9px;
  }

  .recent-media {
    aspect-ratio: 4 / 3;
  }

  .recent-name {
    font-size: 11px;
    -webkit-line-clamp: 1;
  }

  .recent-status {
    padding: 3px 6px;
    font-size: 10px;
  }
}

@media (max-width: 1500px) {
  .assist-panel {
    padding: 14px 16px 16px;
  }

  .assist-tabs {
    margin-bottom: 18px;
  }

  .guide-layout {
    gap: 10px;
    padding-right: 4px;
  }

  .requirement-grid {
    gap: 10px;
  }
}

@media (max-width: 1180px) {
  .delivery-result-head {
    flex-direction: column;
  }

  .delivery-result-head button {
    width: 100%;
  }

  .watermark-assist-hero {
    grid-template-columns: minmax(0, 1fr);
  }

  .watermark-recent-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .requirement-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 760px) {
  .watermark-assist-panel {
    padding-right: 0;
  }

  .watermark-assist-hero {
    padding: 14px 14px 16px;
  }

  .watermark-compare-grid,
  .watermark-recent-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .requirement-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .watermark-section-head {
    align-items: flex-start;
    flex-direction: column;
  }
}

@keyframes waiting-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.82;
  }
  50% {
    transform: scale(1.04);
    opacity: 1;
  }
}

@keyframes waiting-scan {
  0% {
    transform: translateY(-24%);
    opacity: 0;
  }
  20% {
    opacity: 0.85;
  }
  50% {
    opacity: 0.95;
  }
  80% {
    opacity: 0.7;
  }
  100% {
    transform: translateY(24%);
    opacity: 0;
  }
}

@keyframes waiting-progress {
  0% {
    transform: translateX(-130%);
  }
  100% {
    transform: translateX(330%);
  }
}
</style>
