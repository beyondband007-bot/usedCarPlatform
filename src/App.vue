<script setup lang="ts">
import { computed, watchEffect } from "vue";
import {
  darkTheme,
  NConfigProvider,
  NDialogProvider,
  NMessageProvider,
  type GlobalThemeOverrides,
} from "naive-ui";
import { RouterView, useRoute } from "vue-router";

import { syncDocumentTheme } from "@/composables/useDocumentTheme";
import BackOfficeLayout from "@/layouts/BackOfficeLayout.vue";
import BackOfficeLoginPage from "@/pages/back-office-login/index.vue";
import { useAppStore } from "@/stores/app";

const appStore = useAppStore();
const route = useRoute();

const isBackOfficeRoute = computed(
  () =>
    route.path.startsWith("/back-office") ||
    route.path.startsWith("/reusable-credits-console") ||
    route.path.startsWith("/credits-admin"),
);

const isEffectiveDarkMode = computed(() => appStore.isDarkMode && !isBackOfficeRoute.value);

syncDocumentTheme(isEffectiveDarkMode.value);

watchEffect(() => {
  syncDocumentTheme(isEffectiveDarkMode.value);
});

const activeTheme = computed(() => (isEffectiveDarkMode.value ? darkTheme : null));
const themeOverrides = computed<GlobalThemeOverrides>(() =>
  isEffectiveDarkMode.value
    ? {
        // 夜间模式整体样式

        // 通用效果，谨慎设置，影响全局
        common: {
          borderRadiusSmall: "10px",
          primaryColor: "#d6b36f",
          primaryColorHover: "#e4c782",
          primaryColorPressed: "#b68a3e",
          bodyColor: "#020202",
          cardColor: "#101010",
          modalColor: "#101010",
          popoverColor: "#101010",
          textColorBase: "#f8fafc",
        },
        // 卡片
        Card: {
          borderRadius: "0px",
        },
        // 按钮
        Button: {
          borderRadiusMedium: "4px",
          borderRadiusLarge: "4px",
        },
        // 输入框
        Input: {
          borderRadius: "4px",
        },
      }
    : {
        // 日间模式整体样式

        // 通用效果，谨慎设置，影响全局
        common: {
          borderRadiusSmall: "10px",
          primaryColor: "#2f6bff",
          primaryColorHover: "#4f7fff",
          primaryColorPressed: "#1d4ed8",
          bodyColor: "#f6f9fc",
          cardColor: "#ffffff",
          modalColor: "#ffffff",
          popoverColor: "#ffffff",
          textColorBase: "#0f172a",
        },
        // 卡片
        Card: {
          borderRadius: "0px",
        },
        // 按钮
        Button: {
          borderRadiusMedium: "4px",
          borderRadiusLarge: "4px",
        },
        // 输入框
        Input: {
          borderRadius: "4px",
        },
      },
);
</script>

<template>
  <NConfigProvider :theme="activeTheme" :theme-overrides="themeOverrides">
    <NMessageProvider>
      <NDialogProvider>
        <div class="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
          <BackOfficeLoginPage v-if="route.path === '/back-office/login'" />
          <BackOfficeLayout
            v-else-if="
              route.path.startsWith('/back-office') ||
              route.path.startsWith('/reusable-credits-console') ||
              route.path.startsWith('/credits-admin')
            "
          />
          <RouterView v-else v-slot="{ Component }">
            <component :is="Component" v-if="Component" />
            <div v-else class="route-boot-shell" aria-hidden="true" />
          </RouterView>
        </div>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style scoped lang="scss">
.route-boot-shell {
  min-height: 100vh;
  background: var(--app-bg);
}
</style>
