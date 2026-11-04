<script setup>
import { computed, ref } from 'vue'
const props=defineProps({nodes:{type:Array,default:()=>[]}})
const emit=defineEmits(['select','back'])
const visited=ref(new Set())
const places=computed(()=>[
 {node:props.nodes[1],x:39,y:21},
 {node:props.nodes[0],x:79,y:26},
 {node:props.nodes[5],x:22,y:70},
 {node:{name:'夜里的钟塔',image:'/dream-overview/night-tower.svg',card:{id:'scene-night-tower',title:'夜里的钟塔',image:'/dream-overview/night-tower.svg',signal:'夜色里，一盏暖灯亮在钟塔深处。风经过，远处的钟声慢慢散开。',feeling:'宁静'}},x:74,y:79}
])
const domes=[{i:7,x:19,y:39},{i:3,x:62,y:32},{i:6,x:44,y:84}]
function visit(node){if(!node)return;visited.value=new Set([...visited.value,node.card.id]);emit('select',node.card)}
</script>

<template>
 <section class="dream-atlas" aria-label="梦境地图">
  <header class="atlas-heading"><button class="icon-control" aria-label="返回梦境总览" @click="emit('back')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5-7 7 7 7"/></svg></button><h2>梦境地图</h2></header>
  <div class="atlas-layout">
   <div class="atlas-land">
    <svg class="landscape" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">
     <defs>
      <radialGradient id="atlas-grass"><stop stop-color="#dce8b9"/><stop offset=".7" stop-color="#c3d7b2"/><stop offset="1" stop-color="#bdd0bd" stop-opacity=".2"/></radialGradient>
      <linearGradient id="atlas-mountain" x2=".7" y2="1"><stop stop-color="#c7c8e1"/><stop offset="1" stop-color="#dfe1ea" stop-opacity=".3"/></linearGradient>
      <filter id="atlas-watercolor"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="3" seed="12"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".12"/></feComponentTransfer><feBlend in="SourceGraphic" mode="soft-light"/></filter>
      <radialGradient id="atlas-fade"><stop offset=".65" stop-color="white"/><stop offset="1" stop-color="black"/></radialGradient>
      <mask id="atlas-edge"><rect width="1000" height="620" fill="url(#atlas-fade)"/></mask>
     </defs>
     <g mask="url(#atlas-edge)">
      <path d="M15 260 145 63 199 119 248 53 345 161 552 118 692 20 817 158 861 131 984 304Z" fill="url(#atlas-mountain)"/>
      <g fill="#b1b1d4" opacity=".35"><path d="m145 63-18 96 50-44-18 55 40-51Z"/><path d="m248 53-28 116 51-67 20 44Z"/><path d="m692 20-40 124 58-70 57 77Z"/></g>
      <path d="M49 276Q87 170 251 162Q384 82 569 125Q739 89 866 224Q1004 310 921 439Q836 547 690 574Q487 651 268 557Q101 538 47 417Q17 347 49 276Z" fill="url(#atlas-grass)" filter="url(#atlas-watercolor)"/>
      <path d="M260 153C174 215 120 283 169 342S278 382 261 453M498 132C553 188 737 177 826 273S869 400 738 456S478 501 522 566S499 615 486 630" fill="none" stroke="#fff9e5" stroke-width="8" stroke-linecap="round"/>
      <path d="M625 204Q504 236 529 310" fill="none" stroke="#fff9e5" stroke-width="7"/>
      <g v-for="(p,i) in [[112,302],[111,405],[241,548],[766,333],[844,442],[876,296],[317,171]]" :key="i" :transform="`translate(${p[0]},${p[1]})`"><ellipse cy="17" rx="17" ry="5" fill="#93ad8d" opacity=".25"/><path d="M0 22V-9" stroke="#aba080" stroke-width="3"/><path d="M-15 10Q-24 0-10-12Q-4-35 5-21Q12-16 13-7Q31 13 13 13Z" fill="#9ebd99" stroke="#e3e8cc"/></g>
      <g v-for="n in 80" :key="n" :transform="`translate(${90+(n*127)%810},${210+(n*71)%320})`" opacity=".35"><path d="M-3 2 0-5 2 2 5-2" fill="none" stroke="#9bb58d"/></g>
     </g>
    </svg>
    <svg class="atlas-connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path v-for="(p,i) in [...places,...domes]" :key="i" :d="`M50 53 Q${(50+p.x)/2-6} ${(53+p.y)/2+4} ${p.x} ${p.y}`"/><circle v-for="(p,i) in [[32,49],[66,45],[71,61],[34,77],[39,35],[65,67]]" :key="'dot'+i" :cx="p[0]" :cy="p[1]" r=".42"/></svg>
    <button class="atlas-center" @click="emit('back')" aria-label="梦境中心，返回梦境总览"><span>梦境中心</span></button>
    <button v-for="p in places" :key="p.node?.card.id" class="atlas-place" :style="{left:p.x+'%',top:p.y+'%'}" @click="visit(p.node)" :aria-label="'查看'+p.node?.name"><img :src="p.node?.image" alt=""><span>{{p.node?.name}}</span></button>
    <button v-for="(p,i) in domes" :key="i" class="atlas-dome" :style="{left:p.x+'%',top:p.y+'%'}" :aria-label="'查看'+nodes[p.i]?.name" @click="visit(nodes[p.i])"><span class="dome-orb"></span><span class="dome-roof"></span><span class="dome-house"></span><small v-if="i===0">{{nodes[p.i]?.name}}</small></button>
    <span v-for="n in 16" :key="n" class="atlas-star" :style="{left:(12+n*23%80)+'%',top:(25+n*17%65)+'%'}" aria-hidden="true">✧</span>
    <div class="atlas-legend"><span>已访问</span><span>探索中</span><span>未解锁</span></div>
   </div>
   <aside class="atlas-guide"><h3>地图指南</h3><div class="guide-copy"><p class="guide-highlight">点击发光节点查看梦境画面</p><p>沿虚线整理记忆之间的联系</p><p>完成记录后回到梦境中心</p><p v-if="visited.size" class="visit-note" role="status">这一程，已停留 {{visited.size}} 处梦境</p></div><div class="atlas-legend"><span>已访问</span><span>探索中</span><span>未解锁</span></div></aside>
  </div>
 </section>
</template>

<style scoped>
.dream-atlas{color:#766187;background:radial-gradient(ellipse at 88% 25%,#e6ddf4,transparent 70%),#f7f5f1;padding:18px 18px 16px;font:15px/1.7 'Microsoft YaHei',sans-serif;isolation:isolate}.atlas-heading{display:flex;gap:14px;align-items:center;position:absolute;z-index:5}.atlas-heading h2{font:600 30px/1.3 SimSun,serif;margin:0}.atlas-heading button{width:50px;height:50px;border:2px solid #89719f;outline:1px solid #b6a6c9;outline-offset:4px;border-radius:50%;background:#fff9;font-size:31px;color:#88719f}.atlas-layout{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:16px}.atlas-land{position:relative;height:640px;min-width:0}.landscape,.atlas-connections{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.atlas-connections path{stroke:#f4ecff;stroke-width:.15;stroke-dasharray:.3 .3;fill:none}.atlas-connections circle{fill:white;filter:drop-shadow(0 0 4px #fff)}button{font:inherit;cursor:pointer}button:focus-visible{outline:3px solid #82669f;outline-offset:5px}.atlas-place{position:absolute;transform:translate(-50%,-50%);width:17%;padding:0;border:0;background:none;z-index:3;color:#685772}.atlas-place img{display:block;box-sizing:border-box;width:100%;aspect-ratio:1.25;object-fit:cover;border:2px solid #fff9df;border-radius:22px;box-shadow:0 0 12px #fff9d8;transition:transform 180ms cubic-bezier(.2,.8,.2,1)}.atlas-place span{display:inline-block;white-space:nowrap;background:#fffaf0ed;border-radius:22px;padding:3px 15px;margin-top:6px;font-family:SimSun,serif;font-size:16px}.atlas-place:hover img{transform:translateY(-4px)}.atlas-center{position:absolute;left:50%;top:53%;transform:translate(-50%,-50%);width:138px;height:138px;border-radius:50%;border:6px double #fff;background:radial-gradient(circle,#fcfaff 15%,#e3def8 55%,#d4d4ff 70%,#fff 74%,#e7e0ff 78%);box-shadow:0 0 0 6px #f8f7ff88,0 0 0 11px #e4e2ff88,0 0 28px 13px #fff;color:#735c87;z-index:3;font:22px SimSun,serif}.atlas-dome{position:absolute;width:65px;height:102px;transform:translate(-50%,-50%);background:none;border:0;padding:0;z-index:2;color:#766187}.dome-orb{position:absolute;top:0;left:5px;width:55px;height:55px;border-radius:50%;background:radial-gradient(circle at 50% 45%,#f3e7ff,#9ba9dd 65%,#7d87c3);box-shadow:0 0 16px #f6f0ff}.dome-orb:after{content:'';position:absolute;inset:13px 10px;border:2px solid #fff3e9;border-bottom-color:transparent;border-right-color:transparent;border-radius:50%;transform:rotate(45deg)}.dome-roof{position:absolute;top:49px;left:0;width:65px;height:13px;background:#929cce;clip-path:polygon(50% 0,100% 100%,0 100%)}.dome-house{position:absolute;top:62px;left:8px;width:48px;height:34px;background:#f8f0e7;border:1px solid #b6b0d1;box-shadow:0 9px 0 6px #f8f1e4;border-radius:0 0 4px 4px}.dome-house:after{content:'';position:absolute;bottom:0;left:18px;width:13px;height:22px;background:#b4bed2}.atlas-dome small{position:absolute;top:73px;left:-5px;white-space:nowrap;background:#fff9;font:12px SimSun,serif}.atlas-star{position:absolute;color:#fffaf6;text-shadow:0 0 7px white;pointer-events:none;font-size:20px}.atlas-legend{display:flex;justify-content:center;gap:14px;padding:13px 17px;border:1px solid #fff9;border-radius:17px;background:#ffffff70;white-space:nowrap;font-size:12px}.atlas-land>.atlas-legend{position:absolute;bottom:0;right:0}.atlas-legend span:before,.guide-copy p:before{content:'';display:inline-block;width:12px;height:12px;border-radius:50%;background:#d6b5f4;border:1px solid white;outline:1px solid #d6c8e3;margin-right:7px;vertical-align:-1px}.atlas-legend span:nth-child(2):before{background:#e6daf9}.atlas-legend span:nth-child(3):before{background:#fff}.atlas-guide{display:flex;flex-direction:column;border:1px solid white;border-radius:25px;background:#faf7ff88;overflow:hidden;box-shadow:0 4px 10px #9785ae12}.atlas-guide h3{text-align:center;background:#dcd2ed65;margin:0;padding:12px;font:600 22px/1.7 SimSun,serif}.guide-copy{padding:23px 17px;flex:1}.guide-copy p{font-size:14px;margin:13px 0;padding:8px 5px}.guide-copy p:before{width:10px;height:10px}.guide-copy .guide-highlight{background:#dfd0f180;border-radius:25px;padding:10px}.guide-copy p:nth-child(2):before{background:white}.guide-copy p:nth-child(3):before{background:#d5e3fa}.guide-copy .visit-note{font-size:12px;color:#8a769a}.guide-copy .visit-note:before{display:none}.atlas-guide>.atlas-legend{margin:12px;border:0;padding:12px 4px;gap:10px}
@media(max-width:900px){.atlas-layout{grid-template-columns:minmax(0,1fr) 210px;gap:8px}.dream-atlas{padding:12px}.atlas-land{height:590px}.atlas-place{width:20%}.atlas-place span{font-size:13px;padding:3px 9px}.atlas-center{width:110px;height:110px;font-size:18px}.atlas-heading h2{font-size:24px}.guide-copy{padding:20px 10px}.atlas-guide>.atlas-legend{flex-wrap:wrap}}
@media(max-width:600px){.atlas-heading{position:relative;margin:6px 8px 12px}.atlas-heading button{width:36px;height:36px}.atlas-layout{display:block}.atlas-land{height:470px}.atlas-place{width:25%}.atlas-place img{border-radius:15px}.atlas-place span{font-size:12px;padding:3px 8px}.atlas-center{width:90px;height:90px;font-size:16px}.atlas-dome{transform:translate(-50%,-50%) scale(.7)}.atlas-guide{margin-top:14px;border-radius:20px}.atlas-guide h3{font-size:19px}.guide-copy{padding:8px 18px}.guide-copy p{margin:5px 0}.atlas-guide>.atlas-legend{display:none}.atlas-land>.atlas-legend{font-size:11px;padding:8px 12px}.dream-atlas{padding:10px}}
@media(prefers-reduced-motion:reduce){.atlas-place img{transition:none}}
</style>
