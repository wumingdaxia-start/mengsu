<script setup>
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api, today } from '../api'
import { EMOTIONS, TAGS, emotionColor } from '../constants'
const DreamClarityBridge = defineAsyncComponent(() => import('../components/DreamClarityBridge.vue'))

const props = defineProps({ go: { type: Function, default: () => {} } })
const route = useRoute()

const DRAFT_KEY = 'mengsu-dream-draft'

const day = ref(today())
const dayTitle = ref('')
const text = ref('')
const emotion = ref('')
const customEmotion = ref('')
const clarity = ref(2)
const tags = ref([])
const customTag = ref('')
const people = ref([])
const personInput = ref('')
const place = ref('')
const photo = ref(null)
const photoUrl = ref('')
const saving = ref(false)
const message = ref('')
const savedAt = ref('')

const nowText = computed(() =>
  new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '/')
)

function persistDraft() {
  localStorage.setItem(
    DRAFT_KEY,
    JSON.stringify({
      day: day.value,
      text: text.value,
      emotion: emotion.value,
      clarity: clarity.value,
      tags: tags.value,
      people: people.value,
      place: place.value
    })
  )
  savedAt.value = new Date().toLocaleTimeString('zh-CN', { hour12: false }).slice(0, 5)
}

function restoreDraft() {
  const raw = localStorage.getItem(DRAFT_KEY)
  if (!raw) return
  try {
    const data = JSON.parse(raw)
    day.value = data.day || day.value
    text.value = data.text || ''
    emotion.value = data.emotion || ''
    clarity.value = typeof data.clarity === 'number' && Number.isFinite(data.clarity)
      ? Math.max(1, Math.min(10, Math.round(data.clarity))) : 2
    tags.value = data.tags || []
    people.value = data.people || []
    place.value = data.place || ''
  } catch (err) {
    localStorage.removeItem(DRAFT_KEY)
  }
}

async function loadTitle() {
  try {
    const result = await api.dayTitle(day.value)
    dayTitle.value = result.title
  } catch (err) {
    dayTitle.value = ''
  }
}

function toggleTag(tag) {
  tags.value = tags.value.includes(tag)
    ? tags.value.filter((item) => item !== tag)
    : [...tags.value, tag]
}

function addCustomTag() {
  const value = customTag.value.trim()
  if (value && !tags.value.includes(value)) tags.value = [...tags.value, value]
  customTag.value = ''
}

function addPeople(raw) {
  const parts = raw
    .split(/[、,，;；\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
  const merged = [...people.value]
  parts.forEach((part) => {
    if (!merged.includes(part)) merged.push(part)
  })
  people.value = merged
}

function confirmPerson() {
  if (!personInput.value.trim()) return
  addPeople(personInput.value)
  personInput.value = ''
}

function removePerson(name) {
  people.value = people.value.filter((item) => item !== name)
}

async function pickPhoto(event) {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    const result = await api.uploadPhoto(file)
    photo.value = result.name
    photoUrl.value = result.url
  } catch (err) {
    message.value = `照片上传失败：${err.message}`
  }
}

function useLocation() {
  if (!navigator.geolocation) {
    message.value = '这个浏览器不支持定位，手写地点就行。'
    return
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords
      place.value = `坐标 ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`
    },
    () => {
      message.value = '定位没有成功，手写地点就行。'
    },
    { timeout: 8000 }
  )
}

async function save() {
  if (!text.value.trim()) {
    message.value = '先写一点梦境内容吧。'
    return
  }
  saving.value = true
  try {
    await api.createFragment({
      text: text.value.trim(),
      day: day.value,
      emotion: (emotion.value || customEmotion.value).trim() || null,
      clarity_score: clarity.value,
      tags: tags.value,
      people: people.value,
      place: place.value.trim() || null,
      photo_path: photo.value
    })
    localStorage.removeItem(DRAFT_KEY)
    message.value = '已保存。'
    text.value = ''
    tags.value = []
    people.value = []
    photo.value = null
    photoUrl.value = ''
    props.go('dreams')
  } catch (err) {
    message.value = `保存失败：${err.message}`
  } finally {
    saving.value = false
  }
}

watch([text, emotion, clarity, tags, people, place, day], persistDraft, { deep: true })

onMounted(() => {
  restoreDraft()
  const healthFocus = typeof route.query.healthFocus === 'string' ? route.query.healthFocus.trim() : ''
  if (healthFocus) {
    const focusTag = `身体关注·${healthFocus}`
    if (!tags.value.includes(focusTag)) tags.value = [...tags.value, focusTag]
    if (!text.value.trim()) text.value = `身体关注部位：${healthFocus}\n\n此刻的感受：`
    message.value = `已带入健康关注部位：${healthFocus}`
  }
  loadTitle()
})
</script>

<template>
  <div class="capture-workspace">
  <div class="capture-atmosphere" aria-hidden="true"><span /><span /><span /><i /><i /><i /><i /></div>
  <section class="capture rise" style="--i: 0">
    <p class="capture-title">记录梦境</p>
    <p class="muted small">{{ day }} · {{ dayTitle || '今天的标题还没生成' }}</p>
    <p class="capture-intro">把醒来时还留在心里的画面、声音或情绪，轻轻写下来。</p>
  </section>

  <section class="card capture-editor rise" style="--i: 1">
    <textarea v-model="text" rows="5" placeholder="比如：我在一栋老楼里找出口，走廊一直延伸，找不到门" />
    <div class="meta-row">
      <span class="muted small">记录时间 {{ nowText }}</span>
      <span class="muted small">草稿已保存 {{ savedAt || '—' }}</span>
    </div>
  </section>

  <section class="card rise" style="--i: 2">
    <p class="card-title">记录地点</p>
    <div class="row">
      <input v-model="place" placeholder="手写地点，比如 老楼 / 海边" />
      <button class="ghost" @click="useLocation">用当前位置</button>
    </div>
  </section>

  <section class="card rise" style="--i: 3">
    <p class="card-title">照片记录 · 可选</p>
    <input type="file" accept="image/*" @change="pickPhoto" />
    <img v-if="photoUrl" :src="photoUrl" alt="梦境配图" class="photo" />
  </section>

  <section class="card rise" style="--i: 4">
    <p class="card-title">情绪基调 · 选一种</p>
    <div class="chips">
      <button
        v-for="item in EMOTIONS"
        :key="item"
        class="chip"
        :class="{ on: emotion === item }"
        :style="emotion === item ? { borderColor: emotionColor(item), color: '#eef8f2' } : {}"
        @click="emotion = emotion === item ? '' : item"
      >
        {{ item }}
      </button>
    </div>
    <input v-model="customEmotion" placeholder="或者写自己的感受，比如 恍然" style="margin-top: 8px" />
  </section>

  <section class="rise" style="--i: 5">
    <DreamClarityBridge v-model="clarity" />
  </section>

  <section class="card rise" style="--i: 6">
    <p class="card-title">标签</p>
    <div class="chips">
      <button
        v-for="item in TAGS"
        :key="item"
        class="chip"
        :class="{ on: tags.includes(item) }"
        @click="toggleTag(item)"
      >
        {{ item }}
      </button>
      <button v-for="item in tags.filter((tag) => !TAGS.includes(tag))" :key="item" class="chip on" @click="toggleTag(item)">
        {{ item }} ×
      </button>
    </div>
    <div class="row" style="margin-top: 8px">
      <input v-model="customTag" placeholder="自定义标签" @keyup.enter="addCustomTag" />
      <button class="ghost" @click="addCustomTag">加上</button>
    </div>
  </section>

  <section class="card rise" style="--i: 7">
    <p class="card-title">人物</p>
    <p class="muted small">回车确认，可用顿号、逗号分隔多个人</p>
    <input v-model="personInput" placeholder="输入人物后回车" @keyup.enter="confirmPerson" />
    <div class="chips" style="margin-top: 8px">
      <button v-for="name in people" :key="name" class="chip on" @click="removePerson(name)">
        {{ name }} ×
      </button>
    </div>
  </section>

  <div class="capture-actions rise" style="--i: 8">
    <button :disabled="saving" @click="save">{{ saving ? '保存中' : '保存梦境' }}</button>
    <button class="ghost" @click="props.go('home')">先不记</button>
    <span v-if="message" class="muted small">{{ message }}</span>
  </div>
  </div>
</template>

<style scoped>
.capture-workspace {
  position: relative; isolation: isolate; width: 100%; max-width: none; margin-inline: auto;
  --ink: #48445b; --ink-soft: #625d73; --muted: #716b80;
  --surface: rgba(255,255,255,.8); --surface-2: rgba(249,248,253,.8);
  --line: #e4dfef; --line-strong: #d4cbe6;
  --accent: #9183b2; --accent-soft: #f0ecf8;
  color: var(--ink);
}
.capture-workspace::before {
  content: ''; position: absolute; inset: -22px -20px; z-index: -2;
  border-radius: 28px; pointer-events: none;
  background: radial-gradient(ellipse at 5% 5%, #ede8f7 0%, transparent 55%),
    radial-gradient(ellipse at 96% 35%, #e8f2fa 0%, transparent 55%),
    linear-gradient(145deg, #faf8fc, #f4f7fb 60%, #faf7fb);
}
.capture-atmosphere { position: absolute; inset: -20px; overflow: hidden; z-index: -1; pointer-events: none; border-radius: 28px; }
.capture-atmosphere span { position: absolute; width: 260px; height: 260px; border-radius: 50%; background: #c8b6e9; filter: blur(55px); opacity: .13; animation: capture-drift 30s cubic-bezier(.37,0,.63,1) infinite alternate; }
.capture-atmosphere span:nth-child(1) { top: 2%; left: 3%; }
.capture-atmosphere span:nth-child(2) { top: 32%; right: 0; background: #aecfe6; animation-delay: -13s; animation-duration: 38s; }
.capture-atmosphere span:nth-child(3) { bottom: 3%; left: 35%; width: 180px; height: 180px; background: #dfc7dd; animation-delay: -22s; }
.capture-atmosphere i { position: absolute; width: 7px; height: 7px; border-radius: 50%; background: #b9acd8; opacity: .16; filter: blur(2px); animation: capture-drift 26s cubic-bezier(.37,0,.63,1) infinite alternate; }
.capture-atmosphere i:nth-child(4) { top: 18%; left: 44%; }
.capture-atmosphere i:nth-child(5) { top: 54%; left: 4%; animation-delay: -9s; }
.capture-atmosphere i:nth-child(6) { top: 76%; right: 12%; animation-delay: -17s; }
.capture-atmosphere i:nth-child(7) { top: 6%; right: 18%; animation-delay: -21s; }
@keyframes capture-drift { from { transform: translate3d(-12px,8px,0); } to { transform: translate3d(20px,-20px,0); } }
.capture-workspace > .card, .capture-workspace :deep(.dream-clarity-scope) {
  background: rgba(255,255,255,.16); border: 1px solid rgba(218,211,235,.12);
  border-radius: 14px; box-shadow: none;
  -webkit-backdrop-filter: blur(22px); backdrop-filter: blur(22px);
}
.capture-workspace { font-size: 14px; }
.capture-workspace > .card { padding: 13px 15px; border-color: transparent; border-radius: 14px; }
.capture-workspace .capture { text-align: center; padding: 14px 0 8px; }
.capture-workspace .capture-title { margin-bottom: 4px; font-size: 18px; }
.capture-workspace .capture-intro { max-width: 460px; margin: 6px auto 0; color: #8d849b; font-size: 12px; line-height: 1.7; }
.capture-workspace .card-title { margin-bottom: 5px; font-size: 12px; }
.capture-workspace :is(input, textarea) { padding: 7px 10px; font-size: 13px; }
.capture-workspace .capture-editor textarea { min-height: 190px; }
.capture-workspace .chip { padding: 3px 9px; font-size: 11px; }
.capture-workspace :deep(.dream-clarity-scope) { padding: 13px !important; border-radius: 14px !important; }
.capture-workspace :deep(.dream-clarity-scope h2) { font-size: 17px !important; }
.capture-workspace :deep(.dream-clarity-scope > p) { padding-top: 4px !important; font-size: 12px !important; }
.capture-workspace :deep(.dream-clarity-scope > div:last-child) { font-size: 12px !important; }
.capture-workspace :is(input, textarea) { background: rgba(250,249,253,.75); border-color: #e3dfed; color: #48445b; caret-color: #9183b2; }
.capture-workspace :is(input, textarea)::placeholder { color: #827b91; }
.capture-workspace :is(input, textarea):focus-visible { background: rgba(255,255,255,.94); border-color: #b3a3cf; box-shadow: 0 0 0 3px rgba(178,157,211,.16), 0 0 16px rgba(178,157,211,.08); }
.capture-workspace input::file-selector-button { font: inherit; color: #65577d; background: #efebf7; border: 1px solid #ded6ed; border-radius: 8px; padding: 7px 12px; margin-right: 12px; cursor: pointer; }
.capture-workspace .ghost { background: rgba(255,255,255,.68); border-color: #dfd8ed; color: #6c6082; }
.capture-workspace .chip { background: rgba(250,248,254,.9); color: #71677f; border-color: #e5deef; }
.capture-workspace .chip.on { background: #eae3f5; color: #615277 !important; border-color: #c9bbdf !important; }
.capture-actions > button:first-child { background: #7b7095; color: #fff; }
.capture-actions > button:first-child:hover:not(:disabled) { background: #6c6087; }
.capture-workspace .meta-row { flex-wrap: wrap; font-variant-numeric: tabular-nums; }
.capture-workspace ::selection { background: #e2d8f0; color: #48445b; }
@media (min-width: 960px) {
  .capture-workspace { column-gap: 14px; row-gap: 12px; }
  .capture-workspace > .card { padding: 12px 14px !important; }
  .capture-workspace .capture-editor { grid-column: 1; grid-row: 2; align-self: start; }
  .capture-workspace .capture-editor textarea { min-height: 190px; flex: initial; }
  .capture-workspace .capture-actions { grid-column: 1 / -1; }
  .capture-workspace .row { flex-wrap: nowrap; }
  .capture-workspace .row input { flex: 1; min-width: 0; }
  .capture-workspace .row button { flex-shrink: 0; }
}
@media (max-width: 959px) {
  .capture-workspace { width: 100%; max-width: none; }
  .capture-workspace::before { inset: -14px -10px; border-radius: 20px; }
  .capture-workspace { display: grid; gap: 12px; }
  .capture-editor textarea { min-height: 170px; }
  .capture-workspace :is(input, textarea) { font-size: 16px; }
  .capture-workspace > .card { padding: 11px 12px !important; }
  .capture-workspace :deep(.dream-clarity-scope) { padding: 12px !important; }
}
@media (prefers-reduced-motion: reduce) {
  .capture-atmosphere :is(span,i), .capture-workspace .rise { animation: none; }
  .capture-workspace :is(input,textarea,button) { transition: none; }
}
</style>
