const fs=require('node:fs');
const crypto=require('node:crypto');
const {atomicWrite}=require('./local-persistence');
function createDriftStore(file){
 const load=()=>{try{const data=JSON.parse(fs.readFileSync(file,'utf8'));if(!Array.isArray(data))throw Error('漂流瓶数据格式错误');return data}catch(e){if(e.code==='ENOENT')return [];throw e}};
 const fail=(status,message)=>{const error=new Error(message);error.status=status;throw error};
 const view=(b,owner)=>({id:b.id,type:b.type,text:b.text,date:b.date,shared:true,mine:b.owner===owner,favorite:b.savedBy.includes(owner),replies:b.replies.filter(r=>b.owner===owner||r.owner===owner).map(r=>({id:r.id,text:r.text,date:r.date,mine:r.owner===owner}))});
 return {
  mine(owner){const all=load();return {sent:all.filter(b=>b.owner===owner).map(b=>view(b,owner)),favorites:all.filter(b=>b.savedBy.includes(owner)).map(b=>view(b,owner))}},
  pick(owner){const pool=load().filter(b=>b.owner!==owner);for(let i=pool.length-1;i>0;i--){const j=crypto.randomInt(i+1);[pool[i],pool[j]]=[pool[j],pool[i]]}return {bottles:pool.slice(0,6).map(b=>view(b,owner))}},
  send(owner,input){if(typeof input.text!=='string'||!input.text.trim()||input.text.trim().length>100||!Number.isInteger(input.type)||input.type<0||input.type>5||typeof input.submissionId!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(input.submissionId))fail(400,'请填写1～100字的纸条并选择瓶子类型');const all=load(),existing=all.find(b=>b.owner===owner&&b.submissionId===input.submissionId);if(existing)return {bottle:view(existing,owner)};const now=new Date();const bottle={id:crypto.randomUUID(),owner,type:input.type,text:input.text.trim(),submissionId:input.submissionId,date:now.toISOString(),savedBy:[],replies:[]};all.unshift(bottle);atomicWrite(file,all);return {bottle:view(bottle,owner)}},
  update(owner,id,action,input){const all=load(),b=all.find(b=>b.id===id);if(!b)fail(404,'这只漂流瓶已不在星海');if(action==='favorite'){if(b.owner===owner)fail(400,'自己的纸条已保存在投出的瓶子中');if(!b.savedBy.includes(owner))b.savedBy.push(owner)}else if(action==='reply'){if(b.owner===owner)fail(400,'不能回复自己的漂流瓶');if(typeof input.text!=='string'||!input.text.trim()||input.text.trim().length>300)fail(400,'回应请保持在1～300字');if(b.replies.length>=100)fail(400,'这只漂流瓶的回应已满');b.replies.push({id:crypto.randomUUID(),owner,text:input.text.trim(),date:new Date().toISOString()})}else if(action==='delete'){if(b.owner!==owner)fail(403,'只能移除自己投出的漂流瓶');all.splice(all.indexOf(b),1)}else fail(405,'请求方式不支持');atomicWrite(file,all);return {bottle:action==='delete'?null:view(b,owner)}}
 };
}
module.exports={createDriftStore};
