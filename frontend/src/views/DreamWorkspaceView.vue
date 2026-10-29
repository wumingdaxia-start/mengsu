<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DreamOverviewGallery from '../components/DreamOverviewGallery.vue'

import { today, useDreamJourney } from '../composables/useDreamJourney'
const router=useRouter()
const { journals, plan, refresh }=useDreamJourney()
const planetNotice=ref('')
const planetDates=computed(()=>new Set(journals.value.map(j=>j.date)))
const planetGrowth=computed(()=>Math.min(30,planetDates.value.size))
const planetStart=computed(()=>plan.value.started||today())
const planetDays=computed(()=>Array.from({length:30},(_,i)=>{const d=new Date(planetStart.value+'T12:00:00');d.setDate(d.getDate()+i);return{day:i+1,date:d.toLocaleDateString('sv-SE')}}))
onMounted(refresh)
</script>
<template><div class="overview-page"><DreamOverviewGallery/><details class="sleep-growth"><summary>我的睡眠星球 <span>{{planetGrowth}} / 30 个夜晚</span></summary> <section class="planet-overview" aria-label="梦境星球成长"><div class="planet-orbit" aria-hidden="true"><svg viewBox="0 0 520 300"><defs><radialGradient id="overviewPlanet"><stop stop-color="#fff9eb"/><stop offset=".68" stop-color="#c9d9d5"/><stop offset="1" stop-color="#adb7cc"/></radialGradient></defs><g fill="#c5bdd8"><circle v-for="i in 18" :key="i" :cx="22+(i*71)%476" :cy="18+(i*47)%238" :r="i%3===0?2.3:1.1"/></g><ellipse cx="260" cy="160" rx="190" ry="42" fill="none" stroke="#d2c7df" stroke-width="2" transform="rotate(-16 260 160)"/><circle cx="260" cy="148" r="92" fill="url(#overviewPlanet)"/><path d="M178 146q38-29 76 5t92-9 M186 180q52-28 126 4" fill="none" stroke="#adc5b9" stroke-width="12" opacity=".65"/><g v-for="i in Math.min(planetGrowth,18)" :key="i" :transform="'translate('+(189+i*31%128)+' '+(104+i*23%88)+')'"><path d="M0 10V-7 M0 1q-12-13-11-15Q2-14 0 1 M0-3q12-12 14-10Q15-3 0-3" fill="#88a88c"/></g></svg></div><div class="planet-overview-copy"><span class="planet-kicker">梦境总览 · 30 天意识生长</span><h2>{{planetGrowth===0?'第一束微光，还在等你':planetGrowth<10?'小小的绿意，开始生长':planetGrowth<22?'星球已经长出自己的花园':'被照顾的夜晚，正在开花'}}</h2><p>每一次睡眠日记，都会为这颗星球留下一点生机。已留下 <strong>{{planetGrowth}}</strong> 个不同日期的睡眠回执。</p><button @click="router.push('/dream/sleep-diary')">{{planetDates.has(today())?'看看今天的回执':'给星球留下一晚'}} ↗</button><div class="planet-progress"><span :style="{transform:'scaleX('+planetGrowth/30+')'}"></span></div><small>记录旅程 {{Math.round(planetGrowth/30*100)}}% · 不是健康评分</small></div><div class="planet-days"><button v-for="d in planetDays" :key="d.date" :class="{'is-recorded':planetDates.has(d.date)}" :aria-label="d.date+(planetDates.has(d.date)?' 已记录':' 未记录')" @click="planetNotice=d.date+(planetDates.has(d.date)?' 已留下回执':' 还没有回执，按自己的节奏来')"><span>{{String(d.day).padStart(2,'0')}}</span><small>{{planetDates.has(d.date)?'已留光':'待生长'}}</small></button></div><p class="planet-notice" role="status">{{planetNotice}}</p></section>
</details></div></template>
<style scoped>
.overview-page{max-width:1100px;margin:auto}.sleep-growth{margin:16px auto;max-width:850px;border-top:1px solid #e6dfeb}.sleep-growth summary{cursor:pointer;padding:20px 4px;color:#81768c;font-size:14px}.sleep-growth summary>span{float:right;font-size:12px}.planet-overview button{font:inherit;cursor:pointer}button:focus-visible,summary:focus-visible{outline:2px solid #a693c4;outline-offset:4px}
/* Sleep planet now lives within the overview, sharing the sleep diary state. */
.planet-overview{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,.9fr);gap:12px 24px;align-items:center;margin-top:34px;padding:24px 26px;border:1px solid #e6e1ef;border-radius:30px;background:linear-gradient(115deg,#f8fbf9b8,#faf6fcb8)}
.planet-orbit{min-width:0}.planet-orbit svg{display:block;width:100%;height:auto;max-height:310px}
.planet-overview-copy{min-width:0}.planet-overview-copy h2{font-size:20px;line-height:1.6;margin:12px 0;font-family:var(--display,serif);color:#625e78}.planet-overview-copy p{font-size:14px;line-height:1.9;color:#747084}.planet-overview-copy strong{font-weight:600;color:#6b786f}
.planet-kicker{font-size:12px;color:#777184}.planet-overview-copy button{padding:11px 17px;border:1px solid #d8cfe5;border-radius:16px;background:#f7f3fb;color:#716184;min-height:44px;transition:transform .3s cubic-bezier(.2,.8,.2,1),background .3s cubic-bezier(.2,.8,.2,1)}.planet-overview-copy button:hover{transform:translateY(-2px);background:#efe8f7}.planet-overview-copy>small{font-size:12px;color:#777184}
.planet-progress{height:5px;border-radius:10px;background:#e7e2ee;overflow:hidden;margin:22px 0 12px}.planet-progress span{display:block;width:100%;height:100%;transform-origin:left;background:#a496b9;transition:transform .6s cubic-bezier(.2,.8,.2,1)}
.planet-days{grid-column:1/-1;display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:7px;padding-top:18px;border-top:1px solid #e6e1ed}.planet-days button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:57px;padding:8px 3px;border:1px solid #e5deec;border-radius:12px;background:#fcfafc;color:#777084;font-variant-numeric:tabular-nums}.planet-days button small{font-size:10px}.planet-days button.is-recorded{color:#526d60;border-color:#c9ddd4;background:#eef6f1}.planet-days button:hover{border-color:#b7a5ce}.planet-notice{grid-column:1/-1;margin:0;min-height:20px;font-size:12px;color:#716184}
@media(max-width:800px){.planet-overview{grid-template-columns:1fr;padding:20px 17px;gap:12px}.planet-orbit{max-width:420px;width:100%;margin:auto}.planet-overview-copy h2{font-size:18px}.planet-days{grid-template-columns:repeat(5,minmax(0,1fr));gap:6px}}


</style>