let knowledgeOwner='',knowledgeQuery='',knowledgeSources=[],knowledgeAnswer=null,knowledgeError='',knowledgeLoading='',knowledgeConsent=false,knowledgeSearched=false;

function syncKnowledgeIdentity(){
 const identity=String(user?.id||'');
 if(identity!==knowledgeOwner){knowledgeOwner=identity;knowledgeQuery='';knowledgeSources=[];knowledgeAnswer=null;knowledgeError='';knowledgeLoading='';knowledgeConsent=false;knowledgeSearched=false}
}

function knowledge(){
 const sourceCards=knowledgeSources.map((item,index)=>'<article class="knowledge-source"><div><span>资料 '+(index+1)+'</span><b>'+escapeHtml(item.organization)+'</b></div><h3>'+escapeHtml(item.title)+'</h3><p>'+escapeHtml(item.excerpt)+'</p><a href="'+escapeHtml(item.url)+'" target="_blank" rel="noopener noreferrer">查看官方原文 ↗</a></article>').join('');
 const results=knowledgeSearched?'<div class="knowledge-results" id="knowledgeResults"><div class="section-head"><h2>检索到的资料</h2><p>'+knowledgeSources.length+' 条相关内容 · 本地资料库</p></div>'+(knowledgeSources.length?'<div class="knowledge-source-grid">'+sourceCards+'</div>':'<div class="card empty-state">当前资料库没有找到相关内容。可尝试运动、饮食、糖盐摄入或睡眠等关键词。</div>')+'</div>':'';
 const answer=knowledgeAnswer?'<article class="card knowledge-answer"><div class="knowledge-answer-head"><span>AI · 基于检索资料</span><small>不会读取你的个人健康档案</small></div><h2>参考回答</h2><p>'+escapeHtml(knowledgeAnswer.answer).replace(/\n/g,'<br>')+'</p>'+(knowledgeAnswer.notice?'<small>'+escapeHtml(knowledgeAnswer.notice)+'</small>':'')+'</article>':'';
 return '<div class="knowledge-hero"><span class="tag">SOURCE-GROUNDED AI</span><h2>健康知识检索</h2><p>先从可追溯的资料中检索，再让 AI 根据检索片段回答一般健康问题。当前收录身体活动、健康饮食和睡眠的基础知识。</p></div><section class="card knowledge-search-card"><form id="knowledgeForm"><label for="knowledgeInput">你想了解什么健康知识？</label><div class="knowledge-search-row"><input id="knowledgeInput" maxlength="200" value="'+escapeHtml(knowledgeQuery)+'" placeholder="例如：成年人每天需要睡多久？" autocomplete="off"><button class="primary" type="submit" '+(knowledgeLoading?'disabled':'')+'>'+(knowledgeLoading==='search'?'检索中…':'检索资料')+'</button></div></form><div class="knowledge-examples"><span>试试：</span><button type="button" data-knowledge-example="每周应该运动多久？">每周运动</button><button type="button" data-knowledge-example="如何减少游离糖摄入？">减少糖摄入</button><button type="button" data-knowledge-example="成年人每天需要睡多久？">睡眠时长</button></div><label class="knowledge-consent"><input id="knowledgeConsent" type="checkbox" '+(knowledgeConsent?'checked':'')+' '+(knowledgeLoading?'disabled':'')+'><span>我同意将本次问题和检索到的资料片段发送给外部 AI 服务；不发送我的个人档案或健康记录</span></label><div class="knowledge-actions"><button class="primary" id="knowledgeAsk" type="button" '+(!knowledgeConsent||knowledgeLoading?'disabled':'')+'>'+(knowledgeLoading==='answer'?'AI 正在组织回答…':'让 AI 依据资料回答')+'</button>'+(!user?'<small>登录后可使用 AI 回答；资料检索无需登录</small>':'')+'</div>'+(knowledgeError?'<p class="knowledge-error" role="alert">'+escapeHtml(knowledgeError)+'</p>':'')+'</section>'+answer+results;
}

function bindKnowledge(){
 const form=q('#knowledgeForm'),input=q('#knowledgeInput'),ask=q('#knowledgeAsk'),consent=q('#knowledgeConsent');
 if(!form||!input||!ask)return;
 const clearShownResults=()=>{knowledgeSources=[];knowledgeAnswer=null;knowledgeSearched=false;const results=q('#knowledgeResults'),answer=q('.knowledge-answer');if(results)results.hidden=true;if(answer)answer.hidden=true};
 input.oninput=()=>{if(input.value!==knowledgeQuery)clearShownResults();knowledgeQuery=input.value;knowledgeError=''};
 if(consent)consent.onchange=()=>{knowledgeConsent=consent.checked;ask.disabled=!knowledgeConsent||!!knowledgeLoading};
 document.querySelectorAll('[data-knowledge-example]').forEach(button=>button.onclick=()=>{clearShownResults();knowledgeQuery=button.dataset.knowledgeExample;input.value=knowledgeQuery;input.focus()});
 form.onsubmit=async event=>{
  event.preventDefault();if(knowledgeLoading)return;
  const query=input.value.trim();knowledgeQuery=query;
  if(query.length<2||query.length>200){notify('请输入 2～200 字的问题');return}
  const epoch=generation;knowledgeLoading='search';knowledgeError='';knowledgeAnswer=null;knowledgeSearched=true;render();
  try{const response=await fetch('/api/health-knowledge/search?query='+encodeURIComponent(query),{cache:'no-store'});const result=await response.json();if(epoch!==generation)return;if(!response.ok)throw Error(result.message||'资料检索失败');knowledgeSources=result.sources||[]}
  catch(error){if(epoch===generation)knowledgeError=error.message||'资料检索失败'}
  finally{if(epoch===generation){knowledgeLoading='';if(location.hash==='#knowledge')render()}}
 };
 ask.onclick=async()=>{
  if(knowledgeLoading)return;
  if(!user){showLoginPrompt();return}
  if(!knowledgeConsent){notify('请先同意本次 AI 请求');return}
  const question=input.value.trim();knowledgeQuery=question;
  if(question.length<2||question.length>200){notify('请输入 2～200 字的问题');return}
  const identity=String(user.id),epoch=generation;knowledgeLoading='answer';knowledgeError='';knowledgeAnswer=null;knowledgeSearched=true;render();
  try{const response=await fetch('/api/health-knowledge/answer',{method:'POST',headers:{'Content-Type':'application/json','X-Health-User':identity},body:JSON.stringify({question,consent:true})});const result=await response.json();if(epoch!==generation||String(user?.id)!==identity)return;if(!response.ok)throw Error(result.message||'AI 回答暂时不可用');knowledgeAnswer=result;knowledgeSources=result.sources||[]}
  catch(error){if(epoch===generation&&String(user?.id)===identity)knowledgeError=error.message||'AI 回答暂时不可用'}
  finally{if(epoch===generation&&String(user?.id)===identity){knowledgeLoading='';if(location.hash==='#knowledge')render()}}
 };
}
