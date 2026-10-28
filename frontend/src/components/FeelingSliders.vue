<script setup>
import { computed, ref, watch } from 'vue'
import { requireLogin } from '../auth'
import DreamClarityBridge from './DreamClarityBridge.vue'
import { today } from '../api'

const props = defineProps({ category: { type: String, required: true }, day: { type: String, default: today } })
const values = ref({})
const status = ref('滑动记下感受，仅保存在本机，不计入健康评分。')
const definitions = {
  sleep: [
    { id: 'rest', title: '睡眠安稳度', start: '容易醒来', end: '一夜安稳' },
    { id: 'energy', title: '醒后精神', start: '仍有倦意', end: '精神充沛' },
    { id: 'relax', title: '睡前放松度', start: '思绪纷杂', end: '身心舒缓' }
  ],
  activity: [
    { id: 'effort', title: '运动用力感', start: '轻松舒展', end: '十分费力' },
    { id: 'recovery', title: '运动后舒适度', start: '有些疲惫', end: '轻盈舒适' }
  ],
  nutrition: [
    { id: 'fullness', title: '餐后饱腹感', start: '仍有饥饿感', end: '非常饱足' },
    { id: 'comfort', title: '餐后舒适度', start: '有些不适', end: '轻松舒适' }
  ],
  mood: [
    { id: 'calm', title: '此刻平静感', start: '有些紧绷', end: '平静放松' },
    { id: 'energy', title: '今日活力', start: '想慢一点', end: '充满活力' }
  ]
}
const items = computed(() => definitions[props.category] || [])
const storageKey = computed(() => `mengsu-feelings-v1:${props.category}:${props.day}`)
watch(storageKey, () => {
  values.value = {}
  status.value = '滑动记下感受，仅保存在本机，不计入健康评分。'
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey.value) || '{}')
    for (const item of items.value) if (Number.isInteger(saved?.[item.id]) && saved[item.id] >= 1 && saved[item.id] <= 10) values.value[item.id] = saved[item.id]
  } catch {}
}, { immediate: true })
function commit(id, value) {
  if (!requireLogin()) { status.value = '请登录后保存，当前选择已保留。'; return }
  values.value[id] = value
  try { localStorage.setItem(storageKey.value, JSON.stringify(values.value)); status.value = `${props.day} 的感受已保存到本机。` }
  catch { status.value = '未能保存，请检查浏览器存储设置。' }
}
</script>

<template>
  <section class="feeling-sliders" aria-label="主观感受记录">
    <div class="feeling-heading"><h2>轻轻记下此刻的感受</h2><p role="status">{{ status }}</p></div>
    <div class="feeling-grid">
      <div v-for="item in items" :key="item.id" class="feeling-item">
        <DreamClarityBridge :model-value="values[item.id] ?? 5" :title="item.title" :start-label="item.start" :end-label="item.end" @update:model-value="value => values[item.id] = value" @commit="value => commit(item.id, value)" />
        <span v-if="values[item.id] == null" class="unrecorded">尚未记录 · 拖动后保存</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.feeling-sliders{margin:24px 0;color:#756381}.feeling-heading{margin-bottom:14px}.feeling-heading h2{font:500 18px/1.5 var(--display);margin:0 0 5px}.feeling-heading p{font-size:12px;line-height:1.7;color:#9b8ba6;margin:0}.feeling-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr));gap:14px}.feeling-item{position:relative;min-width:0}.feeling-item :deep(.dream-clarity-scope){padding:20px!important;border:1px solid #eee7f3;border-radius:18px;background:linear-gradient(130deg,rgba(253,250,255,.8),rgba(245,244,252,.65))}.feeling-item :deep(h2){font-size:16px}.feeling-item :deep(.dream-clarity-scope > p){font-size:11px}.feeling-item :deep(.dream-clarity-scope > div:last-child){font-size:12px}.unrecorded{display:block;margin:6px 4px 0;color:#a394ae;font-size:10px}
@media(max-width:600px){.feeling-grid{grid-template-columns:1fr}.feeling-item :deep(.dream-clarity-scope){padding:18px!important}}
</style>
