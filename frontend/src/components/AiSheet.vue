<script setup>
import { nextTick, onMounted, ref } from 'vue'
import { api } from '../api'

const emit = defineEmits(['close'])

const EXAMPLES = [
  '我的梦最近有什么规律？',
  '为什么我总是梦到同一个地方？',
  '最近情绪怎么样？',
  '给我分析一下最近一周的梦',
  '我的梦境里出现最多的是什么？',
  '帮我解读最近印象最深的梦'
]

const models = ref([{ id: 'qwen', name: '千问', ready: false }])
const model = ref('qwen')
const input = ref('')
const busy = ref(false)
const body = ref(null)
const messages = ref([
  { role: 'ai', text: '你好，我是梦境AI。\n有什么关于梦境的问题，随时问我。' }
])

async function loadModels() {
  try {
    models.value = await api.models()
  } catch (err) {
    models.value = [{ id: 'qwen', name: '千问', ready: false }]
  }
}

async function send(text) {
  const value = (text ?? input.value).trim()
  if (!value || busy.value) return
  input.value = ''
  messages.value.push({ role: 'me', text: value })
  busy.value = true
  await scrollDown()
  try {
    const result = await api.ask(value)
    const evidence = (result.evidence || []).map((row) => `${row.fragment_date} ${row.text}`).join('\n')
    messages.value.push({
      role: 'ai',
      text: evidence ? `${result.answer}\n\n依据记录：\n${evidence}` : result.answer
    })
  } catch (err) {
    messages.value.push({ role: 'ai', text: `这次没连上模型：${err.message}` })
  } finally {
    busy.value = false
    await scrollDown()
  }
}

async function scrollDown() {
  await nextTick()
  if (body.value) body.value.scrollTop = body.value.scrollHeight
}

onMounted(loadModels)
</script>

<template>
  <div class="sheet-mask" @click.self="emit('close')">
    <section class="sheet">
      <div class="sheet-head">
        <div>
          <p class="sheet-title">梦境AI</p>
          <p class="sheet-sub">AI 助手 · 基于你的记录回答</p>
        </div>
        <button class="sheet-close" @click="emit('close')">×</button>
      </div>

      <div class="model-row">
        <button
          v-for="item in models"
          :key="item.id"
          class="model"
          :class="{ on: model === item.id }"
          :disabled="!item.ready"
          :title="item.ready ? '' : '还没接入'"
          @click="model = item.id"
        >
          {{ item.name }}{{ item.ready ? '' : ' · 未接入' }}
        </button>
      </div>

      <div ref="body" class="sheet-body">
        <div v-for="(message, index) in messages" :key="index" class="bubble" :class="{ mine: message.role === 'me' }">
          {{ message.text }}
        </div>
        <p v-if="!messages.some((item) => item.role === 'me')" class="muted small">试试问我</p>
        <div class="chips">
          <button v-for="item in EXAMPLES" :key="item" class="chip" @click="send(item)">{{ item }}</button>
        </div>
      </div>

      <div class="sheet-input">
        <input v-model="input" placeholder="输入你的问题…" @keyup.enter="send()" />
        <button :disabled="busy" @click="send()">{{ busy ? '翻记录' : '发送' }}</button>
      </div>
    </section>
  </div>
</template>
