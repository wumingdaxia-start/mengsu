<script setup>
import {computed,nextTick,onBeforeUnmount,onMounted,ref,watch} from 'vue'
import {safetyRequest} from '../auth'
import {dreamOwner,dreamReady,readDream,writeDream,refreshHealthSleep} from '../dream-account'
const open=ref(false),preview=ref(''),consent=ref(false),hours=ref(''),awakenings=ref(0),feeling=ref('一般'),busy=ref(false),message=ref(''),result=ref(null),saving=ref(false),video=ref(null),camera=ref(false),cameraReady=ref(false),cameraPending=ref(false),cameraDevices=ref([]),cameraDevice=ref(''),upload=ref(null)
const reports=computed(()=>readDream('notes',{}).sleepPhotoReports||[])
let stream=null,controller=null,ticket=0,cameraGeneration=0,cancelCameraWait=null
function stopCamera(){cameraGeneration++;cancelCameraWait?.();cancelCameraWait=null;if(video.value){video.value.pause();video.value.srcObject=null}stream?.getTracks().forEach(t=>t.stop());stream=null;camera.value=false;cameraReady.value=false;cameraPending.value=false}
function resetResult(){result.value=null;message.value='';consent.value=false}
function clear(){ticket++;controller?.abort();controller=null;stopCamera();preview.value='';resetResult();busy.value=false;open.value=false;hours.value=recordedHours.value;awakenings.value=0;feeling.value='一般'}
const recordedHours=computed(()=>{
 const date=new Date().toLocaleDateString('sv-SE')
 const record=readDream('healthSleep',[]).filter(r=>r&&typeof r==='object'&&r.date===date).at(-1)
 return record&&Number.isFinite(Number(record.hours))?Number(record.hours):''
})
watch(dreamOwner,clear)
watch([recordedHours,dreamOwner,dreamReady],()=>{hours.value=recordedHours.value},{immediate:true})
onMounted(refreshHealthSleep)
watch([hours,awakenings,feeling],()=>{result.value=null})
async function choose(event){
 const file=event.target.files?.[0];event.target.value='';if(!file)return
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){message.value='请选择 10MB 以内的 JPEG、PNG 或 WebP 照片';return}
 const id=++ticket;stopCamera();resetResult();preview.value=''
 const url=URL.createObjectURL(file)
 try{const image=new Image();image.src=url;await image.decode();const c=document.createElement('canvas'),scale=Math.min(1,960/Math.max(image.width,image.height));c.width=Math.max(1,Math.round(image.width*scale));c.height=Math.max(1,Math.round(image.height*scale));c.getContext('2d').drawImage(image,0,0,c.width,c.height);if(id===ticket)preview.value=c.toDataURL('image/jpeg',.85)}catch{if(id===ticket)message.value='照片无法读取，请重新选择'}finally{URL.revokeObjectURL(url)}
}
function cameraError(error){
 if(error.name==='NotAllowedError'||error.name==='SecurityError')return '摄像头权限被拒绝。请在浏览器的网站权限中允许摄像头，再重试。'
 if(error.name==='NotFoundError')return '没有检测到摄像头，请连接摄像头，或上传照片。'
 if(error.name==='OverconstrainedError')return '所选摄像头已断开或不可用，请切换设备后重试。'
 if(error.name==='NotReadableError')return '摄像头暂时无法使用，可能被其他程序占用。关闭其他摄像头程序后重试。'
 if(error.name==='CameraTimeout')return '摄像头没有传来画面。请检查摄像头隐私开关、遮挡盖和浏览器权限，再重试或上传照片。'
 return '摄像头未能显示画面，请重试，或使用上传照片。'
}
const phoneCamera = label => /荣耀|honor|huawei|华为|iphone|android|手机|mobile|phone|link to windows|连接至 windows|virtual|虚拟|droidcam|iriun|obs/i.test(label)
async function listCameras(){
 const devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput')
 cameraDevices.value=devices.map((d,i)=>({id:d.deviceId,label:d.label||'摄像头 '+(i+1)}))
 if(!devices.some(d=>d.deviceId===cameraDevice.value)){
  const local=devices.find(d=>d.label&&!phoneCamera(d.label))
  cameraDevice.value=local?.deviceId||''
 }
 return devices
}
async function startCamera(){
 if(busy.value||cameraPending.value)return
 stopCamera();resetResult();const generation=cameraGeneration;cameraPending.value=true;message.value='正在打开摄像头，请允许浏览器使用摄像头…'
 let permissionTimer
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw Object.assign(new Error(),{name:'NotFoundError'})
  const devices=await listCameras()
  if(generation!==cameraGeneration)return
  if(devices.length&&devices.every(d=>d.label&&phoneCamera(d.label))&&!cameraDevice.value){message.value='当前只检测到手机或虚拟摄像头。请连接电脑摄像头，或在设备列表中手动选择可用设备。';cameraPending.value=false;return}
  const constraints={width:{ideal:960},height:{ideal:720}}
  if(cameraDevice.value)constraints.deviceId={exact:cameraDevice.value}
  const request=navigator.mediaDevices.getUserMedia({video:constraints,audio:false})
  request.then(media=>{if(generation!==cameraGeneration)media.getTracks().forEach(t=>t.stop())},()=>{})
  const media=await Promise.race([request,new Promise((_,reject)=>{permissionTimer=setTimeout(()=>reject(Object.assign(new Error(),{name:'CameraTimeout'})),20000)})]);clearTimeout(permissionTimer)
  if(generation!==cameraGeneration){media.getTracks().forEach(t=>t.stop());return}
  stream=media
  const activeDevice=media.getVideoTracks()[0]?.getSettings().deviceId
  const knownSelection=!!cameraDevice.value
  const available=await listCameras()
  if(generation!==cameraGeneration)return
  if(!knownSelection&&activeDevice&&phoneCamera(available.find(d=>d.deviceId===activeDevice)?.label||'')){
   const local=available.find(d=>d.label&&!phoneCamera(d.label))
   stopCamera();cameraDevice.value=local?.deviceId||''
   if(local){await startCamera();return}
   message.value='默认设备是手机摄像头。请连接电脑摄像头，或在设备列表中手动选择设备。';return
  }
  if(activeDevice)cameraDevice.value=activeDevice
  if(generation!==cameraGeneration)return
  camera.value=true;message.value='摄像头已连接，正在等待画面…';await nextTick()
  if(generation!==cameraGeneration)return
  const element=video.value;element.muted=true;element.autoplay=true;element.playsInline=true;element.controls=false
  await new Promise((resolve,reject)=>{
   let timer,settled=false
   const cleanup=()=>{clearTimeout(timer);for(const name of ['loadeddata','playing','resize'])element.removeEventListener(name,ready);element.removeEventListener('error',fail);if(cancelCameraWait===cancel)cancelCameraWait=null}
   const finish=(error)=>{if(settled)return;settled=true;cleanup();error?reject(error):resolve()}
   const ready=()=>{if(element.readyState>=2&&element.videoWidth>0&&element.videoHeight>0)finish()}
   const fail=()=>finish(new Error('Camera playback failed'))
   const cancel=()=>finish(Object.assign(new Error(),{name:'CameraCancelled'}));cancelCameraWait=cancel
   for(const name of ['loadeddata','playing','resize'])element.addEventListener(name,ready);element.addEventListener('error',fail)
   timer=setTimeout(()=>finish(Object.assign(new Error(),{name:'CameraTimeout'})),10000)
   element.srcObject=media;element.play().then(ready,finish);ready()
  })
  if(generation!==cameraGeneration)return
  cameraReady.value=true;cameraPending.value=false;message.value='画面已就绪，点击“拍下这一刻”拍照。'
 }catch(error){if(generation===cameraGeneration){stopCamera();message.value=cameraError(error)}}finally{clearTimeout(permissionTimer)}
}
function capture(){
 const v=video.value;if(!cameraReady.value||!v||v.readyState<2||!v.videoWidth)return
 try{const c=document.createElement('canvas'),scale=Math.min(1,960/v.videoWidth);c.width=Math.round(v.videoWidth*scale);c.height=Math.round(v.videoHeight*scale);c.getContext('2d').drawImage(v,0,0,c.width,c.height);preview.value=c.toDataURL('image/jpeg',.85);stopCamera();resetResult();message.value='照片已拍下，请填写记录后进行评估。'}catch{message.value='照片未能拍下，请重新打开摄像头再试。'}
}
async function assess(){
 if(busy.value)return
 if(!dreamOwner.value||!dreamReady.value){message.value='请先登录并等待账号加载完成';return}
 const h=Number(hours.value),a=Number(awakenings.value)
 if(hours.value===''||!Number.isFinite(h)||h<0||h>24||!Number.isInteger(a)||a<0||a>30){message.value='请检查睡眠时长和夜间醒来次数';return}
 if(!preview.value||!consent.value){message.value='请选择照片，并同意发送照片进行观察';return}
 const owner=dreamOwner.value,id=++ticket;controller=new AbortController();const pending=controller;busy.value=true;result.value=null;message.value='正在观察照片，通常需要几秒到几十秒…'
 const timer=setTimeout(()=>pending.abort(),55000)
 try{const r=await safetyRequest('/api/sleep-photo',{method:'POST',headers:{'Content-Type':'application/json','X-Health-User':owner},body:JSON.stringify({image:preview.value,consent:true,hours:h,awakenings:a,feeling:feeling.value}),signal:pending.signal});if(id!==ticket||dreamOwner.value!==owner)return;if(!r.usable){message.value=r.photoQuality+' 请重新拍摄单人、正面、光线均匀的照片。';return}result.value={...r,id:Date.now(),date:new Date().toLocaleDateString('sv-SE'),saved:false};message.value='已完成。面部观察与填写的睡眠记录分别展示。'}catch(e){if(id===ticket)message.value=e.message||'评估未完成，请稍后重试'}finally{clearTimeout(timer);if(id===ticket){busy.value=false;controller=null}}
}
async function save(){if(!result.value||saving.value)return;const owner=dreamOwner.value,id=ticket;saving.value=true;try{const notes=readDream('notes',{}),entry={...result.value};delete entry.saved;await writeDream('notes',{...notes,sleepPhotoReports:[entry,...(notes.sleepPhotoReports||[])].slice(0,30)});if(owner===dreamOwner.value&&id===ticket){result.value.saved=true;message.value='评估已保存到当前账号，原照片未保存。'}}catch(e){if(id===ticket)message.value=e.message}finally{saving.value=false}}
onBeforeUnmount(clear)
</script>
<template>
 <section class="sleep-photo" aria-label="拍照评估睡眠">
  <div class="photo-heading"><div><small>晨起状态 · 照片与记录</small><h2>拍照评估睡眠</h2><p>留下一张晨起照片，再说说这一晚和醒来的感受。</p></div><button type="button" @click="open?clear():(open=true,refreshHealthSleep())">{{open?'收起':'开始拍照评估'}}</button></div>
  <div v-if="open" class="photo-body">
   <p class="photo-hint">照片只观察可见面部外观，不能据此判断睡眠好坏。睡眠反馈依据你填写的记录。</p>
   <div class="photo-layout"><div><label v-if="cameraDevices.length" class="camera-device">摄像头设备<select v-model="cameraDevice" :disabled="busy||cameraPending" @change="camera&&startCamera()"><option value="">优先使用电脑摄像头</option><option v-for="device in cameraDevices" :key="device.id" :value="device.id">{{device.label}}</option></select></label><div class="photo-frame"><video v-if="camera" ref="video" autoplay muted playsinline disablepictureinpicture aria-label="摄像头预览"></video><img v-else-if="preview" :src="preview" alt="待观察晨起照片"><div v-else class="photo-empty"><svg viewBox="0 0 80 80" aria-hidden="true"><rect x="10" y="22" width="60" height="44" rx="9"/><path d="M26 22l5-9h18l5 9"/><circle cx="40" cy="44" r="13"/></svg><span>自然光下，拍摄单人正面照片</span><small>不使用滤镜，避开强光和遮挡</small></div></div><div class="photo-actions"><button :disabled="busy||cameraPending" @click="startCamera">{{cameraPending?'正在打开…':'拍摄照片'}}</button><button :disabled="busy" @click="upload.click()">上传照片</button><button v-if="camera" :disabled="!cameraReady" @click="capture">拍下这一刻</button><button v-if="camera||cameraPending" @click="stopCamera();message='摄像头已关闭'">关闭摄像头</button></div><input ref="upload" type="file" accept="image/jpeg,image/png,image/webp" hidden @change="choose"></div>
   <form @submit.prevent="assess"><label>昨晚睡了多久？<div class="photo-input"><input v-model="hours" :disabled="busy" type="number" min="0" max="24" step="0.1" required placeholder="例如 7.5"><span>小时</span></div></label><label>夜间醒来次数<input v-model.number="awakenings" :disabled="busy" type="number" min="0" max="30" step="1" required></label><label>醒来后的感受<select v-model="feeling" :disabled="busy"><option>精神不错</option><option>一般</option><option>疲惫</option><option>明显困倦</option></select></label><label class="photo-consent"><input v-model="consent" :disabled="busy" type="checkbox"><span>同意将这张照片发送给云端图像服务进行观察。原照片不保存在账号中。</span></label><button :disabled="busy||!preview||!consent||camera" type="submit">{{busy?'正在评估…':'观察照片并评估记录'}}</button></form></div>
   <p v-if="message" class="photo-status" role="status" aria-live="polite">{{message}}</p>
   <article v-if="result" class="photo-report"><h3>你的晨起回看</h3><div class="report-columns"><div><h4>面部观察</h4><p>{{result.photoQuality}}</p><ul><li v-for="o in result.observations" :key="o">{{o}}</li></ul><small>光线、体质和其他因素都可能影响外观，不将外观归因于睡眠。</small></div><div><h4>睡眠记录反馈</h4><ul><li v-for="p in result.feedback" :key="p">{{p}}</li></ul></div></div><button :disabled="saving||result.saved" @click="save">{{result.saved?'已保存到账号':saving?'正在保存…':'保存这份评估'}}</button></article>
  </div>
  <details v-if="reports.length" class="photo-history"><summary>已保存的晨起评估 · {{reports.length}} 份</summary><article v-for="r in reports" :key="r.id"><h3>{{r.date}} · {{r.record.hours}} 小时 · {{r.record.feeling}}</h3><p>{{r.photoQuality}}</p><p v-for="o in r.observations" :key="o">{{o}}</p><p v-for="p in r.feedback" :key="p">{{p}}</p></article></details>
 </section>
</template>
<style scoped>
.sleep-photo{margin:24px 0;border:1px solid #e4ddeb;border-radius:14px;background:#fcfafe;color:#51485f;padding:24px;font-size:15px;line-height:1.7}.photo-heading{display:flex;justify-content:space-between;align-items:center;gap:20px}.photo-heading small{color:#8a759e}.photo-heading h2{font:500 23px/1.4 var(--display,serif);margin:6px 0}.photo-heading p{margin:0;color:#80728f}.sleep-photo button{border:1px solid #baa8cd;background:#eee6f5;color:#695079;border-radius:9px;padding:10px 16px;font:inherit;cursor:pointer;box-shadow:none}.sleep-photo button:disabled{opacity:.6;cursor:not-allowed}.sleep-photo button:focus-visible{outline:2px solid #8e73a7;outline-offset:3px}.photo-hint{border-left:3px solid #c6b5d6;padding-left:13px;font-size:13px;color:#80728f}.photo-layout{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:20px}.camera-device{display:grid;gap:6px;margin-bottom:12px;font-size:14px}.camera-device select{width:100%;padding:10px;border:1px solid #ded3e7;border-radius:8px;background:white;color:#51485f;font:inherit}.photo-frame{border:1px dashed #c9bad9;border-radius:12px;background:#f4eff8;min-height:240px;display:grid;place-items:center;overflow:hidden}.photo-frame img,.photo-frame video{max-height:330px;width:100%;object-fit:contain;display:block}.photo-empty{text-align:center;padding:30px 12px;color:#887498;display:grid;justify-items:center;gap:10px}.photo-empty svg{width:64px;height:64px;stroke:#9e88b3;stroke-width:2;fill:none}.photo-empty small{font-size:12px}.photo-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.photo-layout form{display:grid;gap:12px}.photo-layout label{display:grid;gap:6px;font-size:14px}.photo-layout input:not([type=checkbox]),.photo-layout select{box-sizing:border-box;width:100%;min-width:0;padding:10px 12px;border:1px solid #ded3e7;border-radius:8px;background:white;color:#51485f;font:inherit}.photo-input{display:flex;align-items:center;gap:10px}.photo-input span{white-space:nowrap}.photo-consent{display:flex!important;align-items:flex-start;gap:9px!important;font-size:12px!important}.photo-consent input{margin:5px 0 0;flex-shrink:0}.photo-status{font-size:14px;color:#755889}.photo-report{margin-top:22px;padding-top:18px;border-top:1px solid #e4ddeb}.photo-report h3,.photo-history h3{font:500 19px/1.5 var(--display,serif)}.report-columns{display:grid;grid-template-columns:1fr 1fr;gap:24px}.report-columns>div{padding:18px;background:#f5f1f8;border-radius:10px}.report-columns h4{margin:0;font-size:15px}.report-columns ul{padding-left:20px}.report-columns li{margin:8px 0}.report-columns small{font-size:12px;color:#80728f}.photo-report>button{margin-top:16px}.photo-history{border-top:1px solid #e4ddeb;margin-top:20px;padding-top:12px}.photo-history summary{cursor:pointer;color:#7d668e}.photo-history article{border-top:1px solid #ebe4f1;margin-top:12px;font-size:14px}@media(max-width:700px){.sleep-photo{padding:18px}.photo-heading{align-items:flex-start;flex-direction:column}.photo-layout,.report-columns{grid-template-columns:1fr}.photo-frame{min-height:210px}}
</style>
