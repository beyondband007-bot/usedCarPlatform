<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { Icon } from "@iconify/vue";
import { motion } from "motion-v";
import { useMessage } from "naive-ui";

import { getRecentGenerationTasks, type RecentGenerationTask } from "@/api/visual-workbench";
import ShortVideoBetaPanel from "@/components/business/workspace/ShortVideoBetaPanel.vue";
import PreloadImage from "@/components/common/PreloadImage.vue";
import WorkspaceGenerateResultPanel from "@/components/business/workspace/WorkspaceGenerateResultPanel.vue";
import WorkspaceImagePreviewPanel from "@/components/business/workspace/WorkspaceImagePreviewPanel.vue";
import {
  deliveryResults,
  formatDeliveryRatio,
  type DeliveryResultItem,
} from "@/constants/delivery-results";
import { workspaceTemplateRecommendations } from "@/constants/workspace";
import { useAppStore } from "@/stores/app";
import { downloadAllDeliveryResults } from "@/utils/delivery-download";
import { buildImagePreviewFromDeliveryResult } from "@/utils/workspace-image-preview";
import { formatDate } from '@/utils/dayjs'
import {
  recentStatusIconMap,
  recentStatusLabelMap,
  resolveWorkspaceOptionTitle,
} from '@/utils/workspace-recent'
import watermarkBeforeOne from '@/assets/img/水印图1.png'
import watermarkAfterOne from '@/assets/img/无水印图1.png'
import type {
  WorkspaceBatchActiveJob,
  WorkspaceCapability,
  WorkspaceGenerateResult,
  WorkspaceImagePreview,
  WorkspaceRecentItem,
} from "@/types/workspace";

const props = defineProps<{
  capability: WorkspaceCapability;
  selectedOptionId: string;
  isGenerating?: boolean;
  generationResult?: WorkspaceGenerateResult | null;
  deliveryImagePreview?: WorkspaceImagePreview | null;
  shortVideoPlayRequest?: number;
  batchActiveJobs?: WorkspaceBatchActiveJob[];
}>();

const emit = defineEmits<{
  backFromResult: [];
  closeDeliveryImagePreview: [];
  openDeliveryImagePreview: [preview: WorkspaceImagePreview];
  pickTemplate: [payload: { capabilityCode: string; optionId: string }];
  pickRecent: [item: WorkspaceRecentItem];
}>();

function canOpenRecent(item: WorkspaceRecentItem) {
  return Boolean(item.taskId) || (item.status === "success" && Boolean(item.previewImage));
}

function handleRecentPick(item: WorkspaceRecentItem) {
  if (!canOpenRecent(item)) return;
  emit("pickRecent", item);
}

const templateCards = workspaceTemplateRecommendations;

const watermarkCompareCards = [
  { before: watermarkBeforeOne, after: watermarkAfterOne },
] as const;
const watermarkCompareProgress = ref([50]);
const watermarkCompareMediaRefs = ref<(HTMLElement | null)[]>([]);
const activeWatermarkCompareDrag = ref<{
  index: number;
  pointerId: number;
} | null>(null);
const watermarkActiveView = ref<"features" | "recent" | "generating">("features");

function isTemplateActive(item: (typeof templateCards)[number]) {
  return (
    props.capability.code === item.capabilityCode &&
    props.selectedOptionId === item.optionId
  );
}

function handleTemplatePick(item: (typeof templateCards)[number]) {
  emit("pickTemplate", {
    capabilityCode: item.capabilityCode,
    optionId: item.optionId,
  });
}

function clampWatermarkCompareProgress(value: number) {
  return Math.min(88, Math.max(12, value));
}

function setWatermarkCompareMediaRef(index: number, element: unknown) {
  watermarkCompareMediaRefs.value[index] = element instanceof HTMLElement ? element : null;
}

function updateWatermarkCompareProgress(index: number, clientX: number) {
  const element = watermarkCompareMediaRefs.value[index];
  if (!element) return;

  const rect = element.getBoundingClientRect();
  if (!rect.width) return;

  const next = ((clientX - rect.left) / rect.width) * 100;
  watermarkCompareProgress.value[index] = clampWatermarkCompareProgress(next);
}

function handleWatermarkComparePointerMove(event: PointerEvent) {
  const drag = activeWatermarkCompareDrag.value;
  if (!drag || event.pointerId !== drag.pointerId) return;

  updateWatermarkCompareProgress(drag.index, event.clientX);
}

function endWatermarkCompareDrag() {
  activeWatermarkCompareDrag.value = null;
  window.removeEventListener("pointermove", handleWatermarkComparePointerMove);
  window.removeEventListener("pointerup", endWatermarkCompareDrag);
  window.removeEventListener("pointercancel", endWatermarkCompareDrag);
}

function startWatermarkCompareDrag(index: number, event: PointerEvent) {
  activeWatermarkCompareDrag.value = {
    index,
    pointerId: event.pointerId,
  };
  updateWatermarkCompareProgress(index, event.clientX);
  window.addEventListener("pointermove", handleWatermarkComparePointerMove);
  window.addEventListener("pointerup", endWatermarkCompareDrag);
  window.addEventListener("pointercancel", endWatermarkCompareDrag);
}

const appStore = useAppStore();
const activeTab = ref<"guide" | "generating" | "batchProcessing" | "recent">("guide");
const recentItems = ref<WorkspaceRecentItem[]>([]);
const recentLoading = ref(false);
const recentLoaded = ref(false);
let recentRefreshTimer: number | null = null;

const isBatchProcessingView = computed(
  () => props.capability.kind === "batch" && (props.batchActiveJobs?.length ?? 0) > 0,
);

interface BatchDisplayCard {
  id: string;
  title: string;
  sceneLabel?: string;
  createdAt: string;
  status: WorkspaceRecentItem["status"];
  thumbnail?: string;
  progress?: number;
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
          sceneLabel: item.itemKind === "interior" ? "鍐呴グ澧炲己" : job.projectName,
          createdAt,
          status: item.status,
          thumbnail: item.thumbnail || job.previewUrl || undefined,
          progress: item.progress,
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
    props.capability.kind !== 'beauty' &&
    props.capability.kind !== 'interior' &&
    props.capability.kind !== 'batch',
)

const tutorialSteps = [
  {
    title: "涓婁紶杞﹀浘",
    icon: "mdi:cloud-upload-outline",
  },
  {
    title: "閫夋嫨灞曞巺妯℃澘",
    icon: "mdi:view-gallery-outline",
  },
  {
    title: "閫夋嫨 Logo",
    icon: "mdi:badge-account-horizontal-outline",
  },
  {
    title: "鐢熸垚鏁堟灉",
    icon: "mdi:car-select",
  },
] as const;

const deliveryResultCount = deliveryResults.length;
const message = useMessage();
const isDownloadingAllDelivery = ref(false);

watch(
  () => props.capability.kind,
  () => {
    emit("closeDeliveryImagePreview");
  },
);

function openDeliveryResultPreview(item: DeliveryResultItem) {
  emit(
    "openDeliveryImagePreview",
    buildImagePreviewFromDeliveryResult(item, formatDeliveryRatio),
  );
}

function closeDeliveryImagePreview() {
  emit("closeDeliveryImagePreview");
}

async function handleDownloadAllDelivery() {
  isDownloadingAllDelivery.value = true;

  try {
    const count = await downloadAllDeliveryResults();
    message.success(`Batch download started for ${count} images`);
  } finally {
    isDownloadingAllDelivery.value = false;
  }
}

const statusLabelMap = recentStatusLabelMap;
const statusIconMap = recentStatusIconMap;
const recentTaskModuleCodes = new Set([
  "showroom-light",
  "outdoor-scene",
  "road-motion",
  "sky-studio",
  "paint-refresh",
  "light-consistency",
  "interior-clean",
  "watermark-remove",
  "short-video",
  "batch-new",
]);

function canLoadRecentTasks() {
  return recentTaskModuleCodes.has(props.capability.code);
}

function mapRecentStatus(item: RecentGenerationTask): WorkspaceRecentItem["status"] {
  const status = (item.uiStatus ?? item.status ?? "waiting") as WorkspaceRecentItem["status"];
  return status === "queue" ? "queued" : status;
}

function mapRecentItem(item: RecentGenerationTask): WorkspaceRecentItem {
  const sceneTitle = resolveWorkspaceOptionTitle(item.moduleCode, item.sceneLabel);
  const isShortVideo = item.moduleCode === "short-video";
  const thumbnail = isShortVideo
    ? item.inputAssetUrl ?? item.thumbnail ?? undefined
    : item.thumbnail ?? item.inputAssetUrl ?? undefined;
  const previewImage = item.previewImage ?? item.inputAssetUrl ?? undefined;

  return {
    id: item.id || item.taskId,
    taskId: item.taskId,
    moduleCode: item.moduleCode,
    title: item.title,
    status: mapRecentStatus(item),
    createdAt: formatDate(item.createdAt, 'YYYY-MM-DD HH:mm'),
    updatedAt: item.updatedAt ? formatDate(item.updatedAt, 'YYYY-MM-DD HH:mm') : undefined,
    thumbnail,
    previewImage,
    downloadUrl: item.downloadUrl ?? previewImage,
    ratioLabel: isShortVideo ? '16:9 · 720p · 10秒' : item.ratioLabel ?? undefined,
    sceneLabel: isShortVideo ? '营销短视频' : sceneTitle ?? item.sceneLabel ?? undefined,
    outputRatio: item.outputRatio ?? undefined,
    inputAssetId: item.inputAssetId ?? undefined,
    inputAssetUrl: item.inputAssetUrl ?? undefined,
    progress: item.progress ?? undefined,
    resultCount: item.resultCount ?? undefined,
    error:
      typeof item.error === "string"
        ? item.error
        : item.error?.message ?? undefined,
  };
}

function canAutoRefreshRecent(items: WorkspaceRecentItem[]) {
  return items.some((item) =>
    ["waiting", "queued", "queue", "generating"].includes(item.status),
  );
}

function shouldPollRecent() {
  if (props.isGenerating) return true;
  if (
    props.capability.code === "watermark-remove" &&
    (watermarkActiveView.value === "recent" || watermarkActiveView.value === "generating")
  ) {
    return canAutoRefreshRecent(recentItems.value);
  }
  if (activeTab.value !== "recent") return false;
  return canAutoRefreshRecent(recentItems.value);
}

async function loadRecentItems() {
  if (!canLoadRecentTasks()) {
    recentItems.value = [];
    recentLoaded.value = true;
    recentLoading.value = false;
    return;
  }

  recentLoading.value = true;

  try {
    const result = await getRecentGenerationTasks({
      moduleCode: props.capability.code,
      page: 1,
      pageSize: 20,
    });
    recentItems.value = result.items.map(mapRecentItem);
    recentLoaded.value = true;
  } catch (error) {
    if (!recentLoaded.value) {
      recentItems.value = [];
    }
    const text = error instanceof Error ? error.message : "最近生成加载失败";
    message.error(text);
  } finally {
    recentLoading.value = false;
  }
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

    void loadRecentItems();
  }, 4000);
}

watch(
  () => props.batchActiveJobs?.length ?? 0,
  (length, previousLength) => {
    if (props.capability.kind === "batch" && length > previousLength) {
      activeTab.value = "batchProcessing";
    }
  },
);

watch(
  () => props.isGenerating,
  (generating, wasGenerating) => {
    if (generating) {
      if (props.capability.code === "watermark-remove") {
        watermarkActiveView.value = "generating";
      } else {
        activeTab.value = "generating";
      }
      void loadRecentItems();
      return;
    }

    if (props.capability.code === "watermark-remove") {
      if (watermarkActiveView.value === "generating") {
        watermarkActiveView.value = "features";
      }
    } else if (activeTab.value === "generating") {
      activeTab.value = "guide";
    }

    if (wasGenerating) {
      void loadRecentItems();
    }
  },
);

watch(
  () => props.capability.code,
  () => {
    stopRecentAutoRefresh();
    recentItems.value = [];
    recentLoaded.value = false;

    if (
      props.isGenerating ||
      activeTab.value === "recent" ||
      props.capability.code === "watermark-remove"
    ) {
      void loadRecentItems();
    }
  },
);

watch(
  () => watermarkActiveView.value,
  (view) => {
    if (props.capability.code !== "watermark-remove") return;

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
  () => [activeTab.value, props.isGenerating, isBatchProcessingView.value] as const,
  ([tab]) => {
    if (tab === "recent" || tab === "generating" || tab === "batchProcessing") {
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
  void loadRecentItems();
});

onUnmounted(() => {
  stopRecentAutoRefresh();
  endWatermarkCompareDrag();
});

defineExpose({
  refreshRecentItems: loadRecentItems,
});


</script>

<template>
  <aside
    class="assist-panel h-full min-h-0"
    :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'"
  >
    <WorkspaceGenerateResultPanel
      v-if="generationResult"
      :result="generationResult"
      @back="emit('backFromResult')"
    />

    <WorkspaceImagePreviewPanel
      v-else-if="deliveryImagePreview"
      :preview="deliveryImagePreview"
      @back="closeDeliveryImagePreview"
    />

    <template v-else-if="capability.code === 'watermark-remove'">
      <div class="assist-shell">
        <header class="assist-tabs">
          <div class="tab-group" role="tablist" aria-label="去水印视图切换">
            <template v-if="isGenerating">
              <button
                type="button"
                role="tab"
                :aria-selected="watermarkActiveView === 'generating'"
                :class="{ active: watermarkActiveView === 'generating' }"
                @click="watermarkActiveView = 'generating'"
              >
                姝ｅ湪鐢熸垚
              </button>
              <button
                type="button"
                role="tab"
                :aria-selected="watermarkActiveView === 'recent'"
                :class="{ active: watermarkActiveView === 'recent' }"
                @click="watermarkActiveView = 'recent'"
              >
                鏈€杩戠敓鎴?              </button>
            </template>
            <template v-else>
              <button
                type="button"
                role="tab"
                :aria-selected="watermarkActiveView === 'features'"
                :class="{ active: watermarkActiveView === 'features' }"
                @click="watermarkActiveView = 'features'"
              >
                鍔熻兘鎻忚堪
              </button>
              <button
                type="button"
                role="tab"
                :aria-selected="watermarkActiveView === 'recent'"
                :class="{ active: watermarkActiveView === 'recent' }"
                @click="watermarkActiveView = 'recent'"
              >
                鏈€杩戠敓鎴?              </button>
            </template>
          </div>
        </header>

        <div class="assist-body">
          <section
            v-if="isGenerating && watermarkActiveView === 'generating'"
            class="generation-waiting"
            aria-live="polite"
          >
            <div class="waiting-visual" aria-hidden="true">
              <span class="waiting-scan"></span>
              <span class="waiting-corner waiting-corner--tl"></span>
              <span class="waiting-corner waiting-corner--tr"></span>
              <span class="waiting-corner waiting-corner--bl"></span>
              <span class="waiting-corner waiting-corner--br"></span>
              <Icon icon="mdi:image-sync-outline" />
            </div>
            <div class="waiting-copy">
              <p>图片待处理</p>
              <h2>姝ｅ湪鍘婚櫎姘村嵃</h2>
              <span>AI 正在识别并处理水印区域，请稍候。</span>
            </div>
            <div class="waiting-progress" aria-hidden="true">
              <span></span>
            </div>
          </section>

          <section
            v-else-if="watermarkActiveView === 'features'"
            class="watermark-feature-layout"
            aria-label="去水印功能描述"
          >
            <section class="watermark-assist-hero">
              <div class="watermark-assist-copy">
                <p>AI 去水印能力</p>
                <h2>智能识别水印并完整保留画面细节</h2>
                <span>适用于平台角标、文字与遮挡痕迹处理，输出更干净的车图素材。</span>
              </div>
            </section>

            <section class="watermark-compare-section" aria-label="鏁堟灉瀵规瘮">
              <header class="watermark-section-head">
                <div>
                  <h3>鏁堟灉瀵规瘮</h3>
                  <p>拖动滑杆查看去水印前后效果对比</p>
                </div>
              </header>

              <div class="watermark-compare-grid">
                <article v-for="(card, index) in watermarkCompareCards" :key="card.before" class="watermark-compare-card">
                  <div
                    :ref="(element) => setWatermarkCompareMediaRef(index, element)"
                    class="watermark-compare-media"
                    :style="{ '--compare-progress': `${watermarkCompareProgress[index]}%` }"
                    @pointerdown.prevent="startWatermarkCompareDrag(index, $event)"
                  >
                    <PreloadImage class="watermark-compare-image" :src="card.before" alt="鍘绘按鍗板鐞嗗墠" loading="lazy" decoding="async" />
                    <PreloadImage class="watermark-compare-image watermark-compare-image--after" :src="card.after" alt="鍘绘按鍗板鐞嗗悗" loading="lazy" decoding="async" />
                    <div class="watermark-compare-divider" aria-hidden="true">
                      <span></span>
                    </div>
                    <span class="watermark-compare-badge watermark-compare-badge--before">处理前</span>
                    <span class="watermark-compare-badge watermark-compare-badge--after">处理后</span>
                    <button
                      type="button"
                      class="watermark-compare-handle"
                      aria-label="去水印前后对比拖拽滑杆"
                      @pointerdown.prevent.stop="startWatermarkCompareDrag(index, $event)"
                    >
                      <Icon icon="mdi:unfold-more-horizontal" />
                    </button>
                  </div>
                </article>
              </div>
            </section>
          </section>

          <section v-else class="recent-layout" aria-label="最近生成">
            <div v-if="recentLoading && !recentItems.length" class="recent-empty-state">
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
              :aria-label="canOpenRecent(item) ? `鏌ョ湅${item.title}` : item.title"
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
                  :draggable="false"
                  fit="cover"
                  object-position="center"
                />
                <div v-else class="recent-empty">
                  <Icon icon="mdi:image-outline" />
                </div>
                <span class="recent-status" :class="`is-${item.status}`">
                  <Icon :icon="statusIconMap[item.status]" class="recent-status-icon" />
                  {{ statusLabelMap[item.status] }}
                </span>
              </div>
              <footer class="recent-foot">
                <strong class="recent-name">{{ item.title }}</strong>
                <p v-if="item.sceneLabel" class="recent-scene">{{ item.sceneLabel }}</p>
                <span class="recent-time">
                  <Icon icon="mdi:clock-outline" class="recent-time-icon" />
                  {{ item.createdAt }}
                </span>
              </footer>
            </article>
          </section>
        </div>
      </div>
    </template>
    <ShortVideoBetaPanel
      v-else-if="capability.code === 'short-video'"
      :play-request="shortVideoPlayRequest"
      :generation-result="props.generationResult"
    />

    <template v-else-if="capability.kind === 'delivery'">
      <div class="delivery-panel">
        <header class="delivery-result-head">
          <div>
            <p>鎴愮墖缁撴灉</p>
            <h2>5月展厅批量上新</h2>
            <span>宸插畬鎴?{{ deliveryResultCount }} 寮?路 1:1 棰勮灞曠ず</span>
          </div>
          <button
            type="button"
            class="delivery-download-all"
            :disabled="isDownloadingAllDelivery"
            @click="handleDownloadAllDelivery"
          >
            {{ isDownloadingAllDelivery ? "涓嬭浇涓?.." : "涓嬭浇鍏ㄩ儴" }}
          </button>
        </header>

        <section class="delivery-result-layout" aria-label="鎴愮墖浜や粯缁撴灉">
          <article
            v-for="item in deliveryResults"
            :key="item.title"
            class="delivery-result-card is-clickable"
            role="button"
            tabindex="0"
            :aria-label="`查看大图：${item.title}`"
            @click="openDeliveryResultPreview(item)"
            @keydown.enter.prevent="openDeliveryResultPreview(item)"
            @keydown.space.prevent="openDeliveryResultPreview(item)"
          >
            <div class="delivery-result-media">
              <PreloadImage
                class="delivery-result-image"
                :src="item.image"
                :alt="item.title"
                loading="lazy"
                decoding="async"
                :draggable="false"
              />
            </div>
            <footer class="delivery-result-foot">
              <strong class="delivery-result-name">{{ item.title }}</strong>
              <span class="delivery-result-ratio">{{
                formatDeliveryRatio(item.ratio)
              }}</span>
            </footer>
          </article>
        </section>
      </div>
    </template>

    <template v-else>
      <div class="assist-shell">
        <header class="assist-tabs">
          <div class="tab-group" role="tablist" aria-label="杈呭姪闈㈡澘">
          <template v-if="isBatchProcessingView">
            <button
              type="button"
              role="tab"
              :aria-selected="activeTab === 'batchProcessing'"
              :class="{ active: activeTab === 'batchProcessing' }"
              @click="activeTab = 'batchProcessing'"
            >
              姝ｅ湪澶勭悊
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="activeTab === 'recent'"
              :class="{ active: activeTab === 'recent' }"
              @click="activeTab = 'recent'"
            >
              鏈€杩戠敓鎴?            </button>
          </template>
          <template v-else-if="isGenerating">
            <button
              type="button"
              role="tab"
              :aria-selected="activeTab === 'generating'"
              :class="{ active: activeTab === 'generating' }"
              @click="activeTab = 'generating'"
            >
              姝ｅ湪鐢熸垚
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="activeTab === 'recent'"
              :class="{ active: activeTab === 'recent' }"
              @click="activeTab = 'recent'"
            >
              鏈€杩戠敓鎴?            </button>
          </template>
          <template v-else>
            <button
              type="button"
              role="tab"
              :aria-selected="activeTab === 'guide'"
              :class="{ active: activeTab === 'guide' }"
              @click="activeTab = 'guide'"
            >
              浣跨敤鏁欑▼
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="activeTab === 'recent'"
              :class="{ active: activeTab === 'recent' }"
              @click="activeTab = 'recent'"
            >
              鏈€杩戠敓鎴?            </button>
          </template>
        </div>
      </header>

      <div class="assist-body">
      <section
        v-if="isBatchProcessingView && activeTab === 'batchProcessing'"
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
            <div v-else class="recent-empty">
              <Icon icon="mdi:image-outline" />
            </div>
            <span class="recent-status" :class="`is-${item.status}`">
              <Icon :icon="statusIconMap[item.status]" class="recent-status-icon" />
              {{ statusLabelMap[item.status] }}
            </span>
          </div>
          <footer class="recent-foot">
            <strong class="recent-name">{{ item.title }}</strong>
            <p v-if="item.sceneLabel" class="recent-scene">{{ item.sceneLabel }}</p>
            <span class="recent-time">
              <Icon icon="mdi:clock-outline" class="recent-time-icon" />
              {{ item.createdAt }}
              <template v-if="item.progress !== undefined && item.progress < 100">
                路 杩涘害 {{ item.progress }}%
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
          <span class="waiting-corner waiting-corner--tl"></span>
          <span class="waiting-corner waiting-corner--tr"></span>
          <span class="waiting-corner waiting-corner--bl"></span>
          <span class="waiting-corner waiting-corner--br"></span>
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
        v-else-if="!isGenerating && activeTab === 'guide' && !isBatchProcessingView"
        class="guide-layout"
        :class="{ 'is-compact-guide': !showTemplateRecommendations }"
      >
        <section class="tutorial-section" aria-label="浣跨敤鏁欑▼娴佺▼">
          <h2>浣跨敤鏁欑▼</h2>
          <div class="tutorial-flow">
            <template
              v-for="(step, index) in tutorialSteps"
              :key="`${capability.code}-${step.title}`"
            >
              <motion.article
                :initial="{ opacity: 0, y: 14 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.32, delay: index * 0.04 }"
                class="tutorial-step"
              >
                <div class="tutorial-placeholder">
                  <Icon :icon="step.icon" />
                  <span>{{ String(index + 1).padStart(2, "0") }}</span>
                </div>
                <p>{{ step.title }}</p>
              </motion.article>
              <Icon
                v-if="index < tutorialSteps.length - 1"
                icon="mdi:arrow-right"
                class="flow-arrow"
              />
            </template>
          </div>
        </section>

        <section
          v-if="showTemplateRecommendations"
          class="template-section"
          aria-label="妯℃澘鎺ㄨ崘"
        >
          <h2>初次使用？试试这些</h2>
          <div class="template-grid">
            <article
              v-for="item in templateCards"
              :key="item.title"
              role="button"
              tabindex="0"
              class="template-card"
              :class="{ 'is-active': isTemplateActive(item) }"
              :aria-pressed="isTemplateActive(item)"
              :aria-label="`閫夋嫨${item.title}鍦烘櫙`"
              @click="handleTemplatePick(item)"
              @keydown.enter.prevent="handleTemplatePick(item)"
              @keydown.space.prevent="handleTemplatePick(item)"
            >
              <PreloadImage
                class="template-image"
                :src="item.image"
                :alt="item.title"
                loading="lazy"
                :draggable="false"
              />
              <div class="template-title">
                <span>{{ item.title }}</span>
              </div>
            </article>
          </div>
        </section>

        <section class="requirement-section" aria-label="绱犳潗瑕佹眰">
          <strong>绱犳潗瑕佹眰</strong>
          <div class="requirement-list">
            <span v-for="item in capability.requirements" :key="item">
              <Icon icon="mdi:check" />
              {{ item }}
            </span>
          </div>
        </section>
      </section>

      <section v-else class="recent-layout" aria-label="最近生成">
        <div v-if="recentLoading && !recentItems.length" class="recent-empty-state">
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
          :aria-label="canOpenRecent(item) ? `鏌ョ湅${item.title}` : item.title"
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
              :draggable="false"
              fit="cover"
              object-position="center"
            />
            <div v-else class="recent-empty">
              <Icon icon="mdi:image-outline" />
            </div>
            <span class="recent-status" :class="`is-${item.status}`">
              <Icon :icon="statusIconMap[item.status]" class="recent-status-icon" />
              {{ statusLabelMap[item.status] }}
            </span>
          </div>
          <footer class="recent-foot">
            <strong class="recent-name">{{ item.title }}</strong>
            <p v-if="item.sceneLabel" class="recent-scene">{{ item.sceneLabel }}</p>
            <span class="recent-time">
              <Icon icon="mdi:clock-outline" class="recent-time-icon" />
              {{ item.createdAt }}
            </span>
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
  --assist-scroll-track: rgba(255, 255, 255, 0.08);
  --assist-scroll-thumb: rgba(239, 194, 76, 0.42);
  --assist-scroll-thumb-hover: rgba(255, 215, 90, 0.72);
  --assist-shadow: var(--workspace-shadow, 0 18px 52px rgba(0, 0, 0, 0.2));

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
  border-radius: 18px;
  background:
    radial-gradient(
      720px 180px at 48% 0%,
      color-mix(in srgb, var(--workspace-accent, #efc24c) 13%, transparent),
      transparent 72%
    ),
    var(--assist-bg);
  color: var(--assist-text);
}

.assist-panel.theme-light {
  --assist-bg: var(--workspace-panel, #fcfaf5);
  --assist-card: rgba(255, 255, 255, 0.72);
  --assist-card-strong: rgba(255, 252, 244, 0.92);
  --assist-border: var(--workspace-line, rgba(47, 35, 12, 0.12));
  --assist-border-soft: rgba(47, 35, 12, 0.08);
  --assist-text: var(--app-text);
  --assist-muted: var(--workspace-muted, var(--app-text-soft));
  --assist-scroll-track: rgba(235, 224, 206, 0.82);
  --assist-scroll-thumb: rgba(201, 134, 0, 0.42);
  --assist-scroll-thumb-hover: rgba(168, 109, 0, 0.68);
  --assist-shadow: var(--workspace-shadow, 0 14px 34px rgba(78, 111, 148, 0.09));

  background:
    radial-gradient(
      760px 180px at 45% 0%,
      color-mix(in srgb, var(--workspace-accent, #c98600) 14%, transparent),
      transparent 74%
    ),
    var(--assist-bg);
}

.assist-tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 18px;
  min-height: 32px;
  margin-bottom: 14px;
}

.assist-shell {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
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
    linear-gradient(180deg, color-mix(in srgb, var(--workspace-accent, #efc24c) 8%, transparent), transparent 42%),
    var(--assist-card);
  box-shadow: var(--assist-shadow);
}

.waiting-visual {
  position: relative;
  display: grid;
  place-items: center;
  width: min(100%, 320px);
  aspect-ratio: 16 / 10;
  border: 1px dashed color-mix(in srgb, var(--assist-blue) 28%, var(--assist-border));
  border-radius: 18px;
  background:
    radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--workspace-accent, #efc24c) 16%, transparent), transparent 38%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02)),
    var(--assist-card-strong);
  overflow: hidden;
}

.theme-light .waiting-visual {
  background:
    radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--workspace-accent, #efc24c) 13%, transparent), transparent 38%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(241, 247, 255, 0.82)),
    var(--assist-card-strong);
}

.waiting-visual .iconify {
  position: relative;
  z-index: 2;
  color: var(--assist-blue);
  font-size: clamp(58px, 7vw, 92px);
  filter: drop-shadow(0 8px 24px color-mix(in srgb, var(--workspace-accent, #efc24c) 18%, transparent));
  animation: waiting-pulse 1.6s ease-in-out infinite;
}

.waiting-scan {
  position: absolute;
  inset: 12% 16%;
  border-radius: 14px;
  background:
    linear-gradient(
      180deg,
      transparent 0%,
      color-mix(in srgb, var(--workspace-accent, #efc24c) 16%, transparent) 48%,
      color-mix(in srgb, var(--workspace-accent, #efc24c) 4%, transparent) 52%,
      transparent 100%
    );
  opacity: 0.75;
  animation: waiting-scan 1.8s linear infinite;
}

.waiting-corner {
  position: absolute;
  width: 28px;
  height: 28px;
  border: 2px solid color-mix(in srgb, var(--workspace-accent, #efc24c) 45%, transparent);
}

.waiting-corner--tl {
  left: 16px;
  top: 16px;
  border-right: 0;
  border-bottom: 0;
  border-top-left-radius: 12px;
}

.waiting-corner--tr {
  right: 16px;
  top: 16px;
  border-left: 0;
  border-bottom: 0;
  border-top-right-radius: 12px;
}

.waiting-corner--bl {
  left: 16px;
  bottom: 16px;
  border-right: 0;
  border-top: 0;
  border-bottom-left-radius: 12px;
}

.waiting-corner--br {
  right: 16px;
  bottom: 16px;
  border-left: 0;
  border-top: 0;
  border-bottom-right-radius: 12px;
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
  background: color-mix(in srgb, var(--assist-blue) 12%, var(--assist-border-soft));
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

.delivery-download-all {
  flex-shrink: 0;
  height: 40px;
  border: 1px solid color-mix(in srgb, var(--workspace-accent, #efc24c) 34%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--workspace-accent, #efc24c) 13%, transparent);
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
  border-color: color-mix(in srgb, var(--workspace-accent, #efc24c) 50%, transparent);
  background: color-mix(in srgb, var(--workspace-accent, #efc24c) 20%, transparent);
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
  scrollbar-width: thin;
  scrollbar-color: var(--assist-scroll-thumb) var(--assist-scroll-track);
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

.delivery-result-layout::-webkit-scrollbar {
  width: 10px;
}

.delivery-result-layout::-webkit-scrollbar-track {
  border-radius: 999px;
  background: var(--assist-scroll-track);
  box-shadow: inset 0 0 0 1px rgba(127, 151, 179, 0.12);
}

.delivery-result-layout::-webkit-scrollbar-thumb {
  border: 2px solid var(--assist-scroll-track);
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    var(--assist-blue),
    var(--assist-scroll-thumb)
  );
}

.delivery-result-layout::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(
    90deg,
    var(--assist-blue),
    var(--assist-scroll-thumb-hover)
  );
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
  border-color: color-mix(in srgb, var(--assist-blue) 42%, var(--assist-border));
  box-shadow: 0 10px 24px color-mix(in srgb, var(--workspace-accent, #efc24c) 12%, transparent);
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
    linear-gradient(145deg, color-mix(in srgb, var(--workspace-accent, #efc24c) 8%, transparent), transparent 42%),
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
  scrollbar-width: thin;
  scrollbar-color: var(--assist-scroll-thumb) var(--assist-scroll-track);
}

.watermark-feature-layout::-webkit-scrollbar {
  width: 8px;
}

.watermark-feature-layout::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: linear-gradient(180deg, var(--assist-blue), var(--assist-scroll-thumb));
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
  background: linear-gradient(180deg, transparent, var(--assist-blue), transparent);
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
  font-size: 18px;
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
  padding: 0 0 10px;
  color: var(--assist-muted);
  font-size: 15px;
  font-weight: 900;
}

.tab-group button.active {
  color: var(--assist-blue);
}

.tab-group button.active::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  border-radius: 999px;
  background: var(--assist-blue);
}

.expand-button {
  color: var(--assist-blue);
  font-size: 14px;
  font-weight: 900;
}

.guide-layout {
  display: grid;
  flex: 1;
  min-height: 0;
  grid-template-rows: auto auto auto;
  align-content: start;
  gap: 14px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 6px 18px 0;
  scrollbar-width: thin;
  scrollbar-color: var(--assist-scroll-thumb) var(--assist-scroll-track);
}

.guide-layout.is-compact-guide {
  grid-template-rows: auto auto;
}

.guide-layout::-webkit-scrollbar {
  width: 8px;
}

.guide-layout::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: linear-gradient(
    180deg,
    var(--assist-blue),
    var(--assist-scroll-thumb)
  );
}

.tutorial-section,
.template-section,
.requirement-section,
.recent-card {
  border: 1px solid var(--assist-border);
  background: var(--assist-card);
  box-shadow: var(--assist-shadow);
}

.tutorial-section,
.template-section {
  overflow: hidden;
  border-radius: 10px;
  padding: 14px 16px 16px;
}

.tutorial-section h2,
.template-section h2 {
  margin: 0;
  color: var(--assist-text);
  font-size: 16px;
  line-height: 1.3;
  font-weight: 900;
}

.tutorial-flow {
  display: grid;
  grid-template-columns:
    minmax(120px, 1fr) 32px minmax(120px, 1fr) 32px minmax(120px, 1fr)
    32px minmax(120px, 1fr);
  align-items: center;
  gap: 12px;
  min-height: 120px;
  margin-top: 12px;
}

.tutorial-step {
  display: grid;
  align-content: center;
  justify-items: center;
  min-width: 0;
  height: 100%;
}

.tutorial-placeholder {
  position: relative;
  display: grid;
  place-items: center;
  width: min(100%, 178px);
  height: 86px;
  min-height: 86px;
  border: 1px dashed rgba(73, 130, 218, 0.34);
  border-radius: 14px;
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.08),
      rgba(255, 255, 255, 0.02)
    ),
    var(--assist-card-strong);
}

.theme-light .tutorial-placeholder {
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.85),
      rgba(239, 246, 255, 0.8)
    ),
    var(--assist-card-strong);
}

.tutorial-placeholder > .iconify {
  color: var(--assist-blue);
  font-size: 38px;
}

.tutorial-placeholder span {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: grid;
  place-items: center;
  width: 28px;
  height: 22px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--workspace-accent, #efc24c) 14%, transparent);
  color: var(--assist-blue);
  font-size: 13px;
  font-weight: 900;
}

.tutorial-step p {
  margin: 8px 0 0;
  color: var(--assist-text);
  text-align: center;
  font-size: 13px;
  font-weight: 900;
}

.flow-arrow {
  justify-self: center;
  color: rgba(142, 162, 190, 0.68);
  font-size: 24px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 12px;
}

.template-card {
  position: relative;
  aspect-ratio: 16 / 10;
  min-width: 0;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 12px;
  background: var(--assist-card-strong);
  cursor: pointer;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.template-card:hover {
  transform: translateY(-2px);
}

.template-card.is-active {
  border-color: var(--assist-blue);
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--workspace-accent, #efc24c) 16%, transparent),
    0 12px 28px color-mix(in srgb, var(--workspace-accent, #efc24c) 20%, transparent);
}

.template-card:focus-visible {
  border-color: var(--assist-blue);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--workspace-accent, #efc24c) 24%, transparent);
}

.template-image {
  width: 100%;
  height: 100%;
}

.template-title {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  display: flex;
  align-items: end;
  min-height: 52px;
  padding: 12px;
  background: linear-gradient(180deg, transparent, rgba(5, 14, 28, 0.74));
}

.template-title span {
  color: #fff;
  font-size: 13px;
  font-weight: 900;
}

.requirement-section {
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
  border-radius: 12px;
  padding: 14px 18px;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--assist-card) 94%, white),
      var(--assist-card)
    );
}

.requirement-section strong {
  color: var(--assist-text);
  font-size: 14px;
  font-weight: 900;
  white-space: nowrap;
}

.requirement-list {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 10px;
}

.requirement-list span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 0 13px;
  border-radius: 999px;
  background: rgba(39, 183, 125, 0.15);
  color: var(--assist-green);
  font-size: 12px;
  font-weight: 900;
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
  padding: 2px 6px 20px 0;
  scrollbar-width: thin;
  scrollbar-color: var(--assist-scroll-thumb) var(--assist-scroll-track);
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

.recent-layout::-webkit-scrollbar {
  width: 10px;
}

.recent-layout::-webkit-scrollbar-track {
  border-radius: 999px;
  background: var(--assist-scroll-track);
}

.recent-layout::-webkit-scrollbar-thumb {
  border: 2px solid var(--assist-scroll-track);
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    var(--assist-blue),
    var(--assist-scroll-thumb)
  );
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
  border-color: color-mix(
    in srgb,
    var(--assist-blue) 45%,
    var(--assist-border)
  );
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--workspace-accent, #efc24c) 12%, transparent),
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
    linear-gradient(145deg, color-mix(in srgb, var(--workspace-accent, #efc24c) 8%, transparent), transparent 42%),
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

.recent-time {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: auto;
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
    margin-bottom: 10px;
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
    margin-bottom: 12px;
  }

  .guide-layout {
    gap: 12px;
    padding-right: 4px;
    padding-bottom: 14px;
  }

  .tutorial-flow {
    gap: 10px;
    grid-template-columns:
      minmax(0, 1fr) 28px minmax(0, 1fr) 28px minmax(0, 1fr)
      28px minmax(0, 1fr);
  }

  .tutorial-placeholder {
    height: 78px;
    min-height: 78px;
  }

  .template-grid {
    gap: 12px;
  }

  .flow-arrow {
    font-size: 22px;
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
