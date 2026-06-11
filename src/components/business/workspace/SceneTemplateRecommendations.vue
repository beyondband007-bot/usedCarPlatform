<script setup lang="ts">
import PreloadImage from "@/components/common/PreloadImage.vue";

export interface SceneTemplateRecommendationItem {
  id: string;
  title: string;
  description: string;
  image: string;
}

withDefaults(
  defineProps<{
    title?: string;
    items: SceneTemplateRecommendationItem[];
    activeId?: string;
    theme?: "light" | "dark";
  }>(),
  {
    title: "初次使用？试试这些",
    activeId: "",
    theme: "dark",
  },
);

const emit = defineEmits<{
  select: [item: SceneTemplateRecommendationItem];
}>();
</script>

<template>
  <section
    class="scene-template-section"
    :class="theme === 'light' ? 'theme-light' : 'theme-dark'"
    aria-label="模板推荐"
  >
    <h2>{{ title }}</h2>
    <div class="scene-template-grid">
      <article
        v-for="item in items"
        :key="item.id"
        role="button"
        tabindex="0"
        class="scene-template-card"
        :class="{ 'is-active': item.id === activeId }"
        :aria-pressed="item.id === activeId"
        :aria-label="`选择${item.title}场景`"
        @click="emit('select', item)"
        @keydown.enter.prevent="emit('select', item)"
        @keydown.space.prevent="emit('select', item)"
      >
        <PreloadImage
          class="scene-template-image"
          :src="item.image"
          :alt="item.title"
          loading="lazy"
          :draggable="false"
          fit="cover"
          object-position="center"
        />
        <div class="scene-template-title">
          <strong>{{ item.title }}</strong>
          <span>{{ item.description }}</span>
        </div>
      </article>
    </div>
    <div v-if="$slots.footer" class="scene-template-footer">
      <slot name="footer" />
    </div>
  </section>
</template>

<style scoped lang="scss">
.scene-template-section {
  --template-card-ratio: 3 / 4;

  display: flex;
  flex: 0 0 auto;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 18px;
  background: #111111;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.scene-template-section.theme-light {
  border-color: #e5e7eb;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
}

.scene-template-section h2 {
  margin: 0;
  color: #ffffff;
  font-size: 16px;
  line-height: 1.3;
  font-weight: 900;
}

.scene-template-section.theme-light h2 {
  color: #1e293b;
  font-weight: 600;
}

.scene-template-grid {
  display: grid;
  flex: 0 0 auto;
  min-height: 0;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  align-items: start;
  margin-top: 12px;
}

.scene-template-footer {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.scene-template-section.theme-light .scene-template-footer {
  border-top-color: #e5e7eb;
}

.scene-template-card {
  position: relative;
  display: flex;
  min-width: 0;
  width: 100%;
  height: auto;
  align-self: start;
  aspect-ratio: var(--template-card-ratio);
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: #111111;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  outline: none;
  transition: all 0.25s ease;
}

.scene-template-section.theme-light .scene-template-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
}

.scene-template-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(
    in srgb,
    var(--workspace-accent, #d4a017) 42%,
    rgba(255, 255, 255, 0.08)
  );
}

.scene-template-section.theme-light .scene-template-card:hover:not(.is-active) {
  border-color: #60a5fa;
  transform: translateY(-2px);
}

.scene-template-card.is-active {
  border-color: #d4a017;
  box-shadow:
    0 0 0 1px rgba(212, 160, 23, 0.35),
    0 0 24px rgba(212, 160, 23, 0.2),
    0 12px 28px rgba(0, 0, 0, 0.3);
}

.scene-template-section.theme-light .scene-template-card.is-active {
  border: 2px solid #ffb800;
  box-shadow: 0 4px 12px rgba(255, 184, 0, 0.16);
}

.scene-template-card:focus-visible {
  border-color: #d4a017;
  box-shadow:
    0 0 0 1px rgba(212, 160, 23, 0.32),
    0 0 24px rgba(212, 160, 23, 0.18);
}

.scene-template-section.theme-light .scene-template-card:focus-visible {
  border: 2px solid #ffb800;
  box-shadow: 0 0 0 2px rgba(255, 184, 0, 0.18);
}

.scene-template-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.scene-template-image :deep(.preload-image),
.scene-template-image :deep(.preload-image__img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scene-template-title {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  align-content: end;
  justify-items: center;
  gap: 4px;
  z-index: 1;
  min-height: 86px;
  padding: 28px 18px 14px;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.88));
  text-align: center;
}

.scene-template-section.theme-light .scene-template-title {
  min-height: 80px;
  padding: 24px 14px 12px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(15, 23, 42, 0.75) 100%
  );
}

.scene-template-title strong {
  max-width: 80%;
  color: #ffffff;
  font-size: 16px;
  line-height: 1.3;
  font-weight: 900;
}

.scene-template-section.theme-light .scene-template-title strong {
  font-weight: 600;
}

.scene-template-title span {
  max-width: 80%;
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
  line-height: 1.35;
  font-weight: 700;
}

.scene-template-section.theme-light .scene-template-title span {
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
}

@media (max-width: 1500px) {
  .scene-template-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1180px) {
  .scene-template-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .scene-template-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .scene-template-card {
    height: auto;
    max-height: none;
  }
}
</style>
