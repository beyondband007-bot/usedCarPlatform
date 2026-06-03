<script setup lang="ts">
import { computed, h, onMounted, onUnmounted, ref, watch } from "vue";
import { Icon } from "@iconify/vue";
import { NButton, NPopconfirm, NSelect, NSwitch, useMessage } from "naive-ui";

import {
  createBatchTask,
  deleteDeliveryTasks,
  getDeliveryTaskAssets,
  getDeliveryTasks,
  uploadAsset,
  type BatchVisualConfig,
  type DeliveryAsset,
  type DeliveryInputCover,
  type DeliveryTaskItem,
  type UploadedAsset,
} from "@/api/visual-workbench";
import {
  DEFAULT_BATCH_OUTPUT_RATIO,
  DEFAULT_GENERATION_OUTPUT_RATIO,
  getOutputRatioOptionLabel,
  outputRatioSelectOptions,
} from "@/constants/output-ratio";
import {
  batchSceneCategoryOptions,
  getBatchSceneImageUrl,
  getBatchSceneOptionId,
  getBatchScenesByCategory,
  getBatchSceneTitle,
} from "@/constants/workspace";
import { useBatchVisualTemplates } from "@/composables/useBatchVisualTemplates";
import { useWorkspaceLogo } from "@/composables/useWorkspaceLogo";
import { formatDate } from "@/utils/dayjs";
import { downloadFilesAsZip, sanitizeFilename } from "@/utils/download";
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
import GenerateActionFooter from "@/components/business/workspace/GenerateActionFooter.vue";
import PaintColorPicker from "@/components/business/workspace/PaintColorPicker.vue";
import UploadTaskCard from "@/components/business/workspace/UploadTaskCard.vue";
import WorkspaceLogoPanel from "@/components/business/workspace/WorkspaceLogoPanel.vue";

const props = defineProps<{
  capability: WorkspaceCapability;
  selectedOptionId: string;
  isGenerating?: boolean;
  previewedDeliveryTaskId?: string | null;
  canCreateBatchTask?: () => boolean | Promise<boolean>;
}>();

const emit = defineEmits<{
  selectOption: [id: string];
  generate: [payload: WorkspaceGeneratePayload];
  previewDeliveryTask: [task: WorkspaceDeliveryTaskPreview | null];
  deliveryListLoadingChange: [loading: boolean];
  batchCreated: [payload: WorkspaceBatchCreatedPayload];
}>();

const message = useMessage();
const {
  NEW_PRESET_VALUE,
  templates: visualTemplates,
  getTemplateById,
  saveTemplate,
  updateTemplate,
  deleteTemplate,
  ensureLoaded,
  isLoading: isLoadingVisualPresets,
} = useBatchVisualTemplates();

const useLogo = ref(false);
const { recentLogo } = useWorkspaceLogo();
const paintColorCode = ref("");
const batchPaintColorCode = ref("");
const outputRatio = ref<string>(DEFAULT_GENERATION_OUTPUT_RATIO);
const batchTab = ref<"create" | "visual">("create");
const uploadInterior = ref(false);
const enableSceneChange = ref(false);
const batchSceneIndex = ref(0);
const batchSceneCategory = ref("展厅灯光");
const batchScenes = computed(() =>
  getBatchScenesByCategory(batchSceneCategory.value),
);
const useRecentLogo = ref(false);
const lightConsistency = ref(true);
const paintRefresh = ref(false);
const interiorEnhance = ref(false);
const interiorCollage = ref(false);
const projectName = ref("");
const createTaskPresetId = ref(visualTemplates.value[0]?.id ?? "");
const visualPreset = ref(visualTemplates.value[0]?.id ?? NEW_PRESET_VALUE);
const presetInput = ref(visualTemplates.value[0]?.name ?? "");
const isApplyingTemplate = ref(false);
const uploadedAsset = ref<UploadedAsset | null>(null);
const batchExteriorUploads = ref<BatchExteriorUploadItem[]>([]);
const uploadedPreviewUrl = ref<string | null>(null);
const isUploadingVehicle = ref(false);
const isUploadingInterior = ref(false);
const deliveryTaskAssets = ref<Record<string, DeliveryAsset[]>>({});
const deliveryInputCovers = ref<Record<string, DeliveryInputCover[]>>({});
const deliveryTaskThumbUrl = ref<Record<string, string>>({});
const activeDeliveryTaskId = ref<string | null>(null);
const isLoadingDeliveryTasks = ref(false);
const isLoadingDeliveryAssets = ref(false);
const isCreatingBatchTask = ref(false);
const isDeletingDeliveryAssets = ref(false);
const deletingPresetIds = ref<Set<string>>(new Set());
const lastCreatedBatchId = ref<string | null>(null);
const batchExteriorInputRef = ref<HTMLInputElement | null>(null);
const interiorCollageInputRef = ref<HTMLInputElement | null>(null);
const MAX_BATCH_EXTERIOR_IMAGES = 5;
const MIN_INTERIOR_COLLAGE_IMAGES = 2;
const MAX_INTERIOR_COLLAGE_IMAGES = 10;
const BATCH_DELIVERY_SNAPSHOT_STORAGE_KEY = "workspace:batch-delivery-snapshots";

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

type InteriorCollageUploadItem = BatchExteriorUploadItem;

interface BatchDeliverySnapshotAsset {
  assetId: string;
  url: string;
  thumbnailUrl?: string;
  fileName: string;
}

interface BatchDeliverySnapshot {
  batchId: string;
  projectName: string;
  outputRatio: string;
  interiorEnabled: boolean;
  interiorCollage: boolean;
  exteriorAssets: BatchDeliverySnapshotAsset[];
  interiorAssets: BatchDeliverySnapshotAsset[];
  createdAt: string;
}

const interiorCollageUploads = ref<InteriorCollageUploadItem[]>([]);
const batchDeliverySnapshots = ref<Record<string, BatchDeliverySnapshot>>(
  loadBatchDeliverySnapshots(),
);

function loadBatchDeliverySnapshots() {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.sessionStorage.getItem(
      BATCH_DELIVERY_SNAPSHOT_STORAGE_KEY,
    );
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, BatchDeliverySnapshot>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function persistBatchDeliverySnapshots() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      BATCH_DELIVERY_SNAPSHOT_STORAGE_KEY,
      JSON.stringify(batchDeliverySnapshots.value),
    );
  } catch {
    // Session persistence is a display enhancement; ignore storage failures.
  }
}

function toBatchDeliverySnapshotAsset(
  asset: UploadedAsset,
): BatchDeliverySnapshotAsset {
  return {
    assetId: asset.assetId,
    url: asset.url,
    thumbnailUrl: asset.thumbnailUrl ?? undefined,
    fileName: asset.fileName,
  };
}

function saveBatchDeliverySnapshot(snapshot: BatchDeliverySnapshot) {
  batchDeliverySnapshots.value = {
    ...batchDeliverySnapshots.value,
    [snapshot.batchId]: snapshot,
  };
  persistBatchDeliverySnapshots();
}

function removeBatchDeliverySnapshots(taskIds: string[]) {
  if (!taskIds.length) return;

  const next = { ...batchDeliverySnapshots.value };
  let changed = false;

  for (const taskId of taskIds) {
    if (!next[taskId]) continue;
    delete next[taskId];
    changed = true;
  }

  if (!changed) return;

  batchDeliverySnapshots.value = next;
  persistBatchDeliverySnapshots();
}

function getBatchDeliverySnapshot(taskId: string) {
  return batchDeliverySnapshots.value[taskId];
}

function getSnapshotInteriorDisplayAssets(snapshot?: BatchDeliverySnapshot) {
  if (!snapshot?.interiorEnabled || !snapshot.interiorAssets.length) return [];
  return snapshot.interiorCollage
    ? snapshot.interiorAssets.slice(0, 1)
    : snapshot.interiorAssets;
}

function getSnapshotDisplayTotal(snapshot?: BatchDeliverySnapshot) {
  if (!snapshot) return null;
  return (
    snapshot.exteriorAssets.length +
    getSnapshotInteriorDisplayAssets(snapshot).length
  );
}

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

function resetInteriorCollageUploads() {
  interiorCollageUploads.value.forEach(revokeBatchExteriorObjectUrl);
  interiorCollageUploads.value = [];
}

function resetBatchCreateSection() {
  resetBatchExteriorUploads();
  resetInteriorCollageUploads();
  uploadInterior.value = false;
  projectName.value = "";
}

function resetUploadedInterior() {
  resetInteriorCollageUploads();
}

type BatchPresetSelectOption = {
  label: string;
  value: string;
  template: BatchVisualTemplate;
};

const toPresetSelectOption = (
  item: BatchVisualTemplate,
): BatchPresetSelectOption => ({
    label: item.name,
    value: item.id,
    template: item,
  });

const visualPresetOptions = computed(() =>
  visualTemplates.value.map(toPresetSelectOption),
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
  visualTemplates.value.map(toPresetSelectOption),
);

function setPresetDeleting(id: string, deleting: boolean) {
  const next = new Set(deletingPresetIds.value);
  if (deleting) {
    next.add(id);
  } else {
    next.delete(id);
  }
  deletingPresetIds.value = next;
}

function syncSelectionAfterPresetDeleted(
  deletedId: string,
  remainingTemplates: BatchVisualTemplate[],
) {
  const fallbackId = remainingTemplates[0]?.id ?? "";

  if (createTaskPresetId.value === deletedId) {
    createTaskPresetId.value = fallbackId;
  }

  if (visualPreset.value === deletedId) {
    if (fallbackId) {
      const fallback = remainingTemplates[0];
      visualPreset.value = fallback.id;
      presetInput.value = fallback.name;
      applyTemplate(fallback);
    } else {
      resetVisualConfigSelection();
    }
  }
}

async function handleDeletePreset(template: BatchVisualTemplate) {
  if (deletingPresetIds.value.has(template.id)) return;

  setPresetDeleting(template.id, true);
  try {
    const remainingTemplates = await deleteTemplate(template.id);
    syncSelectionAfterPresetDeleted(template.id, remainingTemplates);
    message.success("预设已删除");
  } catch (error) {
    const text = error instanceof Error ? error.message : "预设删除失败，请重试";
    message.error(text);
  } finally {
    setPresetDeleting(template.id, false);
  }
}

function renderPresetOptionLabel(option: {
  label?: string;
  value?: string | number;
  template?: BatchVisualTemplate;
}) {
  const template = option.template;
  const label = String(option.label ?? "");

  if (!template) {
    return h("span", { class: "preset-select-option-name" }, label);
  }

  const isDeleting = deletingPresetIds.value.has(template.id);

  return h("div", { class: "preset-select-option" }, [
    h("span", { class: "preset-select-option-name" }, label),
    h(
      NPopconfirm,
      {
        positiveText: "删除",
        negativeText: "取消",
        placement: "right",
        onPositiveClick: () => handleDeletePreset(template),
      },
      {
        default: () => `删除预设「${template.name}」？删除后不可恢复。`,
        trigger: () =>
          h(
            "button",
            {
              type: "button",
              class: [
                "preset-option-delete",
                isDeleting ? "is-deleting" : "",
              ],
              disabled: isDeleting,
              "aria-label": `删除预设${template.name}`,
              title: "删除预设",
              onMousedown: (event: MouseEvent) => {
                event.preventDefault();
                event.stopPropagation();
              },
              onClick: (event: MouseEvent) => {
                event.stopPropagation();
              },
            },
            [
              h(Icon, {
                icon: isDeleting ? "mdi:loading" : "mdi:trash-can-outline",
              }),
            ],
          ),
      },
    ),
  ]);
}

const activeCreateTemplate = computed(() =>
  createTaskPresetId.value
    ? getTemplateById(createTaskPresetId.value)
    : undefined,
);

const showCreateInteriorUpload = computed(() =>
  Boolean(activeCreateTemplate.value?.interiorCollage),
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
  () =>
    batchExteriorRemainingCount.value > 0 &&
    !isUploadingVehicle.value &&
    !props.isGenerating,
);

const uploadedInteriorCollageAssets = computed(() =>
  interiorCollageUploads.value
    .filter(
      (item): item is InteriorCollageUploadItem & { asset: UploadedAsset } =>
        item.status === "success" && Boolean(item.asset),
    )
    .map((item) => item.asset),
);

const interiorCollageRemainingCount = computed(() =>
  Math.max(
    0,
    MAX_INTERIOR_COLLAGE_IMAGES - interiorCollageUploads.value.length,
  ),
);

const canAddInteriorCollageImages = computed(
  () =>
    interiorCollageRemainingCount.value > 0 &&
    !isUploadingInterior.value &&
    !props.isGenerating,
);

const batchEstimatedCost = computed(() => {
  const inputCount =
    uploadedExteriorAssets.value.length +
    (uploadInterior.value ? uploadedInteriorCollageAssets.value.length : 0);
  const itemCost =
    30 + (lightConsistency.value ? 10 : 0) + (paintRefresh.value ? 10 : 0);

  return inputCount * itemCost;
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
    colorCode: paintRefresh.value ? batchPaintColorCode.value.trim() || null : null,
    interiorEnhance: interiorCollage.value && interiorEnhance.value,
    interiorCollage: interiorCollage.value,
  };
}

function mapBatchVisualConfigFromTemplate(
  template: BatchVisualTemplate,
): BatchVisualConfig {
  return {
    enableSceneChange: template.enableSceneChange,
    sceneOptionId: template.enableSceneChange
      ? getBatchSceneOptionId(template.sceneCategory, template.sceneIndex)
      : undefined,
    sceneReferenceImageUrl: template.enableSceneChange
      ? getBatchSceneImageUrl(template.sceneCategory, template.sceneIndex)
      : undefined,
    sceneIndex: template.sceneIndex,
    sceneCategory: template.sceneCategory,
    outputRatio: template.outputRatio,
    useRecentLogo: template.useRecentLogo,
    enableLightConsistency: template.lightConsistency,
    enablePaintRefresh: template.paintRefresh,
    colorCode: template.paintRefresh ? template.colorCode?.trim() || null : null,
    enableInteriorClean: template.interiorCollage && template.interiorEnhance,
    enableInteriorCollage: template.interiorCollage,
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
  batchPaintColorCode.value = template.colorCode ?? "";
  interiorCollage.value = template.interiorCollage;
  interiorEnhance.value = template.interiorCollage && template.interiorEnhance;
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
  outputRatio.value = DEFAULT_BATCH_OUTPUT_RATIO;
  useRecentLogo.value = false;
  lightConsistency.value = true;
  paintRefresh.value = false;
  batchPaintColorCode.value = "";
  interiorEnhance.value = false;
  interiorCollage.value = false;
  isApplyingTemplate.value = false;
}

watch(presetInput, (value) => {
  syncPresetSelectionFromInput(value);
});

watch(batchSceneCategory, () => {
  if (isApplyingTemplate.value) return;
  batchSceneIndex.value = 0;
});

watch(paintRefresh, (enabled) => {
  if (isApplyingTemplate.value || enabled) return;
  batchPaintColorCode.value = "";
});

watch(interiorCollage, (enabled) => {
  if (isApplyingTemplate.value || enabled) return;
  interiorEnhance.value = false;
});

watch(showCreateInteriorUpload, (enabled) => {
  if (enabled) return;
  uploadInterior.value = false;
  resetInteriorCollageUploads();
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
  if (props.isGenerating) {
    message.warning("当前任务生成中，请等待完成后再上传图片");
    return;
  }

  revokePreviewObjectUrl();
  previewObjectUrl = URL.createObjectURL(file);
  uploadedPreviewUrl.value = previewObjectUrl;
  isUploadingVehicle.value = true;

  try {
    const purpose =
      props.capability.kind === "interior" ? "car_interior" : "car_exterior";
    const asset = await uploadAsset(file, purpose);
    uploadedAsset.value = asset;
    revokePreviewObjectUrl();
    uploadedPreviewUrl.value = asset.url;
    message.success(
      props.capability.kind === "interior"
        ? "内饰图片上传成功"
        : "车辆图片上传成功",
    );
  } catch (error) {
    resetUploadedVehicle();
    const text =
      error instanceof Error
        ? error.message
        : props.capability.kind === "interior"
          ? "内饰图片上传失败"
          : "车辆图片上传失败";
    message.error(text);
  } finally {
    isUploadingVehicle.value = false;
  }
}

function handleVehicleImageRemove() {
  if (props.isGenerating) {
    message.warning("当前任务生成中，请等待完成后再更换图片");
    return;
  }

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
  if (props.isGenerating) {
    message.warning("当前任务生成中，请等待完成后再上传图片");
    return;
  }

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
  if (props.isGenerating) return;

  const target = batchExteriorUploads.value.find((item) => item.id === id);
  if (target) {
    revokeBatchExteriorObjectUrl(target);
  }

  batchExteriorUploads.value = batchExteriorUploads.value.filter(
    (item) => item.id !== id,
  );
}

function updateInteriorCollageUpload(
  id: string,
  patch: Partial<InteriorCollageUploadItem>,
) {
  const index = interiorCollageUploads.value.findIndex(
    (item) => item.id === id,
  );
  if (index < 0) return;

  interiorCollageUploads.value[index] = {
    ...interiorCollageUploads.value[index],
    ...patch,
  };
}

function openInteriorCollagePicker() {
  if (!canAddInteriorCollageImages.value) return;
  interiorCollageInputRef.value?.click();
}

async function handleInteriorCollageFilesSelected(files: File[]) {
  if (props.isGenerating) {
    message.warning("当前任务生成中，请等待完成后再上传图片");
    return;
  }

  const imageFiles = normalizeImageFiles(files);

  if (!imageFiles.length) {
    message.warning("请选择 JPG、PNG 或 WebP 图片");
    return;
  }

  const remaining = interiorCollageRemainingCount.value;
  if (remaining <= 0) {
    message.warning(`内饰图最多上传 ${MAX_INTERIOR_COLLAGE_IMAGES} 张`);
    return;
  }

  const selectedFiles = imageFiles.slice(0, remaining);
  if (imageFiles.length > remaining) {
    message.warning(
      `最多支持 ${MAX_INTERIOR_COLLAGE_IMAGES} 张，已自动保留前 ${remaining} 张`,
    );
  }

  const pendingItems = selectedFiles.map(createBatchExteriorUploadItem);
  interiorCollageUploads.value = [
    ...interiorCollageUploads.value,
    ...pendingItems,
  ];
  isUploadingInterior.value = true;

  const results = await Promise.allSettled(
    pendingItems.map(async (item, index) => {
      const asset = await uploadAsset(selectedFiles[index], "car_interior");
      revokeBatchExteriorObjectUrl(item);
      updateInteriorCollageUpload(item.id, {
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

    updateInteriorCollageUpload(pendingItems[index].id, {
      status: "fail",
      error:
        result.reason instanceof Error ? result.reason.message : "上传失败",
    });
  });

  if (successCount > 0) {
    message.success(`已上传 ${successCount} 张内饰图`);
  }

  const failedCount = results.length - successCount;
  if (failedCount > 0) {
    message.error(`${failedCount} 张内饰图上传失败，请删除后重试`);
  }

  isUploadingInterior.value = false;
}

function handleInteriorCollageInputChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = "";

  void handleInteriorCollageFilesSelected(files);
}

function handleInteriorCollageDrop(event: DragEvent) {
  if (!canAddInteriorCollageImages.value) return;
  const files = Array.from(event.dataTransfer?.files ?? []);
  void handleInteriorCollageFilesSelected(files);
}

function handleInteriorCollageRemove(id: string) {
  if (props.isGenerating) return;

  const target = interiorCollageUploads.value.find((item) => item.id === id);
  if (target) {
    revokeBatchExteriorObjectUrl(target);
  }

  interiorCollageUploads.value = interiorCollageUploads.value.filter(
    (item) => item.id !== id,
  );
}

function handleInteriorImageRemove() {
  if (props.isGenerating) return;

  resetUploadedInterior();
  message.info("已清空内饰图");
}

function validateBatchInteriorAssets(template: BatchVisualTemplate) {
  if (!template.interiorCollage) {
    return true;
  }

  if (!uploadInterior.value) {
    message.warning("当前预设已开启内饰拼接，请同时上传内饰图");
    return false;
  }

  const interiorAssetIds = uploadedInteriorCollageAssets.value.map(
    (asset) => asset.assetId,
  );

  if (!interiorAssetIds.length) {
    message.warning("请先上传内饰图");
    return false;
  }

  if (
    interiorAssetIds.length < MIN_INTERIOR_COLLAGE_IMAGES ||
    interiorAssetIds.length > MAX_INTERIOR_COLLAGE_IMAGES
  ) {
    message.warning(
      `开启内饰拼接需要上传 ${MIN_INTERIOR_COLLAGE_IMAGES}-${MAX_INTERIOR_COLLAGE_IMAGES} 张内饰图`,
    );
    return false;
  }

  return true;
}

function handleGenerate() {
  if (props.capability.code === "interior-stitch") {
    const assetIds = uploadedInteriorCollageAssets.value.map(
      (asset) => asset.assetId,
    );

    if (assetIds.length < MIN_INTERIOR_COLLAGE_IMAGES) {
      message.warning(`请至少上传 ${MIN_INTERIOR_COLLAGE_IMAGES} 张内饰图`);
      return;
    }

    emit("generate", {
      assetIds,
      outputRatio: outputRatio.value,
      resolution: "2K",
    });
    return;
  }

  if (!uploadedAsset.value) {
    message.warning("Please select completed tasks first");
    return;
  }

  emit("generate", {
    inputAssetId: uploadedAsset.value.assetId,
    outputRatio: outputRatio.value,
    optionId:
      props.capability.kind === "scene" ? props.selectedOptionId : undefined,
    sceneReferenceImageUrl:
      props.capability.kind === "scene"
        ? props.capability.options.find((item) => item.id === props.selectedOptionId)
            ?.image
        : undefined,
    useLogo: props.capability.kind === "scene" ? useLogo.value : undefined,
    logoAssetId:
      props.capability.kind === "scene" &&
      useLogo.value &&
      recentLogo.value?.assetId
        ? recentLogo.value.assetId
        : undefined,
    colorCode:
      props.capability.code === "paint-refresh"
        ? paintColorCode.value || undefined
        : undefined,
  });
}

async function handleCreateBatchTask() {
  if (isUploadingVehicle.value || isUploadingInterior.value) {
    message.warning("图片仍在上传，请稍候");
    return;
  }

  if (!uploadedExteriorAssets.value.length) {
    message.warning("请先上传外观图组");
    return;
  }

  if (!projectName.value.trim()) {
    message.warning("请输入项目名称");
    return;
  }

  if (!createTaskPresetId.value) {
    message.warning("请先选择或保存视觉预设");
    return;
  }

  const template = getTemplateById(createTaskPresetId.value);
  if (!template) {
    message.warning("视觉预设不存在，请重新选择");
    return;
  }

  if (!validateBatchInteriorAssets(template)) {
    return;
  }

  if (props.canCreateBatchTask && !(await props.canCreateBatchTask())) {
    return;
  }

  isCreatingBatchTask.value = true;

  try {
    const exteriorAssets = uploadedExteriorAssets.value;
    const interiorAssets = uploadInterior.value
      ? uploadedInteriorCollageAssets.value
      : [];
    const interiorAssetIds = uploadInterior.value
      ? interiorAssets.map((item) => item.assetId)
      : [];

    const visualConfig = mapBatchVisualConfigFromTemplate(template);
    const normalizedProjectName = projectName.value.trim();

    const created = await createBatchTask({
      projectName: normalizedProjectName,
      presetId: createTaskPresetId.value,
      carGroups: [
        {
          groupTitle: normalizedProjectName || "车辆图组",
          exteriorAssetIds: exteriorAssets.map((item) => item.assetId),
          interiorAssetIds,
        },
      ],
      visualConfig,
    });

    lastCreatedBatchId.value = created.batchId;
    saveBatchDeliverySnapshot({
      batchId: created.batchId,
      projectName: normalizedProjectName,
      outputRatio: visualConfig.outputRatio,
      interiorEnabled: uploadInterior.value,
      interiorCollage: Boolean(visualConfig.enableInteriorCollage),
      exteriorAssets: exteriorAssets.map(toBatchDeliverySnapshotAsset),
      interiorAssets: interiorAssets.map(toBatchDeliverySnapshotAsset),
      createdAt: created.createdAt,
    });
    message.success("批量任务创建中");
    emit("batchCreated", {
      batchId: created.batchId,
      projectName: normalizedProjectName,
      previewUrl: batchExteriorFirstPreviewUrl.value,
      createdAt: created.createdAt,
      status: created.status,
      total: created.total,
      completed: created.completed,
      failed: created.failed,
      progress: created.progress,
    });
    resetBatchCreateSection();
  } catch (error) {
    const text = error instanceof Error ? error.message : "批量任务创建失败";
    message.error(text);
  } finally {
    isCreatingBatchTask.value = false;
  }
}

async function syncDeliveryTaskPreview() {
  if (props.capability.kind !== "delivery") return;

  const tasks = deliveryTasks.value;
  if (!tasks.length) {
    activeDeliveryTaskId.value = null;
    emit("previewDeliveryTask", null);
    return;
  }

  const activeId = activeDeliveryTaskId.value;
  const target =
    (activeId
      ? tasks.find((task) => task.taskId === activeId)
      : undefined) ?? tasks[0];

  activeDeliveryTaskId.value = target.taskId;
  await emitDeliveryTaskPreview(target);
}

async function refreshDeliveryTasks(options?: { silent?: boolean }) {
  const silent = options?.silent ?? false;

  if (!silent) {
    isLoadingDeliveryTasks.value = true;
    emit("deliveryListLoadingChange", true);
  }

  try {
    const shouldRefresh =
      Boolean(options?.silent) && hasInProgressDeliveryTasks();
    const result = await getDeliveryTasks({
      page: 1,
      pageSize: 20,
      refresh: shouldRefresh,
    });
    const selectedByTaskId = new Map(
      deliveryTasks.value.map((task) => [task.taskId, task.selected]),
    );
    deliveryTasks.value = await Promise.all(
      result.items.map(async (item) => {
        const snapshot = getBatchDeliverySnapshot(item.taskId);
        const metrics = buildDeliveryTaskMetrics(item, snapshot);
        const imageCount = metrics.deliveryTotal;

        return {
          ...item,
          ...metrics,
          displayTitle: buildDeliveryDisplayTitle(item),
          selected: Boolean(selectedByTaskId.get(item.taskId)),
          image: await resolveDeliveryTaskImage(item, snapshot),
          imageCount,
          deliverySnapshot: snapshot,
        };
      }),
    );
    if (!silent) {
      brokenDeliveryThumbs.value = new Set();
      deliveryTaskThumbUrl.value = {};
    }

    if (props.capability.kind === "delivery") {
      await syncDeliveryTaskPreview();
    }
  } catch (error) {
    const text =
      error instanceof Error ? error.message : "成片交付列表加载失败";
    message.error(text);
  } finally {
    if (!silent) {
      isLoadingDeliveryTasks.value = false;
      emit("deliveryListLoadingChange", false);
    }
  }
}

async function loadDeliveryAssets(
  taskId: string,
  options?: { refresh?: boolean },
) {
  isLoadingDeliveryAssets.value = true;

  try {
    const result = await getDeliveryTaskAssets(taskId, {
      page: 1,
      pageSize: 200,
      refresh: options?.refresh ?? false,
    });
    deliveryTaskAssets.value = {
      ...deliveryTaskAssets.value,
      [taskId]: result.items,
    };
    deliveryInputCovers.value = {
      ...deliveryInputCovers.value,
      [taskId]: result.inputCovers ?? [],
    };
    return result.items;
  } finally {
    isLoadingDeliveryAssets.value = false;
  }
}

function getExpectedDeliveryAssetCount(task: {
  assetCount: number;
}) {
  return Math.max(task.assetCount, 0);
}

function isDeliveryAssetsCacheComplete(
  taskId: string,
  expectedCount: number,
) {
  const cached = deliveryTaskAssets.value[taskId];
  if (!cached?.length) return false;
  if (expectedCount <= 0) return true;
  return cached.length >= expectedCount;
}

async function getDeliveryAssetsForTask(
  task: {
    taskId: string;
    imageCount: number;
    assetCount: number;
    deliveryTotal?: number;
    deliveryCompleted?: number;
  },
  options?: { force?: boolean; refresh?: boolean },
) {
  const expectedCount = getExpectedDeliveryAssetCount(task);
  const isComplete =
    (task.deliveryTotal ?? 0) > 0 &&
    (task.deliveryCompleted ?? task.assetCount) >= (task.deliveryTotal ?? 0);

  if (
    !options?.force &&
    isComplete &&
    isDeliveryAssetsCacheComplete(task.taskId, expectedCount)
  ) {
    return deliveryTaskAssets.value[task.taskId] ?? [];
  }

  return loadDeliveryAssets(task.taskId, { refresh: options?.refresh });
}

watch(
  visualPreset,
  (presetId, previousPresetId) => {
    if (
      isApplyingTemplate.value ||
      presetId === NEW_PRESET_VALUE ||
      presetId === previousPresetId
    ) {
      return;
    }

    const template = getTemplateById(presetId);
    if (!template) return;

    isApplyingTemplate.value = true;
    presetInput.value = template.name;
    applyTemplate(template);
    isApplyingTemplate.value = false;
  },
  { immediate: true },
);

watch(
  () => props.capability.code,
  (code) => {
    resetUploadedVehicle();
    resetBatchExteriorUploads();
    resetInteriorCollageUploads();
    paintColorCode.value = "";
    batchPaintColorCode.value = "";
    outputRatio.value =
      code === "batch-new"
        ? DEFAULT_BATCH_OUTPUT_RATIO
        : DEFAULT_GENERATION_OUTPUT_RATIO;
  },
);

let deliveryPollTimer: number | null = null;
const DELIVERY_REFRESH_MS = 15000;

function hasInProgressDeliveryTasks() {
  return deliveryTasks.value.some(
    (task) =>
      task.status === "waiting" ||
      task.status === "queued" ||
      task.status === "generating" ||
      (task.deliveryTotal > 0 && task.deliveryCompleted < task.deliveryTotal),
  );
}

onUnmounted(() => {
  revokePreviewObjectUrl();
  resetBatchExteriorUploads();
  resetInteriorCollageUploads();
  if (deliveryPollTimer !== null) {
    window.clearInterval(deliveryPollTimer);
    deliveryPollTimer = null;
  }
});

function syncPresetSelectionFromTemplates() {
  const list = visualTemplates.value;
  if (!list.length) {
    if (createTaskPresetId.value) {
      createTaskPresetId.value = "";
    }
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
}

watch(
  () => visualTemplates.value.map((item) => item.id).join("\n"),
  () => {
    syncPresetSelectionFromTemplates();
  },
);

watch(batchTab, (tab) => {
  if (tab === "visual") {
    void ensureLoaded();
  }
});

type DeliveryTask = DeliveryTaskItem & {
  selected: boolean;
  meta: string;
  image: string;
  imageCount: number;
  displayTitle: string;
  deliveryCompleted: number;
  deliveryTotal: number;
  deliveryProgress: number;
  deliverySnapshot?: BatchDeliverySnapshot;
};

function buildDeliveryDisplayTitle(item: DeliveryTaskItem) {
  const projectName = item.projectName?.trim();
  if (projectName) return projectName;

  return item.title.replace(/\s*[·•]\s*成片交付\s*$/u, "").trim() || item.title;
}

function formatDeliveryImageIndexTitle(projectName: string, index: number) {
  return `${projectName}图${index}`;
}

function getDeliveryPreviewSlotTitle(
  projectName: string,
  slotIndex: number,
  snapshot?: BatchDeliverySnapshot,
) {
  const exteriorCount = snapshot?.exteriorAssets.length ?? 0;

  if (snapshot?.interiorEnabled && slotIndex >= exteriorCount) {
    const interiorIndex = slotIndex - exteriorCount;
    if (snapshot.interiorCollage) {
      return `${projectName}内饰拼接图`;
    }
    return `${projectName}内饰图${interiorIndex + 1}`;
  }

  return formatDeliveryImageIndexTitle(projectName, slotIndex + 1);
}

function buildDeliveryTaskMetrics(
  item: DeliveryTaskItem,
  snapshot?: BatchDeliverySnapshot,
) {
  const snapshotTotal = getSnapshotDisplayTotal(snapshot);
  const deliveryTotal = Math.max(snapshotTotal ?? item.total, 0);
  const deliveryCompleted = Math.min(
    deliveryTotal,
    Math.max(item.assetCount, 0),
  );
  const deliveryProgress =
    deliveryTotal > 0
      ? Math.round((deliveryCompleted / deliveryTotal) * 100)
      : Math.round(item.progress);

  return {
    deliveryTotal,
    deliveryCompleted,
    deliveryProgress,
    meta: `${deliveryCompleted}/${deliveryTotal} · ${formatDate(item.updatedAt)}`,
  };
}

function isDeliveryTaskComplete(
  task: Pick<DeliveryTask, "deliveryCompleted" | "deliveryTotal">,
) {
  return task.deliveryTotal > 0 && task.deliveryCompleted >= task.deliveryTotal;
}

function isDeliveryTaskSelectable(task: DeliveryTask) {
  return isDeliveryTaskComplete(task);
}

function isDeliveryTaskPreviewable(task: Pick<DeliveryTask, "deliveryTotal">) {
  return task.deliveryTotal > 0;
}

function getDeliveryPendingSlotLabel(task: DeliveryTask) {
  if (
    task.deliveryCompleted > 0 ||
    task.status === "generating" ||
    task.status === "queued" ||
    task.status === "waiting"
  ) {
    return "生成中";
  }

  return "待生成";
}

function getSnapshotCoverForSlot(
  snapshot: BatchDeliverySnapshot | undefined,
  slotIndex: number,
) {
  if (!snapshot) return undefined;

  const exteriorCount = snapshot.exteriorAssets.length;
  if (slotIndex < exteriorCount) {
    const asset = snapshot.exteriorAssets[slotIndex];
    return asset.thumbnailUrl ?? asset.url;
  }

  const interiorAssets = getSnapshotInteriorDisplayAssets(snapshot);
  const interiorIndex = slotIndex - exteriorCount;
  const asset = interiorAssets[interiorIndex];
  return asset?.thumbnailUrl ?? asset?.url;
}

function resolveInputCoverForSlot(
  snapshot: BatchDeliverySnapshot | undefined,
  inputCovers: DeliveryInputCover[],
  slotIndex: number,
) {
  const matched = inputCovers.find((cover) => cover.slotIndex === slotIndex);
  if (matched?.coverUrl) return matched.coverUrl;

  const fromApi = inputCovers[slotIndex]?.coverUrl;
  if (fromApi) return fromApi;

  return getSnapshotCoverForSlot(snapshot, slotIndex);
}

function buildDeliveryPreviewSlots(
  task: DeliveryTask,
  assets: Awaited<ReturnType<typeof getDeliveryAssetsForTask>>,
  inputCovers: DeliveryInputCover[] = [],
): WorkspaceDeliveryTaskPreview["assets"] {
  const projectName = task.displayTitle;
  const snapshot = task.deliverySnapshot;
  const snapshotTotal = getSnapshotDisplayTotal(snapshot) ?? 0;
  const maxInputSlot =
    inputCovers.length > 0
      ? Math.max(...inputCovers.map((cover) => cover.slotIndex + 1))
      : 0;
  const totalCount = Math.max(
    task.deliveryTotal,
    snapshotTotal,
    assets.length,
    maxInputSlot,
  );
  const pendingLabel = getDeliveryPendingSlotLabel(task);
  const defaultRatio =
    assets[0]?.ratio ?? snapshot?.outputRatio ?? "4:3";

  return Array.from({ length: totalCount }, (_, slotIndex) => {
    const title = getDeliveryPreviewSlotTitle(
      projectName,
      slotIndex,
      snapshot,
    );
    const uploadCover = resolveInputCoverForSlot(snapshot, inputCovers, slotIndex);
    const generated = assets[slotIndex];
    const inputCoverMeta =
      inputCovers.find((cover) => cover.slotIndex === slotIndex) ??
      inputCovers[slotIndex];

    if (generated) {
      return {
        id: generated.assetId,
        title,
        ratio: generated.ratio || defaultRatio,
        createdAt: formatDate(generated.createdAt),
        status: "ready" as const,
        imageUrl: generated.url,
        thumbnailUrl: uploadCover,
        width: generated.width ?? undefined,
        height: generated.height ?? undefined,
      };
    }

    return {
      id: `pending-${task.taskId}-${slotIndex}`,
      title,
      ratio: defaultRatio,
      status: "pending" as const,
      pendingStatusText: pendingLabel,
      thumbnailUrl: uploadCover,
      generationTaskId: inputCoverMeta?.generationTaskId,
    };
  });
}

async function emitDeliveryTaskPreview(
  task: DeliveryTask,
  options?: { forceAssets?: boolean; refresh?: boolean },
) {
  const forceAssets =
    options?.forceAssets ?? !isDeliveryTaskComplete(task);
  const refresh = options?.refresh ?? forceAssets;
  const assets = await getDeliveryAssetsForTask(task, {
    force: forceAssets,
    refresh,
  });
  const inputCovers =
    deliveryInputCovers.value[task.taskId] ??
    (await getDeliveryTaskAssets(task.taskId, {
      page: 1,
      pageSize: 1,
      refresh: false,
    }).then((result) => {
      deliveryInputCovers.value = {
        ...deliveryInputCovers.value,
        [task.taskId]: result.inputCovers ?? [],
      };
      return result.inputCovers ?? [];
    }).catch(() => []));
  const previewAssets = buildDeliveryPreviewSlots(task, assets, inputCovers);
  const firstReadyAsset = previewAssets.find((asset) => asset.status === "ready");
  const firstCoverAsset = previewAssets.find((asset) => asset.thumbnailUrl);

  emit("previewDeliveryTask", {
    id: task.taskId,
    title: task.displayTitle,
    meta: formatDate(task.updatedAt),
    image: firstCoverAsset?.thumbnailUrl ?? "",
    previewImage: firstReadyAsset?.imageUrl,
    progress: task.deliveryProgress,
    imageCount: task.imageCount,
    totalCount: task.deliveryTotal,
    completedCount: task.deliveryCompleted,
    assets: previewAssets,
  });
}

const deliveryTasks = ref<DeliveryTask[]>([]);
const brokenDeliveryThumbs = ref<Set<string>>(new Set());

watch(
  () => props.capability.kind,
  (kind, previousKind) => {
    if (kind !== "delivery" || previousKind === "delivery") return;

    activeDeliveryTaskId.value = null;
    void refreshDeliveryTasks();
  },
);

onMounted(() => {
  void ensureLoaded();
  if (props.capability.kind === "delivery") {
    void refreshDeliveryTasks();
  }
  deliveryPollTimer = window.setInterval(() => {
    if (props.capability.kind === "delivery" && hasInProgressDeliveryTasks()) {
      void refreshDeliveryTasks({ silent: true });
    }
  }, DELIVERY_REFRESH_MS);
});

function hasDeliveryThumbnail(task: DeliveryTask) {
  if (brokenDeliveryThumbs.value.has(task.taskId)) return false;
  return Boolean(task.image?.trim());
}

function handleDeliveryThumbError(taskId: string) {
  const next = new Set(brokenDeliveryThumbs.value);
  next.add(taskId);
  brokenDeliveryThumbs.value = next;
}

async function resolveDeliveryTaskImage(
  task: DeliveryTaskItem,
  snapshot?: BatchDeliverySnapshot,
) {
  const thumbCached = deliveryTaskThumbUrl.value[task.taskId];
  if (thumbCached) return thumbCached;

  const resolvedSnapshot = snapshot ?? getBatchDeliverySnapshot(task.taskId);
  const snapshotCover =
    resolvedSnapshot?.exteriorAssets[0]?.thumbnailUrl ??
    resolvedSnapshot?.exteriorAssets[0]?.url;
  if (snapshotCover) return snapshotCover;

  if (task.firstInputCoverUrl) return task.firstInputCoverUrl;

  const cachedInputCovers = deliveryInputCovers.value[task.taskId];
  const firstInputCover =
    cachedInputCovers?.[0]?.coverUrl ??
    cachedInputCovers?.find((cover) => cover.slotIndex === 0)?.coverUrl;
  if (firstInputCover) return firstInputCover;

  return "";
}

const deliverySelectedCount = computed(
  () => deliveryTasks.value.filter((task) => task.selected).length,
);

const deliveryDownloadableCount = computed(
  () =>
    deliveryTasks.value.filter(
      (task) => task.selected && isDeliveryTaskSelectable(task),
    ).length,
);

const isDeliveryBatchDownloading = ref(false);

const deliverySelectedImages = computed(() =>
  deliveryTasks.value
    .filter((task) => task.selected && isDeliveryTaskSelectable(task))
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
    (task) => task.selected && isDeliveryTaskSelectable(task),
  );

  if (!selectedTasks.length) {
    message.warning("Please select completed tasks first");
    return;
  }

  isDeliveryBatchDownloading.value = true;

  try {
    const fileGroups = await Promise.all(
      selectedTasks.map(async (task) => {
        const assets = await getDeliveryAssetsForTask(task);
        return buildDeliveryPreviewSlots(task, assets)
          .filter((asset) => asset.status === "ready" && asset.imageUrl)
          .map((asset, index) => ({
            url: asset.imageUrl!,
            filename: `${sanitizeFilename(task.displayTitle)}-${String(index + 1).padStart(2, "0")}-${sanitizeFilename(asset.title)}.jpg`,
          }));
      }),
    );
    const files = fileGroups.flat();

    if (!files.length) {
      message.warning("当前没有可下载素材");
      return;
    }

    const batchName = selectedTasks[0]?.displayTitle ?? "成片交付包";
    const count = await downloadFilesAsZip(
      files,
      `${sanitizeFilename(batchName)}-成片交付.zip`,
    );

    message.success(`已开始下载 ${count} 张图`);
  } finally {
    isDeliveryBatchDownloading.value = false;
  }
}

async function handleDeleteDeliveryTasks() {
  const selectedTaskIds = deliveryTasks.value
    .filter((task) => task.selected)
    .map((task) => task.taskId);

  if (!selectedTaskIds.length) {
    message.warning("请先选择任务");
    return;
  }

  isDeletingDeliveryAssets.value = true;

  try {
    const result = await deleteDeliveryTasks(selectedTaskIds);
    removeBatchDeliverySnapshots(result.deleted);

    for (const taskId of result.deleted) {
      delete deliveryTaskAssets.value[taskId];
      delete deliveryInputCovers.value[taskId];
      delete deliveryTaskThumbUrl.value[taskId];
    }

    if (result.deleted.includes(activeDeliveryTaskId.value ?? "")) {
      activeDeliveryTaskId.value = null;
      emit("previewDeliveryTask", null);
    }

    if (result.deleted.length) {
      message.success(`已删除 ${result.deleted.length} 个批量任务`);
    }

    if (result.failed.length) {
      message.warning(`${result.failed.length} 个任务删除失败`);
    }

    await refreshDeliveryTasks();
  } catch (error) {
    const text = error instanceof Error ? error.message : "删除任务失败";
    message.error(text);
  } finally {
    isDeletingDeliveryAssets.value = false;
  }
}

async function handlePreviewDeliveryTask(task: DeliveryTask) {
  if (!isDeliveryTaskPreviewable(task)) {
    message.info("任务尚未开始，暂不可预览");
    return;
  }

  activeDeliveryTaskId.value = task.taskId;
  await emitDeliveryTaskPreview(task, { forceAssets: true, refresh: true });
}

async function refreshActiveDeliveryPreview(options?: { refresh?: boolean }) {
  if (props.capability.kind !== "delivery") return;

  const taskId = activeDeliveryTaskId.value;
  if (!taskId) return;

  const task = deliveryTasks.value.find((item) => item.taskId === taskId);
  if (!task) return;

  await emitDeliveryTaskPreview(task, {
    forceAssets: true,
    refresh: options?.refresh ?? true,
  });
}

const hasBlock = (block: WorkspaceCapabilityBlock) =>
  props.capability.middleBlocks?.includes(block) ?? false;

const showOutputRatioForGenerate = computed(() => {
  const { code, kind } = props.capability;

  if (
    code === "delivery" ||
    code === "creative-image" ||
    code === "short-video" ||
    code === "batch-new"
  ) {
    return false;
  }

  if (kind === "delivery" || kind === "batch") {
    return false;
  }

  if (kind === "scene" && hasBlock("scene-settings")) {
    return false;
  }

  return hasBlock("actions") || code === "interior-stitch";
});

const activeCreateRatioLabel = computed(() => {
  const ratio = activeCreateTemplate.value?.outputRatio;
  return getOutputRatioOptionLabel(ratio ?? DEFAULT_BATCH_OUTPUT_RATIO);
});

defineExpose({
  refreshActiveDeliveryPreview,
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
          当前套餐：企业团队版 · 每账号图组并发 5 套 · 进行中 2 套 · 可继续上传
          3 套。单张生成仍可正常使用。
        </section>

        <div class="batch-panel-scroll">
          <template v-if="batchTab === 'create'">
            <section class="batch-card inline-field">
              <span>使用预设</span>
              <NSelect
                v-model:value="createTaskPresetId"
                :options="createPresetOptions"
                :render-label="renderPresetOptionLabel"
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
                  v-if="
                    activeCreateTemplate.paintRefresh &&
                    activeCreateTemplate.colorCode
                  "
                  class="preset-tag is-on"
                >
                  <Icon icon="mdi:palette" />
                  {{ activeCreateTemplate.colorCode }}
                </span>
                <span
                  v-if="activeCreateTemplate.interiorCollage"
                  class="preset-tag is-on"
                >
                  <Icon icon="mdi:image-multiple-outline" />
                  内饰拼接
                </span>
                <span
                  v-if="
                    activeCreateTemplate.interiorCollage &&
                    activeCreateTemplate.interiorEnhance
                  "
                  class="preset-tag is-on"
                >
                  <Icon icon="mdi:seat-passenger" />
                  内饰清洁
                </span>
              </div>
            </section>

            <section class="batch-card">
              <h3 class="batch-field-label">
                项目名
                <span class="batch-field-required" aria-hidden="true">*</span>
              </h3>
              <input
                v-model="projectName"
                class="plain-input"
                type="text"
                required
                aria-required="true"
                placeholder="请输入项目名称"
              />
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
                    :disabled="props.isGenerating"
                    :aria-label="`删除${item.name}`"
                    @click.stop="handleBatchExteriorRemove(item.id)"
                  >
                    <Icon icon="mdi:close" />
                  </button>
                </article>
              </div>
            </section>

            <section
              v-if="showCreateInteriorUpload"
              class="batch-card switch-card"
            >
              <div>
                <h3>同时上传内饰图</h3>
                <p>开启后，每套外观图组可补充内饰图，用于成片交付包。</p>
              </div>
              <NSwitch v-model:value="uploadInterior" size="large" />
            </section>

            <section
              v-if="showCreateInteriorUpload && uploadInterior"
              class="batch-card batch-upload-card"
            >
              <input
                ref="interiorCollageInputRef"
                type="file"
                class="batch-upload-input"
                :accept="props.capability.accept"
                multiple
                @change="handleInteriorCollageInputChange"
              />

              <header class="batch-upload-head">
                <div>
                  <h3>上传内饰图组</h3>
                  <p>
                    支持 1-10 张；若预设开启内饰拼接，需上传
                    {{ MIN_INTERIOR_COLLAGE_IMAGES }}-{{
                      MAX_INTERIOR_COLLAGE_IMAGES
                    }}
                    张。
                  </p>
                </div>
                <span class="batch-upload-count">
                  {{ interiorCollageUploads.length }}/{{
                    MAX_INTERIOR_COLLAGE_IMAGES
                  }}
                </span>
              </header>

              <button
                type="button"
                class="batch-upload-drop"
                :class="{ 'is-disabled': !canAddInteriorCollageImages }"
                :disabled="!canAddInteriorCollageImages"
                @click="openInteriorCollagePicker"
                @dragover.prevent
                @drop.prevent="handleInteriorCollageDrop"
              >
                <Icon icon="mdi:seat-passenger" />
                <strong>{{
                  interiorCollageUploads.length
                    ? "继续添加内饰图"
                    : "上传内饰图组"
                }}</strong>
                <span
                  >JPG / PNG / WebP · 剩余
                  {{ interiorCollageRemainingCount }} 张</span
                >
              </button>

              <div
                v-if="interiorCollageUploads.length"
                class="batch-upload-grid"
              >
                <article
                  v-for="item in interiorCollageUploads"
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
                    :disabled="props.isGenerating"
                    :aria-label="`删除${item.name}`"
                    @click.stop="handleInteriorCollageRemove(item.id)"
                  >
                    <Icon icon="mdi:close" />
                  </button>
                </article>
              </div>

              <button
                v-if="interiorCollageUploads.length"
                type="button"
                class="batch-upload-clear"
                :disabled="props.isGenerating"
                @click="handleInteriorImageRemove"
              >
                清空内饰图
              </button>
            </section>
          </template>

          <template v-else>
            <section class="batch-card preset-save-card">
              <div class="preset-save-row">
                <span>预设</span>
                <NSelect
                  v-model:value="selectedPresetKey"
                  class="preset-combobox"
                  :options="visualPresetOptions"
                  :render-label="renderPresetOptionLabel"
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
                  class="batch-primary-btn"
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
                :options="outputRatioSelectOptions"
                size="large"
              />
            </section>

            <section class="batch-card batch-logo-card">
              <WorkspaceLogoPanel
                v-model:enabled="useRecentLogo"
                variant="batch"
                :disabled="props.isGenerating"
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

            <PaintColorPicker
              v-if="paintRefresh"
              v-model="batchPaintColorCode"
            />

            <section class="batch-card switch-card">
              <div>
                <h3>内饰拼接</h3>
                <p>2-10 张内饰图按规则自动分组拼图，可与清洁增强组合。</p>
              </div>
              <NSwitch v-model:value="interiorCollage" size="large" />
            </section>

            <section
              v-if="interiorCollage"
              class="batch-card switch-card"
            >
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
            class="batch-primary-btn"
            :loading="batchTab === 'create' && isCreatingBatchTask"
            :disabled="
              batchTab === 'create' &&
              (!projectName.trim() ||
                !createTaskPresetId ||
                !uploadedExteriorAssets.length ||
                isUploadingVehicle ||
                isUploadingInterior)
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

    <template v-else-if="props.capability.code === 'interior-stitch'">
      <div class="generate-panel-body">
        <section class="batch-card batch-notice short-video-notice">
          前端只负责收集 2-10 张内饰图并提交 `assetIds`，后端会自动分组生成 1-3
          张拼图结果。
        </section>

        <section class="batch-card batch-upload-card">
          <input
            ref="interiorCollageInputRef"
            type="file"
            class="batch-upload-input"
            :accept="props.capability.accept"
            multiple
            @change="handleInteriorCollageInputChange"
          />

          <header class="batch-upload-head">
            <div>
              <h3>上传内饰图组</h3>
              <p>
                支持一次多选，最少上传 {{ MIN_INTERIOR_COLLAGE_IMAGES }} 张，
                最多上传 {{ MAX_INTERIOR_COLLAGE_IMAGES }} 张。
              </p>
            </div>
            <span class="batch-upload-count">
              {{ interiorCollageUploads.length }}/{{
                MAX_INTERIOR_COLLAGE_IMAGES
              }}
            </span>
          </header>

          <button
            type="button"
            class="batch-upload-drop"
            :class="{ 'is-disabled': !canAddInteriorCollageImages }"
            :disabled="!canAddInteriorCollageImages"
            @click="openInteriorCollagePicker"
            @dragover.prevent
            @drop.prevent="handleInteriorCollageDrop"
          >
            <Icon icon="mdi:image-multiple-outline" />
            <strong>{{
              interiorCollageUploads.length ? "继续添加内饰图" : "上传内饰图组"
            }}</strong>
            <span
              >JPG / PNG / WebP · 剩余
              {{ interiorCollageRemainingCount }} 张</span
            >
          </button>

          <div v-if="interiorCollageUploads.length" class="batch-upload-grid">
            <article
              v-for="item in interiorCollageUploads"
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
                :disabled="props.isGenerating"
                :aria-label="`删除${item.name}`"
                @click.stop="handleInteriorCollageRemove(item.id)"
              >
                <Icon icon="mdi:close" />
              </button>
            </article>
          </div>
        </section>

        <CapabilityOptionSelector
          v-if="hasBlock('selector')"
          :capability="props.capability"
          :selected-option-id="props.selectedOptionId"
          :disabled="props.isGenerating"
          @select="emit('selectOption', $event)"
        />

        <div
          v-if="showOutputRatioForGenerate"
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
              :options="outputRatioSelectOptions"
              size="large"
              class="min-w-0 flex-1"
            />
          </div>
        </div>
      </div>

      <GenerateActionFooter
        v-if="hasBlock('actions')"
        :action-label="props.capability.actionLabel"
        :cost="props.capability.cost"
        :loading="props.isGenerating"
        :disabled="
          isUploadingInterior ||
          props.isGenerating ||
          uploadedInteriorCollageAssets.length < MIN_INTERIOR_COLLAGE_IMAGES
        "
        @generate="handleGenerate"
      />
    </template>

    <template v-else-if="props.capability.code === 'short-video'">
      <div class="generate-panel-body">
        <section class="batch-card batch-notice short-video-notice">
          上传车辆外观图后创建短视频任务，默认生成 10 秒、16:9、720p 营销视频。
        </section>

        <UploadTaskCard
          :capability="props.capability"
          :upload-preview-url="uploadedPreviewUrl"
          :is-uploading="isUploadingVehicle"
          :upload-disabled="props.isGenerating"
          @select-file="handleVehicleFileSelected"
          @remove="handleVehicleImageRemove"
        />

        <CapabilityOptionSelector
          v-if="hasBlock('selector')"
          :capability="props.capability"
          :selected-option-id="props.selectedOptionId"
          :disabled="props.isGenerating"
          @select="emit('selectOption', $event)"
        />
      </div>

      <GenerateActionFooter
        v-if="hasBlock('actions')"
        :action-label="props.capability.actionLabel"
        :cost="props.capability.cost"
        cost-unit="条"
        :loading="props.isGenerating"
        :disabled="isUploadingVehicle || props.isGenerating || !uploadedAsset"
        @generate="handleGenerate"
      />
    </template>

    <template v-else-if="props.capability.kind === 'delivery'">
      <div class="delivery-panel">
        <div class="delivery-tabs">
          <button type="button" class="active">成片交付</button>
        </div>

        <section class="batch-notice delivery-notice">
          此处展示批量上新中已完成的任务，点击任务卡片可在右侧查看大图，勾选复选框即可批量下载。
        </section>

        <section class="delivery-board" aria-label="成片交付任务列表">
          <div
            v-if="isLoadingDeliveryTasks && !deliveryTasks.length"
            class="delivery-list-state"
          >
            <Icon icon="mdi:loading" class="delivery-list-state-icon" />
            <span>正在加载交付列表</span>
          </div>
          <div v-else-if="!deliveryTasks.length" class="delivery-list-state">
            <Icon icon="mdi:clipboard-text-outline" class="delivery-list-state-icon" />
            <span>暂无交付任务</span>
          </div>
          <div v-else class="delivery-list">
            <article
              v-for="(task, index) in deliveryTasks"
              :key="task.taskId"
              class="delivery-item"
              :class="{
                'is-checked': task.selected,
                'is-previewing': props.previewedDeliveryTaskId === task.taskId,
                'is-loading': !isDeliveryTaskComplete(task),
              }"
            >
              <label class="delivery-check" @click.stop>
                <input
                  type="checkbox"
                  :checked="task.selected"
                  :aria-label="`选择${task.displayTitle}`"
                  @change="toggleDeliveryTask(index)"
                />
              </label>

              <button
                type="button"
                class="delivery-item-body"
                :disabled="!isDeliveryTaskPreviewable(task)"
                :aria-label="`查看${task.displayTitle}大图`"
                @click="handlePreviewDeliveryTask(task)"
              >
                <div class="delivery-thumb-wrap">
                  <PreloadImage
                    v-if="hasDeliveryThumbnail(task)"
                    class="delivery-thumb"
                    :src="task.image"
                    :alt="task.displayTitle"
                    loading="lazy"
                    decoding="async"
                    :draggable="false"
                    @error="handleDeliveryThumbError(task.taskId)"
                  />
                  <div
                    v-else
                    class="delivery-thumb delivery-thumb--pending"
                    :class="{ 'is-generating': task.deliveryProgress < 100 }"
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
                  <h3 :title="task.displayTitle">{{ task.displayTitle }}</h3>
                  <p>{{ task.meta }}</p>
                </div>

                <div class="delivery-status">
                  <template
                    v-if="
                      task.deliveryTotal > 0 &&
                      task.deliveryCompleted >= task.deliveryTotal
                    "
                  >
                    <span
                      class="delivery-status-ring"
                      aria-hidden="true"
                    ></span>
                    <strong>已完成</strong>
                  </template>
                  <template v-else>
                    <span
                      class="delivery-status-progress"
                      :style="{ '--progress': `${task.deliveryProgress}%` }"
                      aria-hidden="true"
                    >
                      <b>{{ task.deliveryProgress }}%</b>
                    </span>
                    <strong class="delivery-status-meta">
                      {{ task.deliveryCompleted }}/{{ task.deliveryTotal }}
                    </strong>
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
                :disabled="deliverySelectedCount === 0 || isDeletingDeliveryAssets"
                @click="handleDeleteDeliveryTasks"
              >
                批量删除
              </button>
            </div>
          </footer>
        </section>
      </div>
    </template>

    <template v-else>
      <div class="generate-panel-body">
        <UploadTaskCard
          :capability="props.capability"
          :upload-preview-url="uploadedPreviewUrl"
          :is-uploading="isUploadingVehicle"
          :upload-disabled="props.isGenerating"
          @select-file="handleVehicleFileSelected"
          @remove="handleVehicleImageRemove"
        />

        <PaintColorPicker
          v-if="props.capability.code === 'paint-refresh'"
          v-model="paintColorCode"
        />

        <CapabilityOptionSelector
          v-if="hasBlock('selector')"
          :capability="props.capability"
          :selected-option-id="props.selectedOptionId"
          :disabled="props.isGenerating"
          @select="emit('selectOption', $event)"
        />

        <div
          v-if="showOutputRatioForGenerate"
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
              :options="outputRatioSelectOptions"
              size="large"
              class="min-w-0 flex-1"
            />
          </div>
        </div>

        <template
          v-if="props.capability.kind === 'scene' && hasBlock('scene-settings')"
        >
          <WorkspaceLogoPanel
            v-model:enabled="useLogo"
            :disabled="props.isGenerating"
          />

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
                :options="outputRatioSelectOptions"
                size="large"
                class="min-w-0 flex-1"
              />
            </div>
          </div>
        </template>
      </div>

      <GenerateActionFooter
        v-if="hasBlock('actions')"
        :action-label="props.capability.actionLabel"
        :cost="props.capability.cost"
        :loading="props.isGenerating"
        :disabled="isUploadingVehicle || props.isGenerating || !uploadedAsset"
        @generate="handleGenerate"
      />
    </template>
  </div>
</template>

<style scoped lang="scss">
.generate-panel {
  display: flex;
  min-height: 0;
  height: 100%;
  flex: 1;
  flex-direction: column;
  gap: 18px;
  overflow: hidden;
  padding-bottom: 0;
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

.generate-panel-body {
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

.generate-panel-body > * {
  flex-shrink: 0;
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

.preset-combobox :deep(.n-base-selection),
.inline-field :deep(.n-base-selection) {
  position: relative;
}

.preset-combobox :deep(.n-base-selection-label),
.inline-field :deep(.n-base-selection-label) {
  padding-right: 40px;
}

.preset-combobox :deep(.n-base-suffix),
.inline-field :deep(.n-base-suffix) {
  position: absolute;
  top: 50%;
  right: 14px;
  transform: translateY(-50%);
}

:global(.preset-select-option) {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

:global(.preset-select-option-name) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.preset-option-delete) {
  display: grid;
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: color-mix(in srgb, var(--app-text-soft) 82%, transparent);
  cursor: pointer;
  opacity: 0;
  transform: translateX(4px);
  transition:
    opacity 0.16s ease,
    transform 0.16s ease,
    color 0.16s ease,
    background 0.16s ease;
}

:global(.n-base-select-option:hover .preset-option-delete),
:global(.n-base-select-option:focus-within .preset-option-delete),
:global(.preset-option-delete.is-deleting) {
  opacity: 1;
  transform: translateX(0);
}

:global(.preset-option-delete:hover:not(:disabled)) {
  background: color-mix(in srgb, #e25555 14%, transparent);
  color: #e25555;
}

:global(.preset-option-delete:disabled) {
  cursor: wait;
  opacity: 0.72;
}

:global(.preset-option-delete.is-deleting .iconify) {
  animation: preset-delete-spin 0.9s linear infinite;
}

@keyframes preset-delete-spin {
  to {
    transform: rotate(360deg);
  }
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

.batch-field-label {
  display: flex;
  align-items: center;
  gap: 4px;
}

.batch-field-required {
  color: #ef4444;
  font-size: 16px;
  line-height: 1;
}

.batch-card {
  padding: 16px;
}

.plain-input::placeholder {
  color: var(--app-text-soft);
  font-weight: 600;
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
  position: relative;
  z-index: 0;
  width: 100%;
  height: 100%;
}

.batch-upload-status,
.batch-upload-remove {
  position: absolute;
  z-index: 2;
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
  right: 6px;
  top: 6px;
  width: 30px;
  height: 30px;
  border: 0;
  background: rgba(15, 23, 42, 0.52);
  backdrop-filter: blur(4px);
  color: rgba(255, 255, 255, 0.92);
  font-size: 18px;
  cursor: pointer;
  opacity: 0.88;
  transition:
    background 0.2s ease,
    opacity 0.2s ease,
    transform 0.2s ease;
}

.batch-upload-item:hover .batch-upload-remove,
.batch-upload-remove:focus-visible {
  opacity: 1;
}

.batch-upload-remove:hover {
  background: rgba(220, 38, 38, 0.82);
  transform: scale(1.05);
}

.batch-upload-remove:disabled,
.batch-upload-clear:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  pointer-events: none;
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

.delivery-list-state {
  display: flex;
  min-height: 180px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 28px 16px;
  color: var(--app-text-soft);
  font-size: 14px;
}

.delivery-list-state-icon {
  font-size: 28px;
  opacity: 0.72;
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

.delivery-check.is-disabled input {
  cursor: not-allowed;
  opacity: 0.42;
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

:global(.workspace-page.theme-light) .generate-panel.is-batch {
  --batch-brand: var(--workspace-accent, #2f6bff);
  --batch-brand-strong: var(--workspace-accent-strong, #2f6bff);
  --batch-brand-text: #ffffff;
  --batch-brand-muted: #2f6bff;
  --batch-page-bg: var(--workspace-panel, #ffffff);
  --batch-shell-bg: var(--workspace-panel, #ffffff);
  --batch-shell-border: var(--workspace-line, #d6e0ed);
  --batch-card-bg: var(--workspace-panel, #ffffff);
  --batch-card-border: var(--workspace-line, #d6e0ed);
  --batch-card-hover-border: var(--workspace-line-strong, #aebfd5);
  --batch-text-primary: var(--workspace-text, #172033);
  --batch-text-body: var(--workspace-text-secondary, #334155);
  --batch-text-muted: var(--workspace-muted, #64748b);
  --batch-input-border: var(--workspace-line, #d6e0ed);
  --batch-upload-bg: var(--workspace-panel-soft, #f7fafd);
  --batch-upload-border: var(--workspace-line-strong, #cbd5e1);

  background: var(--batch-page-bg);
}

:global(.workspace-page.theme-light) .generate-panel.is-batch .batch-panel {
  min-height: 0;
  flex: 1;
  padding: 4px 2px 0;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .batch-panel-scroll {
  gap: 20px;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .batch-panel-scroll::-webkit-scrollbar {
  width: 6px;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .batch-panel-scroll::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 999px;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .batch-panel-scroll::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 999px;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .batch-panel-scroll::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

:global(.workspace-page.theme-light) .generate-panel.is-batch .batch-tabs {
  border-bottom-color: #e6eaf2;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .batch-tabs
  button {
  color: #64748b;
  font-weight: 700;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .batch-tabs
  button.active {
  color: var(--batch-text-primary);
  font-weight: 800;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .batch-tabs
  button.active::after {
  background: var(--batch-brand);
}

:global(.workspace-page.theme-light) .generate-panel.is-batch .batch-notice {
  padding: 20px 24px;
  border: 1px solid var(--workspace-accent-border, #b8cdf4);
  border-radius: 16px;
  background: var(--workspace-accent-bg, #f2f7ff);
  color: var(--batch-text-body);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.75;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .batch-notice:hover {
  border-color: color-mix(
    in srgb,
    var(--workspace-accent, #2f6bff) 36%,
    transparent
  );
  box-shadow: 0 6px 20px rgba(47, 107, 255, 0.08);
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .batch-card:not(.batch-notice) {
  padding: 24px;
  border: 1px solid var(--batch-card-border);
  border-radius: 16px;
  background: var(--batch-card-bg);
  color: var(--batch-text-body);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .batch-card:not(.batch-notice):hover {
  border-color: var(--batch-card-hover-border);
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.04);
}

:global(.workspace-page.theme-light) .generate-panel.is-batch .batch-card h3,
:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .inline-field
  > span {
  color: var(--batch-text-primary);
  font-weight: 700;
}

:global(.workspace-page.theme-light) .generate-panel.is-batch .batch-card p,
:global(.workspace-page.theme-light) .generate-panel.is-batch .switch-card p,
:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .batch-upload-head
  p {
  color: var(--batch-text-muted);
  font-weight: 500;
}

:global(.workspace-page.theme-light) .generate-panel.is-batch .preset-summary {
  padding: 24px;
  border: 1px solid var(--batch-card-border);
  border-radius: 16px;
  background: var(--batch-card-bg);
  box-shadow: none;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .preset-summary-icon {
  background: var(--workspace-accent-bg, #f2f7ff);
  color: var(--workspace-accent, #2f6bff);
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .preset-summary-copy
  p {
  color: var(--batch-text-muted);
  font-weight: 600;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .preset-summary-copy
  strong {
  color: var(--batch-text-primary);
  font-weight: 700;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .preset-tag.is-scene,
:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .preset-tag.is-ratio,
:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .preset-tag.is-on {
  border: 1px solid var(--workspace-accent-border, #b8cdf4);
  background: var(--workspace-accent-bg, #f2f7ff);
  color: var(--workspace-accent, #2f6bff);
  font-weight: 600;
}

:global(.workspace-page.theme-light) .generate-panel.is-batch .plain-input {
  height: 48px;
  border: 1px solid var(--batch-input-border);
  border-radius: 12px;
  background: #ffffff;
  box-shadow: none;
  color: var(--batch-text-primary);
  font-weight: 600;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .plain-input:hover {
  border-color: var(--batch-brand);
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .plain-input:focus {
  border-color: var(--batch-brand);
  box-shadow: 0 0 0 3px var(--workspace-accent-glow, rgba(47, 107, 255, 0.16));
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .batch-upload-count {
  background: var(--workspace-accent-bg, #f2f7ff);
  color: var(--workspace-accent, #2f6bff);
  font-weight: 700;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .batch-upload-remove {
  background: rgba(15, 23, 42, 0.48);
  color: rgba(255, 255, 255, 0.94);
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .batch-upload-remove:hover {
  background: rgba(220, 38, 38, 0.78);
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .batch-upload-drop {
  min-height: 148px;
  border: 2px dashed var(--batch-upload-border);
  border-radius: 16px;
  background: var(--batch-upload-bg);
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .batch-upload-drop:hover:not(:disabled) {
  border-color: var(--batch-brand);
  background: #ffffff;
  transform: none;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .batch-upload-drop
  .iconify {
  color: var(--batch-brand);
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .batch-upload-drop
  strong {
  color: var(--batch-text-primary);
  font-weight: 700;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .batch-upload-drop
  span {
  color: var(--batch-text-muted);
  font-weight: 500;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .batch-upload-item {
  border: 1px solid #e6eaf2;
  border-radius: 12px;
  background: #ffffff;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .batch-scene-card {
  padding: 24px;
  border: 1px solid var(--batch-card-border);
  border-radius: 16px;
  background: var(--batch-upload-bg);
  color: var(--batch-text-body);
}

:global(.workspace-page.theme-light) .generate-panel.is-batch .scene-head h3 {
  color: var(--batch-text-primary);
  font-weight: 700;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .scene-grid
  article {
  border: 1px solid #e6eaf2;
  border-radius: 12px;
  background: #ffffff;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .scene-grid
  article.active {
  border: 2px solid var(--batch-brand);
  box-shadow: 0 0 0 4px var(--workspace-accent-glow, rgba(47, 107, 255, 0.16));
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .scene-grid
  article.active
  strong {
  background: var(--batch-brand);
  color: var(--batch-brand-text);
  font-weight: 600;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .scene-grid
  strong {
  color: var(--batch-text-body);
  font-weight: 600;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .scene-category-select
  :deep(.n-base-selection) {
  --n-border: 1px solid var(--batch-input-border) !important;
  --n-border-hover: 1px solid var(--batch-brand) !important;
  --n-border-focus: 1px solid var(--batch-brand) !important;
  --n-border-radius: 12px !important;
  --n-color: #ffffff !important;
  --n-text-color: var(--batch-text-primary) !important;
  --n-arrow-color: var(--batch-text-muted) !important;
  --n-box-shadow-focus: 0 0 0 3px
    var(--workspace-accent-glow, rgba(47, 107, 255, 0.16)) !important;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .preset-combobox
  :deep(.n-base-selection),
:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .inline-field
  :deep(.n-base-selection) {
  --n-height: 48px !important;
  --n-border: 1px solid var(--batch-input-border) !important;
  --n-border-hover: 1px solid var(--batch-brand) !important;
  --n-border-focus: 1px solid var(--batch-brand) !important;
  --n-border-radius: 12px !important;
  --n-color: #ffffff !important;
  --n-text-color: var(--batch-text-primary) !important;
  --n-arrow-color: var(--batch-text-muted) !important;
  --n-box-shadow-focus: 0 0 0 3px
    var(--workspace-accent-glow, rgba(47, 107, 255, 0.16)) !important;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .switch-card
  :deep(.n-switch.n-switch--active .n-switch__rail) {
  background-color: var(--batch-brand) !important;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .switch-card
  :deep(.n-switch .n-switch__rail) {
  background-color: #cbd5e1 !important;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .switch-card
  :deep(.n-switch .n-switch__button) {
  background-color: #ffffff !important;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .batch-panel-footer {
  padding-top: 16px;
  border-top: 1px solid #e6eaf2;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0) 0%,
    #ffffff 24%,
    #ffffff 100%
  );
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .batch-primary-btn.n-button {
  height: 52px !important;
  border: 0 !important;
  border-radius: 14px !important;
  background: linear-gradient(
    135deg,
    var(--batch-brand),
    color-mix(in srgb, var(--batch-brand-strong) 88%, #1d4ed8)
  ) !important;
  color: var(--batch-brand-text) !important;
  font-weight: 600 !important;
  box-shadow: none !important;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease !important;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .batch-primary-btn.n-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 30px var(--workspace-accent-glow, rgba(47, 107, 255, 0.16)) !important;
}

:global(.workspace-page.theme-light)
  .generate-panel.is-batch
  .batch-primary-btn.n-button:active:not(:disabled) {
  transform: translateY(0);
}

:global(.workspace-page.theme-light) .delivery-tabs button.active {
  color: var(--workspace-accent, #2f6bff);
}

:global(.workspace-page.theme-light) .delivery-tabs button.active::after {
  background: var(--workspace-accent-underline, #4f7fff);
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
