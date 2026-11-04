function exerciseDetails(x){return [x.intensity?x.intensity+'强度':'',x.feeling?'感受：'+x.feeling:'',x.sets?x.sets+'组':'',x.reps?'每组'+x.reps+'次':'',x.note||''].filter(Boolean).map(escapeHtml).join(' · ')}
function exerciseFeedback(){
 const recent=data.exercise.filter(x=>x.date&&x.date<=todayKey()).slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
 if(recent.some(x=>x.feeling==='有不适'))return {reduce:true,message:'最近记录了运动不适。先暂停引起不适的动作，确认身体情况后再安排训练；新计划会减少时长，仍需自行核对动作。'};
 const recentChecks=(data.exerciseCheckins||[]).filter(x=>x.date<=todayKey()).slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
 if(recentChecks.filter(x=>x.status==='partial').length>=2)return {reduce:true,message:'最近多次只完成了部分训练，下次制定计划会建议缩短时长，你仍可以按当前情况调整。'};
 if(recent.filter(x=>x.feeling==='太累').length>=2)return {reduce:true,message:'最近多次反馈太累，建议下次计划减少时长，留出恢复日。'};
 return {reduce:false,message:recent.length?'最近运动感受会作为下一次制定计划的参考。请按当前体力选择训练时长。':'记录运动和感受后，制定计划时可参考你的反馈。'};
}
function exerciseOverview(){
 const start=new Date(todayKey()+'T12:00:00');start.setDate(start.getDate()-(start.getDay()+6)%7);
 const key=[start.getFullYear(),String(start.getMonth()+1).padStart(2,'0'),String(start.getDate()).padStart(2,'0')].join('-');
 const days=new Set(data.exercise.filter(x=>x.date>=key&&x.date<=todayKey()).map(x=>x.date)).size;
 const plan=data.exercisePlan,elapsed=plan?.items.filter(x=>x.label<=todayKey()&&x.minutes>0)||[],done=elapsed.filter(x=>(data.exerciseCheckins||[]).some(c=>c.date===x.label&&c.status==='completed')).length;
 return '<article class="card exercise-overview"><h2>运动完成情况</h2><p>'+(!user?'登录后查看自己的运动记录':daily(data.exercise).length?'今天已运动 '+sum(daily(data.exercise),'minutes')+' 分钟':'今天还没有运动记录，可以记录运动或为计划打卡')+'</p><div class="exercise-summary"><span>本周运动 <b>'+(user?days:'—')+'</b> 天</span><span>已到期训练 <b>'+(user&&plan?done+' / '+elapsed.length:'—')+'</b> 完成</span><a href="#exercise">查看日常锻炼 →</a></div></article>';
}
function exerciseCheckButtons(row){return row.label>todayKey()?'':(row.minutes?'<button type="button" class="plan-secondary" data-exercise-check="completed" data-date="'+row.label+'">完成</button><button type="button" class="plan-secondary" data-exercise-check="partial" data-date="'+row.label+'">部分完成</button>':'')+'<button type="button" class="plan-secondary" data-exercise-check="rest" data-date="'+row.label+'">今天休息</button>'}
function exerciseToday(){
 const row=data.exercisePlan?.items.find(x=>x.label===todayKey()),check=(data.exerciseCheckins||[]).find(x=>x.date===todayKey());
 return '<article class="card exercise-today"><span class="plan-eyebrow">TODAY</span><h2>今日锻炼安排</h2><p>'+(row?escapeHtml(row.content):'还没有覆盖今天的计划。你可以先记录运动，也可以在下方制定一周计划。')+'</p>'+(row?'<div class="exercise-checkin"><span>'+(check?({'completed':'已完成','partial':'部分完成','rest':'今天休息'}[check.status]):row.minutes?row.minutes+' 分钟 · 待打卡':'恢复日')+'</span>'+exerciseCheckButtons(row)+'</div>':'')+'<div class="guide-actions"><button type="button" class="plan-secondary" id="exerciseGuideToday">查看动作</button><button type="button" class="plan-secondary" id="exerciseFollowToday">开始新手跟练</button></div><p class="plan-note">'+escapeHtml(exerciseFeedback().message)+'</p></article>';
}
function bindExercise(){document.querySelectorAll('[data-exercise-check]').forEach(b=>b.onclick=()=>{const row=data.exercisePlan?.items.find(x=>x.label===b.dataset.date);if(!row||!ready||saving)return;if(!user){showLoginPrompt();return}if(b.dataset.exerciseCheck==='rest')saveExerciseCheck(row,'rest');else openExerciseRecord(row,b.dataset.exerciseCheck)})}
function openExerciseRecord(row=null,status=''){
 if(!ready||saving)return;if(!user){showLoginPrompt();return}
 const field=(label,name,attrs)=>'<label class="field"><span>'+label+'</span><input name="'+name+'" '+attrs+'></label>';
 modalBody.innerHTML='<h2>'+(row?'计划打卡':'记录日常锻炼')+'</h2><form id="exerciseRecordForm" class="form-grid">'+
 field('运动日期','date','type="date" required max="'+todayKey()+'" value="'+(row?.label||todayKey())+'" '+(row?'readonly':''))+
 field('运动项目','name','list="exerciseNames" maxlength="80" required value="'+(row?'今日计划训练':'')+'"')+'<datalist id="exerciseNames"><option>快走</option><option>慢跑</option><option>骑行</option><option>游泳</option><option>力量训练</option><option>肩颈拉伸</option></datalist>'+
 field('实际运动时长（分钟）','minutes','type="number" min="1" max="1440" step="1" required value="'+(row?(status==='partial'?Math.max(1,Math.round(row.minutes/2)):row.minutes):'')+'"')+
 '<label class="field"><span>运动强度</span><select name="intensity"><option>轻松</option><option selected>适中</option><option>较高</option></select></label><label class="field"><span>运动后感受</span><select name="feeling"><option>轻松</option><option selected>适中</option><option>太累</option><option>有不适</option></select></label>'+
 field('消耗热量（kcal，可不填）','calories','type="number" min="0" max="20000" step="0.1" placeholder="未估算"')+field('力量训练组数（可选）','sets','type="number" min="1" max="100" step="1"')+field('每组次数（可选）','reps','type="number" min="1" max="1000" step="1"')+
 '<label class="field span-2"><span>感受与备注（可选）</span><textarea name="note" maxlength="300" rows="2"></textarea></label><p class="plan-note span-2">只记录实际完成的运动。出现异常疼痛、胸闷或眩晕时停止运动；持续不适请寻求专业帮助。</p><button type="submit" class="primary span-2">保存'+(row?'打卡':'记录')+'</button></form>';
 modal.hidden=false;const form=q('#exerciseRecordForm'),epoch=generation;
 form.onsubmit=e=>{e.preventDefault();if(epoch!==generation||saving||!ready)return;const f=new FormData(form),record={name:String(f.get('name')).trim(),date:String(f.get('date')),minutes:Number(f.get('minutes')),calories:Number(f.get('calories')||0),intensity:f.get('intensity'),feeling:f.get('feeling'),note:String(f.get('note')||'').trim()};for(const k of ['sets','reps'])if(f.get(k))record[k]=Number(f.get(k));if(!record.name||record.date>todayKey()){notify('请填写运动项目和有效日期');return}saveExerciseCheck(row,status,record,form.querySelector('button[type=submit]'));};
}
async function saveExerciseCheck(row,status,record=null,button=null){
 if(!ready||saving||!user)return;const identity=String(user.id),epoch=generation,version=revision,candidate=clone(data);
 if(row){if(status==='rest'&&candidate.exercise.some(x=>x.planDate===row.label)&&!confirm('改为休息会移除这一天由计划打卡生成的运动记录，继续吗？'))return;candidate.exerciseCheckins=(candidate.exerciseCheckins||[]).filter(x=>x.date!==row.label);candidate.exerciseCheckins.push({date:row.label,status});candidate.exercise=candidate.exercise.filter(x=>x.planDate!==row.label);if(record)record.planDate=row.label}
 if(record)candidate.exercise.unshift(record);saving=true;if(button)button.disabled=true;
 try{const result=await persist(candidate,identity,version);if(epoch!==generation||String(user?.id)!==identity)return;data=result.data;revision=result.revision;modal.hidden=true;render();notify('已保存到当前账号')}catch(e){notify(e.message||'保存失败，请重试')}finally{saving=false;if(button)button.disabled=false}
}
