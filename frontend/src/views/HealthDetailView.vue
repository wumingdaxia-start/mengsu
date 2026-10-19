<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, today } from '../api'
const props = defineProps({ section: { type: String, required: true } })
const router = useRouter()
const records = ref(null)
const error = ref('')
const loading = ref(true)
const pages = {
  activity: { title: '日常锻炼', caption: 'MOVEMENT', intro: '留意身体活动，也给休息留出位置。', empty: '还没有专门的活动记录', detail: '步数、活动时长和运动类型尚未接入。可以先在日记中留下今天的活动经历，原文会保存。', prompts: ['今天做了什么活动？', '活动后感觉怎样？', '什么时候需要休息？'] },
  nutrition: { title: '饮食健康', caption: 'NOURISHMENT', intro: '从一餐一饮，慢慢认识自己的日常。', empty: '还没有专门的饮食记录', detail: '饮食分类与营养统计尚未接入。可以先用日记记录吃了什么、饮水情况与餐后感受，不会自动编造热量。', prompts: ['今天吃了什么？', '饮水情况如何？', '餐后有什么感受？'] },
  sleep: { title: '睡眠监测', caption: 'REST & DREAMS', intro: '时长之外，醒来后的感受也值得被看见。', empty: '今天还没有睡眠记录', detail: '记录入睡、醒来时间，或只说说醒来后的感觉。设备尚未接入，不推测睡眠分期。', prompts: ['大概什么时候入睡？', '夜里是否醒来？', '醒来后的感受如何？'] },
  analysis: { title: '安全健康分析', caption: 'HEALTH REFLECTION', intro: '把已有记录放在一起，分清知道的与尚不清楚的。', empty: '先积累记录，再回看变化', detail: '目前仅展示已保存记录的覆盖情况，不生成健康评分，也不据此判断疾病风险。', prompts: ['活动与饮食：尚未接入统计', '心率与睡眠分期：设备未接入', '睡眠与梦境：来自你的记录'] }
}
const page = computed(() => pages[props.section])
const sleepRows = computed(() => records.value?.sleep || [])
onMounted(async () => {
  try { records.value = await api.day(today()) }
  catch (err) { error.value = `记录加载失败：${err.message}` }
  finally { loading.value = false }
})
</script>

<template>
  <div class="health-detail">
    <header class="detail-heading"><p>{{ today() }} · {{ page.caption }}</p><h1>{{ page.title }}</h1><span>{{ page.intro }}</span></header>
    <p v-if="error" role="alert" class="load-error">{{ error }}</p>
    <p v-if="loading" class="load-note">正在读取当天记录……</p>
    <section v-else class="detail-panel">
      <template v-if="section === 'sleep' && sleepRows.length">
        <h2>今天的睡眠记录</h2>
        <article v-for="row in sleepRows" :key="row.id" class="sleep-entry">
          <dl><div><dt>入睡</dt><dd>{{ row.sleep_at?.replace('T', ' ') || '未填写' }}</dd></div><div><dt>醒来</dt><dd>{{ row.wake_at?.replace('T', ' ') || '未填写' }}</dd></div><div><dt>醒后感受</dt><dd>{{ row.feeling || '未填写' }}</dd></div></dl>
        </article>
      </template>
      <template v-else><h2>{{ page.empty }}</h2><p>{{ page.detail }}</p></template>
      <div v-if="section === 'analysis' && records" class="coverage"><span>日间笔记 <b>{{ records.notes?.length || 0 }}</b></span><span>睡眠记录 <b>{{ sleepRows.length }}</b></span><span>梦境片段 <b>{{ records.fragments?.length || 0 }}</b></span></div>
      <div class="detail-actions"><button @click="router.push('/capture')">{{ section === 'analysis' ? '补充日记' : '写一条记录' }}</button><button v-if="section === 'sleep'" class="secondary" @click="router.push('/dreams')">回看梦境</button><button v-if="section === 'analysis'" class="secondary" @click="router.push('/ask')">聊聊最近的状态</button></div>
    </section>
    <section class="detail-notes"><h2>{{ section === 'analysis' ? '数据来源与边界' : '可以从这里开始' }}</h2><div class="prompt-grid"><article v-for="(prompt, index) in page.prompts" :key="prompt"><span>0{{ index + 1 }}</span><p>{{ prompt }}</p></article></div></section>
    <p class="detail-foot">{{ section === 'analysis' ? '这里只做记录整理与健康陪伴，不替代专业评估。' : '不必一次写全，按自己的节奏补充。' }}</p>
  </div>
</template>

<style scoped>
.health-detail { color: #62566f; min-height: 70dvh; }
.detail-heading { margin-bottom: 30px; padding: 24px 0; }
.detail-heading > p { margin: 0 0 8px; color: #9b8ba7; font-size: 12px; }
.detail-heading h1 { margin: 0 0 12px; color: #544661; font: 600 28px/1.4 var(--display); }
.detail-heading > span { color: #8b7d97; font-size: 15px; }
.detail-panel { padding: clamp(22px, 4vw, 44px); border: 1px solid #e7ddec; border-radius: 12px; background: linear-gradient(115deg, #f1eaf8, #fbf7fc); }
.detail-panel h2, .detail-notes h2 { margin: 0 0 12px; font: 500 20px/1.5 var(--display); color: #655073; }
.detail-panel > p { max-width: 650px; margin: 0; color: #8b7c96; font-size: 15px; }
.detail-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 28px; }
.detail-actions button { min-height: 44px; border-radius: 7px; background: #937ba7; color: white; font-size: 14px; }
.detail-actions .secondary { border-color: #dfd2e9; color: #897098; background: #fffafc; }
.detail-notes { margin-top: 36px; }
.prompt-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.prompt-grid article { padding: 22px; background: #fff; border: 1px solid #e9e0ef; border-radius: 8px; }
.prompt-grid article > span { color: #b49ac5; font-size: 12px; }
.prompt-grid p { margin: 12px 0 0; font-size: 15px; color: #80708d; }
.detail-foot { margin-top: 26px; color: #a094aa; font-size: 12px; }
.coverage { display: flex; gap: 26px; flex-wrap: wrap; margin-top: 24px; font-size: 14px; }
.coverage b { margin-left: 8px; color: #80618f; }
dl { margin: 0; } dl > div { display: flex; gap: 20px; padding: 8px 0; } dt { min-width: 75px; color: #a08bab; } dd { margin: 0; overflow-wrap: anywhere; }
.sleep-entry + .sleep-entry { margin-top: 18px; border-top: 1px solid #e5daed; padding-top: 18px; }
.load-error { color: #a35c7c; overflow-wrap: anywhere; } .load-note { color: #95849f; }
@media(max-width: 620px) { .prompt-grid { grid-template-columns: 1fr; gap: 10px; } .detail-heading { padding: 10px 0; } .detail-heading h1 { font-size: 25px; } .prompt-grid article { padding: 18px; } }
</style>
