const crypto=require('node:crypto');
const {promisify}=require('node:util');
const {atomicWrite}=require('./local-persistence');
const scrypt=promisify(crypto.scrypt);
function createRegistrar({readUsers,persistence,usersFile}) {
 let busy=false,windowStart=Date.now(),attempts=0;
 return async input=>{
  const account=typeof input?.account==='string'?input.account.trim():'';
  const password=input?.password;
  const name=typeof input?.name==='string'?input.name.trim():account;
  if(!/^[a-zA-Z0-9_@.\-]{3,64}$/.test(account))return {status:400,message:'账号需为 3～64 位字母、数字或 _ @ . -'};
  if(typeof password!=='string'||password.length<8||password.length>128||!password.trim())return {status:400,message:'密码需为 8～128 位，不能全为空格'};
  if(!name||name.length>40)return {status:400,message:'昵称需为 1～40 个字符'};
  if(busy)return {status:429,message:'正在创建账号，请稍后重试'};
  if(Date.now()-windowStart>600000){windowStart=Date.now();attempts=0}
  if(attempts>=20)return {status:429,message:'注册请求较多，请 10 分钟后重试'};
  attempts++;busy=true;
  try {
   const users=await readUsers();
   if(users.some(u=>u.account.toLowerCase()===account.toLowerCase()))return {status:409,message:'这个账号已被注册，请换一个或直接登录'};
   const salt=crypto.randomBytes(16).toString('hex');
   const user={id:crypto.randomUUID(),account,name,role:'普通用户',salt,passwordHash:(await scrypt(password,salt,64)).toString('hex'),createdAt:new Date().toISOString()};
   if(persistence){if(!await persistence.users.insertIfAbsent(user))return {status:409,message:'这个账号已被注册，请换一个或直接登录'}}
   else atomicWrite(usersFile,[...users,user]);
   return {status:201,message:'注册成功，请使用新账号登录'};
  }finally{busy=false}
 };
}
module.exports={createRegistrar};
