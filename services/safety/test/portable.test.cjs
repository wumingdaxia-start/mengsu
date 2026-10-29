const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {createServer} = require('../server');
const {integrateServer} = require('../../../scripts/safety-workspace.cjs');

test('portable local accounts, health records and psychology survive service restart', async () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mengsu-portable-'));
  const salt=crypto.randomBytes(16).toString('hex');
  const users=['first','second'].map(id=>({id,account:id,name:id,role:'普通用户',salt,passwordHash:crypto.scryptSync('TestPassword123!',salt,64).toString('hex')}));
  const usersFile=path.join(dir,'users.json');
  fs.writeFileSync(usersFile,JSON.stringify(users));
  const options={mysql:false,usersFile,dataDir:path.join(dir,'health'),consultDir:path.join(dir,'consult'),testsDir:path.join(dir,'tests')};
  let server,base;
  async function start(){
    server=integrateServer(createServer(options),{parentPort:8000});
    await server.ready;
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    base='http://127.0.0.1:'+server.address().port;
  }
  const close=()=>new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  async function login(account='first',password='TestPassword123!') {
    const res=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://127.0.0.1:8000'},body:JSON.stringify({account,password})});
    assert.equal(res.status,200);
    assert.equal(res.headers.get('access-control-allow-origin'),'http://127.0.0.1:8000');
    assert.match(res.headers.get('set-cookie'),/HttpOnly/);
    return res.headers.get('set-cookie').split(';')[0];
  }
  function request(endpoint,cookie,id='first',method='GET',body) {
    return fetch(base+endpoint,{method,headers:{Cookie:cookie,'X-Health-User':id,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  }
  try {
    await start();
    assert.equal((await fetch(base+'/api/health-data')).status,401);
    const html=await (await fetch(base+'/?mengsu=1')).text();
    assert.match(html,/__mengsu\/embed.js/);
    for(const resource of [...html.matchAll(/(?:src|href)="(\/[^"?#]+)[^"]*"/g)].map(x=>x[1])) {
      const response=await fetch(base+resource);
      assert.equal(response.status,200,resource);
      if(resource.endsWith('.js'))assert.match(response.headers.get('content-type'),/javascript/,resource);
      if(resource.endsWith('.css'))assert.match(response.headers.get('content-type'),/css/,resource);
    }
    const invalid=await fetch(base+'/api/login',{method:'POST',body:JSON.stringify({account:'first',password:'wrong'})});
    assert.equal(invalid.status,401);
    let cookie=await login();
    assert.equal((await (await request('/api/me',cookie)).json()).user.id,'first');
    const original=await (await request('/api/health-data',cookie)).json();
    original.data.sleep=[{hours:7.5,date:'2026-10-28',quality:4}];
    const saved=await request('/api/health-data',cookie,'first','PUT',original);
    assert.equal(saved.status,200);
    assert.equal((await saved.json()).revision,1);
    assert.equal((await request('/api/health-data',cookie,'first','PUT',original)).status,409);
    for(const type of ['personality','tarot','views']) {
      const result={id:'portable-'+type,type,title:'Test',summary:'Portable test',sections:[{title:'Result',lines:['Saved']} ]};
      assert.equal((await request('/api/psychology-tests',cookie,'first','POST',result)).status,200);
    }
    assert.equal((await request('/api/psychology-tests',cookie,'second')).status,409);
    const second=await login('second');
    assert.deepEqual((await (await request('/api/psychology-tests',second,'second')).json()).records,[]);
    assert.equal((await (await request('/api/health-data',second,'second')).json()).data.sleep.length,0);
    await close(); await start();
    cookie=await login();
    assert.equal((await (await request('/api/health-data',cookie)).json()).data.sleep[0].hours,7.5);
    const records=(await (await request('/api/psychology-tests',cookie)).json()).records;
    assert.equal(records.length,3);
    assert.ok(records.every(r=>r.createdAt));
    assert.equal((await request('/api/logout',cookie,'first','POST',{})).status,200);
    assert.equal((await request('/api/me',cookie)).status,401);
  } finally {
    if(server?.listening)await close();
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
