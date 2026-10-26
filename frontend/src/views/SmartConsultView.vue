<script setup>
import { nextTick, ref } from 'vue'
import { api } from '../api'

const input = ref('')
const busy = ref(false)
const conversation = ref([])
const body = ref(null)
const suggestions = [
  '帮我整理这周的睡眠情况，方便和医生沟通',
  '我醒来后心慌，应该记录哪些信息？',
  '帮我把最近的身体感受整理成就诊描述'
]

async function scrollToEnd() {
  await nextTick()
  if (body.value) body.value.scrollTop = body.value.scrollHeight
}

function beginConversation() {
  conversation.value = [{
    role: 'assistant',
    text: '可以把睡眠、情绪或身体感受慢慢告诉我。我会帮你整理重点，必要时提示及时寻求线下医疗帮助，但不会替代诊断。'
  }]
}

async function send(text) {
  const value = (text ?? input.value).trim()
  if (!value || busy.value) return
  if (!conversation.value.length) beginConversation()
  input.value = ''
  conversation.value.push({ role: 'user', text: value })
  busy.value = true
  await scrollToEnd()
  try {
    const result = await api.ask(`请以健康记录整理与就医沟通准备的方式回应以下内容。不要诊断、不要开药、不要承诺疗效；如出现紧急危险信号，提示尽快联系急救或线下医生。用户描述：${value}`)
    conversation.value.push({ role: 'assistant', text: result.answer })
  } catch (error) {
    conversation.value.push({ role: 'assistant', text: `暂时无法连接服务：${error.message}` })
  } finally {
    busy.value = false
    await scrollToEnd()
  }
}
</script>

<template>
  <main class="consult-workspace">
    <section class="consult-panel">
      <p class="consult-notice">智慧问诊仅帮助整理健康信息与就医沟通，不替代医生诊断、处方或紧急医疗服务。</p>
      <div ref="body" class="conversation" aria-live="polite">
        <div v-if="!conversation.length" class="consult-empty">
          <span class="consult-empty-mark">✦</span>
          <h2>从你此刻的感受开始</h2>
          <p>可以描述睡眠、身体感受或想在就诊时问医生的问题。</p>
          <div class="suggestions"><button v-for="item in suggestions" :key="item" type="button" @click="send(item)">{{ item }}</button></div>
        </div>
        <article v-for="(message, index) in conversation" :key="index" class="message" :class="message.role">
          <span class="message-avatar" aria-hidden="true">{{ message.role === 'assistant' ? '✦' : '我' }}</span>
          <div class="message-content"><p>{{ message.role === 'assistant' ? '智慧问诊' : '你的描述' }}</p><div>{{ message.text }}</div></div>
        </article>
        <p v-if="busy" class="thinking">正在整理你提供的信息…</p>
      </div>
      <section v-if="!conversation.length" class="consult-modules" aria-label="智慧问诊服务模块">
        <button type="button" class="consult-module booking" @click="send('我想就医，请帮我整理症状与睡眠记录，并提示可以向医生询问的挂号科室方向')"><span>⌁</span><i>01</i><b>看病挂号</b><small>整理就诊信息与沟通重点</small><em>开始整理 →</em></button>
        <button type="button" class="consult-module medicine" @click="send('请帮我整理正在使用的药物、感受和需要向医生或药师确认的问题；不要提供剂量或处方建议')"><span>□</span><i>02</i><b>用药建议</b><small>整理现有用药与待确认事项</small><em>开始整理 →</em></button>
        <button type="button" class="consult-module knowledge" @click="send('请用通俗语言介绍与我的睡眠和身体感受相关的医学知识，并标注需要线下确认的部分')"><span>◇</span><i>03</i><b>医学知识</b><small>梳理概念与可提问方向</small><em>开始了解 →</em></button>
        <button type="button" class="consult-module urgent" @click="send('请说明哪些症状属于可能需要尽快联系医生或急救服务的危险信号')"><span>!</span><i>04</i><b>急症识别</b><small>识别需要及时求助的情况</small><em>查看提示 →</em></button>
      </section>
      <form class="consult-input" @submit.prevent="send()">
        <input v-model="input" placeholder="描述睡眠、身体感受或就诊前想问的问题…" aria-label="健康咨询内容" />
        <button type="submit" :disabled="busy || !input.trim()">{{ busy ? '整理中' : '发送' }}</button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.consult-workspace { min-height: calc(100dvh - 96px); overflow: hidden; color: #4f4a60; }
.consult-panel { position: relative; display: grid; grid-template-rows: auto minmax(0, 1fr) auto auto; min-height: 0; height: 100%; padding: 24px 32px 28px; background: radial-gradient(ellipse at 96% 0%, rgba(232,225,244,.24), transparent 35%); }.consult-notice { margin: 0; padding: 13px 17px; border: 1px solid rgba(236,223,195,.62); border-radius: 8px; color: #9a855a; background: rgba(255,250,236,.56); font-size: 14px; line-height: 1.5; }
.consult-modules { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; max-width: 1180px; padding: 20px 0 12px; }.consult-module { position: relative; display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto auto auto; column-gap: 15px; align-content: start; min-height: 178px; padding: 21px 23px; overflow: hidden; border: 1px solid rgba(225,218,235,.62); border-radius: 10px; color: #6e637a; background: rgba(255,255,255,.38); text-align: left; transition: transform 180ms cubic-bezier(.23,1,.32,1), background 180ms cubic-bezier(.23,1,.32,1), border-color 180ms cubic-bezier(.23,1,.32,1); }.consult-module:hover { transform: translateY(-3px); border-color: rgba(177,157,202,.76); background: rgba(255,255,255,.72); }.consult-module > span { grid-row: span 2; display: grid; place-items: center; width: 42px; height: 42px; border-radius: 11px; color: #917aa9; background: #f1eafa; font-size: 19px; }.consult-module > i { position: absolute; top: 22px; right: 23px; color: #b2a6bc; font-style: normal; font-size: 13px; }.consult-module b { color: #5e536a; font-size: 18px; font-weight: 600; }.consult-module small { margin-top: 6px; color: #9a90a5; font-size: 13px; line-height: 1.5; }.consult-module em { grid-column: 1 / -1; margin-top: 26px; color: #947cad; font-size: 13px; font-style: normal; }.consult-module.urgent > span { color: #ad7590; background: #faedf2; }.consult-module.urgent em { color: #a6728b; }
.conversation { min-height: 0; padding: 23px 10px 10px; overflow-y: auto; }.consult-empty { display: grid; justify-items: center; max-width: 680px; margin: 10px auto 0; color: #857b91; text-align: center; }.consult-empty-mark { display: grid; place-items: center; width: 70px; height: 70px; border-radius: 24px; color: #8f79a8; background: #efe9f7; font-size: 27px; }.consult-empty h2 { margin: 20px 0 9px; color: #5d516a; font: 500 31px/1.3 var(--display); }.consult-empty p { margin: 0; font-size: 15px; }.suggestions { display: grid; gap: 11px; width: min(100%, 610px); margin-top: 28px; }.suggestions button { padding: 14px 17px; border: 1px solid rgba(223,214,234,.9); border-radius: 9px; color: #776a85; background: rgba(255,255,255,.65); font-size: 14px; text-align: left; }.suggestions button:hover { border-color: #b9a8cb; background: #fbf9fd; }
.message { display: grid; grid-template-columns: 31px minmax(0, 1fr); gap: 10px; max-width: 780px; margin-bottom: 19px; }.message.user { grid-template-columns: minmax(0, 1fr) 31px; margin-left: auto; }.message.user .message-avatar { grid-column: 2; }.message.user .message-content { grid-column: 1; grid-row: 1; text-align: right; }.message-avatar { display: grid; place-items: center; width: 31px; height: 31px; border-radius: 9px; color: #fff; background: #9c88b2; font-size: 12px; }.message.user .message-avatar { background: #b6a7c6; }.message-content { min-width: 0; }.message-content p { margin: 2px 0 6px; color: #887c94; font-size: 10px; }.message-content div { padding: 12px 14px; border: 1px solid rgba(227,220,236,.64); border-radius: 4px 11px 11px; color: #5d5668; background: rgba(255,255,255,.59); font-size: 13px; line-height: 1.75; white-space: pre-wrap; }.message.user .message-content div { border-radius: 11px 4px 11px 11px; background: rgba(234,227,244,.7); }.thinking { margin: 0 0 0 41px; color: #9b90a5; font-size: 11px; }
.consult-input { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; padding: 16px 0 0; border-top: 1px solid rgba(226,219,235,.64); }.consult-input input { min-width: 0; height: 54px; padding: 0 17px; border: 1px solid rgba(222,214,233,.86); border-radius: 9px; color: #5d5668; background: rgba(255,255,255,.68); font: inherit; font-size: 15px; }.consult-input input:focus { outline: 2px solid rgba(165,143,193,.22); border-color: #b9a5cd; }.consult-input button { min-width: 98px; border: 0; border-radius: 9px; color: #fff; background: #9581ad; font: inherit; font-size: 15px; }.consult-input button:disabled { cursor: not-allowed; opacity: .5; }
@media (max-width: 760px) { .consult-workspace { min-height: calc(100dvh - 112px); }.consult-panel { padding: 16px; }.consult-modules { gap: 10px; padding-bottom: 10px; }.consult-module { min-height: 154px; padding: 14px; column-gap: 10px; }.consult-module > span { width: 36px; height: 36px; font-size: 17px; }.consult-module > i { top: 14px; right: 14px; }.consult-module b { font-size: 15px; }.consult-module small, .consult-module em { font-size: 11px; }.consult-module em { margin-top: 18px; }.consult-empty { margin-top: 8px; }.consult-empty h2 { font-size: 25px; }.consult-empty p { font-size: 13px; }.suggestions button { padding: 12px 14px; font-size: 13px; }.message { max-width: 100%; }.consult-notice { font-size: 12px; }.consult-input input { height: 50px; font-size: 14px; }.consult-input button { min-width: 78px; font-size: 14px; } }
</style>
