const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto');
const {readUsers,atomicWrite}=require('./local-persistence');
let raw=''; process.stdin.setEncoding('utf8'); process.stdin.on('data',chunk=>raw+=chunk);
process.stdin.on('end',async()=>{
  let persistence;
  try {
    const {account,password}=JSON.parse(raw);
    if(!/^[a-zA-Z0-9_@.\-]{3,64}$/.test(account)||typeof password!=='string'||password.length<8||password.length>128)throw Error('Use a 3-64 character account and an 8-128 character password.');
    const config=require('./mysql-store').loadMysqlConfig();
    const file=path.join(__dirname,'../../data/safety/users.json');
    if(config) { persistence=require('./mysql-store').createMysqlPersistence(config); await persistence.ready; }
    const users=persistence?await persistence.users.read():readUsers(file);
    if(users.some(u=>u.account.toLowerCase()===account.toLowerCase()))throw Error('Account already exists.');
    const salt=crypto.randomBytes(16).toString('hex');
    const user={id:crypto.randomUUID(),account,name:account,role:'普通用户',salt,passwordHash:crypto.scryptSync(password,salt,64).toString('hex'),createdAt:new Date().toISOString()};
    if(persistence) { if(!await persistence.users.insertIfAbsent(user))throw Error('Account already exists.'); }
    else atomicWrite(file,[...users,user]);
    console.log('Account created.');
  } catch(e) { console.error(e.message); process.exitCode=1; }
  finally { if(persistence)await persistence.close(); }
});
