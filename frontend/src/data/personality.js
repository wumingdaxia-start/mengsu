// 花屿星「心绪行迹」v1：独立编写的生活偏好问卷，不沿用 SBTI 题库或类型。
// 六条轴各四题，反向题先反转，等权求和；0–100 是选项位置，不是准确率。
export const axes = [
  { id:'company', name:'恢复精力', low:'独处整理', high:'交流连接', lowName:'听潮', highName:'围炉', lowText:'安静的空间让你更容易听见自己的想法。', highText:'与信任的人说说话，常能帮你重新找到精神。', lowAction:'给独处留出时间，也给可靠的人留一个联系窗口。', highAction:'邀请一个愿意倾听的人聊聊，同时留意自己是否需要暂停。' },
  { id:'discovery', name:'遇见新事物', low:'熟悉深耕', high:'尝试探索', lowName:'守园', highName:'拾光', lowText:'熟悉的事物值得反复打磨，你愿意从细节里发现变化。', highText:'陌生的小路容易吸引你，你习惯通过尝试获得线索。', lowAction:'在熟悉的一天里，加入一个不费力的新选择。', highAction:'从最近的尝试里挑一件，留一点时间继续做下去。' },
  { id:'rhythm', name:'安排日常', low:'随境调整', high:'提前铺排', lowName:'流云', highName:'织径', lowText:'你愿意为临时出现的需要留白，安排可以边走边改。', highText:'提前知道下一步，会让你更安心地投入当下。', lowAction:'为明天只确定一件必须完成的小事。', highAction:'给已经排好的日程留一段不需要交代用途的空白。' },
  { id:'decision', name:'形成判断', low:'体验与感受', high:'信息与比较', lowName:'知温', highName:'辨星', lowText:'自己的体验和在意之处，是你作出选择的重要线索。', highText:'把信息放在一起比较，会让你的选择更有把握。', lowAction:'给一个直觉补充一条能核实的信息。', highAction:'比较信息之后，再问自己：我真正愿意承担哪一种选择？' },
  { id:'change', name:'面对变化', low:'先稳住脚步', high:'边行动边校准', lowName:'泊岸', highName:'启帆', lowText:'先把脚下的事情安排妥当，会让你更愿意迎接改变。', highText:'先迈出一小步，再根据反馈调整，是你常用的方式。', lowAction:'把想做的改变缩小到今天可以试一次的程度。', highAction:'开始之前，写下一个暂停条件和可以求助的人。' },
  { id:'expression', name:'表达需要', low:'留意彼此感受', high:'清楚说明边界', lowName:'照叶', highName:'立灯', lowText:'你会留意关系中的气氛，愿意为彼此保留缓冲。', highText:'明确说出自己的需要，能帮你保持关系里的方向感。', lowAction:'练习说一句：我很在意你，但这次我需要先休息。', highAction:'说明边界之后，也问一句：你这边最需要我理解的是什么？' }
]

const statements = [
  ['一天忙完后，我更想找信任的人聊聊。','遇到难题时，讨论常比独自想更能让我恢复状态。','空闲的晚上，我更愿意独自做一点喜欢的事。','接连参加几次聚会后，我需要安静一阵子。'],
  ['走进一家没去过的店，我愿意试试陌生的选择。','即使还不擅长，我也乐于接触一种新的兴趣。','我更喜欢把已经熟悉的技能继续练深。','计划一次休息时，熟悉的地方更有吸引力。'],
  ['开始一天之前，我喜欢先安排几件要做的事。','约好一件事时，我希望时间和步骤提前明确。','休息日我喜欢留出大块没有计划的时间。','情况有变化时，我愿意临时重排当天的安排。'],
  ['作出重要选择前，我会把可核实的信息列出来比较。','面对两种说法，我习惯先找支持它们的具体依据。','选择一个去处时，自己的感受比详细对比更能帮我决定。','即使条件相近，我也会优先选择让我感到自在的方案。'],
  ['面对可撤回的小改变，我通常愿意先试一次。','新任务还没有完全想清楚时，我能先从一小步开始。','生活出现变化时，我想先把原有节奏稳定下来。','尝试新安排之前，我需要先准备好退路。'],
  ['不方便答应请求时，我通常会直接说明原因。','与人合作时，我愿意提前讲清自己能做和不能做的事。','有分歧时，我会先照顾对方的感受再谈自己的需要。','需要拒绝别人时，我往往先寻找不让关系紧张的表达方式。']
]
const choices = ['很不符合','不太符合','介于两者','比较符合','很符合']
export function createQuestions() {
  return axes.flatMap((axis, a) => statements[a].map((text, i) => ({
    id:`${axis.id}-${i + 1}`, axis:axis.id, reverse:i >= 2, text,
    options:choices.map((label, n) => ({label, value:n + 1}))
  })))
}
export function scorePersonality(answers) {
  const questions = createQuestions()
  if (questions.some(q => !Number.isInteger(answers[q.id]) || answers[q.id] < 1 || answers[q.id] > 5)) throw new Error('请完成全部 24 道题。')
  const profile = axes.map(axis => {
    const total = questions.filter(q => q.axis === axis.id).reduce((sum,q) => sum + (q.reverse ? 6 - answers[q.id] : answers[q.id]),0)
    const position = Math.round((total - 4) / 16 * 100)
    const side = position >= 63 ? 'high' : position <= 37 ? 'low' : 'balanced'
    return {...axis, label:axis.name, position, side, name:side === 'balanced' ? '灵活往返' : axis[`${side}Name`],
      description:side === 'balanced' ? `你在「${axis.low}」和「${axis.high}」之间，会随情境调整。` : axis[`${side}Text`],
      action:side === 'balanced' ? `回想最近一次选择：当时更需要${axis.low}，还是${axis.high}？` : axis[`${side}Action`]}
  })
  const strongest = profile.filter(p => p.side !== 'balanced').sort((a,b) => Math.abs(b.position - 50) - Math.abs(a.position - 50)).slice(0,2)
  const title = strongest.length ? strongest.map(p => p.name).join(' · ') + '型' : '此刻均衡型'
  return {version:'mengsu-traces-v1', title, profile,
    summary:strongest.length ? strongest.map(p => p.description).join('') : '这次答案没有呈现明显的单侧偏好。你可能会按场景选择不同的应对方式。',
    actions:(strongest.length ? strongest : profile.slice(0,2)).map(p => p.action)}
}
