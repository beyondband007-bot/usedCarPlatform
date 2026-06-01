<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { motion } from "motion-v";

import PreloadImage from "@/components/common/PreloadImage.vue";
import tutorialUploadCarImage from "@/assets/img/展厅灯光/展厅模板/上传车图.png";
import tutorialShowroomTemplate1 from "@/assets/img/展厅灯光/展厅模板/选择模板1.png";
import tutorialShowroomTemplate2 from "@/assets/img/展厅灯光/展厅模板/选择模板2.png";
import tutorialShowroomTemplate3 from "@/assets/img/展厅灯光/展厅模板/选择模板3.png";
import tutorialResultImage from "@/assets/img/展厅灯光/展厅模板/生成效果.png";

defineProps<{
  animationKey?: string;
  theme?: "light" | "dark";
}>();

const tutorialSteps = [
  {
    title: "上传车图",
    icon: "mdi:cloud-upload-outline",
    image: tutorialUploadCarImage,
  },
  {
    title: "选择展厅模板",
    icon: "mdi:view-gallery-outline",
    image: "",
  },
  {
    title: "选择 Logo",
    icon: "mdi:badge-account-horizontal-outline",
    image: "",
  },
  {
    title: "生成效果",
    icon: "mdi:car-select",
    image: tutorialResultImage,
  },
] as const;

const tutorialTemplatePreviewImages = [
  tutorialShowroomTemplate1,
  tutorialShowroomTemplate2,
  tutorialShowroomTemplate3,
  tutorialUploadCarImage,
] as const;
</script>

<template>
  <section
    class="tutorial-section"
    :class="theme === 'light' ? 'theme-light' : 'theme-dark'"
    aria-label="使用教程流程"
  >
    <div class="section-head">
      <h2>使用教程</h2>
    </div>
    <div class="tutorial-flow">
      <motion.article
        v-for="(step, index) in tutorialSteps"
        :key="`${animationKey ?? 'tutorial'}-${step.title}`"
        :initial="{ opacity: 0, y: 14 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.32, delay: index * 0.04 }"
        class="tutorial-step"
        :class="`is-step-${index + 1}`"
      >
        <div class="tutorial-placeholder">
          <template v-if="index === 1">
            <div class="tutorial-mosaic" aria-hidden="true">
              <PreloadImage
                v-for="(image, mosaicIndex) in tutorialTemplatePreviewImages"
                :key="image"
                class="tutorial-mosaic-image"
                :class="`is-mosaic-${mosaicIndex + 1}`"
                :src="image"
                :alt="step.title"
                loading="lazy"
                :draggable="false"
                fit="contain"
              />
            </div>
          </template>
          <template v-else-if="index === 2">
            <div class="tutorial-logo-preview" aria-hidden="true">
              <span class="tutorial-logo-frame">
                <span>AI CAR STUDIO</span>
              </span>
            </div>
          </template>
          <PreloadImage
            v-else
            class="tutorial-image"
            :src="step.image"
            :alt="step.title"
            loading="lazy"
            :draggable="false"
            fit="contain"
          />
        </div>
        <footer class="tutorial-step-foot">
          <strong>{{ step.title }}</strong>
          <span class="tutorial-step-arrow" aria-hidden="true">
            <Icon
              :icon="
                index < tutorialSteps.length - 1
                  ? 'mdi:arrow-right'
                  : 'mdi:check'
              "
            />
          </span>
        </footer>
      </motion.article>
    </div>
  </section>
</template>

<style scoped lang="scss">
.tutorial-section {
  overflow: hidden;
  min-height: 0;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 18px;
  background: #111111;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.tutorial-section.theme-light {
  border-color: rgba(203, 213, 225, 0.82);
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
}

.tutorial-section h2 {
  margin: 0;
  color: #fff;
  font-size: 16px;
  line-height: 1.3;
  font-weight: 900;
}

.tutorial-section.theme-light h2 {
  color: #111827;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tutorial-flow {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: stretch;
  gap: 16px;
  min-height: 0;
  margin-top: 16px;
}

.tutorial-step {
  --tutorial-placeholder-margin: 10px;
  --tutorial-step-image-ratio: 3 / 2;
  --tutorial-mosaic-cell-ratio: 3 / 2;

  position: relative;
  display: flex;
  width: 100%;
  min-width: 0;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  border: 0;
  border-radius: 16px;
  background: #111111;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
}

.tutorial-step:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.tutorial-section.theme-light .tutorial-step {
  background: #ffffff;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.08);
}

.tutorial-section.theme-light .tutorial-step:hover {
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
}

.tutorial-step-arrow {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid rgba(212, 160, 23, 0.28);
  border-radius: 999px;
  background: rgba(212, 160, 23, 0.12);
  color: #d4a017;
  pointer-events: none;
}

.tutorial-step-arrow > .iconify {
  font-size: 20px;
}

.tutorial-placeholder {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  margin: var(--tutorial-placeholder-margin) var(--tutorial-placeholder-margin)
    0;
  overflow: hidden;
  border-radius: 12px;
  background: #111111;
}

.tutorial-section.theme-light .tutorial-placeholder {
  background: #f8fafc;
}

.tutorial-step.is-step-1 .tutorial-placeholder,
.tutorial-step.is-step-4 .tutorial-placeholder {
  flex: 0 0 auto;
  width: 100%;
  aspect-ratio: var(--tutorial-step-image-ratio);
  align-items: center;
  justify-content: center;
  background: transparent;
}

.tutorial-step.is-step-2 .tutorial-placeholder {
  align-items: flex-start;
  justify-content: flex-start;
}

.tutorial-step.is-step-3 .tutorial-placeholder {
  align-items: center;
  justify-content: center;
}

.tutorial-step.is-step-3 .tutorial-logo-preview {
  flex: 1;
  width: 100%;
  height: 100%;
}

.tutorial-step.is-step-1 .tutorial-image,
.tutorial-step.is-step-4 .tutorial-image {
  width: 100%;
  height: 100%;
  background: transparent;
}

.tutorial-step.is-step-1 .tutorial-image :deep(.preload-image),
.tutorial-step.is-step-4 .tutorial-image :deep(.preload-image) {
  width: 100%;
  height: 100%;
  background: transparent;
}

.tutorial-step.is-step-1 .tutorial-image :deep(.preload-image__img),
.tutorial-step.is-step-4 .tutorial-image :deep(.preload-image__img) {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 0;
}

.tutorial-image :deep(.preload-image) {
  width: 100%;
  height: 100%;
  background: transparent;
}

.tutorial-image :deep(.preload-image__img) {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 12px;
}

.tutorial-mosaic {
  display: grid;
  width: 100%;
  height: auto;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, auto);
  gap: 6px;
  padding: 8px;
  background: #111111;
}

.tutorial-section.theme-light .tutorial-mosaic {
  background: #f8fafc;
}

.tutorial-mosaic-image {
  overflow: hidden;
  width: 100%;
  aspect-ratio: var(--tutorial-mosaic-cell-ratio);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  min-height: 0;
}

.tutorial-mosaic-image :deep(.preload-image) {
  width: 100%;
  height: auto;
  aspect-ratio: var(--tutorial-mosaic-cell-ratio);
  background: transparent;
}

.tutorial-mosaic-image :deep(.preload-image__img) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.tutorial-logo-preview {
  display: grid;
  width: 100%;
  height: 100%;
  min-height: 0;
  place-items: center;
  border-radius: 12px;
  background:
    radial-gradient(
      circle at 50% 30%,
      rgba(212, 160, 23, 0.18),
      transparent 44%
    ),
    linear-gradient(180deg, #f6f9fc, #ffffff);
}

.tutorial-logo-frame {
  position: relative;
  display: grid;
  place-items: center;
  width: min(92%, 180px);
  height: 44px;
  border: 1px solid rgba(212, 160, 23, 0.48);
  border-radius: 999px;
  background: #111111;
  box-shadow:
    inset 0 0 0 1px rgba(255, 232, 139, 0.38),
    0 10px 24px rgba(0, 0, 0, 0.24);
}

.tutorial-logo-frame::before,
.tutorial-logo-frame::after {
  content: "";
  position: absolute;
  top: 50%;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #d4a017;
  box-shadow: 0 0 0 2px rgba(212, 160, 23, 0.2);
  transform: translateY(-50%);
}

.tutorial-logo-frame::before {
  left: 10px;
}

.tutorial-logo-frame::after {
  right: 10px;
}

.tutorial-logo-frame span {
  color: #d4a017;
  font-size: 13px;
  font-weight: 950;
  letter-spacing: 0.06em;
}

.tutorial-step-foot {
  display: flex;
  min-width: 0;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: auto;
  padding: 8px 12px 10px;
  box-sizing: border-box;
}

.tutorial-step-foot strong {
  min-width: 0;
  flex: 1 1 auto;
  color: #ffffff;
  font-size: 14px;
  line-height: 1.35;
  font-weight: 900;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tutorial-section.theme-light .tutorial-step-foot strong {
  color: #111827;
}

@media (max-width: 1500px) {
  .tutorial-flow {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
}
</style>
