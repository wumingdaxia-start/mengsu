import { computed } from 'vue'
import { readDream, writeDream } from '../dream-account'

const defaults={snapshots:[],journals:[],plan:{bedtime:'22:30',wake:'07:00',started:'',completed:[]},rituals:{},holes:[],posts:[],creations:[]}
const state=Object.fromEntries(Object.entries(defaults).map(([key,fallback])=>[key,computed(()=>readDream(key,fallback))]))
export const today = () => new Date().toLocaleDateString('sv-SE')
export function useDreamJourney() {
  return { ...state, commit: writeDream, refresh() {} }
}
export const demoDreams = [
  { id: 'library-fog', title: '雾中阶梯', signal: '沿着云雾中的阶梯慢慢向上，尽头有一扇亮着灯的门。', date: '2026-10-26', feeling: '失重', motif: '阶梯', image: '/dream-library/mist-stairs.jpg', demo: true },
  { id: 'library-room', title: '卧室夜晚与窗边人影', signal: '旧屋的窗边站着熟悉的身影，窗帘被风轻轻吹动。', date: '2026-10-24', feeling: '温暖', motif: '旧屋', image: '/dream-library/night-bedroom.jpg', demo: true },
  { id: 'library-snow', title: '雪山回声', signal: '在很安静的雪山中，听到远处传来自己的回声。', date: '2026-10-22', feeling: '疏离', motif: '山谷', image: '/dream-library/snow-mountain.jpg', demo: true },
  { id: 'library-forest', title: '迷雾森林的低语', signal: '穿过一片有微光的树林，树叶像在轻声说话。', date: '2026-10-20', feeling: '安稳', motif: '森林', image: '/dream-library/mist-forest.jpg', demo: true }
]
export const sleepStages = [
  { name: '建立温柔的节律', span: '第 1–2 周', intro: '先认识自己的夜晚，不急着追求完美睡眠。', tasks: ['完成一份睡眠日记', '给起床留一个相对稳定的时间', '睡前留出一小段放缓的时间'], lesson: '偶尔睡不好很常见。先留下真实感受，不用强迫自己立刻入睡。' },
  { name: '认识自己的睡眠', span: '第 3–4 周', intro: '观察白天的习惯怎样延续到夜里。', tasks: ['回看最近几天的入睡时刻', '留意咖啡、午睡与晚间感受', '写下一条对睡眠的新发现'], lesson: '每个人的睡眠需要不同。日记里的数字用于观察，不是给自己的评分。' },
  { name: '整理睡眠环境', span: '第 5–6 周', intro: '让光线、声音和温度更适合你。', tasks: ['尝试调暗晚间灯光', '减少临睡前的工作提醒', '调整一个让你舒服的小细节'], lesson: '选择舒适的温度和音量。不需要购买设备，也不用一次改变所有习惯。' },
  { name: '巩固日常习惯', span: '第 7–8 周', intro: '保留真正适合自己的小动作。', tasks: ['选出最喜欢的一项放松练习', '按自己的节奏完成睡前流程', '回看白日状态与夜间感受'], lesson: '比起严格执行一张时间表，找到可持续的节奏更重要。这里不提供限睡或治疗处方。' },
  { name: '继续照顾自己', span: '维持期 · 1 周起', intro: '允许起伏，也允许重新开始。', tasks: ['保留一个愿意继续的小习惯', '给未来的自己留一句话', '需要时寻求专业人员帮助'], lesson: '若睡眠困扰持续影响生活，可向专业人员求助。本计划仅提供日常记录与习惯提醒。' }
]
export const winddown = [
  { before: 180, title: '给夜晚腾出空间', items: ['晚餐适量，尽量不在临睡前吃得过饱', '饭后轻松散步 15 分钟，以舒适为准', '临近睡前少喝咖啡、浓茶，留意巧克力中的咖啡因', '选择温和活动，避免让自己过度兴奋'] },
  { before: 120, title: '让环境慢慢安静', items: ['调暗灯光，换成温暖柔和的光线', '结束工作消息，给通知设一个边界', '按喜好洗个温度舒适的澡', '护肤、换睡衣，整理好舒服的睡眠环境'] },
  { before: 60, title: '把注意力交还给自己', items: ['可选低音量白噪音或轻音乐', '需要时准备舒适眼罩，不勉强使用', '留 5–10 分钟做轻柔呼吸或静坐', '翻几页纸质书，减少刺激性内容', '手机开启勿扰，放到稍远的位置'] },
  { before: 10, title: '不必努力，慢慢入睡', items: ['找到舒服的姿势，让身体被承托', '自然呼吸，不憋气，不追求固定频率', '想起今天三件值得感谢的小事', '放下计时，不催促自己必须睡着'] }
]
export function sleepMetrics(entry) {
  const minutes = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const elapsed = (a, b) => (minutes(b) - minutes(a) + 1440) % 1440
  const inBed = elapsed(entry.bed, entry.up)
  const latency = entry.noSleep ? 0 : elapsed(entry.bed, entry.asleep)
  const linger = elapsed(entry.wake, entry.up)
  const sleep = entry.noSleep ? 0 : Math.max(0, elapsed(entry.asleep, entry.wake) - Number(entry.awakeMinutes))
  return { inBed, latency, linger, sleep, efficiency: inBed ? Math.round(sleep / inBed * 100) : 0 }
}
export function downloadText(name, text, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
