<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { bedtimeStories } from '../data/bedtime-content'
import { useDreamJourney } from '../composables/useDreamJourney'
import { useJourneyUi } from '../composables/useJourneyUi'
import { needsSetup, openAiSetup } from '../ai-status'
import { dreamOwner, dreamReady, dreamError, readDream, retryDreamAccount } from '../dream-account'
const route=useRoute(),router=useRouter(),{refresh,commit}=useDreamJourney(),{toast,notify,save}=useJourneyUi()
const path=computed(()=>route.path==='/dream/night-talk'?(['favorites','tree-hole'].includes(route.query.section)?'/dream/story-favorites':'/dream/bedtime-stories'):route.path)
const story=ref(bedtimeStories[0]),genre=ref('星空远行'),role=ref('朋友般的陪伴'),customStory=ref(''),generatedTheme=ref(''),busy=ref(false),error=ref(''),sound=ref(false),soundVolume=ref(.08)
const favoriteBusy=ref(false),expandedFavorite=ref(null),readingFavorite=ref(null)
const favoriteStories=computed(()=>{const items=readDream('notes',{}).storyFavorites;return Array.isArray(items)?items:[]})
const isStorySaved=computed(()=>!!customStory.value&&favoriteStories.value.some(item=>item.text===customStory.value))
async function collectStory(){if(favoriteBusy.value||!customStory.value||isStorySaved.value)return;favoriteBusy.value=true;const item={id:crypto.randomUUID(),title:generatedTheme.value||genre.value.trim()||'今夜故事',text:customStory.value,createdAt:new Date().toISOString()};try{await save(commit,'notes',{...readDream('notes',{}),storyFavorites:[item,...favoriteStories.value]},'已收藏到当前账号的故事收藏')}finally{favoriteBusy.value=false}}
async function removeStory(item){if(favoriteBusy.value)return;favoriteBusy.value=true;try{if(await save(commit,'notes',{...readDream('notes',{}),storyFavorites:favoriteStories.value.filter(s=>s.id!==item.id)},'已取消收藏')){if(readingFavorite.value===item.id)stopVoice();if(expandedFavorite.value===item.id)expandedFavorite.value=null}}finally{favoriteBusy.value=false}}
function readFavorite(item){if(readingFavorite.value===item.id&&(playing.value||ttsLoading.value)){stopVoice();return}stopVoice();void speak(false,item.text,item.id)}
function openStories(){router.replace({path:'/dream/night-talk',query:{...route.query,section:'stories'}})}
watch(path,()=>{stopVoice();expandedFavorite.value=null})
// 云端音色：qwen3-tts-flash 系统音色，选中后用于故事朗读。
const cloudVoices=[
 {id:'Serena',name:'温柔女声'},
 {id:'Ethan',name:'青年男声'},
 {id:'Mochi',name:'清澈少年音'},
 {id:'Eldric Sage',name:'沉稳大叔音'},
 {id:'Momo',name:'柔和童音'},
 {id:'Cherry',name:'活泼少女音'},
 {id:'Chelsie',name:'知性姐姐音'},
 {id:'Dylan',name:'京腔男声'},
]
const cloudVoice=ref('Serena'),ttsLoading=ref(false),playing=ref(false)
const readingStyles={
 '朋友般的陪伴':{rate:.98,volume:1},
 '安静轻声陪伴':{rate:.9,volume:.72},
 '缓慢疗愈陪伴':{rate:.82,volume:.86}
}
function applyReadingStyle(player){const style=readingStyles[role.value]||readingStyles['朋友般的陪伴'];player.preservesPitch=true;player.defaultPlaybackRate=style.rate;player.playbackRate=style.rate;player.volume=style.volume}
watch(role,()=>{if(voiceAudio)applyReadingStyle(voiceAudio)})
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
function stopVoice(){voiceRequest++;voiceAbort?.abort();voiceAbort=null;voiceAudio?.pause();voiceAudio=null;playing.value=false;ttsLoading.value=false;readingFavorite.value=null}
// Keep short audio clips in this page only; never persist conversation text in browser storage.
const voiceCache=new Map()
watch(dreamOwner,()=>{abort?.abort();busy.value=false;error.value='';stopVoice();voiceCache.clear();customStory.value='';generatedTheme.value='';expandedFavorite.value=null})
function readingChunks(text){
 const chunks=[];let rest=text.trim()
 while(rest.length){const limit=chunks.length?260:90;let end=Math.min(limit,rest.length)
  if(rest.length>limit){const marks=[...rest.slice(0,limit).matchAll(/[。！？；，、\n]/g)];const last=marks.at(-1);if(last&&last.index>=30)end=last.index+1}
  chunks.push(rest.slice(0,end));rest=rest.slice(end)
 }
 return chunks
}
async function speak(sample=false,overrideText='',favoriteId=null){
 if(ttsLoading.value||playing.value){stopVoice();return}
 stopVoice()
 readingFavorite.value=favoriteId
 const request=++voiceRequest,controller=new AbortController();voiceAbort=controller
 const voice=cloudVoice.value,owner=dreamOwner.value
 const chunks=readingChunks(overrideText||(sample?'今晚，不用赶路。让自己慢慢安静下来，做个好梦。':currentText.value))
 const prepared=new Map()
 function fail(e){if(request!==voiceRequest)return;stopVoice();const message=e.name==='AbortError'?'声音加载超时，请稍后重试':e.message||'云端音色暂时不可用，可以先阅读故事';if(needsSetup(message)){notify('先连接 AI 服务，才能用人声朗读');void openAiSetup(route.fullPath)}else notify(message)}
 function load(index){
  if(prepared.has(index))return prepared.get(index)
  const text=chunks[index],key=JSON.stringify([owner,voice,text]),cached=voiceCache.get(key)
  const task=(async()=>{
   if(cached&&Date.now()-cached.time<5*3600000)return {url:cached.url,key}
   const timeout=setTimeout(()=>controller.abort(),90000)
   try{const r=await fetch('/api/dream-studio/tts',{signal:controller.signal,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,voice})});const data=await r.json();if(!r.ok)throw new Error(typeof data.detail==='string'?data.detail:'云端音色暂时没有回应');if(!data.url)throw new Error('语音未生成，请重试');if(request!==voiceRequest)throw new DOMException('已停止','AbortError');voiceCache.set(key,{url:data.url,time:Date.now()});while(voiceCache.size>32)voiceCache.delete(voiceCache.keys().next().value);return {url:data.url,key}}finally{clearTimeout(timeout)}
  })().catch(error=>({error}))
  prepared.set(index,task);return task
 }
 async function play(index){
  if(request!==voiceRequest)return
  if(index>=chunks.length){playing.value=false;ttsLoading.value=false;voiceAudio=null;voiceAbort=null;readingFavorite.value=null;return}
  ttsLoading.value=true;playing.value=false
  const data=await load(index);if(request!==voiceRequest)return;if(data.error)throw data.error
  const player=new Audio(data.url);applyReadingStyle(player);voiceAudio=player
  player.onerror=()=>{voiceCache.delete(data.key);fail(new Error('音频暂时无法播放，请重新试听'))}
  player.onended=()=>{if(request===voiceRequest)void play(index+1).catch(fail)}
  await player.play();if(request!==voiceRequest){player.pause();return}
  playing.value=true;ttsLoading.value=false
  // Prepare just one following segment while the current segment is playing.
  if(index+1<chunks.length)void load(index+1)
 }
 try{await play(0)}catch(e){fail(e)}
}
async function generateStory(){if(busy.value)return;if(!genre.value.trim())return notify('先输入一个想听的故事主题');const theme=genre.value.trim(),owner=dreamOwner.value;busy.value=true;error.value='';abort=new AbortController();const timeout=setTimeout(()=>abort.abort(),85000);try{const r=await fetch('/api/dream-studio/create',{method:'POST',headers:{'Content-Type':'application/json'},signal:abort.signal,body:JSON.stringify({task:'story',text:'请创作一个'+theme+'主题的睡前故事。',style:role.value})});const data=await r.json();if(!r.ok)throw new Error(typeof data.detail==='string'?data.detail:'故事暂时没有生成');if(owner!==dreamOwner.value)return;stopVoice();customStory.value=data.text;generatedTheme.value=theme;notify('今夜故事已生成，可以朗读或收藏')}catch(e){error.value=e.name==='AbortError'?'已停止等待，可以改读内置故事。':e.message;if(needsSetup(error.value))void openAiSetup(route.fullPath)}finally{clearTimeout(timeout);busy.value=false}}
function changeStory(s){stopVoice();customStory.value='';story.value=s;genre.value=s.theme;error.value=''}
function randomStory(){const candidates=bedtimeStories.filter(s=>s.name!==story.value.name);changeStory(candidates[Math.floor(Math.random()*candidates.length)]);notify('换了一个夜晚的世界')}
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
onMounted(refresh)
onBeforeUnmount(()=>{abort?.abort();stopVoice();if(sound.value){noise?.stop();audio?.close()}clearInterval(timer)})
</script>
<template>
<div class="journey">
 <div class="j-tabs" role="group" aria-label="星夜叙语内容切换">
  <button :aria-pressed="path==='/dream/bedtime-stories'" :class="{'j-selected':path==='/dream/bedtime-stories'}" @click="router.replace({path:'/dream/night-talk',query:{...route.query,section:'stories'}})">睡前故事</button>
  <button :aria-pressed="path==='/dream/story-favorites'" :class="{'j-selected':path==='/dream/story-favorites'}" @click="router.replace({path:'/dream/night-talk',query:{...route.query,section:'favorites'}})">故事收藏</button>
 </div>
 <template v-if="path==='/dream/bedtime-stories'">
  <div class="j-wide-grid"><aside class="j-panel j-stack"><h2>今晚，听哪一种世界？</h2><button v-for="s in bedtimeStories" :key="s.name" :class="{'j-selected':story.name===s.name&&!customStory}" @click="changeStory(s)">{{s.name}}<small>{{s.theme}}</small></button><button class="j-glass" @click="randomStory">✧ 随机换一篇</button><div class="j-rule"></div><label>陪伴语气<select v-model="role" class="j-glass"><option>朋友般的陪伴</option><option>安静轻声陪伴</option><option>缓慢疗愈陪伴</option></select></label><label>朗读声音<select v-model="cloudVoice" class="j-glass" @change="changeVoice"><option v-for="v in cloudVoices" :key="v.id" :value="v.id">{{v.name}}</option></select></label><button class="j-voice-preview j-glass" @click="speak(true)">{{ttsLoading?'取消加载':playing?'停止朗读':'听听这个声音'}}</button><small>8 种云端音色。陪伴语气会调整朗读的语速与音量，试听和故事朗读同步生效。</small><label>背景音乐切换<select v-model="musicTrack" class="j-glass" @change="changeMusic"><option v-for="track in musicTracks" :key="track.id" :value="track.id">{{track.name}}</option></select></label><button :aria-pressed="sound" @click="toggleSound">{{sound?'暂停背景音乐':'播放背景音乐'}}</button><label>音乐音量<input type="range" min="0" max=".2" step=".01" :value="soundVolume" @input="volume"></label><small>氛围音乐在本机轻声合成，循环播放；人物朗读与背景音乐可独立开关。</small></aside>
  <section class="j-stack"><div class="j-panel story-paper"><div class="j-between"><span class="j-tag">{{customStory?'AI 生成故事':'内置原创故事'}}</span><small>{{customStory?generatedTheme:genre}}</small></div><h2>{{customStory?'今夜，专属的一段故事':story.name}}</h2><p class="j-prose">{{currentText}}</p><div class="j-row j-section-gap"><button class="j-primary" @click="speak()"><span v-if="ttsLoading" class="j-star-load" aria-hidden="true"><i></i><i></i><i></i></span><span>{{ttsLoading?'取消加载':playing?'停止朗读':'读给我听'}}</span></button><button @click="toggleSound">{{sound?'暂停背景音乐':'播放背景音乐'}}</button><button v-if="customStory" :disabled="favoriteBusy||isStorySaved||!dreamReady" @click="collectStory">{{isStorySaved?'已收藏':favoriteBusy?'正在收藏…':'收藏故事'}}</button></div><label v-if="sound" class="j-section-gap">音乐音量<input type="range" min="0" max=".2" step=".01" :value="soundVolume" @input="volume"></label></div><section class="j-panel"><h3>为今夜写一段</h3><div class="j-row story-theme-row"><label style="flex:1;min-width:0">故事主题<input v-model="genre" maxlength="100" placeholder="输入你想听的故事主题"></label><button :disabled="busy||!genre.trim()" @click="generateStory">{{busy?'故事正在慢慢展开…':'生成今夜故事'}}</button><button v-if="busy" @click="abort?.abort()">停止等待</button></div><p v-if="error" class="j-error" role="alert">{{error}}</p><RouterLink v-if="error" to="/settings/ai">打开 AI 服务设置，配置或测试连接 →</RouterLink></section></section></div>
 </template>
 <template v-else-if="path==='/dream/story-favorites'">
  <section class="j-panel saved-stories">
   <div class="saved-heading"><div><h2>收藏的今夜故事</h2><p>喜欢的故事，留着下次慢慢听。</p></div><span class="j-tag">{{favoriteStories.length}} 篇收藏</span></div>
   <div v-if="dreamError" class="j-empty" role="alert"><p>故事收藏暂时未能载入。</p><button @click="retryDreamAccount">重新载入</button></div>
   <p v-else-if="!dreamReady" role="status">正在读取你的故事收藏…</p>
   <div v-else-if="!favoriteStories.length" class="j-empty"><h3>还没有收藏的故事</h3><p>生成今夜故事后，点击“收藏故事”，就能把喜欢的故事留在这里。</p><button class="j-primary" @click="openStories">去生成今夜故事</button></div>
   <template v-else>
    <div class="saved-voice-settings"><label>朗读声音<select v-model="cloudVoice" @change="changeVoice"><option v-for="v in cloudVoices" :key="v.id" :value="v.id">{{v.name}}</option></select></label><label>陪伴语气<select v-model="role"><option>朋友般的陪伴</option><option>安静轻声陪伴</option><option>缓慢疗愈陪伴</option></select></label></div>
    <article v-for="item in favoriteStories" :key="item.id" class="saved-story"><small>{{new Date(item.createdAt).toLocaleDateString('zh-CN')}}</small><h3>{{item.title}}</h3><p :class="{'saved-preview':expandedFavorite!==item.id}" class="saved-story-text">{{item.text}}</p><div class="saved-actions"><button @click="expandedFavorite=expandedFavorite===item.id?null:item.id">{{expandedFavorite===item.id?'收起故事':'展开故事'}}</button><button class="j-primary" @click="readFavorite(item)">{{readingFavorite===item.id?(ttsLoading?'取消加载':playing?'停止朗读':'朗读故事'):'朗读故事'}}</button><button :disabled="favoriteBusy" @click="removeStory(item)">取消收藏</button></div></article>
   </template>
  </section>
 </template><div v-if="toast" class="j-toast" role="status">{{toast}}</div>
</div>
</template>
<style scoped>
.saved-stories{max-width:1000px;margin-inline:auto}.saved-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}.saved-heading h2{margin:0}.saved-heading p{font-size:14px;color:#877990}.saved-heading .j-tag{white-space:nowrap}.saved-voice-settings{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:24px 0}.saved-story{padding:24px 0;border-top:1px solid #e6dfec;min-width:0}.saved-story small{color:#95879e;font-size:12px}.saved-story h3{font:500 23px/1.5 var(--display,serif);overflow-wrap:anywhere;margin:10px 0}.saved-story-text{white-space:pre-wrap;overflow-wrap:anywhere;font-size:15px;line-height:1.9}.saved-preview{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.saved-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:18px}@media(max-width:600px){.saved-voice-settings{grid-template-columns:1fr;gap:14px}.saved-heading h2{font-size:21px}.saved-actions{gap:8px}.saved-actions button{padding-inline:12px}}

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
