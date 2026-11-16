const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {createServer}=require('../server');
const {createTests}=require('../local-persistence');
const {createMysqlPersistence}=require('../mysql-store');

test('test deletion checks the session and owner and survives store reload',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'psychology-delete-'));
 const usersFile=path.join(dir,'users.json'),testsDir=path.join(dir,'tests');
 const users=['first','second'].map(id=>{const salt=crypto.randomBytes(16).toString('hex');return{id,account:id,name:id,role:'普通用户',salt,passwordHash:crypto.scryptSync('TestPassword123!',salt,64).toString('hex')}});
 fs.writeFileSync(usersFile,JSON.stringify(users));
 const store=createTests(testsDir),record={id:'same-id',type:'personality',title:'临时测试',summary:'测试内容',sections:[{title:'解读',lines:['测试']} ]};
 store.write('first',record);store.write('first',{...record,id:'keep-id'});store.write('second',record);store.write('second',{...record,id:'private-id'});
 const server=createServer({mysql:false,usersFile,testsDir,dataDir:path.join(dir,'health'),consultDir:path.join(dir,'consult'),dreamDir:path.join(dir,'dream')});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const remove=(cookie,owner,id)=>fetch(base+'/api/psychology-tests',{method:'DELETE',headers:{Cookie:cookie,'X-Health-User':owner,'Content-Type':'application/json'},body:JSON.stringify({id})});
 try{
  assert.equal((await remove('','first','same-id')).status,401);
  const login=await fetch(base+'/api/login',{method:'POST',body:JSON.stringify({account:'first',password:'TestPassword123!'})});
  const cookie=login.headers.get('set-cookie').split(';')[0];
  assert.equal((await remove(cookie,'second','same-id')).status,409);
  assert.equal((await remove(cookie,'first','../bad')).status,400);
  assert.equal((await remove(cookie,'first','private-id')).status,404);
  assert.equal((await remove(cookie,'first','same-id')).status,200);
  assert.equal((await remove(cookie,'first','same-id')).status,404);
  const response=await fetch(base+'/api/psychology-tests',{headers:{Cookie:cookie,'X-Health-User':'first'}});
  assert.deepEqual((await response.json()).records.map(r=>r.id),['keep-id']);
  assert.equal(createTests(testsDir).read('first').length,1);
  assert.equal(createTests(testsDir).read('second').length,2);
 }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true})}
});
test('MySQL deletion binds both current user and record id',async()=>{
 const calls=[];
 const persistence=createMysqlPersistence({}, {pool:{query:async()=>[[]],execute:async(sql,args)=>{calls.push({sql,args});return [{affectedRows:1}]},end:async()=>{}}});
 await persistence.ready;
 assert.equal(await persistence.psychologyTests.remove('current-user','record-id'),true);
 assert.deepEqual(calls,[{sql:'DELETE FROM psychology_tests WHERE user_id=? AND id=?',args:['current-user','record-id']}]);
});