let consultPhoto='',consultPhotoDispose=null,consultPhotoVersion=0;
function clearConsultPhoto(){consultPhotoDispose?.();consultPhotoDispose=null;consultPhoto='';consultPhotoVersion++}
function consultPhotoMarkup(){return '<div class="consult-photo-tools"><button type="button" id="consultCamera">＋ 拍摄照片</button><button type="button" id="consultUpload">＋ 上传照片</button><input type="file" id="consultPhotoFile" accept="image/jpeg,image/png,image/webp" hidden></div><section id="consultCameraPanel" class="consult-camera" hidden><label>摄像头<select id="consultDevice" aria-label="选择摄像头"></select></label><video id="consultVideo" autoplay muted playsinline aria-label="问诊摄像头预览"></video><div><button type="button" id="consultCapture" disabled>拍下照片</button><button type="button" id="consultCameraClose">关闭摄像头</button></div></section><section class="consult-photo-preview" id="consultPhotoPreview" '+(consultPhoto?'':'hidden')+'><img id="consultPhotoImage" alt="待解读的照片" '+(consultPhoto?'src="'+consultPhoto+'"':'')+'><div><b>照片已附加</b><button type="button" id="consultPhotoRemove">移除照片</button><small>仅保存文字解读，不保存原图；请避开私密部位与身份信息。</small></div></section><p id="consultPhotoStatus" class="consult-photo-status" role="status">点击发送会将照片交给 AI 解读，仅供参考。</p>'}
function bindConsultPhoto(){
 consultPhotoDispose?.();
 const form=q('#consultForm'),video=q('#consultVideo'),panel=q('#consultCameraPanel'),capture=q('#consultCapture'),status=q('#consultPhotoStatus'),device=q('#consultDevice');
 const epoch=generation,identity=String(user?.id||'');let stream=null,ticket=0,disposed=false;
 const active=()=>!disposed&&epoch===generation&&String(user?.id||'')===identity&&q('#consultForm')===form&&location.hash==='#consult';
 const say=text=>{if(active())status.textContent=text};
 function stop(){ticket++;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;panel.hidden=true;capture.disabled=true}
 function dispose(){if(disposed)return;stop();disposed=true;observer.disconnect();window.removeEventListener('hashchange',dispose);window.removeEventListener('pagehide',dispose)}
 const observer=new MutationObserver(()=>{if(!active())dispose()});observer.observe(q('#page'),{childList:true,subtree:true});window.addEventListener('hashchange',dispose);window.addEventListener('pagehide',dispose);consultPhotoDispose=dispose;
 function allowed(){if(consultLoading)return false;if(!user){showLoginPrompt();return false}return true}
 async function choose(file){
  if(!file||!active())return;stop();const version=++consultPhotoVersion;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024){say('请选择不超过 10MB 的 JPEG、PNG 或 WebP 照片。');return}
  say('正在准备照片…');let bitmap;
  try{bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>40000000)throw Error();const ratio=Math.min(1,1280/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);const image=canvas.toDataURL('image/jpeg',0.82);if(image.length>2800000)throw Error();if(!active()||version!==consultPhotoVersion)return;consultPhoto=image;q('#consultPhotoImage').src=image;q('#consultPhotoPreview').hidden=false;form.querySelector('button[type=submit]').textContent='发送问题 →';say('照片已选好，可以直接发送，也可补充症状。')}catch{say('照片无法读取，请换一张清晰照片。')}finally{bitmap?.close()}
 }
 async function start(deviceId=''){
  if(!allowed())return;stop();const version=ticket;say('正在打开摄像头，请允许浏览器使用摄像头…');
  try{if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){say('摄像头需要 HTTPS 或 localhost 地址，也可以上传照片。');return}
  const media=await navigator.mediaDevices.getUserMedia({audio:false,video:deviceId?{deviceId:{exact:deviceId}}:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
  if(!active()||version!==ticket){media.getTracks().forEach(t=>t.stop());return}stream=media;panel.hidden=false;video.srcObject=media;await video.play();if(!active()||version!==ticket)return;capture.disabled=video.readyState<2;video.onloadeddata=()=>{if(active()&&stream===media)capture.disabled=false};
  const devices=await navigator.mediaDevices.enumerateDevices();if(!active()||version!==ticket)return;device.replaceChildren(...devices.filter(x=>x.kind==='videoinput').map((d,i)=>{const option=document.createElement('option');option.value=d.deviceId;option.textContent=d.label||'摄像头 '+(i+1);return option}));device.value=media.getVideoTracks()[0].getSettings().deviceId||'';say('对准需要咨询的部位，点击“拍下照片”。');
  }catch(error){if(!active()||version!==ticket)return;stop();say(error.name==='NotAllowedError'?'摄像头权限被拒绝，请允许摄像头后重试，或上传照片。':error.name==='NotFoundError'?'未找到摄像头，可连接设备或上传照片。':'摄像头无法使用，请检查设备是否被占用，或上传照片。')}
 }
 q('#consultCamera').onclick=()=>start();device.onchange=()=>start(device.value);q('#consultCameraClose').onclick=()=>{stop();say('摄像头已关闭。')};
 capture.onclick=()=>{if(!stream||video.readyState<2||!video.videoWidth)return;const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext('2d').drawImage(video,0,0);const version=ticket;capture.disabled=true;canvas.toBlob(blob=>{if(!active()||version!==ticket)return;if(blob)void choose(blob);else{capture.disabled=false;say('拍摄失败，请重试。')}},'image/jpeg',0.85)};
 q('#consultUpload').onclick=()=>{if(allowed()){stop();q('#consultPhotoFile').click()}};q('#consultPhotoFile').onchange=e=>{if(allowed())void choose(e.target.files[0]);e.target.value=''};
 q('#consultPhotoRemove').onclick=()=>{consultPhotoVersion++;consultPhoto='';q('#consultPhotoImage').removeAttribute('src');q('#consultPhotoPreview').hidden=true;form.querySelector('button[type=submit]').textContent='发送问题 →';say('照片已移除，可继续文字问诊。')};
 if(consultLoading)form.querySelectorAll('.consult-photo-tools button,.consult-camera button,.consult-camera select,.consult-photo-preview button,.consult-photo-preview input').forEach(x=>x.disabled=true);
}
