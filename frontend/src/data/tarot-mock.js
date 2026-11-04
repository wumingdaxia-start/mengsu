// Original reflection prompts. Local mock responses; no external AI call.
export const spreads = [
  { id: 'single', name: '此刻一束光', positions: ['此刻的需要'], note: '1 张 · 把注意力放回当下' },
  { id: 'three', name: '心绪三问', positions: ['走过的路', '此刻的心', '下一小步'], note: '3 张 · 经历、感受与行动' },
  { id: 'diamond', name: '困惑拆信', positions: ['表面的困惑', '内在需要', '惯性', '可用支持', '小行动'], note: '5 张 · 看见需要与支持' },
  { id: 'moon', name: '夜航四站', positions: ['今天的回声', '可以放下', '留给自己', '明天的起点'], note: '4 张 · 为今天轻轻收尾' },
  { id: 'horseshoe', name: '关系照面', positions: ['我的感受', '我在期待', '表达的阻碍', '边界', '已有支持', '可询问的问题', '下一次沟通'], note: '7 张 · 表达、倾听与边界' },
  { id: 'celtic', name: '生活展开页', positions: ['当下', '阻碍', '底层需要', '旧经验', '心中愿望', '可走的一步', '我的资源', '外部环境', '担心与期待', '行动方向'], note: '10 张 · 梳理生活的不同侧面' }
]
export const archetypes = [
  { name: '愚者', glyph: 'journey', theme: '允许一个小小的开始', observation: '新鲜感和不确定可以同时存在。回想一件你想尝试、却一直等到准备好才愿意开始的事。', prompt: '如果只尝试十分钟，你会先做什么？' },
  { name: '魔术师', glyph: 'orbit', theme: '看见手边的资源', observation: '你不必一次补齐所有条件。知识、时间、朋友的一句建议，都可能成为可以调用的资源。', prompt: '现在你已经拥有的三样资源是什么？' },
  { name: '女祭司', glyph: 'moon', theme: '给内在的声音一点位置', observation: '有些感受还没有变成清楚的语言。先记录身体反应和实际经历，再尝试说出你在意什么。', prompt: '当你暂时不考虑别人的期待，会注意到什么？' },
  { name: '女皇', glyph: 'garden', theme: '照顾比催促更有力量', observation: '维持生长需要具体的照顾。看看最近的休息、饮食和人与人的联系，哪一项被你放到了最后。', prompt: '今天能给自己的一份实际照顾是什么？' },
  { name: '皇帝', glyph: 'mountain', theme: '让边界成为支持', observation: '规则可以保护精力，也可以过于僵硬。辨认一个对你有帮助的安排，与一个可以松动的要求。', prompt: '哪件事需要明确说出你的范围和底线？' },
  { name: '恋人', glyph: 'twin', theme: '选择与你在意的事一致', observation: '选择不只是比较利弊，还涉及你愿意照顾什么。把自己的需要和对他人的猜测分开写下。', prompt: '这个选择中，你最希望保留的价值是什么？' },
  { name: '力量', glyph: 'sun', theme: '温柔地处理内在拉扯', observation: '坚持不必等于压下感受。看看你的不安试图保护什么，再为它找到一种更小、更温和的表达。', prompt: '你能怎样既承认害怕，又向前走一步？' },
  { name: '隐者', glyph: 'lantern', theme: '短暂停下来辨认方向', observation: '安静可以帮助整理信息。留出一段不急着回答、不需要表现的时间，让重要的问题浮现出来。', prompt: '暂时放下噪声后，哪个问题仍然留在心里？' },
  { name: '命运之轮', glyph: 'orbit', theme: '区分变化与可控制的部分', observation: '环境的变化不全由你决定。把事情分成能行动、能沟通和暂时只能观察的三类。', prompt: '当前你能影响的一小部分是什么？' },
  { name: '正义', glyph: 'balance', theme: '让事实和感受各有位置', observation: '记录已经发生的事实，再写出自己的解释。两者都值得被看见，但未必是同一回事。', prompt: '你需要补充哪条信息，才更容易做决定？' },
  { name: '星星', glyph: 'star', theme: '把希望放在可实践的地方', observation: '希望可以是一件很具体的小事。寻找最近一次让你轻松一点的时刻，看看其中有哪些条件能再次出现。', prompt: '本周能安排的一件恢复精力的小事是什么？' },
  { name: '月亮', glyph: 'moon', theme: '在不确定里慢慢辨认', observation: '模糊的信息容易被担心填满。允许自己暂时不知道，用一个可确认的问题代替反复猜测。', prompt: '哪件事可以通过询问或观察来确认？' },
  { name: '太阳', glyph: 'sun', theme: '承认已经发生的进展', observation: '不必等到全部完成才看见进展。找出一个具体的变化，它可能很小，却是你真实做过的事。', prompt: '你愿意认可自己最近的哪一点努力？' },
  { name: '世界', glyph: 'garden', theme: '为一个阶段留下回看', observation: '完成也包括整理经验。写下一件想保留的事、一件想放下的事，以及一件要带入下阶段的事。', prompt: '如果为这个阶段取一个名字，你会怎么写？' }
]
export function createMockDeck() {
  const cards = archetypes.map((c, i) => ({ ...c, id: i }))
  const bytes = new Uint32Array(cards.length * 2)
  crypto.getRandomValues(bytes)
  for (let i = cards.length - 1; i > 0; i--) { const j = bytes[i] % (i + 1); [cards[i], cards[j]] = [cards[j], cards[i]] }
  return cards.slice(0, 12).map((c, i) => ({ ...c, reversed: bytes[i + cards.length] % 2 === 1 }))
}
export function mockReading(card, position) {
  return { ...card, position, orientation: card.reversed ? '逆位' : '正位', guidance: card.reversed ? '换一个角度：先留意哪里用力过多，或哪里还需要更多时间。逆位不代表坏事。' : '把这张牌当作一种观察角度，寻找与你的实际经历相符的部分。' }
}
