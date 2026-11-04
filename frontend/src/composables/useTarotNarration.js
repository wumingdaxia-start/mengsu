import { ref, onBeforeUnmount } from 'vue'

export function useTarotNarration() {
  const enabled=ref(true),status=ref('idle'),notice=ref(''),caption=ref('')
  const cache=new Map()
  let generation=0,controller,player,lastText='',disposed=false
  function stop(){generation++;controller?.abort();controller=null;if(player){player.pause();player.removeAttribute('src');player.load();player=null}status.value='idle'}
  async function speak(text){
    stop();lastText=text;caption.value=text;notice.value='';if(!enabled.value||disposed)return
    const ticket=generation;status.value='loading';controller=new AbortController();const pending=controller
    const timeout=setTimeout(()=>pending.abort(),90000)
    try{
      let url=cache.get(text)
      if(!url){
        const response=await fetch('/api/dream-studio/tarot-tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text}),signal:pending.signal})
        if(!response.ok)throw new Error(response.status===503?'unconfigured':'unavailable')
        const data=await response.json();if(typeof data.url!=='string'||!/^\/audio\/[a-zA-Z0-9_.-]+\.(?:wav|mp3)$/.test(data.url))throw new Error('unavailable')
        url=data.url;if(ticket!==generation||disposed)return
        if(cache.size>=24)cache.delete(cache.keys().next().value);cache.set(text,url)
      }
      if(ticket!==generation||disposed)return
      player=new Audio(url);const audio=player
      // Preserve the voice provider's natural timing and pitch.
      audio.playbackRate=1;audio.preservesPitch=true
      audio.onended=()=>{if(ticket===generation)status.value='idle'}
      audio.onerror=()=>{if(ticket===generation){cache.delete(text);status.value='error';notice.value='声音暂时播放不了，请点击重听。'}}
      try{await audio.play();if(ticket===generation)status.value='speaking'}catch{if(ticket===generation){status.value='blocked';notice.value='声音已准备好，点击重听即可播放。'}}
    }catch(error){if(ticket===generation&&!disposed){status.value='error';notice.value=error.message==='unconfigured'?'人声播报尚未配置，请由网站维护者设置云端语音服务。':'人声播报暂时不可用，请稍后重试。文字解读仍可阅读。'}}
    finally{clearTimeout(timeout);if(ticket===generation)controller=null}
  }
  async function pause(){
    if(status.value==='loading'){stop();return}
    if(status.value==='speaking'){player?.pause();status.value='paused';return}
    if(status.value==='paused'&&player){const ticket=generation;try{await player.play();if(ticket===generation)status.value='speaking'}catch{if(ticket===generation){status.value='blocked';notice.value='请点击重听播放声音。'}}}
  }
  function replay(){if(lastText){enabled.value=true;return speak(lastText)}}
  function toggle(){enabled.value=!enabled.value;if(!enabled.value)stop()}
  function clear(){stop();lastText='';caption.value='';notice.value='';cache.clear()}
  onBeforeUnmount(()=>{disposed=true;clear()})
  return {enabled,status,notice,caption,speak,replay,pause,toggle,clear}
}
