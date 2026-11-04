<script setup>
import { computed, nextTick, ref } from 'vue'
import TestResultSave from '../components/TestResultSave.vue'
import PersonalityCard from '../components/PersonalityCard.vue'
import {personalityCards, cardsForResult} from '../data/personality-cards'
import { axes, createQuestions, scorePersonality } from '../data/personality'
const questions = createQuestions(), answers = ref({}), index = ref(0), started = ref(false), result = ref(null), heading = ref(null)
const galleryOpen=ref(false), selectedCard=ref(null)
const resultCards=computed(()=>cardsForResult(result.value))
function browse(card=null) {galleryOpen.value=true; selectedCard.value=card; nextTick(()=>document.getElementById('personality-card-library')?.scrollIntoView({block:'start',behavior:'instant'}))}
const current = computed(() => questions[index.value])
const answered = computed(() => questions.filter(q => answers.value[q.id] !== undefined).length)
const savedResult = computed(() => result.value ? {type:'personality',title:`心绪行迹 · ${result.value.title}`,summary:result.value.summary,sections:[
  {title:'六条生活偏好轴 · v1',lines:result.value.profile.map(p => `${p.label}｜${p.name === '灵活往返' ? p.name : p[p.side]}：${p.description} 选项位置 ${p.position}/100（左端：${p.low}；右端：${p.high}）。`)},
  {title:'本次人格卡牌',lines:resultCards.value.map(c=>`${c.number} · ${c.title}：${c.subtitle}。${c.description}`)},
  {title:'下一步小尝试',lines:result.value.actions},
  {title:'阅读说明',lines:['花屿星自行编写的生活偏好问卷；未经心理测量学验证，不用于诊断、能力评价或固定人格分类。分数表示本次选项的位置，不是准确率或人群百分位。']}
]} : null)
async function focus() { await nextTick(); heading.value?.focus() }
function start() { answers.value={}; index.value=0; result.value=null; galleryOpen.value=false; selectedCard.value=null; started.value=true; focus() }
function next() { if(answers.value[current.value.id] === undefined) return; if(index.value < questions.length-1) index.value++; else {result.value=scorePersonality(answers.value);started.value=false} focus() }
function previous() { if(index.value) index.value--; focus() }
</script>
<template>
  <div class="personality-page">
    <header><p class="eyebrow">星栈 / 心绪活动</p><h1>人格测试</h1><p>心绪行迹 · 从日常选择认识此刻的自己</p></header>
    <section v-if="!started && !result" class="panel intro intro-layout"><div>
      <p class="eyebrow">花屿星问卷 · 24 道题 / 六条生活偏好轴</p>
      <h2>你习惯怎样，与生活相处？</h2><p>把最近两周的日常放在心里，再选择更接近自己的答案。没有标准答案，也不必努力成为某一种人。</p>
      <div class="axis-list"><span v-for="axis in axes" :key="axis.id">{{ axis.name }}</span></div>
      <div class="intro-actions"><button class="primary" @click="start">开始认识自己 →</button><button class="text-button" @click="browse()">先看看人格卡牌</button></div>
      <p class="note">约需 4–6 分钟。此问卷由花屿星自行编写，未经心理测量学验证，仅用于自我观察。登录后完成会自动保存至心理总览。</p></div><div class="intro-stack" aria-hidden="true"><PersonalityCard class="preview-back" :card="personalityCards[7]" /><PersonalityCard class="preview-front" :card="personalityCards[0]" /></div>
    </section>
    <section v-if="started" class="panel question-panel">
      <div class="question-meta"><span>第 {{ index+1 }} / {{ questions.length }} 题</span><span>已答 {{ answered }} 题</span></div>
      <progress :value="answered" :max="questions.length" aria-label="答题进度" />
      <h2 ref="heading" tabindex="-1">{{ current.text }}</h2>
      <fieldset><legend class="note">想想最近两周的你</legend>
        <label v-for="option in current.options" :key="option.value" :class="{chosen:answers[current.id] === option.value}">
          <input v-model="answers[current.id]" type="radio" :name="current.id" :value="option.value" /><span>{{ option.label }}</span>
        </label>
      </fieldset>
      <div class="actions"><button class="secondary" :disabled="index===0" @click="previous">上一题</button><button class="primary" :disabled="answers[current.id]===undefined" @click="next">{{ index===questions.length-1?'查看心绪行迹':'下一题 →' }}</button></div>
    </section>
    <template v-if="result">
      <section class="panel result-hero"><div class="result-hand" :class="{single:resultCards.length===1}"><PersonalityCard v-for="card in resultCards" :key="card.id" :card="card" /></div><div><p class="eyebrow">属于你此刻的人格卡牌</p><h2 ref="heading" tabindex="-1">{{ result.title }}</h2><p>{{ result.summary }}</p><p class="note">这组牌对应本次最明显的至多两种倾向，不是随机抽取。没有明显偏向时显示「合流」。卡牌是生活偏好的描述，不是对你的定论。</p><div class="intro-actions"><button class="secondary" @click="start">重新测试</button><button class="text-button" @click="browse()">浏览全部卡牌</button></div></div></section>
      <TestResultSave :record="savedResult" />
      <section class="panel"><h2>六条轴，看看你站在哪里</h2><p class="note">刻度只表示本次选项倾向，不代表准确率。中间区域表示没有明显偏向；两端都没有好坏之分。</p>
        <div v-for="p in result.profile" :key="p.id" class="axis-result"><h3>{{ p.label }} <small>{{ p.name === '灵活往返' ? p.name : p[p.side] }}</small></h3><div class="axis-ends"><span>{{ p.low }}</span><span>{{ p.high }}</span></div><meter min="0" max="100" :value="p.position" :aria-label="`${p.low}到${p.high}：${p.position}/100`" /><p>{{ p.description }}</p></div>
      </section>
      <section class="panel"><h2>把认识，变成一件小事</h2><p v-for="action in result.actions" :key="action">{{ action }}</p></section>
    </template>
    <section v-if="galleryOpen && !started" id="personality-card-library" class="card-library">
      <div class="library-heading"><div><p class="eyebrow">心绪行迹 / 原创牌面集</p><h2>十二张牌，十二种相处方式</h2></div><button class="text-button" @click="galleryOpen=false;selectedCard=null">收起卡牌集</button></div>
      <p class="note">每一张牌都有自己的小人物与生活场景。点击牌面，读读它的故事。预览不会改变测试结果。</p>
      <div class="card-grid"><button v-for="card in personalityCards" :key="card.id" class="card-select" :aria-label="`查看${card.title}卡牌`" :aria-pressed="selectedCard?.id===card.id" @click="selectedCard=card"><PersonalityCard :card="card" /></button></div>
      <article v-if="selectedCard" class="panel card-story" aria-live="polite"><p class="eyebrow">{{ selectedCard.number }} / {{ selectedCard.label }}</p><h2>{{ selectedCard.title }} · {{ selectedCard.subtitle }}</h2><p>{{ selectedCard.description }}</p><div class="story-action"><span>一个小尝试</span><p>{{ selectedCard.action }}</p></div></article>
    </section>
    <section v-if="!started && !galleryOpen" class="library-invite"><p>每一种性格，都有自己的风景。</p><button class="text-button" @click="browse()">翻阅十二张原创人格卡牌 →</button></section>
  </div>
</template>
<style scoped>
.personality-page{max-width:960px;margin:0 auto;color:hsl(var(--psych-hue,145) 15% 35%);font-size:15px;line-height:1.7}header{margin:14px 0 28px}h1,h2{font-family:var(--display);font-weight:500}h1{font-size:29px;margin:0 0 8px}h2{font-size:23px;margin:8px 0 18px}h3{font-size:15px;font-weight:500}.eyebrow,.note,footer{font-size:13px;color:hsl(var(--psych-hue,145) 12% 43%)}.panel{padding:28px;margin-bottom:24px;border:1px solid hsl(var(--psych-hue,145) 15% 87%);border-radius:13px;background:rgba(255,254,249,.94)}.intro{background:hsl(var(--psych-hue,145) 20% 95% / .94)}.axis-list{display:flex;gap:12px 24px;flex-wrap:wrap;margin:24px 0}.axis-list span{border-bottom:1px solid hsl(var(--psych-hue,145) 15% 79%);padding-bottom:4px}.question-panel{max-width:760px;margin-inline:auto}.question-meta,.actions,.axis-ends{display:flex;justify-content:space-between;gap:16px}.question-meta,.axis-ends{font-size:13px}progress,meter{width:100%;height:10px;accent-color:hsl(var(--psych-hue,145) 18% 45%)}progress{margin:16px 0 22px}fieldset{border:0;padding:0;margin:24px 0;display:grid;gap:10px}legend{margin-bottom:12px}fieldset label{display:flex;align-items:center;gap:12px;border:1px solid hsl(var(--psych-hue,145) 15% 88%);padding:11px 14px;border-radius:8px;background:#fff;cursor:pointer}fieldset label.chosen{border-color:hsl(var(--psych-hue,145) 18% 48%);background:hsl(var(--psych-hue,145) 20% 95%)}.personality-page input[type=radio]{appearance:auto;flex:0 0 16px;width:16px;height:16px;min-width:16px;max-width:16px;padding:0;margin:0;accent-color:hsl(var(--psych-hue,145) 18% 44%)}button{font:inherit;cursor:pointer;border-radius:7px;padding:10px 18px;box-shadow:none}.primary{background:hsl(var(--psych-hue,145) 18% 41%);color:white;border:1px solid hsl(var(--psych-hue,145) 18% 41%)}.secondary{background:transparent;color:inherit;border:1px solid hsl(var(--psych-hue,145) 15% 75%)}button:disabled{opacity:.45;cursor:default}.actions{border-top:1px solid hsl(var(--psych-hue,145) 15% 89%);padding-top:20px}.axis-result{border-top:1px solid hsl(var(--psych-hue,145) 15% 89%);padding:16px 0}.axis-result h3{display:flex;justify-content:space-between}.axis-result small{font-weight:400;color:hsl(var(--psych-hue,145) 15% 43%)}.axis-result p{font-size:14px}.axis-ends{margin-bottom:8px}.personality-page :focus-visible{outline:2px solid hsl(var(--psych-hue,145) 18% 43%);outline-offset:4px}footer{font-size:12px;margin:24px 0}@media(max-width:600px){.panel{padding:20px}h2{font-size:20px}.axis-list{gap:10px 18px}}

.intro-layout{display:grid;grid-template-columns:minmax(0,1fr) 250px;gap:32px;align-items:center}.intro-stack{position:relative;height:320px;margin:10px 8px}.intro-stack .personality-card{position:absolute;max-width:190px}.preview-back{transform:rotate(10deg);right:0;top:10px}.preview-front{transform:rotate(-7deg);left:0;top:22px}.intro-actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px}.text-button{border:0;background:transparent;color:inherit;padding:9px 4px;font-size:13px}.text-button:hover{text-decoration:underline;text-underline-offset:4px}.result-hero{display:grid;grid-template-columns:minmax(260px,360px) minmax(0,1fr);gap:30px;align-items:center}.result-hand{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.result-hand.single{grid-template-columns:1fr;max-width:220px;margin-inline:auto}.card-library{scroll-margin-top:115px;margin:36px 0}.library-heading{display:flex;justify-content:space-between;align-items:center;gap:12px}.library-heading h2{margin-bottom:8px}.card-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px 16px;margin:24px 0}.personality-page button.card-select{display:block;min-width:0;padding:0;border:0;background:none;color:inherit;text-align:left;border-radius:13px}.card-select[aria-pressed=true]{outline:2px solid hsl(var(--psych-hue,145) 20% 39%);outline-offset:4px}.card-select:hover{outline:1px solid hsl(var(--psych-hue,145) 20% 50%);outline-offset:4px}.card-story{margin-top:28px}.story-action{margin-top:20px;padding-top:16px;border-top:1px solid hsl(var(--psych-hue,145) 15% 86%)}.story-action>span{font-size:12px}.story-action p{margin-bottom:0}.library-invite{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:28px 0;border-block:1px solid hsl(var(--psych-hue,145) 15% 85%);padding:16px 0}.library-invite p{margin:0;font-family:var(--display)}
@media(max-width:900px){.intro-layout{grid-template-columns:minmax(0,1fr) 215px;gap:16px}.intro-stack{height:290px}.intro-stack .personality-card{max-width:168px}.card-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.result-hero{grid-template-columns:1fr}.result-hand{width:min(100%,390px);margin-inline:auto}}
@media(max-width:600px){.intro-layout{grid-template-columns:1fr}.intro-stack{grid-row:1;width:238px;height:285px;justify-self:center;margin:0}.intro-stack .personality-card{max-width:170px}.card-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 12px}.library-heading,.library-invite{align-items:flex-start;flex-direction:column}.result-hand{max-width:350px}.result-hero{gap:24px}.card-library{scroll-margin-top:145px}}
</style>
