const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {createServer}=require('../server');
test('photo consultations validate access and consent, retain text only, preserve text and emergency replies',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'consult-photo-')),salt=crypto.randomBytes(16).toString('hex');
 const usersFile=path.join(dir,'users.json');fs.writeFileSync(usersFile,JSON.stringify(['first','second'].map(id=>({id,account:id,name:id,role:'普通用户',salt,passwordHash:crypto.scryptSync('TestPassword123!',salt,64).toString('hex')}))));
 const calls=[];let fail=false;
 const server=createServer({mysql:false,usersFile,dataDir:path.join(dir,'health'),dreamDir:path.join(dir,'dream'),consultDir:path.join(dir,'consult'),testsDir:path.join(dir,'tests'),aiEnv:{QWEN_API_KEY:'test-only-key',HEALTH_AI_API_KEY:'test-only-key',HEALTH_AI_MODEL:'qwen-plus',HEALTH_AI_BASE_URL:'https://example.test/v1'},aiFetch:async(url,init)=>{calls.push(JSON.parse(init.body));return {ok:!fail,json:async()=>({choices:[{message:{content:'照片可见情况：请补充持续时间。'}}]})}}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
 const request=(cookie,id,body,method='POST')=>fetch(base+'/api/consult',{method,headers:{Cookie:cookie,'X-Health-User':id,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 async function login(account){const r=await fetch(base+'/api/login',{method:'POST',body:JSON.stringify({account,password:'TestPassword123!'})});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0]}
 try{
 assert.equal((await request('','first',{image,photoConsent:true})).status,401);const cookie=await login('first');
 assert.equal((await request(cookie,'second',{image,photoConsent:true})).status,409);
 assert.equal((await request(cookie,'first',{image})).status,400);assert.equal(calls.length,0);
 assert.equal((await request(cookie,'first',{image:'data:image/png;base64,invalid',photoConsent:true})).status,400);
 let r=await request(cookie,'first',{image,photoConsent:true,message:'手臂的情况持续两天'});assert.equal(r.status,200);let result=await r.json();assert.equal(result.messages[0].hasPhoto,true);assert.equal(calls[0].model,'qwen-vl-plus');assert.equal(calls[0].messages.at(-1).content[1].image_url.url,image);
 assert.ok(!JSON.stringify(result).includes('data:image'));assert.match(result.messages.at(-1).content,/不能确诊/);
 const saved=await (await request(cookie,'first',null,'GET')).json();assert.equal(saved.messages[0].hasPhoto,true);assert.ok(!JSON.stringify(saved).includes('base64'));
 const second=await login('second');assert.deepEqual((await (await request(second,'second',null,'GET')).json()).messages,[]);
 r=await request(cookie,'first',{message:'还需要补充什么？'});assert.equal(r.status,200);assert.equal(calls.at(-1).model,'qwen-plus');
 const before=calls.length;r=await request(cookie,'first',{image,photoConsent:true,message:'胸痛呼吸困难'});assert.equal(r.status,200);assert.equal((await r.json()).urgent,true);assert.equal(calls.length,before);
 fail=true;r=await request(cookie,'first',{image,photoConsent:true});assert.equal(r.status,502);fail=false;r=await request(cookie,'first',{image,photoConsent:true});assert.equal(r.status,200);
 console.log('PASS photo auth, consent, image validation, multimodal request, text-only storage, account isolation, emergency bypass, failure retry');
 }finally{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true})}
});
