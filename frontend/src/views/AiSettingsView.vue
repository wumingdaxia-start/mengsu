<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { clearSetupPrompted, invalidateAiStatus } from '../ai-status'
const route = useRoute()
const router = useRouter()
const from = computed(() => (typeof route.query.from === 'string' && route.query.from.startsWith('/') && !route.query.from.startsWith('//') && !route.query.from.startsWith('/settings/ai') ? route.query.from : ''))
const key = ref(''), region = ref('cn'), model = ref('qwen-plus'), voiceModel = ref('qwen3-tts-flash')
const state = ref(null), busy = ref(false), message = ref(''), failure = ref(false)
const connected = computed(() => Boolean(state.value?.configured))
function back() { from.value ? router.replace(from.value) : router.back() }
function resume() { clearSetupPrompted(); invalidateAiStatus(); router.replace(from.value) }
async function request(method='GET', suffix='', body) {
  const response = await fetch('/api/ai-settings'+suffix, {method, headers:{'Content-Type':'application/json'},
    body:body ? JSON.stringify(body):undefined, signal:AbortSignal.timeout(suffix ? 150000:10000)})
  const data = await response.json()
  if(!response.ok) throw new Error(typeof data.detail==='string'?data.detail:'暂时无法连接，请稍后重试。')
  return data
}
async function refresh() {
  state.value = await request()
  region.value = state.value.region
  model.value = state.value.chat_model
  voiceModel.value = state.value.tts_model
}
async function run(action) {
  if(busy.value)return
  busy.value=true;message.value='';failure.value=false
  try { await action() } catch(e) { failure.value=true;message.value=e.name==='TimeoutError'?'连接等待超时，请重试。':e.message }
  finally { busy.value=false }
}
function save() { return run(async()=>{
  await request('PUT','',{api_key:key.value.trim(),region:region.value,chat_model:model.value.trim(),tts_model:voiceModel.value.trim()})
  key.value=''; clearSetupPrompted(); invalidateAiStatus(); await refresh()
  message.value=from.value?'已启用你的 API 配置，可以回到刚才的页面了。请先分别测试文字模型和云端音色。':'已启用你的 API 配置。请分别测试文字模型和云端音色。'
}) }
function test(kind) { return run(async()=>{message.value=(await request('POST','/test',{kind})).message}) }
function clear() { return run(async()=>{await request('DELETE');key.value='';invalidateAiStatus();await refresh();message.value='已清除个人密钥，恢复网站默认服务。'}) }
onMounted(()=>run(refresh))
</script>

<template>
 <main class="ai-settings">
  <button class="settings-back" @click="back">〈 {{ from ? '返回刚才的页面' : '返回' }}</button>
  <header><p>花屿星 · 设置</p><h1>AI 服务设置</h1><p>在自己的电脑上连接文字模型与云端音色。</p></header>
  <section v-if="state && !connected" class="settings-card settings-lead" role="status">
   <h2>先连接一次 AI 服务</h2>
   <p>还没有可用的密钥，AI 创作与云端朗读暂时用不了。在下面填写自己的千问 API Key，保存并测试后，可以一键回到刚才的页面。</p>
   <p class="settings-note">内置故事、背景音乐、手动记梦不需要密钥，随时可以先用。</p>
  </section>
  <section class="settings-card">
   <h2>当前连接</h2>
   <p>{{!state?'正在检查服务…':state.source==='personal'?'正在使用你的个人 API 配置':state.source==='server'?'正在使用网站提供的默认服务':'尚未配置云端服务'}}</p>
   <p class="settings-note">内置故事、背景音乐和手动记录不依赖 AI 密钥。AI 创作与人物朗读需要有效的千问 API Key、模型权限和可用额度。</p>
  </section>
  <form class="settings-card" @submit.prevent="save">
   <h2>连接自己的千问服务</h2>
   <p class="settings-note">在阿里云百炼获取 API Key，选择与密钥相同的地域。个人配置只影响当前浏览器，不会覆盖其他人的配置。</p>
   <label>密钥所属地域<select v-model="region" :disabled="busy"><option value="cn">中国内地（北京）</option><option value="intl">国际（新加坡）</option></select></label>
   <label>API Key<input v-model="key" type="password" autocomplete="new-password" spellcheck="false" required maxlength="512" :disabled="busy" placeholder="粘贴你的 API Key，保存后不再显示"></label>
   <div class="settings-models"><label>文字模型<input v-model="model" required pattern="[a-zA-Z0-9_.-]{1,100}" :disabled="busy"></label><label>云端音色模型<input v-model="voiceModel" required pattern="qwen[a-zA-Z0-9_.-]{1,100}" :disabled="busy"></label></div>
   <p class="settings-note">密钥仅在本次服务进程的内存中保留，最长 12 小时；服务重启后需重新填写。不写入浏览器存储、项目文件或分享包。请只在自己信任的网站上填写密钥，远程访问请使用 HTTPS。</p>
   <div class="settings-actions"><button type="submit" :disabled="busy||!key.trim()">保存并启用</button><button type="button" :disabled="busy||state?.source!=='personal'" @click="clear">清除个人配置</button></div>
  </form>
  <section class="settings-card">
   <h2>测试与使用</h2><p class="settings-note">保存后分别测试；测试会发起一次短请求，可能消耗少量服务额度。切换地域或模型后，请重新填写密钥并保存。</p>
   <div class="settings-actions"><button :disabled="busy||!state?.configured" @click="test('chat')">测试文字模型</button><button :disabled="busy||!state?.configured" @click="test('voice')">测试云端音色</button></div>
   <p v-if="busy" role="status">正在连接，请稍候…</p><p v-if="message" :class="{'settings-error':failure}" role="status">{{message}}</p>
   <div v-if="from && connected" class="settings-actions"><button type="button" @click="resume">回到刚才的页面 →</button></div>
   <RouterLink to="/dream/bedtime-stories">前往睡前故事 →</RouterLink>
  </section>
 </main>
</template>

<style scoped>
.ai-settings{max-width:820px;margin:0 auto;padding:28px 20px 80px;color:#51465f;font:15px/1.7 'Microsoft YaHei',sans-serif}.ai-settings header{margin:22px 0 28px}.ai-settings h1,.ai-settings h2{font-family:'Songti SC',SimSun,serif;font-weight:500}.ai-settings h1{font-size:29px}.ai-settings h2{font-size:21px;margin:0 0 14px}.settings-card{background:#fffdfbea;border:1px solid #e4ddea;border-radius:20px;padding:26px;margin:18px 0}.settings-lead{border-color:#d6c3e6;background:#f8f2fc}.settings-lead p{margin:6px 0}.settings-note{font-size:13px;color:#766a80}.settings-card label{display:grid;gap:8px;margin:18px 0}.settings-card input,.settings-card select{width:100%;min-width:0;border:1px solid #d8cde2;border-radius:10px;padding:12px;background:#faf7fc;color:#51465f;font:inherit}.settings-models{display:grid;grid-template-columns:1fr 1fr;gap:18px}.settings-actions{display:flex;flex-wrap:wrap;gap:12px;margin:20px 0}.ai-settings button{font:inherit;border:1px solid #d8cde2;border-radius:10px;padding:10px 18px;background:#eee5f4;color:#51465f;cursor:pointer}.ai-settings button:disabled{opacity:.5;cursor:default}.ai-settings :focus-visible{outline:2px solid #8d6ea8;outline-offset:3px}.settings-error{color:#a34856}.settings-card a{color:#705488}.settings-back{background:transparent!important}@media(max-width:600px){.ai-settings{padding:18px 12px 80px}.settings-card{padding:20px}.settings-models{grid-template-columns:1fr;gap:0}}
</style>
