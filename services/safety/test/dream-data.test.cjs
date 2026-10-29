const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {createServer}=require('../server');
const {createMysqlPersistence,loadMysqlConfig}=require('../mysql-store');
for(const mode of ['local','mysql'])test(`dream account API: isolation, logout, revisions, restart (${mode})`,{skip:mode==='mysql'&&!loadMysqlConfig()},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mengsu-dream-test-'));
 const suffix=crypto.randomBytes(7).toString('hex'),password=crypto.randomBytes(16).toString('hex');
 const users=['a','b'].map(n=>{const salt=crypto.randomBytes(16).toString('hex');return{id:`dream-test-${suffix}-${n}`,account:`dream-test-${suffix}-${n}`,name:'测试',role:'普通用户',salt,passwordHash:crypto.scryptSync(password,salt,64).toString('hex')}});
 const usersFile=path.join(dir,'users.json');fs.writeFileSync(usersFile,JSON.stringify(users));
 const mysql=mode==='mysql'?loadMysqlConfig():false;
 let persistence,server,base;
 const options={mysql,usersFile,dreamDir:path.join(dir,'dream'),dataDir:path.join(dir,'health'),consultDir:path.join(dir,'consult'),testsDir:path.join(dir,'tests')};
 async function start(){server=createServer(options);await server.ready;await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port}
 const close=()=>new Promise((r,j)=>server.close(e=>e?j(e):r()));
 async function login(user){const r=await fetch(base+'/api/login',{method:'POST',body:JSON.stringify({account:user.account,password})});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0]}
 const request=(cookie,id,method='GET',body)=>fetch(base+'/api/dream-data',{method,headers:{Cookie:cookie||'','X-Health-User':id||'','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 try{
 if(mysql){persistence=createMysqlPersistence(mysql);await persistence.ready;for(const user of users)await persistence.users.insertIfAbsent(user)}
 await start();assert.equal((await request()).status,401);
 let cookie=await login(users[0]);const id=users[0].id;
 assert.equal((await request(cookie,users[1].id)).status,409);
 for(const key of ['snapshots','journals','plan','rituals','holes','posts','creations','seeds','receipts','notes','prefs','clusters','conversations','drift']){
 const value={test:key};const r=await request(cookie,id,'PUT',{key,value,revision:0});assert.equal(r.status,200,key);
 assert.equal((await r.json()).revision,1);
 }
 assert.equal((await request(cookie,id,'PUT',{key:'snapshots',value:[],revision:0})).status,409);
 assert.equal((await request(cookie,id,'PUT',{key:'bad-key',value:[],revision:0})).status,400);
 assert.equal((await request(cookie,id,'PUT',{key:'notes',value:JSON.parse('{"__proto__":{}}'),revision:1})).status,400);
 const image='data:image/jpeg;base64,'+'A'.repeat(1100000);
 assert.equal((await request(cookie,id,'PUT',{key:'snapshots',value:[{id:1,signal:'saved dream',image}],revision:1})).status,200,'images above old 1MB limit');
 const second=await login(users[1]);assert.deepEqual(await (await request(second,users[1].id)).json(),{values:{},revisions:{}});
 const loggedOut=await fetch(base+'/api/logout',{method:'POST',headers:{Cookie:cookie}});assert.equal(loggedOut.status,200);
 assert.equal((await request(cookie,id)).status,401);
 cookie=await login(users[0]);assert.equal((await (await request(cookie,id)).json()).values.snapshots[0].signal,'saved dream');
 await close();await start();cookie=await login(users[0]);const restored=await (await request(cookie,id)).json();
 assert.equal(restored.values.snapshots[0].image,image);assert.equal(restored.values.journals.test,'journals');
 // Separate record keys can be updated without overwriting each other.
 const replies=await Promise.all(['notes','rituals'].map(key=>request(cookie,id,'PUT',{key,value:{updated:true},revision:1})));
 assert.ok(replies.every(r=>r.status===200));
 }finally{
 if(server?.listening)await close();
 if(persistence){for(const user of users){await persistence.pool.execute('DELETE FROM dream_records WHERE user_id=?',[user.id]);await persistence.pool.execute('DELETE FROM users WHERE id=?',[user.id])}await persistence.close()}
 fs.rmSync(dir,{recursive:true,force:true});
 }
});
