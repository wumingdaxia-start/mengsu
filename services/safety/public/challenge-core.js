(function(root){
'use strict';
const kinds={sleep:{title:'21天早睡挑战',duration:21},sugar:{title:'7天戒糖挑战',duration:7},water:{title:'每日饮水挑战',duration:null}};
const emptyChallenges=()=>({sleep:[],sugar:[],water:[]});
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
const dayNumber=date=>Math.floor(Date.parse(date+'T12:00:00Z')/86400000);
const todayKey=()=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return [parts.find(x=>x.type==='year').value,parts.find(x=>x.type==='month').value,parts.find(x=>x.type==='day').value].join('-')};
function validateChallenges(input){
 if(input===undefined||input===null)return emptyChallenges();
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!kinds[k]))throw Error('挑战记录格式无效');
 const output=emptyChallenges();
 for(const kind of Object.keys(kinds)){
  const attempts=input[kind]??[];if(!Array.isArray(attempts)||attempts.length>50)throw Error('挑战记录格式无效');
  output[kind]=attempts.map((attempt,index)=>{
   if(!attempt||typeof attempt!=='object'||Array.isArray(attempt)||Object.keys(attempt).some(k=>!['startDate','days'].includes(k))||!validDate(attempt.startDate)||attempt.startDate>todayKey()||!Array.isArray(attempt.days)||attempt.days.length>(kinds[kind].duration||3650))throw Error('挑战记录格式无效');
   if(index&&dayNumber(attempt.startDate)<=dayNumber(attempts[index-1].startDate))throw Error('挑战记录顺序无效');
   const days=attempt.days.map(entry=>{
    const date=kind==='sugar'?entry:entry?.date;
    if(!validDate(date)||date>todayKey()||dayNumber(date)<dayNumber(attempt.startDate)||kinds[kind].duration&&dayNumber(date)-dayNumber(attempt.startDate)>=kinds[kind].duration)throw Error('挑战日期无效');
    if(kind==='sleep'){if(!entry||typeof entry!=='object'||Array.isArray(entry)||Object.keys(entry).some(k=>!['date','bedtime'].includes(k))||!/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.bedtime)||entry.bedtime>='23:00')throw Error('早睡时间无效');return {date,bedtime:entry.bedtime}}
    if(kind==='water'){if(!entry||typeof entry!=='object'||Array.isArray(entry)||Object.keys(entry).some(k=>!['date','ml'].includes(k))||!Number.isInteger(entry.ml)||entry.ml<0||entry.ml>5000)throw Error('饮水量无效');return {date,ml:entry.ml}}
    return date;
   });
   if(new Set(days.map(d=>kind==='sugar'?d:d.date)).size!==days.length||days.some((d,i)=>i&&dayNumber(kind==='sugar'?d:d.date)<=dayNumber(kind==='sugar'?days[i-1]:days[i-1].date)))throw Error('挑战日期重复或乱序');
   return {startDate:attempt.startDate,days};
  });
 }
 return output;
}
function latest(challenges,kind){return challenges?.[kind]?.at(-1)||null}
function completedDates(challenges,kind){const dates=new Set();for(const attempt of challenges?.[kind]||[])for(const item of attempt.days){if(kind==='water'){if(item.ml>=1500)dates.add(item.date)}else dates.add(kind==='sleep'?item.date:item)}return dates}
function finished(challenges,kind){const length=kinds[kind].duration;return (challenges?.[kind]||[]).some(attempt=>attempt.days.length===length&&attempt.days.every((entry,i)=>dayNumber(kind==='sugar'?entry:entry.date)-dayNumber(attempt.startDate)===i))}
function badges(challenges){const sleep=completedDates(challenges,'sleep'),sugar=completedDates(challenges,'sugar'),water=completedDates(challenges,'water');const total=sleep.size+sugar.size+water.size;return [total>=1&&'初次打卡',total>=7&&'坚持一周',finished(challenges,'sugar')&&'清爽七日',finished(challenges,'sleep')&&'早睡达人',water.size>=7&&'饮水习惯家'].filter(Boolean)}
function score(challenges,today){const lower=dayNumber(today)-29;return Object.keys(kinds).reduce((sum,kind)=>sum+[...completedDates(challenges,kind)].filter(d=>dayNumber(d)>=lower&&dayNumber(d)<=dayNumber(today)).length,0)}
const api={kinds,emptyChallenges,validateChallenges,validDate,dayNumber,todayKey,latest,completedDates,badges,score};
if(typeof module==='object'&&module.exports)module.exports=api;else root.ChallengeCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
