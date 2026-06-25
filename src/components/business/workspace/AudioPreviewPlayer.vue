<script setup lang="ts">
import { ref, watch } from "vue";
import { NSlider } from "naive-ui";

const SPEED_SLIDER_MIN = 25;
const SPEED_SLIDER_MAX = 200;
const SPEED_SLIDER_STEP = 25;
const SPEED_SLIDER_DEFAULT = 100;
const SPEED_RATE_DIVISOR = 100;

const props = defineProps<{
  src: string;
}>();

const audioRef = ref<HTMLAudioElement | null>(null);
const sliderValue = ref(SPEED_SLIDER_DEFAULT);

function snapSliderValue(value: number) {
  const snapped = Math.round(value / SPEED_SLIDER_STEP) * SPEED_SLIDER_STEP;
  return Math.min(SPEED_SLIDER_MAX, Math.max(SPEED_SLIDER_MIN, snapped));
}

function resolvePlaybackRate(value: number) {
  return snapSliderValue(value) / SPEED_RATE_DIVISOR;
}

function formatRateLabel(rate: number) {
  if (Number.isInteger(rate)) return String(rate);
  return rate.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function formatSpeedTooltip(value: number) {
  return `${formatRateLabel(resolvePlaybackRate(value))}倍`;
}

function applySliderValue(value: number) {
  const snapped = snapSliderValue(value);
  sliderValue.value = snapped;
  if (audioRef.value) {
    audioRef.value.playbackRate = snapped / SPEED_RATE_DIVISOR;
  }
}

watch(
  () => props.src,
  () => {
    applySliderValue(SPEED_SLIDER_DEFAULT);
  },
);
</script>

<template>
  <div class="audio-preview-player">
    <audio
      ref="audioRef"
      class="audio-preview-player__native"
      :src="src"
      controls
      controlslist="noplaybackrate nodownload"
      preload="none"
      @loadedmetadata="applySliderValue(sliderValue)"
    />
    <div class="audio-preview-player__speed">
      <span class="audio-preview-player__speed-label">播放速度</span>
      <NSlider
        v-model:value="sliderValue"
        :min="SPEED_SLIDER_MIN"
        :max="SPEED_SLIDER_MAX"
        :step="SPEED_SLIDER_STEP"
        :format-tooltip="formatSpeedTooltip"
        @update:value="applySliderValue"
      />
    </div>
  </div>
</template>

<style scoped>
.audio-preview-player {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.audio-preview-player__native {
  width: 100%;
  min-width: 0;
  height: 36px;
}

.audio-preview-player__speed {
  display: grid;
  gap: 4px;
  padding: 0 2px;
}

.audio-preview-player__speed-label {
  color: var(--sv-text-soft, #94a3b8);
  font-size: 12px;
}

.audio-preview-player__speed :deep(.n-slider) {
  margin-top: 2px;
}
</style>
