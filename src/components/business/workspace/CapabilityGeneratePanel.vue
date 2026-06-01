<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { Icon } from "@iconify/vue";
import { NButton, NSelect, NSwitch, NTag, useMessage } from "naive-ui";

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
import {
  batchSceneCategoryOptions,
  getBatchScenesByCategory,
  getBatchSceneTitle,
} from "@/constants/workspace";
import { resolveEnterprisePlanName } from "@/domain/enterprise-plans";
import { useSubscriptionStore } from "@/stores/subscription";
import { useBatchVisualTemplates } from "@/composables/useBatchVisualTemplates";
import { formatDate } from "@/utils/dayjs";
import type {
  BatchVisualTemplate,
  BatchVisualTemplateInput,
  WorkspaceBatchCreatedPayload,
  WorkspaceCapability,
  WorkspaceCapabilityBlock,
  WorkspaceDeliveryTaskPreview,
  WorkspaceGeneratePayload,
} from "@/types/workspace";

import PreloadImage from "@/components/common/PreloadImage.vue";
import CapabilityOptionSelector from "@/components/business/workspace/CapabilityOptionSelector.vue";
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
  batchCreated: [payload: WorkspaceBatchCreatedPayload];
}>();

const outputRatioLabelMap: Record<string, string> = {
  "1:1": "主图 1:1",
  "3:4": "主图 3:4",
  "4:3": "主图 4:3",
  "9:16": "主图 9:16",
  "16:9": "主图 16:9",
};

const message = useMessage();
const subscriptionStore = useSubscriptionStore();
const {
  NEW_PRESET_VALUE,
  templates: visualTemplates,
  getTemplateById,
  saveTemplate,
  updateTemplate,
  ensureLoaded,
  isLoading: isLoadingVisualPresets,
} = useBatchVisualTemplates();

const useLogo = ref(false);
const outputRatio = ref("1:1");
const batchTab = ref<"create" | "visual">("create");
const uploadInterior = ref(false);
const enableSceneChange = ref(false);
const batchSceneIndex = ref(0);
const batchSceneCategory = ref("展厅灯光");
const batchScenes = computed(() =>
  getBatchScenesByCategory(batchSceneCategory.value),
);
const batchNoticeText = computed(() => {
  const limit = subscriptionStore.concurrentTaskLimit;
  const running = 2;
  const remaining = Math.max(0, limit - running);
  return `当前套餐：${resolveEnterprisePlanName(subscriptionStore.currentPlan)} · 每账号图组并发 ${limit} 套 · 进行中 ${running} 套 · 可继续上传 ${remaining} 套。单张生成仍可正常使用。`;
});
const useRecentLogo = ref(false);
const lightConsistency = ref(true);
const paintRefresh = ref(false);
const interiorEnhance = ref(false);
const projectName = ref("5月展厅批量上新");
const createTaskPresetId = ref(visualTemplates.value[0]?.id ?? "");
const visualPreset = ref(visualTemplates.value[0]?.id ?? NEW_PRESET_VALUE);
const presetInput = ref(visualTemplates.value[0]?.name ?? "");
const isApplyingTemplate = ref(false);
const uploadedAsset = ref<UploadedAsset | null>(null);
const batchExteriorUploads = ref<BatchExteriorUploadItem[]>([]);
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
const batchExteriorInputRef = ref<HTMLInputElement | null>(null);
const MAX_BATCH_EXTERIOR_IMAGES = 5;

let previewObjectUrl: string | null = null;

type BatchExteriorUploadItem = {
  id: string;
  name: string;
  previewUrl: string;
  status: "uploading" | "success" | "fail";
  size: number;
  asset?: UploadedAsset;
  objectUrl?: string;
  error?: string;
};

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

function revokeBatchExteriorObjectUrl(item: BatchExteriorUploadItem) {
  if (!item.objectUrl) return;
  URL.revokeObjectURL(item.objectUrl);
}

function resetBatchExteriorUploads() {
  batchExteriorUploads.value.forEach(revokeBatchExteriorObjectUrl);
  batchExteriorUploads.value = [];
}

function resetBatchCreateSection() {
  resetBatchExteriorUploads();
  resetUploadedInterior();
  uploadInterior.value = false;
  projectName.value =
    getTemplateById(createTaskPresetId.value)?.name ?? "批量上新任务";
}

function resetUploadedInterior() {
  uploadedInteriorAssets.value = [];
}

const outputRatioOptions = [
  { label: "1:1 主图", value: "1:1" },
  { label: "3:4 竖图", value: "3:4" },
  { label: "4:3 横图", value: "4:3" },
  { label: "9:16 竖图", value: "9:16" },
  { label: "16:9 横图", value: "16:9" },
];

const visualPresetOptions = computed(() =>
  visualTemplates.value.map((item) => ({
    label: item.name,
    value: item.id,
  })),
);

const selectedPresetKey = computed({
  get() {
    if (visualPreset.value === NEW_PRESET_VALUE) {
      return presetInput.value || null;
    }

    return visualPreset.value;
  },
  set(value: string | null) {
    if (!value) {
      resetVisualConfigSelection();
      return;
    }

    const template = getTemplateById(value);
    if (template) {
      visualPreset.value = template.id;
      presetInput.value = template.name;
      return;
    }

    visualPreset.value = NEW_PRESET_VALUE;
    presetInput.value = value;
  },
});

const createPresetOptions = computed(() =>
  visualTemplates.value.map((item) => ({
    label: item.name,
    value: item.id,
  })),
);

const uploadedExteriorAssets = computed(() =>
  batchExteriorUploads.value
    .filter(
      (item): item is BatchExteriorUploadItem & { asset: UploadedAsset } =>
        item.status === "success" && Boolean(item.asset),
    )
    .map((item) => item.asset),
);

const batchExteriorFirstPreviewUrl = computed(
  () =>
    batchExteriorUploads.value.find((item) => item.status !== "fail")
      ?.previewUrl ?? "",
);

const batchExteriorRemainingCount = computed(() =>
  Math.max(0, MAX_BATCH_EXTERIOR_IMAGES - batchExteriorUploads.value.length),
);

const canAddBatchExteriorImages = computed(
  () => batchExteriorRemainingCount.value > 0 && !isUploadingVehicle.value,
);

const batchEstimatedCost = computed(() => {
  const inputCount =
    uploadedExteriorAssets.value.length +
    (uploadInterior.value ? uploadedInteriorAssets.value.length : 0);

  return inputCount * 120;
});

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

function resetVisualConfigSelection() {
  isApplyingTemplate.value = true;
  visualPreset.value = NEW_PRESET_VALUE;
  presetInput.value = "";
  enableSceneChange.value = false;
  batchSceneIndex.value = 0;
  batchSceneCategory.value = "展厅灯光";
  outputRatio.value = "1:1";
  useRecentLogo.value = false;
  lightConsistency.value = true;
  paintRefresh.value = false;
  interiorEnhance.value = false;
  isApplyingTemplate.value = false;
}

watch(presetInput, (value) => {
  syncPresetSelectionFromInput(value);
});

watch(batchSceneCategory, () => {
  if (isApplyingTemplate.value) return;
  batchSceneIndex.value = 0;
});

async function handleSaveVisualPreset() {
  const input = buildTemplateInput();

  if (!input.name) {
    message.warning("请输入预设名称");
    return;
  }

  try {
    if (visualPreset.value === NEW_PRESET_VALUE) {
      const created = await saveTemplate(input);
      createTaskPresetId.value = created.id;
    } else {
      const updated = await updateTemplate(visualPreset.value, input);
      if (!updated) {
        message.error("预设保存失败，请重试");
        return;
      }

      createTaskPresetId.value = updated.id;
    }

    message.success("视觉配置保存成功");
    resetVisualConfigSelection();
  } catch (error) {
    const text =
      error instanceof Error ? error.message : "预设保存失败，请重试";
    message.error(text);
  }
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
    const purpose = props.capability.code === "interior-clean" ? "car_interior" : "car_exterior";
    const asset = await uploadAsset(file, purpose);
    uploadedAsset.value = asset;
    revokePreviewObjectUrl();
    uploadedPreviewUrl.value = asset.url;
    message.success(props.capability.code === "interior-clean" ? "内饰图片上传成功" : "车辆图片上传成功");
  } catch (error) {
    resetUploadedVehicle();
    const text = error instanceof Error
      ? error.message
      : props.capability.code === "interior-clean"
        ? "内饰图片上传失败"
        : "车辆图片上传失败";
    message.error(text);
  } finally {
    isUploadingVehicle.value = false;
  }
}

function handleVehicleImageRemove() {
  resetUploadedVehicle();
  message.info("已删除车辆图片");
}

function createBatchExteriorUploadItem(file: File): BatchExteriorUploadItem {
  const objectUrl = URL.createObjectURL(file);

  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
    name: file.name,
    previewUrl: objectUrl,
    objectUrl,
    size: file.size,
    status: "uploading",
  };
}

function updateBatchExteriorUpload(
  id: string,
  patch: Partial<BatchExteriorUploadItem>,
) {
  const index = batchExteriorUploads.value.findIndex((item) => item.id === id);
  if (index < 0) return;

  batchExteriorUploads.value[index] = {
    ...batchExteriorUploads.value[index],
    ...patch,
  };
}

function openBatchExteriorPicker() {
  if (!canAddBatchExteriorImages.value) return;
  batchExteriorInputRef.value?.click();
}

function normalizeImageFiles(files: File[]) {
  return files.filter(
    (file) =>
      file.type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(file.name),
  );
}

async function handleBatchExteriorFilesSelected(files: File[]) {
  const imageFiles = normalizeImageFiles(files);

  if (!imageFiles.length) {
    message.warning("请选择 JPG、PNG 或 WebP 图片");
    return;
  }

  const remaining = batchExteriorRemainingCount.value;
  if (remaining <= 0) {
    message.warning(`外观图最多上传 ${MAX_BATCH_EXTERIOR_IMAGES} 张`);
    return;
  }

  const selectedFiles = imageFiles.slice(0, remaining);
  if (imageFiles.length > remaining) {
    message.warning(
      `最多支持 ${MAX_BATCH_EXTERIOR_IMAGES} 张，已自动保留前 ${remaining} 张`,
    );
  }

  const pendingItems = selectedFiles.map(createBatchExteriorUploadItem);
  batchExteriorUploads.value = [...batchExteriorUploads.value, ...pendingItems];
  isUploadingVehicle.value = true;

  const results = await Promise.allSettled(
    pendingItems.map(async (item, index) => {
      const asset = await uploadAsset(selectedFiles[index], "car_exterior");
      revokeBatchExteriorObjectUrl(item);
      updateBatchExteriorUpload(item.id, {
        asset,
        previewUrl: asset.url,
        objectUrl: undefined,
        status: "success",
      });
    }),
  );

  const successCount = results.filter(
    (result) => result.status === "fulfilled",
  ).length;

  results.forEach((result, index) => {
    if (result.status === "fulfilled") return;

    updateBatchExteriorUpload(pendingItems[index].id, {
      status: "fail",
      error:
        result.reason instanceof Error ? result.reason.message : "上传失败",
    });
  });

  if (successCount > 0) {
    message.success(`已上传 ${successCount} 张外观图`);
  }

  const failedCount = results.length - successCount;
  if (failedCount > 0) {
    message.error(`${failedCount} 张外观图上传失败，请删除后重试`);
  }

  isUploadingVehicle.value = false;
}

function handleBatchExteriorInputChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = "";

  void handleBatchExteriorFilesSelected(files);
}

function handleBatchExteriorDrop(event: DragEvent) {
  if (!canAddBatchExteriorImages.value) return;
  const files = Array.from(event.dataTransfer?.files ?? []);
  void handleBatchExteriorFilesSelected(files);
}

function handleBatchExteriorRemove(id: string) {
  const target = batchExteriorUploads.value.find((item) => item.id === id);
  if (target) {
    revokeBatchExteriorObjectUrl(target);
  }

  batchExteriorUploads.value = batchExteriorUploads.value.filter(
    (item) => item.id !== id,
  );
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
    outputRatio:
      outputRatioLabelMap[outputRatio.value] ?? `主图 ${outputRatio.value}`,
    optionId:
      props.capability.kind === "scene" ? props.selectedOptionId : undefined,
    useLogo: props.capability.kind === "scene" ? useLogo.value : undefined,
  });
}

function mapBatchVisualConfig() {
  const scenes = batchScenes.value;
  return {
    enableSceneChange: enableSceneChange.value,
    sceneOptionId:
      scenes[batchSceneIndex.value]?.optionId ?? scenes[0]?.optionId,
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
  if (isUploadingVehicle.value) {
    message.warning("外观图仍在上传，请稍候");
    return;
  }

  if (!uploadedExteriorAssets.value.length) {
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
          exteriorAssetIds: uploadedExteriorAssets.value.map(
            (item) => item.assetId,
          ),
          interiorAssetIds: uploadInterior.value
            ? uploadedInteriorAssets.value.map((item) => item.assetId)
            : [],
        },
      ],
      visualConfig: mapBatchVisualConfig(),
    });

    lastCreatedBatchId.value = created.batchId;
    message.success(`批量任务已创建：${created.batchId}`);
    emit("batchCreated", {
      batchId: created.batchId,
      projectName: projectName.value.trim() || "批量上新任务",
      previewUrl: batchExteriorFirstPreviewUrl.value,
      createdAt: created.createdAt,
      status: created.status,
      total: created.total,
      completed: created.completed,
      failed: created.failed,
      progress: created.progress,
    });
    resetBatchCreateSection();
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
    deliveryTasks.value = await Promise.all(
      result.items.map(async (item, index) => ({
        ...item,
        selected: deliveryTasks.value[index]?.selected ?? index === 0,
        meta: `${item.completed} / ${item.total} 套 · ${formatDate(item.updatedAt)}`,
        image: await resolveDeliveryTaskImage(item),
        imageCount: item.assetCount,
      })),
    );
    brokenDeliveryThumbs.value = new Set();
  } catch (error) {
    const text =
      error instanceof Error ? error.message : "成片交付列表加载失败";
    message.error(text);
  } finally {
    isLoadingDeliveryTasks.value = false;
  }
}

async function loadDeliveryAssets(taskId: string) {
  isLoadingDeliveryAssets.value = true;

  try {
    const result = await getDeliveryTaskAssets(taskId, {
      page: 1,
      pageSize: 200,
    });
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
    resetBatchExteriorUploads();
  },
);

onUnmounted(() => {
  revokePreviewObjectUrl();
  resetBatchExteriorUploads();
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

watch(batchTab, (tab) => {
  if (tab === "visual") {
    void ensureLoaded();
  }
});

onMounted(() => {
  void ensureLoaded();
  void refreshDeliveryTasks();
});

type DeliveryTask = DeliveryTaskItem & {
  selected: boolean;
  meta: string;
  image: string;
  imageCount: number;
};

const deliveryTasks = ref<DeliveryTask[]>([]);
const brokenDeliveryThumbs = ref<Set<string>>(new Set());

function hasDeliveryThumbnail(task: DeliveryTask) {
  if (task.progress < 100) return false;
  if (brokenDeliveryThumbs.value.has(task.taskId)) return false;
  return Boolean(task.image?.trim());
}

function handleDeliveryThumbError(taskId: string) {
  const next = new Set(brokenDeliveryThumbs.value);
  next.add(taskId);
  brokenDeliveryThumbs.value = next;
}

async function resolveDeliveryTaskImage(task: DeliveryTaskItem) {
  const cached = deliveryTaskAssets.value[task.taskId]?.[0];
  const cachedUrl = cached?.thumbnailUrl ?? cached?.url ?? "";
  if (cachedUrl) return cachedUrl;

  if (task.progress < 100 || task.assetCount <= 0) return "";

  try {
    const result = await getDeliveryTaskAssets(task.taskId, {
      page: 1,
      pageSize: 1,
    });
    if (!result.items.length) return "";

    deliveryTaskAssets.value = {
      ...deliveryTaskAssets.value,
      [task.taskId]: result.items,
    };

    return result.items[0]?.thumbnailUrl ?? result.items[0]?.url ?? "";
  } catch {
    return "";
  }
}

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
    .map((task) => task.taskId);

  if (!selectedTaskIds.length) {
    message.warning("请先选择任务");
    return;
  }

  const selectedAssets = selectedTaskIds.flatMap(
    (taskId) =>
      deliveryTaskAssets.value[taskId]?.map((asset) => asset.assetId) ?? [],
  );

  if (!selectedAssets.length) {
    message.warning("当前没有可删除素材");
    return;
  }

  isDeletingDeliveryAssets.value = true;

  try {
    const result = await deleteDeliveryAssets(selectedAssets);
    message.success(`已删除 ${result.deleted.length} 个素材`);
    await refreshDeliveryTasks();
  } catch (error) {
    const text = error instanceof Error ? error.message : "删除素材失败";
    message.error(text);
  } finally {
    isDeletingDeliveryAssets.value = false;
  }
}

async function handlePreviewDeliveryTask(task: DeliveryTask) {
  if (task.progress < 100) {
    message.info("任务未完成，暂不可预览");
    return;
  }

  activeDeliveryTaskId.value = task.taskId;
  const assets =
    deliveryTaskAssets.value[task.taskId] ??
    (await loadDeliveryAssets(task.taskId));
  const firstAsset = assets?.[0];

  if (!firstAsset) {
    message.warning("暂无可预览素材");
    return;
  }

  emit("previewDeliveryTask", {
    id: task.taskId,
    title: task.title,
    meta: formatDate(task.updatedAt),
    image: firstAsset.thumbnailUrl ?? firstAsset.url,
    previewImage: firstAsset.url,
    progress: task.progress,
    imageCount: task.assetCount,
  });
}

const hasBlock = (block: WorkspaceCapabilityBlock) =>
  props.capability.middleBlocks?.includes(block) ?? false;

const activeCreateTemplate = computed(() =>
  createTaskPresetId.value
    ? getTemplateById(createTaskPresetId.value)
    : undefined,
);

const activeCreateRatioLabel = computed(() => {
  const ratio = activeCreateTemplate.value?.outputRatio;
  return (
    outputRatioOptions.find((item) => item.value === ratio)?.label ?? ratio
  );
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
          {{ batchNoticeText }}
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

            <section
              v-if="createTaskPresetId && activeCreateTemplate"
              class="preset-summary"
            >
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
                  {{
                    getBatchSceneTitle(
                      activeCreateTemplate.sceneCategory,
                      activeCreateTemplate.sceneIndex,
                    )
                  }}
                </span>
                <span class="preset-tag is-ratio">
                  <Icon icon="mdi:aspect-ratio" />
                  {{ activeCreateRatioLabel }}
                </span>
                <span
                  v-if="activeCreateTemplate.lightConsistency"
                  class="preset-tag is-on"
                >
                  <Icon icon="mdi:weather-sunny" />
                  光污一致化
                </span>
                <span
                  v-if="activeCreateTemplate.useRecentLogo"
                  class="preset-tag is-on"
                >
                  <Icon icon="mdi:badge-account-horizontal-outline" />
                  最近 Logo
                </span>
                <span
                  v-if="activeCreateTemplate.paintRefresh"
                  class="preset-tag is-on"
                >
                  <Icon icon="mdi:spray" />
                  漆面翻新
                </span>
                <span
                  v-if="activeCreateTemplate.interiorEnhance"
                  class="preset-tag is-on"
                >
                  <Icon icon="mdi:seat-passenger" />
                  内饰清洁
                </span>
              </div>
            </section>

            <section class="batch-card">
              <h3>项目名</h3>
              <input v-model="projectName" class="plain-input" type="text" />
            </section>

            <section class="batch-card batch-upload-card">
              <input
                ref="batchExteriorInputRef"
                type="file"
                class="batch-upload-input"
                :accept="props.capability.accept"
                multiple
                @change="handleBatchExteriorInputChange"
              />

              <header class="batch-upload-head">
                <div>
                  <h3>上传外观图组</h3>
                  <p>
                    支持一次多选，最多上传 {{ MAX_BATCH_EXTERIOR_IMAGES }} 张。
                  </p>
                </div>
                <span class="batch-upload-count">
                  {{ batchExteriorUploads.length }}/{{
                    MAX_BATCH_EXTERIOR_IMAGES
                  }}
                </span>
              </header>

              <button
                type="button"
                class="batch-upload-drop"
                :class="{ 'is-disabled': !canAddBatchExteriorImages }"
                :disabled="!canAddBatchExteriorImages"
                @click="openBatchExteriorPicker"
                @dragover.prevent
                @drop.prevent="handleBatchExteriorDrop"
              >
                <Icon icon="mdi:camera-plus" />
                <strong>{{
                  batchExteriorUploads.length
                    ? "继续添加外观图"
                    : "上传外观图组"
                }}</strong>
                <span
                  >JPG / PNG / WebP · 剩余
                  {{ batchExteriorRemainingCount }} 张</span
                >
              </button>

              <div v-if="batchExteriorUploads.length" class="batch-upload-grid">
                <article
                  v-for="item in batchExteriorUploads"
                  :key="item.id"
                  class="batch-upload-item"
                  :class="`is-${item.status}`"
                >
                  <PreloadImage
                    class="batch-upload-image"
                    :src="item.previewUrl"
                    :alt="item.name"
                    loading="lazy"
                    decoding="async"
                  />
                  <span
                    v-if="item.status === 'uploading'"
                    class="batch-upload-status"
                  >
                    <Icon icon="mdi:loading" />
                  </span>
                  <span
                    v-else-if="item.status === 'fail'"
                    class="batch-upload-status is-error"
                  >
                    <Icon icon="mdi:alert-circle-outline" />
                  </span>
                  <button
                    type="button"
                    class="batch-upload-remove"
                    :aria-label="`删除${item.name}`"
                    @click="handleBatchExteriorRemove(item.id)"
                  >
                    <Icon icon="mdi:close" />
                  </button>
                </article>
              </div>
            </section>

            <section class="batch-card switch-card">
              <div>
                <h3>同时上传内饰图</h3>
                <p>开启后，每套外观图组可补充内饰图，用于成片交付包。</p>
              </div>
              <NSwitch v-model:value="uploadInterior" size="large" />
            </section>

            <UploadTaskCard
              v-if="uploadInterior"
              compact
              :capability="props.capability"
              upload-title="上传内饰图组"
              upload-hint="用于成片交付中的内饰展示图，可选上传"
              required-label="选填"
              upload-icon="mdi:seat-passenger"
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
                <NSelect
                  v-model:value="selectedPresetKey"
                  class="preset-combobox"
                  :options="visualPresetOptions"
                  :loading="isLoadingVisualPresets"
                  size="large"
                  filterable
                  tag
                  clearable
                  placeholder="输入或选择预设名称"
                />
                <NButton
                  type="primary"
                  size="large"
                  @click="handleSaveVisualPreset"
                >
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
                <NSelect
                  v-model:value="batchSceneCategory"
                  :options="batchSceneCategoryOptions"
                  size="medium"
                  class="scene-category-select"
                />
              </div>
              <div class="scene-grid">
                <article
                  v-for="(scene, index) in batchScenes"
                  :key="scene.optionId"
                  :class="{ active: index === batchSceneIndex }"
                  @click="batchSceneIndex = index"
                >
                  <PreloadImage
                    class="scene-image"
                    :src="scene.image"
                    :alt="scene.title"
                    loading="lazy"
                    decoding="async"
                    :draggable="false"
                  />
                  <strong>{{ scene.title }}</strong>
                </article>
              </div>
            </section>

            <section class="batch-card inline-field">
              <span>输出比例</span>
              <NSelect
                v-model:value="outputRatio"
                :options="outputRatioOptions"
                size="large"
              />
            </section>

            <section class="batch-card batch-logo-card">
              <WorkspaceLogoPanel
                v-model:enabled="useRecentLogo"
                variant="batch"
              />
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
            :loading="batchTab === 'create' && isCreatingBatchTask"
            :disabled="
              batchTab === 'create' &&
              (!createTaskPresetId ||
                !uploadedExteriorAssets.length ||
                isUploadingVehicle)
            "
            @click="handleStickyAction"
          >
            {{
              batchTab === "create" ? "创建批量上新任务" : "保存视觉处理配置"
            }}
            <span v-if="batchTab === 'create'" class="ml-2"
              >预计 {{ batchEstimatedCost }}</span
            >
          </NButton>
        </footer>
      </div>
    </template>

    <template v-else-if="props.capability.code === 'short-video'">
      <section class="batch-card batch-notice short-video-notice">
        上传车辆外观图后创建短视频任务，默认生成 10 秒、16:9、720p 营销视频。
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
                <div class="delivery-thumb-wrap">
                  <PreloadImage
                    v-if="hasDeliveryThumbnail(task)"
                    class="delivery-thumb"
                    :src="task.image"
                    :alt="task.title"
                    loading="lazy"
                    decoding="async"
                    :draggable="false"
                    @error="handleDeliveryThumbError(task.taskId)"
                  />
                  <div
                    v-else
                    class="delivery-thumb delivery-thumb--pending"
                    :class="{ 'is-generating': task.progress < 100 }"
                    aria-hidden="true"
                  >
                    <Icon
                      icon="mdi:image-sync-outline"
                      class="delivery-thumb-pending-icon"
                    />
                    <span>待生成</span>
                  </div>
                </div>

                <div class="delivery-copy">
                  <h3>{{ task.title }}</h3>
                  <p>{{ task.meta }}</p>
                </div>

                <div class="delivery-status">
                  <template v-if="task.progress >= 100">
                    <span
                      class="delivery-status-ring"
                      aria-hidden="true"
                    ></span>
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
                    <strong class="delivery-status-meta"
                      >{{ task.progress }}%</strong
                    >
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
              <button
                type="button"
                class="delivery-link-btn"
                @click="toggleSelectAllDelivery"
              >
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
  display: grid;
  gap: 18px;
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
}

.batch-panel-scroll > * {
  flex-shrink: 0;
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
  border: 1px solid
    color-mix(in srgb, var(--workspace-accent, #efc24c) 28%, var(--app-border));
  border-radius: 12px;
  background: color-mix(
    in srgb,
    var(--workspace-accent, #efc24c) 9%,
    var(--app-surface)
  );
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
  border: 1px solid
    color-mix(in srgb, var(--workspace-accent, #efc24c) 18%, var(--app-border));
  border-radius: 12px;
  background:
    linear-gradient(
      135deg,
      color-mix(
          in srgb,
          var(--workspace-accent, #efc24c) 9%,
          var(--app-surface)
        )
        0%,
      var(--app-surface) 58%
    ),
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
  background: color-mix(
    in srgb,
    var(--workspace-accent, #efc24c) 14%,
    var(--app-surface-soft)
  );
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
  border-color: color-mix(
    in srgb,
    var(--workspace-accent, #efc24c) 28%,
    var(--app-border)
  );
  background: color-mix(
    in srgb,
    var(--workspace-accent, #efc24c) 10%,
    var(--app-surface-soft)
  );
  color: var(--workspace-accent-strong, #a86d00);
}

.preset-tag.is-ratio {
  border-color: color-mix(
    in srgb,
    var(--workspace-accent, #efc24c) 24%,
    var(--app-border)
  );
  background: color-mix(
    in srgb,
    var(--workspace-accent, #efc24c) 9%,
    var(--app-surface-soft)
  );
  color: var(--workspace-accent-strong, #a86d00);
}

.preset-tag.is-on {
  border-color: color-mix(
    in srgb,
    var(--workspace-accent, #efc24c) 30%,
    var(--app-border)
  );
  background: color-mix(
    in srgb,
    var(--workspace-accent, #efc24c) 12%,
    var(--app-surface-soft)
  );
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
  border: 1px solid
    color-mix(in srgb, var(--workspace-accent, #efc24c) 24%, var(--app-border));
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

.batch-upload-card {
  display: grid;
  gap: 14px;
}

.batch-upload-input {
  display: none;
}

.batch-upload-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.batch-upload-head h3 {
  margin-bottom: 6px;
}

.batch-upload-head p {
  margin: 0;
  color: var(--app-text-soft);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
}

.batch-upload-count {
  display: inline-flex;
  min-width: 54px;
  height: 30px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 999px;
  background: color-mix(
    in srgb,
    var(--workspace-accent, #efc24c) 16%,
    var(--app-surface)
  );
  color: var(--workspace-accent-strong, #a86d00);
  font-size: 13px;
  font-weight: 900;
}

.batch-upload-drop {
  display: grid;
  min-height: 148px;
  place-items: center;
  align-content: center;
  gap: 8px;
  border: 1px dashed
    color-mix(in srgb, var(--workspace-accent, #efc24c) 48%, var(--app-border));
  border-radius: 12px;
  background: color-mix(
    in srgb,
    var(--app-surface) 92%,
    var(--workspace-accent, #efc24c) 8%
  );
  color: var(--app-text);
  padding: 22px 16px;
  font-family: inherit;
  text-align: center;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;
}

.batch-upload-drop:hover:not(:disabled) {
  border-color: color-mix(
    in srgb,
    var(--workspace-accent, #efc24c) 72%,
    var(--app-border)
  );
  background: color-mix(
    in srgb,
    var(--app-surface) 88%,
    var(--workspace-accent, #efc24c) 12%
  );
  transform: translateY(-1px);
}

.batch-upload-drop.is-disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.batch-upload-drop .iconify {
  color: var(--workspace-accent-strong, #a86d00);
  font-size: 32px;
}

.batch-upload-drop strong {
  color: var(--app-text);
  font-size: 17px;
  font-weight: 900;
  line-height: 1.35;
}

.batch-upload-drop span {
  color: var(--app-text-soft);
  font-size: 13px;
  font-weight: 700;
}

.batch-upload-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(86px, 1fr));
  gap: 10px;
}

.batch-upload-item {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border: 1px solid
    color-mix(in srgb, var(--workspace-accent, #efc24c) 24%, var(--app-border));
  border-radius: 10px;
  background: var(--app-surface-soft);
}

.batch-upload-item.is-fail {
  border-color: color-mix(in srgb, #e25555 70%, var(--app-border));
}

.batch-upload-image {
  width: 100%;
  height: 100%;
}

.batch-upload-status,
.batch-upload-remove {
  position: absolute;
  display: grid;
  place-items: center;
  border-radius: 999px;
}

.batch-upload-status {
  left: 8px;
  top: 8px;
  width: 28px;
  height: 28px;
  background: color-mix(
    in srgb,
    var(--workspace-panel-deep, #101010) 74%,
    transparent
  );
  color: #fff;
  font-size: 18px;
}

.batch-upload-status .iconify {
  animation: batch-upload-spin 0.9s linear infinite;
}

.batch-upload-status.is-error {
  background: rgba(226, 85, 85, 0.9);
}

.batch-upload-status.is-error .iconify {
  animation: none;
}

.batch-upload-remove {
  right: 8px;
  top: 8px;
  width: 28px;
  height: 28px;
  border: 0;
  background: color-mix(
    in srgb,
    var(--workspace-panel-deep, #101010) 74%,
    transparent
  );
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.2s ease;
}

.batch-upload-remove:hover {
  background: rgba(220, 38, 38, 0.9);
  transform: scale(1.04);
}

@keyframes batch-upload-spin {
  to {
    transform: rotate(360deg);
  }
}

.plain-input:hover {
  border-color: color-mix(
    in srgb,
    var(--workspace-accent, #efc24c) 38%,
    var(--app-border)
  );
}

.plain-input:focus {
  border-color: color-mix(
    in srgb,
    var(--workspace-accent, #efc24c) 58%,
    var(--app-border)
  );
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, #fff 80%, transparent),
    0 0 0 3px
      color-mix(in srgb, var(--workspace-accent, #efc24c) 14%, transparent);
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
    0 0 0 3px
      color-mix(in srgb, var(--workspace-accent, #efc24c) 22%, transparent);
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
  border: 1px solid
    color-mix(in srgb, var(--workspace-accent, #efc24c) 24%, var(--app-border));
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

.scene-head button,
.scene-category-select {
  width: 148px;
}

.scene-category-select :deep(.n-base-selection) {
  --n-height: 38px !important;
  --n-border-radius: 8px !important;
  --n-border: 1px solid var(--app-border) !important;
  --n-color: var(--app-surface) !important;
  --n-text-color: var(--workspace-accent-strong, #a86d00) !important;
  --n-arrow-color: var(--workspace-accent-strong, #a86d00) !important;
  font-weight: 800;
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
  box-shadow: 0 0 0 2px
    color-mix(in srgb, var(--workspace-accent, #efc24c) 14%, transparent);
}

.scene-image {
  width: 100%;
  height: clamp(96px, 28cqw, 132px);
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
  border-bottom: 1px solid
    color-mix(in srgb, var(--app-border) 88%, transparent);
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
  background: color-mix(
    in srgb,
    var(--workspace-accent, #efc24c) 4%,
    var(--app-surface)
  );
}

.delivery-item.is-checked {
  background: color-mix(
    in srgb,
    var(--workspace-accent, #efc24c) 6%,
    var(--app-surface-soft)
  );
}

.delivery-item.is-previewing {
  background: color-mix(
    in srgb,
    var(--workspace-accent, #efc24c) 9%,
    var(--app-surface-soft)
  );
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
  box-shadow: inset 0 0 0 2px
    color-mix(in srgb, var(--workspace-accent, #efc24c) 22%, transparent);
}

.delivery-item:last-child {
  border-bottom: 0;
}

.delivery-thumb-wrap {
  width: 72px;
  height: 56px;
  flex-shrink: 0;
}

.delivery-thumb {
  width: 72px;
  height: 56px;
  border: 1px solid color-mix(in srgb, var(--app-border) 80%, transparent);
  border-radius: 10px;
  background: var(--app-surface-soft);
}

.delivery-thumb--pending {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 4px;
  border-style: dashed;
  background: linear-gradient(
    145deg,
    color-mix(
      in srgb,
      var(--workspace-accent, #efc24c) 8%,
      var(--app-surface-soft)
    ),
    var(--app-surface-soft)
  );
  color: var(--app-text-soft);
}

.delivery-thumb--pending.is-generating .delivery-thumb-pending-icon {
  animation: delivery-thumb-pulse 1.4s ease-in-out infinite;
}

.delivery-thumb-pending-icon {
  font-size: 18px;
  color: var(--workspace-accent, #efc24c);
  opacity: 0.88;
}

.delivery-thumb--pending span {
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.02em;
}

@keyframes delivery-thumb-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.72;
  }

  50% {
    transform: scale(1.06);
    opacity: 1;
  }
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
  background: color-mix(
    in srgb,
    var(--workspace-accent, #efc24c) 8%,
    transparent
  );
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
  background: color-mix(
    in srgb,
    var(--app-surface-soft) 72%,
    var(--app-surface)
  );
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
    conic-gradient(
      var(--workspace-accent-strong, #ffd75a) var(--progress),
      rgba(255, 255, 255, 0.12) 0
    );
}

:global(.workspace-page.theme-light) .batch-card,
:global(.workspace-page.theme-light) .batch-notice {
  border-color: var(--workspace-line, #e8edf5);
  background: var(--workspace-panel-soft, #f7fafd);
  color: var(--workspace-text-secondary, #334155);
}

:global(.workspace-page.theme-light) .batch-tabs button.active,
:global(.workspace-page.theme-light) .delivery-tabs button.active {
  color: var(--workspace-accent, #2f6bff);
}

:global(.workspace-page.theme-light) .batch-tabs button.active::after,
:global(.workspace-page.theme-light) .delivery-tabs button.active::after {
  background: var(--workspace-accent-underline, #4f7fff);
}

:global(.workspace-page.theme-light) .preset-summary {
  border-color: var(--workspace-line, #e8edf5);
  background:
    linear-gradient(
      135deg,
      var(--workspace-accent-bg, #f2f7ff) 0%,
      var(--app-surface) 58%
    ),
    var(--app-surface);
}

:global(.workspace-page.theme-light) .preset-tag.is-scene,
:global(.workspace-page.theme-light) .preset-tag.is-ratio,
:global(.workspace-page.theme-light) .preset-tag.is-on {
  border-color: var(--workspace-accent-border, #cfe0ff);
  background: var(--workspace-accent-bg, #f2f7ff);
  color: var(--workspace-accent, #2f6bff);
}

:global(.workspace-page.theme-light) .scene-grid article.active {
  border-color: var(--workspace-accent, #2f6bff);
  box-shadow: 0 0 0 2px var(--workspace-accent-glow, rgba(47, 107, 255, 0.16));
}

:global(.workspace-page.theme-light) .delivery-item.is-checked {
  background: var(--workspace-accent-bg, #f2f7ff);
}

:global(.workspace-page.theme-light) .delivery-item.is-previewing {
  background: var(--workspace-accent-bg, #f2f7ff);
  box-shadow: inset 3px 0 0 var(--workspace-accent, #2f6bff);
}

:global(.workspace-page.theme-light) .delivery-item:hover {
  background: var(--workspace-hover-bg, #f3f7fc);
}
</style>
