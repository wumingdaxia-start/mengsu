'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {validateData}=require('./health-store');
const {emptyChallenges}=require('./public/challenge-core');

const emptyRecord=()=>({revision:0,data:{exercise:[],diet:[],sleep:[],vision:[],profile:null,exercisePlan:null,dietPlan:null,challenges:emptyChallenges()}});
const parsed=value=>typeof value==='string'?JSON.parse(value):value;

function mysqlConfig(env=process.env){
 if(!env.MYSQL_HOST)return null;
 for(const name of ['MYSQL_USER','MYSQL_PASSWORD','MYSQL_DATABASE'])if(!env[name])throw Error('MySQL 已启用，但缺少 '+name);
 const port=Number(env.MYSQL_PORT||3306);
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('MYSQL_PORT 无效');
 return {host:env.MYSQL_HOST,port,user:env.MYSQL_USER,password:env.MYSQL_PASSWORD,database:env.MYSQL_DATABASE,charset:'utf8mb4',waitForConnections:true,connectionLimit:10,...(env.MYSQL_SSL==='1'?{ssl:{}}:{})};
}
function loadMysqlConfig(){
 // Direct server starts and the portable launcher must use the same private settings.
 const file=path.resolve(__dirname,'../../private/.env'),saved={};
 try{
  for(const raw of fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'').split(/\r?\n/)){
   const line=raw.trim();if(!line||line.startsWith('#'))continue;
   const split=line.indexOf('=');if(split<1)continue;
   const key=line.slice(0,split).trim();let value=line.slice(split+1).trim();
   if(!/^MYSQL_[A-Z_]+$/.test(key))continue;
   if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
   saved[key]=value;
  }
 }catch(error){if(error.code!=='ENOENT')throw error}
 return mysqlConfig({...saved,...process.env});
}

function createMysqlPersistence(config,{pool:injectedPool}={}){
 const pool=injectedPool||require('mysql2/promise').createPool(config);
 const ready=(async()=>{
  await pool.query("CREATE TABLE IF NOT EXISTS users (id VARCHAR(128) PRIMARY KEY, account VARCHAR(128) NOT NULL UNIQUE, name VARCHAR(128) NOT NULL, role VARCHAR(64) NOT NULL, phone VARCHAR(64), salt VARCHAR(128) NOT NULL, password_hash VARCHAR(256) NOT NULL, created_at VARCHAR(40)) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  await pool.query("CREATE TABLE IF NOT EXISTS health_records (user_id VARCHAR(128) PRIMARY KEY, revision INT UNSIGNED NOT NULL, data_json JSON NOT NULL, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  await pool.query("CREATE TABLE IF NOT EXISTS consult_threads (user_id VARCHAR(128) PRIMARY KEY, messages_json JSON NOT NULL, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  await pool.query("CREATE TABLE IF NOT EXISTS dream_records (user_id VARCHAR(128) NOT NULL, record_key VARCHAR(64) NOT NULL, revision INT UNSIGNED NOT NULL, data_json JSON NOT NULL, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY(user_id,record_key)) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
  await pool.query("CREATE TABLE IF NOT EXISTS psychology_tests (user_id VARCHAR(128) NOT NULL, id VARCHAR(80) NOT NULL, result_json JSON NOT NULL, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY(user_id,id), INDEX psychology_user_date(user_id,created_at)) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
 })();
 const dream={
  async read(id){await ready;const [rows]=await pool.execute('SELECT record_key,revision,data_json FROM dream_records WHERE user_id=?',[String(id)]);const values={},revisions={};for(const row of rows){values[row.record_key]=parsed(row.data_json);revisions[row.record_key]=row.revision}return{values,revisions}},
  async write(id,input){
   await ready;
   if(input.revision===0){try{await pool.execute('INSERT INTO dream_records (user_id,record_key,revision,data_json) VALUES (?,?,1,?)',[String(id),input.key,JSON.stringify(input.value)])}catch(error){if(error.code==='ER_DUP_ENTRY')return null;throw error}}
   else{const [result]=await pool.execute('UPDATE dream_records SET revision=revision+1,data_json=? WHERE user_id=? AND record_key=? AND revision=?',[JSON.stringify(input.value),String(id),input.key,input.revision]);if(result.affectedRows!==1)return null}
   return{value:input.value,revision:input.revision+1};
  }
 };
 const psychologyTests={
  async read(id){await ready;const [rows]=await pool.execute('SELECT result_json,created_at FROM psychology_tests WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 60',[String(id)]);return rows.map(row=>({...parsed(row.result_json),createdAt:new Date(row.created_at).toISOString()}))},
  async write(userId,record){await ready;await pool.execute('INSERT IGNORE INTO psychology_tests (user_id,id,result_json) VALUES (?,?,?)',[String(userId),record.id,JSON.stringify(record)])}
 };
 const afterReady=async()=>{await ready};
 const users={
  async read(){await afterReady();const [rows]=await pool.execute('SELECT id,account,name,role,phone,salt,password_hash AS passwordHash,created_at AS createdAt FROM users');return rows},
  async insertIfAbsent(user){await afterReady();const [result]=await pool.execute('INSERT IGNORE INTO users (id,account,name,role,phone,salt,password_hash,created_at) VALUES (?,?,?,?,?,?,?,?)',[String(user.id),user.account,user.name,user.role,user.phone||null,user.salt,user.passwordHash,user.createdAt||null]);return result.affectedRows===1}
 };
 const health={
  async read(id){await afterReady();const [rows]=await pool.execute('SELECT revision,data_json FROM health_records WHERE user_id=?',[String(id)]);return rows.length?{revision:rows[0].revision,data:validateData(parsed(rows[0].data_json))}:emptyRecord()},
  async write(id,data,revision){
   await afterReady();
   const validated=validateData(data),conn=await pool.getConnection();
   try{
    await conn.beginTransaction();
    const [rows]=await conn.execute('SELECT revision FROM health_records WHERE user_id=? FOR UPDATE',[String(id)]);
    const current=rows.length?rows[0].revision:0;
    if(revision!==current){await conn.rollback();return null}
    const record={revision:current+1,data:validated};
    if(rows.length)await conn.execute('UPDATE health_records SET revision=?,data_json=? WHERE user_id=?',[record.revision,JSON.stringify(validated),String(id)]);
    else await conn.execute('INSERT INTO health_records (user_id,revision,data_json) VALUES (?,?,?)',[String(id),record.revision,JSON.stringify(validated)]);
    await conn.commit();return record;
   }catch(error){await conn.rollback();if(error.code==='ER_DUP_ENTRY')return null;throw error}finally{conn.release()}
  },
  async importIfAbsent(id,record){await afterReady();const data=validateData(record.data),revision=Number(record.revision);if(!Number.isInteger(revision)||revision<0)throw Error('健康记录版本无效');const [result]=await pool.execute('INSERT IGNORE INTO health_records (user_id,revision,data_json) VALUES (?,?,?)',[String(id),revision,JSON.stringify(data)]);return result.affectedRows===1}
 };
 const consult={
  async read(id){await afterReady();const [rows]=await pool.execute('SELECT messages_json FROM consult_threads WHERE user_id=?',[String(id)]);const value=rows.length?parsed(rows[0].messages_json):[];return Array.isArray(value)?value.filter(item=>['user','assistant'].includes(item?.role)&&typeof item.content==='string').slice(-40):[]},
  async write(id,messages){await afterReady();await pool.execute('INSERT INTO consult_threads (user_id,messages_json) VALUES (?,?) ON DUPLICATE KEY UPDATE messages_json=VALUES(messages_json)',[String(id),JSON.stringify(messages.slice(-40))])},
  async clear(id){await afterReady();await pool.execute('DELETE FROM consult_threads WHERE user_id=?',[String(id)])},
  async importIfAbsent(id,messages){await afterReady();const safe=messages.filter(item=>['user','assistant'].includes(item?.role)&&typeof item.content==='string').slice(-40);const [result]=await pool.execute('INSERT IGNORE INTO consult_threads (user_id,messages_json) VALUES (?,?)',[String(id),JSON.stringify(safe)]);return result.affectedRows===1}
 };
 return {ready,pool,users,health,consult,psychologyTests,dream,close:()=>pool.end()};
}
module.exports={mysqlConfig,loadMysqlConfig,createMysqlPersistence};
