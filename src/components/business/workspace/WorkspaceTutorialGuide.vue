<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { motion } from "motion-v";

import PreloadImage from "@/components/common/PreloadImage.vue";
import tutorialUploadCarImage from "@/assets/media/workspace/showroom/workspace-showroom-tutorial-step-upload.png";
import tutorialShowroomTemplate1 from "@/assets/media/workspace/showroom/workspace-showroom-tutorial-step-template-01.png";
import tutorialShowroomTemplate2 from "@/assets/media/workspace/showroom/workspace-showroom-tutorial-step-template-02.png";
import tutorialShowroomTemplate3 from "@/assets/media/workspace/showroom/workspace-showroom-tutorial-step-template-03.png";
import tutorialResultImage from "@/assets/media/workspace/showroom/workspace-showroom-tutorial-step-result.png";
import tutorialLogoImage from "@/assets/media/workspace/showroom/workspace-showroom-tutorial-logo-sample.png";

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
  gap: 8px;
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
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: rgba(17, 17, 17, 0.36);
  box-shadow: none;
  transition:
    transform 0.25s ease,
    background-color 0.25s ease;
}

.tutorial-step:hover {
  transform: translateY(0);
  background: rgba(255, 255, 255, 0.02);
}

.tutorial-section.theme-light .tutorial-step {
  border: 1px solid #e5e7eb;
  background: transparent;
  box-shadow: none;
}

.tutorial-section.theme-light .tutorial-step:hover {
  background: rgba(15, 23, 42, 0.03);
}

.tutorial-step-arrow {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(212, 160, 23, 0.28);
  border-radius: 999px;
  background: rgba(212, 160, 23, 0.08);
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
  padding: 8px;
  box-sizing: border-box;
  background: transparent;
}

.tutorial-step.is-step-3 .tutorial-placeholder {
  align-items: center;
  justify-content: center;
  background: transparent;
}

.tutorial-section.theme-light .tutorial-step.is-step-1 .tutorial-placeholder,
.tutorial-section.theme-light .tutorial-step.is-step-2 .tutorial-placeholder,
.tutorial-section.theme-light .tutorial-step.is-step-4 .tutorial-placeholder {
  background: #f8fafc;
}

.tutorial-section.theme-light .tutorial-step.is-step-3 .tutorial-placeholder {
  background: transparent;
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

.tutorial-step.is-step-1 .tutorial-image :deep(.preload-image),
.tutorial-step.is-step-4 .tutorial-image :deep(.preload-image) {
  overflow: hidden;
  border-radius: 10px;
}

.tutorial-step.is-step-1 .tutorial-image :deep(.preload-image__img),
.tutorial-step.is-step-4 .tutorial-image :deep(.preload-image__img) {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  object-position: top center;
  border-radius: 10px;
}

.tutorial-step.is-step-3 .tutorial-logo-image {
  display: flex;
  width: auto;
  // max-width: 88%;
  // height: auto;
  // max-height: calc(100% - 16px);
  align-items: center;
  justify-content: center;
  // padding: 10px 14px;
  border-radius: 8px;
  box-sizing: border-box;
  background: #ffffff;
}

.tutorial-section.theme-light .tutorial-step.is-step-3 .tutorial-logo-image {
  background: #f8fafc;
}

.tutorial-step.is-step-3 .tutorial-logo-image :deep(.preload-image) {
  display: flex;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  align-items: center;
  justify-content: center;
  background: transparent !important;
}

.tutorial-step.is-step-3 .tutorial-logo-image :deep(.preload-image__img) {
  width: auto;
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
  min-height: 40px;
  padding: 0 12px;
  border-top: 0;
  box-sizing: border-box;
}

.tutorial-step-foot strong {
  min-width: 0;
  flex: 1 1 auto;
  color: #ffffff;
  font-size: 13px;
  line-height: 1.35;
  font-weight: 800;
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
    gap: 8px;
  }
}
</style>
