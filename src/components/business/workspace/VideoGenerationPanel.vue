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
  getVideoScriptGeneratorLabel,
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

const emit = defineEmits<{
  generateDraft: [];
  confirmVideo: [scriptDraftId: string];
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
  digitalHumanList,
  singleCarForm,
  promotionForm,
  dealershipForm,
  exteriorUploads,
  interiorUploads,
  dealershipUploads,
  scriptDraft,
  validationIssues,
  errorMessage,
  isLoading,
  initializeFlow,
  goBackToTemplate,
  goBackToForm,
  generateScriptDraft,
  uploadExteriorImages,
  uploadInteriorImages,
  uploadDealershipImages,
  removeExteriorUpload,
  removeInteriorUpload,
  removeDealershipUpload,
} = flow;

const acceptTypes = "image/jpeg,image/png,image/webp";

const languageOptions = [
  {
    value: "zh-CN" as const,
    label: "中文（普通话）",
    hint: "最常用",
    badge: "最常用",
  },
  { value: "en" as const, label: "英文", hint: "English" },
  { value: "yue" as const, label: "粤语", hint: "广东话" },
];

const humanToneClasses = ["tone-warm", "tone-cool", "tone-neutral", "tone-warm"];

const isCarTemplate = computed(() =>
  ["single-car", "promotion", "dealership"].includes(
    selectedTemplate.value?.type ?? "",
  ),
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

const scriptText = computed(
  () => scriptDraft.value?.requiredInputs?.script?.scriptText ?? "",
);
const shotCues = computed(
  () => scriptDraft.value?.requiredInputs?.script?.shotCues ?? [],
);
const vehicleProfile = computed(
  () => scriptDraft.value?.requiredInputs?.script?.vehicleProfile ?? null,
);

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
    Boolean(selectedTemplate.value),
);

const canConfirmVideo = computed(
  () =>
    currentStep.value === "draft-review" &&
    Boolean(scriptDraft.value?.scriptDraftId) &&
    !props.disabled &&
    !props.isGenerating &&
    !isLoading("task"),
);

defineExpose({
  currentStep,
  canGenerateDraft,
  canConfirmVideo,
  submitDraft,
  confirmVideo,
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
  if (draft) {
    message.success("口播草稿已生成");
    emit("generateDraft");
  } else if (errorMessage.value) {
    message.error(errorMessage.value);
  }
}

async function confirmVideo() {
  if (!scriptDraft.value?.scriptDraftId) {
    errorMessage.value = "请先生成并确认口播草稿";
    return;
  }
  emit("confirmVideo", scriptDraft.value.scriptDraftId);
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

    <template v-else-if="currentStep === 'form' && selectedTemplate">
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

      <section class="sv-section">
        <header class="sv-section-head">
          <span class="sv-step-index">1</span>
          <div class="sv-section-copy">
            <h3>上传素材照片</h3>
            <p>拖拽或点击上传汽车外观和内饰照片</p>
          </div>
        </header>

        <div class="sv-upload-grid">
          <article
            class="sv-upload-card"
            :class="{
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
              alt="汽车外观预览"
              fit="cover"
            />

            <div v-else class="sv-upload-placeholder">
              <span class="sv-upload-icon">
                <Icon icon="mdi:camera-outline" />
              </span>
              <strong>上传汽车外观照片</strong>
              <span>支持 JPG、PNG，建议分辨率 ≥1920×1080</span>
            </div>

            <span v-if="primaryUploadPreview || isDealershipTemplate" class="sv-upload-count">
              {{ uploadCountLabel }}
            </span>

            <button
              v-if="primaryUploadPreview"
              type="button"
              class="sv-upload-remove"
              aria-label="删除外观照片"
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

          <article
            v-else
            class="sv-upload-card"
            :class="{
              'is-filled': dealershipUploads.length > 1,
              'is-uploading': isLoading('upload-dealership'),
            }"
            @click="openDealershipPicker"
            @dragover="handleDragOver"
            @drop="handleDealershipDrop"
          >
            <input
              type="file"
              class="sv-upload-input"
              :accept="acceptTypes"
              multiple
              @change="handleFiles($event, uploadDealershipImages)"
            />

            <PreloadImage
              v-if="dealershipUploads[1]"
              class="sv-upload-preview"
              :src="dealershipUploads[1].previewUrl"
              alt="补充展厅图预览"
              fit="cover"
            />

            <div v-else class="sv-upload-placeholder">
              <span class="sv-upload-icon">
                <Icon icon="mdi:image-multiple-outline" />
              </span>
              <strong>上传汽车内饰照片</strong>
              <span>支持 JPG、PNG，可选</span>
            </div>

            <span v-if="dealershipUploads.length > 1" class="sv-upload-count">
              {{ uploadCountLabel }}
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

      <section v-if="isCarTemplate" class="sv-section sv-section--vehicle-form">
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
              :disabled="disabled || !matchedBrand"
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
          <span class="sv-step-index">4</span>
          <div class="sv-section-copy">
            <h3>选择口播语言</h3>
            <p>选择数字人播报的语言</p>
          </div>
        </header>

        <div class="sv-language-grid">
          <button
            v-for="option in languageOptions"
            :key="option.value"
            type="button"
            class="sv-language-card"
            :class="{ 'is-active': activeFormLanguage === option.value }"
            :disabled="disabled"
            @click="activeFormLanguage = option.value"
          >
            <span class="sv-language-icon" aria-hidden="true">
              <Icon icon="mdi:earth" />
            </span>
            <span v-if="option.badge" class="sv-language-badge">{{ option.badge }}</span>
            <strong>{{ option.label }}</strong>
            <span>{{ option.hint }}</span>
          </button>
        </div>
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

      <div class="sv-form-footer">
        <button
          type="button"
          class="sv-form-footer-btn sv-form-footer-btn--ghost"
          :disabled="disabled || isGenerating"
          @click="goBackToTemplate"
        >
          取消
        </button>
        <button
          type="button"
          class="sv-form-footer-btn sv-form-footer-btn--primary"
          :disabled="!canGenerateDraft"
          @click="submitDraft"
        >
          <Icon
            v-if="isLoading('draft')"
            icon="mdi:loading"
            class="vg-spin"
            aria-hidden="true"
          />
          <Icon v-else icon="mdi:auto-fix" aria-hidden="true" />
          开始生成
        </button>
      </div>
    </template>

    <section v-else-if="currentStep === 'draft-review' && scriptDraft" class="sv-section">
      <header class="sv-section-head sv-section-head--row">
        <div class="sv-section-head-main">
          <span class="sv-step-index">✓</span>
          <div class="sv-section-copy">
            <h3>审核口播草稿</h3>
            <p>{{ getVideoScriptGeneratorLabel(scriptDraft.requiredInputs?.script?.generator) }}</p>
          </div>
        </div>
        <button type="button" class="sv-template-summary-action" @click="goBackToForm">
          返回修改
        </button>
      </header>

      <article class="vg-review-card">
        <h4>口播正文</h4>
        <p class="vg-script-text">{{ scriptText }}</p>
      </article>

      <article v-if="vehicleProfile" class="vg-review-card">
        <h4>车辆信息</h4>
        <pre>{{ JSON.stringify(vehicleProfile, null, 2) }}</pre>
      </article>

      <article v-if="shotCues.length" class="vg-review-card">
        <h4>镜头提示</h4>
        <ul>
          <li v-for="(cue, index) in shotCues" :key="index">
            {{ cue.label || cue.description || JSON.stringify(cue) }}
          </li>
        </ul>
      </article>

      <article class="vg-review-card">
        <h4>最终视频提示词</h4>
        <p>{{ scriptDraft.finalVideoPrompt }}</p>
      </article>

      <article v-if="scriptDraft.riskNotes?.length" class="vg-review-card is-warning">
        <h4>风险提示</h4>
        <ul>
          <li v-for="(note, index) in scriptDraft.riskNotes" :key="index">{{ note }}</li>
        </ul>
      </article>

      <div class="sv-form-footer">
        <button
          type="button"
          class="sv-form-footer-btn sv-form-footer-btn--ghost"
          :disabled="disabled || isGenerating"
          @click="goBackToForm"
        >
          返回修改
        </button>
        <button
          type="button"
          class="sv-form-footer-btn sv-form-footer-btn--primary"
          :disabled="!canConfirmVideo"
          @click="confirmVideo"
        >
          <Icon
            v-if="isLoading('task')"
            icon="mdi:loading"
            class="vg-spin"
            aria-hidden="true"
          />
          <Icon v-else icon="mdi:sparkles" aria-hidden="true" />
          确认生成视频
        </button>
      </div>
    </section>
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
.sv-human-grid,
.sv-language-grid {
  display: grid;
  gap: 12px;
}

.sv-upload-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.sv-human-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.sv-language-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
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

.sv-human-card,
.sv-language-card {
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

.sv-human-card:hover:not(:disabled),
.sv-language-card:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--sv-accent) 42%, var(--sv-card-border));
}

.sv-human-card.is-active,
.sv-language-card.is-active {
  border-color: color-mix(in srgb, var(--sv-accent) 62%, var(--sv-card-border));
  box-shadow: 0 10px 24px color-mix(in srgb, var(--sv-accent) 12%, transparent);
}

.sv-human-card strong,
.sv-language-card strong {
  color: var(--sv-text);
  font-size: 14px;
  font-weight: 700;
}

.sv-human-card span:last-child,
.sv-language-card span:last-child {
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

.sv-language-icon {
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

.sv-language-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--sv-accent) 18%, transparent);
  color: var(--sv-accent);
  font-size: 10px;
  font-weight: 700;
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
  .sv-language-grid,
  .sv-form-grid {
    grid-template-columns: 1fr;
  }

  .sv-field--wide {
    grid-column: auto;
  }

  .sv-template-summary {
    grid-template-columns: 1fr;
  }
}
</style>
