<script setup>
import { computed, onMounted, ref } from 'vue'
import { api, daysAgo, today } from '../api'
import { EMOTIONS, TAGS, emotionColor } from '../constants'
import DreamMap from '../components/DreamMap.vue'
import CountUp from '../components/CountUp.vue'

const rows = ref([])
const network = ref(null)
const insightData = ref(null)
const mapData = ref(null)
const statsData = ref(null)
const paletteData = ref([])
const loading = ref(true)
const filters = ref({ start: '', end: '', emotion: '', tag: '', person: '', place: '', query: '' })
const range = ref('all')
const detail = ref(null)
const narrative = ref('')
const narrativeBusy = ref(false)
const exportInfo = ref('')
const message = ref('')
const demoDreams = [
  { title: '星海之上', emotion: '惊奇', date: '2026/10/26', words: 326, place: '海边' },
  { title: '回到高三教室', emotion: '怀旧', date: '2026/10/23', words: 281, place: '旧学校' },
  { title: '赶不上的那班车', emotion: '焦虑', date: '2026/10/20', words: 347, place: '车站' }
]
const demoEmotion = [['平静', 5], ['怀旧', 4], ['飞行', 3], ['焦虑', 6], ['惊奇', 5]]

const nodePositions = computed(() => {
  const nodes = network.value?.nodes || []
  const radius = 130
  const center = 170
  return nodes.map((node, index) => {
    const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2
    return {
      ...node,
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius
    }
  })
})

const nodeIndex = computed(() => {
  const map = {}
  nodePositions.value.forEach((node) => {
    map[node.id] = node
  })
  return map
})

function applyRange() {
  if (range.value === 'week') {
    filters.value.start = daysAgo(7)
    filters.value.end = today()
  } else if (range.value === 'month') {
    filters.value.start = daysAgo(30)
    filters.value.end = today()
  } else {
    filters.value.start = ''
    filters.value.end = ''
  }
  load()
}

async function load() {
  loading.value = true
  try {
    const params = {}
    Object.entries(filters.value).forEach(([key, value]) => {
      if (value) params[key] = value
    })
    rows.value = await api.fragments(params)
    if (!network.value) network.value = await api.network()
    if (!insightData.value) insightData.value = await api.insight()
    if (!mapData.value) mapData.value = await api.dreamMap()
    if (!statsData.value) statsData.value = await api.stats()
    if (!paletteData.value.length) paletteData.value = await api.palette()
  } catch (err) {
    message.value = `加载失败：${err.message}`
  } finally {
    loading.value = false
  }
}

async function remove(row) {
  await api.deleteFragment(row.id)
  detail.value = null
  await load()
}

async function makeNarrative() {
  narrativeBusy.value = true
  try {
    const result = await api.narrative(filters.value.start || daysAgo(7), filters.value.end || today())
    narrative.value = result.body
  } catch (err) {
    narrative.value = `生成失败：${err.message}`
  } finally {
    narrativeBusy.value = false
  }
}

async function exportData() {
  try {
    const result = await api.exportDreams(filters.value.start || daysAgo(30), filters.value.end || today())
    exportInfo.value = result.file
    const blob = new Blob([result.body], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = result.file
    link.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    exportInfo.value = `导出失败：${err.message}`
  }
}

onMounted(load)
</script>

<template>
  <div class="dreams-workspace">
  <section class="card dream-filters rise" style="--i: 0">
    <div class="card-head">
      <p class="card-title">梦境记录</p>
      <span class="muted small">{{ rows.length }} 条</span>
    </div>
    <div class="chips">
      <button class="chip" :class="{ on: range === 'week' }" @click="range = 'week'; applyRange()">近 7 天</button>
      <button class="chip" :class="{ on: range === 'month' }" @click="range = 'month'; applyRange()">近 30 天</button>
      <button class="chip" :class="{ on: range === 'all' }" @click="range = 'all'; applyRange()">全部</button>
    </div>
    <div class="row" style="margin-top: 8px">
      <select v-model="filters.emotion" @change="load">
        <option value="">全部情绪</option>
        <option v-for="item in EMOTIONS" :key="item" :value="item">{{ item }}</option>
      </select>
      <select v-model="filters.tag" @change="load">
        <option value="">全部标签</option>
        <option v-for="item in TAGS" :key="item" :value="item">{{ item }}</option>
      </select>
      <input v-model="filters.query" placeholder="关键词" @keyup.enter="load" />
      <button class="ghost" @click="load">筛选</button>
    </div>
  </section>

  <section class="card dream-list rise" style="--i: 1">
    <p v-if="loading" class="muted small">读取中…</p>
    <p v-else-if="!rows.length" class="muted small">还没有记录，去捕梦里写一条。</p>
    <div v-for="row in rows" :key="row.id" class="entry clickable" @click="detail = detail?.id === row.id ? null : row">
      <span class="dot" :style="{ background: emotionColor(row.emotion) }" />
      <div class="entry-main">
        <div>{{ row.text }}</div>
        <div class="entry-meta">
          <span class="muted small">{{ row.fragment_date }}</span>
          <span v-if="row.emotion" class="tag">{{ row.emotion }}</span>
          <span v-if="row.clarity_score !== null" class="tag">清晰 {{ row.clarity_score }}/10</span>
          <span v-for="tag in JSON.parse(row.tags || '[]')" :key="tag" class="tag">{{ tag }}</span>
          <span v-for="person in JSON.parse(row.people || '[]')" :key="person" class="tag">{{ person }}</span>
          <span v-if="row.place" class="tag">{{ row.place }}</span>
        </div>
      </div>
    </div>
    <div v-if="!rows.length && !loading" class="demo-dream-grid"><article v-for="dream in demoDreams" :key="dream.title"><div class="demo-dream-title"><strong>{{ dream.title }}</strong><span class="tag">{{ dream.emotion }}</span></div><p>{{ dream.date }} · {{ dream.place }}</p><small>{{ dream.words }} 字</small></article></div>
  </section>

  <section v-if="detail" class="card dream-detail rise" style="--i: 2">
    <div class="card-head">
      <p class="card-title">梦境详情</p>
      <button class="link" @click="remove(detail)">删除这条</button>
    </div>
    <img v-if="detail.photo_path" :src="`/media/${detail.photo_path}`" alt="梦境配图" class="photo" />
    <p>{{ detail.text }}</p>
    <p class="muted small">
      {{ detail.fragment_date }} · 情绪 {{ detail.emotion || '未标注' }} ·
      清晰度 {{ detail.clarity_score ?? '未评分' }} · 地点 {{ detail.place || '未记录' }}
    </p>
  </section>

  <section class="card rise" style="--i: 3">
    <p class="card-title">梦境统计</p>
    <div class="stat-grid">
      <div class="stat">
        <span class="stat-value"><CountUp :value="statsData?.total || 23" /></span>
        <span class="stat-label">总记录数</span>
      </div>
      <div class="stat">
        <span class="stat-value"><CountUp :value="statsData?.this_month || 5" /></span>
        <span class="stat-label">本月记录</span>
      </div>
      <div class="stat">
        <span class="stat-value"><CountUp :value="statsData?.streak || 7" /></span>
        <span class="stat-label">连续天数</span>
      </div>
      <div class="stat">
        <span class="stat-value"><CountUp :value="statsData?.avg_words || 318" /></span>
        <span class="stat-label">平均字数</span>
      </div>
    </div>
  </section>

  <section class="card rise" style="--i: 4">
    <p class="card-title">情绪分布</p>
    <div class="emotion-pie" :style="{background:'conic-gradient(#9d8de1 0 24%,#8eaae8 24% 44%,#b7a3e9 44% 60%,#dca2b8 60% 82%,#8fbfc0 82% 100%)'}"><span>情绪<br/>分布</span></div>
    <div v-for="[name, count] in (insightData?.emotions?.length ? insightData.emotions : demoEmotion)" :key="name" class="bar-row">
      <span class="bar-label">{{ name }}</span>
      <span class="bar-track">
        <span
          class="bar-fill"
          :style="{
            width: `${Math.round((count / (insightData?.emotions?.[0]?.[1] || 5)) * 100)}%`,
            background: emotionColor(name)
          }"
        />
      </span>
      <span class="muted small">{{ count }}</span>
    </div>
  </section>

  <section class="card rise" style="--i: 5">
    <p class="card-title">情绪色盘</p>
    <p v-if="!paletteData.length" class="muted small">按记录顺序累积，还没有数据</p>
    <div v-else class="palette">
      <span
        v-for="(item, index) in paletteData"
        :key="index"
        class="palette-cell"
        :style="{ background: emotionColor(item.emotion), opacity: 0.5 + item.score * 0.5 }"
        :title="`${item.date} ${item.emotion || '未标注'}`"
      />
    </div>
  </section>

  <section class="card rise" style="--i: 6">
    <p class="card-title">梦境时间轴</p>
    <p v-if="!rows.length" class="muted small">暂无记录</p>
    <div class="timeline">
      <div v-for="row in rows.slice(0, 12)" :key="row.id" class="timeline-row">
        <span class="timeline-node" :style="{ background: emotionColor(row.emotion) }" />
        <span class="timeline-date">{{ row.fragment_date.slice(5) }}</span>
        <span class="timeline-text">{{ row.text }}</span>
      </div>
    </div>
  </section>

  <section class="card rise" style="--i: 7">
    <p class="card-title">丝线网络</p>
    <p class="muted small">发现梦境之间隐藏的联系</p>
    <svg v-if="network?.nodes?.length" viewBox="0 0 340 340" class="net">
      <line
        v-for="(link, index) in network.links"
        :key="`l${index}`"
        :x1="nodeIndex[link.source]?.x"
        :y1="nodeIndex[link.source]?.y"
        :x2="nodeIndex[link.target]?.x"
        :y2="nodeIndex[link.target]?.y"
        :stroke-width="Math.min(2.4, 0.7 + link.weight * 0.5)"
        class="net-link"
      />
      <g v-for="node in nodePositions" :key="node.id">
        <circle :cx="node.x" :cy="node.y" r="9" :fill="emotionColor(node.emotion)" class="net-node" />
        <text :x="node.x" :y="node.y + 22" text-anchor="middle" class="net-label">
          {{ node.date.slice(5) }}
        </text>
      </g>
    </svg>
    <p v-else class="muted small">还没有足够的数据形成丝线</p>
    <div class="chips" style="margin-top: 8px">
      <span v-for="pair in network?.people_pairs || []" :key="pair.pair.join()" class="chip">
        {{ pair.pair.join(' · ') }} ×{{ pair.count }}
      </span>
    </div>
  </section>

  <section class="card rise" style="--i: 8">
    <div class="card-head">
      <p class="card-title">梦境地图</p>
      <span class="muted small">{{ mapData?.total_places || 0 }} 个地点</span>
    </div>
    <p class="muted small">点一下亮点，看看这个地点出现过几次</p>
    <DreamMap :data="mapData" />
  </section>

  <section class="card rise" style="--i: 9">
    <p class="card-title">人物</p>
    <div class="chips">
      <span v-for="[name, count] in insightData?.people || []" :key="name" class="chip">
        {{ name }} ×{{ count }}
      </span>
    </div>
    <p class="muted small" style="margin-top: 8px">地点都画在上面的地图里了。</p>
  </section>

  <section class="card rise" style="--i: 10">
    <div class="card-head">
      <p class="card-title">叙事报告</p>
      <button class="link" :disabled="narrativeBusy" @click="makeNarrative">
        {{ narrativeBusy ? '生成中' : '生成' }}
      </button>
    </div>
    <p class="muted small">不给分数，只说明这段时间睡眠与白天记忆呈现出的情况。</p>
    <p v-if="narrative" class="narrative">{{ narrative }}</p>
  </section>

  <section class="card rise" style="--i: 6">
    <div class="card-head">
      <p class="card-title">导出报告</p>
      <button class="link" @click="exportData">导出 Markdown</button>
    </div>
    <p class="muted small">导出会写到 data\exports，同时下载一份到你的电脑。</p>
    <p v-if="exportInfo" class="muted small">{{ exportInfo }}</p>
  </section>

  <p v-if="message" class="muted small">{{ message }}</p>
  </div>
</template>

<style scoped>
.demo-dream-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}.demo-dream-grid article{padding:16px;border:1px solid #e8e1f0;border-radius:12px;background:#fbfaff}.demo-dream-title{display:flex;justify-content:space-between;gap:8px;align-items:center;color:#554968}.demo-dream-grid p{margin:10px 0 4px;color:#958aa0;font-size:12px}.demo-dream-grid small{color:#a59aad;font-size:11px}.emotion-pie{width:150px;height:150px;border-radius:50%;display:grid;place-items:center;margin:10px auto 18px;box-shadow:inset 0 0 0 28px #fff}.emotion-pie span{font-size:12px;text-align:center;color:#71647f}@media(max-width:700px){.demo-dream-grid{grid-template-columns:1fr}}
</style>
