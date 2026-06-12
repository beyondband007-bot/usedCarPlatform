<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { Icon } from "@iconify/vue";

import WorkspaceRecentImageCard from "@/components/business/workspace/WorkspaceRecentImageCard.vue";
import PreloadImage from "@/components/common/PreloadImage.vue";
import {
  shortVideoTemplateCategories,
  shortVideoTemplateItems,
  shortVideoTemplateStyles,
  type ShortVideoTemplateCategory,
  type ShortVideoTemplateItem,
} from "@/constants/short-video-templates";
import type { WorkspaceGenerateResult, WorkspaceRecentItem } from "@/types/workspace";
import { VIDEO_OUTPUT_RATIO_LABEL } from "@/constants/short-video";
import {
  recentStatusLabelMap,
} from "@/utils/workspace-recent";
import { normalizeDisplayOrder } from "@/utils/workspace-recent-layout";

const props = defineProps<{
  playRequest?: number;
  isGenerating?: boolean;
  sessionPreview?: WorkspaceGenerateResult | null;
  generationResult?: WorkspaceGenerateResult | null;
  recentItems?: WorkspaceRecentItem[];
  recentLoading?: boolean;
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
  selectTemplate: [item: ShortVideoTemplateItem];
}>();

const videoRef = ref<HTMLVideoElement | null>(null);
const activeView = ref<ShortVideoView>("recent");
const activeCategory = ref<ShortVideoTemplateCategory>("all");
const activeStyle = ref("all");
const searchQuery = ref("");
const selectedTemplateId = ref<string | null>(null);

const selectedRecentItemId = ref("");

const recentVideoItems = computed(() => props.recentItems ?? []);
const recentDisplayItems = computed(() =>
  normalizeDisplayOrder(recentVideoItems.value),
);
const statusLabelMap = recentStatusLabelMap;

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

const showSessionPreviewTab = computed(() =>
  Boolean(props.sessionPreview?.previewVideo),
);

const activePreviewVideo = computed(() => {
  if (activeView.value !== "preview") return "";
  return (
    props.generationResult?.previewVideo ??
    props.sessionPreview?.previewVideo ??
    ""
  );
});

const filteredTemplates = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase();

  return shortVideoTemplateItems.filter((item) => {
    if (activeCategory.value !== "all" && item.category !== activeCategory.value) {
      return false;
    }

    if (activeStyle.value !== "all" && item.style !== activeStyle.value) {
      return false;
    }

    if (!keyword) return true;

    const haystack = [item.title, item.creator, ...item.keywords]
      .join(" ")
      .toLowerCase();

    return haystack.includes(keyword);
  });
});

function resolveShortVideoView(preferred?: ShortVideoView): ShortVideoView {
  if (props.isGenerating) return "generating";
  if (preferred === "recent" || preferred === "preview" || preferred === "templates") {
    return preferred;
  }
  if (showSessionPreviewTab.value) return "preview";
  return "recent";
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

function openTemplatesView() {
  activeView.value = "templates";
}

function openPreviewView() {
  activeView.value = "preview";
  if (activePreviewVideo.value) {
    void playGeneratedVideo();
  }
}

function openRecentView() {
  activeView.value = "recent";
}

function shouldShowRecentStatus(item: WorkspaceRecentItem) {
  return item.status !== "success";
}

function handleTemplatePick(item: ShortVideoTemplateItem) {
  selectedTemplateId.value = item.id;
  emit("selectTemplate", item);
}

function canOpenRecentVideo(item: WorkspaceRecentItem) {
  return Boolean(item.taskId) || (item.status === "success" && Boolean(item.downloadUrl));
}

function handleRecentPick(item: WorkspaceRecentItem) {
  if (!canOpenRecentVideo(item)) return;

  selectedRecentItemId.value = item.id;

  if (PENDING_RECENT_STATUSES.has(item.status)) {
    activeView.value = "generating";
  } else {
    activeView.value = "preview";
  }

  emit("pickRecent", item);
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
  (videoUrl, previousUrl) => {
    if (!videoUrl || props.isGenerating) return;
    if (!previousUrl) {
      activeView.value = "preview";
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
      activeView.value = showSessionPreviewTab.value ? "preview" : "recent";
    }
  },
  { immediate: true },
);
</script>

<template>
  <section class="sv-beta-panel" aria-label="短视频模板库">
  <section class="short-video-panel" aria-label="短视频生成说明">
    <header class="short-video-head">
      <div class="short-video-head-copy">
        <p class="short-video-eyebrow">短视频生成</p>
        <h2>生成口播草稿后输出竖屏营销视频</h2>
        <span>固定输出 {{ VIDEO_OUTPUT_RATIO_LABEL }}，确认生成后将自动轮询任务结果。</span>
      </div>
    </header>

    <div class="short-video-tabs" role="tablist" aria-label="short video views">
      <button
        v-if="props.isGenerating"
        type="button"
        role="tab"
        :aria-selected="activeView === 'generating'"
        :class="{ active: activeView === 'generating' }"
        @click="activeView = 'generating'"
      >
        正在生成
      </button>
      <button
        v-else-if="showSessionPreviewTab"
        type="button"
        role="tab"
        :aria-selected="activeView === 'preview'"
        :class="{ active: activeView === 'preview' }"
        @click="openPreviewView"
      >
        预览视频
      </button>
      <button
        v-else
        type="button"
        role="tab"
        :aria-selected="activeView === 'guide'"
        :class="{ active: activeView === 'guide' }"
        @click="activeView = 'guide'"
      >
        使用教程
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="activeView === 'recent'"
        :class="{ active: activeView === 'recent' }"
        @click="openRecentView"
      >
        最近生成
      </button>
    </div>

    <section v-if="activeView === 'recent'" class="short-video-recent" aria-label="recent videos">
      <div v-if="props.recentLoading && !recentVideoItems.length" class="short-video-recent-empty">
        <Icon icon="mdi:loading" class="short-video-loading-icon" />
        <span>正在加载最近生成</span>
      </div>
      <div v-else-if="!recentVideoItems.length" class="short-video-recent-empty">
        <Icon icon="mdi:video-off-outline" />
        <span>暂无最近生成视频</span>
      </div>
      <template v-else>
        <article
          v-for="item in recentVideoItems"
          :key="item.id"
          class="short-video-recent-card"
          :class="{ 'is-clickable': canOpenRecentVideo(item) }"
          :role="canOpenRecentVideo(item) ? 'button' : undefined"
          :tabindex="canOpenRecentVideo(item) ? 0 : undefined"
          :aria-label="canOpenRecentVideo(item) ? `查看${item.title}` : item.title"
          @click="handleRecentPick(item)"
          @keydown.enter.prevent="handleRecentPick(item)"
          @keydown.space.prevent="handleRecentPick(item)"
        >
          <div class="short-video-recent-media">
            <PreloadImage
              v-if="item.thumbnail || item.previewImage || item.inputAssetUrl"
              class="short-video-recent-image"
              :src="item.thumbnail || item.previewImage || item.inputAssetUrl"
              :alt="item.title"
              loading="lazy"
              decoding="async"
              :draggable="false"
              fit="cover"
              object-position="center"
            />
            <div v-else class="short-video-recent-placeholder">
              <Icon icon="mdi:video-outline" />
            </div>
            <span class="short-video-recent-status" :class="`is-${item.status}`">
              <Icon
                :icon="statusIconMap[item.status]"
                class="short-video-recent-status-icon"
              />
              {{ statusLabelMap[item.status] }}
            </span>
            <span v-if="item.status === 'success'" class="short-video-play-badge">
              <Icon icon="mdi:play" />
            </span>
          </div>
          <footer class="short-video-recent-foot">
            <strong class="short-video-recent-name">{{ item.title }}</strong>
            <p class="short-video-recent-scene">{{ VIDEO_OUTPUT_RATIO_LABEL }}</p>
            <div class="short-video-recent-foot-actions">
              <span class="short-video-recent-time">{{ item.createdAt }}</span>
              <button
                type="button"
                class="short-video-recent-delete"
                :aria-label="`删除${item.title}`"
                @click.stop="emit('deleteRecent', item)"
              >
                <Icon icon="mdi:trash-can-outline" />
              </button>
            </div>
          </footer>
        </article>
      </template>
    </section>

    <section
      v-if="activeView === 'generating'"
      class="sv-state-panel sv-state-panel--generating"
      aria-live="polite"
    >
      <div class="sv-generating-visual" aria-hidden="true">
        <span class="sv-generating-scan"></span>
        <Icon icon="mdi:image-sync-outline" />
      </div>
      <div class="sv-generating-copy">
        <p>视频待生成</p>
        <h2>正在生成营销视频</h2>
        <span>AI 正在生成 {{ VIDEO_OUTPUT_RATIO_LABEL }} 营销短视频，请稍候。</span>
      </div>
      <div class="sv-generating-progress" aria-hidden="true">
        <span></span>
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
          @click="openPreviewView"
        >
          预览视频
        </button>
      </header>

      <section
        v-if="activeView === 'recent'"
        class="sv-recent-panel"
        aria-label="最近生成"
      >
        <div v-if="props.recentLoading && !recentVideoItems.length" class="sv-empty-state">
          <Icon icon="mdi:loading" class="sv-spin" />
          <span>正在加载最近生成</span>
        </div>
        <div v-else-if="!recentVideoItems.length" class="sv-empty-state">
          <Icon icon="mdi:video-off-outline" />
          <span>暂无最近生成视频</span>
        </div>
        <div
          v-else
          class="sv-recent-flow"
        >
          <WorkspaceRecentImageCard
            v-for="item in recentDisplayItems"
            :key="item.id"
            :item="item"
            :selected="item.id === selectedRecentItemId"
            :clickable="canOpenRecentVideo(item)"
            :show-status="shouldShowRecentStatus(item)"
            :status-label="statusLabelMap[item.status]"
            @pick="handleRecentPick"
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

      <div v-if="!filteredTemplates.length" class="sv-empty-state sv-empty-state--inline">
        <Icon icon="mdi:movie-search-outline" />
        <span>未找到匹配模板，请调整筛选条件</span>
        <aside class="short-video-side">
          <div class="short-video-spec">
            <span>输出内容</span>
            <strong>15 秒营销短视频</strong>
          </div>
          <div class="short-video-spec">
            <span>适用场景</span>
            <strong>车辆外观展示、社媒投放、详情页动效</strong>
          </div>
          <div class="short-video-spec">
            <span>说明</span>
            <strong>左侧配置素材并生成口播草稿，确认后开始生成视频</strong>
          </div>
        </aside>
      </div>

      <div v-else class="sv-template-grid">
        <article
          v-for="item in filteredTemplates"
          :key="item.id"
          class="sv-template-card"
          :class="{ 'is-selected': selectedTemplateId === item.id }"
          @click="handleTemplatePick(item)"
        >
          <div class="sv-template-media">
            <PreloadImage
              class="sv-template-cover"
              :src="item.cover"
              :alt="item.title"
              loading="lazy"
              decoding="async"
              fit="cover"
            />
            <span class="sv-template-duration">{{ item.duration }}</span>
            <span class="sv-template-likes">
              <Icon icon="mdi:heart-outline" aria-hidden="true" />
              {{ item.likes }}
            </span>
          </div>

          <footer class="sv-template-foot">
            <strong>{{ item.title }}</strong>
            <span class="sv-template-creator">
              <span class="sv-template-avatar" aria-hidden="true">
                <Icon icon="mdi:account-circle-outline" />
              </span>
              {{ item.creator }}
            </span>
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

:global(.theme-light) .sv-beta-panel,
:global(.workspace-page.theme-light) .sv-beta-panel {
  --sv-bg: #0d1117;
  --sv-surface: #151922;
  --sv-border: rgba(255, 255, 255, 0.1);
}

.sv-main-shell {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  padding-top: 16px;
}

.sv-primary-tabs {
  display: inline-flex;
  flex-shrink: 0;
  gap: 6px;
  align-self: flex-start;
  margin-inline: 16px;
  padding: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
}

.sv-primary-tab {
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--sv-text-soft);
  padding: 8px 14px;
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
}

.sv-recent-panel {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 16px 20px;
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
</style>
