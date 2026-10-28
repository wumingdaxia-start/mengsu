<script setup>
import TestResultSave from '../components/TestResultSave.vue'
import { computed, nextTick, ref } from 'vue'

const spreads = [
  ['single', '每日一牌', '1 张 · 留意此刻'], ['three', '三牌阵', '3 张 · 过去、现在、未来'],
  ['diamond', '五牌阵', '5 张 · 梳理困惑与建议'], ['moon', '月亮牌阵', '4 张 · 看见周期与变化'],
  ['horseshoe', '马蹄形', '7 张 · 回看与展望'], ['celtic', '凯尔特十字', '10 张 · 多角度探索']
]
const spread = ref('three'), question = ref(''), result = ref(null), busy = ref(false), error = ref(''), revealed = ref([]), heading = ref(null)
const complete = computed(() => result.value && revealed.value.length === result.value.cards.length)
const majors = '愚者 魔术师 女祭司 女皇 皇帝 教皇 恋人 战车 力量 隐士 命运之轮 正义 倒吊人 死神 节制 恶魔 高塔 星星 月亮 太阳 审判 世界'.split(' ')
const themes = '新的尝试|把想法付诸行动|给直觉留出空间|照料与创造|边界与秩序|规则与个人信念|关系中的选择|方向与行动|温和而坚定的力量|独处与思考|变化与可控范围|公平与责任|换一个角度|结束与重新开始|节奏与协调|依赖与束缚|旧有假设被打破|恢复与希望|不确定与想象|喜悦与清晰|回顾与重新选择|完成与整合'.split('|')
const majorPrompts = '你想尝试却一直推迟的小事是什么？|手边哪一种资源可以支持你开始？|哪些感受还没有被你说出来？|今天你最想照顾自己的哪个需要？|你想为哪件事设立一个清晰的界限？|哪条习惯或规则仍适合你，哪条需要调整？|这次选择中，你最看重什么？|可以由你决定的下一步是什么？|遇到压力时，什么能帮你温和地表达需要？|留十分钟独处，你最想想清楚什么？|变化中有什么是你能影响的？|你已确认的事实与猜测分别是什么？|如果换一个人的视角，你会如何看待这件事？|什么可以结束，给新的安排留出空间？|哪一项安排可以调慢一点？|有什么习惯让你感到被牵着走？|哪一个原有判断需要重新核实？|最近哪个微小的进展值得被记下？|哪些是事实，哪些是你对未来的想象？|今天哪件小事让你感到轻松？|回顾这段经历，你愿意改变哪一个选择？|完成之后，你想怎样为自己画上一个句号？'.split('|')
const suits = { 权杖: ['火', '行动与创造'], 圣杯: ['水', '情感与关系'], 宝剑: ['风', '思考与冲突'], 星币: ['土', '身体、资源与技能'] }
const ranks = { Ace: '萌芽与开始', 二: '选择', 三: '初步成果', 四: '稳定或停滞', 五: '冲突', 六: '恢复', 七: '考验', 八: '精进', 九: '接近完成', 十: '完成或过载', 侍从: '学习', 骑士: '行动', 皇后: '滋养', 国王: '掌控' }
function meaning(card) {
  const index = majors.indexOf(card.card), suit = suits[card.card.slice(0, 2)]
  const theme = index >= 0 ? themes[index] : `${suit?.[1]} · ${ranks[card.card.slice(2)]}`
  return { theme, prompt: index >= 0 ? majorPrompts[index] : `在「${suit?.[1]}」这件事上，你正经历「${ranks[card.card.slice(2)]}」的哪一面？`, orientation: card.orientation === '逆位' ? '逆位可作为阻塞、过度、内化或延迟的观察角度，看看哪一种更贴近实际。' : '正位可以从这张牌的主题出发，寻找已经存在的资源或行动空间。' }
}
const relations = computed(() => {
  if (!complete.value || result.value.cards.length < 2) return []
  const cards = result.value.cards, lines = []
  const counts = Object.keys(suits).map(suit => [suit, cards.filter(c => c.card.startsWith(suit)).length])
  for (const [suit, count] of counts) if (count >= 3) lines.push(`${count} 张${suit}牌：可重点观察${suits[suit][1]}，同时留意其他生活领域。`)
  const pairs = [['死神', '星星', '结束后的恢复'], ['高塔', '星星', '变化后的重建'], ['月亮', '太阳', '从模糊走向清晰'], ['恶魔', '力量', '重新看待束缚与自主权'], ['女祭司', '魔术师', '让感受与行动相互校准']]
  for (const [a, b, text] of pairs) if (cards.some(c => c.card === a) && cards.some(c => c.card === b)) lines.push(`${a}与${b}：${text}。（原项目经典组合）`)
  const n = cards.filter(c => c.is_major).length
  lines.push(`${n} / ${cards.length} 张为大阿卡纳，可从较长的生活主题来回看；小阿卡纳则适合联系日常细节。牌的比例不代表事情发生的概率。`)
  return lines
})
const savedResult = computed(() => complete.value ? {type:'tarot',title:result.value.spread_name,summary:result.value.question||'本次牌阵与自我观察',sections:[{title:'本次牌阵',lines:result.value.cards.map(c=>`${c.position} · ${c.card}（${c.orientation}）：${meaning(c).theme}。${meaning(c).orientation} ${meaning(c).prompt}`)},{title:'把线索带回生活',lines:relations.value}]} : null)
async function draw() {
  if (busy.value) return
  busy.value = true; error.value = ''
  try {
    const response = await fetch('/api/tarot/draw', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spread: spread.value, question: question.value }), signal: AbortSignal.timeout(12000) })
    if (!response.ok) throw new Error('抽牌暂时没有完成，请稍后重试。')
    result.value = await response.json(); revealed.value = []; await nextTick(); heading.value?.focus()
  } catch { error.value = '暂时无法连接抽牌服务，请重试。' } finally { busy.value = false }
}
function reveal(index) { if (!revealed.value.includes(index)) revealed.value.push(index) }
function revealAll() { revealed.value = result.value.cards.map((_, i) => i) }
function reset() { result.value = null; revealed.value = []; error.value = '' }
</script>

<template>
  <div class="tarot-page">
    <header><p class="eyebrow">心绪活动 / TAROT</p><h1>塔罗牌测试</h1><p>借一张牌，换个角度看看此刻的自己。</p></header>
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
      <section v-if="revealed.length" class="tarot-panel" aria-live="polite"><h2>牌义与自我提问</h2><p class="muted">以下是基于牌义规则的参考提示，并非对你经历的事实判断。</p><article v-for="(card, index) in result.cards" v-show="revealed.includes(index)" :key="card.position" class="reading"><h3>{{ card.position }} · {{ card.card.replace('Ace', '王牌') }} <small>{{ card.orientation }}</small></h3><p class="theme">{{ meaning(card).theme }}</p><p>{{ meaning(card).orientation }}</p><p>{{ meaning(card).prompt }}</p></article></section>
      <section v-if="complete" class="tarot-panel"><h2>把线索带回生活</h2><p v-for="line in relations" :key="line">{{ line }}</p><p>今天留五分钟，写下最有共鸣的一张牌，以及与它有关的一件真实小事。再选一个能在本周完成的小行动。</p><p class="muted">这些牌让你想起了什么？哪一部分与你的实际感受不同？你的选择随时可以改变走向。</p></section>
      <TestResultSave v-if="complete" :record="savedResult" /><details class="draw-meta"><summary>查看本次抽牌信息</summary><p>seed：{{ result.seed }}</p><p>time_factor：{{ result.time_factor }}</p><p>采用原项目的无重复加权抽牌和正逆位规则。时段仅是抽牌权重参数，没有预测意义。</p></details>
    </template>
    <footer>抽牌与牌义规则参考 <a href="https://github.com/daman-ovo-0404/tarot-skill" target="_blank" rel="noopener noreferrer">tarot-skill</a>（MIT）。网页布局与提问提示为本项目改编。用于娱乐与自我探索，不作为心理诊断或重大决定的依据。</footer>
  </div>
</template>

<style scoped>
.tarot-page{max-width:1000px;margin:0 auto;color:hsl(var(--psych-hue, 145) 15% 40%);font-size:15px;line-height:1.7}.tarot-page header{margin:14px 0 26px}.eyebrow{font-size:12px;color:hsl(var(--psych-hue, 145) 15% 45%);margin:0 0 8px}.tarot-page h1{font:500 29px/1.4 var(--display);color:hsl(var(--psych-hue, 145) 15% 33%);margin:0 0 10px}.tarot-page h2{font:500 23px/1.5 var(--display);color:hsl(var(--psych-hue, 145) 16% 43%);margin:0 0 12px}.tarot-page h3{font-size:16px;font-weight:500;margin:0}.tarot-panel{min-width:0;padding:26px;margin-bottom:22px;border:1px solid hsl(var(--psych-hue, 145) 15% 90%);border-radius:13px;background:hsl(var(--psych-hue, 145) 30% 99% / .94)}.muted,footer,.draw-meta{color:hsl(var(--psych-hue, 145) 15% 44%);font-size:13px}.fine{font-size:12px}.question-label{display:block;margin:22px 0 8px}.question-label span{color:hsl(var(--psych-hue, 145) 15% 49%)}.tarot-page textarea{box-sizing:border-box;width:100%;max-width:100%;font:inherit;color:inherit;background:#fff;border:1px solid hsl(var(--psych-hue, 145) 17% 88%);border-radius:8px;padding:12px;resize:vertical}.tarot-page fieldset{border:0;padding:0;margin:22px 0}.tarot-page legend{padding:0;margin-bottom:10px}.spread-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.spread-options label{display:flex;align-items:center;gap:10px;min-width:0;border:1px solid hsl(var(--psych-hue, 145) 15% 90%);border-radius:8px;background:#fff;padding:12px;cursor:pointer}.spread-options label.selected{background:hsl(var(--psych-hue, 145) 19% 95%);border-color:hsl(var(--psych-hue, 145) 16% 53%)}.tarot-page .spread-options input[type=radio]{appearance:auto;flex:0 0 15px;min-width:15px;max-width:15px;width:15px;height:15px;padding:0;margin:0;resize:none;accent-color:hsl(var(--psych-hue, 145) 16% 44%)}.spread-options strong{display:block;font-weight:500;font-size:14px}.spread-options small{display:block;color:hsl(var(--psych-hue, 145) 15% 46%);font-size:11px}.tarot-page button{font:inherit;cursor:pointer;box-shadow:none}.primary{background:hsl(var(--psych-hue, 145) 16% 44%);border:1px solid hsl(var(--psych-hue, 145) 16% 44%);color:#fff;border-radius:7px;padding:10px 20px}.secondary{background:hsl(var(--psych-hue, 145) 15% 98%);border:1px solid hsl(var(--psych-hue, 145) 15% 90%);color:hsl(var(--psych-hue, 145) 15% 37%);padding:8px 14px;border-radius:7px}.text-button{border:0;background:transparent;color:hsl(var(--psych-hue, 145) 16% 35%);padding:0 4px;text-decoration:underline}.tarot-page button:disabled{opacity:.55;cursor:wait}.tarot-page :focus-visible{outline:2px solid hsl(var(--psych-hue, 145) 16% 44%);outline-offset:4px}.result-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.question-summary{white-space:pre-wrap;overflow-wrap:anywhere}.drawn-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:18px;margin-top:24px}.drawn-cards.single{grid-template-columns:minmax(130px,190px);justify-content:center}.position{font-size:12px;text-align:center;color:hsl(var(--psych-hue, 145) 15% 46%);margin:0 0 10px}.tarot-card{box-sizing:border-box;width:100%;min-height:218px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;padding:18px 10px;border:1px solid hsl(var(--psych-hue, 145) 16% 64%);outline:1px solid hsl(var(--psych-hue, 145) 17% 91%);outline-offset:-8px;border-radius:10px;background:hsl(var(--psych-hue, 145) 15% 93%);color:hsl(var(--psych-hue, 145) 16% 40%)}.tarot-card.revealed{background:hsl(var(--psych-hue, 145) 15% 99%);outline-color:hsl(var(--psych-hue, 145) 16% 89%)}.tarot-card small{font-size:11px;letter-spacing:.06em;color:hsl(var(--psych-hue, 145) 16% 48%)}.tarot-card strong{font:500 19px/1.6 var(--display)}.card-symbol{font-size:44px;line-height:1.3}.back-mark{font-size:64px;line-height:1.4}.orientation{font-size:12px;color:hsl(var(--psych-hue, 145) 16% 48%)}.reading{padding:18px 0;border-top:1px solid hsl(var(--psych-hue, 145) 15% 93%)}.reading h3 small{font-size:12px;color:hsl(var(--psych-hue, 145) 16% 48%);margin-left:8px}.reading p{margin:10px 0 0}.theme{color:hsl(var(--psych-hue, 145) 16% 41%)}.draw-meta{padding:0 2px;overflow-wrap:anywhere}.draw-meta summary{cursor:pointer}footer{font-size:11px;line-height:1.9;margin:24px 0}footer a{color:hsl(var(--psych-hue, 145) 16% 41%);text-decoration:underline}.error{color:#a24f63}@media(max-width:650px){.tarot-panel{padding:18px}.spread-options{grid-template-columns:repeat(2,minmax(0,1fr))}.drawn-cards{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.tarot-card{min-height:205px}.tarot-page h1{font-size:25px}.tarot-page h2{font-size:21px}}
</style>
