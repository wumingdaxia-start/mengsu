<script setup>
import { computed, ref, watch } from 'vue'
import { useDreamJourney, today } from '../composables/useDreamJourney'
import { dreamOwner, dreamReady, dreamError, retryDreamAccount } from '../dream-account'
import { useJourneyUi } from '../composables/useJourneyUi'
const {plan,rituals,commit}=useDreamJourney(),{save,toast}=useJourneyUi()
const bedtime=ref('22:30'),wake=ref('07:00'),busy=ref(false)
watch([dreamOwner,dreamReady,()=>plan.value.bedtime,()=>plan.value.wake],()=>{bedtime.value=plan.value.bedtime||'22:30';wake.value=plan.value.wake||'07:00'},{immediate:true})
const steps=[
 {key:'1-0',before:60,title:'调暗灯光',text:'结束工作提醒，洗漱、换好舒服的睡衣。'},
 {key:'2-4',before:30,title:'放下手机',text:'开启勿扰，读几页纸质书，或安静休息。'},
 {key:'3-0',before:10,title:'准备休息',text:'找个舒服的姿势，自然呼吸，不催促自己睡着。'}
]
const done=computed(()=>rituals.value[today()]||[])
const count=computed(()=>steps.filter(s=>done.value.includes(s.key)).length)
function timeBefore(minutes){const [h,m]=(plan.value.bedtime||'22:30').split(':').map(Number);const n=(h*60+m-minutes+1440)%1440;return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
async function saveSchedule(){if(busy.value||!dreamReady.value||!bedtime.value||!wake.value)return;busy.value=true;try{await save(commit,'plan',{...plan.value,bedtime:bedtime.value,wake:wake.value,started:plan.value.started||today()},'作息已保存，今晚的流程已更新')}finally{busy.value=false}}
async function toggle(key){if(busy.value||!dreamReady.value)return;const date=today(),current=rituals.value[date]||[];busy.value=true;try{await save(commit,'rituals',{...rituals.value,[date]:current.includes(key)?current.filter(x=>x!==key):[...current,key]})}finally{busy.value=false}}
</script>
<template>
 <div class="simple-sleep-plan">
  <p v-if="dreamError" class="j-error" role="alert">计划暂时未能读取。<button @click="retryDreamAccount">重新载入</button></p>
  <p v-else-if="!dreamReady" role="status">正在读取你的睡眠计划…</p>
  <form class="j-panel schedule-panel" @submit.prevent="saveSchedule">
   <h2>先定一个作息</h2><p>选好大致的时间，睡前安排会自动倒推。</p>
   <div class="schedule-fields"><label>准备入睡<input v-model="bedtime" type="time" required :disabled="busy||!dreamReady"></label><label>准备起床<input v-model="wake" type="time" required :disabled="busy||!dreamReady"></label><button class="j-primary" :disabled="busy||!dreamReady||!bedtime||!wake">{{busy?'正在保存…':'保存作息'}}</button></div>
  </form>
  <section class="j-panel tonight-panel">
   <div class="tonight-heading"><div><h2>今晚，简单做三步</h2><p>按已保存的 {{plan.bedtime||'22:30'}} 入睡安排，能做多少就做多少。</p></div><span class="j-tag" role="status">已完成 {{count}} / 3</span></div>
   <div class="tonight-steps"><label v-for="s in steps" :key="s.key" class="tonight-step" :class="{'is-done':done.includes(s.key)}"><input type="checkbox" :checked="done.includes(s.key)" :disabled="busy||!dreamReady" @change="toggle(s.key)"><time>{{timeBefore(s.before)}}</time><span><strong>{{s.title}}</strong><small>{{s.text}}</small></span></label></div>
   <p class="plan-help">每天重新打卡，记录保存在当前账号。不必严格按点，也不用强迫入睡。</p>
  </section>
  <div v-if="toast" class="j-toast" role="status">{{toast}}</div>
 </div>
</template>
<style scoped>
.simple-sleep-plan{max-width:900px;margin:0 auto}.schedule-panel.j-panel,.tonight-panel.j-panel{padding:26px;border:1px solid #e5ddeb;border-radius:20px;background:#fcfafe;box-shadow:none}.simple-sleep-plan h2{margin:0;font:500 23px/1.5 var(--display,serif)}.simple-sleep-plan p{font-size:14px;line-height:1.7;color:#82758f;margin:10px 0 20px}.schedule-fields{display:grid;grid-template-columns:1fr 1fr auto;align-items:end;gap:18px}.schedule-fields label{display:grid;gap:8px;font-size:14px}.schedule-fields input{box-sizing:border-box;width:100%;min-width:0;height:46px}.schedule-fields button{min-height:46px}.tonight-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.tonight-heading .j-tag{white-space:nowrap}.tonight-steps{display:grid;gap:12px}.tonight-step{display:grid;grid-template-columns:20px 56px minmax(0,1fr);align-items:center;gap:16px;padding:18px;border:1px solid #e9e1ef;border-radius:12px;background:white;cursor:pointer}.tonight-step input[type=checkbox]{width:18px;height:18px;margin:0;accent-color:#9179a6}.tonight-step time{font-size:15px;color:#877394;font-variant-numeric:tabular-nums}.tonight-step strong{display:block;font-size:16px;font-weight:500}.tonight-step small{display:block;font-size:14px;line-height:1.7;color:#877b91;margin-top:4px}.tonight-step.is-done{background:#f0eaf6;border-color:#c9b8d9}.simple-sleep-plan .plan-help{margin:18px 0 0;font-size:13px}.simple-sleep-plan button:focus-visible,.tonight-step input:focus-visible{outline:2px solid #947cab;outline-offset:4px}@media(max-width:600px){.schedule-panel.j-panel,.tonight-panel.j-panel{padding:20px 16px}.schedule-fields{grid-template-columns:1fr 1fr;gap:14px}.schedule-fields button{grid-column:1/-1}.tonight-step{grid-template-columns:18px 46px minmax(0,1fr);gap:10px;padding:14px 12px}.tonight-heading{flex-wrap:wrap}.tonight-heading p{margin-bottom:10px}.tonight-heading .j-tag{margin-bottom:16px}.simple-sleep-plan h2{font-size:21px}}
</style>
