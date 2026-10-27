<script setup>
import { requireLogin } from '../auth'
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, today } from '../api'
import FeelingSliders from '../components/FeelingSliders.vue'
const props = defineProps({ section: { type: String, required: true } })
const router = useRouter()
const records = ref(null)
const error = ref('')
const loading = ref(true)
const moodCycle = ref('平稳期')
const moodEvent = ref('晨间反应')
const activeMoodEvent = ref('')
const simulatedAt = ref(new Date('2026-10-20T11:16:19+08:00'))
const moodToast = ref('')
const twinStyle = ref('female')
const todayCheckins = ref({})
const enabledReminders = ref({})
const checkinItems = [
  { id: 'water', icon: '滴', title: '喝一杯水', detail: '给身体补一点水分', time: '每 2 小时留意一次', tint: 'water' },
  { id: 'stretch', icon: '↗', title: '起身活动', detail: '离开座位，舒展肩颈和腿', time: '久坐约 50 分钟后', tint: 'stretch' },
  { id: 'exercise', icon: '✳', title: '轻运动', detail: '散步、拉伸或完成今日训练', time: '按自己的计划', tint: 'exercise' },
  { id: 'daylight', icon: '☼', title: '接触自然光', detail: '到窗边或户外走一小会儿', time: '白天任选一个时段', tint: 'daylight' },
  { id: 'winddown', icon: '☾', title: '睡前慢下来', detail: '留几分钟给安静和放松', time: '计划入睡前 30 分钟', tint: 'winddown' }
]
let moodToastTimer
const moodMetrics = [
  { label: '热度', value: 30, note: '身体有一点热意，但还能很快收住' },
  { label: '压抑感', value: 25, note: '有一点没说出口的急，但还不重' },
  { label: '控制力', value: 75, note: '还能维持表面正常，但需要刻意压着直接的欲望' },
  { label: '敏感度', value: 35, note: '会被亲近话语轻微影响' },
  { label: '蓄积感', value: 20, note: '身体仍处在比较松弛的状态' }
]
const remainingHours = computed(() => Math.max(0, 50 - Math.floor((simulatedAt.value.getTime() - new Date('2026-10-20T11:16:19+08:00').getTime()) / 3600000)))
const moodPrompt = computed(() => `你处在${moodCycle.value}：日常没有明显热意，但当对方靠近、撒娇或索取时，身体还是会受当下刺激起反应。\n\n身体状态：${moodMetrics.map(item => `${item.label}${item.value}/100`).join('，')}。\n当前短时事件：${moodEvent.value}。\n模拟时间：${formatSimulatedAt(simulatedAt.value)}。\n\n请把这视为用户设定的虚构状态参数，用于角色互动上下文；不要当作医学测量或健康判断。`)
function formatSimulatedAt(value) {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(value).replaceAll('-', '/')
}
function showMoodToast(message) {
  moodToast.value = message
  clearTimeout(moodToastTimer)
  moodToastTimer = setTimeout(() => { moodToast.value = '' }, 2200)
}
function advanceMoodTime(hours) {
  simulatedAt.value = new Date(simulatedAt.value.getTime() + hours * 3600000)
  persistMoodState()
}
function applyMoodCycle() {
  persistMoodState()
  showMoodToast(`已切换至${moodCycle.value}`)
}
function triggerMoodEvent() {
  activeMoodEvent.value = moodEvent.value
  persistMoodState()
  showMoodToast(`已触发：${moodEvent.value}`)
}
async function copyMoodPrompt() {
  try {
    await navigator.clipboard.writeText(moodPrompt.value)
    showMoodToast('状态提示词已复制')
  } catch {
    showMoodToast('复制失败，请手动选择提示词')
  }
}
function persistMoodState() {
  localStorage.setItem('mengsu-mood-state', JSON.stringify({ cycle: moodCycle.value, event: moodEvent.value, simulatedAt: simulatedAt.value.toISOString() }))
}
const checkinStorageKey = () => `mengsu-health-checkins:${today()}`
const reminderStorageKey = 'mengsu-health-reminders'
function toggleCheckin(id) {
  if (!requireLogin()) return
  todayCheckins.value = { ...todayCheckins.value, [id]: !todayCheckins.value[id] }
  localStorage.setItem(checkinStorageKey(), JSON.stringify(todayCheckins.value))
}
function toggleReminder(id) {
  if (!requireLogin()) return
  enabledReminders.value = { ...enabledReminders.value, [id]: !enabledReminders.value[id] }
  localStorage.setItem(reminderStorageKey, JSON.stringify(enabledReminders.value))
}
const completedCheckins = computed(() => Object.values(todayCheckins.value).filter(Boolean).length)
const activityWeek = computed(() => {
  const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const now = new Date()
  const mondayOffset = (now.getDay() + 6) % 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - mondayOffset)

  return labels.map((label, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return {
      label,
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      recorded: date.toDateString() === now.toDateString() && !!todayCheckins.value.exercise
    }
  })
})
const activityWeekCount = computed(() => activityWeek.value.filter(day => day.recorded).length)
const nutritionDraft = ref('')
const nutritionTags = ['清淡餐', '高蛋白', '餐后腹胀', '多喝水', '加餐零食', '晨起空腹', '外卖就餐']
const nutritionWeek = computed(() => ['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((label, index) => ({
  label,
  today: index === (new Date().getDay() + 6) % 7,
  recorded: false
})))
function addNutritionTag(tag) {
  nutritionDraft.value = nutritionDraft.value ? `${nutritionDraft.value} · ${tag}` : tag
}
const analysisWeek = computed(() => {
  const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const now = new Date()
  const currentIndex = (now.getDay() + 6) % 7
  const sleepRecorded = sleepRows.value.length > 0
  return labels.map((label, index) => ({
    label,
    today: index === currentIndex,
    markers: index === currentIndex && sleepRecorded ? ['sleep'] : []
  }))
})
const analysisWeekCount = computed(() => analysisWeek.value.filter(day => day.markers.length).length)
const analysisCoverage = computed(() => {
  const noteCount = records.value?.notes?.length || 0
  const sleepCount = sleepRows.value.length
  const fragmentCount = records.value?.fragments?.length || 0
  const total = noteCount + sleepCount + fragmentCount
  return {
    total,
    completeness: Math.min(100, Math.round((total / 7) * 100)),
    cards: [
      { label: '综合状态', value: total ? '已有记录' : '待积累', tone: 'violet' },
      { label: '记录节奏', value: total ? '已开始' : '未开始', tone: 'blue' },
      { label: '记录完整度', value: `${Math.min(100, Math.round((total / 7) * 100))}%`, tone: 'mint' },
      { label: '建议回看', value: total ? '可回看' : '3项', tone: 'purple' }
    ]
  }
})
const analysisPlot = computed(() => {
  const total = analysisCoverage.value.total
  const values = total ? [0, 1, 1, 2, 1, 2, Math.max(1, total)] : [0, 0, 0, 0, 0, 0, 0]
  const max = Math.max(3, ...values)
  return values.map((value, index) => `${18 + index * 54},${108 - (value / max) * 78}`).join(' ')
})
const pages = {
  activity: { title: '日常锻炼', caption: 'MOVEMENT', intro: '留意身体活动，也给休息留出位置。', empty: '还没有专门的活动记录', detail: '步数、活动时长和运动类型尚未接入。可以先在日记中留下今天的活动经历，原文会保存。', prompts: ['今天做了什么活动？', '活动后感觉怎样？', '什么时候需要休息？'] },
  nutrition: { title: '饮食健康', caption: 'NOURISHMENT', intro: '从一餐一饮，慢慢认识自己的日常。', empty: '还没有专门的饮食记录', detail: '饮食分类与营养统计尚未接入。可以先用日记记录吃了什么、饮水情况与餐后感受，不会自动编造热量。', prompts: ['今天吃了什么？', '饮水情况如何？', '餐后有什么感受？'] },
  mood: { title: '情绪状态', caption: 'EMOTIONAL WEATHER', intro: '给此刻的感受留一点位置，不必急着解释。', empty: '今天还没有情绪记录', detail: '可以在日记里写下情绪、发生的事情和身体感受。这里只帮助回看记录，不给情绪贴标签，也不作诊断。', prompts: ['此刻最明显的感受是什么？', '今天什么事情牵动了情绪？', '身体有什么感觉？'] },
  sleep: { title: '睡眠监测', caption: 'REST & DREAMS', intro: '时长之外，醒来后的感受也值得被看见。', empty: '今天还没有睡眠记录', detail: '记录入睡、醒来时间，或只说说醒来后的感觉。设备尚未接入，不推测睡眠分期。', prompts: ['大概什么时候入睡？', '夜里是否醒来？', '醒来后的感受如何？'] },
  analysis: { title: '安全健康分析', caption: 'HEALTH REFLECTION', intro: '把已有记录放在一起，分清知道的与尚不清楚的。', empty: '先积累记录，再回看变化', detail: '目前仅展示已保存记录的覆盖情况，不生成健康评分，也不据此判断疾病风险。', prompts: ['活动与饮食：尚未接入统计', '心率与睡眠分期：设备未接入', '睡眠与梦境：来自你的记录'] }
}
const page = computed(() => pages[props.section])
const sleepRows = computed(() => records.value?.sleep || [])
onMounted(async () => {
  try {
    todayCheckins.value = JSON.parse(localStorage.getItem(checkinStorageKey()) || '{}')
    enabledReminders.value = JSON.parse(localStorage.getItem(reminderStorageKey) || '{}')
  } catch { /* ignore invalid local preferences */ }
  if (props.section === 'mood') {
    try {
      const saved = JSON.parse(localStorage.getItem('mengsu-mood-state') || 'null')
      if (saved?.cycle) moodCycle.value = saved.cycle
      if (saved?.event) moodEvent.value = saved.event
      if (saved?.simulatedAt && Number.isFinite(Date.parse(saved.simulatedAt))) simulatedAt.value = new Date(saved.simulatedAt)
    } catch { /* ignore invalid local draft */ }
    loading.value = false
    return
  }
  try { records.value = await api.day(today()) }
  catch (err) { error.value = `记录加载失败：${err.message}` }
  finally { loading.value = false }
})
onBeforeUnmount(() => clearTimeout(moodToastTimer))
</script>

<template>
  <div class="health-detail">
    <header class="detail-heading"><p>{{ today() }} · {{ page.caption }}</p><h1>{{ page.title }}</h1><span>{{ page.intro }}</span></header>
    <FeelingSliders v-if="['activity', 'nutrition', 'mood'].includes(section)" :category="section" />
    <div v-if="section === 'nutrition'" class="nutrition-atmosphere" aria-hidden="true"><i class="nutrition-speck dot"></i><i class="nutrition-speck moon"></i><i class="nutrition-speck dot"></i><i class="nutrition-speck moon"></i><i class="nutrition-speck dot"></i></div>
    <div v-if="section === 'analysis'" class="analysis-atmosphere" aria-hidden="true"><i></i><i></i><i></i><i></i><b></b><b></b></div>
    <template v-if="section === 'mood'">
      <p class="mood-simulated-time">模拟时间 · {{ formatSimulatedAt(simulatedAt) }}</p>
      <div class="mood-dashboard">
        <div class="mood-left-column">
          <section class="mood-phase-panel">
            <div class="mood-phase-heading"><h2>{{ moodCycle }}</h2><span>约剩 {{ remainingHours }} 小时</span></div>
            <p>日常没有明显热意，但当对方靠近、撒娇或索取时，身体还是会受当下刺激起反应</p>
            <small>{{ activeMoodEvent ? `当前短时事件：${activeMoodEvent}` : '当前没有短时事件' }}</small>
          </section>
          <section class="mood-card mood-metrics-card">
            <h2>身体状态</h2>
            <div v-for="metric in moodMetrics" :key="metric.label" class="mood-metric">
              <div class="mood-metric-head"><span>{{ metric.label }}</span><strong>{{ metric.value }} / 100 · {{ metric.value < 30 ? '偏低' : metric.value < 60 ? '中低' : metric.value < 80 ? '中高' : '偏高' }}</strong></div>
              <div class="mood-meter" role="meter" :aria-label="metric.label" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="metric.value"><span :style="{ width: `${metric.value}%` }" /></div>
              <p>{{ metric.note }}</p>
            </div>
          </section>
        </div>
        <div class="mood-right-column">
          <section class="mood-card mood-controls-card">
            <h2>让时间向前</h2>
            <div class="mood-button-row"><button class="mood-outline" @click="advanceMoodTime(1)">+1 小时</button><button class="mood-outline" @click="advanceMoodTime(6)">+6 小时</button><button class="mood-outline" @click="advanceMoodTime(24)">+1 天</button></div>
            <label class="mood-field"><span>切换周期</span><select v-model="moodCycle"><option>平稳期</option><option>蓄积期</option><option>临近期</option><option>释放期</option><option>恢复期</option></select></label>
            <button class="mood-outline mood-action" @click="applyMoodCycle">应用周期</button>
            <label class="mood-field mood-event-field"><span>触发短时事件</span><select v-model="moodEvent"><option>晨间反应</option><option>亲密互动</option><option>情绪波动</option><option>压力增加</option><option>休息放松</option></select></label>
            <button class="mood-solid mood-action" @click="triggerMoodEvent">触发事件</button>
            <p class="mood-auto-save">操作后自动保存。此处时间为手动推进的模拟时间。</p>
          </section>
          <section class="mood-card mood-prompt-card">
            <div class="mood-prompt-heading"><h2>状态提示词</h2><button class="mood-outline" @click="copyMoodPrompt">复制</button></div>
            <p>加入模型上下文使用；本界面尚未连接聊天模型。</p>
            <pre>{{ moodPrompt }}</pre>
          </section>
        </div>
      </div>
      <Transition name="mood-toast"><p v-if="moodToast" class="mood-toast-message" role="status">{{ moodToast }}</p></Transition>
    </template>
    <p v-if="error" role="alert" class="load-error">{{ error }}</p>
    <p v-if="section !== 'mood' && loading" class="load-note">正在读取当天记录……</p>
    <section v-else-if="section !== 'mood'" class="detail-panel" :class="{ 'analysis-panel': section === 'analysis' }">
      <template v-if="section === 'sleep' && sleepRows.length">
        <h2>今天的睡眠记录</h2>
        <article v-for="row in sleepRows" :key="row.id" class="sleep-entry">
          <dl><div><dt>入睡</dt><dd>{{ row.sleep_at?.replace('T', ' ') || '未填写' }}</dd></div><div><dt>醒来</dt><dd>{{ row.wake_at?.replace('T', ' ') || '未填写' }}</dd></div><div><dt>醒后感受</dt><dd>{{ row.feeling || '未填写' }}</dd></div></dl>
        </article>
      </template>
      <template v-else>
        <div v-if="section === 'nutrition'" class="nutrition-empty-layout">
          <svg class="nutrition-place-setting" viewBox="0 0 150 110" fill="none" aria-hidden="true">
            <circle cx="51" cy="56" r="31" /><circle cx="51" cy="56" r="21" />
            <path d="M113 24v60M105 24v20c0 7 4 11 8 11s8-4 8-11V24M105 84h16" />
            <path d="M22 23v17M29 23v17M36 23v17M22 31h14M29 40v44" />
          </svg>
          <div><h2>{{ page.empty }}</h2><p>{{ page.detail }}</p></div>
        </div>
        <template v-else><h2>{{ page.empty }}</h2><p>{{ page.detail }}</p></template>
      </template>
      <div v-if="section === 'analysis' && records" class="analysis-summary-metrics"><div class="coverage"><span>日间笔记 <b>{{ records.notes?.length || 0 }}</b></span><span>睡眠记录 <b>{{ sleepRows.length }}</b></span><span>梦境片段 <b>{{ records.fragments?.length || 0 }}</b></span></div><article class="analysis-trend-note"><small>○ 记录趋势</small><strong>缓慢积累</strong><span>◇ 持续记录</span></article><figure class="analysis-summary-ring" :class="{ 'has-records': analysisCoverage.total > 0 }"><svg viewBox="0 0 120 120" fill="none" role="img" :aria-label="`综合记录完整度 ${analysisCoverage.completeness}%`"><circle class="analysis-score-track outer" cx="60" cy="60" r="46"/><circle class="analysis-score-progress outer" cx="60" cy="60" r="46" :style="{ strokeDashoffset: 289 - 289 * analysisCoverage.completeness / 100 }"/><circle class="analysis-score-track middle" cx="60" cy="60" r="37"/><circle class="analysis-score-track inner" cx="60" cy="60" r="28"/><text class="analysis-score-value" x="60" y="58" text-anchor="middle">{{ analysisCoverage.completeness }}</text><text class="analysis-score-unit" x="60" y="70" text-anchor="middle">%</text></svg><figcaption><strong>综合记录</strong><span>完整度</span></figcaption></figure></div>
      <template v-if="false"><section class="analysis-overview-stack" aria-label="七日全记录预览">
        <div class="analysis-divider" aria-hidden="true"></div>
        <section class="analysis-week-preview" aria-labelledby="analysis-week-title">
          <div class="analysis-module-heading"><h2 id="analysis-week-title">七日综合总览 · 近7天</h2><span>{{ analysisWeekCount ? `已有 ${analysisWeekCount} 天综合记录` : '暂无综合记录印记' }}</span></div>
          <div class="analysis-week-grid" role="list" aria-label="近七天全记录预览">
            <div v-for="day in analysisWeek" :key="day.label" class="analysis-day" :class="{ recorded: day.markers.length, today: day.today }" role="listitem">
              <span>{{ day.label }}</span><i v-if="!day.markers.length" class="analysis-empty-dot" aria-hidden="true"></i><em v-for="marker in day.markers" :key="marker" :class="marker" aria-hidden="true"></em>
            </div>
          </div>
        </section>
        <div class="analysis-divider" aria-hidden="true"></div>
        <section class="analysis-four-overview" aria-labelledby="analysis-four-title"><h2 id="analysis-four-title">四大维度概览</h2><div class="analysis-stat-grid"><article v-for="item in ['睡眠记录', '饮食记录', '活动锻炼', '情绪状态']" :key="item" class="analysis-stat"><div class="analysis-ring" aria-hidden="true"><span>--</span></div><p>{{ item }}</p></article></div></section>
        <div class="analysis-divider" aria-hidden="true"></div>
        <section class="analysis-feelings" aria-labelledby="analysis-feelings-title"><h2 id="analysis-feelings-title">记录里反复出现的感受</h2><div class="analysis-feeling-placeholders" aria-label="尚未形成感受标签"><span></span><span></span><span></span><span></span></div></section>
        <div class="analysis-divider before-checkins" aria-hidden="true"></div>
      </section>
      <section class="checkin-card" aria-labelledby="checkin-title">
        <div class="checkin-heading">
          <div><p class="checkin-eyebrow">SMALL THINGS, GENTLY</p><h2 id="checkin-title">日常打卡提醒</h2><p>不追求全勤，想起来时照顾一下自己就很好。</p></div>
          <div class="checkin-progress" :aria-label="`今天完成 ${completedCheckins} 项`"><strong>{{ completedCheckins }}</strong><span>/ {{ checkinItems.length }}<small>今日完成</small></span></div>
        </div>
        <div class="checkin-list">
          <article v-for="item in checkinItems" :key="item.id" class="checkin-row" :class="[{ done: todayCheckins[item.id] }, `checkin-${item.tint}`]">
            <span class="checkin-icon" aria-hidden="true">{{ item.icon }}</span>
            <div class="checkin-info"><h3>{{ item.title }}</h3><p>{{ item.detail }}</p><small>{{ item.time }}</small></div>
            <button type="button" class="reminder-toggle" :class="{ enabled: enabledReminders[item.id] }" :aria-pressed="!!enabledReminders[item.id]" :aria-label="`${enabledReminders[item.id] ? '暂停' : '开启'}${item.title}提醒`" @click="toggleReminder(item.id)"><span></span></button>
            <button type="button" class="checkin-action" :class="{ checked: todayCheckins[item.id] }" @click="toggleCheckin(item.id)">{{ todayCheckins[item.id] ? '已完成 ✓' : '打卡' }}</button>
          </article>
        </div>
        <p class="checkin-footnote">提醒开关会保存在本机。当前版本提供页面内提醒设置与打卡，不发送系统通知。</p>
      </section>
      </template><div v-if="section !== 'analysis'" class="detail-actions"><button @click="router.push('/capture')">写一条记录</button><button v-if="section === 'sleep'" class="secondary" @click="router.push('/dreams')">回看梦境</button></div>
    </section>
    <template v-if="section === 'analysis' && records">
      <section class="analysis-insight-board" aria-label="记录汇总看板">
        <div class="analysis-filter-row"><button type="button" class="selected">本周</button><button type="button">近7天</button><button type="button">近30天</button><span>○ 仅基于已保存记录整理</span></div>
        <div class="analysis-insight-cards"><article v-for="card in analysisCoverage.cards" :key="card.label" :class="`tone-${card.tone}`"><small>{{ card.label }}</small><strong>{{ card.value }}</strong><i></i></article></div>
        <div class="analysis-plot"><div><h2>近七天记录轨迹</h2><p>按日期查看已保存的记录数量，不代表身体指标或健康判断。</p></div><svg viewBox="0 0 360 124" preserveAspectRatio="none" aria-label="近七天记录数量曲线"><path d="M18 108H342M18 76H342M18 44H342M18 12H342"/><polyline :points="analysisPlot"/><circle v-for="(point, index) in analysisPlot.split(' ')" :key="point" :cx="point.split(',')[0]" :cy="point.split(',')[1]" r="2.5"/></svg></div>
      </section>
      <section class="analysis-overview-stack" aria-label="七日全记录预览">
        <div class="analysis-divider" aria-hidden="true"></div>
        <section class="analysis-week-preview" aria-labelledby="analysis-week-title"><div class="analysis-module-heading"><h2 id="analysis-week-title">七日综合总览 · 近7天</h2><span>{{ analysisWeekCount ? `已有 ${analysisWeekCount} 天综合记录` : '暂无综合记录印记' }}</span></div><div class="analysis-week-grid" role="list" aria-label="近七天全记录预览"><div v-for="day in analysisWeek" :key="day.label" class="analysis-day" :class="{ recorded: day.markers.length, today: day.today }" role="listitem"><span>{{ day.label }}</span><i v-if="!day.markers.length" class="analysis-empty-dot" aria-hidden="true"></i><em v-for="marker in day.markers" :key="marker" :class="marker" aria-hidden="true"></em></div></div></section>
        <div class="analysis-divider" aria-hidden="true"></div>
        <section class="analysis-four-overview" aria-labelledby="analysis-four-title"><h2 id="analysis-four-title">四大维度概览</h2><div class="analysis-stat-grid"><article v-for="item in ['睡眠记录', '饮食记录', '活动锻炼', '情绪状态']" :key="item" class="analysis-stat"><div class="analysis-ring" aria-hidden="true"><span>--</span></div><p>{{ item }}</p></article></div></section>
        <div class="analysis-divider" aria-hidden="true"></div>
        <section class="analysis-feelings" aria-labelledby="analysis-feelings-title"><h2 id="analysis-feelings-title">记录里反复出现的感受</h2><div class="analysis-feeling-placeholders" aria-label="尚未形成感受标签"><span></span><span></span><span></span><span></span></div></section>
      </section>
      <div class="analysis-divider before-checkins" aria-hidden="true"></div>
      <section class="checkin-card" aria-labelledby="checkin-title"><div class="checkin-heading"><div><p class="checkin-eyebrow">SMALL THINGS, GENTLY</p><h2 id="checkin-title">日常打卡提醒</h2><p>不追求全勤，想起来时照顾一下自己就很好。</p></div><div class="checkin-progress" :aria-label="`今天完成 ${completedCheckins} 项`"><strong>{{ completedCheckins }}</strong><span>/ {{ checkinItems.length }}<small>今日完成</small></span></div></div><div class="checkin-list"><article v-for="item in checkinItems" :key="item.id" class="checkin-row" :class="[{ done: todayCheckins[item.id] }, `checkin-${item.tint}`]"><span class="checkin-icon" aria-hidden="true">{{ item.icon }}</span><div class="checkin-info"><h3>{{ item.title }}</h3><p>{{ item.detail }}</p><small>{{ item.time }}</small></div><button type="button" class="reminder-toggle" :class="{ enabled: enabledReminders[item.id] }" :aria-pressed="!!enabledReminders[item.id]" :aria-label="`${enabledReminders[item.id] ? '暂停' : '开启'}${item.title}提醒`" @click="toggleReminder(item.id)"><span></span></button><button type="button" class="checkin-action" :class="{ checked: todayCheckins[item.id] }" @click="toggleCheckin(item.id)">{{ todayCheckins[item.id] ? '已完成 ✓' : '打卡' }}</button></article></div><p class="checkin-footnote">提醒开关会保存在本机。当前版本提供页面内提醒设置与打卡，不发送系统通知。</p></section>
      <div class="detail-actions"><button @click="router.push('/capture')">补充日记</button><button class="secondary" @click="router.push('/ask')">聊聊最近的状态</button></div>
    </template>
    <section v-if="section === 'activity'" class="activity-week-preview" aria-labelledby="activity-week-title">
      <div class="activity-week-heading">
        <h2 id="activity-week-title">本周活动预览 · 近7天</h2>
        <span>{{ activityWeekCount ? `已有 ${activityWeekCount} 天活动印记` : '暂无本周活动印记' }}</span>
      </div>
      <div class="activity-week-grid" role="list" aria-label="近七天活动预览">
        <div v-for="day in activityWeek" :key="day.label" class="activity-day" :class="{ recorded: day.recorded }" role="listitem" :aria-label="`${day.label} ${day.date}${day.recorded ? '，已有活动记录' : '，暂无活动记录'}`">
          <span>{{ day.label }}</span>
          <i aria-hidden="true"></i>
        </div>
      </div>
      <div class="activity-preview-divider" aria-hidden="true"></div>
      <section class="activity-overview" aria-labelledby="activity-overview-title">
        <h2 id="activity-overview-title">本周运动概览</h2>
        <div class="activity-stat-grid">
          <article v-for="item in ['活动总时长', '累计步数', '运动频次']" :key="item" class="activity-stat"><div class="activity-ring" aria-hidden="true"><span>--</span></div><p>{{ item }}</p></article>
        </div>
      </section>
    </section>
    <section v-if="section === 'nutrition'" class="nutrition-summary" aria-label="饮食记录预览">
      <section class="nutrition-week-preview" aria-labelledby="nutrition-week-title">
        <div class="nutrition-module-heading"><h2 id="nutrition-week-title">本周饮食预览 · 近7天</h2><span>暂无本周饮食印记</span></div>
        <div class="nutrition-week-grid" role="list" aria-label="近七天饮食预览">
          <div v-for="day in nutritionWeek" :key="day.label" class="nutrition-day" :class="{ recorded: day.recorded, today: day.today }" role="listitem">
            <span>{{ day.label }}</span><i aria-hidden="true"></i>
          </div>
        </div>
      </section>
      <div class="nutrition-divider" aria-hidden="true"></div>
      <section class="nutrition-overview" aria-labelledby="nutrition-overview-title">
        <h2 id="nutrition-overview-title">今日营养概览</h2>
        <div class="nutrition-stat-grid">
          <article v-for="item in ['饮水', '主食', '果蔬']" :key="item" class="nutrition-stat"><div class="nutrition-ring" aria-hidden="true"><span>--</span></div><p>{{ item }}</p></article>
        </div>
      </section>
      <div class="nutrition-divider" aria-hidden="true"></div>
      <section class="nutrition-directions" aria-labelledby="nutrition-directions-title">
        <h2 id="nutrition-directions-title">可以参考这些方向记录</h2>
        <div class="nutrition-tag-scroller" aria-label="饮食记录标签">
          <button v-for="tag in nutritionTags" :key="tag" type="button" @click="addNutritionTag(tag)">{{ tag }}</button>
        </div>
        <label class="nutrition-draft"><span class="sr-only">饮食记录草稿</span><input v-model="nutritionDraft" placeholder="选择一个方向，补充今天的饮食感受" /></label>
      </section>
    </section>
    <section class="detail-notes" :class="{ 'nutrition-notes': section === 'nutrition' }"><h2>{{ section === 'analysis' ? '数据来源与边界' : '可以从这里开始' }}</h2><div class="prompt-grid"><article v-for="(prompt, index) in page.prompts" :key="prompt"><span>0{{ index + 1 }}</span><p>{{ prompt }}</p></article></div></section>
    <p class="detail-foot">{{ section === 'analysis' ? '这里只做记录整理与健康陪伴，不替代专业评估。' : '不必一次写全，按自己的节奏补充。' }}</p>
  </div>
</template>

<style scoped>
.health-detail { --mood-surface: #faf8fc; --mood-surface-muted: #f5f1f8; --mood-border: #e7dfed; --mood-border-strong: #d8cce3; --mood-ink: #62566f; --mood-muted: #8b7d97; --mood-accent: #8f7ba6; color: var(--mood-ink); min-height: 70dvh; }
.mood-simulated-time { margin: -10px 0 28px; color: var(--mood-muted); font-size: 14px; }
.mood-dashboard { display: grid; grid-template-columns: minmax(0, 1.12fr) minmax(340px, .95fr); align-items: start; gap: 24px; color: var(--mood-ink); }
.mood-left-column, .mood-right-column { display: grid; gap: 18px; min-width: 0; }
.mood-phase-panel, .mood-card { border: 1px solid var(--mood-border); border-radius: 18px; background: var(--mood-surface); box-shadow: 0 8px 30px rgba(84, 70, 97, .04); }
.mood-phase-panel { padding: 26px 28px; background: var(--mood-surface-muted); }
.mood-phase-heading, .mood-metric-head, .mood-prompt-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.mood-phase-heading h2, .mood-card h2 { margin: 0; color: #544661; font: 600 22px/1.35 var(--display); }
.mood-phase-heading h2 { font-size: 27px; }
.mood-phase-heading > span { color: var(--mood-muted); font-size: 14px; white-space: nowrap; }
.mood-phase-panel > p { margin: 22px 0 24px; color: #746680; font-size: 15px; line-height: 1.8; }
.mood-phase-panel > small { color: var(--mood-muted); font-size: 13px; }
.mood-card { padding: 26px 28px; }
.mood-metrics-card h2 { margin-bottom: 18px; }
.mood-metric { padding: 13px 0 14px; border-bottom: 1px solid var(--mood-border); }
.mood-metric:last-child { padding-bottom: 0; border-bottom: 0; }
.mood-metric-head { margin-bottom: 10px; color: var(--mood-ink); font-size: 14px; }
.mood-metric-head strong { font-size: 14px; font-weight: 600; white-space: nowrap; }
.mood-meter { height: 6px; overflow: hidden; border-radius: 999px; background: #ece7f0; }
.mood-meter > span { display: block; height: 100%; border-radius: inherit; background: #b8a7cc; transition: width 240ms ease-out; }
.mood-metric > p { margin: 8px 0 0; color: #95899e; font-size: 12px; line-height: 1.6; }
.mood-controls-card h2 { margin-bottom: 20px; }
.mood-button-row { display: flex; flex-wrap: wrap; gap: 9px; }
.mood-outline, .mood-solid { min-height: 42px; padding: 8px 14px; border: 1px solid var(--mood-border-strong); border-radius: 10px; color: #756385; background: var(--mood-surface-muted); font-size: 14px; transition: background-color 160ms ease, border-color 160ms ease, transform 160ms ease; }
.mood-outline:hover { border-color: #c9b8dc; background: #f0ebf5; }
.mood-outline:active, .mood-solid:active { transform: scale(.97); }
.mood-field { display: grid; gap: 9px; margin-top: 22px; color: var(--mood-muted); font-size: 13px; }
.mood-field select { width: 100%; min-height: 48px; padding: 0 14px; border: 1px solid var(--mood-border); border-radius: 10px; color: var(--mood-ink); background: var(--mood-surface-muted); font: inherit; font-size: 15px; }
.mood-field select:focus-visible { outline: 2px solid #c9b8dc; outline-offset: 2px; }
.mood-action { margin-top: 11px; }
.mood-solid { border-color: var(--mood-accent); color: #fff; background: var(--mood-accent); }
.mood-solid:hover { background: #806b98; }
.mood-event-field { margin-top: 22px; }
.mood-auto-save { margin: 52px 0 0; color: #95899e; font-size: 12px; line-height: 1.7; }
.mood-prompt-heading { margin-bottom: 14px; }
.mood-prompt-heading h2 { font-size: 19px; }
.mood-prompt-heading .mood-outline { min-height: 38px; }
.mood-prompt-card > p { margin: 0 0 12px; color: #95899e; font-size: 12px; line-height: 1.6; }
.mood-prompt-card pre { max-height: 230px; margin: 0; padding: 16px; overflow: auto; border-radius: 10px; color: #6e6179; background: var(--mood-surface-muted); font: 12px/1.8 var(--body); white-space: pre-wrap; }
.mood-toast-message { position: fixed; z-index: 20; right: 26px; bottom: 28px; margin: 0; padding: 12px 16px; border: 1px solid var(--mood-border); border-radius: 12px; color: var(--mood-ink); background: var(--mood-surface); box-shadow: 0 8px 28px rgba(84, 70, 97, .12); font-size: 13px; }
.mood-toast-enter-active, .mood-toast-leave-active { transition: opacity 180ms ease, transform 180ms ease; }
.mood-toast-enter-from, .mood-toast-leave-to { opacity: 0; transform: translateY(6px); }
@media(max-width: 850px) { .mood-dashboard { grid-template-columns: minmax(0, 1fr); } .mood-right-column { grid-template-columns: minmax(0, 1fr); } .mood-auto-save { margin-top: 30px; } }
.detail-heading { margin-bottom: 30px; padding: 24px 0; }
.detail-heading > p { margin: 0 0 8px; color: #9b8ba7; font-size: 12px; }
.detail-heading h1 { margin: 0 0 12px; color: #544661; font: 600 28px/1.4 var(--display); }
.detail-heading > span { color: #8b7d97; font-size: 15px; }
.detail-panel { padding: clamp(22px, 4vw, 44px); border: 1px solid #e7ddec; border-radius: 12px; background: linear-gradient(115deg, #f1eaf8, #fbf7fc); }
.detail-panel h2, .detail-notes h2 { margin: 0 0 12px; font: 500 20px/1.5 var(--display); color: #655073; }
.detail-panel > p { max-width: 650px; margin: 0; color: #8b7c96; font-size: 15px; }
.analysis-panel { position: relative; display: flex; flex-direction: column; min-height: 440px; overflow: hidden; padding: clamp(46px, 4vw, 68px); background: radial-gradient(circle at 82% 47%, rgba(180,193,239,.63) 0 14%, rgba(210,216,245,.48) 15%, rgba(234,231,249,.22) 31%, transparent 51%), linear-gradient(112deg, #f0e8f8 0%, #f8f3fb 53%, #edf0fc 100%); }.analysis-panel::before { content: ''; position: absolute; inset: 0 0 0 auto; width: 48%; background: linear-gradient(135deg, transparent 0 30%, rgba(255,255,255,.24) 31% 32%, transparent 33%); pointer-events: none; }.analysis-panel > h2, .analysis-panel > p, .analysis-panel .analysis-summary-metrics { position: relative; z-index: 1; }.analysis-panel > h2 { margin-bottom: 14px; font-size: 28px; }.analysis-panel > p { max-width: 780px; font-size: 17px; line-height: 1.75; }.analysis-panel .analysis-summary-metrics { margin-top: auto; padding-top: 84px; }.analysis-panel .coverage { gap: 34px; color: #776987; font-size: 16px; }.analysis-panel .coverage b { margin-left: 10px; font-size: 18px; }.analysis-panel .analysis-summary-ring { position: absolute; right: 7%; bottom: 24px; z-index: 2; margin: 0; transform: scale(1.95); transform-origin: center bottom; }.analysis-panel .analysis-summary-ring figcaption { margin-top: 16px; }.analysis-panel .analysis-summary-ring::before, .analysis-panel .analysis-summary-ring::after { display: none; }.analysis-trend-note { display: grid; gap: 8px; align-content: center; width: 122px; min-height: 86px; margin-left: auto; margin-right: 29%; padding: 13px 15px; border: 1px solid rgba(223,217,238,.88); border-radius: 9px; color: #9488a3; background: rgba(255,255,255,.64); box-shadow: 0 12px 26px rgba(97,85,133,.1); }.analysis-trend-note small, .analysis-trend-note span { font-size: 10px; }.analysis-trend-note strong { color: #675978; font: 500 16px/1.2 var(--display); }.analysis-summary-ring svg { filter: drop-shadow(0 8px 16px rgba(118,106,170,.12)); }.analysis-summary-ring text { font-size: 8px; }
.nutrition-atmosphere { position: fixed; z-index: -1; inset: 0; overflow: hidden; pointer-events: none; }
.nutrition-speck { position: absolute; display: block; color: #c5b8d2; opacity: .16; animation: nutrition-speck-drift 7s cubic-bezier(.77, 0, .175, 1) infinite; }
.nutrition-speck.dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }.nutrition-speck.moon { width: 10px; height: 10px; border: 1px solid currentColor; border-left-color: transparent; border-radius: 50%; }
.nutrition-speck:nth-child(1) { top: 22%; left: 9%; }.nutrition-speck:nth-child(2) { top: 38%; right: 13%; animation-delay: -2s; }.nutrition-speck:nth-child(3) { top: 68%; left: 15%; animation-delay: -4s; }.nutrition-speck:nth-child(4) { top: 77%; right: 7%; animation-delay: -5s; }.nutrition-speck:nth-child(5) { top: 14%; right: 31%; animation-delay: -6s; }
@keyframes nutrition-speck-drift { 0%, 100% { opacity: .1; transform: translateY(0); } 50% { opacity: .24; transform: translateY(-9px); } }
.nutrition-empty-layout { display: flex; align-items: center; gap: clamp(20px, 4vw, 48px); }.nutrition-empty-layout > div { min-width: 0; }.nutrition-empty-layout h2 { margin-bottom: 10px; }.nutrition-empty-layout p { max-width: 650px; margin: 0; color: #8b7c96; font-size: 15px; line-height: 1.75; }
.nutrition-place-setting { flex: 0 0 150px; width: 150px; stroke: #a99ab7; stroke-width: 2px; stroke-dasharray: 4 3; stroke-linecap: round; stroke-linejoin: round; opacity: .6; animation: nutrition-place-breathe 7s cubic-bezier(.77, 0, .175, 1) infinite; }
@keyframes nutrition-place-breathe { 0%, 100% { opacity: .42; } 50% { opacity: .66; } }
.nutrition-summary { width: 100%; max-width: none; margin-top: 28px; padding: 0; }.nutrition-week-preview, .nutrition-overview, .nutrition-directions { padding: 20px 24px; border-radius: 8px; background: #f9f7fb; box-shadow: 0 8px 22px rgba(84, 70, 97, .045); }
.nutrition-module-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 16px; }.nutrition-module-heading h2, .nutrition-overview > h2, .nutrition-directions > h2 { margin: 0; color: #746581; font: 500 17px/1.45 var(--display); }.nutrition-module-heading span { color: #a59aae; font-size: 12px; white-space: nowrap; }
.nutrition-week-grid { display: grid; grid-template-columns: repeat(7, 58px); gap: 14px; }.nutrition-day { position: relative; display: grid; place-items: center; gap: 4px; width: 58px; height: 58px; border: 1px dashed #d8d3de; border-radius: 8px; color: #9e94a9; background: rgba(255, 255, 255, .34); font-size: 12px; }.nutrition-day i { display: block; width: 5px; height: 5px; border-radius: 50%; background: #c6b8d7; opacity: .34; animation: nutrition-dot-breathe 7s cubic-bezier(.77, 0, .175, 1) infinite; }.nutrition-day:nth-child(2) i { animation-delay: -1s; }.nutrition-day:nth-child(3) i { animation-delay: -2s; }.nutrition-day:nth-child(4) i { animation-delay: -3s; }.nutrition-day:nth-child(5) i { animation-delay: -4s; }.nutrition-day:nth-child(6) i { animation-delay: -5s; }.nutrition-day:nth-child(7) i { animation-delay: -6s; }
.nutrition-day.recorded { border-style: solid; border-color: #c9b8dc; color: #806f8e; background: rgba(242, 237, 248, .7); }.nutrition-day.recorded i { width: 7px; height: 7px; border-radius: 2px; opacity: 1; animation: none; }.nutrition-day.today::after { content: ''; position: absolute; right: 12px; bottom: -5px; left: 12px; height: 1px; background: #b39acb; }
@keyframes nutrition-dot-breathe { 0%, 100% { opacity: .22; transform: scale(.86); } 50% { opacity: .62; transform: scale(1); } }
.nutrition-divider { height: 1px; margin: 22px 0; background: #e9e6ef; }.nutrition-overview > h2, .nutrition-directions > h2 { margin-bottom: 16px; }.nutrition-stat-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }.nutrition-stat { display: grid; justify-items: center; gap: 9px; padding: 16px 10px; border-radius: 7px; background: rgba(255,255,255,.43); }.nutrition-stat p { margin: 0; color: #8f849a; font-size: 14px; }.nutrition-ring { display: grid; place-items: center; width: 52px; height: 52px; border: 1px dashed #cfc8d8; border-radius: 50%; color: #a79bac; font-size: 14px; }.nutrition-ring span { transform: translateY(-.5px); }
.nutrition-tag-scroller { display: flex; gap: 10px; padding-bottom: 3px; overflow-x: auto; scrollbar-width: none; }.nutrition-tag-scroller::-webkit-scrollbar { display: none; }.nutrition-tag-scroller button { flex: 0 0 auto; min-height: 34px; padding: 7px 13px; border: 1px dashed #d8d3de; border-radius: 999px; color: #94899f; background: rgba(255,255,255,.42); font: inherit; font-size: 13px; transition: border-color 180ms ease, background-color 180ms ease, color 180ms ease; }.nutrition-tag-scroller button:hover { border-color: #c9b8dc; color: #7f718e; background: #f0eaf7; }.nutrition-draft { display: block; margin-top: 16px; }.nutrition-draft input { width: 100%; height: 48px; padding: 0 14px; border: 1px solid #e5ddec; border-radius: 7px; color: #746581; background: rgba(255,255,255,.66); font: inherit; font-size: 14px; }.nutrition-draft input:focus { outline: 2px solid rgba(201,184,220,.42); border-color: #c9b8dc; }.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
@media (hover: hover) and (pointer: fine) { .nutrition-day.recorded:hover { border-color: #b39acb; background: #f0e9f7; }.nutrition-day.recorded:hover i { transform: scale(1.2); } .nutrition-notes .prompt-grid article { transition: transform 180ms cubic-bezier(.23, 1, .32, 1), box-shadow 180ms cubic-bezier(.23, 1, .32, 1); }.nutrition-notes .prompt-grid article:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(143,123,166,.11); } }
.detail-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 28px; }
.detail-actions button { min-height: 44px; border-radius: 7px; background: #937ba7; color: white; font-size: 14px; }
.detail-actions .secondary { border-color: #dfd2e9; color: #897098; background: #fffafc; }
.activity-week-preview { width: 100%; margin: 24px 0 0; padding: 20px 24px; border-radius: 8px; background: #f9f7fb; box-shadow: 0 8px 22px rgba(84, 70, 97, .045); }
.activity-week-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.activity-week-heading h2, .activity-overview > h2 { margin: 0; color: #746581; font: 500 17px/1.45 var(--display); }
.activity-week-heading span { color: #a59aae; font-size: 12px; white-space: nowrap; }
.activity-week-grid { display: grid; grid-template-columns: repeat(7, 58px); gap: 14px; }
.activity-day { display: grid; place-items: center; gap: 4px; width: 58px; height: 58px; border: 1px dashed #d8d3de; border-radius: 8px; color: #9e94a9; background: rgba(255, 255, 255, .34); font-size: 12px; }
.activity-day i { display: block; width: 4px; height: 4px; border-radius: 50%; background: #c6b8d7; opacity: .34; animation: activity-dot-breathe 7s cubic-bezier(.77, 0, .175, 1) infinite; }
.activity-day:nth-child(2) i { animation-delay: -1s; }.activity-day:nth-child(3) i { animation-delay: -2s; }.activity-day:nth-child(4) i { animation-delay: -3s; }.activity-day:nth-child(5) i { animation-delay: -4s; }.activity-day:nth-child(6) i { animation-delay: -5s; }.activity-day:nth-child(7) i { animation-delay: -6s; }
.activity-day.recorded { border-style: solid; border-color: #c9b8dc; color: #806f8e; background: rgba(242, 237, 248, .7); transition: background-color 180ms ease, border-color 180ms ease; }.activity-day.recorded i { width: 7px; height: 7px; opacity: 1; animation: none; }
@media (hover: hover) and (pointer: fine) { .activity-day.recorded:hover { border-color: #b39acb; background: #f0e9f7; }.activity-day.recorded:hover i { transform: scale(1.24); } }
@keyframes activity-dot-breathe { 0%, 100% { opacity: .22; transform: scale(.86); } 50% { opacity: .62; transform: scale(1); } }
.activity-preview-divider { height: 1px; margin: 22px 0; background: #e9e6ef; }.activity-overview > h2 { margin-bottom: 16px; }.activity-stat-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }.activity-stat { display: grid; justify-items: center; gap: 9px; padding: 16px 10px; border-radius: 8px; background: rgba(255,255,255,.46); box-shadow: 0 5px 16px rgba(84, 70, 97, .025); }.activity-stat p { margin: 0; color: #8f849a; font-size: 14px; }.activity-ring { display: grid; place-items: center; width: 52px; height: 52px; border: 1px dashed #cfc8d8; border-radius: 50%; color: #a79bac; font-size: 14px; animation: activity-ring-breathe 7s cubic-bezier(.77, 0, .175, 1) infinite; }.activity-ring span { transform: translateY(-.5px); }.activity-stat:nth-child(2) .activity-ring { animation-delay: -2.3s; }.activity-stat:nth-child(3) .activity-ring { animation-delay: -4.6s; }@keyframes activity-ring-breathe { 0%, 100% { border-color: #d8d3de; opacity: .54; } 50% { border-color: #c2b4d1; opacity: .88; } }
.detail-notes { margin-top: 36px; }
.prompt-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.prompt-grid article { padding: 22px; background: #fff; border: 1px solid #e9e0ef; border-radius: 8px; }
.prompt-grid article > span { color: #b49ac5; font-size: 12px; }
.prompt-grid p { margin: 12px 0 0; font-size: 15px; color: #80708d; }
.detail-foot { margin-top: 26px; color: #a094aa; font-size: 12px; }
.coverage { display: flex; gap: 26px; flex-wrap: wrap; margin-top: 24px; font-size: 14px; }
.coverage b { margin-left: 8px; color: #80618f; }
.analysis-atmosphere { position: fixed; z-index: -1; inset: 0; overflow: hidden; pointer-events: none; }.analysis-atmosphere i, .analysis-atmosphere b { position: absolute; display: block; opacity: .14; animation: analysis-atmosphere-drift 7s cubic-bezier(.77, 0, .175, 1) infinite; }.analysis-atmosphere i { width: 5px; height: 5px; border-radius: 50%; background: #bcaed0; }.analysis-atmosphere b { width: 12px; height: 12px; border: 1px solid #bcaed0; border-left-color: transparent; border-radius: 50%; }.analysis-atmosphere i:nth-child(1) { top: 21%; left: 10%; }.analysis-atmosphere i:nth-child(2) { top: 57%; left: 6%; animation-delay: -3s; }.analysis-atmosphere i:nth-child(3) { top: 25%; right: 9%; animation-delay: -5s; }.analysis-atmosphere i:nth-child(4) { right: 13%; bottom: 16%; animation-delay: -2s; }.analysis-atmosphere b:nth-child(5) { top: 42%; right: 19%; animation-delay: -4s; }.analysis-atmosphere b:nth-child(6) { bottom: 25%; left: 17%; animation-delay: -6s; }@keyframes analysis-atmosphere-drift { 0%, 100% { opacity: .07; transform: translate3d(-7px, 12px, 0) rotate(-4deg); } 50% { opacity: .22; transform: translate3d(10px, -20px, 0) rotate(5deg); } }
.analysis-summary-metrics { display: flex; align-items: center; justify-content: space-between; gap: 30px; margin-top: 24px; }.analysis-summary-metrics .coverage { flex: 1; margin-top: 0; }.analysis-summary-ring { display: grid; justify-items: center; flex: 0 0 120px; gap: 7px; margin: 0; color: #9d93a8; font-size: 10px; line-height: 1.2; text-align: center; }.analysis-summary-ring svg { width: 120px; height: 120px; overflow: visible; filter: drop-shadow(0 4px 9px rgba(133,113,154,.08)); }.analysis-score-track, .analysis-score-progress { transform-box: fill-box; transform-origin: center; transform: rotate(-90deg); fill: none; stroke-linecap: round; }.analysis-score-track { stroke: #d9d4df; stroke-width: 2; }.analysis-score-track.outer { stroke-dasharray: 4 3; opacity: .72; }.analysis-score-track.middle { stroke: #e3dce9; stroke-width: 1.5; opacity: .82; }.analysis-score-track.inner { stroke: #e3dce9; stroke-width: 1.5; opacity: .62; }.analysis-score-progress { stroke: #b8a4ca; stroke-width: 2.5; stroke-dasharray: 289; stroke-dashoffset: 289; transition: stroke-dashoffset 500ms cubic-bezier(.23, 1, .32, 1); }.analysis-score-value { fill: #756584; font: 500 23px/1 var(--body); }.analysis-score-unit { fill: #9d91a8; font: 400 9px/1 var(--body); }.analysis-summary-ring figcaption { display: grid; gap: 2px; white-space: nowrap; }.analysis-summary-ring figcaption strong { color: #71627e; font-size: 11px; font-weight: 500; }.analysis-summary-ring figcaption span { color: #a197aa; font-size: 9px; }
.analysis-overview-stack { width: 100%; }.analysis-divider { height: 1px; margin: 22px 0; background: #e9e6ef; }.analysis-week-preview, .analysis-four-overview, .analysis-feelings { padding: 20px 24px; border-radius: 8px; background: #f9f7fb; box-shadow: 0 8px 22px rgba(84, 70, 97, .045); }.analysis-module-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 16px; }.analysis-module-heading h2, .analysis-four-overview > h2, .analysis-feelings > h2 { margin: 0; color: #746581; font: 500 17px/1.45 var(--display); }.analysis-module-heading span { color: #a59aae; font-size: 12px; white-space: nowrap; }.analysis-week-grid { display: grid; grid-template-columns: repeat(7, 46px); gap: 10px; }.analysis-day { position: relative; display: grid; place-items: center; gap: 4px; width: 46px; height: 46px; border: 1px dashed #d8d3de; border-radius: 7px; color: #9e94a9; background: rgba(255,255,255,.34); font-size: 10px; }.analysis-empty-dot { width: 4px; height: 4px; border-radius: 50%; background: #c6b8d7; opacity: .34; animation: analysis-dot-breathe 7s cubic-bezier(.77, 0, .175, 1) infinite; }.analysis-day:nth-child(2) .analysis-empty-dot { animation-delay: -1s; }.analysis-day:nth-child(3) .analysis-empty-dot { animation-delay: -2s; }.analysis-day:nth-child(4) .analysis-empty-dot { animation-delay: -3s; }.analysis-day:nth-child(5) .analysis-empty-dot { animation-delay: -4s; }.analysis-day:nth-child(6) .analysis-empty-dot { animation-delay: -5s; }.analysis-day:nth-child(7) .analysis-empty-dot { animation-delay: -6s; }.analysis-day.recorded { border-style: solid; border-color: #c9b8dc; background: rgba(242,237,248,.7); }.analysis-day.today::after { content: ''; position: absolute; right: 10px; bottom: -5px; left: 10px; height: 1px; background: #b39acb; }.analysis-day em { display: block; width: 6px; height: 6px; background: #b9a1cf; }.analysis-day em.sleep { width: 8px; height: 8px; border: 1px solid #9282aa; border-top-color: transparent; border-right-color: transparent; border-radius: 50%; background: transparent; transform: rotate(-30deg); }.analysis-day em.food { border-radius: 1px; }.analysis-day em.exercise { border-radius: 50%; }.analysis-day em.mood { width: 8px; height: 8px; border-radius: 2px 2px 4px 4px; background: #d2a9bd; transform: rotate(45deg); }.analysis-day em.mood::before, .analysis-day em.mood::after { content: ''; position: absolute; width: 8px; height: 8px; border-radius: 50%; background: inherit; }.analysis-day em.mood::before { top: -4px; }.analysis-day em.mood::after { left: -4px; }@keyframes analysis-dot-breathe { 0%, 100% { opacity: .22; transform: scale(.86); } 50% { opacity: .62; transform: scale(1); } }
.analysis-four-overview > h2, .analysis-feelings > h2 { margin-bottom: 16px; }.analysis-stat-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; }.analysis-stat { display: grid; justify-items: center; gap: 9px; padding: 14px 8px; border-radius: 7px; background: rgba(255,255,255,.43); }.analysis-stat p { margin: 0; color: #8f849a; font-size: 12px; }.analysis-ring { display: grid; place-items: center; width: 46px; height: 46px; border: 1px dashed #cfc8d8; border-radius: 50%; color: #a79bac; font-size: 12px; animation: analysis-ring-breathe 7s cubic-bezier(.77, 0, .175, 1) infinite; }.analysis-ring span { transform: translateY(-.5px); }.analysis-stat:nth-child(2) .analysis-ring { animation-delay: -1.75s; }.analysis-stat:nth-child(3) .analysis-ring { animation-delay: -3.5s; }.analysis-stat:nth-child(4) .analysis-ring { animation-delay: -5.25s; }.analysis-feeling-placeholders { display: flex; flex-wrap: wrap; gap: 9px; }.analysis-feeling-placeholders span { width: 78px; height: 30px; border: 1px dashed #d8d3de; border-radius: 999px; background: rgba(255,255,255,.24); }
.analysis-insight-board { display: grid; gap: 13px; margin-top: 26px; padding: 18px; border: 1px solid rgba(229,222,240,.72); border-radius: 10px; background: rgba(250,249,253,.68); box-shadow: 0 8px 22px rgba(84,70,97,.045); }.analysis-filter-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }.analysis-filter-row button { min-height: 25px; padding: 4px 10px; border: 1px solid #e4deed; border-radius: 999px; color: #91869e; background: rgba(255,255,255,.7); font: inherit; font-size: 10px; }.analysis-filter-row button.selected { border-color: #a995c2; color: #fff; background: #a995c2; }.analysis-filter-row span { margin-left: 6px; color: #aaa0b4; font-size: 10px; }.analysis-insight-cards { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 10px; }.analysis-insight-cards article { position: relative; display: grid; gap: 5px; min-height: 69px; padding: 12px; overflow: hidden; border: 1px solid rgba(230,224,240,.8); border-radius: 8px; background: rgba(255,255,255,.72); }.analysis-insight-cards small { color: #978ca4; font-size: 10px; }.analysis-insight-cards strong { color: #655a75; font: 500 17px/1.2 var(--display); }.analysis-insight-cards i { position: absolute; right: 12px; bottom: 0; left: 12px; height: 2px; border-radius: 99px; background: #b9a3d2; }.analysis-insight-cards .tone-blue i { background: #9bb9df; }.analysis-insight-cards .tone-mint i { background: #9ecfc4; }.analysis-insight-cards .tone-purple i { background: #b79ad4; }.analysis-plot { display: grid; grid-template-columns: 180px minmax(0,1fr); align-items: center; gap: 18px; min-height: 112px; padding: 13px 15px; border-radius: 8px; background: linear-gradient(110deg, rgba(251,250,254,.88), rgba(239,235,250,.62)); }.analysis-plot h2 { margin: 0 0 5px; color: #6c5f7a; font: 500 14px/1.4 var(--display); }.analysis-plot p { margin: 0; color: #9b90a7; font-size: 10px; line-height: 1.6; }.analysis-plot svg { width: 100%; height: 104px; overflow: visible; }.analysis-plot path { stroke: #ded8e9; stroke-width: .7; }.analysis-plot polyline { fill: none; stroke: #8b77c5; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }.analysis-plot circle { fill: #a48ed1; stroke: #fff; stroke-width: 1.2; }
.checkin-card { margin-top: 24px; padding: clamp(22px, 3vw, 32px); border: 1px solid #e7ddec; border-radius: 18px; background: rgba(255,255,255,.86); box-shadow: 0 8px 30px rgba(84,70,97,.04); }
.checkin-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 18px; }
.checkin-eyebrow { margin: 0 0 5px; color: #a08eaf; font-size: 10px; letter-spacing: .16em; }
.checkin-heading h2 { margin: 0; color: #544661; font: 500 22px/1.4 var(--display); }
.checkin-heading > div:first-child > p:last-child { margin: 6px 0 0; color: #8b7d97; font-size: 13px; }
.checkin-progress { display: flex; align-items: baseline; gap: 4px; flex-shrink: 0; color: #95899e; }
.checkin-progress > strong { color: #806b98; font: 500 30px/1 var(--display); }.checkin-progress span { font-size: 12px; }.checkin-progress small { display: block; }
.checkin-list { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 10px; }
.checkin-row { display: grid; grid-template-columns: 40px minmax(0,1fr) auto; align-items: center; gap: 12px; min-width: 0; padding: 13px; border: 1px solid #eee8f2; border-radius: 14px; background: #fdfcff; transition: background-color 180ms ease, border-color 180ms ease; }
.checkin-row.done { border-color: #d9e7e7; background: #f7fbfb; }
.checkin-icon { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; color: #88769b; background: #f1ecf7; font-size: 17px; }
.checkin-water .checkin-icon { color: #7099b5; background: #eaf3f8; }.checkin-stretch .checkin-icon { color: #8e80aa; background: #f0edf7; }.checkin-exercise .checkin-icon { color: #8e84ae; background: #f2eff9; }.checkin-daylight .checkin-icon { color: #b29478; background: #f8f1e9; }.checkin-winddown .checkin-icon { color: #837b9f; background: #efeff8; }
.checkin-info { min-width: 0; }.checkin-info h3 { margin: 0; color: #62566f; font-size: 13px; font-weight: 600; }.checkin-info p { margin: 2px 0; overflow: hidden; color: #8b7d97; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }.checkin-info small { color: #a194ac; font-size: 10px; }
.reminder-toggle { position: relative; grid-column: 3; grid-row: 1; width: 34px; height: 20px; padding: 2px; border: 0; border-radius: 999px; background: #e8e3ed; cursor: pointer; transition: background-color 160ms ease; }.reminder-toggle span { display: block; width: 16px; height: 16px; border-radius: 50%; background: white; box-shadow: 0 1px 3px rgba(50,40,65,.18); transition: transform 160ms ease; }.reminder-toggle.enabled { background: #a997bd; }.reminder-toggle.enabled span { transform: translateX(14px); }
.checkin-action { grid-column: 3; grid-row: 1; align-self: end; padding: 5px 9px; border: 1px solid #e4ddeb; border-radius: 999px; color: #88769b; background: #fff; font: inherit; font-size: 10px; cursor: pointer; transform: translateY(10px); transition: color 160ms ease, background-color 160ms ease, border-color 160ms ease; }.checkin-action.checked { color: #fff; border-color: #91adad; background: #91adad; }
.checkin-footnote { margin: 14px 0 0; color: #a194ac; font-size: 11px; line-height: 1.6; }
.twin-card { display: grid; grid-template-columns: 1.05fr .95fr; align-items: center; gap: 24px; position: relative; overflow: hidden; margin-top: 28px; padding: clamp(24px, 4vw, 44px); border: 1px solid #e5ddef; border-radius: 20px; background: linear-gradient(115deg, #f0e9f7 0%, #f8f4fa 52%, #edf4f8 100%); }
.twin-card::before { content: ''; position: absolute; width: 300px; height: 300px; right: 8%; top: -190px; border-radius: 50%; background: rgba(255,255,255,.6); filter: blur(2px); }
.twin-copy { position: relative; z-index: 1; }
.twin-eyebrow { margin: 0 0 12px; color: #a08eaf; font-size: 10px; letter-spacing: .18em; }
.twin-copy h2 { margin: 0 0 12px; color: #544661; font: 500 clamp(21px, 2.6vw, 28px)/1.4 var(--display); }
.twin-description { max-width: 520px; margin: 0; color: #857990; font-size: 14px; line-height: 1.9; }
.twin-facts { display: flex; flex-wrap: wrap; gap: 10px 18px; margin-top: 22px; color: #786b84; font-size: 13px; }
.twin-facts span { display: inline-flex; align-items: center; gap: 7px; }
.twin-facts b { color: #5f526d; font-weight: 600; }
.twin-dot { width: 7px; height: 7px; border-radius: 50%; }
.twin-dot-blue { background: #9eb9d5; }.twin-dot-lilac { background: #bda9d1; }.twin-dot-pink { background: #d9a9be; }
.twin-button { display: inline-flex; align-items: center; gap: 14px; margin-top: 24px; padding: 10px 15px; border: 1px solid #ded2e8; border-radius: 999px; color: #746385; background: rgba(255,255,255,.74); font: inherit; font-size: 13px; cursor: pointer; transition: transform 180ms ease, background 180ms ease; }
.twin-button:hover { transform: translateY(-2px); background: #fff; }.twin-button span { color: #a38db5; font-size: 16px; }
.twin-figure-wrap { position: relative; display: grid; place-items: end center; min-height: 340px; isolation: isolate; }
.twin-halo { position: absolute; z-index: -1; bottom: 17px; width: 240px; height: 260px; border-radius: 48% 52% 38% 62% / 48% 44% 56% 52%; background: radial-gradient(ellipse at 50% 45%, rgba(255,255,255,.96), rgba(218,225,243,.48) 56%, rgba(208,222,239,0) 76%); filter: blur(2px); animation: twin-breathe 7s ease-in-out infinite; }
.twin-orbit { position: absolute; border: 1px solid rgba(159,151,190,.24); border-radius: 50%; transform: rotate(-25deg); }
.twin-orbit-one { width: 290px; height: 110px; top: 104px; }.twin-orbit-two { width: 240px; height: 86px; top: 129px; transform: rotate(25deg); border-color: rgba(147,181,205,.3); }
.twin-figure { position: relative; z-index: 1; width: min(270px, 82%); height: 360px; filter: drop-shadow(0 16px 18px rgba(93,89,119,.12)); animation: twin-float 6s ease-in-out infinite; }
.twin-portrait { display: block; object-fit: cover; object-position: center 8%; border-radius: 48% 48% 8px 8px; mix-blend-mode: multiply; }
.twin-portrait-female { object-position: center 7%; }
.twin-portrait-male { object-position: center 8%; }
.twin-eye-shine { transform-box: fill-box; transform-origin: center; animation: twin-blink 5.8s ease-in-out infinite; }
.twin-avatar-enter-active, .twin-avatar-leave-active { transition: opacity 220ms cubic-bezier(.2,.7,.2,1), transform 220ms cubic-bezier(.2,.7,.2,1); }
.twin-avatar-enter-from { opacity: 0; transform: translateY(5px); }.twin-avatar-leave-to { opacity: 0; transform: translateY(-3px); }
.twin-style-toggle { position: absolute; z-index: 3; top: 12px; right: 10px; display: flex; gap: 3px; padding: 3px; border: 1px solid rgba(255,255,255,.8); border-radius: 999px; background: rgba(255,255,255,.58); backdrop-filter: blur(10px); }
.twin-style-toggle button { min-width: 31px; height: 28px; padding: 0 8px; border: 0; border-radius: 999px; color: #8a7b96; background: transparent; font: inherit; font-size: 11px; cursor: pointer; }
.twin-style-toggle button.selected { color: #fff; background: #9b86af; box-shadow: 0 3px 9px rgba(107,88,130,.16); }
.twin-float { position: absolute; z-index: 2; display: grid; grid-template-columns: 28px auto; align-items: center; gap: 7px; padding: 8px 11px; border: 1px solid rgba(255,255,255,.8); border-radius: 14px; color: #796c88; background: rgba(255,255,255,.66); box-shadow: 0 8px 24px rgba(94,82,115,.08); backdrop-filter: blur(10px); }
.twin-float span { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; color: #8e7aa6; background: #f2ebf8; font-size: 20px; }.twin-float small { font-size: 11px; white-space: nowrap; }
.twin-float-heart { top: 82px; left: 4%; animation: twin-float 5s ease-in-out infinite; }.twin-float-moon { top: 170px; right: 0; animation: twin-float 6.5s ease-in-out infinite reverse; }
.twin-caption { position: absolute; bottom: 0; color: #a194ac; font-size: 11px; letter-spacing: .04em; }
@keyframes twin-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes twin-breathe { 0%,100% { opacity: .72; transform: scale(.98); } 50% { opacity: 1; transform: scale(1.04); } }
@keyframes twin-blink { 0%, 42%, 46%, 100% { transform: scaleY(1); } 44% { transform: scaleY(.12); } }
@media (prefers-reduced-motion: reduce) { .twin-figure, .twin-halo, .twin-float-heart, .twin-float-moon, .twin-eye-shine { animation: none; }.twin-avatar-enter-active, .twin-avatar-leave-active { transition-duration: 1ms; } }
@media(max-width: 700px) { .twin-card { grid-template-columns: 1fr; gap: 0; }.twin-figure-wrap { min-height: 320px; margin-top: 10px; }.twin-float-heart { left: 5%; }.twin-float-moon { right: 2%; } }
@media(max-width: 620px) { .checkin-list { grid-template-columns: 1fr; }.checkin-row { gap: 9px; padding: 11px; }.checkin-info p { white-space: normal; }.checkin-card { padding: 19px 15px; }.checkin-heading h2 { font-size: 20px; } }
dl { margin: 0; } dl > div { display: flex; gap: 20px; padding: 8px 0; } dt { min-width: 75px; color: #a08bab; } dd { margin: 0; overflow-wrap: anywhere; }
.sleep-entry + .sleep-entry { margin-top: 18px; border-top: 1px solid #e5daed; padding-top: 18px; }
.load-error { color: #a35c7c; overflow-wrap: anywhere; } .load-note { color: #95849f; }
@media (prefers-reduced-motion: reduce) { .activity-day i, .activity-ring, .nutrition-day i, .nutrition-place-setting, .nutrition-speck, .analysis-ring-segment, .analysis-empty-dot, .analysis-ring, .analysis-atmosphere i, .analysis-atmosphere b { animation: none; opacity: .42; transform: none; } }
@media(max-width: 620px) { .prompt-grid { grid-template-columns: 1fr; gap: 10px; } .detail-heading { padding: 10px 0; } .detail-heading h1 { font-size: 25px; } .prompt-grid article { padding: 18px; } .mood-phase-panel, .mood-card { padding: 20px 18px; } .mood-phase-heading h2 { font-size: 23px; } .mood-phase-heading > span { font-size: 12px; } .mood-metric-head, .mood-metric-head strong { font-size: 12px; } .mood-auto-save { margin-top: 28px; } .activity-week-preview { max-width: 100%; padding: 16px; overflow-x: auto; } .activity-week-heading, .activity-week-grid { min-width: 490px; } .activity-stat-grid { min-width: 390px; } .nutrition-empty-layout { align-items: flex-start; flex-direction: column; gap: 13px; } .nutrition-place-setting { width: 112px; flex-basis: 82px; } .nutrition-summary { max-width: 100%; } .nutrition-week-preview { padding: 16px; overflow-x: auto; } .nutrition-module-heading, .nutrition-week-grid { min-width: 490px; } .analysis-panel { min-height: 400px; padding: 32px 24px; }.analysis-panel > h2 { font-size: 23px; }.analysis-panel > p { max-width: 75%; font-size: 14px; }.analysis-panel .analysis-summary-metrics { padding-top: 52px; }.analysis-panel .coverage { gap: 10px; font-size: 11px; }.analysis-panel .coverage b { font-size: 12px; }.analysis-panel .analysis-summary-ring { right: 4%; bottom: 12px; transform: scale(1.15); }.analysis-trend-note { display: none; }.analysis-summary-metrics { gap: 14px; }.analysis-summary-ring { flex-basis: 82px; gap: 4px; font-size: 9px; }.analysis-summary-ring svg { width: 82px; height: 82px; }.analysis-summary-ring text { font-size: 14px; }.analysis-insight-cards { grid-template-columns: repeat(2,minmax(0,1fr)); }.analysis-plot { grid-template-columns: 1fr; }.analysis-filter-row span { width: 100%; margin-left: 0; }.analysis-week-preview, .analysis-four-overview, .analysis-feelings { padding: 16px; }.analysis-week-preview { overflow-x: auto; }.analysis-module-heading, .analysis-week-grid { min-width: 382px; }.analysis-stat-grid { gap: 8px; }.analysis-stat { padding: 11px 4px; }.analysis-stat p { font-size: 10px; }.analysis-ring { width: 38px; height: 38px; font-size: 10px; } }
.analysis-panel .analysis-summary-ring svg { position: relative; z-index: 1; }
.analysis-panel .analysis-summary-ring::before { display: none; }
@keyframes analysis-orb-float { 0%, 100% { transform: translate3d(-18px, 16px, 0) rotate(-3deg); } 50% { transform: translate3d(22px, -28px, 0) rotate(3deg); } }
@keyframes analysis-orb-glow { 0%, 100% { opacity: .38; transform: scale(.94); } 50% { opacity: .76; transform: scale(1.12); } }
.analysis-insight-board{padding:26px;gap:22px}
.analysis-filter-row button{min-height:40px;padding:8px 16px;font-size:14px}
.analysis-filter-row span{font-size:13px}
.analysis-insight-cards{gap:16px}
.analysis-insight-cards article{min-height:118px;padding:20px;gap:12px}
.analysis-insight-cards small{font-size:14px}
.analysis-insight-cards strong{font-size:28px}
.analysis-plot{min-height:230px;padding:24px;grid-template-columns:230px minmax(0,1fr);gap:30px}
.analysis-plot h2{font-size:21px;margin-bottom:12px}
.analysis-plot p{font-size:14px;line-height:1.8}
.analysis-plot svg{height:190px}
.analysis-week-preview,.analysis-four-overview{padding:28px}
.analysis-module-heading{margin-bottom:24px}
.analysis-module-heading h2,.analysis-four-overview>h2{font-size:23px}
.analysis-module-heading span{font-size:14px}
.analysis-week-grid{grid-template-columns:repeat(7,minmax(0,1fr));gap:16px}
.analysis-day{width:100%;height:clamp(76px,7vw,110px);font-size:15px;border-radius:12px}
.analysis-empty-dot{width:6px;height:6px}
.analysis-stat-grid{gap:18px}
.analysis-stat{min-height:190px;padding:26px 12px;gap:18px}
.analysis-stat p{font-size:16px}
.analysis-ring{width:90px;height:90px;font-size:22px}
@media(max-width:800px){.analysis-insight-board{padding:18px}.analysis-insight-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.analysis-plot{grid-template-columns:1fr;gap:16px}.analysis-week-grid{gap:10px;min-width:490px}.analysis-week-preview{overflow-x:auto}.analysis-module-heading{flex-wrap:wrap;min-width:0}.analysis-module-heading span{white-space:normal}.analysis-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.analysis-stat{min-height:165px}.analysis-ring{width:76px;height:76px}.analysis-week-preview,.analysis-four-overview{padding:20px}.analysis-module-heading h2,.analysis-four-overview>h2{font-size:21px}}
.analysis-panel { overflow: visible; border: 0; border-radius: 0; background: linear-gradient(112deg, rgba(240,232,248,.46) 0%, rgba(248,243,251,.2) 53%, rgba(237,240,252,.34) 100%); box-shadow: none; }
.analysis-panel::before { inset: 5% 0; background: linear-gradient(135deg, transparent 0 30%, rgba(255,255,255,.15) 31% 32%, transparent 33%); filter: blur(10px); }
.analysis-panel::after { display: none; }
.analysis-panel .analysis-summary-ring::before, .analysis-panel .analysis-summary-ring::after { display: none; }
.analysis-panel .analysis-summary-ring { isolation: isolate; }
.analysis-panel .analysis-summary-ring::after { display: none; }
.analysis-panel .analysis-summary-ring figcaption { position: relative; z-index: 1; }
@keyframes analysis-orb-core-breathe { 0%, 100% { opacity: .64; transform: scale(.96); } 50% { opacity: .9; transform: scale(1); } }
@media (prefers-reduced-motion: reduce) { .analysis-score-progress { transition: none; } }
</style>
