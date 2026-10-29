let consultMessages=[],consultAvailable=false,consultLoading=false,consultDraft='';
const consultEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function resetConsult(){consultMessages=[];consultLoading=false;consultDraft=''}
function consult(){
 const messages=consultMessages.length?consultMessages.map(item=>'<div class="consult-message '+(item.role==='user'?'mine':'assistant')+(item.urgent?' urgent':'')+'"><div class="consult-avatar">'+(item.role==='user'?'我':'AI')+'</div><div class="consult-bubble"><span>'+(item.role==='user'?'我的提问':'健康信息助手')+'</span><p>'+consultEsc(item.content).split('\n').join('<br>')+'</p></div></div>').join(''):'<div class="consult-empty"><span>✧</span><h2>从一个健康问题开始</h2><p>描述不适持续多久、严重程度、伴随症状，以及你关心的问题。不会自动读取个人档案。</p></div>';
 return '<div class="consult-layout"><section class="consult-panel"><header><div><small>AI HEALTH ASSISTANT</small><h2>健康问诊对话</h2></div><button id="consultClear" type="button" '+(!user||!consultMessages.length||consultLoading?'disabled':'')+'>清空对话</button></header><div class="consult-thread" id="consultThread" aria-live="polite">'+messages+'</div><form id="consultForm" class="consult-compose"><label for="consultInput">描述你想了解的健康问题</label><textarea id="consultInput" maxlength="1500" rows="3" placeholder="例如：最近三天睡眠不足，白天容易疲劳，想知道应该观察哪些情况？" '+(consultLoading?'disabled':'')+'>'+consultEsc(consultDraft)+'</textarea><div>'+(!user?'<small id="consultStatus">登录后可对话并按账号保存</small>':consultLoading?'<small id="consultStatus">正在获取回复…</small>':consultAvailable?'':'<small id="consultStatus">尚未配置 AI 模型；普通对话暂不可用，急症提醒仍可使用</small>')+'<button class="primary" type="submit" '+(consultLoading?'disabled':'')+'>发送问题 →</button></div></form></section><aside class="consult-aside"><h3>怎样描述更清楚</h3><ul><li>说清主要不适和开始时间</li><li>补充严重程度与伴随表现</li><li>列出你想询问的具体问题</li></ul><div class="consult-note"><b>隐私提醒</b><p>不要填写身份证号、手机号或住址。对话按账号保存在本站；配置外部 AI 时，提问和近期对话会发给该服务。清空后无法找回。</p></div><div class="consult-note"><b>就医提醒</b><p>AI 不代替线下检查。症状加重、持续不缓解或涉及孕产妇、儿童等情况，请联系专业医护人员。</p></div></aside></div>';
}
function bindConsult(){
 const form=q('#consultForm');if(!form)return;
 q('#consultInput').oninput=event=>{consultDraft=event.target.value};
 form.onsubmit=async event=>{
  event.preventDefault();if(consultLoading)return;
  if(!user){showLoginPrompt();return}
  const message=q('#consultInput').value.trim();consultDraft=message;if(!message){notify('请先描述健康问题');return}
  if(message.length>1500){notify('最多输入 1500 字');return}
  const identity=String(user.id),epoch=generation;
  consultLoading=true;render();
  try{
   const response=await fetch('/api/consult',{method:'POST',headers:{'Content-Type':'application/json','X-Health-User':identity},body:JSON.stringify({message})});
   const result=await response.json();if(epoch!==generation||String(user?.id)!==identity)return;
   if(!response.ok)throw Error(result.message||'问诊暂时不可用');
   consultMessages=result.messages;consultDraft='';
  }catch(error){notify(error.message||'请稍后再试')}finally{consultLoading=false;if(epoch===generation&&location.hash==='#consult'){render();const thread=q('#consultThread');if(thread)thread.scrollTop=thread.scrollHeight}}
 };
 q('#consultClear').onclick=async()=>{
  if(!user||consultLoading||!confirm('确定清空当前账号的全部问诊对话吗？此操作无法撤销。'))return;
  const identity=String(user.id),epoch=generation;consultLoading=true;
  try{const response=await fetch('/api/consult/clear',{method:'DELETE',headers:{'X-Health-User':identity}});const result=await response.json();if(!response.ok)throw Error(result.message);if(epoch!==generation||String(user?.id)!==identity)return;consultMessages=[];notify('问诊对话已清空')}
  catch(error){notify(error.message||'清空失败')}finally{consultLoading=false;if(epoch===generation&&location.hash==='#consult')render()}
 };
}
async function loadConsult(){
 const identity=user?String(user.id):null,epoch=generation;
 consultMessages=[];consultAvailable=false;
 if(location.hash==='#consult')render();
 try{const status=await fetch('/api/consult/status',{cache:'no-store'});if(status.ok)consultAvailable=!!(await status.json()).available;
  if(identity){const response=await fetch('/api/consult',{cache:'no-store',headers:{'X-Health-User':identity}});if(response.ok){const result=await response.json();if(epoch===generation&&String(user?.id)===identity)consultMessages=result.messages||[]}}
 }catch{}
 if(epoch===generation&&location.hash==='#consult')render();
}
