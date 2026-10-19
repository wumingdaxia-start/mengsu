<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../api'
import CountUp from '../components/CountUp.vue'

const question = ref('')
const answer = ref('')
const evidence = ref([])
const busy = ref(false)
const stats = ref(null)
const insightData = ref(null)
const memoryState = ref('')
const memoryQuery = ref('')
const memoryText = ref('')

const examples = ['我们聊过多少次关于父亲的梦？', '最近哪些人物出现', '哪些地方反复出现', '最近情绪怎么样']

async function load() {
  stats.value = await api.stats()
  insightData.value = await api.insight()
  try {
    const tools = await api.memoryTools()
    memoryState.value = tools.connected
      ? `长期记忆在线，可用工具 ${tools.tools.length} 个`
      : tools.reason
  } catch (err) {
    memoryState.value = `长期记忆不可用：${err.message}`
  }
}

async function ask(text) {
  const value = (text ?? question.value).trim()
  if (!value) return
  question.value = value
  busy.value = true
  answer.value = ''
  evidence.value = []
  try {
    const result = await api.ask(value)
    answer.value = result.answer
    evidence.value = result.evidence || []
  } catch (err) {
    answer.value = `提问失败：${err.message}`
  } finally {
    busy.value = false
  }
}

async function recall() {
  if (!memoryQuery.value.trim()) return
  try {
    const result = await api.memoryRecall(memoryQuery.value.trim())
    memoryText.value = result.ok ? result.text : result.reason
  } catch (err) {
    memoryText.value = `检索失败：${err.message}`
  }
}

function topOf(list) {
  return list && list.length ? list[0][0] : '暂无'
}

onMounted(load)
</script>

<template>
  <div class="ask-workspace">
  <section class="ask-overview rise" style="--i: 0">
    <p class="section-title">夜谭 · 潜意识透视</p>
    <div class="stat-grid">
      <div class="stat">
        <span class="stat-value"><CountUp :value="stats?.streak || 0" /></span>
        <span class="stat-label">连续记录</span>
      </div>
      <div class="stat">
        <span class="stat-value"><CountUp :value="stats?.total || 0" /></span>
        <span class="stat-label">梦境总数</span>
      </div>
      <div class="stat">
        <span class="stat-value small-value">{{ topOf(insightData?.people) }}</span>
        <span class="stat-label">最常出现人物</span>
      </div>
      <div class="stat">
        <span class="stat-value small-value">{{ topOf(insightData?.places) }}</span>
        <span class="stat-label">最常出现地点</span>
      </div>
    </div>
    <p class="muted small" style="margin-top: 8px">
      平均情绪分 {{ stats?.avg_mood ?? '样本不足' }} ·
      AI 分析基于 {{ stats?.total || 0 }} 条梦境记录
    </p>
  </section>

  <section class="card rise" style="--i: 1">
    <p class="card-title">问点什么</p>
    <div class="chips">
      <button v-for="item in examples" :key="item" class="chip" @click="ask(item)">{{ item }}</button>
    </div>
    <div class="row" style="margin-top: 10px">
      <input v-model="question" placeholder="继续提问…" @keyup.enter="ask()" />
      <button :disabled="busy" @click="ask()">{{ busy ? '翻记录中' : '提问' }}</button>
    </div>
  </section>

  <section v-if="answer" class="card ask-answer rise" style="--i: 2">
    <p class="card-title">回答</p>
    <p class="narrative">{{ answer }}</p>
    <div v-if="evidence.length" style="margin-top: 10px">
      <p class="muted small">依据 {{ evidence.length }} 条记录</p>
      <div v-for="row in evidence" :key="row.id" class="entry">
        <span class="muted small">{{ row.fragment_date }}</span>
        <span>{{ row.text }}</span>
      </div>
    </div>
  </section>

  <section class="card ask-memory rise" style="--i: 3">
    <p class="card-title">长期记忆检索</p>
    <p class="muted small">{{ memoryState }}</p>
    <div class="row" style="margin-top: 8px">
      <input v-model="memoryQuery" placeholder="按关键词翻长期记忆，比如 两点 / 导师" @keyup.enter="recall" />
      <button class="ghost" @click="recall">翻一翻</button>
    </div>
    <pre v-if="memoryText" class="memory-text">{{ memoryText }}</pre>
  </section>
  </div>
</template>
