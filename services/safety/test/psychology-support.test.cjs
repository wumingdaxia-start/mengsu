const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {createServer}=require('../server');

test('psychology support requires login and consent, keeps turns ephemeral, and bypasses AI for crisis language',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'psychology-support-')),salt=crypto.randomBytes(16).toString('hex');
 const usersFile=path.join(dir,'users.json');
 fs.writeFileSync(usersFile,JSON.stringify([{id:'person',account:'person',name:'Person',role:'普通用户',salt,passwordHash:crypto.scryptSync('TestPassword123!',salt,64).toString('hex')}]));
 const calls=[];
 const server=createServer({mysql:false,usersFile,dataDir:path.join(dir,'health'),dreamDir:path.join(dir,'dream'),consultDir:path.join(dir,'consult'),testsDir:path.join(dir,'tests'),aiEnv:{HEALTH_AI_API_KEY:'test-key',HEALTH_AI_MODEL:'qwen-plus',HEALTH_AI_BASE_URL:'https://example.test/v1'},aiFetch:async(url,init)=>{calls.push(JSON.parse(init.body));return {ok:true,json:async()=>({choices:[{message:{content:'听起来你最近承担了不少。'}}]})}}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const send=(cookie,id,body)=>fetch(base+'/api/psychology-support',{method:'POST',headers:{Cookie:cookie,'X-Health-User':id,'Content-Type':'application/json'},body:JSON.stringify(body)});
 try{
  assert.equal((await send('','person',{message:'最近觉得很累',consent:true})).status,401);
  const login=await fetch(base+'/api/login',{method:'POST',body:JSON.stringify({account:'person',password:'TestPassword123!'})});
  const cookie=login.headers.get('set-cookie').split(';')[0];
  assert.equal((await send(cookie,'person',{message:'最近觉得很累'})).status,400);
  assert.equal((await send(cookie,'other',{message:'最近觉得很累',consent:true})).status,409);
  let response=await send(cookie,'person',{message:'最近觉得很累',history:[],consent:true});
  assert.equal(response.status,200);assert.equal((await response.json()).answer,'听起来你最近承担了不少。');
  response=await send(cookie,'person',{message:'我好像没人理解',history:[{role:'user',content:'最近觉得很累'},{role:'assistant',content:'听起来你承担了不少'}],consent:true});
  assert.equal(response.status,200);assert.equal(calls[1].messages.at(-2).content,'听起来你承担了不少');
  const count=calls.length;
  response=await send(cookie,'person',{message:'我想自杀，已经准备好了',consent:true});
  const crisis=await response.json();assert.equal(response.status,200);assert.equal(crisis.urgent,true);assert.match(crisis.answer,/12356/);assert.equal(calls.length,count);
  assert.equal((await fetch(base+'/api/psychology-tests',{headers:{Cookie:cookie,'X-Health-User':'person'}}).then(r=>r.json())).records.length,0);
  assert.equal(fs.existsSync(path.join(dir,'health','person.json')),false);
  console.log('PASS psychology support auth, consent, account isolation, contextual turns, crisis bypass and ephemeral storage');
 }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true})}
});
