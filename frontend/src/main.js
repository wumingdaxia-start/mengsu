import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import './style.css'
import { refreshSession, startAuthSync } from './auth'

// Account availability must not keep the entire interface blank.
createApp(App).use(router).mount('#app')
startAuthSync()
void refreshSession()
