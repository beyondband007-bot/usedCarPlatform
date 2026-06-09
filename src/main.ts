import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { syncDocumentTheme } from './composables/useDocumentTheme'
import router from './router'
import { useAppStore } from './stores/app'
import { initBrowserEnv } from './utils/browser-env'
import '@company/ai-studio-sdk/styles.css'
import './styles/tailwind.css'
import './styles/index.scss'
import './styles/home-wechat.scss'

initBrowserEnv()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
syncDocumentTheme(useAppStore().isDarkMode)
app.use(router)

app.mount('#app')
