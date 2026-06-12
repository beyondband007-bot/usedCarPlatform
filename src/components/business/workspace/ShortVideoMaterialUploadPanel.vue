<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { Icon } from "@iconify/vue";
import { useMessage } from "naive-ui";

import { uploadAsset, type UploadedAsset } from "@/api/visual-workbench";
import PreloadImage from "@/components/common/PreloadImage.vue";
import VehicleLookupField from "@/components/business/workspace/VehicleLookupField.vue";
import { useAppStore } from "@/stores/app";
import type { WorkspaceCapability, WorkspaceGeneratePayload } from "@/types/workspace";
import {
  findCarBrandByName,
  getCarModelDisplayNames,
  searchCarBrands,
} from "@/utils/car-brand-series";

type UploadSlot = "exterior" | "interior";
type LanguageOption = "zh" | "en" | "yue";

interface DigitalHumanOption {
  id: string;
  name: string;
  style: string;
  tone: "warm" | "cool" | "neutral";
}

const props = defineProps<{
  capability: WorkspaceCapability;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  generate: [payload: WorkspaceGeneratePayload];
  "can-submit-change": [value: boolean];
}>();

const message = useMessage();
const appStore = useAppStore();

const exteriorInputRef = ref<HTMLInputElement | null>(null);
const interiorInputRef = ref<HTMLInputElement | null>(null);

const exteriorAsset = ref<UploadedAsset | null>(null);
const interiorAsset = ref<UploadedAsset | null>(null);
const exteriorPreviewUrl = ref("");
const interiorPreviewUrl = ref("");
const uploadingSlot = ref<UploadSlot | null>(null);

const selectedDigitalHumanId = ref("business-man");
const selectedLanguage = ref<LanguageOption>("zh");

const vehicleForm = ref({
  brand: "",
  year: "",
  displacement: "",
  model: "",
  series: "",
});

const matchedBrand = computed(() => findCarBrandByName(vehicleForm.value.brand));

const brandOptions = computed(() =>
  searchCarBrands(vehicleForm.value.brand).map((item) => item.name),
);

const modelOptions = computed(() => {
  if (!matchedBrand.value) return [];
  return getCarModelDisplayNames(matchedBrand.value);
});

watch(
  () => vehicleForm.value.brand,
  (value, previous) => {
    if (value.trim() === previous.trim()) return;
    if (!findCarBrandByName(value)) {
      vehicleForm.value.model = "";
    }
  },
);

function handleBrandSelect(name: string) {
  vehicleForm.value.brand = name;
  vehicleForm.value.model = "";
}

function handleBrandClear() {
  vehicleForm.value.model = "";
}

const digitalHumans: DigitalHumanOption[] = [
  { id: "business-man", name: "商务男士", style: "专业稳重", tone: "warm" },
  { id: "casual-man", name: "休闲男士", style: "阳光亲和", tone: "cool" },
  { id: "professional-woman", name: "职业女士", style: "优雅干练", tone: "neutral" },
  { id: "casual-woman", name: "休闲女士", style: "亲切活泼", tone: "warm" },
];

const languageOptions: Array<{
  id: LanguageOption;
  label: string;
  hint: string;
  badge?: string;
}> = [
  { id: "zh", label: "中文（普通话）", hint: "最常用", badge: "最常用" },
  { id: "en", label: "英文", hint: "English" },
  { id: "yue", label: "粤语", hint: "广东话" },
];

const acceptTypes = "image/jpeg,image/png,image/webp";

const isVehicleFormComplete = computed(() =>
  Object.values(vehicleForm.value).every((value) => value.trim().length > 0),
);

const canSubmit = computed(
  () =>
    Boolean(exteriorAsset.value?.assetId) &&
    isVehicleFormComplete.value &&
    !uploadingSlot.value &&
    !props.disabled,
);

watch(
  canSubmit,
  (value) => {
    emit("can-submit-change", value);
  },
  { immediate: true },
);

onUnmounted(() => {
  revokePreview(exteriorPreviewUrl.value);
  revokePreview(interiorPreviewUrl.value);
});

function revokePreview(url: string) {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function openPicker(slot: UploadSlot) {
  if (props.disabled || uploadingSlot.value) return;
  if (slot === "exterior") {
    exteriorInputRef.value?.click();
    return;
  }
  interiorInputRef.value?.click();
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
}

async function handleDrop(slot: UploadSlot, event: DragEvent) {
  event.preventDefault();
  if (props.disabled || uploadingSlot.value) return;

  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  await uploadFile(slot, file);
}

async function handleFileChange(slot: UploadSlot, event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  await uploadFile(slot, file);
}

async function uploadFile(slot: UploadSlot, file: File) {
  if (!file.type.startsWith("image/")) {
    message.warning("请上传 JPG / PNG / WebP 图片");
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    message.warning("图片大小不能超过 10MB");
    return;
  }

  uploadingSlot.value = slot;
  const previewUrl = URL.createObjectURL(file);

  try {
    const purpose = slot === "exterior" ? "car_exterior" : "car_interior";
    const asset = await uploadAsset(file, purpose);

    if (slot === "exterior") {
      revokePreview(exteriorPreviewUrl.value);
      exteriorAsset.value = asset;
      exteriorPreviewUrl.value = previewUrl;
    } else {
      revokePreview(interiorPreviewUrl.value);
      interiorAsset.value = asset;
      interiorPreviewUrl.value = previewUrl;
    }
  } catch (error) {
    URL.revokeObjectURL(previewUrl);
    const text = error instanceof Error ? error.message : "图片上传失败";
    message.error(text);
  } finally {
    uploadingSlot.value = null;
  }
}

function removeUpload(slot: UploadSlot) {
  if (props.disabled || uploadingSlot.value) return;

  if (slot === "exterior") {
    revokePreview(exteriorPreviewUrl.value);
    exteriorAsset.value = null;
    exteriorPreviewUrl.value = "";
    return;
  }

  revokePreview(interiorPreviewUrl.value);
  interiorAsset.value = null;
  interiorPreviewUrl.value = "";
}

function submit() {
  if (!exteriorAsset.value?.assetId) {
    message.warning("请先上传汽车外观照片");
    return;
  }

  if (!isVehicleFormComplete.value) {
    message.warning("请完整填写车型信息");
    return;
  }

  emit("generate", {
    inputAssetId: exteriorAsset.value.assetId,
    outputRatio: "16:9",
  });
}

defineExpose({ submit, canSubmit });
</script>

<template>
  <div
    class="sv-upload-panel"
    :class="appStore.isDarkMode ? 'sv-theme-dark' : 'sv-theme-light'"
  >
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
            'is-filled': exteriorPreviewUrl,
            'is-uploading': uploadingSlot === 'exterior',
          }"
          @click="openPicker('exterior')"
          @dragover="handleDragOver"
          @drop="handleDrop('exterior', $event)"
        >
          <input
            ref="exteriorInputRef"
            type="file"
            class="sv-upload-input"
            :accept="acceptTypes"
            @change="handleFileChange('exterior', $event)"
          />

          <PreloadImage
            v-if="exteriorPreviewUrl"
            class="sv-upload-preview"
            :src="exteriorPreviewUrl"
            alt="汽车外观预览"
            loading="lazy"
            decoding="async"
          />

          <div v-else class="sv-upload-placeholder">
            <span class="sv-upload-icon">
              <Icon icon="mdi:camera-outline" />
            </span>
            <strong>上传汽车外观照片</strong>
            <span>支持 JPG、PNG，建议分辨率 ≥1920×1080</span>
          </div>

          <button
            v-if="exteriorPreviewUrl"
            type="button"
            class="sv-upload-remove"
            aria-label="删除外观照片"
            @click.stop="removeUpload('exterior')"
          >
            <Icon icon="mdi:close" />
          </button>

          <span v-if="uploadingSlot === 'exterior'" class="sv-upload-loading">
            <Icon icon="mdi:loading" />
          </span>
        </article>

        <article
          class="sv-upload-card"
          :class="{
            'is-filled': interiorPreviewUrl,
            'is-uploading': uploadingSlot === 'interior',
          }"
          @click="openPicker('interior')"
          @dragover="handleDragOver"
          @drop="handleDrop('interior', $event)"
        >
          <input
            ref="interiorInputRef"
            type="file"
            class="sv-upload-input"
            :accept="acceptTypes"
            @change="handleFileChange('interior', $event)"
          />

          <PreloadImage
            v-if="interiorPreviewUrl"
            class="sv-upload-preview"
            :src="interiorPreviewUrl"
            alt="汽车内饰预览"
            loading="lazy"
            decoding="async"
          />

          <div v-else class="sv-upload-placeholder">
            <span class="sv-upload-icon">
              <Icon icon="mdi:image-multiple-outline" />
            </span>
            <strong>上传汽车内饰照片</strong>
            <span>支持 JPG、PNG，可选</span>
          </div>

          <button
            v-if="interiorPreviewUrl"
            type="button"
            class="sv-upload-remove"
            aria-label="删除内饰照片"
            @click.stop="removeUpload('interior')"
          >
            <Icon icon="mdi:close" />
          </button>

          <span v-if="uploadingSlot === 'interior'" class="sv-upload-loading">
            <Icon icon="mdi:loading" />
          </span>
        </article>
      </div>
    </section>

    <section class="sv-section">
      <header class="sv-section-head">
        <span class="sv-step-index">2</span>
        <div class="sv-section-copy">
          <h3>选择数字人形象</h3>
          <p>选择口播视频的出镜数字人模特</p>
        </div>
      </header>

      <div class="sv-human-grid">
        <button
          v-for="human in digitalHumans"
          :key="human.id"
          type="button"
          class="sv-human-card"
          :class="[
            `tone-${human.tone}`,
            { 'is-active': selectedDigitalHumanId === human.id },
          ]"
          :disabled="disabled"
          @click="selectedDigitalHumanId = human.id"
        >
          <span class="sv-human-avatar" aria-hidden="true">
            <Icon icon="mdi:account-outline" />
          </span>
          <strong>{{ human.name }}</strong>
          <span>{{ human.style }}</span>
        </button>
      </div>
    </section>

    <section class="sv-section sv-section--vehicle-form">
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
            v-model="vehicleForm.brand"
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
            v-model="vehicleForm.year"
            type="text"
            placeholder="如：2020、2021"
            :disabled="disabled"
          />
        </label>
        <label class="sv-field">
          <span class="sv-field-label">排量 <em>*</em></span>
          <input
            v-model="vehicleForm.displacement"
            type="text"
            placeholder="如：2.0T、1.5L"
            :disabled="disabled"
          />
        </label>
        <label class="sv-field">
          <span class="sv-field-label">车型 <em>*</em></span>
          <VehicleLookupField
            v-model="vehicleForm.model"
            :options="modelOptions"
            placeholder="如：A4L、530Li、E300L"
            :disabled="disabled || !matchedBrand"
            :matched="Boolean(matchedBrand && vehicleForm.model.trim())"
          />
        </label>
        <label class="sv-field sv-field--wide">
          <span class="sv-field-label">车系 <em>*</em></span>
          <input
            v-model="vehicleForm.series"
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
          :key="option.id"
          type="button"
          class="sv-language-card"
          :class="{ 'is-active': selectedLanguage === option.id }"
          :disabled="disabled"
          @click="selectedLanguage = option.id"
        >
          <span class="sv-language-icon" aria-hidden="true">
            <Icon icon="mdi:earth" />
          </span>
          <span v-if="option.badge" class="sv-language-badge">{{
            option.badge
          }}</span>
          <strong>{{ option.label }}</strong>
          <span>{{ option.hint }}</span>
        </button>
      </div>
    </section>

    <footer class="sv-tip-banner">
      <Icon icon="mdi:lightbulb-on-outline" aria-hidden="true" />
      <p>
        系统将自动注入该模板对应的内置专业提示词，生成匹配「专业」风格的口播文案
      </p>
    </footer>
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

.sv-section-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 16px;
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

.sv-upload-preview :deep(.preload-image),
.sv-upload-preview :deep(.preload-image__img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  border-radius: 14px;
  background: var(--sv-human-bg);
  color: color-mix(in srgb, var(--sv-accent) 72%, #fff);
  font-size: 28px;
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

.sv-field input {
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

.sv-theme-light .sv-field input {
  background: #f8fafc;
}

.sv-field :deep(.vehicle-lookup-input) {
  background: color-mix(in srgb, var(--sv-card-bg) 88%, #000);
}

.sv-theme-light .sv-field :deep(.vehicle-lookup-input) {
  background: #f8fafc;
}

.sv-field input:focus {
  border-color: color-mix(in srgb, var(--sv-accent) 52%, var(--sv-card-border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--sv-accent) 12%, transparent);
}

.sv-field input::placeholder {
  color: color-mix(in srgb, var(--sv-text-soft) 84%, transparent);
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
}
</style>
