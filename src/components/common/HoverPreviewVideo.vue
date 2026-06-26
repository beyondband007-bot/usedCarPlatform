<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    src: string;
    alt?: string;
    disabled?: boolean;
    loop?: boolean;
    resetOnLeave?: boolean;
    preload?: "none" | "metadata" | "auto";
    /** 进入视口后再加载 video src，减少首屏并发请求 */
    lazy?: boolean;
    lazyRootMargin?: string;
    /** 有静态封面时可延后到 hover 再挂载 src，避免列表并发拉取视频 */
    deferSrcUntilHover?: boolean;
    /** 为 false 时仅展示首帧，不响应 hover 播放（用于左侧已选模板摘要） */
    interactive?: boolean;
  }>(),
  {
    alt: "",
    disabled: false,
    loop: true,
    resetOnLeave: true,
    preload: "metadata",
    lazy: false,
    lazyRootMargin: "80px",
    deferSrcUntilHover: false,
    interactive: true,
  },
);

const rootRef = ref<HTMLElement | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);
const isHovering = ref(false);
const isInView = ref(!props.lazy);
const shouldLoadVideo = ref(!props.deferSrcUntilHover);
const prefersReducedMotion = ref(false);

let activePreviewVideo: HTMLVideoElement | null = null;
let reducedMotionMediaQuery: MediaQueryList | null = null;
let intersectionObserver: IntersectionObserver | null = null;

const shouldAttachSrc = computed(() => {
  if (!props.src) return false;
  if (props.lazy && !isInView.value) return false;
  if (props.deferSrcUntilHover && !shouldLoadVideo.value) return false;
  return true;
});

const resolvedSrc = computed(() => (shouldAttachSrc.value ? props.src : undefined));
const resolvedPreload = computed(() =>
  shouldAttachSrc.value ? props.preload : "none",
);

function handleReducedMotionChange(event: MediaQueryListEvent) {
  prefersReducedMotion.value = event.matches;
  if (event.matches) {
    resetVideoPlayback();
  }
}

function resetVideoPlayback() {
  const video = videoRef.value;
  if (!video) return;

  video.pause();
  if (props.resetOnLeave) {
    video.currentTime = 0;
  }
  if (activePreviewVideo === video) {
    activePreviewVideo = null;
  }
  isHovering.value = false;
  if (props.deferSrcUntilHover) {
    shouldLoadVideo.value = false;
  }
}

function pauseActivePreview(except?: HTMLVideoElement) {
  if (!activePreviewVideo || activePreviewVideo === except) return;

  activePreviewVideo.pause();
  activePreviewVideo.currentTime = 0;
  activePreviewVideo = null;
}

async function handleEnter() {
  if (props.disabled || prefersReducedMotion.value || !isInView.value || !props.interactive) {
    return;
  }

  if (props.deferSrcUntilHover) {
    shouldLoadVideo.value = true;
  }

  await nextTick();

  const video = videoRef.value;
  if (!video) return;

  pauseActivePreview(video);
  activePreviewVideo = video;
  isHovering.value = true;

  try {
    await video.play();
  } catch {
    // Autoplay policy or interrupted play — ignore.
  }
}

function handleLeave() {
  resetVideoPlayback();
}

function handleLoadedData() {
  const video = videoRef.value;
  if (!video || isHovering.value) return;

  if (video.currentTime === 0) {
    video.currentTime = 0.001;
  }
}

function setupLazyObserver() {
  if (!props.lazy || !rootRef.value) return;

  intersectionObserver = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (!entry) return;

      isInView.value = entry.isIntersecting;
      if (!entry.isIntersecting) {
        resetVideoPlayback();
      }
    },
    { rootMargin: props.lazyRootMargin },
  );

  intersectionObserver.observe(rootRef.value);
}

watch(
  () => props.src,
  () => {
    shouldLoadVideo.value = !props.deferSrcUntilHover;
    resetVideoPlayback();
  },
);

onMounted(() => {
  reducedMotionMediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  prefersReducedMotion.value = reducedMotionMediaQuery.matches;
  reducedMotionMediaQuery.addEventListener("change", handleReducedMotionChange);
  setupLazyObserver();
});

onBeforeUnmount(() => {
  reducedMotionMediaQuery?.removeEventListener("change", handleReducedMotionChange);
  intersectionObserver?.disconnect();
  resetVideoPlayback();
});
</script>

<template>
  <div
    ref="rootRef"
    class="hover-preview-video"
    :class="{ 'is-static': !interactive }"
    @mouseenter="handleEnter"
    @mouseleave="handleLeave"
  >
    <video
      ref="videoRef"
      class="hover-preview-video__media"
      :src="resolvedSrc"
      muted
      playsinline
      webkit-playsinline
      :loop="loop"
      :preload="resolvedPreload"
      :aria-label="alt || undefined"
      @loadeddata="handleLoadedData"
    />
  </div>
</template>

<style scoped lang="scss">
.hover-preview-video {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.hover-preview-video__media {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  pointer-events: none;
  background: #111;
}

@media (prefers-reduced-motion: reduce) {
  .hover-preview-video__media {
    animation: none;
  }
}
</style>
