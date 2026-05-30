<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { Icon } from "@iconify/vue";

import type { WorkspaceGenerateResult } from "@/types/workspace";

const props = defineProps<{
  playRequest?: number;
  generationResult?: WorkspaceGenerateResult | null;
}>();

const videoRef = ref<HTMLVideoElement | null>(null);

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
</script>

<template>
  <section class="short-video-panel" aria-label="短视频生成说明">
    <header class="short-video-head">
      <div>
        <p class="short-video-eyebrow">短视频生成</p>
        <h2>上传车辆外观图后生成营销视频</h2>
        <span>默认使用 16:9、720p、10 秒配置，任务创建后会自动轮询生成结果。</span>
      </div>
    </header>

    <div v-if="props.generationResult?.previewVideo" class="short-video-stage">
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

    <div v-else class="short-video-empty">
      <Icon icon="mdi:video-plus-outline" />
      <strong>等待创建短视频任务</strong>
      <span>左侧上传 JPG、PNG 或 WebP 外观图，点击生成后这里会展示视频结果。</span>
    </div>
  </section>
</template>

<style scoped lang="scss">
.short-video-panel {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: clamp(12px, 1.2vw, 14px);
  overflow: hidden;
}

.short-video-head {
  flex-shrink: 0;
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

.short-video-stage,
.short-video-empty {
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

.short-video-empty {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  border: 1px dashed var(--assist-border);
  border-radius: 14px;
  background: var(--assist-card);
  color: var(--assist-muted);
  text-align: center;
  padding: 24px;
}

.short-video-empty .iconify {
  color: var(--assist-blue);
  font-size: 42px;
}

.short-video-empty strong {
  color: var(--assist-text);
  font-size: 16px;
  font-weight: 950;
}

.short-video-empty span {
  max-width: 320px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.55;
}

.short-video-player {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  max-height: 100%;
  border: 1px solid var(--assist-border);
  border-radius: 14px;
  background: #0b1220;
  box-shadow: var(--assist-shadow);
  object-fit: contain;
}
</style>
