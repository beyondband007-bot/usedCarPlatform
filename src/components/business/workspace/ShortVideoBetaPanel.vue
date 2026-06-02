<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { Icon } from "@iconify/vue";

import PreloadImage from "@/components/common/PreloadImage.vue";
import type { WorkspaceGenerateResult, WorkspaceRecentItem } from "@/types/workspace";
import {
  recentStatusIconMap,
  recentStatusLabelMap,
} from "@/utils/workspace-recent";

const props = defineProps<{
  playRequest?: number;
  isGenerating?: boolean;
  generationResult?: WorkspaceGenerateResult | null;
  recentItems?: WorkspaceRecentItem[];
  recentLoading?: boolean;
  initialView?: "preview" | "recent";
}>();

const emit = defineEmits<{
  pickRecent: [item: WorkspaceRecentItem];
}>();

const videoRef = ref<HTMLVideoElement | null>(null);
const activeView = ref<"preview" | "recent">(props.initialView ?? "preview");
const recentVideoItems = computed(() => props.recentItems ?? []);
const statusLabelMap = recentStatusLabelMap;
const statusIconMap = recentStatusIconMap;

async function playGeneratedVideo() {
  await nextTick();

  const video = videoRef.value;
  if (!video) {
    return;
  }

  video.currentTime = 0;

  try {
    await video.play();
  } catch {
    // 浏览器可能阻止自动播放，保留控件供用户手动播放。
  }
}

watch(
  () => props.playRequest,
  (request) => {
    if (!request) {
      return;
    }

    void playGeneratedVideo();
  },
);

watch(
  () => props.generationResult?.previewVideo,
  (videoUrl) => {
    if (!videoUrl) return;
    activeView.value = "preview";
    void playGeneratedVideo();
  },
);

watch(
  () => props.initialView,
  (view) => {
    if (view) activeView.value = view;
  },
);

function canOpenRecentVideo(item: WorkspaceRecentItem) {
  return Boolean(item.taskId) || (item.status === "success" && Boolean(item.downloadUrl));
}

function handleRecentPick(item: WorkspaceRecentItem) {
  if (!canOpenRecentVideo(item)) return;
  emit("pickRecent", item);
}
</script>

<template>
  <section class="short-video-panel" aria-label="短视频生成说明">
    <header class="short-video-head">
      <div class="short-video-head-copy">
        <p class="short-video-eyebrow">短视频生成</p>
        <h2>上传车辆外观图后生成营销视频</h2>
        <span>默认使用 16:9、720p、10 秒配置，任务创建后会自动轮询生成结果。</span>
      </div>
    </header>

    <div class="short-video-tabs" role="tablist" aria-label="short video views">
      <button
        type="button"
        role="tab"
        :aria-selected="activeView === 'recent'"
        :class="{ active: activeView === 'recent' }"
        @click="activeView = activeView === 'recent' ? 'preview' : 'recent'"
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
              <Icon :icon="statusIconMap[item.status]" />
              {{ statusLabelMap[item.status] }}
            </span>
            <span v-if="item.status === 'success'" class="short-video-play-badge">
              <Icon icon="mdi:play" />
            </span>
          </div>
          <footer class="short-video-recent-foot">
            <strong>{{ item.title }}</strong>
            <span>{{ item.ratioLabel || item.sceneLabel || '16:9 · 720p · 10秒' }}</span>
            <small>
              <Icon icon="mdi:clock-outline" />
              {{ item.createdAt }}
            </small>
          </footer>
        </article>
      </template>
    </section>

    <div v-else-if="props.generationResult?.previewVideo" class="short-video-stage">
      <video
        ref="videoRef"
        class="short-video-player"
        controls
        playsinline
        preload="metadata"
        :src="props.generationResult.previewVideo"
      >
        当前浏览器不支持视频播放。
      </video>
    </div>

    <template v-else>
      <section v-if="props.isGenerating" class="short-video-waiting" aria-live="polite">
        <div class="short-video-waiting-visual" aria-hidden="true">
          <span class="short-video-waiting-scan"></span>
          <span class="short-video-waiting-corner short-video-waiting-corner--tl"></span>
          <span class="short-video-waiting-corner short-video-waiting-corner--tr"></span>
          <span class="short-video-waiting-corner short-video-waiting-corner--bl"></span>
          <span class="short-video-waiting-corner short-video-waiting-corner--br"></span>
          <Icon icon="mdi:image-sync-outline" />
        </div>

        <div class="short-video-waiting-copy">
          <p>视频待生成</p>
          <h2>正在生成营销视频</h2>
          <span>AI 正在分析车辆素材并生成 16:9、720p、10 秒短视频，请稍候。</span>
        </div>

        <div class="short-video-waiting-progress" aria-hidden="true">
          <span></span>
        </div>
      </section>

      <div v-else class="short-video-blank short-video-blank--preview">
        <div class="short-video-canvas">
          <div class="short-video-hero">
            <Icon icon="mdi:video-plus-outline" />
            <strong>短视频预览区</strong>
            <span>这里会展示生成后的营销短视频播放器</span>
          </div>

          <div class="short-video-preview-strip">
            <div class="short-video-preview-card">
              <Icon icon="mdi:car-estate" />
              <span>外观图</span>
            </div>
            <div class="short-video-preview-arrow">
              <Icon icon="mdi:arrow-right" />
            </div>
            <div class="short-video-preview-card is-accent">
              <Icon icon="mdi:filmstrip" />
              <span>成片输出</span>
            </div>
          </div>
        </div>

        <aside class="short-video-side">
          <div class="short-video-spec">
            <span>输出内容</span>
            <strong>10 秒营销短视频</strong>
          </div>
          <div class="short-video-spec">
            <span>适用场景</span>
            <strong>车辆外观展示、社媒投放、详情页动效</strong>
          </div>
          <div class="short-video-spec">
            <span>说明</span>
            <strong>上传左侧车辆图后点击生成即可开始</strong>
          </div>
        </aside>
      </div>
    </template>
  </section>
</template>

<style scoped lang="scss">
.short-video-panel {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: clamp(12px, 1.2vw, 16px);
  overflow: hidden;
}

.short-video-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-shrink: 0;
}

.short-video-head-copy {
  min-width: 0;
}

.short-video-head p,
.short-video-head h2,
.short-video-head span {
  margin: 0;
}

.short-video-eyebrow {
  color: var(--assist-blue);
  font-size: 13px;
  font-weight: 900;
}

.short-video-head h2 {
  margin-top: 6px;
  color: var(--assist-text);
  font-size: clamp(20px, 1.6vw, 28px);
  font-weight: 950;
  line-height: 1.2;
}

.short-video-head span {
  display: block;
  margin-top: 8px;
  color: var(--assist-muted);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.55;
}

.short-video-tabs {
  display: inline-flex;
  align-self: flex-start;
  flex-shrink: 0;
  gap: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--assist-card) 82%, transparent);
  padding: 4px;
}

.short-video-tabs button {
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--assist-muted);
  padding: 8px 14px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.short-video-tabs button.active {
  background: color-mix(in srgb, var(--assist-blue) 13%, var(--assist-card));
  color: var(--assist-blue);
}

.short-video-stage,
.short-video-blank,
.short-video-recent {
  display: flex;
  min-height: 0;
  flex: 1;
}

.short-video-stage {
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 2px 0;
}

.short-video-recent {
  display: grid;
  align-content: start;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 2px 6px 20px 0;
}

.short-video-recent-empty {
  display: grid;
  min-height: 280px;
  grid-column: 1 / -1;
  place-items: center;
  align-content: center;
  gap: 10px;
  border: 1px dashed var(--assist-border);
  border-radius: 14px;
  background: var(--assist-card);
  color: var(--assist-muted);
  font-size: 13px;
  font-weight: 800;
}

.short-video-recent-empty .iconify {
  color: var(--assist-blue);
  font-size: 34px;
}

.short-video-loading-icon {
  animation: short-video-loading-spin 0.9s linear infinite;
}

.short-video-recent-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--assist-border);
  border-radius: 12px;
  background: var(--assist-card);
  box-shadow: var(--assist-shadow);
}

.short-video-recent-card.is-clickable {
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.short-video-recent-card.is-clickable:hover {
  border-color: color-mix(in srgb, var(--assist-blue) 44%, var(--assist-border));
  box-shadow: 0 10px 24px color-mix(in srgb, var(--workspace-accent, #efc24c) 12%, transparent);
  transform: translateY(-1px);
}

.short-video-recent-media {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--assist-card-strong);
}

.short-video-recent-image {
  width: 100%;
  height: 100%;
}

.short-video-recent-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: var(--assist-blue);
  font-size: 34px;
}

.short-video-recent-status {
  position: absolute;
  left: 10px;
  top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 999px;
  background: rgba(120, 120, 120, 0.88);
  color: #fff;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 900;
}

.short-video-recent-status.is-success {
  background: rgba(39, 183, 125, 0.92);
}

.short-video-recent-status.is-fail,
.short-video-recent-status.is-canceled {
  background: rgba(239, 99, 99, 0.92);
}

.short-video-recent-status.is-waiting,
.short-video-recent-status.is-queued,
.short-video-recent-status.is-queue,
.short-video-recent-status.is-generating {
  background: rgba(47, 107, 255, 0.9);
}

.short-video-play-badge {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  font-size: 18px;
}

.short-video-recent-foot {
  display: grid;
  gap: 5px;
  padding: 11px 12px 12px;
}

.short-video-recent-foot strong,
.short-video-recent-foot span,
.short-video-recent-foot small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.short-video-recent-foot strong {
  color: var(--assist-text);
  font-size: 13px;
  font-weight: 950;
}

.short-video-recent-foot span,
.short-video-recent-foot small {
  color: var(--assist-muted);
  font-size: 12px;
  font-weight: 800;
}

.short-video-recent-foot small {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.short-video-waiting {
  display: grid;
  min-height: 0;
  flex: 1;
  align-content: center;
  justify-items: center;
  gap: 18px;
  border: 1px solid var(--assist-border);
  border-radius: 16px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--workspace-accent, #efc24c) 8%, transparent), transparent 40%),
    var(--assist-card);
  box-shadow: var(--assist-shadow);
  padding: clamp(24px, 3vw, 40px);
}

.short-video-waiting-visual {
  position: relative;
  display: grid;
  place-items: center;
  width: min(100%, 760px);
  aspect-ratio: 16 / 9;
  border: 1px dashed color-mix(in srgb, var(--assist-blue) 30%, var(--assist-border));
  border-radius: 22px;
  background:
    radial-gradient(circle at 50% 44%, color-mix(in srgb, var(--workspace-accent, #efc24c) 12%, transparent), transparent 36%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.75), rgba(244, 248, 255, 0.62)),
    var(--assist-card-strong);
  overflow: hidden;
}

.theme-dark .short-video-waiting-visual {
  background:
    radial-gradient(circle at 50% 44%, color-mix(in srgb, var(--workspace-accent, #efc24c) 14%, transparent), transparent 36%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02)),
    var(--assist-card-strong);
}

.short-video-waiting-visual .iconify {
  position: relative;
  z-index: 2;
  color: var(--assist-blue);
  font-size: clamp(60px, 7vw, 96px);
  filter: drop-shadow(0 10px 24px color-mix(in srgb, var(--workspace-accent, #efc24c) 16%, transparent));
  animation: short-video-waiting-pulse 1.6s ease-in-out infinite;
}

.short-video-waiting-scan {
  position: absolute;
  inset: 12% 16%;
  border-radius: 16px;
  background:
    linear-gradient(
      180deg,
      transparent 0%,
      color-mix(in srgb, var(--workspace-accent, #efc24c) 16%, transparent) 48%,
      color-mix(in srgb, var(--workspace-accent, #efc24c) 4%, transparent) 52%,
      transparent 100%
    );
  opacity: 0.75;
  animation: short-video-waiting-scan 1.8s linear infinite;
}

.short-video-waiting-corner {
  position: absolute;
  width: 30px;
  height: 30px;
  border: 2px solid color-mix(in srgb, var(--assist-blue) 62%, transparent);
  opacity: 0.86;
}

.short-video-waiting-corner--tl {
  left: 18px;
  top: 18px;
  border-right: 0;
  border-bottom: 0;
  border-top-left-radius: 12px;
}

.short-video-waiting-corner--tr {
  right: 18px;
  top: 18px;
  border-left: 0;
  border-bottom: 0;
  border-top-right-radius: 12px;
}

.short-video-waiting-corner--bl {
  left: 18px;
  bottom: 18px;
  border-top: 0;
  border-right: 0;
  border-bottom-left-radius: 12px;
}

.short-video-waiting-corner--br {
  right: 18px;
  bottom: 18px;
  border-top: 0;
  border-left: 0;
  border-bottom-right-radius: 12px;
}

.short-video-waiting-copy {
  display: grid;
  justify-items: center;
  gap: 6px;
  width: min(100%, 560px);
  text-align: center;
}

.short-video-waiting-copy p,
.short-video-waiting-copy h2,
.short-video-waiting-copy span {
  margin: 0;
}

.short-video-waiting-copy p {
  color: var(--assist-blue);
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.04em;
}

.short-video-waiting-copy h2 {
  color: var(--assist-text);
  font-size: clamp(20px, 1.8vw, 28px);
  line-height: 1.2;
  font-weight: 950;
}

.short-video-waiting-copy span {
  color: var(--assist-muted);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.7;
}

.short-video-waiting-progress {
  width: min(100%, 360px);
  height: 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--assist-blue) 12%, var(--assist-border-soft));
  overflow: hidden;
}

.short-video-waiting-progress span {
  display: block;
  width: 38%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--assist-blue), #63a6ff 60%, #9bc6ff);
  animation: short-video-waiting-progress 1.5s ease-in-out infinite;
}

.short-video-blank {
  gap: 16px;
  align-items: stretch;
}

.short-video-canvas {
  display: grid;
  min-height: 0;
  flex: 1;
  align-content: center;
  justify-items: center;
  gap: 18px;
  border-radius: 14px;
  background: var(--assist-card);
  color: var(--assist-muted);
  padding: 24px;
}

.short-video-side {
  display: grid;
  width: min(240px, 30%);
  gap: 12px;
  align-content: start;
  flex-shrink: 0;
}

.short-video-spec {
  border-radius: 14px;
  background: var(--assist-card);
  padding: 14px 16px;
}

.short-video-spec span,
.short-video-spec strong {
  display: block;
}

.short-video-spec span {
  color: var(--assist-muted);
  font-size: 12px;
  font-weight: 800;
}

.short-video-spec strong {
  margin-top: 6px;
  color: var(--assist-text);
  font-size: 13px;
  font-weight: 900;
  line-height: 1.5;
}

.short-video-hero {
  display: grid;
  place-items: center;
  gap: 10px;
  text-align: center;
}

.short-video-hero .iconify {
  color: var(--assist-blue);
  font-size: 44px;
}

.short-video-hero strong {
  color: var(--assist-text);
  font-size: 17px;
  font-weight: 950;
}

.short-video-hero span {
  max-width: 320px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.55;
}

.short-video-preview-strip {
  width: min(100%, 420px);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

.short-video-preview-card {
  display: grid;
  justify-items: center;
  gap: 8px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--assist-border) 14%, var(--assist-card));
  padding: 14px 10px;
  text-align: center;
}

.short-video-preview-card.is-accent {
  background: color-mix(in srgb, var(--assist-blue) 8%, var(--assist-card));
}

.short-video-preview-card .iconify {
  color: var(--assist-blue);
  font-size: 26px;
}

.short-video-preview-card span {
  color: var(--assist-text);
  font-size: 12px;
  font-weight: 900;
}

.short-video-preview-arrow {
  color: var(--assist-muted);
  font-size: 22px;
}

.short-video-player {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  max-height: 100%;
  border-radius: 14px;
  background: var(--assist-card);
  box-shadow: var(--assist-shadow);
  object-fit: contain;
}

@keyframes short-video-waiting-pulse {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.03);
  }
}

@keyframes short-video-waiting-scan {
  0% {
    transform: translateY(-22%);
  }

  100% {
    transform: translateY(22%);
  }
}

@keyframes short-video-waiting-progress {
  0% {
    width: 22%;
    transform: translateX(0);
  }

  50% {
    width: 42%;
  }

  100% {
    width: 22%;
    transform: translateX(220%);
  }
}

@keyframes short-video-loading-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1180px) {
  .short-video-blank {
    flex-direction: column;
  }

  .short-video-waiting {
    padding: 20px;
  }

  .short-video-side {
    width: 100%;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .short-video-head {
    flex-direction: column;
  }

  .short-video-waiting-copy span {
    font-size: 13px;
  }

  .short-video-side {
    grid-template-columns: 1fr;
  }

  .short-video-preview-strip {
    grid-template-columns: 1fr;
  }

  .short-video-preview-arrow {
    justify-self: center;
    transform: rotate(90deg);
  }
}
</style>
