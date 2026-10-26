<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from './api'
import { router as appRouter, tabs } from './router'
import AiSheet from './components/AiSheet.vue'
import HealthSceneBackground from './components/HealthSceneBackground.vue'

const route = useRoute()
const router = useRouter()

function hasSession() {
  try {
    return Boolean(window.sessionStorage.getItem('mengsu-auth'))
  } catch {
    return false
  }
}

const companion = ref(null)
const aiOpen = ref(false)
const shrunk = ref(false)
const direction = ref('forward')
const flowerOffset = ref({ x: 0, y: 0 })
const flowerDragging = ref(false)
const flowerMoved = ref(false)
const flowerPointer = { id: null, startX: 0, startY: 0, originX: 0, originY: 0 }
const touch = { x: 0, y: 0, active: false }

const chromeless = computed(() => route.meta.chrome === false)
const healthScene = computed(() => ['/home', '/profile'].includes(route.path) ? 0 : ['/health-analysis', '/smart-consult', '/ask'].includes(route.path) ? 2 : 1)
const flowerPosition = computed(() => ({ transform: `translate3d(${flowerOffset.value.x}px, ${flowerOffset.value.y}px, 0)` }))
const healthNavigation = [
  { label: '健康总览', path: '/home', group: '健康看板', icon: 'M3 10 12 3l9 7v10H3Z' },
  { label: '个人档案', path: '/profile', group: '健康看板', icon: 'M5 3h14v18H5Z M9 9a3 3 0 1 0 6 0 3 3 0 0 0-6 0 M7 19v-2a5 5 0 0 1 10 0v2' },
  { label: '日常锻炼', path: '/activity', group: '日常守护', icon: 'M5 19 19 5M12 5h7v7' },
  { label: '饮食健康', path: '/nutrition', group: '日常守护', icon: 'M12 13c-7-3-5-10 0-10s7 7 0 10Zm0 0c3-7 10-5 10 0s-7 7-10 0Zm0 0c-3-7-10-5-10 0s7 7 10 0Zm0 0v8m-4 0h8' },
  { label: '情绪状态', path: '/mood', group: '日常守护', icon: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z' },
  { label: '睡眠监测', path: '/sleep', group: '日常守护', icon: 'M16 3a9 9 0 1 0 0 18A10 10 0 0 1 16 3Z' },
  { label: '安全健康分析', path: '/health-analysis', group: '回顾与陪伴', icon: 'M2 12h5l3-5 4 10 3-5h5' },
  { label: '智慧问诊', path: '/smart-consult', group: '回顾与陪伴', icon: 'M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.2 3.1.7-3.1a2.5 2.5 0 0 1-2.5-2.5Z' }
]
healthNavigation.forEach(item => { if (item.group === '日常守护') item.group = '生活打卡'; if (item.path === '/health-analysis') item.group = '趋势洞察'; if (item.path === '/smart-consult') { item.group = '健康交流'; item.label = 'AI 健康问诊' } })
healthNavigation.splice(healthNavigation.findIndex(item => item.path === '/mood'), 1)
healthNavigation.splice(5, 0,
  { label: '视力检测', path: '/vision', group: '生活打卡', icon: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0' },
  { label: '健康挑战赛', path: '/challenges', group: '生活打卡', icon: 'M8 3h8v6a4 4 0 0 1-8 0Z M8 5H4v3a4 4 0 0 0 4 4 M16 5h4v3a4 4 0 0 1-4 4 M12 13v6 M8 21h8' })
const healthNavigationGroups = computed(() => ['健康看板', '生活打卡', '健康洞察与交流'].map(label => ({ label, items: healthNavigation.filter(item => label === '健康洞察与交流' ? ['趋势洞察', '健康交流'].includes(item.group) : item.group === label) })))

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

function startFlowerDrag(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  flowerPointer.id = event.pointerId
  flowerPointer.startX = event.clientX
  flowerPointer.startY = event.clientY
  flowerPointer.originX = flowerOffset.value.x
  flowerPointer.originY = flowerOffset.value.y
  flowerMoved.value = false
  flowerDragging.value = true
  event.currentTarget.setPointerCapture?.(event.pointerId)
}

function moveFlowerDrag(event) {
  if (!flowerDragging.value || event.pointerId !== flowerPointer.id) return
  const deltaX = event.clientX - flowerPointer.startX
  const deltaY = event.clientY - flowerPointer.startY
  if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) flowerMoved.value = true
  flowerOffset.value = {
    x: Math.max(-window.innerWidth + 74, Math.min(window.innerWidth - 74, flowerPointer.originX + deltaX)),
    y: Math.max(-window.innerHeight + 74, Math.min(window.innerHeight - 74, flowerPointer.originY + deltaY))
  }
}

function stopFlowerDrag(event) {
  if (event.pointerId !== flowerPointer.id) return
  flowerDragging.value = false
  flowerPointer.id = null
}

function openFlowerAssistant() {
  if (flowerMoved.value) return
  aiOpen.value = true
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
    <HealthSceneBackground v-if="!chromeless" :scene="healthScene" />
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
          <button v-if="!hasSession()" class="header-link" @click="router.push('/login')">登录</button>
          <button class="ghost small" @click="appRouter.push('/entry')">入口</button>
        </div>
      </header>

      <RouterView v-slot="{ Component }">
        <Transition :name="direction === 'forward' ? 'push-left' : 'push-right'" mode="out-in">
          <div :key="route.path" class="route-surface"><component :is="Component" :go="go" /></div>
        </Transition>
      </RouterView>
    </main>

    <button
      v-if="!chromeless && route.path !== '/ask'"
      class="ai-fab flower-fab"
      :class="{ dragging: flowerDragging }"
      :style="flowerPosition"
      aria-label="打开梦境对话，可拖拽移动"
      title="拖拽移动，点击打开梦境对话"
      @pointerdown="startFlowerDrag"
      @pointermove="moveFlowerDrag"
      @pointerup="stopFlowerDrag"
      @pointercancel="stopFlowerDrag"
      @click="openFlowerAssistant"
    >
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id="bloom-petal" cx="50%" cy="52%" r="58%">
            <stop offset="0" stop-color="#f6a6b7" />
            <stop offset=".54" stop-color="#f9c3ce" />
            <stop offset="1" stop-color="#fee8ec" />
          </radialGradient>
          <radialGradient id="bloom-core" cx="50%" cy="45%" r="62%">
            <stop offset="0" stop-color="#ffd87e" />
            <stop offset="1" stop-color="#f3a26c" />
          </radialGradient>
          <filter id="bloom-soft" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation=".65" />
          </filter>
        </defs>
        <g class="flower-petals">
          <path d="M50 51C36 44 33 29 49 11c2-3 4-3 6 0 15 19 11 33-5 40Z" />
          <path d="M50 51C36 44 33 29 49 11c2-3 4-3 6 0 15 19 11 33-5 40Z" transform="rotate(72 50 50)" />
          <path d="M50 51C36 44 33 29 49 11c2-3 4-3 6 0 15 19 11 33-5 40Z" transform="rotate(144 50 50)" />
          <path d="M50 51C36 44 33 29 49 11c2-3 4-3 6 0 15 19 11 33-5 40Z" transform="rotate(216 50 50)" />
          <path d="M50 51C36 44 33 29 49 11c2-3 4-3 6 0 15 19 11 33-5 40Z" transform="rotate(288 50 50)" />
        </g>
        <g class="flower-stamens">
          <path d="M50 52 50 32M50 52l16-9M50 52l-15-9M50 52l10 14M50 52l-10 14" />
          <circle cx="50" cy="32" r="3" /><circle cx="66" cy="43" r="3" /><circle cx="35" cy="43" r="3" /><circle cx="60" cy="66" r="3" /><circle cx="40" cy="66" r="3" />
        </g>
      </svg>
    </button>
    <nav v-if="!chromeless" class="health-navigation" aria-label="健康导航">
      <div class="health-nav-brand">
        <span class="health-nav-mark" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M23 5a12 12 0 1 0 4 18A13 13 0 0 1 23 5Z" stroke="currentColor" stroke-width="1.1"/><path d="m12 11 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" fill="currentColor"/></svg></span>
        <span><strong>梦溯</strong><small>把身体感受轻轻记下</small></span>
      </div>
      <div v-for="(group, index) in healthNavigationGroups" :key="group.label" class="health-nav-group" :class="`health-nav-group-${index + 1}`">
        <p><span>{{ String(index + 1).padStart(2, '0') }}</span> {{ group.label }}</p>
        <button
          v-for="item in group.items"
          :key="item.label"
          :class="{ active: route.path === item.path }"
          :aria-current="route.path === item.path ? 'location' : undefined"
          @click="openHealth(item.path)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="item.icon" /></svg>
          <span>{{ item.label }}</span>
        </button>
      </div>
      <button class="health-nav-profile" :class="{ active: route.path === '/me' }" @click="go('me')">
        <span class="profile-seal">梦</span><span><strong>我的空间</strong><small>个人记录与设置</small></span><b aria-hidden="true">···</b>
      </button>
    </nav>
    <AiSheet v-if="aiOpen" @close="aiOpen = false" />

  </div>
</template>

<style scoped>
.app:not(.chromeless) .app-main{position:relative;z-index:1;background:transparent}
.app .health-navigation { position: fixed; top: 0; right: auto; bottom: 0; left: 0; z-index: 3; display: flex; flex-direction: column; width: 248px; padding: 31px 18px 18px; overflow-y: auto; background: linear-gradient(165deg, #f5f2fa 0%, #fbfaff 47%, #f4f7fc 100%); border: 0; border-right: 1px solid #e5e0ee; box-shadow: 10px 0 30px rgba(92, 77, 112, .035); }
.app .health-nav-brand { display: flex; align-items: center; gap: 11px; padding: 3px 10px 30px; color: #4e4660; }
.app .health-nav-mark { display: grid; place-items: center; width: 45px; height: 45px; flex-shrink:0; background: transparent; color: #465868; }
.app .health-nav-mark svg { width:48px; height:48px; overflow:visible; }
.app .health-nav-brand strong, .app .health-nav-profile strong { display: block; color: #494154; font: 600 19px/1.1 var(--display); }
.app .health-nav-brand small, .app .health-nav-profile small { display: block; margin-top: 5px; color: #9b94a6; font-size: 10px; }
.app .health-nav-group { display: grid; gap: 5px; margin: 4px 0 25px; padding-top: 14px; border-top: 1px solid rgba(222,216,232,.8); }
.app .health-nav-group:first-of-type { padding-top: 0; border-top: 0; }
.app .health-nav-group > p { margin: 0 0 7px 6px; color: #756984; font-size: 11px; font-weight: 700; letter-spacing: .02em; }
.app .health-navigation button { flex: none; display: flex; align-items: center; justify-content: flex-start; gap: 13px; min-height: 47px; padding: 10px 12px; border: 0; border-radius: 11px; background: transparent; color: #827b91; font-size: 14px; font-weight: 500; text-align: left; white-space: nowrap; box-shadow: none; }
.app .health-navigation button svg { display: block; width: 19px; height: 19px; flex-shrink: 0; }
.app .health-navigation button.active { min-height: 54px; background: #e5def1; color: #56466f; font-weight: 700; box-shadow: inset 4px 0 0 #9b82b9; }
.app .health-navigation button:hover { background: rgba(230, 224, 242, .58); color: #625477; box-shadow: none; }
.app .health-navigation button:focus-visible { outline: 2px solid #b3a3cf; outline-offset: -3px; box-shadow: none; }
.app .health-nav-profile { margin-top: auto; padding-top: 17px !important; border-top: 1px solid #e5e0ee !important; border-radius: 0 !important; }
.app .health-nav-profile .profile-seal { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; color: #7b6689; background: #e9e3f3; font: 600 13px/1 var(--display); }
.app .health-nav-profile > span:nth-child(2) { flex: 1; }
.app .health-nav-profile strong { font-size: 13px; }.app .health-nav-profile small { font-size: 9px; }.app .health-nav-profile b { color: #a7a0b0; font-size: 12px; letter-spacing: 1px; }
.app .health-nav-group > p { display:flex;align-items:center;gap:9px;letter-spacing:0; }
.app .health-nav-group > p > span { display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:#eeedf4;color:#858194;font-weight:600;font-size:11px; }
.app .health-nav-group:nth-of-type(2) > p > span { background:#edf4f2;color:#64817b; }
.app .health-nav-group:nth-of-type(3) > p > span { background:#f2edf6;color:#8b7194; }
.app .health-nav-group-1 { padding: 12px 8px 14px; border-radius: 14px; background: #f3eef9; }
.app .health-nav-group-2 { padding: 12px 8px 14px; border-radius: 14px; background: #edf6f2; }
.app .health-nav-group-3 { padding: 12px 8px 14px; border-radius: 14px; background: #eef2f9; }
.app .health-nav-group-1 > p { color: #745f8b; }
.app .health-nav-group-2 > p { color: #557c72; }
.app .health-nav-group-3 > p { color: #5f7190; }
.app .health-nav-group-1 > p > span { background: #e7dcf2; color: #80679b; }
.app .health-nav-group-2 > p > span { background: #dceee7; color: #5d887b; }
.app .health-nav-group-3 > p > span { background: #dfe7f4; color: #657a9d; }
.app .health-nav-group-1 button:hover { background: #e9def3; color: #614b78; }
.app .health-nav-group-2 button:hover { background: #dfeee8; color: #4c756a; }
.app .health-nav-group-3 button:hover { background: #e0e8f4; color: #536b90; }
.app .health-nav-group-1 button.active { background: #e4d8f0; color: #57416f; box-shadow: inset 4px 0 0 #9b82b9; }
.app .health-nav-group-2 button.active { background: #d7ebe3; color: #40695f; box-shadow: inset 4px 0 0 #6ca291; }
.app .health-nav-group-3 button.active { background: #dce6f4; color: #4c6385; box-shadow: inset 4px 0 0 #7c9bc4; }
@media(min-width:960px){.app .health-nav-group{margin-bottom:18px;gap:5px}.app .health-navigation button{min-height:48px}.app .health-navigation button svg{background:#eeedf4;border-radius:9px;padding:6px;box-sizing:content-box}.app .health-navigation button.active svg{background:#ffffff66}.app .health-navigation button.active{background:#e5def1;color:#56466f;box-shadow:inset 4px 0 0 #9b82b9}}
.app .health-navigation button.active{background:#e5def1;color:#56466f;box-shadow:inset 4px 0 0 #9b82b9}
@media(max-width:959px){.app .health-navigation{overflow-x:auto;justify-content:flex-start!important}.app .health-navigation button{min-width:69px;flex-shrink:0!important}.app .health-nav-group > p{display:none}}
@media (max-width: 959px) {
  .app .health-navigation { flex-direction: row; justify-content: space-around; gap: 0; padding: 8px 5px calc(8px + env(safe-area-inset-bottom)); border-right: 0; border-top: 1px solid #e4dfef; }
  .app .health-nav-brand, .app .health-nav-group > p, .app .health-nav-profile { display: none; }
  .app .health-nav-group { display: contents; }
  .app .health-navigation button { flex: 1; flex-direction: column; justify-content: center; gap: 4px; min-height: 52px; padding: 5px 0; font-size: 10px; text-align: center; }
  .app .health-navigation button svg { display: block; width: 20px; height: 20px; }
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
  touch-action: none;
  cursor: grab;
  transition: filter 160ms cubic-bezier(.23,1,.32,1);
}
.app .ai-fab.flower-fab::before { display: none; }
.app .flower-fab svg { width: 58px; height: 58px; overflow: visible; }
.app .flower-petals {
  fill: url(#bloom-petal);
  stroke: #ec91aa;
  stroke-width: 1.35;
  stroke-linejoin: round;
  filter: url(#bloom-soft) drop-shadow(0 3px 6px rgba(219, 121, 148, .2));
}
.app .flower-stamens { fill: url(#bloom-core); stroke: #f2ac72; stroke-width: 1.45; stroke-linecap: round; }
.app .flower-fab.dragging { cursor: grabbing; filter: saturate(1.08) drop-shadow(0 8px 13px rgba(224, 126, 157, .2)); }
.app .flower-fab.dragging svg { transform: scale(1.04); }
.app .flower-fab svg { transition: transform 160ms cubic-bezier(.23,1,.32,1); }
@media (hover: hover) and (pointer: fine) {
  .app .flower-fab:hover:not(:disabled):not(.dragging) svg { transform: rotate(-4deg) scale(1.06); }
}
.app .ai-fab.flower-fab:hover:not(:disabled) {
  background: transparent;
  box-shadow: none;
}
@media(min-width:960px){
  .app .health-nav-group-1 button.active{background:#e4d8f0;color:#57416f;box-shadow:inset 4px 0 0 #9b82b9}
  .app .health-nav-group-2 button.active{background:#d7ebe3;color:#40695f;box-shadow:inset 4px 0 0 #6ca291}
  .app .health-nav-group-3 button.active{background:#dce6f4;color:#4c6385;box-shadow:inset 4px 0 0 #7c9bc4}
}
.app .health-nav-group-1 > p > span{color:#80679b;background:#e7dcf2}
.app .health-nav-group-2 > p > span{color:#5d887b;background:#dceee7}
.app .health-nav-group-3 > p > span{color:#657a9d;background:#dfe7f4}
.app .health-navigation .health-nav-group-1 > p > span{color:#80679b!important;background:#e7dcf2!important}
.app .health-navigation .health-nav-group-2 > p > span{color:#5d887b!important;background:#dceee7!important}
.app .health-navigation .health-nav-group-3 > p > span{color:#657a9d!important;background:#dfe7f4!important}
.app .ai-fab.flower-fab:focus-visible { outline: 2px solid #e891aa; outline-offset: 3px; }
.header-link { padding: 8px 10px; min-height: 44px; background: transparent; color: var(--ink-soft); border-radius: 6px; font-size: 13px; font-weight: 400; }
.header-link:hover:not(:disabled) { color: var(--accent); box-shadow: none; }
.app-head-right { flex-wrap: wrap; }
.home-expanded .app-main {
  width: calc(100% - 248px);
  margin-left: 248px;
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
  .app .health-navigation { top: auto; right: 0; bottom: 0; left: 0; flex-direction: row; justify-content: space-around; gap: 0; width: auto; padding: 8px 5px calc(8px + env(safe-area-inset-bottom)); border: 0; border-top: 1px solid #e4dfef; }
  .app .health-nav-brand, .app .health-nav-group > p, .app .health-nav-profile { display: none; }
  .app .health-nav-group { display: contents; }
  .app .health-navigation button { flex: 1; flex-direction: column; justify-content: center; gap: 4px; min-height: 52px; padding: 5px 0; font-size: 10px; text-align: center; }
  .app .health-navigation button svg { width: 20px; height: 20px; }
  .home-expanded .app-main { width: 100%; margin-left: 0; padding: 20px 18px 120px; }
}
.app.chromeless { min-height: 100dvh; }
.chromeless .app-main { max-width: none; margin: 0; padding: 0; min-height: 100dvh; }
.chromeless .route-surface { transform: none; }
@media (prefers-reduced-motion: reduce) { .route-surface { transition: none !important; animation: none !important; } }
</style>
