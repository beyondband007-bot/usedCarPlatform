<script setup lang="ts">
import {
  darkTheme,
  NConfigProvider,
  NDialogProvider,
  NMessageProvider,
  NNotificationProvider,
  type GlobalThemeOverrides,
} from "naive-ui";

const themeOverrides: GlobalThemeOverrides = {
  common: {
    borderRadius: "12px",
    borderRadiusSmall: "10px",
    primaryColor: "#d6b36f",
    primaryColorHover: "#e4c782",
    primaryColorPressed: "#b68a3e",
    bodyColor: "#090b11",
    cardColor: "rgba(18, 22, 32, 0.72)",
    modalColor: "rgba(18, 22, 32, 0.92)",
    popoverColor: "rgba(18, 22, 32, 0.92)",
    textColorBase: "#f7f7f8",
  },
  Card: {
    borderRadius: "0px",
  },
  Button: {
    borderRadiusMedium: "12px",
    borderRadiusLarge: "12px",
  },
  Input: {
    borderRadius: "14px",
  },
};
</script>

<template>
  <NConfigProvider :theme="darkTheme" :theme-overrides="themeOverrides">
    <NMessageProvider>
      <NDialogProvider>
        <NNotificationProvider>
          <RouterView />
        </NNotificationProvider>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
