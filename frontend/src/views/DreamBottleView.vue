<script setup>
import { readDream, writeDream } from '../dream-account'
import { computed, ref, onBeforeUnmount } from 'vue'
import { useJourneyUi } from '../composables/useJourneyUi'
const { toast, notify } = useJourneyUi()
const stage = ref('home')
const types = [
 { name:'心事瓶', note:'倾诉秘密、压力、委屈', color:'#e9afce', icon:'M12 20 4 12C-2 5 7 0 12 7c5-7 14-2 8 5Z' },
 { name:'遗憾瓶', note:'未完成的感情、错过的人', color:'#a7c9ec', icon:'M20 13A8 8 0 1 1 11 4a6 6 0 0 0 9 9Z' },
 { name:'梦想瓶', note:'未来愿望、心中的目标', color:'#ead494', icon:'m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z' },
 { name:'孤独瓶', note:'深夜情绪、没人理解的时刻', color:'#c5b4e9', icon:'M6 18a5 5 0 0 1-1-10 7 7 0 0 1 13-1 5.5 5.5 0 0 1 0 11Z' },
 { name:'快乐瓶', note:'分享一个开心的瞬间', color:'#a5d8c5', icon:'M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0' },
 { name:'晚安瓶', note:'把温柔留给夜晚', color:'#d9c9ec', icon:'M20 13A8 8 0 1 1 11 4a6 6 0 0 0 9 9Z M17 3v4 M15 5h4' }
]
const selected = ref(0)
const draft = ref('')
const moods = [
 {name:'平静',color:'#bcb5ec'}, {name:'松弛',color:'#a9cee9'},
 {name:'轻盈',color:'#b6dfcd'}, {name:'温暖',color:'#f1dfac'},
 {name:'好奇',color:'#edbc9e'}, {name:'柔软',color:'#e8bdd7'}
]
const chosenMood = ref(null)
const sendingStar = ref(false)
const starFlight = ref(false)
const moodPanel = ref(null)
const starButton = ref(null)
const flightOrigin = ref({})
let flightTimer
let disposed = false
onBeforeUnmount(() => { disposed = true; clearTimeout(flightTimer) })
const opened = ref(null)
const starOpened = ref(null)
const load = () => readDream('drift', {})
const stored = load()
const bottles = ref(Array.isArray(stored.bottles) ? stored.bottles : [])
const stars = ref(Array.isArray(stored.stars) ? stored.stars : [])
const favorites = ref(Array.isArray(stored.favorites) ? stored.favorites : [])
const shell = ref(stored.shell || null)
const today = () => new Date().toLocaleDateString('sv-SE')
const shellOpen = ref(false)
const shellLines = ['不必把每一天都过得闪闪发光，安静地度过也很好。','把没有完成的事留给明天，今晚先照顾好自己。','你可以慢一点，海浪也不是一次就抵达岸边。','今天的小小快乐，值得被认真收下。','不急着找到答案，先让心靠一会儿岸。']
async function persist(next) {
 try { await writeDream('drift', {bottles:bottles.value, stars:stars.value, favorites:favorites.value, shell:shell.value, ...next}); return true }
 catch(error) { notify(error.message||'账号记录未能保存，请保留文字后再试。'); return false }
}
async function send() {
 if (!draft.value.trim()) return notify('先写一句想交给海的话吧。')
 const next = [{ id:Date.now(), type:selected.value, text:draft.value.trim(), date:today() }, ...bottles.value]
 if (await persist({bottles:next})) { bottles.value=next; draft.value=''; stage.value='sent'; notify('纸条已封好，保存在你的账号星海。') }
}
async function addStar() {
 if (!chosenMood.value || sendingStar.value) return
 const choice = chosenMood.value
 sendingStar.value = true
 const next = [...stars.value, {id:Date.now(),text:choice.name,mood:choice.name,color:choice.color,date:today()}]
 if (!await persist({stars:next})) { sendingStar.value=false; return }
 if (disposed) return
 stars.value=next
 const source = moodPanel.value?.querySelector('[aria-pressed="true"] .mood-orb')?.getBoundingClientRect()
 const target = starButton.value?.getBoundingClientRect()
 if (source && target) flightOrigin.value={'--from-x':`${source.x+source.width/2-target.x-target.width/2}px`,'--from-y':`${source.y+source.height/2-target.y-target.height/2}px`,'--mood-color':choice.color}
 starFlight.value=true
 flightTimer=setTimeout(()=>{
  starFlight.value=false; sendingStar.value=false; chosenMood.value=null
  notify('今天的心情，成为了一颗星星。')
 },window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:1350)
}
async function openShell() {
 if (shell.value?.date!==today()) {
 const next={date:today(), text:shellLines[Math.floor(Math.random()*shellLines.length)]}
 if(!await persist({shell:next})) return
 shell.value=next
 }
 shellOpen.value=true
}
const samples = [
 {id:'demo1',type:0,text:'今天终于说出了那句一直放在心里的话。还有点紧张，但也轻松了一点。'},
 {id:'demo2',type:1,text:'没能好好告别的人，愿你也在某个地方，过着安稳的日子。'},
 {id:'demo3',type:2,text:'想住在能看见海的地方。先从这个周末，去看一次海开始。'},
 {id:'demo4',type:3,text:'有时候只是想有人一起散散步，不用说很多话。'},
 {id:'demo5',type:4,text:'回家路上遇到一只小猫，它陪我走了很长的一段路。'},
 {id:'demo6',type:5,text:'今天就到这里吧。愿你今晚睡得安稳，醒来有一点新的力气。'}
]
const picked = computed(()=>[...bottles.value.slice(0,3),...samples])
async function favorite(item) {
 if (favorites.value.some(x=>x.id===item.id)) return notify('这封信已经收藏在信箱里了。')
 const next=[item,...favorites.value]
 if(await persist({favorites:next})) {favorites.value=next; notify('已收藏到我的信箱。')}
}
const heading = computed(()=>({action:'把心事交给海',types:'选择漂流瓶',write:'写下心事',sent:'心事已启程',pick:'捞瓶子',sea:'情绪星海',shell:'治愈贝壳',mail:'我的信箱'}[stage.value] || '星屿漂流'))
const tab = ref('sent')
const mail = computed(()=>tab.value==='sent'?bottles.value:favorites.value)
</script>

<template>
<section class="drift" aria-label="漂流瓶">
 <div class="drift-stars" aria-hidden="true"><i v-for="n in 50" :key="n" :style="{left:(n*43%100)+'%',top:(n*29%75)+'%',opacity:.2+(n%4)*.18}" /></div>
 <div class="drift-water" aria-hidden="true"></div>
 <svg class="svg-defs" aria-hidden="true"><defs>
 <linearGradient id="drift-glass" x1="0" x2="1"><stop stop-color="#abc4e9" stop-opacity=".3"/><stop offset=".45" stop-color="#f5f5ff" stop-opacity=".13"/><stop offset="1" stop-color="#9a9cdb" stop-opacity=".4"/></linearGradient>
 <symbol id="drift-bottle" viewBox="0 0 120 200"><path d="M46 20h28v43c0 15 23 22 23 43v64q0 16-18 16H41q-18 0-18-16v-64c0-21 23-28 23-43Z" fill="url(#drift-glass)" stroke="currentColor" stroke-width="1.5"/><path d="M45 19h30v14H45Z" fill="#b5a8b7" stroke="currentColor"/><path d="M33 110v52q0 11 10 11 M52 43v18" fill="none" stroke="#f5eeff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/><path d="m44 96 35 5-5 52-35-5Z" fill="#e7ddea" fill-opacity=".65"/><path d="m49 111 20 3m-21 7 20 3m-21 7 14 2" stroke="#827793" fill="none"/></symbol>
 </defs></svg>
 <header class="drift-top"><button v-if="stage!=='home'" class="text-btn" @click="stage='home';opened=null">〈 回到星海</button><span v-else>花屿星 · 漂流瓶</span><button class="text-btn" @click="stage='mail'">我的信箱 <b>{{bottles.length+favorites.length}}</b></button></header>
 <div class="drift-body">
 <h1>{{heading}}</h1>
 <template v-if="stage==='home'">
 <p class="sub">将心事投入星空之海</p>
 <button class="hero-bottle" aria-label="点击开始漂流" @click="stage='action'"><svg viewBox="0 0 120 200"><use href="#drift-bottle"/></svg><span>点击开始漂流</span></button>
 <div class="home-links"><button @click="stage='sea'"><svg viewBox="0 0 24 24"><path :d="types[2].icon"/></svg>情绪星海<span>让心情化作星星</span></button><button @click="stage='shell';shellOpen=false"><svg viewBox="0 0 24 24"><path d="M12 20C-5 11 4-5 12 5c8-10 17 6 0 15Z M12 6v14 M7 7l5 13 5-13"/></svg>治愈贝壳<span>收下一句温柔的话</span></button></div>
 <p class="closing">治愈你我的心灵</p>
 </template>
 <template v-else-if="stage==='action'">
 <p class="sub">写给星海，也读一读远方的回响</p><div class="action-options"><button @click="stage='types'"><svg viewBox="0 0 120 200"><use href="#drift-bottle"/></svg><strong>扔漂流瓶</strong><span>让一张纸条替你开口</span></button><button @click="stage='pick'"><svg viewBox="0 0 120 200"><use href="#drift-bottle"/></svg><strong>捞漂流瓶</strong><span>遇见一封温柔来信</span></button></div>
 </template>
 <template v-else-if="stage==='types'">
 <p class="sub">为此刻的心情，选一个容器</p><div class="type-grid"><button v-for="(type,i) in types" :key="type.name" :style="{'--bottle-color':type.color}" @click="selected=i;stage='write'"><svg viewBox="0 0 24 24"><path :d="type.icon"/></svg><strong>{{type.name}}</strong><span>{{type.note}}</span></button></div>
 </template>
 <template v-else-if="stage==='write'">
 <p class="sub">不必写得完整，一句话也可以</p><div class="letter"><div class="letter-title" :style="{color:types[selected].color}"><svg viewBox="0 0 24 24"><path :d="types[selected].icon"/></svg>{{types[selected].name}}</div><p>{{types[selected].note}}</p><label class="sr" for="bottle-message">写下心事，最多100字</label><textarea id="bottle-message" v-model="draft" maxlength="100" placeholder="把想说的话，轻轻写在这里……"/><div class="count">{{draft.length}} / 100</div></div><div class="button-row"><button class="quiet" @click="stage='types'">换一种瓶子</button><button class="primary" @click="send">卷起纸条，放入星海</button></div>
 </template>
 <template v-else-if="stage==='sent'">
 <svg class="sent-bottle" viewBox="0 0 120 200"><use href="#drift-bottle"/></svg><p>愿那些暂时说不出口的话，在这里轻轻靠岸。</p><p class="sub">纸条已存入我的信箱，可以随时回来看看。</p><div class="button-row"><button class="quiet" @click="stage='mail'">查看信箱</button><button class="primary" @click="stage='pick'">去捞一封来信</button></div>
 </template>
 <template v-else-if="stage==='pick'">
 <p class="sub">点击瓶子查看内容 · 示例来信与自己的纸条</p><div class="bottle-ocean"><button v-for="(item,i) in picked" :key="item.id" :style="{'--bottle-color':types[item.type].color,'--tilt':((i%3-1)*12)+'deg'}" :aria-label="'打开'+types[item.type].name" @click="opened=item"><svg viewBox="0 0 120 200"><use href="#drift-bottle"/></svg><span>{{types[item.type].name}}</span></button></div>
 </template>
 <template v-else-if="stage==='sea'">
 <p class="sub">不必解释，让一种颜色替你说说此刻的心情</p>
 <div ref="moodPanel" class="mood-palette" role="group" aria-labelledby="mood-question">
  <h2 id="mood-question">今天，你的心是什么颜色？</h2>
  <div class="mood-choices">
   <button v-for="item in moods" :key="item.name" class="mood-choice" :class="{'is-chosen':chosenMood===item}" :style="{'--mood-color':item.color}" :aria-pressed="chosenMood===item" :disabled="sendingStar" @click="chosenMood=item">
    <span class="mood-orb" aria-hidden="true"><i/><b>✧</b><b>✧</b><b>·</b></span><span>{{item.name}}</span>
    <span class="mood-preview" aria-hidden="true">选择这份{{item.name}}</span>
   </button>
  </div>
 </div>
 <p class="mood-caption" role="status">{{chosenMood ? `把这份${chosenMood.name}，轻轻交给星海` : '选择一种颜色，把心情寄放在星海里'}}</p>
 <div class="star-send-wrap" :style="flightOrigin" :class="{'is-flying':starFlight}">
  <button ref="starButton" class="star-send" :disabled="!chosenMood || sendingStar" :aria-busy="sendingStar" @click="addStar">{{sendingStar ? '正在寄往星海…' : '让它飞向星空'}}</button>
  <template v-if="starFlight"><span class="send-ring" aria-hidden="true"/><span class="send-ring second" aria-hidden="true"/><i v-for="n in 18" :key="n" class="flying-dust" :style="{'--offset':(n%5-2)*9+'px','--delay':(n%6)*45+'ms'}" aria-hidden="true"/></template>
 </div>
 <div v-if="stars.length" class="mood-sky saved-sky" aria-label="已保存的心情星星"><button v-for="(star,i) in stars" :key="star.id" :style="{left:8+(i*23%84)+'%',top:12+(i*37%60)+'%',color:star.color||'#eedabd'}" :aria-label="'查看'+star.date+'的心情：'+star.text" @click="starOpened=star">✧</button></div>
 <p v-else class="mood-empty">你的第一颗心情星星，会留在这里。</p>
 <div v-if="starOpened" class="star-note"><p>{{starOpened.text}}</p><small>{{starOpened.date}}</small><button class="text-btn" @click="starOpened=null">收起</button></div>
 </template>
 <template v-else-if="stage==='shell'">
 <p class="sub">海浪为你带来了一只贝壳</p><button class="shell-button" aria-label="打开今日治愈贝壳" @click="openShell"><svg viewBox="0 0 240 200"><defs><linearGradient id="shell-pink" x2=".5" y2="1"><stop stop-color="#efcbdc"/><stop offset="1" stop-color="#b59ccb"/></linearGradient></defs><path d="M120 164C99 173 17 110 22 67 26 41 48 36 62 47 64 17 97 14 111 33 127 3 163 21 169 44 198 29 222 53 218 78 213 117 145 174 120 164Z" fill="url(#shell-pink)" stroke="#f3deec" stroke-width="2"/><path d="M120 158 61 48m59 110-9-125m9 125 49-114M120 158 35 74m85 84 84-85" stroke="#f7e5f3" stroke-opacity=".6" stroke-width="2" fill="none"/><ellipse cx="120" cy="166" rx="32" ry="8" fill="#e4c4df"/></svg></button><div v-if="shellOpen" class="shell-message"><p>{{shell?.text}}</p><small>{{shell?.date}} · 今日的温柔已收下</small></div><template v-else><p>点击贝壳，获取今日治愈</p><p class="sub">每天打开一次，当天可以随时回看</p></template>
 </template>
 <template v-else-if="stage==='mail'">
 <div class="button-row"><button :class="tab==='sent'?'primary':'quiet'" @click="tab='sent'">我投出的瓶子 {{bottles.length}}</button><button :class="tab==='saved'?'primary':'quiet'" @click="tab='saved'">珍藏来信 {{favorites.length}}</button></div><div v-if="!mail.length" class="mail-empty">{{tab==='sent'?'还没有投出的纸条。把第一句心事交给海吧。':'遇到喜欢的来信，可以将它收藏在这里。'}}<button class="primary" @click="stage=tab==='sent'?'types':'pick'">{{tab==='sent'?'写一张纸条':'去捞瓶子'}}</button></div><div v-else class="mail-list"><button v-for="item in mail" :key="item.id" @click="opened=item"><span :style="{color:types[item.type].color}">{{types[item.type].name}} · {{item.date || '示例来信'}}</span><p>{{item.text}}</p></button></div>
 </template>
 </div>
 <footer>账号星海体验 · 纸条仅保存在当前账号，尚未向其他用户投递</footer>
 <div v-if="opened" class="letter-overlay" @click.self="opened=null"><section class="opened-letter" role="dialog" aria-modal="true" aria-label="瓶中来信" @keydown.esc="opened=null"><button autofocus class="close-letter" @click="opened=null">关闭</button><p class="letter-title">{{types[opened.type].name}}</p><small>{{opened.date || '示例来信 · 非真实用户投递'}}</small><p class="message">{{opened.text}}</p><button class="primary" @click="favorite(opened)">收藏这封信</button></section></div>
 <div v-if="toast" class="drift-toast" role="status">{{toast}}</div>
</section>
</template>

<style scoped>
.drift{position:relative;isolation:isolate;overflow:hidden;min-height:760px;border-radius:24px;background:radial-gradient(ellipse at 50% 70%,#514c7a55,transparent 60%),linear-gradient(#202b4b,#323756 65%,#44465e);color:#eeeaf5;padding:24px 32px;font-size:15px;line-height:1.7;font-family:'Noto Sans SC','Microsoft YaHei',sans-serif}.drift *{box-sizing:border-box}.drift button{font:inherit;cursor:pointer;color:inherit}.drift button:focus-visible,.drift textarea:focus-visible{outline:2px solid #e3c9f0;outline-offset:5px}.drift button{transition:transform .3s cubic-bezier(.2,.7,.2,1),background .3s cubic-bezier(.2,.7,.2,1)}.drift button:hover{transform:translateY(-3px)}.drift button:active{transform:translateY(0)}.svg-defs{position:absolute;width:0;height:0}.drift-stars{position:absolute;inset:0;z-index:-1;pointer-events:none}.drift-stars i{position:absolute;width:2px;height:2px;border-radius:50%;background:#fff;box-shadow:0 0 6px #e4d4ff}.drift-water{position:absolute;z-index:-1;bottom:-160px;left:-30%;width:160%;height:440px;border-radius:50%;background:repeating-radial-gradient(ellipse at 50% 0,transparent 0 24px,#c7c8ec0c 25px 26px,transparent 27px 48px);transform:scaleY(.7);pointer-events:none}.drift-top{display:flex;justify-content:space-between;gap:16px;font-size:12px;color:#c5c4dc}.text-btn{border:0;background:transparent;padding:6px 0}.drift-top b{padding:2px 8px;background:#ffffff10;border-radius:20px;margin-left:6px}.drift-body{position:relative;max-width:740px;margin:35px auto 40px;text-align:center;min-height:560px}.drift h1{font-family:'Noto Serif SC','Songti SC',SimSun,serif;font-size:30px;font-weight:500;letter-spacing:.08em;margin:12px 0}.sub{font-size:13px;color:#bbbcd4;margin:12px 0 26px}.hero-bottle{display:flex;flex-direction:column;align-items:center;margin:16px auto 30px;background:none;border:0;color:#c9c4e3!important}.hero-bottle svg{width:145px;height:245px;filter:drop-shadow(0 0 25px #b5b0ee40);transform:rotate(9deg)}.hero-bottle span{font-size:13px;margin-top:8px}.home-links{display:flex;justify-content:center;gap:22px}.home-links button{width:190px;padding:16px;background:#ffffff08;border:1px solid #d3caee25;border-radius:16px;font-size:15px}.home-links svg{display:block;width:25px;height:25px;margin:0 auto 8px}.home-links span{display:block;color:#b8b5ce;font-size:11px;margin-top:6px}.drift svg:not(.sent-bottle) path{stroke-linejoin:round;stroke-linecap:round}.home-links svg,.type-grid svg,.letter-title svg,.sky-empty svg{fill:none;stroke:currentColor;stroke-width:1.3}.closing{font-size:12px;color:#b9b5cd;margin-top:30px}.action-options{display:flex;justify-content:center;gap:25px;margin:55px 0}.action-options button{display:flex;align-items:center;flex-direction:column;width:225px;border:1px solid #dfd6ff30;border-radius:24px;background:#ffffff05;padding:20px}.action-options svg{width:80px;height:145px}.action-options button:nth-child(2) svg{transform:rotate(-18deg)}.action-options span{font-size:12px;color:#bdb9d4;margin-top:10px}.type-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:15px;max-width:590px;margin:30px auto}.type-grid button{display:flex;flex-direction:column;align-items:center;border:1px solid #ddd0f02c;background:#ffffff06;padding:22px 14px;border-radius:18px}.type-grid svg{width:28px;height:28px;color:var(--bottle-color);margin-bottom:10px}.type-grid strong{font-size:15px;font-weight:500;color:var(--bottle-color)}.type-grid span{font-size:12px;color:#bcb8d0;margin-top:5px}.letter{max-width:540px;margin:30px auto 20px;background:#f2edf4;color:#63586f;border-radius:18px;padding:26px;text-align:left;box-shadow:0 14px 50px #11172930}.letter-title{font-family:SimSun,serif;display:flex;align-items:center;gap:10px;font-size:20px}.letter-title svg{width:24px;height:24px}.letter .letter-title{color:#806d97!important}.letter>p{font-size:12px;color:#8b8198}.letter textarea{width:100%;height:180px;resize:vertical;border:0;background:repeating-linear-gradient(transparent 0 35px,#b6a9c329 35px 36px);line-height:36px;color:#5d536a;font:inherit;line-height:36px;padding:10px 0}.letter textarea::placeholder{color:#9d91aa}.count{text-align:right;font-size:12px;color:#9990ad}.button-row{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin:24px 0}.primary,.quiet{border-radius:12px;padding:12px 23px;font-size:13px!important;border:1px solid #d4c4e84d}.primary{background:#c6b5df!important;color:#302a45!important}.quiet{background:#ffffff08}.sent-bottle{width:110px;height:200px;margin:32px auto 10px;color:#d7c9ed;transform:rotate(-15deg)}.bottle-ocean{display:flex;flex-wrap:wrap;justify-content:center;gap:10px 30px;padding:10px 0 40px}.bottle-ocean button{width:100px;margin-top:18px;border:0;background:none;color:var(--bottle-color);transform:rotate(var(--tilt))}.bottle-ocean button:nth-child(even){margin-top:55px}.bottle-ocean button:hover{transform:rotate(0) translateY(-6px)}.bottle-ocean svg{width:90px;height:150px;filter:drop-shadow(0 0 12px #c0bae329)}.bottle-ocean span{font-size:12px;display:block}.mood-sky{position:relative;height:240px;margin:20px auto;border-bottom:1px solid #d3c8ee1c}.mood-sky>button{position:absolute;background:transparent;border:0;color:#eedabd;font-size:27px;text-shadow:0 0 12px #f9ddc7}.sky-empty{padding:45px 10px;color:#d4cbe5}.sky-empty svg{width:35px;height:35px;color:#d6c2e9}.sky-empty p{margin:12px 0 2px}.sky-empty span{font-size:12px;color:#bcb7ce}.mood-entry{max-width:480px;margin:25px auto}.mood-entry textarea{width:100%;min-height:100px;padding:16px;border:1px solid #d0c2eb35;border-radius:15px;background:#ffffff08;color:#f5edf9;font:inherit;resize:vertical}.mood-entry textarea::placeholder{color:#b4adc5}.mood-entry .count{display:block;margin:4px 0 15px;color:#b9b1cd}.star-note{background:#ffffff09;padding:12px 22px;border-radius:15px;max-width:480px;margin:auto;overflow-wrap:anywhere}.star-note p{margin:0}.star-note small{color:#bfb7d3;margin-right:20px}.shell-button{display:block;background:none;border:0;width:280px;max-width:90%;margin:45px auto 20px;filter:drop-shadow(0 0 30px #edbad322)}.shell-button svg{width:100%}.shell-message{max-width:440px;margin:auto;padding:20px;border:1px solid #d3c4de30;border-radius:20px;background:#ffffff06}.shell-message p{font-family:SimSun,serif;font-size:20px;line-height:2;margin:0 0 16px}.shell-message small{color:#bcb5cc}.mail-empty{padding:70px 20px;color:#c7bfd9}.mail-empty button{display:block;margin:25px auto}.mail-list{display:grid;gap:14px;text-align:left}.mail-list button{text-align:left;background:#ffffff08;border:1px solid #d9caed25;border-radius:16px;padding:18px 22px}.mail-list span{font-size:12px}.mail-list p{margin:10px 0;overflow-wrap:anywhere}.drift footer{text-align:center;font-size:11px;color:#aaa8c3;position:relative}.letter-overlay{position:fixed;inset:0;z-index:500;background:#10162cb3;display:flex;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(6px)}.opened-letter{position:relative;border-radius:22px;background:#f1ecf4;color:#62546e;padding:34px;max-width:460px;width:100%;text-align:left}.opened-letter small{font-size:12px;color:#93839e}.opened-letter .message{white-space:pre-wrap;overflow-wrap:anywhere;line-height:2;margin:30px 0}.close-letter{position:absolute;right:20px;top:18px;background:transparent;border:0;font-size:12px!important}.drift-toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);max-width:90vw;width:max-content;padding:12px 22px;background:#f1ecf7;color:#50445f;border:1px solid #d7c7e6;border-radius:12px;z-index:600;font-size:13px;box-shadow:0 6px 30px #0b122833}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
@media(max-width:600px){.drift{padding:18px 17px;border-radius:18px;min-height:730px}.drift-body{margin-top:28px}.drift h1{font-size:26px}.type-grid{gap:10px}.type-grid button{padding:20px 8px}.type-grid span{font-size:11px}.home-links{gap:12px}.home-links button{width:155px;max-width:48%}.action-options{gap:12px}.action-options button{width:48%;padding:16px 8px}.letter{padding:22px 18px}.button-row{gap:10px}.button-row button{padding:12px 16px}.bottle-ocean{gap:8px 12px}.bottle-ocean button{width:80px}.bottle-ocean svg{width:75px;height:130px}.opened-letter{padding:28px 24px}.drift-top{font-size:11px}.sub{font-size:12px}}
@media(prefers-reduced-motion:reduce){.drift *{transition:none!important;animation:none!important}}
.mood-palette{position:relative;margin:36px auto 24px;padding:30px 36px 38px;border:1px solid #d9d3ee66;border-radius:30px;background:#e1d8f407;box-shadow:inset 0 0 0 7px #ddd4f406;outline:1px solid #e2d8f422;outline-offset:7px;text-align:left}
.mood-palette h2{margin:0 0 26px;font:500 22px/1.7 'Songti SC',SimSun,serif;color:#f3eaf5}
.mood-choices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px 20px}
.drift .mood-choice{position:relative;display:flex;align-items:center;justify-content:center;gap:16px;min-height:72px;padding:10px 4px;border:0;border-radius:18px;background:transparent;transform:none;transition:transform .25s cubic-bezier(.23,1,.32,1);font-size:17px}
.mood-orb{position:relative;display:block;flex:0 0 46px;height:46px;border-radius:50%;background:radial-gradient(circle at 34% 28%,#ffffffb3,var(--mood-color) 55%,var(--mood-color));box-shadow:0 0 18px color-mix(in srgb,var(--mood-color) 22%,transparent);transition:transform .3s cubic-bezier(.23,1,.32,1)}
.mood-orb i{position:absolute;inset:-9px;border:1px solid var(--mood-color);border-radius:50%;box-shadow:0 0 20px var(--mood-color);opacity:0;transition:opacity .2s cubic-bezier(.23,1,.32,1)}
.mood-orb b{position:absolute;color:var(--mood-color);font-size:15px;opacity:0;font-weight:400;transition:opacity .2s cubic-bezier(.23,1,.32,1)}
.mood-orb b:nth-of-type(1){left:-17px;top:-10px}.mood-orb b:nth-of-type(2){right:-15px;bottom:-10px}.mood-orb b:nth-of-type(3){right:-10px;top:-17px}
.mood-preview{position:absolute;bottom:calc(100% + 6px);left:50%;transform:translate(-50%,5px);white-space:nowrap;pointer-events:none;border:1px solid #e1d8ed55;border-radius:10px;padding:5px 12px;background:#4d4a65;color:#f3ebdf;font-size:12px;opacity:0;transition:opacity .15s cubic-bezier(.23,1,.32,1),transform .15s cubic-bezier(.23,1,.32,1)}
.mood-choice.is-chosen .mood-orb{transform:scale(1.13)}.mood-choice.is-chosen .mood-orb i{opacity:.6;animation:mood-breathe 3s cubic-bezier(.77,0,.175,1) infinite}.mood-choice.is-chosen .mood-orb b{opacity:.8}
.mood-choice:focus-visible .mood-preview{opacity:1;transform:translate(-50%,0)}
.mood-caption{margin:30px 0 20px;color:#d2cbe0;font-size:14px}.star-send-wrap{position:relative;width:max-content;max-width:100%;margin:0 auto;isolation:isolate}
.drift .star-send{position:relative;border:1px solid #e7def57a;border-radius:18px;background:#c9bbdf;color:#302d48;padding:14px 46px;min-height:52px;transform:none;transition:opacity .2s cubic-bezier(.23,1,.32,1)}
.drift .star-send:disabled{cursor:default;opacity:.5}.drift .star-send[aria-busy=true]{opacity:.8}.mood-choice:disabled{cursor:default}
.send-ring{position:absolute;inset:-6px;border:1px solid #e4d4fa;border-radius:22px;pointer-events:none;animation:star-ring 1s .35s cubic-bezier(.23,1,.32,1) both;z-index:-1}.send-ring.second{animation-delay:.55s}
.flying-dust{position:absolute;left:50%;top:50%;width:4px;height:4px;border-radius:50%;background:var(--mood-color);box-shadow:0 0 8px var(--mood-color);pointer-events:none;animation:star-flight .85s var(--delay) cubic-bezier(.77,0,.175,1) both}
.saved-sky{height:120px;margin-top:32px}.mood-empty{margin-top:38px;font-size:12px;color:#b9b6cc}
@keyframes mood-breathe{0%,100%{transform:scale(.97);opacity:.35}50%{transform:scale(1.12);opacity:.7}}
@keyframes star-flight{0%{transform:translate(calc(var(--from-x) + var(--offset)),var(--from-y));opacity:0}15%{opacity:1}75%{opacity:1}100%{transform:translate(var(--offset),0);opacity:0}}
@keyframes star-ring{0%{transform:scale(.97);opacity:.7}100%{transform:scale(1.7);opacity:0}}
@media(hover:hover) and (pointer:fine){.drift .mood-choice:not(:disabled):hover{transform:translateY(-4px)}.mood-choice:not(:disabled):hover .mood-orb i{opacity:.4}.mood-choice:not(:disabled):hover .mood-orb b{opacity:.8}.mood-choice:not(:disabled):hover .mood-preview{opacity:1;transform:translate(-50%,0)}}
@media(max-width:600px){.mood-palette{padding:24px 14px 28px;margin-top:28px;border-radius:24px}.mood-palette h2{font-size:19px;margin-bottom:25px}.mood-choices{grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 10px}.drift .mood-choice{font-size:15px;gap:13px}.mood-orb{flex-basis:38px;height:38px}.mood-caption{font-size:12px}.drift .star-send{padding:13px 32px}}
@media(prefers-reduced-motion:reduce){.mood-choice.is-chosen .mood-orb i{opacity:.6}.flying-dust,.send-ring{display:none}}
</style>
