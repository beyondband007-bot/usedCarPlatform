<script setup lang="ts">
import { computed } from "vue";
import {
  darkTheme,
  NConfigProvider,
  NDialogProvider,
  NMessageProvider,
  NNotificationProvider,
  type GlobalThemeOverrides,
} from "naive-ui";

import { useAppStore } from "@/stores/app";

const appStore = useAppStore();
const activeTheme = computed(() => (appStore.isDarkMode ? darkTheme : null));

const themeOverrides = computed<GlobalThemeOverrides>(() =>
  appStore.isDarkMode
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
          primaryColor: "#d6b36f",
          primaryColorHover: "#e4c782",
          primaryColorPressed: "#b68a3e",
          bodyColor: "#f3f5f8",
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
        <NNotificationProvider>
          <div
            :data-theme="appStore.isDarkMode ? 'dark' : 'light'"
            class="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]"
          >
            <RouterView />
          </div>
        </NNotificationProvider>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
