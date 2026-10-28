let challengeRank={leaders:[],myRank:null};
const challengeLabels={sleep:'21天早睡挑战',sugar:'7天戒糖挑战',water:'每日饮水挑战'};
const challengeHelp={sleep:'每天在 23:00 前入睡，请如实填写入睡时间。',sugar:'当天不喝含糖饮料、不吃额外添加糖的零食。',water:'每日饮水 1500 ml 作为挑战打卡参考值。'};
function challenges(){
 const earned=user?ChallengeCore.badges(data.challenges):[];
 const cards=Object.keys(challengeLabels).map(kind=>{
  const attempt=ChallengeCore.latest(data.challenges,kind),duration=ChallengeCore.kinds[kind].duration,today=todayKey();
  const elapsed=attempt?ChallengeCore.dayNumber(today)-ChallengeCore.dayNumber(attempt.startDate):0;
  const active=attempt&&elapsed>=0&&(!duration||elapsed<duration),entry=attempt?.days.find(x=>kind==='sugar'?x===today:x.date===today);
  const count=attempt?(kind==='water'?attempt.days.filter(x=>x.ml>=1500).length:attempt.days.length):0;
  const controls=!active?'<button class="primary" data-challenge-start="'+kind+'">'+(attempt?'重新开始':'参加挑战')+'</button>':
   kind==='sleep'?'<label>今晚入睡时间<input id="challenge-bedtime" type="time" max="22:59" value="'+escapeHtml(entry?.bedtime||'')+'"></label><button class="primary" data-challenge-check="sleep">'+(entry?'修改':'打卡')+'</button>':
   kind==='water'?'<label>今日饮水（ml）<input id="challenge-ml" type="number" min="0" max="5000" step="50" value="'+(entry?.ml??'')+'" placeholder="例如 1600"></label><button class="primary" data-challenge-check="water">'+(entry?'更新':'打卡')+'</button>':
   '<button class="primary" data-challenge-check="sugar"'+(entry?' disabled':'')+'>'+(entry?'今日已打卡':'今天未摄入添加糖，打卡')+'</button>';
  return '<article class="card challenge-card"><span class="challenge-icon">'+({sleep:'☾',sugar:'◇',water:'◉'}[kind])+'</span><h3>'+challengeLabels[kind]+'</h3><p>'+challengeHelp[kind]+'</p><div class="challenge-progress"><span>'+(attempt?'已打卡 '+count+(duration?' / '+duration:' 天'):'尚未开始')+'</span><b>'+(attempt&&duration?Math.round(count/duration*100)+'%':attempt?'持续进行':'—')+'</b></div><div class="challenge-track"><i style="width:'+(attempt&&duration?Math.round(count/duration*100):0)+'%"></i></div><small>'+(attempt?'开始于 '+escapeHtml(attempt.startDate):'加入后每天可打卡')+'</small><div class="challenge-controls">'+controls+(entry?'<button class="challenge-undo" data-challenge-undo="'+kind+'">撤销今日打卡</button>':'')+'</div></article>';
 }).join('');
 const leaders=user?challengeRank.leaders:[];
 return '<section class="card challenge-intro"><div><span>HEALTH CHALLENGES</span><h2>把健康习惯变成每天的小胜利</h2><p>按当前账号保存挑战与打卡。排行榜统计最近 30 天达标的打卡天数。</p></div><b>'+earned.length+'<small>枚已解锁徽章</small></b></section><div class="section-head"><h2>参加挑战</h2></div><section class="challenge-grid">'+cards+'</section><section class="challenge-lower"><article class="card"><h2>排行榜</h2>'+(user?(leaders.length?'<ol class="challenge-leaders">'+leaders.map(x=>'<li><b>第 '+x.rank+' 名</b><span>'+escapeHtml(x.name)+'</span><strong>'+x.score+' 分</strong></li>').join('')+'</ol>':empty('暂无达标记录，完成挑战打卡后上榜。'))+(challengeRank.myRank?'<p>我的名次：第 '+challengeRank.myRank+' 名</p>':''):empty('登录后查看排行榜。'))+'</article><article class="card"><h2>成就徽章</h2><div class="challenge-badges">'+['初次打卡','坚持一周','清爽七日','早睡达人','饮水习惯家'].map((title,i)=>'<div class="challenge-badge'+(earned.includes(title)?' earned':'')+'"><span>'+['✦','✷','◇','☾','◉'][i]+'</span><b>'+title+'</b><small>'+(earned.includes(title)?'已解锁':'待解锁')+'</small></div>').join('')+'</div></article></section><p class="challenge-disclaimer">打卡为自我记录，睡眠质量不能只通过睡眠时长判断；饮水需求因人而异。</p>';
}
function bindChallenges(){
 document.querySelectorAll('[data-challenge-start]').forEach(b=>b.onclick=()=>changeChallenge(b.dataset.challengeStart,'start'));
 document.querySelectorAll('[data-challenge-check]').forEach(b=>b.onclick=()=>changeChallenge(b.dataset.challengeCheck,'check'));
 document.querySelectorAll('[data-challenge-undo]').forEach(b=>b.onclick=()=>changeChallenge(b.dataset.challengeUndo,'undo'));
}
async function refreshChallengeRank(){if(!user||!ready){challengeRank={leaders:[],myRank:null};return}const epoch=generation;try{const res=await fetch('/api/challenges/leaderboard',{cache:'no-store'});if(!res.ok)return;const result=await res.json();if(epoch===generation){challengeRank=result;if(location.hash==='#challenges')render()}}catch{}}
async function changeChallenge(kind,action){
 if(!ready||saving||!ChallengeCore.kinds[kind])return;if(!user){showLoginPrompt();return}
 const identity=String(user.id),epoch=generation,version=revision,date=todayKey(),candidate=clone(data),list=candidate.challenges[kind],attempt=list.at(-1),index=attempt?.days.findIndex(x=>kind==='sugar'?x===date:x.date===date)??-1;
 if(action==='start'){
  if(list.length>=50){notify('已达到挑战轮次上限');return}
  const span=ChallengeCore.kinds[kind].duration;if(attempt&&(!span||ChallengeCore.dayNumber(date)-ChallengeCore.dayNumber(attempt.startDate)<span))return;
  list.push({startDate:date,days:[]});
 }else{
  if(!attempt)return;
  if(action==='undo'){if(index<0||!confirm('确定撤销今日打卡吗？'))return;attempt.days.splice(index,1)}
  else if(kind==='sleep'){const bedtime=q('#challenge-bedtime')?.value;if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(bedtime||'')||bedtime>='23:00'){notify('请填写 23:00 前的入睡时间');return}const entry={date,bedtime};if(index>=0)attempt.days[index]=entry;else attempt.days.push(entry)}
  else if(kind==='water'){const value=Number(q('#challenge-ml')?.value);if(q('#challenge-ml')?.value===''||!Number.isInteger(value)||value<0||value>5000){notify('请输入 0～5000 ml 的整数饮水量');return}const entry={date,ml:value};if(index>=0)attempt.days[index]=entry;else attempt.days.push(entry)}
  else{if(index>=0)return;attempt.days.push(date)}
 }
 try{ChallengeCore.validateChallenges(candidate.challenges)}catch(error){notify(error.message);return}
 saving=true;try{const result=await persist(candidate,identity,version);if(epoch!==generation||String(user?.id)!==identity)return;data=result.data;revision=result.revision;render();notify(action==='undo'?'已撤销今日打卡':action==='start'?'已参加挑战':'打卡已保存');refreshChallengeRank()}catch(error){notify(error.message||'保存失败，请重试')}finally{saving=false}
}
