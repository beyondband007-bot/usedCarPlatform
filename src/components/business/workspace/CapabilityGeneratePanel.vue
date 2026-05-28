<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Icon } from "@iconify/vue";
import { NButton, NInput, NSelect, NSwitch, NTag, useMessage } from "naive-ui";

import { useBatchVisualTemplates } from "@/composables/useBatchVisualTemplates";
import type {
  BatchVisualTemplate,
  BatchVisualTemplateInput,
  WorkspaceCapability,
  WorkspaceCapabilityBlock,
} from "@/types/workspace";

import CapabilityOptionSelector from "@/components/business/workspace/CapabilityOptionSelector.vue";
import PaintColorPicker from "@/components/business/workspace/PaintColorPicker.vue";
import UploadTaskCard from "@/components/business/workspace/UploadTaskCard.vue";
import WorkspaceLogoPanel from "@/components/business/workspace/WorkspaceLogoPanel.vue";
import { paintColorOptions } from "@/constants/paint-colors";
import { downloadDeliveryTasks } from "@/utils/delivery-download";

const props = defineProps<{
  capability: WorkspaceCapability;
  selectedOptionId: string;
}>();

const emit = defineEmits<{
  selectOption: [id: string];
  generate: [payload: { outputRatio: string }];
}>();

const outputRatioLabelMap: Record<string, string> = {
  "1:1": "主图 1:1",
  "3:4": "主图 3:4",
  "4:3": "主图 4:3",
  "9:16": "主图 9:16",
  "16:9": "主图 16:9",
};

function handleGenerate() {
  emit("generate", {
    outputRatio: outputRatioLabelMap[outputRatio.value] ?? `主图 ${outputRatio.value}`,
  });
}

const message = useMessage();
const {
  NEW_PRESET_VALUE,
  templates: visualTemplates,
  getTemplateById,
  saveTemplate,
  updateTemplate,
} = useBatchVisualTemplates();

const useLogo = ref(false);
const outputRatio = ref("1:1");
const batchTab = ref<"create" | "visual">("create");
const uploadInterior = ref(false);
const enableSceneChange = ref(false);
const batchSceneIndex = ref(0);
const batchSceneCategory = ref("展厅灯光");
const useRecentLogo = ref(false);
const lightConsistency = ref(true);
const paintRefresh = ref(false);
const interiorEnhance = ref(false);
const newPresetName = ref("");
const projectName = ref("5月展厅批量上新");
const createTaskPresetId = ref(visualTemplates.value[0]?.id ?? "");
const visualPreset = ref(visualTemplates.value[0]?.id ?? NEW_PRESET_VALUE);
const isApplyingTemplate = ref(false);
const selectedPaintColorId = ref(paintColorOptions[0]?.id ?? "");

const showPaintColorPicker = computed(
  () => props.capability.code === "paint-refresh",
);

const outputRatioOptions = [
  { label: "1:1 主图", value: "1:1" },
  { label: "3:4 竖屏", value: "3:4" },
  { label: "4:3 横版", value: "4:3" },
  { label: "9:16 竖屏", value: "9:16" },
  { label: "16:9 横版", value: "16:9" },
];

const visualPresetOptions = computed(() => [
  { label: "输入名称", value: NEW_PRESET_VALUE },
  ...visualTemplates.value.map((item) => ({
    label: item.name,
    value: item.id,
  })),
]);

const createPresetOptions = computed(() =>
  visualTemplates.value.map((item) => ({
    label: item.name,
    value: item.id,
  })),
);

function buildTemplateInput(): BatchVisualTemplateInput {
  return {
    name:
      visualPreset.value === NEW_PRESET_VALUE
        ? newPresetName.value.trim()
        : getTemplateById(visualPreset.value)?.name ?? newPresetName.value.trim(),
    enableSceneChange: enableSceneChange.value,
    sceneIndex: batchSceneIndex.value,
    sceneCategory: batchSceneCategory.value,
    outputRatio: outputRatio.value,
    useRecentLogo: useRecentLogo.value,
    lightConsistency: lightConsistency.value,
    paintRefresh: paintRefresh.value,
    interiorEnhance: interiorEnhance.value,
  };
}

function applyTemplate(template: BatchVisualTemplate) {
  isApplyingTemplate.value = true;
  enableSceneChange.value = template.enableSceneChange;
  batchSceneIndex.value = template.sceneIndex;
  batchSceneCategory.value = template.sceneCategory;
  outputRatio.value = template.outputRatio;
  useRecentLogo.value = template.useRecentLogo;
  lightConsistency.value = template.lightConsistency;
  paintRefresh.value = template.paintRefresh;
  interiorEnhance.value = template.interiorEnhance;
  isApplyingTemplate.value = false;
}

function handleSaveVisualPreset() {
  const input = buildTemplateInput();

  if (!input.name) {
    message.warning("请输入预设名称");
    return;
  }

  if (visualPreset.value === NEW_PRESET_VALUE) {
    const created = saveTemplate(input);
    visualPreset.value = created.id;
    newPresetName.value = "";
    createTaskPresetId.value = created.id;
    message.success(`预设「${created.name}」已保存`);
    return;
  }

  const updated = updateTemplate(visualPreset.value, input);
  if (!updated) {
    message.error("预设保存失败，请重试");
    return;
  }

  createTaskPresetId.value = updated.id;
  message.success(`预设「${updated.name}」已更新`);
}

function handleSaveVisualConfig() {
  handleSaveVisualPreset();
}

function handleStickyAction() {
  if (batchTab.value === "visual") {
    handleSaveVisualConfig();
  }
}

watch(
  visualPreset,
  (presetId) => {
    if (isApplyingTemplate.value || presetId === NEW_PRESET_VALUE) return;

    const template = getTemplateById(presetId);
    if (template) applyTemplate(template);
  },
  { immediate: true },
);

watch(createTaskPresetId, (presetId) => {
  const template = getTemplateById(presetId);
  if (!template) return;

  projectName.value = template.name;
});

watch(
  visualTemplates,
  (list) => {
    if (!list.length) {
      createTaskPresetId.value = "";
      return;
    }

    if (!list.some((item) => item.id === createTaskPresetId.value)) {
      createTaskPresetId.value = list[0].id;
    }

    if (
      visualPreset.value !== NEW_PRESET_VALUE &&
      !list.some((item) => item.id === visualPreset.value)
    ) {
      visualPreset.value = list[0].id;
    }
  },
  { deep: true },
);

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
  {
    title: "城市夜景",
    image: "https://images.unsplash.com/photo-1485291571154-772bc14410bb?auto=format&fit=crop&w=520&q=80",
  },
  {
    title: "林荫户外",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=520&q=80",
  },
];

type DeliveryTask = {
  title: string;
  meta: string;
  image: string;
  selected: boolean;
  progress: number;
  imageCount: number;
};

const deliveryTasks = ref<DeliveryTask[]>([
  {
    title: "5月展厅批量上新 · 成片交付",
    meta: "12 张成片 · 2026-05-20 09:32",
    image: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=180&q=80",
    selected: true,
    progress: 100,
    imageCount: 12,
  },
  {
    title: "宝马 5系 · 暗调展厅",
    meta: "10 张成片 · 2026-05-20 09:18",
    image: "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=180&q=80",
    selected: false,
    progress: 100,
    imageCount: 10,
  },
  {
    title: "丰田 凯美瑞 · 玻璃展厅",
    meta: "8 张成片 · 2026-05-19 18:44",
    image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=180&q=80",
    selected: false,
    progress: 100,
    imageCount: 8,
  },
  {
    title: "理想 L8 · 柔光顶灯",
    meta: "预计 6 分钟 · 暂不可下载",
    image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=180&q=80",
    selected: false,
    progress: 62,
    imageCount: 0,
  },
  {
    title: "奔驰 E级 · 夜景街道",
    meta: "14 张成片 · 2026-05-18 16:02",
    image: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=180&q=80",
    selected: false,
    progress: 100,
    imageCount: 14,
  },
  {
    title: "奥迪 A6 · 纯白影棚",
    meta: "9 张成片 · 2026-05-17 11:26",
    image: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=180&q=80",
    selected: false,
    progress: 100,
    imageCount: 9,
  },
  {
    title: "蔚来 ET5 · 户外林荫",
    meta: "11 张成片 · 2026-05-16 20:41",
    image: "https://images.unsplash.com/photo-1617814076665-65e6f9995f35?auto=format&fit=crop&w=180&q=80",
    selected: false,
    progress: 100,
    imageCount: 11,
  },
]);

const deliverySelectedCount = computed(
  () => deliveryTasks.value.filter((task) => task.selected).length,
);

const deliveryDownloadableCount = computed(
  () =>
    deliveryTasks.value.filter((task) => task.selected && task.progress >= 100)
      .length,
);

const isDeliveryBatchDownloading = ref(false);

const deliverySelectedImages = computed(() =>
  deliveryTasks.value
    .filter((task) => task.selected)
    .reduce((total, task) => total + task.imageCount, 0),
);

const isAllDeliverySelected = computed(
  () =>
    deliveryTasks.value.length > 0 &&
    deliveryTasks.value.every((task) => task.selected),
);

function toggleDeliveryTask(index: number) {
  const task = deliveryTasks.value[index];
  if (!task) return;
  task.selected = !task.selected;
}

function toggleSelectAllDelivery() {
  const nextValue = !isAllDeliverySelected.value;
  deliveryTasks.value.forEach((task) => {
    task.selected = nextValue;
  });
}

async function handleDeliveryBatchDownload() {
  const selectedTasks = deliveryTasks.value.filter(
    (task) => task.selected && task.progress >= 100,
  );

  if (!selectedTasks.length) {
    message.warning("请先勾选已完成的任务");
    return;
  }

  isDeliveryBatchDownloading.value = true;

  try {
    const count = await downloadDeliveryTasks(selectedTasks);
    message.success(`已开始下载 ${count} 张成片`);
  } finally {
    isDeliveryBatchDownloading.value = false;
  }
}

const hasBlock = (block: WorkspaceCapabilityBlock) =>
  props.capability.middleBlocks?.includes(block) ?? false;

const activeCreateTemplate = computed(() =>
  createTaskPresetId.value ? getTemplateById(createTaskPresetId.value) : undefined,
);

const activeCreateRatioLabel = computed(() => {
  const ratio = activeCreateTemplate.value?.outputRatio;
  return outputRatioOptions.find((item) => item.value === ratio)?.label ?? ratio;
});
</script>

<template>
  <div
    class="generate-panel"
    :class="{
      'is-batch': props.capability.kind === 'batch',
      'is-delivery': props.capability.kind === 'delivery',
    }"
  >
    <template v-if="props.capability.kind === 'batch'">
      <div class="batch-panel">
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

        <div class="batch-panel-scroll">
          <template v-if="batchTab === 'create'">
        <section class="batch-card inline-field">
          <span>使用预设</span>
          <NSelect
            v-model:value="createTaskPresetId"
            :options="createPresetOptions"
            placeholder="请选择已保存的预设"
            size="large"
          />
        </section>

        <section v-if="createTaskPresetId && activeCreateTemplate" class="preset-summary">
          <header class="preset-summary-head">
            <span class="preset-summary-icon" aria-hidden="true">
              <Icon icon="mdi:check-decagram" />
            </span>
            <div class="preset-summary-copy">
              <p>已套用视觉配置</p>
              <strong>{{ activeCreateTemplate.name }}</strong>
            </div>
          </header>

          <div class="preset-summary-tags">
            <span
              v-if="activeCreateTemplate.enableSceneChange"
              class="preset-tag is-scene"
            >
              <Icon icon="mdi:image-filter-hdr" />
              {{ activeCreateTemplate.sceneCategory }} ·
              {{ batchScenes[activeCreateTemplate.sceneIndex]?.title }}
            </span>
            <span class="preset-tag is-ratio">
              <Icon icon="mdi:aspect-ratio" />
              {{ activeCreateRatioLabel }}
            </span>
            <span v-if="activeCreateTemplate.lightConsistency" class="preset-tag is-on">
              <Icon icon="mdi:weather-sunny" />
              光污一致化
            </span>
            <span v-if="activeCreateTemplate.useRecentLogo" class="preset-tag is-on">
              <Icon icon="mdi:badge-account-horizontal-outline" />
              最近 Logo
            </span>
            <span v-if="activeCreateTemplate.paintRefresh" class="preset-tag is-on">
              <Icon icon="mdi:spray" />
              烤漆翻新
            </span>
            <span v-if="activeCreateTemplate.interiorEnhance" class="preset-tag is-on">
              <Icon icon="mdi:seat-passenger" />
              内饰清洁
            </span>
          </div>
        </section>

        <section class="batch-card">
          <h3>项目名</h3>
          <input v-model="projectName" class="plain-input" type="text" />
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
        <section class="batch-card preset-save-card">
          <div class="preset-save-row">
            <span>预设</span>
            <NSelect
              v-model:value="visualPreset"
              :options="visualPresetOptions"
              size="large"
            />
            <NButton type="primary" size="large" @click="handleSaveVisualPreset">
              保存
            </NButton>
          </div>
          <NInput
            v-if="visualPreset === NEW_PRESET_VALUE"
            v-model:value="newPresetName"
            class="preset-name-input"
            size="large"
            placeholder="输入预设名称，例如 5月展厅批量上新"
          />
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
            <button type="button">{{ batchSceneCategory }} <Icon icon="mdi:chevron-down" /></button>
          </div>
          <div class="scene-grid">
            <article
              v-for="(scene, index) in batchScenes"
              :key="scene.title"
              :class="{ active: index === batchSceneIndex }"
              @click="batchSceneIndex = index"
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
          <NSwitch v-model:value="useRecentLogo" size="large" />
        </section>

        <section class="batch-card switch-card">
          <div>
            <h3>光污一致化</h3>
            <p>批量弱化眩光、反光和色偏，让车辆与新场景更融合。</p>
          </div>
          <NSwitch v-model:value="lightConsistency" size="large" />
        </section>

        <section class="batch-card switch-card">
          <div>
            <h3>烤漆翻新预览</h3>
            <p>增强漆面亮度和轮毂金属质感，作为演示型美容开关。</p>
          </div>
          <NSwitch v-model:value="paintRefresh" size="large" />
        </section>

        <section class="batch-card switch-card">
          <div>
            <h3>内饰清洁增强</h3>
            <p>对已上传内饰图做清洁与质感增强。</p>
          </div>
          <NSwitch v-model:value="interiorEnhance" size="large" />
        </section>
          </template>
        </div>

        <footer class="batch-panel-footer">
          <NButton
            type="primary"
            size="large"
            block
            :disabled="batchTab === 'create' && !createTaskPresetId"
            @click="handleStickyAction"
          >
            {{ batchTab === "create" ? "创建批量上新任务" : "保存视觉处理配置" }}
            <span class="ml-2">💎 预计 120</span>
          </NButton>
        </footer>
      </div>
    </template>

    <template v-else-if="props.capability.code === 'future-short-video'">
      <section class="batch-card batch-notice short-video-notice">
        短视频生成为 Beta 能力：可上传车图预览流程，点击「生成演示」不会创建真实任务，右侧可查看演示视频。
      </section>

      <UploadTaskCard :capability="props.capability" />

      <CapabilityOptionSelector
        v-if="hasBlock('selector')"
        :capability="props.capability"
        :selected-option-id="props.selectedOptionId"
        @select="emit('selectOption', $event)"
      />

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
        <NButton
          type="warning"
          size="large"
          class="min-w-48 !rounded-xl"
          @click="handleGenerate"
        >
          {{ props.capability.actionLabel }} 💎 {{ props.capability.cost }}
        </NButton>
      </div>
    </template>

    <template v-else-if="props.capability.kind === 'delivery'">
      <div class="delivery-panel">
        <div class="delivery-tabs">
          <button type="button" class="active">成片交付</button>
        </div>

        <section class="batch-card batch-notice delivery-notice">
          这里展示批量上新里已完成的任务。点击任务后，右侧结果框查看该任务出图；勾选多个任务后可批量下载。
        </section>

        <section class="delivery-board" aria-label="成片交付任务列表">
          <div class="delivery-list">
            <article
              v-for="(task, index) in deliveryTasks"
              :key="task.title"
              class="delivery-item"
              :class="{ 'is-selected': task.selected, 'is-loading': task.progress < 100 }"
              role="button"
              tabindex="0"
              @click="toggleDeliveryTask(index)"
              @keydown.enter.prevent="toggleDeliveryTask(index)"
              @keydown.space.prevent="toggleDeliveryTask(index)"
            >
              <label class="delivery-check" @click.stop>
                <input
                  type="checkbox"
                  :checked="task.selected"
                  :aria-label="`选择${task.title}`"
                  @change="toggleDeliveryTask(index)"
                />
              </label>

              <img
                class="delivery-thumb"
                :src="task.image"
                :alt="task.title"
                loading="lazy"
                draggable="false"
              />

              <div class="delivery-copy">
                <h3>{{ task.title }}</h3>
                <p>{{ task.meta }}</p>
              </div>

              <div class="delivery-status">
                <template v-if="task.progress >= 100">
                  <span class="delivery-status-ring" aria-hidden="true"></span>
                  <strong>已完成</strong>
                </template>
                <template v-else>
                  <span
                    class="delivery-status-progress"
                    :style="{ '--progress': `${task.progress}%` }"
                    aria-hidden="true"
                  >
                    <b>{{ task.progress }}%</b>
                  </span>
                  <strong class="delivery-status-meta">{{ task.progress }}%</strong>
                </template>
              </div>
            </article>
          </div>

          <footer class="delivery-actions">
            <p class="delivery-actions-summary">
              已选 <strong>{{ deliverySelectedCount }}</strong> 个任务，预计下载
              <strong>{{ deliverySelectedImages }}</strong> 张图
            </p>
            <div class="delivery-actions-buttons">
              <button type="button" class="delivery-link-btn" @click="toggleSelectAllDelivery">
                {{ isAllDeliverySelected ? "取消全选" : "全选" }}
              </button>
              <NButton
                type="warning"
                ghost
                size="large"
                class="delivery-download-btn"
                :disabled="deliveryDownloadableCount === 0"
                :loading="isDeliveryBatchDownloading"
                @click="handleDeliveryBatchDownload"
              >
                批量下载
              </NButton>
              <button
                type="button"
                class="delivery-link-btn is-danger"
                :disabled="deliverySelectedCount === 0"
              >
                批量删除
              </button>
            </div>
          </footer>
        </section>
      </div>
    </template>

    <template v-else>
      <UploadTaskCard :capability="props.capability" />

      <PaintColorPicker
        v-if="showPaintColorPicker"
        v-model="selectedPaintColorId"
      />

      <CapabilityOptionSelector
        v-if="hasBlock('selector')"
        :capability="props.capability"
        :selected-option-id="props.selectedOptionId"
        @select="emit('selectOption', $event)"
      />

      <template
        v-if="props.capability.kind === 'scene' && hasBlock('scene-settings')"
      >
        <WorkspaceLogoPanel v-model:enabled="useLogo" />

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
        <NButton
          type="warning"
          size="large"
          class="min-w-48 !rounded-xl"
          @click="handleGenerate"
        >
          {{ props.capability.actionLabel }} 💎 {{ props.capability.cost }}
        </NButton>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.generate-panel {
  padding-bottom: 8px;
  --scene-scroll-track: rgba(218, 226, 237, 0.72);
  --scene-scroll-track-glow: rgba(47, 124, 255, 0.14);
  --scene-scroll-thumb-start: #19c995;
  --scene-scroll-thumb-end: #2f7cff;
  --scene-scroll-thumb-glow: rgba(47, 124, 255, 0.42);

  display: grid;
  gap: 18px;
}

:global([data-theme="dark"]) .generate-panel {
  --scene-scroll-track: rgba(255, 255, 255, 0.08);
  --scene-scroll-track-glow: rgba(47, 124, 255, 0.22);
  --scene-scroll-thumb-start: #3dcda8;
  --scene-scroll-thumb-end: #5b9dff;
  --scene-scroll-thumb-glow: rgba(91, 157, 255, 0.5);
}

.generate-panel.is-batch,
.generate-panel.is-delivery {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: clamp(12px, 1.2vw, 16px);
  padding-bottom: 0;
}

.batch-panel {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: clamp(12px, 1.2vw, 16px);
}

.batch-panel-scroll {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 18px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 8px;
  padding-bottom: 4px;
  scrollbar-width: thin;
  scrollbar-color: var(--scene-scroll-thumb-end) var(--scene-scroll-track);
}

.batch-panel-scroll::-webkit-scrollbar {
  width: 8px;
}

.batch-panel-scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: linear-gradient(
    180deg,
    var(--scene-scroll-thumb-start),
    var(--scene-scroll-thumb-end)
  );
}

.batch-panel-footer {
  flex-shrink: 0;
  padding-top: 12px;
  border-top: 1px solid var(--app-border);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--app-surface-soft) 0%, transparent) 0%,
    var(--app-surface-soft) 24%,
    var(--app-surface-soft) 100%
  );
}

.delivery-panel {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: clamp(12px, 1.2vw, 16px);
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

.preset-save-card {
  display: grid;
  gap: 12px;
  padding: 16px;
}

.preset-save-row {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.preset-name-input {
  width: 100%;
}

.preset-summary {
  padding: 16px 18px;
  border: 1px solid color-mix(in srgb, #2f7cff 18%, var(--app-border));
  border-radius: 12px;
  background:
    linear-gradient(135deg, color-mix(in srgb, #2f7cff 9%, var(--app-surface)) 0%, var(--app-surface) 58%),
    var(--app-surface);
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 75%, transparent);
}

:global([data-theme="dark"]) .preset-summary {
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 8%, transparent);
}

.preset-summary-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.preset-summary-icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: color-mix(in srgb, #2f7cff 14%, var(--app-surface-soft));
  color: #2f7cff;
  font-size: 20px;
}

.preset-summary-copy {
  min-width: 0;
}

.preset-summary-copy p {
  margin: 0;
  color: var(--app-text-soft);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.preset-summary-copy strong {
  display: block;
  margin-top: 4px;
  overflow: hidden;
  color: var(--app-text);
  font-size: 16px;
  font-weight: 900;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preset-summary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-tag {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: var(--app-surface-soft);
  color: var(--app-text);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.2;
}

.preset-tag .iconify {
  flex-shrink: 0;
  font-size: 14px;
  opacity: 0.88;
}

.preset-tag.is-scene {
  border-color: color-mix(in srgb, #2f7cff 28%, var(--app-border));
  background: color-mix(in srgb, #2f7cff 10%, var(--app-surface-soft));
  color: #1f5fbf;
}

.preset-tag.is-ratio {
  border-color: color-mix(in srgb, #8f57ff 24%, var(--app-border));
  background: color-mix(in srgb, #8f57ff 10%, var(--app-surface-soft));
  color: #5b3f9c;
}

.preset-tag.is-on {
  border-color: color-mix(in srgb, #27b77d 30%, var(--app-border));
  background: color-mix(in srgb, #27b77d 12%, var(--app-surface-soft));
  color: #157a52;
}

:global([data-theme="dark"]) .preset-tag.is-scene {
  color: #8eb8ff;
}

:global([data-theme="dark"]) .preset-tag.is-ratio {
  color: #c4a8ff;
}

:global([data-theme="dark"]) .preset-tag.is-on {
  color: #6ee7b7;
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
  border: 1px solid color-mix(in srgb, #2f7cff 24%, var(--app-border));
  border-radius: 8px;
  background: var(--app-surface);
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 80%, transparent);
  color: var(--app-text);
  padding: 0 16px;
  font: inherit;
  font-size: 16px;
  font-weight: 700;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.plain-input:hover {
  border-color: color-mix(in srgb, #2f7cff 38%, var(--app-border));
}

.plain-input:focus {
  border-color: color-mix(in srgb, #2f7cff 58%, var(--app-border));
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, #fff 80%, transparent),
    0 0 0 3px color-mix(in srgb, #2f7cff 14%, transparent);
}

.plain-input:focus-visible {
  outline: none;
}

:global([data-theme="dark"]) .plain-input {
  background: color-mix(in srgb, var(--app-surface-soft) 88%, #0f172a);
  box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 6%, transparent);
}

:global([data-theme="dark"]) .plain-input:focus {
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, #fff 6%, transparent),
    0 0 0 3px color-mix(in srgb, #5b9dff 22%, transparent);
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
  container-type: inline-size;
  min-width: 0;
  padding: 16px;
  overflow: hidden;
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
  --scene-gap: 12px;
  --scene-col-width: clamp(128px, 38cqw, 176px);

  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: var(--scene-col-width);
  grid-template-rows: repeat(2, auto);
  gap: var(--scene-gap);
  margin-right: -2px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 2px 10px 14px 2px;
  scroll-padding-inline: 8px;
  scroll-snap-type: x proximity;
  scrollbar-width: thin;
  scrollbar-color: var(--scene-scroll-thumb-end) var(--scene-scroll-track);
}

.scene-grid::-webkit-scrollbar {
  height: 9px;
}

.scene-grid::-webkit-scrollbar-track {
  margin-inline: 4px;
  border-radius: 999px;
  background:
    linear-gradient(
      90deg,
      transparent 0%,
      var(--scene-scroll-track-glow) 18%,
      var(--scene-scroll-track-glow) 82%,
      transparent 100%
    ),
    repeating-linear-gradient(
      90deg,
      color-mix(in srgb, var(--app-border) 55%, transparent) 0 1px,
      transparent 1px 7px
    ),
    var(--scene-scroll-track);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, #fff 70%, transparent),
    inset 0 -1px 0 color-mix(in srgb, var(--scene-scroll-thumb-end) 18%, transparent);
}

.scene-grid::-webkit-scrollbar-thumb {
  border: 2px solid var(--scene-scroll-track);
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    var(--scene-scroll-thumb-start) 0%,
    var(--scene-scroll-thumb-end) 58%,
    color-mix(in srgb, var(--scene-scroll-thumb-end) 72%, #6b8cff) 100%
  );
  box-shadow:
    0 0 10px var(--scene-scroll-thumb-glow),
    0 0 2px color-mix(in srgb, var(--scene-scroll-thumb-start) 65%, transparent);
}

.scene-grid::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--scene-scroll-thumb-start) 88%, #fff) 0%,
    color-mix(in srgb, var(--scene-scroll-thumb-end) 90%, #fff) 55%,
    #6b8cff 100%
  );
  box-shadow:
    0 0 14px var(--scene-scroll-thumb-glow),
    0 0 4px color-mix(in srgb, var(--scene-scroll-thumb-start) 75%, transparent);
}

.scene-grid article {
  width: var(--scene-col-width);
  scroll-snap-align: start;
  overflow: hidden;
  border: 2px solid color-mix(in srgb, var(--app-border) 88%, transparent);
  border-radius: 10px;
  background: var(--app-surface-soft);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.scene-grid article.active {
  border-color: #2f7cff;
  box-shadow: 0 0 0 2px rgba(47, 124, 255, 0.12);
}

.scene-grid img {
  width: 100%;
  height: clamp(96px, 28cqw, 132px);
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
  margin-top: 12px;
  padding: 16px 0 4px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--app-surface-soft) 0%, transparent) 0%,
    var(--app-surface-soft) 28%,
    var(--app-surface-soft) 100%
  );
}

.delivery-board {
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-surface);
}

.delivery-list {
  --delivery-row-height: 88px;
  display: grid;
  max-height: calc(var(--delivery-row-height) * 6);
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--scene-scroll-thumb-end) var(--scene-scroll-track);
}

.delivery-list::-webkit-scrollbar {
  width: 8px;
}

.delivery-list::-webkit-scrollbar-track {
  background: var(--scene-scroll-track);
}

.delivery-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: linear-gradient(
    180deg,
    var(--scene-scroll-thumb-start),
    var(--scene-scroll-thumb-end)
  );
}

.delivery-item {
  display: grid;
  box-sizing: border-box;
  height: var(--delivery-row-height, 88px);
  min-height: var(--delivery-row-height, 88px);
  grid-template-columns: 32px 72px minmax(0, 1fr) 72px;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--app-border) 88%, transparent);
  background: var(--app-surface);
  cursor: pointer;
  outline: none;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.delivery-item:last-child {
  border-bottom: 0;
}

.delivery-item:hover {
  background: color-mix(in srgb, #2f7cff 4%, var(--app-surface));
}

.delivery-item.is-selected {
  background: color-mix(in srgb, #2f7cff 9%, var(--app-surface-soft));
  box-shadow: inset 3px 0 0 #2f7cff;
}

.delivery-item:focus-visible {
  background: color-mix(in srgb, #2f7cff 8%, var(--app-surface-soft));
  box-shadow: inset 0 0 0 2px rgba(47, 124, 255, 0.22);
}

.delivery-check {
  display: grid;
  place-items: center;
}

.delivery-check input {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: #2f7cff;
  cursor: pointer;
}

.delivery-thumb {
  width: 72px;
  height: 56px;
  border: 1px solid color-mix(in srgb, var(--app-border) 80%, transparent);
  border-radius: 10px;
  object-fit: cover;
  background: var(--app-surface-soft);
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
  line-height: 1.35;
}

.delivery-copy p {
  margin: 6px 0 0;
  color: var(--app-text-soft);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}

.delivery-status {
  display: grid;
  justify-items: center;
  gap: 6px;
}

.delivery-status strong {
  color: #16b981;
  font-size: 12px;
  font-weight: 900;
  line-height: 1.2;
}

.delivery-item.is-loading .delivery-status strong {
  color: #2f7cff;
}

.delivery-status-ring {
  width: 26px;
  height: 26px;
  border: 3px solid #16b981;
  border-radius: 999px;
  background: color-mix(in srgb, #16b981 8%, transparent);
}

.delivery-status-progress {
  --progress: 0%;

  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 999px;
  background:
    radial-gradient(closest-side, var(--app-surface) 72%, transparent 73% 100%),
    conic-gradient(#2f7cff var(--progress), #dfe7f2 0);
}

.delivery-status-progress b {
  display: none;
}

.delivery-status-meta {
  font-size: 12px;
}

.delivery-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px 16px;
  padding: 16px 18px;
  border-top: 1px solid var(--app-border);
  background: color-mix(in srgb, var(--app-surface-soft) 72%, var(--app-surface));
}

.delivery-actions-summary {
  margin: 0;
  min-width: 220px;
  flex: 1 1 220px;
  color: var(--app-text-soft);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.5;
}

.delivery-actions-summary strong {
  color: var(--app-text);
  font-weight: 900;
}

.delivery-actions-buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.delivery-link-btn {
  border: 0;
  background: transparent;
  color: var(--app-text-soft);
  padding: 0;
  font-family: inherit;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: color 0.2s ease;
}

.delivery-link-btn:hover:not(:disabled) {
  color: #2f7cff;
}

.delivery-link-btn.is-danger:hover:not(:disabled) {
  color: #e25555;
}

.delivery-link-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.delivery-download-btn {
  min-width: 112px;
  border-radius: 10px !important;
  font-weight: 900 !important;
}

:global([data-theme="dark"]) .delivery-board {
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22);
}

:global([data-theme="dark"]) .delivery-status-progress {
  background:
    radial-gradient(closest-side, var(--app-surface) 72%, transparent 73% 100%),
    conic-gradient(#5b9dff var(--progress), rgba(255, 255, 255, 0.12) 0);
}

</style>
