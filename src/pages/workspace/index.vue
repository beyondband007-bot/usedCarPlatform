<script setup lang="ts">
import { computed, ref, watch } from "vue";

import SecondaryNav from "@/components/common/SecondaryNav.vue";
import CapabilityGeneratePanel from "@/components/business/workspace/CapabilityGeneratePanel.vue";
import GenerateActionBar from "@/components/business/workspace/GenerateActionBar.vue";
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
  <main class="min-h-[calc(100vh-74px)] bg-[#080a10]">
    <SecondaryNav />

    <section
      class="grid min-h-[calc(100vh-152px)] gap-0 lg:grid-cols-[280px_minmax(420px,560px)_1fr]"
    >
      <WorkspaceSidebar
        :active-code="activeCode"
        @select="activeCode = $event"
      />

      <section
        class="flex min-h-0 flex-col border-r border-white/10 bg-[#0b0e15]"
      >
        <div class="flex-1 overflow-y-auto p-5 lg:p-8 CapabilityGeneratePanel">
          <CapabilityGeneratePanel
            :capability="activeCapability"
            :selected-option-id="selectedOptionId"
            @select-option="selectedOptionId = $event"
          />
          <GenerateActionBar :capability="activeCapability" />
        </div>
      </section>

      <aside class="min-w-0 bg-[#090b11] p-5 lg:p-8 WorkspaceAssistPanel">
        <WorkspaceAssistPanel :capability="activeCapability" />
      </aside>
    </section>
  </main>
</template>
<style scoped>
.CapabilityGeneratePanel,
.WorkspaceAssistPanel {
  padding: 0 !important;
}
</style>
