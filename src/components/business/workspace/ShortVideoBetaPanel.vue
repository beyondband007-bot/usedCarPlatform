<script setup lang="ts">
import { computed, inject, nextTick, onMounted, ref, watch } from "vue";
import { Icon } from "@iconify/vue";
import { useMessage } from "naive-ui";

import WorkspaceRecentImageCard from "@/components/business/workspace/WorkspaceRecentImageCard.vue";
import HoverPreviewVideo from "@/components/common/HoverPreviewVideo.vue";
import PreloadImage from "@/components/common/PreloadImage.vue";
import { VIDEO_GENERATION_FLOW_KEY } from "@/constants/video-generation";
import { resolveTemplatePosterUrl, resolveTemplatePreviewUrl, shouldPreferVideoCover } from "@/constants/video-template-previews";
import {
  getVideoTaskStatusLabel,
  getVideoWorkflowStageLabel,
  VIDEO_OUTPUT_RATIO_LABEL,
} from "@/constants/short-video";
import type { VideoGenerationFlow } from "@/composables/useVideoGenerationFlow";
import { useAppStore } from "@/stores/app";
import type { WorkspaceGenerateResult, WorkspaceRecentItem } from "@/types/workspace";
import {
  shortVideoTemplateCategories,
  shortVideoTemplateStyles,
  type ShortVideoTemplateCategory,
} from "@/constants/short-video-templates";
import type { VideoHistoryItem, VideoTemplate } from "@/types/video-generation";
import {
  recentStatusLabelMap,
} from "@/utils/workspace-recent";
import { normalizeDisplayOrder } from "@/utils/workspace-recent-layout";
import {
  resolveVideoTaskDownloadUrl,
  resolveVideoTaskMediaUrl,
} from "@/utils/video-generation-result";

const props = defineProps<{
  playRequest?: number;
  isGenerating?: boolean;
  sessionPreview?: WorkspaceGenerateResult | null;
  generationResult?: WorkspaceGenerateResult | null;
  recentItems?: WorkspaceRecentItem[];
  recentLoading?: boolean;
  deletingRecentTaskIds?: string[];
  initialView?: "templates" | "preview" | "generating" | "recent";
}>();

type ShortVideoView = "templates" | "preview" | "generating" | "recent";

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

const videoRef = ref<HTMLVideoElement | null>(null);
const activeView = ref<ShortVideoView>("templates");
const activeCategory = ref<ShortVideoTemplateCategory>("all");
const activeStyle = ref("all");
const searchQuery = ref("");
const selectedRecentItemId = ref("");
const previewTask = ref<VideoHistoryItem | null>(null);

const recentVideoItems = computed(() => props.recentItems ?? []);
const recentDisplayItems = computed(() =>
  normalizeDisplayOrder(recentVideoItems.value),
);
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

const activePreviewVideo = computed(() => {
  if (activeView.value !== "preview") return "";
  return (
    props.generationResult?.previewVideo ??
    props.sessionPreview?.previewVideo ??
    (previewTask.value ? resolveVideoTaskMediaUrl(previewTask.value) : "")
  );
});

const activePreviewDownloadUrl = computed(() => {
  if (previewTask.value) {
    return resolveVideoTaskDownloadUrl(previewTask.value);
  }
  return (
    props.generationResult?.downloadUrl ??
    props.sessionPreview?.downloadUrl ??
    activePreviewVideo.value
  );
});

const generatingProgress = computed(() => {
  const task = currentTask.value;
  if (isDraftGenerating.value) return 8;
  if (!task) return props.isGenerating ? 8 : 0;
  return Math.max(0, Math.min(100, task.progress ?? 0));
});

const generatingStatusLabel = computed(() => {
  const task = currentTask.value;
  if (isDraftGenerating.value) return "视频文案生成中";
  if (!task) return "正在准备视频任务";
  const stageLabel = getVideoWorkflowStageLabel(task.workflowStage ?? undefined);
  if (stageLabel) return stageLabel;
  return getVideoTaskStatusLabel(task.status);
});

const generatingDescription = computed(() => {
  if (isDraftGenerating.value) return "正在生成口播文案与视频任务参数，请稍候。";
  return `输出 ${VIDEO_OUTPUT_RATIO_LABEL}，按音频时长生成（最长15秒），请稍候。`;
});

const generatingErrorMessage = computed(() => {
  const task = currentTask.value;
  if (task?.status !== "fail") return "";
  return task.error?.message ?? "视频生成失败，请稍后重试";
});

const showSessionPreviewTab = computed(() =>
  Boolean(
    props.sessionPreview?.previewVideo ||
      props.generationResult?.previewVideo ||
      previewTask.value,
  ),
);

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
  if (props.isGenerating || isPendingTask(currentTask.value)) return "generating";
  if (preferred === "preview") return "preview";
  if (preferred === "generating") return "generating";
  if (preferred === "recent") return "recent";
  if (preferred === "templates") return "templates";
  if (flow?.currentStep.value === "template") return "templates";
  return "templates";
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

function handleTemplatePick(item: VideoTemplate) {
  if (isTemplateDisabled(item)) {
    message.info("该模板暂未开放，敬请期待！");
    return;
  }
  flow?.selectTemplate(item);
  message.success(`已选择「${item.title}」`);
}

function openTemplatesView() {
  activeView.value = "templates";
}

function isPendingTask(task?: VideoHistoryItem | null) {
  if (!task) return false;
  return PENDING_RECENT_STATUSES.has(task.status);
}

async function playGeneratedVideo() {
  await nextTick();

  const video = videoRef.value;
  if (!video) return;

  video.currentTime = 0;

  try {
    await video.play();
  } catch {
    // 浏览器可能阻止自动播放，保留控件供用户手动播放。
  }
}

function openRecentView() {
  activeView.value = "recent";
}

function openPreviewView(task?: VideoHistoryItem | null) {
  previewTask.value = task ?? currentTask.value;
  activeView.value = "preview";
  if (activePreviewVideo.value) {
    void playGeneratedVideo();
  }
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

async function handleCancelTask(taskId?: string) {
  if (!flow) return;
  if (taskId && flow.currentTask.value?.taskId !== taskId) {
    await flow.trackTask(taskId);
  }
  const task = await flow.cancelCurrentTask();
  if (task) {
    message.info("任务已取消");
    void flow.loadHistory();
  } else if (flow.errorMessage.value) {
    message.error(flow.errorMessage.value);
  }
}

async function handleRegenerateTask(taskId?: string) {
  if (!flow) return;
  const targetId = taskId ?? currentTask.value?.taskId;
  if (!targetId) return;
  activeView.value = "generating";
  const task = await flow.regenerateTask(targetId);
  if (task) {
    message.info("已重新提交视频生成");
  } else if (flow.errorMessage.value) {
    message.error(flow.errorMessage.value);
  }
}

function canCancelTask(task?: VideoHistoryItem | null) {
  if (!task || !flow) return false;
  return flow.CANCELABLE_STATUSES.has(task.status);
}

function canRegenerateTask(task?: VideoHistoryItem | null) {
  if (!task || !flow) return false;
  return flow.REGENERATABLE_STATUSES.has(task.status);
}

watch(
  () => props.playRequest,
  (request) => {
    if (!request) return;
    void playGeneratedVideo();
  },
);

watch(
  () => [props.generationResult?.previewVideo, props.sessionPreview?.previewVideo],
  () => {
    if (!activePreviewVideo.value || activeView.value !== "preview") return;
    void playGeneratedVideo();
  },
);

watch(
  () => props.sessionPreview?.previewVideo,
  (videoUrl) => {
    if (!videoUrl || props.isGenerating) return;
    if (activeView.value === "preview") {
      void playGeneratedVideo();
    }
  },
);

watch(
  () => props.initialView,
  (view) => {
    activeView.value = resolveShortVideoView(view);
  },
);

watch(
  () => props.isGenerating,
  (generating) => {
    if (generating) {
      activeView.value = "generating";
      return;
    }

    if (activeView.value === "generating") {
      activeView.value = "recent";
    }
  },
  { immediate: true },
);

watch(currentTask, (task) => {
  if (!task) return;
  if (isPendingTask(task)) {
    activeView.value = "generating";
  }
});

onMounted(() => {
  void flow?.loadHistory();
  if (flow?.currentStep.value === "template") {
    activeView.value = "templates";
  }
});

watch(
  () => flow?.currentStep.value,
  (step) => {
    if (step === "template") {
      activeView.value = "templates";
      return;
    }
    if (step === "task") {
      activeView.value = "generating";
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
    <section
      v-if="activeView === 'generating'"
      class="sv-state-panel sv-state-panel--generating"
      aria-live="polite"
    >
      <div class="sv-generating-visual" aria-hidden="true">
        <span class="sv-generating-scan"></span>
        <Icon icon="mdi:video-outline" />
      </div>
      <div class="sv-generating-copy">
        <p>{{ currentTask?.title || currentTask?.vehicleName || "视频生成中" }}</p>
        <h2>{{ generatingStatusLabel }}</h2>
        <span>{{ generatingDescription }}</span>
        <p v-if="generatingErrorMessage" class="sv-generating-error">
          {{ generatingErrorMessage }}
        </p>
      </div>
      <div class="sv-generating-progress" role="progressbar" :aria-valuenow="generatingProgress">
        <span :style="{ width: `${generatingProgress}%` }"></span>
      </div>
      <div class="sv-generating-actions">
        <button
          v-if="canCancelTask(currentTask)"
          type="button"
          class="sv-action-button sv-action-button--ghost"
          @click="handleCancelTask(currentTask?.taskId)"
        >
          取消生成
        </button>
        <button
          v-if="canRegenerateTask(currentTask)"
          type="button"
          class="sv-action-button"
          @click="handleRegenerateTask()"
        >
          重新生成
        </button>
      </div>
    </section>

    <section
      v-else-if="activeView === 'preview' && activePreviewVideo"
      class="sv-state-panel sv-state-panel--preview"
    >
      <header class="sv-preview-head">
        <button type="button" class="sv-back-button" @click="openRecentView">
          <Icon icon="mdi:arrow-left" />
          返回最近生成
        </button>
        <a
          v-if="activePreviewDownloadUrl"
          class="sv-download-link"
          :href="activePreviewDownloadUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          下载视频
        </a>
      </header>
      <video
        ref="videoRef"
        class="sv-preview-player"
        controls
        playsinline
        preload="metadata"
        :src="activePreviewVideo"
      >
        当前浏览器不支持视频播放。
      </video>
    </section>

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
        <button
          v-if="showSessionPreviewTab"
          type="button"
          role="tab"
          class="sv-primary-tab sv-primary-tab--accent"
          :class="{ 'is-active': activeView === 'preview' }"
          :aria-selected="activeView === 'preview'"
          @click="openPreviewView()"
        >
          预览视频
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
        <div v-else class="sv-recent-flow">
          <WorkspaceRecentImageCard
            v-for="item in recentDisplayItems"
            :key="item.id"
            :item="item"
            :selected="item.id === selectedRecentItemId"
            :clickable="canOpenRecentVideo(item)"
            :deleting="isDeletingRecent(item)"
            :show-status="shouldShowRecentStatus(item)"
            :status-label="statusLabelMap[item.status]"
            @pick="handleRecentPick"
            @delete="handleDeleteRecent"
          />
        </div>
      </section>

      <section
        v-else-if="activeView === 'templates'"
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
        <div v-else class="sv-template-grid">
          <article
            v-for="item in filteredTemplates"
            :key="item.templateId"
            class="sv-template-card"
            :class="{
              'is-selected': selectedTemplateId === item.templateId,
              'is-disabled': isTemplateDisabled(item),
            }"
            @click="handleTemplatePick(item)"
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
              <span class="sv-template-duration">最长{{ item.durationSeconds }}秒</span>
              <span v-if="isTemplateDisabled(item)" class="sv-template-badge is-soon">即将开放</span>
              <span v-else-if="item.badge === 'hot'" class="sv-template-badge">热门</span>
              <span v-else-if="item.badge === 'new'" class="sv-template-badge is-new">新品</span>
            </div>
            <footer class="sv-template-foot">
              <strong>{{ item.title }}</strong>
              <span>{{ item.typeLabel }} · {{ item.styleLabel }}</span>
              <p>{{ item.stylePrompt }}</p>
            </footer>
          </article>
        </div>
      </section>

    </section>
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
  background: linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%);
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

.sv-primary-tabs {
  display: inline-flex;
  flex-shrink: 0;
  gap: 6px;
  align-items: center;
  align-self: flex-start;
  min-height: 32px;
  margin-inline: 16px;
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
  padding: 0 16px 20px;
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
  display: grid;
  min-height: 0;
  flex: 1;
  align-content: start;
  gap: 16px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.55) transparent;
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
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 16px 20px;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.55) transparent;
}

.sv-recent-panel::-webkit-scrollbar {
  width: 6px;
}

.sv-recent-panel::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.55);
}

.sv-beta-panel.theme-dark .sv-recent-panel {
  scrollbar-color: rgba(255, 255, 255, 0.28) transparent;
}

.sv-beta-panel.theme-dark .sv-recent-panel::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.28);
}

.sv-recent-flow {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-auto-rows: max-content;
  gap: 14px;
  align-content: start;
  align-items: start;
}

.sv-recent-flow :deep(.recent-flow-item) {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  min-width: 0;
  height: auto;
}

.sv-recent-flow :deep(.recent-flow-item:hover) {
  z-index: 30;
}

.sv-recent-flow :deep(.recent-flow-item:nth-child(3n + 1):hover) {
  transform-origin: left center;
}

.sv-recent-flow :deep(.recent-flow-item:nth-child(3n + 2):hover) {
  transform-origin: center center;
}

.sv-recent-flow :deep(.recent-flow-item:nth-child(3n):hover) {
  transform-origin: right center;
}

@media (max-width: 1023px) {
  .sv-recent-flow {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .sv-recent-flow :deep(.recent-flow-item:nth-child(3n + 1):hover),
  .sv-recent-flow :deep(.recent-flow-item:nth-child(3n + 2):hover),
  .sv-recent-flow :deep(.recent-flow-item:nth-child(3n):hover) {
    transform-origin: center center;
  }

  .sv-recent-flow :deep(.recent-flow-item:nth-child(2n + 1):hover) {
    transform-origin: left center;
  }

  .sv-recent-flow :deep(.recent-flow-item:nth-child(2n):hover) {
    transform-origin: right center;
  }
}

@media (max-width: 640px) {
  .sv-recent-flow {
    grid-template-columns: minmax(0, 1fr);
  }

  .sv-recent-flow :deep(.recent-flow-item:hover) {
    transform-origin: center center;
  }
}

.sv-template-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
  cursor: pointer;
}

.sv-template-card.is-selected .sv-template-media {
  box-shadow: 0 0 0 2px var(--sv-accent);
}

.sv-template-card.is-disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.sv-template-cover--placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: var(--sv-text-soft);
  font-size: 28px;
}

.sv-template-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(239, 68, 68, 0.88);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.sv-template-badge.is-soon {
  background: rgba(15, 23, 42, 0.78);
}

.sv-template-badge.is-new {
  background: rgba(34, 197, 94, 0.88);
}

.sv-template-media {
  position: relative;
  overflow: hidden;
  aspect-ratio: 9 / 16;
  border-radius: 10px;
  background: var(--sv-surface);
}

.sv-template-cover :deep(.preload-image),
.sv-template-cover :deep(.preload-image__img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
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

.sv-template-duration,
.sv-template-likes {
  position: absolute;
  bottom: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.58);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.sv-template-duration {
  left: 8px;
}

.sv-template-likes {
  right: 8px;
}

.sv-template-foot,
.sv-recent-foot {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.sv-template-foot strong,
.sv-recent-foot strong {
  overflow: hidden;
  color: var(--sv-text);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sv-template-foot span {
  color: var(--sv-text-soft);
  font-size: 12px;
}

.sv-template-foot p {
  margin: 0;
  color: var(--sv-text-soft);
  font-size: 12px;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.sv-template-creator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  color: var(--sv-text-soft);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sv-template-avatar {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  color: color-mix(in srgb, var(--sv-accent) 72%, #fff);
  font-size: 16px;
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
}

.sv-preview-head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
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
  width: 100%;
  max-height: calc(100% - 48px);
  border-radius: 12px;
  background: #000;
}

.sv-generating-visual {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 220px;
  overflow: hidden;
  border-radius: 14px;
  background: linear-gradient(180deg, #151922 0%, #0d1117 100%);
}

.sv-generating-visual .iconify {
  position: relative;
  z-index: 1;
  color: var(--sv-accent);
  font-size: 42px;
}

.sv-generating-scan {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(212, 176, 106, 0.12) 50%,
    transparent 100%
  );
  animation: sv-scan 1.8s linear infinite;
}

.sv-generating-copy {
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
}

.sv-generating-copy h2 {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 900;
}

.sv-generating-copy span {
  display: block;
  margin-top: 8px;
  color: var(--sv-text-soft);
  font-size: 13px;
  line-height: 1.55;
}

.sv-generating-progress {
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.sv-generating-progress span {
  display: block;
  width: 36%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--sv-accent), #f6dfaa);
  animation: sv-progress 1.6s ease-in-out infinite;
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

@keyframes sv-scan {
  0% {
    transform: translateY(-100%);
  }

  100% {
    transform: translateY(100%);
  }
}

@keyframes sv-progress {
  0%,
  100% {
    transform: translateX(-12%);
  }

  50% {
    transform: translateX(180%);
  }
}

@keyframes sv-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1279px) {
  .sv-template-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1023px) {
  .sv-template-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .sv-gallery {
    padding-inline: 12px;
  }

  .sv-gallery-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .sv-style-filter,
  .sv-search {
    width: 100%;
  }

  .sv-template-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .sv-recent-flow {
    gap: 12px;
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
}

.sv-generating-error {
  margin: 8px 0 0;
  color: #f87171;
  font-size: 13px;
  line-height: 1.5;
}

.sv-generating-actions,
.sv-history-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.sv-action-button {
  padding: 6px 12px;
  border: 1px solid color-mix(in srgb, var(--sv-accent) 40%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--sv-accent) 16%, transparent);
  color: var(--sv-text);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.sv-action-button--ghost {
  border-color: var(--sv-border);
  background: transparent;
  color: var(--sv-text-soft);
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
</style>
