<script setup>
import { computed, onMounted, onBeforeUnmount, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from './api'
import { isLoggedIn, signOut, refreshSession, SAFETY_API_BASE } from './auth'
import { WORKSPACES } from './workspaces'
import './workspace-themes.css'
import { router as appRouter, tabs } from './router'
import AiSheet from './components/AiSheet.vue'
import HealthSceneBackground from './components/HealthSceneBackground.vue'

const route = useRoute()
const router = useRouter()
const headerElement = ref(null)
const measuredHeaderHeight = ref(96)
let headerObserver
async function observeHeader() {
  await nextTick()
  headerObserver?.disconnect()
  if (!headerElement.value) return
  measuredHeaderHeight.value = headerElement.value.offsetHeight
  headerObserver = new ResizeObserver(entries => { measuredHeaderHeight.value = entries[0].target.offsetHeight })
  headerObserver.observe(headerElement.value)
}
onMounted(observeHeader)
onBeforeUnmount(() => headerObserver?.disconnect())

const companion = ref(null)
const aiOpen = ref(false)
const shrunk = ref(false)
const headerHidden = ref(false)
let lastScrollY = 0
const headerProfileName = ref('')
const headerSession = ref(false)
const spaceOpen = ref(false)
const direction = ref('forward')
const flowerOffset = ref({ x: 0, y: 0 })
const flowerDragging = ref(false)
const flowerMoved = ref(false)
const flowerPointer = { id: null, startX: 0, startY: 0, originX: 0, originY: 0 }
const touch = { x: 0, y: 0, active: false }
const weatherCity = ref('beijing')
const weatherBusy = ref(false)
const weatherRequest = ref(0)
const weather = ref({
  label: '北京',
  temperature: '--°',
  condition: '正在获取天气…',
  forecast: '请稍候',
  tip: '天气数据仅作日常出行参考',
  kind: 'sun'
})
const weatherCities = {
  beijing: [39.9042, 116.4074, '北京'],
  shanghai: [31.2304, 121.4737, '上海'],
  guangzhou: [23.1291, 113.2644, '广州'],
  shenzhen: [22.5431, 114.0579, '深圳'],
  chengdu: [30.5728, 104.0668, '成都'],
  hangzhou: [30.2741, 120.1551, '杭州'],
  wuhan: [30.5928, 114.3055, '武汉'],
  xian: [34.3416, 108.9398, '西安']
}

const headerDate = computed(() => {
  const now = new Date()
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()]
  return `${now.getMonth() + 1}月${now.getDate()}日 ${week}`
})
const workspaceKey = computed(() => route.meta.workspace || 'safety')
const workspace = computed(() => WORKSPACES[workspaceKey.value])
const headerGreeting = computed(() => `你好，${headerProfileName.value ? headerProfileName.value + '，' : ''}${workspace.value.greeting}`)

const chromeless = computed(() => route.meta.chrome === false)
watch(chromeless, observeHeader)
const healthScene = computed(() => workspace.value.scene)
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
const healthNavigationGroups = computed(() => {
  const makeItem = (label, path, icon) => ({ label, path, icon: icon || 'M4 4h16v16H4Z M8 9h8 M8 14h5' })
  if (workspaceKey.value === 'dream') return [
    { label: '梦境记录', items: [makeItem('梦境总览', '/dream'), makeItem('捕梦', '/capture', 'M12 3v18 M3 12h18'), makeItem('梦境档案', '/dreams')] },
    { label: '夜晚与记忆', items: [makeItem('睡前线索', '/dream/cues'), makeItem('梦境对话', '/ask')] }
  ]
  if (workspaceKey.value === 'psychology') return [
    { label: '此刻的自己', items: [makeItem('心理总览', '/psychology'), makeItem('心情记录', '/psychology/journal')] },
    { label: '心绪活动', items: [makeItem('人格测试', '/psychology/personality'), makeItem('塔罗牌测试', '/psychology/tarot'), makeItem('三观测试', '/psychology/views-test'), makeItem('呼吸练习', '/psychology/breathe')] },
    { label: '心理分析', items: [makeItem('情绪回顾', '/psychology/history')] }
  ]
  return ['健康看板', '生活打卡', '健康洞察与交流'].map(label => ({ label, items: healthNavigation.filter(item => label === '健康洞察与交流' ? ['趋势洞察', '健康交流'].includes(item.group) : item.group === label).map(item => item.path === '/home' ? { ...item, path: '/safety' } : item) }))
})

function openHealth(path) {
  router.push(path)
}

function currentOrder() {
  return route.meta.order ?? 0
}

watch(
  () => route.path,
  (path, oldPath) => {
    loadHeaderIdentity()
    spaceOpen.value = false
    headerHidden.value = false
    lastScrollY = window.scrollY
    const before = tabs.findIndex(tab => tab.path === oldPath)
    const after = tabs.findIndex(tab => tab.path === path)
    direction.value = after >= before ? 'forward' : 'back'
  }
)

function loadHeaderIdentity() {
  headerSession.value = isLoggedIn()
  if (!headerSession.value) {
    headerProfileName.value = ''
    return
  }
  try {
    const saved = JSON.parse(localStorage.getItem('mengsu-personal-profile-v1') || '{}')
    headerProfileName.value = typeof saved?.name === 'string' ? saved.name.trim() : ''
  } catch {
    headerProfileName.value = ''
  }
}

function switchTo(path) {
  const target = tabs.find((tab) => tab.path === path)
  if (!target) {
    if (path !== route.path) router.push(path)
    return
  }
  if (target.path === route.path) return
  direction.value = target.order > currentOrder() ? 'forward' : 'back'
  router.push(path)
}

function go(key) {
  const map = {
    home: workspace.value.home,
    capture: '/capture',
    dreams: '/dreams',
    ask: '/ask'
  }
  switchTo(map[key] || key)
}

function openAccount() {
  if (headerSession.value) toggleSpaceMenu()
  else router.push({ path: '/login', query: { next: route.path } })
}

function toggleSpaceMenu() {
  spaceOpen.value = !spaceOpen.value
}

async function logout() {
  try { await signOut() }
  catch (error) { window.alert(error.message); return }
  headerSession.value = false
  headerProfileName.value = ''
  spaceOpen.value = false
  window.dispatchEvent(new Event('mengsu:auth-change'))
}

function onSafetyAuthMessage(event) {
  if (event.origin !== SAFETY_API_BASE || event.source !== document.querySelector('.safety-original')?.contentWindow) return
  if (['mengsu:safety-auth', 'mengsu:safety-logout'].includes(event.data?.type)) void refreshSession()
}

function onWheel(event) {
  if (event.deltaY > 2) headerHidden.value = true
  if (event.deltaY < -2) headerHidden.value = false
}

function onScroll() {
  const current = window.scrollY
  const delta = current - lastScrollY
  if (current <= 8) headerHidden.value = false
  else if (delta > 3) headerHidden.value = true
  else if (delta < -3) headerHidden.value = false
  shrunk.value = current > 40
  lastScrollY = current
}

function onTouchStart(event) {
  if (chromeless.value || workspaceKey.value !== 'dream' || event.target.closest('input, textarea, select, button, [role="slider"]')) return
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

function weatherKind(code) {
  if (code === 0) return ['晴朗', 'sun']
  if (code <= 3) return ['多云', 'cloud']
  if (code <= 48) return ['有雾', 'fog']
  if (code >= 95) return ['雷雨', 'storm']
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return ['有雪', 'snow']
  if (code <= 67 || (code >= 80 && code <= 82)) return ['有雨', 'rain']
  return ['天气变化', 'cloud']
}

function weatherAdvice(temperature, rain) {
  let advice = temperature < 5 ? '穿厚外套，注意保暖' : temperature < 15 ? '建议穿外套或毛衣' : temperature < 24 ? '薄外套或长袖更合适' : temperature < 30 ? '适合轻薄透气衣物' : '穿轻薄衣物，注意防暑'
  if (rain >= 50) advice += '，外出带伞'
  return advice
}

function weatherUnavailable(message) {
  weather.value = { ...weather.value, temperature: '--°', condition: '天气暂不可用', forecast: '请稍后重试或切换城市', tip: message || '天气数据暂时没有回来', kind: 'cloud' }
}

async function loadWeather(latitude, longitude, label) {
  const request = ++weatherRequest.value
  weatherBusy.value = true
  weather.value = { ...weather.value, label, condition: `正在获取${label}天气…`, tip: '天气数据仅作日常出行参考', kind: 'cloud' }
  try {
    const data = await api.weather(latitude, longitude)
    if (request !== weatherRequest.value) return
    const current = data.current || {}, daily = data.daily || {}
    const temperature = Number(current.temperature_2m)
    const code = Number(current.weather_code)
    if (!Number.isFinite(temperature) || !Number.isFinite(code) || !Array.isArray(daily.temperature_2m_max) || !Array.isArray(daily.temperature_2m_min)) throw new Error('天气数据不完整')
    const [condition, kind] = weatherKind(code)
    const rain = Number(daily.precipitation_probability_max?.[0] || 0)
    weather.value = {
      label,
      temperature: `${Math.round(temperature)}°`,
      condition: `${label} · ${condition}`,
      forecast: `今日 ${Math.round(daily.temperature_2m_min[0])}–${Math.round(daily.temperature_2m_max[0])}° · 明日最高 ${Math.round(daily.temperature_2m_max[1] ?? daily.temperature_2m_max[0])}°`,
      tip: weatherAdvice(temperature, rain),
      kind
    }
  } catch (error) {
    if (request === weatherRequest.value) weatherUnavailable(error?.message)
  } finally {
    if (request === weatherRequest.value) weatherBusy.value = false
  }
}

function chooseWeatherCity() {
  const city = weatherCities[weatherCity.value]
  if (city) loadWeather(city[0], city[1], city[2])
}

function locateWeather() {
  if (!navigator.geolocation) {
    weatherUnavailable('此浏览器不支持定位，请手动选择城市')
    return
  }
  weatherBusy.value = true
  navigator.geolocation.getCurrentPosition(
    (position) => {
      weatherCity.value = ''
      loadWeather(position.coords.latitude, position.coords.longitude, '当前位置')
    },
    () => {
      weatherBusy.value = false
      weatherUnavailable('未获得定位权限，请手动选择城市')
    },
    { timeout: 8000, maximumAge: 600000 }
  )
}

onMounted(() => {
  loadHeaderIdentity()
  loadCompanion()
  chooseWeatherCity()
  window.addEventListener('storage', loadHeaderIdentity)
  window.addEventListener('mengsu:auth-change', loadHeaderIdentity)
  window.addEventListener('message', onSafetyAuthMessage)
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('wheel', onWheel, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('storage', loadHeaderIdentity)
  window.removeEventListener('mengsu:auth-change', loadHeaderIdentity)
  window.removeEventListener('message', onSafetyAuthMessage)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('wheel', onWheel)
})
</script>

<template>
  <div class="app" :data-workspace="workspaceKey" :data-psych-page="route.path.split('/')[2] || 'overview'" :style="{ '--header-height': measuredHeaderHeight + 'px' }" :class="{ chromeless, 'home-expanded': route.path === '/home' || route.meta.healthPage }">
    <HealthSceneBackground v-if="!chromeless" :scene="healthScene" />
    <main
      class="app-main"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <header v-if="!chromeless" ref="headerElement" class="app-head" :class="{ shrunk, 'is-hidden': headerHidden }">
        <div class="brand header-welcome">
          <div>
            <strong>{{ headerGreeting }}</strong>
            <span>{{ headerDate }}</span>
          </div>
        </div>
        <section class="header-weather" :class="{ 'is-loading': weatherBusy }" aria-label="城市天气">
          <span class="header-weather-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none">
              <template v-if="weather.kind === 'sun'">
                <circle cx="24" cy="24" r="8" stroke="currentColor" stroke-width="2" />
                <path d="M24 5v6M24 37v6M5 24h6M37 24h6M10.6 10.6l4.2 4.2M33.2 33.2l4.2 4.2M37.4 10.6l-4.2 4.2M14.8 33.2l-4.2 4.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </template>
              <template v-else-if="weather.kind === 'rain' || weather.kind === 'storm'">
                <path d="M14 30h21a7 7 0 0 0 .6-14 10 10 0 0 0-19.1 2A6 6 0 0 0 14 30Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
                <path d="m18 35-2 4m10-4-2 4m10-4-2 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </template>
              <template v-else-if="weather.kind === 'snow'">
                <path d="M14 28h21a7 7 0 0 0 .6-14 10 10 0 0 0-19.1 2A6 6 0 0 0 14 28Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
                <path d="M18 35v7m-3.5-3.5h7M29 35v7m-3.5-3.5h7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </template>
              <template v-else>
                <path d="M14 30h21a7 7 0 0 0 .6-14 10 10 0 0 0-19.1 2A6 6 0 0 0 14 30Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
                <path d="M11 36h10m7 0h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </template>
            </svg>
          </span>
          <div class="header-weather-copy">
            <div class="header-weather-top">
              <span>城市天气</span>
              <label class="weather-city-select">
                <span class="sr-only">选择城市</span>
                <select v-model="weatherCity" :disabled="weatherBusy" aria-label="选择城市" @change="chooseWeatherCity">
                  <option value="">当前位置</option>
                  <option v-for="(city, key) in weatherCities" :key="key" :value="key">{{ city[2] }}</option>
                </select>
              </label>
              <button type="button" class="header-weather-location" :disabled="weatherBusy" @click="locateWeather">定位</button>
            </div>
            <div class="header-weather-main"><strong>{{ weather.temperature }}</strong><b>{{ weather.condition }}</b><span>{{ weather.forecast }}</span></div>
            <p>{{ weather.tip }}</p>
          </div>
        </section>
        <div class="app-head-right">
          <button v-if="route.path !== '/entry'" class="header-link header-entry-link" @click="appRouter.push('/entry')">返回主页面</button>
          <button class="header-health-status" type="button" :title="nowLine()" aria-label="健康连接状态">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2.5 20 5.4v6.1c0 5-3.1 8.2-8 10-4.9-1.8-8-5-8-10V5.4Z" /><path d="M12 7.4v8.2m-4.1-4.1h8.2" /></svg>
            <i aria-hidden="true" />
          </button>
          <button class="header-account" type="button" @click="openAccount">
            <span><strong>{{ headerSession ? '已登录账号' : '登录账号' }}</strong><small>{{ headerSession ? '当前账号已登录' : '游客模式' }}</small></span>
            <b class="header-account-avatar">{{ headerSession ? (headerProfileName.slice(0, 1) || '我') : '登' }}</b>
          </button>
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
    <nav v-if="!chromeless" class="health-navigation" :aria-label="workspace.name + '导航'">
      <div class="health-nav-brand">
        <span class="health-nav-mark" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M23 5a12 12 0 1 0 4 18A13 13 0 0 1 23 5Z" stroke="currentColor" stroke-width="1.1"/><path d="m12 11 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" fill="currentColor"/></svg></span>
        <span><strong>{{ workspace.name }}</strong><small>{{ workspace.subtitle }}</small></span>
      </div>
      <div v-for="(group, index) in healthNavigationGroups" :key="group.label" class="health-nav-group" :class="`health-nav-group-${index + 1}`">
        <p><span>{{ String(index + 1).padStart(2, '0') }}</span> {{ group.label }}</p>
        <button
          v-for="item in group.items"
          :key="item.label"
          :class="{ active: route.path === item.path || (item.path === '/safety' && route.path === '/home') }"
          :aria-current="route.path === item.path ? 'location' : undefined"
          @click="openHealth(item.path)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="item.icon" /></svg>
          <span>{{ item.label }}</span>
        </button>
      </div>
      <button class="health-nav-profile" :class="{ active: spaceOpen }" :aria-expanded="spaceOpen" @click="toggleSpaceMenu">
        <span class="profile-seal">梦</span><span><strong>我的空间</strong></span><b aria-hidden="true">{{ spaceOpen ? '⌃' : '···' }}</b>
      </button>
      <div v-if="spaceOpen" class="health-nav-space-menu">
        <button type="button" @click="logout"><span>退出账号</span><b aria-hidden="true">↗</b></button>
      </div>
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
.app .health-nav-space-menu { margin: -1px 0 15px; padding: 6px 12px 8px 52px; border: 1px solid #e6deed; border-top: 0; border-radius: 0 0 14px 14px; background: rgba(244, 239, 249, .92); box-shadow: 0 7px 16px rgba(92, 77, 112, .05); }
.app .health-nav-space-menu button { width: 100%; min-height: 34px; justify-content: space-between; gap: 10px; padding: 7px 10px; border: 0; border-radius: 8px; color: #80637b; background: transparent; font-size: 12px; font-weight: 600; box-shadow: none; }
.app .health-nav-space-menu button b { color: #b293a9; font-size: 13px; font-weight: 500; transition: transform 160ms ease; }
.app .health-nav-space-menu button:hover { color: #6e4d68; background: rgba(255, 252, 255, .66); box-shadow: none; }
.app .health-nav-space-menu button:hover b { color: #9a7291; transform: translate3d(2px, -2px, 0); }
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
.app .health-navigation .health-nav-group{background:#f3eef9;border-color:#e5dfed}
.app .health-navigation .health-nav-group > p{color:#745f8b}
.app .health-navigation .health-nav-group > p > span{background:#e7dcf2!important;color:#80679b!important}
.app .health-navigation .health-nav-group button:hover{background:#e9def3;color:#614b78}
.app .health-navigation .health-nav-group button.active{background:#e4d8f0;color:#57416f;box-shadow:inset 4px 0 0 #9b82b9}

.app-head-right { flex-wrap: wrap; gap: 10px; }

.header-welcome { min-width: 0; }
.header-welcome > div { display: grid; gap: 5px; min-width: 0; }
.header-welcome strong { display: block; max-width: 370px; color: #51445f; font-size: 15px; line-height: 1.3; font-weight: 700; letter-spacing: 0; white-space: normal; }
.header-welcome span { color: #9b8da5; font-size: 12px; }

.header-health-status { position: relative; display: grid; place-items: center; width: 45px; height: 45px; padding: 0; border: 1px solid #e7dfed; border-radius: 14px; color: #8a70a3; background: rgba(255, 253, 255, .9); box-shadow: 0 5px 15px rgba(92, 77, 112, .07); }
.header-health-status svg { width: 23px; height: 23px; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.header-health-status i { position: absolute; top: 8px; right: 8px; width: 7px; height: 7px; border: 2px solid #fff; border-radius: 50%; background: #e77775; }
.header-health-status:hover:not(:disabled) { color: #654d78; background: #f5eff9; box-shadow: 0 7px 18px rgba(92, 77, 112, .1); }
.header-account { display: flex; align-items: center; gap: 10px; min-height: 45px; padding: 4px 5px 4px 9px; border: 0; border-radius: 15px; color: #5d4d6a; background: transparent; box-shadow: none; text-align: left; }
.header-account:hover:not(:disabled) { background: rgba(255, 255, 255, .66); box-shadow: none; }
.header-account > span { display: grid; gap: 2px; }
.header-account strong { font-size: 14px; font-weight: 700; white-space: nowrap; }
.header-account small { color: #9c8fa5; font-size: 11px; white-space: nowrap; }
.header-account-avatar { display: grid; place-items: center; width: 39px; height: 39px; border: 2px solid #e7dfed; border-radius: 50%; color: #7d6790; background: #f4edf8; font-size: 17px; font-weight: 700; box-shadow: 0 5px 14px rgba(92, 77, 112, .11); }
.header-page-link { margin-left: 2px; }
.header-entry-link { white-space: nowrap; }

/* Keep the weather and account controls anchored while the health content scrolls. */
.app-head,
.app-head.shrunk {
  position: fixed;
  top: 0;
  right: 0;
  left: 248px;
  z-index: 4;
  box-sizing: border-box;
  padding: 10px clamp(20px, 3.5vw, 72px) 10px;
  background: linear-gradient(105deg, rgba(255, 248, 247, .98), rgba(253, 250, 252, .98));
  backdrop-filter: blur(12px);
  border-bottom-color: var(--line);
  box-shadow: 0 5px 18px rgba(92, 77, 112, .07);
  transition: transform 220ms cubic-bezier(.23, 1, .32, 1), box-shadow 180ms ease;
  will-change: transform;
}
.app-head.is-hidden { transform: translate3d(0, -110%, 0); pointer-events: none; }
.app-head.shrunk { padding-bottom: 10px; margin-bottom: 0; }
.app-head.shrunk .brand-mark { font-size: 18px; }
.app-head.shrunk .brand-sub { opacity: 1; }

@media (min-width: 1200px) {
  .app-head {
    display: grid;
     grid-template-columns: minmax(0, 1fr) minmax(285px, 400px) minmax(0, 1fr);
    align-items: center;
    gap: 16px;
  }
  .app-head .brand { grid-column: 1; justify-self: start; min-width: 0; }
   .app-head .header-weather { grid-column: 2; justify-self: center; width: 100%; max-width: 400px; min-width: 0; margin: 0; flex: none; }
  .app-head .app-head-right { grid-column: 3; justify-self: end; min-width: 0; }
}

.header-weather {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1 1 430px;
  width: min(100%, 400px);
  min-width: 320px;
  margin: 0 auto;
  padding: 9px 17px;
  border: 1px solid #e7dfed;
  border-radius: 18px;
  color: #756381;
  background: linear-gradient(120deg, rgba(255, 253, 255, .92), rgba(244, 237, 249, .86));
  box-shadow: 0 9px 25px rgba(92, 77, 112, .08);
  backdrop-filter: blur(14px);
  transition: opacity 180ms ease, box-shadow 180ms ease;
}

.header-weather.is-loading { opacity: .72; }

.header-weather-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  border-radius: 14px;
  color: #8a70a3;
  background: #f0e9f7;
}

.header-weather-icon svg { width: 29px; height: 29px; }
.header-weather-copy { min-width: 0; }
.header-weather-top, .header-weather-main { display: flex; align-items: baseline; gap: 10px; white-space: nowrap; }
.header-weather-top { color: #94899f; font-size: 10px; }
.weather-city-select { display: inline-flex; min-width: 0; }
.weather-city-select select { max-width: 95px; padding: 1px 15px 1px 3px; border: 0; border-radius: 5px; color: #625375; background: transparent; font: inherit; font-size: 11px; font-weight: 700; appearance: auto; cursor: pointer; }
.weather-city-select select:focus { outline: 2px solid rgba(177, 151, 198, .35); outline-offset: 2px; border-radius: 4px; }
.weather-city-select select:disabled { cursor: wait; }
.header-weather-location { min-height: 24px; margin-left: auto; padding: 2px 5px; border: 0; border-radius: 6px; color: #836b91; background: transparent; font: inherit; font-size: 10px; cursor: pointer; }
.header-weather-location:hover:not(:disabled) { color: #654a75; background: #f0e6f5; box-shadow: none; }
.header-weather-location:disabled { opacity: .55; cursor: wait; }
.header-weather-main { margin-top: 1px; gap: 9px; }
.header-weather-main > strong { color: #57466b; font-size: 25px; line-height: 1.1; font-weight: 600; }
.header-weather-main b { color: #6f5b7f; font-size: 12px; }
.header-weather-main span { overflow: hidden; color: #a095aa; font-size: 10px; text-overflow: ellipsis; }
.header-weather-copy p { overflow: hidden; margin: 2px 0 0; color: #887c94; font-size: 11px; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
.header-weather .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

@media (max-width: 1100px) {
  .header-weather { min-width: 280px; padding-inline: 13px; gap: 10px; }
  .header-weather-icon { width: 46px; height: 46px; flex-basis: 46px; border-radius: 14px; }
  .header-weather-icon svg { width: 29px; height: 29px; }
  .header-weather-main > strong { font-size: 25px; }
  .header-weather-main b { font-size: 12px; }
  .header-weather-main span { font-size: 9px; }
}

@media (min-width: 960px) and (max-width: 1199px) {
  .app-head { display: flex; flex-wrap: wrap; align-items: center; }
  .app-head .brand { flex: 1 1 260px; }
  .app-head .app-head-right { flex: 0 1 auto; margin-left: auto; }
  .app-head .header-weather { order: 3; flex: 1 1 100%; width: 100%; max-width: none; min-width: 0; margin: 6px 0 0; }
  .app:not(.chromeless) .app-main,
  .home-expanded .app-main { padding-top: 150px; }
}

@media (max-width: 760px) {
  .header-weather { min-width: 0; flex-basis: 100%; order: 3; width: 100%; padding: 9px 12px; border-radius: 16px; }
  .header-weather-icon { width: 48px; height: 48px; flex-basis: 48px; border-radius: 15px; }
  .header-weather-icon svg { width: 31px; height: 31px; }
  .header-weather-top { gap: 9px; font-size: 11px; }
  .weather-city-select select { max-width: 105px; }
  .header-weather-main { gap: 8px; }
  .header-weather-main > strong { font-size: 26px; }
  .header-weather-main b { font-size: 12px; }
  .header-weather-main span, .header-weather-copy p { font-size: 10px; }
}

.home-expanded .app-main {
  width: calc(100% - 248px);
  margin-left: 248px;
  max-width: none;
  min-height: 100dvh;
  padding: 96px clamp(20px, 3.5vw, 72px) 110px;
}
.app:not(.chromeless) .app-main { padding-top: 96px; }
.home-expanded .route-surface { min-width: 0; }
@media (min-width: 960px) {
  .home-expanded .app-head { margin-bottom: 0; padding-bottom: 10px; border-bottom-color: var(--line); }
  .home-expanded .ai-fab { right: 3.5vw; }
}
@media (max-width: 959px) {
  .app-head,
  .app-head.shrunk { left: 0; padding: 10px 18px 8px; }
  .app-head-right { order: 2; align-self: stretch; justify-content: flex-end; }
  .app:not(.chromeless) .app-main,
  .home-expanded .app-main { padding-top: 142px; }
  .app .health-navigation { top: auto; right: 0; bottom: 0; left: 0; flex-direction: row; justify-content: space-around; gap: 0; width: auto; padding: 8px 5px calc(8px + env(safe-area-inset-bottom)); border: 0; border-top: 1px solid #e4dfef; }
  .app .health-nav-brand, .app .health-nav-group > p, .app .health-nav-profile { display: none; }
  .app .health-nav-group { display: contents; }
  .app .health-navigation button { flex: 1; flex-direction: column; justify-content: center; gap: 4px; min-height: 52px; padding: 5px 0; font-size: 10px; text-align: center; }
  .app .health-navigation button svg { width: 20px; height: 20px; }
  .home-expanded .app-main { width: 100%; margin-left: 0; padding: 142px 18px 120px; }
}
@media (min-width: 960px) and (max-width: 1199px) {
  .app:not(.chromeless) .app-main,
  .home-expanded .app-main { padding-top: 150px; }
}
.app.chromeless { min-height: 100dvh; }
.chromeless .app-main { max-width: none; margin: 0; padding: 0; min-height: 100dvh; }
.chromeless .route-surface { transform: none; }
@media (prefers-reduced-motion: reduce) { .route-surface { transition: none !important; animation: none !important; } }
@media (prefers-reduced-motion: reduce) { .app-head { transition: none !important; } }
</style>
