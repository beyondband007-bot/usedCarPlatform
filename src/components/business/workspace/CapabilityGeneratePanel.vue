<script setup lang="ts">
import { ref } from "vue";
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

const outputRatioOptions = [
  { label: "1:1 主图", value: "1:1" },
  { label: "3:4 竖屏", value: "3:4" },
  { label: "4:3 横版", value: "4:3" },
  { label: "9:16 竖屏", value: "9:16" },
  { label: "16:9 横版", value: "16:9" },
];

const hasBlock = (block: WorkspaceCapabilityBlock) =>
  props.capability.middleBlocks?.includes(block) ?? false;
</script>

<template>
  <div class="space-y-6">
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
        class="border border-[var(--app-border)] bg-[var(--app-surface)] px-6 py-5 useLogo"
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

      <div
        class="border border-[var(--app-border)] bg-[var(--app-surface)] px-6 py-4 useLogo"
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
  </div>
</template>
<style scoped>
::v-deep .useLogo {
  /* border: 0; */
  border-radius: 12px;
}
</style>
