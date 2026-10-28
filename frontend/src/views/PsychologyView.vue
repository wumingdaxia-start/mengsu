<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { isLoggedIn, safetyRequest } from '../auth'
import { testAccount, testKinds } from '../test-results'
import { today } from '../api'

const testRecords=ref([]), testsLoading=ref(false), testsError=ref('')
let testVersion=0
async function loadTests(){
 const version=++testVersion, account=testAccount();testRecords.value=[];testsError.value='';testsLoading.value=!!account
 if(!account)return
 try{const data=await safetyRequest('/api/psychology-tests',{headers:{'X-Health-User':account}});if(version===testVersion&&account===testAccount())testRecords.value=data.records}
 catch(e){if(version===testVersion)testsError.value=e.message}
 finally{if(version===testVersion)testsLoading.value=false}
}
const latestTest=type=>testRecords.value.find(r=>r.type===type)
const resultDate=value=>new Date(value).toLocaleString('zh-CN',{hour12:false})
const props = defineProps({ section: { type: String, default: 'overview' } })
const router = useRouter()
const moods = [
  { value: '低落', symbol: '﹏', color: '#a3a7c7' },
  { value: '有些疲惫', symbol: '−', color: '#b7acbd' },
  { value: '平静', symbol: '～', color: '#92b6ad' },
  { value: '还不错', symbol: '⌒', color: '#d0bc8d' },
  { value: '很开心', symbol: '◡', color: '#d3a4ab' }
]
const triggers = ['工作学习', '人际关系', '身体感受', '家庭', '生活琐事', '没有特别原因']
const records = ref([])
const loggedIn = ref(isLoggedIn())
const day = ref(today())
const mood = ref('')
const note = ref('')
const selectedTriggers = ref([])
const message = ref('')
const storageError = ref('')
function storageKey() {
  try { const account = JSON.parse(sessionStorage.getItem('mengsu-auth') || '{}')?.email; return account ? `mengsu-psychology-v1:${account}` : null }
  catch { return null }
}
function load() {
  void loadTests()
  loggedIn.value = isLoggedIn()
  records.value = []
  storageError.value = ''
  const key = storageKey()
  if (!key) return
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]')
    if (!Array.isArray(saved)) throw new Error()
    records.value = saved.filter(row => row && typeof row.id === 'string' && typeof row.date === 'string' && moods.some(item => item.value === row.mood) && typeof row.note === 'string' && typeof row.createdAt === 'string' && Array.isArray(row.triggers)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } catch { storageError.value = '未能读取本机心情记录。为保护原记录，请先检查浏览器存储设置，再刷新重试。' }
}
function persist(next) {
  const key = storageKey()
  if (!key || !isLoggedIn()) { message.value = '请先登录，当前填写内容还保留在这里。'; return false }
  if (storageError.value) { message.value = storageError.value; return false }
  try { localStorage.setItem(key, JSON.stringify(next)); records.value = next; return true }
  catch { message.value = '本机存储失败，填写的内容还在，请检查浏览器存储空间后重试。'; return false }
}
function save() {
  message.value = ''
  if (!isLoggedIn()) { message.value = '请先登录后保存，当前填写内容会留在这里。'; return }
  if (!mood.value) { message.value = '先选一个接近此刻感受的心情吧。'; return }
  if (!day.value || day.value > today()) { message.value = '请选择今天或之前的日期。'; return }
  const record = { id: crypto.randomUUID(), date: day.value, mood: mood.value, note: note.value.trim(), triggers: [...selectedTriggers.value], createdAt: new Date().toISOString() }
  if (persist([record, ...records.value])) { message.value = '这份心情已保存在当前浏览器。'; mood.value = ''; note.value = ''; selectedTriggers.value = [] }
}
function removeRecord(record) {
  if (!window.confirm('删除这条心情记录？此操作无法撤销。')) return
  if (persist(records.value.filter(row => row.id !== record.id))) message.value = '已删除这条记录。'
}
function toggleTrigger(value) { selectedTriggers.value = selectedTriggers.value.includes(value) ? selectedTriggers.value.filter(item => item !== value) : [...selectedTriggers.value, value] }
const recent = computed(() => records.value.slice(0, 5))
const recordedDays = computed(() => new Set(records.value.map(row => row.date)).size)
const distribution = computed(() => moods.map(item => ({ ...item, count: records.value.filter(row => row.mood === item.value).length })))
const maxCount = computed(() => Math.max(1, ...distribution.value.map(row => row.count)))
const latest = computed(() => records.value[0])
const pageTitle = computed(() => ({ overview: '心理总览', analysis: '心理分析', journal: '心情记录', breathe: '呼吸练习', history: '情绪回顾' })[props.section])
const running = ref(false)
const elapsed = ref(0)
let ticker = 0
let startedAt = 0
const exerciseDuration = 48
const finished = computed(() => elapsed.value >= exerciseDuration)
const phase = computed(() => finished.value ? '练习完成' : Math.floor(elapsed.value % 8) < 4 ? '轻轻吸气' : '缓缓呼气')
const phaseSeconds = computed(() => 4 - Math.floor(elapsed.value % 4))
function pauseBreathing() { running.value = false; clearInterval(ticker); ticker = 0 }
function startBreathing() {
  if (running.value) return
  if (finished.value) elapsed.value = 0
  startedAt = performance.now() - elapsed.value * 1000
  running.value = true
  ticker = window.setInterval(() => { elapsed.value = Math.min(exerciseDuration, (performance.now() - startedAt) / 1000); if (finished.value) pauseBreathing() }, 100)
}
function resetBreathing() { pauseBreathing(); elapsed.value = 0 }
function onVisibility() { if (document.hidden) pauseBreathing() }
function onAuthChange() { load(); resetBreathing(); message.value = ''; note.value = ''; mood.value = ''; selectedTriggers.value = [] }
watch(() => props.section, resetBreathing)
onMounted(() => { load(); window.addEventListener('mengsu:auth-change', onAuthChange); window.addEventListener('storage', load); document.addEventListener('visibilitychange', onVisibility) })
onBeforeUnmount(() => { testVersion++; pauseBreathing(); window.removeEventListener('mengsu:auth-change', onAuthChange); window.removeEventListener('storage', load); document.removeEventListener('visibilitychange', onVisibility) })
</script>

<template>
  <div class="psychology-home">
    <header class="psych-page-heading"><p>星栈 / 内心与感受</p><h1>{{ pageTitle }}</h1><span>{{ section === 'analysis' ? '回看已保存的人格、塔罗与三观结果，了解本次回答呈现的倾向。' : '不用急着调整情绪，先给自己一点被听见的时间。' }}</span></header>
    <div v-if="!loggedIn" class="psych-guest-note"><span>你正在以访客身份浏览。心情记录需要登录后保存。</span><button @click="router.push({ path: '/login', query: { next: '/psychology' } })">去登录 →</button></div>
    <p v-if="storageError" role="alert">{{ storageError }}</p>
    <section v-if="section === 'overview'" class="psych-summary"><div><p class="psych-eyebrow">给自己一个温柔的问候</p><h2>今天，你还好吗？</h2><p>有些感受不需要立刻找到答案。<br />先记下来，再慢慢和自己相处。</p></div><dl><div><dt>留下的心情</dt><dd>{{ records.length }}<small> 次</small></dd></div><div><dt>认真记录的日子</dt><dd>{{ recordedDays }}<small> 天</small></dd></div><div><dt>最近一次感受</dt><dd class="latest-mood">{{ latest?.mood || '还没有记录' }}</dd></div></dl></section>
    <section v-if="['overview', 'analysis'].includes(section)" class="psych-panel saved-tests">
      <div class="psych-panel-heading"><div><span class="psych-eyebrow">心绪活动 / 我的测试</span><h2>留下探索自己的片段</h2></div><button :disabled="testsLoading" @click="loadTests">{{ testsLoading?'读取中…':'刷新记录' }}</button></div>
      <p v-if="testsError" role="alert">{{ testsError }} <button @click="loadTests">重试</button></p>
      <article v-for="kind in testKinds" :key="kind.type" class="saved-test-row"><div><h3>{{ kind.name }} <small>{{ latestTest(kind.type)?'已保存':testsLoading?'读取中':'尚未保存' }}</small></h3><template v-if="latestTest(kind.type)"><strong>{{ latestTest(kind.type).title }}</strong><p>{{ latestTest(kind.type).summary }}</p><time>{{ resultDate(latestTest(kind.type).createdAt) }}</time></template><p v-else>{{ testsLoading?'正在读取你的测试结果…':loggedIn?'登录后完成测试，结果会自动保存并显示在这里。':'登录后可保存并查看自己的测试结果。' }}</p></div><RouterLink :to="kind.path">{{ latestTest(kind.type)?'再测一次':'开始测试' }} →</RouterLink></article>
      <details v-if="testRecords.length" class="test-archive"><summary>查看已保存的测试与完整解读（最近 {{ testRecords.length }} 次）</summary><details v-for="record in testRecords" :key="record.id" class="test-detail"><summary>{{ testKinds.find(k=>k.type===record.type)?.name }} · {{ record.title }} <time>{{ resultDate(record.createdAt) }}</time></summary><p>{{ record.summary }}</p><section v-for="(part,i) in record.sections" :key="i"><h4>{{ part.title }}</h4><p v-for="(line,j) in part.lines" :key="j">{{ line }}</p></section></details></details>
      <small>测试记录保存在当前账号，仅供娱乐与自我探索。</small>
    </section>
    <div v-if="section !== 'overview'" class="psych-content-grid" :class="{ 'single-panel': section !== 'overview' }">
      <section v-if="['overview', 'journal'].includes(section)" class="psych-panel mood-editor"><div class="psych-panel-heading"><div><span class="psych-eyebrow">此刻的心情</span><h2>哪一个，更接近现在的你？</h2></div><label class="psych-date-label">记录日期<input v-model="day" type="date" :max="today()" required /></label></div>
        <form @submit.prevent="save"><fieldset class="mood-selector"><legend class="visually-hidden">选择心情</legend><button v-for="item in moods" :key="item.value" type="button" :class="{ selected: mood === item.value }" :aria-pressed="mood === item.value" :style="{ '--mood-color': item.color }" @click="mood = item.value"><span aria-hidden="true">{{ item.symbol }}</span><b>{{ item.value }}</b></button></fieldset>
        <label class="psych-field">发生了什么，或者有什么想说的？<textarea v-model="note" rows="4" maxlength="2000" placeholder="今天有一点累，也有一件让自己开心的小事……（可不填）" /><small>{{ note.length }} / 2000</small></label><fieldset class="psych-trigger-field"><legend>可能与什么有关？<span>（可多选）</span></legend><div><button v-for="item in triggers" :key="item" type="button" :class="{ selected: selectedTriggers.includes(item) }" :aria-pressed="selectedTriggers.includes(item)" @click="toggleTrigger(item)">{{ item }}</button></div></fieldset><div class="psych-save-row"><span>只保存在当前浏览器，按登录标记分开存放。</span><button class="psych-primary" type="submit">保存这份心情 ↗</button></div></form>
      </section>
      <section v-if="['overview', 'breathe'].includes(section)" class="psych-panel breathe-panel"><span class="psych-eyebrow">给自己 48 秒</span><h2>把注意力，放回呼吸。</h2><p>跟随提示，自然吸气 4 秒、呼气 4 秒，共 6 轮。<br />不必憋气，按照舒适的节奏来。</p><div class="breathing-circle" :class="{ active: running }" :style="{ '--breath-size': running ? 1 + Math.sin(Math.PI * (elapsed % 8) / 8) * .12 : 1 }"><div><strong aria-live="polite">{{ finished ? '做得很好' : running ? phase : elapsed > 0 ? '已暂停' : '准备好了么' }}</strong><span>{{ finished ? '留意此刻的身体感受' : running ? phaseSeconds + ' 秒' : '跟随自己的节奏' }}</span></div></div><div class="breathing-progress"><span>{{ Math.floor(elapsed) }} / 48 秒</span><span>{{ finished ? '已完成 6 轮' : '第 ' + Math.min(6, Math.floor(elapsed / 8) + 1) + ' 轮 / 6 轮' }}</span></div><progress :value="elapsed" :max="exerciseDuration" aria-label="呼吸练习进度" /><div class="breathing-actions"><button v-if="running" class="psych-primary" @click="pauseBreathing">暂停练习</button><button v-else class="psych-primary" @click="startBreathing">{{ finished ? '再来一遍' : elapsed > 0 ? '继续练习' : '开始练习' }}</button><button :disabled="!elapsed && !running" @click="resetBreathing">重置</button></div><small>感到不舒服时可随时停止。离开页面后会自动暂停。</small></section>
    </div>
    <p v-if="message" class="psych-message" role="status">{{ message }}</p>
    <section v-if="section === 'history'" class="psych-panel psych-history"><div class="psych-panel-heading"><div><span class="psych-eyebrow">回看自己的节奏</span><h2>{{ section === 'history' ? '情绪回顾' : '最近留下的心情' }}</h2></div><button v-if="section === 'overview'" @click="router.push('/psychology/history')">查看全部 →</button></div><div v-if="!records.length" class="psych-empty"><span aria-hidden="true">—</span><p>还没有心情记录。从今天的一次感受开始，回顾会随着记录慢慢丰富。</p><button v-if="section === 'history'" @click="router.push('/psychology/journal')">记下今天的心情 →</button></div><template v-else><div v-if="section === 'history'" class="mood-distribution"><p>已记录心情的次数分布，仅呈现自填内容。</p><div v-for="item in distribution" :key="item.value"><span>{{ item.value }}</span><div><i :style="{ transform: 'scaleX(' + item.count / maxCount + ')', background: item.color }" /></div><b>{{ item.count }} 次</b></div></div><article v-for="row in (section === 'history' ? records : recent)" :key="row.id" class="psych-record"><div><time>{{ row.date }}</time><strong>{{ row.mood }}</strong><button type="button" :aria-label="'删除 ' + row.date + ' 的心情记录'" @click="removeRecord(row)">删除</button></div><p v-if="row.note">{{ row.note }}</p><span v-for="item in (row.triggers || [])" :key="item" class="psych-record-tag">{{ item }}</span></article></template></section>
    <footer class="psych-footer">这里提供心情记录与日常放松练习，不作心理诊断。如果持续感到困扰，可以向信任的人或专业心理工作者寻求支持。</footer>
  </div>
</template>

<style scoped>
.saved-test-row{display:flex;justify-content:space-between;gap:22px;align-items:center;padding:20px 0;border-top:1px solid hsl(var(--psych-hue, 145) 15% 93%)}.saved-test-row>div{min-width:0}.saved-test-row h3{font-size:15px;font-weight:500;margin:0 0 10px;color:hsl(var(--psych-hue, 145) 15% 44%)}.saved-test-row h3 small{font-size:11px;margin-left:12px;color:hsl(var(--psych-hue, 145) 15% 48%)}.saved-test-row strong{font-size:14px;font-weight:500}.saved-test-row p,.test-detail p{font-size:13px;line-height:1.9;white-space:pre-wrap;overflow-wrap:anywhere;color:hsl(var(--psych-hue, 145) 15% 44%)}.saved-test-row time,.test-detail time{font-size:11px;color:hsl(var(--psych-hue, 145) 16% 53%)}.saved-test-row a{flex-shrink:0;color:hsl(var(--psych-hue, 145) 16% 41%);font-size:12px}.test-archive{border-top:1px solid hsl(var(--psych-hue, 145) 15% 93%);padding:20px 0;font-size:13px;color:hsl(var(--psych-hue, 145) 16% 36%)}.test-archive summary{cursor:pointer;overflow-wrap:anywhere}.test-detail{margin-top:16px;padding:14px;border:1px solid hsl(var(--psych-hue, 145) 15% 93%);border-radius:8px}.test-detail time{display:block;margin-top:6px}.test-detail h4{font-size:14px;font-weight:500}.saved-tests>small{font-size:11px;color:hsl(var(--psych-hue, 145) 16% 53%)}@media(max-width:600px){.saved-test-row{align-items:flex-start;gap:10px}.saved-test-row h3 small{display:block;margin:5px 0 0}}

.personality-entry{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:24px}.personality-entry h2{margin-bottom:8px!important}.personality-entry p{font-size:13px;line-height:1.8;color:hsl(var(--psych-hue, 145) 15% 50%);margin:0}.personality-entry button{flex-shrink:0}@media(max-width:600px){.personality-entry{align-items:flex-start;flex-direction:column}}
.psychology-home{max-width:1300px;margin:0 auto;color:hsl(var(--psych-hue, 145) 15% 40%)}.psych-page-heading{margin:14px 0 28px}.psych-page-heading>p,.psych-eyebrow{color:hsl(var(--psych-hue, 145) 15% 51%);font-size:11px;margin:0 0 8px}.psych-page-heading h1{font:500 29px/1.4 var(--display);margin:0 0 8px;color:hsl(var(--psych-hue, 145) 15% 33%)}.psych-page-heading>span{font-size:14px;color:hsl(var(--psych-hue, 145) 15% 47%)}.psychology-home button{border-radius:7px;box-shadow:none;font-weight:500}.psychology-home button:not(.psych-primary){background:transparent;color:hsl(var(--psych-hue, 145) 15% 43%);border:0;font-size:12px;padding:7px 0}.psychology-home button:focus-visible{outline:2px solid hsl(var(--psych-hue, 145) 16% 56%);outline-offset:3px}.psychology-home .psych-primary{color:#fff;background:hsl(var(--psych-hue, 145) 16% 44%);border:1px solid hsl(var(--psych-hue, 145) 16% 44%);font-size:13px;padding:10px 16px}.psych-guest-note{display:flex;justify-content:space-between;align-items:center;gap:18px;padding:12px 17px;border:1px solid hsl(var(--psych-hue, 145) 16% 90%);border-radius:8px;background:hsl(var(--psych-hue, 145) 15% 98%);color:hsl(var(--psych-hue, 145) 15% 43%);font-size:12px;margin-bottom:22px}.psych-summary{display:grid;grid-template-columns:1fr 1.1fr;gap:30px;padding:30px 34px;background:hsl(var(--psych-hue, 145) 28% 94% / .9);border:1px solid hsl(var(--psych-hue, 145) 16% 90%);border-radius:14px;margin-bottom:26px}.psych-summary h2{font:500 28px var(--display);color:hsl(var(--psych-hue, 145) 16% 40%);margin:13px 0}.psych-summary p:not(.psych-eyebrow){font-size:14px;line-height:1.9;color:hsl(var(--psych-hue, 145) 15% 46%);margin-bottom:0}.psych-summary dl{align-self:center;display:grid;grid-template-columns:1fr 1fr;gap:26px;margin:0}.psych-summary dl>div:last-child{grid-column:1/-1;border-top:1px solid hsl(var(--psych-hue, 145) 17% 89%);padding-top:17px}.psych-summary dt{font-size:11px;color:hsl(var(--psych-hue, 145) 15% 51%)}.psych-summary dd{font-size:30px;color:hsl(var(--psych-hue, 145) 15% 37%);margin:5px 0 0;font-weight:500}.psych-summary dd small{font-size:12px}.psych-summary .latest-mood{font:500 18px var(--display)}.psych-content-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:24px;align-items:start}.psych-content-grid.single-panel{grid-template-columns:1fr}.psych-panel{padding:26px;background:rgba(255,254,249,.87);border:1px solid hsl(var(--psych-hue, 145) 15% 91%);border-radius:13px;min-width:0}.psych-panel-heading{display:flex;justify-content:space-between;gap:20px;align-items:start;flex-wrap:wrap}.psych-panel h2{font:500 20px/1.6 var(--display);color:hsl(var(--psych-hue, 145) 16% 43%);margin:5px 0 18px}.psych-date-label{display:grid;gap:5px;font-size:10px;color:hsl(var(--psych-hue, 145) 15% 53%)}.psych-date-label input{padding:5px 8px;width:140px;font-size:11px;min-height:30px;background:hsl(var(--psych-hue, 145) 15% 98%);border:1px solid hsl(var(--psych-hue, 145) 16% 90%);border-radius:6px;color:hsl(var(--psych-hue, 145) 15% 41%)}.mood-selector{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;border:0;padding:0;margin:12px 0 23px}.mood-selector button{display:grid;justify-items:center;gap:9px;padding:11px 2px!important;border:1px solid transparent!important;border-radius:10px!important}.mood-selector button>span{width:40px;height:40px;display:grid;place-items:center;border-radius:50%;background:color-mix(in srgb,var(--mood-color) 18%,white);color:var(--mood-color);font:500 25px/1 sans-serif}.mood-selector button b{font-size:11px;font-weight:400;white-space:nowrap}.mood-selector button.selected{background:hsl(var(--psych-hue, 145) 18% 96%)!important;border-color:hsl(var(--psych-hue, 145) 16% 72%)!important}.mood-selector button.selected b{font-weight:600;color:hsl(var(--psych-hue, 145) 16% 44%)}.psych-field{display:grid;gap:10px;font-size:13px;color:hsl(var(--psych-hue, 145) 15% 42%)}.psych-field textarea{background:hsl(var(--psych-hue, 145) 25% 98%);border:1px solid hsl(var(--psych-hue, 145) 15% 91%);border-radius:9px;min-height:126px;font-size:13px;line-height:1.9;color:hsl(var(--psych-hue, 145) 15% 44%)}.psych-field textarea::placeholder{color:hsl(var(--psych-hue, 145) 15% 57%)}.psych-field small{font-size:10px;text-align:right;color:hsl(var(--psych-hue, 145) 15% 56%)}.psych-trigger-field{border:0;padding:0;margin:19px 0}.psych-trigger-field legend{font-size:12px;color:hsl(var(--psych-hue, 145) 15% 42%)}.psych-trigger-field legend span{font-size:10px;color:hsl(var(--psych-hue, 145) 15% 56%)}.psych-trigger-field>div{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.psych-trigger-field button{border:1px solid hsl(var(--psych-hue, 145) 15% 92%)!important;padding:5px 9px!important;background:hsl(var(--psych-hue, 145) 25% 98%)!important;font-size:11px!important}.psych-trigger-field button.selected{background:hsl(var(--psych-hue, 145) 15% 93%)!important;color:hsl(var(--psych-hue, 145) 16% 47%)!important;border-color:hsl(var(--psych-hue, 145) 16% 72%)!important}.psych-save-row{border-top:1px solid hsl(var(--psych-hue, 145) 19% 94%);padding-top:19px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:space-between}.psych-save-row>span{font-size:10px;color:hsl(var(--psych-hue, 145) 15% 55%);max-width:210px}.breathe-panel{text-align:center}.breathe-panel h2{font-size:20px}.breathe-panel>p{font-size:12px;line-height:1.9;color:hsl(var(--psych-hue, 145) 15% 50%)}.breathing-circle{position:relative;display:grid;place-items:center;width:180px;height:180px;margin:34px auto;color:hsl(var(--psych-hue, 145) 16% 45%)}.breathing-circle:before{content:'';position:absolute;inset:0;border:1px solid hsl(var(--psych-hue, 145) 16% 86%);border-radius:50%;background:hsl(var(--psych-hue, 145) 17% 95%);transform:scale(var(--breath-size,1));transition:transform 150ms cubic-bezier(.22,1,.36,1);box-shadow:0 0 0 12px hsl(var(--psych-hue, 145) 15% 98%),0 0 0 13px hsl(var(--psych-hue, 145) 15% 93%)}.breathing-circle>div{position:relative;display:grid;gap:9px}.breathing-circle strong{font:500 20px var(--display)}.breathing-circle span{font-size:11px;color:hsl(var(--psych-hue, 145) 16% 55%)}.breathing-progress{display:flex;justify-content:space-between;font-size:10px;color:hsl(var(--psych-hue, 145) 15% 55%);gap:10px}.breathe-panel progress{appearance:none;width:100%;height:4px;margin:8px 0 20px;border:0;border-radius:5px;background:hsl(var(--psych-hue, 145) 15% 94%);accent-color:hsl(var(--psych-hue, 145) 16% 59%)}.breathe-panel progress::-webkit-progress-bar{background:hsl(var(--psych-hue, 145) 15% 94%);border-radius:5px}.breathe-panel progress::-webkit-progress-value{background:hsl(var(--psych-hue, 145) 16% 59%);border-radius:5px}.breathing-actions{display:flex;justify-content:center;align-items:center;gap:20px}.breathe-panel>small{display:block;font-size:10px;color:hsl(var(--psych-hue, 145) 15% 57%);margin-top:18px}.psych-history{margin-top:26px}.psych-empty{text-align:center;padding:20px;color:hsl(var(--psych-hue, 145) 15% 54%);font-size:13px;line-height:1.9}.psych-empty>span{color:hsl(var(--psych-hue, 145) 16% 65%);font-size:26px}.psych-record{border-top:1px solid hsl(var(--psych-hue, 145) 15% 93%);padding:18px 0}.psych-record>div{display:flex;align-items:center;gap:16px}.psych-record time{font-size:12px;color:hsl(var(--psych-hue, 145) 15% 55%)}.psych-record strong{font-size:13px;color:hsl(var(--psych-hue, 145) 16% 40%);font-weight:500}.psych-record>div>button{margin-left:auto;font-size:11px!important;color:hsl(var(--psych-hue, 145) 15% 55%)!important}.psych-record>p{white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;color:hsl(var(--psych-hue, 145) 15% 42%);line-height:1.9;margin:12px 0}.psych-record-tag{display:inline-block;padding:3px 7px;margin:4px 5px 0 0;color:hsl(var(--psych-hue, 145) 16% 50%);background:hsl(var(--psych-hue, 145) 15% 96%);border-radius:4px;font-size:10px}.mood-distribution{padding:5px 0 24px}.mood-distribution>p{color:hsl(var(--psych-hue, 145) 15% 54%);font-size:12px}.mood-distribution>div{display:grid;grid-template-columns:80px 1fr 45px;gap:15px;align-items:center;margin:14px 0;font-size:12px;color:hsl(var(--psych-hue, 145) 15% 49%)}.mood-distribution>div>div{position:relative;height:6px;border-radius:5px;background:hsl(var(--psych-hue, 145) 15% 95%);overflow:hidden}.mood-distribution i{display:block;height:100%;transform-origin:left;border-radius:5px}.mood-distribution b{font-weight:400;font-size:11px}.psych-message{padding:13px 16px;background:hsl(var(--psych-hue, 145) 19% 94%);border-radius:8px;font-size:13px;color:hsl(var(--psych-hue, 145) 16% 41%)}.psych-footer{font-size:11px;color:hsl(var(--psych-hue, 145) 15% 56%);margin:25px 0;line-height:1.9}.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}@media(min-width:1100px){.single-panel .breathe-panel{max-width:650px;width:100%;justify-self:center}.single-panel .mood-editor{max-width:900px;width:100%;justify-self:center}}@media(max-width:1100px){.psych-content-grid{grid-template-columns:1fr}.psych-summary{grid-template-columns:1fr}.psych-summary dl{grid-template-columns:1fr 1fr 1fr}.psych-summary dl>div:last-child{grid-column:auto;border:0;padding-top:0}.psych-summary .latest-mood{font-size:15px}}@media(max-width:600px){.psych-summary,.psych-panel{padding:20px}.psych-summary{gap:17px}.psych-summary dl{gap:12px}.psych-summary dt{font-size:10px}.psych-summary dd{font-size:25px}.psych-summary .latest-mood{line-height:1.7}.psych-guest-note{flex-wrap:wrap}.psych-panel h2{font-size:18px}.mood-selector{gap:1px}.mood-selector button b{font-size:10px}.mood-selector button>span{width:35px;height:35px}.psych-save-row>.psych-primary{width:100%}}@media(prefers-reduced-motion:reduce){.breathing-circle:before{transform:none!important;transition:none!important}}
</style>
