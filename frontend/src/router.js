import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import CaptureView from './views/CaptureView.vue'
import DreamsView from './views/DreamsView.vue'
import AskView from './views/AskView.vue'
import MeView from './views/MeView.vue'
import EntryView from './views/EntryView.vue'
import HealthDetailView from './views/HealthDetailView.vue'
import SleepWorkspaceView from './views/SleepWorkspaceView.vue'

export const tabs = [
  { path: '/home', label: '首页', component: HomeView, order: 0 },
  { path: '/capture', label: '捕梦', component: CaptureView, order: 1 },
  { path: '/dreams', label: '梦境', component: DreamsView, order: 2 },
  { path: '/ask', label: '先知', component: AskView, order: 3 },
  { path: '/me', label: '我的', component: MeView, order: 4 }
]

const routes = [
  { path: '/sleep', component: SleepWorkspaceView, meta: { label: '睡眠监测', healthPage: true } },
  ...[
    { path: '/activity', label: '日常锻炼', section: 'activity' },
    { path: '/nutrition', label: '饮食健康', section: 'nutrition' },
    { path: '/health-analysis', label: '安全健康分析', section: 'analysis' }
  ].map(item => ({ path: item.path, component: HealthDetailView, props: { section: item.section }, meta: { label: item.label, healthPage: true } })),
  { path: '/clarity-demo', component: () => import('./views/ClarityDemoView.vue'), meta: { label: '梦境清晰度预览' } },
  {
  path: '/entry',
  name: 'entry',
  component: EntryView,
  meta: { chrome: false }
  },
  {
    path: '/',
    redirect: () => (sessionStorage.getItem('mengsu-entered') === '1' ? '/home' : '/entry')
  },
  ...tabs.map((tab) => ({
    path: tab.path,
    component: tab.component,
    meta: { label: tab.label, order: tab.order }
  })),
  { path: '/:pathMatch(.*)*', redirect: '/home' }
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (to) => to.hash ? { el: to.hash, top: 100 } : { top: 0 }
})

export function enterApp() {
  sessionStorage.setItem('mengsu-entered', '1')
  router.push('/home')
}
