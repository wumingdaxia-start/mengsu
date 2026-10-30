<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { bedtimeStories, cloudFeelings, gentleActivities } from '../data/bedtime-content'
import { today, useDreamJourney } from '../composables/useDreamJourney'
import { useJourneyUi } from '../composables/useJourneyUi'
const route=useRoute(),router=useRouter(),{holes,refresh,commit}=useDreamJourney(),{toast,notify,save}=useJourneyUi()
const path=computed(()=>route.path),story=ref(bedtimeStories[0]),genre=ref('星空远行'),role=ref('朋友般的陪伴'),customStory=ref(''),busy=ref(false),error=ref(''),thought=ref(''),feeling=ref('焦虑与压力'),activity=ref(gentleActivities[0]),tool=ref('安放情绪'),sound=ref(false),soundVolume=ref(.08),seconds=ref(0)
// 云端音色：qwen3-tts-flash 系统音色，选中后用于故事朗读。
const cloudVoices=[
 {id:'Serena',name:'温柔女声'},
 {id:'Ethan',name:'清润男声'},
 {id:'Mochi',name:'少年音'},
 {id:'Eldric Sage',name:'低哑夜读音'},
 {id:'Momo',name:'柔和童音'},
]
const cloudVoice=ref('Serena'),ttsLoading=ref(false),playing=ref(false)
const musicTrack=ref('stars'),musicTracks=[
 {id:'stars',name:'星河轻琴',kind:'notes',notes:[261.63,329.63,392,523.25,440,392,329.63,293.66]},
 {id:'waves',name:'海浪白噪音',kind:'waves'},
 {id:'forest',name:'林间风声',kind:'wind'},
 {id:'rain',name:'细雨沙沙',kind:'rain'},
 {id:'nebula',name:'星云静响',kind:'drone'},
]
let abort,voiceAbort,voiceRequest=0,voiceAudio,audio,noise,gain,timer
const currentText=computed(()=>customStory.value||story.value.text)
function changeVoice(){stopVoice();notify('音色已切换，下次朗读使用新声音')}
function stopVoice(){voiceRequest++;voiceAbort?.abort();voiceAbort=null;voiceAudio?.pause();voiceAudio=null;playing.value=false;ttsLoading.value=false}
async function speak(sample=false){
 if(ttsLoading.value)return
 stopVoice()
 const request=++voiceRequest,controller=new AbortController();voiceAbort=controller
 const text=sample?'今晚，不用赶路。让自己慢慢安静下来，做个好梦。':currentText.value
 ttsLoading.value=true
 const timeout=setTimeout(()=>controller.abort(),180000)
 try{
  const r=await fetch('/api/dream-studio/tts',{signal:controller.signal,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,voice:cloudVoice.value})})
  const data=await r.json()
  if(!r.ok)throw new Error(typeof data.detail==='string'?data.detail:'云端音色暂时没有回应')
  if(request!==voiceRequest)return
  const player=new Audio(data.url);voiceAudio=player
  player.onerror=()=>{if(request===voiceRequest){playing.value=false;notify('音频暂时无法播放，请重新试听')}}
  player.onended=()=>{if(request===voiceRequest)playing.value=false}
  await player.play()
  if(request!==voiceRequest){player.pause();return}
  playing.value=true
 }catch(e){if(request===voiceRequest){playing.value=false;notify(e.name==='AbortError'?'声音加载超时，请稍后重试':e.message||'云端音色暂时不可用，可以先阅读故事')}}
 finally{clearTimeout(timeout);if(request===voiceRequest){ttsLoading.value=false;voiceAbort=null}}
}
async function generateStory(){if(busy.value)return;busy.value=true;error.value='';abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),85000);try{const r=await fetch('/api/dream-studio/create',{method:'POST',headers:{'Content-Type':'application/json'},signal:abort.signal,body:JSON.stringify({task:'story',text:'请创作一个'+genre.value+'主题的睡前故事。',style:role.value})});const data=await r.json();if(!r.ok)throw new Error(typeof data.detail==='string'?data.detail:'故事暂时没有生成');stopVoice();customStory.value=data.text;notify('千问故事已生成，可以阅读或用云端音色朗读')}catch(e){error.value=e.name==='AbortError'?'已停止等待，可以改读内置故事。':e.message}finally{clearTimeout(timeout);busy.value=false}}
function changeStory(s){stopVoice();customStory.value='';story.value=s;genre.value=s.theme;error.value=''}
function randomStory(){const candidates=bedtimeStories.filter(s=>s.name!==story.value.name);changeStory(candidates[Math.floor(Math.random()*candidates.length)]);notify('换了一个夜晚的世界')}
async function leaveThought(){if(!thought.value.trim())return notify('留下一句话就好，不必写完整');const item={id:Date.now(),date:today(),feeling:feeling.value,text:thought.value.trim()};if(await save(commit,'holes',[item,...holes.value],'这句话已保存到当前账号，不会公开'))thought.value=''}
function randomActivity(){const candidates=gentleActivities.filter(x=>x.title!==activity.value.title);activity.value=candidates[Math.floor(Math.random()*candidates.length)]}
// Local synthesized ambient music: no external requests or autoplay.
async function stopMusic(){sound.value=false;noise?.stop();noise=null;const previous=audio;audio=null;gain=null;await previous?.close()}
function fillNotes(samples,track,rate,echo){
 for(let note=0;note<16;note++){
  const frequency=track.notes[note%track.notes.length],start=note*2
  for(let j=0;j<rate*6;j++){
   const t=j/rate,envelope=(1-Math.exp(-t*12))*Math.exp(-t*.95)
   const phase=2*Math.PI*frequency*t
   const tone=(Math.sin(phase)+.22*Math.sin(phase*2)+.08*Math.sin(phase*3))*envelope*.26
   const index=(Math.floor((start+echo)*rate)+j)%samples.length
   samples[index]+=tone
  }
 }
}
function fillTexture(samples,rate,kind,shift){
 let brown=0,lp=0,prev=0
 for(let j=0;j<samples.length;j++){
  const t=j/rate+shift,white=Math.random()*2-1
  if(kind==='waves'){brown=(brown+.02*white)/1.02;const swell=Math.pow(Math.max(0,Math.sin(2*Math.PI*t/9)),1.6);samples[j]+=brown*7*(.3+.7*swell)}
  else if(kind==='wind'){brown=(brown+.015*white)/1.015;lp+=(brown-lp)*.06;const gust=Math.max(.25,.55+.45*Math.sin(2*Math.PI*t/14)+.15*Math.sin(2*Math.PI*t/5.3));samples[j]+=lp*9*gust}
  else if(kind==='rain'){samples[j]+=(white-prev)*.16;prev=white}
  else{const swell=.6+.4*Math.sin(2*Math.PI*t/16);samples[j]+=(Math.sin(2*Math.PI*55*t)+.8*Math.sin(2*Math.PI*55.4*t)+.35*Math.sin(2*Math.PI*110.3*t)+.12*Math.sin(2*Math.PI*164.8*t))*swell*.12}
 }
}
async function toggleSound(){
 if(sound.value)return stopMusic()
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return notify('当前浏览器不支持背景音乐')
  audio=new Audio();await audio.resume()
  const track=musicTracks.find(t=>t.id===musicTrack.value),duration=32,rate=audio.sampleRate
  const buffer=audio.createBuffer(2,rate*duration,rate)
  for(let channel=0;channel<2;channel++){
   const samples=buffer.getChannelData(channel)
   if(track.kind==='notes')fillNotes(samples,track,rate,channel===0?0:.075)
   else fillTexture(samples,rate,track.kind,channel===0?0:.35)
   for(let i=0;i<samples.length;i++)samples[i]=Math.max(-1,Math.min(1,samples[i]))
  }
  noise=audio.createBufferSource();noise.buffer=buffer;noise.loop=true
  gain=audio.createGain();gain.gain.value=soundVolume.value;noise.connect(gain);gain.connect(audio.destination);noise.start();sound.value=true
 }catch{await stopMusic();notify('背景音乐暂时无法开启，请再次点击播放')}
}
async function changeMusic(){const resume=sound.value;if(resume){await stopMusic();await toggleSound()}}
function volume(e){soundVolume.value=Number(e.target.value);if(gain&&audio)gain.gain.setTargetAtTime(soundVolume.value,audio.currentTime,.2)}
function startMinute(){clearInterval(timer);seconds.value=60;timer=setInterval(()=>{seconds.value--;if(seconds.value<=0){clearInterval(timer);notify('这一分钟结束了。你可以停下来，也可以继续按自己的节奏。')}},1000)}
async function removeHole(id){await save(commit,'holes',holes.value.filter(x=>x.id!==id),'这句心事已从当前账号移除')}
watch(path,()=>{stopVoice();if(sound.value)stopMusic()})
onMounted(()=>{refresh()})
onBeforeUnmount(()=>{abort?.abort();stopVoice();if(sound.value){noise?.stop();audio?.close()}clearInterval(timer)})
</script>
<template>
<div class="journey">
 <p class="j-notice"><span class="j-dot"></span>陪伴与日常放松，不替代心理或睡眠诊疗。人物朗读由 AI 云端音色提供。</p>
 <template v-if="path==='/dream/bedtime-stories'">
  <div class="j-wide-grid"><aside class="j-panel j-stack"><h2>今晚，听哪一种世界？</h2><button v-for="s in bedtimeStories" :key="s.name" :class="{'j-selected':story.name===s.name&&!customStory}" @click="changeStory(s)">{{s.name}}<small>{{s.theme}}</small></button><button class="j-glass" @click="randomStory">✧ 随机换一篇</button><div class="j-rule"></div><label>陪伴语气<select v-model="role" class="j-glass"><option>朋友般的陪伴</option><option>安静轻声陪伴</option><option>缓慢疗愈陪伴</option></select></label><label>人物声音切换<select v-model="cloudVoice" class="j-glass" @change="changeVoice"><option v-for="v in cloudVoices" :key="v.id" :value="v.id">{{v.name}}</option></select></label><button class="j-voice-preview j-glass" :disabled="ttsLoading" @click="speak(true)"><span v-if="ttsLoading" class="j-star-load" aria-hidden="true"><i></i><i></i><i></i></span><span>{{ttsLoading?'声音正在点亮…':'试听人物声音'}}</span></button><small>AI云端音色，可自由切换男女声，用于故事朗读，无需额外配置系统语音。</small><label>背景音乐切换<select v-model="musicTrack" class="j-glass" @change="changeMusic"><option v-for="track in musicTracks" :key="track.id" :value="track.id">{{track.name}}</option></select></label><button :aria-pressed="sound" @click="toggleSound">{{sound?'暂停背景音乐':'播放背景音乐'}}</button><label>音乐音量<input type="range" min="0" max=".2" step=".01" :value="soundVolume" @input="volume"></label><small>氛围音乐在本机轻声合成，循环播放；人物朗读与背景音乐可独立开关。</small></aside>
  <section class="j-stack"><div class="j-panel story-paper"><div class="j-between"><span class="j-tag">{{customStory?'AI 生成故事':'内置原创故事'}}</span><small>{{genre}}</small></div><h2>{{customStory?'今夜，专属的一段故事':story.name}}</h2><p class="j-prose">{{currentText}}</p><div class="j-row j-section-gap"><button class="j-primary" :disabled="ttsLoading" @click="playing?stopVoice():speak()"><span v-if="ttsLoading" class="j-star-load" aria-hidden="true"><i></i><i></i><i></i></span><span>{{ttsLoading?'正在点亮声音…':playing?'停止朗读':'轻轻读给我听'}}</span></button><button @click="toggleSound">{{sound?'暂停背景音乐':'播放背景音乐'}}</button></div><label v-if="sound" class="j-section-gap">音乐音量<input type="range" min="0" max=".2" step=".01" :value="soundVolume" @input="volume"></label></div><section class="j-panel"><h3>让千问为今夜写一段</h3><div class="j-row"><label style="flex:1">故事主题<select v-model="genre"><option v-for="s in bedtimeStories" :key="s.theme">{{s.theme}}</option></select></label><button :disabled="busy" @click="generateStory">{{busy?'故事正在慢慢展开…':'生成今夜故事'}}</button><button v-if="busy" @click="abort?.abort()">停止等待</button></div><p v-if="error" class="j-error" role="alert">{{error}}</p></section><div class="j-row j-section-gap"><button @click="router.push('/dream?scene=map')">梦境地图 ↗</button><button @click="router.push('/dream?scene=network')">丝线网络 ↗</button></div><button @click="stopVoice();router.push('/dream/cues')">听到这里，给今夜留下一颗种子 ↗</button></section></div>
 </template>
 <template v-else-if="path==='/dream/tree-hole'">
  <section class="j-panel cloud-garden"><h2>此刻，哪一片云最像你的心情？</h2><p>选一个接近的就好，也可以慢慢换。</p><div class="cloud-field"><button v-for="(f,i) in cloudFeelings" :key="f" :class="{'j-selected':feeling===f}" :style="{'--tilt':(i%2===0?-2:2)+'deg'}" @click="feeling=f">{{f}}</button></div></section>
  <div class="j-grid j-section-gap"><section class="j-panel"><span class="j-tag">{{feeling}}</span><h2 class="j-section-gap">有一句话，想先放在这里吗？</h2><label><span class="j-sr">留给树洞的一句话</span><textarea v-model="thought" rows="3" maxlength="500" placeholder="不用组织语言，也不用现在就找到答案。"></textarea></label><button class="j-primary j-section-gap" @click="leaveThought">把这句话放下</button><p class="j-help">保存在当前账号，退出后不显示，再次登录可继续查看。</p></section><section class="j-panel" style="margin-top:0"><small>不必立刻睡着，先做一件轻松的事</small><h2>{{activity.title}}</h2><p>{{activity.text}}</p><div class="j-row"><button @click="randomActivity">再给我一个小建议</button><button @click="router.replace('/dream/tree-hole#calm-tools')">看看下方安心小工具</button></div></section></div>
  <section v-if="holes.length" class="j-panel j-section-gap"><h3>那些被安放的心事</h3><article v-for="h in holes.slice(0,10)" :key="h.id" class="hole-note"><div class="j-between"><small>{{h.date}} · {{h.feeling}}</small><button class="j-small-action" @click="removeHole(h.id)">移除</button></div><p>{{h.text}}</p></article></section>
 </template>
 <template v-if="path==='/dream/tree-hole'">
  <section id="calm-tools" class="j-panel j-section-gap" style="scroll-margin-top:110px"><div class="j-tool-heading"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v13H4Z M8 7V4h8v3 M8 13h8 M12 9v8"/></svg><h2>安心小工具 · 陪你照顾此刻</h2></div><p>这些是照顾当下的小工具，你可以随时停下或换一个。不是医疗急救服务。</p><div class="j-tabs"><button v-for="t in ['安放情绪','身体松一松','给自己一句肯定','换个注意方向','入睡前的三步']" :key="t" :class="{'j-selected':tool===t}" @click="tool=t">{{t}}</button></div></section>
  <section class="j-panel calm-content">
   <template v-if="tool==='安放情绪'"><img src="/dream-rooms/listening.png" alt="安静陪伴的房间"><h2>先承认：我此刻确实不太轻松</h2><p>不急着改变情绪。给它起个暂时的名字，问问自己现在最需要的是休息、陪伴，还是一点空间。</p><button @click="router.push('/dream/tree-hole')">把一句心事交给树洞</button></template>
   <template v-else-if="tool==='身体松一松'"><h2>给身体一分钟，不需要做得标准</h2><p>找到有承托的姿势。感受双脚或背部接触的地方，轻轻放松下巴与肩膀，自然呼吸，不憋气。感到不舒服就停止。</p><div class="calm-timer">{{seconds?seconds+' 秒':'一小段安静'}}</div><div class="j-row"><button @click="startMinute">{{seconds?'重新留一分钟':'留一分钟给身体'}}</button><button v-if="seconds" @click="clearInterval(timer);seconds=0">现在停下</button><button @click="router.push('/dream/relax')">进入完整放松练习</button></div></template>
   <template v-else-if="tool==='给自己一句肯定'"><h2>今天到这里，也已经足够</h2><p>我不需要在今晚解决所有事情。<br>身体需要休息，不需要接受评判。<br>我可以慢一点，也可以向别人寻求帮助。</p><button @click="notify('把最愿意相信的那一句，轻轻念给自己。')">把这句话留给自己</button></template>
   <template v-else-if="tool==='换个注意方向'"><h2>{{activity.title}}</h2><p>{{activity.text}}</p><button @click="randomActivity">换一个轻松的小活动</button></template>
   <template v-else><h2>不用催促自己，先走三小步</h2><ol class="j-steps"><li>调暗一盏灯，把手机通知留到明天。</li><li>选择舒服的姿势，听几次自然的呼吸。</li><li>把一件未完成的事写成一句睡前留言，然后允许今天结束。</li></ol><div class="j-row j-section-gap"><button @click="router.push('/dream/wind-down')">看看完整睡前流程</button><button @click="router.push('/dream/cues')">留一句话给夜晚</button></div></template>
  </section><p class="j-help">若持续难以入睡、情绪困扰影响生活，可以寻求专业人员支持。若有迫切的人身危险，请联系当地急救服务或身边可信任的人。</p>
 </template><div v-if="toast" class="j-toast" role="status">{{toast}}</div>
</div>
</template>
<style scoped>
.story-paper{background:#fffdf7}.story-paper h2{margin:26px 0}.story-paper .j-prose{font-size:16px;line-height:2.1}.cloud-garden{background:#f5f5fa}.cloud-field{display:flex;justify-content:center;gap:20px 24px;flex-wrap:wrap;padding:30px 0}.cloud-field button{border-radius:40px;padding:20px 25px;background:#fffdfbe0;transform:rotate(var(--tilt));box-shadow:0 8px 25px #86719908}.cloud-field button:nth-child(3n){background:#eaf1f5}.cloud-field button.j-selected{border-color:#a08bb8;background:#e8dfef}.hole-note{padding:18px 0;border-top:1px solid #e8e0ed}.hole-note p{white-space:pre-wrap;overflow-wrap:anywhere}.calm-content{max-width:850px;min-height:280px}.calm-content>img{width:135px;height:135px;border-radius:28px;object-fit:cover;float:right;margin:0 0 25px 25px}.calm-timer{font-family:var(--display,serif);font-size:32px;padding:25px;color:#9a86ad}.calm-content p{max-width:65ch;line-height:2}
/* 声音模块：圆角毛玻璃 + 淡紫微光描边 */
.j-glass{background:rgba(255,253,251,.55);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(160,139,184,.38);border-radius:18px;box-shadow:0 0 0 3px rgba(196,181,216,.1),0 6px 18px rgba(134,113,153,.08);transition:border-color .3s ease,box-shadow .3s ease}
.j-glass:focus-visible,.j-glass:focus-within{border-color:#a08bb8;box-shadow:0 0 0 3px rgba(196,181,216,.22),0 6px 18px rgba(134,113,153,.12)}
.j-voice-preview{position:relative;overflow:hidden;isolation:isolate;padding:11px 18px;cursor:pointer}
.j-voice-preview::after{content:'';position:absolute;inset:-45%;border-radius:50%;background:radial-gradient(circle,rgba(196,181,216,.4) 0%,rgba(196,181,216,0) 62%);opacity:0;transform:scale(.45);transition:opacity .35s ease,transform .65s cubic-bezier(.22,.61,.36,1);pointer-events:none}
.j-voice-preview:hover::after{opacity:1;transform:scale(1)}
.j-star-load{display:inline-flex;align-items:center;gap:4px;margin-right:8px}
.j-star-load i{width:5px;height:5px;border-radius:50%;background:#a08bb8;animation:j-star-twinkle 1.1s ease-in-out infinite}
.j-star-load i:nth-child(2){animation-delay:.18s}
.j-star-load i:nth-child(3){animation-delay:.36s}
@keyframes j-star-twinkle{0%,100%{opacity:.25;transform:scale(.8)}50%{opacity:1;transform:scale(1.15)}}
@media(prefers-reduced-motion:reduce){.j-voice-preview::after{transition:none;transform:scale(1)}.j-star-load i{animation:none;opacity:.7}}
@media(max-width:540px){.cloud-field{gap:12px}.cloud-field button{padding:15px 18px;font-size:13px}.calm-content>img{width:90px;height:90px;margin-left:15px}}
</style>
