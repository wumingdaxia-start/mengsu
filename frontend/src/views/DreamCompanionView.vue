<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { bedtimeStories, cloudFeelings, gentleActivities } from '../data/bedtime-content'
import { today, useDreamJourney } from '../composables/useDreamJourney'
import { useJourneyUi } from '../composables/useJourneyUi'
import { needsSetup, openAiSetup } from '../ai-status'
const route=useRoute(),router=useRouter(),{holes,refresh,commit}=useDreamJourney(),{toast,notify,save}=useJourneyUi()
const path=computed(()=>route.path==='/dream/night-talk'?(route.query.section==='tree-hole'?'/dream/tree-hole':'/dream/bedtime-stories'):route.path),story=ref(bedtimeStories[0]),genre=ref('星空远行'),role=ref('朋友般的陪伴'),customStory=ref(''),busy=ref(false),error=ref(''),thought=ref(''),feeling=ref('焦虑与压力'),activity=ref(gentleActivities[0]),tool=ref('安放情绪'),sound=ref(false),soundVolume=ref(.08),seconds=ref(0)
const calmTools = [
 {name:'安放情绪',preview:'先允许感受存在，不急着改变它',title:'先承认：我此刻确实不太轻松',text:'不急着赶走、改变这份情绪。试着给它起一个临时的名字，问问自己：我现在最需要的，是安静休息、一点陪伴，还是一段不被打扰的空间？',extra:'你可以在心里默念：我允许自己现在不舒服，不舒服不需要立刻消失。'},
 {name:'身体松一松',preview:'觉察身体的紧绷，做到哪里算哪里',title:'慢慢松开紧绷的身体',text:'从脚尖开始，一点点觉察：哪里是紧紧绷住的？不用强行放松，只是觉察它。吸气，保持觉察；呼气，试着让那一块软一点点。不用一次做完，做到哪里算哪里。',extra:'按舒服的节奏自然呼吸，不必憋气；如果不舒服，随时停下。'},
 {name:'给自己一句肯定',preview:'选一句此刻愿意听见的鼓励',title:'一句不苛刻的自我鼓励',text:'你已经在撑着了，这就足够了不起。不需要现在解决所有麻烦，你只需要照顾好此刻的自己。',extra:'我已经尽力了 ｜ 我可以慢慢休息 ｜ 难受是暂时的'},
 {name:'换个注意方向',preview:'用身边的感官线索，轻轻回到当下',title:'把注意力轻轻拉回身边',text:'54321 感官练习：说出你看见的 5 样东西、摸到的 4 样东西、听见的 3 种声音、闻到的 2 种气味、尝到的 1 种味道。把思绪从焦虑里轻轻带回来。',extra:'找不到某一种感觉也没关系，跳过就好，不需要凑齐。'},
 {name:'入睡前的三步',preview:'三个可选的小动作，不必全部完成',title:'睡前低负担三步',text:'① 放下手机，屏幕调暗或者放到远处。\n② 做 3 次绵长的呼吸，呼气比吸气更长。\n③ 告诉自己：今天的任务，到这里就结束了。',extra:'这些只是可选的小建议。保持自然、舒服的呼吸，不想做也可以直接休息。'}
]
const activeCalm = computed(()=>calmTools.find(item=>item.name===tool.value)||calmTools[0])
const readingMode=ref('browser'),voiceSettings=ref(false),thoughtInput=ref(null)
let nativeSpeech
function focusThought(){thoughtInput.value?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});thoughtInput.value?.focus({preventScroll:true})}
function readCalm(){
 if(playing.value||ttsLoading.value){stopVoice();return}
 const text=[activeCalm.value.title,activeCalm.value.text,activeCalm.value.extra].join('。')
 if(readingMode.value==='cloud'){void speak(false,text);return}
 if(!('speechSynthesis' in window)){notify('这个浏览器暂不支持原生朗读，可以在朗读设置里选择云端音色。');voiceSettings.value=true;return}
 stopVoice()
 const request=++voiceRequest
 nativeSpeech=new SpeechSynthesisUtterance(text);nativeSpeech.lang='zh-CN';nativeSpeech.rate=.85
 nativeSpeech.onend=()=>{if(request===voiceRequest)playing.value=false}
 nativeSpeech.onerror=()=>{if(request===voiceRequest){playing.value=false;notify('朗读暂时未能开始，可以再试一次，或选择云端音色。')}}
 playing.value=true;window.speechSynthesis.speak(nativeSpeech)
}
watch(tool,()=>stopVoice())
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
function stopVoice(){voiceRequest++;if(nativeSpeech){window.speechSynthesis?.cancel();nativeSpeech=null;}voiceAbort?.abort();voiceAbort=null;voiceAudio?.pause();voiceAudio=null;playing.value=false;ttsLoading.value=false}
async function speak(sample=false,overrideText=''){
 if(ttsLoading.value)return
 stopVoice()
 const request=++voiceRequest,controller=new AbortController();voiceAbort=controller
 const text=overrideText||(sample?'今晚，不用赶路。让自己慢慢安静下来，做个好梦。':currentText.value)
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
 }catch(e){if(request===voiceRequest){playing.value=false;const text=e.name==='AbortError'?'声音加载超时，请稍后重试':e.message||'云端音色暂时不可用，可以先阅读故事';if(needsSetup(text)){notify('先连接 AI 服务，才能用人声朗读');void openAiSetup(route.fullPath)}else notify(text)}}
 finally{clearTimeout(timeout);if(request===voiceRequest){ttsLoading.value=false;voiceAbort=null}}
}
async function generateStory(){if(busy.value)return;busy.value=true;error.value='';abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),85000);try{const r=await fetch('/api/dream-studio/create',{method:'POST',headers:{'Content-Type':'application/json'},signal:abort.signal,body:JSON.stringify({task:'story',text:'请创作一个'+genre.value+'主题的睡前故事。',style:role.value})});const data=await r.json();if(!r.ok)throw new Error(typeof data.detail==='string'?data.detail:'故事暂时没有生成');stopVoice();customStory.value=data.text;notify('千问故事已生成，可以阅读或用云端音色朗读')}catch(e){error.value=e.name==='AbortError'?'已停止等待，可以改读内置故事。':e.message;if(needsSetup(error.value))void openAiSetup(route.fullPath)}finally{clearTimeout(timeout);busy.value=false}}
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
 <div class="j-tabs" role="group" aria-label="星夜叙语内容切换">
  <button :aria-pressed="path==='/dream/bedtime-stories'" :class="{'j-selected':path==='/dream/bedtime-stories'}" @click="router.replace({path:'/dream/night-talk',query:{...route.query,section:'stories'}})">睡前故事</button>
  <button :aria-pressed="path==='/dream/tree-hole'" :class="{'j-selected':path==='/dream/tree-hole'}" @click="router.replace({path:'/dream/night-talk',query:{...route.query,section:'tree-hole'}})">情绪树洞</button>
 </div>
 <p class="j-notice"><span class="j-dot"></span>陪伴与日常放松，不替代心理或睡眠诊疗。{{path==='/dream/tree-hole'?'工具朗读默认使用浏览器声音，也可选择云端音色。':'人物朗读由 AI 云端音色提供。'}}</p>
 <template v-if="path==='/dream/bedtime-stories'">
  <div class="j-wide-grid"><aside class="j-panel j-stack"><h2>今晚，听哪一种世界？</h2><button v-for="s in bedtimeStories" :key="s.name" :class="{'j-selected':story.name===s.name&&!customStory}" @click="changeStory(s)">{{s.name}}<small>{{s.theme}}</small></button><button class="j-glass" @click="randomStory">✧ 随机换一篇</button><div class="j-rule"></div><label>陪伴语气<select v-model="role" class="j-glass"><option>朋友般的陪伴</option><option>安静轻声陪伴</option><option>缓慢疗愈陪伴</option></select></label><label>人物声音切换<select v-model="cloudVoice" class="j-glass" @change="changeVoice"><option v-for="v in cloudVoices" :key="v.id" :value="v.id">{{v.name}}</option></select></label><button class="j-voice-preview j-glass" :disabled="ttsLoading" @click="speak(true)"><span v-if="ttsLoading" class="j-star-load" aria-hidden="true"><i></i><i></i><i></i></span><span>{{ttsLoading?'声音正在点亮…':'试听人物声音'}}</span></button><small>AI云端音色，可自由切换男女声，用于故事朗读，无需额外配置系统语音。</small><RouterLink class="j-glass" to="/settings/ai">AI 服务设置 · 配置与测试音色 ↗</RouterLink><label>背景音乐切换<select v-model="musicTrack" class="j-glass" @change="changeMusic"><option v-for="track in musicTracks" :key="track.id" :value="track.id">{{track.name}}</option></select></label><button :aria-pressed="sound" @click="toggleSound">{{sound?'暂停背景音乐':'播放背景音乐'}}</button><label>音乐音量<input type="range" min="0" max=".2" step=".01" :value="soundVolume" @input="volume"></label><small>氛围音乐在本机轻声合成，循环播放；人物朗读与背景音乐可独立开关。</small></aside>
  <section class="j-stack"><div class="j-panel story-paper"><div class="j-between"><span class="j-tag">{{customStory?'AI 生成故事':'内置原创故事'}}</span><small>{{genre}}</small></div><h2>{{customStory?'今夜，专属的一段故事':story.name}}</h2><p class="j-prose">{{currentText}}</p><div class="j-row j-section-gap"><button class="j-primary" :disabled="ttsLoading" @click="playing?stopVoice():speak()"><span v-if="ttsLoading" class="j-star-load" aria-hidden="true"><i></i><i></i><i></i></span><span>{{ttsLoading?'正在点亮声音…':playing?'停止朗读':'轻轻读给我听'}}</span></button><button @click="toggleSound">{{sound?'暂停背景音乐':'播放背景音乐'}}</button></div><label v-if="sound" class="j-section-gap">音乐音量<input type="range" min="0" max=".2" step=".01" :value="soundVolume" @input="volume"></label></div><section class="j-panel"><h3>让千问为今夜写一段</h3><div class="j-row"><label style="flex:1">故事主题<select v-model="genre"><option v-for="s in bedtimeStories" :key="s.theme">{{s.theme}}</option></select></label><button :disabled="busy" @click="generateStory">{{busy?'故事正在慢慢展开…':'生成今夜故事'}}</button><button v-if="busy" @click="abort?.abort()">停止等待</button></div><p v-if="error" class="j-error" role="alert">{{error}}</p><RouterLink v-if="error" to="/settings/ai">打开 AI 服务设置，配置或测试连接 →</RouterLink></section><div class="j-row j-section-gap"><button @click="router.push('/dream?scene=map')">梦境地图 ↗</button><button @click="router.push('/dream?scene=network')">丝线网络 ↗</button></div><button @click="stopVoice();router.push('/dream/cues')">听到这里，给今夜留下一颗种子 ↗</button></section></div>
 </template>
 <template v-else-if="path==='/dream/tree-hole'">
  <div class="tree-top j-section-gap"><section class="j-panel"><span class="j-tag">{{feeling}}</span><h2 class="j-section-gap">有一句话，想先放在这里吗？</h2><p class="tree-muted">不用强迫自己整理通顺，碎片词语、一句抱怨、模糊感受都可以。也不用现在就找到答案，只是先把它放下来。</p><label><span class="j-sr">留给树洞的一句话</span><textarea ref="thoughtInput" v-model="thought" rows="4" maxlength="500" placeholder="比如“我很担心今晚睡不着”“心里沉甸甸的”，不想写也可以直接跳过"></textarea></label><button class="j-primary j-section-gap" :disabled="!thought.trim()" @click="leaveThought">把这句话放下</button><p class="j-help">内容保存在当前账号，退出页面不会消失，下次登录可以继续回看；你随时可以删除这条记录。</p></section><section class="j-panel"><small>不必立刻睡着，先做一件轻松的小事</small><h2>{{activity.title}}</h2><p>{{activity.text}}</p><div class="j-row"><button @click="randomActivity">再给我一个小建议</button><button @click="router.replace('/dream/tree-hole#calm-tools')">查看下方安心小工具</button></div></section></div>

 </template>
 <template v-if="path==='/dream/tree-hole'">
  <section id="calm-tools" class="j-panel j-section-gap" style="scroll-margin-top:110px"><h2>安心小工具・陪你照顾此刻</h2><p class="tree-muted">这些是照顾当下情绪的轻量练习，没有对错，随时可以停下、随时可以切换。</p><p class="j-help">不是医疗急救服务，如果持续难受，请寻求专业帮助。</p><div class="j-tabs calm-tabs" role="group" aria-label="安心小工具"><button v-for="t in calmTools" :key="t.name" :class="{'j-selected':tool===t.name}" :aria-label="t.name" :aria-pressed="tool===t.name" :aria-describedby="'preview-'+calmTools.indexOf(t)" @click="tool=t.name">{{t.name}}<span :id="'preview-'+calmTools.indexOf(t)" class="calm-tooltip" role="tooltip">{{t.preview}}</span></button></div></section>
  <section class="j-panel calm-detail"><div class="calm-reading"><button :aria-expanded="voiceSettings" aria-controls="calm-voice-settings" @click="voiceSettings=!voiceSettings">⚙ 朗读设置</button><button :aria-pressed="playing" @click="readCalm">{{ttsLoading?'取消加载':playing?'停止朗读':'朗读这段话'}}</button></div>
   <div v-if="voiceSettings" id="calm-voice-settings" class="calm-settings"><label>朗读方式<select v-model="readingMode" @change="stopVoice"><option value="browser">浏览器原生声音（无需配置）</option><option value="cloud">AI 云端音色</option></select></label><label v-if="readingMode==='cloud'">人物声音<select v-model="cloudVoice" @change="stopVoice"><option v-for="v in cloudVoices" :key="v.id" :value="v.id">{{v.name}}</option></select></label><RouterLink :to="{path:'/settings/ai',query:{from:route.fullPath}}">配置或测试云端 API →</RouterLink></div>
   <Transition name="calm-fade" mode="out-in"><div :key="tool" class="calm-copy"><img src="/dream-rooms/listening.png" alt="柔和梦境插画"><h2>{{activeCalm.title}}</h2><p>{{activeCalm.text}}</p><p class="tree-muted">{{activeCalm.extra}}</p><button @click="focusThought">把一句心事交给树洞</button></div></Transition>
  </section>
  <section v-if="holes.length" class="j-panel j-section-gap"><h3>那些被安放的心事</h3><article v-for="h in holes.slice(0,10)" :key="h.id" class="hole-note"><div class="j-between"><small>{{h.date}} · {{h.feeling}}</small><button class="j-small-action" @click="removeHole(h.id)">移除</button></div><p>{{h.text}}</p></article></section>
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

.tree-top{display:grid;grid-template-columns:1fr 1fr;gap:24px}.tree-top>.j-panel{margin:0}.tree-top p,.calm-copy p{line-height:1.95}.tree-muted{color:#81758d}.tree-top .j-panel,.calm-detail,#calm-tools{border-radius:24px;box-shadow:0 5px 22px #81718f08}.calm-reading{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-bottom:20px}.calm-settings{padding:18px;border:1px solid #e5dcea;border-radius:16px;margin-bottom:24px;display:grid;gap:16px}.calm-copy{min-height:250px}.calm-copy img{float:right;width:160px;height:180px;object-fit:cover;border-radius:24px;margin:0 0 24px 32px;opacity:.8}.calm-copy p{white-space:pre-line;max-width:68ch}.calm-tabs{overflow:visible;flex-wrap:wrap;gap:12px}.calm-tabs button{position:relative;min-height:44px}.calm-tooltip{visibility:hidden;position:absolute;bottom:calc(100% + 10px);left:0;width:190px;white-space:normal;padding:10px 14px;border:1px solid #dfd4e6;border-radius:12px;background:#fffcff;color:#756681;font-size:12px;opacity:0;pointer-events:none;z-index:5;transition:opacity .15s cubic-bezier(.23,1,.32,1)}.calm-tabs button:focus-visible .calm-tooltip{opacity:1;visibility:visible}.calm-fade-enter-active,.calm-fade-leave-active{transition:opacity .18s cubic-bezier(.23,1,.32,1)}.calm-fade-enter-from,.calm-fade-leave-to{opacity:0}@media(hover:hover) and (pointer:fine){.calm-tabs button:hover .calm-tooltip{opacity:1;visibility:visible}}@media(max-width:700px){.tree-top{grid-template-columns:1fr;gap:18px}.calm-copy img{width:100px;height:120px;margin-left:16px}.calm-tabs button:last-child .calm-tooltip{left:auto;right:0}}@media(prefers-reduced-motion:reduce){.calm-fade-enter-active,.calm-fade-leave-active,.calm-tooltip{transition:none}}
@media(max-width:700px){.tree-top,.tree-top>.j-panel,.calm-detail{min-width:0}.calm-tabs{display:flex!important;white-space:normal}.calm-tooltip{position:static;display:none}.calm-tabs button:focus-visible .calm-tooltip{display:block;width:auto;max-width:180px}.calm-reading{justify-content:flex-start}}
</style>
