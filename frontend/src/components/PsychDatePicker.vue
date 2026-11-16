<script setup>
import {computed,ref,watch,onMounted,onBeforeUnmount,nextTick} from 'vue'
const props=defineProps({modelValue:{type:String,default:''},max:{type:String,required:true}})
const emit=defineEmits(['update:modelValue'])
const root=ref(null),trigger=ref(null),open=ref(false),mode=ref('days'),year=ref(2026),month=ref(1)
const maxYear=computed(()=>Number(props.max.slice(0,4)))
function reset(){const value=props.modelValue||props.max;year.value=Number(value.slice(0,4));month.value=Number(value.slice(5,7));mode.value='days'}
function toggle(){if(!open.value)reset();open.value=!open.value}
function close(){open.value=false}
function escape(e){if(e.key==='Escape'&&open.value){e.stopPropagation();close();nextTick(()=>trigger.value?.focus())}}
function outside(e){if(!root.value?.contains(e.target))close()}
function clampYear(){year.value=Math.min(maxYear.value,Math.max(1900,Number(year.value)||maxYear.value));if(year.value===maxYear.value)month.value=Math.min(month.value,Number(props.max.slice(5,7)))}
function shift(delta){let y=Number(year.value),m=month.value+delta;if(m<1){m=12;y--}if(m>12){m=1;y++}if(y<1900||`${y}-${String(m).padStart(2,'0')}`>props.max.slice(0,7))return;year.value=y;month.value=m}
const key=d=>`${year.value}-${String(month.value).padStart(2,'0')}-${String(d).padStart(2,'0')}`
const cells=computed(()=>{const y=Number(year.value);if(y<1900||y>maxYear.value)return [];const offset=(new Date(y,month.value-1,1).getDay()+6)%7;return [...Array(offset).fill(0),...Array.from({length:new Date(y,month.value,0).getDate()},(_,i)=>i+1)]})
function select(d){const value=key(d);if(value>props.max)return;emit('update:modelValue',value);close();nextTick(()=>trigger.value?.focus())}
function chooseMonth(m){month.value=m;mode.value='days'}
function current(){reset();year.value=maxYear.value;month.value=Number(props.max.slice(5,7));emit('update:modelValue',props.max);close();nextTick(()=>trigger.value?.focus())}
watch(()=>props.modelValue,()=>{if(!open.value)reset()})
onMounted(()=>{document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape)})
onBeforeUnmount(()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)})
</script>
<template>
 <div ref="root" class="psych-calendar">
  <button ref="trigger" type="button" class="calendar-trigger" :aria-expanded="open" aria-label="选择记录日期" @click="toggle"><span>{{modelValue?modelValue.replaceAll('-',' / '):'选择日期'}}</span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 11h16"/></svg></button>
  <section v-if="open" class="calendar-popover" role="group" aria-label="记录日期选择器">
   <div class="calendar-heading"><button type="button" aria-label="上个月" :disabled="Number(year)===1900&&month===1" @click="shift(-1)">‹</button><div class="calendar-year"><input v-model="year" type="number" min="1900" :max="maxYear" aria-label="年份，可直接输入" @change="clampYear" @keydown.enter.prevent="clampYear"/><span>年</span><button type="button" :aria-expanded="mode==='months'" @click="clampYear();mode=mode==='months'?'days':'months'">{{month}}月 ▾</button></div><button type="button" aria-label="下个月" :disabled="key(1).slice(0,7)>=max.slice(0,7)" @click="shift(1)">›</button></div>
   <p class="calendar-hint">年份可直接输入，点击月份快速切换</p>
   <div v-if="mode==='months'" class="calendar-months"><button v-for="m in 12" :key="m" type="button" :class="{selected:m===month}" :aria-pressed="m===month" :disabled="Number(year)<1900||Number(year)>maxYear||`${year}-${String(m).padStart(2,'0')}`>max.slice(0,7)" @click="chooseMonth(m)">{{m}}月</button></div>
   <div v-else class="calendar-days"><small v-for="w in ['一','二','三','四','五','六','日']" :key="w">{{w}}</small><template v-for="(d,i) in cells" :key="i"><button v-if="d" type="button" :aria-label="key(d)" :aria-pressed="key(d)===modelValue" :class="{selected:key(d)===modelValue,today:key(d)===max}" :disabled="key(d)>max" @click="select(d)">{{d}}</button><span v-else/></template></div>
   <div class="calendar-footer"><button type="button" @click="close">收起</button><button type="button" @click="current">回到今天</button></div>
  </section>
 </div>
</template>
<style scoped>
.psych-calendar{position:relative;min-width:175px;color:#715e50;font:14px/1.6 var(--ui,sans-serif)}.psych-calendar button{cursor:pointer}.psych-calendar .calendar-trigger{display:flex;align-items:center;justify-content:space-between;gap:18px;width:100%;padding:9px 12px!important;border:1px solid #decbbc!important;border-radius:9px;background:#fffaf5!important;color:#715e50!important;font-size:13px!important}.calendar-trigger svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.5}.calendar-popover{position:absolute;right:0;top:calc(100% + 9px);z-index:20;width:300px;max-width:calc(100vw - 48px);padding:16px;border:1px solid #e5d4c6;border-radius:16px;background:#fffcf8;box-shadow:0 12px 32px #78523c14;text-align:left}.calendar-heading{display:flex;align-items:center;justify-content:space-between;gap:6px}.psych-calendar .calendar-heading>button{width:30px;height:34px;padding:0!important;font-size:23px!important}.calendar-year{display:flex;align-items:center;gap:6px}.psych-calendar .calendar-year input{width:72px;min-width:0;padding:5px 3px!important;border:1px solid #e3d3c7!important;border-radius:6px;background:white!important;color:#715e50;font-size:14px;text-align:center;appearance:textfield}.calendar-year input::-webkit-inner-spin-button{appearance:none}.calendar-year>span{font-size:12px}.psych-calendar .calendar-year button{padding:5px 8px!important;background:#f4e9df!important;border-radius:6px}.calendar-hint{font-size:11px!important;color:#a28c7c!important;margin:10px 0 12px!important;line-height:1.6!important}.calendar-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}.calendar-days small{text-align:center;font-size:11px;padding:3px;color:#a08b7c}.psych-calendar .calendar-days button,.psych-calendar .calendar-months button{display:grid;place-items:center;min-width:0;min-height:32px;padding:4px!important;border:1px solid transparent!important;border-radius:7px!important;background:transparent!important;color:#775f50!important;font-size:13px!important}.calendar-months{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:4px 0 12px}.psych-calendar .calendar-months button{min-height:42px;background:#f8f1ea!important}.psych-calendar button:hover:not(:disabled){background:#f0e2d6!important}.psych-calendar button.selected{background:#ad8468!important;color:white!important;border-color:#ad8468!important}.psych-calendar button.today:not(.selected){border-color:#d2b197!important}.psych-calendar button:disabled{opacity:.3;cursor:default}.calendar-footer{display:flex;justify-content:space-between;border-top:1px solid #ede0d6;margin-top:12px;padding-top:10px}.psych-calendar .calendar-footer button{padding:4px 0!important;font-size:12px!important;color:#98745b!important}.psych-calendar button:focus-visible,.psych-calendar input:focus-visible{outline:2px solid #ad8468;outline-offset:2px}
@media(max-width:600px){.calendar-popover{position:fixed;top:160px;right:16px;left:auto;width:300px;max-width:calc(100vw - 66px)}}
</style>
