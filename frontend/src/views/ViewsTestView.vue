<script setup>
import TestResultSave from '../components/TestResultSave.vue'
import DomainParticleScene from '../components/DomainParticleScene.vue'
import { valuesExplanations } from '../data/values-explanations'
import { computed, nextTick, ref } from 'vue'

// Original reflection prompts; the existing personality and tarot pages inform UI only.
const domains = [
  { name: '世界观', description: '你如何理解世界、变化与他人。', axes: [
    { left: '经验延续', right: '开放探索', low: '遇到陌生观点时，你可能更愿意先以熟悉的经验作参照。经验可以提供稳定感，也可以留一个位置给新证据。', high: '你愿意让新的经验和证据调整原有认识。探索时，也可以明确哪些判断已有依据、哪些还需要验证。', prompts: ['即使一个观点让我不习惯，只要有充分依据，我也愿意调整原有看法。', '理解陌生的生活方式时，我愿意先了解它形成的背景。'] },
    { left: '规则稳定', right: '适应变化', low: '明确的规则和可预期的环境可能让你更安心。变化来临时，先保留一两项熟悉的安排，也许更容易适应。', high: '你可能更愿意让规则随情境调整。调整之前，说明原因和边界，可以减少对他人的影响。', prompts: ['环境改变后，我认为原有规则也需要重新讨论。', '即使有另一种同样可行的做法，我通常仍希望延续原来的规则。'], reverse: [false, true] },
    { left: '谨慎建立信任', right: '先给予信任', low: '你倾向于通过了解和观察逐步建立信任。可以把边界说清楚，让谨慎与合作同时存在。', high: '面对新的人，你可能愿意先给合作一个机会。信任也可以有边界，重要的约定仍值得明确。', prompts: ['与不熟悉的人合作时，我愿意先给予基本信任，再根据行动调整。', '在了解一个人之前，我通常会先保持较多戒备。'], reverse: [false, true] }
  ] },
  { name: '人生观', description: '你如何安排生活、成长与人生方向。', axes: [
    { left: '珍惜当下', right: '长远规划', low: '你可能更重视此刻的体验和生活感受。可以选一个小目标，帮助今天的满足与之后的需要衔接。', high: '你愿意为长期方向投入时间。规划中留一些休息和调整的空间，可以让计划更容易持续。', prompts: ['安排空闲时间时，我经常会考虑它是否有助于长期目标。', '比起提前安排几年后的生活，我更愿意把注意力放在眼前的体验。'], reverse: [false, true] },
    { left: '安稳深耕', right: '挑战拓展', low: '你可能更愿意在熟悉的方向积累经验。深耕本身就是成长，也可以偶尔尝试风险可控的小变化。', high: '你可能通过新挑战认识自己。尝试之前确认可承担的时间和成本，可以让探索更从容。', prompts: ['两个机会同样有价值时，我更愿意选择能接触新事物的那个。', '即使回报相当，我也更愿意在熟悉的领域继续积累。'], reverse: [false, true] },
    { left: '自主安排', right: '共同联结', low: '你更看重自己安排生活的空间。把需要的独处时间与亲近的人说清楚，也能照顾彼此的关系。', high: '共同经历和彼此陪伴可能是你生活的重要部分。也可以留意哪些安排来自自己的真实意愿。', prompts: ['想象理想生活时，与重要的人共同经历事情是核心部分。', '做生活安排时，我通常优先保留自己独立决定的空间。'], reverse: [false, true] }
  ] },
  { name: '价值观', description: '你在选择和取舍中，更看重什么。', axes: [
    { left: '个人边界', right: '互助关怀', low: '你可能倾向于先保证自己的需要和责任，再决定如何提供帮助。清晰的边界能让帮助更可持续。', high: '你可能较重视回应他人的需要。提供帮助之前，也值得确认自己的余力，以及对方真正需要的方式。', prompts: ['在自己承担得起的范围内，我愿意为帮助别人调整一部分个人安排。', '当个人安排与一项非紧急的求助冲突时，我通常先保留自己的安排。'], reverse: [false, true] },
    { left: '成果效率', right: '过程公平', low: '你可能更关注事情能否有效完成。讨论方法时，也可以检查谁承担了成本、谁的意见还没被听见。', high: '你可能更看重参与过程中的公平。明确时间限制和共同目标，有助于让公平与执行兼顾。', prompts: ['团队决策时，即使要多花一些时间，我也希望受影响的人有表达意见的机会。', '如果目标能顺利实现，我通常更愿意减少决策过程中的讨论环节。'], reverse: [false, true] },
    { left: '共同协调', right: '真实表达', low: '你可能更在意相处中的协调与共同步调。温和地说出一个不同意见，也可以是照顾关系的方式。', high: '你可能更看重表达真实想法和个人立场。选择合适的时间与表达方式，可以帮助彼此理解差异。', prompts: ['与身边人意见不同时，只要表达尊重，我仍愿意说出自己的真实看法。', '对不涉及原则的事情，我通常愿意保留不同意见，以维持共同步调。'], reverse: [false, true] }
  ] }
]
const exploredDomain = ref(null)
const explanation = computed(() => exploredDomain.value === null ? null : valuesExplanations[exploredDomain.value])
const explanationPanel = ref(null)
async function exploreDomain(i) {
  exploredDomain.value = exploredDomain.value === i ? null : i
  if (exploredDomain.value !== null) {
    await nextTick()
    explanationPanel.value?.scrollIntoView({ block: 'nearest', behavior: 'auto' })
  }
}
function closeExplanation() {
  const previous = exploredDomain.value
  exploredDomain.value = null
  nextTick(() => document.getElementById(`domain-explore-${previous}`)?.focus({ preventScroll: true }))
}
const questions = domains.flatMap((domain, d) => domain.axes.flatMap((axis, a) => axis.prompts.map((text, p) => ({ id: `${d}-${a}-${p}`, text, domain: d, axis: a, reverse: axis.reverse?.[p] || false }))))
const options = ['很不符合', '不太符合', '视情况而定', '比较符合', '非常符合']
const answers = ref({}), index = ref(0), started = ref(false), finished = ref(false), heading = ref(null)
const current = computed(() => questions[index.value])
const answered = computed(() => Object.keys(answers.value).length)
const results = computed(() => domains.map((domain, d) => ({ ...domain, axes: domain.axes.map((axis, a) => {
  const items = questions.filter(q => q.domain === d && q.axis === a)
  const values = items.map(q => q.reverse ? 6 - answers.value[q.id] : answers.value[q.id])
  const sum = values.reduce((total, n) => total + n, 0)
  const level = sum < 5 ? 'low' : sum > 7 ? 'high' : 'middle'
  return { ...axis, percent: Math.round((sum - 2) / 8 * 100), level, label: level === 'low' ? axis.left : level === 'high' ? axis.right : '两侧兼顾', text: level === 'low' ? axis.low : level === 'high' ? axis.high : `你的两次回答处在中间范围，可能会根据情境在「${axis.left}」和「${axis.right}」之间调整。这不代表没有立场，可以回想一个最近的真实选择，看看当时更看重哪一边。` }
}) })))
const savedResult = computed(() => finished.value ? {type:'views',title:'世界观 · 人生观 · 价值观',summary:results.value.map(d=>`${d.name}：${d.axes.map(a=>a.label).join('、')}`).join('；'),sections:results.value.map(d=>({title:d.name,lines:d.axes.map(a=>`${a.left} / ${a.right}：${a.label}。${a.text}`)}))} : null)
async function focusHeading() { await nextTick(); heading.value?.focus({ preventScroll: true }); heading.value?.scrollIntoView({ block: 'center' }) }
function start() { answers.value = {}; index.value = 0; finished.value = false; started.value = true; focusHeading() }
function previous() { if (index.value > 0) { index.value--; focusHeading() } }
function next() {
  if (!Number.isInteger(answers.value[current.value.id])) return
  if (index.value < questions.length - 1) index.value++
  else if (answered.value === questions.length) finished.value = true
  focusHeading()
}
function review() { finished.value = false; index.value = 0; focusHeading() }
</script>

<template>
  <div class="views-test-page">
    <header><p class="eyebrow">心绪活动 / SELF EXPLORATION</p><h1>三观测试</h1><p>看看你如何理解世界、安排人生，以及做出选择。</p></header>
    <section v-if="!started" class="test-panel intro-panel">
      <h2>从生活中的选择，认识自己的三观</h2>
      <p>18 道题，约 3–5 分钟。按最近一段时间的实际感受作答，没有标准答案。</p>
      <div class="domain-intro" role="group" aria-label="了解世界观、人生观与价值观">
        <button v-for="(domain, d) in domains" :id="`domain-explore-${d}`" :key="domain.name" type="button" class="domain-explore-button" :class="{ 'is-explored': exploredDomain === d }" :aria-expanded="exploredDomain === d" aria-controls="domain-explainer" @click="exploreDomain(d)">
          <span class="domain-explore-name">{{ domain.name }}</span><span class="domain-explore-description">{{ domain.description }}</span><span class="domain-explore-action">{{ exploredDomain === d ? '收起' : '深入了解' }} <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m6 8 4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        </button>
      </div>
      <section v-if="explanation" id="domain-explainer" :key="exploredDomain" ref="explanationPanel" class="domain-explainer" aria-labelledby="domain-explainer-title">
        <div class="domain-explainer-top"><p>{{ explanation.kicker }}</p><button type="button" class="domain-explainer-close" aria-label="收起详细解读" @click="closeExplanation">收起 <span aria-hidden="true">×</span></button></div>
        <div class="domain-explainer-layout">
          <DomainParticleScene :kind="exploredDomain" :title="domains[exploredDomain].name" />
          <div class="domain-explainer-copy"><h3 id="domain-explainer-title">{{ explanation.title }}</h3><p>{{ explanation.intro }}</p><div class="domain-example"><h4>把它放进生活里</h4><p>{{ explanation.example }}</p></div><h4>本次测试会关注</h4><dl class="domain-explanation-angles"><div v-for="item in explanation.angles" :key="item.title"><dt>{{ item.title }}</dt><dd>{{ item.text }}</dd></div></dl></div>
        </div>
        <div class="domain-reflection"><span>留一个问题给自己</span><p>{{ explanation.question }}</p></div>
      </section>
      <button class="primary start-button" @click="start">开始测试</button>
    </section>
    <section v-else-if="!finished" class="test-panel question-panel">
      <div class="question-meta"><span>{{ domains[current.domain].name }} · 第 {{ index % 6 + 1 }} / 6 题</span><span>{{ index + 1 }} / {{ questions.length }}</span></div>
      <progress :value="answered" :max="questions.length" :aria-label="`已完成 ${answered} 题，共 ${questions.length} 题`"></progress>
      <fieldset :key="current.id"><legend><h2 ref="heading" tabindex="-1">{{ current.text }}</h2></legend>
        <div class="answer-options"><label v-for="(option, i) in options" :key="i" :class="{ chosen: answers[current.id] === i + 1 }"><input v-model="answers[current.id]" type="radio" :name="current.id" :value="i + 1" /><span>{{ option }}</span></label></div>
      </fieldset>
      <div class="question-actions"><button class="secondary previous-button" :disabled="index === 0" @click="previous">上一题</button><button class="primary next-button" :disabled="answers[current.id] === undefined" @click="next">{{ index === questions.length - 1 ? '查看三观解读' : '下一题' }}</button></div>
      <p class="note">按真实感受选择即可。可以返回修改，答案会保留。</p>
    </section>
    <template v-else><TestResultSave :record="savedResult" />
      <section class="test-panel result-intro"><p class="eyebrow">本次回答呈现的倾向</p><h2 ref="heading" tabindex="-1">你的三观，分别来看</h2><p>每个方面都包含三个观察角度。两侧各有意义，位置表示本次回答的方向，不代表好坏、准确率或人群排名。</p><div class="result-actions"><button class="secondary review-button" @click="review">回看并修改答案</button><button class="primary restart-button" @click="start">重新测试</button></div></section>
      <section v-for="(domain, d) in results" :key="domain.name" class="test-panel domain-result"><div class="domain-heading"><span>0{{ d + 1 }}</span><h2>{{ domain.name }}</h2></div><p class="note">{{ domain.description }}</p>
        <article v-for="axis in domain.axes" :key="axis.left" class="axis-result"><h3>{{ axis.left }} / {{ axis.right }}<span>{{ axis.label }}</span></h3><div class="axis-labels"><span>{{ axis.left }}</span><span>{{ axis.right }}</span></div><div class="axis-track" role="img" :aria-label="`${axis.left}与${axis.right}之间：${axis.label}`"><i :style="{ left: `clamp(7px, ${axis.percent}%, calc(100% - 7px))` }"></i></div><p>{{ axis.text }}</p></article>
      </section>
      <details class="test-panel scoring-note"><summary>解读是怎么得出的？</summary><p>每个观察角度对应 2 道题。五档回答计为 1–5 分，反向表述按 6 减去原分数计算。合计 2–4 分靠近左侧，5–7 分为两侧兼顾，8–10 分靠近右侧。标记位置是题目合计的线性映射。</p><p>题量较少，回答也会受到情境影响；这份问卷适合引发思考，不能据此判定一个人的固定特质。</p></details>
    </template>
  </div>
</template>

<style scoped>
.views-test-page{max-width:1000px;margin:0 auto;font-size:15px;line-height:1.7;color:hsl(var(--psych-hue, 145) 15% 40%)}.views-test-page header{margin:14px 0 26px}.eyebrow{font-size:12px;color:hsl(var(--psych-hue, 145) 15% 45%);margin:0 0 8px}.views-test-page h1{font:500 29px/1.4 var(--display);color:hsl(var(--psych-hue, 145) 15% 33%);margin:0 0 10px}.views-test-page h2{font:500 23px/1.65 var(--display);color:hsl(var(--psych-hue, 145) 16% 43%);margin:0 0 14px}.test-panel{padding:26px;margin-bottom:22px;min-width:0;border:1px solid hsl(var(--psych-hue, 145) 15% 90%);border-radius:13px;background:hsl(var(--psych-hue, 145) 30% 99% / .94)}.domain-intro{margin:24px 0}.domain-intro>div{display:grid;grid-template-columns:78px minmax(0,1fr);gap:16px;padding:14px 0;border-top:1px solid hsl(var(--psych-hue, 145) 15% 93%)}.domain-intro dt{color:hsl(var(--psych-hue, 145) 16% 36%)}.domain-intro dd{margin:0}.note,footer{font-size:13px;color:hsl(var(--psych-hue, 145) 15% 44%)}.views-test-page button{font:inherit;border-radius:7px;box-shadow:none;cursor:pointer;padding:10px 18px}.primary{background:hsl(var(--psych-hue, 145) 16% 44%);color:#fff;border:1px solid hsl(var(--psych-hue, 145) 16% 44%)}.secondary{background:hsl(var(--psych-hue, 145) 15% 98%);color:hsl(var(--psych-hue, 145) 15% 37%);border:1px solid hsl(var(--psych-hue, 145) 15% 90%)}.views-test-page button:disabled{opacity:.45;cursor:not-allowed}.views-test-page :focus-visible{outline:2px solid hsl(var(--psych-hue, 145) 16% 44%);outline-offset:4px}.question-panel{max-width:820px;margin-inline:auto}.question-meta{display:flex;justify-content:space-between;gap:12px;color:hsl(var(--psych-hue, 145) 15% 45%);font-size:13px}.question-panel progress{display:block;width:100%;height:5px;accent-color:hsl(var(--psych-hue, 145) 16% 50%);margin:14px 0 26px}.question-panel fieldset{min-width:0;margin:0;padding:0;border:0}.question-panel legend{padding:0;max-width:100%}.question-panel h2{font-size:20px;overflow-wrap:anywhere}.answer-options{display:grid;gap:10px;margin:16px 0 24px}.answer-options label{display:grid;grid-template-columns:16px minmax(0,1fr);align-items:center;gap:12px;min-width:0;padding:11px 14px;border:1px solid hsl(var(--psych-hue, 145) 17% 91%);border-radius:8px;cursor:pointer;background:#fff}.answer-options label.chosen{border-color:hsl(var(--psych-hue, 145) 16% 52%);background:hsl(var(--psych-hue, 145) 15% 95%)}.views-test-page .answer-options input[type=radio]{appearance:auto;box-sizing:border-box;display:block;width:16px;min-width:16px;max-width:16px;height:16px;min-height:16px;max-height:16px;margin:0;padding:0;border:0;resize:none;accent-color:hsl(var(--psych-hue, 145) 16% 44%)}.question-actions,.result-actions{display:flex;gap:12px;flex-wrap:wrap}.question-actions{justify-content:space-between;border-top:1px solid hsl(var(--psych-hue, 145) 15% 93%);padding-top:18px}.domain-heading{display:flex;align-items:center;gap:14px}.domain-heading>span{color:hsl(var(--psych-hue, 145) 16% 53%);font-size:13px}.domain-heading h2{margin:0}.axis-result{padding:20px 0;border-top:1px solid hsl(var(--psych-hue, 145) 15% 93%)}.axis-result h3{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:15px;font-weight:500;margin:0 0 20px}.axis-result h3>span{font-size:12px;font-weight:400;background:hsl(var(--psych-hue, 145) 15% 95%);border-radius:4px;color:hsl(var(--psych-hue, 145) 16% 39%);padding:3px 9px;white-space:nowrap}.axis-labels{display:flex;justify-content:space-between;gap:10px;font-size:12px;color:hsl(var(--psych-hue, 145) 15% 45%)}.axis-track{position:relative;height:6px;margin:12px 0 22px;background:hsl(var(--psych-hue, 145) 15% 91%);border-radius:3px}.axis-track:before{content:'';position:absolute;left:50%;height:14px;top:-4px;width:1px;background:hsl(var(--psych-hue, 145) 16% 63%)}.axis-track i{position:absolute;width:12px;height:12px;top:50%;transform:translate(-50%,-50%);border:2px solid #fff;box-sizing:content-box;border-radius:50%;background:hsl(var(--psych-hue, 145) 16% 44%)}.axis-result p{margin:0}.scoring-note{font-size:13px;color:hsl(var(--psych-hue, 145) 15% 44%)}.scoring-note summary{cursor:pointer;color:hsl(var(--psych-hue, 145) 16% 36%)}footer{font-size:11px;line-height:1.9;margin:24px 0}@media(max-width:600px){.test-panel{padding:18px}.views-test-page h1{font-size:25px}.views-test-page h2{font-size:21px}.question-panel h2{font-size:18px}.domain-intro>div{grid-template-columns:62px minmax(0,1fr);gap:8px}.axis-result h3{flex-wrap:wrap}.answer-options label{padding:10px 12px}}

/* In-page exploration: particles explain depth while the text remains readable. */
.domain-intro{display:grid;gap:0;border-bottom:1px solid hsl(var(--psych-hue,35) 15% 91%)}
.views-test-page .domain-explore-button{display:grid;grid-template-columns:78px minmax(0,1fr) auto;gap:16px;align-items:center;width:100%;padding:17px 4px;text-align:left;color:inherit;background:transparent;border:0;border-top:1px solid hsl(var(--psych-hue,35) 15% 91%);border-radius:0}
.domain-explore-name{color:hsl(var(--psych-hue,35) 18% 35%);font-weight:500}.domain-explore-description{font-size:14px}.domain-explore-action{display:flex;align-items:center;gap:7px;font-size:12px;color:hsl(var(--psych-hue,35) 21% 47%);white-space:nowrap}.domain-explore-action svg{width:17px;height:17px;transition:transform 220ms cubic-bezier(.22,1,.36,1)}
.domain-explore-button.is-explored .domain-explore-action svg{transform:rotate(180deg)}.domain-explore-button:hover,.domain-explore-button.is-explored{background:hsl(var(--psych-hue,35) 23% 95% / .65)}
.domain-explainer{margin:0 0 24px;padding:0 0 20px;border-bottom:1px solid #e8dfd3;scroll-margin-top:28px;animation:domain-explainer-enter 360ms cubic-bezier(.16,1,.3,1) both}
.domain-explainer-top{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:18px}.domain-explainer-top>p{margin:0;font-size:12px;color:#9d8268}.views-test-page .domain-explainer-close{display:flex;align-items:center;gap:12px;padding:6px 0 6px 12px;border:0;background:transparent;color:#8d7761;font-size:12px}.domain-explainer-close>span{font-size:21px;font-weight:300;line-height:1}
.domain-explainer-layout{display:grid;grid-template-columns:minmax(230px,.78fr) minmax(0,1.22fr);gap:26px;align-items:start}.domain-explainer-copy h3{font:500 21px/1.6 var(--display);margin:0 0 12px;color:#78634e}.domain-explainer-copy>p{font-size:14px;margin:0 0 18px;line-height:1.85}.domain-explainer-copy h4{font-size:12px;font-weight:500;color:#957a61;margin:0 0 7px}.domain-example{padding-left:13px;border-left:2px solid #dfcbb4;margin-bottom:20px}.domain-example p{font-size:13px;line-height:1.85;margin:0}
.domain-explanation-angles{display:grid;gap:12px;margin:0}.domain-explanation-angles>div{display:grid;grid-template-columns:82px minmax(0,1fr);gap:12px}.domain-explanation-angles dt{font-size:12px;color:#8a725d}.domain-explanation-angles dd{margin:0;font-size:13px;line-height:1.8}
.domain-reflection{margin:24px 0 0;padding:16px 0 0;border-top:1px solid #eae1d6}.domain-reflection>span{font-size:11px;color:#9c846c}.domain-reflection>p{margin:5px 0 0;font:500 16px/1.8 var(--display);color:#7d6853}
@keyframes domain-explainer-enter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:760px){.domain-explainer-layout{grid-template-columns:1fr;gap:22px}.domain-explainer-copy h3{font-size:20px}.views-test-page .domain-explore-button{grid-template-columns:62px minmax(0,1fr) 20px;gap:10px;padding:16px 0}.domain-explore-description{font-size:13px}.domain-explore-action{font-size:0;gap:0}.domain-explore-action svg{width:18px;height:18px}.domain-explanation-angles>div{grid-template-columns:74px minmax(0,1fr);gap:10px}}
@media(prefers-reduced-motion:reduce){.domain-explainer{animation:none}.domain-explore-action svg{transition:none}}

</style>
