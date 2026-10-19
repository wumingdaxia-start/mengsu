<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from './api'
import { router as appRouter, tabs } from './router'
import AiSheet from './components/AiSheet.vue'

const route = useRoute()
const router = useRouter()

const companion = ref(null)
const aiOpen = ref(false)
const shrunk = ref(false)
const direction = ref('forward')
const touch = { x: 0, y: 0, active: false }

const chromeless = computed(() => route.meta.chrome === false)
const healthNavigation = [
  { label: '健康总览', path: '/home', icon: 'M3 10 12 3l9 7v10H3Z' },
  { label: '日常锻炼', path: '/activity', icon: 'M5 19 19 5M12 5h7v7' },
  { label: '饮食健康', path: '/nutrition', icon: 'M12 13c-7-3-5-10 0-10s7 7 0 10Zm0 0c3-7 10-5 10 0s-7 7-10 0Zm0 0c-3-7-10-5-10 0s7 7 10 0Zm0 0v8m-4 0h8' },
  { label: '睡眠监测', path: '/sleep', icon: 'M16 3a9 9 0 1 0 0 18A10 10 0 0 1 16 3Z' },
  { label: '安全健康分析', path: '/health-analysis', icon: 'M2 12h5l3-5 4 10 3-5h5' }
]

function openHealth(path) {
  router.push(path)
}

function currentOrder() {
  return route.meta.order ?? 0
}

watch(
  () => route.path,
  (path, oldPath) => {
    const before = tabs.findIndex(tab => tab.path === oldPath)
    const after = tabs.findIndex(tab => tab.path === path)
    direction.value = after >= before ? 'forward' : 'back'
  }
)

function switchTo(path) {
  const target = tabs.find((tab) => tab.path === path)
  if (!target || target.path === route.path) return
  direction.value = target.order > currentOrder() ? 'forward' : 'back'
  router.push(path)
}

function go(key) {
  const map = {
    home: '/home',
    capture: '/capture',
    dreams: '/dreams',
    ask: '/ask',
    me: '/me'
  }
  switchTo(map[key] || key)
}

function onWheel(event) {
  shrunk.value = window.scrollY > 40 || event.deltaY > 0
}

function onScroll() {
  shrunk.value = window.scrollY > 40
}

function onTouchStart(event) {
  if (chromeless.value || event.target.closest('input, textarea, select, button, [role="slider"]')) return
  const point = event.touches[0]
  touch.x = point.clientX
  touch.y = point.clientY
  touch.active = true
}

function onTouchEnd(event) {
  if (!touch.active) return
  touch.active = false
  const point = event.changedTouches[0]
  const dx = point.clientX - touch.x
  const dy = point.clientY - touch.y
  if (Math.abs(dx) < 70 || Math.abs(dy) > 60) return
  const index = tabs.findIndex((tab) => tab.path === route.path)
  const next = dx < 0 ? index + 1 : index - 1
  if (next >= 0 && next < tabs.length) switchTo(tabs[next].path)
}

async function loadCompanion() {
  try {
    companion.value = await api.companion()
  } catch (err) {
    companion.value = null
  }
}

function nowLine() {
  const data = companion.value
  if (!data) return '正在连接'
  if (!data.connected) return '心潮未连接'
  const match = (data.now?.text ?? '').match(/情绪：(.+)/)
  return match ? `此刻 · ${match[1]}` : '此刻 · 在线'
}

onMounted(() => {
  loadCompanion()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('wheel', onWheel, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('wheel', onWheel)
})
</script>

<template>
  <div class="app" :class="{ chromeless, 'home-expanded': route.path === '/home' || route.meta.healthPage }">
    <main
      class="app-main"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <header v-if="!chromeless" class="app-head" :class="{ shrunk }">
        <div class="brand">
          <span class="brand-mark">梦溯</span>
          <span class="brand-sub">{{ route.meta.label }}</span>
        </div>
        <div class="app-head-right">
          <span class="pill">{{ nowLine() }}</span>
          <button v-if="route.path !== '/home'" class="header-link" @click="go('home')">返回首页</button>
          <button v-if="route.path !== '/me'" class="header-link" @click="go('me')">我的</button>
          <button class="ghost small" @click="appRouter.push('/entry')">入口</button>
        </div>
      </header>

      <RouterView v-slot="{ Component }">
        <Transition :name="direction === 'forward' ? 'push-left' : 'push-right'" mode="out-in">
          <div :key="route.path" class="route-surface"><component :is="Component" :go="go" /></div>
        </Transition>
      </RouterView>
    </main>

    <button v-if="!chromeless && route.path !== '/ask'" class="ai-fab flower-fab" aria-label="打开梦境对话" title="打开梦境对话" @click="aiOpen = true">
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <g class="flower-outline">
          <path d="M50 50 C37 43 37 27 50 12 C63 27 63 43 50 50Z" />
          <path d="M50 50 C37 43 37 27 50 12 C63 27 63 43 50 50Z" transform="rotate(72 50 50)" />
          <path d="M50 50 C37 43 37 27 50 12 C63 27 63 43 50 50Z" transform="rotate(144 50 50)" />
          <path d="M50 50 C37 43 37 27 50 12 C63 27 63 43 50 50Z" transform="rotate(216 50 50)" />
          <path d="M50 50 C37 43 37 27 50 12 C63 27 63 43 50 50Z" transform="rotate(288 50 50)" />
        </g>
      </svg>
    </button>
    <nav v-if="!chromeless" class="health-navigation" aria-label="健康导航">
      <button
        v-for="item in healthNavigation"
        :key="item.label"
        :class="{ active: route.path === item.path }"
        :aria-current="route.path === item.path ? 'location' : undefined"
        @click="openHealth(item.path)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="item.icon" /></svg>
        <span>{{ item.label }}</span>
      </button>
    </nav>
    <AiSheet v-if="aiOpen" @close="aiOpen = false" />

  </div>
</template>

<style scoped>
.app .health-navigation { display: flex; flex-direction: column; justify-content: flex-start; gap: 12px; padding: 54px 15px 20px; background: linear-gradient(155deg, #f3eff9 0%, #faf9fd 36%, #fff 74%); border-right: 1px solid #e4dfef; backdrop-filter: none; }
.app .health-navigation button { flex: none; display: flex; align-items: center; gap: 21px; min-height: 68px; padding: 16px 9px; border: 0; border-radius: 0; background: transparent; color: #827b91; font-size: 17px; font-weight: 500; text-align: left; box-shadow: none; }
.app .health-navigation button svg { width: 22px; height: 22px; flex-shrink: 0; }
.app .health-navigation button.active { background: transparent; color: #625477; font-weight: 600; }
.app .health-navigation button:hover { background: transparent; color: #625477; box-shadow: none; }
.app .health-navigation button:focus-visible { outline: 2px solid #b3a3cf; outline-offset: -3px; box-shadow: none; }
@media (max-width: 959px) {
  .app .health-navigation { flex-direction: row; justify-content: space-around; gap: 0; padding: 8px 5px calc(8px + env(safe-area-inset-bottom)); border-right: 0; border-top: 1px solid #e4dfef; }
  .app .health-navigation button { flex: 1; flex-direction: column; justify-content: center; gap: 4px; min-height: 52px; padding: 5px 0; font-size: 10px; text-align: center; }
  .app .health-navigation button svg { width: 20px; height: 20px; }
}
.app:not(.chromeless) .app-main { padding-bottom: 48px; }
.app .ai-fab.flower-fab {
  width: 62px;
  height: 62px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  display: grid;
  place-items: center;
}
.app .ai-fab.flower-fab::before { display: none; }
.app .flower-fab svg { width: 58px; height: 58px; overflow: visible; }
.app .flower-outline {
  fill: none;
  stroke: #e891aa;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 1px 3px rgba(214, 133, 160, .24));
}
.app .ai-fab.flower-fab:hover:not(:disabled) {
  background: transparent;
  box-shadow: none;
  transform: translateY(-2px) scale(1.04);
}
.app .ai-fab.flower-fab:focus-visible { outline: 2px solid #e891aa; outline-offset: 3px; }
.header-link { padding: 8px 10px; min-height: 44px; background: transparent; color: var(--ink-soft); border-radius: 6px; font-size: 13px; font-weight: 400; }
.header-link:hover:not(:disabled) { color: var(--accent); box-shadow: none; }
.app-head-right { flex-wrap: wrap; }
.home-expanded .app-main {
  width: calc(100% - 240px);
  margin-left: 240px;
  max-width: none;
  min-height: 100dvh;
  padding: 24px clamp(20px, 3.5vw, 72px) 110px;
}
.home-expanded .route-surface { min-width: 0; }
@media (min-width: 960px) {
  .home-expanded .app-head { margin-bottom: 24px; padding-bottom: 18px; border-bottom-color: var(--line); }
  .home-expanded .ai-fab { right: 3.5vw; }
}
@media (max-width: 959px) {
  .home-expanded .app-main { width: 100%; margin-left: 0; padding: 20px 18px 120px; }
}
.app.chromeless { min-height: 100dvh; }
.chromeless .app-main { max-width: none; margin: 0; padding: 0; min-height: 100dvh; }
.chromeless .route-surface { transform: none; }
@media (prefers-reduced-motion: reduce) { .route-surface { transition: none !important; animation: none !important; } }
</style>
