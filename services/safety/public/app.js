const emptyData=()=>({exercise:[],diet:[],sleep:[],vision:[],profile:null,exercisePlan:null,dietPlan:null,challenges:{sleep:[],sugar:[],water:[]}});
const clone=x=>JSON.parse(JSON.stringify(x));
const q=s=>document.querySelector(s),page=q('#page'),modal=q('#modal'),modalBody=q('#modalBody');
let data=emptyData(),user=null,revision=0,ready=false,saving=false,loadError='',generation=0;
const todayKey=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const currentDisplayName=()=>user?(data.profile?.displayName?.trim()||user.name):null;
const hours=x=>typeof x==='number'?x:x.hours;
const daily=items=>items.filter(x=>!x.date||x.date===todayKey());
const sum=(items,key)=>Math.round(items.reduce((n,x)=>n+x[key],0)*10)/10;
function metric(icon,value,unit,label,trend){if(!user){value='—';trend='暂无数据'}return '<article class="card metric-card"><span class="icon">'+icon+'</span><span class="trend">'+trend+'</span><b>'+value+'</b> <small>'+unit+'</small><p>'+label+'</p></article>'}
function hero(title,text,percent){return '<article class="card hero-card"><span class="tag">HEALTH & SAFETY</span><h2>'+title+'</h2><p>'+text+'</p><div class="progress"><i style="width:'+percent+'%"></i></div><div class="progress-meta"><span>今日健康目标</span><b>'+(user?percent+'%':'暂无数据')+'</b></div></article>'}
function ring(value,label){return '<article class="card ring-card"><div class="ring" style="--value:'+value+'"></div><div class="ring-content"><b>'+(user?value:'—')+'</b><small>'+label+'</small></div></article>'}
function advice(title,text){return '<article class="card advice"><b>'+title+'</b><p>'+text+'</p></article>'}
function empty(message){return '<div class="empty-state">'+message+'</div>'}
function deleteButton(type,index){return user?'<button class="delete-record" type="button" data-delete="'+type+'" data-index="'+index+'" aria-label="删除记录">删除</button>':''}
function exerciseList(){return data.exercise.length?'<div class="list">'+data.exercise.map((x,index)=>'<div class="list-item"><span class="list-icon">↗</span><div><b>'+escapeHtml(x.name)+'</b><small>'+escapeHtml(x.date||'未记录日期')+' · '+x.minutes+' 分钟</small></div><div class="value"><b>'+x.calories+' kcal</b><small>已记录</small></div>'+deleteButton('exercise',index)+'</div>').join('')+'</div>':empty('暂无锻炼记录，点击“记录锻炼”开始。')}
function dietList(){return data.diet.length?'<div class="list">'+data.diet.map((x,index)=>'<div class="list-item"><span class="list-icon">♧</span><div><b>'+escapeHtml(x.food)+'</b><small>'+escapeHtml(x.meal)+' · '+escapeHtml(x.date||'未记录日期')+'</small></div><div class="value"><b>'+x.calories+' kcal</b><small>蛋白质 '+x.protein+'g</small></div>'+deleteButton('diet',index)+'</div>').join('')+'</div>':empty('暂无饮食记录，点击“添加饮食”记录第一餐。')}
function sleepList(){return '<div class="list sleep-history">'+data.sleep.map((x,index)=>'<div class="list-item"><span class="list-icon">☾</span><div><b>睡眠记录</b><small>'+escapeHtml(x.date||'未记录日期')+'</small></div><div class="value"><b>'+hours(x)+' 小时</b>'+(x.quality?'<small>主观质量 '+x.quality+'/5</small>':'')+'</div>'+deleteButton('sleep',index)+'</div>').join('')+'</div>'}
function coverage(){return [daily(data.exercise).length,daily(data.diet).length,data.sleep.length].filter(Boolean).length}
function updateCompletionStatus(){const button=q('#noticeBtn'),dot=q('#noticeDot');if(!button||!dot)return;const complete=Boolean(user)&&coverage()===3;dot.hidden=complete;button.classList.toggle('is-complete',complete);button.title=complete?'健康记录已填写完整':'健康记录待补充';if(button.setAttribute)button.setAttribute('aria-label',button.title)}
function home(){const mins=sum(daily(data.exercise),'minutes'),cal=sum(daily(data.diet),'calories'),sl=data.sleep.length?hours(data.sleep.at(-1)):'—',percent=Math.round(coverage()/3*100);return '<section class="hero">'+hero(user?'欢迎回来，记录属于你的健康日常':'照顾健康，从一份日常记录开始','记录运动、饮食和睡眠，逐步了解自己的生活习惯。',percent).replace('今日健康目标','记录完整度')+ring(percent,'记录完整度 %')+'</section><section class="grid grid-4">'+metric('↗',mins,'分钟','今日活动时长','参考目标 60 分钟')+metric('♧',cal,'kcal','今日营养摄入',daily(data.diet).length+' 条记录')+metric('☾',sl,'小时','最近一次睡眠',data.sleep.length?'已记录':'待记录')+metric('✓',data.exercise.length+data.diet.length+data.sleep.length+visionRecords().length,'条','已保存记录',user?'当前账号':'请先登录')+'</section>'+visionOverview('home')+'<div class="section-head"><h2>日常健康提醒</h2></div><section class="grid grid-3">'+advice('每坐 60 分钟起身活动','轻微拉伸 3–5 分钟，减少连续久坐。')+advice('保持均衡饮食','适量搭配蔬菜、全谷物与优质蛋白。')+advice('保持规律作息','成年人通常建议每晚睡眠 7–9 小时。')+'</section>'}
function exercise(){const mins=sum(daily(data.exercise),'minutes'),burn=sum(daily(data.exercise),'calories');return '<section class="grid grid-3">'+metric('◷',mins,'分钟','今日锻炼时长','参考目标 60 分钟')+metric('♨',burn,'kcal','今日活动消耗','来自已记录内容')+metric('✓',data.exercise.length,'条','累计锻炼记录','循序渐进')+'</section><div class="section-head"><div><h2>锻炼记录</h2><p>按日期保存，运动前充分热身</p></div><button class="primary" data-form="exercise">＋ 记录锻炼</button></div><article class="card">'+exerciseList()+'</article>'+planSection('exercise')+'<div class="section-head"><h2>安全锻炼建议</h2></div><section class="grid grid-3">'+advice('关注身体信号','出现胸闷、眩晕或异常疼痛时应立即停止运动。')+advice('控制运动强度','以能够正常交谈的强度为宜。')+advice('补水与恢复','分次补水，结束后舒缓拉伸。')+'</section>'}
function diet(){const cal=sum(daily(data.diet),'calories'),pro=sum(daily(data.diet),'protein');return '<section class="hero">'+hero('均衡摄入，记录每一餐',(user?'今日已记录 '+cal+' kcal，蛋白质 '+pro+' g。热量参考目标因人而异。':'暂无饮食数据，登录后记录每一餐。'),Math.min(100,Math.round(cal/20)))+ring(Math.min(100,Math.round(daily(data.diet).length/3*100)),'三餐记录进度 %')+'</section><div class="section-head"><div><h2>饮食记录</h2><p>按日期记录，了解营养摄入</p></div><button class="primary" data-form="diet">＋ 添加饮食</button></div><article class="card">'+dietList()+'</article>'+planSection('diet')+'<div class="section-head"><div><h2>食物搭配注意</h2><p>日常饮食参考，不代表绝对的“食物相克”；如有过敏或疾病请遵循专业建议</p></div></div><section class="grid grid-2 diet-guidance"><article class="card guidance-card"><b>螃蟹 + 柿子</b><p>两者都偏寒凉，不建议一次大量同食；肠胃敏感时尤其要注意分量。</p></article><article class="card guidance-card"><b>牛奶 + 柑橘类水果</b><p>部分人同食后容易胃部不适或反酸，可以错开一段时间观察。</p></article><article class="card guidance-card"><b>蜂蜜 + 豆腐</b><p>不建议大量同时食用，容易增加胃肠负担；日常少量通常以个人耐受为准。</p></article><article class="card guidance-card"><b>菠菜 + 豆腐</b><p>两者都含有影响钙吸收的成分，建议焯菠菜后再搭配，均衡摄入即可。</p></article></section><div class="section-head"><div><h2>常见食物营养参考</h2><p>每份为日常估算值，品牌、分量和烹饪方式会造成差异</p></div></div><article class="card nutrition-reference"><div class="nutrition-row nutrition-head"><b>食物</b><b>参考分量</b><b>热量</b><b>蛋白质</b></div><div class="nutrition-row"><span>白粥</span><span>1 碗（约 250g）</span><strong>约 150 kcal</strong><strong>约 3g</strong></div><div class="nutrition-row"><span>馒头</span><span>1 个（约 100g）</span><strong>约 220 kcal</strong><strong>约 7g</strong></div><div class="nutrition-row"><span>鸡蛋</span><span>1 个</span><strong>约 70 kcal</strong><strong>约 6g</strong></div><div class="nutrition-row"><span>纯牛奶</span><span>250 ml</span><strong>约 150 kcal</strong><strong>约 8g</strong></div><div class="nutrition-row"><span>米饭</span><span>1 碗（约 150g）</span><strong>约 230 kcal</strong><strong>约 5g</strong></div><div class="nutrition-row"><span>鸡胸肉</span><span>100g（熟）</span><strong>约 165 kcal</strong><strong>约 31g</strong></div><div class="nutrition-row"><span>香蕉</span><span>1 根（约 120g）</span><strong>约 105 kcal</strong><strong>约 1g</strong></div><div class="nutrition-row"><span>燕麦片</span><span>40g（干重）</span><strong>约 150 kcal</strong><strong>约 5g</strong></div></article>'}
function sleep(){const recent=data.sleep.slice(-7),last=recent.length?hours(recent.at(-1)):'—',avg=recent.length?(recent.reduce((a,b)=>a+hours(b),0)/recent.length).toFixed(1):'—';return '<section class="grid grid-3">'+metric('☾',last,'小时','最近一次睡眠',recent.length?'来自已记录内容':'待记录')+metric('◷',avg,'小时','最近 7 次平均',recent.length+' 条记录')+metric('✓',data.sleep.length,'条','累计睡眠记录','持续关注作息')+'</section><div class="section-head"><div><h2>最近 7 次睡眠趋势</h2><p>成年人通常建议每晚睡眠 7–9 小时</p></div><button class="primary" data-form="sleep">记录睡眠</button></div><article class="card">'+(recent.length?'<div class="chart">'+recent.map((v,i)=>'<div class="bar-wrap"><div class="bar" style="height:'+Math.min(100,hours(v)/12*100)+'%"></div><span>'+escapeHtml(v.date?v.date.slice(5):'第'+(i+1)+'次')+'<br>'+hours(v)+'h</span></div>').join('')+'</div>'+sleepList():empty('暂无睡眠记录，记录后这里会显示趋势。'))+'</article><div class="section-head"><h2>改善建议</h2></div><section class="grid grid-3">'+advice('固定睡眠窗口','每天尽量在相近时间入睡和起床。')+advice('睡前减少刺激','减少咖啡因、剧烈运动和屏幕刺激。')+advice('关注异常信号','长期打鼾、夜间憋醒或白天嗜睡时应咨询专业人员。')+'</section>'}
function safetySummary(){if(!user)return null;const exercise=daily(data.exercise).length>0,diet=daily(data.diet).length>0,sleep=data.sleep.length>0&&hours(data.sleep.at(-1))>=7&&hours(data.sleep.at(-1))<=9;return {safe:[exercise,diet,sleep].filter(Boolean).length,attention:[exercise,diet,sleep].filter(x=>!x).length,labels:[['日常锻炼',exercise],['饮食健康',diet],['睡眠监测',sleep]]}}
function safetyTrend(){const dates=[...new Set([...data.exercise,...data.diet,...data.sleep].map(x=>x.date||todayKey()))].sort().slice(-7);return dates.map(date=>{const exercise=data.exercise.some(x=>(x.date||todayKey())===date),diet=data.diet.some(x=>(x.date||todayKey())===date),sleep=data.sleep.some(x=>(x.date||todayKey())===date&&hours(x)>=7&&hours(x)<=9);return {date,value:Math.round(([exercise,diet,sleep].filter(Boolean).length/3)*100)}})}
function analysisCharts(){const summary=safetySummary(),trend=safetyTrend();if(!summary)return '<section class="grid grid-2 analysis-charts"><article class="card chart-card"><h2>安全状态占比</h2>'+empty('登录并记录后显示统计。')+'</article><article class="card chart-card"><h2>安全状态趋势</h2>'+empty('登录并记录后显示趋势。')+'</article></section>';const total=summary.safe+summary.attention,safeDeg=Math.round(summary.safe/total*360),pie='<div class="pie-chart" style="--safe-deg:'+safeDeg+'deg"><span>'+Math.round(summary.safe/total*100)+'%</span></div><div class="chart-legend"><span><i class="legend-safe"></i>安全 '+summary.safe+' 项</span><span><i class="legend-attention"></i>需关注 '+summary.attention+' 项</span></div>';let lineHtml='';if(trend.length){const width=560,height=190,padX=34,padY=20,innerW=width-padX*2,innerH=height-padY*2,points=trend.map((item,index)=>{const x=trend.length===1?width/2:padX+index*innerW/(trend.length-1),y=height-padY-item.value/100*innerH;return {x,y,item}}),polyline=points.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' '),dots=points.map(p=>'<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4"><title>'+escapeHtml(p.item.date)+'：'+p.item.value+'%</title></circle>').join(''),labels=points.map(p=>'<span style="left:'+((p.x/width)*100).toFixed(2)+'%">'+escapeHtml(p.item.date.slice(5))+'</span>').join('');lineHtml='<div class="line-chart"><svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="安全状态趋势折线图"><path class="line-grid" d="M34 20H526 M34 95H526 M34 170H526"></path><polyline points="'+polyline+'"></polyline>'+dots+'</svg><div class="line-labels">'+labels+'</div></div>'}else lineHtml=empty('记录后显示趋势。');return '<section class="grid grid-2 analysis-charts"><article class="card chart-card"><h2>安全状态占比</h2><p class="chart-note">根据运动、饮食、睡眠三类记录覆盖情况统计</p>'+pie+'</article><article class="card chart-card"><h2>安全状态趋势</h2><p class="chart-note">按有记录日期计算，满分 100%，仅作日常管理参考</p>'+lineHtml+'</article></section>'}
function analysis(){const count=coverage(),mins=sum(daily(data.exercise),'minutes'),last=data.sleep.length?hours(data.sleep.at(-1)):null;return '<section class="grid grid-2"><article class="card"><span class="tag">HEALTH RECORDS</span><div class="risk-score"><span class="risk-number">'+(user?count+'/3':'—')+'</span><div><span class="risk-label">'+(count===3?'记录已覆盖三类':'记录尚不完整')+'</span><p>今日运动、今日饮食与最近睡眠</p></div></div></article><article class="card"><h2>健康记录分析</h2><p>根据本人填写的记录提供生活习惯参考，不能据此判定身体安全或替代医疗诊断。</p></article></section><div class="section-head"><h2>分项记录情况</h2></div><section class="grid grid-3">'+advice('日常锻炼',daily(data.exercise).length?'今日活动 '+mins+' 分钟。'+(mins<60?'可根据身体情况适当增加活动。':'请注意运动后的休息与恢复。'):'暂无今日锻炼数据，请先记录。')+advice('饮食健康',daily(data.diet).length?'今日记录 '+daily(data.diet).length+' 餐，摄入 '+sum(daily(data.diet),'calories')+' kcal。营养需求因人而异。':'暂无今日饮食数据，请先记录。')+advice('睡眠监测',last===null?'暂无睡眠数据，请先记录。':'最近睡眠 '+last+' 小时。'+(last>=7&&last<=9?'处于成人常见建议时长范围。':'请结合年龄和身体情况关注作息。'))+'</section>'+analysisCharts()+visionOverview('analysis')}
function analysisWithInsight(){return analysis()+insightPanel()}
const pages={home,profile,exercise,diet,sleep,vision,challenges,analysis:analysisWithInsight,consult,knowledge},titles={home:'健康总览',profile:'个人档案',exercise:'日常锻炼',diet:'饮食健康',sleep:'睡眠监测',vision:'视力检测',challenges:'健康挑战赛',analysis:'安全健康分析',consult:'AI 健康问诊',knowledge:'健康知识检索'};
const pageMeta={
 home:{group:'健康看板',description:'集中查看日常锻炼、饮食与睡眠记录。'},
 profile:{group:'健康看板',description:'填写、修改和查看属于当前账号的个人信息。'},
 exercise:{group:'生活打卡',description:'记录活动时长与消耗，循序渐进地完成锻炼。'},
 diet:{group:'生活打卡',description:'管理每日饮食，查看食物搭配与常见营养参考。'},
 sleep:{group:'生活打卡',description:'记录睡眠时长，观察近期作息变化。'},
 vision:{group:'生活打卡',description:'从 E 字视标到用眼习惯，关注每一次视觉变化。'},
 challenges:{group:'生活打卡',description:'早睡、控糖和饮水挑战，按日打卡，积累成就。'},
 analysis:{group:'趋势洞察',description:'汇总运动、饮食和睡眠记录，了解日常健康状态。'},
 consult:{group:'趋势洞察',description:'描述不适、生活习惯或检查疑问，获得有边界的健康信息。'},
 knowledge:{group:'趋势洞察',description:'检索权威资料，并让 AI 根据命中的内容回答一般健康知识。'}
};
function render(){
 const route=location.hash.slice(1)||'home',key=pages[route]?route:'home';
 page.dataset.route=key;if(document.body)document.body.dataset.route=key;
 q('#pageTitle').textContent=titles[key];
 q('#pageCrumb').textContent=titles[key];
 q('#pageGroup').textContent=pageMeta[key].group;
 q('#pageDescription').textContent=pageMeta[key].description;
 document.querySelectorAll('[data-route]').forEach(a=>a.classList.toggle('active',a.dataset.route===key));
 q('.sidebar').classList.remove('open');
 if(!ready){page.innerHTML='<article class="card empty-state">'+(loadError?escapeHtml(loadError)+'<br><button class="primary" id="retryData">重新加载</button>':'正在读取健康记录…')+'</article>';const retry=q('#retryData');if(retry)retry.onclick=loadAccount;return}
 identityUI();
 page.innerHTML='<div class="data-context"><b>'+escapeHtml(user?currentDisplayName()+'的健康档案':'游客模式')+'</b>'+(user?'':'<span>登录后可保存和查看个人健康记录</span>')+'</div>'+pages[key]();
 document.querySelectorAll('[data-form]').forEach(b=>b.onclick=()=>openForm(b.dataset.form));
 document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteRecord(b.dataset.delete,Number(b.dataset.index)));
 bindPlans();
 if(key==='challenges')bindChallenges();
 if(key==='profile')bindProfile();
 if(key==='vision')bindVision();
 if(key==='consult')bindConsult();
 if(key==='analysis')bindInsight();
 if(key==='knowledge')bindKnowledge();
 updateCompletionStatus();
 scrollTo(0,0);
}
async function persist(candidate,identity,version){
 if(identity){
  const res=await fetch('/api/health-data',{method:'PUT',headers:{'Content-Type':'application/json','X-Health-User':identity},body:JSON.stringify({data:candidate,revision:version})});
  const result=await res.json();
  if(!res.ok){if(res.status===401||res.status===409){loadError=result.message;ready=false;modal.hidden=true;render();if(res.status===401)showLoginPrompt()}throw new Error(result.message||'保存失败')}
  resetInsight();
  return result;
 }
 throw new Error('请先登录账号');
}
function loginUrl(){return '/account/?returnTo='+encodeURIComponent('/'+location.hash)}
function showLoginPrompt(){
 modalBody.innerHTML='<h2>请先登录账号</h2><p>登录后才能保存个人档案、健康记录和锻炼饮食计划。</p><a class="primary login-link" href="'+loginUrl()+'">前往登录</a>';
 modal.hidden=false;
}
function formSleepQuality(html){
 return html.replace('<button class="primary span-2">保存记录</button>','<div class="field span-2"><label>主观睡眠质量（可选）</label><select name="quality"><option value="">未评价</option><option value="1">1 分 · 很差</option><option value="2">2 分 · 较差</option><option value="3">3 分 · 一般</option><option value="4">4 分 · 较好</option><option value="5">5 分 · 很好</option></select></div><button class="primary span-2">保存记录</button>');
}
function openForm(type){
 if(!ready||saving)return;
 const forms={exercise:'<h2>记录日常锻炼</h2><form id="recordForm" class="form-grid"><div class="field"><label>运动项目</label><select name="name" required><option value="" disabled selected>请选择运动项目</option><option>快走</option><option>慢跑</option><option>骑行</option><option>游泳</option><option>肩颈拉伸</option></select></div><div class="field"><label>时长（分钟）</label><input name="minutes" type="number" min="1" required></div><div class="field span-2"><label>消耗热量</label><input name="calories" type="number" min="1" required></div><button class="primary span-2">保存记录</button></form>',diet:'<h2>添加饮食记录</h2><form id="recordForm" class="form-grid"><div class="field"><label>餐次</label><select name="meal" required><option value="" disabled selected>请选择餐次</option><option>早餐</option><option>午餐</option><option>晚餐</option><option>加餐</option></select></div><div class="field"><label>食物内容</label><input name="food" required></div><div class="field"><label>热量</label><input name="calories" type="number" required></div><div class="field"><label>蛋白质（g）</label><input name="protein" type="number" required></div><button class="primary span-2">保存记录</button></form>',sleep:'<h2>更新睡眠记录</h2><form id="recordForm" class="form-grid"><div class="field span-2"><label>昨夜睡眠时长（小时）</label><input name="hours" type="number" min="0" max="16" step="0.1" required></div><button class="primary span-2">保存记录</button></form>'}
 modalBody.innerHTML=type==='sleep'?formSleepQuality(forms[type]):forms[type];modal.hidden=false;
 const identity=user?String(user.id):null,version=revision,epoch=generation;
 const form=q('#recordForm');
 form.noValidate=!identity;
 form.querySelectorAll('input[type="number"]').forEach(input=>{input.min=input.name==='minutes'?'1':'0';input.max=({minutes:1440,calories:20000,protein:2000,hours:24})[input.name];if(input.name==='protein')input.step='0.1'});
 if(type==='diet')form.elements.food.maxLength=200;
 form.onsubmit=async e=>{
  e.preventDefault();if(saving||!ready||epoch!==generation)return;
  if(!identity){showLoginPrompt();return}
  const f=new FormData(form),candidate=clone(data),date=todayKey();
  if(type==='exercise')candidate.exercise.unshift({name:f.get('name'),minutes:+f.get('minutes'),calories:+f.get('calories'),date});
  if(type==='diet'){const food=String(f.get('food')).trim();if(!food){notify('请输入食物内容');return}candidate.diet.unshift({meal:f.get('meal'),food,calories:+f.get('calories'),protein:+f.get('protein'),date})}
  if(type==='sleep'){candidate.sleep=candidate.sleep.filter(x=>typeof x==='number'||x.date!==date);candidate.sleep.push({hours:+f.get('hours'),date,...(f.get('quality')?{quality:+f.get('quality')}:{})})}
  const button=form.querySelector('button');saving=true;button.disabled=true;button.textContent='正在保存…';
  try{const result=await persist(candidate,identity,version);if(epoch!==generation)return;data=result.data;revision=result.revision;modal.hidden=true;render();notify('已保存到当前账号')}
  catch(error){notify(error.message||'保存失败，请重试')}
  finally{saving=false;button.disabled=false;button.textContent='保存记录'}
 };
}
async function deleteRecord(type,index){
 if(!ready||saving||!['exercise','diet','sleep','vision'].includes(type)||!Number.isInteger(index)||index<0||index>=data[type].length)return;
 if(!user){showLoginPrompt();return}
 if(!confirm('确定删除这条'+({exercise:'锻炼',diet:'饮食',sleep:'睡眠',vision:'视力'}[type])+'记录吗？此操作无法撤销。'))return;
 const identity=String(user.id),epoch=generation,version=revision,candidate=clone(data);
 candidate[type].splice(index,1);saving=true;
 try{const result=await persist(candidate,identity,version);if(epoch!==generation||String(user?.id)!==identity)return;data=result.data;revision=result.revision;render();notify('记录已删除')}
 catch(error){notify(error.message||'删除失败，请重试')}
 finally{saving=false}
}
function notify(msg){const t=q('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000)}
function identityUI(){
 const name=currentDisplayName();
 q('#userName').textContent=name||'登录账号';
 q('#userStatus').textContent=user?'已登录 · 独立健康档案':'登录后保存个人健康档案';
 q('#userAvatar').textContent=name?name.slice(0,1):'登';
 q('#accountButton').dataset.logged=user?'true':'';
 q('#privacyStatus').textContent=user?'记录按账号独立保存':'登录后才能保存记录';
 q('#dataMode').textContent=user?'个人健康档案':'游客模式';
 q('#topUserName').textContent=name||'登录账号';
 q('#topUserRole').textContent=user?(user.role||'已登录'):'游客模式';
 q('#topUserAvatar').textContent=name?name.slice(0,1):'登';
 q('#topGreeting').textContent=name?'你好，'+name+'，愿你今天身心安康':'你好，健康生活从今天开始';
 q('#topLogout').hidden=!user;
}
async function loadAccount(){
 resetVision();
 resetProfileDraft();
 planDraft=null;
 challengeRank={leaders:[],myRank:null};
 const epoch=++generation;ready=false;loadError='';modal.hidden=true;q('#accountMenu').hidden=true;render();
 try{
  const res=await fetch('/api/me',{cache:'no-store'});
  if(epoch!==generation)return;
  if(res.status===401){user=null;data=emptyData();revision=0}
  else {
   if(!res.ok)throw new Error('账号读取失败');
   const me=await res.json(),identity=me.user;
   if(identity.role==='健康安全管理员'){location.href='/admin/';return}
   const records=await fetch('/api/health-data',{cache:'no-store',headers:{'X-Health-User':String(identity.id)}});
   if(!records.ok)throw new Error('个人记录读取失败，请重新加载');
   const result=await records.json();if(epoch!==generation)return;
   user=identity;data={...emptyData(),...result.data};revision=result.revision;
  }
  ready=true;
 }catch(error){if(epoch!==generation)return;loadError=error.message||'暂时无法读取记录，请重试'}
 syncInsightIdentity();
 syncKnowledgeIdentity();
 render();
 refreshChallengeRank();
 if(typeof resetConsult==='function'){resetConsult();loadConsult()}
}
q('#accountButton').onclick=()=>{if(!ready)return;if(user)q('#accountMenu').hidden=!q('#accountMenu').hidden;else location.href=loginUrl()};
q('#topAccountButton').onclick=()=>{if(!ready)return;if(user)q('#topLogout').hidden=!q('#topLogout').hidden;else location.href=loginUrl()};
async function logout(){
 if(saving)return notify('正在保存记录，请稍候');
 const button=q('#logoutAccount');button.disabled=true;
 q('#topLogout').disabled=true;
 try{const res=await fetch('/api/logout',{method:'POST'});if(!res.ok)throw new Error();await loadAccount();notify('已退出，游客模式不显示个人数据')}
 catch{notify('退出失败，请重试')}finally{button.disabled=false;q('#topLogout').disabled=false}
}
q('#logoutAccount').onclick=logout;
q('#topLogout').onclick=logout;
q('#today').textContent=new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'long'}).format(new Date());
q('#modalClose').onclick=()=>{if(!saving){resetVision();modal.hidden=true}};
modal.onclick=e=>{if(e.target===modal&&!saving){resetVision();modal.hidden=true}};
q('#menuBtn').onclick=()=>q('.sidebar').classList.toggle('open');
q('#noticeBtn').onclick=()=>notify(Boolean(user)&&coverage()===3?'三类健康记录已填写完整':'健康分析基于已填写记录，请继续补充运动、饮食和睡眠');
addEventListener('hashchange',render);
addEventListener('focus',()=>{if(!saving&&modal.hidden&&!profileDraftActive())loadAccount()});
loadAccount();
