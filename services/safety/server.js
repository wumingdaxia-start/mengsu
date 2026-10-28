const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const siteRoot=path.join(__dirname,'public');
const accountRoot=path.join(__dirname,'account');
const usersFile=path.join(__dirname,'../../data/safety/users.json');
const port=Number(process.env.PORT||3000);
const secret=process.env.SESSION_SECRET||crypto.randomBytes(32).toString('hex');
const {createStore,validateData}=require('./health-store');
const {score,badges,completedDates} = require('./public/challenge-core');
const {createConsultStore}=require('./consult-store');
const consultService=require('./consult-service');
const healthInsight=require('./health-insight');
const healthKnowledge=require('./health-knowledge');
const {loadMysqlConfig,createMysqlPersistence}=require('./mysql-store');
const adminRoot=path.join(__dirname,'admin');
const isAdmin=user=>user?.role==='健康安全管理员';
const today=()=>{const d=new Date(),parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);return [parts.find(x=>x.type==='year').value,parts.find(x=>x.type==='month').value,parts.find(x=>x.type==='day').value].join('-')};
function createServer(options={}){
const sessions=new Map();
const weatherCache=new Map();
const mysql=options.mysql===false?null:options.mysql||(Object.keys(options).length===0&&loadMysqlConfig());
const persistence=mysql?createMysqlPersistence(mysql,{pool:options.mysqlPool}):null;
const store=persistence?.health||createStore(options.dataDir||path.join(__dirname,'../../data/safety/health'));
const consultStore=persistence?.consult||createConsultStore(options.consultDir||path.join(__dirname,'../../data/safety/consult'));
const testStore=require('./local-persistence').createTests(options.testsDir||path.join(__dirname,'../../data/safety/tests'));
const consultBusy=new Set();
const insightBusy=new Set();
const knowledgeBusy=new Set(),knowledgeQuota=new Map();
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
function json(res,status,value,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(value))}
async function readUsers(){return persistence?persistence.users.read():require('./local-persistence').readUsers(options.usersFile||usersFile)}
function readBody(req){return new Promise((resolve,reject)=>{let raw='';req.on('data',c=>{raw+=c;if(raw.length>1048576)req.destroy()});req.on('end',()=>{try{resolve(JSON.parse(raw||'{}'))}catch{reject(new Error('请求格式错误'))}});req.on('error',reject)})}
function cookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').filter(Boolean).map(x=>{const i=x.indexOf('=');return[x.slice(0,i).trim(),decodeURIComponent(x.slice(i+1))]}))}
function sign(id){return crypto.createHmac('sha256',secret).update(id).digest('base64url')}
function getSession(req){let value;try{value=cookies(req).health_session}catch{return null}if(!value)return null;const i=value.lastIndexOf('.'),id=value.slice(0,i),sig=value.slice(i+1);if(!id||!sig)return null;const a=Buffer.from(sign(id)),b=Buffer.from(sig);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;const s=sessions.get(id);if(!s||s.expires<Date.now()){sessions.delete(id);return null}return{id,...s}}
function validPassword(password,user){const result=crypto.scryptSync(password,user.salt,64),saved=Buffer.from(user.passwordHash,'hex');return result.length===saved.length&&crypto.timingSafeEqual(result,saved)}
function serve(res,root,relative){let file=path.resolve(root,relative),base=path.resolve(root);if(!file.startsWith(base+path.sep)&&file!==path.join(base,'index.html'))return json(res,403,{message:'禁止访问'});fs.stat(file,(error,stat)=>{if(error||!stat.isFile())file=path.join(root,'index.html');fs.readFile(file,(readError,data)=>{if(readError)return json(res,404,{message:'页面不存在'});res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store, max-age=0','Pragma':'no-cache','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'"});res.end(data)})})}
async function handler(req,res){const url=new URL(req.url,'http://localhost');
 if(['POST','PUT','DELETE'].includes(req.method)&&req.headers.origin&&!['http://'+req.headers.host,'https://'+req.headers.host].includes(req.headers.origin))return json(res,403,{message:'请求来源无效'});
 if(req.method==='GET'&&url.pathname==='/api/weather'){
 const lat=Number(url.searchParams.get('latitude')),lon=Number(url.searchParams.get('longitude'));
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180||!url.searchParams.has('latitude')||!url.searchParams.has('longitude'))return json(res,400,{message:'城市坐标无效'});
 const key=lat.toFixed(2)+','+lon.toFixed(2),cached=weatherCache.get(key);
 if(cached&&cached.expires>Date.now())return json(res,200,cached.data);
 try{
  const forecast=new URL('https://api.open-meteo.com/v1/forecast');
  for(const [field,value] of Object.entries({latitude:lat,longitude:lon,current:'temperature_2m,weather_code',daily:'temperature_2m_max,temperature_2m_min,precipitation_probability_max',forecast_days:2,timezone:'auto'}))forecast.searchParams.set(field,value);
  const response=await (options.weatherFetch||fetch)(forecast,{signal:AbortSignal.timeout(6500)});
  if(!response.ok)throw Error('上游天气服务异常');
  const data=await response.json();
  if(!Number.isFinite(data.current?.temperature_2m)||!Number.isFinite(data.current?.weather_code)||!Array.isArray(data.daily?.temperature_2m_max)||!Array.isArray(data.daily?.temperature_2m_min))throw Error('天气数据不完整');
  const safe={current:{temperature_2m:data.current.temperature_2m,weather_code:data.current.weather_code},daily:{temperature_2m_max:data.daily.temperature_2m_max.slice(0,2),temperature_2m_min:data.daily.temperature_2m_min.slice(0,2),precipitation_probability_max:(data.daily.precipitation_probability_max||[]).slice(0,2)}};
  if(weatherCache.size>128)weatherCache.clear();weatherCache.set(key,{expires:Date.now()+600000,data:safe});
  return json(res,200,safe);
 }catch{return json(res,503,{message:'天气服务暂时不可用，请稍后重试'})}
 }
 if(req.method==='POST'&&url.pathname==='/api/login'){try{const input=await readBody(req),account=String(input.account||'').trim(),password=String(input.password||''),mode=input.mode||'user';if(!account||!password||!['user','admin'].includes(mode))return json(res,400,{message:'请输入账号和密码'});const user=(await readUsers()).find(x=>x.account.toLowerCase()===account.toLowerCase());if(!user||isAdmin(user)!==(mode==='admin')||!validPassword(password,user))return json(res,401,{message:'账号或密码不正确'});const id=crypto.randomBytes(32).toString('base64url'),maxAge=input.remember?604800:28800;sessions.set(id,{userId:user.id,expires:Date.now()+maxAge*1000});return json(res,200,{ok:true},{'Set-Cookie':'health_session='+encodeURIComponent(id+'.'+sign(id))+'; HttpOnly; SameSite=Strict; Path=/; Max-Age='+maxAge})}catch(e){return json(res,e.message==='请求格式错误'?400:500,{message:e.message==='请求格式错误'?e.message:'登录暂时不可用，请稍后重试'})}}
 if(req.method==='GET'&&url.pathname==='/api/me'){const s=getSession(req);if(!s)return json(res,401,{message:'请先登录'});const user=(await readUsers()).find(x=>x.id===s.userId);if(!user)return json(res,401,{message:'账号不存在'});return json(res,200,{user:{id:user.id,name:user.name,account:user.account,role:user.role,phone:user.phone}})}
 if(req.method==='POST'&&url.pathname==='/api/logout'){const s=getSession(req);if(s)sessions.delete(s.id);return json(res,200,{ok:true},{'Set-Cookie':'health_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'})}
 if(url.pathname==='/api/health-knowledge/search'){
  if(req.method!=='GET')return json(res,405,{message:'请求方式不支持'});
  const query=(url.searchParams.get('query')||'').trim();
  if(query.length<2||query.length>200)return json(res,400,{message:'请输入 2～200 字的健康知识问题'});
  return json(res,200,{query,sources:healthKnowledge.retrieve(query)});
 }
 if(url.pathname==='/api/health-knowledge/answer'){
  if(req.method!=='POST')return json(res,405,{message:'请求方式不支持'});
  const session=getSession(req),user=session&&(await readUsers()).find(x=>x.id===session.userId);
  if(!user)return json(res,401,{message:'请先登录普通用户账号'});
  if(isAdmin(user))return json(res,403,{message:'管理员无法使用个人健康知识问答'});
  if(req.headers['x-health-user']!==String(user.id))return json(res,409,{message:'账号已切换，请刷新页面'});
  const input=await readBody(req),question=typeof input.question==='string'?input.question.trim():'';
  if(question.length<2||question.length>200)return json(res,400,{message:'请输入 2～200 字的健康知识问题'});
  if(input.consent!==true)return json(res,400,{message:'请先同意发送问题及检索片段给 AI 服务'});
  if(knowledgeBusy.has(user.id))return json(res,409,{message:'上一次回答尚未完成，请稍候'});
  const now=Date.now(),quota=knowledgeQuota.get(user.id);
  if(quota&&now-quota.start<600000&&quota.count>=6)return json(res,429,{message:'AI 知识问答使用过于频繁，请 10 分钟后再试'});
  const next=quota&&now-quota.start<600000?quota:{start:now,count:0};next.count++;knowledgeQuota.set(user.id,next);
  knowledgeBusy.add(user.id);
  try{
   const result=await healthKnowledge.answer(question,healthKnowledge.retrieve(question),{env:options.aiEnv||process.env,request:options.aiFetch||fetch});
   if(result.error)return json(res,result.status||503,{message:result.error});
   return json(res,200,result);
  }finally{knowledgeBusy.delete(user.id)}
 }
 if(url.pathname==='/api/consult/status'&&req.method==='GET')return json(res,200,{available:!!consultService.config(options.aiEnv||process.env)});
 if(url.pathname==='/api/health-insight'){
  if(req.method!=='POST')return json(res,405,{message:'请求方式不支持'});
  const session=getSession(req),user=session&&(await readUsers()).find(x=>x.id===session.userId);
  if(!user)return json(res,401,{message:'请先登录普通用户账号'});
  if(isAdmin(user))return json(res,403,{message:'管理员无法生成个人健康洞察'});
  if(req.headers['x-health-user']!==String(user.id))return json(res,409,{message:'账号已切换，请刷新页面'});
  const input=await readBody(req);
  if(input.consent!==true)return json(res,400,{message:'请先同意发送近 7 天匿名汇总数据'});
  if(insightBusy.has(user.id))return json(res,409,{message:'正在生成上一份洞察，请稍候'});
  insightBusy.add(user.id);
  try{
   const {snapshot,hasRecords}=healthInsight.summarize((await store.read(user.id)).data,today());
   if(!hasRecords)return json(res,422,{message:'近 7 天还没有带日期的记录，请先填写运动、饮食或睡眠记录'});
   const result=await healthInsight.generate(snapshot,{env:options.aiEnv||process.env,request:options.aiFetch||fetch});
   if(result.error)return json(res,result.status||503,{message:result.error});
   return json(res,200,{period:snapshot.period,evidence:healthInsight.evidence(snapshot),references:result.references,report:result.report,notice:'基于自填且可能不完整的记录和公开健康资料，仅供生活习惯参考，不能替代医生诊断。结果未自动保存。'});
  }finally{insightBusy.delete(user.id)}
 }
 if(url.pathname==='/api/consult'||url.pathname==='/api/consult/clear'){
  const session=getSession(req),user=session&&(await readUsers()).find(x=>x.id===session.userId);
  if(!user)return json(res,401,{message:'请先登录普通用户账号'});
  if(isAdmin(user))return json(res,403,{message:'管理员无法使用个人问诊'});
  if(req.headers['x-health-user']!==String(user.id))return json(res,409,{message:'账号已切换，请刷新页面'});
  if(url.pathname==='/api/consult/clear'&&req.method==='DELETE'){if(consultBusy.has(user.id))return json(res,409,{message:'请等待当前回复完成'});await consultStore.clear(user.id);return json(res,200,{messages:[]})}
  if(url.pathname==='/api/consult'&&req.method==='GET')return json(res,200,{messages:await consultStore.read(user.id)});
  if(url.pathname==='/api/consult'&&req.method==='POST'){
   if(consultBusy.has(user.id))return json(res,409,{message:'上一条消息尚未完成，请稍候'});
   const input=await readBody(req),message=typeof input.message==='string'?input.message.trim():'';
   if(!message||message.length>1500)return json(res,400,{message:'请输入 1～1500 字的问诊内容'});
   consultBusy.add(user.id);
   try{
    const previous=await consultStore.read(user.id),resultMessages=[...previous,{role:'user',content:message,createdAt:new Date().toISOString()}];
    const result=await consultService.reply(resultMessages,{env:options.aiEnv||process.env,request:options.aiFetch||fetch});
    if(result.error)return json(res,result.status||503,{message:result.error});
    resultMessages.push({role:'assistant',content:result.answer,createdAt:new Date().toISOString(),urgent:!!result.urgent});
    await consultStore.write(user.id,resultMessages);
    return json(res,200,{messages:resultMessages.slice(-40),urgent:!!result.urgent});
   }finally{consultBusy.delete(user.id)}
  }
  return json(res,405,{message:'请求方式不支持'});
 }
 if(req.method==='GET'&&url.pathname==='/api/challenges/leaderboard'){
 const s=getSession(req),allUsers=s?await readUsers():[],viewer=s&&allUsers.find(x=>x.id===s.userId);if(!viewer)return json(res,401,{message:'请先登录'});if(isAdmin(viewer))return json(res,403,{message:'请使用管理员后台'});
 const date=today(),rank=(await Promise.all(allUsers.filter(x=>!isAdmin(x)).map(async x=>{const c=(await store.read(x.id)).data.challenges;return {id:String(x.id),name:x.id===viewer.id?'我':'挑战者 '+crypto.createHash('sha256').update(String(x.id)).digest('hex').slice(0,4).toUpperCase(),score:score(c,date),badges:badges(c).length}}))).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).map((x,i)=>({rank:i+1,name:x.name,score:x.score,badges:x.badges,isMe:x.id===String(viewer.id)}));
 return json(res,200,{period:'最近30天',updated:date,leaders:rank.slice(0,20),myRank:rank.find(x=>x.isMe)?.rank||null});
 }
 if(req.method==='GET'&&url.pathname==='/api/admin/overview'){
 const s=getSession(req),allUsers=s?await readUsers():[],viewer=s&&allUsers.find(x=>x.id===s.userId);if(!viewer)return json(res,401,{message:'请先登录管理员账号'});if(!isAdmin(viewer))return json(res,403,{message:'没有管理员权限'});
 const users=allUsers.filter(x=>!isAdmin(x)),details=await Promise.all(users.map(async x=>{const d=(await store.read(x.id)).data,hs=d.sleep.map(r=>typeof r==='number'?r:r.hours),quality=d.sleep.filter(r=>r&&typeof r==='object'&&Number.isInteger(r.quality)).map(r=>r.quality),avg=list=>list.length?Math.round(list.reduce((a,b)=>a+b,0)/list.length*10)/10:null;return {id:String(x.id),account:x.account,name:d.profile?.displayName||x.name,exerciseCount:d.exercise.length,exerciseMinutes:d.exercise.reduce((n,r)=>n+r.minutes,0),dietCount:d.diet.length,averageMealCalories:avg(d.diet.map(r=>r.calories)),averageMealProtein:avg(d.diet.map(r=>r.protein)),sleepCount:hs.length,averageSleepHours:avg(hs),qualityResponseCount:quality.length,averageSleepQuality:avg(quality),visionCount:d.vision.length,challengeDays:Object.fromEntries(['sleep','sugar','water'].map(k=>[k,completedDates(d.challenges,k).size])),badges:badges(d.challenges).length,challengeScore:score(d.challenges,today())}}));
 const qualityResponseCount=details.reduce((n,d)=>n+d.qualityResponseCount,0);
 const aggregate=(field,weight)=>{const total=details.reduce((n,d)=>n+d[weight],0);return total?Math.round(details.reduce((n,d)=>n+(d[field]||0)*d[weight],0)/total*10)/10:null};
 return json(res,200,{updated:today(),users:details,summary:{registeredUsers:users.length,usersWithData:details.filter(d=>d.exerciseCount+d.dietCount+d.sleepCount+d.visionCount>0).length,exerciseRecords:details.reduce((n,d)=>n+d.exerciseCount,0),dietRecords:details.reduce((n,d)=>n+d.dietCount,0),sleepRecords:details.reduce((n,d)=>n+d.sleepCount,0),visionRecords:details.reduce((n,d)=>n+d.visionCount,0),averageSleepHours:aggregate('averageSleepHours','sleepCount'),averageSleepQuality:aggregate('averageSleepQuality','qualityResponseCount'),qualityResponseCount,averageMealCalories:aggregate('averageMealCalories','dietCount'),averageMealProtein:aggregate('averageMealProtein','dietCount'),challengeParticipants:details.filter(d=>d.challengeScore>0).length}});
 }
 if(url.pathname==='/api/psychology-tests'){
  const session=getSession(req),user=session&&(await readUsers()).find(x=>x.id===session.userId);
  if(!user)return json(res,401,{message:'请先登录后保存或查看测试结果'});
  if(isAdmin(user))return json(res,403,{message:'请使用个人账号保存测试结果'});
  if(req.headers['x-health-user']!==String(user.id))return json(res,409,{message:'账号已切换，请刷新页面后重试'});
  const tests=persistence?.psychologyTests||testStore;
  if(req.method==='GET')return json(res,200,{records:await tests.read(user.id)});
  if(req.method==='POST'){
   let record;try{record=require('./psychology-tests').validateResult(await readBody(req))}catch(e){return json(res,400,{message:e.message})}
   await tests.write(user.id,record);
   return json(res,200,{ok:true});
  }
  return json(res,405,{message:'请求方式不支持'});
 }
 if(url.pathname==='/api/health-data'){
 const s=getSession(req),user=s&&(await readUsers()).find(x=>x.id===s.userId);
 if(!user)return json(res,401,{message:'登录已失效，请重新登录'});
 if(isAdmin(user))return json(res,403,{message:'管理员请使用后台查看汇总数据'});
 if(req.headers['x-health-user']!==String(user.id))return json(res,409,{message:'账号已切换，请刷新页面后重试'});
 if(req.method==='GET')return json(res,200,await store.read(user.id));
 if(req.method==='PUT'){
 const input=await readBody(req);
 let records;try{records=validateData(input.data)}catch(e){return json(res,400,{message:e.message})}
 const result=await store.write(user.id,records,input.revision);
 if(!result)return json(res,409,{message:'记录已在其他页面更新，请刷新后重试'});
 return json(res,200,result);
 }
 return json(res,405,{message:'请求方式不支持'});
 }
 if(url.pathname.startsWith('/api/'))return json(res,404,{message:'接口不存在'});
 if(req.method!=='GET')return json(res,405,{message:'请求方式不支持'});
 if(url.pathname==='/admin'||url.pathname==='/admin/')return serve(res,adminRoot,'index.html');
 if(url.pathname.startsWith('/admin/'))return serve(res,adminRoot,decodeURIComponent(url.pathname.slice(7))||'index.html');
 if(url.pathname==='/account'||url.pathname==='/account/')return serve(res,accountRoot,'index.html');
 if(url.pathname.startsWith('/account/'))return serve(res,accountRoot,decodeURIComponent(url.pathname.slice(9))||'index.html');
 return serve(res,siteRoot,url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1)));
}
const server=http.createServer((req,res)=>handler(req,res).catch(e=>{console.error(e.message);if(!res.headersSent)json(res,500,{message:'操作未完成，请稍后重试'});else res.end()}));
server.ready=persistence?.ready||Promise.resolve();
if(persistence)server.on('close',()=>persistence.close().catch(error=>console.error('数据库连接关闭失败：'+error.message)));
return server;
}
if(require.main===module){const server=createServer();server.ready.then(()=>server.listen(port,'127.0.0.1',()=>console.log('安康守护中心（含账号登录）：http://localhost:'+port))).catch(error=>{console.error('数据库连接失败：'+error.message);process.exitCode=1})}
module.exports={createServer};
