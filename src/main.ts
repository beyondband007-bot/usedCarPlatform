import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import { useAppStore } from './stores/app'
import { initBrowserEnv, registerViewportThemeSync } from './utils/browser-env'
import '@company/ai-studio-sdk/styles.css'
import './styles/tailwind.css'
import './styles/index.scss'
import './styles/home-wechat.scss'

initBrowserEnv()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

const appStore = useAppStore()
registerViewportThemeSync(() => {
  appStore.syncThemeForViewport()
})
appStore.syncThemeForViewport()
app.use(router)

app.mount('#app')
