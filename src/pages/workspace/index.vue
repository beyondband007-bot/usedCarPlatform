<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import CapabilityGeneratePanel from "@/components/business/workspace/CapabilityGeneratePanel.vue";
import WorkspaceAssistPanel from "@/components/business/workspace/WorkspaceAssistPanel.vue";
import WorkspaceSidebar from "@/components/business/workspace/WorkspaceSidebar.vue";
import { WORKSPACE_DEFAULT_CAPABILITY } from "@/constants/app-flow";
import {
  defaultWorkspaceCapabilityCode,
  workspaceCapabilities,
} from "@/constants/workspace";
import type {
  WorkspaceGenerateResult,
  WorkspaceRecentItem,
} from "@/types/workspace";

const outputRatioSizeMap: Record<string, { width: number; height: number }> = {
  "主图 1:1": { width: 1024, height: 1024 },
  "主图 3:4": { width: 900, height: 1200 },
  "主图 4:3": { width: 1200, height: 900 },
  "主图 9:16": { width: 900, height: 1600 },
  "主图 16:9": { width: 1600, height: 900 },
};

const route = useRoute();
const router = useRouter();

function resolveCapabilityCode(code: unknown) {
  if (typeof code !== "string") {
    return defaultWorkspaceCapabilityCode;
  }

  return workspaceCapabilities.some((item) => item.code === code)
    ? code
    : defaultWorkspaceCapabilityCode;
}

const activeCode = ref(resolveCapabilityCode(route.params.code));
const generationResult = ref<WorkspaceGenerateResult | null>(null);

watch(
  () => route.params.code,
  (code) => {
    activeCode.value = resolveCapabilityCode(code);
  },
);

function handleSelectCapability(code: string) {
  activeCode.value = code;

  if (route.params.code !== code) {
    router.replace({ name: "Workspace", params: { code } });
  }
}

const activeCapability = computed(
  () =>
    workspaceCapabilities.find(
      (capability) => capability.code === activeCode.value,
    ) ?? workspaceCapabilities[0],
);

const selectedOptionId = ref(activeCapability.value.options[0]?.id ?? "");

watch(activeCode, () => {
  const capability = activeCapability.value;
  const hasSelected = capability.options.some(
    (item) => item.id === selectedOptionId.value,
  );

  if (!hasSelected) {
    selectedOptionId.value = capability.options[0]?.id ?? "";
  }

  generationResult.value = null;
});

const mockResultPreview =
  "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1400&q=85";

function formatGenerateTime(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function handleGenerate(payload: { outputRatio: string }) {
  const option = activeCapability.value.options.find(
    (item) => item.id === selectedOptionId.value,
  );
  const sceneTitle = option?.title ?? "经典白棚";

  const size = outputRatioSizeMap[payload.outputRatio] ?? {
    width: 1600,
    height: 900,
  };

  generationResult.value = {
    createdAt: formatGenerateTime(),
    statusText: `已完成 · ${sceneTitle} · 单图生成结果`,
    ratioLabel: payload.outputRatio,
    previewImage: mockResultPreview,
    previewAlt: `${sceneTitle}生成结果`,
    downloadUrl: mockResultPreview,
    imageWidth: size.width,
    imageHeight: size.height,
  };
}

function buildResultFromRecent(item: WorkspaceRecentItem): WorkspaceGenerateResult | null {
  if (item.status !== "success" || !item.previewImage) return null;

  return {
    createdAt: item.createdAt,
    statusText: `已完成 · ${item.sceneLabel ?? item.title} · 单图生成结果`,
    ratioLabel: item.ratioLabel ?? "主图",
    previewImage: item.previewImage,
    previewAlt: item.title,
    downloadUrl: item.previewImage,
    imageWidth: item.imageWidth,
    imageHeight: item.imageHeight,
  };
}

function handlePickRecent(item: WorkspaceRecentItem) {
  const result = buildResultFromRecent(item);
  if (result) generationResult.value = result;
}

function clearGenerationResult() {
  generationResult.value = null;
}

function handlePickTemplate(payload: { capabilityCode: string; optionId: string }) {
  selectedOptionId.value = payload.optionId;
  activeCode.value = payload.capabilityCode;
  generationResult.value = null;
}
</script>

<template>
  <main class="workspace-page bg-[var(--app-bg)]">
    <section class="workspace-shell">
      <div class="workspace-col workspace-col--nav">
        <WorkspaceSidebar
          :active-code="activeCode"
          @select="handleSelectCapability"
        />
      </div>

      <section class="workspace-col workspace-col--main">
        <div class="workspace-col-scroll">
          <CapabilityGeneratePanel
            :capability="activeCapability"
            :selected-option-id="selectedOptionId"
            @select-option="selectedOptionId = $event"
            @generate="handleGenerate"
          />
        </div>
      </section>

      <div class="workspace-col workspace-col--assist">
        <WorkspaceAssistPanel
          :capability="activeCapability"
          :selected-option-id="selectedOptionId"
          :generation-result="generationResult"
          @back-from-result="clearGenerationResult"
          @pick-template="handlePickTemplate"
          @pick-recent="handlePickRecent"
        />
      </div>
    </section>
  </main>
</template>

<style scoped lang="scss">
.workspace-page {
  height: calc(100dvh - var(--app-header-offset));
  min-height: calc(100vh - var(--app-header-offset));
  overflow: hidden;
}

.workspace-shell {
  display: grid;
  height: 100%;
  min-height: 0;
  gap: 0;
  overflow: hidden;
  grid-template-columns: minmax(0, 1fr);

  @media (width >= 1024px) {
    grid-template-columns: 240px minmax(360px, 500px) minmax(0, 1fr);
  }

  @media (width >= 1536px) {
    grid-template-columns: 260px minmax(380px, 520px) minmax(0, 1fr);
  }
}

.workspace-col {
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.workspace-col--main {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--app-border);
  background: var(--app-surface-soft);
}

.workspace-col-scroll {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 20px 20px 32px;

  @media (width >= 1024px) {
    padding: 32px 32px 40px;
  }
}

@media (width < 1024px) {
  .workspace-page {
    height: auto;
    min-height: calc(100vh - var(--app-header-offset));
    overflow: visible;
  }

  .workspace-shell {
    height: auto;
    overflow: visible;
  }

  .workspace-col {
    height: auto;
    overflow: visible;
  }

  .workspace-col-scroll {
    overflow: visible;
  }
}
</style>
