<script setup lang="ts">
import { computed, inject, onMounted, ref } from "vue";
import { Icon } from "@iconify/vue";
import { useMessage } from "naive-ui";

import PreloadImage from "@/components/common/PreloadImage.vue";
import HoverPreviewVideo from "@/components/common/HoverPreviewVideo.vue";
import VehicleLookupField from "@/components/business/workspace/VehicleLookupField.vue";
import { VIDEO_GENERATION_FLOW_KEY } from "@/constants/video-generation";
import { resolveTemplatePosterUrl, resolveTemplatePreviewUrl, shouldPreferVideoCover } from "@/constants/video-template-previews";
import {
  MAX_DEALERSHIP_IMAGES,
  MAX_VIDEO_EXTERIOR_IMAGES,
  MAX_VIDEO_INTERIOR_IMAGES,
} from "@/constants/short-video";
import {
  useVideoGenerationFlow,
  type VideoGenerationFlow,
} from "@/composables/useVideoGenerationFlow";
import { useAuthStore } from "@/stores/auth";
import { useAppStore } from "@/stores/app";
import type { DigitalHuman } from "@/types/video-generation";
import type { WorkspaceCapability } from "@/types/workspace";
import {
  findCarBrandByName,
  getCarModelDisplayNames,
  searchCarBrands,
} from "@/utils/car-brand-series";

const props = defineProps<{
  capability: WorkspaceCapability;
  disabled?: boolean;
  isGenerating?: boolean;
}>();

const message = useMessage();
const authStore = useAuthStore();
const appStore = useAppStore();

const exteriorInputRef = ref<HTMLInputElement | null>(null);
const interiorInputRef = ref<HTMLInputElement | null>(null);
const dealershipInputRef = ref<HTMLInputElement | null>(null);

const ownerKey = computed(
  () => authStore.userInfo?.id ?? authStore.userInfo?.username ?? "guest",
);

const injectedFlow = inject<VideoGenerationFlow | null>(
  VIDEO_GENERATION_FLOW_KEY,
  null,
);

const localFlow = useVideoGenerationFlow(ownerKey.value);
const flow = injectedFlow ?? localFlow;

const {
  currentStep,
  selectedTemplate,
  supportedLanguageOptions,
  digitalHumanList,
  singleCarForm,
  promotionForm,
  dealershipForm,
  exteriorUploads,
  interiorUploads,
  dealershipUploads,
  validationIssues,
  errorMessage,
  scriptDraft,
  confirmedScriptText,
  translatedNarrationText,
  voiceOptions,
  selectedVoiceId,
  audioPreviews,
  confirmedAudioPreviewId,
  confirmedAudioPreview,
  canSubmitVideoTask,
  hasReusableDraft,
  draftNeedsRegeneration,
  isLoading,
  initializeFlow,
  goBackToTemplate,
  goBackToForm,
  continueReview,
  generateScriptDraft,
  setConfirmedScriptText,
  selectVoice,
  generateAudioPreview,
  optimizeNarrationScript,
  translateNarrationScript,
  confirmAudioPreview,
  cancelAudioPreviewConfirmation,
  submitVideoTask,
  uploadExteriorImages,
  uploadInteriorImages,
  uploadDealershipImages,
  removeExteriorUpload,
  removeInteriorUpload,
  removeDealershipUpload,
} = flow;

const acceptTypes = "image/jpeg,image/png,image/webp";

const preferredLanguageHints: Record<string, { hint: string; badge?: string }> = {
  Chinese: { hint: "普通话", badge: "默认" },
  "Chinese,Yue": { hint: "粤语" },
  English: { hint: "English" },
  Russian: { hint: "Русский" },
  Japanese: { hint: "日本語" },
  Korean: { hint: "한국어" },
  French: { hint: "Français" },
  Spanish: { hint: "Español" },
};

const languageOptions = computed(() =>
  supportedLanguageOptions.value
    .filter((option) => option.status === "available")
    .map((option) => ({
      value: option.value,
      label: option.label,
      hint: preferredLanguageHints[option.value]?.hint ?? option.value,
      badge: preferredLanguageHints[option.value]?.badge,
    })),
);

const humanToneClasses = ["tone-warm", "tone-cool", "tone-neutral", "tone-warm"];

const isSingleCarTemplate = computed(
  () => selectedTemplate.value?.type === "single-car",
);

const isDealershipTemplate = computed(
  () => selectedTemplate.value?.type === "dealership",
);

const primaryUploadPreview = computed(() => {
  if (isDealershipTemplate.value) {
    return primaryDealership.value;
  }
  return primaryExterior.value;
});

const uploadCountLabel = computed(() => {
  if (isDealershipTemplate.value) {
    return `${dealershipUploads.value.length}/${MAX_DEALERSHIP_IMAGES}`;
  }
  return `${exteriorUploads.value.length}/${MAX_VIDEO_EXTERIOR_IMAGES}`;
});

const interiorCountLabel = computed(
  () => `${interiorUploads.value.length}/${MAX_VIDEO_INTERIOR_IMAGES}`,
);

function openPrimaryUploadPicker() {
  if (isDealershipTemplate.value) {
    openDealershipPicker();
    return;
  }
  openExteriorPicker();
}

async function handlePrimaryUploadDrop(event: DragEvent) {
  if (isDealershipTemplate.value) {
    await handleDealershipDrop(event);
    return;
  }
  await handleExteriorDrop(event);
}

function handlePrimaryUploadFiles(event: Event) {
  if (isDealershipTemplate.value) {
    handleFiles(event, uploadDealershipImages);
    return;
  }
  handleFiles(event, uploadExteriorImages);
}

function removePrimaryUpload() {
  if (isDealershipTemplate.value && primaryDealership.value) {
    removeDealershipUpload(primaryDealership.value.id);
    return;
  }
  if (primaryExterior.value) {
    removeExteriorUpload(primaryExterior.value.id);
  }
}

const matchedBrand = computed(() =>
  findCarBrandByName(
    selectedTemplate.value?.type === "promotion"
      ? promotionForm.value.brand
      : singleCarForm.value.brand,
  ),
);

const brandOptions = computed(() => {
  const query =
    selectedTemplate.value?.type === "promotion"
      ? promotionForm.value.brand
      : singleCarForm.value.brand;
  return searchCarBrands(query).map((item) => item.name);
});

const modelOptions = computed(() => {
  if (!matchedBrand.value) return [];
  return getCarModelDisplayNames(matchedBrand.value);
});

function createActiveCarFieldComputed<
  K extends "brand" | "modelYear" | "displacement" | "salesName" | "series",
>(key: K) {
  return computed({
    get() {
      if (selectedTemplate.value?.type === "promotion") {
        return promotionForm.value[key];
      }
      return singleCarForm.value[key];
    },
    set(value) {
      if (selectedTemplate.value?.type === "promotion") {
        promotionForm.value[key] = value;
        return;
      }
      singleCarForm.value[key] = value;
    },
  });
}

const activeBrand = createActiveCarFieldComputed("brand");
const activeModelYear = createActiveCarFieldComputed("modelYear");
const activeDisplacement = createActiveCarFieldComputed("displacement");
const activeSalesName = createActiveCarFieldComputed("salesName");
const activeSeries = createActiveCarFieldComputed("series");

const activeFormLanguage = computed({
  get() {
    if (selectedTemplate.value?.type === "dealership") {
      return dealershipForm.value.language;
    }
    if (selectedTemplate.value?.type === "promotion") {
      return promotionForm.value.language;
    }
    return singleCarForm.value.language;
  },
  set(value) {
    if (selectedTemplate.value?.type === "dealership") {
      dealershipForm.value.language = value;
      return;
    }
    if (selectedTemplate.value?.type === "promotion") {
      promotionForm.value.language = value;
      return;
    }
    singleCarForm.value.language = value;
  },
});

const selectedLanguageOption = computed(
  () =>
    languageOptions.value.find(
      (option) => option.value === activeFormLanguage.value,
    ) ?? languageOptions.value[0] ?? null,
);

const isNonChineseLanguage = computed(
  () => !["Chinese", "Chinese,Yue"].includes(activeFormLanguage.value),
);

const activeDigitalHumanId = computed({
  get() {
    if (selectedTemplate.value?.type === "dealership") {
      return dealershipForm.value.digitalHumanId;
    }
    if (selectedTemplate.value?.type === "promotion") {
      return promotionForm.value.digitalHumanId;
    }
    return singleCarForm.value.digitalHumanId;
  },
  set(value) {
    if (selectedTemplate.value?.type === "dealership") {
      dealershipForm.value.digitalHumanId = value;
      return;
    }
    if (selectedTemplate.value?.type === "promotion") {
      promotionForm.value.digitalHumanId = value;
      return;
    }
    singleCarForm.value.digitalHumanId = value;
  },
});

const primaryExterior = computed(() => exteriorUploads.value[0] ?? null);
const primaryInterior = computed(() => interiorUploads.value[0] ?? null);
const primaryDealership = computed(() => dealershipUploads.value[0] ?? null);

const uploadedExteriorAssetCount = computed(
  () => exteriorUploads.value.filter((item) => item.asset?.assetId).length,
);

const uploadedDealershipAssetCount = computed(
  () => dealershipUploads.value.filter((item) => item.asset?.assetId).length,
);

const isSingleCarFormComplete = computed(() => {
  const form = singleCarForm.value;
  return Boolean(
    form.brand.trim() &&
      form.modelYear.trim() &&
      form.displacement.trim() &&
      form.salesName.trim() &&
      form.series.trim() &&
      form.digitalHumanId &&
      form.language &&
      uploadedExteriorAssetCount.value > 0,
  );
});

const isDealershipFormComplete = computed(() =>
  Boolean(
    dealershipForm.value.digitalHumanId &&
      dealershipForm.value.language &&
      uploadedDealershipAssetCount.value > 0,
  ),
);

const isFormReadyForDraft = computed(() => {
  if (isDealershipTemplate.value) return isDealershipFormComplete.value;
  if (isSingleCarTemplate.value) return isSingleCarFormComplete.value;
  return false;
});

const languageStepIndex = computed(() => (isSingleCarTemplate.value ? "4" : "3"));

const tipBannerText = computed(() => {
  const styleLabel = selectedTemplate.value?.styleLabel ?? "专业";
  return `系统将自动注入该模板对应的内置专业提示词，生成匹配「${styleLabel}」风格的口播文案`;
});

const selectedTemplatePosterUrl = computed(() => {
  if (!selectedTemplate.value) return null;
  return resolveTemplatePosterUrl(selectedTemplate.value);
});

const selectedTemplateVideoUrl = computed(() => {
  if (!selectedTemplate.value) return null;
  return resolveTemplatePreviewUrl(selectedTemplate.value);
});

const selectedTemplateUseVideoCover = computed(() => {
  if (!selectedTemplate.value) return false;
  return shouldPreferVideoCover(selectedTemplate.value);
});

const canGenerateDraft = computed(
  () =>
    currentStep.value === "form" &&
    !props.disabled &&
    !props.isGenerating &&
    !isLoading("draft") &&
    !isLoading("task") &&
    Boolean(selectedTemplate.value) &&
    isFormReadyForDraft.value,
);

const editableScriptText = computed({
  get() {
    return confirmedScriptText.value;
  },
  set(value: string) {
    setConfirmedScriptText(value);
  },
});

const canGenerateAudioPreview = computed(
  () =>
    Boolean(scriptDraft.value?.scriptDraftId) &&
    Boolean(editableScriptText.value.trim()) &&
    Boolean(selectedVoiceId.value) &&
    !props.disabled &&
    !isLoading("audio") &&
    !isLoading("optimize") &&
    !isLoading("translate"),
);

const canOptimizeNarration = computed(
  () =>
    Boolean(scriptDraft.value?.scriptDraftId) &&
    Boolean(editableScriptText.value.trim()) &&
    Boolean(selectedVoiceId.value) &&
    !props.disabled &&
    !isLoading("audio") &&
    !isLoading("optimize") &&
    !isLoading("translate") &&
    !isLoading("task"),
);

const canTranslateNarration = computed(
  () =>
    Boolean(scriptDraft.value?.scriptDraftId) &&
    Boolean(editableScriptText.value.trim()) &&
    isNonChineseLanguage.value &&
    !props.disabled &&
    !isLoading("audio") &&
    !isLoading("optimize") &&
    !isLoading("translate") &&
    !isLoading("task"),
);

const latestAudioPreview = computed(() => audioPreviews.value[0] ?? null);
const estimatedConfirmedAudioPoints = computed(() => {
  const durationMs = confirmedAudioPreview.value?.durationMs ?? 0;
  if (!durationMs) return 0;
  return Math.ceil(durationMs / 1000) * 150;
});
const showConfigurationPage = computed(() =>
  ["form", "task", "result"].includes(currentStep.value),
);
const showConfigurationFooter = computed(() => currentStep.value === "form");

function formatAudioDuration(durationMs?: number | null) {
  if (!durationMs) return "--";
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function resolveAudioPreviewLabel(status: string) {
  if (status === "ready") return "可用于生成";
  if (status === "too_long") return "超过 15 秒";
  if (status === "too_short") return "不足 8 秒";
  return "需重新试听";
}

defineExpose({
  currentStep,
  canGenerateDraft,
  submitDraft,
  isLoading,
});

onMounted(() => {
  void initializeFlow();
});

function handleBrandSelect(name: string) {
  activeBrand.value = name;
  activeSeries.value = "";
}

function handleBrandClear() {
  activeSeries.value = "";
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
}

function handleFiles(
  event: Event,
  handler: (files: File[]) => void | Promise<void>,
) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = "";
  if (!files.length) return;
  void handler(files);
}

function openExteriorPicker() {
  if (props.disabled || isLoading("upload-exterior")) return;
  exteriorInputRef.value?.click();
}

function openInteriorPicker() {
  if (props.disabled || isLoading("upload-interior")) return;
  interiorInputRef.value?.click();
}

function openDealershipPicker() {
  if (props.disabled || isLoading("upload-dealership")) return;
  dealershipInputRef.value?.click();
}

async function handleExteriorDrop(event: DragEvent) {
  event.preventDefault();
  if (props.disabled || isLoading("upload-exterior")) return;
  const files = Array.from(event.dataTransfer?.files ?? []);
  if (!files.length) return;
  await uploadExteriorImages(files);
}

async function handleInteriorDrop(event: DragEvent) {
  event.preventDefault();
  if (props.disabled || isLoading("upload-interior")) return;
  const files = Array.from(event.dataTransfer?.files ?? []);
  if (!files.length) return;
  await uploadInteriorImages(files);
}

async function handleDealershipDrop(event: DragEvent) {
  event.preventDefault();
  if (props.disabled || isLoading("upload-dealership")) return;
  const files = Array.from(event.dataTransfer?.files ?? []);
  if (!files.length) return;
  await uploadDealershipImages(files);
}

function resolveHumanTone(index: number) {
  return humanToneClasses[index % humanToneClasses.length];
}

function resolveHumanSubtitle(human: DigitalHuman) {
  if (human.voiceStatus !== "ready") return "音色待配置";
  if (human.ageStyle) return human.ageStyle;
  if (human.gender === "female") return "优雅干练";
  return "专业稳重";
}

function selectDigitalHuman(human: DigitalHuman) {
  if (props.disabled) return;
  activeDigitalHumanId.value = human.id;
}

async function submitDraft() {
  const draft = await generateScriptDraft();
  if (!draft) {
    currentStep.value = "form";
    if (errorMessage.value) {
      message.error(errorMessage.value);
    }
    return;
  }
  message.success("口播文案已生成，请确认文案并试听音色");
}

async function submitAudioPreview() {
  const preview = await generateAudioPreview();
  if (!preview) {
    if (errorMessage.value) message.error(errorMessage.value);
    return;
  }
  if (preview.canUseForVideo) {
    message.success("试听音频已生成，请试听并确认");
    return;
  }
  message.warning(`试听音频${resolveAudioPreviewLabel(preview.status)}，请调整文案后重新试听`);
}

async function submitNarrationOptimization() {
  const result = await optimizeNarrationScript();
  if (!result) {
    if (errorMessage.value) message.error(errorMessage.value);
    return;
  }
  if (result.converged) {
    message.success(`已优化至 ${formatAudioDuration(result.preview.durationMs)}，请试听并确认`);
    return;
  }
  message.warning(
    `已完成 ${result.attempts} 轮优化，当前 ${formatAudioDuration(result.preview.durationMs)}，请手动调整`,
  );
}

async function submitNarrationTranslation() {
  const result = await translateNarrationScript();
  if (!result) {
    if (errorMessage.value) message.error(errorMessage.value);
    return;
  }
  message.success("已翻译为中文，仅供对照查看");
}

function toggleAudioConfirmation(audioPreviewId: string, canUseForVideo: boolean) {
  if (!canUseForVideo) {
    message.warning("音频时长需在 8–15 秒内，请修改文案或使用一键优化");
    return;
  }
  if (confirmedAudioPreviewId.value === audioPreviewId) {
    cancelAudioPreviewConfirmation();
    message.info("已取消音频确认");
    return;
  }
  if (confirmAudioPreview(audioPreviewId)) {
    message.success("音频已确认，可以生成视频");
  }
}

async function submitConfirmedVideo() {
  const task = await submitVideoTask();
  if (task) {
    message.success("已提交视频生成");
  } else if (errorMessage.value) {
    message.error(errorMessage.value);
  }
}
</script>

<template>
  <div
    class="sv-upload-panel"
    :class="appStore.isDarkMode ? 'sv-theme-dark' : 'sv-theme-light'"
  >
    <div v-if="errorMessage" class="vg-error">{{ errorMessage }}</div>

    <div v-if="isLoading('bootstrap')" class="vg-loading">
      <Icon icon="mdi:loading" class="vg-spin" />
      <span>正在加载视频生成配置</span>
    </div>

    <template v-else-if="currentStep === 'template'">
      <section class="sv-section">
        <header class="sv-section-head">
          <span class="sv-step-index">1</span>
          <div class="sv-section-copy">
            <h3>选择视频模板</h3>
            <p>请先在右侧「模板库」中选择模板，再填写车辆信息与素材</p>
          </div>
        </header>
        <div class="vg-template-hint">
          <Icon icon="mdi:view-grid-outline" />
          <strong>模板库位于右侧面板</strong>
          <span>选择模板后将在此展示分步填写表单</span>
        </div>
      </section>
    </template>

    <template v-else-if="['form', 'review', 'task', 'result'].includes(currentStep) && selectedTemplate">
      <article class="sv-template-summary">
        <PreloadImage
          v-if="selectedTemplatePosterUrl && !selectedTemplateUseVideoCover"
          :key="selectedTemplate.templateId"
          class="sv-template-summary-cover"
          :src="selectedTemplatePosterUrl"
          :alt="selectedTemplate.title"
          fit="cover"
        />
        <HoverPreviewVideo
          v-else-if="selectedTemplateVideoUrl"
          :key="selectedTemplate.templateId"
          class="sv-template-summary-cover"
          :src="selectedTemplateVideoUrl"
          :alt="selectedTemplate.title"
          :interactive="false"
        />
        <div v-else class="sv-template-summary-cover sv-template-summary-cover--placeholder">
          <Icon icon="mdi:movie-open-outline" />
        </div>
        <div class="sv-template-summary-body">
          <h3>{{ selectedTemplate.title }}</h3>
          <div class="sv-template-summary-tags">
            <span>{{ selectedTemplate.typeLabel }}</span>
            <span class="is-accent">{{ selectedTemplate.styleLabel }}</span>
          </div>
          <p>{{ selectedTemplate.stylePrompt }}</p>
        </div>
      </article>

      <template v-if="showConfigurationPage">
      <section class="sv-section">
        <header class="sv-section-head">
          <span class="sv-step-index">1</span>
          <div class="sv-section-copy">
            <h3>上传素材照片</h3>
            <p>{{ isDealershipTemplate ? "拖拽或点击上传车场/展厅照片" : "拖拽或点击上传汽车外观和内饰照片" }}</p>
          </div>
        </header>

        <div class="sv-upload-grid">
          <article
            class="sv-upload-card"
            :class="{
              'sv-upload-card--wide': isDealershipTemplate,
              'is-filled': primaryUploadPreview,
              'is-uploading': isDealershipTemplate
                ? isLoading('upload-dealership')
                : isLoading('upload-exterior'),
            }"
            @click="openPrimaryUploadPicker"
            @dragover="handleDragOver"
            @drop="handlePrimaryUploadDrop"
          >
            <input
              v-if="isDealershipTemplate"
              ref="dealershipInputRef"
              type="file"
              class="sv-upload-input"
              :accept="acceptTypes"
              multiple
              @change="handlePrimaryUploadFiles"
            />
            <input
              v-else
              ref="exteriorInputRef"
              type="file"
              class="sv-upload-input"
              :accept="acceptTypes"
              multiple
              @change="handlePrimaryUploadFiles"
            />

            <PreloadImage
              v-if="primaryUploadPreview"
              class="sv-upload-preview"
              :src="primaryUploadPreview.previewUrl"
              :alt="isDealershipTemplate ? '展厅车场素材预览' : '汽车外观预览'"
              fit="cover"
            />

            <div v-else class="sv-upload-placeholder">
              <span class="sv-upload-icon">
                <Icon icon="mdi:camera-outline" />
              </span>
              <strong>{{ isDealershipTemplate ? "上传展厅/车场素材" : "上传汽车外观照片" }}</strong>
              <span>支持 JPG、PNG，建议分辨率 ≥1920×1080</span>
            </div>

            <div
              v-if="isDealershipTemplate ? dealershipUploads.length : exteriorUploads.length"
              class="sv-upload-thumb-strip"
            >
              <button
                v-for="item in isDealershipTemplate ? dealershipUploads : exteriorUploads"
                :key="item.id"
                type="button"
                class="sv-upload-thumb"
                :class="{ 'is-failed': item.status === 'fail' }"
                :aria-label="`删除${item.name}`"
                @click.stop="
                  isDealershipTemplate
                    ? removeDealershipUpload(item.id)
                    : removeExteriorUpload(item.id)
                "
              >
                <PreloadImage
                  class="sv-upload-thumb-image"
                  :src="item.previewUrl"
                  :alt="item.name"
                  fit="cover"
                />
                <Icon icon="mdi:close" />
              </button>
            </div>

            <span v-if="primaryUploadPreview || isDealershipTemplate" class="sv-upload-count">
              {{ uploadCountLabel }}
            </span>

            <button
              v-if="primaryUploadPreview"
              type="button"
              class="sv-upload-remove"
              :aria-label="isDealershipTemplate ? '删除主展厅素材' : '删除主外观照片'"
              @click.stop="removePrimaryUpload"
            >
              <Icon icon="mdi:close" />
            </button>

            <span
              v-if="
                isDealershipTemplate
                  ? isLoading('upload-dealership')
                  : isLoading('upload-exterior')
              "
              class="sv-upload-loading"
            >
              <Icon icon="mdi:loading" />
            </span>
          </article>

          <article
            v-if="!isDealershipTemplate"
            class="sv-upload-card"
            :class="{
              'is-filled': primaryInterior,
              'is-uploading': isLoading('upload-interior'),
            }"
            @click="openInteriorPicker"
            @dragover="handleDragOver"
            @drop="handleInteriorDrop"
          >
            <input
              ref="interiorInputRef"
              type="file"
              class="sv-upload-input"
              :accept="acceptTypes"
              multiple
              @change="handleFiles($event, uploadInteriorImages)"
            />

            <PreloadImage
              v-if="primaryInterior"
              class="sv-upload-preview"
              :src="primaryInterior.previewUrl"
              alt="汽车内饰预览"
              fit="cover"
            />

            <div v-else class="sv-upload-placeholder">
              <span class="sv-upload-icon">
                <Icon icon="mdi:image-multiple-outline" />
              </span>
              <strong>上传汽车内饰照片</strong>
              <span>支持 JPG、PNG，可选</span>
            </div>

            <span v-if="interiorUploads.length" class="sv-upload-count">
              {{ interiorCountLabel }}
            </span>

            <div v-if="interiorUploads.length" class="sv-upload-thumb-strip">
              <button
                v-for="item in interiorUploads"
                :key="item.id"
                type="button"
                class="sv-upload-thumb"
                :class="{ 'is-failed': item.status === 'fail' }"
                :aria-label="`删除${item.name}`"
                @click.stop="removeInteriorUpload(item.id)"
              >
                <PreloadImage
                  class="sv-upload-thumb-image"
                  :src="item.previewUrl"
                  :alt="item.name"
                  fit="cover"
                />
                <Icon icon="mdi:close" />
              </button>
            </div>

            <button
              v-if="primaryInterior"
              type="button"
              class="sv-upload-remove"
              aria-label="删除内饰照片"
              @click.stop="removeInteriorUpload(primaryInterior.id)"
            >
              <Icon icon="mdi:close" />
            </button>

            <span v-if="isLoading('upload-interior')" class="sv-upload-loading">
              <Icon icon="mdi:loading" />
            </span>
          </article>
        </div>
      </section>

      <section v-if="selectedTemplate.type === 'promotion'" class="sv-section">
        <header class="sv-section-head">
          <span class="sv-step-index">+</span>
          <div class="sv-section-copy">
            <h3>填写促销信息</h3>
            <p>描述当前促销活动内容</p>
          </div>
        </header>
        <label class="sv-field sv-field--block">
          <span class="sv-field-label">优惠信息 <em>*</em></span>
          <textarea
            v-model="promotionForm.promotionText"
            rows="3"
            placeholder="限时优惠、金融方案等"
            :disabled="disabled"
          />
        </label>
      </section>

      <section class="sv-section">
        <header class="sv-section-head">
          <span class="sv-step-index">2</span>
          <div class="sv-section-copy">
            <h3>选择数字人形象</h3>
            <p>选择口播视频的出镜数字人模特</p>
          </div>
        </header>

        <div v-if="digitalHumanList.length" class="sv-human-grid">
          <button
            v-for="(human, index) in digitalHumanList"
            :key="human.id"
            type="button"
            class="sv-human-card"
            :class="[
              resolveHumanTone(index),
              { 'is-active': activeDigitalHumanId === human.id },
            ]"
            :disabled="disabled"
            @click="selectDigitalHuman(human)"
          >
            <span class="sv-human-avatar">
              <PreloadImage
                v-if="human.previewUrl"
                class="sv-human-photo"
                :src="human.previewUrl"
                :alt="human.name"
                fit="cover"
              />
              <Icon v-else icon="mdi:account-outline" />
            </span>
            <strong>{{ human.name }}</strong>
            <span>{{ resolveHumanSubtitle(human) }}</span>
          </button>
        </div>
        <p v-else class="sv-empty-tip">暂无可用数字人，请稍后重试</p>
      </section>

      <section v-if="isSingleCarTemplate" class="sv-section sv-section--vehicle-form">
        <header class="sv-section-head">
          <span class="sv-step-index">3</span>
          <div class="sv-section-copy">
            <h3>填写车型信息</h3>
            <p>五级车型信息，用于精准生成口播文案</p>
          </div>
        </header>

        <div class="sv-form-grid">
          <label class="sv-field">
            <span class="sv-field-label">品牌 <em>*</em></span>
            <VehicleLookupField
              v-model="activeBrand"
              :options="brandOptions"
              placeholder="如：宝马、奔驰、奥迪"
              :disabled="disabled"
              :matched="Boolean(matchedBrand)"
              @select="handleBrandSelect"
              @clear="handleBrandClear"
            />
          </label>
          <label class="sv-field">
            <span class="sv-field-label">年款 <em>*</em></span>
            <input
              v-model="activeModelYear"
              type="text"
              placeholder="如：2020、2021"
              maxlength="4"
              :disabled="disabled"
            />
          </label>
          <label class="sv-field">
            <span class="sv-field-label">排量/动力 <em>*</em></span>
            <input
              v-model="activeDisplacement"
              type="text"
              placeholder="如：2.0T、1.5L、纯电"
              :disabled="disabled"
            />
          </label>
          <label class="sv-field">
            <span class="sv-field-label">车型 <em>*</em></span>
            <VehicleLookupField
              v-model="activeSeries"
              :options="modelOptions"
              placeholder="如：A4L、530Li、E300L"
              :disabled="disabled"
              :matched="Boolean(matchedBrand && activeSeries.trim())"
            />
          </label>
          <label class="sv-field sv-field--wide">
            <span class="sv-field-label">车系 <em>*</em></span>
            <input
              v-model="activeSalesName"
              type="text"
              placeholder="如：5系、E级"
              :disabled="disabled"
            />
          </label>
        </div>
      </section>

      <section class="sv-section">
        <header class="sv-section-head">
          <span class="sv-step-index">{{ languageStepIndex }}</span>
          <div class="sv-section-copy">
            <h3>选择口播语言</h3>
            <p>选择数字人播报的语言</p>
          </div>
        </header>

        <label class="sv-language-select">
          <span class="sv-language-select-icon" aria-hidden="true">
            <Icon icon="mdi:earth" />
          </span>
          <select v-model="activeFormLanguage" :disabled="disabled">
            <option
              v-for="option in languageOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.badge ? `${option.label}（${option.badge}）` : option.label }}
            </option>
          </select>
          <span class="sv-language-select-hint">
            {{ selectedLanguageOption?.hint ?? "请选择语言" }}
          </span>
          <Icon icon="mdi:chevron-down" class="sv-language-select-arrow" aria-hidden="true" />
        </label>
      </section>

      <ul v-if="validationIssues.length" class="vg-issues">
        <li v-for="(issue, index) in validationIssues" :key="`${issue.field}-${index}`">
          {{ issue.message }}
        </li>
      </ul>

      <footer class="sv-tip-banner">
        <Icon icon="mdi:lightbulb-on-outline" aria-hidden="true" />
        <p>{{ tipBannerText }}</p>
      </footer>

      <div v-if="showConfigurationFooter" class="sv-form-footer">
        <button
          type="button"
          class="sv-form-footer-btn sv-form-footer-btn--ghost"
          :disabled="disabled || isGenerating"
          @click="goBackToTemplate"
        >
          取消
        </button>
        <button
          v-if="hasReusableDraft"
          type="button"
          class="sv-form-footer-btn sv-form-footer-btn--primary"
          :disabled="disabled || isGenerating"
          @click="continueReview"
        >
          <Icon icon="mdi:arrow-right" aria-hidden="true" />
          继续确认文案
        </button>
        <button
          v-else
          type="button"
          class="sv-form-footer-btn sv-form-footer-btn--primary"
          :disabled="!canGenerateDraft"
          @click="submitDraft"
        >
          <Icon
            v-if="isLoading('draft') || isLoading('task')"
            icon="mdi:loading"
            class="vg-spin"
            aria-hidden="true"
          />
          <Icon v-else icon="mdi:auto-fix" aria-hidden="true" />
          {{ draftNeedsRegeneration ? "重新生成文案" : "生成文案" }}
        </button>
      </div>
      </template>

      <template v-else-if="currentStep === 'review' && scriptDraft">
      <section class="sv-section sv-script-review">
        <header class="sv-section-head">
          <span class="sv-step-index">5</span>
          <div class="sv-section-copy">
            <h3>确认口播文案</h3>
            <p>修改文案后需要重新试听，音频时长需控制在 8-15 秒</p>
          </div>
        </header>
        <label class="sv-field sv-field--block">
          <span class="sv-field-label">口播文案 <em>*</em></span>
          <textarea
            v-model="editableScriptText"
            rows="5"
            placeholder="请确认或修改数字人口播文案"
            :disabled="disabled || isLoading('audio') || isLoading('optimize') || isLoading('translate') || isLoading('task')"
          />
        </label>
        <div
          v-if="isNonChineseLanguage"
          class="sv-script-actions"
        >
          <button
            type="button"
            class="sv-form-footer-btn sv-form-footer-btn--ghost"
            :disabled="!canTranslateNarration"
            @click="submitNarrationTranslation"
          >
            <Icon
              v-if="isLoading('translate')"
              icon="mdi:loading"
              class="vg-spin"
              aria-hidden="true"
            />
            <Icon v-else icon="mdi:translate" aria-hidden="true" />
            翻译为中文
          </button>
        </div>
        <label
          v-if="translatedNarrationText"
          class="sv-field sv-field--block sv-translation-preview"
        >
          <span class="sv-field-label">中文译文预览（仅供查看）</span>
          <textarea
            :value="translatedNarrationText"
            rows="4"
            readonly
          />
        </label>
        <div
          v-if="latestAudioPreview && !latestAudioPreview.canUseForVideo"
          class="sv-script-actions"
        >
          <button
            type="button"
            class="sv-form-footer-btn sv-form-footer-btn--primary sv-optimize-btn"
            :disabled="!canOptimizeNarration"
            @click="submitNarrationOptimization"
          >
            <Icon
              v-if="isLoading('optimize')"
              icon="mdi:loading"
              class="vg-spin"
              aria-hidden="true"
            />
            <Icon v-else icon="mdi:magic-staff" aria-hidden="true" />
            一键优化到 8–15 秒
          </button>
        </div>
      </section>

      <section class="sv-section sv-audio-preview">
        <header class="sv-section-head">
          <span class="sv-step-index">6</span>
          <div class="sv-section-copy">
            <h3>选择音色并试听</h3>
            <p>音色已按数字人性别过滤，不匹配的男/女声不会出现在列表中</p>
          </div>
        </header>

        <div class="sv-voice-grid">
          <button
            v-for="voice in voiceOptions"
            :key="voice.id"
            type="button"
            class="sv-voice-card"
            :class="{ 'is-active': selectedVoiceId === voice.id }"
            :disabled="disabled || isLoading('audio') || isLoading('optimize') || isLoading('translate') || isLoading('task')"
            @click="selectVoice(voice.id)"
          >
            <strong>{{ voice.label }}</strong>
            <span>{{ voice.gender === 'female' ? '女声' : '男声' }} · {{ voice.tags.join(' / ') }}</span>
          </button>
        </div>

        <p v-if="!voiceOptions.length" class="sv-empty-tip">请先选择已配置音色的数字人</p>

        <div v-if="audioPreviews.length" class="sv-audio-list">
          <article
            v-for="preview in audioPreviews"
            :key="preview.audioPreviewId"
            class="sv-audio-item"
            :class="{
              'is-active': confirmedAudioPreviewId === preview.audioPreviewId,
              'is-invalid': !preview.canUseForVideo,
            }"
          >
            <div class="sv-audio-meta">
              <strong>{{ preview.voiceLabel }}</strong>
              <span>{{ formatAudioDuration(preview.durationMs) }} · {{ resolveAudioPreviewLabel(preview.status) }}</span>
            </div>
            <div class="sv-audio-controls">
              <audio :src="preview.audioUrl" controls preload="none" />
              <button
                type="button"
                class="sv-form-footer-btn sv-audio-confirm"
                :class="{
                  'sv-form-footer-btn--primary': preview.canUseForVideo && confirmedAudioPreviewId !== preview.audioPreviewId,
                  'sv-form-footer-btn--ghost': !preview.canUseForVideo || confirmedAudioPreviewId === preview.audioPreviewId,
                  'is-confirmed': confirmedAudioPreviewId === preview.audioPreviewId,
                }"
                :disabled="!preview.canUseForVideo || disabled || isLoading('task')"
                :title="preview.canUseForVideo ? '' : '音频时长需在 8–15 秒内才能确认'"
                @click="toggleAudioConfirmation(preview.audioPreviewId, preview.canUseForVideo)"
              >
                {{
                  confirmedAudioPreviewId === preview.audioPreviewId
                    ? "取消确认"
                    : preview.canUseForVideo
                      ? "确认此音频"
                      : "无法确认"
                }}
              </button>
            </div>
            <p v-if="!preview.canUseForVideo" class="sv-audio-warning">
              <Icon icon="mdi:alert-circle-outline" aria-hidden="true" />
              音频时长不在 8–15 秒内，请修改文案或使用一键优化。
            </p>
          </article>
        </div>
      </section>

      <div class="sv-form-footer">
        <button
          type="button"
          class="sv-form-footer-btn sv-form-footer-btn--ghost"
          :disabled="disabled || isGenerating"
          @click="goBackToForm"
        >
          <Icon icon="mdi:arrow-left" aria-hidden="true" />
          上一步
        </button>
        <button
          v-if="!confirmedAudioPreview"
          type="button"
          class="sv-form-footer-btn sv-form-footer-btn--primary"
          :disabled="!canGenerateAudioPreview"
          @click="submitAudioPreview"
        >
          <Icon
            v-if="isLoading('audio')"
            icon="mdi:loading"
            class="vg-spin"
            aria-hidden="true"
          />
          <Icon v-else icon="mdi:volume-high" aria-hidden="true" />
          {{ audioPreviews.length ? "重新生成音频" : "生成音频" }}
        </button>
        <button
          v-else
          type="button"
          class="sv-form-footer-btn sv-form-footer-btn--primary"
          :disabled="!canSubmitVideoTask || isLoading('task')"
          @click="submitConfirmedVideo"
        >
          <Icon
            v-if="isLoading('task')"
            icon="mdi:loading"
            class="vg-spin"
            aria-hidden="true"
          />
          <Icon v-else icon="mdi:movie-check-outline" aria-hidden="true" />
          生成视频（{{ estimatedConfirmedAudioPoints }}积分）
        </button>
      </div>
      </template>
    </template>
  </div>
</template>

<style scoped lang="scss">
.sv-upload-panel {
  --sv-accent: var(--workspace-accent, #efc24c);
  --sv-accent-soft: color-mix(in srgb, var(--sv-accent) 16%, transparent);
  --sv-card-bg: color-mix(in srgb, var(--app-surface, #14171a) 92%, #000);
  --sv-card-border: color-mix(in srgb, var(--app-border, #2a3038) 88%, #000);
  --sv-text: var(--app-text, #f3f4f6);
  --sv-text-soft: var(--app-text-soft, #94a3b8);
  --sv-upload-bg: linear-gradient(
    180deg,
    color-mix(in srgb, var(--sv-accent) 8%, #111318) 0%,
    #0f1218 100%
  );
  --sv-human-bg: linear-gradient(180deg, #2a2118 0%, #17120d 100%);
  --sv-tip-bg: color-mix(in srgb, var(--sv-accent) 18%, #1a1408);
  --sv-tip-text: color-mix(in srgb, var(--sv-accent) 72%, #fff);
  --sv-required: #ef4444;

  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sv-upload-panel.sv-theme-light {
  --sv-accent: var(--workspace-accent, #2f6bff);
  --sv-card-bg: #ffffff;
  --sv-card-border: #e2e8f0;
  --sv-text: #0f172a;
  --sv-text-soft: #64748b;
  --sv-upload-bg: linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%);
  --sv-human-bg: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
  --sv-tip-bg: color-mix(in srgb, var(--sv-accent) 10%, #f8fbff);
  --sv-tip-text: #334155;
}

.sv-section {
  padding: 18px 18px 20px;
  border: 1px solid var(--sv-card-border);
  border-radius: 16px;
  background: var(--sv-card-bg);
}

.sv-section--vehicle-form,
.sv-section--vehicle-form .sv-form-grid {
  overflow: visible;
}

.sv-section--optional {
  border-style: dashed;
}

.sv-section-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.sv-section-head--row {
  justify-content: space-between;
}

.sv-section-head-main {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  min-width: 0;
}

.sv-step-index {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: var(--sv-accent-soft);
  color: var(--sv-accent);
  font-size: 14px;
  font-weight: 800;
}

.sv-step-index.is-muted {
  background: color-mix(in srgb, var(--sv-text-soft) 16%, transparent);
  color: var(--sv-text-soft);
}

.sv-section-copy h3 {
  margin: 0 0 4px;
  color: var(--sv-text);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.35;
}

.sv-section-copy p {
  margin: 0;
  color: var(--sv-text-soft);
  font-size: 13px;
  line-height: 1.5;
}

.sv-template-summary {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 14px 16px;
  border: 1px solid color-mix(in srgb, var(--sv-accent) 42%, var(--sv-card-border));
  border-radius: 16px;
  background: var(--sv-card-bg);
}

.sv-template-summary-cover {
  width: 88px;
  height: 112px;
  border-radius: 10px;
  overflow: hidden;
  background: #111;
}

.sv-template-summary-cover.hover-preview-video,
.sv-template-summary-cover :deep(.hover-preview-video) {
  width: 88px;
  height: 112px;
}

.sv-template-summary-cover--placeholder {
  display: grid;
  place-items: center;
  color: var(--sv-text-soft);
  font-size: 28px;
}

.sv-template-summary-cover :deep(.preload-image),
.sv-template-summary-cover :deep(.preload-image__img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sv-template-summary-body h3 {
  margin: 0 0 8px;
  color: var(--sv-text);
  font-size: 16px;
  font-weight: 700;
}

.sv-template-summary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;

  span {
    padding: 2px 10px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--sv-text-soft) 14%, transparent);
    color: var(--sv-text-soft);
    font-size: 12px;
    font-weight: 600;
  }

  .is-accent {
    background: color-mix(in srgb, var(--sv-accent) 18%, transparent);
    color: var(--sv-accent);
  }
}

.sv-template-summary-body p {
  margin: 0;
  color: var(--sv-text-soft);
  font-size: 13px;
  line-height: 1.5;
}

.sv-template-summary-action {
  border: 0;
  background: transparent;
  color: var(--sv-accent);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.vg-error {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.12);
  color: #fca5a5;
  font-size: 13px;
}

.vg-loading {
  display: grid;
  place-items: center;
  gap: 8px;
  min-height: 180px;
  color: var(--sv-text-soft);
}

.vg-spin {
  animation: sv-spin 0.9s linear infinite;
}

.vg-template-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 160px;
  padding: 24px 16px;
  border: 1px dashed color-mix(in srgb, var(--sv-accent) 34%, var(--sv-card-border));
  border-radius: 14px;
  background: var(--sv-upload-bg);
  color: var(--sv-text-soft);
  text-align: center;

  svg {
    color: var(--sv-accent);
    font-size: 28px;
  }

  strong {
    color: var(--sv-text);
    font-size: 14px;
    font-weight: 700;
  }
}

.sv-upload-grid,
.sv-human-grid {
  display: grid;
  gap: 12px;
}

.sv-upload-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.sv-human-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.sv-upload-card {
  position: relative;
  min-height: 148px;
  overflow: hidden;
  border: 1px dashed color-mix(in srgb, var(--sv-accent) 34%, var(--sv-card-border));
  border-radius: 14px;
  background: var(--sv-upload-bg);
  cursor: pointer;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.sv-upload-card--wide {
  grid-column: 1 / -1;
  min-height: 180px;
}

.sv-upload-card:hover:not(.is-uploading) {
  border-color: color-mix(in srgb, var(--sv-accent) 58%, var(--sv-card-border));
  box-shadow: 0 8px 24px color-mix(in srgb, var(--sv-accent) 10%, transparent);
}

.sv-upload-card.is-filled {
  border-style: solid;
}

.sv-upload-input {
  display: none;
}

.sv-upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 148px;
  padding: 18px 14px;
  text-align: center;
}

.sv-upload-placeholder--wide {
  min-height: 180px;
}

.sv-upload-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--sv-accent) 14%, transparent);
  color: var(--sv-accent);
  font-size: 22px;
}

.sv-upload-placeholder strong {
  color: var(--sv-text);
  font-size: 14px;
  font-weight: 700;
}

.sv-upload-placeholder span:last-child {
  color: var(--sv-text-soft);
  font-size: 12px;
  line-height: 1.45;
}

.sv-upload-preview {
  width: 100%;
  height: 148px;
}

.sv-upload-card--wide .sv-upload-preview,
.sv-upload-card--wide .sv-upload-placeholder {
  min-height: 180px;
}

.sv-upload-preview--wide {
  height: 180px;
}

.sv-upload-preview :deep(.preload-image),
.sv-upload-preview :deep(.preload-image__img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sv-upload-count {
  position: absolute;
  left: 10px;
  bottom: 10px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.sv-upload-thumb-strip {
  position: absolute;
  right: 10px;
  bottom: 10px;
  left: 68px;
  z-index: 2;
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  min-width: 0;
  pointer-events: none;
}

.sv-upload-thumb {
  position: relative;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.62);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  cursor: pointer;
  pointer-events: auto;
}

.sv-upload-thumb.is-failed {
  border-color: #ef4444;
}

.sv-upload-thumb :deep(.preload-image),
.sv-upload-thumb :deep(.preload-image__img),
.sv-upload-thumb-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sv-upload-thumb .iconify {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 16px;
  height: 16px;
  padding: 2px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.78);
  color: #fff;
  opacity: 0;
  transform: translate(-50%, -50%);
  transition: opacity 160ms ease;
}

.sv-upload-thumb:hover .iconify {
  opacity: 1;
}

.sv-upload-remove,
.sv-upload-loading {
  position: absolute;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.sv-upload-remove {
  top: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  cursor: pointer;
}

.sv-upload-loading {
  inset: 0;
  background: rgba(15, 23, 42, 0.42);
  color: #fff;
  font-size: 28px;
}

.sv-upload-loading .iconify {
  animation: sv-spin 0.9s linear infinite;
}

.sv-human-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-height: 118px;
  padding: 14px 10px 12px;
  border: 1px solid var(--sv-card-border);
  border-radius: 14px;
  background: var(--sv-card-bg);
  color: var(--sv-text-soft);
  text-align: center;
  cursor: pointer;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

.sv-human-card:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--sv-accent) 42%, var(--sv-card-border));
}

.sv-human-card.is-active {
  border-color: color-mix(in srgb, var(--sv-accent) 62%, var(--sv-card-border));
  box-shadow: 0 10px 24px color-mix(in srgb, var(--sv-accent) 12%, transparent);
}

.sv-human-card strong {
  color: var(--sv-text);
  font-size: 14px;
  font-weight: 700;
}

.sv-human-card span:last-child {
  font-size: 12px;
  line-height: 1.4;
}

.sv-human-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  overflow: hidden;
  border-radius: 14px;
  background: var(--sv-human-bg);
  color: color-mix(in srgb, var(--sv-accent) 72%, #fff);
  font-size: 28px;
}

.sv-human-photo,
.sv-human-photo :deep(.preload-image),
.sv-human-photo :deep(.preload-image__img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sv-human-card.tone-cool .sv-human-avatar {
  background: linear-gradient(180deg, #1f2937 0%, #111827 100%);
}

.sv-language-select {
  position: relative;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto 20px;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 6px 12px;
  border: 1px solid color-mix(in srgb, var(--sv-accent) 28%, var(--sv-card-border));
  border-radius: 12px;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--sv-accent) 7%, transparent),
      transparent 58%
    ),
    color-mix(in srgb, var(--sv-card-bg) 86%, #05070a);
  color: var(--sv-text);
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    background 180ms ease;
}

.sv-language-select:hover {
  border-color: color-mix(in srgb, var(--sv-accent) 46%, var(--sv-card-border));
}

.sv-language-select:focus-within {
  border-color: color-mix(in srgb, var(--sv-accent) 68%, var(--sv-card-border));
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--sv-accent) 14%, transparent),
    0 10px 24px color-mix(in srgb, var(--sv-accent) 8%, transparent);
}

.sv-language-select-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--sv-accent) 12%, transparent);
  color: var(--sv-accent);
  font-size: 18px;
}

.sv-language-select select {
  min-width: 0;
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--sv-text);
  font: inherit;
  font-weight: 700;
  outline: none;
  appearance: none;
  cursor: pointer;
}

.sv-language-select select option {
  background: #101318;
  color: #f8fafc;
  font-weight: 600;
}

.sv-language-select select option:checked {
  background: color-mix(in srgb, var(--sv-accent) 38%, #101318);
  color: #ffffff;
}

.sv-language-select select:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.sv-language-select-hint {
  color: var(--sv-text-soft);
  font-size: 12px;
  white-space: nowrap;
}

.sv-language-select-arrow {
  color: color-mix(in srgb, var(--sv-accent) 72%, var(--sv-text-soft));
  font-size: 18px;
  pointer-events: none;
}

.sv-theme-light .sv-language-select {
  border-color: color-mix(in srgb, var(--sv-accent) 22%, var(--sv-card-border));
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--sv-accent) 6%, transparent),
      transparent 60%
    ),
    #ffffff;
}

.sv-theme-light .sv-language-select select option {
  background: #ffffff;
  color: #0f172a;
}

.sv-theme-light .sv-language-select select option:checked {
  background: color-mix(in srgb, var(--sv-accent) 14%, #ffffff);
  color: #0f172a;
}

.sv-form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.sv-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sv-field--block {
  margin-bottom: 14px;
}

.sv-field--wide {
  grid-column: span 2;
}

.sv-field-label {
  color: var(--sv-text);
  font-size: 13px;
  font-weight: 600;
}

.sv-field-label em {
  color: var(--sv-required);
  font-style: normal;
}

.sv-field input,
.sv-field textarea {
  width: 100%;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid var(--sv-card-border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--sv-card-bg) 88%, #000);
  color: var(--sv-text);
  font-size: 14px;
  outline: none;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.sv-field textarea {
  min-height: 96px;
  padding: 10px 12px;
  resize: vertical;
}

.sv-theme-light .sv-field input,
.sv-theme-light .sv-field textarea {
  background: #f8fafc;
}

.sv-field :deep(.vehicle-lookup-input) {
  background: color-mix(in srgb, var(--sv-card-bg) 88%, #000);
}

.sv-theme-light .sv-field :deep(.vehicle-lookup-input) {
  background: #f8fafc;
}

.sv-field input:focus,
.sv-field textarea:focus {
  border-color: color-mix(in srgb, var(--sv-accent) 52%, var(--sv-card-border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--sv-accent) 12%, transparent);
}

.sv-field input::placeholder,
.sv-field textarea::placeholder {
  color: color-mix(in srgb, var(--sv-text-soft) 84%, transparent);
}

.sv-thumb-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.sv-thumb-row--upload {
  margin-top: 0;
}

.sv-thumb-item,
.sv-thumb-add {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 10px;
  overflow: hidden;
  background: #111;
}

.sv-thumb-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sv-thumb-item button {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  cursor: pointer;
}

.sv-thumb-add {
  display: grid;
  place-items: center;
  border: 1px dashed color-mix(in srgb, var(--sv-accent) 34%, var(--sv-card-border));
  color: var(--sv-accent);
  cursor: pointer;
  font-size: 22px;
}

.sv-empty-tip {
  margin: 0;
  color: var(--sv-text-soft);
  font-size: 13px;
}

.sv-script-review textarea {
  min-height: 132px;
  line-height: 1.65;
}

.sv-script-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.sv-optimize-btn {
  min-width: 196px;
}

.sv-voice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.sv-voice-card {
  display: flex;
  min-height: 74px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 6px;
  padding: 12px 14px;
  border: 1px solid var(--sv-card-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--sv-card-bg) 92%, #000);
  color: var(--sv-text);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 180ms ease,
    background-color 180ms ease;
}

.sv-theme-light .sv-voice-card {
  background: #f8fafc;
}

.sv-voice-card strong {
  font-size: 14px;
}

.sv-voice-card span {
  color: var(--sv-text-soft);
  font-size: 12px;
  line-height: 1.45;
}

.sv-voice-card.is-active {
  border-color: color-mix(in srgb, var(--sv-accent) 64%, var(--sv-card-border));
  background: color-mix(in srgb, var(--sv-accent) 12%, var(--sv-card-bg));
}

.sv-voice-card:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.sv-audio-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.sv-audio-item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--sv-card-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--sv-card-bg) 94%, #000);
}

.sv-theme-light .sv-audio-item {
  background: #f8fafc;
}

.sv-audio-item.is-active {
  border-color: color-mix(in srgb, var(--sv-accent) 68%, var(--sv-card-border));
}

.sv-audio-item.is-invalid {
  border-style: dashed;
}

.sv-audio-meta {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.sv-audio-controls {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.sv-audio-meta strong {
  color: var(--sv-text);
  font-size: 13px;
}

.sv-audio-meta span {
  color: var(--sv-text-soft);
  font-size: 12px;
}

.sv-audio-controls audio {
  width: 100%;
  min-width: 0;
  height: 36px;
}

.sv-audio-confirm {
  min-width: 104px;
  max-width: 132px;
  padding-inline: 14px;
  white-space: nowrap;
}

.sv-audio-confirm.is-confirmed {
  border-color: color-mix(in srgb, var(--sv-accent) 70%, var(--sv-card-border));
  background: color-mix(in srgb, var(--sv-accent) 14%, var(--sv-card-bg));
  color: var(--sv-accent);
}

.sv-audio-warning {
  display: flex;
  gap: 6px;
  align-items: center;
  margin: 0;
  color: #d97706;
  font-size: 12px;
  line-height: 1.5;
}

.sv-audio-warning .iconify {
  flex: 0 0 auto;
  font-size: 16px;
}

.sv-tip-banner {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--sv-tip-bg);
  color: var(--sv-tip-text);
}

.sv-tip-banner .iconify {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--sv-accent);
  font-size: 18px;
}

.sv-tip-banner p {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
}

.sv-form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 4px;
}

.sv-form-footer-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 112px;
  min-height: 42px;
  padding: 0 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    opacity 0.2s ease;
}

.sv-form-footer-btn:disabled {
  opacity: 0.52;
  cursor: not-allowed;
}

.sv-form-footer-btn--ghost {
  border: 1px solid var(--sv-card-border);
  background: color-mix(in srgb, var(--sv-card-bg) 88%, #000);
  color: var(--sv-text-soft);
}

.sv-form-footer-btn--ghost:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--sv-text-soft) 40%, var(--sv-card-border));
  color: var(--sv-text);
}

.sv-form-footer-btn--primary {
  border: 0;
  background: var(--sv-accent);
  color: #111;
}

.sv-form-footer-btn--primary:hover:not(:disabled) {
  background: color-mix(in srgb, var(--sv-accent) 88%, #fff);
}

.sv-theme-light .sv-form-footer-btn--primary {
  color: #fff;
}

.sv-form-footer-btn .iconify {
  font-size: 16px;
}

.vg-review-card {
  padding: 12px;
  border: 1px solid var(--sv-card-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--sv-card-bg) 96%, #000);
  margin-bottom: 12px;

  h4 {
    margin: 0 0 8px;
    font-size: 14px;
  }

  pre,
  p,
  li {
    margin: 0;
    color: var(--sv-text-soft);
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  &.is-warning {
    border-color: rgba(239, 68, 68, 0.35);
  }
}

.vg-script-text {
  color: var(--sv-text) !important;
  font-size: 14px !important;
}

.vg-issues {
  margin: 0;
  padding-left: 18px;
  color: #fca5a5;
  font-size: 13px;
}

@keyframes sv-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1023px) {
  .sv-human-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .sv-form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .sv-field--wide {
    grid-column: span 2;
  }

  .sv-template-summary {
    grid-template-columns: 72px minmax(0, 1fr);
  }
}

@media (max-width: 767px) {
  .sv-upload-grid,
  .sv-form-grid,
  .sv-voice-grid {
    grid-template-columns: 1fr;
  }

  .sv-language-select {
    grid-template-columns: 34px minmax(0, 1fr) 20px;
  }

  .sv-language-select-hint {
    display: none;
  }

  .sv-field--wide {
    grid-column: auto;
  }

  .sv-template-summary {
    grid-template-columns: 1fr;
  }

  .sv-form-footer {
    flex-direction: column;
  }

  .sv-form-footer-btn {
    width: 100%;
  }

  .sv-script-actions,
  .sv-audio-controls {
    display: grid;
    grid-template-columns: 1fr;
  }

  .sv-audio-confirm {
    width: 100%;
    max-width: none;
  }

  .sv-optimize-btn {
    width: 100%;
    min-width: 0;
  }
}
</style>
