'use strict';
const {config}=require('./consult-service');

const urgent=/自杀|自残|不想活|想死|结束生命|伤害自己|伤害他人|准备跳楼|马上去死/;
const urgentReply='我很在意你现在的安全。请先离开可能伤害自己的物品或地点，马上联系一位信任的人陪着你，并拨打全国心理援助热线 12356；如果眼前有立即危险，请拨打 120 或 110。这里的 AI 不能代替紧急支持。';
const system='你是温和、尊重边界的中文情绪倾听助手。先回应用户表达的感受，不评判、不说教、不急着给解决方案；可用简短问题帮助用户厘清当下需要。不要诊断心理疾病、冒充心理咨询师或真人，不承诺保密或疗效，不建议用药。若用户表达自杀、自伤、伤害他人或迫在眉睫的危险，鼓励联系可信任的人、全国心理援助热线 12356；存在立即危险时拨打 120 或 110。每次回答控制在 200 字以内。';
const text=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';

async function reply(message,history=[],{env=process.env,request=fetch}={}){
 const latest=text(message,1600);
 if(!latest)return {status:400,error:'写下一点此刻的感受再发送吧。'};
 if(urgent.test(latest))return {answer:urgentReply,urgent:true};
 const settings=config(env);
 if(!settings)return {status:503,error:'AI 情绪倾听暂不可用，请稍后再试。'};
 const turns=Array.isArray(history)?history.slice(-8).flatMap(item=>{
  if(!item||!['user','assistant'].includes(item.role))return [];
  const content=text(item.content,1600);return content?[{role:item.role,content}]:[];
 }):[];
 turns.push({role:'user',content:latest});
 try{
  const response=await request(settings.endpoint,{method:'POST',headers:{Authorization:'Bearer '+settings.key,'Content-Type':'application/json'},body:JSON.stringify({model:settings.model,messages:[{role:'system',content:system},...turns],temperature:0.55,max_tokens:350}),signal:AbortSignal.timeout(20000)});
  if(!response.ok)return {status:503,error:'AI 暂时无法回应，请稍后再试。'};
  const data=await response.json(),answer=text(data.choices?.[0]?.message?.content,1200);
  if(!answer)return {status:502,error:'AI 没有返回可用的回应，请重试。'};
  return {answer,urgent:false};
 }catch{return {status:503,error:'AI 服务暂时无法连接，请稍后再试。'};}
}

module.exports={reply,urgentReply};
