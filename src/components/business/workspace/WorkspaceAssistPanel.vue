<script setup lang="ts">
import { ref } from "vue";
import { Icon } from "@iconify/vue";
import { motion } from "motion-v";

import WorkspaceGenerateResultPanel from "@/components/business/workspace/WorkspaceGenerateResultPanel.vue";
import { workspaceTemplateRecommendations } from "@/constants/workspace";
import { useAppStore } from "@/stores/app";
import type {
  WorkspaceCapability,
  WorkspaceGenerateResult,
  WorkspaceRecentItem,
} from "@/types/workspace";

const props = defineProps<{
  capability: WorkspaceCapability;
  selectedOptionId: string;
  generationResult?: WorkspaceGenerateResult | null;
}>();

const emit = defineEmits<{
  backFromResult: [];
  pickTemplate: [payload: { capabilityCode: string; optionId: string }];
  pickRecent: [item: WorkspaceRecentItem];
}>();

function canOpenRecent(item: WorkspaceRecentItem) {
  return item.status === "success" && Boolean(item.previewImage);
}

function handleRecentPick(item: WorkspaceRecentItem) {
  if (!canOpenRecent(item)) return;
  emit("pickRecent", item);
}

const templateCards = workspaceTemplateRecommendations;

function isTemplateActive(item: (typeof templateCards)[number]) {
  return (
    props.capability.code === item.capabilityCode &&
    props.selectedOptionId === item.optionId
  );
}

function handleTemplatePick(item: (typeof templateCards)[number]) {
  emit("pickTemplate", {
    capabilityCode: item.capabilityCode,
    optionId: item.optionId,
  });
}

const appStore = useAppStore();
const activeTab = ref<"guide" | "recent">("guide");

const tutorialSteps = [
  {
    title: "上传车图",
    icon: "mdi:cloud-upload-outline",
  },
  {
    title: "选择展厅模板",
    icon: "mdi:view-gallery-outline",
  },
  {
    title: "选择 Logo",
    icon: "mdi:badge-account-horizontal-outline",
  },
  {
    title: "生成效果",
    icon: "mdi:car-select",
  },
] as const;

const deliveryResults = [
  {
    title: "主图 · 玻璃展厅",
    ratio: "1 / 1",
    image:
      "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=900&q=82",
  },
  {
    title: "竖版详情 · 车头",
    ratio: "3 / 4",
    image:
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=82",
  },
  {
    title: "横版详情 · 侧身",
    ratio: "4 / 3",
    image:
      "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=900&q=82",
  },
  {
    title: "内饰 · 中控",
    ratio: "1 / 1",
    image:
      "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=900&q=82",
  },
  {
    title: "竖版封面 · 灯光",
    ratio: "3 / 4",
    image:
      "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=900&q=82",
  },
  {
    title: "竖屏封面 · 全屏",
    ratio: "9 / 16",
    image:
      "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=900&q=82",
  },
  {
    title: "宽幅 · 展厅氛围",
    ratio: "16 / 9",
    image:
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=82",
  },
  {
    title: "细节 · 轮毂",
    ratio: "1 / 1",
    image:
      "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=900&q=82",
  },
  {
    title: "内饰 · 座椅",
    ratio: "4 / 3",
    image:
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=900&q=82",
  },
] as const;

const statusLabelMap: Record<WorkspaceRecentItem["status"], string> = {
  waiting: "等待中",
  queue: "排队中",
  generating: "生成中",
  success: "已完成",
  fail: "失败",
};

function formatDeliveryRatio(ratio: string) {
  return ratio.replace(/\s*\/\s*/g, ":");
}

function getDeliveryMediaStyle(ratio: string) {
  return {
    "--delivery-ratio": ratio,
  } as Record<string, string>;
}
</script>

<template>
  <aside
    class="assist-panel h-full min-h-0"
    :class="appStore.isDarkMode ? 'theme-dark' : 'theme-light'"
  >
    <WorkspaceGenerateResultPanel
      v-if="generationResult"
      :result="generationResult"
      @back="emit('backFromResult')"
    />

    <template v-else-if="capability.kind === 'delivery'">
      <div class="delivery-panel">
        <header class="delivery-result-head">
          <div>
            <p>成片结果</p>
            <h2>5月展厅批量上新</h2>
            <span>已完成 12 张 · 根据生成比例自动排布</span>
          </div>
          <button type="button" class="delivery-download-all">下载全部</button>
        </header>

        <section class="delivery-result-layout" aria-label="成片交付结果">
          <article
            v-for="item in deliveryResults"
            :key="item.title"
            class="delivery-result-card"
          >
            <div
              class="delivery-result-media"
              :style="getDeliveryMediaStyle(item.ratio)"
            >
              <img
                :src="item.image"
                :alt="item.title"
                loading="lazy"
                decoding="async"
                draggable="false"
              />
            </div>
            <footer class="delivery-result-foot">
              <strong>{{ item.title }}</strong>
              <span>{{ formatDeliveryRatio(item.ratio) }}</span>
            </footer>
          </article>
        </section>
      </div>
    </template>

    <template v-else>
      <header class="assist-tabs">
        <div class="tab-group" role="tablist" aria-label="辅助面板">
          <button
            type="button"
            role="tab"
            :aria-selected="activeTab === 'guide'"
            :class="{ active: activeTab === 'guide' }"
            @click="activeTab = 'guide'"
          >
            使用教程
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="activeTab === 'recent'"
            :class="{ active: activeTab === 'recent' }"
            @click="activeTab = 'recent'"
          >
            最近生成
          </button>
        </div>
      </header>

      <section v-if="activeTab === 'guide'" class="guide-layout">
        <section class="tutorial-section" aria-label="使用教程流程">
          <h2>使用教程</h2>
          <div class="tutorial-flow">
            <template
              v-for="(step, index) in tutorialSteps"
              :key="`${capability.code}-${step.title}`"
            >
              <motion.article
                :initial="{ opacity: 0, y: 14 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.32, delay: index * 0.04 }"
                class="tutorial-step"
              >
                <div class="tutorial-placeholder">
                  <Icon :icon="step.icon" />
                  <span>{{ String(index + 1).padStart(2, "0") }}</span>
                </div>
                <p>{{ step.title }}</p>
              </motion.article>
              <Icon
                v-if="index < tutorialSteps.length - 1"
                icon="mdi:arrow-right"
                class="flow-arrow"
              />
            </template>
          </div>
        </section>

        <section class="template-section" aria-label="模板推荐">
          <h2>初次使用？试试这些</h2>
          <div class="template-grid">
            <article
              v-for="item in templateCards"
              :key="item.title"
              role="button"
              tabindex="0"
              class="template-card"
              :class="{ 'is-active': isTemplateActive(item) }"
              :aria-pressed="isTemplateActive(item)"
              :aria-label="`选择${item.title}场景`"
              @click="handleTemplatePick(item)"
              @keydown.enter.prevent="handleTemplatePick(item)"
              @keydown.space.prevent="handleTemplatePick(item)"
            >
              <img
                :src="item.image"
                :alt="item.title"
                loading="lazy"
                draggable="false"
              />
              <div class="template-title">
                <span>{{ item.title }}</span>
              </div>
            </article>
          </div>
        </section>

        <section class="requirement-section" aria-label="素材要求">
          <strong>素材要求</strong>
          <div class="requirement-list">
            <span v-for="item in capability.requirements" :key="item">
              <Icon icon="mdi:check" />
              {{ item }}
            </span>
          </div>
        </section>
      </section>

      <section v-else class="recent-layout" aria-label="最近生成">
        <article
          v-for="item in capability.recent"
          :key="item.id"
          class="recent-card"
          :class="{ 'is-clickable': canOpenRecent(item) }"
          :role="canOpenRecent(item) ? 'button' : undefined"
          :tabindex="canOpenRecent(item) ? 0 : undefined"
          :aria-label="canOpenRecent(item) ? `查看${item.title}` : item.title"
          @click="handleRecentPick(item)"
          @keydown.enter.prevent="handleRecentPick(item)"
          @keydown.space.prevent="handleRecentPick(item)"
        >
          <img
            v-if="item.thumbnail"
            :src="item.thumbnail"
            :alt="item.title"
            loading="lazy"
            draggable="false"
          />
          <div v-else class="recent-empty">
            <Icon icon="mdi:image-outline" />
          </div>
          <div class="recent-copy">
            <h3>{{ item.title }}</h3>
            <p>{{ item.createdAt }}</p>
          </div>
          <span class="recent-status" :class="`is-${item.status}`">
            {{ statusLabelMap[item.status] }}
          </span>
        </article>
      </section>
    </template>
  </aside>
</template>

<style scoped lang="scss">
.assist-panel {
  --assist-bg: rgba(10, 18, 32, 0.82);
  --assist-card: rgba(255, 255, 255, 0.05);
  --assist-card-strong: rgba(255, 255, 255, 0.075);
  --assist-border: rgba(90, 122, 164, 0.32);
  --assist-border-soft: rgba(97, 122, 155, 0.2);
  --assist-text: #edf5ff;
  --assist-muted: #9badc5;
  --assist-blue: #2f82ff;
  --assist-green: #27b77d;
  --assist-scroll-track: rgba(255, 255, 255, 0.08);
  --assist-scroll-thumb: rgba(126, 164, 216, 0.58);
  --assist-scroll-thumb-hover: rgba(151, 186, 233, 0.82);
  --assist-shadow:
    0 18px 52px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.04);

  display: flex;
  container-type: inline-size;
  width: 100%;
  height: 100%;
  max-height: 100%;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  padding: 18px 20px 20px;
  background:
    radial-gradient(
      720px 180px at 48% 0%,
      rgba(47, 130, 255, 0.13),
      transparent 72%
    ),
    var(--assist-bg);
  color: var(--assist-text);
}

.assist-panel.theme-light {
  --assist-bg: rgba(255, 255, 255, 0.74);
  --assist-card: rgba(255, 255, 255, 0.82);
  --assist-card-strong: rgba(248, 251, 255, 0.92);
  --assist-border: rgba(181, 199, 220, 0.42);
  --assist-border-soft: rgba(196, 211, 228, 0.56);
  --assist-text: #10233c;
  --assist-muted: #5f7188;
  --assist-scroll-track: rgba(214, 226, 240, 0.82);
  --assist-scroll-thumb: rgba(85, 133, 194, 0.48);
  --assist-scroll-thumb-hover: rgba(47, 130, 255, 0.68);
  --assist-shadow:
    0 14px 34px rgba(78, 111, 148, 0.09), inset 0 1px 0 rgba(255, 255, 255, 0.7);

  background:
    radial-gradient(
      760px 180px at 45% 0%,
      rgba(176, 215, 255, 0.24),
      transparent 74%
    ),
    #f8fbff;
}

.assist-tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 18px;
  min-height: 36px;
  margin-bottom: 16px;
}

.delivery-result-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-shrink: 0;
  gap: 18px;
  margin-bottom: 18px;
}

.delivery-result-head p,
.delivery-result-head h2,
.delivery-result-head span {
  margin: 0;
}

.delivery-result-head p {
  color: var(--assist-blue);
  font-size: 13px;
  font-weight: 900;
}

.delivery-result-head h2 {
  margin-top: 6px;
  color: var(--assist-text);
  font-size: clamp(20px, 1.6vw, 28px);
  line-height: 1.2;
  font-weight: 950;
}

.delivery-result-head span {
  display: block;
  margin-top: 8px;
  color: var(--assist-muted);
  font-size: 13px;
  font-weight: 700;
}

.delivery-panel {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 0;
}

.delivery-download-all {
  flex-shrink: 0;
  height: 40px;
  border: 1px solid rgba(47, 130, 255, 0.34);
  border-radius: 10px;
  background: rgba(47, 130, 255, 0.13);
  color: var(--assist-blue);
  padding: 0 16px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}

.delivery-download-all:hover {
  border-color: rgba(47, 130, 255, 0.5);
  background: rgba(47, 130, 255, 0.2);
}

.delivery-result-layout {
  flex: 1;
  min-height: 0;
  columns: 2;
  column-gap: clamp(14px, 1.6vw, 20px);
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 2px 6px 24px 0;
  scrollbar-width: thin;
  scrollbar-color: var(--assist-scroll-thumb) var(--assist-scroll-track);
}

@container (min-width: 860px) {
  .delivery-result-layout {
    columns: 3;
  }
}

.delivery-result-layout::-webkit-scrollbar {
  width: 10px;
}

.delivery-result-layout::-webkit-scrollbar-track {
  border-radius: 999px;
  background: var(--assist-scroll-track);
  box-shadow: inset 0 0 0 1px rgba(127, 151, 179, 0.12);
}

.delivery-result-layout::-webkit-scrollbar-thumb {
  border: 2px solid var(--assist-scroll-track);
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    var(--assist-blue),
    var(--assist-scroll-thumb)
  );
}

.delivery-result-layout::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(
    90deg,
    var(--assist-blue),
    var(--assist-scroll-thumb-hover)
  );
}

.delivery-result-card {
  display: inline-block;
  width: 100%;
  margin: 0 0 clamp(14px, 1.6vw, 20px);
  break-inside: avoid;
  border: 1px solid var(--assist-border);
  border-radius: 12px;
  background: var(--assist-card);
  box-shadow: var(--assist-shadow);
  overflow: hidden;
}

.delivery-result-media {
  --delivery-ratio: 1 / 1;

  position: relative;
  width: 100%;
  aspect-ratio: var(--delivery-ratio);
  max-height: min(52vh, 520px);
  overflow: hidden;
  background:
    linear-gradient(145deg, rgba(47, 130, 255, 0.08), transparent 42%),
    var(--assist-card-strong);
}

.delivery-result-media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  background: var(--assist-card-strong);
}

.delivery-result-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px 13px;
  border-top: 1px solid var(--assist-border-soft);
  background: color-mix(in srgb, var(--assist-card) 92%, white);
}

.theme-light .delivery-result-foot {
  background: #fff;
}

.delivery-result-foot strong,
.delivery-result-foot span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delivery-result-foot strong {
  min-width: 0;
  color: var(--assist-text);
  font-size: 14px;
  font-weight: 900;
}

.delivery-result-foot span {
  flex-shrink: 0;
  color: var(--assist-muted);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.tab-group {
  display: flex;
  gap: 34px;
}

.tab-group button,
.expand-button {
  border: 0;
  background: transparent;
  font-family: inherit;
  cursor: pointer;
}

.tab-group button {
  position: relative;
  padding: 0 0 10px;
  color: var(--assist-muted);
  font-size: 15px;
  font-weight: 900;
}

.tab-group button.active {
  color: var(--assist-blue);
}

.tab-group button.active::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  border-radius: 999px;
  background: var(--assist-blue);
}

.expand-button {
  color: var(--assist-blue);
  font-size: 14px;
  font-weight: 900;
}

.guide-layout {
  display: grid;
  flex: 1;
  min-height: 0;
  grid-template-rows: auto auto auto;
  gap: 18px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 6px 28px 0;
  scrollbar-width: thin;
  scrollbar-color: var(--assist-scroll-thumb) var(--assist-scroll-track);
}

.guide-layout::-webkit-scrollbar {
  width: 8px;
}

.guide-layout::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: linear-gradient(
    180deg,
    var(--assist-blue),
    var(--assist-scroll-thumb)
  );
}

.tutorial-section,
.template-section,
.requirement-section,
.recent-card {
  border: 1px solid var(--assist-border);
  background: var(--assist-card);
  box-shadow: var(--assist-shadow);
}

.tutorial-section,
.template-section {
  overflow: hidden;
  border-radius: 10px;
  padding: 18px;
}

.tutorial-section h2,
.template-section h2 {
  margin: 0;
  color: var(--assist-text);
  font-size: 17px;
  line-height: 1.3;
  font-weight: 900;
}

.tutorial-flow {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr) 42px minmax(0, 1fr) 42px minmax(0, 1fr)
    42px minmax(0, 1fr);
  align-items: center;
  gap: clamp(10px, 1.2vw, 22px);
  min-height: clamp(128px, 15vh, 188px);
  margin-top: 14px;
}

.tutorial-step {
  display: grid;
  align-content: center;
  justify-items: center;
  min-width: 0;
  height: 100%;
}

.tutorial-placeholder {
  position: relative;
  display: grid;
  place-items: center;
  width: min(100%, 172px);
  height: min(100%, 138px);
  min-height: 118px;
  border: 1px dashed rgba(73, 130, 218, 0.34);
  border-radius: 14px;
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.08),
      rgba(255, 255, 255, 0.02)
    ),
    var(--assist-card-strong);
}

.theme-light .tutorial-placeholder {
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.85),
      rgba(239, 246, 255, 0.8)
    ),
    var(--assist-card-strong);
}

.tutorial-placeholder > .iconify {
  color: var(--assist-blue);
  font-size: clamp(42px, 4.5vw, 68px);
}

.tutorial-placeholder span {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: grid;
  place-items: center;
  width: 30px;
  height: 24px;
  border-radius: 999px;
  background: rgba(47, 130, 255, 0.14);
  color: var(--assist-blue);
  font-size: 13px;
  font-weight: 900;
}

.tutorial-step p {
  margin: 12px 0 0;
  color: var(--assist-text);
  text-align: center;
  font-size: 15px;
  font-weight: 900;
}

.flow-arrow {
  justify-self: center;
  color: rgba(142, 162, 190, 0.68);
  font-size: 28px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(14px, 1.4vw, 24px);
  margin-top: 14px;
}

.template-card {
  position: relative;
  aspect-ratio: 1 / 1;
  min-width: 0;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 12px;
  background: var(--assist-card-strong);
  cursor: pointer;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.template-card:hover {
  transform: translateY(-2px);
}

.template-card.is-active {
  border-color: var(--assist-blue);
  box-shadow:
    0 0 0 2px rgba(47, 130, 255, 0.16),
    0 12px 28px rgba(47, 130, 255, 0.2);
}

.template-card:focus-visible {
  border-color: var(--assist-blue);
  box-shadow: 0 0 0 3px rgba(47, 130, 255, 0.24);
}

.template-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.template-title {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  display: flex;
  align-items: end;
  min-height: 68px;
  padding: 16px;
  background: linear-gradient(180deg, transparent, rgba(5, 14, 28, 0.74));
}

.template-title span {
  color: #fff;
  font-size: 15px;
  font-weight: 900;
}

.requirement-section {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
  border-radius: 10px;
  padding: 10px 16px;
}

.requirement-section strong {
  color: var(--assist-text);
  font-size: 14px;
  font-weight: 900;
  white-space: nowrap;
}

.requirement-list {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 8px;
}

.requirement-list span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(39, 183, 125, 0.15);
  color: var(--assist-green);
  font-size: 12px;
  font-weight: 900;
}

.recent-layout {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  grid-auto-rows: auto;
  gap: 16px;
  align-content: start;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 2px 6px 28px 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(96, 133, 178, 0.5) transparent;
}

.recent-card {
  position: relative;
  display: flex;
  aspect-ratio: 1 / 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  border-radius: 10px;
  overflow: hidden;
  padding: 12px;
}

.recent-card.is-clickable {
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.recent-card.is-clickable:hover {
  transform: translateY(-2px);
  border-color: color-mix(
    in srgb,
    var(--assist-blue) 45%,
    var(--assist-border)
  );
  box-shadow:
    0 0 0 2px rgba(47, 130, 255, 0.12),
    var(--assist-shadow);
}

.recent-card.is-clickable:focus-visible {
  outline: none;
  border-color: var(--assist-blue);
  box-shadow: 0 0 0 3px rgba(47, 130, 255, 0.2);
}

.recent-card img,
.recent-empty {
  width: 100%;
  height: 58%;
  border-radius: 8px;
}

.recent-card img {
  object-fit: cover;
}

.recent-empty {
  display: grid;
  place-items: center;
  background: var(--assist-card-strong);
  color: var(--assist-muted);
  font-size: 26px;
}

.recent-copy {
  min-width: 0;
  padding-top: 10px;
}

.recent-copy h3 {
  margin: 0;
  overflow: hidden;
  color: var(--assist-text);
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  line-height: 1.25;
  font-weight: 900;
}

.recent-copy p {
  margin: 6px 0 0;
  overflow: hidden;
  color: var(--assist-muted);
  text-overflow: ellipsis;
  font-size: 13px;
  line-height: 1.25;
  font-weight: 700;
  white-space: nowrap;
}

.recent-status {
  position: absolute;
  right: 12px;
  top: 12px;
  max-width: calc(100% - 24px);
  overflow: hidden;
  padding: 4px 9px;
  border-radius: 999px;
  background: rgba(47, 130, 255, 0.14);
  color: var(--assist-blue);
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 900;
}

.recent-status.is-success {
  background: rgba(39, 183, 125, 0.15);
  color: var(--assist-green);
}

.recent-status.is-fail {
  background: rgba(238, 85, 85, 0.15);
  color: #ef6363;
}

@media (max-width: 1500px) {
  .assist-panel {
    padding: 18px 18px;
  }

  .guide-layout {
    gap: 14px;
  }

  .tutorial-flow {
    gap: 10px;
    grid-template-columns:
      minmax(0, 1fr) 28px minmax(0, 1fr) 28px minmax(0, 1fr)
      28px minmax(0, 1fr);
  }

  .flow-arrow {
    font-size: 22px;
  }

  .recent-layout {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 14px;
  }

  .delivery-result-layout {
    column-count: 2;
  }
}

@media (max-width: 1180px) {
  .delivery-result-head {
    flex-direction: column;
  }

  .delivery-result-head button {
    width: 100%;
  }

  .delivery-result-layout {
    column-count: 1;
  }
}

@container (min-width: 760px) {
  .delivery-result-layout {
    column-count: 2;
  }
}

@container (min-width: 1040px) {
  .delivery-result-layout {
    column-count: 3;
  }
}

@container (min-width: 380px) {
  .recent-layout {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@container (min-width: 620px) {
  .recent-layout {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@container (min-width: 900px) {
  .recent-layout {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
