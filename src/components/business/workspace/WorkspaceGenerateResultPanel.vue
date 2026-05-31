<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { Icon } from "@iconify/vue";

import WorkspaceImagePreviewPanel from "@/components/business/workspace/WorkspaceImagePreviewPanel.vue";
import type { WorkspaceGenerateResult } from "@/types/workspace";
import { buildImagePreviewFromGenerateResult } from "@/utils/workspace-image-preview";

const props = defineProps<{
  result: WorkspaceGenerateResult;
}>();

const emit = defineEmits<{
  back: [];
}>();

const preview = computed(() => buildImagePreviewFromGenerateResult(props.result));
const videoRef = ref<HTMLVideoElement | null>(null);
const videoUrl = computed(() => props.result.previewVideo ?? props.result.downloadUrl);
const isVideoResult = computed(() => props.result.mediaType === "video" && Boolean(videoUrl.value));

watch(videoUrl, async () => {
  await nextTick();
  videoRef.value?.load();
});
</script>

<template>
  <section v-if="isVideoResult" class="video-result-panel">
    <header class="video-result-head">
      <button type="button" class="video-back-button" aria-label="返回" @click="emit('back')">
        <Icon icon="mdi:arrow-left" />
      </button>
      <div class="video-result-copy">
        <p>{{ result.statusText }}</p>
        <h2>短视频生成结果</h2>
        <span>{{ result.ratioLabel }}</span>
      </div>
      <a class="video-download-button" :href="videoUrl" download target="_blank" rel="noreferrer">
        <Icon icon="mdi:download" />
        下载
      </a>
    </header>

    <div class="video-result-stage">
      <video
        ref="videoRef"
        class="video-result-player"
        controls
        playsinline
        preload="metadata"
        :src="videoUrl"
      >
        当前浏览器不支持视频播放。
      </video>
    </div>
  </section>

  <WorkspaceImagePreviewPanel v-else :preview="preview" @back="emit('back')" />
</template>

<style scoped lang="scss">
.video-result-panel {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

.video-result-head {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.video-result-copy {
  min-width: 0;
}

.video-result-head p,
.video-result-head h2,
.video-result-head span {
  margin: 0;
}

.video-result-head p {
  overflow: hidden;
  color: var(--assist-blue);
  font-size: 12px;
  font-weight: 900;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-result-head h2 {
  margin-top: 4px;
  color: var(--assist-text);
  font-size: clamp(18px, 1.4vw, 24px);
  font-weight: 950;
  line-height: 1.2;
}

.video-result-head span {
  display: block;
  margin-top: 6px;
  color: var(--assist-muted);
  font-size: 13px;
  font-weight: 800;
}

.video-back-button,
.video-download-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--assist-card);
  color: var(--assist-text);
  font-family: inherit;
  font-weight: 900;
  cursor: pointer;
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.video-back-button {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  font-size: 20px;
}

.video-download-button {
  gap: 6px;
  min-height: 40px;
  border-radius: 10px;
  padding: 0 14px;
  color: var(--assist-blue);
  text-decoration: none;
  font-size: 13px;
}

.video-back-button:hover,
.video-download-button:hover {
  box-shadow: 0 10px 24px color-mix(in srgb, var(--workspace-accent, #efc24c) 14%, transparent);
  transform: translateY(-1px);
}

.video-result-stage {
  display: grid;
  min-height: 0;
  flex: 1;
  place-items: center;
  overflow: hidden;
  border-radius: 14px;
  background: #050914;
  box-shadow: var(--assist-shadow);
}

.video-result-player {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  max-height: 100%;
  background: #050914;
  object-fit: contain;
}
</style>
