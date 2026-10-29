'use strict';
const ALERT='如有胸痛、呼吸困难、意识改变、持续严重出血、突发肢体无力等紧急情况，请立即联系当地急救服务，不要等待 AI 回复。';
const SYSTEM_PROMPT='你是中文健康信息助手，不是医生，不提供诊断、处方或保证性结论。先用一两个简短问题澄清症状持续时间、严重程度、伴随症状和重要既往病史，再给出一般健康信息、可能需要的线下检查方向与就医时机。若出现胸痛、呼吸困难、昏厥、卒中征象、自杀/伤害风险、严重过敏、大出血或其他急症，明确建议立刻联系当地急救服务；不要只给居家建议。不得提供处方药剂量或自行停药指示。提醒信息不能替代医生判断。不要声称已查看用户健康档案，除非消息中明确提供。对不确定之处明确承认。';
const urgent=/胸痛|胸口痛|喘不过气|呼吸困难|昏厥|晕厥|意识不清|一侧无力|半身不遂|口齿不清|严重出血|大出血|自杀|自残|过敏性休克/;
const bounded=(input,max)=>typeof input==='string'?input.trim().slice(0,max):'';
function config(env=process.env){
 const key=bounded(env.HEALTH_AI_API_KEY,512),model=bounded(env.HEALTH_AI_MODEL,120),base=bounded(env.HEALTH_AI_BASE_URL,300);
 if(!key||!model)return null;
 let endpoint;try{endpoint=new URL(base||'https://api.openai.com/v1/');if(endpoint.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(endpoint.hostname))return null;endpoint=new URL('chat/completions',endpoint.href.endsWith('/')?endpoint.href:endpoint.href+'/')}catch{return null}
 return {key,model,endpoint:endpoint.toString()};
}
async function reply(messages,{env=process.env,request=fetch}={}){
 const sanitized=messages.slice(-12).map(item=>({role:item.role,content:item.content}));
 const latest=sanitized.at(-1)?.content||'';
 if(urgent.test(latest))return {answer:ALERT+' 你的描述可能需要紧急评估。请立即联系急救服务或前往急诊，并让身边的人协助；不要依赖在线问诊等待回复。',urgent:true};
 const settings=config(env);if(!settings)return {error:'未配置 AI 模型。请先在服务器设置 HEALTH_AI_API_KEY 和 HEALTH_AI_MODEL。',status:503};
 let result;
 try{result=await request(settings.endpoint,{method:'POST',headers:{Authorization:'Bearer '+settings.key,'Content-Type':'application/json'},body:JSON.stringify({model:settings.model,messages:[{role:'system',content:SYSTEM_PROMPT},...sanitized],temperature:0.25,max_tokens:650}),signal:AbortSignal.timeout(20000)})}
 catch{return {error:'AI 服务暂时无法连接，请稍后再试。',status:503}}
 if(!result.ok)return {error:'AI 服务暂时无法回答，请稍后再试。',status:503};
 let data;try{data=await result.json()}catch{return {error:'AI 服务返回的数据无效。',status:502}}
 const answer=bounded(data.choices?.[0]?.message?.content,4000);
 if(!answer)return {error:'AI 服务没有返回可用的回答。',status:502};
 return {answer:answer+'\n\n以上仅供健康信息参考，不能替代医生面诊、检查或治疗。',urgent:false};
}
module.exports={config,reply,ALERT};
