export const EMOTIONS = [
  '悲伤',
  '平静',
  '焦虑',
  '快乐',
  '兴奋',
  '恐惧',
  '好奇',
  '愤怒',
  '麻木',
  '希望',
  '孤独'
]

export const TAGS = [
  '飞行',
  '工作',
  '考试',
  '家人',
  '朋友',
  '追逐',
  '城市',
  '森林',
  '动物',
  '海边',
  '学校',
  '家'
]

export const EMOTION_COLORS = {
  悲伤: '#5b7fa6',
  平静: '#4f9d80',
  焦虑: '#d9a97c',
  快乐: '#e8c46a',
  兴奋: '#e08f5a',
  恐惧: '#6b6f9c',
  好奇: '#57a9a0',
  愤怒: '#c2665a',
  麻木: '#7d8a86',
  希望: '#86c07a',
  孤独: '#5f6f8f',
  未标注: '#45605a'
}

export function emotionColor(emotion) {
  return EMOTION_COLORS[emotion] || EMOTION_COLORS['未标注']
}
