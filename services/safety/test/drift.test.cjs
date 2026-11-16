const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {createServer}=require('../server');
test('real drift: cross-account pickup, replies, favorites, privacy, duplicate retry and restart',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'huayuxing-drift-test-')),password=crypto.randomBytes(16).toString('hex');
 const users=['alice','bob','carol'].map(account=>{const salt=crypto.randomBytes(16).toString('hex');return {id:account,account,name:account,role:'普通用户',salt,passwordHash:crypto.scryptSync(password,salt,64).toString('hex')}});
 const usersFile=path.join(dir,'users.json'),driftFile=path.join(dir,'drift.json');fs.writeFileSync(usersFile,JSON.stringify(users));
 const options={mysql:false,usersFile,driftFile,dataDir:path.join(dir,'health'),dreamDir:path.join(dir,'dream'),consultDir:path.join(dir,'consult'),testsDir:path.join(dir,'tests')};let server,base,cookies={};
 async function start(){server=createServer(options);await server.ready;await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;for(const u of users){const r=await fetch(base+'/api/login',{method:'POST',body:JSON.stringify({account:u.account,password})});assert.equal(r.status,200);cookies[u.id]=r.headers.get('set-cookie').split(';')[0]}}
 const close=()=>new Promise((r,j)=>server.close(e=>e?j(e):r()));
 const req=(owner,route,method='GET',body,extra={})=>fetch(base+'/api/drift'+route,{method,headers:{Cookie:cookies[owner]||'','X-Health-User':owner||'','Content-Type':'application/json',...extra},...(body?{body:JSON.stringify(body)}:{})});
 try{await start();assert.equal((await req('', '/pick')).status,401);assert.equal((await req('alice','/pick','GET',null,{'X-Health-User':'bob'})).status,409);
 assert.deepEqual(await (await req('alice','/pick')).json(),{bottles:[]});
 assert.equal((await req('alice','','POST',{text:'',type:0,submissionId:'bad'})).status,400);
 const payload={text:'今天想把心事交给星海',type:0,submissionId:crypto.randomUUID()};const sent=await (await req('alice','','POST',payload)).json();assert.ok(sent.bottle.id);assert.equal(sent.bottle.mine,true);
 const repeated=await (await req('alice','','POST',payload)).json();assert.equal(repeated.bottle.id,sent.bottle.id);
 assert.equal((await (await req('alice','/pick')).json()).bottles.length,0);
 const bobPick=await (await req('bob','/pick')).json();assert.equal(bobPick.bottles[0].text,payload.text);assert.equal(bobPick.bottles[0].mine,false);assert.equal('owner' in bobPick.bottles[0],false);
 const id=sent.bottle.id;assert.equal((await req('bob','/'+id+'/favorite','POST',{})).status,200);assert.equal((await (await req('bob','/mine')).json()).favorites[0].id,id);
 assert.equal((await req('bob','/'+id+'/reply','POST',{text:'愿你今晚轻松一些'})).status,200);
 const aliceMail=await (await req('alice','/mine')).json();assert.equal(aliceMail.sent[0].replies[0].text,'愿你今晚轻松一些');assert.equal(aliceMail.sent[0].replies[0].mine,false);
 const carolPick=await (await req('carol','/pick')).json();assert.deepEqual(carolPick.bottles[0].replies,[],'private replies not shown to third parties');assert.equal((await req('bob','/'+id,'DELETE')).status,403);
 await Promise.all(['bob','carol'].map(owner=>req(owner,'','POST',{text:owner+'的来信',type:2,submissionId:crypto.randomUUID()})));
 assert.equal(JSON.parse(fs.readFileSync(driftFile)).length,3,'concurrent sends preserve both messages');
 await close();await start();assert.equal((await (await req('alice','/mine')).json()).sent[0].replies.length,1);assert.equal((await (await req('bob','/mine')).json()).favorites.length,1);
 assert.equal((await req('alice','/'+id,'DELETE')).status,200);assert.equal((await (await req('bob','/mine')).json()).favorites.length,0);assert.equal((await req('bob','/'+id+'/reply','POST',{text:'hello'})).status,404);
 }finally{if(server?.listening)await close();const resolved=path.resolve(dir);assert.ok(resolved.startsWith(path.resolve(os.tmpdir())+path.sep+'huayuxing-drift-test-'));fs.rmSync(resolved,{recursive:true,force:true})}
});
