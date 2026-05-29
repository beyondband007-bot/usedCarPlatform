<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { Icon } from "@iconify/vue";
import { NAutoComplete, NButton, NSelect, NSwitch, NTag, useMessage } from "naive-ui";

import {
  createBatchTask,
  createDeliveryPackage,
  deleteDeliveryAssets,
  getDeliveryTaskAssets,
  getDeliveryTasks,
  uploadAsset,
  type DeliveryAsset,
  type DeliveryTaskItem,
  type UploadedAsset,
} from "@/api/visual-workbench";
import { useBatchVisualTemplates } from "@/composables/useBatchVisualTemplates";
import type {
  BatchVisualTemplate,
  BatchVisualTemplateInput,
  WorkspaceCapability,
  WorkspaceCapabilityBlock,
  WorkspaceDeliveryTaskPreview,
  WorkspaceGeneratePayload,
} from "@/types/workspace";

import CapabilityOptionSelector from "@/components/business/workspace/CapabilityOptionSelector.vue";
import PaintColorPicker from "@/components/business/workspace/PaintColorPicker.vue";
import UploadTaskCard from "@/components/business/workspace/UploadTaskCard.vue";
import WorkspaceLogoPanel from "@/components/business/workspace/WorkspaceLogoPanel.vue";

const props = defineProps<{
  capability: WorkspaceCapability;
  selectedOptionId: string;
  isGenerating?: boolean;
  previewedDeliveryTaskId?: string | null;
}>();

const emit = defineEmits<{
  selectOption: [id: string];
  generate: [payload: WorkspaceGeneratePayload];
  previewDeliveryTask: [task: WorkspaceDeliveryTaskPreview];
}>();

const outputRatioLabelMap: Record<string, string> = {
  "1:1": "涓诲浘 1:1",
  "3:4": "涓诲浘 3:4",
  "4:3": "涓诲浘 4:3",
  "9:16": "涓诲浘 9:16",
  "16:9": "涓诲浘 16:9",
};

const message = useMessage();
const {
  NEW_PRESET_VALUE,
  templates: visualTemplates,
  getTemplateById,
  saveTemplate,
  updateTemplate,
  ensureLoaded,
} = useBatchVisualTemplates();

const useLogo = ref(false);
const outputRatio = ref("1:1");
const batchTab = ref<"create" | "visual">("create");
const uploadInterior = ref(false);
const enableSceneChange = ref(false);
const batchSceneIndex = ref(0);
const batchSceneCategory = ref("灞曞巺鐏厜");
const useRecentLogo = ref(false);
const lightConsistency = ref(true);
const paintRefresh = ref(false);
const interiorEnhance = ref(false);
const projectName = ref("5月展厅批量上新");
const createTaskPresetId = ref(visualTemplates.value[0]?.id ?? "");
const visualPreset = ref(visualTemplates.value[0]?.id ?? NEW_PRESET_VALUE);
const presetInput = ref(visualTemplates.value[0]?.name ?? "");
const isApplyingTemplate = ref(false);
const selectedPaintColorId = ref("");
const uploadedAsset = ref<UploadedAsset | null>(null);
const uploadedInteriorAssets = ref<UploadedAsset[]>([]);
const uploadedPreviewUrl = ref<string | null>(null);
const isUploadingVehicle = ref(false);
const isUploadingInterior = ref(false);
const deliveryTaskAssets = ref<Record<string, DeliveryAsset[]>>({});
const activeDeliveryTaskId = ref<string | null>(null);
const isLoadingDeliveryTasks = ref(false);
const isLoadingDeliveryAssets = ref(false);
const isCreatingBatchTask = ref(false);
const isDeletingDeliveryAssets = ref(false);
const lastCreatedBatchId = ref<string | null>(null);

let previewObjectUrl: string | null = null;

function revokePreviewObjectUrl() {
  if (!previewObjectUrl) return;

  URL.revokeObjectURL(previewObjectUrl);
  previewObjectUrl = null;
}

function resetUploadedVehicle() {
  revokePreviewObjectUrl();
  uploadedAsset.value = null;
  uploadedPreviewUrl.value = null;
}

function resetUploadedInterior() {
  uploadedInteriorAssets.value = [];
}

const showPaintColorPicker = computed(
  () => props.capability.code === "paint-refresh",
);

const outputRatioOptions = [
  { label: "1:1 涓诲浘", value: "1:1" },
  { label: "3:4 绔栧睆", value: "3:4" },
  { label: "4:3 妯増", value: "4:3" },
  { label: "9:16 绔栧睆", value: "9:16" },
  { label: "16:9 妯増", value: "16:9" },
];

const presetAutocompleteOptions = computed(() => {
  const query = presetInput.value.trim();
  const normalizedQuery = query.toLowerCase();

  const matches = visualTemplates.value
    .filter(
      (item) =>
        !query || item.name.toLowerCase().includes(normalizedQuery),
    )
    .map((item) => ({
      label: item.name,
      value: item.name,
    }));

  if (!query) {
    return matches;
  }

  if (matches.length === 0) {
    return [{ label: query, value: query }];
  }

  return matches;
});

const createPresetOptions = computed(() =>
  visualTemplates.value.map((item) => ({
    label: item.name,
    value: item.id,
  })),
);

function buildTemplateInput(): BatchVisualTemplateInput {
  return {
    name: presetInput.value.trim(),
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

function syncPresetSelectionFromInput(value: string) {
  const trimmed = value.trim();
  const matchedTemplate = visualTemplates.value.find(
    (item) => item.name.toLowerCase() === trimmed.toLowerCase(),
  );

  visualPreset.value = matchedTemplate?.id ?? NEW_PRESET_VALUE;
}

watch(presetInput, (value) => {
  syncPresetSelectionFromInput(value);
});

function handlePresetSelect(value: string) {
  presetInput.value = value;
  syncPresetSelectionFromInput(value);
}

async function handleSaveVisualPreset() {
  const input = buildTemplateInput();

  if (!input.name) {
    message.warning("Please select completed tasks first");
    return;
  }

  if (visualPreset.value === NEW_PRESET_VALUE) {
    const created = await saveTemplate(input);
    visualPreset.value = created.id;
    presetInput.value = created.name;
    createTaskPresetId.value = created.id;
    message.success("Preset saved");
    return;
  }

  const updated = await updateTemplate(visualPreset.value, input);
  if (!updated) {
    message.error("棰勮淇濆瓨澶辫触锛岃閲嶈瘯");
    return;
  }

  presetInput.value = updated.name;
  createTaskPresetId.value = updated.id;
  message.success("Preset updated");
}

function handleSaveVisualConfig() {
  void handleSaveVisualPreset();
}

function handleStickyAction() {
  if (batchTab.value === "visual") {
    handleSaveVisualConfig();
    return;
  }

  void handleCreateBatchTask();
}

async function handleVehicleFileSelected(file: File) {
  revokePreviewObjectUrl();
  previewObjectUrl = URL.createObjectURL(file);
  uploadedPreviewUrl.value = previewObjectUrl;
  isUploadingVehicle.value = true;

  try {
    const asset = await uploadAsset(file, "car_exterior");
    uploadedAsset.value = asset;
    revokePreviewObjectUrl();
    uploadedPreviewUrl.value = asset.url;
    message.success("杞﹁締鍥剧墖涓婁紶鎴愬姛");
  } catch (error) {
    resetUploadedVehicle();
    const text = error instanceof Error ? error.message : "杞﹁締鍥剧墖涓婁紶澶辫触";
    message.error(text);
  } finally {
    isUploadingVehicle.value = false;
  }
}

function handleVehicleImageRemove() {
  resetUploadedVehicle();
  message.info("已删除车辆图片");
}

function handleInteriorFileSelected(file: File) {
  isUploadingInterior.value = true;

  void uploadAsset(file, "car_interior")
    .then((asset) => {
      uploadedInteriorAssets.value = [...uploadedInteriorAssets.value, asset];
      message.success("内饰图上传成功");
    })
    .catch((error) => {
      const text = error instanceof Error ? error.message : "内饰图上传失败";
      message.error(text);
    })
    .finally(() => {
      isUploadingInterior.value = false;
    });
}

function handleInteriorImageRemove() {
  resetUploadedInterior();
  message.info("已清空内饰图");
}

function handleGenerate() {
  if (!uploadedAsset.value) {
    message.warning("Please select completed tasks first");
    return;
  }

  emit("generate", {
    inputAssetId: uploadedAsset.value.assetId,
    outputRatio: outputRatioLabelMap[outputRatio.value] ?? `涓诲浘 ${outputRatio.value}`,
    optionId: props.capability.kind === "scene" ? props.selectedOptionId : undefined,
    useLogo: props.capability.kind === "scene" ? useLogo.value : undefined,
    colorCode:
      props.capability.code === "paint-refresh" && selectedPaintColorId.value
        ? selectedPaintColorId.value
        : undefined,
  });
}

function mapBatchVisualConfig() {
  return {
    enableSceneChange: enableSceneChange.value,
    sceneOptionId: batchScenes[batchSceneIndex.value]?.optionId ?? batchScenes[0].optionId,
    sceneIndex: batchSceneIndex.value,
    sceneCategory: batchSceneCategory.value,
    outputRatio: outputRatio.value,
    useRecentLogo: useRecentLogo.value,
    enableLightConsistency: lightConsistency.value,
    enablePaintRefresh: paintRefresh.value,
    enableInteriorClean: interiorEnhance.value,
  };
}

async function handleCreateBatchTask() {
  if (!uploadedAsset.value) {
    message.warning("请先上传外观图组");
    return;
  }

  if (!createTaskPresetId.value) {
    message.warning("请先选择或保存视觉预设");
    return;
  }

  isCreatingBatchTask.value = true;

  try {
    const created = await createBatchTask({
      projectName: projectName.value.trim() || "批量上新任务",
      presetId: createTaskPresetId.value,
      carGroups: [
        {
          groupTitle: projectName.value.trim() || "车辆图组",
          exteriorAssetIds: [uploadedAsset.value.assetId],
          interiorAssetIds: uploadInterior.value
            ? uploadedInteriorAssets.value.map((item) => item.assetId)
            : [],
        },
      ],
      visualConfig: mapBatchVisualConfig(),
    });

    lastCreatedBatchId.value = created.batchId;
    message.success(`批量任务已创建：${created.batchId}`);
    await refreshDeliveryTasks();
  } catch (error) {
    const text = error instanceof Error ? error.message : "批量任务创建失败";
    message.error(text);
  } finally {
    isCreatingBatchTask.value = false;
  }
}

async function refreshDeliveryTasks() {
  isLoadingDeliveryTasks.value = true;

  try {
    const result = await getDeliveryTasks({ page: 1, pageSize: 20 });
    deliveryTasks.value = result.items.map((item, index) => ({
      ...item,
      selected: deliveryTasks.value[index]?.selected ?? index === 0,
      meta: `${item.completed} / ${item.total} 套 · ${item.updatedAt.slice(0, 16).replace('T', ' ')}`,
      image: deliveryTaskAssets.value[item.taskId]?.[0]?.thumbnailUrl ?? deliveryTaskAssets.value[item.taskId]?.[0]?.url ?? '',
      imageCount: item.assetCount,
    }));
  } catch (error) {
    const text = error instanceof Error ? error.message : "成片交付列表加载失败";
    message.error(text);
  } finally {
    isLoadingDeliveryTasks.value = false;
  }
}

async function loadDeliveryAssets(taskId: string) {
  isLoadingDeliveryAssets.value = true;

  try {
    const result = await getDeliveryTaskAssets(taskId, { page: 1, pageSize: 200 });
    deliveryTaskAssets.value = {
      ...deliveryTaskAssets.value,
      [taskId]: result.items,
    };
    return result.items;
  } finally {
    isLoadingDeliveryAssets.value = false;
  }
}

watch(
  visualPreset,
  (presetId) => {
    if (isApplyingTemplate.value || presetId === NEW_PRESET_VALUE) return;

    const template = getTemplateById(presetId);
    if (!template) return;

    presetInput.value = template.name;
    applyTemplate(template);
  },
  { immediate: true },
);

watch(createTaskPresetId, (presetId) => {
  const template = getTemplateById(presetId);
  if (!template) return;

  projectName.value = template.name;
});

watch(
  () => props.capability.code,
  () => {
    resetUploadedVehicle();
  },
);

onUnmounted(() => {
  revokePreviewObjectUrl();
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
      presetInput.value = list[0].name;
    }
  },
  { deep: true },
);

onMounted(() => {
  void ensureLoaded();
  void refreshDeliveryTasks();
});

const batchScenes = [
  {
    title: "缁忓吀鐧芥",
    optionId: "white-studio",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=520&q=80",
  },
  {
    title: "鐜荤拑灞曞巺",
    optionId: "glass-hall",
    image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=520&q=80",
  },
  {
    title: "鏆楄皟璞崕",
    optionId: "luxury-dark",
    image: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=520&q=80",
  },
  {
    title: "鏌斿厜椤剁伅",
    optionId: "soft-top-light",
    image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=520&q=80",
  },
  {
    title: "鍩庡競澶滄櫙",
    optionId: "city-night",
    image: "https://images.unsplash.com/photo-1485291571154-772bc14410bb?auto=format&fit=crop&w=520&q=80",
  },
  {
    title: "鏋楄崼鎴峰",
    optionId: "tree-park",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=520&q=80",
  },
];

type DeliveryTask = DeliveryTaskItem & {
  selected: boolean;
  meta: string;
  image: string;
  imageCount: number;
};

const deliveryTasks = ref<DeliveryTask[]>([]);

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
    message.warning("Please select completed tasks first");
    return;
  }

  isDeliveryBatchDownloading.value = true;

  try {
    const assetGroups = await Promise.all(
      selectedTasks.map((task) =>
        deliveryTaskAssets.value[task.taskId]
          ? Promise.resolve(deliveryTaskAssets.value[task.taskId])
          : loadDeliveryAssets(task.taskId),
      ),
    );
    const assetIds = assetGroups.flat().map((asset) => asset.assetId);

    if (!assetIds.length) {
      message.warning("当前没有可下载素材");
      return;
    }

    const batchName = selectedTasks[0]?.title ?? "成片交付包";
    const createdPackage = await createDeliveryPackage({
      taskId: selectedTasks[0].taskId,
      packageName: batchName,
      assetIds,
    });

    if (createdPackage.downloadUrl) {
      window.open(createdPackage.downloadUrl, "_blank", "noopener,noreferrer");
    }

    message.success(`下载包已生成，共 ${assetIds.length} 张图`);
  } finally {
    isDeliveryBatchDownloading.value = false;
  }
}

async function handleDeleteDeliveryAssets() {
  const selectedTaskIds = deliveryTasks.value
    .filter((task) => task.selected)
    .map((task) => task.taskId)

  if (!selectedTaskIds.length) {
    message.warning('请先选择任务')
    return
  }

  const selectedAssets = selectedTaskIds.flatMap((taskId) =>
    deliveryTaskAssets.value[taskId]?.map((asset) => asset.assetId) ?? [],
  )

  if (!selectedAssets.length) {
    message.warning('当前没有可删除素材')
    return
  }

  isDeletingDeliveryAssets.value = true

  try {
    const result = await deleteDeliveryAssets(selectedAssets)
    message.success(`已删除 ${result.deleted.length} 个素材`)
    await refreshDeliveryTasks()
  } catch (error) {
    const text = error instanceof Error ? error.message : '删除素材失败'
    message.error(text)
  } finally {
    isDeletingDeliveryAssets.value = false
  }
}

async function handlePreviewDeliveryTask(task: DeliveryTask) {
  if (task.progress < 100) {
    message.info("任务未完成，暂不可预览");
    return;
  }

  activeDeliveryTaskId.value = task.taskId;
  const assets = deliveryTaskAssets.value[task.taskId] ?? (await loadDeliveryAssets(task.taskId));
  const firstAsset = assets?.[0];

  if (!firstAsset) {
    message.warning('暂无可预览素材')
    return;
  }

  emit("previewDeliveryTask", {
    id: task.taskId,
    title: task.title,
    meta: task.updatedAt,
    image: firstAsset.thumbnailUrl ?? firstAsset.url,
    previewImage: firstAsset.url,
    progress: task.progress,
    imageCount: task.assetCount,
  });
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
            鏂板缓浠诲姟
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
          当前套餐：企业团队版 · 每账号图组并发 5 套 · 进行中 2 套 · 可继续上传 3 套。单张生成仍可正常使用。
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
              {{ activeCreateTemplate.sceneCategory }} 路
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
              鐑ゆ紗缈绘柊
            </span>
            <span v-if="activeCreateTemplate.interiorEnhance" class="preset-tag is-on">
              <Icon icon="mdi:seat-passenger" />
              鍐呴グ娓呮磥
            </span>
          </div>
        </section>

        <section class="batch-card">
          <h3>项目名</h3>
          <input v-model="projectName" class="plain-input" type="text" />
        </section>

        <button type="button" class="batch-upload" @click="handleVehicleImageRemove">
          <Icon icon="mdi:camera" />
          <strong>上传外观图组</strong>
          <span>支持多角度外观图 · 每套车图作为 1 个图组</span>
          <b>必填</b>
        </button>
        <UploadTaskCard
          :capability="props.capability"
          :upload-preview-url="uploadedPreviewUrl"
          :is-uploading="isUploadingVehicle"
          @select-file="handleVehicleFileSelected"
          @remove="handleVehicleImageRemove"
        />

        <section class="batch-card switch-card">
          <div>
            <h3>同时上传内饰图</h3>
            <p>开启后，每套外观图组可补充内饰图，用于成片交付包。</p>
          </div>
          <NSwitch v-model:value="uploadInterior" size="large" />
        </section>

        <button v-if="uploadInterior" type="button" class="batch-upload interior-upload" @click="handleInteriorImageRemove">
          <Icon icon="mdi:seat-passenger" />
          <strong>上传内饰图组</strong>
          <span>用于成片交付中的内饰展示图，可选上传</span>
          <b>选填</b>
        </button>
        <UploadTaskCard
          v-if="uploadInterior"
          :capability="props.capability"
          :upload-preview-url="uploadedInteriorAssets[0]?.url ?? null"
          :is-uploading="isUploadingInterior"
          @select-file="handleInteriorFileSelected"
          @remove="handleInteriorImageRemove"
        />
          </template>

          <template v-else>
        <section class="batch-card preset-save-card">
          <div class="preset-save-row">
            <span>预设</span>
            <NAutoComplete
              v-model:value="presetInput"
              class="preset-combobox"
              :options="presetAutocompleteOptions"
              size="large"
              placeholder="输入或选择预设名称"
              clearable
              @select="handlePresetSelect"
            />
            <NButton type="primary" size="large" @click="handleSaveVisualPreset">
              保存
            </NButton>
          </div>
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
            <h3>漆面翻新预览</h3>
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
            <span class="ml-2">预计 120</span>
          </NButton>
        </footer>
      </div>
    </template>

    <template v-else-if="props.capability.code === 'future-short-video'">
      <section class="batch-card batch-notice short-video-notice">
        短视频生成为 Beta 能力：可上传车图预览流程，点击生成演示不会创建真实任务，右侧可查看演示视频。
      </section>

      <UploadTaskCard
        :capability="props.capability"
        :upload-preview-url="uploadedPreviewUrl"
        :is-uploading="isUploadingVehicle"
        @select-file="handleVehicleFileSelected"
        @remove="handleVehicleImageRemove"
      />

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
          :loading="props.isGenerating"
          :disabled="isUploadingVehicle || props.isGenerating || !uploadedAsset"
          @click="handleGenerate"
        >
          {{ props.capability.actionLabel }} {{ props.capability.cost }}
        </NButton>
      </div>
    </template>

    <template v-else-if="props.capability.kind === 'delivery'">
      <div class="delivery-panel">
        <div class="delivery-tabs">
          <button type="button" class="active">成片交付</button>
        </div>

        <section class="batch-notice delivery-notice">
          这里展示批量上新里已完成的任务。点击任务卡片可在右侧查看大图；仅勾选复选框用于批量下载。
        </section>

        <section class="delivery-board" aria-label="成片交付任务列表">
          <div class="delivery-list">
            <article
              v-for="(task, index) in deliveryTasks"
              :key="task.taskId"
              class="delivery-item"
              :class="{
                'is-checked': task.selected,
                'is-previewing': props.previewedDeliveryTaskId === task.taskId,
                'is-loading': task.progress < 100,
              }"
            >
              <label class="delivery-check" @click.stop>
                <input
                  type="checkbox"
                  :checked="task.selected"
                  :aria-label="`选择${task.title}`"
                  @change="toggleDeliveryTask(index)"
                />
              </label>

              <button
                type="button"
                class="delivery-item-body"
                :disabled="task.progress < 100"
                :aria-label="`查看${task.title}大图`"
                @click="handlePreviewDeliveryTask(task)"
              >
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
              </button>
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
                @click="handleDeleteDeliveryAssets"
              >
                批量删除
              </button>
            </div>
          </footer>
        </section>
      </div>
    </template>

    <template v-else>
      <UploadTaskCard
        :capability="props.capability"
        :upload-preview-url="uploadedPreviewUrl"
        :is-uploading="isUploadingVehicle"
        @select-file="handleVehicleFileSelected"
        @remove="handleVehicleImageRemove"
      />

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
          :loading="props.isGenerating"
          :disabled="isUploadingVehicle || props.isGenerating || !uploadedAsset"
          @click="handleGenerate"
        >
          {{ props.capability.actionLabel }} {{ props.capability.cost }}
        </NButton>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.generate-panel {
  padding-bottom: 8px;
  --scene-scroll-track: color-mix(in srgb, var(--workspace-muted, #969186) 18%, transparent);
  --scene-scroll-track-glow: color-mix(in srgb, var(--workspace-accent, #efc24c) 16%, transparent);
  --scene-scroll-thumb-start: var(--workspace-accent, #efc24c);
  --scene-scroll-thumb-end: var(--workspace-accent-strong, #ffd75a);
  --scene-scroll-thumb-glow: color-mix(in srgb, var(--workspace-accent, #efc24c) 38%, transparent);

  display: grid;
  gap: 18px;
}

:global([data-theme="dark"]) .generate-panel {
  --scene-scroll-track: rgba(255, 255, 255, 0.08);
  --scene-scroll-track-glow: color-mix(in srgb, var(--workspace-accent, #efc24c) 20%, transparent);
  --scene-scroll-thumb-start: var(--workspace-accent, #efc24c);
  --scene-scroll-thumb-end: var(--workspace-accent-strong, #ffd75a);
  --scene-scroll-thumb-glow: color-mix(in srgb, var(--workspace-accent, #efc24c) 44%, transparent);
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

.batch-panel-scroll > * {
  flex-shrink: 0;
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
  color: var(--workspace-accent-strong, #ffd75a);
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
  background: var(--workspace-accent, #efc24c);
}

.batch-card,
.batch-notice {
  padding: 16px 18px;
  border: 1px solid color-mix(in srgb, var(--workspace-accent, #efc24c) 28%, var(--app-border));
  border-radius: 12px;
  background: color-mix(in srgb, var(--workspace-accent, #efc24c) 9%, var(--app-surface));
  color: var(--workspace-accent-strong, #a86d00);
  font-size: 14px;
  font-weight: 800;
  line-height: 1.8;
}

:global([data-theme="dark"]) .batch-notice {
  color: var(--workspace-accent-strong, #ffd75a);
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

.preset-combobox {
  width: 100%;
  min-width: 0;
}

.preset-summary {
  padding: 16px 18px;
  border: 1px solid color-mix(in srgb, var(--workspace-accent, #efc24c) 18%, var(--app-border));
  border-radius: 12px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--workspace-accent, #efc24c) 9%, var(--app-surface)) 0%, var(--app-surface) 58%),
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
  background: color-mix(in srgb, var(--workspace-accent, #efc24c) 14%, var(--app-surface-soft));
  color: var(--workspace-accent-strong, #ffd75a);
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
  border-color: color-mix(in srgb, var(--workspace-accent, #efc24c) 28%, var(--app-border));
  background: color-mix(in srgb, var(--workspace-accent, #efc24c) 10%, var(--app-surface-soft));
  color: var(--workspace-accent-strong, #a86d00);
}

.preset-tag.is-ratio {
  border-color: color-mix(in srgb, var(--workspace-accent, #efc24c) 24%, var(--app-border));
  background: color-mix(in srgb, var(--workspace-accent, #efc24c) 9%, var(--app-surface-soft));
  color: var(--workspace-accent-strong, #a86d00);
}

.preset-tag.is-on {
  border-color: color-mix(in srgb, var(--workspace-accent, #efc24c) 30%, var(--app-border));
  background: color-mix(in srgb, var(--workspace-accent, #efc24c) 12%, var(--app-surface-soft));
  color: var(--workspace-accent-strong, #a86d00);
}

:global([data-theme="dark"]) .preset-tag.is-scene {
  color: var(--workspace-accent-strong, #ffd75a);
}

:global([data-theme="dark"]) .preset-tag.is-ratio {
  color: var(--workspace-accent-strong, #ffd75a);
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
  border: 1px solid color-mix(in srgb, var(--workspace-accent, #efc24c) 24%, var(--app-border));
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
  border-color: color-mix(in srgb, var(--workspace-accent, #efc24c) 38%, var(--app-border));
}

.plain-input:focus {
  border-color: color-mix(in srgb, var(--workspace-accent, #efc24c) 58%, var(--app-border));
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, #fff 80%, transparent),
    0 0 0 3px color-mix(in srgb, var(--workspace-accent, #efc24c) 14%, transparent);
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
    0 0 0 3px color-mix(in srgb, var(--workspace-accent, #efc24c) 22%, transparent);
}

.batch-upload {
  display: grid;
  place-items: center;
  min-height: 178px;
  border: 1px dashed color-mix(in srgb, var(--workspace-accent, #efc24c) 38%, var(--app-border));
  border-radius: 12px;
  background: color-mix(in srgb, var(--app-surface) 92%, var(--workspace-accent, #efc24c) 8%);
  color: var(--app-text);
  font-family: inherit;
  cursor: pointer;
}

.batch-upload .iconify {
  color: var(--workspace-accent-strong, #ffd75a);
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
  border: 1px solid color-mix(in srgb, var(--workspace-accent, #efc24c) 24%, var(--app-border));
  border-radius: 12px;
  background: var(--app-surface);
  color: var(--app-text);
  overflow: visible;
}

.scene-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
  min-height: 38px;
}

.scene-head h3 {
  margin: 0;
  min-width: 0;
  color: var(--app-text);
  font-size: 18px;
  font-weight: 900;
  line-height: 1.35;
}

.scene-head button {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
  height: 38px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  color: var(--workspace-accent-strong, #a86d00);
  padding: 0 14px;
  font-family: inherit;
  font-weight: 800;
  white-space: nowrap;
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
  border-color: var(--workspace-accent, #efc24c);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--workspace-accent, #efc24c) 14%, transparent);
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
  grid-template-columns: 32px minmax(0, 1fr);
  align-items: stretch;
  gap: 14px;
  padding: 14px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--app-border) 88%, transparent);
  background: var(--app-surface);
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.delivery-item-body {
  display: grid;
  min-width: 0;
  grid-template-columns: 72px minmax(0, 1fr) 72px;
  align-items: center;
  gap: 14px;
  border: 0;
  background: transparent;
  padding: 0;
  font: inherit;
  text-align: inherit;
  cursor: pointer;
}

.delivery-item-body:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.delivery-item:hover .delivery-item-body:not(:disabled) {
  background: transparent;
}

.delivery-item:hover {
  background: color-mix(in srgb, var(--workspace-accent, #efc24c) 4%, var(--app-surface));
}

.delivery-item.is-checked {
  background: color-mix(in srgb, var(--workspace-accent, #efc24c) 6%, var(--app-surface-soft));
}

.delivery-item.is-previewing {
  background: color-mix(in srgb, var(--workspace-accent, #efc24c) 9%, var(--app-surface-soft));
  box-shadow: inset 3px 0 0 var(--workspace-accent, #efc24c);
}

.delivery-item.is-previewing .delivery-item-body:focus-visible {
  outline: none;
}

.delivery-check {
  display: grid;
  place-items: center;
  align-self: center;
}

.delivery-check input {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--workspace-accent, #efc24c);
  cursor: pointer;
}

.delivery-item-body:focus-visible {
  outline: none;
  border-radius: 10px;
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--workspace-accent, #efc24c) 22%, transparent);
}

.delivery-item:last-child {
  border-bottom: 0;
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
  color: var(--workspace-accent-strong, #a86d00);
  font-size: 12px;
  font-weight: 900;
  line-height: 1.2;
}

.delivery-item.is-loading .delivery-status strong {
  color: var(--workspace-accent-strong, #a86d00);
}

.delivery-status-ring {
  width: 26px;
  height: 26px;
  border: 3px solid var(--workspace-accent-strong, #a86d00);
  border-radius: 999px;
  background: color-mix(in srgb, var(--workspace-accent, #efc24c) 8%, transparent);
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
    conic-gradient(var(--workspace-accent, #efc24c) var(--progress), #dfe7f2 0);
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
  color: var(--workspace-accent-strong, #a86d00);
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
    conic-gradient(var(--workspace-accent-strong, #ffd75a) var(--progress), rgba(255, 255, 255, 0.12) 0);
}

</style>
