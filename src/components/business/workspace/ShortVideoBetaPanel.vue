<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Icon } from "@iconify/vue";
import { NModal, useMessage } from "naive-ui";

import HoverPreviewVideo from "@/components/common/HoverPreviewVideo.vue";
import PreloadImage from "@/components/common/PreloadImage.vue";
import TemplatePreviewVideoPlayer from "@/components/business/workspace/TemplatePreviewVideoPlayer.vue";
import { VIDEO_GENERATION_FLOW_KEY } from "@/constants/video-generation";
import { resolveTemplatePosterUrl, resolveTemplatePreviewUrl, shouldPreferVideoCover } from "@/constants/video-template-previews";
import {
  getVideoTaskStatusLabel,
  getVideoWorkflowStageLabel,
  VIDEO_OUTPUT_RATIO,
  VIDEO_RESOLUTION,
} from "@/constants/short-video";
import type { VideoGenerationFlow } from "@/composables/useVideoGenerationFlow";
import { useAppStore } from "@/stores/app";
import type { WorkspaceRecentItem } from "@/types/workspace";
import {
  shortVideoTemplateCategories,
  shortVideoTemplateStyles,
  type ShortVideoTemplateCategory,
} from "@/constants/short-video-templates";
import type { VideoHistoryItem, VideoTemplate } from "@/types/video-generation";
import {
  parseOutputRatioToCssAspect,
  recentStatusLabelMap,
  resolveRecentDisplayImage,
} from "@/utils/workspace-recent";
import { formatDate } from "@/utils/dayjs";
import {
  distributeMasonryColumns,
  estimateRecentHeightRatio,
  resolveMasonryGridColumns,
} from "@/utils/workspace-recent-layout";

const props = defineProps<{
  isGenerating?: boolean;
  recentItems?: WorkspaceRecentItem[];
  recentLoading?: boolean;
  deletingRecentTaskIds?: string[];
  initialView?: "templates" | "generating" | "recent";
}>();

type ShortVideoView = "templates" | "generating" | "recent";

const PENDING_RECENT_STATUSES = new Set([
  "waiting",
  "queued",
  "queue",
  "generating",
]);

const emit = defineEmits<{
  pickRecent: [item: WorkspaceRecentItem];
  deleteRecent: [item: WorkspaceRecentItem];
}>();

const message = useMessage();
const appStore = useAppStore();
const flow = inject<VideoGenerationFlow | null>(VIDEO_GENERATION_FLOW_KEY, null);

const activeView = ref<ShortVideoView>("templates");
const activeCategory = ref<ShortVideoTemplateCategory>("all");
const activeStyle = ref("all");
const searchQuery = ref("");
const selectedRecentItemId = ref("");
const templatePreviewSession = ref<VideoTemplate | null>(null);
const templateGridRef = ref<HTMLElement | null>(null);
const templateGridColumns = ref(2);
const recentGridRef = ref<HTMLElement | null>(null);
const recentGridColumns = ref(2);

function estimateTemplateHeightRatio(item: VideoTemplate): number {
  return item.outputRatio === "16:9" ? 9 / 16 : 16 / 9;
}

const templateColumns = computed(() =>
  distributeMasonryColumns(
    filteredTemplates.value,
    templateGridColumns.value,
    estimateTemplateHeightRatio,
  ),
);

const recentColumns = computed(() =>
  distributeMasonryColumns(
    recentDisplayItems.value,
    recentGridColumns.value,
    estimateRecentHeightRatio,
  ),
);

function resolveRecentCoverUrl(item: WorkspaceRecentItem): string | undefined {
  return resolveRecentDisplayImage(item);
}

function resolveRecentAspectRatio(item: WorkspaceRecentItem): string | undefined {
  return parseOutputRatioToCssAspect(item.outputRatio);
}

function formatRecentCreatedAt(item: WorkspaceRecentItem): string {
  if (!item.createdAt) return "";
  return formatDate(item.createdAt, "YYYY-MM-DD HH:mm");
}

let templateGridResizeObserver: ResizeObserver | null = null;
let recentGridResizeObserver: ResizeObserver | null = null;

function updateTemplateGridColumns() {
  const width = templateGridRef.value?.clientWidth;
  if (!width) return;
  templateGridColumns.value = resolveMasonryGridColumns(width);
}

function updateRecentGridColumns() {
  const width = recentGridRef.value?.clientWidth;
  if (!width) return;
  recentGridColumns.value = resolveMasonryGridColumns(width);
}

function observeTemplateGrid(el: HTMLElement | null) {
  if (!el || !templateGridResizeObserver) return;
  templateGridResizeObserver.disconnect();
  templateGridResizeObserver.observe(el);
}

function observeRecentGrid(el: HTMLElement | null) {
  if (!el || !recentGridResizeObserver) return;
  recentGridResizeObserver.disconnect();
  recentGridResizeObserver.observe(el);
}

onMounted(() => {
  updateTemplateGridColumns();
  updateRecentGridColumns();
  if (typeof ResizeObserver === "undefined") return;

  templateGridResizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (entry) {
      templateGridColumns.value = resolveMasonryGridColumns(entry.contentRect.width);
    }
  });
  observeTemplateGrid(templateGridRef.value);

  recentGridResizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (entry) {
      recentGridColumns.value = resolveMasonryGridColumns(entry.contentRect.width);
    }
  });
  observeRecentGrid(recentGridRef.value);
});

watch(templateGridRef, (el) => {
  if (!el) return;
  updateTemplateGridColumns();
  observeTemplateGrid(el);
});

watch(recentGridRef, (el) => {
  if (!el) return;
  updateRecentGridColumns();
  observeRecentGrid(el);
});

onBeforeUnmount(() => {
  if (templateGridResizeObserver) {
    templateGridResizeObserver.disconnect();
    templateGridResizeObserver = null;
  }
  if (recentGridResizeObserver) {
    recentGridResizeObserver.disconnect();
    recentGridResizeObserver = null;
  }
});

const recentVideoItems = computed(() => props.recentItems ?? []);
const recentDisplayItems = computed(() => recentVideoItems.value);
const statusLabelMap = recentStatusLabelMap;

const currentTask = computed(() => flow?.currentTask.value ?? null);
const isDraftGenerating = computed(() => flow?.isLoading("draft") ?? false);
const templateList = computed(() => flow?.templateList.value ?? []);
const selectedTemplateId = computed(
  () => flow?.selectedTemplate.value?.templateId ?? "",
);
const templatesLoading = computed(() => flow?.isLoading("bootstrap") ?? false);

const categoryTypeMap: Record<Exclude<ShortVideoTemplateCategory, "all">, string> = {
  showroom: "dealership",
  "single-car": "single-car",
  "vehicle-ad": "vehicle-ad",
};

const visibleTemplateTypes = new Set(["dealership", "single-car", "vehicle-ad"]);

const filteredTemplates = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase();

  return templateList.value.filter((item) => {
    if (!visibleTemplateTypes.has(item.type)) return false;

    if (activeCategory.value !== "all") {
      const mappedType = categoryTypeMap[activeCategory.value];
      if (item.type !== mappedType) return false;
    }

    if (activeStyle.value !== "all" && item.style !== activeStyle.value) {
      return false;
    }

    if (!keyword) return true;

    const haystack = [
      item.title,
      item.typeLabel,
      item.styleLabel,
      item.stylePrompt,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(keyword);
  });
});

const isSubmittingVideoTask = computed(() => flow?.isLoading("task") ?? false);

const generatingProgress = computed(() => {
  const task = currentTask.value;
  if (isSubmittingVideoTask.value) return 8;
  if (isDraftGenerating.value) return 8;
  if (!task) return props.isGenerating ? 8 : 0;
  return Math.max(0, Math.min(100, task.progress ?? 0));
});

const generatingStatusLabel = computed(() => {
  if (isSubmittingVideoTask.value) return "正在提交视频任务";
  const task = currentTask.value;
  if (isDraftGenerating.value) return "视频文案生成中";
  if (!task) return "正在准备视频任务";
  const stageLabel = getVideoWorkflowStageLabel(task.workflowStage ?? undefined);
  if (stageLabel) return stageLabel;
  return getVideoTaskStatusLabel(task.status);
});

const generatingDescription = computed(() => {
  if (isSubmittingVideoTask.value) {
    return "正在创建视频生成任务，请稍候。";
  }
  if (isDraftGenerating.value) return "正在生成口播文案与视频任务参数，请稍候。";
  const ratio =
    flow?.selectedTemplate.value?.outputRatio ??
    currentTask.value?.outputRatio ??
    VIDEO_OUTPUT_RATIO;
  const resolution =
    flow?.selectedTemplate.value?.videoResolution ??
    currentTask.value?.resolution ??
    VIDEO_RESOLUTION;
  return `输出 ${ratio} · ${resolution}，请稍候。`;
});

const generatingErrorMessage = computed(() => {
  const task = currentTask.value;
  if (task?.status !== "fail") return "";
  return task.error?.message ?? "视频生成失败，请稍后重试";
});

const isGenerationMode = computed(() => {
  if (flow?.currentStep.value !== "task") return false;
  if (isSubmittingVideoTask.value) return true;
  if (!currentTask.value) return false;
  return props.isGenerating || isPendingTask(currentTask.value);
});

function shouldShowGeneratingView() {
  if (flow?.currentStep.value !== "task") return false;
  if (isSubmittingVideoTask.value) return true;
  return isPendingTask(currentTask.value) || props.isGenerating;
}

function syncSelectedRecentItem() {
  const displayItems = recentDisplayItems.value;
  if (!displayItems.length) {
    selectedRecentItemId.value = "";
    return;
  }

  if (
    !displayItems.some((item) => item.id === selectedRecentItemId.value)
  ) {
    selectedRecentItemId.value = displayItems[0].id;
  }
}

watch(recentDisplayItems, syncSelectedRecentItem, { immediate: true });

function resolveShortVideoView(
  preferred?: ShortVideoView | "recent" | "templates",
): ShortVideoView {
  const step = flow?.currentStep.value;
  if (shouldShowGeneratingView() && step === "task") {
    return "generating";
  }
  if (preferred === "generating") return "generating";
  if (preferred === "recent") return "recent";
  if (preferred === "templates") return "templates";
  return "templates";
}

function shouldKeepTemplatesView() {
  const step = flow?.currentStep.value;
  return step === "template" || step === "form" || step === "review";
}

function isTemplateDisabled(template: VideoTemplate) {
  return (
    template.status === "coming_soon" ||
    template.generationReadiness === "unavailable" ||
    template.type === "market" ||
    template.type === "vehicle-ad"
  );
}

function getTemplatePosterUrl(template: VideoTemplate) {
  return resolveTemplatePosterUrl(template);
}

function getTemplateVideoUrl(template: VideoTemplate) {
  return resolveTemplatePreviewUrl(template);
}

function useVideoTemplateCover(template: VideoTemplate) {
  return shouldPreferVideoCover(template);
}

function openTemplatePreview(item: VideoTemplate) {
  if (isTemplateDisabled(item)) {
    message.info("该模板暂未开放，敬请期待！");
    return;
  }
  flow?.selectTemplate(item);
  templatePreviewSession.value = item;
}

function closeTemplatePreviewPlayer() {
  templatePreviewSession.value = null;
}

function handleTemplatePreviewVisibleChange(show: boolean) {
  if (!show) {
    closeTemplatePreviewPlayer();
  }
}

function openTemplatesView() {
  activeView.value = "templates";
}

function resetToDefaultView() {
  activeView.value = "templates";
}

function syncActiveViewWithFlowState() {
  if (isGenerationMode.value && shouldShowGeneratingView()) {
    activeView.value = "generating";
    return;
  }

  if (activeView.value === "generating") {
    resetToDefaultView();
  }
}

function isPendingTask(task?: VideoHistoryItem | null) {
  if (!task) return false;
  return PENDING_RECENT_STATUSES.has(task.status);
}

function openRecentView() {
  activeView.value = "recent";
}

function openGeneratingView() {
  activeView.value = "generating";
}

function shouldShowRecentStatus(item: WorkspaceRecentItem) {
  return item.status !== "success";
}

function canOpenRecentVideo(item: WorkspaceRecentItem) {
  return Boolean(item.taskId) || (item.status === "success" && Boolean(item.downloadUrl));
}

function resolveRecentTaskId(item: WorkspaceRecentItem) {
  return item.taskId ?? item.id;
}

function isDeletingRecent(item: WorkspaceRecentItem) {
  const taskId = resolveRecentTaskId(item);
  return taskId ? (props.deletingRecentTaskIds?.includes(taskId) ?? false) : false;
}

function handleDeleteRecent(item: WorkspaceRecentItem) {
  emit("deleteRecent", item);
}

function handleRecentPick(item: WorkspaceRecentItem) {
  if (!canOpenRecentVideo(item)) return;

  selectedRecentItemId.value = item.id;

  if (PENDING_RECENT_STATUSES.has(item.status)) {
    activeView.value = "generating";
  }

  emit("pickRecent", item);
}

watch(
  () => props.initialView,
  (view) => {
    activeView.value = resolveShortVideoView(view);
    syncActiveViewWithFlowState();
  },
);

watch(
  () => props.isGenerating,
  (generating) => {
    if (generating && flow?.currentStep.value === "task") {
      activeView.value = "generating";
      return;
    }

    if (!generating) {
      syncActiveViewWithFlowState();
    }
  },
  { immediate: true },
);

watch(
  () =>
    [
      isGenerationMode.value,
      flow?.currentStep.value,
      isSubmittingVideoTask.value,
      currentTask.value?.status,
    ] as const,
  () => {
    syncActiveViewWithFlowState();
  },
);

watch(currentTask, (task) => {
  if (!task) {
    syncActiveViewWithFlowState();
    return;
  }
  if (isPendingTask(task) && flow?.currentStep.value === "task") {
    activeView.value = "generating";
    return;
  }
  if (task.status === "success" || task.status === "fail" || task.status === "canceled") {
    syncActiveViewWithFlowState();
  }
});

onMounted(() => {
  void flow?.loadHistory();
  if (shouldKeepTemplatesView()) {
    activeView.value = "templates";
  }
});

watch(
  () => flow?.currentStep.value,
  (step) => {
    if (step === "task" && shouldShowGeneratingView()) {
      activeView.value = "generating";
      return;
    }
    if (step === "template" || step === "form" || step === "review" || step === "result") {
      syncActiveViewWithFlowState();
    }
  },
);
</script>

<template>
  <section
    class="sv-beta-panel"
    :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'"
    aria-label="短视频模板库"
  >
    <div
      v-if="isGenerationMode"
      class="sv-generation-shell"
      aria-label="视频生成状态"
    >
      <header class="sv-generation-tabs">
        <div class="sv-generation-tab-group" role="tablist" aria-label="视频生成视图">
          <button
            type="button"
            role="tab"
            class="sv-generation-tab"
            :class="{ 'is-active': activeView === 'generating' }"
            :aria-selected="activeView === 'generating'"
            @click="openGeneratingView"
          >
            正在生成
          </button>
          <button
            type="button"
            role="tab"
            class="sv-generation-tab"
            :class="{ 'is-active': activeView === 'recent' }"
            :aria-selected="activeView === 'recent'"
            @click="openRecentView"
          >
            最近生成
          </button>
        </div>
      </header>

      <div class="sv-generation-body">
        <section
          v-if="activeView === 'generating'"
          class="sv-generation-waiting"
          aria-live="polite"
        >
          <div class="sv-generating-visual" aria-hidden="true">
            <span class="sv-generating-scan"></span>
            <Icon icon="mdi:video-outline" />
          </div>

          <div class="sv-generating-copy">
            <p>{{ currentTask?.title || currentTask?.vehicleName || "视频生成" }}</p>
            <h2>{{ generatingStatusLabel }}</h2>
            <span>{{ generatingDescription }}</span>
            <p v-if="generatingErrorMessage" class="sv-generating-error">
              {{ generatingErrorMessage }}
            </p>
          </div>

          <div
            class="sv-generating-progress"
            role="progressbar"
            :aria-valuenow="generatingProgress"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <span :style="{ width: `${Math.max(generatingProgress, 8)}%` }"></span>
          </div>
        </section>

        <section
          v-else
          class="sv-recent-panel"
          aria-label="最近生成"
        >
          <div v-if="recentLoading && !recentDisplayItems.length" class="sv-empty-state">
            <Icon icon="mdi:loading" class="sv-spin" />
            <span>正在加载最近生成</span>
          </div>
          <div v-else-if="!recentDisplayItems.length" class="sv-empty-state">
            <Icon icon="mdi:video-off-outline" />
            <span>暂无最近生成记录</span>
          </div>
          <div
            v-else
            ref="recentGridRef"
            class="sv-template-grid sv-recent-grid"
          >
            <div
              v-for="(column, columnIndex) in recentColumns"
              :key="`recent-column-${columnIndex}`"
              class="sv-template-column"
            >
              <article
                v-for="item in column"
                :key="item.id"
                class="sv-recent-card"
                :class="{
                  'is-selected': item.id === selectedRecentItemId,
                  'is-clickable': canOpenRecentVideo(item),
                }"
                :role="canOpenRecentVideo(item) ? 'button' : undefined"
                :tabindex="canOpenRecentVideo(item) ? 0 : undefined"
                :aria-label="`查看 ${item.title}`"
                @click="handleRecentPick(item)"
                @keydown.enter.prevent="handleRecentPick(item)"
                @keydown.space.prevent="handleRecentPick(item)"
              >
                <div class="sv-recent-card-media" :style="{ aspectRatio: resolveRecentAspectRatio(item) }">
                  <PreloadImage
                    v-if="resolveRecentCoverUrl(item)"
                    class="sv-recent-card-cover"
                    :src="resolveRecentCoverUrl(item)!"
                    :alt="item.title"
                    loading="lazy"
                    fit="cover"
                  />
                  <div v-else class="sv-recent-card-placeholder">
                    <Icon icon="mdi:video-off-outline" />
                  </div>
                  <span
                    v-if="shouldShowRecentStatus(item)"
                    class="sv-recent-card-status"
                    :class="`is-${item.status}`"
                  >
                    {{ statusLabelMap[item.status] }}
                  </span>
                  <div class="sv-recent-card-body">
                    <strong class="sv-recent-card-title">{{ item.title }}</strong>
                    <span class="sv-recent-card-time">{{ formatRecentCreatedAt(item) }}</span>
                  </div>
                </div>
                <button
                  type="button"
                  class="sv-recent-card-delete"
                  :aria-label="`删除${item.title}`"
                  :disabled="isDeletingRecent(item)"
                  @click.stop="handleDeleteRecent(item)"
                >
                  <Icon
                    :icon="isDeletingRecent(item) ? 'mdi:loading' : 'mdi:trash-can-outline'"
                    :class="{ 'sv-recent-card-delete--loading': isDeletingRecent(item) }"
                  />
                </button>
              </article>
            </div>
          </div>
        </section>
      </div>
    </div>

    <section
      v-else
      class="sv-main-shell"
      aria-label="短视频辅助面板"
    >
      <header class="sv-primary-tabs" role="tablist" aria-label="短视频视图">
        <button
          type="button"
          role="tab"
          class="sv-primary-tab"
          :class="{ 'is-active': activeView === 'recent' }"
          :aria-selected="activeView === 'recent'"
          @click="openRecentView"
        >
          最近生成
        </button>
        <button
          type="button"
          role="tab"
          class="sv-primary-tab"
          :class="{ 'is-active': activeView === 'templates' }"
          :aria-selected="activeView === 'templates'"
          @click="openTemplatesView"
        >
          模板库
        </button>
      </header>

      <section
        v-if="activeView === 'recent'"
        class="sv-recent-panel"
        aria-label="最近生成"
      >
        <div v-if="recentLoading && !recentDisplayItems.length" class="sv-empty-state">
          <Icon icon="mdi:loading" class="sv-spin" />
          <span>正在加载最近生成</span>
        </div>
        <div v-else-if="!recentDisplayItems.length" class="sv-empty-state">
          <Icon icon="mdi:video-off-outline" />
          <span>暂无最近生成记录</span>
        </div>
        <div
          v-else
          ref="recentGridRef"
          class="sv-template-grid sv-recent-grid"
        >
          <div
            v-for="(column, columnIndex) in recentColumns"
            :key="`recent-column-${columnIndex}`"
            class="sv-template-column"
          >
            <article
              v-for="item in column"
              :key="item.id"
              class="sv-recent-card"
              :class="{
                'is-selected': item.id === selectedRecentItemId,
                'is-clickable': canOpenRecentVideo(item),
              }"
              :role="canOpenRecentVideo(item) ? 'button' : undefined"
              :tabindex="canOpenRecentVideo(item) ? 0 : undefined"
              :aria-label="`查看 ${item.title}`"
              @click="handleRecentPick(item)"
              @keydown.enter.prevent="handleRecentPick(item)"
              @keydown.space.prevent="handleRecentPick(item)"
            >
              <div class="sv-recent-card-media" :style="{ aspectRatio: resolveRecentAspectRatio(item) }">
                <PreloadImage
                  v-if="resolveRecentCoverUrl(item)"
                  class="sv-recent-card-cover"
                  :src="resolveRecentCoverUrl(item)!"
                  :alt="item.title"
                  loading="lazy"
                  fit="cover"
                />
                <div v-else class="sv-recent-card-placeholder">
                  <Icon icon="mdi:video-off-outline" />
                </div>
                <span
                  v-if="shouldShowRecentStatus(item)"
                  class="sv-recent-card-status"
                  :class="`is-${item.status}`"
                >
                  {{ statusLabelMap[item.status] }}
                </span>
                <div class="sv-recent-card-body">
                  <strong class="sv-recent-card-title">{{ item.title }}</strong>
                  <span class="sv-recent-card-time">{{ formatRecentCreatedAt(item) }}</span>
                </div>
              </div>
              <button
                type="button"
                class="sv-recent-card-delete"
                :aria-label="`删除${item.title}`"
                :disabled="isDeletingRecent(item)"
                @click.stop="handleDeleteRecent(item)"
              >
                <Icon
                  :icon="isDeletingRecent(item) ? 'mdi:loading' : 'mdi:trash-can-outline'"
                  :class="{ 'sv-recent-card-delete--loading': isDeletingRecent(item) }"
                />
              </button>
            </article>
          </div>
        </div>
      </section>

      <section
        v-else
        class="sv-gallery"
        aria-label="短视频模板"
      >
        <header class="sv-gallery-toolbar">
          <div class="sv-gallery-tabs" role="tablist" aria-label="模板分类">
            <button
              v-for="category in shortVideoTemplateCategories"
              :key="category.id"
              type="button"
              role="tab"
              class="sv-gallery-tab"
              :class="{ 'is-active': activeCategory === category.id }"
              :aria-selected="activeCategory === category.id"
              @click="activeCategory = category.id"
            >
              {{ category.label }}
            </button>
          </div>

          <div class="sv-gallery-actions">
            <label class="sv-style-filter">
              <span class="sv-style-filter-label">风格筛选</span>
              <select v-model="activeStyle">
                <option
                  v-for="style in shortVideoTemplateStyles"
                  :key="style.id"
                  :value="style.id"
                >
                  {{ style.label }}
                </option>
              </select>
              <Icon icon="mdi:chevron-down" aria-hidden="true" />
            </label>

            <label class="sv-search">
              <Icon icon="mdi:magnify" aria-hidden="true" />
              <input
                v-model="searchQuery"
                type="search"
                placeholder="搜索模板名称或关键词..."
              />
            </label>
          </div>
        </header>

        <div v-if="templatesLoading && !templateList.length" class="sv-empty-state sv-empty-state--inline">
          <Icon icon="mdi:loading" class="sv-spin" />
          <span>正在加载模板库</span>
        </div>
        <div v-else-if="!filteredTemplates.length" class="sv-empty-state sv-empty-state--inline">
          <Icon icon="mdi:movie-search-outline" />
          <span>未找到匹配模板，请调整筛选条件</span>
        </div>
        <div
          v-else
          ref="templateGridRef"
          class="sv-template-grid"
        >
          <div
            v-for="(column, columnIndex) in templateColumns"
            :key="columnIndex"
            class="sv-template-column"
          >
            <article
              v-for="item in column"
              :key="item.templateId"
              class="sv-template-card"
              :class="{
                'is-selected': selectedTemplateId === item.templateId,
                'is-disabled': isTemplateDisabled(item),
                'is-landscape': item.outputRatio === '16:9',
              }"
              role="button"
              tabindex="0"
              :aria-label="`预览模板 ${item.title}`"
              @click="openTemplatePreview(item)"
              @keydown.enter.prevent="openTemplatePreview(item)"
              @keydown.space.prevent="openTemplatePreview(item)"
            >
            <div class="sv-template-media">
              <PreloadImage
                v-if="getTemplatePosterUrl(item) && !useVideoTemplateCover(item)"
                class="sv-template-cover sv-template-cover--poster"
                :src="getTemplatePosterUrl(item)!"
                :alt="item.title"
                loading="lazy"
                decoding="async"
                fit="cover"
              />
              <HoverPreviewVideo
                v-if="getTemplateVideoUrl(item)"
                class="sv-template-cover sv-template-cover--video"
                :class="{
                  'is-poster-backed':
                    Boolean(getTemplatePosterUrl(item)) && !useVideoTemplateCover(item),
                }"
                :src="getTemplateVideoUrl(item)!"
                :alt="item.title"
                :disabled="isTemplateDisabled(item)"
                lazy
              />
              <div
                v-if="!getTemplateVideoUrl(item) && (!getTemplatePosterUrl(item) || useVideoTemplateCover(item))"
                class="sv-template-cover sv-template-cover--placeholder"
              >
                <Icon icon="mdi:image-outline" />
              </div>
              <strong class="sv-template-title">{{ item.title }}</strong>
            </div>
          </article>
          </div>
        </div>
      </section>

    </section>

    <NModal
      v-if="templatePreviewSession"
      :show="true"
      preset="card"
      :title="templatePreviewSession.title"
      class="sv-template-preview-modal"
      :bordered="false"
      :segmented="{ content: true }"
      :mask-closable="true"
      @update:show="handleTemplatePreviewVisibleChange"
    >
      <div class="sv-template-preview-body">
        <div class="sv-template-preview-media">
          <TemplatePreviewVideoPlayer
            v-if="getTemplateVideoUrl(templatePreviewSession)"
            :key="templatePreviewSession.templateId"
            :src="getTemplateVideoUrl(templatePreviewSession)!"
            :poster="getTemplatePosterUrl(templatePreviewSession) ?? undefined"
            :template-id="templatePreviewSession.templateId"
          />
          <PreloadImage
            v-else-if="getTemplatePosterUrl(templatePreviewSession)"
            class="sv-template-preview-poster"
            :src="getTemplatePosterUrl(templatePreviewSession)!"
            :alt="templatePreviewSession.title"
            fit="contain"
          />
          <div v-else class="sv-template-preview-placeholder">
            <Icon icon="mdi:movie-open-outline" />
          </div>
        </div>

        <div class="sv-template-preview-meta">
          <div class="sv-template-preview-tags">
            <template v-if="templatePreviewSession.previewSubtitle">
              <span>最长时长：{{ templatePreviewSession.durationSeconds }}s</span>
              <span class="is-accent">视频内容：{{ templatePreviewSession.previewSubtitle }}</span>
            </template>
            <template v-else>
              <span>{{ templatePreviewSession.typeLabel }}</span>
              <span class="is-accent">{{ templatePreviewSession.styleLabel }}</span>
              <span>最长 {{ templatePreviewSession.durationSeconds }} 秒</span>
            </template>
          </div>
          <p>{{ templatePreviewSession.stylePrompt }}</p>
        </div>
      </div>
    </NModal>
  </section>
</template>

<style scoped lang="scss">
.sv-beta-panel {
  --sv-bg: #090b0f;
  --sv-surface: #12151b;
  --sv-border: rgba(255, 255, 255, 0.08);
  --sv-text: #f8fafc;
  --sv-text-soft: #94a3b8;
  --sv-accent: #d4b06a;
  --sv-accent-soft: rgba(212, 176, 106, 0.16);
  --sv-input-bg: rgba(255, 255, 255, 0.04);

  display: flex;
  width: 100%;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  border-radius: 20px;
  background: var(--sv-bg);
  color: var(--sv-text);
}

.sv-beta-panel.theme-light {
  --sv-bg: transparent;
  --sv-surface: #ffffff;
  --sv-border: #e1eaf5;
  --sv-text: #111827;
  --sv-text-soft: #64748b;
  --sv-accent: var(--workspace-accent, #d4a017);
  --sv-accent-soft: color-mix(
    in srgb,
    var(--workspace-accent, #d4a017) 12%,
    transparent
  );
  --sv-input-bg: #ffffff;
  background: transparent;
  color: var(--sv-text);
}

.sv-beta-panel.theme-light .sv-primary-tabs {
  gap: 34px;
  padding: 0;
  border-radius: 0;
  background: transparent;
}

.sv-beta-panel.theme-light .sv-primary-tab {
  padding: 0;
  border-radius: 0;
  color: #8a95a3;
  font-size: 15px;
  font-weight: 600;
}

.sv-beta-panel.theme-light .sv-primary-tab.is-active {
  background: transparent;
  color: #111827;
  font-weight: 800;
}

.sv-beta-panel.theme-light .sv-empty-state {
  border-color: #e1eaf5;
  background: #ffffff;
  color: #64748b;
}

.sv-beta-panel.theme-light .sv-generating-visual {
  background:
    radial-gradient(
      circle at 50% 42%,
      color-mix(in srgb, var(--sv-accent) 13%, transparent),
      transparent 38%
    ),
    linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%);
}

.sv-beta-panel.theme-light .sv-generating-progress {
  background: rgba(47, 107, 255, 0.08);
}

.sv-beta-panel.theme-light .sv-preview-player {
  background: #0f172a;
}

.sv-main-shell {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  padding-top: 12px;
}

.sv-generation-shell {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

.sv-generation-tabs {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  min-height: 32px;
  margin-bottom: 12px;
  padding: 12px 16px 0;
}

.sv-generation-tab-group {
  display: flex;
  gap: 34px;
}

.sv-generation-tab {
  position: relative;
  border: 0;
  background: transparent;
  color: var(--sv-text-soft);
  padding: 0;
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s ease;
}

.sv-generation-tab:hover:not(.is-active) {
  color: var(--sv-text);
}

.sv-generation-tab.is-active {
  color: var(--sv-text);
  font-weight: 800;
}

.sv-generation-body {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

.sv-generation-waiting {
  display: grid;
  align-content: center;
  justify-items: center;
  min-height: 0;
  flex: 1;
  gap: 18px;
  padding: clamp(24px, 3vw, 40px) 16px;
}

.sv-beta-panel.theme-light .sv-generation-tab {
  color: #8a95a3;
}

.sv-beta-panel.theme-light .sv-generation-tab.is-active {
  color: #111827;
}

.sv-primary-tabs {
  display: inline-flex;
  flex-shrink: 0;
  gap: 6px;
  align-items: center;
  align-self: flex-start;
  min-height: 32px;
  margin-inline: 18px 16px;
  padding: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
}

.sv-primary-tab {
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--sv-text-soft);
  padding: 6px 14px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition:
    background 180ms ease,
    color 180ms ease;
}

.sv-primary-tab.is-active {
  background: var(--sv-accent-soft);
  color: var(--sv-accent);
}

.sv-gallery {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 16px;
  padding: 0 16px 20px 18px;
}

.sv-gallery-toolbar {
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex-shrink: 0;
}

.sv-gallery-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sv-gallery-tab {
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--sv-text);
  padding: 8px 16px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 180ms ease,
    color 180ms ease;
}

.sv-gallery-tab.is-active {
  background: var(--sv-accent-soft);
  color: var(--sv-accent);
}

.sv-gallery-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.sv-style-filter {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid var(--sv-border);
  border-radius: 10px;
  background: var(--sv-input-bg);
  color: var(--sv-text-soft);
  font-size: 13px;
}

.sv-style-filter select {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--sv-text);
  padding-right: 18px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  outline: none;
  cursor: pointer;
}

.sv-style-filter .iconify {
  position: absolute;
  right: 10px;
  pointer-events: none;
  font-size: 16px;
}

.sv-style-filter-label {
  color: var(--sv-text-soft);
  white-space: nowrap;
}

.sv-search {
  display: inline-flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  min-width: min(100%, 260px);
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid var(--sv-border);
  border-radius: 10px;
  background: var(--sv-input-bg);
  color: var(--sv-text-soft);
}

.sv-search input {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--sv-text);
  font-family: inherit;
  font-size: 13px;
  outline: none;
}

.sv-search input::placeholder {
  color: color-mix(in srgb, var(--sv-text-soft) 84%, transparent);
}

.sv-recent-link {
  border: 0;
  background: transparent;
  color: var(--sv-text-soft);
  padding: 8px 4px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.sv-recent-link--accent {
  color: var(--sv-accent);
}

.sv-template-grid {
  display: flex;
  min-height: 0;
  flex: 1;
  gap: 16px;
  align-items: flex-start;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.55) transparent;
}

.sv-template-column {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 16px;
}

.sv-template-grid::-webkit-scrollbar {
  width: 6px;
}

.sv-template-grid::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.55);
}

.sv-beta-panel.theme-dark .sv-template-grid {
  scrollbar-color: rgba(255, 255, 255, 0.28) transparent;
}

.sv-beta-panel.theme-dark .sv-template-grid::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.28);
}

.sv-recent-panel {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  padding: 0 16px 20px 18px;
}

.sv-recent-grid {
  min-height: 0;
  flex: 1;
}

.sv-template-card {
  display: block;
  min-width: 0;
  width: 100%;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.sv-template-card:hover:not(.is-disabled) {
  transform: translateY(-2px);
}

.sv-template-card.is-selected .sv-template-media {
  box-shadow: 0 0 0 2px var(--sv-accent);
}

.sv-template-card.is-disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.sv-recent-card {
  position: relative;
  display: block;
  min-width: 0;
  width: 100%;
  cursor: default;
  transition: transform 0.2s ease;
}

.sv-recent-card.is-clickable {
  cursor: pointer;
}

.sv-recent-card.is-clickable:hover {
  transform: translateY(-2px);
}

.sv-recent-card.is-selected .sv-recent-card-media {
  box-shadow: 0 0 0 2px var(--sv-accent);
}

.sv-recent-card-media {
  position: relative;
  overflow: hidden;
  aspect-ratio: 9 / 16;
  border-radius: 14px;
  background: var(--sv-surface);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.2s ease;
}

.sv-recent-card.is-clickable:hover .sv-recent-card-media {
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--sv-accent) 30%, transparent),
    0 8px 24px rgba(0, 0, 0, 0.1);
}

.sv-recent-card-cover,
.sv-recent-card-cover :deep(.preload-image),
.sv-recent-card-cover :deep(.preload-image__img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.sv-recent-card-placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: var(--sv-text-soft);
  font-size: 28px;
}

.sv-recent-card-status {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: calc(100% - 16px);
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.58);
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

.sv-recent-card-status.is-generating {
  background: rgba(255, 193, 7, 0.92);
  color: #7a4f00;
}

.sv-recent-card-status.is-fail {
  background: rgba(239, 99, 99, 0.92);
  color: #ffffff;
}

.sv-recent-card-body {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 28px 10px 10px;
  background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.78) 100%);
}

.sv-recent-card-title {
  overflow: hidden;
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sv-recent-card-time {
  color: rgba(255, 255, 255, 0.72);
  font-size: 11px;
  line-height: 1.3;
}

.sv-recent-card-delete {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.42);
  color: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  cursor: pointer;
  opacity: 0;
  transition:
    opacity 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
}

.sv-recent-card:hover .sv-recent-card-delete,
.sv-recent-card:focus-within .sv-recent-card-delete {
  opacity: 1;
}

.sv-recent-card-delete:hover:not(:disabled) {
  background: rgba(239, 99, 99, 0.88);
  color: #ffffff;
}

.sv-recent-card-delete--loading {
  animation: sv-spin 0.9s linear infinite;
}

.sv-template-cover--placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: var(--sv-text-soft);
  font-size: 28px;
}

.sv-template-media {
  position: relative;
  overflow: hidden;
  aspect-ratio: 9 / 16;
  border-radius: 14px;
  background: var(--sv-surface);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.sv-template-card:hover:not(.is-disabled) .sv-template-media,
.sv-template-card:focus-within:not(.is-disabled) .sv-template-media {
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--sv-accent) 30%, transparent),
    0 8px 24px rgba(0, 0, 0, 0.1);
}

.sv-template-card.is-landscape .sv-template-media {
  aspect-ratio: 16 / 9;
}

.sv-template-cover :deep(.preload-image),
.sv-template-cover :deep(.preload-image__img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.sv-template-cover--poster {
  width: 100%;
  height: 100%;
}

.sv-template-cover--video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 1;
}

.sv-template-cover--video.is-poster-backed {
  opacity: 0;
  transition: opacity 0.18s ease;
}

.sv-template-card:hover .sv-template-cover--video.is-poster-backed,
.sv-template-card:focus-within .sv-template-cover--video.is-poster-backed {
  opacity: 1;
}

.sv-template-title {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 2;
  display: block;
  overflow: hidden;
  padding: 32px 12px 10px;
  background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.78) 100%);
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sv-recent-foot {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.sv-recent-foot strong {
  overflow: hidden;
  color: var(--sv-text);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sv-recent-foot span:last-child,
.sv-recent-status {
  color: var(--sv-text-soft);
  font-size: 12px;
}

.sv-recent-status--subtle {
  padding: 3px 7px;
  font-size: 10px;
  font-weight: 700;
  opacity: 0.92;
}

.sv-recent-status {
  position: absolute;
  top: 8px;
  left: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.58);
}

.sv-recent-placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: var(--sv-text-soft);
  font-size: 28px;
}

.sv-state-panel {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.sv-state-panel--preview {
  gap: 12px;
  align-items: center;
}

.sv-preview-head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  width: 100%;
}

.sv-preview-head h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
}

.sv-back-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  color: var(--sv-text-soft);
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.sv-preview-player {
  display: block;
  width: auto;
  max-width: 100%;
  height: auto;
  max-height: calc(100% - 48px);
  margin: 0 auto;
  border-radius: 12px;
  background: #000;
  object-fit: contain;
}

.sv-generating-visual {
  position: relative;
  display: grid;
  place-items: center;
  width: min(100%, 320px);
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border: 1px dashed color-mix(in srgb, var(--sv-accent) 28%, var(--sv-border));
  border-radius: 18px;
  background:
    radial-gradient(
      circle at 50% 42%,
      color-mix(in srgb, var(--sv-accent) 16%, transparent),
      transparent 38%
    ),
    linear-gradient(180deg, #151922 0%, #0d1117 100%);
}

.sv-generating-visual .iconify {
  position: relative;
  z-index: 1;
  color: var(--sv-accent);
  font-size: clamp(48px, 6vw, 72px);
  filter: drop-shadow(0 8px 24px color-mix(in srgb, var(--sv-accent) 18%, transparent));
  animation: sv-generating-pulse 1.6s ease-in-out infinite;
}

.sv-generating-scan {
  position: absolute;
  inset: 12% 16%;
  border-radius: 14px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(212, 176, 106, 0.16) 48%,
    rgba(212, 176, 106, 0.04) 52%,
    transparent 100%
  );
  opacity: 0.75;
  animation: sv-scan 1.8s linear infinite;
}

.sv-generating-copy {
  display: grid;
  width: min(100%, 520px);
  justify-items: center;
  gap: 8px;
  text-align: center;
}

.sv-generating-copy p,
.sv-generating-copy h2,
.sv-generating-copy span {
  margin: 0;
}

.sv-generating-copy p {
  color: var(--sv-accent);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.sv-generating-copy h2 {
  font-size: clamp(20px, 1.8vw, 28px);
  font-weight: 900;
  line-height: 1.25;
}

.sv-generating-copy span {
  display: block;
  max-width: 420px;
  color: var(--sv-text-soft);
  font-size: 14px;
  line-height: 1.65;
}

.sv-generating-progress {
  width: min(100%, 320px);
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.sv-generating-progress span {
  display: block;
  min-width: 8%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--sv-accent), #f6dfaa 70%, #fff4d6);
  transition: width 0.35s ease;
}

.sv-empty-state {
  display: grid;
  min-height: 240px;
  place-items: center;
  align-content: center;
  gap: 10px;
  border: 1px dashed var(--sv-border);
  border-radius: 14px;
  color: var(--sv-text-soft);
  font-size: 13px;
  font-weight: 700;
}

.sv-empty-state--inline {
  min-height: 180px;
  flex: 1;
}

.sv-spin {
  animation: sv-spin 0.9s linear infinite;
}

@keyframes sv-generating-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.92;
  }

  50% {
    transform: scale(1.04);
    opacity: 1;
  }
}

@keyframes sv-scan {
  0% {
    transform: translateY(-100%);
  }

  100% {
    transform: translateY(100%);
  }
}

@keyframes sv-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1279px) {
  .sv-template-grid,
  .sv-template-column {
    gap: 14px;
  }
}

@media (max-width: 1023px) {
  .sv-template-grid,
  .sv-template-column {
    gap: 12px;
  }
}

@media (max-width: 767px) {
  .sv-gallery {
    padding: 0 12px 20px 14px;
  }

  .sv-gallery-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .sv-style-filter,
  .sv-search {
    width: 100%;
  }

  .sv-template-grid,
  .sv-template-column {
    gap: 10px;
  }

  .sv-recent-panel {
    padding: 0 12px 20px 14px;
  }
}

.sv-template-cover {
  width: 100%;
  height: 100%;
}

.sv-template-cover.hover-preview-video,
.sv-template-cover :deep(.hover-preview-video) {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
}

.sv-generating-error {
  margin: 8px 0 0;
  color: #f87171;
  font-size: 13px;
  line-height: 1.5;
}

.sv-download-link {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--sv-accent) 20%, transparent);
  color: var(--sv-accent);
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
}

.sv-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sv-history-toolbar {
  margin-bottom: 12px;
}

.sv-history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sv-history-card {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 12px;
  padding: 10px;
  border: 1px solid var(--sv-border);
  border-radius: 12px;
  background: var(--sv-surface);
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.sv-history-card.is-selected,
.sv-history-card:hover {
  border-color: color-mix(in srgb, var(--sv-accent) 45%, transparent);
}

.sv-history-cover {
  width: 72px;
  height: 96px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
}

.sv-history-cover.hover-preview-video,
.sv-history-cover :deep(.hover-preview-video) {
  width: 72px;
  height: 96px;
}

.sv-history-cover--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sv-text-soft);
  font-size: 24px;
}

.sv-history-body h3 {
  margin: 0;
  overflow: hidden;
  color: var(--sv-text);
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sv-history-body p {
  margin: 4px 0 0;
  color: var(--sv-text-soft);
  font-size: 12px;
}

.sv-history-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  color: var(--sv-text-soft);
  font-size: 11px;
}

.sv-history-meta span {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
}

.sv-history-error {
  margin: 8px 0 0;
  color: #f87171;
  font-size: 12px;
  line-height: 1.45;
}

.sv-recent-fallback {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--sv-border);
}

.sv-recent-fallback h4 {
  margin: 0 0 12px;
  color: var(--sv-text-soft);
  font-size: 13px;
  font-weight: 700;
}

.sv-template-preview-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sv-template-preview-media {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.sv-template-preview-poster,
.sv-template-preview-placeholder {
  width: min(100%, 300px);
  aspect-ratio: 9 / 16;
  border-radius: 12px;
  background: var(--sv-surface);
}

.sv-template-preview-media :deep(.template-preview-video-player) {
  max-height: min(60vh, 560px);
}

.sv-template-preview-poster :deep(.preload-image),
.sv-template-preview-poster :deep(.preload-image__img) {
  width: 100%;
  height: 100%;
  border-radius: 12px;
}

.sv-template-preview-placeholder {
  display: grid;
  place-items: center;
  color: var(--sv-text-soft);
  font-size: 40px;
}

.sv-template-preview-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sv-template-preview-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.sv-template-preview-tags span {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--sv-text-soft);
  font-size: 12px;
  font-weight: 600;
}

.sv-template-preview-tags span.is-accent {
  background: color-mix(in srgb, var(--sv-accent) 18%, transparent);
  color: var(--sv-accent);
}

.sv-template-preview-meta p {
  margin: 0;
  color: #4b5563;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.55;
}

</style>

<style lang="scss">
.sv-template-preview-modal {
  width: min(440px, calc(100vw - 32px)) !important;
  max-width: min(440px, calc(100vw - 32px)) !important;
}

.sv-template-preview-modal > .n-card-header {
  padding: 18px 22px !important;
}

.sv-template-preview-modal > .n-card__content {
  padding: 18px 22px 22px !important;
  max-height: calc(100vh - 124px);
  overflow: hidden;
}

.sv-template-preview-modal .sv-template-preview-meta p {
  margin: 0;
  color: #4b5563;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.55;
}
</style>
