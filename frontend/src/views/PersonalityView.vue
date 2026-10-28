<script setup>
import TestResultSave from '../components/TestResultSave.vue'
import { computed, nextTick, ref } from 'vue'
import { createQuestions, visibleQuestions, scorePersonality, dimensions, dimensionMeta, explanations, outcomes } from '../data/sbti'

const started = ref(false)
const questions = ref([])
const answers = ref({})
const index = ref(0)
const result = ref(null)
const selectedType = ref(null)
const galleryOpen = ref(false)
const heading = ref(null)
const visible = computed(() => visibleQuestions(questions.value, answers.value))
const current = computed(() => visible.value[index.value])
const completed = computed(() => visible.value.filter(q => q.options.some(o => o.value === answers.value[q.id])).length)
const detail = computed(() => selectedType.value || result.value?.type)
const levelNames = { L: '低', M: '中', H: '高' }
const image = type => '/sbti/' + type.image.split('/').pop()
const savedResult = computed(() => result.value ? {type:'personality',title:`${result.value.type.cn} · ${result.value.type.code}`,summary:result.value.type.intro,sections:[{title:'人格解读',lines:[result.value.type.desc]}, {title:'十五维度',lines:dimensions.map(dim=>`${dimensionMeta[dim].name}：${levelNames[result.value.levels[dim]]} · ${result.value.rawScores[dim]}/6。${explanations[dim][result.value.levels[dim]]}`)}]} : null)
async function focusHeading() { await nextTick(); heading.value?.focus() }
function start() {
  questions.value = createQuestions(); answers.value = {}; index.value = 0
  result.value = null; selectedType.value = null; galleryOpen.value = false; started.value = true
  focusHeading()
}
function select(value) {
  answers.value[current.value.id] = value
  if (current.value.id === 'drink_gate_q1' && value !== 3) delete answers.value.drink_gate_q2
}
function next() {
  if (answers.value[current.value.id] === undefined) return
  if (index.value < visible.value.length - 1) index.value++
  else { result.value = scorePersonality(answers.value); started.value = false }
  focusHeading()
}
function previous() { if (index.value > 0) { index.value--; focusHeading() } }
</script>

<template>
  <div class="personality-page">
    <header class="personality-heading"><p>星栈 / 认识自己</p><h1>人格测试</h1><span>换个轻松的角度，看看此刻的自己。</span></header>
    <section v-if="!started && !result" class="personality-intro personality-panel">
      <p class="eyebrow">SBTI · 15 个维度 / 27 种人格</p><h2 ref="heading" tabindex="-1">你的日常反应，藏着哪种人格？</h2>
      <p>从自我、情感、态度、行动和社交五个方面，选出更接近你的答案。完成约 31 道题后，查看人格解读和十五维度画像。</p>
      <p class="personality-note">这是带有网络玩笑和夸张文案的娱乐测试，不是心理测评或诊断。结果不代表能力、价值或固定的人格标签。登录后完成测试，结果会自动保存到心理总览。</p>
      <button class="primary" @click="start">开始测试 <span aria-hidden="true">→</span></button>
      <button class="text-button" @click="galleryOpen = !galleryOpen">{{ galleryOpen ? '收起人格图鉴' : '先看看人格图鉴' }}</button>
    </section>
    <section v-if="started" class="personality-panel question-panel">
      <div class="question-meta"><span>第 {{ index + 1 }} / {{ visible.length }} 题</span><span>已答 {{ completed }} 题</span></div>
      <progress :value="completed" :max="visible.length" aria-label="人格测试答题进度" />
      <h2 ref="heading" tabindex="-1" class="question-title">{{ current.text }}</h2>
      <fieldset class="answer-options"><legend class="sr-only">选择最接近你的答案</legend>
        <label v-for="(option, i) in current.options" :key="option.value" :class="{ chosen: answers[current.id] === option.value }">
          <input type="radio" :name="current.id" :value="option.value" :checked="answers[current.id] === option.value" @change="select(option.value)" />
          <span class="option-letter">{{ String.fromCharCode(65 + i) }}</span><span>{{ option.label }}</span>
        </label>
      </fieldset>
      <div class="question-actions"><button class="secondary" :disabled="index === 0" @click="previous">上一题</button><button class="primary" :disabled="answers[current.id] === undefined" @click="next">{{ index === visible.length - 1 ? '查看我的结果' : '下一题' }} →</button></div>
      <p class="personality-note">按真实感受作答，没有标准答案。可返回上一题修改。</p>
    </section>
    <template v-if="result"><TestResultSave :record="savedResult" />
      <section class="personality-panel result-panel">
        <img :src="image(result.type)" :alt="result.type.cn + '人格形象'" />
        <div><p class="eyebrow">你的 SBTI 娱乐测试结果</p><h2 ref="heading" tabindex="-1">{{ result.type.cn }} <small>{{ result.type.code }}</small></h2><p class="result-intro">{{ result.type.intro }}</p>
          <p v-if="result.type.code === 'DRUNK'" class="personality-note">你的饮酒题选择触发了原测试的隐藏结局；这不是对实际饮酒习惯或健康状况的判断。</p>
          <p v-else-if="result.type.code === 'HHHH'" class="personality-note">常规类型最高匹配度不足 60%，按原规则显示特别类型。无需让标签定义自己。</p>
          <p v-else class="personality-note">与该类型模板相似度 {{ result.ranked[0].similarity }}% · {{ result.ranked[0].exact }} / 15 个维度一致。相似度不代表准确率。</p>
          <button class="primary" @click="start">重新测试</button><button class="text-button" @click="galleryOpen = !galleryOpen">{{ galleryOpen ? '收起人格图鉴' : '浏览全部人格' }}</button>
        </div>
      </section>
      <section class="personality-panel dimensions-panel"><h2>你的十五维度</h2><p class="personality-note">根据本次答案计算；高低仅表示原题库的倾向分档，没有好坏之分。</p>
        <dl><div v-for="dim in dimensions" :key="dim"><dt>{{ dimensionMeta[dim].name }} <span>{{ levelNames[result.levels[dim]] }} · {{ result.rawScores[dim] }}/6</span></dt><dd>{{ explanations[dim][result.levels[dim]] }}</dd></div></dl>
      </section>
    </template>
    <section v-if="galleryOpen && !started" class="personality-panel"><h2>27 种人格图鉴</h2><p class="personality-note">选择一个人格，阅读原项目的解读。</p><div class="personality-gallery"><button v-for="type in outcomes" :key="type.code" :aria-pressed="selectedType?.code === type.code" @click="selectedType = type"><img :src="image(type)" :alt="type.cn" loading="lazy" /><strong>{{ type.cn }}</strong><small>{{ type.code }}</small></button></div></section>
    <section v-if="detail && !started" class="personality-panel personality-detail" aria-live="polite"><div class="detail-heading"><h2>{{ detail.cn }} · {{ detail.code }}</h2><button v-if="selectedType" class="text-button" @click="selectedType = null">关闭图鉴解读</button></div><p class="result-intro">{{ detail.intro }}</p><p>{{ detail.desc }}</p><small>以上为原项目的娱乐文案，含夸张表达。</small></section>
    <footer class="personality-credits">题库与原始文案：蛆肉儿串儿。图鉴来自 <a href="https://github.com/serenakeyitan/sbti-wiki" target="_blank" rel="noopener noreferrer">sbti-wiki</a>，题库与评分参考 <a href="https://github.com/bingran-you/sbti-cli" target="_blank" rel="noopener noreferrer">sbti-cli</a>。<a href="/sbti/LICENSE-wiki.txt" target="_blank">图鉴及本页改编内容遵循 CC BY-NC-SA 4.0</a>，仅限非商业使用；<a href="/sbti/NOTICE-cli.txt" target="_blank">原始内容权利说明</a>。</footer>
  </div>
</template>

<style scoped>
/* Radio controls must not inherit the full-width text-field defaults. */
.personality-page .answer-options input[type="radio"]{appearance:auto;box-sizing:border-box;display:block;flex:0 0 16px;width:16px;height:16px;min-width:16px;min-height:16px;max-width:16px;max-height:16px;padding:0;margin:0;border:0;border-radius:50%;background:transparent;resize:none;box-shadow:none}
.personality-page .question-panel{max-width:820px;margin-inline:auto;padding:24px 28px}
.personality-page .question-panel .question-title{font-size:18px;line-height:1.75;margin:20px 0}
.personality-page .question-panel progress{margin:12px 0 20px}
.personality-page .answer-options{min-width:0;gap:10px;margin:20px 0}
.personality-page .answer-options label{box-sizing:border-box;display:grid;grid-template-columns:16px 20px minmax(0,1fr);width:100%;min-width:0;gap:10px;padding:11px 14px;line-height:1.7;font-size:14px;text-align:left}
.personality-page .answer-options label>span:last-child{min-width:0;white-space:normal;overflow-wrap:anywhere}
.personality-page .question-actions{padding-top:16px}
@media(max-width:600px){.personality-page .question-panel{padding:18px}.personality-page .question-panel .question-title{font-size:16px}.personality-page .answer-options label{padding:10px 12px;gap:8px}}
.personality-page{max-width:1100px;margin:0 auto;color:hsl(var(--psych-hue, 145) 15% 40%);font-size:15px;line-height:1.7}.personality-heading{margin:14px 0 28px}.personality-heading>p,.eyebrow{color:hsl(var(--psych-hue, 145) 15% 45%);font-size:12px;margin:0 0 8px}.personality-heading h1{font:500 29px/1.4 var(--display);margin:0 0 8px;color:hsl(var(--psych-hue, 145) 15% 33%)}.personality-heading>span{color:hsl(var(--psych-hue, 145) 15% 47%);font-size:14px}.personality-panel{padding:28px;margin:0 0 24px;border:1px solid hsl(var(--psych-hue, 145) 15% 90%);background:rgba(255,254,249,.9);border-radius:13px;min-width:0}.personality-panel h2{font:500 24px/1.6 var(--display);color:hsl(var(--psych-hue, 145) 16% 43%);margin:8px 0 15px}.personality-intro{padding:34px;background:rgba(237,242,234,.92)}.personality-intro>p{max-width:760px}.personality-note{font-size:13px;color:hsl(var(--psych-hue, 145) 15% 44%);line-height:1.8}.personality-intro .personality-note{margin:20px 0 24px}.personality-page button{cursor:pointer;font:inherit;border-radius:7px;box-shadow:none}.primary{background:hsl(var(--psych-hue, 145) 16% 44%);border:1px solid hsl(var(--psych-hue, 145) 16% 44%);color:white;padding:10px 18px}.secondary{background:hsl(var(--psych-hue, 145) 15% 98%);border:1px solid hsl(var(--psych-hue, 145) 15% 90%);color:hsl(var(--psych-hue, 145) 15% 37%);padding:10px 18px}.text-button{border:0;background:transparent;color:hsl(var(--psych-hue, 145) 16% 41%);padding:10px 14px;font-size:13px!important}.personality-page button:disabled{opacity:.45;cursor:not-allowed}.personality-page :focus-visible{outline:2px solid hsl(var(--psych-hue, 145) 16% 44%);outline-offset:4px}.question-meta{display:flex;justify-content:space-between;color:hsl(var(--psych-hue, 145) 15% 45%);font-size:13px}.question-panel progress{width:100%;height:5px;accent-color:hsl(var(--psych-hue, 145) 16% 50%);display:block;margin:14px 0 28px}.question-panel .question-title{font-size:20px;line-height:1.85;white-space:pre-wrap;overflow-wrap:anywhere}.answer-options{border:0;padding:0;margin:24px 0;display:grid;gap:12px}.answer-options label{display:flex;align-items:center;gap:12px;padding:15px 18px;border:1px solid hsl(var(--psych-hue, 145) 17% 91%);border-radius:9px;background:#fff;cursor:pointer;overflow-wrap:anywhere}.answer-options label.chosen{border-color:hsl(var(--psych-hue, 145) 16% 52%);background:hsl(var(--psych-hue, 145) 15% 95%)}.answer-options input{accent-color:hsl(var(--psych-hue, 145) 16% 44%);flex-shrink:0}.option-letter{color:hsl(var(--psych-hue, 145) 16% 48%);font-size:13px}.question-actions{display:flex;justify-content:space-between;gap:12px;border-top:1px solid hsl(var(--psych-hue, 145) 15% 93%);padding-top:20px}.result-panel{display:grid;grid-template-columns:200px 1fr;align-items:center;gap:30px}.result-panel>img{width:100%;max-height:270px;object-fit:contain}.result-panel h2 small{font-family:inherit;font-size:15px;color:hsl(var(--psych-hue, 145) 16% 49%);margin-left:8px}.result-intro{color:hsl(var(--psych-hue, 145) 16% 41%)}.dimensions-panel dl{display:grid;grid-template-columns:1fr 1fr;gap:0 28px;margin:20px 0 0}.dimensions-panel dl>div{padding:16px 0;border-top:1px solid hsl(var(--psych-hue, 145) 15% 93%)}.dimensions-panel dt{display:flex;justify-content:space-between;gap:12px;font-size:14px;color:hsl(var(--psych-hue, 145) 15% 44%)}.dimensions-panel dt span{white-space:nowrap;color:hsl(var(--psych-hue, 145) 16% 48%);font-size:12px}.dimensions-panel dd{margin:8px 0 0;color:hsl(var(--psych-hue, 145) 15% 45%);font-size:13px}.personality-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:14px}.personality-gallery button{display:grid;justify-items:center;gap:6px;padding:12px;background:hsl(var(--psych-hue, 145) 15% 98%);border:1px solid hsl(var(--psych-hue, 145) 17% 92%);color:hsl(var(--psych-hue, 145) 15% 46%)}.personality-gallery button[aria-pressed=true]{border-color:hsl(var(--psych-hue, 145) 16% 50%);background:hsl(var(--psych-hue, 145) 17% 93%)}.personality-gallery img{width:90px;height:110px;object-fit:contain}.personality-gallery strong{font-size:14px;font-weight:500}.personality-gallery small{font-size:11px;color:hsl(var(--psych-hue, 145) 16% 49%)}.detail-heading{display:flex;justify-content:space-between;gap:12px;align-items:center}.personality-detail>p{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.9}.personality-detail small{color:hsl(var(--psych-hue, 145) 16% 48%)}.personality-credits{color:hsl(var(--psych-hue, 145) 15% 50%);font-size:11px;line-height:1.9;margin:25px 0}.personality-credits a{color:hsl(var(--psych-hue, 145) 16% 41%);text-decoration:underline;text-underline-offset:3px}.sr-only{position:absolute;width:1px;height:1px;clip-path:inset(50%);overflow:hidden;white-space:nowrap}@media(max-width:600px){.personality-panel,.personality-intro{padding:20px}.personality-panel h2{font-size:21px}.question-panel .question-title{font-size:17px}.result-panel{grid-template-columns:1fr;gap:12px}.result-panel>img{width:150px;justify-self:center}.dimensions-panel dl{grid-template-columns:1fr}.answer-options label{padding:12px;gap:8px}.detail-heading{flex-wrap:wrap}.personality-gallery{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>

