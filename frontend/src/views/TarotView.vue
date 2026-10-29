<script setup>
import TestResultSave from '../components/TestResultSave.vue'
import { computed, nextTick, ref } from 'vue'
const spreads = [
  ['single','此刻一束光','1 张 · 留意一种需要'], ['three','心绪三问','3 张 · 经历、忽略、小行动'],
  ['diamond','困惑拆信','5 张 · 需要与可用支持'], ['moon','夜航四站','4 张 · 为今天收尾'],
  ['horseshoe','关系照面','7 张 · 表达与边界'], ['celtic','生活展开页','10 张 · 梳理生活的不同侧面']
]
const spread=ref('three'), question=ref(''), result=ref(null), busy=ref(false), error=ref(''), revealed=ref([]), heading=ref(null)
const complete = computed(() => result.value && revealed.value.length === result.value.cards.length)
const meaning = card => card.reflection
const relations = computed(() => {
  if (!complete.value) return []
  return [
    '先选出一张与你的实际经历最贴近的牌，也选出一张不贴近的牌。随机提示可以被认同，也可以被放下。',
    `围绕「${result.value.cards[0].position}」，记下一件已经发生的事实，再写出你对它的感受。`,
    `最后回到「${result.value.cards.at(-1).position}」，选择一件由你决定、可以撤回的小行动。`,
    '如果问题涉及另一个人，把关于对方的猜测改成一个可以直接询问的问题。牌面不能替对方回答。'
  ]
})
const savedResult = computed(() => complete.value ? {type:'tarot',title:`星栈映照 · ${result.value.spread_name}`,summary:result.value.question||'借随机牌面记录一次自我观察',sections:[
  {title:'牌面与反思',lines:result.value.cards.map(c=>`${c.position} · ${c.card}（${c.orientation}）：${c.reflection.theme}。${c.reflection.observation} ${c.reflection.orientation} ${c.reflection.prompt}`)},
  {title:'带回生活',lines:relations.value},
  {title:'本次记录',lines:[`引擎：${result.value.engine}；编号：${result.value.draw_id}`,result.value.method,'传统牌名保留，梦溯独立编写牌阵、反思文本和抽取实现；仅用于娱乐与自我观察。']}
]} : null)
async function draw() {
  if(busy.value) return
  busy.value=true; error.value=''
  try {
    const response=await fetch('/api/tarot/draw',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({spread:spread.value,question:question.value}),signal:AbortSignal.timeout(12000)})
    if(!response.ok) throw new Error('抽取未完成')
    const payload=await response.json()
    if(payload.engine!=='mengsu-reflection-v1'||!payload.cards?.length) throw new Error('请刷新页面后重试')
    result.value=payload; revealed.value=[]; await nextTick(); heading.value?.focus()
  } catch { error.value='暂时无法完成抽牌，请稍后重试。' } finally {busy.value=false}
}
function reveal(index) { if(!revealed.value.includes(index)) revealed.value.push(index) }
function revealAll() { revealed.value=result.value.cards.map((_,i)=>i) }
function reset() { result.value=null; revealed.value=[]; error.value='' }
</script>

<template>
  <div class="tarot-page">
    <header><p class="eyebrow">心绪活动 / TAROT</p><h1>塔罗牌测试</h1><p>星栈映照 · 让随机的牌，成为一次真实的自我提问。</p></header>
    <form v-if="!result" class="tarot-panel" @submit.prevent="draw">
      <h2>今天，想探索什么？</h2><p class="muted">把牌当作自我观察的线索。它不会替你决定未来。</p>
      <label class="question-label" for="tarot-question">想探索的问题 <span>（可选）</span></label>
      <textarea id="tarot-question" v-model="question" maxlength="300" rows="3" placeholder="例如：我想怎样调整最近的生活节奏？"></textarea>
      <fieldset><legend>选择牌阵</legend><div class="spread-options"><label v-for="item in spreads" :key="item[0]" :class="{ selected: spread === item[0] }"><input v-model="spread" type="radio" name="spread" :value="item[0]" /><span><strong>{{ item[1] }}</strong><small>{{ item[2] }}</small></span></label></div></fieldset>
      <p v-if="error" role="alert" class="error">{{ error }}</p><button type="submit" class="primary" :disabled="busy">{{ busy ? '正在洗牌…' : '洗牌并抽取' }}</button><p class="muted fine">翻开全部牌后，可将问题、牌阵与解读保存到心理总览。</p>
    </form>
    <template v-else>
      <section class="tarot-panel">
        <div class="result-heading"><div><p class="eyebrow">你的本次牌阵</p><h2 ref="heading" tabindex="-1">{{ result.spread_name }}</h2></div><button class="secondary" @click="reset">重新选择</button></div>
        <p v-if="result.question" class="question-summary">{{ result.question }}</p><p class="muted">点击牌背逐张翻开，也可以<button class="text-button" @click="revealAll">展开全部牌</button>。已翻开 {{ revealed.length }} / {{ result.cards.length }} 张</p>
        <div class="drawn-cards" :class="{ single: result.cards.length === 1 }">
          <div v-for="(card, index) in result.cards" :key="index" class="card-slot"><p class="position">{{ index + 1 }} · {{ card.position }}</p><button class="tarot-card" :class="{ revealed: revealed.includes(index) }" :aria-label="revealed.includes(index) ? `${card.card}，${card.orientation}` : `翻开第 ${index + 1} 张，${card.position}`" :aria-pressed="revealed.includes(index)" @click="reveal(index)"><template v-if="revealed.includes(index)"><small>{{ card.is_major ? '大阿卡纳' : '小阿卡纳' }}</small><span class="card-symbol" aria-hidden="true">{{ card.is_major ? '✧' : { 权杖: '♧', 圣杯: '☾', 宝剑: '✦', 星币: '◇' }[card.card.slice(0, 2)] }}</span><strong>{{ card.card.replace('Ace', '王牌') }}</strong><span class="orientation">{{ card.orientation }}</span></template><template v-else><span class="back-mark" aria-hidden="true">✧</span><span>点击翻牌</span></template></button></div>
        </div>
      </section>
      <section v-if="revealed.length" class="tarot-panel" aria-live="polite"><h2>牌义与自我提问</h2><p class="muted">以下为梦溯编写的反思提示。牌是随机抽取的，不是对你的经历或未来的判断。</p><article v-for="(card, index) in result.cards" v-show="revealed.includes(index)" :key="card.position" class="reading"><h3>{{ card.position }} · {{ card.card.replace('Ace', '王牌') }} <small>{{ card.orientation }}</small></h3><p class="theme">{{ meaning(card).theme }}</p><p>{{ meaning(card).observation }}</p><p>{{ meaning(card).orientation }}</p><p>{{ meaning(card).prompt }}</p></article></section>
      <section v-if="complete" class="tarot-panel"><h2>把线索带回生活</h2><p v-for="line in relations" :key="line">{{ line }}</p><p>今天留五分钟，写下最有共鸣的一张牌，以及与它有关的一件真实小事。再选一个能在本周完成的小行动。</p><p class="muted">这些牌让你想起了什么？哪一部分与你的实际感受不同？你的选择随时可以改变走向。</p></section>
      <TestResultSave v-if="complete" :record="savedResult" /><details class="draw-meta"><summary>这次是怎样抽取的？</summary><p>{{ result.method }}</p><p>记录编号：{{ result.draw_id }}</p><p>引擎：{{ result.engine }} · 随机结果没有预测意义，也不会替你作决定。</p></details>
    </template>
  </div>
</template>

<style scoped>
.tarot-page{max-width:1000px;margin:0 auto;color:hsl(var(--psych-hue, 145) 15% 40%);font-size:15px;line-height:1.7}.tarot-page header{margin:14px 0 26px}.eyebrow{font-size:12px;color:hsl(var(--psych-hue, 145) 15% 45%);margin:0 0 8px}.tarot-page h1{font:500 29px/1.4 var(--display);color:hsl(var(--psych-hue, 145) 15% 33%);margin:0 0 10px}.tarot-page h2{font:500 23px/1.5 var(--display);color:hsl(var(--psych-hue, 145) 16% 43%);margin:0 0 12px}.tarot-page h3{font-size:16px;font-weight:500;margin:0}.tarot-panel{min-width:0;padding:26px;margin-bottom:22px;border:1px solid hsl(var(--psych-hue, 145) 15% 90%);border-radius:13px;background:hsl(var(--psych-hue, 145) 30% 99% / .94)}.muted,footer,.draw-meta{color:hsl(var(--psych-hue, 145) 15% 44%);font-size:13px}.fine{font-size:12px}.question-label{display:block;margin:22px 0 8px}.question-label span{color:hsl(var(--psych-hue, 145) 15% 49%)}.tarot-page textarea{box-sizing:border-box;width:100%;max-width:100%;font:inherit;color:inherit;background:#fff;border:1px solid hsl(var(--psych-hue, 145) 17% 88%);border-radius:8px;padding:12px;resize:vertical}.tarot-page fieldset{border:0;padding:0;margin:22px 0}.tarot-page legend{padding:0;margin-bottom:10px}.spread-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.spread-options label{display:flex;align-items:center;gap:10px;min-width:0;border:1px solid hsl(var(--psych-hue, 145) 15% 90%);border-radius:8px;background:#fff;padding:12px;cursor:pointer}.spread-options label.selected{background:hsl(var(--psych-hue, 145) 19% 95%);border-color:hsl(var(--psych-hue, 145) 16% 53%)}.tarot-page .spread-options input[type=radio]{appearance:auto;flex:0 0 15px;min-width:15px;max-width:15px;width:15px;height:15px;padding:0;margin:0;resize:none;accent-color:hsl(var(--psych-hue, 145) 16% 44%)}.spread-options strong{display:block;font-weight:500;font-size:14px}.spread-options small{display:block;color:hsl(var(--psych-hue, 145) 15% 46%);font-size:11px}.tarot-page button{font:inherit;cursor:pointer;box-shadow:none}.primary{background:hsl(var(--psych-hue, 145) 16% 44%);border:1px solid hsl(var(--psych-hue, 145) 16% 44%);color:#fff;border-radius:7px;padding:10px 20px}.secondary{background:hsl(var(--psych-hue, 145) 15% 98%);border:1px solid hsl(var(--psych-hue, 145) 15% 90%);color:hsl(var(--psych-hue, 145) 15% 37%);padding:8px 14px;border-radius:7px}.text-button{border:0;background:transparent;color:hsl(var(--psych-hue, 145) 16% 35%);padding:0 4px;text-decoration:underline}.tarot-page button:disabled{opacity:.55;cursor:wait}.tarot-page :focus-visible{outline:2px solid hsl(var(--psych-hue, 145) 16% 44%);outline-offset:4px}.result-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.question-summary{white-space:pre-wrap;overflow-wrap:anywhere}.drawn-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:18px;margin-top:24px}.drawn-cards.single{grid-template-columns:minmax(130px,190px);justify-content:center}.position{font-size:12px;text-align:center;color:hsl(var(--psych-hue, 145) 15% 46%);margin:0 0 10px}.tarot-card{box-sizing:border-box;width:100%;min-height:218px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;padding:18px 10px;border:1px solid hsl(var(--psych-hue, 145) 16% 64%);outline:1px solid hsl(var(--psych-hue, 145) 17% 91%);outline-offset:-8px;border-radius:10px;background:hsl(var(--psych-hue, 145) 15% 93%);color:hsl(var(--psych-hue, 145) 16% 40%)}.tarot-card.revealed{background:hsl(var(--psych-hue, 145) 15% 99%);outline-color:hsl(var(--psych-hue, 145) 16% 89%)}.tarot-card small{font-size:11px;letter-spacing:.06em;color:hsl(var(--psych-hue, 145) 16% 48%)}.tarot-card strong{font:500 19px/1.6 var(--display)}.card-symbol{font-size:44px;line-height:1.3}.back-mark{font-size:64px;line-height:1.4}.orientation{font-size:12px;color:hsl(var(--psych-hue, 145) 16% 48%)}.reading{padding:18px 0;border-top:1px solid hsl(var(--psych-hue, 145) 15% 93%)}.reading h3 small{font-size:12px;color:hsl(var(--psych-hue, 145) 16% 48%);margin-left:8px}.reading p{margin:10px 0 0}.theme{color:hsl(var(--psych-hue, 145) 16% 41%)}.draw-meta{padding:0 2px;overflow-wrap:anywhere}.draw-meta summary{cursor:pointer}footer{font-size:11px;line-height:1.9;margin:24px 0}footer a{color:hsl(var(--psych-hue, 145) 16% 41%);text-decoration:underline}.error{color:#a24f63}@media(max-width:650px){.tarot-panel{padding:18px}.spread-options{grid-template-columns:repeat(2,minmax(0,1fr))}.drawn-cards{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.tarot-card{min-height:205px}.tarot-page h1{font-size:25px}.tarot-page h2{font-size:21px}}
</style>
