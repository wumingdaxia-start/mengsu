let insightOwner='',insightResult=null,insightError='',insightLoading=false,insightConsent=false;

function syncInsightIdentity(){
 const identity=String(user?.id||'');
 if(identity!==insightOwner){insightOwner=identity;resetInsight()}
}
function resetInsight(){insightResult=null;insightError='';insightLoading=false;insightConsent=false}

function insightPanel(){
 const output=insightResult?'<div class="insight-result"><div class="insight-result-heading"><span>已生成 · '+escapeHtml(insightResult.period.startDate)+' 至 '+escapeHtml(insightResult.period.endDate)+'</span><small>仅显示在当前页面，刷新后不保留</small></div><h3>AI 习惯洞察</h3><p>'+escapeHtml(insightResult.report.summary)+'</p><h4>接下来可以尝试</h4><ol>'+insightResult.report.actions.map(action=>'<li>'+escapeHtml(action)+'</li>').join('')+'</ol><p class="insight-caution">'+escapeHtml(insightResult.report.caution)+'</p><div class="insight-evidence"><b>依据的自填记录汇总</b><ul>'+insightResult.evidence.map(item=>'<li>'+escapeHtml(item)+'</li>').join('')+'</ul></div><small>'+escapeHtml(insightResult.notice)+'</small></div>':'';
 const references=insightResult?.references?.length?'<div class="insight-references"><b>参考的官方健康资料</b><ul>'+insightResult.references.map(item=>'<li><a href="'+escapeHtml(item.url)+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(item.organization)+' · '+escapeHtml(item.title)+' ↗</a></li>').join('')+'</ul></div>':'';
 return '<section class="card insight-card"><div class="insight-header"><div><span class="tag">AI PERSONAL INSIGHT</span><h2>近 7 天健康习惯洞察</h2><p>结合本人已填写的运动、饮食和睡眠记录，生成可执行的生活习惯建议。</p></div><span class="insight-mark" aria-hidden="true">✦</span></div><div class="insight-consent"><b>发送给 AI 的内容</b><p>发送最近 7 天的汇总指标和公开健康资料片段：运动次数和时长、已记录餐次的营养合计、睡眠时长及自评分。不发送姓名、联系方式、健康备忘或原始食物文字。记录不完整时不会推断未记录的活动。</p></div>'+(user?'<label class="insight-check"><input id="insightConsent" type="checkbox" '+(insightConsent?'checked':'')+' '+(insightLoading?'disabled':'')+'><span>我同意将上述汇总指标和公开资料片段发送给已配置的外部 AI 服务，用于本次分析</span></label>':'<p class="insight-guest">游客没有个人记录，登录后才能生成。</p>')+'<div class="insight-actions"><button class="primary" id="insightGenerate" type="button" '+(user&&(!insightConsent||insightLoading)?'disabled':'')+'>'+(insightLoading?'正在分析…':user?'生成我的 AI 洞察':'登录后生成')+'</button></div>'+(insightError?'<p class="insight-error" role="alert">'+escapeHtml(insightError)+'</p>':'')+output+references+'</section>';
}

function bindInsight(){
 const checkbox=q('#insightConsent'),button=q('#insightGenerate');
 if(checkbox)checkbox.onchange=()=>{insightConsent=checkbox.checked;if(button)button.disabled=!insightConsent||insightLoading};
 if(!button)return;
 button.onclick=async()=>{
  if(!user){showLoginPrompt();return}
  if(!insightConsent||insightLoading)return;
  const identity=String(user.id),epoch=generation;
  insightLoading=true;insightError='';insightResult=null;render();
  try{
   const response=await fetch('/api/health-insight',{method:'POST',headers:{'Content-Type':'application/json','X-Health-User':identity},body:JSON.stringify({consent:true})});
   const result=await response.json();
   if(epoch!==generation||String(user?.id)!==identity)return;
   if(!response.ok)throw Error(result.message||'AI 洞察暂时不可用');
   insightResult=result;
  }catch(error){if(epoch===generation&&String(user?.id)===identity)insightError=error.message||'AI 洞察暂时不可用'}
  finally{if(epoch===generation&&String(user?.id)===identity){insightLoading=false;if(location.hash==='#analysis')render()}}
 };
}
