<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { api, shortDay, today } from '../api'
import { emotionColor } from '../constants'
import HealthTwinCard from '../components/HealthTwinCard.vue'

const props = defineProps({ go: { type: Function, default: () => {} }, sleepOnly: Boolean })

const data = ref(null)
const dayData = ref(null)
const pending = ref([])
const searchText = ref('')
const searchRows = ref([])
const chosen = ref([])
const cue = ref(null)
const audioUrl = ref('')
const sleepText = ref('')
const message = ref('')
const busy = ref(false)
const dateBits = computed(() => {
  const now = new Date()
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()]
  return { month: `${now.getMonth() + 1}月`, day: now.getDate(), week }
})
const profileGender = ref('')
const personalActivity = ref([])
const personalDiet = ref([])
function recordHealth() { props.go('/activity') }
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 5) return '夜深了，先照顾好此刻的自己。'
  if (hour < 11) return '早上好，今天也从留意自己开始。'
  if (hour < 18) return '下午好，给自己一点喘息的时间。'
  return '晚上好，慢慢回看今天的状态。'
})

const sleepRecord = computed(() => dayData.value?.sleep?.at(-1) || null)
const sleepDuration = computed(() => {
  const record = sleepRecord.value
  if (!record?.sleep_at || !record?.wake_at) return ''
  const start = new Date(record.sleep_at)
  const end = new Date(record.wake_at)
  const hours = (end - start) / 3600000
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) return ''
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}小时${m ? `${m}分` : ''}`
})

const latestFeeling = computed(() => {
  const fragment = dayData.value?.fragments?.at(-1)
  return sleepRecord.value?.feeling || fragment?.emotion || ''
})

function loadPersonalHealthData() {
  try {
    const account = JSON.parse(sessionStorage.getItem('mengsu-auth') || '{}')?.email || 'guest'
    personalActivity.value = JSON.parse(localStorage.getItem(`mengsu-activity-records-v1:${account}`) || '[]') || []
    personalDiet.value = JSON.parse(localStorage.getItem(`mengsu-diet-records-v1:${account}`) || '[]') || []
    const profile = JSON.parse(localStorage.getItem('mengsu-personal-profile-v1') || '{}') || {}
    profileGender.value = profile.gender === '男' || profile.gender === '女' ? profile.gender : ''
  } catch { personalActivity.value = []; personalDiet.value = []; profileGender.value = '' }
}
const todayActivity = computed(() => personalActivity.value.filter(row => row.date === today()))
const todayDiet = computed(() => personalDiet.value.filter(row => row.date === today()))
const activityMinutes = computed(() => todayActivity.value.reduce((sum, row) => sum + Number(row.minutes || 0), 0))
const activityCalories = computed(() => todayActivity.value.reduce((sum, row) => sum + Number(row.calories || 0), 0))
const dietCalories = computed(() => todayDiet.value.reduce((sum, row) => sum + Number(row.calories || 0), 0))
const totalTodayRecords = computed(() => {
  const record = dayData.value || {}
  return (record.notes?.length || 0) + (record.sleep?.length || 0) + (record.fragments?.length || 0) + todayActivity.value.length + todayDiet.value.length
})

async function load() {
  try {
    const [home, todayRecord, pendingRows] = await Promise.all([
      api.home(), api.day(today()), api.pending()
    ])
    data.value = home
    dayData.value = todayRecord
    pending.value = pendingRows
  } catch (err) {
    message.value = `加载失败：${err.message}`
  }
}

async function runSearch() {
  if (!searchText.value.trim()) {
    searchRows.value = []
    return
  }
  searchRows.value = await api.searchDreams(searchText.value.trim())
}

function toggleCue(item) {
  const exists = chosen.value.find((row) => row.id === item.id)
  chosen.value = exists
    ? chosen.value.filter((row) => row.id !== item.id)
    : [...chosen.value, item].slice(-3)
}

async function makeCue() {
  const items = chosen.value.length ? chosen.value.map((row) => row.text) : ['今晚的事']
  cue.value = await api.cue(items)
  audioUrl.value = ''
  message.value = '线索已生成。'
}

async function makeAudio() {
  if (!cue.value) return
  busy.value = true
  try {
    const result = await api.cueAudio(cue.value.id)
    audioUrl.value = result.url
    message.value = `线索音频 ${result.seconds} 秒`
  } catch (err) {
    message.value = `生成失败：${err.message}`
  } finally {
    busy.value = false
  }
}

async function saveSleep() {
  if (!sleepText.value.trim()) return
  const result = await api.send(sleepText.value.trim())
  sleepText.value = ''
  message.value = result.reply
  await load()
}

onMounted(() => {
  loadPersonalHealthData()
  load()
  window.addEventListener('mengsu:auth-change', loadPersonalHealthData)
})
onBeforeUnmount(() => window.removeEventListener('mengsu:auth-change', loadPersonalHealthData))
</script>

<template>
  <div class="health-home" :class="{ 'sleep-only': sleepOnly }">
    <header v-if="!sleepOnly" class="safety-page-heading"><p>健康看板 / 健康总览</p><h1>健康总览</h1><span>集中查看日常锻炼、饮食与睡眠记录。</span></header>
    <HealthTwinCard
      v-if="!sleepOnly"
      :gender="profileGender"
      :notes="dayData?.notes?.length || 0"
      :sleep="dayData?.sleep?.length || 0"
      :dreams="dayData?.fragments?.length || 0"
      class="rise"
      style="--i: 1"
    />

    
    <section class="health-top rise" style="--i: 1">
      <div class="health-welcome">
        <p class="health-eyebrow">HEALTH JOURNAL</p>
        <h2>{{ greeting }}</h2>
        <p class="welcome-copy">
          {{ totalTodayRecords
            ? `今天已经留下 ${totalTodayRecords} 项记录。活动、饮食和身体感受也可以慢慢补充。`
            : '这里不为今天打分，只把你愿意记录的状态放在一起。想到什么，再慢慢补充。' }}
        </p>
        <div class="welcome-foot">
          <span>今日健康记录</span>
          <button class="welcome-action" @click="recordHealth">记录活动 <span aria-hidden="true">↗</span></button>
        </div>
      </div>
      <div class="health-summary" aria-label="今日记录概况">
        <span class="summary-orbit orbit-one" />
        <span class="summary-orbit orbit-two" />
        <div class="summary-center">
          <span class="summary-symbol" aria-hidden="true">✳</span>
          <strong>{{ totalTodayRecords }}</strong>
          <span>项今日记录</span>
        </div>
        <small>不生成健康分数</small>
      </div>
    </section>

    <section class="health-metrics rise" style="--i: 2" aria-label="健康维度">
      <article id="activity" class="metric metric-activity">
        <div class="metric-top"><span class="metric-icon" aria-hidden="true">↗</span><span class="metric-state">{{ todayActivity.length ? '已记录' : '待记录' }}</span></div>
        <strong class="metric-value">{{ todayActivity.length ? activityMinutes : '—' }}</strong><span class="metric-unit">{{ todayActivity.length ? '分钟' : '活动' }}</span>
        <p>{{ todayActivity.length ? `今日活动消耗 ${activityCalories} 千卡` : '今天的活动时长还没有记录' }}</p>
        <button class="metric-link" @click="props.go('/activity')">{{ todayActivity.length ? '查看记录' : '补充一条' }} <span aria-hidden="true">→</span></button>
      </article>
      <article id="nutrition" class="metric metric-food">
        <div class="metric-top"><span class="metric-icon" aria-hidden="true">◌</span><span class="metric-state">{{ todayDiet.length ? '已记录' : '待记录' }}</span></div>
        <strong class="metric-value">{{ todayDiet.length ? dietCalories : '—' }}</strong><span class="metric-unit">{{ todayDiet.length ? '千卡' : '饮食' }}</span>
        <p>{{ todayDiet.length ? `今日已记录 ${todayDiet.length} 餐` : '今天还没有饮食记录' }}</p>
        <button class="metric-link" @click="props.go('/nutrition')">{{ todayDiet.length ? '查看记录' : '补充一条' }} <span aria-hidden="true">→</span></button>
      </article>
      <article id="sleep" class="metric metric-sleep">
        <div class="metric-top"><span class="metric-icon" aria-hidden="true">☾</span><span class="metric-state">{{ sleepRecord ? '已记录' : '待记录' }}</span></div>
        <strong class="metric-value">{{ sleepDuration || '—' }}</strong><span class="metric-unit">睡眠</span>
        <p>{{ sleepRecord?.feeling || (sleepRecord ? '已保存睡眠记录' : '还没有昨夜睡眠记录') }}</p>
        <button class="metric-link" @click="props.go('/sleep')">{{ sleepRecord ? '查看记录' : '记下睡眠' }} <span aria-hidden="true">→</span></button>
      </article>
      <article class="metric metric-body">
        <div class="metric-top"><span class="metric-icon" aria-hidden="true">♡</span><span class="metric-state">{{ latestFeeling ? '已记录' : '待记录' }}</span></div>
        <strong class="metric-value feeling-value">{{ latestFeeling || '—' }}</strong><span class="metric-unit">身体与情绪</span>
        <p>{{ latestFeeling ? '来自你今天留下的记录' : '写下此刻身体或心情的感受' }}</p>
        <button class="metric-link" @click="props.go('capture')">记录感受 <span aria-hidden="true">→</span></button>
      </article>
    </section>

<section id="health-reminders" class="reminders rise" style="--i: 3">
      <div class="section-heading">
        <div><p class="health-eyebrow">A GENTLE CHECK-IN</p><h2>今天可以留意</h2></div>
        <span class="reminder-note">按自己的节奏来</span>
      </div>
      <div class="reminder-list">
        <article><span class="reminder-number">01</span><div><h3>活动</h3><p>如果今天久坐了一阵，可以起身舒展一下。</p></div><button aria-label="记录活动" @click="props.go('/activity')">↗</button></article>
        <article><span class="reminder-number">02</span><div><h3>饮食</h3><p>有想记下的一餐或饮水情况，可以补充到日记。</p></div><button aria-label="记录饮食" @click="props.go('/nutrition')">↗</button></article>
        <article><span class="reminder-number">03</span><div><h3>睡眠与梦境</h3><p>醒来后的感受也很重要，不必只记时长。</p></div><button aria-label="记录睡眠与梦境" @click="props.go('/sleep')">↗</button></article>
      </div>
    </section>

    <div v-if="sleepOnly" class="journal-tools rise" style="--i: 4">
      <section class="journal-section home-search">
        <div class="section-heading compact-heading"><div><p class="health-eyebrow">FIND A MEMORY</p><h2>回看梦境</h2></div><button class="text-action" @click="props.go('dreams')">全部记录 →</button></div>
        <div class="search"><input v-model="searchText" placeholder="搜索梦境、人物、地点" @keyup.enter="runSearch" /><button class="ghost" @click="runSearch">搜索</button></div>
        <div v-if="searchRows.length" class="search-results">
          <div v-for="row in searchRows" :key="row.id" class="search-hit"><span class="dot" :style="{ background: emotionColor(row.emotion) }" /><span>{{ row.text }}</span><span class="muted small">{{ shortDay(row.fragment_date) }}</span></div>
        </div>
        <div class="dream-links">
          <button @click="props.go('capture')"><span>＋</span><span><b>记下一个梦</b><small>醒来时的片段也值得留下</small></span></button>
          <button @click="props.go('dreams')"><span>⌁</span><span><b>梦境地图</b><small>{{ data?.network?.links?.length || 0 }} 条记忆丝线</small></span></button>
        </div>
      </section>

      <section class="journal-section sleep-tools">
        <div class="section-heading compact-heading"><div><p class="health-eyebrow">BEFORE SLEEP</p><h2>睡前线索</h2></div></div>
        <p class="journal-intro">挑选一段想温柔记住的片段，生成今晚的提示线索。</p>
        <p v-if="!pending.length" class="empty-note">目前没有待整理的日间片段，可以先生成一条中性线索。</p>
        <div v-else class="chips"><button v-for="item in pending" :key="item.id" class="chip" :class="{ on: chosen.find((row) => row.id === item.id) }" @click="toggleCue(item)">{{ item.text.slice(0, 14) }}</button></div>
        <div class="tool-actions"><button @click="makeCue">生成线索</button><button class="ghost" :disabled="!cue || busy" @click="makeAudio">{{ busy ? '合成中' : '合成音频' }}</button></div>
        <audio v-if="audioUrl" :src="audioUrl" controls class="audio" />
        <div class="sleep-row"><input v-model="sleepText" placeholder="补记睡眠，例如：两点入睡，六点半醒" /><button class="ghost" @click="saveSleep">记下</button></div>
        <p v-if="message" class="muted small">{{ message }}</p>
      </section>
    </div>

    <section v-if="sleepOnly" class="dream-records rise" style="--i: 5">
      <div class="section-heading compact-heading"><div><p class="health-eyebrow">DREAM JOURNAL</p><h2>最近的梦</h2></div><button class="text-action" @click="props.go('dreams')">打开梦境 →</button></div>
      <p v-if="!data?.recent?.length" class="empty-note">还没有梦境记录。醒来后记下记得的片段就好，不需要完整。</p>
      <div v-for="row in (data?.recent || []).slice(0, 3)" :key="row.id" class="dream-entry">
        <span class="dream-dot" :style="{ background: emotionColor(row.emotion) }" /><span class="dream-entry-text">{{ row.text }}</span><span class="dream-entry-meta">{{ shortDay(row.fragment_date) }}{{ row.place ? ` · ${row.place}` : '' }}</span>
      </div>
      <button v-if="data?.recent?.length" class="text-action ask-action" @click="props.go('ask')">聊聊最近的梦 →</button>
    </section>
  </div>
</template>

<style scoped>
.sleep-only > :not(.journal-tools) { display: none; }
.sleep-only .journal-tools { display: block; margin-top: 0; }
.sleep-only .home-search { display: none; }
.health-home { --health-green: #a58bb4; --health-green-deep: #766084; --health-mint: #f3edf7; --health-line: #e7dfed; min-width: 0; color: #48445b; }
.health-heading, .section-heading, .metric-top, .welcome-foot { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.health-heading { margin: 0 0 20px; }
.health-date, .health-eyebrow { margin: 0; color: #898095; font-size: 11px; line-height: 1.4; letter-spacing: .08em; }
.health-heading h1, .section-heading h2 { margin: 3px 0 0; font: 600 25px/1.25 var(--display); color: #48445b; }
.health-presence { display: inline-flex; align-items: center; gap: 8px; color: #8d779d; font-size: 12px; }
.health-presence i { width: 7px; height: 7px; border-radius: 50%; background: #b59ac6; }
.health-top { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(230px, .85fr); min-height: 232px; gap: 18px; }
.health-welcome { position: relative; display: flex; flex-direction: column; align-items: flex-start; min-width: 0; padding: 27px 30px 22px; overflow: hidden; color: #6f627a; background: rgba(214,196,225,.36); border: 1px solid rgba(207,190,220,.18); border-radius: 7px; backdrop-filter: blur(18px); }
.health-welcome::after { content: ''; position: absolute; width: 300px; height: 300px; right: -70px; bottom: -210px; border: 1px solid rgba(255,255,255,.2); border-radius: 50%; box-shadow: 0 0 0 28px rgba(255,255,255,.06), 0 0 0 58px rgba(255,255,255,.04); pointer-events: none; }
.health-welcome .health-eyebrow { color: rgba(111,98,122,.68); }
.health-welcome h2 { max-width: 640px; margin: 15px 0 8px; font: 500 clamp(20px, 2vw, 28px)/1.35 var(--display); }
.welcome-copy { max-width: 610px; margin: 0; color: rgba(94,84,107,.74); font-size: 14px; line-height: 1.75; }
.welcome-foot { position: relative; z-index: 1; width: 100%; margin-top: auto; padding-top: 21px; font-size: 12px; color: rgba(103,91,115,.72); }
.welcome-action { background: transparent; border: 0; border-radius: 0; padding: 5px 0; color: #806c91; font-size: 13px; }
.welcome-action:hover:not(:disabled) { box-shadow: none; }
.health-summary { position: relative; display: grid; place-items: center; min-height: 232px; overflow: hidden; border: 1px solid rgba(225,217,234,.34); border-radius: 7px; background: rgba(255,255,255,.3); backdrop-filter: blur(18px); }
.summary-orbit { position: absolute; width: 152px; aspect-ratio: 1; border: 1px solid #e3d8eb; border-radius: 50%; }
.orbit-two { width: 182px; border-color: #f1eaf5; }
.summary-center { position: relative; display: flex; flex-direction: column; align-items: center; color: #8b7f95; font-size: 12px; }
.summary-symbol { margin-bottom: 1px; color: #ae8cbd; font-size: 21px; }
.summary-center strong { color: #655375; font-size: 29px; line-height: 1.2; font-weight: 600; font-variant-numeric: tabular-nums; }
.health-summary small { position: absolute; bottom: 14px; color: #a398ac; font-size: 11px; }
.health-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-top: 15px; }
.metric { min-width: 0; min-height: 176px; padding: 17px 18px 14px; border: 1px solid rgba(225,217,234,.26); border-radius: 7px; background: rgba(255,255,255,.24); backdrop-filter: blur(16px); }
.metric-top { align-items: flex-start; }
.metric-icon { display: grid; place-items: center; width: 31px; height: 31px; border-radius: 6px; color: #9a80ac; background: #f5eff9; font-size: 17px; }
.metric-state { color: #97899f; font-size: 11px; }
.metric-value { display: inline-block; max-width: 100%; margin: 15px 5px 0 0; overflow: hidden; color: #5c4c6d; font-size: 25px; line-height: 1.2; font-weight: 600; text-overflow: ellipsis; vertical-align: baseline; }
.metric-unit { color: #968a9e; font-size: 12px; }
.feeling-value { font-size: 21px; }
.metric p { min-height: 20px; margin: 5px 0 6px; overflow: hidden; color: #94899c; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.metric-link, .text-action { border: 0; border-radius: 0; padding: 0; background: transparent; color: #9577a9; font-size: 11px; font-weight: 400; }
.metric-link:hover:not(:disabled), .text-action:hover:not(:disabled) { box-shadow: none; color: #735488; }
.reminders { margin-top: 25px; }
.section-heading h2 { font-size: 19px; }
.reminder-note { color: #a197aa; font-size: 11px; }
.reminder-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 12px; }
.reminder-list article { display: grid; grid-template-columns: 26px minmax(0, 1fr) 24px; align-items: start; gap: 10px; min-height: 86px; padding: 14px 15px; border: 1px solid rgba(225,217,234,.24); border-left: 3px solid rgba(184,154,201,.38); border-radius: 5px; background: rgba(255,255,255,.2); backdrop-filter: blur(16px); }
.reminder-number { color: #ac91bb; font-size: 11px; font-variant-numeric: tabular-nums; }
.reminder-list h3 { margin: 0 0 3px; color: #675771; font-size: 12px; font-weight: 600; }
.reminder-list p { margin: 0; color: #94899c; font-size: 11px; line-height: 1.55; }
.reminder-list button { padding: 0; border: 0; background: transparent; color: #ac91bb; font-size: 15px; }
.reminder-list button:hover:not(:disabled) { box-shadow: none; }
.journal-tools { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 28px; }
.journal-section, .dream-records { min-width: 0; padding: 19px 20px; border: 1px solid rgba(225,217,234,.24); border-radius: 7px; background: rgba(255,255,255,.2); backdrop-filter: blur(16px); }
.compact-heading h2 { font-size: 18px; }
.search { display: flex; gap: 8px; margin-top: 14px; }
.search input, .sleep-row input { min-width: 0; height: 40px; padding: 7px 11px; border-radius: 5px; font-size: 13px; }
.search button, .sleep-row button, .tool-actions button { min-height: 38px; border-radius: 5px; font-size: 12px; }
.search button, .sleep-row button { flex-shrink: 0; white-space: nowrap; }
.search-results { margin-top: 8px; }
.search-hit { display: grid; grid-template-columns: 8px minmax(0,1fr) auto; align-items: center; gap: 8px; padding: 7px 0; border-bottom: 1px solid #eee7f3; font-size: 12px; }
.dot, .dream-dot { width: 7px; height: 7px; border-radius: 50%; }
.dream-links { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-top: 13px; }
.dream-links button { display: flex; align-items: center; gap: 11px; min-width: 0; padding: 11px; text-align: left; color: #957aa6; background: #faf7fc; border: 1px solid #eee5f4; border-radius: 5px; }
.dream-links button > span:first-child { font-size: 20px; }
.dream-links b, .dream-links small { display: block; }
.dream-links b { color: #665572; font-size: 12px; font-weight: 500; }
.dream-links small { margin-top: 1px; color: #a293ab; font-size: 10px; }
.journal-intro, .empty-note { margin: 12px 0; color: #92839d; font-size: 12px; line-height: 1.6; }
.chips, .tool-actions { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 9px; }
.chip { padding: 6px 9px; border: 1px solid var(--health-line); border-radius: 4px; background: #faf7fc; color: #877193; font-size: 11px; }
.chip.on { border-color: #b499c6; background: #f4edf9; color: #836096; }
.sleep-row { display: flex; gap: 8px; margin-top: 12px; }
.sleep-row input { flex: 1; }
.sleep-tools .small { color: #9b8ba5; }
.dream-records { margin-top: 15px; }
.dream-entry { display: grid; grid-template-columns: 8px minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 12px 0; border-bottom: 1px solid #eee7f3; }
.dream-entry-text { overflow: hidden; color: #72617d; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.dream-entry-meta { color: #a293ab; font-size: 10px; white-space: nowrap; }
.ask-action { margin-top: 12px; }
@media (min-width: 1300px) { .health-metrics { gap: 16px; } .metric { min-height: 184px; padding: 19px 21px 15px; } }
@media (max-width: 959px) { .health-top { grid-template-columns: minmax(0, 1.3fr) minmax(190px, .7fr); } .health-welcome { padding: 22px; } .health-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 620px) { .health-heading { align-items: flex-end; } .health-heading h1 { font-size: 22px; } .health-presence { font-size: 10px; white-space: nowrap; } .health-top { grid-template-columns: 1fr; gap: 10px; } .health-welcome { min-height: 212px; padding: 20px; } .health-welcome h2 { margin-top: 12px; font-size: 21px; } .welcome-copy { font-size: 12px; } .health-summary { min-height: 144px; } .summary-orbit { width: 112px; } .orbit-two { width: 136px; } .health-metrics { gap: 9px; margin-top: 10px; } .metric { min-height: 160px; padding: 12px; } .metric-value { font-size: 21px; } .feeling-value { font-size: 18px; } .metric p { font-size: 10px; } .reminders { margin-top: 22px; } .reminder-list { grid-template-columns: 1fr; gap: 8px; } .reminder-list article { min-height: auto; padding: 11px 12px; } .journal-tools { grid-template-columns: 1fr; gap: 10px; margin-top: 22px; } .journal-section, .dream-records { padding: 16px 14px; } .dream-links { gap: 7px; } .dream-links button { gap: 7px; padding: 9px 7px; } .dream-links small { font-size: 9px; } .dream-entry { grid-template-columns: 8px minmax(0,1fr); } .dream-entry-meta { grid-column: 2; } }
@media (prefers-reduced-motion: reduce) { .health-home .rise { animation: none; } }
</style>

