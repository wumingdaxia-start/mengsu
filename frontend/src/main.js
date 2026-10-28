import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import './style.css'
import { refreshSession, startAuthSync } from './auth'

refreshSession().finally(() => {
  startAuthSync()
  createApp(App).use(router).mount('#app')
})
