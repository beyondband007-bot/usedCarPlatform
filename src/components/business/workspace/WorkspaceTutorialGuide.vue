<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { motion } from "motion-v";

import PreloadImage from "@/components/common/PreloadImage.vue";
import tutorialUploadCarImage from "@/assets/img/展厅灯光/展厅模板/上传车图.png";
import tutorialShowroomTemplate1 from "@/assets/img/展厅灯光/展厅模板/选择模板1.png";
import tutorialShowroomTemplate2 from "@/assets/img/展厅灯光/展厅模板/选择模板2.png";
import tutorialShowroomTemplate3 from "@/assets/img/展厅灯光/展厅模板/选择模板3.png";
import tutorialResultImage from "@/assets/img/展厅灯光/展厅模板/生成效果.png";
import tutorialLogoImage from "@/assets/img/展厅灯光/展厅模板/ai-car-studio-logo.png";

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
    image: tutorialLogoImage,
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
            <PreloadImage
              class="tutorial-image tutorial-logo-image"
              :src="step.image"
              alt="AI CAR STUDIO Logo"
              loading="lazy"
              :draggable="false"
              fit="contain"
            />
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
  padding: 0;
  background: transparent;
  box-shadow: none;
}

.tutorial-flow {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  align-items: stretch;
  gap: 12px;
  min-height: 0;
  margin-top: 0;
}

.tutorial-step {
  --tutorial-car-display-ratio: 1672 / 941;
  --tutorial-step-image-ratio: var(--tutorial-car-display-ratio);

  position: relative;
  display: flex;
  width: 100%;
  min-width: 0;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  border: 0;
  border-radius: 12px;
  background: rgba(17, 17, 17, 0.72);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.22);
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
}

.tutorial-step:hover {
  transform: translateY(-2px);
}

.tutorial-section.theme-light .tutorial-step {
  border: 0;
  background: #ffffff;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
}

.tutorial-section.theme-light .tutorial-step:hover {
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
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
  flex: 0 0 auto;
  width: 100%;
  aspect-ratio: var(--tutorial-step-image-ratio);
  min-height: 0;
  margin: 0;
  overflow: hidden;
  border-radius: 12px 12px 0 0;
  background: rgba(255, 255, 255, 0.04);
}

.tutorial-section.theme-light .tutorial-placeholder {
  background: #f8fafc;
}

.tutorial-step.is-step-1 .tutorial-placeholder,
.tutorial-step.is-step-2 .tutorial-placeholder,
.tutorial-step.is-step-3 .tutorial-placeholder,
.tutorial-step.is-step-4 .tutorial-placeholder {
  align-items: flex-start;
  justify-content: center;
  padding: 10px;
  box-sizing: border-box;
  background: transparent;
}

.tutorial-step.is-step-3 .tutorial-placeholder {
  align-items: center;
  justify-content: center;
  background: #ffffff;
}

.tutorial-section.theme-light .tutorial-step.is-step-1 .tutorial-placeholder,
.tutorial-section.theme-light .tutorial-step.is-step-2 .tutorial-placeholder,
.tutorial-section.theme-light .tutorial-step.is-step-3 .tutorial-placeholder,
.tutorial-section.theme-light .tutorial-step.is-step-4 .tutorial-placeholder {
  background: #f8fafc;
}

.tutorial-step.is-step-1 .tutorial-image,
.tutorial-step.is-step-3 .tutorial-image,
.tutorial-step.is-step-4 .tutorial-image {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: flex-start;
  justify-content: center;
  background: transparent;
}

.tutorial-step.is-step-1 .tutorial-image :deep(.preload-image),
.tutorial-step.is-step-3 .tutorial-image :deep(.preload-image),
.tutorial-step.is-step-4 .tutorial-image :deep(.preload-image) {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: flex-start;
  justify-content: center;
  background: transparent !important;
}

.tutorial-step.is-step-1 .tutorial-image :deep(.preload-image__img),
.tutorial-step.is-step-4 .tutorial-image :deep(.preload-image__img) {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  object-position: top center;
}

.tutorial-step.is-step-3 .tutorial-logo-image {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  background: transparent;
}

.tutorial-step.is-step-3 .tutorial-logo-image :deep(.preload-image) {
  display: flex;
  width: min(88%, 220px);
  height: auto;
  align-items: center;
  justify-content: center;
  background: transparent !important;
}

.tutorial-step.is-step-3 .tutorial-logo-image :deep(.preload-image__img) {
  width: 100%;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  object-position: center;
}

.tutorial-mosaic {
  display: grid;
  width: 100%;
  height: 100%;
  min-height: 0;
  align-self: stretch;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 3px;
  padding: 0;
  box-sizing: border-box;
  background: transparent;
}

.tutorial-section.theme-light .tutorial-mosaic {
  background: transparent;
}

.tutorial-mosaic-image {
  overflow: hidden;
  width: 100%;
  height: 100%;
  min-height: 0;
  border-radius: 0;
  background: transparent;
}

.tutorial-mosaic-image :deep(.preload-image) {
  width: 100%;
  height: 100%;
  background: transparent !important;
}

.tutorial-mosaic-image :deep(.preload-image__img) {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: top center;
}

.tutorial-step-foot {
  display: flex;
  min-width: 0;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 52px;
  padding: 0 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  box-sizing: border-box;
}

.tutorial-section.theme-light .tutorial-step-foot {
  border-top-color: #e5e7eb;
}

.tutorial-step-foot strong {
  min-width: 0;
  flex: 1 1 auto;
  color: #ffffff;
  font-size: 14px;
  line-height: 1.35;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tutorial-section.theme-light .tutorial-step-foot strong {
  color: #1e293b;
  font-weight: 600;
}

@media (max-width: 1500px) {
  .tutorial-flow {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
}
</style>
