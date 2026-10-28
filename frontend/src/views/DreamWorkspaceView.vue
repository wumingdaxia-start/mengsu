<script setup>
import { onMounted, ref } from 'vue'
import { api, shortDay } from '../api'
import { emotionColor } from '../constants'
const props = defineProps({ go: { type: Function, default: () => {} } })
const data = ref(null)
const error = ref('')
const loading = ref(true)
async function load() {
  loading.value = true
  error.value = ''
  try { data.value = await api.home() }
  catch { error.value = '梦境记录暂时没有加载成功，请稍后重试。' }
  finally { loading.value = false }
}
onMounted(load)
</script>
<template>
  <div class="dream-home">
    <header class="dream-page-heading"><p>鱼庭 / 梦境与记忆</p><h1>梦境总览</h1><span>记下梦里发生的事，也留意醒来后的感受。</span></header>
    <section class="dream-writing">
      <div><p class="dream-kicker">醒来之后，记忆还在。</p><h2>昨夜的梦，<br />还记得哪一段？</h2><p>一个画面、一句话，或一种说不清的感受。<br />不需要完整，记得多少就写多少。</p><button class="dream-primary" @click="props.go('capture')">写下一段梦 <span aria-hidden="true">↗</span></button></div>
      <div class="dream-paper" aria-label="最近的梦境片段"><span>{{ data?.recent?.length ? '最近留下的一页' : '等待你的第一段梦' }}</span><blockquote>{{ data?.recent?.[0]?.text || '有些梦醒来就散了，有些片段，值得慢慢记住。' }}</blockquote><small>{{ data?.recent?.[0]?.fragment_date || '从一段真实的记录开始' }}</small></div>
    </section>
    <section class="dream-numbers" aria-label="梦境记录统计"><div><span>已留下的梦</span><strong>{{ data?.stats?.total ?? '—' }}<small> 条</small></strong></div><div><span>这个月的记录</span><strong>{{ data?.stats?.this_month ?? '—' }}<small> 条</small></strong></div><div><span>连续记录</span><strong>{{ data?.stats?.streak ?? '—' }}<small> 天</small></strong></div></section>
    <div class="dream-columns">
      <section class="dream-recent-panel"><div class="dream-section-title"><h2>最近的梦</h2><button @click="props.go('dreams')">打开梦境档案 →</button></div><p v-if="loading" class="dream-empty">正在读取你的梦境记录…</p><div v-else-if="error" class="dream-empty" role="status">{{ error }} <button @click="load">重新加载</button></div><div v-else-if="!data?.recent?.length" class="dream-empty"><p>还没有梦境记录。下次醒来时，试着记下最先想起的片段。</p><button @click="props.go('capture')">记下第一个梦 →</button></div><button v-for="row in (data?.recent || []).slice(0, 4)" :key="row.id" class="dream-record" @click="props.go('dreams')"><span class="dream-record-date">{{ shortDay(row.fragment_date) }}</span><span class="dream-record-text">{{ row.text }}</span><span class="dream-emotion" :style="{ color: emotionColor(row.emotion) }">{{ row.emotion || '未标注' }}</span><span aria-hidden="true">↗</span></button></section>
      <aside class="dream-side"><section><span class="dream-kicker">睡前线索</span><h2>给今晚，留一个提示。</h2><p>从日间片段里挑选线索，整理成今晚的睡前提示。</p><button @click="props.go('/dream/cues')">整理睡前线索 →</button></section><section><span class="dream-kicker">梦境对话</span><h2>聊聊那些反复出现的事。</h2><p>回看梦里的人物、地点与情绪，从已有记录出发。</p><button @click="props.go('ask')">打开梦境对话 →</button></section></aside>
    </div>
  </div>
</template>
<style scoped>
.dream-home{max-width:1300px;margin:0 auto;color:#45556a}.dream-page-heading{margin:14px 0 30px}.dream-page-heading>p,.dream-kicker{color:#8091a2;font-size:11px;margin:0 0 8px}.dream-page-heading h1{font:500 29px/1.4 var(--display);margin:0 0 8px;color:#34495d}.dream-page-heading>span{font-size:14px;color:#8491a0}.dream-writing{display:grid;grid-template-columns:1.2fr 1fr;gap:38px;padding:36px;background:rgba(237,244,249,.8);border:1px solid #dfe8ef;border-radius:16px}.dream-writing h2{font:500 32px/1.6 var(--display);color:#40566b;margin:12px 0 17px}.dream-writing p:not(.dream-kicker){font-size:14px;line-height:1.9;color:#7a8c9c}.dream-home button{border-radius:7px;box-shadow:none}.dream-home .dream-primary{display:flex;justify-content:space-between;gap:45px;background:#627f99;color:#fff;font-size:14px;margin-top:22px;padding:11px 17px}.dream-paper{align-self:center;padding:30px;min-height:220px;transform:rotate(-2deg);background:#fffdf8;border:1px solid #e9e4db;border-radius:5px;color:#82909c}.dream-paper>span{font-size:11px}.dream-paper blockquote{display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden;margin:22px 0;font:500 17px/2 var(--display);color:#606b76}.dream-paper small{font-size:11px;color:#9b9e9e}.dream-numbers{display:grid;grid-template-columns:repeat(3,1fr);padding:24px 0;border-bottom:1px solid #dfe7ed}.dream-numbers>div{padding:0 25px;border-right:1px solid #dfe7ed}.dream-numbers>div:first-child{padding-left:0}.dream-numbers>div:last-child{border:0}.dream-numbers span{color:#8393a2;font-size:12px;display:block}.dream-numbers strong{font-size:28px;font-weight:500;color:#536a7f}.dream-numbers small{font-size:12px;color:#95a0aa;font-weight:400}.dream-columns{display:grid;grid-template-columns:1.6fr 1fr;gap:30px;margin-top:32px}.dream-section-title{display:flex;gap:10px;justify-content:space-between;align-items:center}.dream-home h2{font-family:var(--display);font-weight:500}.dream-section-title h2{font-size:20px}.dream-home button:not(.dream-primary){background:transparent;color:#6b859c;padding:6px 0;font-size:12px;border:0}.dream-home button:hover{color:#3e607e}.dream-record{width:100%;display:flex;align-items:center;gap:15px;padding:18px 0!important;border-bottom:1px solid #e1e7ed!important;text-align:left}.dream-record-date{font-size:12px;color:#a1abb5}.dream-record-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#52687c;font-size:14px}.dream-emotion{font-size:11px}.dream-empty{padding:30px 0;color:#8796a4;font-size:14px;line-height:1.8}.dream-side{border-left:1px solid #dfe7ed;padding-left:25px}.dream-side section+section{border-top:1px solid #dfe7ed;margin-top:22px;padding-top:22px}.dream-side h2{font-size:18px;margin:8px 0}.dream-side p{color:#8695a2;font-size:13px;line-height:1.8}.dream-home button:focus-visible{outline:2px solid #879caf;outline-offset:3px}@media(max-width:760px){.dream-writing{grid-template-columns:1fr;padding:24px;gap:20px}.dream-writing h2{font-size:26px}.dream-paper{transform:none}.dream-columns{grid-template-columns:1fr}.dream-side{padding-left:0;border-left:0}.dream-numbers>div{padding:0 12px}.dream-section-title{flex-wrap:wrap}}
</style>
