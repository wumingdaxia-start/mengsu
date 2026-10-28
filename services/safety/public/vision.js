// Browser self-observation tools inspired by AI-EYE's three eye-health modules.
// Screen results are references, not clinical refraction or validated screening.
const visionLevels=[0.1,0.2,0.3,0.4,0.5,0.6,0.8,1,1.2];
const visionDirections=['right','down','left','up'];
const visionNames={acuity:'E 字视力自测',astigmatism:'散光线条观察',color:'颜色辨别练习'};
let visionSession=null;
function resetVision(){visionSession=null;q('.modal-card').classList.remove('vision-modal')}
function visionValue(value){return value===0?'低于 0.1':value===1.2?'≥ 1.2':value.toFixed(1)}
function visionOptotypePixels(value,distanceCm,calibrationPx){
 return 2*distanceCm*10*Math.tan((5/60*Math.PI/180)/2)/value*(calibrationPx/50);
}
function visionRecords(){return data.vision||[]}
function visionOverview(context){
 const records=visionRecords(),latest=records.find(item=>item.kind==='acuity');
 const detail=latest
  ?'<div class="vision-overview-values"><span><small>左眼参考值</small><b>'+visionValue(latest.left)+'</b></span><span><small>右眼参考值</small><b>'+visionValue(latest.right)+'</b></span></div><p>'+escapeHtml(latest.date)+' · '+escapeHtml(latest.correction)+' · 网页自测参考</p>'
  :'<p>'+(user?'还没有视力记录，可从 E 字视力自测或护眼观察开始。':'游客模式不显示历史记录，登录后可保存每次自测结果。')+'</p>';
 return '<article class="card vision-overview '+(context==='analysis'?'vision-overview-analysis':'')+'"><div><span class="tag">VISION CARE</span><h2>'+(context==='analysis'?'视力观察摘要':'视力与护眼')+'</h2>'+detail+'</div><a class="vision-overview-link" href="#vision">'+(latest?'查看 '+records.length+' 条记录':'开始视力检测')+' <span>→</span></a></article>';
}
function visionHistory(){
 const records=visionRecords();
 if(!records.length)return empty('暂无视力记录。完成自测或观察后，可保存到当前账号。');
 return '<div class="list">'+records.map((item,index)=>{
  const detail=item.kind==='acuity'
   ?'左眼 '+visionValue(item.left)+' · 右眼 '+visionValue(item.right)+'<small>'+escapeHtml(item.correction)+' · 距离 '+item.distanceCm/100+' 米 · 网页参考值</small>'
   :item.kind==='astigmatism'
    ?'左眼：'+escapeHtml(item.left)+' · 右眼：'+escapeHtml(item.right)+'<small>主观线条观察，不表示散光度数</small>'
    :'匹配正确 '+item.correct+' / '+item.total+'<small>仅为练习记录，不判断色盲或色弱</small>';
  return '<div class="list-item"><span class="list-icon">◎</span><div><b>'+visionNames[item.kind]+'</b><small>'+escapeHtml(item.date)+'</small></div><div class="value">'+detail+'</div>'+deleteButton('vision',index)+'</div>';
 }).join('')+'</div>';
}
function vision(){
 const latest=visionRecords().find(item=>item.kind==='acuity');
 return '<section class="card vision-banner"><div><span class="tag">EYE CARE · 看见清晰日常</span><h2>给眼睛，也留一点关心</h2><p>单眼观察、双眼记录，用一次简单自测了解自己的视觉变化。</p><div class="vision-tags"><span>屏幕尺寸校准</span><span>左右眼分别测试</span><span>账号独立记录</span></div></div><div class="vision-art" aria-hidden="true"><svg viewBox="0 0 240 170"><path d="M20 85Q120-35 220 85Q120 205 20 85Z"/><circle cx="120" cy="85" r="37"/><circle cx="120" cy="85" r="17"/><path d="M120 12V0M120 170v-12M30 28l-8-8M210 28l8-8"/></svg></div></section>'+
 '<div class="vision-disclaimer">网页自测受屏幕、距离、光线和操作影响，仅作日常参考，不能用于配镜或诊断。突发视力下降、眼痛或闪光感，请及时就医。</div>'+
 '<section class="grid grid-3 vision-summary">'+
 metric('◉',latest?visionValue(latest.left):'—','','最近左眼参考值',latest?latest.date:'尚未自测')+
 metric('◉',latest?visionValue(latest.right):'—','','最近右眼参考值',latest?latest.correction:'尚未自测')+
 metric('✓',visionRecords().length,'条','已保存视力记录','自测与观察')+'</section>'+
 '<div class="section-head"><div><h2>选择一项，开始关注眼健康</h2><p>游客可以体验，保存记录需先登录账号</p></div></div>'+
 '<section class="grid grid-3 vision-tools">'+
 '<article class="card"><span class="vision-tool-icon">E</span><small>01 / 清晰度</small><h3>E 字视力自测</h3><p>用直尺校准屏幕，保持指定距离，依次辨认左右眼视标开口方向。</p><button class="primary" data-vision-start="acuity">开始视力自测 <span>↗</span></button></article>'+
 '<article class="card"><span class="vision-tool-icon">✳</span><small>02 / 线条观察</small><h3>散光线条观察</h3><p>分别观察放射线的清晰度与深浅是否一致，记录个人感受。</p><button class="primary" data-vision-start="astigmatism">打开观察图 <span>↗</span></button></article>'+
 '<article class="card"><span class="vision-tool-icon vision-color-icon">◉</span><small>03 / 颜色感知</small><h3>颜色辨别练习</h3><p>比较不同色块，完成六次颜色匹配。此练习不是标准色盲检查。</p><button class="primary" data-vision-start="color">开始颜色练习 <span>↗</span></button></article></section>'+
 '<div class="section-head"><div><h2>我的视力记录</h2><p>视力结果独立保存，不直接计入运动、饮食和睡眠的安全状态评分</p></div><span class="vision-count">'+visionRecords().length+' 条记录</span></div>'+
 '<article class="card">'+visionHistory()+'</article>'+
 '<div class="section-head"><h2>护眼小习惯</h2></div><section class="grid grid-3">'+
 advice('20–20–20 休息法','近距离用眼约 20 分钟后，向约 6 米外看至少 20 秒，让眼睛适当放松。')+
 advice('光线与距离都合适','避免在昏暗环境或强反光下盯屏；屏幕亮度与环境相协调，注意眨眼。')+
 advice('关注持续变化','反复模糊、重影或两眼差异明显时，建议到眼科检查；网页自测不能测出近视度数。')+
 '</section><p class="vision-source">功能设计参考 <a href="https://github.com/MikeDean2367/AI-EYE" target="_blank" rel="noopener noreferrer">AI-EYE 开源项目</a> 的视力、散光、色觉与历史记录模块；本页为网页自测版本，未启用摄像头测距或手势识别。</p>';
}
function bindVision(){
 document.querySelectorAll('[data-vision-start]').forEach(button=>button.onclick=()=>openVision(button.dataset.visionStart));
}
function openVision(kind){
 if(!ready||saving)return;
 resetVision();
 visionSession={kind,identity:user?String(user.id):null,epoch:generation,version:revision};
 q('.modal-card').classList.add('vision-modal');
 modal.hidden=false;
 if(kind==='acuity')showVisionSetup();
 else if(kind==='astigmatism')showAstigmatism();
 else if(kind==='color')showColorIntro();
}
function showVisionSetup(){
 modalBody.innerHTML='<span class="tag">先校准，再测试</span><h2>E 字视力自测准备</h2><p class="vision-hint">请使用较大屏幕。测试前调好亮度，关闭夜间滤色，保持正常浏览器缩放。测试中不要改变缩放。</p>'+
 '<form id="visionSetup" class="form-grid"><div class="field span-2"><label for="visionCalibration">① 用实体直尺，把下方线段调整为实际 5 厘米</label><input id="visionCalibration" name="calibration" type="range" min="120" max="300" value="190"><div class="vision-ruler-wrap"><div class="vision-ruler" id="visionRuler" style="width:190px"><span>实际 5 厘米</span></div></div></div>'+
 '<div class="field"><label for="visionDistance">② 眼睛到屏幕的距离</label><select id="visionDistance" name="distance"><option value="200">2 米（推荐）</option><option value="100">1 米</option><option value="300">3 米</option></select></div>'+
 '<div class="field"><label for="visionCorrection">③ 当前测试方式</label><select id="visionCorrection" name="correction"><option>裸眼</option><option>佩戴眼镜</option></select></div>'+
 '<p class="vision-hint span-2">先遮住右眼测左眼，再遮住左眼测右眼，遮盖时不要压迫眼球。按 E 字开口选择方向；每个级别 3 次，至少答对 2 次才进入下一级。看不清就选择“看不清”。可请旁人协助点击。</p>'+
 '<label class="vision-check span-2"><input type="checkbox" required>我已用直尺校准，并会保持所选距离</label>'+
 '<button class="primary span-2" type="submit">准备好了，开始测左眼</button></form>';
 q('#visionCalibration').oninput=e=>q('#visionRuler').style.width=e.target.value+'px';
 q('#visionSetup').onsubmit=e=>{
  e.preventDefault();
  if(!visionSession)return;
  visionSession.distanceCm=Number(q('#visionDistance').value);
  visionSession.calibrationPx=Number(q('#visionCalibration').value);
  visionSession.correction=q('#visionCorrection').value;
  visionSession.eye='left';visionSession.level=0;visionSession.trial=0;visionSession.correct=0;visionSession.lastPassed=0;
  showOptotype();
 };
}
function showOptotype(){
 const state=visionSession;
 if(!state)return;
 state.direction=visionDirections[Math.floor(Math.random()*4)];
 const value=visionLevels[state.level],size=visionOptotypePixels(value,state.distanceCm,state.calibrationPx);
 const rotations={right:0,down:90,left:180,up:270};
 modalBody.innerHTML='<span class="tag">E 字视力自测 · '+(state.eye==='left'?'左眼':'右眼')+'</span><h2>'+(state.eye==='left'?'遮住右眼，用左眼看':'遮住左眼，用右眼看')+'</h2>'+
 '<p class="vision-hint">保持 '+state.distanceCm/100+' 米距离 · '+escapeHtml(state.correction)+' · 当前级别 '+value.toFixed(1)+' · 第 '+(state.trial+1)+' / 3 次</p>'+
 '<div class="vision-optotype-stage"><svg width="'+size.toFixed(2)+'" height="'+size.toFixed(2)+'" viewBox="0 0 5 5" aria-label="请辨认视标开口方向" role="img"><g transform="rotate('+rotations[state.direction]+' 2.5 2.5)"><path d="M0 0H5V1H1V2H5V3H1V4H5V5H0Z" fill="#111"/></g></svg></div>'+
 '<p class="vision-hint vision-center">E 字的开口朝向哪里？</p><div class="vision-directions"><button data-direction="up" aria-label="向上">↑</button><button data-direction="left" aria-label="向左">←</button><button data-direction="down" aria-label="向下">↓</button><button data-direction="right" aria-label="向右">→</button></div><button class="vision-secondary" id="visionUnsure">看不清 / 不确定</button>';
 document.querySelectorAll('[data-direction]').forEach(button=>button.onclick=()=>answerOptotype(button.dataset.direction));
 q('#visionUnsure').onclick=()=>answerOptotype(null);
}
function answerOptotype(direction){
 const state=visionSession;
 if(!state||state.kind!=='acuity'||state.result)return;
 if(direction===state.direction)state.correct++;
 state.trial++;
 if(state.trial<3){showOptotype();return}
 const passed=state.correct>=2;
 if(passed)state.lastPassed=visionLevels[state.level];
 if(passed&&state.level<visionLevels.length-1){
  state.level++;state.correct=0;state.trial=0;showOptotype();return;
 }
 state[state.eye]=state.lastPassed;
 if(state.eye==='left'){
  modalBody.innerHTML='<span class="tag">左眼已完成</span><h2>休息一下，接着测右眼</h2><p>遮住左眼，用右眼看屏幕。继续保持 '+state.distanceCm/100+' 米距离和相同测试方式。</p><button class="primary" id="visionNextEye">开始测右眼</button>';
  q('#visionNextEye').onclick=()=>{state.eye='right';state.level=0;state.trial=0;state.correct=0;state.lastPassed=0;showOptotype()};
 }else{
  state.result={kind:'acuity',left:state.left,right:state.right,distanceCm:state.distanceCm,calibrationPx:state.calibrationPx,correction:state.correction,date:todayKey()};
  showVisionResult();
 }
}
function astigmatismChart(){
 let lines='';
 for(let angle=0;angle<180;angle+=15){
  const rad=angle*Math.PI/180,dx=Math.cos(rad)*112,dy=Math.sin(rad)*112;
  lines+='<line x1="'+(140-dx).toFixed(2)+'" y1="'+(140-dy).toFixed(2)+'" x2="'+(140+dx).toFixed(2)+'" y2="'+(140+dy).toFixed(2)+'"/>';
 }
 return '<svg viewBox="0 0 280 280" class="vision-radial" role="img" aria-label="等粗等深的放射状观察线">'+
 '<circle cx="140" cy="140" r="128" fill="none" stroke="#ddd"/><g stroke="#111" stroke-width="2">'+lines+'</g><circle cx="140" cy="140" r="4" fill="#111"/></svg>';
}
function showAstigmatism(){
 modalBody.innerHTML='<span class="tag">主观观察 · 不测散光度数</span><h2>散光线条观察</h2><p class="vision-hint">在舒适阅读距离分别遮盖一只眼，注视中心，比较各方向线条。保持原有眼镜状态；不要眯眼或压迫眼球。</p>'+
 '<div class="vision-observation-stage">'+astigmatismChart()+'</div><form id="astigmatismForm" class="form-grid">'+
 ['left','right'].map(eye=>'<div class="field"><label for="astigmatism-'+eye+'">'+(eye==='left'?'左眼':'右眼')+'感受</label><select id="astigmatism-'+eye+'" name="'+eye+'" required><option value="">请选择观察感受</option><option value="均匀">各方向大致均匀</option><option value="不均匀">部分方向更深或更模糊</option><option value="不确定">不确定</option></select></div>').join('')+
 '<p class="vision-hint span-2">屏幕反光、泪膜、屈光状态都会影响观察。线条不均匀不等于确诊散光，请结合专业验光检查。</p><button class="primary span-2">完成观察，查看记录</button></form>';
 q('#astigmatismForm').onsubmit=e=>{
  e.preventDefault();if(!visionSession)return;
  const left=q('#astigmatism-left').value,right=q('#astigmatism-right').value;
  if(!left||!right)return;
  visionSession.result={kind:'astigmatism',left,right,date:todayKey()};showVisionResult();
 };
}
const visionColorSets=[
 ['#d86e75','#5b8f78','#6381b0'],['#cd9254','#9c6db1','#5e9999'],
 ['#6a9a75','#b47a6d','#7687b6'],['#ab7eae','#6c9c9c','#c49a5a'],
 ['#698bad','#a6a565','#bf7c8a'],['#c28765','#758fb6','#90a077']
];
function shuffleVision(values){const result=[...values];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result}
function showColorIntro(){
 modalBody.innerHTML='<span class="tag">颜色辨别 · 六次匹配</span><h2>找出相同的颜色</h2><p>观察上方目标色块，从下方三个选项中选择相同的颜色。</p><p class="vision-hint">请关闭护眼滤色、夜间模式和有色镜片。普通屏幕未经色彩校准，此练习不是石原色盲检查，也不能判断色盲或色弱。</p><button class="primary" id="visionColorBegin">了解，开始练习</button>';
 q('#visionColorBegin').onclick=()=>{visionSession.round=0;visionSession.correct=0;showColorQuestion()};
}
function showColorQuestion(){
 const state=visionSession,colors=visionColorSets[state.round];
 state.target=colors[Math.floor(Math.random()*colors.length)];
 modalBody.innerHTML='<span class="tag">颜色辨别练习 · '+(state.round+1)+' / 6</span><h2>哪一块与目标颜色相同？</h2><div class="vision-target" style="background:'+state.target+'" role="img" aria-label="目标色块"></div><div class="vision-color-choices">'+
 shuffleVision(colors).map((color,index)=>'<button style="--swatch:'+color+'" data-color="'+color+'" aria-label="颜色选项 '+(index+1)+'"><span></span><small>选项 '+(index+1)+'</small></button>').join('')+'</div><button class="vision-secondary" id="visionColorUnsure">无法分辨</button>';
 document.querySelectorAll('[data-color]').forEach(button=>button.onclick=()=>answerColor(button.dataset.color));
 q('#visionColorUnsure').onclick=()=>answerColor(null);
}
function answerColor(color){
 const state=visionSession;if(!state||state.kind!=='color'||state.result)return;
 if(color===state.target)state.correct++;
 state.round++;
 if(state.round<6){showColorQuestion();return}
 state.result={kind:'color',correct:state.correct,total:6,date:todayKey()};showVisionResult();
}
function showVisionResult(){
 const result=visionSession.result;
 const detail=result.kind==='acuity'
  ?'<div class="vision-results"><div><small>左眼参考值</small><b>'+visionValue(result.left)+'</b></div><div><small>右眼参考值</small><b>'+visionValue(result.right)+'</b></div></div><p class="vision-hint">'+result.correction+' · '+result.distanceCm/100+' 米 · 最高通过级别为网页参考小数视力，不能换算为近视度数或用于配镜。</p>'
  :result.kind==='astigmatism'
   ?'<div class="vision-results"><div><small>左眼观察</small><b>'+escapeHtml(result.left)+'</b></div><div><small>右眼观察</small><b>'+escapeHtml(result.right)+'</b></div></div><p class="vision-hint">这是个人主观感受。如持续出现线条深浅不一或重影，建议进行眼科或验光检查。</p>'
   :'<div class="vision-results"><div><small>本次匹配正确</small><b>'+result.correct+' / 6</b></div></div><p class="vision-hint">结果仅反映本次练习表现。即使全部答对，也不能据此排除色觉异常。</p>';
 modalBody.innerHTML='<span class="tag">本次体验已完成</span><h2>'+visionNames[result.kind]+'结果</h2>'+detail+'<button class="primary" id="visionSaveResult">保存到我的记录</button><p class="vision-hint">登录后保存；可在本页记录列表中删除。</p>';
 q('#visionSaveResult').onclick=saveVisionResult;
}
async function saveVisionResult(){
 if(!ready||saving||!visionSession?.result)return;
 const state=visionSession;
 if(!user||!state.identity){showLoginPrompt();return}
 if(state.epoch!==generation||String(user.id)!==state.identity){notify('账号状态已变化，请重新测试');return}
 const candidate=clone(data);candidate.vision=candidate.vision||[];candidate.vision.unshift(clone(state.result));
 const button=q('#visionSaveResult');button.disabled=true;button.textContent='正在保存…';saving=true;
 try{
  const result=await persist(candidate,state.identity,state.version);
  if(state.epoch!==generation||String(user?.id)!==state.identity)return;
  data={...emptyData(),...result.data};revision=result.revision;resetVision();modal.hidden=true;render();notify('视力记录已保存到当前账号');
 }catch(error){notify(error.message||'保存失败，请重试')}
 finally{saving=false;button.disabled=false;button.textContent='保存到我的记录'}
}
