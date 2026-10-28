// Browser adaptation of bingran-you/sbti-cli (MIT); original SBTI content
// belongs to its author. See /sbti/NOTICE-cli.txt and /sbti/LICENSE-cli.txt.
import snapshot from './sbti-snapshot.json'
import wiki from './sbti-wiki.json'

export const dimensions = snapshot.dimensionOrder
export const dimensionMeta = snapshot.dimensionMeta
export const explanations = snapshot.DIM_EXPLANATIONS
export const outcomes = wiki.outcomes

export function createQuestions(random = Math.random) {
  const questions = [...snapshot.questions]
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[questions[i], questions[j]] = [questions[j], questions[i]]
  }
  questions.splice(Math.floor(random() * questions.length) + 1, 0, snapshot.specialQuestions[0])
  return questions
}

export function visibleQuestions(questions, answers) {
  const visible = [...questions]
  if (answers.drink_gate_q1 === 3) {
    visible.splice(visible.findIndex(q => q.id === 'drink_gate_q1') + 1, 0, snapshot.specialQuestions[1])
  }
  return visible
}

export function scorePersonality(answers) {
  for (const q of visibleQuestions([...snapshot.questions, snapshot.specialQuestions[0]], answers)) {
    if (!q.options.some(option => option.value === answers[q.id])) throw new Error('请完成所有题目后查看结果。')
  }
  const rawScores = Object.fromEntries(dimensions.map(dim => [dim, 0]))
  for (const q of snapshot.questions) rawScores[q.dim] += answers[q.id]
  const levels = Object.fromEntries(dimensions.map(dim => [dim, rawScores[dim] <= 3 ? 'L' : rawScores[dim] === 4 ? 'M' : 'H']))
  const number = { L: 1, M: 2, H: 3 }
  const ranked = snapshot.NORMAL_TYPES.map(type => {
    const vector = type.pattern.replace(/-/g, '').split('')
    const differences = dimensions.map((dim, i) => Math.abs(number[levels[dim]] - number[vector[i]]))
    const distance = differences.reduce((sum, n) => sum + n, 0)
    return { code: type.code, distance, exact: differences.filter(n => n === 0).length, similarity: Math.max(0, Math.round((1 - distance / 30) * 100)) }
  }).sort((a, b) => a.distance - b.distance || b.exact - a.exact || b.similarity - a.similarity)
  // Hidden answers count only while their gate remains selected.
  const code = answers.drink_gate_q1 === 3 && answers.drink_gate_q2 === 2 ? 'DRUNK' : ranked[0].similarity < 60 ? 'HHHH' : ranked[0].code
  return { type: outcomes.find(type => type.code === code), rawScores, levels, ranked }
}
