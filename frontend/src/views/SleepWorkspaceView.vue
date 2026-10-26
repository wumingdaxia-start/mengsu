<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, today } from '../api'
import CaptureView from './CaptureView.vue'
import DreamsView from './DreamsView.vue'
import AskView from './AskView.vue'
import MeView from './MeView.vue'
import HomeView from './HomeView.vue'
import FeelingSliders from '../components/FeelingSliders.vue'

const route = useRoute()
const router = useRouter()
const sections = [
  { key: 'records', label: '睡眠记录' },
  { key: 'capture', label: '捕梦', component: CaptureView },
  { key: 'dreams', label: '梦境档案', component: DreamsView },
  { key: 'cue', label: '睡前线索', component: HomeView },
  { key: 'ask', label: '对话与记忆', component: AskView },
  { key: 'me', label: '偏好与隐私', component: MeView }
]
const active = computed(() => sections.find(item => item.key === route.query.tab) || sections[0])
const day = ref(today())
const record = ref(null)
const text = ref('')
const status = ref('')
const error = ref('')
const busy = ref(false)
const loading = ref(false)
let request = 0
function select(key) { router.push({ path: '/sleep', query: key === 'records' ? {} : { tab: key } }) }
function go(key) {
  if (sections.some(item => item.key === key)) select(key)
  else if (key === 'home') select('records')
  else router.push(key.startsWith('/') ? key : `/${key}`)
}
async function load() {
  const id = ++request
  loading.value = true
  error.value = ''
  try { const result = await api.day(day.value); if (id === request) record.value = result }
  catch (err) { if (id === request) { record.value = null; error.value = `加载失败：${err.message}` } }
  finally { if (id === request) loading.value = false }
}
async function save() {
  if (!text.value.trim() || busy.value) return
  busy.value = true
  status.value = ''
  try {
    const result = await api.send(`补记归属醒来日期 ${day.value} 的睡眠记录：${text.value.trim()}`)
    status.value = result.reply
    if (result.extracted !== false) text.value = ''
    await load()
  } catch (err) { status.value = `保存失败：${err.message}` }
  finally { busy.value = false }
}
function time(value) { return value ? value.replace('T', ' ') : '未填写' }
watch(day, load)
watch(() => active.value.key, key => { if (key === 'records') load() })
onMounted(load)
</script>

<template>
  <div class="sleep-workspace">
    <header class="sleep-heading"><p>REST · MEMORY · DREAMS</p><h1>睡眠监测</h1><span>从白天的经历，到夜晚的梦，再到醒来后的感受。</span></header>
    <div class="sleep-sections" role="tablist" aria-label="睡眠功能">
      <button v-for="item in sections" :id="`sleep-tab-${item.key}`" :key="item.key" role="tab" :aria-selected="active.key === item.key" aria-controls="sleep-panel" :class="{ selected: active.key === item.key }" @click="select(item.key)">{{ item.label }}</button>
    </div>
    <div id="sleep-panel" role="tabpanel" :aria-labelledby="`sleep-tab-${active.key}`">
      <section v-show="active.key === 'records'" class="sleep-records">
        <div class="record-toolbar"><h2>按醒来日期回看</h2><label>日期 <input v-model="day" type="date" required :max="today()" /></label></div>
        <p class="record-note">一晚睡眠归到醒来那天；可以补记，时间不确定时直接说明“大约”。设备尚未接入，不推测睡眠分期。</p>
        <p v-if="loading" role="status">正在读取记录……</p>
        <p v-else-if="error" role="alert">{{ error }}</p>
        <template v-else>
          <p v-if="!record?.sleep?.length" class="empty-sleep">这一天还没有睡眠记录。记下一句醒后的感受，或大致的入睡、醒来时间就好。</p>
          <article v-for="row in record?.sleep || []" :key="row.id" class="sleep-row-card">
            <dl><div><dt>上床</dt><dd>{{ time(row.bed_at) }}</dd></div><div><dt>入睡</dt><dd>{{ time(row.sleep_at) }}</dd></div><div><dt>醒来</dt><dd>{{ time(row.wake_at) }}</dd></div><div><dt>起床</dt><dd>{{ time(row.rise_at) }}</dd></div><div><dt>夜间醒来</dt><dd>{{ row.night_wakes == null ? '未填写' : `${row.night_wakes} 次` }}</dd></div><div><dt>醒后感受</dt><dd>{{ row.feeling || '未填写' }}</dd></div><div v-if="row.nap_minutes != null"><dt>小睡</dt><dd>{{ row.nap_minutes }} 分钟</dd></div></dl>
          </article>
        </template>
        <form class="sleep-composer" @submit.prevent="save"><label for="sleep-note">补充这一天的睡眠</label><textarea id="sleep-note" v-model="text" required rows="3" placeholder="例如：昨晚大约一点入睡，早上七点醒，夜里醒了一次，醒来有点累。" /><button :disabled="busy || !text.trim() || !day">{{ busy ? '正在保存与整理……' : '保存睡眠记录' }}</button><p v-if="status" role="status">{{ status }}</p></form>
        <FeelingSliders category="sleep" :day="day" />
        <div class="sleep-shortcuts"><button @click="select('capture')">记下醒来的梦 →</button><button @click="select('cue')">准备睡前线索 →</button><button @click="select('ask')">回忆以前聊过的事 →</button></div>
      </section>
      <KeepAlive><component :is="active.component" v-if="active.component" :key="active.key" :go="go" :sleep-only="active.key === 'cue'" /></KeepAlive>
    </div>
  </div>
</template>

<style scoped>
.sleep-workspace { overflow-x: clip; }
.sleep-workspace { --accent: #9183b2; --accent-bright: #79658e; --accent-soft: #f0ecf8; --line: #e4dfef; --ink: #48445b; --ink-soft: #625d73; --muted: #8d8299; min-width: 0; color: var(--ink); }
.sleep-heading { margin: 10px 0 24px; } .sleep-heading p { margin: 0 0 8px; color: #a18eaf; font-size: 11px; letter-spacing: .08em; } .sleep-heading h1 { margin: 0 0 10px; font: 600 27px/1.4 var(--display); } .sleep-heading > span { color: #95859f; font-size: 14px; }
.sleep-sections { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 24px; padding-bottom: 14px; border-bottom: 1px solid #e6ddec; }
.sleep-sections button { min-height: 44px; padding: 9px 15px; border-radius: 6px; background: transparent; color: #94819f; font-size: 14px; box-shadow: none; }
.sleep-sections button.selected { color: #685376; background: #f0e9f6; border-color: #e0d2eb; }
.sleep-sections button:focus-visible { outline: 2px solid #ae97c0; outline-offset: 2px; }
.sleep-records { padding: clamp(18px,3vw,30px); border: 1px solid #e7deee; border-radius: 12px; background: #fcfafe; }
.record-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 15px; flex-wrap: wrap; } .record-toolbar h2 { margin: 0; font: 500 21px/1.4 var(--display); } .record-toolbar label { display: flex; align-items: center; gap: 10px; color: #90819b; font-size: 13px; } .record-toolbar input { width: auto; background: white; }
.record-note, .empty-sleep { color: #94869e; font-size: 14px; } .empty-sleep { padding: 22px 0; }
.sleep-row-card { margin-top: 14px; padding: 18px; background: white; border: 1px solid #e8e0ef; border-radius: 8px; }
dl { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px 20px; margin: 0; } dl > div { min-width: 0; } dt { color: #9c8ba8; font-size: 12px; } dd { margin: 2px 0 0; overflow-wrap: anywhere; font-size: 14px; }
.sleep-composer { margin-top: 24px; } .sleep-composer > label { display: block; margin-bottom: 8px; font-size: 14px; } textarea { background: white; font-size: 16px; } .sleep-composer > button { margin-top: 12px; background: #947da8; border-radius: 7px; font-size: 14px; min-height: 44px; } .sleep-composer p { overflow-wrap: anywhere; color: #8e769e; }
.sleep-shortcuts { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 22px; } .sleep-shortcuts button { background: transparent; color: #977eaa; border-radius: 5px; min-height: 44px; padding: 8px 0; font-size: 13px; box-shadow: none; }
@media(max-width:620px) { .sleep-sections { gap: 4px; } .sleep-sections button { padding: 8px 10px; font-size: 12px; } dl { grid-template-columns: 1fr; } .sleep-heading h1 { font-size: 24px; } }
</style>
