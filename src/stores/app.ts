import { defineStore } from "pinia";

import { syncDocumentTheme } from "@/composables/useDocumentTheme";
import { isH5ViewportRef } from "@/utils/browser-env";

export const useAppStore = defineStore("app", {
  state: () => ({
    appName: "脸谱AI汽车电商视觉平台",
    prefersDarkMode: false,
  }),
  getters: {
    isDarkMode(): boolean {
      if (isH5ViewportRef.value) {
        return false;
      }

      return this.prefersDarkMode;
    },
  },
  actions: {
    toggleTheme() {
      if (isH5ViewportRef.value) {
        return;
      }

      this.prefersDarkMode = !this.prefersDarkMode;
      syncDocumentTheme(this.isDarkMode);
    },
    syncThemeForViewport() {
      syncDocumentTheme(this.isDarkMode);
    },
  },
});
