import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { useThemeStore } from './stores/theme'
import './styles/tokens.css'
import './styles/components.css'
import './styles/app.css'

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)

  useThemeStore(pinia).init()
  await useAuthStore(pinia).hydrate()

  app.use(router)
  app.mount('#app')
}

void bootstrap()
