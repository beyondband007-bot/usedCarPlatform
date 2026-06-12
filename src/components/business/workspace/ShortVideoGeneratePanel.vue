<script setup lang="ts">
import { computed, onMounted, ref, type Ref } from "vue";
import { Icon } from "@iconify/vue";
import { useMessage } from "naive-ui";

import { uploadAsset, type UploadedAsset } from "@/api/visual-workbench";
import {
  createVideoScriptDraft,
  getVideoDigitalHumans,
  getVideoReferenceMaterials,
  getVideoScriptDraft,
  type VideoDigitalHuman,
  type VideoReferenceMaterial,
  type VideoScriptDraft,
} from "@/api/video-generation";
import {
  getShortVideoScriptDraftStorageKey,
  getVideoScriptGeneratorLabel,
  MAX_VIDEO_EXTERIOR_IMAGES,
  MAX_VIDEO_INTERIOR_IMAGES,
  MAX_VIDEO_REFERENCE_IMAGES,
  VIDEO_DURATION_SECONDS,
  VIDEO_OUTPUT_RATIO_LABEL,
} from "@/constants/short-video";
import { useAuthStore } from "@/stores/auth";
import type { WorkspaceCapability } from "@/types/workspace";

import PreloadImage from "@/components/common/PreloadImage.vue";
import GenerateActionFooter from "@/components/business/workspace/GenerateActionFooter.vue";

const props = defineProps<{
  capability: WorkspaceCapability;
  isGenerating?: boolean;
}>();

const emit = defineEmits<{
  confirmVideo: [scriptDraftId: string];
}>();

const message = useMessage();
const authStore = useAuthStore();

type UploadItem = {
  id: string;
  name: string;
  previewUrl: string;
  status: "uploading" | "success" | "fail";
  size: number;
  asset?: UploadedAsset;
  objectUrl?: string;
  error?: string;
};

const vehicleName = ref("");
const digitalHumans = ref<VideoDigitalHuman[]>([]);
const referenceMaterials = ref<VideoReferenceMaterial[]>([]);
const selectedDigitalHumanId = ref<string | null>(null);
const selectedReferenceMaterialId = ref<string | null>(null);
const exteriorUploads = ref<UploadItem[]>([]);
const interiorUploads = ref<UploadItem[]>([]);
const referenceUploads = ref<UploadItem[]>([]);
const scriptDraft = ref<VideoScriptDraft | null>(null);
const isLoadingOptions = ref(false);
const isDraftGenerating = ref(false);
const isUploadingExterior = ref(false);
const isUploadingInterior = ref(false);
const isUploadingReference = ref(false);

const exteriorInputRef = ref<HTMLInputElement | null>(null);
const interiorInputRef = ref<HTMLInputElement | null>(null);
const referenceInputRef = ref<HTMLInputElement | null>(null);

const draftStorageKey = computed(() =>
  getShortVideoScriptDraftStorageKey(
    authStore.userInfo?.id ?? authStore.userInfo?.username ?? "guest",
  ),
);

const uploadedExteriorAssets = computed(() =>
  exteriorUploads.value
    .filter((item): item is UploadItem & { asset: UploadedAsset } =>
      Boolean(item.asset),
    )
    .map((item) => item.asset),
);

const uploadedInteriorAssets = computed(() =>
  interiorUploads.value
    .filter((item): item is UploadItem & { asset: UploadedAsset } =>
      Boolean(item.asset),
    )
    .map((item) => item.asset),
);

const uploadedReferenceAssets = computed(() =>
  referenceUploads.value
    .filter((item): item is UploadItem & { asset: UploadedAsset } =>
      Boolean(item.asset),
    )
    .map((item) => item.asset),
);

const exteriorRemaining = computed(() =>
  Math.max(0, MAX_VIDEO_EXTERIOR_IMAGES - exteriorUploads.value.length),
);
const interiorRemaining = computed(() =>
  Math.max(0, MAX_VIDEO_INTERIOR_IMAGES - interiorUploads.value.length),
);
const referenceRemaining = computed(() =>
  Math.max(0, MAX_VIDEO_REFERENCE_IMAGES - referenceUploads.value.length),
);

const isAnyUploading = computed(
  () =>
    isUploadingExterior.value ||
    isUploadingInterior.value ||
    isUploadingReference.value,
);

const canGenerateDraft = computed(
  () =>
    !props.isGenerating &&
    !isDraftGenerating.value &&
    !isAnyUploading.value &&
    vehicleName.value.trim().length > 0 &&
    Boolean(selectedDigitalHumanId.value) &&
    Boolean(selectedReferenceMaterialId.value) &&
    uploadedExteriorAssets.value.length > 0,
);

const canConfirmVideo = computed(
  () =>
    Boolean(scriptDraft.value?.scriptDraftId) &&
    !props.isGenerating &&
    !isDraftGenerating.value &&
    !isAnyUploading.value,
);

const scriptText = computed(
  () => scriptDraft.value?.requiredInputs?.script?.scriptText ?? "",
);
const shotCues = computed(
  () => scriptDraft.value?.requiredInputs?.script?.shotCues ?? [],
);
const scriptGenerator = computed(
  () => scriptDraft.value?.requiredInputs?.script?.generator,
);
const riskNotes = computed(() => scriptDraft.value?.riskNotes ?? []);

function normalizeImageFiles(files: File[]) {
  return files.filter(
    (file) =>
      file.type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(file.name),
  );
}

function createUploadItem(file: File): UploadItem {
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

function revokeUploadItem(item?: UploadItem) {
  if (item?.objectUrl) {
    URL.revokeObjectURL(item.objectUrl);
  }
}

function updateUploadList(
  list: Ref<UploadItem[]>,
  id: string,
  patch: Partial<UploadItem>,
) {
  const index = list.value.findIndex((item) => item.id === id);
  if (index < 0) return;
  list.value[index] = { ...list.value[index], ...patch };
}

function persistScriptDraftId(scriptDraftId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(draftStorageKey.value, scriptDraftId);
  } catch {
    // ignore storage failures
  }
}

function clearPersistedScriptDraftId() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(draftStorageKey.value);
  } catch {
    // ignore storage failures
  }
}

async function restoreScriptDraft() {
  if (typeof window === "undefined") return;
  const storedId = window.localStorage.getItem(draftStorageKey.value);
  if (!storedId) return;

  try {
    scriptDraft.value = await getVideoScriptDraft(storedId);
    if (scriptDraft.value.vehicleName) {
      vehicleName.value = scriptDraft.value.vehicleName;
    }
  } catch {
    clearPersistedScriptDraftId();
  }
}

async function loadBaseOptions() {
  isLoadingOptions.value = true;
  try {
    const [humans, materials] = await Promise.all([
      getVideoDigitalHumans(),
      getVideoReferenceMaterials(),
    ]);
    digitalHumans.value = Array.isArray(humans) ? humans : [];
    referenceMaterials.value = Array.isArray(materials) ? materials : [];
    if (!selectedDigitalHumanId.value && digitalHumans.value[0]) {
      selectedDigitalHumanId.value = digitalHumans.value[0].id;
    }
    if (!selectedReferenceMaterialId.value && referenceMaterials.value[0]) {
      selectedReferenceMaterialId.value = referenceMaterials.value[0].id;
    }
  } catch (error) {
    const text =
      error instanceof Error ? error.message : "短视频基础选项加载失败";
    message.error(text);
  } finally {
    isLoadingOptions.value = false;
  }
}

async function handleFilesSelected(
  files: File[],
  purpose: "car_exterior" | "car_interior" | "video_reference_image",
  list: Ref<UploadItem[]>,
  remaining: number,
  maxCount: number,
  uploadingFlag: Ref<boolean>,
) {
  if (props.isGenerating || isDraftGenerating.value) {
    message.warning("当前任务生成中，请等待完成后再上传图片");
    return;
  }

  const imageFiles = normalizeImageFiles(files);
  if (!imageFiles.length) {
    message.warning("请选择 JPG、PNG 或 WebP 图片");
    return;
  }

  if (remaining <= 0) {
    message.warning(`最多上传 ${maxCount} 张`);
    return;
  }

  const selectedFiles = imageFiles.slice(0, remaining);
  if (imageFiles.length > remaining) {
    message.warning(`最多支持 ${maxCount} 张，已自动保留前 ${remaining} 张`);
  }

  const pendingItems = selectedFiles.map(createUploadItem);
  list.value = [...list.value, ...pendingItems];
  uploadingFlag.value = true;

  const results = await Promise.allSettled(
    pendingItems.map(async (item, index) => {
      const asset = await uploadAsset(selectedFiles[index], purpose);
      updateUploadList(list, item.id, {
        asset,
        previewUrl: item.objectUrl ?? asset.url,
        status: "success",
      });
    }),
  );

  results.forEach((result, index) => {
    if (result.status === "fulfilled") return;
    updateUploadList(list, pendingItems[index].id, {
      status: "fail",
      error:
        result.reason instanceof Error ? result.reason.message : "上传失败",
    });
  });

  uploadingFlag.value = false;
}

function handleRemoveUpload(list: Ref<UploadItem[]>, id: string) {
  if (props.isGenerating || isDraftGenerating.value) return;
  const target = list.value.find((item) => item.id === id);
  revokeUploadItem(target);
  list.value = list.value.filter((item) => item.id !== id);
}

function handleRemoveExterior(id: string) {
  handleRemoveUpload(exteriorUploads, id);
}

function handleRemoveInterior(id: string) {
  handleRemoveUpload(interiorUploads, id);
}

function handleRemoveReference(id: string) {
  handleRemoveUpload(referenceUploads, id);
}

function handleExteriorDrop(event: DragEvent) {
  handleDrop(
    event,
    "car_exterior",
    exteriorUploads,
    exteriorRemaining.value,
    MAX_VIDEO_EXTERIOR_IMAGES,
    isUploadingExterior,
  );
}

function handleInteriorDrop(event: DragEvent) {
  handleDrop(
    event,
    "car_interior",
    interiorUploads,
    interiorRemaining.value,
    MAX_VIDEO_INTERIOR_IMAGES,
    isUploadingInterior,
  );
}

function handleReferenceDrop(event: DragEvent) {
  handleDrop(
    event,
    "video_reference_image",
    referenceUploads,
    referenceRemaining.value,
    MAX_VIDEO_REFERENCE_IMAGES,
    isUploadingReference,
  );
}

function handleExteriorInputChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = "";
  void handleFilesSelected(
    files,
    "car_exterior",
    exteriorUploads,
    exteriorRemaining.value,
    MAX_VIDEO_EXTERIOR_IMAGES,
    isUploadingExterior,
  );
}

function handleInteriorInputChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = "";
  void handleFilesSelected(
    files,
    "car_interior",
    interiorUploads,
    interiorRemaining.value,
    MAX_VIDEO_INTERIOR_IMAGES,
    isUploadingInterior,
  );
}

function handleReferenceInputChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = "";
  void handleFilesSelected(
    files,
    "video_reference_image",
    referenceUploads,
    referenceRemaining.value,
    MAX_VIDEO_REFERENCE_IMAGES,
    isUploadingReference,
  );
}

function handleDrop(
  event: DragEvent,
  purpose: "car_exterior" | "car_interior" | "video_reference_image",
  list: Ref<UploadItem[]>,
  remaining: number,
  maxCount: number,
  uploadingFlag: Ref<boolean>,
) {
  if (remaining <= 0) return;
  const files = Array.from(event.dataTransfer?.files ?? []);
  void handleFilesSelected(
    files,
    purpose,
    list,
    remaining,
    maxCount,
    uploadingFlag,
  );
}

async function handleGenerateDraft() {
  if (!canGenerateDraft.value) return;

  isDraftGenerating.value = true;
  try {
    const draft = await createVideoScriptDraft({
      templateId: selectedReferenceMaterialId.value ?? "legacy",
      language: "zh-CN",
      vehicleName: vehicleName.value.trim(),
      digitalHumanId: selectedDigitalHumanId.value!,
      referenceMaterialId: selectedReferenceMaterialId.value!,
      vehicleExteriorAssetIds: uploadedExteriorAssets.value.map(
        (asset) => asset.assetId,
      ),
      vehicleInteriorAssetIds: uploadedInteriorAssets.value.map(
        (asset) => asset.assetId,
      ),
      userReferenceAssetIds: uploadedReferenceAssets.value.map(
        (asset) => asset.assetId,
      ),
      durationSeconds: VIDEO_DURATION_SECONDS,
    });
    scriptDraft.value = draft;
    persistScriptDraftId(draft.scriptDraftId);
    message.success("口播草稿已生成，请审核后确认生成视频");
  } catch (error) {
    const text =
      error instanceof Error ? error.message : "口播草稿生成失败";
    message.error(text);
  } finally {
    isDraftGenerating.value = false;
  }
}

function handleConfirmVideo() {
  if (!scriptDraft.value?.scriptDraftId || !canConfirmVideo.value) return;
  emit("confirmVideo", scriptDraft.value.scriptDraftId);
}

function handleResetDraft() {
  scriptDraft.value = null;
  clearPersistedScriptDraftId();
}

function formatShotCue(cue: (typeof shotCues.value)[number]) {
  const start = cue.startSecond ?? cue.start ?? "";
  const end = cue.endSecond ?? cue.end ?? "";
  const label = cue.label ?? cue.description ?? "";
  if (start !== "" && end !== "") {
    return `${start}-${end}s · ${label}`;
  }
  return label || JSON.stringify(cue);
}

onMounted(() => {
  void loadBaseOptions();
  void restoreScriptDraft();
});
</script>

<template>
  <div class="short-video-generate">
    <section class="sv-notice">
      上传车辆素材并选择数字人与参考风格，先生成口播草稿审核，确认后输出
      {{ VIDEO_OUTPUT_RATIO_LABEL }} 营销短视频。
    </section>

    <section class="sv-card">
      <header class="sv-card-head">
        <h3>车型信息</h3>
      </header>
      <input
        v-model="vehicleName"
        class="sv-input"
        type="text"
        placeholder="例如：18年捷途X70，18款1.5T自动悦行版"
        :disabled="props.isGenerating || isDraftGenerating"
      />
    </section>

    <section class="sv-card">
      <header class="sv-card-head">
        <h3>数字人</h3>
        <span v-if="isLoadingOptions" class="sv-muted">加载中...</span>
      </header>
      <div v-if="digitalHumans.length" class="sv-picker-grid">
        <button
          v-for="item in digitalHumans"
          :key="item.id"
          type="button"
          class="sv-picker-item"
          :class="{ 'is-active': selectedDigitalHumanId === item.id }"
          :disabled="props.isGenerating || isDraftGenerating"
          @click="selectedDigitalHumanId = item.id"
        >
          <PreloadImage
            class="sv-picker-media"
            :src="item.previewUrl"
            :alt="item.name || '数字人'"
            loading="lazy"
            decoding="async"
          />
          <span>{{ item.name || item.id }}</span>
        </button>
      </div>
      <p v-else class="sv-empty">暂无数字人选项</p>
    </section>

    <section class="sv-card">
      <header class="sv-card-head">
        <h3>参考视频风格</h3>
      </header>
      <div v-if="referenceMaterials.length" class="sv-picker-grid">
        <button
          v-for="item in referenceMaterials"
          :key="item.id"
          type="button"
          class="sv-picker-item sv-picker-item--video"
          :class="{ 'is-active': selectedReferenceMaterialId === item.id }"
          :disabled="props.isGenerating || isDraftGenerating"
          @click="selectedReferenceMaterialId = item.id"
        >
          <PreloadImage
            class="sv-picker-media"
            :src="item.previewUrl"
            :alt="item.title"
            loading="lazy"
            decoding="async"
          />
          <strong>{{ item.title }}</strong>
          <span v-if="item.styleTags?.length" class="sv-tags">
            {{ item.styleTags.join(" · ") }}
          </span>
        </button>
      </div>
      <p v-else class="sv-empty">暂无参考视频风格</p>
    </section>

    <section class="sv-card">
      <header class="sv-card-head">
        <div>
          <h3>车辆外观图</h3>
          <p>最多 {{ MAX_VIDEO_EXTERIOR_IMAGES }} 张，提交时取前 5 张</p>
        </div>
        <span class="sv-count"
          >{{ exteriorUploads.length }}/{{ MAX_VIDEO_EXTERIOR_IMAGES }}</span
        >
      </header>
      <button
        type="button"
        class="sv-upload-drop"
        :disabled="exteriorRemaining <= 0 || props.isGenerating || isDraftGenerating"
        @click="exteriorInputRef?.click()"
        @dragover.prevent
        @drop.prevent="handleExteriorDrop"
      >
        <Icon icon="mdi:image-multiple-outline" />
        <strong>{{
          exteriorUploads.length ? "继续添加外观图" : "上传车辆外观图"
        }}</strong>
        <span>JPG / PNG / WebP · 剩余 {{ exteriorRemaining }} 张</span>
      </button>
      <input
        ref="exteriorInputRef"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        @change="handleExteriorInputChange"
      />
      <div v-if="exteriorUploads.length" class="sv-upload-grid">
        <article
          v-for="item in exteriorUploads"
          :key="item.id"
          class="sv-upload-item"
          :class="`is-${item.status}`"
        >
          <PreloadImage
            class="sv-upload-image"
            :src="item.previewUrl"
            :alt="item.name"
            loading="lazy"
            decoding="async"
          />
          <button
            type="button"
            class="sv-upload-remove"
            :disabled="props.isGenerating || isDraftGenerating"
            @click.stop="handleRemoveExterior(item.id)"
          >
            <Icon icon="mdi:close" />
          </button>
        </article>
      </div>
    </section>

    <section class="sv-card">
      <header class="sv-card-head">
        <div>
          <h3>车辆内饰图</h3>
          <p>可选，最多 {{ MAX_VIDEO_INTERIOR_IMAGES }} 张</p>
        </div>
        <span class="sv-count"
          >{{ interiorUploads.length }}/{{ MAX_VIDEO_INTERIOR_IMAGES }}</span
        >
      </header>
      <button
        type="button"
        class="sv-upload-drop"
        :disabled="interiorRemaining <= 0 || props.isGenerating || isDraftGenerating"
        @click="interiorInputRef?.click()"
        @dragover.prevent
        @drop.prevent="handleInteriorDrop"
      >
        <Icon icon="mdi:image-multiple-outline" />
        <strong>上传内饰图</strong>
        <span>剩余 {{ interiorRemaining }} 张</span>
      </button>
      <input
        ref="interiorInputRef"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        @change="handleInteriorInputChange"
      />
      <div v-if="interiorUploads.length" class="sv-upload-grid">
        <article
          v-for="item in interiorUploads"
          :key="item.id"
          class="sv-upload-item"
          :class="`is-${item.status}`"
        >
          <PreloadImage
            class="sv-upload-image"
            :src="item.previewUrl"
            :alt="item.name"
            loading="lazy"
            decoding="async"
          />
          <button
            type="button"
            class="sv-upload-remove"
            :disabled="props.isGenerating || isDraftGenerating"
            @click.stop="handleRemoveInterior(item.id)"
          >
            <Icon icon="mdi:close" />
          </button>
        </article>
      </div>
    </section>

    <section class="sv-card">
      <header class="sv-card-head">
        <div>
          <h3>额外参考图</h3>
          <p>可选，最多 {{ MAX_VIDEO_REFERENCE_IMAGES }} 张</p>
        </div>
        <span class="sv-count"
          >{{ referenceUploads.length }}/{{ MAX_VIDEO_REFERENCE_IMAGES }}</span
        >
      </header>
      <button
        type="button"
        class="sv-upload-drop"
        :disabled="referenceRemaining <= 0 || props.isGenerating || isDraftGenerating"
        @click="referenceInputRef?.click()"
        @dragover.prevent
        @drop.prevent="handleReferenceDrop"
      >
        <Icon icon="mdi:image-multiple-outline" />
        <strong>上传额外参考图</strong>
        <span>剩余 {{ referenceRemaining }} 张</span>
      </button>
      <input
        ref="referenceInputRef"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        @change="handleReferenceInputChange"
      />
      <div v-if="referenceUploads.length" class="sv-upload-grid">
        <article
          v-for="item in referenceUploads"
          :key="item.id"
          class="sv-upload-item"
          :class="`is-${item.status}`"
        >
          <PreloadImage
            class="sv-upload-image"
            :src="item.previewUrl"
            :alt="item.name"
            loading="lazy"
            decoding="async"
          />
          <button
            type="button"
            class="sv-upload-remove"
            :disabled="props.isGenerating || isDraftGenerating"
            @click.stop="handleRemoveReference(item.id)"
          >
            <Icon icon="mdi:close" />
          </button>
        </article>
      </div>
    </section>

    <section v-if="scriptDraft" class="sv-card sv-draft-card">
      <header class="sv-card-head">
        <div>
          <h3>口播草稿审核</h3>
          <p>{{ getVideoScriptGeneratorLabel(scriptGenerator) }}</p>
        </div>
        <button
          type="button"
          class="sv-reset-draft"
          :disabled="props.isGenerating || isDraftGenerating"
          @click="handleResetDraft"
        >
          重新生成草稿
        </button>
      </header>

      <div v-if="riskNotes.length" class="sv-risk-list">
        <p v-for="(note, index) in riskNotes" :key="index">{{ note }}</p>
      </div>

      <div v-if="scriptText" class="sv-draft-block">
        <h4>口播正文</h4>
        <p>{{ scriptText }}</p>
      </div>

      <div v-if="shotCues.length" class="sv-draft-block">
        <h4>镜头提示</h4>
        <ul>
          <li v-for="(cue, index) in shotCues" :key="index">
            {{ formatShotCue(cue) }}
          </li>
        </ul>
      </div>

      <div v-if="scriptDraft.finalVideoPrompt" class="sv-draft-block">
        <h4>最终视频提示词</h4>
        <p class="sv-prompt">{{ scriptDraft.finalVideoPrompt }}</p>
      </div>
    </section>

    <footer class="sv-footer">
      <button
        type="button"
        class="sv-draft-button"
        :class="{ 'is-loading': isDraftGenerating }"
        :disabled="!canGenerateDraft || isDraftGenerating"
        @click="handleGenerateDraft"
      >
        <Icon v-if="isDraftGenerating" icon="mdi:loading" />
        <span>{{ isDraftGenerating ? "正在生成草稿..." : "生成口播草稿" }}</span>
      </button>
    </footer>

    <GenerateActionFooter
      :action-label="props.capability.actionLabel"
      :cost="props.capability.cost"
      cost-unit="条"
      :loading="props.isGenerating"
      :disabled="!canConfirmVideo"
      @generate="handleConfirmVideo"
    />
  </div>
</template>

<style scoped lang="scss">
.short-video-generate {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sv-notice {
  padding: 14px 16px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--app-accent, #ffb800) 12%, transparent);
  color: var(--app-text);
  font-size: 13px;
  line-height: 1.6;
}

.sv-card {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: var(--app-surface);
}

.sv-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.sv-card-head h3 {
  margin: 0;
  color: var(--app-text);
  font-size: 15px;
  font-weight: 700;
}

.sv-card-head p,
.sv-muted,
.sv-empty {
  margin: 4px 0 0;
  color: var(--app-text-soft);
  font-size: 12px;
  line-height: 1.5;
}

.sv-count {
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--app-accent, #ffb800) 14%, transparent);
  color: var(--app-text);
  font-size: 12px;
  font-weight: 700;
}

.sv-input {
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-surface-soft, var(--app-surface));
  color: var(--app-text);
  font-size: 14px;
}

.sv-input:focus {
  outline: none;
  border-color: var(--app-accent, #ffb800);
}

.sv-picker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(108px, 1fr));
  gap: 10px;
}

.sv-picker-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-surface-soft, var(--app-surface));
  color: var(--app-text-soft);
  cursor: pointer;
  text-align: left;
  font-size: 12px;
}

.sv-picker-item.is-active {
  border-color: var(--app-accent, #ffb800);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--app-accent, #ffb800) 18%, transparent);
}

.sv-picker-item strong {
  color: var(--app-text);
  font-size: 13px;
}

.sv-picker-media {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  border-radius: 8px;
}

.sv-picker-item--video .sv-picker-media {
  aspect-ratio: 9 / 16;
}

.sv-tags {
  color: var(--app-text-soft);
  line-height: 1.4;
}

.sv-upload-drop {
  display: flex;
  width: 100%;
  min-height: 120px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px;
  border: 2px dashed var(--app-border);
  border-radius: 14px;
  background: var(--app-surface-soft, var(--app-surface));
  color: var(--app-text-soft);
  cursor: pointer;
}

.sv-upload-drop:disabled {
  opacity: 0.56;
  cursor: not-allowed;
}

.sv-upload-drop strong {
  color: var(--app-text);
  font-size: 14px;
}

.sv-upload-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.sv-upload-item {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 10px;
}

.sv-upload-image {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

.sv-upload-remove {
  position: absolute;
  top: 6px;
  right: 6px;
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.56);
  color: #fff;
  cursor: pointer;
}

.sv-draft-card {
  border-color: color-mix(in srgb, var(--app-accent, #ffb800) 42%, var(--app-border));
}

.sv-reset-draft {
  border: 0;
  background: transparent;
  color: var(--app-accent, #ffb800);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}

.sv-risk-list {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: color-mix(in srgb, #f59e0b 12%, transparent);
  color: var(--app-text);
  font-size: 13px;
  line-height: 1.5;
}

.sv-draft-block + .sv-draft-block {
  margin-top: 12px;
}

.sv-draft-block h4 {
  margin: 0 0 6px;
  color: var(--app-text-soft);
  font-size: 12px;
  font-weight: 700;
}

.sv-draft-block p,
.sv-draft-block li {
  margin: 0;
  color: var(--app-text);
  font-size: 13px;
  line-height: 1.6;
}

.sv-draft-block ul {
  margin: 0;
  padding-left: 18px;
}

.sv-prompt {
  white-space: pre-wrap;
  word-break: break-word;
}

.sv-footer {
  padding-top: 4px;
}

.sv-draft-button {
  display: flex;
  width: 100%;
  min-height: 52px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: var(--app-surface);
  color: var(--app-text);
  cursor: pointer;
  font-size: 15px;
  font-weight: 700;
}

.sv-draft-button:disabled {
  opacity: 0.56;
  cursor: not-allowed;
}

.sv-draft-button.is-loading :deep(svg) {
  animation: sv-spin 0.8s linear infinite;
}

@keyframes sv-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
