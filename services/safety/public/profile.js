let profileDirty=false;

function profileText(value){return value===undefined||value===null?'':escapeHtml(value)}
function profileSelected(current,value){return current===value?' selected':''}
function profileAge(birthDate){
 if(!birthDate)return null;
 const birth=new Date(birthDate+'T00:00:00'),now=new Date();
 if(Number.isNaN(birth.getTime()))return null;
 let age=now.getFullYear()-birth.getFullYear();
 if(now.getMonth()<birth.getMonth()||(now.getMonth()===birth.getMonth()&&now.getDate()<birth.getDate()))age--;
 return age>=0?age:null;
}
function profileCompletion(profile){
 const keys=['displayName','gender','birthDate','bloodType','heightCm','weightKg','activityLevel','healthGoal','allergies','emergencyContact','emergencyPhone'];
 return Math.round(keys.filter(key=>profile[key]!==undefined&&profile[key]!==null&&String(profile[key]).trim()!=='').length/keys.length*100);
}
function profile(){
 const p=data.profile||{},name=p.displayName||(user?user.name:'未填写'),age=profileAge(p.birthDate);
 const bmi=p.heightCm&&p.weightKg?(p.weightKg/Math.pow(p.heightCm/100,2)).toFixed(1):'—';
 const complete=user?profileCompletion(p):0,initial=user?name.slice(0,1):'—';
 const account=user?(user.account||user.id):'登录后显示';
 return '<section class="profile-overview">'+
  '<article class="card profile-identity"><div class="profile-avatar">'+profileText(initial)+'</div><div class="profile-intro"><span class="profile-kicker">PERSONAL HEALTH FILE</span><h2>'+profileText(name)+'</h2><p>账号：'+profileText(account)+' · '+(p.gender?profileText(p.gender):'性别未填写')+(age!==null?' · '+age+' 岁':'')+'</p></div><div class="profile-progress"><div><span>档案完整度</span><b>'+complete+'%</b></div><div class="progress"><i style="width:'+complete+'%"></i></div><small>'+(user?'完善资料有助于集中查看个人健康信息':'登录后可建立专属档案')+'</small></div></article>'+
  '<section class="profile-metrics">'+
   '<article class="card profile-metric"><span>BMI</span><b>'+bmi+'</b><small>'+(bmi==='—'?'填写身高体重后计算':'身体质量指数参考')+'</small></article>'+
   '<article class="card profile-metric"><span>身高</span><b>'+(p.heightCm?profileText(p.heightCm):'—')+'</b><small>'+(p.heightCm?'厘米':'尚未填写')+'</small></article>'+
   '<article class="card profile-metric"><span>体重</span><b>'+(p.weightKg?profileText(p.weightKg):'—')+'</b><small>'+(p.weightKg?'千克':'尚未填写')+'</small></article>'+
   '<article class="card profile-metric"><span>健康目标</span><b class="metric-text">'+(p.healthGoal?profileText(p.healthGoal):'—')+'</b><small>'+(p.healthGoal?'当前个人目标':'尚未选择')+'</small></article>'+
  '</section>'+
 '</section>'+
 '<article class="card profile-form-card"><div class="profile-form-head"><div><span class="profile-kicker">MY INFORMATION</span><h2>填写个人信息</h2><p>除登录账号外，以下内容均可修改或清空。</p></div><span class="profile-save-state">'+(data.profile?'已保存档案':'尚未保存')+'</span></div>'+
 '<form id="profileForm" class="profile-form">'+
  '<section class="profile-form-section"><div class="profile-section-title"><span>01</span><div><h3>基础信息</h3><p>用于识别和查看自己的档案</p></div></div><div class="profile-fields">'+
   '<div class="field"><label>姓名或称呼</label><input name="displayName" maxlength="50" autocomplete="name" placeholder="请输入姓名或常用称呼" value="'+profileText(p.displayName)+'"></div>'+
   '<div class="field"><label>性别</label><select name="gender"><option value="">请选择</option><option'+profileSelected(p.gender,'男')+'>男</option><option'+profileSelected(p.gender,'女')+'>女</option><option'+profileSelected(p.gender,'其他')+'>其他</option><option'+profileSelected(p.gender,'不愿透露')+'>不愿透露</option></select></div>'+
   '<div class="field"><label>出生日期</label><input name="birthDate" type="date" min="1900-01-01" max="'+todayKey()+'" value="'+profileText(p.birthDate)+'"></div>'+
   '<div class="field"><label>血型</label><select name="bloodType"><option value="">请选择</option><option'+profileSelected(p.bloodType,'A型')+'>A型</option><option'+profileSelected(p.bloodType,'B型')+'>B型</option><option'+profileSelected(p.bloodType,'AB型')+'>AB型</option><option'+profileSelected(p.bloodType,'O型')+'>O型</option><option'+profileSelected(p.bloodType,'不清楚')+'>不清楚</option></select></div>'+
  '</div></section>'+
  '<section class="profile-form-section"><div class="profile-section-title"><span>02</span><div><h3>身体与习惯</h3><p>填写真实情况，所有项目均为选填</p></div></div><div class="profile-fields">'+
   '<div class="field"><label>身高（厘米）</label><input name="heightCm" type="number" min="50" max="250" step="0.1" placeholder="例如 170" value="'+profileText(p.heightCm)+'"></div>'+
   '<div class="field"><label>体重（千克）</label><input name="weightKg" type="number" min="20" max="500" step="0.1" placeholder="例如 65" value="'+profileText(p.weightKg)+'"></div>'+
   '<div class="field"><label>日常活动水平</label><select name="activityLevel"><option value="">请选择</option><option'+profileSelected(p.activityLevel,'久坐为主')+'>久坐为主</option><option'+profileSelected(p.activityLevel,'轻度活动')+'>轻度活动</option><option'+profileSelected(p.activityLevel,'中等活动')+'>中等活动</option><option'+profileSelected(p.activityLevel,'高强度活动')+'>高强度活动</option></select></div>'+
   '<div class="field"><label>当前健康目标</label><select name="healthGoal"><option value="">请选择</option><option'+profileSelected(p.healthGoal,'改善体能')+'>改善体能</option><option'+profileSelected(p.healthGoal,'控制体重')+'>控制体重</option><option'+profileSelected(p.healthGoal,'规律作息')+'>规律作息</option><option'+profileSelected(p.healthGoal,'均衡饮食')+'>均衡饮食</option><option'+profileSelected(p.healthGoal,'保持状态')+'>保持状态</option></select></div>'+
   '<div class="field span-2"><label>过敏或忌口</label><textarea name="allergies" maxlength="500" rows="3" placeholder="如无可留空">'+profileText(p.allergies)+'</textarea></div>'+
   '<div class="field span-2"><label>需要关注的健康情况</label><textarea name="medicalNotes" maxlength="800" rows="3" placeholder="用于个人备忘，不代替医疗记录">'+profileText(p.medicalNotes)+'</textarea></div>'+
  '</div></section>'+
  '<section class="profile-form-section"><div class="profile-section-title"><span>03</span><div><h3>紧急联系人</h3><p>需要时便于快速查看</p></div></div><div class="profile-fields">'+
   '<div class="field"><label>联系人姓名</label><input name="emergencyContact" maxlength="60" placeholder="请输入联系人姓名" value="'+profileText(p.emergencyContact)+'"></div>'+
   '<div class="field"><label>联系电话</label><input name="emergencyPhone" maxlength="30" inputmode="tel" placeholder="请输入联系电话" value="'+profileText(p.emergencyPhone)+'"></div>'+
  '</div></section>'+
  '<div class="profile-actions">'+(data.profile?'<button id="clearProfile" class="profile-clear" type="button">清空档案</button>':'<span></span>')+'<button id="saveProfile" class="primary" type="submit">保存个人档案</button></div>'+
 '</form><p class="profile-disclaimer">个人档案仅用于本站记录与展示；BMI 等信息仅作日常参考，不能替代专业医疗建议。</p></article>';
}

function profileFormValue(form,name){return String(form.elements[name]?.value||'').trim()}
function profileFromForm(form){
 const result={};
 for(const key of ['displayName','gender','birthDate','bloodType','activityLevel','healthGoal','allergies','medicalNotes','emergencyContact','emergencyPhone']){
  const value=profileFormValue(form,key);if(value)result[key]=value;
 }
 for(const key of ['heightCm','weightKg']){const value=profileFormValue(form,key);if(value!=='')result[key]=Number(value)}
 return Object.keys(result).length?result:null;
}
function bindProfile(){
 const form=q('#profileForm');if(!form)return;
 profileDirty=false;
 form.querySelectorAll('input,select,textarea').forEach(control=>{control.oninput=control.onchange=()=>{profileDirty=true}});
 const identity=user?String(user.id):null,epoch=generation,version=revision,saveButton=q('#saveProfile');
 form.onsubmit=async event=>{
  event.preventDefault();if(saving||!ready||epoch!==generation)return;
  if(!identity){showLoginPrompt();return}
  const candidate=clone(data);candidate.profile=profileFromForm(form);
  saving=true;saveButton.disabled=true;saveButton.textContent='正在保存…';
  try{const result=await persist(candidate,identity,version);if(epoch!==generation||String(user?.id)!==identity)return;data=result.data;revision=result.revision;profileDirty=false;render();notify('个人档案已保存')}
  catch(error){notify(error.message||'保存失败，请重试')}
  finally{saving=false;saveButton.disabled=false;saveButton.textContent='保存个人档案'}
 };
 const clearButton=q('#clearProfile');
 if(clearButton)clearButton.onclick=async()=>{
  if(saving||!ready)return;if(!identity){showLoginPrompt();return}
  if(!confirm('确定清空个人档案吗？运动、饮食、睡眠和视力记录不会受到影响。'))return;
  const candidate=clone(data);candidate.profile=null;saving=true;clearButton.disabled=true;
  try{const result=await persist(candidate,identity,version);if(epoch!==generation||String(user?.id)!==identity)return;data=result.data;revision=result.revision;profileDirty=false;render();notify('个人档案已清空')}
  catch(error){notify(error.message||'清空失败，请重试')}
  finally{saving=false;clearButton.disabled=false}
 };
}
function profileDraftActive(){return location.hash==='#profile'&&profileDirty}
function resetProfileDraft(){profileDirty=false}
