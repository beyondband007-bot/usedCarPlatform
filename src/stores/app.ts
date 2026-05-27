import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    appName: '脸谱AI汽车电商视觉平台',
    sidebarCollapsed: false,
  }),
  actions: {
    setSidebarCollapsed(collapsed: boolean) {
      this.sidebarCollapsed = collapsed
    },
  },
})
