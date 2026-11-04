<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { computed as accountComputed } from 'vue'
import { readDream } from '../dream-account'
import DreamExplorationScene from './DreamExplorationScene.vue'
import { isLoggedIn } from '../auth'
const router=useRouter(), route=useRoute(), personal=accountComputed(()=>readDream('snapshots',[])), active=ref(0), modal=ref(null), mode=ref(''), selected=ref(null), notice=ref(''), loading=ref(true)
// Preview cards never enter the user's saved snapshot collection.
const examples=[
 {id:'example-castle',title:'云顶之上',date:'2026-10-26',image:'/dream-overview/cloud-moon.jpg',place:'云顶之上',people:'我、神秘少女、父亲',signal:'我站在城堡的阳台上，他告诉我一个秘密，但风把声音吹散了。',feeling:'失重',motif:'城堡'},
 {id:'example-sea',title:'海边小镇',date:'2026-10-24',image:'/dream-overview/seaside.jpg',place:'海边小镇',people:'我、朋友',signal:'我们在海边散步，聊着未来的计划，笑声被海风带走。',feeling:'安稳',motif:'海边'},
 {id:'example-forest',title:'森林的来信',date:'2026-10-22',image:'/dream-overview/forest.jpg',place:'微光森林',people:'我',signal:'林间有一封没有署名的信，我沿着微光，慢慢找到了回去的路。',feeling:'温暖',motif:'微光'},
 {id:'example-home',title:'旧屋灯光',date:'2026-10-20',image:'/dream-overview/old-room.jpg',place:'旧屋',people:'熟悉的身影',signal:'窗帘轻轻晃动，桌上那盏灯，和记忆里的光一样温暖。',feeling:'怀旧',motif:'灯光'},
 {id:'example-school',title:'回到教室',date:'2026-10-18',image:'/dream-overview/classroom.jpg',place:'高中教室',people:'我、同桌',signal:'我们在讨论一道题，他笑着递来笔，窗外的树叶沙沙作响。',feeling:'平静',motif:'旧屋'}
]
const cards=computed(()=>personal.value.length?personal.value:examples)
const visible=computed(()=>[-1,0,1].map(offset=>({offset,card:cards.value[(active.value+offset+cards.value.length)%cards.value.length]})))
const places=computed(()=>{const groups=new Map();cards.value.forEach(c=>{const name=c.place||c.location;if(name){const key=String(name);if(groups.has(key))groups.get(key).count++;else groups.set(key,{name:key,count:1,card:c})}});return [...groups.values()]})
const links=computed(()=>{const pairs=[];cards.value.forEach((a,i)=>cards.value.slice(i+1).forEach(b=>{const signals=[a.feeling||a.emotion,a.motif].filter(Boolean).filter(x=>[b.feeling||b.emotion,b.motif].includes(x));if(signals.length)pairs.push({a,b,signal:signals.join(' / ')})}));return pairs})
const text=c=>c.signal||c.text||c.summary||c.title||'醒来时留下的一束意识碎片。'
const people=c=>Array.isArray(c.people)?c.people.join('、'):c.people||'尚未留下人物线索'
const place=c=>Array.isArray(c.place||c.location)?(c.place||c.location).join(' / '):c.place||c.location||'尚未标记'
function move(n){active.value=(active.value+n+cards.value.length)%cards.value.length}
function fallback(e){e.target.onerror=null;e.target.src='/dream-overview/cloud-moon.jpg'}
async function open(type,card){mode.value=type;selected.value=card;await nextTick();if(!modal.value.open)modal.value.showModal()}
function login(){router.push(isLoggedIn()?'/capture':'/login?next=/dream')}
let touchX=0
function swipe(e){const delta=e.changedTouches[0].clientX-touchX;if(Math.abs(delta)>45)move(delta<0?1:-1)}
onMounted(async()=>{
 loading.value=false
 if(['map','network'].includes(route.query.scene))await open(route.query.scene)
 const found=cards.value.find(s=>String(s.id)===String(route.query.snapshot));if(found)open('detail',found)
})
</script>

<template>
 <section class="overview-gallery">
  <header class="gallery-heading"><h1>花屿星 <span>梦境空间</span></h1><p>记录每一个梦境，连接每一段记忆</p><small lang="en">Record Every Dream, Connect Every Memory</small></header>
  <p class="gallery-notice" aria-live="polite">{{loading?'正在迎接你的梦境…':notice|| (personal.length?'你的意识快照':'示例梦境 · 不代表个人记录')}}</p>
  <section class="gallery-carousel" aria-label="梦境快照轮播" aria-roledescription="轮播" tabindex="0" @keydown.left.prevent="move(-1)" @keydown.right.prevent="move(1)" @touchstart.passive="touchX=$event.touches[0].clientX" @touchend.passive="swipe">
   <article v-for="item in visible" :key="item.offset" class="dream-slide" :class="'position-'+item.offset" :aria-hidden="item.offset!==0">
    <div class="slide-meta"><strong>梦境 <small>Dream</small></strong><time>{{String(item.card.date||item.card.created_at||'').slice(0,10).replaceAll('-','.')}}</time><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/></svg></div>
    <button class="slide-picture" :tabindex="item.offset===0?0:-1" :aria-label="'查看'+(item.card.title||'意识快照')" @click="open('detail',item.card)"><img :src="item.card.image||'/dream-overview/cloud-moon.jpg'" :alt="item.card.title||'梦境画面'" @error="fallback"><span>{{item.card.title||'一场夜里的梦'}}</span></button>
    <p class="slide-line"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/></svg>地点：{{place(item.card)}}</p>
    <p class="slide-line"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-17a3 3 0 0 1 0 6m3 11v-3a6 6 0 0 0-2-4"/></svg>人物：{{people(item.card)}}</p>
    <p class="slide-excerpt">{{text(item.card)}}</p>
   </article>
   <button class="gallery-arrow previous" aria-label="上一场梦" @click="move(-1)">‹</button><button class="gallery-arrow next" aria-label="下一场梦" @click="move(1)">›</button>
  </section>
  <div class="gallery-dots" aria-label="选择梦境"><button v-for="(c,i) in cards" :key="c.id||i" :class="{active:active===i}" :aria-label="'第'+(i+1)+'场梦：'+(c.title||'快照')" :aria-current="active===i?'true':undefined" @click="active=i"></button></div>
  <section class="gallery-features" aria-label="梦境探索">
   <button class="gallery-feature map-feature" @click="open('map')"><h2>梦境地图</h2><p>探索梦里去过的地方</p><img class="feature-art" src="/dream-overview/city-map.jpg" alt="云海环绕的城堡与梦境地点"></button>
   <button class="gallery-feature network-feature" @click="open('network')"><h2>丝线网络</h2><p>发现梦境之间的联系</p><img class="feature-art" src="/dream-overview/signal-map.jpg" alt="以梦境意象和感受连接的地图"></button>
  </section>
  <div class="gallery-login"><p>{{isLoggedIn()?'把醒来时的片段，轻轻留下':'登录 / 注册，留存你的梦境'}}</p><button @click="login">{{isLoggedIn()?'捕捉昨夜快照':'登录 / 注册'}}</button></div>
  <dialog ref="modal" :class="['gallery-dialog', {'scene-dialog':mode==='map'||mode==='network'}]" aria-label="梦境探索详情" @click="($event.target===modal)&&modal.close()"><div class="gallery-dialog-body"><button v-if="mode!=='map'&&mode!=='network'" class="dialog-close" aria-label="关闭" @click="modal.close()">×</button>
   <template v-if="mode==='detail'&&selected"><small>{{personal.length?'我的意识快照':'示例梦境'}} · {{selected.feeling||selected.emotion||'醒来时的感受'}}</small><h2>{{selected.title||'意识快照'}}</h2><img class="detail-image" :src="selected.image||'/dream-overview/cloud-moon.jpg'" alt="梦境画面" @error="fallback"><p>{{text(selected)}}</p><template v-if="selected.coreReport"><h3>梦境内核测试报告</h3><p>{{selected.coreReport.primary}} × {{selected.coreReport.secondary}}</p><p>{{selected.coreReport.inner}}</p><p>{{selected.coreReport.gravity}}</p></template></template>
   <DreamExplorationScene v-else-if="mode==='map'||mode==='network'" :kind="mode" :cards="cards" :personal="!!personal.length" @select="card=>open('detail',card)" @back="modal.close()" />
  </div></dialog>
 </section>
</template>

<style scoped>
.overview-gallery{max-width:1050px;margin:auto;padding:22px 8px 0;color:#625c58;background:radial-gradient(ellipse at 35% 25%,#f7ede890,transparent 65%)}button{font:inherit;cursor:pointer}button:focus-visible,.gallery-carousel:focus-visible{outline:2px solid #9986b4;outline-offset:4px}.gallery-heading{text-align:center}.gallery-heading h1{font-family:var(--display,'Noto Serif SC',serif);font-size:38px;margin:0 0 12px;font-weight:700;color:#5d5853}.gallery-heading h1 span{font-size:25px;color:#a89cad;margin-left:12px}.gallery-heading p{margin:0;color:#7d7773;font-size:15px}.gallery-heading>small{display:block;margin-top:5px;font-size:11px;color:#958d89}.gallery-notice{text-align:center;min-height:20px;margin:18px 0 6px;color:#8a7e83;font-size:12px}.gallery-carousel{position:relative;height:500px;overflow:hidden;isolation:isolate}.dream-slide{position:absolute;top:18px;left:50%;width:350px;padding:20px;background:#f4eee5;border:1px solid #fffdf8;border-radius:30px;box-shadow:0 14px 30px #5c4b4e15;transform:translateX(-50%);box-sizing:border-box}.position--1{transform:translateX(calc(-150% - 25px)) scale(.86);opacity:.42;z-index:0;background:#eff2e9;pointer-events:none}.position-1{transform:translateX(calc(50% + 25px)) scale(.86);opacity:.42;z-index:0;background:#f0edf4;pointer-events:none}.position-0{z-index:1}.slide-meta{display:flex;align-items:center;gap:8px;margin-bottom:14px}.slide-meta strong{font-size:17px}.slide-meta small{font-size:12px;font-weight:400;color:#979087;margin-left:5px}.slide-meta time{margin-left:auto;font-size:11px;color:#91897f}.slide-meta svg{width:18px;height:18px;stroke:#c9a67f;fill:none;stroke-width:1.4}.slide-picture{display:block;position:relative;width:100%;height:245px;padding:0;border:0;border-radius:19px;overflow:hidden;background:#e7dfe7}.slide-picture img{display:block;width:100%;height:100%;object-fit:cover;transition:transform .5s cubic-bezier(.2,.8,.2,1)}.slide-picture:hover img{transform:scale(1.035)}.slide-picture span{position:absolute;bottom:0;left:0;right:0;text-align:left;padding:24px 14px 11px;color:white;font-size:15px;background:linear-gradient(transparent,#413849a6)}.slide-line{display:flex;align-items:center;gap:6px;margin:13px 0 0;font-size:13px;color:#817a70;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.slide-line svg{width:17px;height:17px;stroke:currentColor;stroke-width:1.5;fill:none;flex-shrink:0}.slide-excerpt{font-size:15px;line-height:1.8;margin:12px 0 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:54px}.gallery-arrow{position:absolute;top:44%;z-index:2;width:49px;height:49px;border-radius:50%;border:1px solid #eee9e2;background:#fffffff2;color:#918e83;font-size:34px;line-height:1;box-shadow:0 5px 15px #66596912}.previous{left:max(12px,calc(50% - 230px))}.next{right:max(12px,calc(50% - 230px))}.gallery-dots{display:flex;align-items:center;justify-content:center;gap:4px;margin:4px 0 20px;flex-wrap:wrap}.gallery-dots button{position:relative;width:28px;height:32px;border:0;background:none;padding:0}.gallery-dots button:after{content:'';position:absolute;width:9px;height:9px;left:9px;top:11px;background:#d4d2c8;border-radius:10px}.gallery-dots button.active{width:37px}.gallery-dots button.active:after{width:29px;left:4px;background:#bfa3aa}.gallery-features{display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:850px;margin:auto}.gallery-feature{text-align:left;border-radius:23px;border:1px solid #fff;background:#fff8f7;padding:19px 23px 5px;box-shadow:0 3px 7px #5b4f6110;overflow:hidden;transition:transform .35s cubic-bezier(.2,.8,.2,1)}.gallery-feature:hover{transform:translateY(-4px)}.gallery-feature h2{font-family:var(--display,serif);font-size:18px;font-weight:700;color:#615760;margin:0}.gallery-feature p{font-size:12px;color:#8d818b;margin:6px 0 0}.gallery-feature svg{width:100%;height:155px;display:block}.map-feature{background:#fbf8f4}.network-feature{background:#fff5f6}.gallery-login{text-align:center;margin:25px auto 36px}.gallery-login p{font-size:14px;color:#8c8386}.gallery-login>button{min-height:50px;width:min(100%,380px);border:1px solid #d2bdcf;background:#dfc8d7;color:#63506c;border-radius:26px;font-size:16px;transition:transform .25s cubic-bezier(.2,.8,.2,1)}.gallery-login>button:hover{transform:translateY(-2px)}.gallery-dialog{border:1px solid #e5dce9;border-radius:25px;padding:0;background:#fffcf8;color:#655c6e;max-width:610px;width:calc(100% - 32px);max-height:85vh;overflow:auto}.gallery-dialog::backdrop{background:#433d4c55;backdrop-filter:blur(5px)}.gallery-dialog-body{position:relative;padding:30px}.dialog-close{position:absolute;right:12px;top:10px;border:0;background:#eee8f1;color:#706079;border-radius:50%;width:36px;height:36px;font-size:24px}.gallery-dialog-body h2{font-family:var(--display,serif);font-size:24px;margin:15px 35px 20px 0}.gallery-dialog-body small{font-size:12px;color:#8d7e96}.gallery-dialog-body p{font-size:15px;line-height:1.9}.detail-image{width:100%;max-height:300px;object-fit:cover;border-radius:16px}.location-map{position:relative;max-height:400px;background:radial-gradient(ellipse,#e4ece1,transparent 70%),#f2f3f4;border-radius:22px;overflow:auto}.location-map button{position:absolute;border:0;background:#ffffffd9;padding:10px;border-radius:15px;font-size:12px;max-width:110px}.location-map button>span{display:block;margin:0 auto 7px;width:12px;height:12px;border-radius:50%;background:#b899c8;box-shadow:0 0 0 6px #ceb8da44}.location-map small{display:block}.network-items{display:grid;gap:12px;margin:24px 0}.network-items button{position:relative;display:flex;align-items:center;gap:12px;text-align:left;padding:15px;border:1px solid #e4d9eb;background:#f8f3fa;border-radius:15px}.network-items strong{font-size:14px;font-weight:500}.network-items small{margin-left:auto}.network-items button>span{width:14px;height:14px;border-radius:50%;background:#c2acd7;flex-shrink:0}.network-items button:not(:last-child):after{content:'';position:absolute;top:100%;left:21px;height:13px;width:1px;background:#cbbbda}
@media(max-width:600px){.overview-gallery{padding:15px 0 0}.gallery-heading h1{font-size:30px}.gallery-heading h1 span{font-size:21px}.gallery-heading p{font-size:13px}.gallery-heading>small{font-size:10px}.gallery-carousel{height:455px;margin-inline:-12px}.dream-slide{width:280px;padding:16px;border-radius:25px}.slide-picture{height:208px}.slide-meta strong{font-size:15px}.slide-meta time{font-size:10px}.slide-meta small{font-size:10px}.slide-excerpt{font-size:14px}.slide-line{font-size:12px}.position--1{transform:translateX(calc(-150% + 15px)) scale(.88)}.position-1{transform:translateX(calc(50% - 15px)) scale(.88)}.gallery-arrow{width:40px;height:40px;font-size:29px}.previous{left:6px}.next{right:6px}.gallery-features{gap:10px}.gallery-feature{padding:14px 12px 0;border-radius:18px}.gallery-feature h2{font-size:16px}.gallery-feature p{font-size:10px}.gallery-feature svg{height:110px}.gallery-dialog-body{padding:25px 20px}.network-items button{flex-wrap:wrap}.network-items small{margin-left:0}.gallery-login{margin-top:20px}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{transition:none!important}}
</style>

<style scoped>
/* Let each supplied illustration dissolve softly into the warm card surface. */
.slide-picture::after{content:'';position:absolute;inset:0;pointer-events:none;border-radius:inherit;background:linear-gradient(to bottom,#f4eee5 0%,transparent 9%,transparent 88%,#f4eee5 100%),linear-gradient(to right,#f4eee5 0%,transparent 7%,transparent 93%,#f4eee5 100%);opacity:.68;mix-blend-mode:screen}
.slide-picture img{-webkit-mask-image:linear-gradient(to bottom,transparent 0%,#000 7%,#000 91%,transparent 100%);mask-image:linear-gradient(to bottom,transparent 0%,#000 7%,#000 91%,transparent 100%)}
.slide-picture span{z-index:1}
.feature-art{display:block;width:100%;height:155px;object-fit:cover;opacity:.88;border-radius:14px;-webkit-mask-image:radial-gradient(ellipse at center,#000 58%,transparent 100%);mask-image:radial-gradient(ellipse at center,#000 58%,transparent 100%)}
.map-feature .feature-art{mix-blend-mode:multiply}
.network-feature .feature-art{mix-blend-mode:multiply}
@media(max-width:600px){.feature-art{height:110px}}
.overview-gallery{background:radial-gradient(ellipse at 50% 18%,#f4e8f5b8,transparent 66%)}
.dream-slide{background:#f5eff6}
.position--1{background:#f1f1e9}
.position-1{background:#f0eaf4}
.slide-picture::after{background:linear-gradient(to bottom,#f5eff6 0%,transparent 9%,transparent 88%,#f5eff6 100%),linear-gradient(to right,#f5eff6 0%,transparent 7%,transparent 93%,#f5eff6 100%)}
.gallery-feature{background:#fbf7fc}
.map-feature,.network-feature{background:#f8f1fa}
</style>

<style scoped>
.location-map{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;padding:25px 18px;min-height:220px;align-content:start}.location-map button{position:static;max-width:none;min-width:0;overflow-wrap:anywhere}.signal-pair{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:14px;border:1px solid #e6dfea;border-radius:16px}.signal-pair>small{width:100%}.signal-pair button{flex:1;justify-content:center}.signal-pair button:after{display:none}
</style>

<style scoped>
.gallery-dialog.scene-dialog{width:min(1200px,calc(100vw - 32px));max-width:1200px;max-height:94dvh;border-radius:25px;background:#f3eef6}.scene-dialog .gallery-dialog-body{padding:0}
@media(max-width:600px){.gallery-dialog.scene-dialog{width:calc(100vw - 12px);max-height:96dvh;border-radius:19px}}
</style>
