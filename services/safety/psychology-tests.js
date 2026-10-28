'use strict';
const validText=(s,max)=>typeof s==='string'&&s.length>0&&s.length<=max;
function validateResult(input){
 if(!input||!['personality','tarot','views'].includes(input.type)||!validText(input.id,80)||!/^[a-zA-Z0-9-]+$/.test(input.id)||!validText(input.title,160)||!validText(input.summary,2000)||!Array.isArray(input.sections)||input.sections.length<1||input.sections.length>8)throw Error('测试结果格式不完整');
 const sections=input.sections.map(part=>{
  if(!part||!validText(part.title,160)||!Array.isArray(part.lines)||part.lines.length>30||part.lines.some(line=>!validText(line,4000)))throw Error('测试解读格式不正确');
  return {title:part.title,lines:part.lines};
 });
 const safe={id:input.id,type:input.type,title:input.title,summary:input.summary,sections};
 if(Buffer.byteLength(JSON.stringify(safe))>64000)throw Error('测试结果内容过长');
 return safe;
}
module.exports={validateResult};
