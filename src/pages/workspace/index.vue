<script setup lang="ts">
import { computed, ref, watch } from "vue";

import CapabilityGeneratePanel from "@/components/business/workspace/CapabilityGeneratePanel.vue";
import WorkspaceAssistPanel from "@/components/business/workspace/WorkspaceAssistPanel.vue";
import WorkspaceSidebar from "@/components/business/workspace/WorkspaceSidebar.vue";
import {
  defaultWorkspaceCapabilityCode,
  workspaceCapabilities,
} from "@/constants/workspace";

const activeCode = ref(defaultWorkspaceCapabilityCode);

const activeCapability = computed(
  () =>
    workspaceCapabilities.find(
      (capability) => capability.code === activeCode.value,
    ) ?? workspaceCapabilities[0],
);

const selectedOptionId = ref(activeCapability.value.options[0]?.id ?? "");

watch(activeCapability, (capability) => {
  selectedOptionId.value = capability.options[0]?.id ?? "";
});
</script>

<template>
  <main class="min-h-[calc(100vh-var(--app-header-offset))] bg-[var(--app-bg)]">
    <section
      class="grid h-[calc(100vh-var(--app-header-offset))] min-h-0 gap-0 overflow-hidden lg:grid-cols-[240px_minmax(360px,500px)_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(380px,520px)_minmax(0,1fr)]"
    >
      <WorkspaceSidebar
        :active-code="activeCode"
        @select="activeCode = $event"
      />

      <section
        class="flex min-h-0 min-w-0 flex-col border-r border-[var(--app-border)] bg-[var(--app-surface-soft)]"
      >
        <div class="flex-1 overflow-y-auto p-5 lg:p-8 CapabilityGeneratePanel">
          <CapabilityGeneratePanel
            :capability="activeCapability"
            :selected-option-id="selectedOptionId"
            @select-option="selectedOptionId = $event"
          />
        </div>
      </section>

      <WorkspaceAssistPanel :capability="activeCapability" />
    </section>
  </main>
</template>
<style scoped></style>
