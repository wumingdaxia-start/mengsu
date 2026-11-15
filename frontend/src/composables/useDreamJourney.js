import { computed } from 'vue'
import { readDream, writeDream, refreshHealthSleep } from '../dream-account'

const defaults={snapshots:[],journals:[],plan:{bedtime:'22:30',wake:'07:00',started:'',completed:[]},rituals:{},holes:[],posts:[],creations:[]}
const state=Object.fromEntries(Object.entries(defaults).map(([key,fallback])=>[key,computed(()=>readDream(key,fallback))]))
state.journals=computed(()=>{
 const diaries=readDream('journals',[]), merged=new Map(diaries.map(j=>[j.date,j]))
 for(const r of readDream('healthSleep',[])){
  if(!r||typeof r!=='object'||!r.date||!Number.isFinite(Number(r.hours)))continue
  const existing=merged.get(r.date)
  merged.set(r.date,{...(existing||{id:'health-'+r.date,date:r.date,body:[],emotion:[],note:'',awakenings:0,awakeMinutes:0}),reportedHours:Number(r.hours),fromHealth:true,summaryOnly:!existing,quality:existing?.quality||(['','很差','不太好','一般','还不错','很好'][r.quality]||'未填写感受')})
 }
 return [...merged.values()].sort((a,b)=>b.date.localeCompare(a.date))
})
export const today = () => new Date().toLocaleDateString('sv-SE')
export function useDreamJourney() {
  return { ...state, commit: writeDream, refresh: refreshHealthSleep }
}
export const demoDreams = [
  { id: 'library-fog', title: '雾中阶梯', signal: '沿着云雾中的阶梯慢慢向上，尽头有一扇亮着灯的门。', date: '2026-10-26', feeling: '失重', motif: '阶梯', image: '/dream-library/mist-stairs.jpg', demo: true },
  { id: 'library-room', title: '卧室夜晚与窗边人影', signal: '旧屋的窗边站着熟悉的身影，窗帘被风轻轻吹动。', date: '2026-10-24', feeling: '温暖', motif: '旧屋', image: '/dream-library/night-bedroom.jpg', demo: true },
  { id: 'library-snow', title: '雪山回声', signal: '在很安静的雪山中，听到远处传来自己的回声。', date: '2026-10-22', feeling: '疏离', motif: '山谷', image: '/dream-library/snow-mountain.jpg', demo: true },
  { id: 'library-forest', title: '迷雾森林的低语', signal: '穿过一片有微光的树林，树叶像在轻声说话。', date: '2026-10-20', feeling: '安稳', motif: '森林', image: '/dream-library/mist-forest.jpg', demo: true },
  {"id":"library-example-01","title":"星河邮递员","signal":"我背着装满信件的布包走在银河边。每一封没能说出口的话，都变成一颗小星星。我把它们送到山顶的邮筒，远处有人亮起一盏灯，像是在说已经收到了。","date":"2026-11-10","feeling":"浪漫","motif":"星空","image":"/dream-library/star-postman.png","demo":true},
  {"id":"library-example-02","title":"海底钢琴师","signal":"我坐在透明的海底琴房里，按下琴键时，音符变成银色小鱼。珊瑚随着旋律轻轻摇晃，一只海龟停在窗外听了很久。这里没有催促，只有缓慢流动的蓝色。","date":"2026-11-10","feeling":"安静","motif":"深海","image":"/dream-library/underwater-pianist.png","demo":true},
  {"id":"library-example-03","title":"鲸落花园","signal":"一条巨大的鲸缓缓游过夜空，最后沉入一片深蓝的海。它经过的地方开出发光的小花。我坐在花园旁翻书，每一页都映着微弱的星光。","date":"2026-11-09","feeling":"治愈","motif":"海洋","image":"/dream-library/whale-garden.png","demo":true},
  {"id":"library-example-04","title":"月光列车","signal":"没有站名的列车沿月光铺成的轨道行驶。车窗外依次经过小时候的院子和夏天的田野。我没有下车，只把额头靠在玻璃上，听车轮温柔地响。","date":"2026-11-09","feeling":"怀念","motif":"列车","image":"/dream-library/moonlight-train.png","demo":true},
  {"id":"library-example-05","title":"蜂蜜湖","signal":"湖面泛着淡金色的光，岸边的长椅像一块松软的饼干。我把一整天的琐事折成纸船放进水里，它们慢慢漂远，湖对面的城堡响起了晚钟。","date":"2026-11-08","feeling":"甜美","motif":"湖泊","image":"/dream-library/snow-mountain.jpg","demo":true},
  {"id":"library-example-06","title":"时间邮局","signal":"邮局只在午夜开门，柜台后的人递给我一封未来寄来的信。信上只有一句“慢一点也没关系”。我把信装进口袋，走出门时，街上的钟同时停了一秒。","date":"2026-11-08","feeling":"释然","motif":"城市","image":"/dream-library/night-bedroom.jpg","demo":true},
  {"id":"library-example-07","title":"棉花糖云","signal":"我牵着一只小风筝走上云层，脚下像踩着软软的棉花糖。风里有熟悉的甜味，几个小朋友把笑声装进玻璃瓶，邀请我一起带回地面。","date":"2026-11-07","feeling":"轻快","motif":"天空","image":"/dream-library/mist-stairs.jpg","demo":true},
  {"id":"library-example-08","title":"南极剧场","signal":"冰原上的企鹅围成一个小剧场，幕布是垂下来的极光。我坐在最后一排，看影子表演一段没有台词的故事。散场时，大家把掌声留在了雪里。","date":"2026-11-07","feeling":"奇妙","motif":"冰原","image":"/dream-library/antarctic-theatre.png","demo":true},
  {"id":"library-example-09","title":"雾岛来信","signal":"花园里升起一座巨大的发条机器，转动时会把梦吹成小纸片。一朵花递给我一封没有署名的信，我读不清字，却记得那种被惦记的感觉。","date":"2026-11-06","feeling":"好奇","motif":"花园","image":"/dream-library/mist-island-letter.png","demo":true},
  {"id":"library-example-10","title":"沙漏海底","signal":"我走进海底的一只巨大沙漏，细沙像星光一样缓缓落下。珊瑚在身边围成台阶，我坐下来数着气泡，忽然发现这里的时间可以慢慢用。","date":"2026-11-06","feeling":"安稳","motif":"海底","image":"/dream-library/undersea-hourglass.png","demo":true},
  {"id":"library-example-11","title":"蓝色水族馆","signal":"水族馆没有屋顶，蓝色光线直接连着夜空。游鱼游过头顶时变成移动的星星。我沿着空荡的走廊走，一路都有柔和的光陪着。","date":"2026-11-05","feeling":"宁静","motif":"水族馆","image":"/dream-library/blue-aquarium.png","demo":true},
  {"id":"library-example-12","title":"梦醒灯塔","signal":"灯塔只在梦醒前亮起。我站在海岸上，看它的光扫过那些模糊的小路。每条路都有不同的脚印，而回家的那条路，刚好亮在脚边。","date":"2026-11-05","feeling":"温暖","motif":"灯塔","image":"/dream-library/dream-lighthouse.png","demo":true},
  {"id":"library-example-13","title":"云端图书馆","signal":"我爬上很长的楼梯，来到一间漂浮的图书馆。书架之间飘着薄薄的云，每本书都记着一个普通人的一天。我翻到自己的那页，上面写着今天已经很努力了。","date":"2026-11-04","feeling":"安心","motif":"书房","image":"/dream-library/mist-stairs.jpg","demo":true},
  {"id":"library-example-14","title":"萤火森林","signal":"夜里的森林没有路灯，萤火虫却排成一条小路。我跟着它们找到一棵空心的老树，树洞里放着小时候丢失的玩具。拿起它时，树林响起细碎的风声。","date":"2026-11-04","feeling":"怀念","motif":"森林","image":"/dream-library/mist-forest.jpg","demo":true},
  {"id":"library-example-15","title":"雨天面包店","signal":"街角的面包店只在下雨时出现。我推开门，闻到刚烤好的面包香气。老板没有问我想买什么，只递来一杯热水，让我等雨小一点再出发。","date":"2026-11-03","feeling":"被照顾","motif":"街道","image":"/dream-library/rainy-bakery.png","demo":true},
  {"id":"library-example-16","title":"星屑游乐场","signal":"旋转木马缓缓升上夜空，彩灯变成一串串星屑。摩天轮停在最高处时，我看见城市里每一扇亮着的窗。原来这么晚，还有很多人醒着。","date":"2026-11-03","feeling":"雀跃","motif":"游乐场","image":"/dream-library/stardust-amusement.png","demo":true},
  {"id":"library-example-17","title":"漂浮的卧室","signal":"醒来发现整个卧室漂在平静的水面上，床边有小鱼经过。窗帘轻轻摆动，远处有人划着小船送早餐。我没有着急靠岸，只静静听水声。","date":"2026-11-02","feeling":"放松","motif":"卧室","image":"/dream-library/floating-bedroom.png","demo":true},
  {"id":"library-example-18","title":"月亮修补铺","signal":"巷子尽头有一家修补月亮的小店，桌上摆着细线和银色布片。我帮店主缝好一个小缺口，天空便亮了一点。他送我一颗不刺眼的小灯。","date":"2026-11-02","feeling":"满足","motif":"月亮","image":"/dream-library/moon-repair-shop.png","demo":true},
  {"id":"library-example-19","title":"雪地热茶","signal":"雪下得很慢，我和很久没见的朋友坐在木屋门口。两杯热茶冒着白气，我们没说多少话，却好像已经聊了很久。天快亮时，他笑着挥了挥手。","date":"2026-11-01","feeling":"思念","motif":"雪地","image":"/dream-library/snow-tea.png","demo":true},
  {"id":"library-example-20","title":"风的收藏室","signal":"我打开阁楼的一扇小门，里面摆满透明的瓶子。每个瓶子都装着一种风，有夏天树荫下的，也有放学路上的。我挑了一瓶最熟悉的，轻轻放在窗边。","date":"2026-11-01","feeling":"自在","motif":"阁楼","image":"/dream-library/wind-collection.png","demo":true}
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
  if(entry.summaryOnly)return {sleep:Math.round(entry.reportedHours*60),inBed:null,latency:null,linger:null,efficiency:null}
  const minutes = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const elapsed = (a, b) => (minutes(b) - minutes(a) + 1440) % 1440
  const inBed = elapsed(entry.bed, entry.up)
  const latency = entry.noSleep ? 0 : elapsed(entry.bed, entry.asleep)
  const linger = elapsed(entry.wake, entry.up)
  const sleep = Number.isFinite(entry.reportedHours) ? Math.round(entry.reportedHours*60) : entry.noSleep ? 0 : Math.max(0, elapsed(entry.asleep, entry.wake) - Number(entry.awakeMinutes))
  return { inBed, latency, linger, sleep, efficiency: inBed ? Math.round(sleep / inBed * 100) : 0 }
}
export function downloadText(name, text, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
