import { defineStore } from "pinia";

export const useAppStore = defineStore("app", {
  state: () => ({
    appName: "脸谱AI汽车电商视觉平台",
    isDarkMode: false,
  }),
  actions: {
    toggleTheme() {
      this.isDarkMode = !this.isDarkMode;
    },
  },
});
