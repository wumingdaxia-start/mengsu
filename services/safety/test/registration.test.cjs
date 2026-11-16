const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const {createServer}=require('../server');
const {loadMysqlConfig}=require('../mysql-store');
for(const mode of ['local','mysql'])test(`real registration, persistence and login (${mode})`,{skip:mode==='mysql'&&!loadMysqlConfig()},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'huayuxing-register-'));
 const usersFile=path.join(dir,'users.json');
 const account='regtest_'+crypto.randomBytes(8).toString('hex');
 const password=crypto.randomBytes(20).toString('hex');
 const mysql=mode==='mysql'?loadMysqlConfig():false;
 const options={mysql,usersFile,dataDir:path.join(dir,'health'),consultDir:path.join(dir,'consult'),dreamDir:path.join(dir,'dream'),testsDir:path.join(dir,'tests')};
 let server,base;
 async function start(){server=createServer(options);await server.ready;await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port}
 async function close(){if(server?.listening)await new Promise((r,j)=>server.close(e=>e?j(e):r()))}
 const post=(url,body,headers={})=>fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 try{
  await start();
  assert.equal((await post('/api/register',{account,password:'short'})).status,400);
  assert.equal((await post('/api/register',{account,password},{Origin:'https://evil.example'})).status,403);
  assert.equal((await post('/api/register',{account,password,name:'注册测试',role:'健康安全管理员'})).status,201);
  assert.equal((await post('/api/register',{account:account.toUpperCase(),password})).status,409);
  let db,rows;
  if(mysql){db=await require('mysql2/promise').createConnection(mysql);[rows]=await db.execute('SELECT id,role,password_hash AS passwordHash,salt FROM users WHERE account=?',[account]);await db.end()}
  else rows=JSON.parse(fs.readFileSync(usersFile,'utf8'));
  assert.equal(rows.length,1);assert.equal(rows[0].role,'普通用户');assert.notEqual(rows[0].passwordHash,password);assert.equal(rows[0].passwordHash.length,128);assert.ok(rows[0].salt);
  await close();await start();
  assert.equal((await post('/api/login',{account,password:'incorrect'})).status,401);
  const login=await post('/api/login',{account,password});assert.equal(login.status,200);
  const cookie=login.headers.get('set-cookie').split(';')[0];
  const me=await (await fetch(base+'/api/me',{headers:{Cookie:cookie}})).json();
  assert.equal(me.user.account,account);assert.equal(me.user.name,'注册测试');assert.equal(me.user.passwordHash,undefined);
  const record=await fetch(base+'/api/health-data',{headers:{Cookie:cookie,'X-Health-User':me.user.id}});assert.equal(record.status,200);
  assert.equal((await post('/api/logout',{}, {Cookie:cookie})).status,200);
  assert.equal((await fetch(base+'/api/me',{headers:{Cookie:cookie}})).status,401);
 }finally{
  await close();
  if(mysql){const db=await require('mysql2/promise').createConnection(mysql);try{await db.execute('DELETE FROM users WHERE account=?',[account])}finally{await db.end()}}
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
