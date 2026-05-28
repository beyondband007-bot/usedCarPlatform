<script setup lang="ts">
import { ref } from "vue";
import { Icon } from "@iconify/vue";
import { NButton, NSelect, NSwitch, NTag } from "naive-ui";

import type {
  WorkspaceCapability,
  WorkspaceCapabilityBlock,
} from "@/types/workspace";

import CapabilityOptionSelector from "@/components/business/workspace/CapabilityOptionSelector.vue";
import UploadTaskCard from "@/components/business/workspace/UploadTaskCard.vue";

const props = defineProps<{
  capability: WorkspaceCapability;
  selectedOptionId: string;
}>();

const emit = defineEmits<{
  selectOption: [id: string];
}>();

const useLogo = ref(false);
const outputRatio = ref("1:1");
const batchTab = ref<"create" | "visual">("create");
const uploadInterior = ref(false);
const enableSceneChange = ref(false);
const batchPreset = ref("team");
const visualPreset = ref("default");

const outputRatioOptions = [
  { label: "1:1 主图", value: "1:1" },
  { label: "3:4 竖屏", value: "3:4" },
  { label: "4:3 横版", value: "4:3" },
  { label: "9:16 竖屏", value: "9:16" },
  { label: "16:9 横版", value: "16:9" },
];

const presetOptions = [
  { label: "企业团队档", value: "team" },
  { label: "旗舰批量档", value: "elite" },
];

const visualPresetOptions = [
  { label: "输入名称", value: "default" },
  { label: "5月展厅批量上新", value: "may" },
];

const batchScenes = [
  {
    title: "经典白棚",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=520&q=80",
  },
  {
    title: "玻璃展厅",
    image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=520&q=80",
  },
  {
    title: "暗调豪华",
    image: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=520&q=80",
  },
  {
    title: "柔光顶灯",
    image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=520&q=80",
  },
];

const deliveryTasks = [
  {
    title: "5月展厅批量上新 · 成片交付",
    meta: "12 张成片 · 2026-05-20 09:32",
    image: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=180&q=80",
    selected: true,
    progress: 100,
  },
  {
    title: "宝马 5系 · 暗调展厅",
    meta: "10 张成片 · 2026-05-20 09:18",
    image: "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=180&q=80",
    selected: false,
    progress: 100,
  },
  {
    title: "丰田 凯美瑞 · 玻璃展厅",
    meta: "8 张成片 · 2026-05-19 18:44",
    image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=180&q=80",
    selected: false,
    progress: 100,
  },
  {
    title: "理想 L8 · 柔光顶灯",
    meta: "预计 6 分钟 · 暂不可下载",
    image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=180&q=80",
    selected: false,
    progress: 62,
  },
];

const hasBlock = (block: WorkspaceCapabilityBlock) =>
  props.capability.middleBlocks?.includes(block) ?? false;
</script>

<template>
  <div class="generate-panel">
    <template v-if="props.capability.kind === 'batch'">
      <div class="batch-tabs">
        <button
          type="button"
          :class="{ active: batchTab === 'create' }"
          @click="batchTab = 'create'"
        >
          新建任务
        </button>
        <button
          type="button"
          :class="{ active: batchTab === 'visual' }"
          @click="batchTab = 'visual'"
        >
          视觉处理配置
        </button>
      </div>

      <section class="batch-card batch-notice">
        当前套餐：企业团队档 · 每账号图组并发 5 套 · 进行中 2 套 · 可继续上传 3 套。单张生成仍可正常使用。
      </section>

      <template v-if="batchTab === 'create'">
        <section class="batch-card inline-field">
          <span>使用预设</span>
          <NSelect v-model:value="batchPreset" :options="presetOptions" size="large" />
        </section>

        <section class="batch-card">
          <h3>项目名</h3>
          <input class="plain-input" value="5月展厅批量上新" />
        </section>

        <button type="button" class="batch-upload">
          <Icon icon="mdi:camera" />
          <strong>上传外观图组</strong>
          <span>支持多角度外观图 · 每套车图作为 1 个图组</span>
          <b>必选</b>
        </button>

        <section class="batch-card switch-card">
          <div>
            <h3>同时上传内饰图</h3>
            <p>开启后，每套外观图组可补充内饰图，用于成片交付包。</p>
          </div>
          <NSwitch v-model:value="uploadInterior" size="large" />
        </section>

        <button v-if="uploadInterior" type="button" class="batch-upload interior-upload">
          <Icon icon="mdi:seat-passenger" />
          <strong>上传内饰图组</strong>
          <span>用于成片交付中的内饰展示图，可选上传</span>
          <b>选填</b>
        </button>
      </template>

      <template v-else>
        <section class="batch-card inline-field preset-save">
          <span>预设</span>
          <NSelect v-model:value="visualPreset" :options="visualPresetOptions" size="large" />
          <NButton type="primary" size="large">保存</NButton>
        </section>

        <section class="batch-card switch-card">
          <div>
            <h3>开启场景更换</h3>
            <p>为所有图组统一套用选定场景，保持上新视觉一致。</p>
          </div>
          <NSwitch v-model:value="enableSceneChange" size="large" />
        </section>

        <section v-if="enableSceneChange" class="batch-scene-card">
          <div class="scene-head">
            <h3>批量场景选择</h3>
            <button type="button">展厅灯光 <Icon icon="mdi:chevron-down" /></button>
          </div>
          <div class="scene-grid">
            <article
              v-for="(scene, index) in batchScenes"
              :key="scene.title"
              :class="{ active: index === 0 }"
            >
              <img :src="scene.image" :alt="scene.title" />
              <strong>{{ scene.title }}</strong>
            </article>
          </div>
        </section>

        <section class="batch-card inline-field">
          <span>输出比例</span>
          <NSelect v-model:value="outputRatio" :options="outputRatioOptions" size="large" />
        </section>

        <section class="batch-card switch-card">
          <div>
            <h3>使用最近 Logo</h3>
            <p>开启后可沿用最近上传 Logo，也可重新上传。</p>
          </div>
          <NSwitch size="large" />
        </section>

        <section class="batch-card switch-card">
          <div>
            <h3>光污一致化</h3>
            <p>批量弱化眩光、反光和色偏，让车辆与新场景更融合。</p>
          </div>
          <NSwitch :default-value="true" size="large" />
        </section>

        <section class="batch-card switch-card">
          <div>
            <h3>烤漆翻新预览</h3>
            <p>增强漆面亮度和轮毂金属质感，作为演示型美容开关。</p>
          </div>
          <NSwitch size="large" />
        </section>

        <section class="batch-card switch-card">
          <div>
            <h3>内饰清洁增强</h3>
            <p>对已上传内饰图做清洁与质感增强。</p>
          </div>
          <NSwitch size="large" />
        </section>
      </template>

      <div class="sticky-action">
        <NButton type="primary" size="large" block>
          {{ batchTab === "create" ? "创建批量上新任务" : "保存视觉处理配置" }}
          <span class="ml-2">💎 预计 120</span>
        </NButton>
      </div>
    </template>

    <template v-else-if="props.capability.kind === 'delivery'">
      <div class="delivery-tabs">
        <button type="button" class="active">成片交付</button>
      </div>

      <section class="batch-card batch-notice">
        这里展示批量上新里已完成的任务。点击任务后，右侧结果框查看该任务出图；勾选多个任务后可批量下载。
      </section>

      <section class="delivery-list">
        <article
          v-for="task in deliveryTasks"
          :key="task.title"
          :class="{ active: task.selected }"
        >
          <input type="checkbox" :checked="task.selected" />
          <img :src="task.image" :alt="task.title" />
          <div class="delivery-copy">
            <h3>{{ task.title }}</h3>
            <p>{{ task.meta }}</p>
          </div>
          <div class="delivery-status" :class="{ loading: task.progress < 100 }">
            <span></span>
            <strong>{{ task.progress === 100 ? "已完成" : `${task.progress}%` }}</strong>
          </div>
        </article>
      </section>

      <section class="delivery-actions">
        <p>已选 <strong>1</strong> 个任务，预计下载 12 张图。</p>
        <button type="button">全选</button>
        <NButton type="warning" size="large">批量下载</NButton>
        <button type="button">批量删除</button>
      </section>
    </template>

    <template v-else>
      <UploadTaskCard :capability="props.capability" />

      <CapabilityOptionSelector
        v-if="hasBlock('selector')"
        :capability="props.capability"
        :selected-option-id="props.selectedOptionId"
        @select="emit('selectOption', $event)"
      />

      <template
        v-if="props.capability.kind === 'scene' && hasBlock('scene-settings')"
      >
        <div
          class="border border-[var(--app-border)] bg-[var(--app-surface)] px-6 py-5 logo-setting-card"
        >
          <div class="flex items-start justify-between gap-5">
            <div class="min-w-0">
              <h3
                class="text-base font-black tracking-normal text-[var(--app-text)]"
              >
                使用 Logo
              </h3>
              <p
                class="mt-3 text-sm font-semibold leading-6 text-[var(--app-text-soft)]"
              >
                开启后可沿用最近上传 Logo，也可重新上传。
              </p>
            </div>
            <NSwitch v-model:value="useLogo" size="large" />
          </div>
        </div>

        <section v-if="useLogo" class="logo-expand-panel" aria-label="Logo 上传设置">
          <button type="button" class="recent-logo-card">
            <span class="logo-preview">宇昊名车</span>
            <span class="logo-copy">
              <strong>使用最近 Logo</strong>
              <small>2026-05-18 上传</small>
            </span>
          </button>

          <button type="button" class="reupload-button">重新上传</button>

          <button type="button" class="logo-upload-drop">
            <Icon icon="mdi:tag-heart-outline" />
            <strong>上传 Logo</strong>
            <span>PNG / SVG · ≤2MB</span>
          </button>
        </section>

        <div
          class="border border-[var(--app-border)] bg-[var(--app-surface)] px-6 py-4 logo-setting-card"
        >
          <div class="flex items-center gap-4">
            <span
              class="shrink-0 text-sm font-semibold text-[var(--app-text-soft)]"
            >
              输出比例
            </span>
            <NSelect
              v-model:value="outputRatio"
              :options="outputRatioOptions"
              size="large"
              class="min-w-0 flex-1"
            />
          </div>
        </div>
      </template>

      <div
        v-if="hasBlock('actions')"
        class="flex flex-wrap items-center justify-center gap-4 pt-3"
      >
        <NTag type="warning" round :bordered="false">
          预计消耗 {{ props.capability.cost }} 积分
        </NTag>
        <NTag type="success" round :bordered="false">
          余额 {{ props.capability.balance }} 积分
        </NTag>
        <NButton type="warning" size="large" class="min-w-48 !rounded-xl">
          {{ props.capability.actionLabel }} 💎 {{ props.capability.cost }}
        </NButton>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.generate-panel {
  --scene-scroll-track: rgba(218, 226, 237, 0.9);
  --scene-scroll-thumb: rgba(22, 176, 108, 0.88);
  --scene-scroll-thumb-hover: rgba(8, 149, 88, 0.96);

  display: grid;
  gap: 18px;
}

:global([data-theme="dark"]) .generate-panel {
  --scene-scroll-track: rgba(255, 255, 255, 0.1);
  --scene-scroll-thumb: rgba(61, 203, 136, 0.72);
  --scene-scroll-thumb-hover: rgba(95, 230, 166, 0.92);
}

.batch-tabs,
.delivery-tabs {
  display: flex;
  justify-content: center;
  gap: 44px;
  min-height: 48px;
  border-bottom: 1px solid var(--app-border);
}

.batch-tabs button,
.delivery-tabs button {
  position: relative;
  border: 0;
  background: transparent;
  color: var(--app-text-soft);
  font-family: inherit;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
}

.batch-tabs button.active,
.delivery-tabs button.active {
  color: #2f6df6;
}

.batch-tabs button.active::after,
.delivery-tabs button.active::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 3px;
  border-radius: 999px;
  background: #2f6df6;
}

.batch-card,
.batch-scene-card,
.delivery-list,
.delivery-actions {
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--app-surface) 88%, transparent);
}

.batch-notice {
  padding: 16px 18px;
  border-color: rgba(74, 144, 255, 0.38);
  background: color-mix(in srgb, #2f7cff 10%, var(--app-surface));
  color: #1f56b5;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.8;
}

:global([data-theme="dark"]) .batch-notice {
  color: #9bc1ff;
}

.inline-field {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.preset-save {
  grid-template-columns: 58px minmax(0, 1fr) auto;
}

.inline-field span {
  color: var(--app-text-soft);
  font-size: 15px;
  font-weight: 800;
}

.batch-card h3 {
  margin: 0 0 10px;
  color: var(--app-text);
  font-size: 18px;
  font-weight: 900;
}

.batch-card {
  padding: 16px;
}

.plain-input {
  width: 100%;
  height: 48px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface-soft);
  color: var(--app-text);
  padding: 0 16px;
  font: inherit;
  font-size: 16px;
  font-weight: 700;
}

.batch-upload {
  display: grid;
  place-items: center;
  min-height: 178px;
  border: 1px dashed color-mix(in srgb, #2f7cff 38%, var(--app-border));
  border-radius: 12px;
  background: color-mix(in srgb, var(--app-surface) 92%, #2f7cff 8%);
  color: var(--app-text);
  font-family: inherit;
  cursor: pointer;
}

.batch-upload .iconify {
  color: #958b91;
  font-size: 34px;
}

.batch-upload strong {
  margin-top: 8px;
  font-size: 17px;
  font-weight: 900;
}

.batch-upload span {
  margin-top: 6px;
  color: var(--app-text-soft);
  font-size: 13px;
  font-weight: 700;
}

.batch-upload b {
  margin-top: 10px;
  padding: 4px 9px;
  border-radius: 999px;
  background: var(--app-surface-soft);
  color: var(--app-text-soft);
  font-size: 12px;
}

.interior-upload .iconify {
  color: #a56966;
}

.switch-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.switch-card p {
  margin: 0;
  color: var(--app-text-soft);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.65;
}

.batch-scene-card {
  padding: 16px;
}

.scene-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
}

.scene-head h3 {
  margin: 0;
  color: var(--app-text);
  font-size: 18px;
  font-weight: 900;
}

.scene-head button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  color: #2f7cff;
  padding: 0 14px;
  font-family: inherit;
  font-weight: 800;
}

.scene-grid {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 2px 0 20px;
  scroll-padding-inline: 2px;
  scroll-snap-type: x proximity;
  scrollbar-width: thin;
  scrollbar-color: var(--scene-scroll-thumb) var(--scene-scroll-track);
}

.scene-grid::-webkit-scrollbar {
  height: 10px;
}

.scene-grid::-webkit-scrollbar-track {
  border-radius: 999px;
  background: var(--scene-scroll-track);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--app-border) 68%, transparent);
}

.scene-grid::-webkit-scrollbar-thumb {
  border: 2px solid var(--scene-scroll-track);
  border-radius: 999px;
  background: linear-gradient(90deg, var(--scene-scroll-thumb), #2f7cff);
}

.scene-grid::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(90deg, var(--scene-scroll-thumb-hover), #4d92ff);
}

.scene-grid article {
  flex: 0 0 calc((100% - 24px) / 2.25);
  scroll-snap-align: start;
  overflow: hidden;
  border: 2px solid rgba(47, 124, 255, 0.5);
  border-radius: 10px;
  background: var(--app-surface-soft);
  cursor: pointer;
}

.scene-grid article.active {
  border-color: #2f7cff;
  box-shadow: 0 0 0 2px rgba(47, 124, 255, 0.12);
}

.scene-grid img {
  width: 100%;
  height: clamp(118px, 12vw, 150px);
  object-fit: cover;
}

.scene-grid strong {
  display: block;
  padding: 10px;
  color: var(--app-text);
  text-align: center;
  font-size: 14px;
  font-weight: 900;
}

.sticky-action {
  position: sticky;
  bottom: 0;
  z-index: 2;
  margin: 8px -8px -8px;
  padding: 18px 8px 8px;
  background: linear-gradient(180deg, transparent, var(--app-surface-soft) 34%);
}

.delivery-list {
  display: grid;
  gap: 0;
  overflow: hidden;
}

.delivery-list article {
  display: grid;
  grid-template-columns: 28px 64px minmax(0, 1fr) 56px;
  align-items: center;
  gap: 12px;
  min-height: 84px;
  padding: 12px;
  border-bottom: 1px solid var(--app-border);
}

.delivery-list article.active {
  background: color-mix(in srgb, #2f7cff 10%, var(--app-surface));
  border-bottom-color: #2f7cff;
}

.delivery-list img {
  width: 64px;
  height: 52px;
  border-radius: 6px;
  object-fit: cover;
}

.delivery-copy {
  min-width: 0;
}

.delivery-copy h3,
.delivery-copy p {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delivery-copy h3 {
  margin: 0;
  color: var(--app-text);
  font-size: 15px;
  font-weight: 900;
}

.delivery-copy p {
  margin: 5px 0 0;
  color: var(--app-text-soft);
  font-size: 13px;
  font-weight: 700;
}

.delivery-status {
  display: grid;
  justify-items: center;
  gap: 5px;
  color: #16b981;
  font-size: 12px;
  font-weight: 900;
}

.delivery-status span {
  width: 22px;
  height: 22px;
  border: 4px solid currentColor;
  border-radius: 999px;
}

.delivery-status.loading {
  color: #2f7cff;
}

.delivery-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto auto;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.delivery-actions p {
  margin: 0;
  color: var(--app-text-soft);
  font-size: 14px;
  font-weight: 700;
}

.delivery-actions > button {
  border: 0;
  background: transparent;
  color: var(--app-text-soft);
  font-family: inherit;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.logo-setting-card {
  border-radius: 12px;
}

.logo-expand-panel {
  display: grid;
  gap: 12px;
  margin-top: -10px;
  padding: 0;
}

.recent-logo-card,
.reupload-button,
.logo-upload-drop {
  width: 100%;
  border-radius: 10px;
  font-family: inherit;
  cursor: pointer;
}

.recent-logo-card {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 68px;
  padding: 12px 16px;
  border: 2px solid #2f7cff;
  background: color-mix(in srgb, var(--app-surface) 88%, #2f7cff 12%);
  text-align: left;
}

.logo-preview {
  display: grid;
  place-items: center;
  width: 96px;
  height: 34px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 5px;
  border: 1px solid rgba(246, 184, 78, 0.62);
  background:
    linear-gradient(90deg, rgba(255, 214, 114, 0.14), transparent 55%),
    #111722;
  color: #f5d37a;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0;
}

.logo-copy {
  min-width: 0;
}

.logo-copy strong,
.logo-copy small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logo-copy strong {
  color: var(--app-text);
  font-size: 15px;
  font-weight: 900;
}

.logo-copy small {
  margin-top: 4px;
  color: var(--app-text-soft);
  font-size: 14px;
  font-weight: 700;
}

.reupload-button {
  height: 48px;
  border: 2px solid #2f7cff;
  background: color-mix(in srgb, var(--app-surface-soft) 88%, #2f7cff 12%);
  color: var(--app-text);
  text-align: left;
  padding: 0 18px;
  font-size: 15px;
  font-weight: 800;
}

.logo-upload-drop {
  display: grid;
  place-items: center;
  min-height: 190px;
  border: 1px dashed color-mix(in srgb, #2f7cff 44%, var(--app-border));
  background: color-mix(in srgb, var(--app-surface) 92%, #2f7cff 8%);
  color: var(--app-text);
}

.logo-upload-drop .iconify {
  margin-bottom: 12px;
  color: #f4a329;
  font-size: 34px;
}

.logo-upload-drop strong {
  font-size: 18px;
  font-weight: 900;
}

.logo-upload-drop span {
  margin-top: 8px;
  color: var(--app-text-soft);
  font-size: 14px;
  font-weight: 700;
}
</style>
