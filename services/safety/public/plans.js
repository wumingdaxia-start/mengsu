let planDraft=null;
function planTitle(kind){return kind==='exercise'?'锻炼':'饮食'}
function planSection(kind){
 const plan=data[kind+'Plan'];
 const heading='<div class="section-head"><div><h2>制定'+planTitle(kind)+'计划</h2><p>'+(kind==='exercise'?'按目标、基础和器械安排未来一周训练':'根据身体信息估算营养目标，安排一日三餐与加餐')+'</p></div><button type="button" class="primary" data-plan-new="'+kind+'">'+(plan?'重新制定':'＋ 制定计划')+'</button></div>';
 if(!plan)return heading+'<article class="card plan-empty"><span class="plan-symbol">'+(kind==='exercise'?'↗':'♧')+'</span><div><h3>暂无'+planTitle(kind)+'计划</h3><p>填写需求后生成可修改的计划，登录后保存到自己的账号。</p></div></article>';
 const s=plan.settings,totals=kind==='diet'?plan.items.reduce((n,x)=>({calories:n.calories+x.calories,protein:n.protein+x.protein}),{calories:0,protein:0}):null;
 return heading+'<article class="card saved-plan"><div class="plan-top"><div><span class="plan-eyebrow">MY '+(kind==='exercise'?'WORKOUT WEEK':'DAILY MEALS')+'</span><h3>'+escapeHtml(s.goal)+' · '+(kind==='exercise'?s.days+' 天 / 周':escapeHtml(s.preference))+'</h3><p>'+escapeHtml(plan.createdDate)+' 制定 · 当前账号已保存</p></div><div class="plan-buttons"><button type="button" class="plan-secondary" data-plan-edit="'+kind+'">修改计划</button><button type="button" class="delete-record" data-plan-remove="'+kind+'">删除计划</button></div></div>'+
 (totals?'<div class="plan-targets"><span>每日热量目标 <b>'+plan.targets.calories+' kcal</b></span><span>蛋白质目标 <b>'+plan.targets.protein+' g</b></span><span>食谱估算合计 <b>'+Math.round(totals.calories)+' kcal / '+Math.round(totals.protein)+' g 蛋白质</b></span></div>':'')+
 '<div class="plan-rows">'+plan.items.map(row=>'<div class="plan-row"><b>'+escapeHtml(row.label)+'</b><p>'+escapeHtml(row.content)+'</p><small>'+(kind==='exercise'?(row.minutes?row.minutes+' 分钟':'恢复日'):row.calories+' kcal · 蛋白质 '+row.protein+' g')+'</small></div>').join('')+'</div>'+
 (kind==='diet'?'<p class="plan-note">已排除：'+escapeHtml(s.exclusions.join('、')||'无指定类别')+'。'+(s.notes?'其他忌口备忘：'+escapeHtml(s.notes)+'。请自行核对食材。':'')+'</p>':'')+
 '<p class="plan-note">计划不计入已完成记录；实际完成后，请在上方记录。'+(kind==='diet'?'食谱营养为估算值，可调整食材和分量。':'每次按身体感受调整，避免勉强训练。')+'</p></article>';
}
function bindPlans(){
 document.querySelectorAll('[data-plan-new]').forEach(b=>b.onclick=()=>openPlan(b.dataset.planNew));
 document.querySelectorAll('[data-plan-edit]').forEach(b=>b.onclick=()=>editPlan(b.dataset.planEdit));
 document.querySelectorAll('[data-plan-remove]').forEach(b=>b.onclick=()=>removePlan(b.dataset.planRemove));
}
function planOptions(values,current){return '<option value="">请选择</option>'+values.map(x=>'<option value="'+escapeHtml(x)+'"'+(x===current?' selected':'')+'>'+escapeHtml(x)+'</option>').join('')}
function planField(label,name,options,value){return '<label class="field"><span>'+label+'</span>'+(Array.isArray(options)?'<select name="'+name+'" required>'+planOptions(options,value)+'</select>':'<input name="'+name+'" '+options+' value="'+escapeHtml(value??'')+'" required>')+'</label>'}
function openPlan(kind){
 if(!ready||saving||!['exercise','diet'].includes(kind))return;
 planDraft=null;const old=data[kind+'Plan']?.settings||{},p=user?data.profile||{}:{};
 modalBody.innerHTML='<div class="plan-dialog"><span class="plan-eyebrow">PERSONAL PLAN</span><h2>制定'+planTitle(kind)+'计划</h2><p>按填写的信息生成参考方案，生成后可逐项修改。</p><form id="planSetup" class="plan-form">'+
 planField('目标','goal',['减脂','增肌','保持健康'],old.goal||({'控制体重':'减脂','保持状态':'保持健康'}[p.healthGoal]))+
 (kind==='exercise'?
 planField('训练基础','level',['初学','有基础'],old.level)+planField('可用器械','equipment',['徒手','哑铃'],old.equipment)+planField('每周训练天数','days','type="number" min="1" max="5" step="1"',old.days)+planField('每次时长（分钟）','minutes','type="number" min="20" max="90" step="1"',old.minutes)+planField('开始日期','startDate','type="date"',old.startDate):
 planField('代谢公式性别参数','sex',['男','女'],old.sex||p.gender)+planField('年龄（18–75 岁）','age','type="number" min="18" max="75" step="1"',old.age??profileAge(p.birthDate))+planField('身高（厘米）','height','type="number" min="140" max="210" step="0.1"',old.height??p.heightCm)+planField('体重（千克）','weight','type="number" min="40" max="200" step="0.1"',old.weight??p.weightKg)+planField('日常活动水平','activity',['久坐为主','轻度活动','中等活动','高强度活动'],old.activity||p.activityLevel)+planField('饮食方式','preference',['均衡饮食','蛋奶素'],old.preference)+
 '<fieldset class="plan-exclusions"><legend>需要排除的食材类别</legend>'+HealthPlans.exclusions.map(x=>'<label><input name="exclusions" type="checkbox" value="'+x+'"'+(old.exclusions?.includes(x)?' checked':'')+'>'+x+'</label>').join('')+'</fieldset><label class="field span-2"><span>其他忌口备忘（需自行核对食材）</span><textarea name="notes" maxlength="300" rows="2">'+escapeHtml(old.notes??p.allergies??'')+'</textarea></label>')+
 '<p class="plan-note span-2">'+(kind==='diet'?'采用基础代谢与活动系数估算，仅适用于一般健康成年人。孕哺期、疾病或特殊营养需求请咨询专业人员；请核对过敏原与食品标签。':'计划包含热身、训练和恢复日；如有伤病，请先确认适合的动作。')+'</p><button class="primary span-2" type="submit">生成参考计划</button></form></div>';
 modal.hidden=false;const form=q('#planSetup'),epoch=generation;
 form.onsubmit=event=>{
  event.preventDefault();if(!ready||saving||epoch!==generation)return;
  const f=new FormData(form),s={goal:f.get('goal')};
  if(kind==='exercise')Object.assign(s,{level:f.get('level'),equipment:f.get('equipment'),days:Number(f.get('days')),minutes:Number(f.get('minutes')),startDate:f.get('startDate')});
  else Object.assign(s,{sex:f.get('sex'),age:Number(f.get('age')),height:Number(f.get('height')),weight:Number(f.get('weight')),activity:f.get('activity'),preference:f.get('preference'),exclusions:f.getAll('exclusions'),notes:String(f.get('notes')||'')});
  try{planDraft=HealthPlans[kind](s,todayKey());showPlanEditor(kind)}catch(error){notify(error.message)}
 };
}
function editPlan(kind){if(!ready||saving||!data[kind+'Plan'])return;planDraft=clone(data[kind+'Plan']);showPlanEditor(kind)}
function showPlanEditor(kind){
 const plan=planDraft,identity=user?String(user.id):null,version=revision,epoch=generation;
 modalBody.innerHTML='<div class="plan-dialog"><span class="plan-eyebrow">REVIEW & SAVE</span><h2>确认'+planTitle(kind)+'计划</h2><p>可修改每项内容，再保存到当前账号。</p>'+
 (kind==='diet'?'<div class="plan-targets"><span>基础代谢 <b>'+plan.targets.bmr+' kcal</b></span><span>每日消耗估算 <b>'+plan.targets.tdee+' kcal</b></span><span>热量目标 <b>'+plan.targets.calories+' kcal</b></span><span>营养目标 <b>蛋白质 '+plan.targets.protein+' g / 脂肪 '+plan.targets.fat+' g / 碳水 '+plan.targets.carbs+' g</b></span></div>':'')+
 '<form id="planEditor"><div class="plan-editor-rows">'+plan.items.map((row,i)=>'<fieldset><legend>'+escapeHtml(row.label)+'</legend><label class="field"><span>'+(kind==='exercise'?'训练安排':'食材与分量')+'</span><textarea name="content'+i+'" required maxlength="1200" rows="3">'+escapeHtml(row.content)+'</textarea></label><div class="plan-numbers">'+(kind==='exercise'?planField('时长（分钟，恢复日填 0）','minutes'+i,'type="number" min="0" max="180"',row.minutes):planField('本餐热量估算（kcal）','calories'+i,'type="number" min="0" max="5000" step="0.1"',row.calories)+planField('本餐蛋白质估算（g）','protein'+i,'type="number" min="0" max="500" step="0.1"',row.protein))+'</div></fieldset>').join('')+'</div><p class="plan-note">'+(kind==='diet'?'更换食材后请同步修改营养估算。食谱合计与营养目标可能存在差异。':'计划仅作日常参考，出现不适请停止训练。')+'</p><button type="submit" class="primary plan-save">保存'+planTitle(kind)+'计划</button></form></div>';
 modal.hidden=false;const form=q('#planEditor');form.noValidate=!identity;
 form.onsubmit=async event=>{
  event.preventDefault();if(!ready||saving||epoch!==generation)return;
  if(!identity){showLoginPrompt();return}
  const f=new FormData(form),updated=clone(plan);
  updated.items.forEach((row,i)=>{row.content=String(f.get('content'+i)||'').trim();for(const key of kind==='exercise'?['minutes']:['calories','protein'])row[key]=Number(f.get(key+i))});
  try{HealthPlans.validatePlan(updated,kind)}catch(error){notify(error.message);return}
  const candidate=clone(data);candidate[kind+'Plan']=updated;const button=form.querySelector('button[type="submit"]');saving=true;button.disabled=true;
  try{const result=await persist(candidate,identity,version);if(epoch!==generation||String(user?.id)!==identity)return;data=result.data;revision=result.revision;planDraft=null;modal.hidden=true;render();notify(planTitle(kind)+'计划已保存')}
  catch(error){notify(error.message||'保存失败，请重试')}finally{saving=false;button.disabled=false}
 };
}
async function removePlan(kind){
 if(!ready||saving||!['exercise','diet'].includes(kind)||!data[kind+'Plan'])return;
 if(!user){showLoginPrompt();return}if(!confirm('确定删除'+planTitle(kind)+'计划吗？已完成的记录会保留。'))return;
 const identity=String(user.id),epoch=generation,version=revision,candidate=clone(data);candidate[kind+'Plan']=null;saving=true;
 try{const result=await persist(candidate,identity,version);if(epoch!==generation||String(user?.id)!==identity)return;data=result.data;revision=result.revision;render();notify('计划已删除')}
 catch(error){notify(error.message||'删除失败，请重试')}finally{saving=false}
}
