<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { safetyRequest } from '../auth'
import { testAccount } from '../test-results'
const props = defineProps({ record: Object })
const busy=ref(false), saved=ref(false), message=ref(''), stale=ref(false)
let owner=testAccount(), generation=0, id=crypto.randomUUID()
watch(()=>props.record,()=>{ generation++; id=crypto.randomUUID(); saved.value=false; message.value=''; stale.value=false; owner=testAccount(); save() })
function accountChanged(){ if(owner!==testAccount()){generation++;stale.value=true;saved.value=false;message.value='账号已变化，请重新完成测试后保存。'} }
onMounted(()=>{window.addEventListener('mengsu:auth-change',accountChanged);save()})
onBeforeUnmount(()=>{generation++;window.removeEventListener('mengsu:auth-change',accountChanged)})
async function save(){
 if(busy.value||saved.value||stale.value||!props.record)return
 if(!owner||owner!==testAccount()){message.value='当前是访客模式，结果尚未保存。请先登录账号，再完成测试以自动保存。';return}
 const version=generation; busy.value=true;message.value=''
 try{await safetyRequest('/api/psychology-tests',{method:'POST',headers:{'Content-Type':'application/json','X-Health-User':owner},body:JSON.stringify({...props.record,id})});if(version===generation&&owner===testAccount()){saved.value=true;message.value='已保存，可在心理总览回看。'}}
 catch(e){if(version===generation)message.value=e.message}
 finally{busy.value=false;if(version!==generation&&!stale.value)save()}
}
</script>
<template><div class="test-save"><button :disabled="busy||saved||stale" @click="save">{{ busy?'正在保存…':saved?'已保存到心理总览':'重试保存' }}</button><RouterLink to="/psychology">前往心理总览 →</RouterLink><p v-if="message" role="status">{{ message }}</p><small v-else>登录后完成测试会自动保存，可在心理总览回看。</small></div></template>
<style scoped>.test-save{padding:20px 0;display:flex;gap:14px;align-items:center;flex-wrap:wrap;color:hsl(var(--psych-hue, 145) 16% 41%);font-size:13px}.test-save button{font:inherit;padding:10px 16px;border:1px solid hsl(var(--psych-hue, 145) 16% 53%);border-radius:7px;background:hsl(var(--psych-hue, 145) 15% 95%);color:hsl(var(--psych-hue, 145) 16% 43%);cursor:pointer}.test-save button:disabled{opacity:.65;cursor:default}.test-save p,.test-save small{flex-basis:100%;margin:0;overflow-wrap:anywhere}.test-save a{color:inherit}.test-save :focus-visible{outline:2px solid hsl(var(--psych-hue, 145) 16% 44%);outline-offset:3px}</style>
