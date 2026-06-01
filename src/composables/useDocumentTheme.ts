import { watchEffect } from 'vue'

import { useAppStore } from '@/stores/app'

export function syncDocumentTheme(isDarkMode: boolean) {
  const theme = isDarkMode ? 'dark' : 'light'
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

export function useDocumentTheme() {
  const appStore = useAppStore()

  watchEffect(() => {
    syncDocumentTheme(appStore.isDarkMode)
  })
}
