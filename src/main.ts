import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import { initBrowserEnv } from './utils/browser-env'
import '@company/ai-studio-sdk/styles.css'
import './styles/tailwind.css'
import './styles/index.scss'
import './styles/home-wechat.scss'

async function bootstrap() {
  initBrowserEnv()

  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)

  app.use(router)

  await router.isReady()
  app.mount('#app')
}

void bootstrap()
