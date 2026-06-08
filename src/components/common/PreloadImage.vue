<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { CSSProperties } from "vue";

import {
  isRegisteredStaticImage,
  isStaticImageReady,
  markStaticImageReady,
  warmStaticImage,
} from "@/utils/static-image-cache";

type ImageReferrerPolicy =
  | ""
  | "no-referrer"
  | "no-referrer-when-downgrade"
  | "origin"
  | "origin-when-cross-origin"
  | "same-origin"
  | "strict-origin"
  | "strict-origin-when-cross-origin"
  | "unsafe-url";

const props = withDefaults(
  defineProps<{
    src?: string | null;
    alt?: string;
    loading?: "eager" | "lazy";
    decoding?: "async" | "auto" | "sync";
    draggable?: boolean;
    fit?: "cover" | "contain" | "fill" | "none" | "scale-down";
    objectPosition?: string;
    imgStyle?: CSSProperties;
    fetchpriority?: "high" | "low" | "auto";
    referrerpolicy?: ImageReferrerPolicy;
    crossorigin?: "anonymous" | "use-credentials" | "";
    /** 主图加载失败时尝试的备用地址 */
    fallbackSrc?: string | null;
  }>(),
  {
    src: "",
    alt: "",
    loading: "lazy",
    decoding: "async",
    draggable: false,
    fit: "cover",
    objectPosition: "center",
    imgStyle: undefined,
    fetchpriority: undefined,
    referrerpolicy: undefined,
    crossorigin: undefined,
  },
);

const emit = defineEmits<{
  load: [event: Event];
  error: [event: Event];
}>();

const isLoaded = ref(false);
const hasError = ref(false);
const activeSrc = ref("");

const normalizedSrc = computed(() => props.src?.trim() ?? "");
const normalizedFallbackSrc = computed(() => props.fallbackSrc?.trim() ?? "");

const imageStyle = computed(
  () =>
    ({
      "--preload-image-fit": props.fit,
      "--preload-image-position": props.objectPosition,
    }) as CSSProperties,
);

watch(
  [normalizedSrc, normalizedFallbackSrc],
  ([src]) => {
    isLoaded.value = isStaticImageReady(src);
    hasError.value = !src;
    activeSrc.value = src;

    if (src && isRegisteredStaticImage(src)) {
      void warmStaticImage(src, {
        crossorigin: props.crossorigin,
        referrerpolicy: props.referrerpolicy,
      });
    }
  },
  { immediate: true },
);

function handleLoad(event: Event) {
  markStaticImageReady(activeSrc.value);
  hasError.value = false;
  isLoaded.value = true;
  emit("load", event);
}

function handleError(event: Event) {
  const fallback = normalizedFallbackSrc.value;
  if (fallback && activeSrc.value !== fallback) {
    isLoaded.value = false;
    hasError.value = false;
    activeSrc.value = fallback;
    return;
  }

  isLoaded.value = false;
  hasError.value = true;
  emit("error", event);
}
</script>

<template>
  <span
    class="preload-image"
    :class="{ 'is-loaded': isLoaded, 'is-error': hasError }"
    :style="imageStyle"
  >
    <span
      v-if="!isLoaded"
      class="preload-image__placeholder"
      aria-hidden="true"
    >
      <span v-if="!hasError && activeSrc" class="preload-image__spinner"></span>
      <span v-else class="preload-image__fallback"></span>
    </span>

    <img
      v-if="activeSrc && !hasError"
      class="preload-image__img"
      :src="activeSrc"
      :alt="alt"
      :loading="loading"
      :decoding="decoding"
      :draggable="draggable"
      :fetchpriority="fetchpriority"
      :referrerpolicy="referrerpolicy"
      :crossorigin="crossorigin"
      :style="imgStyle"
      @load="handleLoad"
      @error="handleError"
    />
  </span>
</template>

<style scoped lang="scss">
:where(.preload-image) {
  --preload-image-accent: var(--workspace-accent, var(--home-gold, #efc24c));
  --preload-image-accent-strong: var(
    --workspace-accent-strong,
    var(--home-gold-strong, #c98600)
  );
  --preload-image-surface: var(
    --workspace-panel-soft,
    var(--home-panel, var(--app-surface-soft, #f3f0e8))
  );
  --preload-image-line: color-mix(
    in srgb,
    var(--preload-image-accent) 20%,
    var(--app-border, rgba(15, 23, 42, 0.12))
  );

  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--preload-image-accent) 8%, transparent),
      transparent 48%
    ),
    var(--preload-image-surface);
}

:global([data-theme="dark"]) .preload-image {
  --preload-image-surface: var(
    --workspace-panel-soft,
    var(--home-panel, var(--app-surface-soft, #111))
  );
  --preload-image-line: color-mix(
    in srgb,
    var(--preload-image-accent) 32%,
    rgba(255, 255, 255, 0.12)
  );
}

.preload-image__img {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: var(--preload-image-fit, cover);
  object-position: var(--preload-image-position, center);
  opacity: 0;
  transition: opacity 0.24s ease;
}

.preload-image.is-loaded .preload-image__img {
  opacity: 1;
}

.preload-image__placeholder {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-items: center;
  background:
    linear-gradient(
      110deg,
      transparent 0%,
      color-mix(in srgb, var(--preload-image-accent) 14%, transparent) 46%,
      transparent 74%
    ),
    color-mix(in srgb, var(--preload-image-surface) 92%, var(--preload-image-accent) 8%);
  background-size: 230% 100%;
  animation: preload-image-sweep 1.2s ease-in-out infinite;
}

.preload-image__spinner {
  width: 26px;
  height: 26px;
  border: 2px solid color-mix(in srgb, var(--preload-image-accent) 24%, transparent);
  border-top-color: var(--preload-image-accent-strong);
  border-radius: 999px;
  box-shadow: 0 0 20px color-mix(in srgb, var(--preload-image-accent) 18%, transparent);
  animation: preload-image-spin 0.8s linear infinite;
}

.preload-image__fallback {
  position: relative;
  width: 30px;
  height: 24px;
  border: 2px solid var(--preload-image-line);
  border-radius: 7px;
}

.preload-image__fallback::before,
.preload-image__fallback::after {
  content: "";
  position: absolute;
  display: block;
}

.preload-image__fallback::before {
  right: 5px;
  top: 5px;
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: var(--preload-image-line);
}

.preload-image__fallback::after {
  left: 5px;
  right: 5px;
  bottom: 5px;
  height: 8px;
  border-radius: 2px;
  background:
    linear-gradient(
      135deg,
      transparent 0 34%,
      var(--preload-image-line) 35% 60%,
      transparent 61%
    ),
    linear-gradient(
      45deg,
      transparent 0 44%,
      color-mix(in srgb, var(--preload-image-line) 72%, transparent) 45% 64%,
      transparent 65%
    );
}

@keyframes preload-image-sweep {
  0% {
    background-position: 140% 0;
  }

  100% {
    background-position: -90% 0;
  }
}

@keyframes preload-image-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .preload-image__img,
  .preload-image__placeholder,
  .preload-image__spinner {
    animation: none;
    transition: none;
  }
}
</style>
